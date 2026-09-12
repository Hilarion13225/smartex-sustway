package com.smartexsustway.api.amelioration;

import com.smartexsustway.api.audit.AuditLogService;
import com.smartexsustway.api.domain.entity.Audit;
import com.smartexsustway.api.domain.entity.AuditCritere;
import com.smartexsustway.api.domain.entity.AxeAmelioration;
import com.smartexsustway.api.domain.entity.Evaluation;
import com.smartexsustway.api.domain.entity.Exigence;
import com.smartexsustway.api.domain.entity.PreuveAttendue;
import com.smartexsustway.api.domain.entity.ReferentielVersion;
import com.smartexsustway.api.domain.entity.RegleAnalyse;
import com.smartexsustway.api.domain.entity.Utilisateur;
import com.smartexsustway.api.domain.enums.StatutAxe;
import com.smartexsustway.api.domain.repository.AxeAmeliorationRepository;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import org.jboss.logging.Logger;

import java.util.Locale;
import java.util.Optional;
import java.util.UUID;

/**
 * Le seul endroit où un axe d'amélioration naît, est retenu ou est écarté.
 *
 * <p>Avant ce service, la création vivait à deux endroits : le pipeline V2 la
 * faisait à sa façon, la ressource REST à la sienne. Rien ne garantissait que
 * les deux appliquent les mêmes règles — et de fait, aucune des deux ne
 * dédupliquait ni ne vérifiait la version du référentiel visé. Regrouper ici
 * n'est pas une élégance : c'est ce qui rend une règle vérifiable en un seul
 * point plutôt que supposée en deux.
 *
 * <p>Trois décisions structurent tout ce qui suit.
 *
 * <p><strong>Une proposition ne se transforme jamais seule.</strong> Un axe
 * naît {@code PROPOSE}, qu'il vienne de l'IA ou d'une personne. Seul un geste
 * humain le fait passer à {@code VALIDE} ou {@code REJETE}.
 *
 * <p><strong>Une décision est définitive.</strong> Les transitions partent
 * exclusivement de {@code PROPOSE}. C'est le correctif du défaut relevé en
 * cartographie : {@code valider()} sur un axe rejeté effaçait le motif du
 * rejet, et {@code rejeter()} sur un axe validé effaçait son validateur — un
 * changement d'avis emportait silencieusement la décision précédente, qui
 * n'était plus lisible nulle part. L'effacement lui-même n'était pas
 * l'erreur : les contraintes {@code axe_validation_coherente} et
 * {@code axe_rejet_coherent} l'imposent, puisqu'elles lient par équivalence le
 * statut et son décideur. L'erreur était d'autoriser le second geste.
 *
 * <p><strong>La déduplication est déterministe et conservatrice.</strong> En
 * cas de doute, on conserve les deux propositions : un doublon se repère à la
 * lecture, une proposition perdue ne se retrouve pas.
 */
@ApplicationScoped
public class AxeAmeliorationService {

    private static final Logger LOG = Logger.getLogger(AxeAmeliorationService.class);

    /** Longueur de la colonne {@code libelle}. */
    private static final int LIBELLE_MAX = 255;

    /** Ce que porte un axe dont l'IA n'a rendu aucun texte exploitable. */
    static final String LIBELLE_PAR_DEFAUT = "Action recommandée";

    @Inject AxeAmeliorationRepository axeRepository;
    @Inject AuditLogService auditLogService;

    // === Création ========================================================

    /**
     * Retient une proposition du pipeline, ou reconnaît qu'elle est déjà là.
     *
     * <p>Rend l'axe créé, ou {@link Optional#empty()} si une proposition
     * identique existe déjà sur le même critère — auquel cas rien n'est écrit
     * et l'événement est journalisé.
     *
     * <p>Le libellé enregistré est celui de la proposition, à la troncature
     * de colonne près. La normalisation ne sert qu'à <em>comparer</em> : elle
     * ne touche jamais le texte conservé, sans quoi l'axe affiché ne serait
     * plus celui que l'IA a formulé.
     */
    public Optional<AxeAmelioration> proposerParIa(Audit audit, AuditCritere auditCritere,
                                                   Evaluation evaluation, String libelleBrut) {
        String libelle = tronquer(libelleBrut);

        Optional<AxeAmelioration> existant = doublonSurLeCritere(auditCritere, libelle);
        if (existant.isPresent()) {
            // Journalisé plutôt que tu : sans trace, une proposition écartée
            // pour doublon serait indiscernable d'une proposition jamais
            // produite, et l'on ne saurait pas si le pipeline a régressé.
            auditLogService.journaliser(
                    utilisateurDe(audit, evaluation), entrepriseDe(audit),
                    "AXE_DOUBLON_IGNORE", "axe_amelioration", existant.get().getId());
            LOG.debugf("Axe non dupliqué sur le critère %s : proposition identique déjà présente",
                    auditCritere == null ? null : auditCritere.getId());
            return Optional.empty();
        }

        AxeAmelioration axe = AxeAmelioration.proposeParIa(audit, auditCritere, evaluation, libelle);
        axeRepository.persist(axe);
        return Optional.of(axe);
    }

    /**
     * Rattache un axe à un élément du référentiel, si et seulement si cet
     * élément relève de la version sous laquelle la mission est conduite.
     *
     * <p>Un référentiel est versionné et immuable : rattacher un résultat
     * d'audit à un élément d'une autre version le rendrait incohérent avec le
     * catalogue qui a servi à l'évaluer, et la relecture comparerait deux
     * textes différents en croyant n'en lire qu'un.
     *
     * <p>Rend {@code true} si le rattachement a été posé.
     */
    public boolean rattacher(AxeAmelioration axe, Exigence cible) {
        if (!memeVersion(axe, cible == null ? null : cible.getReferentielVersion())) {
            return false;
        }
        axe.rattacherA(cible);
        return true;
    }

    public boolean rattacher(AxeAmelioration axe, PreuveAttendue cible) {
        if (!memeVersion(axe, cible == null ? null : cible.getReferentielVersion())) {
            return false;
        }
        axe.rattacherA(cible);
        return true;
    }

    public boolean rattacher(AxeAmelioration axe, RegleAnalyse cible) {
        if (!memeVersion(axe, cible == null ? null : cible.getReferentielVersion())) {
            return false;
        }
        axe.rattacherA(cible);
        return true;
    }

    // === Décisions humaines ==============================================

    /**
     * Retient l'axe.
     *
     * @throws DecisionAxeRefusee si l'axe n'est plus {@code PROPOSE}.
     */
    public AxeAmelioration valider(AxeAmelioration axe, Utilisateur decideur,
                                   UUID utilisateurId, UUID entrepriseId) {
        exigerProposition(axe, "validé");
        axe.valider(decideur);
        auditLogService.journaliser(utilisateurId, entrepriseId,
                "AXE_VALIDE", "axe_amelioration", axe.getId());
        return axe;
    }

    /**
     * Écarte l'axe, avec son motif.
     *
     * <p>L'axe rejeté n'est pas supprimé : effacer une recommandation écartée
     * rendrait la relecture invérifiable, et l'on ne saurait plus ce qui a été
     * proposé ni pourquoi cela n'a pas été retenu.
     *
     * @throws DecisionAxeRefusee si l'axe n'est plus {@code PROPOSE}.
     */
    public AxeAmelioration rejeter(AxeAmelioration axe, Utilisateur decideur, String motif,
                                   UUID utilisateurId, UUID entrepriseId) {
        exigerProposition(axe, "rejeté");
        axe.rejeter(decideur, motif);
        auditLogService.journaliser(utilisateurId, entrepriseId,
                "AXE_REJETE", "axe_amelioration", axe.getId());
        return axe;
    }

    /**
     * Une décision ne se prend que sur une proposition.
     *
     * <p>Le message nomme l'état atteint, et non l'état attendu : c'est lui
     * qui dit à l'appelant si quelqu'un l'a devancé, et dans quel sens.
     */
    private static void exigerProposition(AxeAmelioration axe, String geste) {
        if (axe.getStatut() == StatutAxe.PROPOSE) {
            return;
        }
        String etat = axe.getStatut() == StatutAxe.VALIDE ? "déjà validé" : "déjà rejeté";
        throw new DecisionAxeRefusee(
                "Cet axe est " + etat + " : une décision prise ne se reprend pas. "
                        + "Il ne peut donc plus être " + geste + ".");
    }

    // === Déduplication ===================================================

    /**
     * L'empreinte de comparaison d'un libellé.
     *
     * <p>Volontairement pauvre : espaces de tête et de queue retirés, suites
     * d'espaces ramenées à un seul, casse ignorée. Rien d'autre.
     *
     * <p>Ce qui n'est <strong>pas</strong> fait, et pourquoi : les accents
     * sont conservés (« a », « à » et « â » ne sont pas le même mot), aucun
     * mot n'est supprimé, aucune racinisation n'est appliquée, aucune mesure
     * de proximité sémantique n'est calculée. Une normalisation plus agressive
     * finirait par confondre deux propositions distinctes — et faire
     * disparaître une recommandation coûte plus cher que d'en afficher deux.
     *
     * <p>Limite assumée : deux formulations différentes du même conseil
     * coexistent. Voir le rapport de phase.
     */
    static String empreinte(String libelle) {
        if (libelle == null) {
            return "";
        }
        return libelle.strip().replaceAll("\\s+", " ").toLowerCase(Locale.ROOT);
    }

    /**
     * Cherche une proposition identique sur le même critère.
     *
     * <p>Le périmètre est le critère, jamais la mission entière : le même
     * conseil peut légitimement valoir pour deux critères différents, et les
     * fusionner ferait perdre à quel titre il a été formulé.
     *
     * <p>Sans critère rattaché, aucune comparaison n'est possible et l'on
     * crée — conserver un doublon éventuel vaut mieux que de rapprocher deux
     * axes sur le seul fait qu'ils appartiennent à la même mission.
     */
    private Optional<AxeAmelioration> doublonSurLeCritere(AuditCritere auditCritere, String libelle) {
        if (auditCritere == null) {
            return Optional.empty();
        }
        String empreinte = empreinte(libelle);
        return axeRepository.parAuditCritere(auditCritere.getId()).stream()
                .filter(a -> empreinte.equals(empreinte(a.getLibelle())))
                .findFirst();
    }

    // === Utilitaires =====================================================

    /**
     * Ramène le libellé à ce que la colonne accepte.
     *
     * <p>Un texte nul donne {@link #LIBELLE_PAR_DEFAUT} : la colonne est
     * {@code NOT NULL}, et refuser l'axe entier ferait perdre une
     * recommandation pour un champ vide.
     */
    private static String tronquer(String texte) {
        if (texte == null || texte.isBlank()) {
            return LIBELLE_PAR_DEFAUT;
        }
        String propre = texte.strip();
        return propre.length() > LIBELLE_MAX ? propre.substring(0, LIBELLE_MAX) : propre;
    }

    /** Vrai si la cible relève bien de la version du référentiel de la mission. */
    private static boolean memeVersion(AxeAmelioration axe, ReferentielVersion versionCible) {
        if (versionCible == null) {
            return false;
        }
        ReferentielVersion versionMission = axe.getAudit() == null
                ? null : axe.getAudit().getReferentielVersion();
        if (versionMission == null) {
            // Sans version de mission, rien ne permet d'affirmer que la cible
            // est la bonne. On ne rattache pas plutôt que de rattacher au
            // hasard.
            LOG.warnf("Rattachement écarté : la mission ne porte aucune version de référentiel");
            return false;
        }
        boolean coherent = versionMission.getId().equals(versionCible.getId());
        if (!coherent) {
            LOG.warnf("Rattachement écarté : la cible relève d'une autre version de référentiel");
        }
        return coherent;
    }

    private static UUID utilisateurDe(Audit audit, Evaluation evaluation) {
        if (evaluation != null && evaluation.getAnalyseIa() != null
                && evaluation.getAnalyseIa().getDeclenchePar() != null) {
            return evaluation.getAnalyseIa().getDeclenchePar().getId();
        }
        return null;
    }

    private static UUID entrepriseDe(Audit audit) {
        return audit == null || audit.getEntreprise() == null ? null : audit.getEntreprise().getId();
    }
}

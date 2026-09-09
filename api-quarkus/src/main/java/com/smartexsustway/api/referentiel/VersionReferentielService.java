package com.smartexsustway.api.referentiel;

import com.smartexsustway.api.domain.entity.Critere;
import com.smartexsustway.api.domain.entity.Domaine;
import com.smartexsustway.api.domain.entity.Exigence;
import com.smartexsustway.api.domain.entity.PreuveAttendue;
import com.smartexsustway.api.domain.entity.Question;
import com.smartexsustway.api.domain.entity.RegleAnalyse;
import com.smartexsustway.api.domain.entity.Referentiel;
import com.smartexsustway.api.domain.entity.ReferentielVersion;
import com.smartexsustway.api.domain.entity.SousDomaine;
import com.smartexsustway.api.domain.entity.Utilisateur;
import com.smartexsustway.api.domain.enums.StatutVersionReferentiel;
import com.smartexsustway.api.domain.repository.CritereRepository;
import com.smartexsustway.api.domain.repository.DomaineRepository;
import com.smartexsustway.api.domain.repository.ExigenceRepository;
import com.smartexsustway.api.domain.repository.PreuveAttendueRepository;
import com.smartexsustway.api.domain.repository.QuestionRepository;
import com.smartexsustway.api.domain.repository.ReferentielVersionRepository;
import com.smartexsustway.api.domain.repository.RegleAnalyseRepository;
import com.smartexsustway.api.domain.repository.SousDomaineRepository;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.persistence.EntityManager;
import org.jboss.logging.Logger;

import java.time.OffsetDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

/**
 * Cycle de vie des versions d'un référentiel.
 *
 * Une version publiée est immuable : c'est ce qui rend le résultat d'une
 * mission opposable. Corriger un référentiel publié consiste donc à en
 * dériver un brouillon, à le modifier, puis à le publier — la version
 * d'origine reste intacte et les missions qui l'ont auditée continuent de
 * lire exactement ce qu'elles ont audité.
 *
 * L'immuabilité elle-même est garantie en base par les déclencheurs de V49.
 * Ce service ne la met pas en œuvre : il l'anticipe, pour qu'un refus se
 * présente comme un 409 explicite plutôt que comme une erreur SQL.
 */
@ApplicationScoped
public class VersionReferentielService {

    private static final Logger LOG = Logger.getLogger(VersionReferentielService.class);

    @Inject ReferentielVersionRepository versionRepository;
    @Inject DomaineRepository domaineRepository;
    @Inject SousDomaineRepository sousDomaineRepository;
    @Inject CritereRepository critereRepository;
    @Inject QuestionRepository questionRepository;
    @Inject ExigenceRepository exigenceRepository;
    @Inject PreuveAttendueRepository preuveAttendueRepository;
    @Inject RegleAnalyseRepository regleAnalyseRepository;
    @Inject EntityManager entityManager;

    /** Levée quand une opération porterait sur un contenu figé. Traduite en 409 par les ressources. */
    public static class VersionFigeeException extends RuntimeException {
        public VersionFigeeException(String message) {
            super(message);
        }
    }

    /** Levée quand aucune version ne peut recevoir l'écriture demandée. */
    public static class AucunBrouillonException extends RuntimeException {
        public AucunBrouillonException(String message) {
            super(message);
        }
    }

    // --- Lecture -------------------------------------------------------

    /** Version courante d'un référentiel : celle que reçoit toute nouvelle mission. */
    public Optional<ReferentielVersion> versionPubliee(UUID referentielId) {
        return versionRepository.publiee(referentielId);
    }

    /**
     * Version sur laquelle porte l'administration : le brouillon s'il en
     * existe un, sinon la version publiée.
     *
     * Un seul écran de back-office sert les deux cas. Le distinguo est porté
     * par le statut renvoyé, pas par deux parcours séparés.
     */
    public ReferentielVersion versionDeTravail(Referentiel referentiel) {
        return versionRepository.brouillon(referentiel.getId())
                .or(() -> versionRepository.publiee(referentiel.getId()))
                .orElseThrow(() -> new AucunBrouillonException(
                        "Le référentiel " + referentiel.getCode() + " n'a aucune version"));
    }

    /**
     * Version dans laquelle écrire. Exige un brouillon : écrire dans une
     * version publiée reviendrait à modifier ce que des missions ont audité.
     */
    public ReferentielVersion brouillonPourEcriture(Referentiel referentiel) {
        return versionRepository.brouillon(referentiel.getId())
                .orElseThrow(() -> new AucunBrouillonException(
                        "Le référentiel " + referentiel.getCode()
                                + " n'a pas de version brouillon : créez-en une avant de modifier son contenu"));
    }

    /**
     * Refuse toute écriture sur un contenu appartenant à une version figée.
     * À appeler avant de modifier un domaine, un critère ou une question.
     */
    public void exigerVersionModifiable(ReferentielVersion version) {
        if (version == null || !version.estBrouillon()) {
            String statut = version == null ? "inconnue" : version.getStatut().name();
            throw new VersionFigeeException(
                    "Ce contenu appartient à une version " + statut
                            + " : créez une version brouillon pour le modifier");
        }
    }

    // --- Écriture ------------------------------------------------------

    /**
     * Première version d'un référentiel neuf, à l'état de brouillon.
     *
     * Créer un référentiel sans version le rendrait inutilisable : aucun
     * domaine ne pourrait y être ajouté, faute de version pour l'accueillir.
     */
    public ReferentielVersion creerVersionInitiale(Referentiel referentiel, Utilisateur auteur) {
        var version = new ReferentielVersion(referentiel, referentiel.getVersion(),
                "Version initiale.", 0, 0, auteur);
        versionRepository.persist(version);
        return version;
    }

    /**
     * Dérive un brouillon d'une version publiée, contenu compris.
     *
     * La copie est faite entité par entité plutôt qu'en SQL : la hiérarchie
     * doit être reconstruite (un critère copié pointe vers le domaine copié,
     * pas vers celui de la version source), et un référentiel se compte en
     * centaines de lignes pour une opération faite quelques fois par an.
     */
    public ReferentielVersion creerBrouillon(Referentiel referentiel, String numero, String notes,
                                             Utilisateur auteur) {
        versionRepository.brouillon(referentiel.getId()).ifPresent(existant -> {
            throw new VersionFigeeException("Le référentiel " + referentiel.getCode()
                    + " a déjà une version brouillon (" + existant.getNumero()
                    + ") : publiez-la ou supprimez-la avant d'en ouvrir une autre");
        });

        var brouillon = new ReferentielVersion(referentiel, numero, notes, 0, 0, auteur);
        Optional<ReferentielVersion> source = versionRepository.publiee(referentiel.getId());
        source.ifPresent(brouillon::setRemplaceVersion);
        versionRepository.persist(brouillon);

        source.ifPresent(v -> copierContenu(v, brouillon));

        brouillon.setNombreDomaines(domaineRepository.parVersion(brouillon.getId()).size());
        brouillon.setNombreCriteres((int) critereRepository.parVersion(brouillon.getId()).stream()
                .filter(Critere::isActif).count());
        return brouillon;
    }

    /**
     * Publie un brouillon : il devient la version courante, et celle qu'il
     * remplace passe en archive.
     *
     * L'ordre compte. Archiver d'abord, publier ensuite : l'index partiel
     * qui n'autorise qu'une version publiée par référentiel (V46) rejetterait
     * l'inverse.
     */
    public ReferentielVersion publier(ReferentielVersion brouillon, Utilisateur auteur) {
        if (!brouillon.estBrouillon()) {
            throw new VersionFigeeException("La version " + brouillon.getNumero()
                    + " est " + brouillon.getStatut() + " : elle est déjà publiée");
        }

        Referentiel referentiel = brouillon.getReferentiel();
        versionRepository.publiee(referentiel.getId()).ifPresent(courante -> {
            courante.setStatut(StatutVersionReferentiel.ARCHIVEE);
            entityManager.flush();
        });

        brouillon.setNombreDomaines(domaineRepository.parVersion(brouillon.getId()).size());
        brouillon.setNombreCriteres((int) critereRepository.parVersion(brouillon.getId()).stream()
                .filter(Critere::isActif).count());
        brouillon.setStatut(StatutVersionReferentiel.PUBLIEE);
        brouillon.setPublieeLe(OffsetDateTime.now());
        brouillon.setPublieePar(auteur);

        // Le catalogue annonce la version courante : sans cette reprise, il
        // continuerait d'afficher la précédente.
        referentiel.setVersion(brouillon.getNumero());

        LOG.infof("Référentiel %s : version %s publiée", referentiel.getCode(), brouillon.getNumero());
        return brouillon;
    }

    /**
     * Supprime un brouillon et tout son contenu.
     *
     * Sans danger : un brouillon n'est référencé par aucune mission, puisque
     * seule une version publiée peut en recevoir une. Une version publiée ou
     * archivée, elle, ne se supprime jamais (RG14).
     */
    public void supprimerBrouillon(ReferentielVersion version) {
        if (!version.estBrouillon()) {
            throw new VersionFigeeException("La version " + version.getNumero()
                    + " est " + version.getStatut() + " : l'historique des versions publiées est conservé");
        }
        // Des feuilles vers la racine : une règle dépend de sa pièce
        // attendue, une pièce de son exigence, une exigence de son critère.
        regleAnalyseRepository.parVersion(version.getId()).forEach(regleAnalyseRepository::delete);
        entityManager.flush();
        preuveAttendueRepository.parVersion(version.getId()).forEach(preuveAttendueRepository::delete);
        entityManager.flush();
        exigenceRepository.parVersion(version.getId()).forEach(exigenceRepository::delete);
        for (Critere critere : critereRepository.parVersion(version.getId())) {
            questionRepository.parCritere(critere.getId()).forEach(questionRepository::delete);
        }
        entityManager.flush();
        critereRepository.parVersion(version.getId()).forEach(critereRepository::delete);
        sousDomaineRepository.parVersion(version.getId()).forEach(sousDomaineRepository::delete);
        domaineRepository.parVersion(version.getId()).forEach(domaineRepository::delete);
        entityManager.flush();
        versionRepository.delete(version);
    }

    // --- Copie ---------------------------------------------------------

    private void copierContenu(ReferentielVersion source, ReferentielVersion cible) {
        Map<UUID, Domaine> domainesCopies = new HashMap<>();
        Map<UUID, SousDomaine> sousDomainesCopies = new HashMap<>();
        Map<UUID, Critere> criteresCopies = new HashMap<>();
        Map<UUID, Exigence> exigencesCopiees = new HashMap<>();
        Map<UUID, PreuveAttendue> preuvesAttenduesCopiees = new HashMap<>();

        for (Domaine domaine : domaineRepository.parVersion(source.getId())) {
            Domaine copie = domaine.copiePour(cible);
            domaineRepository.persist(copie);
            domainesCopies.put(domaine.getId(), copie);
        }

        for (SousDomaine sousDomaine : sousDomaineRepository.parVersion(source.getId())) {
            SousDomaine copie = sousDomaine.copieSous(domainesCopies.get(sousDomaine.getDomaine().getId()));
            sousDomaineRepository.persist(copie);
            sousDomainesCopies.put(sousDomaine.getId(), copie);
        }

        List<Critere> criteres = critereRepository.parVersion(source.getId());
        for (Critere critere : criteres) {
            SousDomaine sousDomaineCible = critere.getSousDomaine() == null
                    ? null
                    : sousDomainesCopies.get(critere.getSousDomaine().getId());
            Critere copie = critere.copieSous(domainesCopies.get(critere.getDomaine().getId()), sousDomaineCible);
            critereRepository.persist(copie);
            criteresCopies.put(critere.getId(), copie);

            for (Question question : questionRepository.parCritere(critere.getId())) {
                questionRepository.persist(question.copieSous(copie));
            }

            copierRattachementsDuCritere(critere.getId(), copie.getId());
        }

        // Le contenu métier suit la même descente : sans lui, un brouillon
        // dérivé perdrait ses exigences et ses règles, et la version publiée
        // suivante appauvrirait le référentiel sans que rien ne le signale.
        for (Exigence exigence : exigenceRepository.parVersion(source.getId())) {
            Exigence copie = exigence.copieSous(criteresCopies.get(exigence.getCritere().getId()));
            exigenceRepository.persist(copie);
            exigencesCopiees.put(exigence.getId(), copie);
        }

        for (PreuveAttendue preuve : preuveAttendueRepository.parVersion(source.getId())) {
            PreuveAttendue copie = preuve.copieSous(exigencesCopiees.get(preuve.getExigence().getId()));
            preuveAttendueRepository.persist(copie);
            preuvesAttenduesCopiees.put(preuve.getId(), copie);
        }

        for (RegleAnalyse regle : regleAnalyseRepository.parVersion(source.getId())) {
            // La portée est retraduite dans la version cible : recopier les
            // identifiants d'origine relierait la nouvelle règle à l'ancienne
            // exigence, donc à une version figée.
            Exigence exigenceCible = regle.getExigence() == null
                    ? null : exigencesCopiees.get(regle.getExigence().getId());
            PreuveAttendue preuveCible = regle.getPreuveAttendue() == null
                    ? null : preuvesAttenduesCopiees.get(regle.getPreuveAttendue().getId());
            regleAnalyseRepository.persist(regle.copieSous(
                    criteresCopies.get(regle.getCritere().getId()), exigenceCible, preuveCible));
        }

        entityManager.flush();
        LOG.infof("Version %s dérivée de %s : %d domaine(s), %d critère(s), %d exigence(s), "
                        + "%d preuve(s) attendue(s), %d règle(s)",
                cible.getNumero(), source.getNumero(), domainesCopies.size(), criteres.size(),
                exigencesCopiees.size(), preuvesAttenduesCopiees.size(),
                regleAnalyseRepository.parVersion(cible.getId()).size());
    }

    /**
     * Réplique les rattachements sectoriels et bailleurs d'un critère.
     *
     * Ces quatre tables n'ont pas d'entité JPA et sont copiées en SQL. Les
     * omettre serait une régression silencieuse : un critère sectoriel qui
     * perdrait ses secteurs cesserait d'être posé aux organisations
     * concernées dès la version suivante, sans que rien ne le signale.
     */
    private void copierRattachementsDuCritere(UUID ancienId, UUID nouveauId) {
        entityManager.createNativeQuery(
                        "INSERT INTO critere_secteur (critere_id, secteur_id, applicable, criticite_id) "
                                + "SELECT ?1, secteur_id, applicable, criticite_id FROM critere_secteur WHERE critere_id = ?2")
                .setParameter(1, nouveauId).setParameter(2, ancienId).executeUpdate();

        entityManager.createNativeQuery(
                        "INSERT INTO critere_bailleur (critere_id, bailleur_id, applicable) "
                                + "SELECT ?1, bailleur_id, applicable FROM critere_bailleur WHERE critere_id = ?2")
                .setParameter(1, nouveauId).setParameter(2, ancienId).executeUpdate();

        entityManager.createNativeQuery(
                        "INSERT INTO critere_coefficient_secteur (critere_id, secteur_id, coefficient) "
                                + "SELECT ?1, secteur_id, coefficient FROM critere_coefficient_secteur WHERE critere_id = ?2")
                .setParameter(1, nouveauId).setParameter(2, ancienId).executeUpdate();

        entityManager.createNativeQuery(
                        "INSERT INTO critere_criticite_secteur (critere_id, secteur_id, criticite_id) "
                                + "SELECT ?1, secteur_id, criticite_id FROM critere_criticite_secteur WHERE critere_id = ?2")
                .setParameter(1, nouveauId).setParameter(2, ancienId).executeUpdate();
    }
}

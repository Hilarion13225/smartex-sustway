package com.smartexsustway.api.ia.contrat;

import com.smartexsustway.api.domain.entity.Audit;
import com.smartexsustway.api.domain.entity.AuditCritere;
import com.smartexsustway.api.domain.entity.Critere;
import com.smartexsustway.api.domain.entity.Exigence;
import com.smartexsustway.api.domain.entity.PreuveAttendue;
import com.smartexsustway.api.domain.entity.RegleAnalyse;
import com.smartexsustway.api.domain.entity.ReponseQuestion;
import com.smartexsustway.api.domain.entity.SousDomaine;
import com.smartexsustway.api.domain.repository.ExigenceRepository;
import com.smartexsustway.api.domain.repository.PreuveAttendueRepository;
import com.smartexsustway.api.domain.repository.RegleAnalyseRepository;
import com.smartexsustway.api.domain.repository.ReponseQuestionRepository;
import com.smartexsustway.api.domain.rules.NiveauMaturite;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;

/**
 * Construit le payload du contrat IA V2, et la table qui permettra d'en
 * relire les références.
 *
 * Ce service ne remplace pas encore le chemin d'appel : il en constitue le
 * socle. Le contexte qu'il produit est complet et déterministe — deux
 * constructions successives sur des données inchangées rendent exactement le
 * même payload, références comprises.
 *
 * Le filtrage de provenance n'est pas réimplémenté ici : il reste dans les
 * trois {@code parCritereActives}, seuls à savoir écarter ce qu'une personne
 * a rejeté ou n'a pas encore relu. Les dupliquer les ferait diverger à la
 * première évolution.
 */
@ApplicationScoped
public class ConstructionContexteIa {

    @Inject ExigenceRepository exigenceRepository;
    @Inject PreuveAttendueRepository preuveAttendueRepository;
    @Inject RegleAnalyseRepository regleAnalyseRepository;
    @Inject ReponseQuestionRepository reponseQuestionRepository;

    /**
     * Le contexte soumis, et de quoi le relire.
     *
     * Les deux voyagent ensemble parce qu'ils n'ont de sens qu'ensemble : une
     * référence lue dans une réponse ne se résout que contre la table du
     * payload qui l'a produite.
     */
    public record Contexte(EvaluerCritereRequestV2 payload, ReferencesPreuvesAttendues references) {
    }

    /** Une pièce déjà lue depuis le stockage, prête à être soumise. */
    public record PieceSource(String nom, String typeMime, long taille, String contenuBase64) {
    }

    public Contexte construire(Audit audit, AuditCritere auditCritere, List<PieceSource> pieces) {
        Critere critere = auditCritere.getCritere();
        UUID critereId = critere.getId();

        List<Exigence> exigences = exigenceRepository.parCritereActives(critereId);
        List<PreuveAttendue> preuvesAttendues = preuveAttendueRepository.parCritereActives(critereId);
        List<RegleAnalyse> regles = regleAnalyseRepository.parCritereActives(critereId);

        Set<String> codesExigences = new HashSet<>();
        for (Exigence exigence : exigences) {
            codesExigences.add(exigence.getCode());
        }

        ReferencesPreuvesAttendues references = numeroter(preuvesAttendues, codesExigences);

        var payload = new EvaluerCritereRequestV2(
                EvaluerCritereRequestV2.VERSION,
                tracabilite(audit, auditCritere),
                situation(audit, critere),
                critere(critere),
                catalogue(exigences, preuvesAttendues, regles, references),
                declaration(auditCritere),
                pieces(pieces),
                organisation(audit),
                options(audit));

        return new Contexte(payload, references);
    }

    // === Références locales ==================================================

    /**
     * Attribue {@code <code_exigence>-P<rang>} à chaque preuve attendue.
     *
     * Le rang repart à 1 pour chaque exigence : c'est ce qui rend la référence
     * lisible — on voit à quelle exigence elle appartient — et stable face à
     * l'ajout d'une preuve sous une exigence voisine. Une numérotation globale
     * décalerait tout le reste au premier ajout.
     *
     * L'ordre vient de {@code parCritereActives}, dont le tri est total
     * (exigence.ordre, exigence.id, ordre, id). Sans tri total, deux preuves
     * de même rang échangeraient leurs références d'une analyse à l'autre.
     */
    private ReferencesPreuvesAttendues numeroter(List<PreuveAttendue> preuves, Set<String> codesExigences) {
        var builder = ReferencesPreuvesAttendues.builder();
        Map<String, Integer> rangParExigence = new LinkedHashMap<>();

        for (PreuveAttendue preuve : preuves) {
            Exigence exigence = preuve.getExigence();
            // Contrôle F : la preuve appartient bien à une exigence transmise.
            // `exigence` est obligatoire côté modèle, mais son appartenance au
            // jeu filtré ne l'est pas — une exigence rejetée écarte ses preuves
            // par la requête, et ce contrôle vérifie que la requête l'a fait.
            if (exigence == null || !codesExigences.contains(exigence.getCode())) {
                throw new IllegalStateException(
                        "Preuve attendue orpheline dans le contexte : '" + preuve.getLibelle()
                                + "' — son exigence n'est pas transmise");
            }
            int rang = rangParExigence.merge(exigence.getCode(), 1, Integer::sum);
            builder.ajouter(exigence.getCode() + "-P" + rang, preuve);
        }
        return builder.construire();
    }

    // === Blocs ===============================================================

    private EvaluerCritereRequestV2.Tracabilite tracabilite(Audit audit, AuditCritere auditCritere) {
        UUID versionId = audit.getReferentielVersion() == null
                ? null : audit.getReferentielVersion().getId();
        return new EvaluerCritereRequestV2.Tracabilite(audit.getId(), auditCritere.getId(), versionId);
    }

    private EvaluerCritereRequestV2.Situation situation(Audit audit, Critere critere) {
        var version = audit.getReferentielVersion();
        var referentiel = version == null ? null : version.getReferentiel();
        var domaine = critere.getDomaine();
        SousDomaine sousDomaine = critere.getSousDomaine();

        return new EvaluerCritereRequestV2.Situation(
                referentiel == null ? null : referentiel.getCode(),
                referentiel == null ? null : referentiel.getNom(),
                version == null ? null : version.getNumero(),
                domaine == null ? null : domaine.getCode(),
                domaine == null ? null : domaine.getNom(),
                sousDomaine == null ? null : sousDomaine.getCode(),
                sousDomaine == null ? null : sousDomaine.getNom());
    }

    private EvaluerCritereRequestV2.Critere critere(Critere critere) {
        return new EvaluerCritereRequestV2.Critere(
                critere.getCode(), critere.getLibelle(), critere.getDescription());
    }

    private EvaluerCritereRequestV2.Catalogue catalogue(List<Exigence> exigences,
                                                        List<PreuveAttendue> preuvesAttendues,
                                                        List<RegleAnalyse> regles,
                                                        ReferencesPreuvesAttendues references) {
        var exigencesDto = exigences.stream()
                .map(e -> new EvaluerCritereRequestV2.Exigence(
                        e.getCode(), e.getIntitule(), e.getEnonce()))
                .toList();

        var preuvesDto = new ArrayList<EvaluerCritereRequestV2.PreuveAttendue>();
        for (PreuveAttendue preuve : preuvesAttendues) {
            // Contrôle A : toute preuve transmise porte une référence. Elle a
            // été attribuée juste avant ; l'absence signalerait une divergence
            // entre la liste numérotée et celle sérialisée.
            String reference = references.referenceDe(preuve).orElseThrow(() ->
                    new IllegalStateException("Preuve attendue sans référence locale : " + preuve.getId()));
            preuvesDto.add(new EvaluerCritereRequestV2.PreuveAttendue(
                    reference,
                    preuve.getExigence().getCode(),
                    preuve.getType().name(),
                    preuve.getLibelle(),
                    preuve.getDescription(),
                    preuve.isObligatoire()));
        }

        var reglesDto = regles.stream()
                .map(r -> new EvaluerCritereRequestV2.RegleAnalyse(
                        r.getCode(), r.getType().name(), r.getLibelle(), r.getSeverite().name(),
                        portee(r, references),
                        r.getDefinition() == null ? Map.of() : r.getDefinition()))
                .toList();

        return new EvaluerCritereRequestV2.Catalogue(exigencesDto, preuvesDto, reglesDto);
    }

    /**
     * Traduit la portée d'une règle en référence transmissible.
     *
     * La référence d'une pièce vient de la table, jamais d'une reconstruction
     * à partir du libellé : le V1 désignait sa cible par une chaîne libre,
     * comparée nulle part et fragile à la moindre reformulation. Ici le
     * rattachement suit la clé étrangère {@code preuve_attendue_id}, qui
     * existe déjà en base et que le versionnement remappe correctement.
     *
     * Contrôles D et E : une règle qui vise une pièce absente du bloc transmis
     * est une incohérence, pas un cas à ignorer.
     */
    private EvaluerCritereRequestV2.Portee portee(RegleAnalyse regle, ReferencesPreuvesAttendues references) {
        PreuveAttendue cible = regle.getPreuveAttendue();
        if (cible != null) {
            String reference = references.referenceDe(cible).orElseThrow(() ->
                    new IllegalStateException("Règle " + regle.getCode()
                            + " : la preuve attendue visée n'est pas transmise dans ce contexte"));
            return EvaluerCritereRequestV2.Portee.surPreuveAttendue(reference);
        }
        if (regle.getExigence() != null) {
            return EvaluerCritereRequestV2.Portee.surExigence(regle.getExigence().getCode());
        }
        // Portée critère : aucune référence. Lui en attribuer une par commodité
        // rattacherait la règle la plus générale à une pièce particulière.
        return EvaluerCritereRequestV2.Portee.surLeCritere();
    }

    private EvaluerCritereRequestV2.Declaration declaration(AuditCritere auditCritere) {
        var reponses = reponseQuestionRepository.parAuditCritere(auditCritere.getId()).stream()
                .filter(r -> r.getNiveau() != null || r.getValeur() != null || r.getCommentaire() != null)
                .map(r -> new EvaluerCritereRequestV2.Reponse(
                        r.getAuditQuestion().getQuestion().getLibelle(),
                        valeurDeclaree(r),
                        r.getNiveau() == null ? null : r.getNiveau().intValue(),
                        r.getCommentaire()))
                .toList();
        return new EvaluerCritereRequestV2.Declaration(auditCritere.getScenario(), reponses);
    }

    /** Miroir de la règle appliquée par le V1 : le libellé complet, à défaut l'ancienne valeur fermée. */
    private static String valeurDeclaree(ReponseQuestion reponse) {
        String niveau = NiveauMaturite.libelleComplet(
                reponse.getNiveau() == null ? null : reponse.getNiveau().intValue());
        if (niveau != null) {
            return niveau;
        }
        return reponse.getValeur() != null ? reponse.getValeur().name() : null;
    }

    private List<EvaluerCritereRequestV2.Piece> pieces(List<PieceSource> sources) {
        if (sources == null || sources.isEmpty()) {
            return List.of();
        }
        var pieces = new ArrayList<EvaluerCritereRequestV2.Piece>(sources.size());
        int rang = 0;
        for (PieceSource source : sources) {
            rang++;
            pieces.add(new EvaluerCritereRequestV2.Piece(
                    "p" + rang, source.nom(), source.typeMime(), source.taille(),
                    source.contenuBase64(),
                    // Point d'extension : le rattachement d'une pièce à la
                    // preuve attendue qu'elle vise n'existe pas encore en base.
                    null));
        }
        return pieces;
    }

    /**
     * Le secteur, et rien d'autre — et seulement s'il est renseigné.
     *
     * Le bloc est absent plutôt que présent à null : signaler l'ignorance
     * inviterait le modèle à la commenter, ce qui produit du bruit sans
     * valeur. Une entreprise sans secteur reçoit un conseil moins situé, pas
     * un conseil sur son absence de secteur.
     */
    private EvaluerCritereRequestV2.Organisation organisation(Audit audit) {
        var entreprise = audit.getEntreprise();
        if (entreprise == null || entreprise.getSecteur() == null) {
            return null;
        }
        String secteur = entreprise.getSecteur().getNom();
        return secteur == null || secteur.isBlank() ? null
                : new EvaluerCritereRequestV2.Organisation(secteur);
    }

    private EvaluerCritereRequestV2.Options options(Audit audit) {
        boolean avancees = audit.getFormuleAbonnement() != null
                && "AVANCEES".equals(audit.getFormuleAbonnement().getCode());
        return new EvaluerCritereRequestV2.Options(avancees, avancees);
    }

    // === Contrôles de cohérence ==============================================

    /**
     * Vérifie le payload avant soumission.
     *
     * Les contrôles A, D, E et F sont appliqués à la construction, au moment
     * où l'on dispose des entités et où l'erreur peut nommer la ligne fautive.
     * Ceux qui restent ici portent sur le payload seul — la forme et l'unicité
     * des références, la cohérence exigence/preuve telle qu'elle sera lue par
     * le service d'agents.
     *
     * Séparés de la construction parce qu'ils doivent pouvoir s'exécuter sur
     * un payload venu d'ailleurs : un exemple de test, un rejeu.
     */
    public void verifier(EvaluerCritereRequestV2 payload) {
        Objects.requireNonNull(payload, "payload");
        var catalogue = payload.catalogue();
        if (catalogue == null) {
            throw new IllegalStateException("Contexte IA sans bloc catalogue");
        }

        Set<String> codesExigences = new HashSet<>();
        for (var exigence : catalogue.exigences()) {
            codesExigences.add(exigence.code());
        }

        Set<String> vues = new HashSet<>();
        for (var preuve : catalogue.preuvesAttendues()) {
            String reference = preuve.reference();
            // Contrôle A
            if (reference == null || reference.isBlank()) {
                throw new IllegalStateException(
                        "Preuve attendue sans référence : " + preuve.libelle());
            }
            // Contrôle C
            if (!reference.startsWith(preuve.exigenceCode() + "-P")) {
                throw new IllegalStateException("Référence '" + reference
                        + "' incohérente avec son exigence " + preuve.exigenceCode());
            }
            // Contrôle B
            if (!vues.add(reference)) {
                throw new IllegalStateException("Référence en double dans le payload : " + reference);
            }
            // Contrôle F
            if (!codesExigences.contains(preuve.exigenceCode())) {
                throw new IllegalStateException("Preuve attendue '" + reference
                        + "' rattachée à une exigence absente du payload");
            }
        }

        for (var regle : catalogue.reglesAnalyse()) {
            var portee = regle.portee();
            if (portee == null) {
                throw new IllegalStateException("Règle " + regle.code() + " sans portée");
            }
            switch (portee.niveau()) {
                case EvaluerCritereRequestV2.Portee.PREUVE_ATTENDUE -> {
                    // Contrôles D et E
                    if (!vues.contains(portee.reference())) {
                        throw new IllegalStateException("Règle " + regle.code()
                                + " : référence de preuve attendue non résoluble — " + portee.reference());
                    }
                }
                case EvaluerCritereRequestV2.Portee.EXIGENCE -> {
                    if (!codesExigences.contains(portee.reference())) {
                        throw new IllegalStateException("Règle " + regle.code()
                                + " : exigence visée absente du payload — " + portee.reference());
                    }
                }
                case EvaluerCritereRequestV2.Portee.CRITERE -> {
                    if (portee.reference() != null) {
                        throw new IllegalStateException("Règle " + regle.code()
                                + " : une portée critère ne doit porter aucune référence");
                    }
                }
                default -> throw new IllegalStateException(
                        "Règle " + regle.code() + " : niveau de portée inconnu — " + portee.niveau());
            }
        }
    }
}

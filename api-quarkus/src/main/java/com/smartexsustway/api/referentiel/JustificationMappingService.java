package com.smartexsustway.api.referentiel;

import com.smartexsustway.api.audit.AuditLogService;
import com.smartexsustway.api.domain.entity.Bailleur;
import com.smartexsustway.api.domain.entity.Critere;
import com.smartexsustway.api.domain.entity.CritereBailleurJustification;
import com.smartexsustway.api.domain.entity.ReferentielVersion;
import com.smartexsustway.api.domain.entity.Utilisateur;
import com.smartexsustway.api.domain.entity.UtilisateurEntreprise;
import com.smartexsustway.api.domain.enums.CorrespondanceBailleur;
import com.smartexsustway.api.domain.enums.StatutGenerique;
import com.smartexsustway.api.domain.enums.StatutUtilisateur;
import com.smartexsustway.api.domain.repository.BailleurRepository;
import com.smartexsustway.api.domain.repository.CritereBailleurJustificationRepository;
import com.smartexsustway.api.domain.repository.CritereRepository;
import com.smartexsustway.api.domain.repository.UtilisateurEntrepriseRepository;
import com.smartexsustway.api.domain.repository.UtilisateurRepository;
import com.smartexsustway.api.resource.dto.CritereBailleurJustificationDto;
import com.smartexsustway.api.resource.dto.CritereBailleurJustificationDto.Etat;
import com.smartexsustway.api.resource.dto.CritereBailleurJustificationRequest;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.persistence.EntityManager;
import org.eclipse.microprofile.jwt.JsonWebToken;

import java.util.ArrayList;
import java.util.List;
import java.util.Objects;
import java.util.UUID;

/**
 * Justifications documentaires des mappings critère ↔ bailleur (V74-A).
 *
 * <p>Ce service n'écrit jamais dans {@code critere_bailleur} et ne décide
 * d'aucune correspondance : il enregistre ce qu'une personne a lu dans un
 * document officiel, et la décision humaine qui s'y rapporte. L'indice de
 * préparation n'en tient pas encore compte (V74-B).
 *
 * <p>Chaque opération vérifie ses règles avant d'écrire, pour répondre par
 * un motif lisible et le bon statut. Les mêmes règles sont tenues par la
 * base (V74) : si une écriture concurrente passe entre la vérification et
 * l'écriture, c'est la base qui refuse, et ContrainteJustificationMapper
 * rend ce refus en 409. Les écritures sont suivies d'un {@code flush()} pour
 * que ce refus survienne dans la méthode, et non à la validation de la
 * transaction, où il arriverait enveloppé et échapperait au relais.
 */
@ApplicationScoped
public class JustificationMappingService {

    static final String ENTITE = "critere_bailleur_justification";
    private static final String ROLE_REQUIS = "SUPER_ADMIN";

    @Inject JsonWebToken jwt;
    @Inject EntityManager em;
    @Inject CritereRepository critereRepository;
    @Inject BailleurRepository bailleurRepository;
    @Inject CritereBailleurJustificationRepository justificationRepository;
    @Inject UtilisateurRepository utilisateurRepository;
    @Inject UtilisateurEntrepriseRepository utilisateurEntrepriseRepository;
    @Inject AuditLogService auditLogService;

    /** Critère et bailleur d'un mapping dont l'existence est établie. */
    private record Mapping(Critere critere, Bailleur bailleur) {
    }

    // === Lecture ============================================================

    /** La justification en cours, ou {@code NON_DOCUMENTE} si le mapping n'en a aucune. */
    public CritereBailleurJustificationDto consulter(UUID critereId, String bailleurCode) {
        exigerSuperAdminActif();
        Mapping mapping = mappingExistant(critereId, bailleurCode);
        return justificationRepository.vivante(critereId, mapping.bailleur().getId())
                .map(j -> versDto(j, mapping))
                .orElseGet(() -> CritereBailleurJustificationDto.nonDocumente(critereId, mapping.bailleur().getCode()));
    }

    /** Tout ce que le mapping a porté, la plus récente d'abord. */
    public List<CritereBailleurJustificationDto> historique(UUID critereId, String bailleurCode) {
        exigerSuperAdminActif();
        Mapping mapping = mappingExistant(critereId, bailleurCode);
        return justificationRepository.historique(critereId, mapping.bailleur().getId()).stream()
                .map(j -> versDto(j, mapping))
                .toList();
    }

    // === Écriture ===========================================================

    public CritereBailleurJustificationDto creer(UUID critereId, String bailleurCode,
                                                 CritereBailleurJustificationRequest requete) {
        Utilisateur auteur = exigerSuperAdminActif();
        Mapping mapping = mappingExistant(critereId, bailleurCode);
        exigerAucuneVivante(mapping);

        var justification = CritereBailleurJustification.brouillon(critereId, mapping.bailleur().getId(), auteur);
        if (requete != null) {
            appliquer(justification, requete, null);
        }
        justificationRepository.persist(justification);
        em.flush();

        journaliser(auteur, "JUSTIFICATION_MAPPING_CREEE", justification);
        return versDto(justification, mapping);
    }

    /** Seul un brouillon se modifie : une justification tranchée ne change plus. */
    public CritereBailleurJustificationDto modifier(UUID critereId, String bailleurCode, UUID id,
                                                    CritereBailleurJustificationRequest requete) {
        Utilisateur auteur = exigerSuperAdminActif();
        Mapping mapping = mappingExistant(critereId, bailleurCode);
        if (requete == null) {
            throw new JustificationRefuseeException(400, "Corps de requête manquant");
        }
        CritereBailleurJustification justification = justificationDuMapping(id, mapping);
        if (!justification.estBrouillon()) {
            throw new JustificationRefuseeException(409, "Cette justification a déjà été tranchée : "
                    + "elle ne se modifie plus. Créez une nouvelle justification pour toute nouvelle tentative.");
        }

        appliquer(justification, requete, auteur);
        em.flush();

        journaliser(auteur, "JUSTIFICATION_MAPPING_MODIFIEE", justification);
        return versDto(justification, mapping);
    }

    /**
     * Valide un brouillon dont la preuve est complète. Possible même si la
     * version du référentiel est publiée : justifier un mapping ne modifie
     * aucune table figée.
     */
    public CritereBailleurJustificationDto valider(UUID critereId, String bailleurCode, UUID id) {
        Utilisateur validateur = exigerSuperAdminActif();
        Mapping mapping = mappingExistant(critereId, bailleurCode);
        CritereBailleurJustification justification = justificationDuMapping(id, mapping);
        if (justification.estValidee()) {
            throw new JustificationRefuseeException(409, "Cette justification est déjà validée.");
        }
        if (justification.estRejetee()) {
            throw new JustificationRefuseeException(409, "Une justification rejetée ne se valide pas : "
                    + "créez une nouvelle justification.");
        }
        List<String> manquants = elementsDePreuveManquants(justification);
        if (!manquants.isEmpty()) {
            throw new JustificationRefuseeException(409, "Preuve incomplète, validation impossible. "
                    + "À renseigner : " + String.join(", ", manquants) + ".");
        }

        justification.valider(validateur);
        em.flush();

        journaliser(validateur, "JUSTIFICATION_MAPPING_VALIDEE", justification);
        return versDto(justification, mapping);
    }

    public CritereBailleurJustificationDto rejeter(UUID critereId, String bailleurCode, UUID id,
                                                   CritereBailleurJustificationRequest.Motif motif) {
        Utilisateur auteur = exigerSuperAdminActif();
        Mapping mapping = mappingExistant(critereId, bailleurCode);
        String texteMotif = motifExige(motif, "Un rejet exige un motif.");
        CritereBailleurJustification justification = justificationDuMapping(id, mapping);
        if (justification.estValidee()) {
            throw new JustificationRefuseeException(409, "Une justification validée ne peut pas être rejetée : "
                    + "périmez-la si elle ne tient plus.");
        }
        if (justification.estRejetee()) {
            throw new JustificationRefuseeException(409, "Cette justification est déjà rejetée.");
        }

        justification.rejeter(auteur, texteMotif);
        em.flush();

        journaliser(auteur, "JUSTIFICATION_MAPPING_REJETEE", justification);
        return versDto(justification, mapping);
    }

    /**
     * Défait une validation, sans effacer la trace : la ligne reste, datée et
     * motivée, et une nouvelle justification peut être créée. Ne touche pas
     * aux champs de modification : périmer n'est pas modifier le contenu.
     */
    public CritereBailleurJustificationDto perimer(UUID critereId, String bailleurCode, UUID id,
                                                   CritereBailleurJustificationRequest.Motif motif) {
        Utilisateur auteur = exigerSuperAdminActif();
        Mapping mapping = mappingExistant(critereId, bailleurCode);
        String texteMotif = motifExige(motif, "Une péremption exige un motif.");
        CritereBailleurJustification justification = justificationDuMapping(id, mapping);
        if (justification.estPerimee()) {
            throw new JustificationRefuseeException(409, "Cette justification est déjà périmée : "
                    + "sa péremption est définitive.");
        }
        if (!justification.estValidee()) {
            throw new JustificationRefuseeException(409, "Seule une justification validée peut être périmée.");
        }

        justification.perimer(auteur, texteMotif);
        em.flush();

        journaliser(auteur, "JUSTIFICATION_MAPPING_PERIMEE", justification);
        return versDto(justification, mapping);
    }

    /**
     * Reprend, sur le critère équivalent d'une version dérivée, le contenu de
     * la justification en cours du critère source.
     *
     * <p>La dérivation d'une version (V56) recopie les mappings, pas leurs
     * justifications : une preuve lue pour une version n'est pas réputée
     * valoir pour la suivante sans que quelqu'un le décide. Le report est ce
     * geste explicite, et il ne transfère aucune décision — la copie naît
     * brouillon et devra être tranchée de nouveau.
     */
    public CritereBailleurJustificationDto reporter(UUID critereCibleId, String bailleurCode,
                                                    CritereBailleurJustificationRequest.Report report) {
        Utilisateur auteur = exigerSuperAdminActif();
        if (report == null || report.sourceCritereId() == null) {
            throw new JustificationRefuseeException(400, "sourceCritereId est requis");
        }
        Mapping cible = mappingExistant(critereCibleId, bailleurCode);
        Critere source = critereRepository.findById(report.sourceCritereId());
        if (source == null) {
            throw new JustificationRefuseeException(404, "Critère source introuvable : " + report.sourceCritereId());
        }
        exigerEquivalentDeLaVersionParente(source, cible.critere());
        exigerAucuneVivante(cible);

        CritereBailleurJustification origine = justificationRepository
                .vivante(source.getId(), cible.bailleur().getId())
                .orElseThrow(() -> new JustificationRefuseeException(409,
                        "Le critère source n'a aucune justification en brouillon ou validée à reporter."));

        var copie = CritereBailleurJustification.reportDe(origine, critereCibleId, cible.bailleur().getId(), auteur);
        justificationRepository.persist(copie);
        em.flush();

        auditLogService.journaliserAvecDetails(auteur.getId(), null, "JUSTIFICATION_MAPPING_REPORTEE",
                ENTITE, copie.getId(), "{\"source\":\"" + origine.getId() + "\"}");
        return versDto(copie, cible);
    }

    // === Règles =============================================================

    /**
     * SUPER_ADMIN, et encore effectivement : le jeton peut survivre à la
     * révocation d'un rattachement, à la suspension du compte ou à la
     * désactivation du rôle. Les trois sont donc relus en base à chaque appel.
     * ADMIN_AUDIT n'est pas admis, contrairement aux tags d'applicabilité.
     */
    Utilisateur exigerSuperAdminActif() {
        if (jwt == null || jwt.getGroups() == null || !jwt.getGroups().contains(ROLE_REQUIS)) {
            throw refusDeDroits();
        }
        UUID utilisateurId;
        try {
            utilisateurId = UUID.fromString(jwt.getSubject());
        } catch (RuntimeException e) {
            throw refusDeDroits();
        }
        Utilisateur utilisateur = utilisateurRepository.findById(utilisateurId);
        if (utilisateur == null || utilisateur.getStatut() != StatutUtilisateur.ACTIF) {
            throw refusDeDroits();
        }
        boolean rattachementSuperAdminActif = utilisateurEntrepriseRepository.parUtilisateur(utilisateurId).stream()
                .anyMatch(JustificationMappingService::estSuperAdminActif);
        if (!rattachementSuperAdminActif) {
            throw refusDeDroits();
        }
        return utilisateur;
    }

    private static boolean estSuperAdminActif(UtilisateurEntreprise rattachement) {
        return rattachement.getStatut() == StatutGenerique.ACTIF
                && rattachement.getRole() != null
                && ROLE_REQUIS.equals(rattachement.getRole().getCode())
                && rattachement.getRole().getStatut() == StatutGenerique.ACTIF;
    }

    private static JustificationRefuseeException refusDeDroits() {
        return new JustificationRefuseeException(403,
                "Les justifications de mapping bailleur sont réservées à un SUPER_ADMIN actif.");
    }

    private Mapping mappingExistant(UUID critereId, String bailleurCode) {
        Critere critere = critereRepository.findById(critereId);
        if (critere == null) {
            throw new JustificationRefuseeException(404, "Critère introuvable : " + critereId);
        }
        Bailleur bailleur = bailleurRepository.parCode(bailleurCode)
                .orElseThrow(() -> new JustificationRefuseeException(404, "Bailleur inconnu : " + bailleurCode));
        if (!justificationRepository.mappingExiste(critereId, bailleur.getId())) {
            throw new JustificationRefuseeException(404,
                    "Ce critère n'est pas rattaché au bailleur " + bailleur.getCode() + " : rien à justifier.");
        }
        return new Mapping(critere, bailleur);
    }

    private CritereBailleurJustification justificationDuMapping(UUID id, Mapping mapping) {
        return justificationRepository.duCouple(id, mapping.critere().getId(), mapping.bailleur().getId())
                .orElseThrow(() -> new JustificationRefuseeException(404,
                        "Justification introuvable pour ce mapping : " + id));
    }

    private void exigerAucuneVivante(Mapping mapping) {
        if (justificationRepository.vivante(mapping.critere().getId(), mapping.bailleur().getId()).isPresent()) {
            throw new JustificationRefuseeException(409, "Une justification est déjà en cours pour ce mapping : "
                    + "modifiez-la, rejetez-la ou périmez-la avant d'en créer une autre.");
        }
    }

    /**
     * Le critère source doit être l'équivalent du critère cible dans la
     * version dont la cible dérive directement : même référentiel, même code
     * de domaine, même code de critère. Un code de critère n'est unique que
     * dans son domaine, d'où le rapprochement sur les deux.
     */
    private static void exigerEquivalentDeLaVersionParente(Critere source, Critere cible) {
        ReferentielVersion versionSource = source.getReferentielVersion();
        ReferentielVersion versionCible = cible.getReferentielVersion();
        if (!Objects.equals(versionSource.getReferentiel().getId(), versionCible.getReferentiel().getId())) {
            throw new JustificationRefuseeException(409,
                    "Le critère source appartient à un autre référentiel : report impossible.");
        }
        ReferentielVersion parente = versionCible.getRemplaceVersion();
        if (parente == null || !Objects.equals(parente.getId(), versionSource.getId())) {
            throw new JustificationRefuseeException(409, "Le report ne se fait que depuis la version dont la "
                    + "version cible dérive directement.");
        }
        if (!Objects.equals(source.getDomaine().getCode(), cible.getDomaine().getCode())
                || !Objects.equals(source.getCode(), cible.getCode())) {
            throw new JustificationRefuseeException(409,
                    "Le critère source n'est pas l'équivalent du critère cible (domaine ou code différent).");
        }
    }

    private static String motifExige(CritereBailleurJustificationRequest.Motif motif, String message) {
        if (motif == null || motif.motif() == null || motif.motif().isBlank()) {
            throw new JustificationRefuseeException(400, message);
        }
        return motif.motif();
    }

    /** Même liste que la contrainte cbj_validation_exige_preuve_complete, pour dire ce qui manque. */
    private static List<String> elementsDePreuveManquants(CritereBailleurJustification j) {
        List<String> manquants = new ArrayList<>();
        if (estBlanc(j.getDocumentNom())) manquants.add("documentNom");
        if (estBlanc(j.getDocumentEdition())) manquants.add("documentEdition");
        if (estBlanc(j.getDocumentOrganisme())) manquants.add("documentOrganisme");
        if (estBlanc(j.getReferenceOfficielle())) manquants.add("referenceOfficielle");
        if (estBlanc(j.getTexteSource())) manquants.add("texteSource");
        if (estBlanc(j.getJustification())) manquants.add("justification");
        if (j.getCorrespondance() == null || j.getCorrespondance() == CorrespondanceBailleur.NON_DETERMINEE) {
            manquants.add("correspondance");
        }
        return manquants;
    }

    private static boolean estBlanc(String valeur) {
        return valeur == null || valeur.isBlank();
    }

    private static void appliquer(CritereBailleurJustification justification,
                                  CritereBailleurJustificationRequest requete, Utilisateur auteurModification) {
        justification.remplacerContenu(
                requete.documentNom(),
                requete.documentEdition(),
                requete.documentOrganisme(),
                requete.documentUrl(),
                requete.referenceOfficielle(),
                requete.titreOfficiel(),
                requete.texteSource(),
                requete.localisation(),
                requete.confiance(),
                requete.correspondance(),
                requete.justification(),
                auteurModification);
    }

    /** Brouillon, validée, rejetée ou périmée : lu dans les décisions, la péremption primant. */
    static Etat etatDe(CritereBailleurJustification j) {
        if (j.estPerimee()) {
            return Etat.PERIMEE;
        }
        if (j.estRejetee()) {
            return Etat.REJETEE;
        }
        if (j.estValidee()) {
            return Etat.VALIDEE;
        }
        return Etat.BROUILLON;
    }

    private static CritereBailleurJustificationDto versDto(CritereBailleurJustification j, Mapping mapping) {
        return CritereBailleurJustificationDto.depuis(j, mapping.bailleur().getCode(), etatDe(j));
    }

    private void journaliser(Utilisateur auteur, String action, CritereBailleurJustification justification) {
        auditLogService.journaliser(auteur.getId(), null, action, ENTITE, justification.getId());
    }
}

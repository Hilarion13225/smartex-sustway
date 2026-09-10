package com.smartexsustway.api.referentiel;

import com.smartexsustway.api.audit.AuditLogService;
import com.smartexsustway.api.domain.entity.Exigence;
import com.smartexsustway.api.domain.entity.PreuveAttendue;
import com.smartexsustway.api.domain.entity.ReferentielVersion;
import com.smartexsustway.api.domain.entity.RegleAnalyse;
import com.smartexsustway.api.domain.entity.Utilisateur;
import com.smartexsustway.api.domain.enums.OrigineContenu;
import com.smartexsustway.api.domain.repository.UtilisateurRepository;
import com.smartexsustway.api.security.AutorisationService;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import org.jboss.logging.Logger;

import java.time.Instant;
import java.util.UUID;

/**
 * Acceptation par une personne d'un élément proposé par l'import assisté.
 *
 * C'est une opération métier, pas une écriture de champs. Elle n'est
 * volontairement joignable par aucun DTO de modification : {@code origine},
 * {@code origine_initiale}, {@code validee_par} et {@code validee_le} ne
 * s'écrivent que d'ici. Les exposer à la modification ordinaire permettrait de
 * se déclarer validateur sans rien relire, et la barrière de publication de
 * V57 tomberait d'elle-même.
 *
 * Ce que la validation change, et ce qu'elle ne change pas :
 *
 * <pre>
 *   avant : origine = IMPORT_IA        origine_initiale = IMPORT_IA
 *           validee_par = null         validee_le = null
 *
 *   après : origine = CONTENU_HUMAIN   origine_initiale = IMPORT_IA
 *           validee_par = &lt;personne&gt;    validee_le = &lt;instant&gt;
 * </pre>
 *
 * {@code origine} devient {@code CONTENU_HUMAIN} parce qu'une personne en
 * répond désormais — c'est le sens que V50 donne à cette valeur, et V57 le
 * dit explicitement. {@code origine_initiale} ne bouge jamais : sans elle,
 * plus personne ne pourrait dire après coup quelles lignes du catalogue ont
 * été suggérées par une machine, et l'import deviendrait invérifiable.
 *
 * Aucune nouvelle valeur d'énumération n'a été introduite : celle prévue par
 * l'architecture convient.
 */
@ApplicationScoped
public class ValidationContenuImporteService {

    private static final Logger LOG = Logger.getLogger(ValidationContenuImporteService.class);

    @Inject VersionReferentielService versionService;
    @Inject AutorisationService autorisationService;
    @Inject UtilisateurRepository utilisateurRepository;
    @Inject AuditLogService auditLogService;

    /** L'élément ne peut pas être validé, avec le code que la ressource doit rendre. */
    public static class ValidationRefuseeException extends RuntimeException {
        private final int statutHttp;

        public ValidationRefuseeException(int statutHttp, String message) {
            super(message);
            this.statutHttp = statutHttp;
        }

        public int statutHttp() {
            return statutHttp;
        }
    }

    /** Ce qu'a produit l'appel, pour que la ressource sache quoi répondre. */
    public record Resultat(boolean dejaValidee) {
    }

    // --- Opérations ------------------------------------------------------

    @Transactional
    public Resultat validerExigence(Exigence exigence, UUID versionAttendue, UUID utilisateurId) {
        Utilisateur auteur = exigerValidateur(exigence.getReferentielVersion(), versionAttendue,
                utilisateurId, "exigence", exigence.getId());

        if (dejaValidee(exigence.getOrigine(), exigence.getValideePar())) {
            return new Resultat(true);
        }
        exigerNonRejetee(exigence.getRejeteePar(), "exigence");
        exigerProposition(exigence.getOrigine(), exigence.getOrigineInitiale(), "exigence");

        exigence.setOrigine(OrigineContenu.CONTENU_HUMAIN);
        exigence.validerPar(auteur, Instant.now());
        journaliser(utilisateurId, "EXIGENCE_IMPORTEE_VALIDEE", "exigence", exigence.getId(),
                exigence.getReferentielVersion());
        return new Resultat(false);
    }

    @Transactional
    public Resultat validerPreuveAttendue(PreuveAttendue preuve, UUID versionAttendue,
                                          UUID utilisateurId) {
        Utilisateur auteur = exigerValidateur(preuve.getReferentielVersion(), versionAttendue,
                utilisateurId, "preuve_attendue", preuve.getId());

        if (dejaValidee(preuve.getOrigine(), preuve.getValideePar())) {
            return new Resultat(true);
        }
        exigerNonRejetee(preuve.getRejeteePar(), "preuve attendue");
        exigerProposition(preuve.getOrigine(), preuve.getOrigineInitiale(), "preuve attendue");

        preuve.setOrigine(OrigineContenu.CONTENU_HUMAIN);
        preuve.validerPar(auteur, Instant.now());
        journaliser(utilisateurId, "PREUVE_ATTENDUE_IMPORTEE_VALIDEE", "preuve_attendue",
                preuve.getId(), preuve.getReferentielVersion());
        return new Resultat(false);
    }

    @Transactional
    public Resultat validerRegle(RegleAnalyse regle, UUID versionAttendue, UUID utilisateurId) {
        Utilisateur auteur = exigerValidateur(regle.getReferentielVersion(), versionAttendue,
                utilisateurId, "regle_analyse", regle.getId());

        if (dejaValidee(regle.getOrigine(), regle.getValideePar())) {
            return new Resultat(true);
        }
        exigerNonRejetee(regle.getRejeteePar(), "règle d'analyse");
        exigerProposition(regle.getOrigine(), regle.getOrigineInitiale(), "règle d'analyse");

        regle.setOrigine(OrigineContenu.CONTENU_HUMAIN);
        regle.validerPar(auteur, Instant.now());
        journaliser(utilisateurId, "REGLE_ANALYSE_IMPORTEE_VALIDEE", "regle_analyse",
                regle.getId(), regle.getReferentielVersion());
        return new Resultat(false);
    }


    // --- Rejet ------------------------------------------------------------
    //
    // Écarter n'est pas supprimer. La ligne subsiste, marquée : sans elle, la
    // trace qu'une machine l'avait proposée disparaîtrait, et l'import
    // deviendrait invérifiable après coup. `origine` reste à IMPORT_IA —
    // personne n'a repris cette proposition à son compte.

    @Transactional
    public Resultat rejeterExigence(Exigence exigence, UUID versionAttendue, String motif,
                                    UUID utilisateurId) {
        Utilisateur auteur = exigerValidateur(exigence.getReferentielVersion(), versionAttendue,
                utilisateurId, "exigence", exigence.getId());

        if (exigence.getRejeteePar() != null) {
            return new Resultat(true);
        }
        exigerNonValidee(exigence.getValideePar(), "exigence");
        exigerProposition(exigence.getOrigine(), exigence.getOrigineInitiale(), "exigence");

        exigence.rejeterPar(auteur, Instant.now(), motifPropre(motif));
        journaliser(utilisateurId, "EXIGENCE_IMPORTEE_REJETEE", "exigence", exigence.getId(),
                exigence.getReferentielVersion(), motifPropre(motif));
        return new Resultat(false);
    }

    @Transactional
    public Resultat rejeterPreuveAttendue(PreuveAttendue preuve, UUID versionAttendue, String motif,
                                          UUID utilisateurId) {
        Utilisateur auteur = exigerValidateur(preuve.getReferentielVersion(), versionAttendue,
                utilisateurId, "preuve_attendue", preuve.getId());

        if (preuve.getRejeteePar() != null) {
            return new Resultat(true);
        }
        exigerNonValidee(preuve.getValideePar(), "preuve attendue");
        exigerProposition(preuve.getOrigine(), preuve.getOrigineInitiale(), "preuve attendue");

        preuve.rejeterPar(auteur, Instant.now(), motifPropre(motif));
        journaliser(utilisateurId, "PREUVE_ATTENDUE_IMPORTEE_REJETEE", "preuve_attendue",
                preuve.getId(), preuve.getReferentielVersion(), motifPropre(motif));
        return new Resultat(false);
    }

    @Transactional
    public Resultat rejeterRegle(RegleAnalyse regle, UUID versionAttendue, String motif,
                                 UUID utilisateurId) {
        Utilisateur auteur = exigerValidateur(regle.getReferentielVersion(), versionAttendue,
                utilisateurId, "regle_analyse", regle.getId());

        if (regle.getRejeteePar() != null) {
            return new Resultat(true);
        }
        exigerNonValidee(regle.getValideePar(), "règle d'analyse");
        exigerProposition(regle.getOrigine(), regle.getOrigineInitiale(), "règle d'analyse");

        regle.rejeterPar(auteur, Instant.now(), motifPropre(motif));
        journaliser(utilisateurId, "REGLE_ANALYSE_IMPORTEE_REJETEE", "regle_analyse",
                regle.getId(), regle.getReferentielVersion(), motifPropre(motif));
        return new Resultat(false);
    }

    /**
     * Un motif vide vaut absence de motif.
     *
     * La base refuse un motif sans rejet, mais accepte un rejet sans motif :
     * exiger une justification serait une décision métier que rien n'a
     * tranchée. Une chaîne blanche, elle, ne dit rien tout en occupant la
     * place d'une explication.
     */
    private static String motifPropre(String motif) {
        return motif == null || motif.isBlank() ? null : motif.trim();
    }

    /** On ne revient pas sur une décision par la porte opposée. */
    private static void exigerNonRejetee(Utilisateur rejeteur, String quoi) {
        if (rejeteur != null) {
            throw new ValidationRefuseeException(409,
                    "Cette " + quoi + " a été écartée : elle ne peut plus être validée");
        }
    }

    private static void exigerNonValidee(Utilisateur validateur, String quoi) {
        if (validateur != null) {
            throw new ValidationRefuseeException(409,
                    "Cette " + quoi + " a été validée : elle ne peut plus être écartée");
        }
    }

    // --- Gardes ----------------------------------------------------------

    /**
     * Vérifie que l'appelant peut valider, et que l'élément est bien celui
     * qu'il croit valider.
     */
    private Utilisateur exigerValidateur(ReferentielVersion version, UUID versionAttendue,
                                         UUID utilisateurId, String entite, UUID entiteId) {
        // Le rôle porté par le jeton ne suffit pas : un rattachement révoqué
        // laisse le jeton valide jusqu'à son expiration, et @RolesAllowed
        // continuerait de laisser passer. La vérification est refaite en base.
        if (utilisateurId == null || !autorisationService.estAccesGlobalActif(utilisateurId)) {
            throw new ValidationRefuseeException(403,
                    "Seul un administrateur Smartex en fonction peut valider le contenu importé");
        }

        // Une version publiée est figée : la valider reviendrait à modifier un
        // référentiel sur lequel des missions s'appuient déjà. Même garde que
        // partout ailleurs dans l'administration du catalogue.
        versionService.exigerVersionModifiable(version);

        // Le client dit sur quel brouillon il croit travailler. Sans cette
        // confirmation, une interface qui aurait changé de version entre
        // l'affichage et le clic validerait un élément qu'elle n'a pas montré.
        if (versionAttendue != null && !versionAttendue.equals(version.getId())) {
            throw new ValidationRefuseeException(409,
                    "Cet élément appartient à la version " + version.getNumero()
                            + ", et non à celle que la requête désigne");
        }

        Utilisateur auteur = utilisateurRepository.findById(utilisateurId);
        if (auteur == null) {
            throw new ValidationRefuseeException(403, "Validateur introuvable");
        }
        LOG.debugf("Validation de %s %s par %s", entite, entiteId, utilisateurId);
        return auteur;
    }

    /**
     * Rejoue-t-on une validation déjà faite ?
     *
     * La réponse est oui dès qu'un validateur est inscrit — quelle que soit
     * l'origine courante, puisque la validation l'a justement fait passer à
     * CONTENU_HUMAIN. L'appel est alors sans effet : réécrire la date ferait
     * mentir la trace sur le moment où la relecture a réellement eu lieu.
     */
    private static boolean dejaValidee(OrigineContenu origine, Utilisateur validateur) {
        return validateur != null;
    }

    /**
     * Refuse de valider ce qui n'a jamais été proposé par l'IA.
     *
     * Poser un validateur sur un contenu rédigé à la main lui inventerait une
     * relecture qui n'a pas eu lieu, et brouillerait la seule information que
     * ces colonnes portent.
     */
    private static void exigerProposition(OrigineContenu origine, OrigineContenu origineInitiale,
                                          String quoi) {
        if (origine != OrigineContenu.IMPORT_IA && origineInitiale != OrigineContenu.IMPORT_IA) {
            throw new ValidationRefuseeException(409,
                    "Cette " + quoi + " n'a pas été proposée par un import assisté : "
                            + "il n'y a rien à valider");
        }
    }

    /**
     * Consigne la validation, avec de quoi la retrouver.
     *
     * L'entrée porte qui, quoi, quand et l'opération ; le contexte JSON y
     * ajoute la version et le référentiel concernés. Sans eux, retrouver ce
     * qui a été validé sur un brouillon donné supposerait de remonter chaque
     * identifiant d'élément un par un, y compris ceux qui auraient été
     * supprimés depuis.
     */
    private void journaliser(UUID utilisateurId, String action, String entite, UUID entiteId,
                             ReferentielVersion version) {
        journaliser(utilisateurId, action, entite, entiteId, version, null);
    }

    private void journaliser(UUID utilisateurId, String action, String entite, UUID entiteId,
                             ReferentielVersion version, String motif) {
        String details = """
                {"referentiel_version_id":"%s","version_numero":"%s","referentiel_code":"%s","nature":"%s","motif":%s}"""
                .formatted(version.getId(), echapper(version.getNumero()),
                        echapper(version.getReferentiel().getCode()), entite,
                        motif == null ? "null" : "\"" + echapper(motif) + "\"");
        auditLogService.journaliserAvecDetails(utilisateurId, null, action, entite, entiteId, details);
    }

    /** Un code ou un numéro ne devrait pas contenir de guillemet, mais la trace ne se casse pas pour si peu. */
    private static String echapper(String valeur) {
        return valeur == null ? "" : valeur.replace("\\", "\\\\").replace("\"", "\\\"");
    }
}

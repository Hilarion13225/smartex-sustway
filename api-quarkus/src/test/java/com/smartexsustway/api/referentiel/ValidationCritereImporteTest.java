package com.smartexsustway.api.referentiel;

import com.smartexsustway.api.domain.entity.Critere;
import com.smartexsustway.api.domain.entity.Domaine;
import com.smartexsustway.api.domain.entity.Exigence;
import com.smartexsustway.api.domain.entity.Referentiel;
import com.smartexsustway.api.domain.entity.ReferentielVersion;
import com.smartexsustway.api.domain.enums.OrigineContenu;
import com.smartexsustway.api.domain.enums.StatutVersionReferentiel;
import com.smartexsustway.api.domain.enums.TypeReferentiel;
import com.smartexsustway.api.domain.repository.CritereRepository;
import com.smartexsustway.api.domain.repository.EntrepriseRepository;
import com.smartexsustway.api.domain.repository.RoleRepository;
import com.smartexsustway.api.domain.repository.UtilisateurEntrepriseRepository;
import com.smartexsustway.api.domain.repository.UtilisateurRepository;
import com.smartexsustway.api.resource.support.UtilisateurDeTest;
import com.smartexsustway.api.security.JwtService;
import io.quarkus.narayana.jta.QuarkusTransaction;
import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Provenance et validation du critère (V75).
 *
 * V50 a posé {@code origine} sur {@code exigence}, V57 l'a étendue à
 * {@code preuve_attendue} et {@code regle_analyse}. {@code critere} date de V1
 * et portait pourtant du contenu proposé : libellé, description,
 * applicabilité, coefficient de pondération et criticité, tels que le service
 * d'agents les rend. La barrière de publication ne les voyait pas.
 *
 * Ce que ces tests établissent :
 *
 * La barrière tient au niveau de la base, pas dans le code applicatif — elle
 * est éprouvée ici par un {@code UPDATE} natif qui contourne tout le service.
 *
 * L'unité de décision est la LIGNE : accepter un critère accepte du même geste
 * son coefficient et sa criticité, qui viennent de la même proposition.
 *
 * Le contenu antérieur n'est pas touché : le défaut {@code CONTENU_HUMAIN}
 * suffit à mettre les 424 critères déjà en base hors d'atteinte du prédicat,
 * sans le moindre {@code UPDATE}.
 */
@QuarkusTest
class ValidationCritereImporteTest {

    @Inject EntityManager entityManager;
    @Inject CritereRepository critereRepository;
    @Inject ValidationContenuImporteService validationService;
    @Inject JwtService jwtService;
    @Inject UtilisateurRepository utilisateurRepository;
    @Inject EntrepriseRepository entrepriseRepository;
    @Inject RoleRepository roleRepository;
    @Inject UtilisateurEntrepriseRepository utilisateurEntrepriseRepository;

    // === Décor ==============================================================

    /**
     * Un référentiel neuf et son brouillon, montés pour un seul test.
     *
     * Chaque test a le sien : les publications réussies laissent une version
     * figée, qu'aucun test suivant ne pourrait plus nettoyer — une version
     * publiée ne revient pas au brouillon.
     */
    private record Decor(UUID referentielId, UUID versionId, UUID domaineId, UUID relecteurId) {
    }

    private Decor monterDecor() {
        // Le relecteur doit être un administrateur Smartex en fonction : le
        // service revérifie le rôle en base, parce qu'un rattachement révoqué
        // laisse le jeton valide jusqu'à son expiration.
        UUID relecteurId = UUID.fromString(UtilisateurDeTest.creerAvecRole(jwtService, "SUPER_ADMIN",
                utilisateurRepository, entrepriseRepository, roleRepository,
                utilisateurEntrepriseRepository).id);

        return QuarkusTransaction.requiringNew().call(() -> {
            String suffixe = UUID.randomUUID().toString().substring(0, 8).toUpperCase();

            var referentiel = new Referentiel("_T_V75_" + suffixe,
                    "Référentiel de test V75 " + suffixe, TypeReferentiel.SMARTEX);
            entityManager.persist(referentiel);

            var version = new ReferentielVersion(referentiel, "0.1", "Décor de test V75", 1, 0, null);
            entityManager.persist(version);

            var domaine = new Domaine(version, "D0", "Domaine de test");
            entityManager.persist(domaine);

            entityManager.flush();
            return new Decor(referentiel.getId(), version.getId(), domaine.getId(), relecteurId);
        });
    }

    /**
     * Une version cible dans un référentiel NEUF.
     *
     * `referentiel_version_un_seul_brouillon` n'autorise qu'un brouillon par
     * référentiel : dériver dans le même en créerait un second.
     */
    private record Cible(UUID versionId, UUID domaineId) {
    }

    private Cible monterCible() {
        return QuarkusTransaction.requiringNew().call(() -> {
            String suffixe = UUID.randomUUID().toString().substring(0, 8).toUpperCase();
            var referentiel = new Referentiel("_T_V75C_" + suffixe,
                    "Référentiel cible V75 " + suffixe, TypeReferentiel.SMARTEX);
            entityManager.persist(referentiel);
            var cible = new ReferentielVersion(referentiel, "0.2", "Copie de test V75", 1, 1, null);
            entityManager.persist(cible);
            var domaineCible = new Domaine(cible, "D0", "Domaine copié");
            entityManager.persist(domaineCible);
            entityManager.flush();
            return new Cible(cible.getId(), domaineCible.getId());
        });
    }

    private UUID poserCritere(Decor decor, String code, OrigineContenu origine) {
        return QuarkusTransaction.requiringNew().call(() -> {
            var domaine = entityManager.find(Domaine.class, decor.domaineId());
            var critere = new Critere(domaine, code, "Critère " + code);
            critere.setDescription("Description proposée pour " + code);
            critere.setCoefficientPonderation(new BigDecimal("2.0"));
            critere.setOrigine(origine);
            if (origine == OrigineContenu.IMPORT_IA) {
                critere.setOrigineInitiale(OrigineContenu.IMPORT_IA);
            }
            entityManager.persist(critere);
            // Tout critère porte au moins une exigence — invariant du
            // catalogue, vérifié globalement par ContenuMetierReferentielTest.
            // Elle reste CONTENU_HUMAIN : ce test porte sur le critère, et une
            // exigence proposée brouillerait le compte de la barrière.
            entityManager.persist(new Exigence(critere, code + "-E1", "Exigence de test",
                    "Énoncé de test pour " + code));
            entityManager.flush();
            return critere.getId();
        });
    }

    /** Valide en base, sans passer par le service — pour isoler le déclencheur. */
    private void validerEnBase(UUID critereId, UUID relecteurId) {
        QuarkusTransaction.requiringNew().run(() -> {
            entityManager.createNativeQuery(
                            "UPDATE critere SET origine = 'CONTENU_HUMAIN', validee_par = ?1, "
                                    + "validee_le = now() WHERE id = ?2")
                    .setParameter(1, relecteurId).setParameter(2, critereId)
                    .executeUpdate();
            entityManager.flush();
        });
    }

    private void rejeterEnBase(UUID critereId, UUID relecteurId) {
        QuarkusTransaction.requiringNew().run(() -> {
            entityManager.createNativeQuery(
                            "UPDATE critere SET rejetee_par = ?1, rejetee_le = now() WHERE id = ?2")
                    .setParameter(1, relecteurId).setParameter(2, critereId)
                    .executeUpdate();
            entityManager.flush();
        });
    }

    /**
     * Tente la publication en contournant tout le code applicatif.
     *
     * La garantie n'est pas dans le service mais dans le déclencheur : elle
     * doit donc tenir aussi pour un script d'exploitation.
     */
    private void publierEnBase(UUID versionId) {
        QuarkusTransaction.requiringNew().run(() -> {
            entityManager.createNativeQuery(
                            "UPDATE referentiel_version SET statut = 'PUBLIEE' WHERE id = ?1")
                    .setParameter(1, versionId)
                    .executeUpdate();
            entityManager.flush();
        });
    }

    private static String deroule(Throwable erreur) {
        var texte = new StringBuilder();
        for (Throwable t = erreur; t != null; t = t.getCause()) {
            texte.append(t.getMessage()).append(" | ");
        }
        return texte.toString();
    }

    private long compter(String sql, Object... parametres) {
        var requete = entityManager.createNativeQuery(sql);
        for (int i = 0; i < parametres.length; i++) {
            requete.setParameter(i + 1, parametres[i]);
        }
        return ((Number) requete.getSingleResult()).longValue();
    }

    // === T1 à T5 — la barrière de publication ===============================

    /** T1 — un critère proposé que personne n'a tranché bloque la publication. */
    @Test
    void critereImporteNonValide_bloqueLaPublication() {
        Decor decor = monterDecor();
        poserCritere(decor, "D0-01", OrigineContenu.IMPORT_IA);

        var erreur = assertThrows(Exception.class, () -> publierEnBase(decor.versionId()));
        assertTrue(deroule(erreur).contains("validé"),
                "Le refus doit venir de la base, avec un motif explicite : " + deroule(erreur));
    }

    /** T2 — une fois accepté, il ne bloque plus. */
    @Test
    void critereImporteValide_autoriseLaPublication() {
        Decor decor = monterDecor();
        UUID critereId = poserCritere(decor, "D0-01", OrigineContenu.IMPORT_IA);
        validerEnBase(critereId, decor.relecteurId());

        publierEnBase(decor.versionId());

        assertEquals(1, compter(
                "SELECT count(*) FROM referentiel_version WHERE id = ?1 AND statut = 'PUBLIEE'",
                decor.versionId()));
    }

    /**
     * T3 — écarté, il ne bloque pas davantage.
     *
     * C'est la règle de V58, reprise telle quelle : ce qui bloque est ce que
     * personne n'a regardé, non ce qui a été refusé.
     */
    @Test
    void critereImporteRejete_nEmpechePasLaPublication() {
        Decor decor = monterDecor();
        UUID critereId = poserCritere(decor, "D0-01", OrigineContenu.IMPORT_IA);
        rejeterEnBase(critereId, decor.relecteurId());

        publierEnBase(decor.versionId());

        assertEquals(1, compter(
                "SELECT count(*) FROM referentiel_version WHERE id = ?1 AND statut = 'PUBLIEE'",
                decor.versionId()));
        // La ligne écartée subsiste, et son origine reste IMPORT_IA : personne
        // ne l'a reprise à son compte.
        assertEquals(1, compter(
                "SELECT count(*) FROM critere WHERE id = ?1 AND origine = 'IMPORT_IA' "
                        + "AND rejetee_par IS NOT NULL", critereId));
    }

    /**
     * T4 — un critère de contenu humain ne bloque jamais.
     *
     * C'est la garantie de compatibilité : les critères déjà en base ont reçu
     * le défaut {@code CONTENU_HUMAIN}, et le prédicat ne porte que sur
     * {@code IMPORT_IA}.
     */
    @Test
    void critereContenuHumain_neBloqueJamais() {
        Decor decor = monterDecor();
        poserCritere(decor, "D0-01", OrigineContenu.CONTENU_HUMAIN);
        poserCritere(decor, "D0-02", OrigineContenu.CONTENU_HUMAIN);

        publierEnBase(decor.versionId());

        assertEquals(1, compter(
                "SELECT count(*) FROM referentiel_version WHERE id = ?1 AND statut = 'PUBLIEE'",
                decor.versionId()));
    }

    /** T5 — un seul critère en attente parmi plusieurs suffit à refuser. */
    @Test
    void unSeulCritereNonValideParmiPlusieurs_faitRefuser() {
        Decor decor = monterDecor();
        UUID c1 = poserCritere(decor, "D0-01", OrigineContenu.IMPORT_IA);
        UUID c2 = poserCritere(decor, "D0-02", OrigineContenu.IMPORT_IA);
        poserCritere(decor, "D0-03", OrigineContenu.IMPORT_IA);
        poserCritere(decor, "D0-99", OrigineContenu.CONTENU_HUMAIN);

        validerEnBase(c1, decor.relecteurId());
        rejeterEnBase(c2, decor.relecteurId());

        var erreur = assertThrows(Exception.class, () -> publierEnBase(decor.versionId()));
        assertTrue(deroule(erreur).contains("1 élément"),
                "Le refus doit nommer le seul élément resté en attente : " + deroule(erreur));
    }

    // === T6 à T8 — le service de validation =================================

    /** T6 — valider par le service rend la version publiable. */
    @Test
    void validerParLeService_rendLaVersionPubliable() {
        Decor decor = monterDecor();
        UUID critereId = poserCritere(decor, "D0-01", OrigineContenu.IMPORT_IA);

        assertThrows(Exception.class, () -> publierEnBase(decor.versionId()));

        QuarkusTransaction.requiringNew().run(() -> {
            Critere critere = critereRepository.findById(critereId);
            var resultat = validationService.validerCritere(critere, decor.versionId(),
                    decor.relecteurId());
            assertFalse(resultat.dejaValidee());
        });

        publierEnBase(decor.versionId());

        assertEquals(1, compter(
                "SELECT count(*) FROM referentiel_version WHERE id = ?1 AND statut = 'PUBLIEE'",
                decor.versionId()));
    }

    /**
     * T7 — rejeter par le service suit la règle de V58.
     *
     * {@code origine} reste à {@code IMPORT_IA} : personne n'a repris cette
     * proposition. {@code origine_initiale} ne bouge jamais, sans quoi l'import
     * deviendrait invérifiable après coup.
     */
    @Test
    void rejeterParLeService_respecteLeComportementV58() {
        Decor decor = monterDecor();
        UUID critereId = poserCritere(decor, "D0-01", OrigineContenu.IMPORT_IA);

        QuarkusTransaction.requiringNew().run(() -> {
            Critere critere = critereRepository.findById(critereId);
            validationService.rejeterCritere(critere, decor.versionId(), "Hors sujet",
                    decor.relecteurId());
        });

        QuarkusTransaction.requiringNew().run(() -> {
            Critere critere = critereRepository.findById(critereId);
            assertEquals(OrigineContenu.IMPORT_IA, critere.getOrigine());
            assertEquals(OrigineContenu.IMPORT_IA, critere.getOrigineInitiale());
            assertNotNull(critere.getRejeteePar());
            assertNotNull(critere.getRejeteeLe());
            assertEquals("Hors sujet", critere.getMotifRejet());
            assertNull(critere.getValideePar());
        });

        publierEnBase(decor.versionId());
        assertEquals(1, compter(
                "SELECT count(*) FROM referentiel_version WHERE id = ?1 AND statut = 'PUBLIEE'",
                decor.versionId()));
    }

    /**
     * T8 — le coefficient appartient à la même unité de validation que le reste.
     *
     * Décision D2 : il n'existe pas de validation indépendante du libellé, de
     * la description, de l'applicabilité, du coefficient et de la criticité.
     * Accepter le critère les accepte tous, et le coefficient — qui pèse
     * directement sur le score — n'est ni recalculé ni remis à sa valeur par
     * défaut au passage.
     */
    @Test
    void leCoefficient_appartientALaMemeUniteDeValidation() {
        Decor decor = monterDecor();
        UUID critereId = poserCritere(decor, "D0-01", OrigineContenu.IMPORT_IA);

        assertEquals(1, compter(
                "SELECT count(*) FROM critere WHERE id = ?1 AND coefficient_ponderation = 2.0 "
                        + "AND origine = 'IMPORT_IA' AND validee_par IS NULL", critereId));

        QuarkusTransaction.requiringNew().run(() -> {
            Critere critere = critereRepository.findById(critereId);
            validationService.validerCritere(critere, decor.versionId(), decor.relecteurId());
        });

        QuarkusTransaction.requiringNew().run(() -> {
            Critere critere = critereRepository.findById(critereId);
            // Une seule décision a couvert la ligne entière.
            assertEquals(OrigineContenu.CONTENU_HUMAIN, critere.getOrigine());
            assertEquals(OrigineContenu.IMPORT_IA, critere.getOrigineInitiale());
            assertNotNull(critere.getValideePar());
            assertEquals(0, new BigDecimal("2.0").compareTo(critere.getCoefficientPonderation()),
                    "Le coefficient proposé est validé avec la ligne, sans être altéré");
            assertEquals("Description proposée pour D0-01", critere.getDescription());
        });
    }

    // === Contraintes de la migration ========================================

    /** Une proposition est retenue ou écartée, jamais les deux. */
    @Test
    void unCritereValideEtRejete_estRefuseParLaBase() {
        Decor decor = monterDecor();
        UUID critereId = poserCritere(decor, "D0-01", OrigineContenu.IMPORT_IA);
        validerEnBase(critereId, decor.relecteurId());

        var erreur = assertThrows(Exception.class,
                () -> rejeterEnBase(critereId, decor.relecteurId()));
        assertTrue(deroule(erreur).toLowerCase().contains("critere_decision_unique"),
                "La base doit refuser par critere_decision_unique : " + deroule(erreur));
    }

    /** Un validateur sans date ne dit rien d'exploitable. */
    @Test
    void uneValidationSansDate_estRefuseeParLaBase() {
        Decor decor = monterDecor();
        UUID critereId = poserCritere(decor, "D0-01", OrigineContenu.IMPORT_IA);

        var erreur = assertThrows(Exception.class, () -> QuarkusTransaction.requiringNew().run(() -> {
            entityManager.createNativeQuery("UPDATE critere SET validee_par = ?1 WHERE id = ?2")
                    .setParameter(1, decor.relecteurId()).setParameter(2, critereId)
                    .executeUpdate();
            entityManager.flush();
        }));
        assertTrue(deroule(erreur).toLowerCase().contains("critere_validation_complete"),
                "La base doit refuser par critere_validation_complete : " + deroule(erreur));
    }

    /** Un motif sans rejet laisserait croire à une décision qui n'a pas été prise. */
    @Test
    void unMotifSansRejet_estRefuseParLaBase() {
        Decor decor = monterDecor();
        UUID critereId = poserCritere(decor, "D0-01", OrigineContenu.IMPORT_IA);

        var erreur = assertThrows(Exception.class, () -> QuarkusTransaction.requiringNew().run(() -> {
            entityManager.createNativeQuery("UPDATE critere SET motif_rejet = 'x' WHERE id = ?1")
                    .setParameter(1, critereId)
                    .executeUpdate();
            entityManager.flush();
        }));
        assertTrue(deroule(erreur).toLowerCase().contains("critere_motif_rejet_motive"),
                "La base doit refuser par critere_motif_rejet_motive : " + deroule(erreur));
    }

    // === Compatibilité avec l'historique ====================================

    /**
     * Les critères déjà en base sont tous {@code CONTENU_HUMAIN}.
     *
     * C'est le seul mécanisme de compatibilité : le défaut de la colonne. Si
     * un seul critère historique était passé à {@code IMPORT_IA}, sa version
     * deviendrait impubliable sans que personne ne comprenne pourquoi.
     */
    @Test
    void aucunCritereHistorique_nEstDevenuUneProposition() {
        assertEquals(0, compter(
                "SELECT count(*) FROM critere WHERE origine <> 'CONTENU_HUMAIN' "
                        + "AND origine_initiale IS NULL"),
                "Un critère antérieur à V75 ne peut être que CONTENU_HUMAIN sans origine initiale");
    }

    /** Une version publiée le reste : V75 n'a rien rendu impubliable. */
    @Test
    void lesVersionsPubliees_nOntPasEteAffectees() {
        assertEquals(0, compter(
                "SELECT count(*) FROM critere c "
                        + "JOIN referentiel_version v ON v.id = c.referentiel_version_id "
                        + "WHERE v.statut = 'PUBLIEE' AND c.origine = 'IMPORT_IA' "
                        + "AND c.validee_par IS NULL AND c.rejetee_par IS NULL"),
                "Aucune version publiée ne porte de proposition non tranchée");
    }

    /** Le repository voit ce que le déclencheur compte, et rien d'autre. */
    @Test
    void leRepository_compteExactementCeQueLaBarriereRegarde() {
        Decor decor = monterDecor();
        UUID c1 = poserCritere(decor, "D0-01", OrigineContenu.IMPORT_IA);
        UUID c2 = poserCritere(decor, "D0-02", OrigineContenu.IMPORT_IA);
        poserCritere(decor, "D0-03", OrigineContenu.IMPORT_IA);
        poserCritere(decor, "D0-99", OrigineContenu.CONTENU_HUMAIN);

        validerEnBase(c1, decor.relecteurId());
        rejeterEnBase(c2, decor.relecteurId());

        QuarkusTransaction.requiringNew().run(() -> {
            assertEquals(1, critereRepository.aTraiter(decor.versionId()).size(),
                    "Seul le critère ni validé ni rejeté reste à traiter");
            assertEquals(3, critereRepository.compterImportes(decor.versionId()),
                    "Le total déposé compte sur origine_initiale, qui ne bouge pas");
            assertEquals(1, critereRepository.compterRejetes(decor.versionId()));
        });
    }

    /**
     * La copie d'une version emporte la décision.
     *
     * Sans cela, dériver un brouillon d'une version dont les critères ont été
     * validés produirait un brouillon impubliable, dont chaque ligne serait à
     * revalider sans avoir changé.
     */
    @Test
    void laCopieDUnCritere_emporteSaDecision() {
        Decor decor = monterDecor();
        UUID critereId = poserCritere(decor, "D0-01", OrigineContenu.IMPORT_IA);
        validerEnBase(critereId, decor.relecteurId());

        Cible cible = monterCible();

        QuarkusTransaction.requiringNew().run(() -> {
            var domaineCible = entityManager.find(Domaine.class, cible.domaineId());
            Critere source = critereRepository.findById(critereId);
            Critere copie = source.copieSous(domaineCible, null);
            entityManager.persist(copie);
            entityManager.persist(new Exigence(copie, "D0-01-E1", "Exigence copiée", "Énoncé copié"));
            entityManager.flush();

            assertEquals(OrigineContenu.CONTENU_HUMAIN, copie.getOrigine());
            assertEquals(OrigineContenu.IMPORT_IA, copie.getOrigineInitiale());
            assertNotNull(copie.getValideePar(), "La validation suit la copie");
            assertNotNull(copie.getValideeLe());
        });
    }

    /** La version dérivée d'un contenu validé reste publiable. */
    @Test
    void uneVersionDeriveeDUnContenuValide_restePubliable() {
        Decor decor = monterDecor();
        UUID critereId = poserCritere(decor, "D0-01", OrigineContenu.IMPORT_IA);
        validerEnBase(critereId, decor.relecteurId());

        Cible cible = monterCible();

        QuarkusTransaction.requiringNew().run(() -> {
            var domaineCible = entityManager.find(Domaine.class, cible.domaineId());
            Critere copie = critereRepository.findById(critereId).copieSous(domaineCible, null);
            entityManager.persist(copie);
            entityManager.persist(new Exigence(copie, "D0-01-E1", "Exigence copiée", "Énoncé copié"));
            entityManager.flush();
        });

        UUID cibleId = cible.versionId();
        publierEnBase(cibleId);
        assertEquals(1, compter(
                "SELECT count(*) FROM referentiel_version WHERE id = ?1 AND statut = 'PUBLIEE'",
                cibleId));
    }

    /** Le statut du brouillon n'est pas touché par un refus. */
    @Test
    void unRefusDePublication_laisseLaVersionEnBrouillon() {
        Decor decor = monterDecor();
        poserCritere(decor, "D0-01", OrigineContenu.IMPORT_IA);

        assertThrows(Exception.class, () -> publierEnBase(decor.versionId()));

        assertEquals(1, compter(
                "SELECT count(*) FROM referentiel_version WHERE id = ?1 AND statut = 'BROUILLON'",
                decor.versionId()),
                "Un refus ne doit laisser aucune trace sur la version");
        assertEquals(StatutVersionReferentiel.BROUILLON,
                entityManager.find(ReferentielVersion.class, decor.versionId()).getStatut());
    }
}

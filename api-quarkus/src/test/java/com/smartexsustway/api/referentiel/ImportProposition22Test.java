package com.smartexsustway.api.referentiel;

import com.smartexsustway.api.domain.entity.Critere;
import com.smartexsustway.api.domain.entity.Domaine;
import com.smartexsustway.api.domain.entity.Exigence;
import com.smartexsustway.api.domain.entity.PreuveAttendue;
import com.smartexsustway.api.domain.entity.Referentiel;
import com.smartexsustway.api.domain.entity.ReferentielVersion;
import com.smartexsustway.api.domain.enums.OrigineContenu;
import com.smartexsustway.api.domain.enums.TypePreuveAttendue;
import com.smartexsustway.api.domain.enums.TypeReferentiel;
import com.smartexsustway.api.domain.repository.CritereRepository;
import com.smartexsustway.api.domain.repository.EntrepriseRepository;
import com.smartexsustway.api.domain.repository.PreuveAttendueRepository;
import com.smartexsustway.api.domain.repository.RegleAnalyseRepository;
import com.smartexsustway.api.domain.repository.RoleRepository;
import com.smartexsustway.api.domain.repository.UtilisateurEntrepriseRepository;
import com.smartexsustway.api.domain.repository.UtilisateurRepository;
import com.smartexsustway.api.resource.support.UtilisateurDeTest;
import com.smartexsustway.api.security.JwtService;
import io.quarkus.narayana.jta.QuarkusTransaction;
import io.quarkus.test.junit.QuarkusTest;
import io.restassured.http.ContentType;
import jakarta.inject.Inject;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.Test;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static io.restassured.RestAssured.given;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Import d'une proposition d'enrichissement dans une version neuve.
 *
 * Ce que ces tests établissent tient en quatre points.
 *
 * Une règle vise la pièce de <em>son</em> critère, retrouvée par libellé et
 * jamais par position : quatre libellés du catalogue sont portés par deux
 * critères chacun, et un rapprochement positionnel faux ne lèverait aucune
 * erreur.
 *
 * Tout ce qui est écrit porte {@code IMPORT_IA}, posé explicitement. Le défaut
 * de la colonne vaut {@code CONTENU_HUMAIN} : un oubli passerait la barrière de
 * publication sans que rien ne le signale.
 *
 * L'opération est d'un seul tenant. Une erreur à n'importe quel moment ne
 * laisse aucune version partiellement créée.
 *
 * La version publiée n'est jamais touchée : l'enrichissement lit la version
 * qu'il remplace et écrit dans la sienne.
 */
@QuarkusTest
class ImportProposition22Test {

    private static final String CHEMIN = "/api/v1/referentiels/imports/proposition";

    @Inject EntityManager entityManager;
    @Inject ImportProposition22Service importService;
    @Inject ValidationContenuImporteService validationService;
    @Inject CritereRepository critereRepository;
    @Inject PreuveAttendueRepository preuveAttendueRepository;
    @Inject RegleAnalyseRepository regleAnalyseRepository;
    @Inject JwtService jwtService;
    @Inject UtilisateurRepository utilisateurRepository;
    @Inject EntrepriseRepository entrepriseRepository;
    @Inject RoleRepository roleRepository;
    @Inject UtilisateurEntrepriseRepository utilisateurEntrepriseRepository;

    // === Décor ==============================================================

    /**
     * Un référentiel publié, réduit mais représentatif.
     *
     * Deux critères y portent une pièce du même libellé — « Acte de
     * désignation ». C'est le cas qui rend la clé composite indispensable :
     * une résolution par libellé seul rattacherait les deux règles à la même
     * pièce.
     */
    private record Decor(UUID referentielId, String code, UUID version21, UUID relecteurId) {
    }

    private Decor monterDecor() {
        UUID relecteurId = UUID.fromString(UtilisateurDeTest.creerAvecRole(jwtService, "SUPER_ADMIN",
                utilisateurRepository, entrepriseRepository, roleRepository,
                utilisateurEntrepriseRepository).id);

        return QuarkusTransaction.requiringNew().call(() -> {
            String suffixe = UUID.randomUUID().toString().substring(0, 8).toUpperCase();
            String code = "_T_P22_" + suffixe;

            var referentiel = new Referentiel(code, "Référentiel de test " + suffixe,
                    TypeReferentiel.SMARTEX);
            entityManager.persist(referentiel);

            // La version est écrite en brouillon puis publiée : les
            // déclencheurs d'immuabilité refusent toute écriture sous une
            // version déjà publiée.
            var v21 = new ReferentielVersion(referentiel, "2.1", "Version de test", 1, 3, null);
            entityManager.persist(v21);

            var domaine = new Domaine(v21, "D1", "Domaine de test");
            entityManager.persist(domaine);

            // D1-01 et D1-02 portent tous deux « Acte de désignation ».
            poserCritere(domaine, "D1-01", "Acte de désignation", "Registre annexe");
            poserCritere(domaine, "D1-02", "Acte de désignation", null);
            poserCritere(domaine, "D1-03", "Politique qualité", null);
            entityManager.flush();

            entityManager.createNativeQuery(
                            "UPDATE referentiel_version SET statut = 'PUBLIEE' WHERE id = ?1")
                    .setParameter(1, v21.getId()).executeUpdate();
            entityManager.flush();
            entityManager.clear();
            return new Decor(referentiel.getId(), code, v21.getId(), relecteurId);
        });
    }

    private void poserCritere(Domaine domaine, String code, String libellePreuve, String seconde) {
        var critere = new Critere(domaine, code, "Critère " + code);
        critere.setDescription(null);
        entityManager.persist(critere);
        var exigence = new Exigence(critere, code + "-E1", "Exigence " + code, "Énoncé " + code);
        entityManager.persist(exigence);
        var p1 = new PreuveAttendue(exigence, TypePreuveAttendue.DOCUMENT_LEGAL, libellePreuve);
        p1.setOrdre(1);
        entityManager.persist(p1);
        if (seconde != null) {
            var p2 = new PreuveAttendue(exigence, TypePreuveAttendue.REGISTRE, seconde);
            p2.setOrdre(2);
            entityManager.persist(p2);
        }
    }

    // === Fabrique de propositions ===========================================

    private Map<String, Object> proposition(String codeReferentiel, List<Map<String, Object>> criteres) {
        var meta = new LinkedHashMap<String, Object>();
        meta.put("referentiel", codeReferentiel);
        meta.put("version_source", "2.1");
        meta.put("version_cible_proposee", "2.2");
        var doc = new LinkedHashMap<String, Object>();
        doc.put("meta", meta);
        doc.put("criteres", criteres);
        return doc;
    }

    private Map<String, Object> critere(String code, String description,
                                        List<Map<String, Object>> regles,
                                        Map<String, Object> preuve) {
        var c = new LinkedHashMap<String, Object>();
        c.put("code", code);
        if (description != null) {
            c.put("description", Map.of("valeur", description, "statut", "PROPOSEE"));
        }
        if (regles != null) {
            c.put("regles_proposees", regles);
        }
        if (preuve != null) {
            c.put("preuve_complementaire", preuve);
        }
        return c;
    }

    private Map<String, Object> regle(String suffixe, String libellePreuve, List<String> elements) {
        var r = new LinkedHashMap<String, Object>();
        r.put("suffixe", suffixe);
        r.put("type", "ELEMENT_ATTENDU");
        r.put("libelle", "La pièce doit couvrir les éléments énumérés par l'exigence");
        r.put("severite", "MOYENNE");
        if (libellePreuve != null) {
            r.put("portee_preuve_libelle", libellePreuve);
        }
        r.put("definition", Map.of("elements", elements));
        r.put("confiance", 0.70);
        r.put("statut", "PROPOSEE");
        return r;
    }

    /** L'entrée de repli d'un critère pour lequel aucune règle n'a pu être déduite. */
    private Map<String, Object> regleAbsente() {
        var r = new LinkedHashMap<String, Object>();
        r.put("suffixe", null);
        r.put("type", null);
        r.put("libelle", null);
        r.put("severite", null);
        r.put("definition", null);
        r.put("confiance", 0.0);
        r.put("statut", "À_VALIDER_HUMAINEMENT");
        return r;
    }

    private Map<String, Object> preuveComplementaire(String libelle) {
        var p = new LinkedHashMap<String, Object>();
        p.put("type", "PREUVE_OPERATIONNELLE");
        p.put("libelle", libelle);
        p.put("description", "Élément daté montrant que le dispositif est mis en œuvre.");
        p.put("obligatoire", false);
        p.put("confiance", 0.60);
        p.put("statut", "À_VALIDER_HUMAINEMENT");
        return p;
    }

    /** La proposition nominale : 3 descriptions, 2 règles, 1 preuve, 1 critère sans règle. */
    private Map<String, Object> propositionNominale(Decor decor) {
        var criteres = new ArrayList<Map<String, Object>>();
        criteres.add(critere("D1-01", "Description proposée pour D1-01",
                List.of(regle("R1", "Acte de désignation", List.of("périmètre de la mission"))),
                preuveComplementaire("Trace d'application — D1-01")));
        criteres.add(critere("D1-02", "Description proposée pour D1-02",
                List.of(regle("R1", "Acte de désignation", List.of("périmètre de la mission"))), null));
        criteres.add(critere("D1-03", "Description proposée pour D1-03",
                List.of(regleAbsente()), null));
        return proposition(decor.code(), criteres);
    }

    // === Outillage ==========================================================

    private ImportProposition22Service.Resultat importer(Decor decor, Map<String, Object> doc) {
        return QuarkusTransaction.requiringNew().call(() ->
                importService.importer(decor.code(), "2.2", lire(doc), decor.relecteurId()));
    }

    private Proposition22Dto lire(Map<String, Object> doc) {
        try {
            var mapper = new com.fasterxml.jackson.databind.ObjectMapper();
            return mapper.convertValue(doc, Proposition22Dto.class);
        } catch (RuntimeException e) {
            throw new IllegalStateException("Document de test illisible", e);
        }
    }

    /**
     * Publie en contournant tout le code applicatif.
     *
     * L'ordre compte, et il est celui du service : archiver d'abord, publier
     * ensuite. L'index partiel qui n'autorise qu'une version publiée par
     * référentiel rejetterait l'inverse.
     */
    private void publierEnBase(UUID versionId) {
        QuarkusTransaction.requiringNew().run(() -> {
            entityManager.createNativeQuery(
                            "UPDATE referentiel_version SET statut = 'ARCHIVEE' "
                                    + "WHERE statut = 'PUBLIEE' AND referentiel_id = "
                                    + "(SELECT referentiel_id FROM referentiel_version WHERE id = ?1)")
                    .setParameter(1, versionId).executeUpdate();
            entityManager.createNativeQuery(
                            "UPDATE referentiel_version SET statut = 'PUBLIEE' WHERE id = ?1")
                    .setParameter(1, versionId).executeUpdate();
            entityManager.flush();
        });
    }

    private long compter(String sql, Object... parametres) {
        var q = entityManager.createNativeQuery(sql);
        for (int i = 0; i < parametres.length; i++) {
            q.setParameter(i + 1, parametres[i]);
        }
        return ((Number) q.getSingleResult()).longValue();
    }

    private static String deroule(Throwable erreur) {
        var texte = new StringBuilder();
        for (Throwable t = erreur; t != null; t = t.getCause()) {
            texte.append(t.getMessage()).append(" | ");
        }
        return texte.toString();
    }

    // === T-01 · import nominal ==============================================

    @Test
    void t01_importNominal_produitLaVersionAttendue() {
        Decor decor = monterDecor();
        var resultat = importer(decor, propositionNominale(decor));

        assertNotNull(resultat.versionId());
        assertEquals("2.2", resultat.numero());
        assertEquals(3, resultat.descriptions());
        assertEquals(1, resultat.preuves());
        assertEquals(2, resultat.regles());
        assertEquals(1, resultat.criteresSansRegle());

        UUID v22 = resultat.versionId();
        assertEquals(1, compter("SELECT count(*) FROM referentiel_version "
                + "WHERE id = ?1 AND statut = 'BROUILLON'", v22));
        assertEquals(3, compter("SELECT count(*) FROM critere WHERE referentiel_version_id = ?1", v22));
        assertEquals(3, compter("SELECT count(*) FROM exigence WHERE referentiel_version_id = ?1", v22));
        // 4 preuves recopiées + 1 complémentaire
        assertEquals(5, compter("SELECT count(*) FROM preuve_attendue WHERE referentiel_version_id = ?1", v22));
        assertEquals(2, compter("SELECT count(*) FROM regle_analyse WHERE referentiel_version_id = ?1", v22));
    }

    // === T-05 · la règle vise la pièce de SON critère ========================

    /**
     * Le test central : deux critères portent une pièce du même libellé.
     *
     * Une résolution par libellé seul, sans le critère, rattacherait les deux
     * règles à la même pièce — sans qu'aucune erreur ne le signale.
     */
    @Test
    void t05_chaqueRegle_viseLaPieceDeSonPropreCritere() {
        Decor decor = monterDecor();
        var resultat = importer(decor, propositionNominale(decor));

        QuarkusTransaction.requiringNew().run(() -> {
            for (String code : List.of("D1-01", "D1-02")) {
                var critere = critereRepository
                        .parVersionEtCode(resultat.versionId(), code).orElseThrow();
                var regles = regleAnalyseRepository.parCritere(critere.getId());
                assertEquals(1, regles.size(), code);
                var regle = regles.get(0);
                assertNotNull(regle.getPreuveAttendue(), code);
                assertEquals("Acte de désignation", regle.getPreuveAttendue().getLibelle());
                assertEquals(code,
                        regle.getPreuveAttendue().getExigence().getCritere().getCode(),
                        "La règle de " + code + " doit viser la pièce de " + code);
                // La base refuse une règle qui nomme une preuve sans son exigence.
                assertNotNull(regle.getExigence(), code);
                assertEquals(regle.getPreuveAttendue().getExigence().getId(),
                        regle.getExigence().getId());
            }
        });
    }

    // === T-09 · T-10 · provenance ===========================================

    @Test
    void t09_toutLeContenuImporte_porteImportIa() {
        Decor decor = monterDecor();
        UUID v22 = importer(decor, propositionNominale(decor)).versionId();

        assertEquals(3, compter("SELECT count(*) FROM critere WHERE referentiel_version_id = ?1 "
                + "AND origine = 'IMPORT_IA' AND origine_initiale = 'IMPORT_IA'", v22));
        assertEquals(1, compter("SELECT count(*) FROM preuve_attendue WHERE referentiel_version_id = ?1 "
                + "AND origine = 'IMPORT_IA' AND origine_initiale = 'IMPORT_IA'", v22));
        assertEquals(2, compter("SELECT count(*) FROM regle_analyse WHERE referentiel_version_id = ?1 "
                + "AND origine = 'IMPORT_IA' AND origine_initiale = 'IMPORT_IA'", v22));
    }

    /**
     * Aucun contenu écrit ne doit s'être glissé en CONTENU_HUMAIN.
     *
     * Le défaut de la colonne vaut CONTENU_HUMAIN : un oubli ne lèverait
     * aucune erreur et rendrait la version publiable sans validation.
     */
    @Test
    void t10_aucunContenuEcrit_neRetombeSurLeDefautContenuHumain() {
        Decor decor = monterDecor();
        UUID v22 = importer(decor, propositionNominale(decor)).versionId();

        assertEquals(0, compter("SELECT count(*) FROM critere WHERE referentiel_version_id = ?1 "
                + "AND description IS NOT NULL AND origine <> 'IMPORT_IA'", v22));
        assertEquals(0, compter("SELECT count(*) FROM preuve_attendue WHERE referentiel_version_id = ?1 "
                + "AND libelle LIKE 'Trace d''application%' AND origine <> 'IMPORT_IA'", v22));
        // Le contenu recopié garde la sienne : rien n'a basculé.
        assertEquals(3, compter("SELECT count(*) FROM exigence WHERE referentiel_version_id = ?1 "
                + "AND origine = 'CONTENU_HUMAIN'", v22));
        assertEquals(4, compter("SELECT count(*) FROM preuve_attendue WHERE referentiel_version_id = ?1 "
                + "AND origine = 'CONTENU_HUMAIN'", v22));
    }

    // === T-02 · T-03 · T-04 · refus ==========================================

    @Test
    void t02_propositionSansCritere_estRefusee() {
        Decor decor = monterDecor();
        var vide = proposition(decor.code(), List.of());
        var erreur = assertThrows(Exception.class, () -> importer(decor, vide));
        assertTrue(deroule(erreur).toLowerCase().contains("critère")
                        || deroule(erreur).toLowerCase().contains("critere"),
                deroule(erreur));
        assertEquals(0, compter("SELECT count(*) FROM referentiel_version v "
                + "WHERE v.referentiel_id = ?1 AND v.numero = '2.2'", decor.referentielId()));
    }

    @Test
    void t03_propositionVisantUnAutreReferentiel_estRefusee() {
        Decor decor = monterDecor();
        var doc = proposition("UN_AUTRE_REFERENTIEL",
                List.of(critere("D1-01", "Description", null, null)));
        var erreur = assertThrows(Exception.class, () -> importer(decor, doc));
        assertTrue(deroule(erreur).contains("UN_AUTRE_REFERENTIEL"), deroule(erreur));
        assertEquals(0, compter("SELECT count(*) FROM referentiel_version "
                + "WHERE referentiel_id = ?1 AND numero = '2.2'", decor.referentielId()));
    }

    @Test
    void t04_critereInexistant_estRefuse() {
        Decor decor = monterDecor();
        var doc = proposition(decor.code(),
                List.of(critere("D9-99", "Description d'un critère absent", null, null)));
        var erreur = assertThrows(Exception.class, () -> importer(decor, doc));
        assertTrue(deroule(erreur).contains("D9-99"), deroule(erreur));
        assertEquals(0, compter("SELECT count(*) FROM referentiel_version "
                + "WHERE referentiel_id = ?1 AND numero = '2.2'", decor.referentielId()));
    }

    // === T-06 · T-07 · T-08 · résolution des références =======================

    @Test
    void t06_preuveIntrouvable_estRefusee() {
        Decor decor = monterDecor();
        var doc = proposition(decor.code(), List.of(critere("D1-01", "Description",
                List.of(regle("R1", "Une pièce qui n'existe pas", List.of("x"))), null)));
        var erreur = assertThrows(Exception.class, () -> importer(decor, doc));
        assertTrue(deroule(erreur).contains("absente du critère"), deroule(erreur));
    }

    /** Sans libellé, la portée n'est pas exprimable : l'index est refusé. */
    @Test
    void t07_regleSansLibelleDePreuve_estRefusee() {
        Decor decor = monterDecor();
        var doc = proposition(decor.code(), List.of(critere("D1-01", "Description",
                List.of(regle("R1", null, List.of("x"))), null)));
        var erreur = assertThrows(Exception.class, () -> importer(decor, doc));
        assertTrue(deroule(erreur).contains("portee_preuve_libelle"), deroule(erreur));
    }

    @Test
    void t08_regleAuTypeInconnu_estRefusee() {
        Decor decor = monterDecor();
        var r = regle("R1", "Acte de désignation", List.of("x"));
        r.put("type", "TYPE_QUI_NEXISTE_PAS");
        var doc = proposition(decor.code(), List.of(critere("D1-01", "Description", List.of(r), null)));
        var erreur = assertThrows(Exception.class, () -> importer(decor, doc));
        assertTrue(deroule(erreur).toLowerCase().contains("inconnue"), deroule(erreur));
    }

    @Test
    void t08b_definitionNonConformeAuSchema_estRefusee() {
        Decor decor = monterDecor();
        var r = regle("R1", "Acte de désignation", List.of("x"));
        r.put("definition", Map.of("champ", "une clé qui n'appartient pas à ELEMENT_ATTENDU"));
        var doc = proposition(decor.code(), List.of(critere("D1-01", "Description", List.of(r), null)));
        assertThrows(Exception.class, () -> importer(decor, doc));
    }

    // === T-11 · idempotence ==================================================

    @Test
    void t11_secondImport_estRefuseEtNeCreeRien() {
        Decor decor = monterDecor();
        UUID v22 = importer(decor, propositionNominale(decor)).versionId();

        long preuvesAvant = compter("SELECT count(*) FROM preuve_attendue WHERE referentiel_version_id = ?1", v22);
        long reglesAvant = compter("SELECT count(*) FROM regle_analyse WHERE referentiel_version_id = ?1", v22);

        var erreur = assertThrows(Exception.class, () -> importer(decor, propositionNominale(decor)));
        assertTrue(deroule(erreur).toLowerCase().contains("brouillon"), deroule(erreur));

        assertEquals(1, compter("SELECT count(*) FROM referentiel_version "
                + "WHERE referentiel_id = ?1 AND numero = '2.2'", decor.referentielId()));
        assertEquals(preuvesAvant, compter("SELECT count(*) FROM preuve_attendue "
                + "WHERE referentiel_version_id = ?1", v22));
        assertEquals(reglesAvant, compter("SELECT count(*) FROM regle_analyse "
                + "WHERE referentiel_version_id = ?1", v22));
    }

    // === T-12 · rollback =====================================================

    /**
     * Une erreur survenue en cours d'enrichissement ne doit laisser aucune
     * version partiellement créée — pas même le brouillon vide.
     */
    @Test
    void t12_uneErreurEnCours_neLaisseAucuneVersionPartielle() {
        Decor decor = monterDecor();
        // Les deux premiers critères passent, le troisième échoue.
        var criteres = new ArrayList<Map<String, Object>>();
        criteres.add(critere("D1-01", "Description D1-01", null, null));
        criteres.add(critere("D1-02", "Description D1-02", null, null));
        criteres.add(critere("D1-03", "Description D1-03",
                List.of(regle("R1", "Pièce absente", List.of("x"))), null));

        assertThrows(Exception.class, () -> importer(decor, proposition(decor.code(), criteres)));

        assertEquals(0, compter("SELECT count(*) FROM referentiel_version "
                + "WHERE referentiel_id = ?1 AND numero = '2.2'", decor.referentielId()));
        assertEquals(3, compter("SELECT count(*) FROM critere WHERE referentiel_version_id = ?1",
                decor.version21()), "La version publiée reste seule");
    }

    // === T-13 · la version publiée est intacte ===============================

    @Test
    void t13_laVersionPubliee_nEstJamaisModifiee() {
        Decor decor = monterDecor();
        importer(decor, propositionNominale(decor));

        assertEquals(1, compter("SELECT count(*) FROM referentiel_version "
                + "WHERE id = ?1 AND statut = 'PUBLIEE'", decor.version21()));
        assertEquals(3, compter("SELECT count(*) FROM critere WHERE referentiel_version_id = ?1", decor.version21()));
        assertEquals(4, compter("SELECT count(*) FROM preuve_attendue WHERE referentiel_version_id = ?1", decor.version21()));
        assertEquals(0, compter("SELECT count(*) FROM regle_analyse WHERE referentiel_version_id = ?1", decor.version21()));
        // Aucune description posée, aucune bascule de provenance.
        assertEquals(3, compter("SELECT count(*) FROM critere WHERE referentiel_version_id = ?1 "
                + "AND description IS NULL AND origine = 'CONTENU_HUMAIN'", decor.version21()));
    }

    // === T-14 · T-15 · publication ===========================================

    @Test
    void t14_laPublication_estRefuseeTantQueRienNEstTranche() {
        Decor decor = monterDecor();
        UUID v22 = importer(decor, propositionNominale(decor)).versionId();

        var erreur = assertThrows(Exception.class, () -> publierEnBase(v22));
        assertTrue(deroule(erreur).contains("validé"), deroule(erreur));
        assertEquals(1, compter("SELECT count(*) FROM referentiel_version "
                + "WHERE id = ?1 AND statut = 'BROUILLON'", v22));
        // Le refus est intégral : l'archivage préalable est annulé lui aussi.
        assertEquals(1, compter("SELECT count(*) FROM referentiel_version "
                + "WHERE id = ?1 AND statut = 'PUBLIEE'", decor.version21()));
    }

    @Test
    void t15_toutValide_laPublicationPasse() {
        Decor decor = monterDecor();
        UUID v22 = importer(decor, propositionNominale(decor)).versionId();
        trancherTout(decor, v22, true);

        publierEnBase(v22);
        assertEquals(1, compter("SELECT count(*) FROM referentiel_version "
                + "WHERE id = ?1 AND statut = 'PUBLIEE'", v22));
    }

    @Test
    void t16_toutRejete_laPublicationPasseAussi() {
        Decor decor = monterDecor();
        UUID v22 = importer(decor, propositionNominale(decor)).versionId();
        trancherTout(decor, v22, false);

        publierEnBase(v22);
        assertEquals(1, compter("SELECT count(*) FROM referentiel_version "
                + "WHERE id = ?1 AND statut = 'PUBLIEE'", v22));
        // Le rejet ne reprend rien à son compte : l'origine reste IMPORT_IA.
        assertEquals(3, compter("SELECT count(*) FROM critere WHERE referentiel_version_id = ?1 "
                + "AND origine = 'IMPORT_IA' AND rejetee_par IS NOT NULL", v22));
    }

    private void trancherTout(Decor decor, UUID v22, boolean valider) {
        QuarkusTransaction.requiringNew().run(() -> {
            for (var critere : critereRepository.aTraiter(v22)) {
                if (valider) {
                    validationService.validerCritere(critere, v22, decor.relecteurId());
                } else {
                    validationService.rejeterCritere(critere, v22, "Écarté par le test", decor.relecteurId());
                }
            }
            for (var preuve : preuveAttendueRepository.aTraiter(v22)) {
                if (valider) {
                    validationService.validerPreuveAttendue(preuve, v22, decor.relecteurId());
                } else {
                    validationService.rejeterPreuveAttendue(preuve, v22, null, decor.relecteurId());
                }
            }
            for (var regle : regleAnalyseRepository.aTraiter(v22)) {
                if (valider) {
                    validationService.validerRegle(regle, v22, decor.relecteurId());
                } else {
                    validationService.rejeterRegle(regle, v22, null, decor.relecteurId());
                }
            }
        });
    }

    // === T-17 · restauration de la description héritée ========================

    /**
     * Rejeter l'enrichissement d'un critère doit rendre la description que la
     * version précédente portait.
     *
     * Sans cela, le texte refusé resterait en place et visible : la décision
     * n'aurait aucun effet sur ce qui est lu.
     */
    @Test
    void t17_leRejetDUnCritere_restaureLaDescriptionHeritee() {
        Decor decor = monterDecor();
        UUID v22 = importer(decor, propositionNominale(decor)).versionId();

        QuarkusTransaction.requiringNew().run(() -> {
            var critere = critereRepository.parVersionEtCode(v22, "D1-01").orElseThrow();
            assertEquals("Description proposée pour D1-01", critere.getDescription());
            validationService.rejeterCritere(critere, v22, "Hors sujet", decor.relecteurId());
        });

        QuarkusTransaction.requiringNew().run(() -> {
            var critere = critereRepository.parVersionEtCode(v22, "D1-01").orElseThrow();
            assertNull(critere.getDescription(),
                    "La description héritée de la 2.1 était nulle : elle doit l'être à nouveau");
            assertNotNull(critere.getRejeteePar(), "La trace du rejet subsiste");
            assertEquals("Hors sujet", critere.getMotifRejet());
            assertEquals(OrigineContenu.IMPORT_IA, critere.getOrigine(),
                    "Un rejet ne reprend pas la proposition à son compte");
            assertEquals(OrigineContenu.IMPORT_IA, critere.getOrigineInitiale());
        });
    }

    @Test
    void t17b_laValidation_conserveLaDescriptionProposee() {
        Decor decor = monterDecor();
        UUID v22 = importer(decor, propositionNominale(decor)).versionId();

        QuarkusTransaction.requiringNew().run(() -> {
            var critere = critereRepository.parVersionEtCode(v22, "D1-01").orElseThrow();
            validationService.validerCritere(critere, v22, decor.relecteurId());
        });

        QuarkusTransaction.requiringNew().run(() -> {
            var critere = critereRepository.parVersionEtCode(v22, "D1-01").orElseThrow();
            assertEquals("Description proposée pour D1-01", critere.getDescription());
            assertEquals(OrigineContenu.CONTENU_HUMAIN, critere.getOrigine());
            assertEquals(OrigineContenu.IMPORT_IA, critere.getOrigineInitiale(),
                    "La provenance initiale ne bouge jamais");
        });
    }

    // === T-18 · T-19 · T-20 · T-21 · contenu métier ==========================

    @Test
    void t18_lesPreuvesComplementaires_sontFacultativesEtAValider() {
        Decor decor = monterDecor();
        UUID v22 = importer(decor, propositionNominale(decor)).versionId();

        assertEquals(1, compter("SELECT count(*) FROM preuve_attendue WHERE referentiel_version_id = ?1 "
                + "AND origine = 'IMPORT_IA' AND obligatoire = false "
                + "AND validee_par IS NULL AND rejetee_par IS NULL", v22));
        QuarkusTransaction.requiringNew().run(() -> {
            var critere = critereRepository.parVersionEtCode(v22, "D1-01").orElseThrow();
            var libelles = preuveAttendueRepository.parCritere(critere.getId()).stream()
                    .map(PreuveAttendue::getLibelle).toList();
            assertTrue(libelles.contains("Trace d'application — D1-01"), libelles.toString());
        });
    }

    @Test
    void t19_lesReglesProposees_portentLeursElementsLitteraux() {
        Decor decor = monterDecor();
        UUID v22 = importer(decor, propositionNominale(decor)).versionId();

        QuarkusTransaction.requiringNew().run(() -> {
            var critere = critereRepository.parVersionEtCode(v22, "D1-01").orElseThrow();
            var regle = regleAnalyseRepository.parCritere(critere.getId()).get(0);
            assertEquals("D1-01-R1", regle.getCode());
            assertEquals(List.of("périmètre de la mission"), regle.getDefinition().get("elements"));
            assertEquals(com.smartexsustway.api.domain.enums.NiveauCriticite.MOYENNE, regle.getSeverite());
        });
    }

    @Test
    void t20_lentreeDeRepli_neCreeAucuneRegle() {
        Decor decor = monterDecor();
        UUID v22 = importer(decor, propositionNominale(decor)).versionId();

        QuarkusTransaction.requiringNew().run(() -> {
            var critere = critereRepository.parVersionEtCode(v22, "D1-03").orElseThrow();
            assertEquals(0, regleAnalyseRepository.parCritere(critere.getId()).size(),
                    "D1-03 doit rester sans règle");
        });
        // Et le critère porte tout de même sa description : l'absence de règle
        // n'empêche pas l'enrichissement.
        assertEquals(1, compter("SELECT count(*) FROM critere WHERE referentiel_version_id = ?1 "
                + "AND code = 'D1-03' AND description IS NOT NULL", v22));
    }

    @Test
    void t21_aucuneRegleCondition_nEstCreee() {
        Decor decor = monterDecor();
        UUID v22 = importer(decor, propositionNominale(decor)).versionId();
        assertEquals(0, compter("SELECT count(*) FROM regle_analyse "
                + "WHERE referentiel_version_id = ?1 AND type = 'CONDITION'", v22));
    }

    // === T-22 · aucun effet sur les audits ===================================

    @Test
    void t22_aucunAudit_nEstRattacheALaNouvelleVersion() {
        Decor decor = monterDecor();
        UUID v22 = importer(decor, propositionNominale(decor)).versionId();
        assertEquals(0, compter("SELECT count(*) FROM audit WHERE referentiel_version_id = ?1", v22));
    }

    // === T-23 · T-24 · sécurité ==============================================

    @Test
    void t24_lImport_estRefuseAuxRolesNonHabilitesEtSansJeton() {
        Decor decor = monterDecor();
        var doc = propositionNominale(decor);

        given().contentType(ContentType.JSON).body(doc)
                .when().post(CHEMIN + "?referentiel=" + decor.code() + "&version=2.2")
                .then().statusCode(401);

        String jetonCollaborateur = UtilisateurDeTest.creerAvecRole(jwtService, "COLLABORATEUR",
                utilisateurRepository, entrepriseRepository, roleRepository,
                utilisateurEntrepriseRepository).token;
        given().header("Authorization", "Bearer " + jetonCollaborateur)
                .contentType(ContentType.JSON).body(doc)
                .when().post(CHEMIN + "?referentiel=" + decor.code() + "&version=2.2")
                .then().statusCode(403);

        assertEquals(0, compter("SELECT count(*) FROM referentiel_version "
                + "WHERE referentiel_id = ?1 AND numero = '2.2'", decor.referentielId()));
    }

    @Test
    void t23_lEndpoint_exigeLeReferentielEtLaVersion() {
        Decor decor = monterDecor();
        String jeton = UtilisateurDeTest.creerAvecRole(jwtService, "SUPER_ADMIN",
                utilisateurRepository, entrepriseRepository, roleRepository,
                utilisateurEntrepriseRepository).token;

        given().header("Authorization", "Bearer " + jeton)
                .contentType(ContentType.JSON).body(propositionNominale(decor))
                .when().post(CHEMIN + "?version=2.2")
                .then().statusCode(400);

        given().header("Authorization", "Bearer " + jeton)
                .contentType(ContentType.JSON).body(propositionNominale(decor))
                .when().post(CHEMIN + "?referentiel=" + decor.code())
                .then().statusCode(400);
    }

    @Test
    void t23b_lEndpointNominal_rend201EtLeCompte() {
        Decor decor = monterDecor();
        String jeton = UtilisateurDeTest.creerAvecRole(jwtService, "SUPER_ADMIN",
                utilisateurRepository, entrepriseRepository, roleRepository,
                utilisateurEntrepriseRepository).token;

        given().header("Authorization", "Bearer " + jeton)
                .contentType(ContentType.JSON).body(propositionNominale(decor))
                .when().post(CHEMIN + "?referentiel=" + decor.code() + "&version=2.2")
                .then().statusCode(201)
                .body("numero", org.hamcrest.Matchers.equalTo("2.2"))
                .body("descriptions", org.hamcrest.Matchers.equalTo(3))
                .body("preuves", org.hamcrest.Matchers.equalTo(1))
                .body("regles", org.hamcrest.Matchers.equalTo(2));
    }
}

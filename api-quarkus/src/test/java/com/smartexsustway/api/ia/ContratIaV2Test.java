package com.smartexsustway.api.ia;

import com.smartexsustway.api.domain.entity.Audit;
import com.smartexsustway.api.domain.entity.AuditCritere;
import com.smartexsustway.api.domain.entity.Critere;
import com.smartexsustway.api.domain.entity.Domaine;
import com.smartexsustway.api.domain.entity.Entreprise;
import com.smartexsustway.api.domain.entity.Exigence;
import com.smartexsustway.api.domain.entity.PreuveAttendue;
import com.smartexsustway.api.domain.entity.Referentiel;
import com.smartexsustway.api.domain.entity.ReferentielVersion;
import com.smartexsustway.api.domain.entity.RegleAnalyse;
import com.smartexsustway.api.domain.entity.Utilisateur;
import com.smartexsustway.api.domain.enums.NiveauCriticite;
import com.smartexsustway.api.domain.enums.OrigineContenu;
import com.smartexsustway.api.domain.enums.TypePreuveAttendue;
import com.smartexsustway.api.domain.enums.TypeRegleAnalyse;
import com.smartexsustway.api.domain.enums.TypeReferentiel;
import com.smartexsustway.api.domain.repository.AuditCritereRepository;
import com.smartexsustway.api.domain.repository.AuditRepository;
import com.smartexsustway.api.domain.repository.CritereRepository;
import com.smartexsustway.api.domain.repository.DomaineRepository;
import com.smartexsustway.api.domain.repository.EntrepriseRepository;
import com.smartexsustway.api.domain.repository.ExigenceRepository;
import com.smartexsustway.api.domain.repository.PreuveAttendueRepository;
import com.smartexsustway.api.domain.repository.ReferentielRepository;
import com.smartexsustway.api.domain.repository.ReferentielVersionRepository;
import com.smartexsustway.api.domain.repository.RegleAnalyseRepository;
import com.smartexsustway.api.domain.repository.RoleRepository;
import com.smartexsustway.api.domain.repository.UtilisateurEntrepriseRepository;
import com.smartexsustway.api.domain.repository.UtilisateurRepository;
import com.smartexsustway.api.ia.contrat.ConstructionContexteIa;
import com.smartexsustway.api.ia.contrat.EvaluerCritereRequestV2;
import com.smartexsustway.api.ia.contrat.ReferenceIaInvalide;
import com.smartexsustway.api.resource.support.UtilisateurDeTest;
import com.smartexsustway.api.security.JwtService;
import io.quarkus.narayana.jta.QuarkusTransaction;
import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Le socle du contrat IA V2 : références locales, résolution, portées.
 *
 * Une référence — {@code D1-01-E1-P1} — n'existe que le temps d'une requête.
 * Elle n'est ni stockée, ni comparable d'un appel à l'autre : elle est
 * recalculée à chaque construction depuis la liste telle qu'elle est lue. Ces
 * tests fixent ce qui doit rester vrai de cette mécanique — la numérotation
 * par exigence, le déterminisme du tri, le refus de toute référence venue
 * d'ailleurs.
 *
 * Le décor construit ses propres référentiels plutôt que d'emprunter au
 * catalogue publié : les cas à éprouver — deux preuves de même ordre, une
 * exigence rejetée, trois preuves sous une exigence — n'y existent pas, et
 * les y fabriquer toucherait un contenu métier réel.
 */
@QuarkusTest
class ContratIaV2Test {

    @Inject JwtService jwtService;
    @Inject UtilisateurRepository utilisateurRepository;
    @Inject EntrepriseRepository entrepriseRepository;
    @Inject RoleRepository roleRepository;
    @Inject UtilisateurEntrepriseRepository utilisateurEntrepriseRepository;
    @Inject ReferentielRepository referentielRepository;
    @Inject ReferentielVersionRepository versionRepository;
    @Inject DomaineRepository domaineRepository;
    @Inject CritereRepository critereRepository;
    @Inject ExigenceRepository exigenceRepository;
    @Inject PreuveAttendueRepository preuveAttendueRepository;
    @Inject RegleAnalyseRepository regleAnalyseRepository;
    @Inject AuditRepository auditRepository;
    @Inject AuditCritereRepository auditCritereRepository;
    @Inject ConstructionContexteIa constructionContexteIa;
    @Inject EntityManager entityManager;

    // === Décor ==============================================================

    /** Ce qu'un cas de test manipule : la mission, et le critère analysé. */
    private record Decor(UUID auditId, UUID auditCritereId, UUID critereId) {
    }

    /**
     * Monte un critère et le peuple par le plan demandé.
     *
     * `preuvesParExigence` dit combien de preuves attendues créer sous
     * chacune : {@code [1]} donne une exigence à une preuve, {@code [2, 2]}
     * deux exigences à deux preuves chacune.
     */
    private Decor decor(int... preuvesParExigence) {
        return decor(false, preuvesParExigence);
    }

    private Decor decor(boolean memeOrdre, int... preuvesParExigence) {
        var admin = UtilisateurDeTest.creerAvecRole(jwtService, "SUPER_ADMIN",
                utilisateurRepository, entrepriseRepository, roleRepository,
                utilisateurEntrepriseRepository);
        UUID adminId = UUID.fromString(admin.id);

        return QuarkusTransaction.requiringNew().call(() -> {
            Utilisateur auteur = utilisateurRepository.findById(adminId);
            Entreprise entreprise = entrepriseRepository.listAll().get(0);

            var referentiel = new Referentiel(
                    "V2_" + UUID.randomUUID().toString().substring(0, 8).toUpperCase(),
                    "Référentiel de contrat V2", TypeReferentiel.SMARTEX);
            referentielRepository.persistAndFlush(referentiel);

            var version = new ReferentielVersion(referentiel, "1.0", "Décor du contrat V2.", 0, 0, auteur);
            versionRepository.persistAndFlush(version);

            var domaine = new Domaine(version, "D1", "Domaine du contrat V2");
            domaineRepository.persistAndFlush(domaine);

            var critere = new Critere(domaine, "D1-01", "Critère du contrat V2");
            critereRepository.persistAndFlush(critere);

            for (int rangExigence = 1; rangExigence <= preuvesParExigence.length; rangExigence++) {
                var exigence = new Exigence(critere, "D1-01-E" + rangExigence,
                        "Exigence " + rangExigence, "Énoncé de l'exigence " + rangExigence);
                exigence.setOrdre(rangExigence);
                exigenceRepository.persistAndFlush(exigence);

                for (int rangPreuve = 1; rangPreuve <= preuvesParExigence[rangExigence - 1]; rangPreuve++) {
                    var preuve = new PreuveAttendue(exigence, TypePreuveAttendue.POLITIQUE,
                            "Pièce " + rangExigence + "." + rangPreuve);
                    // `memeOrdre` fabrique l'ambiguïté que le tri doit lever.
                    preuve.setOrdre(memeOrdre ? 0 : rangPreuve);
                    preuveAttendueRepository.persistAndFlush(preuve);
                }
            }

            var audit = new Audit(entreprise, version, "Mission du contrat V2", LocalDate.now());
            auditRepository.persistAndFlush(audit);

            var auditCritere = new AuditCritere(audit, critere, critere.getCriticite(), BigDecimal.ONE);
            auditCritere.setScenario("Scénario du décor.");
            auditCritereRepository.persistAndFlush(auditCritere);

            return new Decor(audit.getId(), auditCritere.getId(), critere.getId());
        });
    }

    private ConstructionContexteIa.Contexte contexte(Decor decor) {
        return QuarkusTransaction.requiringNew().call(() ->
                constructionContexteIa.construire(
                        auditRepository.findById(decor.auditId()),
                        auditCritereRepository.findById(decor.auditCritereId()),
                        List.of()));
    }

    private List<String> references(ConstructionContexteIa.Contexte contexte) {
        return contexte.payload().catalogue().preuvesAttendues().stream()
                .map(EvaluerCritereRequestV2.PreuveAttendue::reference)
                .toList();
    }

    /** Ajoute une règle au critère, sur la portée demandée. */
    private void ajouterRegle(UUID critereId, String code, TypeRegleAnalyse type,
                              String codeExigence, String libellePreuve) {
        QuarkusTransaction.requiringNew().run(() -> {
            Critere critere = critereRepository.findById(critereId);
            Exigence exigence = codeExigence == null ? null
                    : exigenceRepository.parCritereActives(critereId).stream()
                    .filter(e -> e.getCode().equals(codeExigence)).findFirst().orElseThrow();
            PreuveAttendue preuve = libellePreuve == null ? null
                    : preuveAttendueRepository.parCritereActives(critereId).stream()
                    .filter(p -> p.getLibelle().equals(libellePreuve)).findFirst().orElseThrow();

            var regle = new RegleAnalyse(critere, code, type, "Règle " + code);
            regle.setSeverite(NiveauCriticite.ELEVEE);
            regle.setDefinition(Map.of("mention_attendue", "validation par la direction"));
            if (exigence != null) {
                regle.setExigence(exigence);
            }
            if (preuve != null) {
                regle.setPreuveAttendue(preuve);
            }
            regleAnalyseRepository.persistAndFlush(regle);
        });
    }

    // === 1-3. La numérotation ===============================================

    @Test
    void uneExigenceAUnePreuve_donneP1() {
        var contexte = contexte(decor(1));

        assertEquals(List.of("D1-01-E1-P1"), references(contexte));
    }

    @Test
    void uneExigenceATroisPreuves_numeroteDeP1AP3() {
        var contexte = contexte(decor(3));

        assertEquals(List.of("D1-01-E1-P1", "D1-01-E1-P2", "D1-01-E1-P3"), references(contexte));
    }

    @Test
    void deuxExigences_leCompteurRepartAP1() {
        var contexte = contexte(decor(2, 2));

        // Le point de la numérotation par exigence : la seconde exigence
        // recommence à P1. Une numérotation globale aurait donné P3 et P4, et
        // l'ajout d'une pièce sous la première aurait décalé toutes les autres.
        assertEquals(
                List.of("D1-01-E1-P1", "D1-01-E1-P2", "D1-01-E2-P1", "D1-01-E2-P2"),
                references(contexte));
    }

    // === 4. Le déterminisme du tri ==========================================

    @Test
    void deuxPreuvesDeMemeOrdre_sontDepartageesParId() {
        var decor = decor(true, 2);

        var premier = contexte(decor);
        var second = contexte(decor);

        // Sans départage par `id`, deux constructions successives pourraient
        // échanger les références de ces deux pièces — et une règle rattachée
        // désignerait alors l'autre pièce d'une analyse à l'autre.
        assertEquals(List.of("D1-01-E1-P1", "D1-01-E1-P2"), references(premier));
        assertEquals(references(premier), references(second));

        var idsPremier = premier.payload().catalogue().preuvesAttendues().stream()
                .map(p -> premier.references().exiger(p.reference()).getId()).toList();
        var idsSecond = second.payload().catalogue().preuvesAttendues().stream()
                .map(p -> second.references().exiger(p.reference()).getId()).toList();
        assertEquals(idsPremier, idsSecond, "La même référence doit désigner la même pièce");
    }

    // === 5-7. Les portées de règle ==========================================

    @Test
    void uneRegleLieeAUnePreuve_recoitSaReferenceLocale() {
        var decor = decor(2);
        ajouterRegle(decor.critereId(), "D1-01-R1", TypeRegleAnalyse.SIGNATURE, "D1-01-E1", "Pièce 1.2");

        var contexte = contexte(decor);
        var regle = contexte.payload().catalogue().reglesAnalyse().get(0);

        assertEquals(EvaluerCritereRequestV2.Portee.PREUVE_ATTENDUE, regle.portee().niveau());
        assertEquals("D1-01-E1-P2", regle.portee().reference());
        // La référence vient de la clé étrangère, pas d'une comparaison de libellé.
        assertEquals("Pièce 1.2", contexte.references().exiger("D1-01-E1-P2").getLibelle());
    }

    @Test
    void uneRegleDePorteeExigence_neRecoitPasDeReferenceDePreuve() {
        var decor = decor(2);
        ajouterRegle(decor.critereId(), "D1-01-R2", TypeRegleAnalyse.ELEMENT_ATTENDU, "D1-01-E1", null);

        var regle = contexte(decor).payload().catalogue().reglesAnalyse().get(0);

        assertEquals(EvaluerCritereRequestV2.Portee.EXIGENCE, regle.portee().niveau());
        assertEquals("D1-01-E1", regle.portee().reference());
        assertFalse(regle.portee().reference().contains("-P"),
                "Une portée exigence ne doit pas porter de référence de pièce");
    }

    @Test
    void uneRegleDePorteeCritere_nePorteAucuneReference() {
        var decor = decor(2);
        ajouterRegle(decor.critereId(), "D1-01-R3", TypeRegleAnalyse.PRESENCE, null, null);

        var regle = contexte(decor).payload().catalogue().reglesAnalyse().get(0);

        assertEquals(EvaluerCritereRequestV2.Portee.CRITERE, regle.portee().niveau());
        assertNull(regle.portee().reference(),
                "La règle la plus générale ne doit pas être rattachée à une pièce particulière");
    }

    // === 8-9. Le filtrage de provenance =====================================

    @Test
    void unePreuveRejetee_nEstPasTransmise() {
        var decor = decor(2);
        QuarkusTransaction.requiringNew().run(() -> {
            var preuve = preuveAttendueRepository.parCritereActives(decor.critereId()).stream()
                    .filter(p -> p.getLibelle().equals("Pièce 1.2")).findFirst().orElseThrow();
            preuve.setOrigine(OrigineContenu.IMPORT_IA);
            preuve.rejeterPar(utilisateurRepository.listAll().get(0), java.time.Instant.now(), "Hors sujet");
        });

        var contexte = contexte(decor);

        assertEquals(List.of("D1-01-E1-P1"), references(contexte));
        assertEquals(1, contexte.references().taille());
    }

    @Test
    void unePreuveSousUneExigenceRejetee_nEstPasTransmise() {
        var decor = decor(1, 1);
        QuarkusTransaction.requiringNew().run(() -> {
            var exigence = exigenceRepository.parCritereActives(decor.critereId()).stream()
                    .filter(e -> e.getCode().equals("D1-01-E2")).findFirst().orElseThrow();
            exigence.setOrigine(OrigineContenu.IMPORT_IA);
            exigence.rejeterPar(utilisateurRepository.listAll().get(0), java.time.Instant.now(), "Doublon");
        });

        var contexte = contexte(decor);

        // La pièce elle-même n'est pas rejetée : c'est son exigence qui l'est.
        // Sans le filtre sur le parent, elle arriverait orpheline.
        assertEquals(List.of("D1-01-E1-P1"), references(contexte));
        assertEquals(1, contexte.payload().catalogue().exigences().size());
    }

    // === 10-12. Le refus des références étrangères ==========================

    @Test
    void uneReferenceInconnue_estRefusee() {
        var contexte = contexte(decor(1));

        var refus = assertThrows(ReferenceIaInvalide.class,
                () -> contexte.references().exiger("D1-01-E1-P9"));

        assertEquals(ReferenceIaInvalide.Motif.INCONNUE, refus.motif());
    }

    @Test
    void uneReferenceMalformee_estRefusee() {
        var contexte = contexte(decor(1));

        for (String malformee : new String[] {"D1-01-E1", "D1-01-E1-P0", "P1", "", "D1-01-E1-PX"}) {
            var refus = assertThrows(ReferenceIaInvalide.class,
                    () -> contexte.references().exiger(malformee), "pour « " + malformee + " »");
            assertEquals(ReferenceIaInvalide.Motif.MALFORMEE, refus.motif(), malformee);
        }
        assertThrows(ReferenceIaInvalide.class, () -> contexte.references().exiger(null));
    }

    @Test
    void uneReferenceDUneAutreExigence_estRefusee() {
        // Une seule exigence au décor : « D1-01-E2-P1 » est bien formée et
        // désigne une exigence qui existe ailleurs, mais pas ici.
        var contexte = contexte(decor(1));

        var refus = assertThrows(ReferenceIaInvalide.class,
                () -> contexte.references().exiger("D1-01-E2-P1"));

        assertEquals(ReferenceIaInvalide.Motif.INCONNUE, refus.motif());
    }

    @Test
    void uneReferenceDUnAutreCritere_estRefusee() {
        var premier = contexte(decor(1));
        var second = contexte(decor(1));

        // Les deux critères portent le même code, donc la même référence
        // textuelle — et pourtant elle ne désigne pas la même pièce. C'est le
        // cloisonnement par payload qui l'empêche de traverser.
        String reference = references(second).get(0);
        assertEquals(references(premier).get(0), reference);

        assertTrue(premier.references().resoudre(reference).isPresent());
        assertFalse(premier.references().exiger(reference).getId()
                        .equals(second.references().exiger(reference).getId()),
                "Deux payloads distincts ne doivent jamais résoudre vers la même pièce");
    }

    // === 13. Le cas vide ====================================================

    @Test
    void unCritereSansPreuveAttendue_produitUnPayloadValide() {
        // Une exigence, aucune preuve attendue. Le décor ne descend pas à zéro
        // exigence : tout critère en porte au moins une, invariant que la
        // création réelle garantit et que ContenuMetierReferentielTest vérifie
        // sur toute la table.
        var contexte = contexte(decor(0));

        assertEquals(1, contexte.payload().catalogue().exigences().size());
        assertTrue(contexte.payload().catalogue().preuvesAttendues().isEmpty());
        assertTrue(contexte.payload().catalogue().reglesAnalyse().isEmpty());
        assertEquals(0, contexte.references().taille());
        assertNotNull(contexte.payload().critere());
        constructionContexteIa.verifier(contexte.payload());
    }

    /**
     * Un catalogue entièrement vide reste un payload valide — décision 4.
     *
     * Éprouvé sur un payload construit à la main plutôt qu'en base : persister
     * un critère sans exigence violerait l'invariant du catalogue, alors que
     * le contrat, lui, doit accepter les trois listes vides sans les traiter
     * comme une anomalie.
     */
    @Test
    void unCatalogueEntierementVide_estAccepte() {
        var payload = new EvaluerCritereRequestV2(
                EvaluerCritereRequestV2.VERSION, null, null,
                new EvaluerCritereRequestV2.Critere("D9-99", "Critère sans contenu métier", null),
                new EvaluerCritereRequestV2.Catalogue(List.of(), List.of(), List.of()),
                null, List.of(), null,
                new EvaluerCritereRequestV2.Options(false, false));

        constructionContexteIa.verifier(payload);
    }

    // === 14. Rien n'est persisté ============================================

    @Test
    void aucuneReferenceLocale_nEstEcriteEnBase() {
        var decor = decor(3);
        var contexte = contexte(decor);
        assertEquals(3, contexte.references().taille());

        entityManager.clear();
        Number trouvees = (Number) entityManager.createNativeQuery(
                        "SELECT count(*) FROM preuve_attendue p "
                                + "JOIN exigence e ON e.id = p.exigence_id "
                                + "WHERE e.critere_id = ?1 "
                                + "AND (p.libelle LIKE '%-P%' OR p.description LIKE '%-P%')")
                .setParameter(1, decor.critereId())
                .getSingleResult();

        assertEquals(0L, trouvees.longValue(),
                "Une référence locale ne doit laisser aucune trace en base");
    }
}

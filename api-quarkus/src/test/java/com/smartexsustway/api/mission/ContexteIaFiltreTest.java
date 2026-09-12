package com.smartexsustway.api.mission;

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
import com.smartexsustway.api.domain.enums.OrigineContenu;
import com.smartexsustway.api.domain.enums.TypePreuveAttendue;
import com.smartexsustway.api.domain.enums.TypeReferentiel;
import com.smartexsustway.api.domain.enums.TypeRegleAnalyse;
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
import com.smartexsustway.api.ia.EvaluerCritereRequestDto;
import com.smartexsustway.api.ia.EvaluerCritereResponseDto;
import com.smartexsustway.api.ia.IaEvaluationClient;
import com.smartexsustway.api.referentiel.ValidationContenuImporteService;
import com.smartexsustway.api.resource.support.UtilisateurDeTest;
import com.smartexsustway.api.security.JwtService;
import io.quarkus.narayana.jta.QuarkusTransaction;
import io.quarkus.test.InjectMock;
import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import jakarta.persistence.EntityManager;
import org.eclipse.microprofile.rest.client.inject.RestClient;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

/**
 * Ce que l'analyse d'une mission a le droit de lire du référentiel.
 *
 * Une proposition de l'IA qu'une personne a écartée — ou qu'elle n'a pas
 * encore regardée — n'a rien à faire dans ce que l'on soumet aux agents :
 * l'organisation serait jugée sur un contenu dont personne ne répond.
 *
 * Le filtrage est éprouvé à deux niveaux, et les deux comptent. Au niveau des
 * requêtes d'abord. Au niveau du corps réellement transmis au service
 * d'agents ensuite — c'est le seul qui prouve qu'aucun des trois chemins ne
 * laisse passer quelque chose en route.
 *
 * Le décor est monté sur une version brouillon. C'est délibéré : une version
 * publiée ne peut pas contenir de proposition en attente, le déclencheur de
 * V58 en interdit la publication. Éprouver ce cas suppose donc un brouillon,
 * et l'assemblage du contexte ne regarde de toute façon pas le statut de la
 * version — seulement le critère que la mission a figé.
 */
@QuarkusTest
class ContexteIaFiltreTest {

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
    @Inject ValidationContenuImporteService validationService;
    @Inject AnalyseCritereService analyseCritereService;
    @Inject EntityManager entityManager;

    @InjectMock
    @RestClient
    IaEvaluationClient iaEvaluationClient;

    // === Décor ==============================================================

    /**
     * Un critère portant les cinq états qu'un contenu de référentiel peut
     * prendre, pour chacune des trois natures.
     */
    private record Decor(UUID versionId, UUID critereId, UUID auditId, UUID auditCritereId,
                         UUID exigenceHumaine, UUID exigenceInitiale, UUID exigenceValidee,
                         UUID exigenceRejetee, UUID exigenceEnAttente) {
    }

    private Decor monterDecor() {
        var admin = UtilisateurDeTest.creerAvecRole(jwtService, "SUPER_ADMIN",
                utilisateurRepository, entrepriseRepository, roleRepository,
                utilisateurEntrepriseRepository);
        UUID adminId = UUID.fromString(admin.id);

        return QuarkusTransaction.requiringNew().call(() -> {
            Utilisateur auteur = utilisateurRepository.findById(adminId);
            Entreprise entreprise = entrepriseRepository.listAll().get(0);

            var referentiel = new Referentiel(
                    "CTX_" + UUID.randomUUID().toString().substring(0, 8).toUpperCase(),
                    "Référentiel de contexte", TypeReferentiel.SMARTEX);
            referentielRepository.persistAndFlush(referentiel);

            var version = new ReferentielVersion(referentiel, "1.0",
                    "Décor du filtrage de contexte.", 0, 0, auteur);
            versionRepository.persistAndFlush(version);

            var domaine = new Domaine(version, "D1", "Domaine de contexte");
            domaineRepository.persistAndFlush(domaine);

            var critere = new Critere(domaine, "D1-01", "Critère de contexte");
            critereRepository.persistAndFlush(critere);

            // Cinq exigences, une par état. Les preuves attendues et les
            // règles suivent les mêmes états, portées par les exigences et le
            // critère correspondants.
            var humaine = exigence(critere, "E-HUM", "Rédigée à la main", OrigineContenu.CONTENU_HUMAIN, null);
            var initiale = exigence(critere, "E-INI", "Semée à l'initialisation", OrigineContenu.CONTENU_INITIAL, null);
            var aValider = exigence(critere, "E-VAL", "Proposée puis retenue", OrigineContenu.IMPORT_IA, OrigineContenu.IMPORT_IA);
            var rejetee = exigence(critere, "E-REJ", "Proposée puis écartée", OrigineContenu.IMPORT_IA, OrigineContenu.IMPORT_IA);
            var enAttente = exigence(critere, "E-ATT", "Proposée, pas encore vue", OrigineContenu.IMPORT_IA, OrigineContenu.IMPORT_IA);

            var pHum = preuve(humaine, "P-HUM", OrigineContenu.CONTENU_HUMAIN, null);
            preuve(aValider, "P-VAL", OrigineContenu.IMPORT_IA, OrigineContenu.IMPORT_IA);
            var pRej = preuve(rejetee, "P-REJ", OrigineContenu.IMPORT_IA, OrigineContenu.IMPORT_IA);
            preuve(enAttente, "P-ATT", OrigineContenu.IMPORT_IA, OrigineContenu.IMPORT_IA);
            // Le cas qui a motivé cette correction : une pièce que quelqu'un a
            // retenue, sous une exigence que quelqu'un a écartée.
            preuve(rejetee, "P-ORPH", OrigineContenu.IMPORT_IA, OrigineContenu.IMPORT_IA);
            // Pièce en attente sous un parent actif : sa propre indécision
            // suffit à l'exclure, indépendamment du parent.
            preuve(humaine, "P-ATT-ACT", OrigineContenu.IMPORT_IA, OrigineContenu.IMPORT_IA);

            // Portée critère : seul l'état de la règle compte.
            regle(critere, "R-HUM", OrigineContenu.CONTENU_HUMAIN, null);
            regle(critere, "R-VAL", OrigineContenu.IMPORT_IA, OrigineContenu.IMPORT_IA);
            regle(critere, "R-REJ", OrigineContenu.IMPORT_IA, OrigineContenu.IMPORT_IA);
            regle(critere, "R-ATT", OrigineContenu.IMPORT_IA, OrigineContenu.IMPORT_IA);
            // Portée exigence, puis portée pièce — sur une chaîne active et
            // sur une chaîne écartée.
            regleSur(critere, "R-EXIG-ACT", humaine, null);
            regleSur(critere, "R-EXIG-REJ", rejetee, null);
            regleSur(critere, "R-PREUVE-ACT", humaine, pHum);
            regleSur(critere, "R-PREUVE-REJ", rejetee, pRej);

            var audit = new Audit(entreprise, version, "Mission de contexte", LocalDate.now());
            auditRepository.persistAndFlush(audit);

            var auditCritere = new AuditCritere(audit, critere, critere.getCriticite(), BigDecimal.ONE);
            // Sans matière, `analyser` rend RienAAnalyser et n'appelle personne.
            auditCritere.setScenario("Scénario de contexte, pour que l'analyse ait de quoi partir.");
            auditCritereRepository.persistAndFlush(auditCritere);

            return new Decor(version.getId(), critere.getId(), audit.getId(), auditCritere.getId(),
                    humaine.getId(), initiale.getId(), aValider.getId(),
                    rejetee.getId(), enAttente.getId());
        });
    }

    private Exigence exigence(Critere critere, String code, String intitule,
                              OrigineContenu origine, OrigineContenu origineInitiale) {
        var exigence = new Exigence(critere, code, intitule, "Énoncé de " + code);
        exigence.setOrigine(origine);
        exigence.setOrigineInitiale(origineInitiale);
        exigenceRepository.persistAndFlush(exigence);
        return exigence;
    }

    private PreuveAttendue preuve(Exigence exigence, String libelle,
                                  OrigineContenu origine, OrigineContenu origineInitiale) {
        var preuve = new PreuveAttendue(exigence, TypePreuveAttendue.PROCEDURE, libelle);
        preuve.setOrigine(origine);
        preuve.setOrigineInitiale(origineInitiale);
        preuveAttendueRepository.persistAndFlush(preuve);
        return preuve;
    }

    /**
     * Une règle rédigée à la main, mais portée par une exigence ou une pièce.
     *
     * C'est la portée qui décide de sa transmission, pas son origine : une
     * règle irréprochable visant une pièce écartée n'a plus d'objet.
     */
    private void regleSur(Critere critere, String code, Exigence exigence, PreuveAttendue preuve) {
        var regle = new RegleAnalyse(critere, code, TypeRegleAnalyse.SIGNATURE, "Règle " + code);
        regle.setOrigine(OrigineContenu.CONTENU_HUMAIN);
        regle.setExigence(exigence);
        regle.setPreuveAttendue(preuve);
        regleAnalyseRepository.persistAndFlush(regle);
    }

    private void regle(Critere critere, String code,
                       OrigineContenu origine, OrigineContenu origineInitiale) {
        var regle = new RegleAnalyse(critere, code, TypeRegleAnalyse.SIGNATURE, "Règle " + code);
        regle.setOrigine(origine);
        regle.setOrigineInitiale(origineInitiale);
        regleAnalyseRepository.persistAndFlush(regle);
    }

    /** Applique les décisions humaines, par le service métier et non à la main. */
    private void trancher(Decor decor) {
        var admin = UtilisateurDeTest.creerAvecRole(jwtService, "SUPER_ADMIN",
                utilisateurRepository, entrepriseRepository, roleRepository,
                utilisateurEntrepriseRepository);
        UUID adminId = UUID.fromString(admin.id);

        QuarkusTransaction.requiringNew().run(() -> {
            validationService.validerExigence(
                    exigenceRepository.findById(decor.exigenceValidee()), null, adminId);
            validationService.rejeterExigence(
                    exigenceRepository.findById(decor.exigenceRejetee()), null,
                    "Hors du périmètre audité", adminId);

            for (PreuveAttendue preuve : preuveAttendueRepository.parCritere(decor.critereId())) {
                if (preuve.getLibelle().equals("P-VAL") || preuve.getLibelle().equals("P-ORPH")) {
                    validationService.validerPreuveAttendue(preuve, null, adminId);
                } else if (preuve.getLibelle().equals("P-REJ")) {
                    validationService.rejeterPreuveAttendue(preuve, null, "Pièce sans objet", adminId);
                }
            }
            for (RegleAnalyse regle : regleAnalyseRepository.parCritere(decor.critereId())) {
                if (regle.getCode().equals("R-VAL")) {
                    validationService.validerRegle(regle, null, adminId);
                } else if (regle.getCode().equals("R-REJ")) {
                    validationService.rejeterRegle(regle, null, "Règle inapplicable", adminId);
                }
            }
        });
        entityManager.clear();
    }

    private Decor decorTranche() {
        Decor decor = monterDecor();
        trancher(decor);
        return decor;
    }

    // === 1. Repositories — exigences ========================================

    @Test
    void exigences_leContexteActifRetientCeQuiEstHumainOuValide() {
        Decor decor = decorTranche();

        var codes = exigenceRepository.parCritereActives(decor.critereId()).stream()
                .map(Exigence::getCode).toList();

        assertTrue(codes.contains("E-HUM"), "Le contenu rédigé à la main reste du contexte");
        assertTrue(codes.contains("E-INI"), "Le contenu semé à l'initialisation aussi");
        assertTrue(codes.contains("E-VAL"), "Une proposition reprise à son compte entre au contexte");
        assertFalse(codes.contains("E-REJ"), "Une proposition écartée ne doit pas être soumise aux agents");
        assertFalse(codes.contains("E-ATT"), "Une proposition que personne n'a vue non plus");
        assertEquals(3, codes.size(), "Trois exigences actives, pas cinq : " + codes);
    }

    // === 2. Repositories — preuves attendues ================================

    @Test
    void preuvesAttendues_leContexteActifSuitLaMemeRegle() {
        Decor decor = decorTranche();

        var libelles = preuveAttendueRepository.parCritereActives(decor.critereId()).stream()
                .map(PreuveAttendue::getLibelle).toList();

        assertTrue(libelles.contains("P-HUM"));
        assertTrue(libelles.contains("P-VAL"));
        assertFalse(libelles.contains("P-REJ"));
        assertFalse(libelles.contains("P-ATT"));
        assertEquals(2, libelles.size(), "Deux pièces actives : " + libelles);
    }

    // === 3. Repositories — règles d'analyse =================================

    @Test
    void reglesAnalyse_leContexteActifSuitLaMemeRegle() {
        Decor decor = decorTranche();

        var codes = regleAnalyseRepository.parCritereActives(decor.critereId()).stream()
                .map(RegleAnalyse::getCode).toList();

        assertTrue(codes.contains("R-HUM"));
        assertTrue(codes.contains("R-VAL"));
        assertFalse(codes.contains("R-REJ"));
        assertFalse(codes.contains("R-ATT"));
        assertEquals(4, codes.size(), "Quatre règles actives : " + codes);
    }

    // === 4. Le corps réellement transmis ====================================

    @Test
    void lePayloadTransmisAuxAgents_neContientAucunePropositionNonReprise() {
        Decor decor = decorTranche();
        when(iaEvaluationClient.evaluerCritere(any())).thenReturn(reponseNeutre());

        QuarkusTransaction.requiringNew().run(() ->
                analyseCritereService.analyser(
                        auditRepository.findById(decor.auditId()),
                        auditCritereRepository.findById(decor.auditCritereId())));

        var capture = ArgumentCaptor.forClass(EvaluerCritereRequestDto.class);
        org.mockito.Mockito.verify(iaEvaluationClient).evaluerCritere(capture.capture());
        var envoye = capture.getValue();

        // C'est ce test-ci qui prouve la règle : les trois listes traversent
        // des repositories différents, et seul le corps final dit si l'une
        // d'elles a laissé passer quelque chose.
        var exigences = envoye.exigences().stream()
                .map(EvaluerCritereRequestDto.ExigenceDto::code).toList();
        assertTrue(exigences.contains("E-HUM"), "Le contenu humain doit être transmis");
        assertTrue(exigences.contains("E-VAL"), "La proposition retenue aussi");
        assertFalse(exigences.contains("E-REJ"), "L'écartée n'a rien à faire dans le corps envoyé");
        assertFalse(exigences.contains("E-ATT"), "Ni celle que personne n'a encore vue");

        var pieces = envoye.preuvesAttendues().stream()
                .map(EvaluerCritereRequestDto.PreuveAttendueDto::libelle).toList();
        assertTrue(pieces.contains("P-HUM"));
        assertTrue(pieces.contains("P-VAL"));
        assertFalse(pieces.contains("P-REJ"));
        assertFalse(pieces.contains("P-ATT"));

        var regles = envoye.reglesAnalyse().stream()
                .map(EvaluerCritereRequestDto.RegleAnalyseDto::code).toList();
        assertTrue(regles.contains("R-HUM"));
        assertTrue(regles.contains("R-VAL"));
        assertFalse(regles.contains("R-REJ"));
        assertFalse(regles.contains("R-ATT"));
    }

    // === 5. L'invariant sur lequel repose le prédicat =======================

    @Test
    void validerUneProposition_labasculeVersContenuHumainSansEffacerSaProvenance() {
        Decor decor = decorTranche();
        entityManager.clear();

        Exigence validee = exigenceRepository.findById(decor.exigenceValidee());

        // Le filtre s'écrit `origine <> IMPORT_IA`. Il ne vaut que tant que
        // valider fait bien basculer l'origine : si cette bascule disparaissait,
        // le filtre exclurait silencieusement du contenu accepté.
        assertEquals(OrigineContenu.CONTENU_HUMAIN, validee.getOrigine(),
                "Valider doit faire passer la proposition à CONTENU_HUMAIN");
        assertEquals(OrigineContenu.IMPORT_IA, validee.getOrigineInitiale(),
                "La trace de la machine survit à la reprise en main");
        assertNotNull(validee.getValideePar());
    }

    // === 6. L'historique du rejet est intact ================================

    @Test
    void unePropositionEcartee_resteEnBaseAvecSonMotifEtSaProvenance() {
        Decor decor = decorTranche();
        entityManager.clear();

        Exigence rejetee = exigenceRepository.findById(decor.exigenceRejetee());

        assertNotNull(rejetee, "Écarter n'est pas supprimer");
        assertEquals(OrigineContenu.IMPORT_IA, rejetee.getOrigine(),
                "Personne n'a repris cette proposition : l'origine ne bouge pas");
        assertEquals(OrigineContenu.IMPORT_IA, rejetee.getOrigineInitiale());
        assertNotNull(rejetee.getRejeteePar());
        assertNotNull(rejetee.getRejeteeLe());
        assertEquals("Hors du périmètre audité", rejetee.getMotifRejet());
    }

    // === 7. Le back-office continue de tout voir ============================

    @Test
    void leBackOffice_voitTouteLesPropositionsYComprisEcarteesEtEnAttente() {
        Decor decor = decorTranche();
        entityManager.clear();

        var codes = exigenceRepository.parCritere(decor.critereId()).stream()
                .map(Exigence::getCode).toList();

        // C'est la raison pour laquelle le filtre n'a pas été posé sur
        // `parCritere` : l'écran de relecture a besoin de montrer ce qu'il
        // reste à trancher et ce qui a été écarté.
        assertEquals(5, codes.size(), "Les cinq exigences restent visibles : " + codes);
        assertTrue(codes.contains("E-REJ"), "L'écartée doit rester affichable");
        assertTrue(codes.contains("E-ATT"), "Celle en attente aussi, sinon nul ne la traiterait");

        assertEquals(6, preuveAttendueRepository.parCritere(decor.critereId()).size(),
                "Y compris la pièce validée sous une exigence écartée : le relecteur doit la voir");
        assertEquals(8, regleAnalyseRepository.parCritere(decor.critereId()).size());
    }

    // === 8. Isolation par version ===========================================

    @Test
    void unElementDUneAutreVersion_nEntrePasDansLeContexteDeLaMission() {
        Decor premier = decorTranche();
        Decor second = decorTranche();

        var codesPremier = exigenceRepository.parCritereActives(premier.critereId()).stream()
                .map(Exigence::getCode).toList();

        // La mission lit le critère qu'elle a figé, et lui seul. Deux versions
        // portent ici les mêmes codes ; si le contexte les confondait, on en
        // verrait six au lieu de trois.
        assertEquals(3, codesPremier.size(), "Le contexte ne doit voir qu'une version : " + codesPremier);

        var idsPremier = exigenceRepository.parCritereActives(premier.critereId()).stream()
                .map(e -> e.getReferentielVersion().getId()).distinct().toList();
        assertEquals(List.of(premier.versionId()), idsPremier,
                "Toutes les exigences du contexte appartiennent à la version de la mission");
        assertFalse(idsPremier.contains(second.versionId()));
    }


    // === 9. La chaîne de rattachement ======================================

    @Test
    void unePieceValidee_sousUneExigenceEcartee_neParPasAuxAgents() {
        Decor decor = decorTranche();

        var libelles = preuveAttendueRepository.parCritereActives(decor.critereId()).stream()
                .map(PreuveAttendue::getLibelle).toList();

        // P-ORPH a été validée par une personne : elle est irréprochable en
        // elle-même. Mais l'exigence qu'elle sert a été jugée hors sujet, et
        // la démontrer n'a plus d'objet.
        assertFalse(libelles.contains("P-ORPH"),
                "Une pièce dont l'exigence est écartée n'a plus rien à démontrer : " + libelles);
        assertTrue(libelles.contains("P-HUM"), "Les pièces à chaîne intacte passent toujours");
        assertTrue(libelles.contains("P-VAL"));
    }

    @Test
    void unePieceEnAttente_sousUnParentActif_resteExclue() {
        Decor decor = decorTranche();

        var libelles = preuveAttendueRepository.parCritereActives(decor.critereId()).stream()
                .map(PreuveAttendue::getLibelle).toList();

        // Ce n'est pas le parent qui l'écarte ici, mais sa propre indécision.
        assertFalse(libelles.contains("P-ATT-ACT"), "Une pièce que personne n'a tranchée : " + libelles);
    }

    @Test
    void lesReglesPortees_suiventLEtatDeLeurPortee() {
        Decor decor = decorTranche();

        var codes = regleAnalyseRepository.parCritereActives(decor.critereId()).stream()
                .map(RegleAnalyse::getCode).toList();

        assertTrue(codes.contains("R-EXIG-ACT"), "Portée sur une exigence active : transmise");
        assertFalse(codes.contains("R-EXIG-REJ"), "Portée sur une exigence écartée : exclue");
        assertTrue(codes.contains("R-PREUVE-ACT"), "Portée sur une pièce active : transmise");
        assertFalse(codes.contains("R-PREUVE-REJ"), "Portée sur une pièce écartée : exclue");

        // La garde la plus facile à casser : une jointure interne sur
        // `exigence` ferait disparaître toutes les règles du critère seul.
        assertTrue(codes.contains("R-HUM"), "Les règles portées par le critère seul survivent : " + codes);
        assertTrue(codes.contains("R-VAL"));
    }

    // === 10. L'invariant de contrat ========================================

    @Test
    void toutePieceTransmise_designeUneExigenceEgalementTransmise() {
        Decor decor = decorTranche();
        when(iaEvaluationClient.evaluerCritere(any())).thenReturn(reponseNeutre());

        QuarkusTransaction.requiringNew().run(() ->
                analyseCritereService.analyser(
                        auditRepository.findById(decor.auditId()),
                        auditCritereRepository.findById(decor.auditCritereId())));

        var capture = ArgumentCaptor.forClass(EvaluerCritereRequestDto.class);
        org.mockito.Mockito.verify(iaEvaluationClient).evaluerCritere(capture.capture());
        var envoye = capture.getValue();

        // Le contrat, plutôt que ses conséquences. `exigence_code` est une
        // chaîne que Python recopie telle quelle dans le prompt : un code qui
        // ne désigne rien y devient une référence pendante, et le modèle
        // cherche la démonstration d'une exigence qu'il ne voit pas.
        var codesExigences = envoye.exigences().stream()
                .map(EvaluerCritereRequestDto.ExigenceDto::code)
                .collect(java.util.stream.Collectors.toSet());

        for (var piece : envoye.preuvesAttendues()) {
            assertTrue(codesExigences.contains(piece.exigenceCode()),
                    "La pièce « " + piece.libelle() + " » désigne l'exigence "
                            + piece.exigenceCode() + ", absente du corps envoyé "
                            + codesExigences);
        }

        // Même exigence pour la portée des règles, sur ses deux niveaux.
        var libellesPieces = envoye.preuvesAttendues().stream()
                .map(EvaluerCritereRequestDto.PreuveAttendueDto::libelle)
                .collect(java.util.stream.Collectors.toSet());

        for (var regle : envoye.reglesAnalyse()) {
            if (regle.exigenceCode() != null) {
                assertTrue(codesExigences.contains(regle.exigenceCode()),
                        "La règle " + regle.code() + " vise l'exigence "
                                + regle.exigenceCode() + ", absente du corps envoyé");
            }
            if (regle.preuveAttendueLibelle() != null) {
                assertTrue(libellesPieces.contains(regle.preuveAttendueLibelle()),
                        "La règle " + regle.code() + " vise la pièce « "
                                + regle.preuveAttendueLibelle() + " », absente du corps envoyé");
            }
        }

        assertFalse(envoye.preuvesAttendues().isEmpty(),
                "L'invariant serait trivialement vrai sur un corps vide");
    }

    // === Outillage ==========================================================


    /** Réponse sans intérêt : ce test porte sur ce qui part, pas sur ce qui revient. */
    private static EvaluerCritereResponseDto reponseNeutre() {
        return new EvaluerCritereResponseDto(
                UUID.randomUUID(), 0.5, 0.5, true, "Analyse de décor",
                List.of(), false, null, null, false, null);
    }
}

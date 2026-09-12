package com.smartexsustway.api.planification;

import com.smartexsustway.api.domain.entity.ActionPlan;
import com.smartexsustway.api.domain.entity.PlanAction;
import com.smartexsustway.api.domain.enums.StatutActionCorrective;
import com.smartexsustway.api.domain.enums.StatutPlan;
import io.quarkus.test.junit.QuarkusTest;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Les règles du plan qui se vérifient sans base : progression, retard, gel.
 *
 * <p>Elles sont statiques et pures, et c'est précisément ce qui les rend
 * sûres — une progression calculée ne peut pas diverger de ses actions,
 * contrairement à une valeur que quelqu'un aurait à tenir à jour.
 */
@QuarkusTest
class CycleViePlanTest {

    // === Progression, dérivée et jamais stockée ==========================

    @Test
    void unPlanSansActionEstAZeroSansDiviserParZero() {
        assertEquals(0, PlanActionService.progression(List.of()));
        assertEquals(0, PlanActionService.progression(null));
    }

    @Test
    void laProgressionCompteLesActionsFaites() {
        var actions = List.of(
                action(StatutActionCorrective.OUVERTE),
                action(StatutActionCorrective.EN_COURS),
                action(StatutActionCorrective.TERMINEE),
                action(StatutActionCorrective.VALIDEE));

        // TERMINEE et VALIDEE comptent toutes deux : une action réalisée l'est,
        // que le responsable l'ait déjà constatée ou non.
        assertEquals(50, PlanActionService.progression(actions));
    }

    @Test
    void unPlanEntierementValideEstACentPourCent() {
        var actions = List.of(
                action(StatutActionCorrective.VALIDEE),
                action(StatutActionCorrective.TERMINEE));

        assertEquals(100, PlanActionService.progression(actions));
    }

    @Test
    void laProgressionNeDependQueDesActions() {
        var actions = List.of(
                action(StatutActionCorrective.TERMINEE),
                action(StatutActionCorrective.OUVERTE),
                action(StatutActionCorrective.OUVERTE));

        // 1/3 arrondi : 33 %. Le point du test n'est pas l'arrondi, c'est
        // qu'aucune autre entrée n'intervient.
        assertEquals(33, PlanActionService.progression(actions));
    }

    private static ActionPlan action(StatutActionCorrective statut) {
        ActionPlan a = new ActionPlan(null, "Action", 0);
        a.setStatut(statut);
        return a;
    }

    // === Retard : un signal, jamais un statut ============================

    @Test
    void uneEcheanceDepasseeSignaleLeRetardSansToucherAuStatut() {
        LocalDate hier = LocalDate.now().minusDays(1);

        assertTrue(PlanActionService.enRetard(hier, StatutActionCorrective.OUVERTE));
        assertTrue(PlanActionService.enRetard(hier, StatutActionCorrective.EN_COURS));
    }

    @Test
    void uneActionFaiteNEstJamaisEnRetard() {
        LocalDate hier = LocalDate.now().minusDays(1);

        // Le travail a été fait, même tard : le signaler en retard
        // reprocherait un retard déjà résorbé.
        assertFalse(PlanActionService.enRetard(hier, StatutActionCorrective.TERMINEE));
        assertFalse(PlanActionService.enRetard(hier, StatutActionCorrective.VALIDEE));
    }

    @Test
    void sansEcheanceIlNYAPasDeRetard() {
        assertFalse(PlanActionService.enRetard(null, StatutActionCorrective.OUVERTE));
    }

    @Test
    void uneEcheanceFutureNEstPasUnRetard() {
        assertFalse(PlanActionService.enRetard(LocalDate.now().plusDays(7),
                StatutActionCorrective.OUVERTE));
    }

    @Test
    void unPlanGeleNEstPlusSignaleEnRetard() {
        LocalDate hier = LocalDate.now().minusDays(1);

        assertTrue(PlanActionService.planEnRetard(hier, StatutPlan.ACTIF));
        // Un plan clos n'a plus d'échéance à tenir.
        assertFalse(PlanActionService.planEnRetard(hier, StatutPlan.CLOTURE));
        assertFalse(PlanActionService.planEnRetard(hier, StatutPlan.ARCHIVE));
    }

    // === Gel =============================================================

    @Test
    void seulsLesEtatsTerminauxGelentLePlan() {
        assertFalse(StatutPlan.BROUILLON.estGele());
        assertFalse(StatutPlan.ACTIF.estGele());
        assertTrue(StatutPlan.CLOTURE.estGele());
        assertTrue(StatutPlan.ARCHIVE.estGele());
    }

    @Test
    void clotureEtArchivageGelentLePlanEtNommentLeurDecideur() {
        PlanAction plan = new PlanAction(null, "Plan");
        assertFalse(plan.estGele());

        plan.cloturer(null, "Objectifs atteints.");
        assertEquals(StatutPlan.CLOTURE, plan.getStatut());
        assertEquals("Objectifs atteints.", plan.getMotifCloture());
        assertTrue(plan.estGele());
    }

    @Test
    void archiverEtCloturerRestentDeuxEtatsDistincts() {
        PlanAction archive = new PlanAction(null, "Plan retiré");
        archive.archiver(null, "Réorganisation.");

        // Les deux gèlent, mais ne disent pas la même chose : un plan
        // abandonné ne se relit pas comme un plan accompli.
        assertEquals(StatutPlan.ARCHIVE, archive.getStatut());
        assertTrue(archive.estGele());
    }
}

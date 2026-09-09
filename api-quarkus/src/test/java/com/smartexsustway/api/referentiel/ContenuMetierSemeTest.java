package com.smartexsustway.api.referentiel;

import com.smartexsustway.api.domain.enums.TypeRegleAnalyse;
import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.Test;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.junit.jupiter.api.Assertions.fail;

/**
 * Le contenu métier semé est-il exploitable ?
 *
 * Le catalogue seul ne dit que ce qu'on évalue. Ce test éprouve ce qui
 * s'y ajoute : ce qui est exigé, ce qu'il faudrait produire pour le
 * démontrer, et selon quelles règles conclure. Trois choses doivent tenir —
 * la volumétrie, l'intégrité des rattachements, et la conformité des règles
 * à ce que le service sait interpréter.
 *
 * Le dernier point compte plus qu'il n'y paraît : une migration écrit en SQL
 * et court-circuite donc la validation applicative. Une définition mal formée
 * passerait le semis pour n'échouer qu'à la première modification par
 * l'écran d'administration.
 */
@QuarkusTest
class ContenuMetierSemeTest {

    @Inject EntityManager entityManager;

    private long compter(String sql) {
        return ((Number) entityManager.createNativeQuery(sql).getSingleResult()).longValue();
    }

    /** Restreint aux trois référentiels du catalogue, version publiée. */
    private static final String VERSION_PUBLIEE =
            " JOIN referentiel_version v ON v.id = %s.referentiel_version_id "
                    + " JOIN referentiel r ON r.id = v.referentiel_id "
                    + " WHERE v.statut = 'PUBLIEE' "
                    + " AND r.code IN ('SMARTEX_SUSTWAY','IFC_SFI','PRI') ";

    // === Volumétrie ========================================================

    @Test
    void leContenuMetierEstIntegralementSeme() {
        assertEquals(136L, compter("SELECT count(*) FROM exigence x"
                        + String.format(VERSION_PUBLIEE, "x")),
                "Le catalogue publié doit porter 136 exigences.");
        assertEquals(196L, compter("SELECT count(*) FROM preuve_attendue p"
                        + String.format(VERSION_PUBLIEE, "p")),
                "Le catalogue publié doit porter 196 preuves attendues.");
        assertEquals(98L, compter("SELECT count(*) FROM regle_analyse ra"
                        + String.format(VERSION_PUBLIEE, "ra")),
                "Le catalogue publié doit porter 98 règles d'analyse.");
    }

    @Test
    void chaqueCriterePublieAExactementUneExigenceRedigee() {
        assertEquals(0L, compter(
                        "SELECT count(*) FROM critere c "
                                + " JOIN referentiel_version v ON v.id = c.referentiel_version_id "
                                + " JOIN referentiel r ON r.id = v.referentiel_id "
                                + " WHERE v.statut = 'PUBLIEE' "
                                + " AND r.code IN ('SMARTEX_SUSTWAY','IFC_SFI','PRI') "
                                + " AND NOT EXISTS (SELECT 1 FROM exigence x WHERE x.critere_id = c.id)"),
                "Aucun critère publié ne doit être sans exigence.");

        assertEquals(0L, compter("SELECT count(*) FROM exigence x"
                        + String.format(VERSION_PUBLIEE, "x")
                        + " AND x.origine = 'CONTENU_INITIAL'"),
                "Aucune exigence publiée ne doit être restée à l'état d'amorçage.");

        // Une exigence rédigée dit ce qui est exigé : elle ne peut pas se
        // réduire au libellé du critère, sans quoi rien n'aurait été écrit.
        assertEquals(0L, compter(
                        "SELECT count(*) FROM exigence x JOIN critere c ON c.id = x.critere_id"
                                + String.format(VERSION_PUBLIEE, "x")
                                + " AND x.enonce = c.libelle"),
                "Aucune exigence publiée ne doit se contenter de reprendre le libellé du critère.");
    }

    @Test
    void leContenuMetierEstIssuDuCatalogueReelEtNonDeLAncien() {
        assertEquals(0L, compter(
                        "SELECT count(*) FROM exigence x JOIN critere c ON c.id = x.critere_id"
                                + String.format(VERSION_PUBLIEE, "x")
                                + " AND (c.code LIKE 'VE-%' OR c.code LIKE 'GOUV-%' "
                                + "   OR c.code LIKE 'SOC-%' OR c.code LIKE 'ENV-%' "
                                + "   OR c.code LIKE 'ECO-%' OR c.code LIKE 'ORG-%' "
                                + "   OR c.code LIKE 'PS%-%')"),
                "Aucune exigence publiée ne doit se rattacher à un critère de l'ancien catalogue.");
    }

    // === Intégrité des rattachements =======================================

    @Test
    void aucunContenuNeTraverseUneVersion() {
        assertEquals(0L, compter(
                        "SELECT count(*) FROM exigence x JOIN critere c ON c.id = x.critere_id "
                                + "WHERE x.referentiel_version_id <> c.referentiel_version_id"),
                "Une exigence doit appartenir à la version de son critère.");
        assertEquals(0L, compter(
                        "SELECT count(*) FROM preuve_attendue p JOIN exigence x ON x.id = p.exigence_id "
                                + "WHERE p.referentiel_version_id <> x.referentiel_version_id"),
                "Une preuve attendue doit appartenir à la version de son exigence.");
        assertEquals(0L, compter(
                        "SELECT count(*) FROM regle_analyse ra JOIN critere c ON c.id = ra.critere_id "
                                + "WHERE ra.referentiel_version_id <> c.referentiel_version_id"),
                "Une règle doit appartenir à la version de son critère.");
    }

    @Test
    void lesPorteesDesReglesSontCoherentes() {
        assertEquals(0L, compter(
                        "SELECT count(*) FROM regle_analyse ra JOIN exigence x ON x.id = ra.exigence_id "
                                + "WHERE x.critere_id <> ra.critere_id"),
                "Une règle ne peut viser l'exigence d'un autre critère.");
        assertEquals(0L, compter(
                        "SELECT count(*) FROM regle_analyse ra "
                                + "JOIN preuve_attendue p ON p.id = ra.preuve_attendue_id "
                                + "WHERE p.exigence_id IS DISTINCT FROM ra.exigence_id"),
                "Une règle ne peut viser la pièce attendue d'une autre exigence.");
        assertEquals(0L, compter(
                        "SELECT count(*) FROM regle_analyse "
                                + "WHERE preuve_attendue_id IS NOT NULL AND exigence_id IS NULL"),
                "Une règle portant sur une pièce doit nommer son exigence.");
    }

    /**
     * Le caractère obligatoire d'une pièce est une propriété de la pièce, et
     * rien d'autre : le redire par une règle créerait deux sources de vérité
     * dont l'une finirait par mentir.
     */
    @Test
    void aucuneRegleNeRedigeLeCaractereObligatoireDUnePiece() {
        long suspectes = compter(
                "SELECT count(*) FROM regle_analyse ra"
                        + String.format(VERSION_PUBLIEE, "ra")
                        + " AND ra.preuve_attendue_id IS NOT NULL "
                        + " AND (lower(ra.libelle) LIKE '%obligatoire%' "
                        + "   OR ra.definition::text LIKE '%obligatoire%')");
        assertEquals(0L, suspectes,
                "Le caractère obligatoire d'une pièce reste porté par preuve_attendue.obligatoire.");

        assertTrue(compter("SELECT count(*) FROM preuve_attendue p"
                        + String.format(VERSION_PUBLIEE, "p") + " AND p.obligatoire") > 0,
                "Des pièces obligatoires doivent exister, portées par leur propre colonne.");
    }

    // === Conformité des règles au validateur ==============================

    /**
     * Chaque règle semée est repassée par {@link RegleAnalyseValidation}.
     *
     * La migration écrit en SQL et contourne donc la validation applicative.
     * Sans ce contrôle, une définition mal formée resterait invisible jusqu'à
     * ce qu'un administrateur tente de modifier la règle — et se heurte alors
     * à un refus qu'il n'a pas causé.
     */
    @Test
    void chaqueRegleSemeeEstAccepteeParLeValidateur() {
        @SuppressWarnings("unchecked")
        List<Object[]> regles = entityManager.createNativeQuery(
                        "SELECT ra.code, ra.type::text, ra.definition::text FROM regle_analyse ra"
                                + String.format(VERSION_PUBLIEE, "ra")).getResultList();

        assertEquals(98, regles.size(), "Toutes les règles publiées doivent être examinées.");

        var refusees = new StringBuilder();
        var mapper = new com.fasterxml.jackson.databind.ObjectMapper();
        for (Object[] ligne : regles) {
            String code = (String) ligne[0];
            var type = TypeRegleAnalyse.valueOf((String) ligne[1]);
            Map<String, Object> definition;
            try {
                definition = mapper.readValue((String) ligne[2], new HashMap<String, Object>().getClass());
            } catch (Exception e) {
                refusees.append("  ").append(code).append(" : définition JSON illisible\n");
                continue;
            }
            try {
                RegleAnalyseValidation.verifier(type, definition);
            } catch (RegleAnalyseValidation.DefinitionInvalideException e) {
                refusees.append("  ").append(code).append(" : ").append(e.getMessage()).append('\n');
            }
        }
        if (refusees.length() > 0) {
            fail("Des règles semées ne passeraient pas la validation applicative :\n" + refusees);
        }
    }

    // === Les missions historiques ne bougent pas ==========================

    /**
     * Le semis publie une nouvelle version ; les missions déjà créées gardent
     * la leur. C'est la garantie de la phase 3A appliquée à un changement de
     * catalogue : ce qu'une mission a audité reste ce qu'elle a audité.
     */
    @Test
    void lesMissionsGardentLeQuestionnaireQuellesOntAudite() {
        assertEquals(0L, compter(
                        "SELECT count(*) FROM audit_critere ac "
                                + "JOIN audit a ON a.id = ac.audit_id "
                                + "JOIN critere c ON c.id = ac.critere_id "
                                + "WHERE c.referentiel_version_id <> a.referentiel_version_id"),
                "Aucun critère de mission ne doit sortir de la version rattachée à sa mission.");

        assertEquals(0L, compter("SELECT count(*) FROM audit WHERE referentiel_version_id IS NULL"),
                "Toute mission porte une version de référentiel.");

        assertEquals(0L, compter(
                        "SELECT count(*) FROM audit_critere ac "
                                + "LEFT JOIN critere c ON c.id = ac.critere_id WHERE c.id IS NULL"),
                "Aucun critère figé ne doit être devenu orphelin.");

        assertEquals(0L, compter(
                        "SELECT count(*) FROM audit_question aq "
                                + "LEFT JOIN question q ON q.id = aq.question_id WHERE q.id IS NULL"),
                "Aucune question figée ne doit être devenue orpheline.");
    }

    /**
     * Le score reste calculé au niveau du critère : l'enrichissement n'a
     * introduit aucune unité d'évaluation plus fine.
     */
    @Test
    void leScoringResteAuNiveauDuCritere() {
        assertEquals(0L, compter(
                        "SELECT count(*) FROM information_schema.columns "
                                + "WHERE table_schema = 'public' AND table_name = 'evaluation' "
                                + "AND column_name IN ('exigence_id','preuve_attendue_id')"),
                "Une évaluation se rattache au critère, à rien de plus fin.");

        assertEquals(0L, compter(
                        "SELECT count(*) FROM information_schema.tables "
                                + "WHERE table_schema = 'public' AND table_name = 'audit_exigence'"),
                "Aucune table audit_exigence ne doit exister.");
    }
}

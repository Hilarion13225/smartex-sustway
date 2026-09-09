package com.smartexsustway.api.referentiel;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;
import java.util.TreeSet;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.junit.jupiter.api.Assertions.fail;

/**
 * Le catalogue semé est-il exactement celui de la source versionnée ?
 *
 * Une installation neuve doit reconstruire le catalogue métier tel que
 * l'application l'utilise — pas approximativement, exactement. Compter les
 * lignes ne le dirait pas : un libellé altéré, un sous-domaine mal rattaché
 * ou une échelle de réponse changée passeraient inaperçus alors qu'ils
 * changent ce que l'organisation lit et ce que l'IA reçoit.
 *
 * La comparaison porte donc sur le contenu, champ par champ, dans les deux
 * sens : rien ne manque en base, rien ne s'y trouve en trop.
 *
 * La source est {@code referentiel-source/*.json}, à la racine du dépôt. La
 * lire depuis un test la maintient vivante : si quelqu'un modifie le
 * catalogue en base sans passer par elle, ce test le dit.
 */
@QuarkusTest
class CatalogueReelTest {

    private static final List<String> REFERENTIELS =
            List.of("SMARTEX_SUSTWAY", "IFC_SFI", "PRI");

    /** Ce que l'application doit servir, par référentiel. */
    private static final List<Integer> CRITERES_ATTENDUS = List.of(92, 28, 16);

    @Inject EntityManager entityManager;

    private static final ObjectMapper JSON = new ObjectMapper();

    private JsonNode source(String code) throws IOException {
        // Les tests s'exécutent depuis api-quarkus/ ; la source est à la
        // racine du dépôt, comme docker-compose.yml pour ExpositionServiceIaTest.
        Path fichier = Path.of("..", "referentiel-source", code + ".json");
        assertTrue(Files.exists(fichier),
                "Source du catalogue introuvable : " + fichier.toAbsolutePath());
        return JSON.readTree(Files.readString(fichier));
    }

    /** Version publiée d'un référentiel : celle que reçoit toute nouvelle mission. */
    private String versionPubliee(String code) {
        return (String) entityManager.createNativeQuery(
                        "SELECT v.numero FROM referentiel_version v "
                                + "JOIN referentiel r ON r.id = v.referentiel_id "
                                + "WHERE r.code = ?1 AND v.statut = 'PUBLIEE'")
                .setParameter(1, code).getSingleResult();
    }

    @SuppressWarnings("unchecked")
    private List<Object[]> interroger(String sql, String code) {
        return entityManager.createNativeQuery(sql).setParameter(1, code).getResultList();
    }

    /** Texte d'un champ éventuellement nul, rendu comparable des deux côtés. */
    private static String texte(Object valeur) {
        return valeur == null ? "∅" : valeur.toString();
    }

    private static String texte(JsonNode noeud, String champ) {
        JsonNode valeur = noeud.get(champ);
        return valeur == null || valeur.isNull() ? "∅" : valeur.asText();
    }

    /**
     * Compare deux ensembles de lignes canoniques et rend un écart lisible.
     *
     * Le sens compte : une ligne présente d'un seul côté ne dit pas la même
     * chose selon le côté, et le message doit permettre de corriger sans
     * relire toute la table.
     */
    private void comparer(String quoi, String referentiel, Set<String> attendu, Set<String> obtenu) {
        var manquantes = new TreeSet<>(attendu);
        manquantes.removeAll(obtenu);
        var superflues = new TreeSet<>(obtenu);
        superflues.removeAll(attendu);

        if (manquantes.isEmpty() && superflues.isEmpty()) {
            return;
        }
        var message = new StringBuilder(referentiel + " — " + quoi + " : le catalogue en base "
                + "diffère de la source versionnée.\n");
        if (!manquantes.isEmpty()) {
            message.append("  Absentes de la base (").append(manquantes.size()).append(") :\n");
            manquantes.stream().limit(5).forEach(l -> message.append("    ").append(l).append('\n'));
        }
        if (!superflues.isEmpty()) {
            message.append("  En trop en base (").append(superflues.size()).append(") :\n");
            superflues.stream().limit(5).forEach(l -> message.append("    ").append(l).append('\n'));
        }
        fail(message.toString());
    }

    // === Le catalogue publié est exactement la source ======================

    @Test
    void leCataloguePublieEstExactementLaSourceVersionnee() throws IOException {
        for (String code : REFERENTIELS) {
            JsonNode source = source(code);
            String version = versionPubliee(code);

            comparerDomaines(code, source, version);
            comparerSousDomaines(code, source, version);
            comparerCriteres(code, source, version);
            comparerQuestions(code, source, version);
        }
    }

    private void comparerDomaines(String code, JsonNode source, String version) {
        Set<String> attendu = new LinkedHashSet<>();
        for (JsonNode d : source.get("domaines")) {
            attendu.add(String.join(" | ", d.get("code").asText(), d.get("nom").asText(),
                    texte(d, "description"), String.valueOf(d.get("ordre").asInt())));
        }

        Set<String> obtenu = new LinkedHashSet<>();
        for (Object[] l : interroger(
                "SELECT d.code, d.nom, d.description, d.ordre FROM domaine d "
                        + "JOIN referentiel r ON r.id = d.referentiel_id "
                        + "JOIN referentiel_version v ON v.id = d.referentiel_version_id "
                        + "WHERE r.code = ?1 AND v.statut = 'PUBLIEE'", code)) {
            obtenu.add(String.join(" | ", texte(l[0]), texte(l[1]), texte(l[2]), texte(l[3])));
        }
        comparer("domaines (version " + version + ")", code, attendu, obtenu);
    }

    private void comparerSousDomaines(String code, JsonNode source, String version) {
        Set<String> attendu = new LinkedHashSet<>();
        for (JsonNode d : source.get("domaines")) {
            JsonNode sds = d.get("sousDomaines");
            if (sds == null || sds.isNull()) {
                continue;
            }
            for (JsonNode sd : sds) {
                // Le domaine parent fait partie de l'identité : deux
                // sous-domaines de même code sous des domaines différents
                // sont deux objets distincts.
                attendu.add(String.join(" | ", d.get("code").asText(), sd.get("code").asText(),
                        sd.get("nom").asText(), texte(sd, "description"),
                        String.valueOf(sd.get("ordre").asInt())));
            }
        }

        Set<String> obtenu = new LinkedHashSet<>();
        for (Object[] l : interroger(
                "SELECT d.code, sd.code, sd.nom, sd.description, sd.ordre FROM sous_domaine sd "
                        + "JOIN domaine d ON d.id = sd.domaine_id "
                        + "JOIN referentiel r ON r.id = d.referentiel_id "
                        + "JOIN referentiel_version v ON v.id = sd.referentiel_version_id "
                        + "WHERE r.code = ?1 AND v.statut = 'PUBLIEE'", code)) {
            obtenu.add(String.join(" | ", texte(l[0]), texte(l[1]), texte(l[2]), texte(l[3]),
                    texte(l[4])));
        }
        comparer("sous-domaines (version " + version + ")", code, attendu, obtenu);
    }

    private void comparerCriteres(String code, JsonNode source, String version) {
        Set<String> attendu = new LinkedHashSet<>();
        for (JsonNode d : source.get("domaines")) {
            JsonNode criteres = d.get("criteres");
            if (criteres == null || criteres.isNull()) {
                continue;
            }
            for (JsonNode c : criteres) {
                attendu.add(String.join(" | ", d.get("code").asText(), c.get("code").asText(),
                        c.get("libelle").asText(), texte(c, "description"),
                        texte(c, "sousDomaineCode"), c.get("applicabilite").asText(),
                        texte(c, "criticiteCode"), String.valueOf(c.get("actif").asBoolean()),
                        c.get("coefficientPonderation").asText()));
            }
        }

        Set<String> obtenu = new LinkedHashSet<>();
        for (Object[] l : interroger(
                "SELECT d.code, c.code, c.libelle, c.description, "
                        + "(SELECT sd.code FROM sous_domaine sd WHERE sd.id = c.sous_domaine_id), "
                        + "c.applicabilite::text, "
                        + "(SELECT cr.code::text FROM criticite cr WHERE cr.id = c.criticite_id), "
                        + "c.actif, c.coefficient_ponderation::text "
                        + "FROM critere c JOIN domaine d ON d.id = c.domaine_id "
                        + "JOIN referentiel r ON r.id = d.referentiel_id "
                        + "JOIN referentiel_version v ON v.id = c.referentiel_version_id "
                        + "WHERE r.code = ?1 AND v.statut = 'PUBLIEE'", code)) {
            obtenu.add(String.join(" | ", texte(l[0]), texte(l[1]), texte(l[2]), texte(l[3]),
                    texte(l[4]), texte(l[5]), texte(l[6]), texte(l[7]), texte(l[8])));
        }
        comparer("critères (version " + version + ")", code, attendu, obtenu);
    }

    private void comparerQuestions(String code, JsonNode source, String version) {
        Set<String> attendu = new LinkedHashSet<>();
        for (JsonNode d : source.get("domaines")) {
            JsonNode criteres = d.get("criteres");
            if (criteres == null || criteres.isNull()) {
                continue;
            }
            for (JsonNode c : criteres) {
                JsonNode questions = c.get("questions");
                if (questions == null || questions.isNull()) {
                    continue;
                }
                for (JsonNode q : questions) {
                    attendu.add(String.join(" | ", c.get("code").asText(), q.get("code").asText(),
                            q.get("libelle").asText(), q.get("type").asText(),
                            String.valueOf(q.get("ordre").asInt()),
                            String.valueOf(q.get("obligatoire").asBoolean()),
                            q.get("echelleReponse").asText()));
                }
            }
        }

        Set<String> obtenu = new LinkedHashSet<>();
        for (Object[] l : interroger(
                "SELECT c.code, q.code, q.libelle, q.type::text, q.ordre, q.obligatoire, "
                        + "q.echelle_reponse FROM question q "
                        + "JOIN critere c ON c.id = q.critere_id "
                        + "JOIN domaine d ON d.id = c.domaine_id "
                        + "JOIN referentiel r ON r.id = d.referentiel_id "
                        + "JOIN referentiel_version v ON v.id = q.referentiel_version_id "
                        + "WHERE r.code = ?1 AND v.statut = 'PUBLIEE'", code)) {
            obtenu.add(String.join(" | ", texte(l[0]), texte(l[1]), texte(l[2]), texte(l[3]),
                    texte(l[4]), texte(l[5]), texte(l[6])));
        }
        comparer("questions (version " + version + ")", code, attendu, obtenu);
    }

    // === Volumétrie ========================================================

    @Test
    void chaqueReferentielSertLeNombreDeCriteresAttendu() {
        var constats = new ArrayList<String>();
        for (int i = 0; i < REFERENTIELS.size(); i++) {
            String code = REFERENTIELS.get(i);
            Number nb = (Number) entityManager.createNativeQuery(
                            "SELECT count(*) FROM critere c "
                                    + "JOIN domaine d ON d.id = c.domaine_id "
                                    + "JOIN referentiel r ON r.id = d.referentiel_id "
                                    + "JOIN referentiel_version v ON v.id = c.referentiel_version_id "
                                    + "WHERE r.code = ?1 AND v.statut = 'PUBLIEE'")
                    .setParameter(1, code).getSingleResult();
            constats.add(code + " = " + nb.intValue() + " (attendu " + CRITERES_ATTENDUS.get(i) + ")");
            assertEquals(CRITERES_ATTENDUS.get(i).intValue(), nb.intValue(),
                    "Volumétrie du catalogue publié : " + String.join(", ", constats));
        }

        Number total = (Number) entityManager.createNativeQuery(
                        "SELECT count(*) FROM critere c "
                                + "JOIN domaine d ON d.id = c.domaine_id "
                                + "JOIN referentiel r ON r.id = d.referentiel_id "
                                + "JOIN referentiel_version v ON v.id = c.referentiel_version_id "
                                + "WHERE r.code IN ('SMARTEX_SUSTWAY','IFC_SFI','PRI') "
                                + "AND v.statut = 'PUBLIEE'")
                .getSingleResult();
        assertEquals(136, total.intValue(), "Le catalogue publié doit compter 136 critères.");
    }

    /**
     * Les codes de l'ancien catalogue semé par V11 et V20 ne doivent plus
     * servir. Ils subsistent dans la version 1.0, archivée — l'historique est
     * conservé —, mais aucune mission nouvelle ne doit les rencontrer.
     */
    @Test
    void lAncienCatalogueNeSertPlusAucuneMissionNouvelle() {
        Number ancienPublie = (Number) entityManager.createNativeQuery(
                        "SELECT count(*) FROM critere c "
                                + "JOIN referentiel_version v ON v.id = c.referentiel_version_id "
                                + "JOIN referentiel r ON r.id = v.referentiel_id "
                                + "WHERE v.statut = 'PUBLIEE' "
                                + "AND r.code IN ('SMARTEX_SUSTWAY','IFC_SFI','PRI') "
                                + "AND (c.code LIKE 'VE-%' OR c.code LIKE 'GOUV-%' "
                                + "  OR c.code LIKE 'SOC-%' OR c.code LIKE 'ENV-%' "
                                + "  OR c.code LIKE 'ECO-%' OR c.code LIKE 'ORG-%' "
                                + "  OR c.code LIKE 'PS%-%' OR c.code LIKE 'P%-0%')")
                .getSingleResult();
        assertEquals(0L, ancienPublie.longValue(),
                "Aucun critère de l'ancien catalogue ne doit figurer dans la version publiée.");

        Number ancienArchive = (Number) entityManager.createNativeQuery(
                        "SELECT count(*) FROM critere c "
                                + "JOIN referentiel_version v ON v.id = c.referentiel_version_id "
                                + "WHERE v.statut = 'ARCHIVEE' AND c.code LIKE 'VE-%'")
                .getSingleResult();
        assertTrue(ancienArchive.longValue() > 0,
                "L'ancien catalogue doit rester consultable dans la version archivée : "
                        + "l'historique n'est pas réécrit.");
    }
}

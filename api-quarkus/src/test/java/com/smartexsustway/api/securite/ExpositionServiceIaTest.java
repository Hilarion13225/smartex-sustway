package com.smartexsustway.api.securite;

import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Le service d'agents IA ne doit pas être joignable depuis le réseau.
 *
 * Il vérifie désormais un jeton de service signé (phase 3D), mais cette
 * vérification et le non-exposition du port sont deux gardes distinctes, et
 * chacune répond d'une défaillance de l'autre : une clé mal configurée, ou un
 * jeton dérobé, ne doivent pas suffire à atteindre le service depuis
 * l'extérieur. Le chemin légitime reste l'API Java, qui vérifie le jeton de
 * l'utilisateur, l'appartenance à l'entreprise et la permission
 * `analyse:executer` avant de signer son propre appel.
 *
 * Ce test lit la déclaration Docker plutôt que d'ouvrir une connexion :
 * l'exposition est une propriété du déploiement, pas du code, et une
 * sonde réseau serait à la fois lente et dépendante de l'environnement
 * d'exécution des tests. Ce qu'il empêche, c'est qu'un « 8000:8000 »
 * revienne par inadvertance dans le fichier.
 */
class ExpositionServiceIaTest {

    /** Publication ouverte à toutes les interfaces : "8000:8000" ou "0.0.0.0:8000:8000". */
    private static final Pattern PUBLICATION_OUVERTE =
            Pattern.compile("^\\s*-\\s*[\"']?(?:0\\.0\\.0\\.0:)?(\\d+):8000[\"']?\\s*$");

    private static final Pattern PUBLICATION_LOOPBACK =
            Pattern.compile("^\\s*-\\s*[\"']?127\\.0\\.0\\.1:\\d+:8000[\"']?\\s*$");

    private String compose() throws IOException {
        // Le fichier est à la racine du dépôt, un cran au-dessus du module.
        Path chemin = Path.of("..", "docker-compose.yml");
        return Files.readString(chemin, StandardCharsets.UTF_8);
    }

    @Test
    void leServiceIa_nEstPasPublieSurToutesLesInterfaces() throws IOException {
        for (String ligne : compose().split("\\R")) {
            Matcher ouverte = PUBLICATION_OUVERTE.matcher(ligne);
            assertFalse(ouverte.matches(),
                    "Le service IA ne doit pas être publié sur toutes les interfaces : « " + ligne.trim()
                            + " ». Il n'authentifie aucun appelant ; utiliser 127.0.0.1:8000:8000.");
        }
    }

    @Test
    void leServiceIa_resteJoignableEnLoopbackPourLeModeDev() throws IOException {
        boolean loopback = compose().lines().anyMatch(l -> PUBLICATION_LOOPBACK.matcher(l).matches());
        assertTrue(loopback,
                "La publication en loopback est attendue : l'API Java lancée hors conteneur "
                        + "vise localhost:8000 par défaut (application.properties).");
    }

    /**
     * L'API Java doit joindre le service par le réseau Docker interne, et non
     * par le port publié : sinon retirer la publication casserait la chaîne.
     */
    @Test
    void lApiJava_joignLeServiceParLeReseauInterne() throws IOException {
        assertTrue(compose().contains("SMARTEX_IA_SERVICE_URL: http://services-ia-python:8000"),
                "L'API Java doit viser le nom de service Docker, pas localhost.");
    }
}

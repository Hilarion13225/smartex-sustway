package com.smartexsustway.api.antivirus;

import jakarta.enterprise.context.ApplicationScoped;
import org.eclipse.microprofile.config.inject.ConfigProperty;
import org.jboss.logging.Logger;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.InetSocketAddress;
import java.net.Socket;
import java.nio.charset.StandardCharsets;

/**
 * Exigence sécurité §1.4 : scan antivirus à l'upload — ClamAV via le
 * protocole {@code clamd} INSTREAM (TCP, pas de dépendance Java
 * supplémentaire nécessaire, juste un socket).
 *
 * Composant non testé en conditions réelles (pas de ClamAV disponible dans
 * l'environnement où ce code a été écrit) — l'implémentation suit le
 * protocole INSTREAM tel que documenté par ClamAV (commande zINSTREAM, un
 * préfixe de 4 octets big-endian par bloc de données, un bloc de taille
 * zéro pour signaler la fin de flux, réponse texte terminée par un octet
 * nul). À vérifier avec une attention particulière lors des premiers tests
 * réels contre un conteneur ClamAV.
 *
 * Politique de repli en cas d'échec du scan (ClamAV injoignable, timeout...)
 * pilotée par smartex.antivirus.echec-bloquant — voir application.properties :
 * bloquant par défaut (fail-closed), assoupli uniquement en dev.
 */
@ApplicationScoped
public class AntivirusService {

    private static final Logger LOG = Logger.getLogger(AntivirusService.class);
    private static final int TAILLE_BLOC = 8192;
    private static final byte[] COMMANDE_INSTREAM = "zINSTREAM\0".getBytes(StandardCharsets.US_ASCII);
    private static final byte[] BLOC_TERMINAISON = new byte[] {0, 0, 0, 0};

    @ConfigProperty(name = "smartex.antivirus.host")
    String hote;

    @ConfigProperty(name = "smartex.antivirus.port")
    int port;

    @ConfigProperty(name = "smartex.antivirus.timeout-ms")
    int timeoutMs;

    public ResultatScan scanner(byte[] contenu) {
        try (Socket socket = new Socket()) {
            socket.connect(new InetSocketAddress(hote, port), timeoutMs);
            socket.setSoTimeout(timeoutMs);

            try (OutputStream sortie = socket.getOutputStream(); InputStream entree = socket.getInputStream()) {
                envoyerFlux(sortie, contenu);
                return interpreterReponse(lireReponse(entree));
            }
        } catch (IOException e) {
            LOG.warnf(e, "Scan antivirus indisponible (%s:%d)", hote, port);
            return ResultatScan.erreur(e.getMessage());
        }
    }

    private void envoyerFlux(OutputStream sortie, byte[] contenu) throws IOException {
        sortie.write(COMMANDE_INSTREAM);

        int decalage = 0;
        while (decalage < contenu.length) {
            int longueur = Math.min(TAILLE_BLOC, contenu.length - decalage);
            sortie.write(entete4Octets(longueur));
            sortie.write(contenu, decalage, longueur);
            decalage += longueur;
        }
        // Bloc de taille zéro : signale la fin du flux au protocole INSTREAM.
        sortie.write(BLOC_TERMINAISON);
        sortie.flush();
    }

    private static byte[] entete4Octets(int valeur) {
        return new byte[] {
                (byte) (valeur >>> 24),
                (byte) (valeur >>> 16),
                (byte) (valeur >>> 8),
                (byte) valeur
        };
    }

    /** Lit jusqu'à l'octet nul terminal (ou EOF) — ne pas utiliser readAllBytes() qui bloquerait tant que le socket reste ouvert. */
    private String lireReponse(InputStream entree) throws IOException {
        ByteArrayOutputStream tampon = new ByteArrayOutputStream();
        int octet;
        while ((octet = entree.read()) != -1 && octet != 0) {
            tampon.write(octet);
        }
        return tampon.toString(StandardCharsets.US_ASCII).trim();
    }

    private ResultatScan interpreterReponse(String reponse) {
        if (reponse.isBlank()) {
            return ResultatScan.erreur("Réponse vide de ClamAV");
        }
        if (reponse.contains("FOUND")) {
            return ResultatScan.infecte(reponse);
        }
        if (reponse.contains("OK")) {
            return ResultatScan.sain();
        }
        return ResultatScan.erreur("Réponse ClamAV inattendue : " + reponse);
    }
}

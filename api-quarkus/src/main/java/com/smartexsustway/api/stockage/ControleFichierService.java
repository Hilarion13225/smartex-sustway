package com.smartexsustway.api.stockage;

import com.smartexsustway.api.antivirus.AntivirusService;
import com.smartexsustway.api.antivirus.ResultatScan;
import com.smartexsustway.api.domain.enums.StatutScanDocument;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import org.eclipse.microprofile.config.inject.ConfigProperty;

import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.HexFormat;
import java.util.Locale;
import java.util.Set;

/**
 * Contrôles appliqués à tout fichier reçu, avant qu'il n'atteigne le
 * stockage ou un service d'analyse.
 *
 * L'ordre n'est pas indifférent, et c'est tout l'objet de cette classe :
 * taille, puis extension, puis type déclaré, puis empreinte, puis antivirus.
 * Le scan vient avant l'écriture — un fichier infecté ne touche jamais le
 * stockage objet (exigence sécurité §1.4). Répartir cette séquence entre
 * plusieurs appelants, c'est prendre le risque qu'un jour l'un d'eux
 * l'écrive dans le mauvais ordre, ou en oublie une étape.
 *
 * Ce que la classe ne fait pas : décider quels types sont acceptables. Cela
 * dépend de l'usage — une pièce justificative d'audit et un référentiel à
 * importer n'appellent pas les mêmes formats — donc l'ensemble autorisé est
 * passé par l'appelant.
 */
@ApplicationScoped
public class ControleFichierService {

    @Inject AntivirusService antivirusService;

    /**
     * Un échec de scan bloque-t-il l'opération ? Reprend le réglage déjà en
     * place pour le dépôt de pièces : une seule décision d'exploitation pour
     * tous les fichiers entrants.
     */
    @ConfigProperty(name = "smartex.antivirus.echec-bloquant")
    boolean echecBloquant;

    /** Motif de refus, ou son absence. Le message est destiné à l'utilisateur. */
    public sealed interface Verdict {

        /** Le fichier a passé tous les contrôles. */
        record Accepte(byte[] contenu, String hash, String extension,
                       StatutScanDocument statutScan) implements Verdict {
        }

        /** Le fichier est refusé ; {@code statutHttp} porte la nuance du refus. */
        record Refuse(int statutHttp, String message,
                      StatutScanDocument statutScan) implements Verdict {
        }
    }

    /**
     * Applique la séquence complète de contrôles.
     *
     * @param typesAutorises types MIME acceptables pour cet usage
     * @param extensionsAutorisees extensions acceptables, en minuscules, point compris
     * @param tailleMaximale taille au-delà de laquelle le fichier est refusé
     */
    public Verdict controler(byte[] contenu, String nomFichier, String typeMime,
                             Set<String> typesAutorises, Set<String> extensionsAutorisees,
                             long tailleMaximale) {
        if (contenu == null || contenu.length == 0) {
            return new Verdict.Refuse(400, "Fichier vide", StatutScanDocument.EN_ATTENTE);
        }
        if (contenu.length > tailleMaximale) {
            return new Verdict.Refuse(413,
                    "Fichier trop volumineux : " + (contenu.length / 1024 / 1024)
                            + " Mo, maximum " + (tailleMaximale / 1024 / 1024) + " Mo",
                    StatutScanDocument.EN_ATTENTE);
        }

        // L'extension et le type déclaré sont tous deux vérifiés : le type
        // vient du client et se falsifie, l'extension aussi, mais exiger les
        // deux ferme la porte au fichier dont un seul des deux a été
        // maquillé. Aucun des deux ne prouve le contenu réel — c'est le rôle
        // du scan qui suit.
        String extension = extensionDe(nomFichier);
        if (!extensionsAutorisees.contains(extension)) {
            return new Verdict.Refuse(415,
                    "Extension de fichier non autorisée : "
                            + (extension.isEmpty() ? "aucune" : extension),
                    StatutScanDocument.EN_ATTENTE);
        }
        if (typeMime == null || !typesAutorises.contains(typeMime)) {
            return new Verdict.Refuse(415, "Type de fichier non autorisé : " + typeMime,
                    StatutScanDocument.EN_ATTENTE);
        }

        String hash = sha256(contenu);

        ResultatScan resultat = antivirusService.scanner(contenu);
        if (resultat.statut() == StatutScanDocument.INFECTE) {
            return new Verdict.Refuse(422,
                    "Fichier rejeté : menace détectée (" + resultat.detail() + ")",
                    StatutScanDocument.INFECTE);
        }
        if (resultat.statut() == StatutScanDocument.ERREUR && echecBloquant) {
            return new Verdict.Refuse(503, "Scan antivirus indisponible — réessayez plus tard",
                    StatutScanDocument.ERREUR);
        }

        return new Verdict.Accepte(contenu, hash, extension, resultat.statut());
    }

    /** Extension en minuscules, point compris. Chaîne vide si le nom n'en porte pas. */
    public static String extensionDe(String nomFichier) {
        if (nomFichier == null) {
            return "";
        }
        int point = nomFichier.lastIndexOf('.');
        return point >= 0 ? nomFichier.substring(point).toLowerCase(Locale.ROOT) : "";
    }

    public static String sha256(byte[] contenu) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            return HexFormat.of().formatHex(digest.digest(contenu));
        } catch (NoSuchAlgorithmException e) {
            // SHA-256 fait partie des algorithmes que toute JVM doit fournir.
            throw new IllegalStateException("SHA-256 indisponible sur cette JVM", e);
        }
    }
}

package com.smartexsustway.api.notification;

import jakarta.enterprise.context.ApplicationScoped;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayDeque;
import java.util.Deque;
import java.util.HashMap;
import java.util.Map;

/**
 * Plafonne les envois du formulaire de contact, qui est public : sans limite,
 * un script pourrait vider le quota Brevo (300 emails par jour en offre
 * gratuite) et bloquer du même coup les codes d'inscription.
 *
 * Trois fenêtres glissantes d'une heure :
 * - par adresse e-mail saisie, contre le rejeu d'un même visiteur ;
 * - par adresse IP, contre un script qui change d'adresse saisie ;
 * - globale, qui borne la consommation du quota quoi qu'il arrive.
 *
 * L'adresse IP n'est qu'une indication : derrière le proxy de l'hébergeur
 * elle vient d'un en-tête que le client peut forger. C'est pourquoi la limite
 * globale existe, et pourquoi la limite par IP reste plus large que celle par
 * adresse e-mail.
 *
 * En mémoire, et donc remise à zéro au redémarrage et propre à chaque
 * instance : suffisant pour une API déployée en une seule instance. Si elle
 * passe à plusieurs, ces compteurs devront aller dans Redis, déjà configuré.
 */
@ApplicationScoped
public class LimiteurContact {

    static final Duration FENETRE = Duration.ofHours(1);
    static final int MAX_PAR_EMAIL = 3;
    static final int MAX_PAR_IP = 6;
    static final int MAX_GLOBAL = 40;

    private static final String CLE_GLOBALE = "*";

    private final Clock horloge;
    private final Map<String, Deque<Instant>> parEmail = new HashMap<>();
    private final Map<String, Deque<Instant>> parIp = new HashMap<>();
    private final Deque<Instant> global = new ArrayDeque<>();

    public LimiteurContact() {
        this(Clock.systemUTC());
    }

    LimiteurContact(Clock horloge) {
        this.horloge = horloge;
    }

    /**
     * Enregistre une tentative et dit si elle est autorisée. Une tentative
     * refusée n'est pas comptée : un visiteur bloqué ne prolonge pas lui-même
     * son blocage en réessayant.
     */
    public synchronized boolean autoriser(String email, String ip) {
        Instant maintenant = horloge.instant();
        Instant limite = maintenant.minus(FENETRE);

        Deque<Instant> envoisEmail = parEmail.computeIfAbsent(normaliser(email), cle -> new ArrayDeque<>());
        Deque<Instant> envoisIp = parIp.computeIfAbsent(normaliser(ip), cle -> new ArrayDeque<>());
        purger(envoisEmail, limite);
        purger(envoisIp, limite);
        purger(global, limite);

        boolean autorise = envoisEmail.size() < MAX_PAR_EMAIL
                && envoisIp.size() < MAX_PAR_IP
                && global.size() < MAX_GLOBAL;
        if (autorise) {
            envoisEmail.addLast(maintenant);
            envoisIp.addLast(maintenant);
            global.addLast(maintenant);
        }

        // Les files vidées sont retirées, pour que la mémoire occupée suive le
        // trafic de la dernière heure et non tout l'historique.
        parEmail.values().removeIf(Deque::isEmpty);
        parIp.values().removeIf(Deque::isEmpty);
        return autorise;
    }

    private static void purger(Deque<Instant> envois, Instant limite) {
        while (!envois.isEmpty() && !envois.peekFirst().isAfter(limite)) {
            envois.removeFirst();
        }
    }

    private static String normaliser(String valeur) {
        return valeur == null || valeur.isBlank() ? CLE_GLOBALE : valeur.trim().toLowerCase();
    }
}

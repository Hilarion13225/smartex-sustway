package com.smartexsustway.api.notification;

import org.junit.jupiter.api.Test;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneId;
import java.time.ZoneOffset;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Plafond d'envois du formulaire de contact. Horloge réglable plutôt qu'attente
 * réelle : la fenêtre dure une heure.
 */
class LimiteurContactTest {

    /** Horloge dont on avance l'heure à la main. */
    private static final class HorlogeReglable extends Clock {
        private Instant maintenant = Instant.parse("2026-09-14T08:00:00Z");

        void avancer(Duration duree) {
            maintenant = maintenant.plus(duree);
        }

        @Override
        public ZoneId getZone() {
            return ZoneOffset.UTC;
        }

        @Override
        public Clock withZone(ZoneId zone) {
            return this;
        }

        @Override
        public Instant instant() {
            return maintenant;
        }
    }

    @Test
    void uneMemeAdresse_estPlafonneeParHeure() {
        LimiteurContact limiteur = new LimiteurContact(new HorlogeReglable());

        for (int i = 0; i < LimiteurContact.MAX_PAR_EMAIL; i++) {
            assertTrue(limiteur.autoriser("prospect@exemple.ci", "10.0.0." + i));
        }
        assertFalse(limiteur.autoriser("prospect@exemple.ci", "10.0.0.99"),
                "changer d'adresse IP ne doit pas lever la limite par adresse e-mail");
    }

    @Test
    void laCasseDeLAdresse_neContournePasLaLimite() {
        LimiteurContact limiteur = new LimiteurContact(new HorlogeReglable());

        for (int i = 0; i < LimiteurContact.MAX_PAR_EMAIL; i++) {
            assertTrue(limiteur.autoriser("prospect@exemple.ci", "10.0.0." + i));
        }
        assertFalse(limiteur.autoriser("  PROSPECT@Exemple.ci ", "10.0.0.50"));
    }

    @Test
    void uneMemeIp_estPlafonneeMemeEnChangeantDAdresse() {
        LimiteurContact limiteur = new LimiteurContact(new HorlogeReglable());

        for (int i = 0; i < LimiteurContact.MAX_PAR_IP; i++) {
            assertTrue(limiteur.autoriser("robot" + i + "@exemple.ci", "203.0.113.7"));
        }
        assertFalse(limiteur.autoriser("robot-suivant@exemple.ci", "203.0.113.7"));
    }

    @Test
    void laLimiteGlobale_borneLeQuotaQuellesQueSoientLesAdresses() {
        LimiteurContact limiteur = new LimiteurContact(new HorlogeReglable());

        for (int i = 0; i < LimiteurContact.MAX_GLOBAL; i++) {
            assertTrue(limiteur.autoriser("visiteur" + i + "@exemple.ci", "198.51.100." + i));
        }
        assertFalse(limiteur.autoriser("nouveau@exemple.ci", "192.0.2.1"));
    }

    @Test
    void laFenetre_seLibereApresUneHeure() {
        HorlogeReglable horloge = new HorlogeReglable();
        LimiteurContact limiteur = new LimiteurContact(horloge);

        for (int i = 0; i < LimiteurContact.MAX_PAR_EMAIL; i++) {
            assertTrue(limiteur.autoriser("prospect@exemple.ci", "10.0.0.1"));
        }
        assertFalse(limiteur.autoriser("prospect@exemple.ci", "10.0.0.1"));

        horloge.avancer(Duration.ofMinutes(59));
        assertFalse(limiteur.autoriser("prospect@exemple.ci", "10.0.0.1"));

        horloge.avancer(Duration.ofMinutes(1));
        assertTrue(limiteur.autoriser("prospect@exemple.ci", "10.0.0.1"));
    }

    @Test
    void uneTentativeRefusee_neProlongePasLeBlocage() {
        HorlogeReglable horloge = new HorlogeReglable();
        LimiteurContact limiteur = new LimiteurContact(horloge);

        for (int i = 0; i < LimiteurContact.MAX_PAR_EMAIL; i++) {
            assertTrue(limiteur.autoriser("prospect@exemple.ci", "10.0.0.1"));
        }
        // Le visiteur bloqué insiste toutes les dix minutes pendant 50 minutes...
        for (int i = 0; i < 5; i++) {
            horloge.avancer(Duration.ofMinutes(10));
            assertFalse(limiteur.autoriser("prospect@exemple.ci", "10.0.0.1"));
        }
        // ...et retrouve pourtant la main une heure après ses premiers envois.
        horloge.avancer(Duration.ofMinutes(10));
        assertTrue(limiteur.autoriser("prospect@exemple.ci", "10.0.0.1"));
    }
}

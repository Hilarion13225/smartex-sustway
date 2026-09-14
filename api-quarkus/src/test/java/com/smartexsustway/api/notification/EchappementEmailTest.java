package com.smartexsustway.api.notification;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;

/**
 * Le texte saisi dans le formulaire de contact entre dans le HTML de l'e-mail
 * envoyé à l'équipe : il ne doit jamais y être interprété comme du balisage.
 */
class EchappementEmailTest {

    @Test
    void lesCaracteresSignificatifs_sontEchappes() {
        assertEquals("&lt;img src=x onerror=&quot;alert(1)&quot;&gt;",
                EmailService.echapper("<img src=x onerror=\"alert(1)\">"));
        assertEquals("L&#39;OIT &amp; l&#39;OCDE", EmailService.echapper("L'OIT & l'OCDE"));
    }

    @Test
    void leTexteOrdinaire_resteIntact() {
        assertEquals("Demande de démonstration — Cocody, Abidjan",
                EmailService.echapper("Demande de démonstration — Cocody, Abidjan"));
        assertEquals("", EmailService.echapper(null));
    }
}

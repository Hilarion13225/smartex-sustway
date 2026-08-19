package com.smartexsustway.api.notification;

import io.quarkus.mailer.Mail;
import io.quarkus.mailer.Mailer;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import org.jboss.logging.Logger;

/**
 * Envoi d'emails transactionnels via Brevo (relais SMTP, voir
 * application.properties + .env.example). RG36 : email de vérification de
 * compte à l'inscription.
 *
 * L'échec d'envoi ne fait JAMAIS échouer l'action métier qui le déclenche
 * (ex. inscription) : le compte existe, seul le canal de notification a
 * un problème (credentials manquants, Brevo indisponible...). C'est un
 * choix délibéré — un utilisateur ne doit pas perdre son inscription à
 * cause d'un souci d'infrastructure d'envoi d'email, alors qu'il peut
 * encore récupérer son lien de vérification autrement (journal
 * d'application, en attendant une fonctionnalité de renvoi si besoin).
 */
@ApplicationScoped
public class EmailService {

    private static final Logger LOG = Logger.getLogger(EmailService.class);

    @Inject
    Mailer mailer;

    public void envoyerVerificationEmail(String destinataire, String prenom, String lienVerification) {
        String sujet = "Vérifiez votre adresse email — Smartex Sustway";

        String texte = """
                Bonjour %s,

                Merci de votre inscription sur Smartex Sustway.

                Pour activer votre compte, ouvrez le lien ci-dessous (valable 24 heures) :
                %s

                Si vous n'êtes pas à l'origine de cette inscription, ignorez cet email.

                — L'équipe Smartex Sustway
                """.formatted(prenom, lienVerification);

        String html = """
                <p>Bonjour %s,</p>
                <p>Merci de votre inscription sur <strong>Smartex Sustway</strong>.</p>
                <p>Pour activer votre compte, cliquez sur le lien ci-dessous (valable 24 heures) :</p>
                <p><a href="%s">Vérifier mon adresse email</a></p>
                <p style="color:#888888;font-size:12px;">
                  Si vous n'êtes pas à l'origine de cette inscription, ignorez cet email.
                </p>
                <p>— L'équipe Smartex Sustway</p>
                """.formatted(prenom, lienVerification);

        try {
            mailer.send(Mail.withText(destinataire, sujet, texte).setHtml(html));
        } catch (Exception e) {
            LOG.warnf(e, "Échec de l'envoi de l'email de vérification à %s (l'inscription reste valide)", destinataire);
        }
    }
}

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

                Merci de votre inscription sur Smartex Sustway, la plateforme d'évaluation RSE pilotée par l'IA.

                Pour activer votre compte, ouvrez le lien ci-dessous (valable 24 heures) :
                %s

                Si vous n'êtes pas à l'origine de cette inscription, vous pouvez ignorer cet email sans risque.

                — L'équipe technique Smartex Expertises
                Cet email a été envoyé automatiquement, merci de ne pas y répondre.
                """.formatted(prenom, lienVerification);

        String html = """
                <!doctype html>
                <html lang="fr">
                  <body style="margin:0;padding:0;background-color:#f6f7f9;font-family:'Segoe UI',Helvetica,Arial,sans-serif;">
                    <table role="presentation" width="100%%" cellpadding="0" cellspacing="0" style="background-color:#f6f7f9;padding:32px 16px;">
                      <tr>
                        <td align="center">
                          <table role="presentation" width="100%%" cellpadding="0" cellspacing="0" style="max-width:520px;background-color:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #eceef2;">
                            <tr>
                              <td style="background-color:#128257;padding:24px 32px;">
                                <span style="color:#ffffff;font-size:18px;font-weight:700;letter-spacing:-0.01em;">Smartex Sustway</span><br/>
                                <span style="color:#d6f5e3;font-size:12px;">Par Smartex Expertises</span>
                              </td>
                            </tr>
                            <tr>
                              <td style="padding:32px;">
                                <p style="margin:0 0 16px;color:#1f2533;font-size:16px;line-height:1.5;">Bonjour %s,</p>
                                <p style="margin:0 0 24px;color:#1f2533;font-size:15px;line-height:1.6;">
                                  Merci de votre inscription sur <strong>Smartex Sustway</strong>, la plateforme
                                  d'évaluation RSE pilotée par l'intelligence artificielle. Il ne reste plus qu'une
                                  étape avant d'accéder à votre espace : vérifier votre adresse email.
                                </p>
                                <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto 24px;">
                                  <tr>
                                    <td style="border-radius:10px;background-color:#128257;">
                                      <a href="%s" style="display:inline-block;padding:14px 28px;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;border-radius:10px;">
                                        Vérifier mon adresse email
                                      </a>
                                    </td>
                                  </tr>
                                </table>
                                <p style="margin:0 0 8px;color:#63728e;font-size:13px;line-height:1.5;">
                                  Ce lien est valable 24 heures. Si le bouton ne fonctionne pas, copiez ce lien dans
                                  votre navigateur :
                                </p>
                                <p style="margin:0 0 24px;word-break:break-all;">
                                  <a href="%s" style="color:#106848;font-size:12px;">%s</a>
                                </p>
                                <hr style="border:none;border-top:1px solid #eceef2;margin:0 0 20px;" />
                                <p style="margin:0;color:#8290a9;font-size:12px;line-height:1.6;">
                                  Si vous n'êtes pas à l'origine de cette inscription, vous pouvez ignorer cet email
                                  sans risque : aucun compte ne sera activé sans confirmation.
                                </p>
                              </td>
                            </tr>
                            <tr>
                              <td style="background-color:#f6f7f9;padding:20px 32px;text-align:center;">
                                <p style="margin:0;color:#63728e;font-size:12px;">— L'équipe technique Smartex Expertises</p>
                                <p style="margin:4px 0 0;color:#aeb7c8;font-size:11px;">Email automatique, merci de ne pas y répondre.</p>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>
                  </body>
                </html>
                """.formatted(prenom, lienVerification, lienVerification, lienVerification);

        try {
            mailer.send(Mail.withText(destinataire, sujet, texte).setHtml(html));
        } catch (Exception e) {
            LOG.warnf(e, "Échec de l'envoi de l'email de vérification à %s (l'inscription reste valide)", destinataire);
        }
    }
}

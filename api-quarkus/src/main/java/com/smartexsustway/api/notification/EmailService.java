package com.smartexsustway.api.notification;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.enterprise.context.ApplicationScoped;
import org.eclipse.microprofile.config.inject.ConfigProperty;
import org.jboss.logging.Logger;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.List;
import java.util.Map;
import java.util.Optional;

/**
 * Envoi d'emails transactionnels via l'API HTTP de Brevo (voir
 * application.properties + .env.example). RG36 : email de vérification de
 * compte à l'inscription.
 *
 * API HTTP plutôt que relais SMTP (choix initial) : les hébergeurs gratuits
 * (Render notamment) bloquent le SMTP sortant (ports 25/465/587) pour lutter
 * contre le spam — une tentative de connexion SMTP y reste bloquée jusqu'au
 * timeout TCP (~1 min), ce qui expirait toute la transaction d'inscription
 * (utilisateur jamais persisté malgré le rollback silencieux). L'API REST de
 * Brevo passe en HTTPS (port 443, jamais bloqué) et résout le problème à la
 * racine plutôt que de simplement le contourner.
 *
 * L'échec d'envoi ne fait JAMAIS échouer l'action métier qui le déclenche
 * (ex. inscription) : le compte existe, seul le canal de notification a
 * un problème (clé API manquante, Brevo indisponible...). C'est un
 * choix délibéré — un utilisateur ne doit pas perdre son inscription à
 * cause d'un souci d'infrastructure d'envoi d'email, alors qu'il peut
 * encore récupérer son lien de vérification autrement (journal
 * d'application, en attendant une fonctionnalité de renvoi si besoin).
 */
@ApplicationScoped
public class EmailService {

    private static final Logger LOG = Logger.getLogger(EmailService.class);
    private static final URI BREVO_ENDPOINT = URI.create("https://api.brevo.com/v3/smtp/email");
    private static final ObjectMapper JSON = new ObjectMapper();
    private static final HttpClient HTTP = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(10))
            .build();

    @ConfigProperty(name = "smartex.mail.brevo-api-key")
    Optional<String> apiKey;

    @ConfigProperty(name = "smartex.mail.from")
    String expediteur;

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

        envoyer(destinataire, sujet, texte, html, "l'inscription reste valide");
    }

    /** RG05 — invitation d'un collaborateur sans compte existant (voir Invitation, MembreEntrepriseResource). */
    public void envoyerInvitationEntreprise(String destinataire, String entrepriseNom, String roleNom, String lienAcceptation) {
        String sujet = entrepriseNom + " vous invite sur Smartex Sustway";

        String texte = """
                Bonjour,

                %s vous invite à rejoindre son espace Smartex Sustway en tant que %s.

                Pour créer votre compte et accepter l'invitation (valable 7 jours) :
                %s

                Si vous ne connaissez pas cette entreprise, vous pouvez ignorer cet email sans risque.

                — L'équipe technique Smartex Expertises
                Cet email a été envoyé automatiquement, merci de ne pas y répondre.
                """.formatted(entrepriseNom, roleNom, lienAcceptation);

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
                                <p style="margin:0 0 16px;color:#1f2533;font-size:16px;line-height:1.5;">Bonjour,</p>
                                <p style="margin:0 0 24px;color:#1f2533;font-size:15px;line-height:1.6;">
                                  <strong>%s</strong> vous invite à rejoindre son espace <strong>Smartex Sustway</strong>
                                  en tant que <strong>%s</strong>.
                                </p>
                                <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto 24px;">
                                  <tr>
                                    <td style="border-radius:10px;background-color:#128257;">
                                      <a href="%s" style="display:inline-block;padding:14px 28px;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;border-radius:10px;">
                                        Créer mon compte
                                      </a>
                                    </td>
                                  </tr>
                                </table>
                                <p style="margin:0 0 8px;color:#63728e;font-size:13px;line-height:1.5;">
                                  Ce lien est valable 7 jours. Si le bouton ne fonctionne pas, copiez ce lien dans
                                  votre navigateur :
                                </p>
                                <p style="margin:0 0 24px;word-break:break-all;">
                                  <a href="%s" style="color:#106848;font-size:12px;">%s</a>
                                </p>
                                <hr style="border:none;border-top:1px solid #eceef2;margin:0 0 20px;" />
                                <p style="margin:0;color:#8290a9;font-size:12px;line-height:1.6;">
                                  Si vous ne connaissez pas cette entreprise, vous pouvez ignorer cet email sans
                                  risque : aucun compte ne sera créé sans votre confirmation.
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
                """.formatted(entrepriseNom, roleNom, lienAcceptation, lienAcceptation, lienAcceptation);

        envoyer(destinataire, sujet, texte, html, "l'invitation reste valide");
    }

    /** Mot de passe oublié — voir AuthResource.motDePasseOublie / JwtService.PURPOSE_PASSWORD_RESET. */
    public void envoyerReinitialisationMotDePasse(String destinataire, String prenom, String lienReinitialisation) {
        String sujet = "Réinitialisez votre mot de passe — Smartex Sustway";

        String texte = """
                Bonjour %s,

                Vous avez demandé la réinitialisation du mot de passe de votre compte Smartex Sustway.

                Pour choisir un nouveau mot de passe (valable 1 heure) :
                %s

                Si vous n'êtes pas à l'origine de cette demande, vous pouvez ignorer cet email sans risque :
                votre mot de passe actuel reste inchangé.

                — L'équipe technique Smartex Expertises
                Cet email a été envoyé automatiquement, merci de ne pas y répondre.
                """.formatted(prenom, lienReinitialisation);

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
                                  Vous avez demandé la réinitialisation du mot de passe de votre compte
                                  <strong>Smartex Sustway</strong>.
                                </p>
                                <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto 24px;">
                                  <tr>
                                    <td style="border-radius:10px;background-color:#128257;">
                                      <a href="%s" style="display:inline-block;padding:14px 28px;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;border-radius:10px;">
                                        Choisir un nouveau mot de passe
                                      </a>
                                    </td>
                                  </tr>
                                </table>
                                <p style="margin:0 0 8px;color:#63728e;font-size:13px;line-height:1.5;">
                                  Ce lien est valable 1 heure. Si le bouton ne fonctionne pas, copiez ce lien dans
                                  votre navigateur :
                                </p>
                                <p style="margin:0 0 24px;word-break:break-all;">
                                  <a href="%s" style="color:#106848;font-size:12px;">%s</a>
                                </p>
                                <hr style="border:none;border-top:1px solid #eceef2;margin:0 0 20px;" />
                                <p style="margin:0;color:#8290a9;font-size:12px;line-height:1.6;">
                                  Si vous n'êtes pas à l'origine de cette demande, vous pouvez ignorer cet email sans
                                  risque : votre mot de passe actuel reste inchangé.
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
                """.formatted(prenom, lienReinitialisation, lienReinitialisation, lienReinitialisation);

        envoyer(destinataire, sujet, texte, html, null);
    }

    private void envoyer(String destinataire, String sujet, String texte, String html, String contexteEchecNonBloquant) {
        if (apiKey.isEmpty() || apiKey.get().isBlank()) {
            LOG.warnf("Clé API Brevo non configurée (SMARTEX_MAIL_API_KEY) : email non envoyé à %s", destinataire);
            return;
        }
        try {
            Map<String, Object> corps = Map.of(
                    "sender", Map.of("email", expediteur, "name", "Smartex Sustway"),
                    "to", List.of(Map.of("email", destinataire)),
                    "subject", sujet,
                    "htmlContent", html,
                    "textContent", texte
            );
            HttpRequest requete = HttpRequest.newBuilder(BREVO_ENDPOINT)
                    .header("api-key", apiKey.get())
                    .header("Content-Type", "application/json")
                    .header("Accept", "application/json")
                    .timeout(Duration.ofSeconds(15))
                    .POST(HttpRequest.BodyPublishers.ofString(JSON.writeValueAsString(corps)))
                    .build();
            HttpResponse<String> reponse = HTTP.send(requete, HttpResponse.BodyHandlers.ofString());
            if (reponse.statusCode() >= 300) {
                LOG.warnf("Échec de l'envoi via l'API Brevo (%d) à %s : %s", reponse.statusCode(), destinataire, reponse.body());
            }
        } catch (Exception e) {
            String suffixe = contexteEchecNonBloquant != null ? " (" + contexteEchecNonBloquant + ")" : "";
            LOG.warnf(e, "Échec de l'envoi de l'email à %s%s", destinataire, suffixe);
        }
    }
}

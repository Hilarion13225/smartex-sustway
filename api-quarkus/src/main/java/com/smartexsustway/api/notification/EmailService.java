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
import java.util.LinkedHashMap;
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

    /** Mode bac à sable de Brevo : requêtes validées, aucun email remis (voir envoyerVia). */
    @ConfigProperty(name = "smartex.mail.brevo-bac-a-sable", defaultValue = "false")
    boolean bacASable;

    /**
     * RG36 — code d'activation de compte. Le code remplace l'ancien lien signé :
     * l'utilisateur le saisit sur la plateforme sans quitter son inscription, et
     * sa validité se compte en minutes plutôt qu'en heures.
     */
    public void envoyerCodeVerification(String destinataire, String prenom, String code, long minutesValidite) {
        String sujet = "Votre code d'activation — SMARTEX SustWay";

        String texte = """
                Bonjour %s,

                Merci de votre inscription sur SMARTEX SustWay, la plateforme d'évaluation RSE pilotée par l'IA.

                Votre code d'activation est : %s

                Saisissez-le sur la plateforme dans les %d minutes. Passé ce délai, demandez-en un nouveau.

                Si vous n'êtes pas à l'origine de cette inscription, vous pouvez ignorer cet email sans risque :
                ce code seul ne permet d'activer aucun compte.

                — L'équipe technique SMARTEX Expertises
                Cet email a été envoyé automatiquement, merci de ne pas y répondre.
                """.formatted(prenom, code, minutesValidite);

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
                                <span style="color:#ffffff;font-size:18px;font-weight:700;letter-spacing:-0.01em;">SMARTEX SustWay</span><br/>
                                <span style="color:#d6f5e3;font-size:12px;">Par SMARTEX Expertises</span>
                              </td>
                            </tr>
                            <tr>
                              <td style="padding:32px;">
                                <p style="margin:0 0 16px;color:#1f2533;font-size:16px;line-height:1.5;">Bonjour %s,</p>
                                <p style="margin:0 0 24px;color:#1f2533;font-size:15px;line-height:1.6;">
                                  Voici votre code d'activation pour <strong>SMARTEX SustWay</strong>. Saisissez-le
                                  sur la page d'inscription pour activer votre compte.
                                </p>
                                <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto 24px;">
                                  <tr>
                                    <td style="border-radius:12px;background-color:#f2fbf6;border:1px solid #b9e6cf;padding:18px 32px;">
                                      <span style="display:block;color:#106848;font-size:34px;font-weight:700;letter-spacing:0.32em;text-align:center;font-family:'Courier New',monospace;">%s</span>
                                    </td>
                                  </tr>
                                </table>
                                <p style="margin:0 0 24px;color:#63728e;font-size:13px;line-height:1.5;text-align:center;">
                                  Ce code est valable <strong>%d minutes</strong>. Passé ce délai, demandez-en un nouveau
                                  depuis la plateforme.
                                </p>
                                <hr style="border:none;border-top:1px solid #eceef2;margin:0 0 20px;" />
                                <p style="margin:0;color:#8290a9;font-size:12px;line-height:1.6;">
                                  Si vous n'êtes pas à l'origine de cette inscription, ignorez cet email : ce code seul
                                  ne permet d'activer aucun compte.
                                </p>
                              </td>
                            </tr>
                            <tr>
                              <td style="background-color:#f6f7f9;padding:20px 32px;text-align:center;">
                                <p style="margin:0;color:#63728e;font-size:12px;">— L'équipe technique SMARTEX Expertises</p>
                                <p style="margin:4px 0 0;color:#aeb7c8;font-size:11px;">Email automatique, merci de ne pas y répondre.</p>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>
                  </body>
                </html>
                """.formatted(prenom, code, minutesValidite);

        envoyer(destinataire, sujet, texte, html, "l'inscription reste valide");
    }

    /** RG05 — invitation d'un collaborateur sans compte existant (voir Invitation, MembreEntrepriseResource). */
    public void envoyerInvitationEntreprise(String destinataire, String entrepriseNom, String roleNom, String lienAcceptation) {
        String sujet = entrepriseNom + " vous invite sur SMARTEX SustWay";

        String texte = """
                Bonjour,

                %s vous invite à rejoindre son espace SMARTEX SustWay en tant que %s.

                Pour créer votre compte et accepter l'invitation (valable 7 jours) :
                %s

                Si vous ne connaissez pas cette entreprise, vous pouvez ignorer cet email sans risque.

                — L'équipe technique SMARTEX Expertises
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
                                <span style="color:#ffffff;font-size:18px;font-weight:700;letter-spacing:-0.01em;">SMARTEX SustWay</span><br/>
                                <span style="color:#d6f5e3;font-size:12px;">Par SMARTEX Expertises</span>
                              </td>
                            </tr>
                            <tr>
                              <td style="padding:32px;">
                                <p style="margin:0 0 16px;color:#1f2533;font-size:16px;line-height:1.5;">Bonjour,</p>
                                <p style="margin:0 0 24px;color:#1f2533;font-size:15px;line-height:1.6;">
                                  <strong>%s</strong> vous invite à rejoindre son espace <strong>SMARTEX SustWay</strong>
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
                                <p style="margin:0;color:#63728e;font-size:12px;">— L'équipe technique SMARTEX Expertises</p>
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
        String sujet = "Réinitialisez votre mot de passe — SMARTEX SustWay";

        String texte = """
                Bonjour %s,

                Vous avez demandé la réinitialisation du mot de passe de votre compte SMARTEX SustWay.

                Pour choisir un nouveau mot de passe (valable 1 heure) :
                %s

                Si vous n'êtes pas à l'origine de cette demande, vous pouvez ignorer cet email sans risque :
                votre mot de passe actuel reste inchangé.

                — L'équipe technique SMARTEX Expertises
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
                                <span style="color:#ffffff;font-size:18px;font-weight:700;letter-spacing:-0.01em;">SMARTEX SustWay</span><br/>
                                <span style="color:#d6f5e3;font-size:12px;">Par SMARTEX Expertises</span>
                              </td>
                            </tr>
                            <tr>
                              <td style="padding:32px;">
                                <p style="margin:0 0 16px;color:#1f2533;font-size:16px;line-height:1.5;">Bonjour %s,</p>
                                <p style="margin:0 0 24px;color:#1f2533;font-size:15px;line-height:1.6;">
                                  Vous avez demandé la réinitialisation du mot de passe de votre compte
                                  <strong>SMARTEX SustWay</strong>.
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
                                <p style="margin:0;color:#63728e;font-size:12px;">— L'équipe technique SMARTEX Expertises</p>
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
        if (!envoyerVia(destinataire, null, sujet, texte, html)) {
            String suffixe = contexteEchecNonBloquant != null ? " (" + contexteEchecNonBloquant + ")" : "";
            LOG.warnf("Email non remis à %s%s", destinataire, suffixe);
        }
    }

    /**
     * Appel à l'API Brevo. Renvoie true seulement si Brevo a accepté l'envoi :
     * contrairement aux notifications de compte, le formulaire de contact doit
     * savoir si le message est parti, pour ne pas afficher « envoyé » à tort.
     *
     * `repondreA` (facultatif) devient l'en-tête Reply-To : répondre depuis la
     * messagerie de SMARTEX Expertises écrit directement au visiteur, sans que
     * son adresse ne serve d'expéditeur — ce qui ferait échouer les contrôles
     * SPF/DKIM et classer le message en indésirable.
     */
    private boolean envoyerVia(String destinataire, String repondreA, String sujet, String texte, String html) {
        if (apiKey.isEmpty() || apiKey.get().isBlank()) {
            LOG.warnf("Clé API Brevo non configurée (SMARTEX_MAIL_API_KEY) : email non envoyé à %s", destinataire);
            return false;
        }
        try {
            Map<String, Object> corps = new LinkedHashMap<>();
            corps.put("sender", Map.of("email", expediteur, "name", "SMARTEX SustWay"));
            corps.put("to", List.of(Map.of("email", destinataire)));
            if (repondreA != null) {
                corps.put("replyTo", Map.of("email", repondreA));
            }
            corps.put("subject", sujet);
            corps.put("htmlContent", html);
            corps.put("textContent", texte);

            HttpRequest.Builder constructeur = HttpRequest.newBuilder(BREVO_ENDPOINT)
                    .header("api-key", apiKey.get())
                    .header("Content-Type", "application/json")
                    .header("Accept", "application/json")
                    .timeout(Duration.ofSeconds(15))
                    .POST(HttpRequest.BodyPublishers.ofString(JSON.writeValueAsString(corps)));
            if (bacASable) {
                // Brevo valide la requête et répond normalement, mais ne remet
                // aucun email : de quoi tester le parcours réel sans écrire à
                // personne.
                constructeur.header("X-Sib-Sandbox", "drop");
            }
            HttpResponse<String> reponse = HTTP.send(constructeur.build(), HttpResponse.BodyHandlers.ofString());
            if (reponse.statusCode() >= 300) {
                LOG.warnf("Échec de l'envoi via l'API Brevo (%d) à %s : %s", reponse.statusCode(), destinataire, reponse.body());
                return false;
            }
            return true;
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            LOG.warnf(e, "Envoi interrompu vers %s", destinataire);
            return false;
        } catch (Exception e) {
            LOG.warnf(e, "Échec de l'envoi de l'email à %s", destinataire);
            return false;
        }
    }

    // ------------------------------------------------------------------
    // Formulaire de contact de la vitrine
    // ------------------------------------------------------------------

    /**
     * Relaie un message du formulaire de contact vers la boîte de SMARTEX
     * Expertises. Renvoie false si le message n'a pas pu partir : la vitrine
     * propose alors l'adresse à copier plutôt qu'un faux succès.
     *
     * Tout le texte saisi par le visiteur est échappé avant d'entrer dans le
     * HTML : un message contenant du balisage ne doit pas s'afficher comme tel
     * dans la messagerie de l'équipe.
     */
    public boolean envoyerMessageContact(MessageContact message, String destinataire) {
        String sujet = "[Contact vitrine] " + message.sujet() + " — " + message.organisation();
        String telephone = message.telephone() == null || message.telephone().isBlank() ? "—" : message.telephone();

        String texte = """
                Nouveau message reçu depuis le formulaire de contact de SMARTEX SustWay.

                Sujet : %s
                Nom : %s
                Organisation : %s
                E-mail : %s
                Téléphone : %s

                %s

                —
                Répondre à cet e-mail écrit directement à %s.
                """.formatted(message.sujet(), message.nom(), message.organisation(), message.email(),
                telephone, message.message(), message.email());

        String html = """
                <!doctype html>
                <html lang="fr">
                  <body style="margin:0;padding:24px 16px;background-color:#f4f5f1;font-family:'Segoe UI',Helvetica,Arial,sans-serif;color:#14234b;">
                    <table role="presentation" width="100%%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;background-color:#ffffff;border:1px solid #d5d9d2;border-radius:12px;">
                      <tr>
                        <td style="padding:24px 28px;border-bottom:1px solid #d5d9d2;">
                          <p style="margin:0;color:#60697a;font-size:13px;">Formulaire de contact — SMARTEX SustWay</p>
                          <p style="margin:6px 0 0;font-size:20px;font-weight:700;">%s</p>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:20px 28px;">
                          <table role="presentation" cellpadding="0" cellspacing="0" style="font-size:15px;line-height:1.5;">
                            <tr><td style="padding:4px 16px 4px 0;color:#60697a;">Nom</td><td style="padding:4px 0;">%s</td></tr>
                            <tr><td style="padding:4px 16px 4px 0;color:#60697a;">Organisation</td><td style="padding:4px 0;">%s</td></tr>
                            <tr><td style="padding:4px 16px 4px 0;color:#60697a;">E-mail</td><td style="padding:4px 0;">%s</td></tr>
                            <tr><td style="padding:4px 16px 4px 0;color:#60697a;">Téléphone</td><td style="padding:4px 0;">%s</td></tr>
                          </table>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:0 28px 24px;">
                          <p style="margin:0;padding:16px;background-color:#f4f5f1;border-radius:8px;font-size:15px;line-height:1.6;white-space:pre-wrap;">%s</p>
                          <p style="margin:16px 0 0;color:#60697a;font-size:13px;">Répondre à cet e-mail écrit directement à %s.</p>
                        </td>
                      </tr>
                    </table>
                  </body>
                </html>
                """.formatted(echapper(message.sujet()), echapper(message.nom()), echapper(message.organisation()),
                echapper(message.email()), echapper(telephone), echapper(message.message()), echapper(message.email()));

        return envoyerVia(destinataire, message.email(), sujet, texte, html);
    }

    /**
     * Accusé de réception envoyé au visiteur. Il ne recopie ni le message ni
     * le nom saisi : n'importe qui peut taper n'importe quelle adresse dans le
     * formulaire, et renvoyer du texte libre ferait de la plateforme un relais
     * pour écrire à un tiers. L'accusé ne contient donc que du texte fixe.
     */
    public void envoyerAccuseReceptionContact(String destinataire) {
        String sujet = "Nous avons bien reçu votre message — SMARTEX SustWay";

        String texte = """
                Bonjour,

                Votre message adressé à SMARTEX Expertises depuis le site SMARTEX SustWay nous est parvenu.
                Notre équipe vous répond sous 24 heures ouvrées.

                Si vous n'êtes pas à l'origine de ce message, vous pouvez ignorer cet e-mail.

                — L'équipe SMARTEX Expertises
                Cet email a été envoyé automatiquement, merci de ne pas y répondre.
                """;

        String html = """
                <!doctype html>
                <html lang="fr">
                  <body style="margin:0;padding:24px 16px;background-color:#f4f5f1;font-family:'Segoe UI',Helvetica,Arial,sans-serif;color:#14234b;">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;margin:0 auto;background-color:#ffffff;border:1px solid #d5d9d2;border-radius:12px;">
                      <tr>
                        <td style="padding:28px;">
                          <p style="margin:0;color:#60697a;font-size:13px;">SMARTEX SustWay</p>
                          <p style="margin:8px 0 16px;font-size:20px;font-weight:700;">Nous avons bien reçu votre message.</p>
                          <p style="margin:0 0 12px;font-size:15px;line-height:1.6;">
                            Votre message adressé à SMARTEX Expertises depuis le site SMARTEX SustWay nous est parvenu.
                            Notre équipe vous répond sous 24 heures ouvrées.
                          </p>
                          <p style="margin:0;color:#60697a;font-size:13px;line-height:1.6;">
                            Si vous n'êtes pas à l'origine de ce message, vous pouvez ignorer cet e-mail.
                          </p>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:16px 28px;border-top:1px solid #d5d9d2;color:#60697a;font-size:12px;">
                          — L'équipe SMARTEX Expertises · Email automatique, merci de ne pas y répondre.
                        </td>
                      </tr>
                    </table>
                  </body>
                </html>
                """;

        envoyer(destinataire, sujet, texte, html, "le message de contact est déjà transmis");
    }

    /** Échappement HTML des cinq caractères significatifs. */
    static String echapper(String valeur) {
        if (valeur == null) {
            return "";
        }
        StringBuilder sortie = new StringBuilder(valeur.length());
        for (char c : valeur.toCharArray()) {
            switch (c) {
                case '&' -> sortie.append("&amp;");
                case '<' -> sortie.append("&lt;");
                case '>' -> sortie.append("&gt;");
                case '"' -> sortie.append("&quot;");
                case '\'' -> sortie.append("&#39;");
                default -> sortie.append(c);
            }
        }
        return sortie.toString();
    }
}

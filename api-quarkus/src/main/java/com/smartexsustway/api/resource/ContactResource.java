package com.smartexsustway.api.resource;

import com.smartexsustway.api.notification.EmailService;
import com.smartexsustway.api.notification.LimiteurContact;
import com.smartexsustway.api.notification.MessageContact;
import com.smartexsustway.api.resource.dto.ContactRequest;
import com.smartexsustway.api.resource.dto.ErreurDto;
import io.vertx.core.http.HttpServerRequest;
import jakarta.inject.Inject;
import jakarta.validation.Valid;
import jakarta.ws.rs.Consumes;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.Context;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import org.eclipse.microprofile.config.inject.ConfigProperty;
import org.jboss.logging.Logger;

import java.util.List;
import java.util.Map;

/**
 * Formulaire de contact de la vitrine : relaie le message à SMARTEX
 * Expertises par e-mail, puis accuse réception au visiteur.
 *
 * Volontairement PUBLIC (pas de @Authenticated) : c'est la porte d'entrée des
 * prospects, qui n'ont pas de compte. Trois gardes le protègent à la place :
 * la validation des champs, un piège à robots (champ `siteWeb`) et un
 * plafond d'envois (LimiteurContact).
 *
 * Rien n'est enregistré en base : le message n'existe que dans la boîte de
 * réception de l'équipe, et son contenu n'est jamais écrit dans les journaux.
 */
@Path("/api/v1/contact")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
public class ContactResource {

    private static final Logger LOG = Logger.getLogger(ContactResource.class);

    /** Les sujets proposés par la vitrine (pages/Contact.jsx) : aucun autre n'est accepté. */
    static final List<String> SUJETS = List.of(
            "Demande de démonstration",
            "Question sur les formules",
            "Accompagnement / mission de conseil",
            "Financements verts",
            "Support technique",
            "Autre"
    );

    @Inject
    EmailService emailService;

    @Inject
    LimiteurContact limiteur;

    @ConfigProperty(name = "smartex.contact.destinataire", defaultValue = "contact@smartex-expertises.com")
    String destinataire;

    @Context
    HttpServerRequest requeteHttp;

    @POST
    public Response envoyer(@Valid ContactRequest requete) {
        // Piège à robots rempli : on répond comme pour un envoi réussi, pour ne
        // pas apprendre au robot que son message a été écarté.
        if (requete.siteWeb() != null && !requete.siteWeb().isBlank()) {
            LOG.info("Formulaire de contact : envoi écarté (champ piège renseigné)");
            return Response.accepted(Map.of("message", "Message envoyé")).build();
        }

        if (!SUJETS.contains(requete.sujet())) {
            return Response.status(Response.Status.BAD_REQUEST)
                    .entity(new ErreurDto("Choisissez un sujet dans la liste."))
                    .build();
        }

        if (!limiteur.autoriser(requete.email(), adresseIp())) {
            return Response.status(429)
                    .entity(new ErreurDto("Trop de messages envoyés en peu de temps. Réessayez dans une heure, ou écrivez-nous directement."))
                    .build();
        }

        MessageContact message = new MessageContact(
                surUneLigne(requete.nom()),
                requete.email().trim(),
                surUneLigne(requete.organisation()),
                requete.telephone() == null ? null : surUneLigne(requete.telephone()),
                requete.sujet(),
                requete.message().strip()
        );

        if (!emailService.envoyerMessageContact(message, destinataire)) {
            // 503 et non 500 : rien n'est cassé côté visiteur, c'est le canal
            // d'envoi qui manque. La vitrine propose alors l'adresse directe.
            return Response.status(Response.Status.SERVICE_UNAVAILABLE)
                    .entity(new ErreurDto("Votre message n'a pas pu être envoyé. Écrivez-nous directement à " + destinataire + "."))
                    .build();
        }

        LOG.infof("Formulaire de contact : message transmis (sujet « %s »)", message.sujet());
        emailService.envoyerAccuseReceptionContact(message.email());
        return Response.accepted(Map.of("message", "Message envoyé")).build();
    }

    /**
     * Adresse du client. Derrière le proxy de l'hébergeur, la première adresse
     * de X-Forwarded-For ; sinon l'adresse de la connexion. Indicative
     * seulement — voir LimiteurContact.
     */
    private String adresseIp() {
        String transmise = requeteHttp.getHeader("X-Forwarded-For");
        if (transmise != null && !transmise.isBlank()) {
            return transmise.split(",")[0].trim();
        }
        return requeteHttp.remoteAddress() == null ? null : requeteHttp.remoteAddress().host();
    }

    /** Retire retours à la ligne et caractères de contrôle d'un champ court (nom, organisation, sujet d'e-mail). */
    static String surUneLigne(String valeur) {
        return valeur.replaceAll("\\p{Cntrl}+", " ").trim();
    }
}

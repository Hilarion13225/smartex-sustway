package com.smartexsustway.api.resource;

import com.smartexsustway.api.audit.AuditLogService;
import com.smartexsustway.api.domain.entity.Referentiel;
import com.smartexsustway.api.domain.enums.StatutGenerique;
import com.smartexsustway.api.domain.enums.TypeReferentiel;
import com.smartexsustway.api.domain.repository.CritereRepository;
import com.smartexsustway.api.domain.repository.ReferentielRepository;
import com.smartexsustway.api.resource.dto.CritereDto;
import com.smartexsustway.api.resource.dto.ErreurDto;
import com.smartexsustway.api.resource.dto.ReferentielCreateRequestDto;
import com.smartexsustway.api.resource.dto.ReferentielDto;
import com.smartexsustway.api.resource.dto.ReferentielUpdateRequestDto;
import com.smartexsustway.api.tenant.TenantContext;
import io.quarkus.security.Authenticated;
import jakarta.annotation.security.RolesAllowed;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import jakarta.ws.rs.Consumes;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.NotFoundException;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.PUT;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.PathParam;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;

/**
 * Lecture du référentiel (RG07/RG08/RG09) : liste des référentiels et de
 * leurs critères — accessible à tout utilisateur authentifié. Les
 * opérations d'écriture (création/modification, module 4 — back-office)
 * sont réservées à SUPER_ADMIN. La prévisualisation du questionnaire
 * dynamique par entreprise (RG34) vit dans QuestionnaireResource —
 * volontairement séparée de cette classe pour suivre le même schéma que
 * AuditResource/SiteResource/AbonnementResource (préfixe complet déclaré
 * au niveau de la classe, jamais mélangé à des routes non imbriquées sous
 * /entreprises).
 *
 * Volontairement pas de DELETE sur cette ressource ni sur DomaineResource/
 * CritereCreationResource/CritereModificationResource : supprimer un
 * référentiel, un domaine ou un critère déjà référencé par des audits
 * (audit_critere, evaluation...) casserait l'historique (RG14). Seule la
 * désactivation (statut/actif) est exposée — pattern déjà prévu par le
 * modèle de données existant depuis la phase A.
 */
@Path("/api/v1/referentiels")
@Produces(MediaType.APPLICATION_JSON)
@Authenticated
public class ReferentielResource {

    @Inject ReferentielRepository referentielRepository;
    @Inject CritereRepository critereRepository;
    @Inject AuditLogService auditLogService;
    @Inject TenantContext tenantContext;

    @GET
    public Response lister() {
        var referentiels = referentielRepository.listAll().stream().map(ReferentielDto::depuis).toList();
        return Response.ok(referentiels).build();
    }

    @GET
    @Path("/{code}/criteres")
    public Response criteres(@PathParam("code") String code) {
        Referentiel referentiel = trouverParCode(code);

        var criteres = critereRepository.parReferentiel(referentiel.getId()).stream().map(CritereDto::depuis).toList();
        return Response.ok(criteres).build();
    }

    @POST
    @Consumes(MediaType.APPLICATION_JSON)
    @Transactional
    @RolesAllowed("SUPER_ADMIN")
    public Response creer(ReferentielCreateRequestDto requete) {
        if (requete == null) {
            return erreur(400, "Corps de requête manquant");
        }
        if (referentielRepository.parCode(requete.code()).isPresent()) {
            return erreur(409, "Un référentiel avec le code '" + requete.code() + "' existe déjà");
        }

        TypeReferentiel type;
        try {
            type = TypeReferentiel.valueOf(requete.type());
        } catch (IllegalArgumentException e) {
            return erreur(400, "Type de référentiel invalide : " + requete.type()
                    + " (attendu : SMARTEX, PRI, GRESB, ITIE, IFC_SFI)");
        }

        Referentiel referentiel = new Referentiel(requete.code(), requete.nom(), type);
        referentiel.setDescription(requete.description());
        if (requete.version() != null && !requete.version().isBlank()) {
            referentiel.setVersion(requete.version());
        }
        referentielRepository.persist(referentiel);

        auditLogService.journaliser(tenantContext.utilisateurCourantId(), null,
                "REFERENTIEL_CREE", "referentiel", referentiel.getId());

        return Response.status(Response.Status.CREATED).entity(ReferentielDto.depuis(referentiel)).build();
    }

    @PUT
    @Path("/{code}")
    @Consumes(MediaType.APPLICATION_JSON)
    @Transactional
    @RolesAllowed("SUPER_ADMIN")
    public Response modifier(@PathParam("code") String code, ReferentielUpdateRequestDto requete) {
        Referentiel referentiel = trouverParCode(code);
        if (requete == null) {
            return erreur(400, "Corps de requête manquant");
        }

        if (requete.nom() != null) {
            referentiel.setNom(requete.nom());
        }
        if (requete.description() != null) {
            referentiel.setDescription(requete.description());
        }
        if (requete.version() != null) {
            referentiel.setVersion(requete.version());
        }
        if (requete.statut() != null) {
            try {
                referentiel.setStatut(StatutGenerique.valueOf(requete.statut()));
            } catch (IllegalArgumentException e) {
                return erreur(400, "Statut invalide : " + requete.statut()
                        + " (attendu : ACTIF, INACTIF, SUSPENDU, ARCHIVE)");
            }
        }

        auditLogService.journaliser(tenantContext.utilisateurCourantId(), null,
                "REFERENTIEL_MODIFIE", "referentiel", referentiel.getId());

        return Response.ok(ReferentielDto.depuis(referentiel)).build();
    }

    private Referentiel trouverParCode(String code) {
        return referentielRepository.parCode(code)
                .orElseThrow(() -> new NotFoundException("Référentiel inconnu : " + code));
    }

    private static Response erreur(int statut, String message) {
        return Response.status(statut).entity(new ErreurDto(message)).build();
    }
}

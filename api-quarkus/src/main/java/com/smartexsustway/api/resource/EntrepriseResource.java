package com.smartexsustway.api.resource;

import com.smartexsustway.api.audit.AuditLogService;
import com.smartexsustway.api.domain.entity.Entreprise;
import com.smartexsustway.api.domain.entity.Role;
import com.smartexsustway.api.domain.entity.Secteur;
import com.smartexsustway.api.domain.entity.Utilisateur;
import com.smartexsustway.api.domain.entity.UtilisateurEntreprise;
import com.smartexsustway.api.domain.enums.TailleEntreprise;
import com.smartexsustway.api.domain.repository.EntrepriseRepository;
import com.smartexsustway.api.domain.repository.RoleRepository;
import com.smartexsustway.api.domain.repository.SecteurRepository;
import com.smartexsustway.api.domain.repository.UtilisateurEntrepriseRepository;
import com.smartexsustway.api.domain.repository.UtilisateurRepository;
import com.smartexsustway.api.resource.dto.EntrepriseCreateRequest;
import com.smartexsustway.api.resource.dto.EntrepriseDto;
import com.smartexsustway.api.resource.dto.ErreurDto;
import com.smartexsustway.api.security.AutorisationService;
import com.smartexsustway.api.tenant.TenantContext;
import io.quarkus.security.Authenticated;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import jakarta.validation.Valid;
import jakarta.ws.rs.Consumes;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.PathParam;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;

import java.util.List;
import java.util.UUID;

/**
 * RG02 : identité légale unique. RG24 (à enforcer en phase C, une fois le
 * module Abonnements branché) : pas de création sans formule valide.
 * Isolation multi-tenant (exigence §1.4) : chaque endpoint qui accède aux
 * données d'une entreprise passe par AutorisationService.exigerAccesEntreprise
 * plutôt que de faire confiance à l'id fourni dans l'URL.
 */
@Path("/api/v1/entreprises")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
@Authenticated
public class EntrepriseResource {

    @Inject EntrepriseRepository entrepriseRepository;
    @Inject SecteurRepository secteurRepository;
    @Inject RoleRepository roleRepository;
    @Inject UtilisateurRepository utilisateurRepository;
    @Inject UtilisateurEntrepriseRepository utilisateurEntrepriseRepository;
    @Inject AutorisationService autorisationService;
    @Inject AuditLogService auditLogService;
    @Inject TenantContext tenantContext;

    @GET
    public Response mesEntreprises() {
        UUID utilisateurId = tenantContext.utilisateurCourantId();
        List<EntrepriseDto> resultat = utilisateurEntrepriseRepository.parUtilisateur(utilisateurId).stream()
                .map(UtilisateurEntreprise::getEntreprise)
                .distinct()
                .map(EntrepriseDto::depuis)
                .toList();
        return Response.ok(resultat).build();
    }

    @GET
    @Path("/{id}")
    public Response detail(@PathParam("id") UUID id) {
        autorisationService.exigerAccesEntreprise(tenantContext.utilisateurCourantId(), id);

        Entreprise entreprise = entrepriseRepository.findById(id);
        if (entreprise == null) {
            return Response.status(Response.Status.NOT_FOUND).build();
        }
        return Response.ok(EntrepriseDto.depuis(entreprise)).build();
    }

    @POST
    @Transactional
    public Response creer(@Valid EntrepriseCreateRequest requete) {
        if (entrepriseRepository.identifiantLegalExiste(requete.identifiantLegal())) {
            return Response.status(Response.Status.CONFLICT)
                    .entity(new ErreurDto("Une entreprise avec cet identifiant légal existe déjà"))
                    .build();
        }

        Entreprise entreprise = new Entreprise(requete.raisonSociale(), requete.identifiantLegal());

        if (requete.secteurCode() != null) {
            Secteur secteur = secteurRepository.parCode(requete.secteurCode())
                    .orElseThrow(() -> new jakarta.ws.rs.BadRequestException("Secteur inconnu : " + requete.secteurCode()));
            entreprise.setSecteur(secteur);
        }
        if (requete.taille() != null) {
            entreprise.setTaille(TailleEntreprise.valueOf(requete.taille()));
        }

        entrepriseRepository.persist(entreprise);

        // L'utilisateur qui crée l'entreprise en devient responsable (RG05).
        UUID utilisateurId = tenantContext.utilisateurCourantId();
        Utilisateur utilisateur = utilisateurRepository.findById(utilisateurId);
        Role roleResponsable = roleRepository.parCode("RESPONSABLE_ENTREPRISE")
                .orElseThrow(() -> new IllegalStateException(
                        "Rôle RESPONSABLE_ENTREPRISE absent — vérifier les seeds (database/seeds/001_seed_reference_data.sql)"));

        UtilisateurEntreprise rattachement = new UtilisateurEntreprise(utilisateur, entreprise, null, roleResponsable);
        utilisateurEntrepriseRepository.persist(rattachement);

        auditLogService.journaliser(utilisateurId, entreprise.getId(), "ENTREPRISE_CREEE", "entreprise", entreprise.getId());

        return Response.status(Response.Status.CREATED).entity(EntrepriseDto.depuis(entreprise)).build();
    }
}

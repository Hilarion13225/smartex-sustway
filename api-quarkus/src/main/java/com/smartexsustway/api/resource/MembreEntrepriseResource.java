package com.smartexsustway.api.resource;

import com.smartexsustway.api.domain.repository.UtilisateurEntrepriseRepository;
import com.smartexsustway.api.resource.dto.MembreEntrepriseDto;
import com.smartexsustway.api.security.AutorisationService;
import com.smartexsustway.api.tenant.TenantContext;
import io.quarkus.security.Authenticated;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.PathParam;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;

import java.util.UUID;

/**
 * RG05 — utilisateurs rattachés à une entreprise et rôle porté par chacun.
 *
 * Lecture seule : l'affectation d'un utilisateur à une entreprise se fait
 * aujourd'hui à l'inscription (le créateur devient RESPONSABLE_ENTREPRISE),
 * et l'invitation d'un collaborateur relève d'un flux d'e-mail qui n'est
 * pas encore construit — exposer un POST ici laisserait croire l'inverse.
 *
 * {@code @Transactional} est nécessaire : le DTO lit la collection
 * {@code role.permissions}, chargée en LAZY.
 */
@Path("/api/v1/entreprises/{entrepriseId}/membres")
@Produces(MediaType.APPLICATION_JSON)
@Authenticated
public class MembreEntrepriseResource {

    @Inject UtilisateurEntrepriseRepository utilisateurEntrepriseRepository;
    @Inject AutorisationService autorisationService;
    @Inject TenantContext tenantContext;

    @GET
    @Transactional
    public Response lister(@PathParam("entrepriseId") UUID entrepriseId) {
        autorisationService.exigerAccesEntreprise(tenantContext.utilisateurCourantId(), entrepriseId);

        var membres = utilisateurEntrepriseRepository.parEntreprise(entrepriseId).stream()
                .map(MembreEntrepriseDto::depuis)
                .toList();
        return Response.ok(membres).build();
    }
}

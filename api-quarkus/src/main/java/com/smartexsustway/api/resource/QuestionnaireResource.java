package com.smartexsustway.api.resource;

import com.smartexsustway.api.domain.entity.Entreprise;
import com.smartexsustway.api.domain.entity.Referentiel;
import com.smartexsustway.api.domain.repository.EntrepriseRepository;
import com.smartexsustway.api.domain.repository.ReferentielRepository;
import com.smartexsustway.api.referentiel.QuestionnaireService;
import com.smartexsustway.api.resource.dto.CritereDto;
import com.smartexsustway.api.resource.dto.QuestionnaireDto;
import com.smartexsustway.api.security.AutorisationService;
import com.smartexsustway.api.tenant.TenantContext;
import io.quarkus.security.Authenticated;
import jakarta.inject.Inject;
import jakarta.ws.rs.BadRequestException;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.PathParam;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.QueryParam;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;

import java.util.UUID;

/**
 * RG34 — prévisualisation du questionnaire dynamique pour une entreprise
 * donnée, sans créer d'audit (AuditResource réutilise le même
 * QuestionnaireService pour figer ce même questionnaire dans une mission).
 * Classe dédiée à ce seul endpoint, avec le préfixe complet déclaré au
 * niveau classe — même schéma que AuditResource/SiteResource/
 * AbonnementResource, tous imbriqués sous /entreprises/{entrepriseId}/...
 */
@Path("/api/v1/entreprises/{entrepriseId}/questionnaire")
@Produces(MediaType.APPLICATION_JSON)
@Authenticated
public class QuestionnaireResource {

    @Inject EntrepriseRepository entrepriseRepository;
    @Inject ReferentielRepository referentielRepository;
    @Inject QuestionnaireService questionnaireService;
    @Inject AutorisationService autorisationService;
    @Inject TenantContext tenantContext;

    @GET
    public Response questionnaire(@PathParam("entrepriseId") UUID entrepriseId,
                                   @QueryParam("referentiel") String referentielCode) {
        autorisationService.exigerAccesEntreprise(tenantContext.utilisateurCourantId(), entrepriseId);

        if (referentielCode == null || referentielCode.isBlank()) {
            throw new BadRequestException("Le paramètre 'referentiel' est obligatoire (ex. SMARTEX_SUSTWAY)");
        }

        Entreprise entreprise = entrepriseRepository.findById(entrepriseId);
        if (entreprise == null) {
            return Response.status(Response.Status.NOT_FOUND).build();
        }
        Referentiel referentiel = referentielRepository.parCode(referentielCode)
                .orElseThrow(() -> new BadRequestException("Référentiel inconnu : " + referentielCode));

        var criteres = questionnaireService.composer(entreprise, referentiel).stream().map(CritereDto::depuis).toList();
        return Response.ok(new QuestionnaireDto(referentiel.getCode(), criteres.size(), criteres)).build();
    }
}

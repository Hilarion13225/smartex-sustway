package com.smartexsustway.api.resource;

import com.smartexsustway.api.audit.AuditLogService;
import com.smartexsustway.api.domain.entity.Critere;
import com.smartexsustway.api.domain.entity.Criticite;
import com.smartexsustway.api.domain.entity.Domaine;
import com.smartexsustway.api.domain.entity.Referentiel;
import com.smartexsustway.api.domain.enums.NiveauCriticite;
import com.smartexsustway.api.domain.enums.TypeApplicabilite;
import com.smartexsustway.api.domain.repository.CriticiteRepository;
import com.smartexsustway.api.domain.repository.CritereRepository;
import com.smartexsustway.api.domain.repository.DomaineRepository;
import com.smartexsustway.api.domain.repository.ReferentielRepository;
import com.smartexsustway.api.resource.dto.CritereCreateRequestDto;
import com.smartexsustway.api.resource.dto.CritereDto;
import com.smartexsustway.api.resource.dto.ErreurDto;
import com.smartexsustway.api.tenant.TenantContext;
import io.quarkus.security.Authenticated;
import jakarta.annotation.security.RolesAllowed;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import jakarta.ws.rs.Consumes;
import jakarta.ws.rs.NotFoundException;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.PathParam;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;

/**
 * RG09 (module 4, back-office) : création d'un critère sous un domaine
 * d'un référentiel. Réservé à SUPER_ADMIN. Voir CritereModificationResource
 * pour la modification d'un critère existant, et ReferentielResource pour
 * la justification de l'absence de DELETE (RG14, historique des audits).
 */
@Path("/api/v1/referentiels/{referentielCode}/domaines/{domaineCode}/criteres")
@Produces(MediaType.APPLICATION_JSON)
@Authenticated
public class CritereCreationResource {

    @Inject ReferentielRepository referentielRepository;
    @Inject DomaineRepository domaineRepository;
    @Inject CritereRepository critereRepository;
    @Inject CriticiteRepository criticiteRepository;
    @Inject AuditLogService auditLogService;
    @Inject TenantContext tenantContext;

    @POST
    @Consumes(MediaType.APPLICATION_JSON)
    @Transactional
    @RolesAllowed("SUPER_ADMIN")
    public Response creer(@PathParam("referentielCode") String referentielCode,
                           @PathParam("domaineCode") String domaineCode, CritereCreateRequestDto requete) {
        Referentiel referentiel = referentielRepository.parCode(referentielCode)
                .orElseThrow(() -> new NotFoundException("Référentiel inconnu : " + referentielCode));
        Domaine domaine = domaineRepository.parReferentielEtCode(referentiel.getId(), domaineCode)
                .orElseThrow(() -> new NotFoundException("Domaine inconnu : " + domaineCode));
        if (requete == null) {
            return erreur(400, "Corps de requête manquant");
        }
        if (critereRepository.parDomaineEtCode(domaine.getId(), requete.code()).isPresent()) {
            return erreur(409, "Un critère avec le code '" + requete.code() + "' existe déjà pour ce domaine");
        }

        Critere critere = new Critere(domaine, requete.code(), requete.libelle());
        critere.setDescription(requete.description());

        if (requete.applicabilite() != null) {
            try {
                critere.setApplicabilite(TypeApplicabilite.valueOf(requete.applicabilite()));
            } catch (IllegalArgumentException e) {
                return erreur(400, "Applicabilité invalide : " + requete.applicabilite()
                        + " (attendu : GENERALE, SECTORIELLE, BAILLEUR)");
            }
        }

        if (requete.criticiteCode() != null) {
            NiveauCriticite niveau;
            try {
                niveau = NiveauCriticite.valueOf(requete.criticiteCode());
            } catch (IllegalArgumentException e) {
                return erreur(400, "Code de criticité invalide : " + requete.criticiteCode()
                        + " (attendu : FAIBLE, MOYENNE, ELEVEE, CRITIQUE)");
            }
            Criticite criticite = criticiteRepository.parCode(niveau)
                    .orElseThrow(() -> new NotFoundException("Criticité inconnue : " + requete.criticiteCode()));
            critere.setCriticite(criticite);
        }

        critereRepository.persist(critere);

        auditLogService.journaliser(tenantContext.utilisateurCourantId(), null,
                "CRITERE_CREE", "critere", critere.getId());

        return Response.status(Response.Status.CREATED).entity(CritereDto.depuis(critere)).build();
    }

    private static Response erreur(int statut, String message) {
        return Response.status(statut).entity(new ErreurDto(message)).build();
    }
}

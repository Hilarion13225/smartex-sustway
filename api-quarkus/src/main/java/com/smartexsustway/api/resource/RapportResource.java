package com.smartexsustway.api.resource;

import com.smartexsustway.api.audit.AuditLogService;
import com.smartexsustway.api.domain.entity.Audit;
import com.smartexsustway.api.domain.entity.Rapport;
import com.smartexsustway.api.domain.enums.FormatRapport;
import com.smartexsustway.api.domain.enums.TypeRapport;
import com.smartexsustway.api.domain.repository.AuditRepository;
import com.smartexsustway.api.domain.repository.RapportRepository;
import com.smartexsustway.api.domain.repository.UtilisateurRepository;
import com.smartexsustway.api.rapport.RapportGenerationService;
import com.smartexsustway.api.resource.dto.ErreurDto;
import com.smartexsustway.api.resource.dto.RapportCreateRequest;
import com.smartexsustway.api.resource.dto.RapportDto;
import com.smartexsustway.api.security.AutorisationService;
import com.smartexsustway.api.stockage.StorageService;
import com.smartexsustway.api.tenant.TenantContext;
import io.quarkus.security.Authenticated;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import jakarta.validation.Valid;
import jakarta.ws.rs.Consumes;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.NotFoundException;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.PathParam;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;

import java.util.UUID;

/**
 * Module 12 — génération et téléchargement des rapports d'une mission
 * d'audit. Seul le type SYNTHESE est implémenté pour l'instant (voir
 * RapportGenerationService) — DETAILLE, PLAN_ACTION et
 * INDICE_FINANCEMENTS_VERTS restent à cadrer, rejetés ici en 400.
 */
@Path("/api/v1/entreprises/{entrepriseId}/audits/{auditId}/rapports")
@Produces(MediaType.APPLICATION_JSON)
@Authenticated
public class RapportResource {

    @Inject AuditRepository auditRepository;
    @Inject RapportRepository rapportRepository;
    @Inject UtilisateurRepository utilisateurRepository;
    @Inject RapportGenerationService rapportGenerationService;
    @Inject StorageService storageService;
    @Inject AutorisationService autorisationService;
    @Inject AuditLogService auditLogService;
    @Inject TenantContext tenantContext;

    @GET
    public Response lister(@PathParam("entrepriseId") UUID entrepriseId, @PathParam("auditId") UUID auditId) {
        autorisationService.exigerAccesEntreprise(tenantContext.utilisateurCourantId(), entrepriseId);
        Audit audit = trouverAuditDeLEntreprise(entrepriseId, auditId);

        var rapports = rapportRepository.parAudit(audit.getId()).stream().map(RapportDto::depuis).toList();
        return Response.ok(rapports).build();
    }

    @POST
    @Consumes(MediaType.APPLICATION_JSON)
    @Transactional
    public Response generer(@PathParam("entrepriseId") UUID entrepriseId, @PathParam("auditId") UUID auditId,
                             @Valid RapportCreateRequest requete) {
        UUID utilisateurId = tenantContext.utilisateurCourantId();
        autorisationService.exigerAccesEntreprise(utilisateurId, entrepriseId);
        Audit audit = trouverAuditDeLEntreprise(entrepriseId, auditId);

        TypeRapport type;
        FormatRapport format;
        try {
            type = TypeRapport.valueOf(requete.type());
        } catch (IllegalArgumentException e) {
            return erreur(400, "Type de rapport inconnu : " + requete.type());
        }
        try {
            format = FormatRapport.valueOf(requete.format());
        } catch (IllegalArgumentException e) {
            return erreur(400, "Format de rapport inconnu : " + requete.format());
        }

        if (type != TypeRapport.SYNTHESE) {
            return erreur(400, "Seul le type SYNTHESE est disponible pour l'instant — " + type + " reste à venir");
        }
        if (format == FormatRapport.EXCEL) {
            return erreur(400, "Le format EXCEL n'est pas encore supporté pour ce type de rapport");
        }

        byte[] contenu = rapportGenerationService.genererSynthese(audit, format);

        String extension = format == FormatRapport.PDF ? ".pdf" : ".csv";
        String typeMime = format == FormatRapport.PDF ? "application/pdf" : "text/csv";
        String cle = "entreprises/" + entrepriseId + "/rapports/" + UUID.randomUUID() + extension;
        storageService.televerser(cle, contenu, typeMime);

        Rapport rapport = new Rapport(audit, type, format, cle);
        rapport.setGenerePar(utilisateurRepository.findById(utilisateurId));
        rapportRepository.persist(rapport);

        auditLogService.journaliser(utilisateurId, entrepriseId, "RAPPORT_GENERE", "rapport", rapport.getId());

        return Response.status(Response.Status.CREATED).entity(RapportDto.depuis(rapport)).build();
    }

    @GET
    @Path("/{rapportId}/telechargement")
    @Produces(MediaType.APPLICATION_OCTET_STREAM)
    public Response telecharger(@PathParam("entrepriseId") UUID entrepriseId, @PathParam("auditId") UUID auditId,
                                 @PathParam("rapportId") UUID rapportId) {
        autorisationService.exigerAccesEntreprise(tenantContext.utilisateurCourantId(), entrepriseId);
        Audit audit = trouverAuditDeLEntreprise(entrepriseId, auditId);

        Rapport rapport = rapportRepository.parIdEtAudit(rapportId, audit.getId())
                .orElseThrow(() -> new NotFoundException("Rapport introuvable pour cette mission"));

        byte[] contenu = storageService.telecharger(rapport.getCheminStockage());
        String extension = rapport.getFormat() == FormatRapport.PDF ? ".pdf" : ".csv";
        String typeMime = rapport.getFormat() == FormatRapport.PDF ? "application/pdf" : "text/csv";
        String nomFichier = rapport.getType().name().toLowerCase() + "-" + audit.getNom().replaceAll("[^a-zA-Z0-9-]", "_") + extension;

        return Response.ok(contenu)
                .type(typeMime)
                .header("Content-Disposition", "attachment; filename=\"" + nomFichier + "\"")
                .build();
    }

    private Audit trouverAuditDeLEntreprise(UUID entrepriseId, UUID auditId) {
        Audit audit = auditRepository.findById(auditId);
        if (audit == null || !audit.getEntreprise().getId().equals(entrepriseId)) {
            throw new NotFoundException("Audit introuvable pour cette entreprise");
        }
        return audit;
    }

    private static Response erreur(int statut, String message) {
        return Response.status(statut).entity(new ErreurDto(message)).build();
    }
}

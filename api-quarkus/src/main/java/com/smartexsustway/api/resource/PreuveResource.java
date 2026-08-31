package com.smartexsustway.api.resource;

import com.smartexsustway.api.audit.AuditLogService;
import com.smartexsustway.api.domain.entity.Audit;
import com.smartexsustway.api.domain.entity.AuditCritere;
import com.smartexsustway.api.domain.entity.Document;
import com.smartexsustway.api.domain.entity.Preuve;
import com.smartexsustway.api.domain.enums.StatutScanDocument;
import com.smartexsustway.api.domain.enums.TypePreuve;
import com.smartexsustway.api.domain.repository.AuditCritereRepository;
import com.smartexsustway.api.domain.repository.AuditRepository;
import com.smartexsustway.api.domain.repository.DocumentRepository;
import com.smartexsustway.api.domain.repository.PreuveRepository;
import com.smartexsustway.api.resource.dto.ErreurDto;
import com.smartexsustway.api.resource.dto.PreuveCreateRequest;
import com.smartexsustway.api.resource.dto.PreuveDto;
import com.smartexsustway.api.security.AutorisationService;
import com.smartexsustway.api.tenant.TenantContext;
import io.quarkus.security.Authenticated;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import jakarta.validation.Valid;
import org.eclipse.microprofile.config.inject.ConfigProperty;
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
 * RG15 : association de preuves aux critères d'une mission — "une
 * évaluation peut être associée à plusieurs preuves ; un document peut
 * servir à plusieurs critères". Une preuve pointe vers UN document déjà
 * téléversé (voir DocumentResource) et se rattache à un ou plusieurs
 * AUDIT_CRITERE de la mission en cours.
 */
@Path("/api/v1/entreprises/{entrepriseId}/audits/{auditId}/preuves")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
@Authenticated
public class PreuveResource {

    @Inject AuditRepository auditRepository;
    @Inject AuditCritereRepository auditCritereRepository;
    @Inject DocumentRepository documentRepository;
    @Inject PreuveRepository preuveRepository;
    @Inject AutorisationService autorisationService;
    @Inject AuditLogService auditLogService;
    @Inject TenantContext tenantContext;

    @ConfigProperty(name = "smartex.antivirus.echec-bloquant")
    boolean echecBloquant;

    @GET
    public Response lister(@PathParam("entrepriseId") UUID entrepriseId, @PathParam("auditId") UUID auditId) {
        autorisationService.exigerAccesEntreprise(tenantContext.utilisateurCourantId(), entrepriseId);
        trouverAuditDeLEntreprise(entrepriseId, auditId);

        var preuves = preuveRepository.parAudit(auditId).stream().map(PreuveDto::depuis).toList();
        return Response.ok(preuves).build();
    }

    @POST
    @Transactional
    public Response creer(@PathParam("entrepriseId") UUID entrepriseId, @PathParam("auditId") UUID auditId,
                           @Valid PreuveCreateRequest requete) {
        UUID utilisateurId = tenantContext.utilisateurCourantId();
        autorisationService.exigerAccesEntreprise(utilisateurId, entrepriseId);
        Audit audit = trouverAuditDeLEntreprise(entrepriseId, auditId);

        Document document = documentRepository.findById(requete.documentId());
        if (document == null || !document.getEntreprise().getId().equals(entrepriseId)) {
            return erreur(404, "Document introuvable pour cette entreprise");
        }
        // INFECTE est toujours bloquant. ERREUR (scan indisponible) ne l'est que si
        // smartex.antivirus.echec-bloquant l'exige — voir DocumentResource, où le
        // même réglage gouverne déjà l'admission du document en amont.
        boolean bloque = document.getStatutScan() == StatutScanDocument.INFECTE
                || (document.getStatutScan() == StatutScanDocument.ERREUR && echecBloquant);
        if (bloque) {
            return erreur(422,
                    "Ce document ne peut pas servir de preuve (statut scan : " + document.getStatutScan() + ")");
        }

        Preuve preuve = new Preuve(document, audit);
        preuve.setDescription(requete.description());
        if (requete.type() != null && !requete.type().isBlank()) {
            try {
                preuve.setType(TypePreuve.valueOf(requete.type()));
            } catch (IllegalArgumentException e) {
                return erreur(400, "Type de preuve inconnu : " + requete.type());
            }
        }

        for (UUID auditCritereId : requete.auditCritereIds()) {
            AuditCritere auditCritere = auditCritereRepository.findById(auditCritereId);
            if (auditCritere == null || !auditCritere.getAudit().getId().equals(auditId)) {
                return erreur(400,
                        "Le critère " + auditCritereId + " n'appartient pas à cette mission");
            }
            preuve.getAuditCriteres().add(auditCritere);
        }

        preuveRepository.persist(preuve);
        auditLogService.journaliser(utilisateurId, entrepriseId, "PREUVE_AJOUTEE", "preuve", preuve.getId());

        return Response.status(Response.Status.CREATED).entity(PreuveDto.depuis(preuve)).build();
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

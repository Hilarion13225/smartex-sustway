package com.smartexsustway.api.resource;

import com.smartexsustway.api.audit.AuditLogService;
import com.smartexsustway.api.domain.entity.Audit;
import com.smartexsustway.api.domain.entity.Bailleur;
import com.smartexsustway.api.domain.entity.Rapport;
import com.smartexsustway.api.domain.enums.FormatRapport;
import com.smartexsustway.api.domain.enums.TypeRapport;
import com.smartexsustway.api.domain.repository.AuditRepository;
import com.smartexsustway.api.domain.repository.BailleurRepository;
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
 * d'audit. Les 4 types (SYNTHESE, DETAILLE, PLAN_ACTION,
 * INDICE_FINANCEMENTS_VERTS — voir RapportGenerationService) n'exigent pas
 * tous la même permission : DETAILLE est réservé au personnel interne
 * Smartex (permission rapport:detaille, absente du rôle RESPONSABLE_ENTREPRISE
 * dans le modèle de permissions — voir permissions.js/AutorisationService),
 * INDICE_FINANCEMENTS_VERTS reprend exactement la garde de
 * IndicePreparationResource (bailleur:consulter + formule Avancées de
 * l'audit, sans dérogation staff — RG41/RG42), et SYNTHESE/PLAN_ACTION
 * restent sous rapport:consulter comme avant. Le téléchargement applique la
 * même garde par type que la génération, pas seulement rapport:consulter —
 * sinon un rapport DETAILLE une fois généré serait accessible en
 * téléchargement à n'importe quel rôle ayant simplement rapport:consulter.
 */
@Path("/api/v1/entreprises/{entrepriseId}/audits/{auditId}/rapports")
@Produces(MediaType.APPLICATION_JSON)
@Authenticated
public class RapportResource {

    private static final String FORMULE_AVANCEES = "AVANCEES";

    @Inject AuditRepository auditRepository;
    @Inject RapportRepository rapportRepository;
    @Inject UtilisateurRepository utilisateurRepository;
    @Inject BailleurRepository bailleurRepository;
    @Inject RapportGenerationService rapportGenerationService;
    @Inject StorageService storageService;
    @Inject AutorisationService autorisationService;
    @Inject AuditLogService auditLogService;
    @Inject TenantContext tenantContext;

    @GET
    public Response lister(@PathParam("entrepriseId") UUID entrepriseId, @PathParam("auditId") UUID auditId) {
        UUID utilisateurId = tenantContext.utilisateurCourantId();
        autorisationService.exigerAccesEntreprise(utilisateurId, entrepriseId);
        Audit audit = trouverAuditDeLEntreprise(entrepriseId, auditId);
        autorisationService.exigerPermission(utilisateurId, entrepriseId, formuleCode(audit), "rapport:consulter");

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
        if (format == FormatRapport.EXCEL) {
            return erreur(400, "Le format EXCEL n'est pas encore supporté pour ce type de rapport");
        }

        Response erreurPermission = verifierPermissionPourType(utilisateurId, entrepriseId, audit, type);
        if (erreurPermission != null) {
            return erreurPermission;
        }

        Bailleur bailleur = null;
        if (type == TypeRapport.INDICE_FINANCEMENTS_VERTS) {
            String bailleurCode = requete.bailleurCode();
            if (bailleurCode == null || bailleurCode.isBlank()) {
                return erreur(400, "bailleurCode est requis pour ce type de rapport");
            }
            bailleur = bailleurRepository.parCode(bailleurCode)
                    .orElseThrow(() -> new NotFoundException("Bailleur inconnu : " + bailleurCode));
        }

        byte[] contenu = switch (type) {
            case SYNTHESE -> rapportGenerationService.genererSynthese(audit, format);
            case DETAILLE -> rapportGenerationService.genererDetaille(audit, format);
            case PLAN_ACTION -> rapportGenerationService.genererPlanAction(audit, format);
            case INDICE_FINANCEMENTS_VERTS -> rapportGenerationService.genererIndiceFinancementsVerts(audit, bailleur, format);
        };

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
        UUID utilisateurId = tenantContext.utilisateurCourantId();
        autorisationService.exigerAccesEntreprise(utilisateurId, entrepriseId);
        Audit audit = trouverAuditDeLEntreprise(entrepriseId, auditId);

        Rapport rapport = rapportRepository.parIdEtAudit(rapportId, audit.getId())
                .orElseThrow(() -> new NotFoundException("Rapport introuvable pour cette mission"));

        Response erreurPermission = verifierPermissionPourType(utilisateurId, entrepriseId, audit, rapport.getType());
        if (erreurPermission != null) {
            return erreurPermission;
        }

        byte[] contenu = storageService.telecharger(rapport.getCheminStockage());
        String extension = rapport.getFormat() == FormatRapport.PDF ? ".pdf" : ".csv";
        String typeMime = rapport.getFormat() == FormatRapport.PDF ? "application/pdf" : "text/csv";
        String nomFichier = rapport.getType().name().toLowerCase() + "-" + audit.getNom().replaceAll("[^a-zA-Z0-9-]", "_") + extension;

        return Response.ok(contenu)
                .type(typeMime)
                .header("Content-Disposition", "attachment; filename=\"" + nomFichier + "\"")
                .build();
    }

    /**
     * Renvoie une Response d'erreur (403) si l'appelant n'a pas la
     * permission requise pour ce type de rapport, {@code null} sinon —
     * partagée entre generer() (avant calcul) et telecharger() (après
     * lecture du type déjà persisté), pour ne jamais laisser le
     * téléchargement d'un rapport DETAILLE/INDICE_FINANCEMENTS_VERTS moins
     * gardé que sa génération.
     */
    private Response verifierPermissionPourType(UUID utilisateurId, UUID entrepriseId, Audit audit, TypeRapport type) {
        String formule = formuleCode(audit);
        switch (type) {
            case SYNTHESE, PLAN_ACTION ->
                    autorisationService.exigerPermission(utilisateurId, entrepriseId, formule, "rapport:consulter");
            case DETAILLE ->
                    autorisationService.exigerPermission(utilisateurId, entrepriseId, formule, "rapport:detaille");
            case INDICE_FINANCEMENTS_VERTS -> {
                autorisationService.exigerPermission(utilisateurId, entrepriseId, "bailleur:consulter");
                if (!estFormuleAvancees(audit)) {
                    return erreur(403, "L'indice de préparation bailleur est réservé à la formule Avancées");
                }
            }
        }
        return null;
    }

    /** RG21/RG41 : même garde que IndicePreparationResource — dépend de la formule souscrite au moment de l'audit, sans dérogation staff. */
    private static boolean estFormuleAvancees(Audit audit) {
        return audit.getFormuleAbonnement() != null && FORMULE_AVANCEES.equals(audit.getFormuleAbonnement().getCode());
    }

    private static String formuleCode(Audit audit) {
        return audit.getFormuleAbonnement() == null ? null : audit.getFormuleAbonnement().getCode();
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

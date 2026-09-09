package com.smartexsustway.api.resource;

import com.smartexsustway.api.audit.AuditLogService;
import com.smartexsustway.api.domain.entity.Document;
import com.smartexsustway.api.domain.entity.Entreprise;
import com.smartexsustway.api.domain.entity.Site;
import com.smartexsustway.api.domain.enums.StatutScanDocument;
import com.smartexsustway.api.domain.repository.AbonnementRepository;
import com.smartexsustway.api.domain.repository.DocumentRepository;
import com.smartexsustway.api.domain.repository.EntrepriseRepository;
import com.smartexsustway.api.domain.repository.SiteRepository;
import com.smartexsustway.api.domain.repository.UtilisateurRepository;
import com.smartexsustway.api.resource.dto.DocumentDto;
import com.smartexsustway.api.resource.dto.ErreurDto;
import com.smartexsustway.api.security.AutorisationService;
import com.smartexsustway.api.stockage.ControleFichierService;
import com.smartexsustway.api.stockage.StorageService;
import com.smartexsustway.api.tenant.TenantContext;
import io.quarkus.security.Authenticated;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import jakarta.ws.rs.Consumes;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.NotFoundException;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.PathParam;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import org.jboss.resteasy.reactive.RestForm;
import org.jboss.resteasy.reactive.multipart.FileUpload;

import java.io.IOException;
import java.nio.file.Files;
import java.util.Set;
import java.util.UUID;

/**
 * RG15 / exigence sécurité §1.4 : upload de documents, avec restriction des
 * types de fichiers acceptés et scan antivirus obligatoire avant tout
 * stockage — un fichier n'atteint jamais S3/MinIO s'il n'a pas d'abord été
 * scanné (voir déroulé de {@link #televerser}).
 */
@Path("/api/v1/entreprises/{entrepriseId}/documents")
@Produces(MediaType.APPLICATION_JSON)
@Authenticated
public class DocumentResource {

    /**
     * Types MIME acceptés — pièces justificatives d'audit RSE usuelles
     * (documents, images, tableurs). Aucune liste n'est imposée par le CDC ;
     * à ajuster si des types supplémentaires s'avèrent nécessaires.
     */
    private static final Set<String> EXTENSIONS_AUTORISEES = Set.of(
            ".pdf", ".jpg", ".jpeg", ".png", ".doc", ".docx", ".xls", ".xlsx", ".txt");

    /**
     * Taille maximale d'une pièce déposée. Alignée sur la limite HTTP du
     * projet : au-delà, la requête est coupée avant d'arriver ici.
     */
    private static final long TAILLE_MAXIMALE = 20L * 1024 * 1024;

    private static final Set<String> TYPES_AUTORISES = Set.of(
            "application/pdf",
            "image/jpeg",
            "image/png",
            "application/msword",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            "application/vnd.ms-excel",
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            "text/plain"
    );

    @Inject EntrepriseRepository entrepriseRepository;
    @Inject AbonnementRepository abonnementRepository;
    @Inject SiteRepository siteRepository;
    @Inject DocumentRepository documentRepository;
    @Inject UtilisateurRepository utilisateurRepository;
    @Inject StorageService storageService;
    @Inject ControleFichierService controleFichierService;
    @Inject AutorisationService autorisationService;
    @Inject AuditLogService auditLogService;
    @Inject TenantContext tenantContext;

    @GET
    public Response lister(@PathParam("entrepriseId") UUID entrepriseId) {
        autorisationService.exigerAccesEntreprise(tenantContext.utilisateurCourantId(), entrepriseId);
        var documents = documentRepository.parEntreprise(entrepriseId).stream().map(DocumentDto::depuis).toList();
        return Response.ok(documents).build();
    }

    @POST
    @Consumes(MediaType.MULTIPART_FORM_DATA)
    @Transactional
    public Response televerser(@PathParam("entrepriseId") UUID entrepriseId,
                                @RestForm("fichier") FileUpload fichier,
                                @RestForm("siteId") UUID siteId) {
        UUID utilisateurId = tenantContext.utilisateurCourantId();
        autorisationService.exigerAccesEntreprise(utilisateurId, entrepriseId);

        Entreprise entreprise = entrepriseRepository.findById(entrepriseId);
        if (entreprise == null) {
            return Response.status(Response.Status.NOT_FOUND).build();
        }

        String formuleCode = abonnementRepository.leplusRecentParEntreprise(entrepriseId)
                .map(a -> a.getFormule().getCode())
                .orElse(null);
        autorisationService.exigerPermission(utilisateurId, entrepriseId, formuleCode, "preuve:deposer");

        if (fichier == null) {
            return erreur(400, "Aucun fichier reçu (champ 'fichier' attendu)");
        }

        String typeMime = fichier.contentType();
        byte[] contenu;
        try {
            contenu = Files.readAllBytes(fichier.uploadedFile());
        } catch (IOException e) {
            return erreur(500, "Échec de lecture du fichier reçu");
        }

        // Exigence sécurité §1.4 : la séquence de contrôles — dont le scan
        // avant tout stockage — est portée par ControleFichierService, seul
        // endroit où elle est écrite. Un fichier infecté ne touche jamais
        // S3/MinIO.
        var verdict = controleFichierService.controler(contenu, fichier.fileName(), typeMime,
                TYPES_AUTORISES, EXTENSIONS_AUTORISEES, TAILLE_MAXIMALE);
        if (verdict instanceof ControleFichierService.Verdict.Refuse refus) {
            if (refus.statutScan() == StatutScanDocument.INFECTE) {
                auditLogService.journaliser(utilisateurId, entrepriseId,
                        "DOCUMENT_REJETE_INFECTE", "document", null);
            }
            return erreur(refus.statutHttp(), refus.message());
        }
        var accepte = (ControleFichierService.Verdict.Accepte) verdict;

        String hash = accepte.hash();
        String nomStockage = UUID.randomUUID() + accepte.extension();
        String cleStockage = "entreprises/" + entrepriseId + "/documents/" + nomStockage;

        storageService.televerser(cleStockage, contenu, typeMime);

        Document document = new Document(entreprise, fichier.fileName(), nomStockage, typeMime, contenu.length, cleStockage, hash);
        document.setStatutScan(accepte.statutScan());
        document.setUploadedBy(utilisateurRepository.findById(utilisateurId));

        if (siteId != null) {
            Site site = siteRepository.findById(siteId);
            if (site != null && site.getEntreprise().getId().equals(entrepriseId)) {
                document.setSite(site);
            }
        }

        documentRepository.persist(document);
        auditLogService.journaliser(utilisateurId, entrepriseId, "DOCUMENT_TELEVERSE", "document", document.getId());

        return Response.status(Response.Status.CREATED).entity(DocumentDto.depuis(document)).build();
    }

    @GET
    @Path("/{documentId}/telechargement")
    @Produces(MediaType.APPLICATION_OCTET_STREAM)
    public Response telecharger(@PathParam("entrepriseId") UUID entrepriseId, @PathParam("documentId") UUID documentId) {
        autorisationService.exigerAccesEntreprise(tenantContext.utilisateurCourantId(), entrepriseId);

        Document document = documentRepository.findById(documentId);
        if (document == null || !document.getEntreprise().getId().equals(entrepriseId)) {
            throw new NotFoundException("Document introuvable pour cette entreprise");
        }

        byte[] contenu = storageService.telecharger(document.getCheminStockage());

        return Response.ok(contenu)
                .type(document.getTypeMime())
                .header("Content-Disposition", "attachment; filename=\"" + document.getNomOriginal() + "\"")
                .build();
    }

    private static Response erreur(int statut, String message) {
        return Response.status(statut).entity(new ErreurDto(message)).build();
    }
}

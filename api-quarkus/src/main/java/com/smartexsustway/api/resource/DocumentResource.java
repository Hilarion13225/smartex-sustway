package com.smartexsustway.api.resource;

import com.smartexsustway.api.antivirus.AntivirusService;
import com.smartexsustway.api.antivirus.ResultatScan;
import com.smartexsustway.api.audit.AuditLogService;
import com.smartexsustway.api.domain.entity.Document;
import com.smartexsustway.api.domain.entity.Entreprise;
import com.smartexsustway.api.domain.entity.Site;
import com.smartexsustway.api.domain.enums.StatutScanDocument;
import com.smartexsustway.api.domain.repository.DocumentRepository;
import com.smartexsustway.api.domain.repository.EntrepriseRepository;
import com.smartexsustway.api.domain.repository.SiteRepository;
import com.smartexsustway.api.domain.repository.UtilisateurRepository;
import com.smartexsustway.api.resource.dto.DocumentDto;
import com.smartexsustway.api.resource.dto.ErreurDto;
import com.smartexsustway.api.security.AutorisationService;
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
import org.eclipse.microprofile.config.inject.ConfigProperty;
import org.jboss.resteasy.reactive.RestForm;
import org.jboss.resteasy.reactive.multipart.FileUpload;

import java.io.IOException;
import java.nio.file.Files;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.HexFormat;
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
    @Inject SiteRepository siteRepository;
    @Inject DocumentRepository documentRepository;
    @Inject UtilisateurRepository utilisateurRepository;
    @Inject StorageService storageService;
    @Inject AntivirusService antivirusService;
    @Inject AutorisationService autorisationService;
    @Inject AuditLogService auditLogService;
    @Inject TenantContext tenantContext;

    @ConfigProperty(name = "smartex.antivirus.echec-bloquant")
    boolean echecBloquant;

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

        if (fichier == null) {
            return erreur(400, "Aucun fichier reçu (champ 'fichier' attendu)");
        }

        String typeMime = fichier.contentType();
        if (typeMime == null || !TYPES_AUTORISES.contains(typeMime)) {
            return erreur(415, "Type de fichier non autorisé : " + typeMime);
        }

        byte[] contenu;
        try {
            contenu = Files.readAllBytes(fichier.uploadedFile());
        } catch (IOException e) {
            return erreur(500, "Échec de lecture du fichier reçu");
        }

        // Exigence sécurité §1.4 : le scan a lieu AVANT tout stockage — un
        // fichier infecté ne touche jamais S3/MinIO.
        ResultatScan resultat = antivirusService.scanner(contenu);

        if (resultat.statut() == StatutScanDocument.INFECTE) {
            auditLogService.journaliser(utilisateurId, entrepriseId, "DOCUMENT_REJETE_INFECTE", "document", null);
            return erreur(422, "Fichier rejeté : menace détectée (" + resultat.detail() + ")");
        }
        if (resultat.statut() == StatutScanDocument.ERREUR && echecBloquant) {
            return erreur(503, "Scan antivirus indisponible — réessayez plus tard");
        }

        String hash = sha256(contenu);
        String extension = extensionDepuis(fichier.fileName());
        String nomStockage = UUID.randomUUID() + extension;
        String cleStockage = "entreprises/" + entrepriseId + "/documents/" + nomStockage;

        storageService.televerser(cleStockage, contenu, typeMime);

        Document document = new Document(entreprise, fichier.fileName(), nomStockage, typeMime, contenu.length, cleStockage, hash);
        document.setStatutScan(resultat.statut());
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

    private static String extensionDepuis(String nomFichier) {
        if (nomFichier == null) return "";
        int point = nomFichier.lastIndexOf('.');
        return point >= 0 ? nomFichier.substring(point) : "";
    }

    private static String sha256(byte[] contenu) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            return HexFormat.of().formatHex(digest.digest(contenu));
        } catch (NoSuchAlgorithmException e) {
            // SHA-256 fait partie de tout JDK standard — ne devrait jamais arriver.
            throw new IllegalStateException(e);
        }
    }

    private static Response erreur(int statut, String message) {
        return Response.status(statut).entity(new ErreurDto(message)).build();
    }
}

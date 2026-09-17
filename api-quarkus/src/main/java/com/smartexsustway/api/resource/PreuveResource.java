package com.smartexsustway.api.resource;

import com.smartexsustway.api.audit.AuditLogService;
import com.smartexsustway.api.domain.entity.Audit;
import com.smartexsustway.api.domain.entity.AuditCritere;
import com.smartexsustway.api.domain.entity.Document;
import com.smartexsustway.api.domain.entity.Preuve;
import com.smartexsustway.api.domain.enums.StatutAudit;
import com.smartexsustway.api.domain.enums.StatutScanDocument;
import com.smartexsustway.api.domain.enums.TypePreuve;
import com.smartexsustway.api.domain.repository.AuditCritereRepository;
import com.smartexsustway.api.domain.repository.AuditRepository;
import com.smartexsustway.api.domain.repository.DocumentRepository;
import com.smartexsustway.api.domain.repository.EvaluationDocumentAnalyseRepository;
import com.smartexsustway.api.domain.repository.EvaluationRepository;
import com.smartexsustway.api.domain.repository.PreuveRepository;
import com.smartexsustway.api.mission.AnalyseCritereService;
import com.smartexsustway.api.resource.dto.ErreurDto;
import com.smartexsustway.api.resource.dto.PreuveCreateRequest;
import com.smartexsustway.api.resource.dto.PreuveDto;
import com.smartexsustway.api.security.AutorisationService;
import com.smartexsustway.api.stockage.StorageService;
import com.smartexsustway.api.tenant.TenantContext;
import io.quarkus.security.Authenticated;
import org.jboss.logging.Logger;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import jakarta.validation.Valid;
import org.eclipse.microprofile.config.inject.ConfigProperty;
import jakarta.ws.rs.Consumes;
import jakarta.ws.rs.DELETE;
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

    private static final Logger LOG = Logger.getLogger(PreuveResource.class);

    @Inject AuditRepository auditRepository;
    @Inject AuditCritereRepository auditCritereRepository;
    @Inject DocumentRepository documentRepository;
    @Inject PreuveRepository preuveRepository;
    @Inject EvaluationRepository evaluationRepository;
    @Inject EvaluationDocumentAnalyseRepository documentAnalyseRepository;
    @Inject StorageService storageService;
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
            // RG35 : un critère exclu n'accepte plus de nouvelle preuve. Un seul
            // critère exclu refuse la requête entière, et avant tout persist :
            // rien n'est écrit. Les preuves déjà rattachées restent lisibles.
            if (!auditCritere.isActif() || !auditCritere.isApplicable()) {
                return erreur(409, AnalyseCritereService.messageHorsPerimetre(auditCritere));
            }
            preuve.getAuditCriteres().add(auditCritere);
        }

        preuveRepository.persist(preuve);
        auditLogService.journaliser(utilisateurId, entrepriseId, "PREUVE_AJOUTEE", "preuve", preuve.getId());

        return Response.status(Response.Status.CREATED).entity(PreuveDto.depuis(preuve)).build();
    }

    /**
     * Retire une preuve jointe à un critère.
     *
     * <p>Une pièce déposée par erreur devait jusqu'ici rester en place
     * jusqu'à la fin de la mission : l'interface prévoyait le geste, l'API ne
     * l'offrait pas.
     *
     * <p><strong>Seulement tant que rien ne s'appuie dessus.</strong> Une
     * pièce déjà soumise aux agents appartient à la trace du résultat qu'elle
     * a produit ; la retirer rendrait ce résultat invérifiable. C'est ce que
     * dit déjà le schéma, avec le {@code ON DELETE RESTRICT} de la migration
     * V61 — ce contrôle permet de répondre par une phrase plutôt que par une
     * violation de contrainte.
     *
     * <p><strong>Le document ne part que s'il est seul.</strong> Un même
     * fichier sert plusieurs critères et plusieurs missions (RG15). Quand une
     * autre preuve s'y appuie encore, seule celle-ci est retirée.
     *
     * <p>Non transactionnel : l'objet stocké est supprimé <em>après</em> le
     * commit. L'ordre inverse laisserait, si la base échouait, une ligne
     * pointant vers un fichier absent — l'incohérence la plus difficile à
     * diagnostiquer, parce qu'elle ne se voit qu'au téléchargement.
     */
    @DELETE
    @Path("/{preuveId}")
    public Response supprimer(@PathParam("entrepriseId") UUID entrepriseId,
                              @PathParam("auditId") UUID auditId,
                              @PathParam("preuveId") UUID preuveId) {
        UUID utilisateurId = tenantContext.utilisateurCourantId();
        autorisationService.exigerAccesEntreprise(utilisateurId, entrepriseId);
        Audit audit = trouverAuditDeLEntreprise(entrepriseId, auditId);

        // Qui peut joindre une pièce peut retirer celle qu'il vient de
        // joindre : aucune permission nouvelle n'est introduite.
        String formuleCode = audit.getFormuleAbonnement() == null ? null : audit.getFormuleAbonnement().getCode();
        autorisationService.exigerPermission(utilisateurId, entrepriseId, formuleCode, "preuve:deposer");

        Preuve preuve = preuveRepository.findById(preuveId);
        // L'appartenance à la mission est vérifiée ici et non par l'identifiant
        // seul : sans cela, une preuve d'une autre organisation serait
        // atteignable en devinant son identifiant.
        if (preuve == null || !preuve.getAudit().getId().equals(auditId)) {
            return erreur(404, "Preuve introuvable pour cette mission");
        }
        if (audit.getStatut() == StatutAudit.TERMINE) {
            return erreur(409, "Cette mission est clôturée : ses preuves ne peuvent plus être retirées");
        }

        Document document = preuve.getDocument();

        // Deux contrôles, parce qu'un seul ne suffit pas.
        //
        // `evaluation_document_analyse` porte la liaison la plus précise — quel
        // fichier a été lu par quel agent — mais elle n'est pas toujours
        // écrite : mesuré sur la base réelle, deux lignes sur dix-neuf
        // seulement portent un `document_id`, et une analyse menée avec une
        // pièce peut n'en produire aucune. S'y fier seul laisserait retirer
        // une pièce qui a bel et bien servi.
        //
        // Le second contrôle est plus large et ne dépend d'aucun
        // enregistrement optionnel : si l'un des critères auxquels cette
        // pièce est rattachée porte déjà une évaluation, elle a fait partie
        // de ce qui a été soumis. C'est lui qui tient la règle.
        boolean critereDejaEvalue = preuve.getAuditCriteres().stream()
                .anyMatch(ac -> evaluationRepository.laPlusRecenteParAuditCritere(ac.getId()).isPresent());
        if (critereDejaEvalue || documentAnalyseRepository.documentDejaAnalyse(document.getId())) {
            return erreur(409, "Cette pièce a servi à une analyse IA : la retirer rendrait "
                    + "le résultat invérifiable. Elle reste consultable dans l'historique.");
        }

        // Lu avant la suppression : après, le compte serait faussé par la
        // preuve qu'on vient de retirer.
        boolean documentEncoreUtilise = preuveRepository.compterParDocument(document.getId()) > 1;
        String cleStockage = document.getCheminStockage();

        supprimerEnBase(preuve, documentEncoreUtilise);
        auditLogService.journaliser(utilisateurId, entrepriseId, "PREUVE_SUPPRIMEE", "document", document.getId());

        if (!documentEncoreUtilise) {
            try {
                storageService.supprimer(cleStockage);
            } catch (RuntimeException e) {
                // La base fait foi : la pièce a bien disparu du produit. Un
                // objet resté dans le bucket est un déchet de stockage, pas
                // une incohérence visible — et le signaler à l'utilisateur
                // l'inviterait à réessayer un geste déjà accompli.
                LOG.warnf(e, "Objet %s non supprimé du stockage après retrait de la preuve %s",
                        cleStockage, preuveId);
            }
        }
        return Response.noContent().build();
    }

    /** La partie transactionnelle : la preuve, et le document s'il devient orphelin. */
    @Transactional
    void supprimerEnBase(Preuve preuve, boolean documentEncoreUtilise) {
        Document document = preuve.getDocument();
        // `preuve_critere` est en ON DELETE CASCADE (V1__init_schema.sql) :
        // les rattachements aux critères partent avec la preuve.
        preuveRepository.delete(preuve);
        if (!documentEncoreUtilise) {
            preuveRepository.getEntityManager().flush();
            documentRepository.delete(document);
        }
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

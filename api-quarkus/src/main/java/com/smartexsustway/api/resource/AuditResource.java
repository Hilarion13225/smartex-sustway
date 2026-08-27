package com.smartexsustway.api.resource;

import com.smartexsustway.api.audit.AuditLogService;
import com.smartexsustway.api.domain.entity.Abonnement;
import com.smartexsustway.api.domain.entity.Audit;
import com.smartexsustway.api.domain.entity.AuditCritere;
import com.smartexsustway.api.domain.entity.AuditQuestion;
import com.smartexsustway.api.domain.entity.Critere;
import com.smartexsustway.api.domain.entity.Criticite;
import com.smartexsustway.api.domain.entity.Entreprise;
import com.smartexsustway.api.domain.entity.Question;
import com.smartexsustway.api.domain.entity.Referentiel;
import com.smartexsustway.api.domain.entity.Site;
import com.smartexsustway.api.domain.entity.Utilisateur;
import com.smartexsustway.api.domain.enums.RoleMissionAuditeur;
import com.smartexsustway.api.domain.repository.AbonnementRepository;
import com.smartexsustway.api.domain.repository.AuditAuditeurRepository;
import com.smartexsustway.api.domain.repository.AuditCritereRepository;
import com.smartexsustway.api.domain.repository.AuditQuestionRepository;
import com.smartexsustway.api.domain.repository.AuditRepository;
import com.smartexsustway.api.domain.repository.AuditSiteRepository;
import com.smartexsustway.api.domain.repository.EntrepriseRepository;
import com.smartexsustway.api.domain.repository.QuestionRepository;
import com.smartexsustway.api.domain.repository.ReferentielRepository;
import com.smartexsustway.api.domain.repository.ScoreHistoriqueRepository;
import com.smartexsustway.api.domain.repository.SiteRepository;
import com.smartexsustway.api.domain.repository.UtilisateurEntrepriseRepository;
import com.smartexsustway.api.domain.repository.UtilisateurRepository;
import com.smartexsustway.api.referentiel.QuestionnaireService;
import com.smartexsustway.api.resource.dto.AffecterAuditeurRequest;
import com.smartexsustway.api.resource.dto.AuditAuditeurDto;
import com.smartexsustway.api.resource.dto.AuditCreateRequest;
import com.smartexsustway.api.resource.dto.AuditCritereDto;
import com.smartexsustway.api.resource.dto.AuditDto;
import com.smartexsustway.api.resource.dto.AuditSitesRequest;
import com.smartexsustway.api.resource.dto.ErreurDto;
import com.smartexsustway.api.resource.dto.ScoreHistoriqueDto;
import com.smartexsustway.api.resource.dto.SiteDto;
import com.smartexsustway.api.scoring.AuditScoreService;
import com.smartexsustway.api.security.AutorisationService;
import com.smartexsustway.api.tenant.TenantContext;
import io.quarkus.security.Authenticated;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import jakarta.validation.Valid;
import jakarta.ws.rs.BadRequestException;
import jakarta.ws.rs.Consumes;
import jakarta.ws.rs.DELETE;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.NotFoundException;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.PUT;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.PathParam;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;

import java.util.List;
import java.util.Objects;
import java.util.UUID;

/**
 * RG10/RG11 : missions d'audit. RG20 : pas de lancement d'audit sans
 * abonnement actif de l'entreprise. RG34/RG35 : le questionnaire est
 * composé dynamiquement à la création (QuestionnaireService) puis figé
 * dans AUDIT_CRITERE/AUDIT_QUESTION — un audit en cours ne change pas de
 * périmètre si le référentiel évolue ensuite.
 *
 * RG12 (sites)/RG06 (auditeurs) : périmètre de sites et équipe affectée à
 * une mission, exposés via AUDIT_SITE/AUDIT_AUDITEUR — voir
 * AuditSiteRepository/AuditAuditeurRepository. Lecture ouverte à tout
 * rattachement (comme le reste de cette ressource). Écriture des sites
 * réservée à audit:modifier (même garde que ActionCorrectiveResource/
 * NonConformeResource pour les autres mutations attachées à une mission) —
 * le client garde la main sur le périmètre de sa propre mission. Écriture de
 * l'équipe affectée réservée au personnel interne Smartex (ROLES_INTERNES_
 * SMARTEX), pas au client : ce n'est plus une permission de formule mais un
 * rôle, voir affecterAuditeur/retirerAuditeur. Aucune affectation automatique
 * pour l'instant (un seul ADMIN_AUDIT gère toutes les missions à ce stade du
 * produit) — l'équipe reste à affecter manuellement par le staff, pas de
 * garniture d'écran côté frontend en attendant (voir AuditDetail.jsx).
 */
@Path("/api/v1/entreprises/{entrepriseId}/audits")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
@Authenticated
public class AuditResource {

    @Inject EntrepriseRepository entrepriseRepository;
    @Inject ReferentielRepository referentielRepository;
    @Inject AbonnementRepository abonnementRepository;
    @Inject AuditRepository auditRepository;
    @Inject AuditCritereRepository auditCritereRepository;
    @Inject AuditScoreService auditScoreService;
    @Inject AuditQuestionRepository auditQuestionRepository;
    @Inject QuestionRepository questionRepository;
    @Inject UtilisateurRepository utilisateurRepository;
    @Inject UtilisateurEntrepriseRepository utilisateurEntrepriseRepository;
    @Inject SiteRepository siteRepository;
    @Inject ScoreHistoriqueRepository scoreHistoriqueRepository;
    @Inject AuditSiteRepository auditSiteRepository;
    @Inject AuditAuditeurRepository auditAuditeurRepository;
    @Inject QuestionnaireService questionnaireService;
    @Inject AutorisationService autorisationService;
    @Inject AuditLogService auditLogService;
    @Inject TenantContext tenantContext;

    @GET
    public Response lister(@PathParam("entrepriseId") UUID entrepriseId) {
        autorisationService.exigerAccesEntreprise(tenantContext.utilisateurCourantId(), entrepriseId);

        var audits = auditRepository.parEntreprise(entrepriseId).stream()
                .map(a -> AuditDto.depuis(a, auditCritereRepository.parAudit(a.getId()).size()))
                .toList();
        return Response.ok(audits).build();
    }

    @GET
    @Path("/{auditId}")
    public Response detail(@PathParam("entrepriseId") UUID entrepriseId, @PathParam("auditId") UUID auditId) {
        autorisationService.exigerAccesEntreprise(tenantContext.utilisateurCourantId(), entrepriseId);

        Audit audit = trouverAuditDeLEntreprise(entrepriseId, auditId);
        int nombreCriteres = auditCritereRepository.parAudit(audit.getId()).size();
        return Response.ok(AuditDto.depuis(audit, nombreCriteres)).build();
    }

    @GET
    @Path("/{auditId}/criteres")
    public Response criteres(@PathParam("entrepriseId") UUID entrepriseId, @PathParam("auditId") UUID auditId) {
        autorisationService.exigerAccesEntreprise(tenantContext.utilisateurCourantId(), entrepriseId);

        Audit audit = trouverAuditDeLEntreprise(entrepriseId, auditId);
        var criteres = auditCritereRepository.parAudit(audit.getId()).stream().map(AuditCritereDto::depuis).toList();
        return Response.ok(criteres).build();
    }

    /**
     * RG32 — agrégation du score global et par domaine de la mission, à
     * partir des évaluations définitives (statut VALIDEE) des critères
     * actifs/applicables (RG35). Un critère non encore évalué, ou dont
     * l'évaluation attend une revue experte (EN_REVUE), ne participe pas
     * encore au score — il est compté séparément (nombreCriteresEnRevue /
     * nombreCriteresNonEvalues) pour distinguer avancement et conformité.
     */
    @GET
    @Path("/{auditId}/score")
    public Response score(@PathParam("entrepriseId") UUID entrepriseId, @PathParam("auditId") UUID auditId) {
        autorisationService.exigerAccesEntreprise(tenantContext.utilisateurCourantId(), entrepriseId);

        Audit audit = trouverAuditDeLEntreprise(entrepriseId, auditId);
        return Response.ok(auditScoreService.calculer(audit)).build();
    }

    /** RG32 : évolution du score global de la mission dans le temps — un point par jour où une évaluation validée l'a fait varier (voir ScoreHistoriqueService). */
    @GET
    @Path("/{auditId}/score-historique")
    public Response scoreHistorique(@PathParam("entrepriseId") UUID entrepriseId, @PathParam("auditId") UUID auditId) {
        autorisationService.exigerAccesEntreprise(tenantContext.utilisateurCourantId(), entrepriseId);

        Audit audit = trouverAuditDeLEntreprise(entrepriseId, auditId);
        var historique = scoreHistoriqueRepository.parAudit(audit.getId()).stream()
                .map(ScoreHistoriqueDto::depuis)
                .toList();
        return Response.ok(historique).build();
    }

    @POST
    @Transactional
    public Response creer(@PathParam("entrepriseId") UUID entrepriseId, @Valid AuditCreateRequest requete) {
        UUID utilisateurId = tenantContext.utilisateurCourantId();
        autorisationService.exigerAccesEntreprise(utilisateurId, entrepriseId);

        Entreprise entreprise = entrepriseRepository.findById(entrepriseId);
        if (entreprise == null) {
            return Response.status(Response.Status.NOT_FOUND).build();
        }

        // RG20 : une entreprise ne peut lancer un audit que si son abonnement est actif.
        Abonnement abonnement = abonnementRepository.leplusRecentParEntreprise(entrepriseId).orElse(null);
        if (abonnement == null || !abonnement.estActif()) {
            return Response.status(Response.Status.FORBIDDEN)
                    .entity(new ErreurDto("Un abonnement actif est requis pour lancer un audit"))
                    .build();
        }
        autorisationService.exigerPermission(utilisateurId, entrepriseId, abonnement.getFormule().getCode(), "audit:creer");

        Referentiel referentiel = referentielRepository.parCode(requete.referentielCode())
                .orElseThrow(() -> new BadRequestException("Référentiel inconnu : " + requete.referentielCode()));

        Audit audit = new Audit(entreprise, referentiel, requete.nom(), requete.dateDebut());
        audit.setDescription(requete.description());
        audit.setDateFin(requete.dateFin());
        audit.setFormuleAbonnement(abonnement.getFormule());
        audit.setCreatedBy(utilisateurRepository.findById(utilisateurId));
        auditRepository.persist(audit);

        // RG34/RG35 : composition dynamique du questionnaire, figée dans la
        // mission (voir javadoc QuestionnaireService et AuditCritere).
        // RG37 : la criticité de chaque critère est résolue pour le secteur
        // de l'entreprise auditée (surcharge sectorielle si elle existe,
        // sinon criticité générale), puis gelée dans l'AuditCritere.
        List<Critere> criteresApplicables = questionnaireService.composer(entreprise, referentiel);
        for (Critere critere : criteresApplicables) {
            Criticite criticiteEffective = questionnaireService.criticiteEffective(critere, entreprise);
            AuditCritere auditCritere = new AuditCritere(audit, critere, criticiteEffective);
            auditCritereRepository.persist(auditCritere);

            for (Question question : questionRepository.parCritere(critere.getId())) {
                auditQuestionRepository.persist(new AuditQuestion(auditCritere, question));
            }
        }

        auditLogService.journaliser(utilisateurId, entrepriseId, "AUDIT_CREE", "audit", audit.getId());

        return Response.status(Response.Status.CREATED)
                .entity(AuditDto.depuis(audit, criteresApplicables.size()))
                .build();
    }

    // --- RG12 : sites couverts par la mission -------------------------------

    @GET
    @Path("/{auditId}/sites")
    public Response sites(@PathParam("entrepriseId") UUID entrepriseId, @PathParam("auditId") UUID auditId) {
        autorisationService.exigerAccesEntreprise(tenantContext.utilisateurCourantId(), entrepriseId);
        Audit audit = trouverAuditDeLEntreprise(entrepriseId, auditId);

        var sites = auditSiteRepository.siteIdsPourAudit(audit.getId()).stream()
                .map(id -> siteRepository.findById(id))
                .filter(Objects::nonNull)
                .map(SiteDto::depuis)
                .toList();
        return Response.ok(sites).build();
    }

    /** RG12 : remplace l'intégralité du périmètre de sites de la mission (sémantique PUT, pas d'ajout incrémental). */
    @PUT
    @Path("/{auditId}/sites")
    @Transactional
    public Response definirSites(@PathParam("entrepriseId") UUID entrepriseId, @PathParam("auditId") UUID auditId,
                                  @Valid AuditSitesRequest requete) {
        UUID utilisateurId = tenantContext.utilisateurCourantId();
        autorisationService.exigerAccesEntreprise(utilisateurId, entrepriseId);
        Audit audit = trouverAuditDeLEntreprise(entrepriseId, auditId);
        autorisationService.exigerPermission(utilisateurId, entrepriseId, formuleCode(audit), "audit:modifier");

        for (UUID siteId : requete.siteIds()) {
            Site site = siteRepository.findById(siteId);
            if (site == null || !site.getEntreprise().getId().equals(entrepriseId)) {
                return erreur(400, "Site introuvable pour cette entreprise : " + siteId);
            }
        }

        auditSiteRepository.definir(audit.getId(), requete.siteIds());
        auditLogService.journaliser(utilisateurId, entrepriseId, "AUDIT_SITES_DEFINIS", "audit", audit.getId());

        var sites = requete.siteIds().stream().map(id -> SiteDto.depuis(siteRepository.findById(id))).toList();
        return Response.ok(sites).build();
    }

    // --- RG06 : équipe affectée à la mission --------------------------------

    @GET
    @Path("/{auditId}/auditeurs")
    public Response auditeurs(@PathParam("entrepriseId") UUID entrepriseId, @PathParam("auditId") UUID auditId) {
        autorisationService.exigerAccesEntreprise(tenantContext.utilisateurCourantId(), entrepriseId);
        Audit audit = trouverAuditDeLEntreprise(entrepriseId, auditId);

        var equipe = auditAuditeurRepository.listerPourAudit(audit.getId()).stream()
                .map(ligne -> auditeurDto(UUID.fromString((String) ligne[0]), (String) ligne[1]))
                .filter(Objects::nonNull)
                .toList();
        return Response.ok(equipe).build();
    }

    /**
     * RG06 : seul le personnel interne Smartex peut être affecté comme
     * auditeur d'une mission — un rattachement client (RESPONSABLE_ENTREPRISE,
     * VISITEUR) est la partie auditée, pas l'équipe qui audite. Et depuis
     * cette décision produit, seul le personnel interne peut lui-même
     * effectuer cette affectation manuellement (au-delà de l'affectation
     * automatique à la création, voir AffectationAutomatiqueService) — le
     * client ne choisit plus son auditeur, exigerRoleSurEntreprise plutôt
     * que la permission générique audit:modifier (que le client possède
     * encore, pour son propre périmètre de sites — voir definirSites).
     */
    @PUT
    @Path("/{auditId}/auditeurs/{auditeurId}")
    @Transactional
    public Response affecterAuditeur(@PathParam("entrepriseId") UUID entrepriseId, @PathParam("auditId") UUID auditId,
                                      @PathParam("auditeurId") UUID auditeurId, @Valid AffecterAuditeurRequest requete) {
        UUID utilisateurId = tenantContext.utilisateurCourantId();
        autorisationService.exigerAccesEntreprise(utilisateurId, entrepriseId);
        Audit audit = trouverAuditDeLEntreprise(entrepriseId, auditId);
        autorisationService.exigerRoleSurEntreprise(utilisateurId, entrepriseId, AutorisationService.ROLES_INTERNES_SMARTEX);

        RoleMissionAuditeur roleMission;
        try {
            roleMission = RoleMissionAuditeur.valueOf(requete.roleMission());
        } catch (IllegalArgumentException e) {
            return erreur(400, "Rôle de mission inconnu : " + requete.roleMission());
        }

        boolean staffRattache = utilisateurEntrepriseRepository.parUtilisateur(auditeurId).stream()
                .anyMatch(r -> r.getEntreprise().getId().equals(entrepriseId)
                        && AutorisationService.ROLES_INTERNES_SMARTEX.contains(r.getRole().getCode()));
        if (!staffRattache) {
            return erreur(400, "Cet utilisateur doit être rattaché à l'entreprise avec un rôle interne Smartex "
                    + "(SUPER_ADMIN, ADMIN_AUDIT, EXPERT_REVIEWER) pour être affecté à une mission");
        }

        auditAuditeurRepository.affecter(audit.getId(), auditeurId, roleMission.name());
        auditLogService.journaliser(utilisateurId, entrepriseId, "AUDIT_AUDITEUR_AFFECTE", "audit", audit.getId());

        return Response.ok(auditeurDto(auditeurId, roleMission.name())).build();
    }

    @DELETE
    @Path("/{auditId}/auditeurs/{auditeurId}")
    @Transactional
    public Response retirerAuditeur(@PathParam("entrepriseId") UUID entrepriseId, @PathParam("auditId") UUID auditId,
                                     @PathParam("auditeurId") UUID auditeurId) {
        UUID utilisateurId = tenantContext.utilisateurCourantId();
        autorisationService.exigerAccesEntreprise(utilisateurId, entrepriseId);
        Audit audit = trouverAuditDeLEntreprise(entrepriseId, auditId);
        autorisationService.exigerRoleSurEntreprise(utilisateurId, entrepriseId, AutorisationService.ROLES_INTERNES_SMARTEX);

        auditAuditeurRepository.retirer(audit.getId(), auditeurId);
        auditLogService.journaliser(utilisateurId, entrepriseId, "AUDIT_AUDITEUR_RETIRE", "audit", audit.getId());

        return Response.noContent().build();
    }

    private AuditAuditeurDto auditeurDto(UUID auditeurId, String roleMission) {
        Utilisateur u = utilisateurRepository.findById(auditeurId);
        if (u == null) {
            return null;
        }
        return new AuditAuditeurDto(auditeurId, u.getNom(), u.getPrenom(), u.getEmail(), roleMission);
    }

    private static String formuleCode(Audit audit) {
        return audit.getFormuleAbonnement() == null ? null : audit.getFormuleAbonnement().getCode();
    }

    private static Response erreur(int statut, String message) {
        return Response.status(statut).entity(new ErreurDto(message)).build();
    }

    private Audit trouverAuditDeLEntreprise(UUID entrepriseId, UUID auditId) {
        Audit audit = auditRepository.findById(auditId);
        if (audit == null || !audit.getEntreprise().getId().equals(entrepriseId)) {
            throw new NotFoundException("Audit introuvable pour cette entreprise");
        }
        return audit;
    }
}

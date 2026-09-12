package com.smartexsustway.api.resource;

import com.smartexsustway.api.amelioration.AxeAmeliorationService;
import com.smartexsustway.api.amelioration.DecisionAxeRefusee;
import com.smartexsustway.api.audit.AuditLogService;
import com.smartexsustway.api.domain.entity.Audit;
import com.smartexsustway.api.domain.entity.AxeAmelioration;
import com.smartexsustway.api.domain.enums.StatutAxe;
import com.smartexsustway.api.domain.repository.AuditCritereRepository;
import com.smartexsustway.api.domain.repository.AuditRepository;
import com.smartexsustway.api.domain.repository.AxeAmeliorationRepository;
import com.smartexsustway.api.domain.repository.UtilisateurRepository;
import com.smartexsustway.api.resource.dto.AxeAmeliorationDto;
import com.smartexsustway.api.resource.dto.ErreurDto;
import com.smartexsustway.api.security.AutorisationService;
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
import jakarta.ws.rs.QueryParam;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;

import java.util.List;
import java.util.UUID;

/**
 * Les axes d'amélioration d'une mission.
 *
 * <p>Un axe proposé par l'IA n'engage rien : il naît {@code PROPOSE} et
 * n'a de portée qu'une fois repris par une personne. Cette ressource est
 * l'endroit où cette reprise a lieu — ou n'a pas lieu, un rejet motivé
 * étant une décision aussi légitime qu'une validation, et tout aussi
 * conservée.
 *
 * <p><strong>Aucune permission nouvelle.</strong> {@code audit:modifier}
 * existe et se décrit elle-même comme « Modifier une mission (plan
 * d'actions, non-conformités) » : reprendre une proposition d'amélioration
 * relève exactement de ce travail. En créer une seconde pour le même geste
 * ajouterait un vocabulaire sans ajouter de contrôle.
 *
 * <p>Elle est distincte de {@code evaluation:valider}, et ce n'est pas une
 * inconséquence : valider une évaluation fait entrer un résultat dans le
 * score officiel et rend un écart opposable ; valider un axe retient une
 * suggestion de travail. Les deux gestes n'ont ni la même portée ni le
 * même auteur naturel.
 */
@Path("/api/v1/entreprises/{entrepriseId}/audits/{auditId}/axes-amelioration")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
@Authenticated
public class AxeAmeliorationResource {

    private static final String PERMISSION_MODIFIER = "audit:modifier";

    @Inject AuditRepository auditRepository;
    @Inject AuditCritereRepository auditCritereRepository;
    @Inject AxeAmeliorationRepository axeRepository;
    @Inject AxeAmeliorationService axeService;
    @Inject UtilisateurRepository utilisateurRepository;
    @Inject AutorisationService autorisationService;
    @Inject AuditLogService auditLogService;
    @Inject TenantContext tenantContext;

    /**
     * Les axes de la mission, éventuellement restreints à un critère ou à un
     * statut.
     *
     * <p>{@code auditCritereId} filtre en base plutôt qu'en mémoire : l'écran
     * d'un critère ne doit pas charger les axes de toute la mission pour en
     * afficher trois.
     */
    @GET
    public Response lister(@PathParam("entrepriseId") UUID entrepriseId,
                           @PathParam("auditId") UUID auditId,
                           @QueryParam("auditCritereId") UUID auditCritereId,
                           @QueryParam("statut") String statut) {
        autorisationService.exigerAccesEntreprise(tenantContext.utilisateurCourantId(), entrepriseId);
        trouverAuditDeLEntreprise(entrepriseId, auditId);

        List<AxeAmelioration> axes;
        if (auditCritereId != null) {
            // Le critère est résolu contre la mission : son identifiant seul
            // ne doit pas permettre d'atteindre les axes d'une autre mission.
            var auditCritere = auditCritereRepository.findById(auditCritereId);
            if (auditCritere == null || !auditCritere.getAudit().getId().equals(auditId)) {
                throw new NotFoundException("Critère introuvable pour cette mission");
            }
            axes = axeRepository.parAuditCritereAvecCibles(auditCritereId);
        } else {
            axes = axeRepository.parAudit(auditId);
        }

        if (statut != null && !statut.isBlank()) {
            StatutAxe attendu = statutOuErreur(statut);
            axes = axes.stream().filter(a -> a.getStatut() == attendu).toList();
        }

        return Response.ok(axes.stream().map(AxeAmeliorationDto::depuis).toList()).build();
    }

    @GET
    @Path("/{axeId}")
    public Response consulter(@PathParam("entrepriseId") UUID entrepriseId,
                              @PathParam("auditId") UUID auditId,
                              @PathParam("axeId") UUID axeId) {
        autorisationService.exigerAccesEntreprise(tenantContext.utilisateurCourantId(), entrepriseId);
        trouverAuditDeLEntreprise(entrepriseId, auditId);

        return Response.ok(AxeAmeliorationDto.depuis(trouverAxe(auditId, axeId))).build();
    }

    /**
     * Créer un axe à la main.
     *
     * <p>L'origine n'est pas un paramètre : un axe créé par cette route est
     * humain par construction. Laisser l'appelant déclarer {@code IA}
     * permettrait de fabriquer une fausse provenance.
     */
    @POST
    @Transactional
    public Response creer(@PathParam("entrepriseId") UUID entrepriseId,
                          @PathParam("auditId") UUID auditId,
                          @Valid AxeAmeliorationDto.CreationDto corps) {
        UUID utilisateurId = tenantContext.utilisateurCourantId();
        autorisationService.exigerAccesEntreprise(utilisateurId, entrepriseId);
        Audit audit = trouverAuditDeLEntreprise(entrepriseId, auditId);
        exigerModification(utilisateurId, entrepriseId, audit);

        var auditCritere = corps.auditCritereId() == null ? null
                : auditCritereRepository.findById(corps.auditCritereId());
        if (corps.auditCritereId() != null
                && (auditCritere == null || !auditCritere.getAudit().getId().equals(auditId))) {
            throw new NotFoundException("Critère introuvable pour cette mission");
        }

        AxeAmelioration axe = AxeAmelioration.saisiParHumain(audit, auditCritere, corps.libelle());
        axe.setDescription(corps.description());
        axe.setCreePar(utilisateurRepository.findById(utilisateurId));
        axeRepository.persistAndFlush(axe);

        auditLogService.journaliser(utilisateurId, entrepriseId, "AXE_CREE", "axe_amelioration", axe.getId());
        return Response.status(Response.Status.CREATED).entity(AxeAmeliorationDto.depuis(axe)).build();
    }

    @POST
    @Path("/{axeId}/validation")
    @Transactional
    public Response valider(@PathParam("entrepriseId") UUID entrepriseId,
                            @PathParam("auditId") UUID auditId,
                            @PathParam("axeId") UUID axeId) {
        UUID utilisateurId = tenantContext.utilisateurCourantId();
        autorisationService.exigerAccesEntreprise(utilisateurId, entrepriseId);
        Audit audit = trouverAuditDeLEntreprise(entrepriseId, auditId);
        exigerModification(utilisateurId, entrepriseId, audit);

        AxeAmelioration axe = trouverAxe(auditId, axeId);
        try {
            axeService.valider(axe, utilisateurRepository.findById(utilisateurId),
                    utilisateurId, entrepriseId);
        } catch (DecisionAxeRefusee e) {
            return erreur(409, e.getMessage());
        }
        return Response.ok(AxeAmeliorationDto.depuis(axe)).build();
    }

    /**
     * Écarter un axe, avec son motif.
     *
     * <p>L'axe rejeté n'est pas supprimé : effacer une recommandation
     * écartée rendrait la relecture invérifiable, et l'on ne saurait plus
     * ce qui a été proposé ni pourquoi cela n'a pas été retenu.
     */
    @POST
    @Path("/{axeId}/rejet")
    @Transactional
    public Response rejeter(@PathParam("entrepriseId") UUID entrepriseId,
                            @PathParam("auditId") UUID auditId,
                            @PathParam("axeId") UUID axeId,
                            @Valid AxeAmeliorationDto.RejetDto corps) {
        UUID utilisateurId = tenantContext.utilisateurCourantId();
        autorisationService.exigerAccesEntreprise(utilisateurId, entrepriseId);
        Audit audit = trouverAuditDeLEntreprise(entrepriseId, auditId);
        exigerModification(utilisateurId, entrepriseId, audit);

        AxeAmelioration axe = trouverAxe(auditId, axeId);
        try {
            axeService.rejeter(axe, utilisateurRepository.findById(utilisateurId), corps.motif(),
                    utilisateurId, entrepriseId);
        } catch (DecisionAxeRefusee e) {
            return erreur(409, e.getMessage());
        }
        return Response.ok(AxeAmeliorationDto.depuis(axe)).build();
    }

    // --- Contrôles partagés ------------------------------------------------

    private void exigerModification(UUID utilisateurId, UUID entrepriseId, Audit audit) {
        String formuleCode = audit.getFormuleAbonnement() == null
                ? null : audit.getFormuleAbonnement().getCode();
        autorisationService.exigerPermission(utilisateurId, entrepriseId, formuleCode, PERMISSION_MODIFIER);
    }

    private Audit trouverAuditDeLEntreprise(UUID entrepriseId, UUID auditId) {
        Audit audit = auditRepository.findById(auditId);
        if (audit == null || !audit.getEntreprise().getId().equals(entrepriseId)) {
            throw new NotFoundException("Audit introuvable pour cette entreprise");
        }
        return audit;
    }

    /** Isolation multi-tenant : l'axe n'est rendu que s'il appartient à cette mission. */
    private AxeAmelioration trouverAxe(UUID auditId, UUID axeId) {
        return axeRepository.parIdEtAudit(axeId, auditId)
                .orElseThrow(() -> new NotFoundException("Axe introuvable pour cette mission"));
    }

    private static StatutAxe statutOuErreur(String valeur) {
        try {
            return StatutAxe.valueOf(valeur);
        } catch (IllegalArgumentException e) {
            throw new jakarta.ws.rs.BadRequestException("Statut inconnu : " + valeur);
        }
    }

    private static Response erreur(int statut, String message) {
        return Response.status(statut).entity(new ErreurDto(message)).build();
    }
}

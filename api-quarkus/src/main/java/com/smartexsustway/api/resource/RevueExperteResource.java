package com.smartexsustway.api.resource;

import com.smartexsustway.api.audit.AuditLogService;
import com.smartexsustway.api.conformite.NonConformiteService;
import com.smartexsustway.api.domain.entity.Evaluation;
import com.smartexsustway.api.domain.entity.RevueExperte;
import com.smartexsustway.api.domain.entity.Utilisateur;
import com.smartexsustway.api.domain.enums.SourceEvaluation;
import com.smartexsustway.api.domain.enums.StatutEvaluation;
import com.smartexsustway.api.domain.enums.StatutRevueExperte;
import com.smartexsustway.api.domain.repository.RevueExperteRepository;
import com.smartexsustway.api.domain.repository.UtilisateurRepository;
import com.smartexsustway.api.domain.rules.ScoringEngine;
import com.smartexsustway.api.resource.dto.ErreurDto;
import com.smartexsustway.api.resource.dto.RevueExperteDto;
import com.smartexsustway.api.resource.dto.TraiterRevueRequestDto;
import com.smartexsustway.api.security.AutorisationService;
import com.smartexsustway.api.tenant.TenantContext;
import io.quarkus.security.Authenticated;
import jakarta.annotation.security.RolesAllowed;
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
import org.jboss.logging.Logger;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

/**
 * Module 9 (CDC §8) : traitement de la file de revue experte alimentée par
 * RG22/RG38 (voir EvaluationResource — seule ressource qui CRÉE une
 * RevueExperte, quand la confiance IA est sous le seuil en formule
 * Avancées). Cette ressource ne fait que consommer cette file : lister les
 * revues en attente et les traiter.
 *
 * RG16 : tant qu'une revue requise n'est pas traitée, l'évaluation IA reste
 * provisoire (statut EN_REVUE) — le traitement de la revue est ce qui la
 * rend définitive (statut VALIDEE), que l'expert confirme ou corrige
 * l'estimation IA.
 */
@Path("/api/v1/entreprises/{entrepriseId}/revues-expertes")
@Produces(MediaType.APPLICATION_JSON)
@Authenticated
public class RevueExperteResource {

    private static final Logger LOG = Logger.getLogger(RevueExperteResource.class);

    @Inject RevueExperteRepository revueExperteRepository;
    @Inject UtilisateurRepository utilisateurRepository;
    @Inject NonConformiteService nonConformiteService;
    @Inject AutorisationService autorisationService;
    @Inject AuditLogService auditLogService;
    @Inject TenantContext tenantContext;

    @GET
    @RolesAllowed({"EXPERT_REVIEWER", "SUPER_ADMIN"})
    public Response fileAttente(@PathParam("entrepriseId") UUID entrepriseId) {
        autorisationService.exigerAccesEntreprise(tenantContext.utilisateurCourantId(), entrepriseId);

        List<RevueExperteDto> file = revueExperteRepository.fileAttentePourEntreprise(entrepriseId).stream()
                .map(RevueExperteDto::depuis)
                .toList();
        return Response.ok(file).build();
    }

    @POST
    @Path("/{revueId}/prendre-en-charge")
    @Transactional
    @RolesAllowed({"EXPERT_REVIEWER", "SUPER_ADMIN"})
    public Response prendreEnCharge(@PathParam("entrepriseId") UUID entrepriseId, @PathParam("revueId") UUID revueId) {
        UUID utilisateurId = tenantContext.utilisateurCourantId();
        autorisationService.exigerAccesEntreprise(utilisateurId, entrepriseId);

        RevueExperte revue = trouverRevue(entrepriseId, revueId);
        if (revue.getStatut() != StatutRevueExperte.EN_ATTENTE) {
            return erreur(409, "Cette revue n'est plus en attente (statut actuel : " + revue.getStatut() + ")");
        }

        Utilisateur expert = utilisateurRepository.findById(utilisateurId);
        revue.setExpert(expert);
        revue.setStatut(StatutRevueExperte.EN_COURS);

        auditLogService.journaliser(utilisateurId, entrepriseId, "REVUE_EXPERTE_PRISE_EN_CHARGE", "revue_experte", revue.getId());

        return Response.ok(RevueExperteDto.depuis(revue)).build();
    }

    /**
     * Finalise une revue : l'évaluation associée devient définitive
     * (RG16). {@code probabiliteFinale} est optionnel dans le corps de la
     * requête — l'expert peut confirmer l'estimation IA sans la modifier
     * en l'omettant. La note finale n'est jamais saisie directement
     * (même discipline que RG27 côté IA) : toujours dérivée via
     * ScoringEngine, que la probabilité vienne de l'IA ou de l'expert.
     */
    @POST
    @Path("/{revueId}/traiter")
    @Consumes(MediaType.APPLICATION_JSON)
    @Transactional
    @RolesAllowed({"EXPERT_REVIEWER", "SUPER_ADMIN"})
    public Response traiter(@PathParam("entrepriseId") UUID entrepriseId, @PathParam("revueId") UUID revueId,
                             TraiterRevueRequestDto requete) {
        UUID utilisateurId = tenantContext.utilisateurCourantId();
        autorisationService.exigerAccesEntreprise(utilisateurId, entrepriseId);

        RevueExperte revue = trouverRevue(entrepriseId, revueId);
        if (revue.getStatut() == StatutRevueExperte.TERMINEE) {
            return erreur(409, "Cette revue a déjà été traitée");
        }
        if (requete == null || requete.commentaire() == null || requete.commentaire().isBlank()) {
            return erreur(400, "Un commentaire justifiant la décision de l'expert est requis");
        }

        BigDecimal probabiliteFinale = requete.probabiliteFinale() != null
                ? requete.probabiliteFinale()
                : revue.getProbabiliteInitiale();
        if (probabiliteFinale.compareTo(BigDecimal.ZERO) < 0 || probabiliteFinale.compareTo(BigDecimal.ONE) > 0) {
            return erreur(400, "La probabilité finale doit être comprise entre 0 et 1");
        }
        short noteFinale = (short) ScoringEngine.niveauEngagement(probabiliteFinale);

        Utilisateur expert = utilisateurRepository.findById(utilisateurId);
        revue.setExpert(expert);
        revue.setProbabiliteFinale(probabiliteFinale);
        revue.setNoteFinale(noteFinale);
        revue.setCommentaire(requete.commentaire());
        revue.setStatut(StatutRevueExperte.TERMINEE);
        revue.setDateCompletion(OffsetDateTime.now());

        Evaluation evaluation = revue.getEvaluation();
        evaluation.setProbabiliteConforme(probabiliteFinale);
        evaluation.setNote(noteFinale);
        evaluation.setSource(SourceEvaluation.EXPERT);
        evaluation.setStatut(StatutEvaluation.VALIDEE);
        evaluation.setJustification(requete.commentaire());
        nonConformiteService.genererSiNecessaire(evaluation);

        auditLogService.journaliser(utilisateurId, entrepriseId, "REVUE_EXPERTE_TRAITEE", "revue_experte", revue.getId());

        LOG.infof("Revue experte %s traitée par %s (probabilité finale %s, note %d)",
                revue.getId(), utilisateurId, probabiliteFinale, noteFinale);

        return Response.ok(RevueExperteDto.depuis(revue)).build();
    }

    private RevueExperte trouverRevue(UUID entrepriseId, UUID revueId) {
        return revueExperteRepository.parIdEtEntreprise(revueId, entrepriseId)
                .orElseThrow(() -> new NotFoundException("Revue experte introuvable pour cette entreprise"));
    }

    private static Response erreur(int statut, String message) {
        return Response.status(statut).entity(new ErreurDto(message)).build();
    }
}

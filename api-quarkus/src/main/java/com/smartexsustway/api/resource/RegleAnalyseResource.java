package com.smartexsustway.api.resource;

import com.smartexsustway.api.audit.AuditLogService;
import com.smartexsustway.api.domain.entity.Critere;
import com.smartexsustway.api.domain.entity.Exigence;
import com.smartexsustway.api.domain.entity.PreuveAttendue;
import com.smartexsustway.api.domain.entity.RegleAnalyse;
import com.smartexsustway.api.domain.enums.NiveauCriticite;
import com.smartexsustway.api.domain.enums.TypeRegleAnalyse;
import com.smartexsustway.api.domain.repository.CritereRepository;
import com.smartexsustway.api.domain.repository.ExigenceRepository;
import com.smartexsustway.api.domain.repository.PreuveAttendueRepository;
import com.smartexsustway.api.domain.repository.RegleAnalyseRepository;
import com.smartexsustway.api.referentiel.RegleAnalyseValidation;
import com.smartexsustway.api.referentiel.VersionReferentielService;
import com.smartexsustway.api.resource.dto.ErreurDto;
import com.smartexsustway.api.resource.dto.RegleAnalyseDto;
import com.smartexsustway.api.resource.dto.RegleAnalyseRequestDto;
import com.smartexsustway.api.tenant.TenantContext;
import io.quarkus.security.Authenticated;
import jakarta.annotation.security.RolesAllowed;
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

import java.util.Map;
import java.util.UUID;

/**
 * Règles d'analyse d'un critère (module 4, back-office).
 *
 * La portée est donnée à la création : aucune référence pour une règle de
 * critère, l'exigence seule pour une règle d'exigence, l'exigence et la
 * pièce pour une règle portant sur une pièce précise. La cohérence de cette
 * chaîne est vérifiée ici, puis de nouveau en base (V52) — un chemin oublié
 * ne doit pas pouvoir produire une règle dont la portée ne veut rien dire.
 *
 * Chemin racine propre, pour la même raison qu'ExigenceResource : en JAX-RS
 * la classe retenue est celle dont la racine correspond le mieux, et un
 * sous-chemin déclaré sous un préfixe plus court ne serait jamais atteint.
 */
@Path("/api/v1/referentiels/criteres/{critereId}/regles")
@Produces(MediaType.APPLICATION_JSON)
@Authenticated
public class RegleAnalyseResource {

    @Inject CritereRepository critereRepository;
    @Inject ExigenceRepository exigenceRepository;
    @Inject PreuveAttendueRepository preuveAttendueRepository;
    @Inject RegleAnalyseRepository regleAnalyseRepository;
    @Inject VersionReferentielService versionService;
    @Inject AuditLogService auditLogService;
    @Inject TenantContext tenantContext;

    @GET
    public Response lister(@PathParam("critereId") UUID critereId) {
        trouverCritere(critereId);
        var regles = regleAnalyseRepository.parCritere(critereId).stream()
                .map(RegleAnalyseDto::depuis).toList();
        return Response.ok(regles).build();
    }

    @POST
    @Consumes(MediaType.APPLICATION_JSON)
    @Transactional
    @RolesAllowed("SUPER_ADMIN")
    public Response creer(@PathParam("critereId") UUID critereId,
                          @Valid RegleAnalyseRequestDto.Creation requete) {
        Critere critere = trouverCritere(critereId);
        versionService.exigerVersionModifiable(critere.getReferentielVersion());
        if (requete == null) {
            return erreur(400, "Corps de requête manquant");
        }

        TypeRegleAnalyse type;
        try {
            type = TypeRegleAnalyse.valueOf(requete.type());
        } catch (IllegalArgumentException e) {
            return erreur(400, "Type de règle invalide : " + requete.type());
        }

        String code = requete.code().trim();
        if (regleAnalyseRepository.parCritereEtCode(critereId, code).isPresent()) {
            return erreur(409, "Une règle avec le code '" + code + "' existe déjà pour ce critère");
        }

        Exigence exigence = null;
        PreuveAttendue preuveAttendue = null;
        if (requete.exigenceId() != null) {
            exigence = exigenceRepository.findById(requete.exigenceId());
            if (exigence == null) {
                return erreur(400, "Exigence introuvable : " + requete.exigenceId());
            }
            if (!exigence.getCritere().getId().equals(critereId)) {
                return erreur(400, "L'exigence visée appartient à un autre critère");
            }
        }
        if (requete.preuveAttendueId() != null) {
            if (exigence == null) {
                return erreur(400, "Une règle portant sur une preuve attendue doit aussi nommer son exigence");
            }
            preuveAttendue = preuveAttendueRepository.findById(requete.preuveAttendueId());
            if (preuveAttendue == null) {
                return erreur(400, "Preuve attendue introuvable : " + requete.preuveAttendueId());
            }
            if (!preuveAttendue.getExigence().getId().equals(exigence.getId())) {
                return erreur(400, "La preuve attendue visée appartient à une autre exigence");
            }
        }

        Map<String, Object> definition = requete.definition() == null ? Map.of() : requete.definition();
        try {
            RegleAnalyseValidation.verifier(type, definition);
        } catch (RegleAnalyseValidation.DefinitionInvalideException e) {
            return erreur(400, e.getMessage());
        }

        RegleAnalyse regle = new RegleAnalyse(critere, code, type, requete.libelle());
        regle.setExigence(exigence);
        regle.setPreuveAttendue(preuveAttendue);
        regle.setDefinition(definition);
        regle.setOrdre(requete.ordre() == null
                ? regleAnalyseRepository.parCritere(critereId).size() : requete.ordre());
        if (requete.severite() != null && !requete.severite().isBlank()) {
            try {
                regle.setSeverite(NiveauCriticite.valueOf(requete.severite()));
            } catch (IllegalArgumentException e) {
                return erreur(400, "Sévérité invalide : " + requete.severite()
                        + " (attendu : FAIBLE, MOYENNE, ELEVEE, CRITIQUE)");
            }
        }
        regleAnalyseRepository.persist(regle);

        auditLogService.journaliser(tenantContext.utilisateurCourantId(), null,
                "REGLE_ANALYSE_CREEE", "regle_analyse", regle.getId());

        return Response.status(Response.Status.CREATED).entity(RegleAnalyseDto.depuis(regle)).build();
    }

    private Critere trouverCritere(UUID critereId) {
        Critere critere = critereRepository.findById(critereId);
        if (critere == null) {
            throw new NotFoundException("Critère introuvable : " + critereId);
        }
        return critere;
    }

    private static Response erreur(int statut, String message) {
        return Response.status(statut).entity(new ErreurDto(message)).build();
    }
}

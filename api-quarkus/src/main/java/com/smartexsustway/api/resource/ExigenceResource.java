package com.smartexsustway.api.resource;

import com.smartexsustway.api.audit.AuditLogService;
import com.smartexsustway.api.domain.entity.Critere;
import com.smartexsustway.api.domain.entity.Exigence;
import com.smartexsustway.api.domain.enums.OrigineContenu;
import com.smartexsustway.api.domain.repository.CritereRepository;
import com.smartexsustway.api.domain.repository.ExigenceRepository;
import com.smartexsustway.api.domain.repository.PreuveAttendueRepository;
import com.smartexsustway.api.referentiel.VersionReferentielService;
import com.smartexsustway.api.resource.dto.ErreurDto;
import com.smartexsustway.api.resource.dto.ExigenceDto;
import com.smartexsustway.api.resource.dto.ExigenceRequestDto;
import com.smartexsustway.api.resource.dto.PreuveAttendueDto;
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

import java.util.List;
import java.util.UUID;

/**
 * Exigences d'un critère (module 4, back-office).
 *
 * Lecture ouverte comme le reste du catalogue : savoir ce qu'un critère
 * exige intéresse l'organisation auditée autant que celui qui l'administre.
 * Écriture réservée à SUPER_ADMIN, et refusée dès que la version qui porte
 * le contenu n'est plus un brouillon — la garde est ici pour rendre un 409
 * lisible, mais c'est la base qui l'impose (V53).
 *
 * Le référentiel est commun à toutes les organisations : il n'appartient à
 * aucun tenant, et aucun utilisateur d'entreprise n'y écrit, quel que soit
 * son rattachement.
 *
 * Chemin propre plutôt que sous-chemin de CritereModificationResource : en
 * JAX-RS, la classe retenue est celle dont le chemin racine correspond le
 * mieux, et un sous-chemin déclaré ailleurs sous un préfixe plus court ne
 * serait jamais atteint. Même découpage que CriticiteSecteurResource.
 */
@Path("/api/v1/referentiels/criteres/{critereId}/exigences")
@Produces(MediaType.APPLICATION_JSON)
@Authenticated
public class ExigenceResource {

    @Inject CritereRepository critereRepository;
    @Inject ExigenceRepository exigenceRepository;
    @Inject PreuveAttendueRepository preuveAttendueRepository;
    @Inject VersionReferentielService versionService;
    @Inject AuditLogService auditLogService;
    @Inject TenantContext tenantContext;

    // --- Exigences -----------------------------------------------------

    @GET
    public Response lister(@PathParam("critereId") UUID critereId) {
        trouverCritere(critereId);
        var exigences = exigenceRepository.parCritere(critereId).stream()
                .map(e -> ExigenceDto.depuis(e, preuvesAttendues(e.getId())))
                .toList();
        return Response.ok(exigences).build();
    }

    @POST
    @Consumes(MediaType.APPLICATION_JSON)
    @Transactional
    @RolesAllowed("SUPER_ADMIN")
    public Response creer(@PathParam("critereId") UUID critereId,
                          @Valid ExigenceRequestDto.Creation requete) {
        Critere critere = trouverCritere(critereId);
        versionService.exigerVersionModifiable(critere.getReferentielVersion());
        if (requete == null) {
            return erreur(400, "Corps de requête manquant");
        }

        // Le code sert à désigner l'exigence dans les règles et dans le
        // contexte soumis aux agents : on en attribue un à défaut plutôt
        // que de laisser l'exigence anonyme.
        String code = requete.code() == null || requete.code().isBlank()
                ? codeSuivant(critere)
                : requete.code().trim();
        if (exigenceRepository.parCritereEtCode(critereId, code).isPresent()) {
            return erreur(409, "Une exigence avec le code '" + code + "' existe déjà pour ce critère");
        }

        Exigence exigence = new Exigence(critere, code, requete.intitule(), requete.enonce());
        exigence.setOrdre(requete.ordre() == null ? exigenceRepository.parCritere(critereId).size() : requete.ordre());
        // Rédigée par une personne, donc distincte des exigences reprises
        // du libellé du critère par l'initialisation.
        exigence.setOrigine(OrigineContenu.CONTENU_HUMAIN);
        exigenceRepository.persist(exigence);

        auditLogService.journaliser(tenantContext.utilisateurCourantId(), null,
                "EXIGENCE_CREEE", "exigence", exigence.getId());

        return Response.status(Response.Status.CREATED)
                .entity(ExigenceDto.depuis(exigence, List.of())).build();
    }

    // --- Outils ---------------------------------------------------------

    private List<PreuveAttendueDto> preuvesAttendues(UUID exigenceId) {
        return preuveAttendueRepository.parExigence(exigenceId).stream()
                .map(PreuveAttendueDto::depuis).toList();
    }

    /** Code libre suivant pour ce critère, sur le modèle {@code D1-01-E2}. */
    private String codeSuivant(Critere critere) {
        int rang = exigenceRepository.parCritere(critere.getId()).size() + 1;
        String candidat = critere.getCode() + "-E" + rang;
        while (exigenceRepository.parCritereEtCode(critere.getId(), candidat).isPresent()) {
            rang++;
            candidat = critere.getCode() + "-E" + rang;
        }
        return candidat;
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

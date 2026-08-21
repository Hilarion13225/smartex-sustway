package com.smartexsustway.api.resource;

import com.smartexsustway.api.domain.entity.Criticite;
import com.smartexsustway.api.domain.entity.Critere;
import com.smartexsustway.api.domain.entity.Secteur;
import com.smartexsustway.api.domain.enums.NiveauCriticite;
import com.smartexsustway.api.domain.repository.CriticiteRepository;
import com.smartexsustway.api.domain.repository.CriticiteSecteurRepository;
import com.smartexsustway.api.domain.repository.CritereRepository;
import com.smartexsustway.api.domain.repository.SecteurRepository;
import com.smartexsustway.api.resource.dto.CriticiteSecteurDto;
import com.smartexsustway.api.resource.dto.DefinirCriticiteSecteurRequestDto;
import com.smartexsustway.api.resource.dto.ErreurDto;
import io.quarkus.security.Authenticated;
import jakarta.annotation.security.RolesAllowed;
import jakarta.inject.Inject;
import jakarta.ws.rs.Consumes;
import jakarta.ws.rs.DELETE;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.NotFoundException;
import jakarta.ws.rs.PUT;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.PathParam;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;

import java.util.List;
import java.util.UUID;

/**
 * RG37 (CDC §7, Phase F) : administration des surcharges de criticité par
 * secteur d'activité — back-office minimal, réservé à SUPER_ADMIN. Sans
 * cette ressource, la table critere_criticite_secteur resterait toujours
 * vide et RG37 ne serait jamais démontrable en conditions réelles, même
 * si la logique de résolution (QuestionnaireService.criticiteEffective)
 * est correcte.
 *
 * Volontairement limité à ce seul CRUD d'override : la création/édition
 * de référentiels, domaines et critères eux-mêmes (back-office complet,
 * module 4) reste un lot distinct, non couvert ici.
 */
@Path("/api/v1/referentiels/criteres/{critereId}/criticite-secteur")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
@Authenticated
public class CriticiteSecteurResource {

    @Inject CritereRepository critereRepository;
    @Inject SecteurRepository secteurRepository;
    @Inject CriticiteRepository criticiteRepository;
    @Inject CriticiteSecteurRepository criticiteSecteurRepository;

    @GET
    @RolesAllowed({"SUPER_ADMIN", "ADMIN_AUDIT"})
    public Response lister(@PathParam("critereId") UUID critereId) {
        trouverCritere(critereId);

        List<CriticiteSecteurDto> resultat = criticiteSecteurRepository.listerPourCritere(critereId).stream()
                .map(this::versDto)
                .toList();
        return Response.ok(resultat).build();
    }

    @PUT
    @RolesAllowed("SUPER_ADMIN")
    public Response definir(@PathParam("critereId") UUID critereId, DefinirCriticiteSecteurRequestDto requete) {
        trouverCritere(critereId);

        if (requete == null || requete.secteurCode() == null || requete.criticiteCode() == null) {
            return erreur(400, "secteurCode et criticiteCode sont requis");
        }

        Secteur secteur = secteurRepository.parCode(requete.secteurCode())
                .orElseThrow(() -> new NotFoundException("Secteur inconnu : " + requete.secteurCode()));

        NiveauCriticite niveau;
        try {
            niveau = NiveauCriticite.valueOf(requete.criticiteCode());
        } catch (IllegalArgumentException e) {
            return erreur(400, "Code de criticité invalide : " + requete.criticiteCode()
                    + " (attendu : FAIBLE, MOYENNE, ELEVEE, CRITIQUE)");
        }
        Criticite criticite = criticiteRepository.parCode(niveau)
                .orElseThrow(() -> new NotFoundException("Criticité inconnue : " + requete.criticiteCode()));

        criticiteSecteurRepository.definir(critereId, secteur.getId(), criticite.getId());

        return Response.ok(new CriticiteSecteurDto(
                secteur.getCode(), secteur.getNom(), criticite.getCode().name(), criticite.getLibelle()
        )).build();
    }

    @DELETE
    @Path("/{secteurCode}")
    @RolesAllowed("SUPER_ADMIN")
    public Response supprimer(@PathParam("critereId") UUID critereId, @PathParam("secteurCode") String secteurCode) {
        trouverCritere(critereId);
        Secteur secteur = secteurRepository.parCode(secteurCode)
                .orElseThrow(() -> new NotFoundException("Secteur inconnu : " + secteurCode));

        criticiteSecteurRepository.supprimer(critereId, secteur.getId());
        return Response.noContent().build();
    }

    private Critere trouverCritere(UUID critereId) {
        Critere critere = critereRepository.findById(critereId);
        if (critere == null) {
            throw new NotFoundException("Critère introuvable : " + critereId);
        }
        return critere;
    }

    private CriticiteSecteurDto versDto(Object[] ligne) {
        UUID secteurId = UUID.fromString((String) ligne[0]);
        UUID criticiteId = UUID.fromString((String) ligne[1]);
        Secteur secteur = secteurRepository.findById(secteurId);
        Criticite criticite = criticiteRepository.findById(criticiteId);
        return new CriticiteSecteurDto(
                secteur == null ? null : secteur.getCode(),
                secteur == null ? null : secteur.getNom(),
                criticite == null ? null : criticite.getCode().name(),
                criticite == null ? null : criticite.getLibelle()
        );
    }

    private static Response erreur(int statut, String message) {
        return Response.status(statut).entity(new ErreurDto(message)).build();
    }
}

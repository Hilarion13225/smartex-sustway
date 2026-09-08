package com.smartexsustway.api.resource;

import com.smartexsustway.api.domain.entity.Critere;
import com.smartexsustway.api.domain.entity.Secteur;
import com.smartexsustway.api.domain.repository.CoefficientSecteurRepository;
import com.smartexsustway.api.domain.repository.CritereRepository;
import com.smartexsustway.api.domain.repository.SecteurRepository;
import com.smartexsustway.api.resource.dto.CoefficientSecteurDto;
import com.smartexsustway.api.resource.dto.DefinirCoefficientSecteurRequestDto;
import com.smartexsustway.api.resource.dto.ErreurDto;
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

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

/**
 * Administration des pondérations sectorielles d'un critère.
 *
 * Le coefficient entre dans la note (RG31 : note = niveau × coefficient) et
 * détermine donc combien un critère compte dans le score. Le faire varier
 * par secteur est ce qui permet d'affirmer qu'un critère « compte plus »
 * pour un métier — la criticité sectorielle, elle, ne joue que sur la
 * priorité des écarts constatés.
 *
 * Seules les exceptions sont saisies : sans ligne pour un secteur, le
 * critère garde le coefficient de sa grille.
 */
@Path("/api/v1/referentiels/criteres/{critereId}/coefficient-secteur")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
@RolesAllowed({"SUPER_ADMIN", "ADMIN_AUDIT"})
public class CoefficientSecteurResource {

    /** Mêmes bornes que la contrainte CHECK de critere_coefficient_secteur. */
    private static final BigDecimal MINIMUM = BigDecimal.ONE;
    private static final BigDecimal MAXIMUM = BigDecimal.valueOf(3);

    @Inject CritereRepository critereRepository;
    @Inject SecteurRepository secteurRepository;
    @Inject CoefficientSecteurRepository coefficientSecteurRepository;

    @GET
    public Response lister(@PathParam("critereId") UUID critereId) {
        trouverCritere(critereId);

        List<CoefficientSecteurDto> resultat = coefficientSecteurRepository.listerPourCritere(critereId).stream()
                .map(this::versDto)
                .toList();
        return Response.ok(resultat).build();
    }

    @PUT
    public Response definir(@PathParam("critereId") UUID critereId,
                            DefinirCoefficientSecteurRequestDto requete) {
        trouverCritere(critereId);

        if (requete == null || requete.secteurCode() == null || requete.coefficient() == null) {
            return erreur(400, "secteurCode et coefficient sont requis");
        }
        if (requete.coefficient().compareTo(MINIMUM) < 0 || requete.coefficient().compareTo(MAXIMUM) > 0) {
            return erreur(400, "Le coefficient doit être compris entre 1 et 3");
        }

        Secteur secteur = secteurRepository.parCode(requete.secteurCode())
                .orElseThrow(() -> new NotFoundException("Secteur inconnu : " + requete.secteurCode()));

        coefficientSecteurRepository.definir(critereId, secteur.getId(), requete.coefficient());

        return Response.ok(new CoefficientSecteurDto(
                secteur.getCode(), secteur.getNom(), requete.coefficient()
        )).build();
    }

    @DELETE
    @Path("/{secteurCode}")
    public Response supprimer(@PathParam("critereId") UUID critereId,
                              @PathParam("secteurCode") String secteurCode) {
        trouverCritere(critereId);
        Secteur secteur = secteurRepository.parCode(secteurCode)
                .orElseThrow(() -> new NotFoundException("Secteur inconnu : " + secteurCode));

        coefficientSecteurRepository.supprimer(critereId, secteur.getId());
        return Response.noContent().build();
    }

    private Critere trouverCritere(UUID critereId) {
        Critere critere = critereRepository.findById(critereId);
        if (critere == null) {
            throw new NotFoundException("Critère introuvable : " + critereId);
        }
        return critere;
    }

    private CoefficientSecteurDto versDto(Object[] ligne) {
        Secteur secteur = secteurRepository.findById(UUID.fromString((String) ligne[0]));
        return new CoefficientSecteurDto(
                secteur == null ? null : secteur.getCode(),
                secteur == null ? null : secteur.getNom(),
                (BigDecimal) ligne[1]
        );
    }

    private static Response erreur(int statut, String message) {
        return Response.status(statut).entity(new ErreurDto(message)).build();
    }
}

package com.smartexsustway.api.resource;

import com.smartexsustway.api.domain.entity.Secteur;
import com.smartexsustway.api.domain.repository.ScoreHistoriqueRepository;
import com.smartexsustway.api.domain.repository.SecteurRepository;
import com.smartexsustway.api.resource.dto.SecteurBenchmarkDto;
import com.smartexsustway.api.resource.dto.SecteurDto;
import io.quarkus.security.Authenticated;
import jakarta.inject.Inject;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.NotFoundException;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.PathParam;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;

import java.math.BigDecimal;

/**
 * {@link #lister} est en lecture seule, volontairement PUBLIQUE (pas de
 * @Authenticated) : la liste des secteurs est nécessaire dès le formulaire
 * d'inscription, avant toute connexion (CDC §5.4 — composition du
 * questionnaire selon secteur/taille/statut). {@link #benchmark} agrège de
 * vraies données clientes (même anonymisées) et reste donc réservé aux
 * comptes connectés.
 */
@Path("/api/v1/secteurs")
@Produces(MediaType.APPLICATION_JSON)
public class SecteurResource {

    /** k-anonymat : sous ce nombre d'entreprises scorées, la moyenne sectorielle n'est jamais renvoyée (voir SecteurBenchmarkDto). */
    private static final long SEUIL_K_ANONYMAT = 5;

    @Inject SecteurRepository secteurRepository;
    @Inject ScoreHistoriqueRepository scoreHistoriqueRepository;

    @GET
    public Response lister() {
        var secteurs = secteurRepository.listAll().stream().map(SecteurDto::depuis).toList();
        return Response.ok(secteurs).build();
    }

    @GET
    @Path("/{code}/benchmark")
    @Authenticated
    public Response benchmark(@PathParam("code") String code) {
        Secteur secteur = secteurRepository.parCode(code)
                .orElseThrow(() -> new NotFoundException("Secteur inconnu : " + code));

        Object[] resultat = scoreHistoriqueRepository.moyenneParSecteur(secteur.getId());
        long nombreEntreprises = ((Number) resultat[0]).longValue();
        BigDecimal moyenne = nombreEntreprises >= SEUIL_K_ANONYMAT && resultat[1] != null
                ? new BigDecimal(resultat[1].toString()).setScale(2, java.math.RoundingMode.HALF_UP)
                : null;

        return Response.ok(new SecteurBenchmarkDto(code, nombreEntreprises, moyenne)).build();
    }
}

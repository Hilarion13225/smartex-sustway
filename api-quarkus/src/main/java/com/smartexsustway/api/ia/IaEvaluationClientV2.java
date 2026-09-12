package com.smartexsustway.api.ia;

import com.smartexsustway.api.ia.contrat.EnveloppeV2Dto;
import com.smartexsustway.api.ia.contrat.EvaluerCritereRequestV2;
import jakarta.ws.rs.Consumes;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.MediaType;
import org.eclipse.microprofile.rest.client.annotation.RegisterClientHeaders;
import org.eclipse.microprofile.rest.client.inject.RegisterRestClient;

/**
 * Appel du pipeline V2, en parallèle du client V1 et non à sa place.
 *
 * <p>Les deux coexistent le temps que le produit bascule : supprimer le V1
 * avant que le V2 ne soit éprouvé en conditions réelles retirerait le seul
 * chemin qui fonctionne aujourd'hui.
 *
 * <p>Deux routes distinctes côté service d'agents, et la distinction
 * compte : {@code /critere} valide un contexte sans rien consommer,
 * {@code /critere/executer} appelle réellement les agents. C'est la seconde
 * qui est câblée ici.
 *
 * <p>Même en-tête de service que le client V1 — un jeton signé, à durée
 * courte, dont le service d'agents vérifie la signature.
 */
@RegisterRestClient(configKey = "services-ia")
@RegisterClientHeaders(EnteteServiceIaFactory.class)
@Path("/api/v2/evaluations")
@Consumes(MediaType.APPLICATION_JSON)
@Produces(MediaType.APPLICATION_JSON)
public interface IaEvaluationClientV2 {

    @POST
    @Path("/critere/executer")
    EnveloppeV2Dto executerCritere(EvaluerCritereRequestV2 requete);
}

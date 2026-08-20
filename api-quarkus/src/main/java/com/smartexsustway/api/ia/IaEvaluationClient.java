package com.smartexsustway.api.ia;

import jakarta.ws.rs.Consumes;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.MediaType;
import org.eclipse.microprofile.rest.client.inject.RegisterRestClient;

/**
 * Communication Quarkus vers services-ia-python : REST synchrone (décision
 * actée, CDC §13). URL configurée via la clé "services-ia" (voir
 * application.properties — SMARTEX_IA_SERVICE_URL déjà présente dans
 * docker-compose.yml depuis la phase A).
 */
@RegisterRestClient(configKey = "services-ia")
@Path("/api/v1/evaluations")
@Consumes(MediaType.APPLICATION_JSON)
@Produces(MediaType.APPLICATION_JSON)
public interface IaEvaluationClient {

    @POST
    @Path("/critere")
    EvaluerCritereResponseDto evaluerCritere(EvaluerCritereRequestDto requete);
}

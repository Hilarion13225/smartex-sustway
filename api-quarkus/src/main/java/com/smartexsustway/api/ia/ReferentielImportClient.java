package com.smartexsustway.api.ia;

import jakarta.ws.rs.Consumes;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.MediaType;
import org.eclipse.microprofile.rest.client.annotation.RegisterClientHeaders;
import org.eclipse.microprofile.rest.client.inject.RegisterRestClient;

/**
 * Appel du service d'agents pour extraire la structure d'un référentiel.
 *
 * Client distinct de {@link IaEvaluationClient}, comme les deux pipelines le
 * sont côté Python : lire un cadre d'audit et juger une organisation au regard
 * d'un critère n'ont ni le même contrat ni les mêmes délais. Les réunir
 * obligerait à choisir un unique temps de réponse pour deux usages qui n'ont
 * rien à voir.
 *
 * Le contenu du fichier voyage dans la requête, comme pour les pièces d'audit.
 * Le service d'agents n'a aujourd'hui aucun accès au stockage objet — ni
 * identifiants, ni client configuré — et lui en donner serait une décision de
 * sécurité à part entière, pas un effet de bord de cette intégration.
 */
@RegisterRestClient(configKey = "services-ia-import")
@RegisterClientHeaders(EnteteServiceIaFactory.class)
@Path("/api/v1/referentiels/imports")
@Consumes(MediaType.APPLICATION_JSON)
@Produces(MediaType.APPLICATION_JSON)
public interface ReferentielImportClient {

    @POST
    @Path("/extraction")
    ExtractionReferentielResponseDto extraire(ExtractionReferentielRequestDto requete);
}

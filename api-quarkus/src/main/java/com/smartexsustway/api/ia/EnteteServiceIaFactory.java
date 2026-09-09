package com.smartexsustway.api.ia;

import com.smartexsustway.api.security.JwtService;
import io.quarkus.arc.Arc;
import jakarta.ws.rs.core.MultivaluedMap;
import org.eclipse.microprofile.rest.client.ext.ClientHeadersFactory;

/**
 * Pose le jeton de service sur chaque appel sortant vers le service d'agents.
 *
 * Le jeton est fabriqué à l'appel, jamais mis en cache : il vit quelques
 * minutes, et un jeton conservé plus longtemps que sa validité ne ferait que
 * produire des refus difficiles à comprendre.
 *
 * Les jetons entrants ne sont pas propagés. Le service d'agents n'a rien à
 * faire de l'identité de l'utilisateur qui a déclenché l'analyse — il ne
 * décide d'aucun droit — et lui transmettre un jeton de session étendrait sa
 * portée sans nécessité.
 */
public class EnteteServiceIaFactory implements ClientHeadersFactory {

    @Override
    public MultivaluedMap<String, String> update(MultivaluedMap<String, String> entrantes,
                                                 MultivaluedMap<String, String> sortantes) {
        // Le client REST est instancié hors du conteneur CDI par MicroProfile :
        // le service de jetons est donc récupéré explicitement plutôt
        // qu'injecté.
        JwtService jwtService = Arc.container().instance(JwtService.class).get();
        sortantes.add("Authorization", "Bearer " + jwtService.genererTokenServiceIa());
        return sortantes;
    }
}

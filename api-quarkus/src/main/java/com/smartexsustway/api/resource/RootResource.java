package com.smartexsustway.api.resource;

import jakarta.ws.rs.GET;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.MediaType;

import java.util.Map;

/**
 * Endpoint racine — sert de point de vérification rapide que l'API répond.
 * La logique métier (modules 1 à 12 du CDC) est implémentée à partir de la phase B.
 */
@Path("/api/v1")
public class RootResource {

    @GET
    @Produces(MediaType.APPLICATION_JSON)
    public Map<String, Object> racine() {
        return Map.of(
                "application", "SMARTEX SustWay — API",
                "version", "0.1.0-SNAPSHOT",
                "statut", "Phase A — fondations"
        );
    }
}

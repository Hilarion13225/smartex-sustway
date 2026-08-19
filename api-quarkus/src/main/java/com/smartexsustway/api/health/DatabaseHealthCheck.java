package com.smartexsustway.api.health;

import io.agroal.api.AgroalDataSource;
import org.eclipse.microprofile.health.HealthCheck;
import org.eclipse.microprofile.health.HealthCheckResponse;
import org.eclipse.microprofile.health.Readiness;

import jakarta.inject.Inject;
import java.sql.Connection;

/**
 * Vérifie que la connexion à PostgreSQL est opérationnelle.
 * Exposé sur /q/health/ready aux côtés des healthchecks intégrés de Quarkus.
 */
@Readiness
public class DatabaseHealthCheck implements HealthCheck {

    @Inject
    AgroalDataSource dataSource;

    @Override
    public HealthCheckResponse call() {
        try (Connection ignored = dataSource.getConnection()) {
            return HealthCheckResponse.up("database-connection");
        } catch (Exception e) {
            return HealthCheckResponse.down("database-connection");
        }
    }
}

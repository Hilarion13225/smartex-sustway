package com.smartexsustway.api.domain.repository;

import com.smartexsustway.api.domain.entity.ExecutionAgent;
import io.quarkus.hibernate.orm.panache.PanacheRepositoryBase;
import jakarta.enterprise.context.ApplicationScoped;

import java.util.List;
import java.util.UUID;

/**
 * Appels au fournisseur de modèle.
 *
 * <p>Le grain est l'appel, pas l'agent : un même agent peut apparaître
 * plusieurs fois dans une passe — le Document Agent effectue un appel par
 * pièce. Aucune méthode ne suppose l'unicité d'un agent par passe.
 */
@ApplicationScoped
public class ExecutionAgentRepository implements PanacheRepositoryBase<ExecutionAgent, UUID> {

    /** Les appels d'une passe, dans leur ordre chronologique réel. */
    public List<ExecutionAgent> parAnalyse(UUID analyseIaId) {
        return list("analyseIa.id = ?1 order by dateDebut asc, id asc", analyseIaId);
    }

    /** Isolation multi-tenant : remonte jusqu'à la mission par la passe. */
    public List<ExecutionAgent> parAnalyseEtAudit(UUID analyseIaId, UUID auditId) {
        return list("analyseIa.id = ?1 and analyseIa.audit.id = ?2 order by dateDebut asc, id asc",
                analyseIaId, auditId);
    }
}

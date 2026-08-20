package com.smartexsustway.api.domain.repository;

import com.smartexsustway.api.domain.entity.Critere;
import com.smartexsustway.api.domain.entity.Referentiel;
import com.smartexsustway.api.domain.enums.TypeApplicabilite;
import io.quarkus.hibernate.orm.panache.PanacheRepositoryBase;
import jakarta.enterprise.context.ApplicationScoped;

import java.util.List;
import java.util.UUID;

@ApplicationScoped
public class CritereRepository implements PanacheRepositoryBase<Critere, UUID> {

    public List<Critere> parReferentiel(UUID referentielId) {
        return list("domaine.referentiel.id = ?1 and actif = true order by domaine.ordre, code", referentielId);
    }

    /**
     * RG34 — composition dynamique du questionnaire. Voir QuestionnaireService
     * pour le contexte complet (secteur non encore pris en compte, phase F).
     */
    public List<Critere> applicables(Referentiel referentiel, TypeApplicabilite applicabilite) {
        return list("domaine.referentiel = ?1 and actif = true and applicabilite = ?2 order by domaine.ordre, code",
                referentiel, applicabilite);
    }
}

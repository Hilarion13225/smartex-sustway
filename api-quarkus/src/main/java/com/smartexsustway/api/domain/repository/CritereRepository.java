package com.smartexsustway.api.domain.repository;

import com.smartexsustway.api.domain.entity.Critere;
import com.smartexsustway.api.domain.entity.Referentiel;
import com.smartexsustway.api.domain.enums.TypeApplicabilite;
import io.quarkus.hibernate.orm.panache.PanacheRepositoryBase;
import jakarta.enterprise.context.ApplicationScoped;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@ApplicationScoped
public class CritereRepository implements PanacheRepositoryBase<Critere, UUID> {

    /**
     * RG14 (back-office, module 4) : renvoie aussi les critères désactivés
     * — un SUPER_ADMIN doit pouvoir les retrouver pour les réactiver. Seul
     * consommateur de cette méthode : ReferentielResource.criteres(), pas
     * la composition de questionnaire (voir {@link #applicables}, qui
     * filtre bien sur actif=true).
     */
    public List<Critere> parReferentiel(UUID referentielId) {
        return list("domaine.referentiel.id = ?1 order by domaine.ordre, code", referentielId);
    }

    /** Le code d'un critère est unique par domaine (contrainte {@code critere_domaine_id_code_key}). */
    public Optional<Critere> parDomaineEtCode(UUID domaineId, String code) {
        return find("domaine.id = ?1 and code = ?2", domaineId, code).firstResultOptional();
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

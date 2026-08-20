package com.smartexsustway.api.referentiel;

import com.smartexsustway.api.domain.entity.Critere;
import com.smartexsustway.api.domain.entity.Entreprise;
import com.smartexsustway.api.domain.entity.Referentiel;
import com.smartexsustway.api.domain.enums.TypeApplicabilite;
import com.smartexsustway.api.domain.repository.CritereRepository;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;

import java.util.List;

/**
 * RG34 — composition dynamique du questionnaire d'audit selon le profil
 * de l'entreprise (secteur, taille, statut) : "le questionnaire d'un audit
 * est composé dynamiquement à partir des critères applicables au profil
 * de l'entreprise".
 *
 * État actuel (phase D, sous-lot 1) : seuls les critères d'applicabilité
 * GENERALE sont retenus. Le filtrage sectoriel (table CRITERE_SECTEUR) et
 * bailleur (CRITERE_BAILLEUR) ne sont PAS encore actifs, faute de données
 * — leur mapping est un livrable des experts métier / du back-office
 * (phase F, CDC §7.7 pour le volet bailleur). La méthode composer() est
 * l'unique point d'entrée de cette logique dans toute l'application
 * (AuditResource et l'endpoint de prévisualisation l'utilisent tous les
 * deux) : le jour où le filtrage sectoriel sera implémenté, il n'y aura
 * qu'un seul endroit à modifier.
 */
@ApplicationScoped
public class QuestionnaireService {

    @Inject
    CritereRepository critereRepository;

    public List<Critere> composer(Entreprise entreprise, Referentiel referentiel) {
        // Le paramètre 'entreprise' n'est pas encore utilisé (pas de filtrage
        // sectoriel actif) mais fait partie de la signature dès maintenant :
        // RG34 le nécessitera dès que CRITERE_SECTEUR sera peuplé, sans casser
        // les appelants de cette méthode.
        return critereRepository.applicables(referentiel, TypeApplicabilite.GENERALE);
    }
}

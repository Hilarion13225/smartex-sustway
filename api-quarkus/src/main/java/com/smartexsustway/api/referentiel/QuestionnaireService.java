package com.smartexsustway.api.referentiel;

import com.smartexsustway.api.domain.entity.Critere;
import com.smartexsustway.api.domain.entity.Criticite;
import com.smartexsustway.api.domain.entity.Entreprise;
import com.smartexsustway.api.domain.entity.Referentiel;
import com.smartexsustway.api.domain.enums.TypeApplicabilite;
import com.smartexsustway.api.domain.repository.CriticiteRepository;
import com.smartexsustway.api.domain.repository.CriticiteSecteurRepository;
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
 * État actuel (phase F) : le filtrage sectoriel (quels critères
 * s'appliquent à quel secteur, table CRITERE_SECTEUR) et le filtrage
 * bailleur (CRITERE_BAILLEUR) ne sont PAS encore actifs, faute de données
 * — leur mapping est un livrable des experts métier / du back-office
 * (CDC §7.7 pour le volet bailleur). composer() continue donc à ne
 * retenir que les critères GENERALE, comme en phase D.
 *
 * En revanche, RG37 (criticité variable par secteur) EST actif depuis
 * cette phase : criticiteEffective() résout la criticité applicable à un
 * critère donné pour le secteur de l'entreprise auditée, en tenant compte
 * d'une éventuelle surcharge sectorielle (CRITERE_CRITICITE_SECTEUR),
 * avant repli sur la criticité générale du critère.
 */
@ApplicationScoped
public class QuestionnaireService {

    @Inject
    CritereRepository critereRepository;

    @Inject
    CriticiteSecteurRepository criticiteSecteurRepository;

    @Inject
    CriticiteRepository criticiteRepository;

    public List<Critere> composer(Entreprise entreprise, Referentiel referentiel) {
        // Le paramètre 'entreprise' n'est pas encore utilisé pour le filtrage
        // sectoriel (voir javadoc de classe) mais fait partie de la signature
        // dès maintenant : RG34 le nécessitera dès que CRITERE_SECTEUR sera
        // peuplé, sans casser les appelants de cette méthode.
        return critereRepository.applicables(referentiel, TypeApplicabilite.GENERALE);
    }

    /**
     * RG37 — criticité effective d'un critère pour l'entreprise auditée :
     * surcharge sectorielle si elle existe (CRITERE_CRITICITE_SECTEUR),
     * sinon criticité générale du critère (comportement identique à avant
     * cette phase si l'entreprise n'a pas de secteur renseigné, ou si
     * aucune surcharge n'a été définie pour ce couple critère/secteur).
     */
    public Criticite criticiteEffective(Critere critere, Entreprise entreprise) {
        if (entreprise.getSecteur() != null) {
            var criticiteIdSurchargee = criticiteSecteurRepository.criticiteIdPourSecteur(
                    critere.getId(), entreprise.getSecteur().getId());
            if (criticiteIdSurchargee.isPresent()) {
                Criticite criticiteSurchargee = criticiteRepository.findById(criticiteIdSurchargee.get());
                if (criticiteSurchargee != null) {
                    return criticiteSurchargee;
                }
            }
        }
        return critere.getCriticite();
    }
}

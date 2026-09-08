package com.smartexsustway.api.referentiel;

import com.smartexsustway.api.domain.entity.Critere;
import com.smartexsustway.api.domain.entity.Criticite;
import com.smartexsustway.api.domain.entity.Entreprise;
import com.smartexsustway.api.domain.entity.ReferentielVersion;
import com.smartexsustway.api.domain.enums.TypeApplicabilite;
import com.smartexsustway.api.domain.repository.CoefficientSecteurRepository;
import com.smartexsustway.api.domain.repository.CriticiteRepository;
import com.smartexsustway.api.domain.repository.CriticiteSecteurRepository;
import com.smartexsustway.api.domain.repository.CritereRepository;
import com.smartexsustway.api.domain.repository.CritereSecteurRepository;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;

import java.math.BigDecimal;
import java.util.Comparator;
import java.util.List;
import java.util.Set;
import java.util.stream.Stream;

/**
 * RG34 — composition dynamique du questionnaire d'audit selon le profil
 * de l'entreprise (secteur, taille, statut) : "le questionnaire d'un audit
 * est composé dynamiquement à partir des critères applicables au profil
 * de l'entreprise".
 *
 * Le filtrage sectoriel est actif : un critère GENERALE est posé à toutes
 * les organisations, un critère SECTORIELLE seulement à celles dont le
 * secteur y est rattaché (CRITERE_SECTEUR). Poser la gestion des rejets
 * industriels à une société de services n'a pas d'objet — la pondération
 * sectorielle ne suffit pas là où il faut ne pas poser la question du tout.
 *
 * L'applicabilité BAILLEUR reste sans effet : rien ne relie aujourd'hui une
 * organisation à un bailleur, la question « ce critère la concerne-t-elle ? »
 * n'a donc pas de réponse. La table CRITERE_BAILLEUR existe mais sert un
 * autre usage — quels critères comptent dans l'indice de préparation d'un
 * bailleur (voir IndicePreparationService). Un critère marqué BAILLEUR est
 * donc exclu des questionnaires, ce que l'écran d'administration signale.
 *
 * RG37 (criticité et pondération variables par secteur) est actif :
 * criticiteEffective() et coefficientEffectif() résolvent la valeur
 * applicable au secteur de l'organisation auditée avant repli sur celle du
 * critère.
 */
@ApplicationScoped
public class QuestionnaireService {

    @Inject
    CritereRepository critereRepository;

    @Inject
    CriticiteSecteurRepository criticiteSecteurRepository;

    @Inject
    CriticiteRepository criticiteRepository;

    @Inject
    CoefficientSecteurRepository coefficientSecteurRepository;

    @Inject
    CritereSecteurRepository critereSecteurRepository;

    /**
     * Compose le questionnaire d'une mission : les critères généraux, plus
     * ceux réservés au secteur de l'organisation auditée.
     *
     * La composition part d'une version précise du référentiel, jamais du
     * référentiel entier : depuis V47 son contenu appartient à une version, et
     * plusieurs versions coexistent.
     *
     * L'ordre du référentiel est conservé — domaine puis code — pour que la
     * saisie suive la structure de la grille et non l'ordre d'assemblage.
     */
    public List<Critere> composer(Entreprise entreprise, ReferentielVersion version) {
        List<Critere> generaux = critereRepository.applicables(version, TypeApplicabilite.GENERALE);

        if (entreprise.getSecteur() == null) {
            // Sans secteur renseigné, aucun critère sectoriel ne peut être
            // rattaché : l'organisation ne reçoit que le tronc commun.
            return generaux;
        }

        var idsDuSecteur = Set.copyOf(
                critereSecteurRepository.critereIdsApplicablesAuSecteur(entreprise.getSecteur().getId()));
        if (idsDuSecteur.isEmpty()) {
            return generaux;
        }

        List<Critere> sectoriels = critereRepository
                .applicables(version, TypeApplicabilite.SECTORIELLE).stream()
                .filter(critere -> idsDuSecteur.contains(critere.getId()))
                .toList();
        if (sectoriels.isEmpty()) {
            return generaux;
        }

        return Stream.concat(generaux.stream(), sectoriels.stream())
                .sorted(Comparator
                        .comparingInt((Critere c) -> c.getDomaine().getOrdre())
                        .thenComparing(Critere::getCode))
                .toList();
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

    /**
     * Coefficient de pondération applicable au critère pour le secteur de
     * l'entreprise auditée, avec repli sur celui de la grille.
     *
     * Un critère ne pèse pas partout le même poids : la gestion des déchets
     * dangereux est déterminante pour une mine, marginale pour une société
     * de services. Le coefficient entrant dans la note (RG31), cette
     * résolution est ce qui rend la pondération réellement sectorielle —
     * là où la criticité, elle, ne joue que sur la priorité des écarts.
     *
     * Seules les exceptions sont stockées : un critère sans surcharge pour
     * ce secteur garde le coefficient de sa grille.
     */
    public BigDecimal coefficientEffectif(Critere critere, Entreprise entreprise) {
        if (entreprise.getSecteur() != null) {
            var surcharge = coefficientSecteurRepository.coefficientPourSecteur(
                    critere.getId(), entreprise.getSecteur().getId());
            if (surcharge.isPresent()) {
                return surcharge.get();
            }
        }
        return critere.getCoefficientPonderation();
    }
}

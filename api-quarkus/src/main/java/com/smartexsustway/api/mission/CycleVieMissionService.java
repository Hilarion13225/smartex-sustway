package com.smartexsustway.api.mission;

import com.smartexsustway.api.domain.entity.Audit;
import com.smartexsustway.api.domain.enums.StatutAudit;
import jakarta.enterprise.context.ApplicationScoped;
import org.jboss.logging.Logger;

/**
 * Les transitions non terminales d'une mission.
 *
 * Ce service existe pour une raison précise : le passage d'une mission à
 * l'état de travail vivait jusqu'ici dans {@code ScoreHistoriqueService},
 * greffé à l'enregistrement d'un instantané de score. Un service dont le nom
 * annonce un instantané ne devrait pas décider du cycle de vie d'une mission,
 * et c'est par cette porte que l'analyse pouvait clôturer une mission sans
 * détenir la permission de le faire.
 *
 * Ce qui est ici et ce qui n'y est pas :
 *
 * <pre>
 *   BROUILLON ──(première évaluation)──> EN_COURS      ← ce service
 *   EN_COURS  ──(clôture explicite)────> TERMINE       ← ClotureMissionService
 * </pre>
 *
 * {@code TERMINE} n'est jamais écrit ici, et ne doit jamais l'être : c'est un
 * état terminal, il se décide et se journalise. Une mission dont les 92
 * critères sont analysés reste {@code EN_COURS} — entièrement instruite,
 * mais pas close. C'est d'ailleurs ce que l'écran des missions appelle « à
 * valider ».
 *
 * {@code ANNULE} n'est pas traité : aucun chemin ne l'atteint aujourd'hui, et
 * lui en ouvrir un serait une décision produit, pas une conséquence de ce
 * découpage.
 */
@ApplicationScoped
public class CycleVieMissionService {

    private static final Logger LOG = Logger.getLogger(CycleVieMissionService.class);

    /**
     * Constate qu'une mission a commencé.
     *
     * Appelé depuis le flux d'évaluation, une fois l'évaluation écrite : à ce
     * moment la mission porte au moins un critère instruit, et rester en
     * brouillon ne décrirait plus rien. Inutile de recompter — l'appelant
     * vient d'en produire une.
     *
     * L'entité est gérée par la transaction de l'appelant : la mutation part
     * au flush, sans persist explicite. Aucun autre statut n'est touché, y
     * compris les états terminaux.
     */
    public void constaterDemarrage(Audit audit) {
        if (audit == null || audit.getStatut() != StatutAudit.BROUILLON) {
            return;
        }
        audit.setStatut(StatutAudit.EN_COURS);
        LOG.debugf("Mission %s : première évaluation, passage en EN_COURS", audit.getId());
    }
}

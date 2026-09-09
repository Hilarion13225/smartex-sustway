package com.smartexsustway.api.domain.repository;

import com.smartexsustway.api.domain.entity.ImportReferentiel;
import com.smartexsustway.api.domain.enums.StatutImportReferentiel;
import io.quarkus.hibernate.orm.panache.PanacheRepositoryBase;
import jakarta.enterprise.context.ApplicationScoped;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

@ApplicationScoped
public class ImportReferentielRepository implements PanacheRepositoryBase<ImportReferentiel, UUID> {

    /** Imports du plus récent au plus ancien, pour l'écran d'administration. */
    public List<ImportReferentiel> tous() {
        return listAll(io.quarkus.panache.common.Sort.by("importeLe").descending());
    }

    /**
     * Imports portant la même empreinte qu'un fichier donné.
     *
     * Sert à signaler un doublon possible, jamais à en décider : réimporter
     * le même fichier peut être une erreur comme une reprise volontaire après
     * un échec, et rien dans le produit ne tranche entre les deux.
     */
    public List<ImportReferentiel> parHash(String hash) {
        return list("hashFichier = ?1 order by importeLe desc", hash);
    }

    /**
     * Fait passer un import à l'analyse, et dit s'il l'a bien pris.
     *
     * Le contrôle et le changement d'état tiennent dans un seul {@code UPDATE}
     * conditionnel, exécuté par la base. Deux requêtes lancées en même temps
     * sur le même import y passent l'une après l'autre : la première voit un
     * statut recevable et écrit, la seconde ne trouve plus rien à mettre à
     * jour et rend zéro. Lire puis écrire en deux temps laisserait au
     * contraire une fenêtre où les deux se croiraient légitimes, et le même
     * fichier partirait deux fois chez le fournisseur — facturé deux fois,
     * pour deux brouillons concurrents.
     *
     * Un import en échec est relançable : c'est le seul moyen de reprendre
     * après une panne passagère.
     */
    public boolean reclamerPourAnalyse(UUID importId) {
        return update("statut = ?1, analyseDebut = ?2, erreur = null "
                        + "where id = ?3 and statut in (?4, ?5)",
                StatutImportReferentiel.ANALYSE_EN_COURS, OffsetDateTime.now(), importId,
                StatutImportReferentiel.EN_ATTENTE, StatutImportReferentiel.ECHEC) == 1;
    }
}

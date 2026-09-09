package com.smartexsustway.api.domain.repository;

import com.smartexsustway.api.domain.entity.ImportReferentiel;
import io.quarkus.hibernate.orm.panache.PanacheRepositoryBase;
import jakarta.enterprise.context.ApplicationScoped;

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
}

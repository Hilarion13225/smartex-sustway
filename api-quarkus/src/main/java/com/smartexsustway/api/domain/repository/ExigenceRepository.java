package com.smartexsustway.api.domain.repository;

import com.smartexsustway.api.domain.entity.Exigence;
import io.quarkus.hibernate.orm.panache.PanacheRepositoryBase;
import jakarta.enterprise.context.ApplicationScoped;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@ApplicationScoped
public class ExigenceRepository implements PanacheRepositoryBase<Exigence, UUID> {

    public List<Exigence> parCritere(UUID critereId) {
        return list("critere.id = ?1 order by ordre, code", critereId);
    }

    /** Toutes les exigences d'une version, pour la copie d'un brouillon. */
    public List<Exigence> parVersion(UUID referentielVersionId) {
        return list("referentielVersion.id = ?1 order by critere.code, ordre", referentielVersionId);
    }

    public Optional<Exigence> parCritereEtCode(UUID critereId, String code) {
        return find("critere.id = ?1 and code = ?2", critereId, code).firstResultOptional();
    }


    /**
     * Nombre d'éléments que l'import a déposés dans cette version, validés
     * compris.
     *
     * Compte sur `origine_initiale`, et non sur `origine` : c'est la seule
     * colonne qui ne bouge pas quand une personne reprend la proposition à son
     * compte. Compter sur `origine` ferait diminuer le total à chaque
     * validation, et l'avancement afficherait toujours zéro sur zéro.
     */
    public long compterImportes(UUID referentielVersionId) {
        return count("referentielVersion.id = ?1 and origineInitiale = ?2",
                referentielVersionId, com.smartexsustway.api.domain.enums.OrigineContenu.IMPORT_IA);
    }

    /**
     * Éléments proposés par l'IA que personne n'a encore tranchés.
     *
     * Ni validés ni rejetés : ce sont eux, et eux seuls, qui bloquent la
     * publication. S'appuie sur l'index partiel posé sur exactement ce
     * prédicat (V58).
     */
    public List<Exigence> aTraiter(UUID referentielVersionId) {
        return list("referentielVersion.id = ?1 and origine = ?2 "
                        + "and valideePar is null and rejeteePar is null order by critere.code, ordre",
                referentielVersionId, com.smartexsustway.api.domain.enums.OrigineContenu.IMPORT_IA);
    }

    /** Propositions écartées : conservées, mais hors du contenu retenu. */
    public long compterRejetes(UUID referentielVersionId) {
        return count("referentielVersion.id = ?1 and origineInitiale = ?2 and rejeteePar is not null",
                referentielVersionId, com.smartexsustway.api.domain.enums.OrigineContenu.IMPORT_IA);
    }

    /**
     * Exigences transmissibles au contexte d'une analyse IA.
     *
     * « Transmissible » ne se réduit pas à « pas proposé par une machine ».
     * Un élément entre dans le contexte si trois conditions tiennent
     * ensemble : personne ne l'a écarté, ce n'est pas une proposition encore
     * en attente, et sa chaîne de rattachement est elle-même transmissible.
     * La dernière est celle qui manquait — une pièce attendue validée sous
     * une exigence écartée partait aux agents en référençant une exigence
     * absente du corps envoyé, et faisait chercher la démonstration d'une
     * exigence qu'un relecteur avait justement jugée hors sujet.
     *
     * Deux conditions plutôt qu'une sur l'élément lui-même. `origine <>
     * IMPORT_IA` suffirait tant que valider bascule l'origine et que rejeter
     * la laisse ; écrire aussi `rejeteePar is null` fait dire à la requête ce
     * que la règle dit, au lieu de le déduire d'un invariant posé ailleurs.
     *
     * À distinguer de {@link #parCritere}, qui rend tout le contenu : le
     * back-office doit continuer de voir ce qui est en attente et ce qui a
     * été écarté, sans quoi personne ne pourrait le trancher.
     */
    public List<Exigence> parCritereActives(UUID critereId) {
        return list("critere.id = ?1 and origine <> ?2 and rejeteePar is null "
                        // `id` départage : deux exigences de même ordre et même
                        // code sont impossibles (contrainte d'unicité), mais le
                        // tri doit être total pour que la numérotation des
                        // références locales du contrat IA soit reproductible.
                        + "order by ordre, code, id",
                critereId, com.smartexsustway.api.domain.enums.OrigineContenu.IMPORT_IA);
    }
}

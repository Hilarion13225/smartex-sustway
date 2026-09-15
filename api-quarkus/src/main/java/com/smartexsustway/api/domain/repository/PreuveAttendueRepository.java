package com.smartexsustway.api.domain.repository;

import com.smartexsustway.api.domain.entity.PreuveAttendue;
import io.quarkus.hibernate.orm.panache.PanacheRepositoryBase;
import jakarta.enterprise.context.ApplicationScoped;

import java.util.List;
import java.util.UUID;

@ApplicationScoped
public class PreuveAttendueRepository implements PanacheRepositoryBase<PreuveAttendue, UUID> {

    public List<PreuveAttendue> parExigence(UUID exigenceId) {
        return list("exigence.id = ?1 order by ordre, libelle", exigenceId);
    }

    /** Preuves attendues de tout un critère, dans l'ordre de ses exigences. */
    public List<PreuveAttendue> parCritere(UUID critereId) {
        return list("exigence.critere.id = ?1 order by exigence.ordre, ordre", critereId);
    }

    public List<PreuveAttendue> parVersion(UUID referentielVersionId) {
        return list("referentielVersion.id = ?1 order by exigence.ordre, ordre", referentielVersionId);
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
    public List<PreuveAttendue> aTraiter(UUID referentielVersionId) {
        return list("referentielVersion.id = ?1 and origine = ?2 "
                        + "and valideePar is null and rejeteePar is null order by exigence.critere.code, ordre",
                referentielVersionId, com.smartexsustway.api.domain.enums.OrigineContenu.IMPORT_IA);
    }

    /** Propositions écartées : conservées, mais hors du contenu retenu. */
    public long compterRejetes(UUID referentielVersionId) {
        return count("referentielVersion.id = ?1 and origineInitiale = ?2 and rejeteePar is not null",
                referentielVersionId, com.smartexsustway.api.domain.enums.OrigineContenu.IMPORT_IA);
    }

    /**
     * Preuves attendues transmissibles au contexte d'une analyse IA.
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
    public List<PreuveAttendue> parCritereActives(UUID critereId) {
        // `exigence` est obligatoire côté modèle (optional = false) : la
        // jointure implicite ne peut écarter aucune ligne à tort.
        return list("exigence.critere.id = ?1 "
                        + "and origine <> ?2 and rejeteePar is null "
                        + "and exigence.origine <> ?2 and exigence.rejeteePar is null "
                        // `id` en dernier départage : rien n'impose l'unicité de
                        // (exigence, ordre) en base — c'est vrai aujourd'hui, ce
                        // n'est pas garanti. Sans tri total, la numérotation des
                        // références locales du contrat IA cesserait d'être
                        // reproductible d'une analyse à l'autre.
                        + "order by exigence.ordre, exigence.id, ordre, id",
                critereId, com.smartexsustway.api.domain.enums.OrigineContenu.IMPORT_IA);
    }
}

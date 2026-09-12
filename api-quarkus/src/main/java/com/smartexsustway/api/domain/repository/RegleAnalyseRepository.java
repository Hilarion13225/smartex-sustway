package com.smartexsustway.api.domain.repository;

import com.smartexsustway.api.domain.entity.RegleAnalyse;
import io.quarkus.hibernate.orm.panache.PanacheRepositoryBase;
import jakarta.enterprise.context.ApplicationScoped;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@ApplicationScoped
public class RegleAnalyseRepository implements PanacheRepositoryBase<RegleAnalyse, UUID> {

    /**
     * Toutes les règles d'un critère, quelle que soit leur portée — celles
     * du critère lui-même comme celles de ses exigences et de leurs pièces
     * attendues. C'est ainsi que le contexte d'analyse est assemblé.
     */
    public List<RegleAnalyse> parCritere(UUID critereId) {
        return list("critere.id = ?1 order by ordre, code", critereId);
    }

    public List<RegleAnalyse> parVersion(UUID referentielVersionId) {
        return list("referentielVersion.id = ?1 order by critere.code, ordre", referentielVersionId);
    }

    public Optional<RegleAnalyse> parCritereEtCode(UUID critereId, String code) {
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
    public List<RegleAnalyse> aTraiter(UUID referentielVersionId) {
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
     * Règles d'analyse transmissibles au contexte d'une analyse IA.
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
    public List<RegleAnalyse> parCritereActives(UUID critereId) {
        // Sa portée descend sur trois niveaux, et chacun peut avoir été
        // écarté indépendamment :
        //
        //   portée critère  -> seul l'état de la règle compte
        //   portée exigence -> l'exigence visée doit être transmissible
        //   portée pièce    -> la pièce ET son exigence doivent l'être
        //
        // Les jointures sont externes et explicites. Écrire `exigence.origine`
        // dans la clause `where` produirait une jointure interne, qui
        // écarterait silencieusement toutes les règles portées par le critère
        // seul — celles dont `exigence` est nul, c'est-à-dire les plus
        // générales.
        return find("select r from RegleAnalyse r "
                        + "left join r.exigence e "
                        + "left join r.preuveAttendue p "
                        + "left join p.exigence pe "
                        + "where r.critere.id = ?1 "
                        + "and r.origine <> ?2 and r.rejeteePar is null "
                        + "and (e is null or (e.origine <> ?2 and e.rejeteePar is null)) "
                        + "and (p is null or (p.origine <> ?2 and p.rejeteePar is null "
                        + "                   and pe.origine <> ?2 and pe.rejeteePar is null)) "
                        + "order by r.ordre, r.code, r.id",
                critereId, com.smartexsustway.api.domain.enums.OrigineContenu.IMPORT_IA).list();
    }
}

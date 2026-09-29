package com.smartexsustway.api.domain.repository;

import com.smartexsustway.api.domain.entity.Critere;
import com.smartexsustway.api.domain.entity.ReferentielVersion;
import com.smartexsustway.api.domain.enums.OrigineContenu;
import com.smartexsustway.api.domain.enums.TypeApplicabilite;
import io.quarkus.hibernate.orm.panache.PanacheRepositoryBase;
import jakarta.enterprise.context.ApplicationScoped;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@ApplicationScoped
public class CritereRepository implements PanacheRepositoryBase<Critere, UUID> {

    /**
     * Critères d'une version, désactivés compris — RG14 (back-office,
     * module 4) : un SUPER_ADMIN doit pouvoir les retrouver pour les
     * réactiver. Ce n'est pas cette méthode qui compose un questionnaire,
     * voir {@link #applicables}, qui filtre bien sur actif=true.
     */
    public List<Critere> parVersion(UUID referentielVersionId) {
        return list("referentielVersion.id = ?1 order by domaine.ordre, code", referentielVersionId);
    }

    /**
     * Le critère de ce code dans cette version.
     *
     * Le code est unique par domaine, et un domaine appartient à une version :
     * il l'est donc aussi par version. Sert à retrouver, dans la version
     * remplacée, la valeur qu'un critère portait avant qu'une proposition ne
     * la réécrive.
     */
    public Optional<Critere> parVersionEtCode(UUID referentielVersionId, String code) {
        return find("referentielVersion.id = ?1 and code = ?2", referentielVersionId, code)
                .firstResultOptional();
    }

    /** Le code d'un critère est unique par domaine (contrainte {@code critere_domaine_id_code_key}). */
    public Optional<Critere> parDomaineEtCode(UUID domaineId, String code) {
        return find("domaine.id = ?1 and code = ?2", domaineId, code).firstResultOptional();
    }

    /**
     * Nombre de critères que l'import a déposés dans cette version, validés
     * compris.
     *
     * Compte sur `origine_initiale`, et non sur `origine` : c'est la seule
     * colonne qui ne bouge pas quand une personne reprend la proposition à son
     * compte.
     */
    public long compterImportes(UUID referentielVersionId) {
        return count("referentielVersion.id = ?1 and origineInitiale = ?2",
                referentielVersionId, OrigineContenu.IMPORT_IA);
    }

    /**
     * Critères proposés par l'IA que personne n'a encore tranchés.
     *
     * Ni validés ni rejetés : ce sont eux, et eux seuls, qui bloquent la
     * publication. S'appuie sur l'index partiel posé sur exactement ce
     * prédicat (V75).
     */
    public List<Critere> aTraiter(UUID referentielVersionId) {
        return list("referentielVersion.id = ?1 and origine = ?2 "
                        + "and valideePar is null and rejeteePar is null order by domaine.ordre, code",
                referentielVersionId, OrigineContenu.IMPORT_IA);
    }

    /** Propositions écartées : conservées, mais hors du contenu retenu. */
    public long compterRejetes(UUID referentielVersionId) {
        return count("referentielVersion.id = ?1 and origineInitiale = ?2 and rejeteePar is not null",
                referentielVersionId, OrigineContenu.IMPORT_IA);
    }

    /**
     * RG34 — composition dynamique du questionnaire. Voir QuestionnaireService
     * pour le contexte complet (secteur non encore pris en compte, phase F).
     */
    public List<Critere> applicables(ReferentielVersion version, TypeApplicabilite applicabilite) {
        return list("referentielVersion = ?1 and actif = true and applicabilite = ?2 order by domaine.ordre, code",
                version, applicabilite);
    }
}

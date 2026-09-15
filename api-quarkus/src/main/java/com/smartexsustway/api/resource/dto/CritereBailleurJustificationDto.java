package com.smartexsustway.api.resource.dto;

import com.smartexsustway.api.domain.entity.CritereBailleurJustification;
import com.smartexsustway.api.domain.entity.Utilisateur;
import com.smartexsustway.api.domain.enums.CorrespondanceBailleur;
import com.smartexsustway.api.domain.enums.OrigineContenu;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.Map;
import java.util.UUID;

/**
 * Justification d'un mapping critère ↔ bailleur, telle qu'exposée au
 * back-office (SUPER_ADMIN seul).
 *
 * <p>Pour un mapping sans justification en cours, la réponse n'est pas vide :
 * elle porte l'état {@link Etat#NON_DOCUMENTE}, et aucun autre champ. Un
 * mapping non documenté est un fait à montrer, pas une absence de réponse.
 */
public record CritereBailleurJustificationDto(
        UUID id,
        UUID critereId,
        String bailleurCode,
        Etat etat,
        String documentNom,
        String documentEdition,
        String documentOrganisme,
        String documentUrl,
        String referenceOfficielle,
        String titreOfficiel,
        String texteSource,
        Map<String, Object> localisation,
        BigDecimal confiance,
        OrigineContenu origine,
        CorrespondanceBailleur correspondance,
        String justification,
        UUID valideeParId,
        OffsetDateTime valideeLe,
        UUID rejeteeParId,
        OffsetDateTime rejeteeLe,
        String motifRejet,
        UUID perimeeParId,
        OffsetDateTime perimeeLe,
        String motifPeremption,
        UUID creeParId,
        OffsetDateTime creeLe,
        UUID modifieeParId,
        OffsetDateTime modifieeLe
) {

    /**
     * Calculé à partir des colonnes de décision, jamais stocké : une colonne
     * de statut pourrait contredire les décisions qu'elle prétend résumer.
     */
    public enum Etat {
        BROUILLON,
        VALIDEE,
        REJETEE,
        PERIMEE,
        NON_DOCUMENTE
    }

    public static CritereBailleurJustificationDto depuis(CritereBailleurJustification j, String bailleurCode,
                                                         Etat etat) {
        return new CritereBailleurJustificationDto(
                j.getId(),
                j.getCritereId(),
                bailleurCode,
                etat,
                j.getDocumentNom(),
                j.getDocumentEdition(),
                j.getDocumentOrganisme(),
                j.getDocumentUrl(),
                j.getReferenceOfficielle(),
                j.getTitreOfficiel(),
                j.getTexteSource(),
                j.getLocalisation(),
                j.getConfiance(),
                j.getOrigine(),
                j.getCorrespondance(),
                j.getJustification(),
                idDe(j.getValideePar()),
                j.getValideeLe(),
                idDe(j.getRejeteePar()),
                j.getRejeteeLe(),
                j.getMotifRejet(),
                idDe(j.getPerimeePar()),
                j.getPerimeeLe(),
                j.getMotifPeremption(),
                idDe(j.getCreePar()),
                j.getCreeLe(),
                idDe(j.getModifieePar()),
                j.getModifieeLe()
        );
    }

    /** Mapping existant, sans justification en cours. */
    public static CritereBailleurJustificationDto nonDocumente(UUID critereId, String bailleurCode) {
        return new CritereBailleurJustificationDto(
                null, critereId, bailleurCode, Etat.NON_DOCUMENTE,
                null, null, null, null, null, null, null, null, null, null, null, null,
                null, null, null, null, null, null, null, null, null, null, null, null);
    }

    private static UUID idDe(Utilisateur utilisateur) {
        return utilisateur == null ? null : utilisateur.getId();
    }
}

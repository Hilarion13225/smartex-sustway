package com.smartexsustway.api.resource.dto;

import com.smartexsustway.api.domain.entity.AxeAmelioration;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.time.OffsetDateTime;
import java.util.UUID;

/**
 * Un axe tel qu'il est rendu par l'API.
 *
 * <p>{@code origine} et {@code origineInitiale} sont tous deux exposés :
 * le premier dit d'où vient l'axe aujourd'hui, le second d'où il venait à
 * sa création. Sans le second, un axe proposé par l'IA puis reformulé par
 * un auditeur deviendrait indistinguable d'un axe humain, et la relecture
 * ne serait plus vérifiable après coup.
 */
public record AxeAmeliorationDto(
        UUID id,
        UUID auditId,
        UUID auditCritereId,
        /** Code du critère porteur — ce qu'un auditeur reconnaît, là où l'UUID ne dit rien. */
        String critereCode,
        UUID evaluationId,
        String libelle,
        String description,
        String origine,
        String origineInitiale,
        String statut,
        String niveauRattachement,
        String referenceRattachement,
        UUID valideePar,
        OffsetDateTime valideeLe,
        UUID rejeteePar,
        OffsetDateTime rejeteeLe,
        String motifRejet,
        OffsetDateTime creeLe) {

    public static AxeAmeliorationDto depuis(AxeAmelioration axe) {
        return new AxeAmeliorationDto(
                axe.getId(),
                axe.getAudit().getId(),
                axe.getAuditCritere() == null ? null : axe.getAuditCritere().getId(),
                axe.getAuditCritere() == null ? null : axe.getAuditCritere().getCritere().getCode(),
                axe.getEvaluation() == null ? null : axe.getEvaluation().getId(),
                axe.getLibelle(),
                axe.getDescription(),
                axe.getOrigine().name(),
                axe.getOrigineInitiale() == null ? null : axe.getOrigineInitiale().name(),
                axe.getStatut().name(),
                axe.getNiveauRattachement() == null ? null : axe.getNiveauRattachement().name(),
                reference(axe),
                axe.getValideePar() == null ? null : axe.getValideePar().getId(),
                axe.getValideeLe(),
                axe.getRejeteePar() == null ? null : axe.getRejeteePar().getId(),
                axe.getRejeteeLe(),
                axe.getMotifRejet(),
                axe.getCreeLe());
    }

    /** Le code métier de la cible, plus parlant qu'un UUID pour un relecteur. */
    private static String reference(AxeAmelioration axe) {
        if (axe.getExigence() != null) {
            return axe.getExigence().getCode();
        }
        if (axe.getPreuveAttendue() != null) {
            return axe.getPreuveAttendue().getLibelle();
        }
        if (axe.getRegleAnalyse() != null) {
            return axe.getRegleAnalyse().getCode();
        }
        return null;
    }

    /** Création d'un axe par une personne. L'origine n'est pas un paramètre. */
    public record CreationDto(
            @NotBlank(message = "Le libellé est obligatoire")
            @Size(max = 255, message = "Le libellé ne peut dépasser 255 caractères")
            String libelle,
            String description,
            UUID auditCritereId) {
    }

    /**
     * Rejet d'un axe. Le motif est exigé ici comme il l'est en base : une
     * recommandation écartée sans motif ne se relit pas six mois plus tard.
     */
    public record RejetDto(
            @NotBlank(message = "Le motif de rejet est obligatoire")
            String motif) {
    }
}

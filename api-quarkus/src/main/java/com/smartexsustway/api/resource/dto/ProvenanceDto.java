package com.smartexsustway.api.resource.dto;

import com.smartexsustway.api.domain.entity.Utilisateur;
import com.smartexsustway.api.domain.enums.OrigineContenu;

import java.time.Instant;
import java.util.UUID;

/**
 * D'où vient un élément du référentiel, et qui en répond.
 *
 * Rassemblé en un objet plutôt qu'éparpillé en quatre champs sur chacune des
 * trois entités : l'écran de relecture pose la même question à une exigence,
 * à une preuve attendue et à une règle, et il doit la lire au même endroit.
 *
 * {@code origineInitiale} ne change jamais après la création. C'est ce qui
 * distingue un contenu rédigé à la main d'une proposition reprise à son
 * compte, longtemps après que {@code origine} soit passée à CONTENU_HUMAIN.
 */
public record ProvenanceDto(
        String origine,
        String origineInitiale,
        boolean validee,
        UUID valideePar,
        String valideeParNom,
        Instant valideeLe
) {

    public static ProvenanceDto depuis(OrigineContenu origine, OrigineContenu origineInitiale,
                                       Utilisateur validateur, Instant valideeLe) {
        return new ProvenanceDto(
                origine == null ? null : origine.name(),
                origineInitiale == null ? null : origineInitiale.name(),
                validateur != null,
                validateur == null ? null : validateur.getId(),
                validateur == null ? null : validateur.getPrenom() + " " + validateur.getNom(),
                valideeLe
        );
    }

    /**
     * Vrai si l'élément bloque encore la publication de sa version.
     *
     * Reprend le prédicat du déclencheur `refuser_publication_sans_validation`
     * (V57) plutôt que d'en proposer un autre : deux définitions de la même
     * condition finiraient par diverger, et l'écran annoncerait publiable une
     * version que la base refuse.
     */
    public boolean bloquePublication() {
        return OrigineContenu.IMPORT_IA.name().equals(origine) && !validee;
    }
}

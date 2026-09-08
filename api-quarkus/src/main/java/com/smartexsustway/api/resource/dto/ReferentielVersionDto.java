package com.smartexsustway.api.resource.dto;

import com.smartexsustway.api.domain.entity.ReferentielVersion;
import com.smartexsustway.api.domain.enums.StatutVersionReferentiel;

import java.time.OffsetDateTime;
import java.util.UUID;

/** Une version de référentiel, telle qu'exposée à l'interface. */
public record ReferentielVersionDto(
        UUID id,
        String numero,
        String notes,
        int nombreDomaines,
        int nombreCriteres,
        String auteurNom,
        OffsetDateTime publieeLe,
        OffsetDateTime creeeLe,
        /** BROUILLON, PUBLIEE ou ARCHIVEE — c'est lui qui dit si le contenu se modifie. */
        String statut,
        boolean modifiable,
        /** Numéro de la version dont celle-ci est dérivée, s'il y en a une. */
        String remplaceVersion,
        /** Vrai pour la version que porte actuellement le référentiel. */
        boolean courante
) {
    public static ReferentielVersionDto depuis(ReferentielVersion version, String versionCourante) {
        var auteur = version.getAuteur();
        return new ReferentielVersionDto(
                version.getId(),
                version.getNumero(),
                version.getNotes(),
                version.getNombreDomaines(),
                version.getNombreCriteres(),
                auteur == null ? null : auteur.getPrenom() + " " + auteur.getNom(),
                version.getPublieeLe(),
                version.getCreeeLe(),
                version.getStatut().name(),
                version.estBrouillon(),
                version.getRemplaceVersion() == null ? null : version.getRemplaceVersion().getNumero(),
                version.getStatut() == StatutVersionReferentiel.PUBLIEE
                        && version.getNumero().equals(versionCourante)
        );
    }
}

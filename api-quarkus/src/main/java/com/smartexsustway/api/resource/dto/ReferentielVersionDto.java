package com.smartexsustway.api.resource.dto;

import com.smartexsustway.api.domain.entity.ReferentielVersion;

import java.time.OffsetDateTime;
import java.util.UUID;

/** Une publication de référentiel, telle qu'exposée à l'interface. */
public record ReferentielVersionDto(
        UUID id,
        String numero,
        String notes,
        int nombreDomaines,
        int nombreCriteres,
        String auteurNom,
        OffsetDateTime publieeLe,
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
                version.getNumero().equals(versionCourante)
        );
    }
}

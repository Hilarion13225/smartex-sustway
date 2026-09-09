package com.smartexsustway.api.resource.dto;

import com.smartexsustway.api.domain.entity.ImportReferentiel;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * État d'un import de référentiel.
 *
 * `doublonsPossibles` recense les imports antérieurs portant la même
 * empreinte. C'est une information, pas une décision : réimporter le même
 * fichier peut être une méprise comme une reprise volontaire après un échec.
 * L'écran la signale, l'administrateur tranche.
 *
 * La clé de stockage n'est pas exposée : le fichier se relit par un endpoint
 * dédié, comme pour les pièces justificatives.
 */
public record ImportReferentielDto(
        UUID id,
        String nomFichier,
        String typeMime,
        long taille,
        String hashFichier,
        String statutScan,
        String statut,
        String referentielCode,
        String versionNumero,
        UUID versionId,
        String importeParNom,
        OffsetDateTime importeLe,
        OffsetDateTime analyseDebut,
        OffsetDateTime analyseFin,
        String erreur,
        Map<String, Object> metadonnees,
        List<UUID> doublonsPossibles
) {
    public static ImportReferentielDto depuis(ImportReferentiel i, List<UUID> doublonsPossibles) {
        var auteur = i.getImportePar();
        var version = i.getReferentielVersion();
        return new ImportReferentielDto(
                i.getId(),
                i.getNomFichier(),
                i.getTypeMime(),
                i.getTaille(),
                i.getHashFichier(),
                i.getStatutScan().name(),
                i.getStatut().name(),
                i.getReferentiel() == null ? null : i.getReferentiel().getCode(),
                version == null ? null : version.getNumero(),
                version == null ? null : version.getId(),
                auteur == null ? null : auteur.getPrenom() + " " + auteur.getNom(),
                i.getImporteLe(),
                i.getAnalyseDebut(),
                i.getAnalyseFin(),
                i.getErreur(),
                i.getMetadonnees(),
                doublonsPossibles
        );
    }

    public static ImportReferentielDto depuis(ImportReferentiel i) {
        return depuis(i, List.of());
    }
}

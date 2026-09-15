package com.smartexsustway.api.ia.contrat;

import com.smartexsustway.api.domain.entity.PreuveAttendue;

import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.regex.Pattern;

/**
 * La correspondance entre les références locales d'un payload et les preuves
 * attendues réelles.
 *
 * Une référence — {@code D1-01-E1-P1} — est locale à une requête. Elle n'est
 * ni persistée, ni exposée, ni comparable d'un appel à l'autre : elle est
 * recalculée à chaque construction de payload depuis la liste telle qu'elle
 * est lue à cet instant. C'est ce qui permet de se passer d'un code métier en
 * base sans jamais rien laisser d'incohérent derrière soi — rien n'ayant été
 * stocké, rien ne peut diverger.
 *
 * Le format est court et lisible plutôt qu'un UUID, pour une raison pratique :
 * le mécanisme repose entièrement sur le fait que le modèle restitue la
 * référence à l'identique. Trente-six caractères hexadécimaux seraient un cas
 * défavorable connu, et chaque erreur de recopie deviendrait un rattachement
 * rejeté.
 *
 * Cette table ne contient que les preuves attendues du critère analysé. Une
 * référence provenant d'une autre exigence ou d'un autre critère y est donc
 * absente, et refusée par le même chemin qu'une référence inventée — le
 * cloisonnement rend le contrôle exhaustif sans énumérer les cas.
 */
public final class ReferencesPreuvesAttendues {

    /** {@code <code_exigence>-P<rang>} — le rang commence à 1, par exigence. */
    private static final Pattern FORME = Pattern.compile("^[A-Za-z0-9._-]+-P[1-9][0-9]*$");

    private final Map<String, PreuveAttendue> parReference;
    private final Map<UUID, String> parIdentifiant;

    private ReferencesPreuvesAttendues(Map<String, PreuveAttendue> parReference,
                                        Map<UUID, String> parIdentifiant) {
        this.parReference = parReference;
        this.parIdentifiant = parIdentifiant;
    }

    /** Construit la table au fil de la numérotation. Réservé à {@link ConstructionContexteIa}. */
    static Builder builder() {
        return new Builder();
    }

    static final class Builder {
        private final Map<String, PreuveAttendue> parReference = new LinkedHashMap<>();
        private final Map<UUID, String> parIdentifiant = new LinkedHashMap<>();

        void ajouter(String reference, PreuveAttendue preuve) {
            // Le contrôle d'unicité vit ici plutôt que dans une vérification
            // ultérieure : une collision signalée au moment où elle se produit
            // nomme la référence fautive, là où un contrôle a posteriori ne
            // dirait que « doublon quelque part ».
            if (parReference.containsKey(reference)) {
                throw new IllegalStateException(
                        "Référence locale en double dans le payload : " + reference);
            }
            parReference.put(reference, preuve);
            parIdentifiant.put(preuve.getId(), reference);
        }

        ReferencesPreuvesAttendues construire() {
            return new ReferencesPreuvesAttendues(Map.copyOf(parReference), Map.copyOf(parIdentifiant));
        }
    }

    /** La référence attribuée à cette preuve attendue, si elle figure au payload. */
    public Optional<String> referenceDe(PreuveAttendue preuve) {
        return preuve == null ? Optional.empty()
                : Optional.ofNullable(parIdentifiant.get(preuve.getId()));
    }

    /** La preuve attendue désignée, ou vide si la référence est inconnue de ce payload. */
    public Optional<PreuveAttendue> resoudre(String reference) {
        return reference == null ? Optional.empty()
                : Optional.ofNullable(parReference.get(reference));
    }

    /**
     * Résout une référence rendue par le modèle, ou refuse.
     *
     * À utiliser partout où une sortie IA prétend désigner une preuve
     * attendue : rien ne doit être accepté sans avoir été retrouvé dans ce
     * qui a effectivement été transmis.
     */
    public PreuveAttendue exiger(String reference) {
        if (reference == null || reference.isBlank() || !FORME.matcher(reference).matches()) {
            throw new ReferenceIaInvalide(ReferenceIaInvalide.Motif.MALFORMEE, reference,
                    "Référence de preuve attendue malformée : '" + reference
                            + "' (forme attendue : <code_exigence>-P<rang>)");
        }
        PreuveAttendue preuve = parReference.get(reference);
        if (preuve == null) {
            throw new ReferenceIaInvalide(ReferenceIaInvalide.Motif.INCONNUE, reference,
                    "Référence de preuve attendue absente du contexte transmis : " + reference);
        }
        return preuve;
    }

    public int taille() {
        return parReference.size();
    }

    /** Les références du payload, dans l'ordre où elles ont été attribuées. */
    public java.util.Set<String> references() {
        return parReference.keySet();
    }
}

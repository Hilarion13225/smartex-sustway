package com.smartexsustway.api.referentiel;

import com.smartexsustway.api.domain.enums.TypeRegleAnalyse;

import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * Contrôle la définition d'une règle d'analyse selon son type.
 *
 * Le JSON donne la souplesse dont un catalogue multi-référentiels a besoin :
 * IFC/SFI ne raisonne pas comme les PRI, et figer des colonnes obligerait à
 * migrer la table à chaque nouveau cadre importé. Mais sans contrôle, ce
 * même JSON devient un fourre-tout où chacun invente ses clés, et le service
 * d'agents ne peut plus rien en rendre.
 *
 * Chaque type déclare donc ses clés obligatoires et celles qu'il admet. Une
 * clé inconnue est refusée plutôt qu'ignorée : ignorée, elle donnerait
 * l'illusion d'une règle prise en compte alors que le prompt ne la
 * mentionnerait jamais.
 */
public final class RegleAnalyseValidation {

    private RegleAnalyseValidation() {
    }

    /** Levée quand une définition ne correspond pas à son type. Traduite en 400. */
    public static class DefinitionInvalideException extends RuntimeException {
        public DefinitionInvalideException(String message) {
            super(message);
        }
    }

    /** Clés attendues d'un type : ce qu'il exige, et ce qu'il admet en plus. */
    private record Schema(Set<String> obligatoires, Set<String> facultatives) {
        Set<String> admises() {
            var toutes = new java.util.HashSet<>(obligatoires);
            toutes.addAll(facultatives);
            return toutes;
        }
    }

    /**
     * Schémas par type.
     *
     * `elements` est partout une liste de chaînes : ce que l'agent doit
     * chercher, formulé en langage naturel. La règle décrit quoi chercher,
     * jamais comment le demander au modèle — la formulation du prompt reste
     * au service Python.
     */
    private static final Map<TypeRegleAnalyse, Schema> SCHEMAS = Map.of(
            TypeRegleAnalyse.PRESENCE,
            new Schema(Set.of("elements"), Set.of("tolerance")),

            TypeRegleAnalyse.ELEMENT_ATTENDU,
            new Schema(Set.of("elements"), Set.of("emplacement")),

            TypeRegleAnalyse.DATE_VALIDITE,
            new Schema(Set.of("champ"), Set.of("anciennete_maximale_mois", "posterieure_a")),

            TypeRegleAnalyse.SIGNATURE,
            new Schema(Set.of(), Set.of("autorites_acceptees", "mention_attendue")),

            TypeRegleAnalyse.COHERENCE_DECLARATION,
            new Schema(Set.of("elements"), Set.of("ecart_tolere")),

            TypeRegleAnalyse.INCOHERENCE,
            new Schema(Set.of("elements"), Set.of()),

            TypeRegleAnalyse.CONDITION,
            new Schema(Set.of("condition"), Set.of("elements"))
    );

    /**
     * Vérifie la définition, ou lève. Une définition vide est acceptée pour
     * les types qui n'exigent rien : la sévérité et le libellé de la règle
     * suffisent alors à la rendre exploitable.
     */
    public static void verifier(TypeRegleAnalyse type, Map<String, Object> definition) {
        Schema schema = SCHEMAS.get(type);
        if (schema == null) {
            throw new DefinitionInvalideException("Type de règle non reconnu : " + type);
        }
        Map<String, Object> valeurs = definition == null ? Map.of() : definition;

        for (String obligatoire : schema.obligatoires()) {
            Object valeur = valeurs.get(obligatoire);
            if (valeur == null || (valeur instanceof String texte && texte.isBlank())
                    || (valeur instanceof List<?> liste && liste.isEmpty())) {
                throw new DefinitionInvalideException(
                        "Une règle " + type + " doit préciser « " + obligatoire + " » dans sa définition");
            }
        }

        for (String cle : valeurs.keySet()) {
            if (!schema.admises().contains(cle)) {
                throw new DefinitionInvalideException(
                        "Clé « " + cle + " » inconnue pour une règle " + type
                                + " (attendues : " + String.join(", ", schema.admises()) + ")");
            }
        }

        Object elements = valeurs.get("elements");
        if (elements != null && !(elements instanceof List<?>)) {
            throw new DefinitionInvalideException(
                    "« elements » doit être une liste de ce que l'agent doit rechercher");
        }
    }
}

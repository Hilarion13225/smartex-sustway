"""
Validation des définitions de règles d'analyse.

Miroir exact de `RegleAnalyseValidation` côté Java, et cette duplication est
assumée : les deux services doivent pouvoir refuser une règle mal formée sans
se consulter, et Python doit pouvoir le faire avant même que Java ne voie le
résultat. Le contrat est le même des deux côtés — clés obligatoires, clés
admises, refus de toute clé inconnue.

Une clé inconnue est refusée plutôt qu'ignorée : ignorée, elle donnerait
l'illusion d'une règle prise en compte alors que le prompt d'analyse ne la
mentionnerait jamais.
"""

from __future__ import annotations


class DefinitionInvalide(ValueError):
    """La définition ne correspond pas au type de règle annoncé."""


# (clés obligatoires, clés facultatives) — à tenir aligné sur le Java.
SCHEMAS: dict[str, tuple[set[str], set[str]]] = {
    "PRESENCE": ({"elements"}, {"tolerance"}),
    "ELEMENT_ATTENDU": ({"elements"}, {"emplacement"}),
    "DATE_VALIDITE": ({"champ"}, {"anciennete_maximale_mois", "posterieure_a"}),
    "SIGNATURE": (set(), {"autorites_acceptees", "mention_attendue"}),
    "COHERENCE_DECLARATION": ({"elements"}, {"ecart_tolere"}),
    "INCOHERENCE": ({"elements"}, set()),
    "CONDITION": ({"condition"}, {"elements"}),
}


def verifier_definition(type_regle: str, definition: dict | None) -> None:
    """Vérifie la définition, ou lève. Une définition vide convient aux types sans exigence."""
    schema = SCHEMAS.get(type_regle)
    if schema is None:
        raise DefinitionInvalide(f"Type de règle non reconnu : {type_regle}")

    obligatoires, facultatives = schema
    valeurs = definition or {}

    for cle in sorted(obligatoires):
        valeur = valeurs.get(cle)
        if valeur is None or valeur == "" or valeur == []:
            raise DefinitionInvalide(
                f"une règle {type_regle} doit préciser « {cle} » dans sa définition"
            )

    admises = obligatoires | facultatives
    inconnues = set(valeurs) - admises
    if inconnues:
        raise DefinitionInvalide(
            f"clé(s) « {', '.join(sorted(inconnues))} » inconnue(s) pour une règle "
            f"{type_regle} (attendues : {', '.join(sorted(admises)) or 'aucune'})"
        )

    elements = valeurs.get("elements")
    if elements is not None and not isinstance(elements, list):
        raise DefinitionInvalide("« elements » doit être une liste")

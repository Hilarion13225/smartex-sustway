"""
Traduction du contrat Pydantic en schéma Gemini.

Ce module est né d'un défaut qu'aucun test ne pouvait voir : tous les tests du
pipeline remplacent l'appel au modèle par un double, donc aucun ne construisait
le schéma réellement envoyé. L'API Gemini Developer refusait ce schéma, et
l'import échouait systématiquement en conditions réelles alors que la suite
était au vert.

Les tests ci-dessous portent donc sur ce que le schéma ne doit pas contenir,
plutôt que sur ce qu'il contient : c'est là que se jouait l'erreur.
"""

from enum import Enum

import pytest
from pydantic import BaseModel, ConfigDict, Field

from app.models.import_referentiel import BrouillonImporte
from app.services.schema_gemini import (
    SchemaIntraduisible,
    schema_pour_gemini,
)


def _toutes_les_cles(noeud, vues=None):
    """Parcourt le schéma et rend toutes les clés rencontrées, à tout niveau."""
    vues = vues if vues is not None else set()
    if isinstance(noeud, dict):
        for cle, valeur in noeud.items():
            vues.add(cle)
            _toutes_les_cles(valeur, vues)
    elif isinstance(noeud, list):
        for element in noeud:
            _toutes_les_cles(element, vues)
    return vues


# --- Ce que l'API refuse ne doit pas y figurer -------------------------------


def test_le_schema_ne_contient_aucun_additional_properties():
    """
    Le défaut d'origine, en une assertion.

    `extra="forbid"` produit `additionalProperties: false`, réservé par Google
    à son offre entreprise. Sa présence faisait échouer tout appel réel.
    """
    assert "additionalProperties" not in _toutes_les_cles(schema_pour_gemini(BrouillonImporte))


def test_le_schema_ne_contient_aucune_reference():
    """
    Gemini ne déréférence pas les `$ref` que Pydantic génère pour chaque
    modèle imbriqué : le contrat doit être aplati avant l'envoi.
    """
    cles = _toutes_les_cles(schema_pour_gemini(BrouillonImporte))
    assert "$ref" not in cles
    assert "$defs" not in cles


def test_le_schema_ne_contient_que_des_cles_comprises():
    """
    Une clé inconnue fait rejeter l'appel entier. Plutôt que d'énumérer les
    fautives une à une, on vérifie qu'aucune clé étrangère au vocabulaire
    admis ne subsiste — y compris celles qu'une évolution de Pydantic
    introduirait plus tard.
    """
    admises = {
        "type", "description", "enum", "format", "items",
        "properties", "required", "nullable", "anyOf", "minItems", "maxItems",
    }
    schema = schema_pour_gemini(BrouillonImporte)
    # Les noms de propriétés du contrat sont des clés du dictionnaire
    # `properties` : ils sont légitimes et ne font pas partie du vocabulaire.
    inconnues = _toutes_les_cles(schema) - admises - _noms_de_proprietes(schema)
    assert inconnues == set(), f"Clés non comprises par Gemini : {sorted(inconnues)}"


def _noms_de_proprietes(noeud, vues=None):
    vues = vues if vues is not None else set()
    if isinstance(noeud, dict):
        for cle, valeur in noeud.items():
            if cle == "properties" and isinstance(valeur, dict):
                vues.update(valeur.keys())
            _noms_de_proprietes(valeur, vues)
    elif isinstance(noeud, list):
        for element in noeud:
            _noms_de_proprietes(element, vues)
    return vues


# --- Ce que la traduction doit préserver -------------------------------------


def test_le_contrat_reste_strict_a_la_validation():
    """
    La garantie n'a pas été échangée contre la compatibilité : le modèle
    refuse toujours un champ qu'il ne connaît pas. C'est le schéma envoyé qui
    est assoupli, pas la validation de la réponse.
    """
    with pytest.raises(Exception):
        BrouillonImporte.model_validate(
            {"referentiel": {"code": "X", "nom": "Y"}, "domaines": [], "champ_invente": 1}
        )


def test_les_champs_facultatifs_deviennent_nullables():
    class Modele(BaseModel):
        model_config = ConfigDict(extra="forbid")
        obligatoire: str
        facultatif: str | None = None

    schema = schema_pour_gemini(Modele)
    assert schema["properties"]["facultatif"]["nullable"] is True
    assert schema["properties"]["facultatif"]["type"] == "string"
    assert "nullable" not in schema["properties"]["obligatoire"]


def test_les_champs_obligatoires_sont_conserves():
    schema = schema_pour_gemini(BrouillonImporte)
    referentiel = schema["properties"]["referentiel"]
    assert set(referentiel["required"]) == {"code", "nom"}


def test_les_enumerations_sont_conservees():
    """
    Sans les valeurs admises, le modèle inventerait des types de preuve que
    l'énumération PostgreSQL refuserait ensuite côté Java.
    """
    class Couleur(str, Enum):
        ROUGE = "ROUGE"
        VERT = "VERT"

    class Modele(BaseModel):
        couleur: Couleur

    assert schema_pour_gemini(Modele)["properties"]["couleur"]["enum"] == ["ROUGE", "VERT"]


def test_la_hierarchie_imbriquee_est_aplatie_sans_perte():
    """Un critère doit rester atteignable depuis la racine, exigences comprises."""
    schema = schema_pour_gemini(BrouillonImporte)
    critere = schema["properties"]["domaines"]["items"]["properties"]["criteres"]["items"]
    assert "code" in critere["properties"]
    exigence = critere["properties"]["exigences"]["items"]
    assert "enonce" in exigence["properties"]
    preuve = exigence["properties"]["preuves_attendues"]["items"]
    assert "libelle" in preuve["properties"]


def test_les_descriptions_sont_transmises():
    """Elles portent la consigne métier : les perdre appauvrirait l'extraction."""
    class Modele(BaseModel):
        code: str = Field(description="Code tel qu'il figure dans le document")

    assert schema_pour_gemini(Modele)["properties"]["code"]["description"]


# --- Ce que la traduction doit refuser ---------------------------------------


def test_les_contraintes_inexprimables_sont_retirees():
    """
    `maxLength` n'est pas compris par Gemini. Le transmettre ferait échouer
    l'appel ; le conserver en silence donnerait l'illusion d'une contrainte
    que seul Pydantic applique de toute façon à la réception.
    """
    class Modele(BaseModel):
        code: str = Field(max_length=30)

    assert "maxLength" not in schema_pour_gemini(Modele)["properties"]["code"]


def test_un_format_non_reconnu_est_retire():
    from uuid import UUID

    class Modele(BaseModel):
        identifiant: UUID

    assert "format" not in schema_pour_gemini(Modele)["properties"]["identifiant"]


def test_une_reference_circulaire_est_signalee_au_lieu_de_boucler():
    class Noeud(BaseModel):
        nom: str
        enfant: "Noeud | None" = None

    Noeud.model_rebuild()

    with pytest.raises(SchemaIntraduisible):
        schema_pour_gemini(Noeud)

"""
Traduction d'un modèle Pydantic en schéma acceptable par l'API Gemini.

Deux exigences s'opposaient, et ce module existe pour les tenir ensemble.

Côté validation, les modèles doivent rester stricts : `extra="forbid"` est ce
qui fait rejeter une sortie où le modèle aurait rangé du contenu dans un champ
que le contrat ne prévoit pas. Sans cela, la donnée serait silencieusement
perdue, et le brouillon paraîtrait complet.

Côté appel, l'API Gemini Developer refuse le schéma que Pydantic produit
alors. Elle n'accepte qu'un sous-ensemble d'OpenAPI 3.0 : `additionalProperties`
lui est réservé à son offre entreprise, et elle ne déréférence pas les `$ref`
que Pydantic génère pour chaque modèle imbriqué.

Le schéma envoyé est donc dérivé du modèle, pas écrit à la main : il ne peut
pas diverger du contrat, puisqu'il en est la traduction. La réponse, elle,
reste validée par le modèle strict.
"""

from __future__ import annotations

from typing import Any

from pydantic import BaseModel

# Ce que Gemini comprend. Tout le reste est retiré plutôt que transmis : une
# clé inconnue fait échouer l'appel entier, et un `maxLength` ignoré donnerait
# l'illusion d'une contrainte que seul Pydantic appliquera de toute façon à la
# réception.
CLES_ADMISES = frozenset(
    {
        "type",
        "description",
        "enum",
        "format",
        "items",
        "properties",
        "required",
        "nullable",
        "anyOf",
        "minItems",
        "maxItems",
    }
)

# Formats reconnus par Gemini. Pydantic en produit d'autres (`uuid`, `date-time`)
# que l'API rejette.
FORMATS_ADMIS = {
    "string": frozenset({"enum", "date-time"}),
    "integer": frozenset({"int32", "int64"}),
    "number": frozenset({"float", "double"}),
}

PROFONDEUR_MAXIMALE = 20


class SchemaIntraduisible(RuntimeError):
    """Le modèle ne peut pas être traduit — récursion, ou référence introuvable."""


def schema_pour_gemini(modele: type[BaseModel]) -> dict[str, Any]:
    """
    Rend le schéma JSON du modèle, aplati et débarrassé de l'inexprimable.

    La traduction est faite à chaque appel plutôt que mise en cache : elle
    coûte quelques millisecondes contre une requête qui dure des secondes, et
    un schéma figé au démarrage survivrait à une évolution du contrat.
    """
    brut = modele.model_json_schema(ref_template="#/$defs/{model}")
    definitions = brut.get("$defs", {})
    return _traduire(brut, definitions, profondeur=0)


def _traduire(noeud: Any, definitions: dict[str, Any], profondeur: int) -> Any:
    if profondeur > PROFONDEUR_MAXIMALE:
        # Un modèle qui se référence lui-même produirait un schéma infini une
        # fois les références résolues. Mieux vaut le dire que boucler.
        raise SchemaIntraduisible(
            f"Schéma trop profond (plus de {PROFONDEUR_MAXIMALE} niveaux) : "
            "le contrat contient probablement une référence circulaire"
        )

    if isinstance(noeud, list):
        return [_traduire(element, definitions, profondeur + 1) for element in noeud]
    if not isinstance(noeud, dict):
        return noeud

    if "$ref" in noeud:
        return _traduire(_resoudre(noeud["$ref"], definitions), definitions, profondeur + 1)

    optionnel = _collapser_optionnel(noeud, definitions, profondeur)
    if optionnel is not None:
        return optionnel

    traduit: dict[str, Any] = {}
    for cle, valeur in noeud.items():
        if cle not in CLES_ADMISES:
            continue
        if cle == "properties":
            traduit[cle] = {
                nom: _traduire(sous, definitions, profondeur + 1)
                for nom, sous in valeur.items()
            }
        else:
            traduit[cle] = _traduire(valeur, definitions, profondeur + 1)

    _nettoyer_format(traduit)
    _restreindre_requis(traduit)
    return traduit


def _resoudre(reference: str, definitions: dict[str, Any]) -> dict[str, Any]:
    nom = reference.rsplit("/", 1)[-1]
    if nom not in definitions:
        raise SchemaIntraduisible(f"Référence introuvable dans le schéma : {reference}")
    return definitions[nom]


def _collapser_optionnel(
    noeud: dict[str, Any], definitions: dict[str, Any], profondeur: int
) -> dict[str, Any] | None:
    """
    Réduit un `anyOf` d'un type et de null à ce type, marqué nullable.

    Pydantic écrit `str | None` ainsi. Gemini accepte `anyOf`, mais pas une
    branche de type « null » : elle s'exprime chez lui par `nullable`.
    """
    branches = noeud.get("anyOf")
    if not isinstance(branches, list):
        return None

    non_nulles = [b for b in branches if not (isinstance(b, dict) and b.get("type") == "null")]
    if len(non_nulles) == len(branches):
        return None
    if len(non_nulles) != 1:
        # Une union de plusieurs types réels reste exprimable par anyOf ; seule
        # la branche null disparaît.
        reste = dict(noeud)
        reste["anyOf"] = non_nulles
        traduit = _traduire_sans_optionnel(reste, definitions, profondeur)
        traduit["nullable"] = True
        return traduit

    fusion = _traduire(non_nulles[0], definitions, profondeur + 1)
    if "description" in noeud and "description" not in fusion:
        fusion["description"] = noeud["description"]
    fusion["nullable"] = True
    return fusion


def _traduire_sans_optionnel(
    noeud: dict[str, Any], definitions: dict[str, Any], profondeur: int
) -> dict[str, Any]:
    traduit: dict[str, Any] = {}
    for cle, valeur in noeud.items():
        if cle in CLES_ADMISES:
            traduit[cle] = _traduire(valeur, definitions, profondeur + 1)
    return traduit


def _nettoyer_format(noeud: dict[str, Any]) -> None:
    format_declare = noeud.get("format")
    if format_declare is None:
        return
    if format_declare not in FORMATS_ADMIS.get(noeud.get("type", ""), frozenset()):
        del noeud["format"]


def _restreindre_requis(noeud: dict[str, Any]) -> None:
    """
    N'exige que des champs réellement décrits.

    Un `required` nommant une propriété absente du schéma traduit ferait
    échouer l'appel, et cela peut arriver si une propriété a été écartée en
    chemin.
    """
    requis = noeud.get("required")
    if not isinstance(requis, list):
        return
    connus = noeud.get("properties", {})
    filtres = [nom for nom in requis if nom in connus]
    if filtres:
        noeud["required"] = filtres
    else:
        noeud.pop("required", None)

"""
Agent d'import de référentiel.

Distinct d'`evidence_compliance_agent`, et le restera : celui-ci lit un cadre
d'audit pour en proposer la structure, l'autre juge une organisation au regard
d'un critère. Deux domaines, deux prompts, deux contrats de sortie. Les fondre
donnerait un agent qui fait mal les deux.

Ce que cet agent ne fait pas : publier, écrire en base, valider. Il propose,
et tout ce qu'il propose ressort marqué comme proposition.
"""

from __future__ import annotations

import asyncio
import json
import logging

from app.config import get_settings
from app.extraction.base import ExtractionImpossible, Section, SourceExtraite
from app.extraction.formats import extracteur_pour
from app.models.import_referentiel import (
    BrouillonImporte,
    DomaineExtrait,
    ReferentielExtrait,
)
from app.services.gemini_client import get_client
from app.services.schema_gemini import schema_pour_gemini
from app.services.validation_regles import DefinitionInvalide, verifier_definition

logger = logging.getLogger(__name__)


PROMPT = """Tu lis un document décrivant un référentiel d'audit RSE/ESG et tu en \
restitues la structure.

Tu restitues, tu n'inventes pas. Cette distinction gouverne tout le reste :

- ne produis un élément que si le document le contient réellement ;
- conserve les codes du document tels qu'ils sont écrits, sans les renuméroter ;
- conserve les libellés au plus près du texte source ;
- laisse null tout champ dont l'information est absente ;
- ne crée aucune référence à une loi, une norme ou une certification que le \
document ne mentionne pas ;
- ne transforme pas une recommandation du document en obligation ;
- n'invente ni preuve attendue, ni règle d'analyse, ni seuil chiffré.

Si le passage ne décrit aucun critère, rends une liste de domaines vide plutôt \
que de combler.

Pour chaque élément, reporte dans `texte_source` le passage dont tu l'as tiré, \
et dans `confiance` ton degré de certitude entre 0 et 1.

N'invente jamais une localisation : le champ `localisation` de chaque élément \
doit reprendre exactement celle qui accompagne le passage, ou rester null.

Structure attendue :
- un référentiel : code, nom, description ;
- des domaines : code, nom, ordre ;
- des sous-domaines éventuels dans chaque domaine ;
- des critères : code, libellé, description, sous_domaine_code éventuel ;
- pour chaque critère, ses questions éventuelles ;
- pour chaque critère, les exigences que le document formule — ce que \
l'organisation doit démontrer ;
- pour chaque exigence, les preuves attendues que le document mentionne ;
- pour chaque critère, les règles d'analyse que le document énonce.

Une règle d'analyse porte sur le critère si elle ne nomme ni exigence ni \
preuve, sur une exigence si elle nomme `exigence_code`, sur une pièce si elle \
nomme aussi `preuve_attendue_libelle` — et dans ce cas `exigence_code` est \
obligatoire.

Types de règle admis et paramètres attendus dans `definition` :
- PRESENCE : elements (liste)
- ELEMENT_ATTENDU : elements (liste)
- DATE_VALIDITE : champ (texte)
- SIGNATURE : aucun paramètre obligatoire
- COHERENCE_DECLARATION : elements (liste)
- INCOHERENCE : elements (liste)
- CONDITION : condition (texte)

N'emploie aucune autre clé dans `definition` : une clé inconnue fait rejeter \
l'extraction entière."""


class ExtractionRefusee(RuntimeError):
    """La sortie du modèle ne respecte pas le contrat. Elle n'est pas réparée."""


def _lots(sections: list[Section], taille_maximale: int) -> list[list[Section]]:
    """
    Regroupe les sections en lots tenant sous une taille donnée.

    Un appel par critère épuiserait le quota en quelques minutes — le
    fournisseur plafonne les requêtes par minute, et un référentiel en compte
    des dizaines. Un appel unique dépasserait la fenêtre de contexte sur un
    document volumineux. Les lots suivent l'ordre du document et ne coupent
    jamais une section, pour que chaque morceau garde sa localisation.
    """
    lots: list[list[Section]] = []
    courant: list[Section] = []
    taille = 0

    for section in sections:
        if courant and taille + section.taille() > taille_maximale:
            lots.append(courant)
            courant = []
            taille = 0
        courant.append(section)
        taille += section.taille()

    if courant:
        lots.append(courant)
    return lots


def _rendre_lot(lot: list[Section]) -> str:
    """Rend un lot en texte, chaque passage précédé de sa localisation mesurée."""
    morceaux = []
    for section in lot:
        loc = section.localisation.model_dump(exclude_none=True)
        morceaux.append(f"[localisation {json.dumps(loc, ensure_ascii=False)}]\n{section.texte}")
    return "\n\n".join(morceaux)


def _valider_regles(brouillon: BrouillonImporte) -> None:
    """
    Repasse chaque règle par la validation métier partagée.

    Pydantic vérifie la forme, pas la cohérence entre le type d'une règle et
    les paramètres qu'il exige. Sans ce second passage, une règle acceptée ici
    serait refusée par Java à l'insertion — après que le brouillon a commencé
    à s'écrire.
    """
    for domaine in brouillon.domaines:
        for critere in domaine.criteres:
            for regle in critere.regles_analyse:
                try:
                    verifier_definition(regle.type.value, regle.definition)
                except DefinitionInvalide as exc:
                    raise ExtractionRefusee(
                        f"Règle {regle.code} du critère {critere.code} : {exc}"
                    ) from exc


def _fusionner(brouillons: list[BrouillonImporte]) -> tuple[BrouillonImporte, list[dict]]:
    """
    Assemble les résultats des lots dans l'ordre où ils ont été produits.

    Un domaine reparaissant d'un lot à l'autre voit ses critères ajoutés à
    ceux déjà recueillis — un domaine s'étend souvent sur plusieurs pages. Les
    critères de même code ne sont pas fusionnés ni supprimés : le second est
    écarté du brouillon et la duplication est rapportée, à charge pour le
    relecteur de trancher. Supprimer silencieusement ferait disparaître une
    information que personne n'aurait vue passer.

    Rend le brouillon et la liste des doublons écartés. Ils étaient jusqu'ici
    seulement écrits dans les journaux du service : personne, côté produit, ne
    pouvait savoir qu'un critère avait été mis de côté.
    """
    if not brouillons:
        raise ExtractionRefusee("Aucun lot n'a produit de résultat exploitable")

    referentiel = next(
        (b.referentiel for b in brouillons if b.referentiel.code), brouillons[0].referentiel
    )
    par_code: dict[str, DomaineExtrait] = {}
    doublons: list[dict] = []

    for brouillon in brouillons:
        for domaine in brouillon.domaines:
            existant = par_code.get(domaine.code)
            if existant is None:
                par_code[domaine.code] = domaine.model_copy(deep=True)
                continue
            codes_connus = {c.code for c in existant.criteres}
            for critere in domaine.criteres:
                if critere.code in codes_connus:
                    # Ce que l'on sait réellement : la nature, le code, et le
                    # domaine où la redite est apparue. Le numéro du lot n'est
                    # pas connu ici — l'inventer donnerait une fausse piste.
                    doublons.append(
                        {
                            "type": "CRITERE",
                            "code": critere.code,
                            "domaine_code": domaine.code,
                            "libelle": critere.libelle,
                        }
                    )
                    continue
                existant.criteres.append(critere.model_copy(deep=True))
                codes_connus.add(critere.code)
            codes_sd = {sd.code for sd in existant.sous_domaines}
            for sous_domaine in domaine.sous_domaines:
                if sous_domaine.code not in codes_sd:
                    existant.sous_domaines.append(sous_domaine.model_copy(deep=True))

    if doublons:
        logger.warning(
            "Import : %d critère(s) en double entre lots, écartés du brouillon : %s",
            len(doublons),
            ", ".join(d["code"] for d in doublons[:10]),
        )

    return BrouillonImporte(referentiel=referentiel, domaines=list(par_code.values())), doublons


async def _analyser_lot(lot: list[Section], index: int, total: int) -> BrouillonImporte | None:
    """Soumet un lot au modèle et valide sa réponse. Un lot vide de sens rend None."""
    settings = get_settings()
    client = get_client()

    prompt = (
        f"{PROMPT}\n\n"
        f"Passage {index} sur {total} du document.\n\n"
        f"{_rendre_lot(lot)}"
    )

    # Le schéma est dérivé du modèle, pas le modèle lui-même : l'API Gemini
    # Developer refuse le `additionalProperties` que produit `extra="forbid"`,
    # et ne déréférence pas les `$ref` des modèles imbriqués. Voir
    # `schema_gemini`. Le contrat reste celui du modèle — c'est lui qui valide
    # la réponse ci-dessous.
    reponse = await client.aio.models.generate_content(
        model=settings.gemini_model,
        contents=prompt,
        config={
            "response_mime_type": "application/json",
            "response_schema": schema_pour_gemini(BrouillonImporte),
        },
    )

    # Le SDK ne peuple `.parsed` que lorsqu'on lui passe une classe ; avec un
    # schéma explicite, la réponse est validée ici par le modèle strict. Elle
    # n'est jamais réparée : une sortie non conforme est un échec d'extraction.
    try:
        return BrouillonImporte.model_validate_json(reponse.text or "")
    except Exception as exc:
        raise ExtractionRefusee(
            f"Le lot {index} a produit une structure non conforme au contrat : {exc}"
        ) from exc


async def analyser(contenu: bytes, nom_fichier: str, type_mime: str) -> dict:
    """
    Lit un fichier de référentiel et en propose la structure.

    Rend le brouillon proposé et ce que l'extraction a mesuré du fichier. Ne
    rend jamais de contenu à demi validé : soit la proposition satisfait le
    contrat entière, soit l'extraction échoue.
    """
    settings = get_settings()

    extracteur = extracteur_pour(type_mime)
    source: SourceExtraite = extracteur.extraire(contenu, nom_fichier)

    lots = _lots(source.sections, settings.import_taille_lot_caracteres)
    if len(lots) > settings.import_lots_maximum:
        raise ExtractionImpossible(
            f"Document trop volumineux : {len(lots)} lots nécessaires, "
            f"maximum {settings.import_lots_maximum}"
        )

    resultats: list[BrouillonImporte] = []
    for index, lot in enumerate(lots, start=1):
        if index > 1 and settings.import_delai_entre_lots_ms > 0:
            # Le fournisseur plafonne les requêtes par minute. Enchaîner les
            # lots sans pause épuise le quota et fait échouer la fin du
            # document, après que le début a déjà consommé des appels.
            await asyncio.sleep(settings.import_delai_entre_lots_ms / 1000)
        resultat = await _analyser_lot(lot, index, len(lots))
        if resultat is not None:
            resultats.append(resultat)

    brouillon, doublons = _fusionner(resultats)
    _valider_regles(brouillon)

    return {
        "brouillon": brouillon,
        "metadonnees": {
            **source.metadonnees,
            "type_source": source.type_source.value,
            "sections": len(source.sections),
            "lots": len(lots),
            "modele": settings.gemini_model,
            # Remontés jusqu'au relecteur plutôt que laissés aux journaux :
            # un critère écarté sans que personne ne le sache est une
            # information perdue, pas un détail d'implémentation.
            "doublons": doublons,
            **brouillon.compter(),
        },
    }

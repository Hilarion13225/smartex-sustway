"""
Document Agent V2 — un relevé, pas un verdict.

Le V1 résume à l'aveugle : il ne reçoit ni critère, ni attente, et choisit
lui-même ce qui compte en cinq phrases. Si l'élément décisif n'y entre pas, il
est définitivement perdu — aucun agent en aval ne lit le fichier.

Le V2 lui dit ce que l'audit attend. C'est plus précis, et c'est aussi plus
dangereux : dire à un modèle ce qu'on cherche l'incite à le trouver. Toute la
conception de ce module tient à cette tension.

Trois garde-fous y répondent, et aucun n'est décoratif :

  1. Le prompt sépare matériellement l'ATTENTE de l'OBSERVATION, et énonce
     qu'une attente n'est pas une preuve.
  2. Le schéma de sortie impose une valeur de présence pour CHAQUE référence,
     absence comprise : la non-réponse devient impossible, l'écart devient
     visible.
  3. La sortie est recoupée avec l'entrée — toute référence que le modèle
     n'aurait pas reçue est écartée, et toute référence oubliée est complétée
     plutôt que laissée muette.

Le V1 (`document_agent.py`) n'est pas touché : il reste la voie de production
tant que le V2 n'est pas validé.
"""

from __future__ import annotations

import base64
import logging
import time
from typing import Literal

from google.genai import types
from pydantic import BaseModel, Field

from app.services.appel_gemini import appeler_gemini
from app.models.contrat_v2 import (
    AnalyseDocumentV2,
    Catalogue,
    Critere,
    ElementReleve,
    Piece,
)
from app.services.gemini_client import get_client
from app.services.schema_gemini import schema_pour_gemini

logger = logging.getLogger(__name__)

# En deçà, il n'y a rien à soumettre : appeler le modèle sur un fichier vide
# dépenserait du quota pour obtenir une invention.
TAILLE_MINIMALE_EXPLOITABLE = 16


class ReferenceHorsContexte(ValueError):
    """Le modèle a rendu une référence qui ne lui avait pas été soumise."""


class AttenteDocumentaire(BaseModel):
    """
    Ce que l'audit attend, tel qu'il est présenté à l'agent.

    `elements_attendus` vient des règles qui portent sur cette pièce — leurs
    `definition.elements` et `mention_attendue`. La sévérité, elle, n'est pas
    transmise : elle inciterait à pondérer, donc à juger, et la graduation
    appartient à l'agent de conformité.
    """

    reference: str
    type: str = "AUTRE"
    libelle: str
    description: str | None = None
    obligatoire: bool = True
    elements_attendus: list[str] = Field(default_factory=list)


class DocumentAgentRequestV2(BaseModel):
    """Un appel, un document. Le rapprochement multi-documents relève d'Evidence."""

    piece: Piece
    critere: Critere
    attentes: list[AttenteDocumentaire] = Field(default_factory=list)


class _ConstatModele(BaseModel):
    """
    Ce que le modèle doit rendre pour chaque attente.

    Modèle distinct de `ElementReleve` : celui-ci est le schéma soumis à
    Gemini, celui-là le contrat interne. Les garder séparés permet de
    recouper la sortie brute avant de la promouvoir en contrat — un modèle
    qui invente une référence ne doit pas produire directement un objet du
    contrat.
    """

    reference: str = Field(description="La référence exacte de l'attente examinée.")
    presence: Literal["PRESENT", "PARTIEL", "ABSENT", "NON_VERIFIABLE"] = Field(
        description=(
            "PRESENT si l'élément est observable dans le document. "
            "PARTIEL si une partie seulement l'est. "
            "ABSENT si le document est lisible et ne contient rien de tel. "
            "NON_VERIFIABLE si le document ne permet pas d'en juger."
        )
    )
    elements_releves: list[str] = Field(
        default_factory=list,
        description="Ce qui a été effectivement observé. Vide si rien ne l'a été.",
    )
    elements_manquants: list[str] = Field(
        default_factory=list,
        description="Ce qui n'a pas été retrouvé dans le document.",
    )


class _LectureModele(BaseModel):
    """Sortie brute attendue de Gemini."""

    resume: str = Field(
        description="Description factuelle du contenu du document, en 5 phrases maximum."
    )
    constats: list[_ConstatModele] = Field(
        default_factory=list,
        description="Un constat par attente soumise, sans exception.",
    )
    confiance_lecture: float = Field(
        ge=0,
        le=1,
        description=(
            "Confiance dans la LECTURE du document : lisibilité, complétude du "
            "texte extrait. N'exprime jamais un avis sur la conformité."
        ),
    )


def _formater_attentes(attentes: list[AttenteDocumentaire]) -> str:
    if not attentes:
        return "(aucun élément attendu n'a été transmis pour ce document)"
    lignes = []
    for attente in attentes:
        caractere = "obligatoire" if attente.obligatoire else "facultative"
        lignes.append(f"- [{attente.reference}] {attente.libelle} ({attente.type}, {caractere})")
        if attente.description:
            lignes.append(f"    Recevabilité : {attente.description}")
        for element in attente.elements_attendus:
            lignes.append(f"    À rechercher : {element}")
    return "\n".join(lignes)


def _construire_prompt(requete: DocumentAgentRequestV2) -> str:
    description = f"\nDescription : {requete.critere.description}" if requete.critere.description else ""

    return (
        "Tu es un agent de LECTURE documentaire pour la plateforme Smartex Sustway.\n"
        "Ton rôle est de RELEVER ce qu'un document contient. Il n'est pas de juger "
        "si l'organisation est conforme : un autre agent s'en charge, avec d'autres "
        "informations que les tiennes.\n\n"
        f"Critère audité :\nCode : {requete.critere.code}\n"
        f"Libellé : {requete.critere.libelle}{description}\n\n"
        "=== CE QUE L'AUDIT ATTEND (attentes, PAS des constats) ===\n"
        f"{_formater_attentes(requete.attentes)}\n\n"
        "=== CE QUE TU DOIS FAIRE ===\n"
        "Pour CHAQUE référence entre crochets ci-dessus, sans exception, rends un "
        "constat portant exactement cette référence.\n\n"
        "Règle absolue : une attente n'est pas une preuve. Le fait qu'un élément "
        "soit attendu ne dit RIEN sur sa présence dans le document. Ne déduis "
        "jamais d'une attente qu'elle est satisfaite.\n\n"
        "N'invente jamais : ni signature, ni date, ni approbation, ni validation, "
        "ni certification, ni auteur, ni numéro de version. Si le document ne le "
        "dit pas explicitement, il ne le dit pas.\n\n"
        "Ne mentionne aucune page, aucun paragraphe, aucune section, aucune "
        "coordonnée : tu n'as aucun moyen de les vérifier.\n\n"
        "Choix de la présence :\n"
        "- PRESENT : l'élément est clairement observable dans le document.\n"
        "- PARTIEL : une partie de l'élément est observable, le reste ne l'est pas. "
        "Ne complète surtout pas la partie manquante.\n"
        "- ABSENT : le document est lisible et tu n'y as rien retrouvé de tel. "
        "Formule-le comme un constat de lecture (« aucune signature n'a été "
        "retrouvée »), jamais comme une affirmation sur le monde.\n"
        "- NON_VERIFIABLE : le document ne te permet pas d'en juger — illisible, "
        "tronqué, sans texte exploitable, mention ambiguë. N'utilise JAMAIS ABSENT "
        "dans ce cas : ne pas pouvoir vérifier n'est pas constater une absence.\n\n"
        "elements_releves : uniquement ce que tu as réellement lu.\n"
        "elements_manquants : ce que tu n'as pas retrouvé.\n\n"
        "confiance_lecture : ta confiance dans ta LECTURE du document — sa "
        "lisibilité, la qualité du texte extrait. Un document parfaitement lisible "
        "qui ne démontre rien mérite une confiance de lecture ÉLEVÉE. Cette valeur "
        "ne dit rien de la conformité.\n\n"
        "Réponds en français."
    )


def _lecture_impossible(requete: DocumentAgentRequestV2, motif: str) -> AnalyseDocumentV2:
    """
    Résultat contrôlé quand il n'y a rien à lire.

    Toutes les attentes passent en NON_VERIFIABLE — et non ABSENT : sans
    contenu exploitable, on ne constate rien, on ne peut simplement pas
    regarder. Aucun contenu n'est fabriqué.
    """
    return AnalyseDocumentV2(
        piece_reference=requete.piece.reference,
        nom=requete.piece.nom,
        resume=f"[{requete.piece.nom}] {motif}",
        constats=[
            ElementReleve(
                reference=attente.reference,
                presence="NON_VERIFIABLE",
                elements_manquants=[motif],
            )
            for attente in requete.attentes
        ],
        confiance_lecture=0.0,
    )


def _recouper(
    lecture: _LectureModele,
    requete: DocumentAgentRequestV2,
) -> list[ElementReleve]:
    """
    Confronte la sortie du modèle aux attentes réellement soumises.

    Deux écarts possibles, traités différemment :

    Une référence rendue qui n'a pas été soumise est ÉCARTÉE. C'est soit une
    erreur de recopie, soit une invention ; dans les deux cas elle ne désigne
    rien et l'accepter propagerait un rattachement faux jusqu'à la
    recommandation finale.

    Une référence soumise que le modèle a omise est COMPLÉTÉE en
    NON_VERIFIABLE. Le contrat promet une valeur pour chaque attente, et la
    tenir compte plus que de perdre l'analyse entière pour un oubli. Le
    complètement est journalisé : du point de vue de l'appelant le point n'a
    pas été déterminé, et c'est ce que NON_VERIFIABLE dit.
    """
    attendues = {attente.reference for attente in requete.attentes}
    par_reference: dict[str, ElementReleve] = {}

    for constat in lecture.constats:
        if constat.reference not in attendues:
            logger.warning(
                "Document Agent V2 : référence hors contexte écartée (%s) pour la pièce %s",
                constat.reference,
                requete.piece.reference,
            )
            continue
        if constat.reference in par_reference:
            logger.warning(
                "Document Agent V2 : constat en double pour %s, le premier est conservé",
                constat.reference,
            )
            continue
        par_reference[constat.reference] = ElementReleve(
            reference=constat.reference,
            presence=constat.presence,
            elements_releves=constat.elements_releves,
            elements_manquants=constat.elements_manquants,
        )

    for attente in requete.attentes:
        if attente.reference not in par_reference:
            logger.warning(
                "Document Agent V2 : aucune réponse pour %s, complété en NON_VERIFIABLE",
                attente.reference,
            )
            par_reference[attente.reference] = ElementReleve(
                reference=attente.reference,
                presence="NON_VERIFIABLE",
                elements_manquants=["Ce point n'a pas été déterminé lors de la lecture."],
            )

    # L'ordre des attentes, non celui du modèle : la sortie doit être
    # reproductible et comparable d'une lecture à l'autre.
    return [par_reference[attente.reference] for attente in requete.attentes]


async def analyser(requete: DocumentAgentRequestV2) -> AnalyseDocumentV2:
    """Lit un document dans le contexte du critère, et rend ce qu'il y a relevé."""
    debut = time.monotonic()
    logger.info(
        "Document Agent V2 : lecture de %s (%s, %d octets), %d attente(s)",
        requete.piece.reference,
        requete.piece.type_mime,
        requete.piece.taille,
        len(requete.attentes),
    )

    try:
        contenu = base64.b64decode(requete.piece.contenu_base64, validate=True)
    except Exception:
        logger.warning(
            "Document Agent V2 : contenu illisible pour %s", requete.piece.reference
        )
        return _lecture_impossible(requete, "Le contenu du fichier n'a pas pu être décodé.")

    if len(contenu) < TAILLE_MINIMALE_EXPLOITABLE:
        return _lecture_impossible(
            requete, "Le fichier est vide ou trop court pour être exploité."
        )

    # Le client est résolu ici, et non dans l'enrobage, pour que l'absence de
    # configuration reste détectée avant l'appel — comportement inchangé.
    client = get_client()

    try:
        appel = await appeler_gemini(
            agent="DOCUMENT",
            # La référence de pièce est locale au payload (`p1`, `p2`) : elle
            # distingue les appels documentaires d'une même passe sans rien
            # dire du fichier.
            piece_reference=requete.piece.reference,
            contents=[
                types.Part.from_bytes(data=contenu, mime_type=requete.piece.type_mime),
                _construire_prompt(requete),
            ],
            config={
                "response_mime_type": "application/json",
                "response_schema": schema_pour_gemini(_LectureModele),
            },
            client=client,
        )
    except Exception:
        # Le contenu du document n'apparaît jamais dans la trace : seule la
        # référence de la pièce, qui ne dit rien de ce qu'elle contient.
        # L'enrobage a déjà journalisé la cause assainie ; on n'ajoute ici
        # que le contexte métier, sans pile.
        logger.error(
            "Document Agent V2 : échec Gemini sur la pièce %s", requete.piece.reference
        )
        raise
    reponse = appel.reponse

    lecture = _LectureModele.model_validate_json(reponse.text)
    constats = _recouper(lecture, requete)

    duree_ms = int((time.monotonic() - debut) * 1000)
    logger.info(
        "Document Agent V2 : %s lue en %d ms — %d constat(s), confiance de lecture %.2f",
        requete.piece.reference,
        duree_ms,
        len(constats),
        lecture.confiance_lecture,
    )

    return AnalyseDocumentV2(
        piece_reference=requete.piece.reference,
        nom=requete.piece.nom,
        resume=lecture.resume or f"[{requete.piece.nom}] Aucun contenu exploitable relevé.",
        constats=constats,
        confiance_lecture=lecture.confiance_lecture,
    )


def attentes_depuis(catalogue: Catalogue) -> list[AttenteDocumentaire]:
    """
    Compose les attentes documentaires à partir du catalogue transmis.

    Chaque preuve attendue devient une attente ; les règles qui la visent
    apportent leurs éléments à rechercher. Les règles de portée critère ou
    exigence ne sont pas rattachées ici : les rattacher à une pièce
    particulière ferait relever un élément général comme s'il devait figurer
    dans ce document-là.
    """
    elements_par_reference: dict[str, list[str]] = {}
    for regle in catalogue.regles_analyse:
        if regle.portee.niveau != "PREUVE_ATTENDUE" or not regle.portee.reference:
            continue
        cible = elements_par_reference.setdefault(regle.portee.reference, [])
        definition = regle.definition if isinstance(regle.definition, dict) else {}
        for element in definition.get("elements", []) or []:
            cible.append(str(element))
        mention = definition.get("mention_attendue")
        if mention:
            cible.append(str(mention))
        if not definition.get("elements") and not mention:
            # Une règle sans détail apporte tout de même son énoncé : c'est ce
            # qu'il faut chercher, même formulé en une phrase.
            cible.append(regle.libelle)

    return [
        AttenteDocumentaire(
            reference=preuve.reference,
            type=preuve.type,
            libelle=preuve.libelle,
            description=preuve.description,
            obligatoire=preuve.obligatoire,
            elements_attendus=elements_par_reference.get(preuve.reference, []),
        )
        for preuve in catalogue.preuves_attendues
    ]

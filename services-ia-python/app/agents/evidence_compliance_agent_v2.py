"""
Evidence/Compliance Agent V2 — juger la couverture, sans jamais la fabriquer.

C'est l'agent le plus sensible du pipeline : sa `probabilite_conformite` est
la seule entrée de `ScoringEngine` côté Java. Tout ce qui l'influence
influence la note d'une organisation.

Ce qui change par rapport au V1 tient en une phrase : il ne lit plus les
documents, il lit ce que le Document Agent V2 y a **constaté**. La différence
n'est pas cosmétique. Le V1 recevait cinq phrases de résumé libre et devait
deviner ce que l'audit cherchait ; le V2 reçoit, attente par attente, un
constat explicite — PRESENT, PARTIEL, ABSENT ou NON_VERIFIABLE — et n'a plus
qu'à en tirer les conséquences.

Trois séparations gouvernent ce module, et aucune n'est négociable :

  1. Une ATTENTE du catalogue n'est pas une OBSERVATION. « Démontrer une
     validation par la direction » ne dit rien sur ce que le document contient.
  2. Une DÉCLARATION de l'organisation n'est pas une PREUVE documentaire. Elle
     oriente le jugement, elle ne l'établit pas.
  3. NON_VERIFIABLE n'est pas ABSENT. Le premier abaisse la confiance, le
     second la probabilité. Les confondre ferait sanctionner un scan illisible
     comme une non-conformité.

RG27 tient ici comme ailleurs : cet agent ne produit ni note, ni niveau. La
conversion probabilité → note appartient à `ScoringEngine`, côté Java.

Le V1 (`evidence_compliance_agent.py`) n'est pas touché.
"""

from __future__ import annotations

import logging
import time
from typing import Literal

from pydantic import BaseModel, Field

from app.services.appel_gemini import appeler_gemini
from app.models.contrat_v2 import (
    AnalyseDocumentV2,
    Catalogue,
    Critere,
    Declaration,
    EvaluationPreuve,
    Rattachement,
    ResultatEvidenceV2,
    Situation,
)
from app.services.gemini_client import get_client
from app.services.schema_gemini import schema_pour_gemini

logger = logging.getLogger(__name__)


class EvidenceComplianceRequestV2(BaseModel):
    """
    Ce que l'agent reçoit — et ce qu'il ne reçoit pas.

    `analyses_documents` porte des `AnalyseDocumentV2`, qui n'ont aucun champ
    de contenu : le fichier brut ne peut donc structurellement pas arriver
    jusqu'ici. Ce n'est pas une convention à respecter, c'est une propriété du
    type.

    `organisation` est délibérément absent. Le secteur est réservé à Risk et
    Recommendation : le jugement de conformité doit rester identique pour deux
    organisations qui déposent les mêmes pièces, sans quoi un score cesse
    d'être comparable et devient difficile à défendre.
    """

    critere: Critere
    situation: Situation | None = None
    catalogue: Catalogue = Field(default_factory=Catalogue)
    declaration: Declaration | None = None
    analyses_documents: list[AnalyseDocumentV2] = Field(default_factory=list)


# === Schéma soumis au modèle ==============================================


class _EvaluationModele(BaseModel):
    """Ce que le modèle doit rendre pour chaque preuve attendue."""

    reference: str = Field(description="La référence exacte de la preuve attendue évaluée.")
    couverture: Literal["COMPLETE", "PARTIELLE", "INSUFFISANTE", "NON_VERIFIABLE"] = Field(
        description=(
            "COMPLETE si l'attente est démontrée par ce qui a été observé. "
            "PARTIELLE si une partie l'est seulement. "
            "INSUFFISANTE si rien de probant n'a été observé dans des pièces lisibles. "
            "NON_VERIFIABLE si les pièces ne permettent pas de conclure."
        )
    )
    pieces_utilisees: list[str] = Field(
        default_factory=list,
        description="Les références des pièces sur lesquelles ce jugement s'appuie.",
    )
    elements_observes: list[str] = Field(
        default_factory=list, description="Ce qui a été effectivement constaté."
    )
    elements_manquants: list[str] = Field(
        default_factory=list,
        description="Ce qui était attendu et n'a pas été constaté. Jamais d'élément non attendu.",
    )
    elements_non_verifiables: list[str] = Field(
        default_factory=list,
        description="Ce que les pièces n'ont pas permis de juger.",
    )
    conflit: str | None = Field(
        default=None,
        description="Décrit la contradiction si deux pièces se contredisent, sinon null.",
    )
    justification: str = Field(description="Une ou deux phrases, en français.")


class _ResultatModele(BaseModel):
    """Sortie brute attendue de Gemini."""

    couverture_preuve: bool = Field(
        description="Les pièces fournies concernent-elles réellement ce critère ?"
    )
    justification_couverture: str
    probabilite_conformite: float = Field(
        ge=0,
        le=1,
        description=(
            "Probabilité que l'exigence soit satisfaite, au vu des seuls éléments "
            "fournis. Ne baisse pas parce qu'un point est non vérifiable."
        ),
    )
    confiance: float = Field(
        ge=0,
        le=1,
        description=(
            "Degré de certitude DANS cette estimation. Baisse quand des points "
            "sont non vérifiables ou quand les pièces sont ambiguës."
        ),
    )
    justification_conformite: str
    evaluations: list[_EvaluationModele] = Field(
        default_factory=list,
        description="Une évaluation par preuve attendue soumise, sans exception.",
    )


# === Composition du prompt ================================================


def _formater_exigences(catalogue: Catalogue) -> str:
    if not catalogue.exigences:
        return "(aucune exigence rédigée pour ce critère)"
    return "\n".join(
        f"- [{e.code}] {e.intitule} : {e.enonce}" for e in catalogue.exigences
    )


def _formater_attentes(catalogue: Catalogue) -> str:
    """Ce que l'audit attend — présenté comme une attente, jamais comme un fait."""
    if not catalogue.preuves_attendues:
        return "(aucune pièce attendue n'est décrite pour ce critère)"
    lignes = []
    for preuve in catalogue.preuves_attendues:
        caractere = "obligatoire" if preuve.obligatoire else "facultative"
        lignes.append(
            f"- [{preuve.reference}] {preuve.libelle} "
            f"({preuve.type}, {caractere}, exigence {preuve.exigence_code})"
        )
        if preuve.description:
            lignes.append(f"    Recevabilité : {preuve.description}")
    return "\n".join(lignes)


def _formater_regles(catalogue: Catalogue) -> str:
    """
    Les règles, avec leur portée réelle.

    Une règle de portée critère n'est jamais présentée comme portant sur une
    pièce : la faire remonter artificiellement vers une pièce particulière
    ferait reprocher à un document de ne pas porter un élément qui ne le
    concerne pas.
    """
    if not catalogue.regles_analyse:
        return "(aucune règle d'analyse n'est définie pour ce critère)"
    lignes = []
    for regle in catalogue.regles_analyse:
        if regle.portee.niveau == "PREUVE_ATTENDUE":
            portee = f"la pièce attendue [{regle.portee.reference}]"
        elif regle.portee.niveau == "EXIGENCE":
            portee = f"l'exigence [{regle.portee.reference}]"
        else:
            portee = "le critère dans son ensemble"
        details = ""
        definition = regle.definition if isinstance(regle.definition, dict) else {}
        elements = definition.get("elements")
        if elements:
            details = " Éléments à rechercher : " + ", ".join(str(e) for e in elements) + "."
        for cle, valeur in sorted(definition.items()):
            if cle != "elements":
                details += f" {cle} : {valeur}."
        lignes.append(
            f"- [{regle.code}, sévérité {regle.severite}] {regle.libelle} "
            f"— porte sur {portee}.{details}"
        )
    return "\n".join(lignes)


def _formater_constats(analyses: list[AnalyseDocumentV2]) -> str:
    """Ce qui a été réellement observé — la seule source factuelle de l'agent."""
    if not analyses:
        return "(aucune pièce n'a été déposée sur ce critère)"
    lignes = []
    for analyse in analyses:
        confiance = (
            f", confiance de lecture {analyse.confiance_lecture:.2f}"
            if analyse.confiance_lecture is not None
            else ""
        )
        lignes.append(f"Pièce [{analyse.piece_reference}] « {analyse.nom} »{confiance}")
        lignes.append(f"    Lecture : {analyse.resume}")
        if not analyse.constats:
            lignes.append("    (aucun constat rattaché à une attente)")
        for constat in analyse.constats:
            lignes.append(f"    [{constat.reference}] → {constat.presence}")
            for observe in constat.elements_releves:
                lignes.append(f"        observé : {observe}")
            for manquant in constat.elements_manquants:
                lignes.append(f"        non retrouvé : {manquant}")
    return "\n".join(lignes)


def _formater_declaration(declaration: Declaration | None) -> str:
    if declaration is None or (not declaration.scenario and not declaration.reponses):
        return "(l'organisation n'a rien déclaré sur ce critère)"
    lignes = []
    for reponse in declaration.reponses:
        valeur = reponse.valeur or "sans réponse"
        commentaire = f" — {reponse.commentaire}" if reponse.commentaire else ""
        lignes.append(f"- {reponse.question} : {valeur}{commentaire}")
    if declaration.scenario:
        lignes.append(f"- Scénario décrit : {declaration.scenario}")
    return "\n".join(lignes)


def _construire_prompt(requete: EvidenceComplianceRequestV2) -> str:
    critere = requete.critere
    description = f"\nDescription : {critere.description}" if critere.description else ""
    situation = ""
    if requete.situation:
        s = requete.situation
        morceaux = [m for m in (s.referentiel_nom or s.referentiel_code, s.domaine_nom) if m]
        if morceaux:
            situation = "\nCadre : " + " — ".join(morceaux)

    return (
        "Tu es un agent d'évaluation de conformité RSE pour la plateforme Smartex "
        "Sustway.\n"
        "Tu ne lis pas les documents : un autre agent les a lus pour toi et t'en "
        "livre ses constats. Tu juges la couverture des attentes à partir de ces "
        "constats, et de rien d'autre.\n\n"
        f"Critère évalué :\nCode : {critere.code}\nLibellé : {critere.libelle}"
        f"{description}{situation}\n\n"
        "=== A. CE QUE LE RÉFÉRENTIEL EXIGE ===\n"
        f"{_formater_exigences(requete.catalogue)}\n\n"
        "=== B. CE QUE L'AUDIT ATTEND EN DÉMONSTRATION ===\n"
        "Ce sont des ATTENTES. Elles ne disent RIEN sur ce que les documents "
        "contiennent. Ne déduis jamais d'une attente qu'elle est satisfaite.\n"
        f"{_formater_attentes(requete.catalogue)}\n\n"
        "=== C. RÈGLES D'ANALYSE À APPLIQUER ===\n"
        "Applique chaque règle à sa portée réelle, et à elle seule.\n"
        f"{_formater_regles(requete.catalogue)}\n\n"
        "=== D. CE QUI A ÉTÉ RÉELLEMENT OBSERVÉ DANS LES PIÈCES ===\n"
        "Ceci est ta seule source factuelle.\n"
        f"{_formater_constats(requete.analyses_documents)}\n\n"
        "=== E. CE QUE L'ORGANISATION DÉCLARE (non vérifié) ===\n"
        "Ce sont des AFFIRMATIONS, pas des preuves documentaires. Une déclaration "
        "favorable sans pièce à l'appui doit réduire la CONFIANCE, jamais tenir "
        "lieu de démonstration.\n"
        f"{_formater_declaration(requete.declaration)}\n\n"
        "=== CE QUE TU DOIS PRODUIRE ===\n"
        "Pour CHAQUE référence de pièce attendue listée en B, sans exception, rends "
        "une évaluation portant exactement cette référence.\n\n"
        "Interprétation des constats de la section D :\n"
        "- PRESENT : l'élément attendu a été observé.\n"
        "- PARTIEL : une partie l'a été. Ne complète pas le reste.\n"
        "- ABSENT : la pièce était lisible et l'élément n'y a pas été retrouvé.\n"
        "- NON_VERIFIABLE : la pièce ne permet pas d'en juger. Ce n'est PAS une "
        "absence. Ne le traite jamais comme un ABSENT.\n\n"
        "Couverture d'une attente :\n"
        "- COMPLETE : démontrée par ce qui a été observé.\n"
        "- PARTIELLE : partiellement démontrée.\n"
        "- INSUFFISANTE : rien de probant observé, dans des pièces pourtant lisibles.\n"
        "- NON_VERIFIABLE : les pièces ne permettent pas de conclure. Utilise cette "
        "valeur plutôt qu'INSUFFISANTE quand le doute vient de la lisibilité et non "
        "du contenu.\n\n"
        "elements_manquants : uniquement ce qui était ATTENDU en B ou en C et n'a "
        "pas été constaté. N'y ajoute jamais un élément que le référentiel ne "
        "demande pas.\n\n"
        "Si deux pièces se contredisent sur un même point, renseigne `conflit` et "
        "décris la contradiction. Ne tranche pas silencieusement en faveur de l'une "
        "d'elles.\n\n"
        "probabilite_conformite : probabilité que l'exigence soit satisfaite au vu "
        "des seuls éléments fournis. Un point NON_VERIFIABLE ne la fait PAS baisser "
        "— il fait baisser la confiance.\n"
        "confiance : ta certitude dans cette estimation. Elle baisse quand des "
        "points sont non vérifiables, quand les pièces sont ambiguës, ou quand le "
        "jugement repose surtout sur du déclaratif.\n\n"
        "INTERDICTIONS ABSOLUES. N'invente jamais : une preuve, un document, un "
        "constat que la section D ne contient pas, une référence qui n'apparaît pas "
        "ci-dessus, une signature, une date, une approbation, une validation, une "
        "certification. Ne mentionne aucune page, aucun paragraphe, aucune section : "
        "tu n'as aucun moyen de les vérifier.\n\n"
        "Ne produis ni note, ni niveau de maturité : ce calcul ne t'appartient pas.\n\n"
        "Réponds en français."
    )


# === Recoupement ==========================================================


def _recouper(
    brut: _ResultatModele, requete: EvidenceComplianceRequestV2
) -> tuple[list[EvaluationPreuve], list[Rattachement]]:
    """
    Confronte la sortie du modèle au contexte réellement transmis.

    Trois écarts, trois traitements — et la différence compte :

    Une évaluation portant une référence non soumise est ÉCARTÉE. Elle ne
    désigne rien, et l'accepter propagerait un rattachement faux jusqu'à la
    recommandation finale.

    Une pièce citée qui n'a pas été fournie est RETIRÉE de `pieces_utilisees`,
    sans invalider l'évaluation : le jugement peut rester bon même si le
    modèle a mal nommé sa source. Le retrait est journalisé.

    Une attente soumise que le modèle a omise est COMPLÉTÉE en
    NON_VERIFIABLE — et non INSUFFISANTE. Le contrat promet une évaluation par
    attente ; la compléter en « insuffisant » reprocherait à l'organisation un
    silence de l'agent.
    """
    attendues = [p.reference for p in requete.catalogue.preuves_attendues]
    connues = set(attendues)
    pieces_connues = {a.piece_reference for a in requete.analyses_documents}

    par_reference: dict[str, EvaluationPreuve] = {}
    for evaluation in brut.evaluations:
        if evaluation.reference not in connues:
            logger.warning(
                "Evidence V2 : évaluation d'une référence hors contexte, écartée (%s)",
                evaluation.reference,
            )
            continue
        if evaluation.reference in par_reference:
            logger.warning(
                "Evidence V2 : évaluation en double pour %s, la première est conservée",
                evaluation.reference,
            )
            continue

        pieces = []
        for piece in evaluation.pieces_utilisees:
            if piece in pieces_connues:
                pieces.append(piece)
            else:
                logger.warning(
                    "Evidence V2 : pièce inconnue citée pour %s, retirée (%s)",
                    evaluation.reference,
                    piece,
                )

        par_reference[evaluation.reference] = EvaluationPreuve(
            reference=evaluation.reference,
            couverture=evaluation.couverture,
            pieces_utilisees=pieces,
            elements_observes=evaluation.elements_observes,
            elements_manquants=evaluation.elements_manquants,
            elements_non_verifiables=evaluation.elements_non_verifiables,
            conflit=evaluation.conflit,
            justification=evaluation.justification,
        )

    for reference in attendues:
        if reference not in par_reference:
            logger.warning(
                "Evidence V2 : aucune évaluation pour %s, complétée en NON_VERIFIABLE",
                reference,
            )
            par_reference[reference] = EvaluationPreuve(
                reference=reference,
                couverture="NON_VERIFIABLE",
                justification="Cette attente n'a pas été évaluée lors de l'analyse.",
            )

    # L'ordre du catalogue, non celui du modèle : deux analyses du même
    # contexte doivent être comparables ligne à ligne.
    evaluations = [par_reference[reference] for reference in attendues]

    return evaluations, _elements_manquants(evaluations, requete)


def _elements_manquants(
    evaluations: list[EvaluationPreuve], requete: EvidenceComplianceRequestV2
) -> list[Rattachement]:
    """
    Rattache les écarts au référentiel, pour que Recommendation puisse s'y
    accrocher sans redécouvrir par le texte.

    Dérivé des évaluations plutôt que demandé au modèle : ce qu'il aurait
    rendu là serait une seconde formulation du même jugement, susceptible d'en
    diverger. Ici la liste ne peut pas contredire les évaluations, elle les
    résume.

    NON_VERIFIABLE n'y figure pas : un point qu'on n'a pas pu juger n'est pas
    un manque à reprocher. Il pèse sur la confiance, pas sur la liste des
    écarts.
    """
    manquants: list[Rattachement] = []
    incompletes = set()

    for evaluation in evaluations:
        if evaluation.couverture in ("PARTIELLE", "INSUFFISANTE"):
            manquants.append(
                Rattachement(niveau="PREUVE_ATTENDUE", reference=evaluation.reference)
            )
            incompletes.add(evaluation.reference)

    # Une règle portant sur une pièce non couverte est elle-même en écart.
    for regle in requete.catalogue.regles_analyse:
        if regle.portee.niveau == "PREUVE_ATTENDUE" and regle.portee.reference in incompletes:
            manquants.append(Rattachement(niveau="REGLE", reference=regle.code))

    return manquants


# === Point d'entrée =======================================================


async def evaluer(requete: EvidenceComplianceRequestV2) -> ResultatEvidenceV2:
    """Juge la couverture des attentes à partir des constats documentaires."""
    debut = time.monotonic()
    nb_constats = sum(len(a.constats) for a in requete.analyses_documents)
    logger.info(
        "Evidence V2 : critère %s — %d attente(s), %d pièce(s), %d constat(s)",
        requete.critere.code,
        len(requete.catalogue.preuves_attendues),
        len(requete.analyses_documents),
        nb_constats,
    )

    client = get_client()

    try:
        appel = await appeler_gemini(
            agent="EVIDENCE",
            contents=_construire_prompt(requete),
            config={
                "response_mime_type": "application/json",
                "response_schema": schema_pour_gemini(_ResultatModele),
            },
            client=client,
        )
    except Exception:
        # Ni contenu, ni prompt dans la trace : le prompt porte les données
        # métier du client. La cause assainie est déjà au journal.
        logger.error("Evidence V2 : échec Gemini sur le critère %s", requete.critere.code)
        raise
    reponse = appel.reponse

    # La sortie brute n'est jamais utilisée telle quelle. Pydantic refuse ici
    # les types faux et les probabilités hors [0,1] ; le recoupement écarte
    # ensuite ce qui ne désigne rien.
    brut = _ResultatModele.model_validate_json(reponse.text)
    evaluations, manquants = _recouper(brut, requete)

    duree_ms = int((time.monotonic() - debut) * 1000)
    logger.info(
        "Evidence V2 : critère %s évalué en %d ms — %d évaluation(s), "
        "probabilité %.2f, confiance %.2f",
        requete.critere.code,
        duree_ms,
        len(evaluations),
        brut.probabilite_conformite,
        brut.confiance,
    )

    return ResultatEvidenceV2(
        couverture_preuve=brut.couverture_preuve,
        justification_couverture=brut.justification_couverture,
        probabilite_conformite=brut.probabilite_conformite,
        confiance=brut.confiance,
        justification_conformite=brut.justification_conformite,
        elements_manquants=manquants,
        evaluations=evaluations,
    )

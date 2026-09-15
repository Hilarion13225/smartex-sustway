"""
Risk Agent V2 — juger la situation, pas la conformité.

Evidence a tranché : telle attente est couverte, telle autre ne l'est pas.
Risk ne rejuge rien de cela. Il répond à une autre question — cette situation,
telle qu'Evidence l'a établie, représente-t-elle un risque pour
l'organisation ?

Ce qui garantit qu'il ne rejuge pas, ce n'est pas une consigne de prompt :
**il ne reçoit pas les exigences**. Leur énoncé l'inviterait à réévaluer la
satisfaction de l'attente, c'est-à-dire à refaire le travail d'Evidence et à
produire un double signalement. Les preuves attendues et les règles lui
suffisent à savoir ce qui aurait dû figurer dans une pièce, sans lui dire ce
que l'organisation doit démontrer. Le moindre privilège est ici un outil de
conception avant d'être une mesure de sécurité — et `CatalogueRisque` le rend
structurellement vrai plutôt que déclaré.

Il ne reçoit pas non plus les documents. Il ne doit donc jamais écrire « le
document montre » ni « le document contient » : il ne l'a pas lu, et
l'affirmer serait une invention.

Deux distinctions gouvernent son jugement :

  NON_VERIFIABLE n'est pas ABSENT. Une pièce illisible accroît l'incertitude
  du diagnostic ; elle ne prouve aucune lacune et ne doit pas produire un
  risque élevé.

  Une DÉCLARATION n'est pas une PREUVE. Une affirmation favorable qu'aucune
  pièce ne corrobore est elle-même un signal — pas une démonstration.

RG27 tient ici comme ailleurs : cet agent ne produit ni note, ni gravité, ni
probabilité de risque. Le risque attendu — (1 − probabilité) × criticité —
reste calculé côté Java, de façon déterministe.

Le V1 (`risk_agent.py`) n'est pas touché.
"""

from __future__ import annotations

import logging
import time

from pydantic import BaseModel, Field

from app.services.appel_gemini import appeler_gemini
from app.models.contrat_v2 import (
    CATEGORIES_RISQUE_V2,
    Critere,
    Declaration,
    Organisation,
    PreuveAttendue,
    Rattachement,
    RegleAnalyse,
    ResultatEvidenceV2,
    ResultatRisqueV2,
    SignalRisque,
    Situation,
)
from app.services.gemini_client import get_client
from app.services.schema_gemini import schema_pour_gemini

logger = logging.getLogger(__name__)


class CatalogueRisque(BaseModel):
    """
    Le catalogue tel que Risk le voit — sans les exigences.

    Ce n'est pas `Catalogue` amputé à la sérialisation : c'est un type qui n'a
    pas de champ `exigences`. La différence compte — un champ omis par
    convention finit toujours par être rempli un jour, un champ inexistant ne
    le peut pas.

    Les règles conservent leur portée réelle, EXIGENCE comprise : leur
    référence est alors un code d'exigence, et un code ne dit pas ce que
    l'exigence demande.
    """

    preuves_attendues: list[PreuveAttendue] = Field(default_factory=list)
    regles_analyse: list[RegleAnalyse] = Field(default_factory=list)


class RiskAgentRequestV2(BaseModel):
    """
    Ce que Risk reçoit — et ce qu'il ne peut pas recevoir.

    Ni `exigences` (absentes de `CatalogueRisque`), ni contenu documentaire
    (`ResultatEvidenceV2` n'a aucun champ de contenu). Les deux absences sont
    des propriétés de types, vérifiables par test.

    `organisation` est ici présent, contrairement à Evidence : le secteur peut
    contextualiser le risque, jamais le jugement de conformité.
    """

    critere: Critere
    situation: Situation | None = None
    organisation: Organisation | None = None
    catalogue: CatalogueRisque = Field(default_factory=CatalogueRisque)
    declaration: Declaration | None = None
    resultat_evidence: ResultatEvidenceV2


# === Schéma soumis au modèle ==============================================


class _SignalModele(BaseModel):
    """Un signal tel que le modèle doit le rendre."""

    categorie: str = Field(
        description="Une valeur parmi : " + ", ".join(CATEGORIES_RISQUE_V2) + "."
    )
    rattachement_niveau: str | None = Field(
        default=None,
        description="PREUVE_ATTENDUE ou REGLE si le signal vise l'un d'eux, sinon null.",
    )
    rattachement_reference: str | None = Field(
        default=None,
        description="La référence exacte visée, telle qu'elle apparaît en entrée.",
    )
    pieces_concernees: list[str] = Field(
        default_factory=list,
        description="Les références des pièces concernées, parmi celles citées par Evidence.",
    )
    justification: str = Field(description="Une ou deux phrases, en français.")


class _ResultatModele(BaseModel):
    """Sortie brute attendue de Gemini."""

    signal_risque: bool = Field(
        description="Un signal d'alerte a-t-il été détecté dans la situation ?"
    )
    categorie: str | None = Field(
        default=None,
        description="Catégorie du signal principal si signal_risque est vrai, sinon null.",
    )
    justification: str = Field(
        default="", description="Synthèse en une ou deux phrases. Vide si aucun signal."
    )
    confiance: float = Field(
        ge=0,
        le=1,
        description=(
            "Certitude DANS ce diagnostic de risque. Baisse quand des points sont "
            "non vérifiables ou quand le jugement repose surtout sur du déclaratif. "
            "N'exprime pas la gravité du risque."
        ),
    )
    signaux: list[_SignalModele] = Field(
        default_factory=list, description="Le détail des signaux détectés."
    )


# === Composition du prompt ================================================


def _formater_attentes(catalogue: CatalogueRisque) -> str:
    if not catalogue.preuves_attendues:
        return "(aucune pièce attendue n'est décrite pour ce critère)"
    lignes = []
    for preuve in catalogue.preuves_attendues:
        caractere = "obligatoire" if preuve.obligatoire else "facultative"
        lignes.append(f"- [{preuve.reference}] {preuve.libelle} ({preuve.type}, {caractere})")
        if preuve.description:
            lignes.append(f"    Recevabilité : {preuve.description}")
    return "\n".join(lignes)


def _formater_regles(catalogue: CatalogueRisque) -> str:
    """
    Les règles à leur portée réelle.

    Une règle de portée critère n'est jamais présentée comme portant sur une
    pièce : la faire remonter artificiellement ferait reprocher à un document
    un élément qui ne le concerne pas.
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
        lignes.append(
            f"- [{regle.code}, sévérité {regle.severite}] {regle.libelle} — porte sur {portee}."
        )
    return "\n".join(lignes)


def _formater_evidence(resultat: ResultatEvidenceV2) -> str:
    """Le diagnostic de conformité, déjà établi. Risk s'en sert, il ne le refait pas."""
    lignes = [
        f"Couverture des pièces jugée pertinente : {'oui' if resultat.couverture_preuve else 'non'}"
        f" — {resultat.justification_couverture}",
        f"Probabilité de conformité estimée : {resultat.probabilite_conformite:.2f}",
        f"Confiance dans cette estimation : {resultat.confiance:.2f}",
        f"Justification : {resultat.justification_conformite}",
        "",
        "Détail attente par attente :",
    ]
    if not resultat.evaluations:
        lignes.append("(aucune attente n'a été évaluée)")
    for evaluation in resultat.evaluations:
        pieces = ", ".join(evaluation.pieces_utilisees) or "aucune pièce"
        lignes.append(f"- [{evaluation.reference}] couverture {evaluation.couverture} ({pieces})")
        for observe in evaluation.elements_observes:
            lignes.append(f"    constaté : {observe}")
        for manquant in evaluation.elements_manquants:
            lignes.append(f"    non constaté : {manquant}")
        for non_verifiable in evaluation.elements_non_verifiables:
            lignes.append(f"    non vérifiable : {non_verifiable}")
        if evaluation.conflit:
            lignes.append(f"    CONFLIT ENTRE PIÈCES : {evaluation.conflit}")
        if evaluation.justification:
            lignes.append(f"    appréciation : {evaluation.justification}")
    if resultat.elements_manquants:
        lignes.append("")
        lignes.append("Écarts rattachés au référentiel : " + ", ".join(
            f"{m.niveau} {m.reference}" for m in resultat.elements_manquants))
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


def _formater_organisation(organisation: Organisation | None) -> str:
    """
    Le secteur, s'il est renseigné.

    Absent, la section entière disparaît plutôt que d'annoncer « secteur
    inconnu » : signaler l'ignorance inviterait le modèle à la commenter, ce
    qui produit du bruit sans valeur.
    """
    if organisation is None or not organisation.secteur:
        return ""
    return (
        "\n=== CONTEXTE DE L'ORGANISATION ===\n"
        f"Secteur d'activité : {organisation.secteur}\n"
        "Ce secteur peut orienter la lecture du risque — quels manquements y "
        "pèsent le plus, quelles pièces y sont habituellement attendues. Il ne "
        "modifie jamais le jugement de conformité, qui est déjà établi.\n"
        "N'en déduis AUCUNE obligation légale, réglementation, certification "
        "obligatoire ni seuil chiffré : tu n'as aucun moyen de les vérifier.\n"
    )


def _construire_prompt(requete: RiskAgentRequestV2) -> str:
    critere = requete.critere
    description = f"\nDescription : {critere.description}" if critere.description else ""
    situation = ""
    if requete.situation:
        s = requete.situation
        morceaux = [m for m in (s.referentiel_nom or s.referentiel_code, s.domaine_nom) if m]
        if morceaux:
            situation = "\nCadre : " + " — ".join(morceaux)

    return (
        "Tu es un agent de détection de risque pour un audit RSE (plateforme "
        "Smartex Sustway).\n"
        "Ton rôle est DIFFÉRENT de celui de l'agent de conformité. Il a déjà "
        "tranché ce qui est couvert et ce qui ne l'est pas ; tu ne rejuges rien de "
        "cela. Tu réponds à une autre question : compte tenu de cette situation, "
        "quel risque représente-t-elle pour l'organisation ?\n\n"
        "TU N'AS PAS LU LES DOCUMENTS. Ne dis jamais « le document montre », « le "
        "document contient » ou « j'ai constaté » : tu raisonnes uniquement sur les "
        "résultats structurés ci-dessous.\n\n"
        f"Critère audité :\nCode : {critere.code}\nLibellé : {critere.libelle}"
        f"{description}{situation}\n\n"
        "=== A. CE QUE L'AUDIT ATTENDAIT EN DÉMONSTRATION ===\n"
        f"{_formater_attentes(requete.catalogue)}\n\n"
        "=== B. RÈGLES D'ANALYSE ET LEUR SÉVÉRITÉ ===\n"
        "La sévérité éclaire l'importance d'un manquement. Ce n'est pas un poids "
        "numérique : n'en tire aucun calcul.\n"
        f"{_formater_regles(requete.catalogue)}\n\n"
        "=== C. DIAGNOSTIC DE CONFORMITÉ DÉJÀ ÉTABLI ===\n"
        f"{_formater_evidence(requete.resultat_evidence)}\n\n"
        "=== D. CE QUE L'ORGANISATION DÉCLARE (non vérifié) ===\n"
        f"{_formater_declaration(requete.declaration)}\n"
        f"{_formater_organisation(requete.organisation)}\n"
        "=== CE QUE TU DOIS PRODUIRE ===\n"
        "Cherche des signaux d'alerte dans la SITUATION, parmi :\n"
        "- INFORMATION_MANQUANTE : un élément attendu n'a pas été constaté alors "
        "que les pièces étaient lisibles.\n"
        "- INFORMATION_NON_VERIFIABLE : des points n'ont pas pu être jugés. Ce "
        "n'est PAS une lacune de l'organisation. Ce signal traduit une INCERTITUDE "
        "du diagnostic, pas un manquement — et il doit faire baisser ta confiance "
        "plutôt qu'alourdir le risque.\n"
        "- DECLARATION_NON_CORROBOREE : l'organisation affirme quelque chose "
        "qu'aucune pièce ne vient étayer. Une déclaration n'est pas une preuve.\n"
        "- CONTRADICTION_AVEC_EVALUATION : ce que l'organisation déclare contredit "
        "ce qui a été constaté.\n"
        "- INCOHERENCE : deux pièces se contredisent. Décris la contradiction, ne "
        "tranche pas en faveur de l'une d'elles.\n"
        "- PREUVE_GENERIQUE : les éléments constatés sont vagues et "
        "interchangeables d'une organisation à l'autre.\n"
        "- AUTRE : tout autre signal notable.\n\n"
        "Rattache chaque signal à ce qu'il vise : la référence d'une pièce "
        "attendue [entre crochets en A] ou le code d'une règle [en B]. Un signal "
        "portant sur la situation d'ensemble n'a pas de rattachement.\n\n"
        "Ne signale RIEN si la situation paraît normale : un signal doit rester "
        "l'exception. Une attente pleinement couverte n'est pas un risque.\n\n"
        "INTERDICTIONS ABSOLUES. N'invente jamais : une obligation légale, une "
        "sanction, une réglementation, une certification obligatoire, un seuil "
        "chiffré, un incident, un impact, une information absente des sections "
        "ci-dessus, une référence qui n'y figure pas. Ne présente jamais une "
        "hypothèse comme une obligation. Ne mentionne aucune page ni paragraphe.\n\n"
        "Ne produis ni note, ni gravité, ni probabilité de risque : ce calcul ne "
        "t'appartient pas.\n\n"
        "Réponds en français."
    )


# === Recoupement ==========================================================


def _recouper(brut: _ResultatModele, requete: RiskAgentRequestV2) -> list[SignalRisque]:
    """
    Confronte les signaux au contexte réellement transmis.

    Un rattachement vers une référence absente est RETIRÉ, sans écarter le
    signal : l'alerte peut être juste même si le modèle l'a mal accrochée.
    Écarter le signal entier perdrait une information ; garder un rattachement
    faux ferait pointer un auditeur vers la mauvaise attente. Le retrait est le
    seul choix qui ne perde rien de vrai.

    Une pièce citée qui n'apparaît nulle part dans le diagnostic d'Evidence est
    retirée de la même façon.

    Une catégorie hors liste retombe sur AUTRE — le signal reste, sa
    classification devient prudente. C'est le repli que le V1 applique déjà.
    """
    references_connues = {
        "PREUVE_ATTENDUE": {p.reference for p in requete.catalogue.preuves_attendues},
        "REGLE": {r.code for r in requete.catalogue.regles_analyse},
    }
    pieces_connues = {
        piece
        for evaluation in requete.resultat_evidence.evaluations
        for piece in evaluation.pieces_utilisees
    }

    signaux: list[SignalRisque] = []
    vus: set[tuple] = set()

    for signal in brut.signaux:
        categorie = signal.categorie if signal.categorie in CATEGORIES_RISQUE_V2 else "AUTRE"
        if categorie != signal.categorie:
            logger.warning(
                "Risk V2 : catégorie inconnue « %s », repliée sur AUTRE", signal.categorie
            )

        rattachement = None
        if signal.rattachement_niveau and signal.rattachement_reference:
            admises = references_connues.get(signal.rattachement_niveau, set())
            if signal.rattachement_reference in admises:
                rattachement = Rattachement(
                    niveau=signal.rattachement_niveau,
                    reference=signal.rattachement_reference,
                )
            else:
                logger.warning(
                    "Risk V2 : rattachement hors contexte retiré (%s %s)",
                    signal.rattachement_niveau,
                    signal.rattachement_reference,
                )

        pieces = []
        for piece in signal.pieces_concernees:
            if piece in pieces_connues:
                pieces.append(piece)
            else:
                logger.warning("Risk V2 : pièce inconnue citée, retirée (%s)", piece)

        # Déduplication : deux signaux identiques n'apportent rien et
        # doubleraient l'alerte à l'écran.
        empreinte = (
            categorie,
            rattachement.reference if rattachement else None,
            signal.justification.strip(),
        )
        if empreinte in vus:
            logger.warning("Risk V2 : signal en double écarté (%s)", categorie)
            continue
        vus.add(empreinte)

        signaux.append(SignalRisque(
            categorie=categorie,
            rattachement=rattachement,
            pieces_concernees=pieces,
            justification=signal.justification,
        ))

    # Ordre stable : par catégorie puis par référence. Le modèle ne décide pas
    # de l'ordre d'affichage d'une alerte.
    signaux.sort(key=lambda s: (s.categorie, s.rattachement.reference if s.rattachement else ""))
    return signaux


async def evaluer(requete: RiskAgentRequestV2) -> ResultatRisqueV2:
    """Détecte les signaux de risque de la situation établie par Evidence."""
    debut = time.monotonic()
    logger.info(
        "Risk V2 : critère %s — %d attente(s), %d évaluation(s), secteur %s",
        requete.critere.code,
        len(requete.catalogue.preuves_attendues),
        len(requete.resultat_evidence.evaluations),
        "renseigné" if (requete.organisation and requete.organisation.secteur) else "absent",
    )

    client = get_client()

    try:
        appel = await appeler_gemini(
            agent="RISK",
            contents=_construire_prompt(requete),
            config={
                "response_mime_type": "application/json",
                "response_schema": schema_pour_gemini(_ResultatModele),
            },
            client=client,
        )
    except Exception:
        logger.error("Risk V2 : échec Gemini sur le critère %s", requete.critere.code)
        raise
    reponse = appel.reponse

    brut = _ResultatModele.model_validate_json(reponse.text)
    signaux = _recouper(brut, requete)

    categorie = brut.categorie
    if categorie is not None and categorie not in CATEGORIES_RISQUE_V2:
        logger.warning("Risk V2 : catégorie principale inconnue « %s », repliée sur AUTRE", categorie)
        categorie = "AUTRE"

    duree_ms = int((time.monotonic() - debut) * 1000)
    logger.info(
        "Risk V2 : critère %s analysé en %d ms — signal %s, %d signal/signaux détaillé(s), "
        "confiance %.2f",
        requete.critere.code, duree_ms, brut.signal_risque, len(signaux), brut.confiance,
    )

    return ResultatRisqueV2(
        signal_risque=brut.signal_risque,
        categorie=categorie if brut.signal_risque else None,
        justification=brut.justification,
        confiance=brut.confiance,
        signaux=signaux,
    )


def catalogue_risque_depuis(catalogue) -> CatalogueRisque:
    """
    Réduit le catalogue complet à ce que Risk a le droit de voir.

    Point de passage unique : c'est ici, et nulle part ailleurs, que les
    exigences sont laissées de côté. Le faire au cas par cas dans l'appelant
    reviendrait à parier qu'on n'oubliera jamais.
    """
    return CatalogueRisque(
        preuves_attendues=list(catalogue.preuves_attendues),
        regles_analyse=list(catalogue.regles_analyse),
    )

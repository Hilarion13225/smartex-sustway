"""
Evidence Agent + Compliance Agent - CDC section 10.

Combines en un seul appel Gemini (plutot que deux appels separes) pour
preserver le quota du palier gratuit : le modele repond en une fois a la
fois sur la couverture de la preuve (Evidence) et la probabilite de
conformite (Compliance), via une sortie JSON structuree (response_schema).
Les deux resultats restent logiquement distincts dans la reponse.

RG27 : l'IA ne produit JAMAIS de note (1-5) directement - seulement une
probabilite de conformite (0-1) et un niveau de confiance. La conversion
probabilite -> note revient exclusivement a ScoringEngine cote Quarkus
(deja implemente et teste, phase B) : ce module ne doit jamais introduire
de logique de notation, uniquement l'estimation probabiliste.
"""

from pydantic import BaseModel, Field

from app.config import get_settings
from app.services.gemini_client import get_client


class ReponseDeclaree(BaseModel):
    """RG09 - reponse de l'entreprise a une question du questionnaire du critere."""

    question: str
    valeur: str | None = None
    commentaire: str | None = None


class ResultatEvidenceCompliance(BaseModel):
    couverture_preuve: bool = Field(description="Les documents fournis concernent-ils reellement ce critere ?")
    justification_couverture: str
    probabilite_conformite: float = Field(ge=0, le=1)
    confiance: float = Field(ge=0, le=1)
    justification_conformite: str


def _formater_exigences(exigences) -> str:
    """Ce que le critere exige, tel que le referentiel le formule."""
    if not exigences:
        return ""
    lignes = [f"- [{e.code}] {e.intitule} : {e.enonce}" for e in exigences]
    return "Exigences a verifier :\n" + "\n".join(lignes) + "\n\n"


def _formater_preuves_attendues(preuves) -> str:
    """
    Ce qu'il faudrait fournir, a distinguer de ce qui a ete fourni.

    Le modele doit savoir ce qu'il cherche : sans cette liste, il juge la
    pertinence des documents deposes sur sa seule intuition du libelle.
    """
    if not preuves:
        return ""
    lignes = []
    for p in preuves:
        rattachement = f" (exigence {p.exigence_code})" if p.exigence_code else ""
        caractere = "obligatoire" if p.obligatoire else "facultative"
        precision = f" - {p.description}" if p.description else ""
        lignes.append(f"- {p.libelle} [{p.type}, {caractere}]{rattachement}{precision}")
    return (
        "Elements attendus en demonstration - ce que l'organisation devrait fournir, "
        "et non ce qu'elle a fourni :\n" + "\n".join(lignes) + "\n\n"
    )


def _formater_regles(regles) -> str:
    """
    Rend les regles du referentiel en instructions.

    La regle est une donnee structuree cote plateforme ; c'est ici, et
    seulement ici, qu'elle devient du texte. Aucun prompt n'est stocke en
    base : le referentiel decrit quoi verifier, ce module decide comment le
    demander au modele.
    """
    if not regles:
        return ""
    lignes = []
    for r in regles:
        portee = "le critere dans son ensemble"
        if r.preuve_attendue_libelle:
            portee = f"la piece attendue « {r.preuve_attendue_libelle} »"
        elif r.exigence_code:
            portee = f"l'exigence {r.exigence_code}"
        definition = r.definition if isinstance(r.definition, dict) else {}
        details = ""
        elements = definition.get("elements")
        if elements:
            details = " Elements a rechercher : " + ", ".join(str(e) for e in elements) + "."
        for cle, valeur in sorted(definition.items()):
            if cle != "elements":
                details += f" {cle} : {valeur}."
        lignes.append(
            f"- [{r.type}, severite {r.severite}] {r.libelle} - porte sur {portee}.{details}"
        )
    return (
        "Regles d'analyse a appliquer. Un manquement de severite ELEVEE ou CRITIQUE doit "
        "peser davantage sur la probabilite de conformite qu'un manquement FAIBLE :\n"
        + "\n".join(lignes)
        + "\n\n"
    )


def _formater_reponses(reponses: list[ReponseDeclaree]) -> str:
    if not reponses:
        return "(aucune reponse au questionnaire)"
    lignes = []
    for reponse in reponses:
        valeur = reponse.valeur or "sans reponse"
        commentaire = f" - {reponse.commentaire}" if reponse.commentaire else ""
        lignes.append(f"- {reponse.question} : {valeur}{commentaire}")
    return "\n".join(lignes)


def _construire_prompt(
    code: str,
    libelle: str,
    description: str | None,
    resumes: list[str],
    scenario: str | None,
    reponses: list[ReponseDeclaree],
    exigences=None,
    preuves_attendues=None,
    regles=None,
) -> str:
    resumes_formates = "\n".join(f"- {r}" for r in resumes) if resumes else "(aucun resume disponible)"
    description_ligne = f"\nDescription : {description}" if description else ""
    scenario_formate = scenario or "(aucun scenario decrit)"

    return (
        "Tu es un agent d'evaluation RSE pour la plateforme Smartex Sustway.\n\n"
        f"Critere a evaluer :\nCode : {code}\nLibelle : {libelle}{description_ligne}\n\n"
        # Contexte porte par le referentiel (exigences, preuves attendues,
        # regles). Chaque bloc est vide tant que le referentiel n'a pas ete
        # enrichi : le prompt est alors exactement celui d'avant.
        f"{_formater_exigences(exigences or [])}"
        f"{_formater_preuves_attendues(preuves_attendues or [])}"
        f"{_formater_regles(regles or [])}"
        f"Resumes des documents deposes comme preuves pour ce critere :\n{resumes_formates}\n\n"
        f"Reponses declarees par l'entreprise au questionnaire de ce critere :\n"
        f"{_formater_reponses(reponses)}\n\n"
        f"Scenario decrit par l'entreprise sur ce critere :\n{scenario_formate}\n\n"
        "Les declarations (reponses et scenario) sont des affirmations non verifiees : "
        "elles orientent l'analyse mais ne valent pas preuve. Une declaration favorable "
        "sans document a l'appui doit reduire la CONFIANCE, pas augmenter mecaniquement "
        "la probabilite de conformite.\n\n"
        "Evalue :\n"
        "1. couverture_preuve : les documents fournis concernent-ils reellement ce critere "
        "(meme partiellement) ?\n"
        "2. probabilite_conformite : probabilite (0 a 1) que l'entreprise satisfasse ce critere, "
        "sur la seule base des elements fournis. 0 = clairement non conforme ou aucune preuve "
        "pertinente. 1 = clairement conforme. Valeurs intermediaires si preuve partielle, "
        "ambigue ou insuffisante.\n"
        "3. confiance : ton degre de certitude dans cette estimation. Une preuve ambigue ou "
        "insuffisante doit donner une CONFIANCE BASSE, pas une probabilite proche de 0,5 "
        "presentee avec une confiance elevee - ce sont deux informations distinctes.\n\n"
        "Ne jamais inventer de contenu absent des elements fournis. Justifie chaque evaluation "
        "en une phrase, en francais."
    )


async def evaluer(
    code: str,
    libelle: str,
    description: str | None,
    resumes: list[str],
    scenario: str | None = None,
    reponses: list[ReponseDeclaree] | None = None,
    exigences=None,
    preuves_attendues=None,
    regles=None,
) -> ResultatEvidenceCompliance:
    settings = get_settings()
    client = get_client()
    prompt = _construire_prompt(
        code,
        libelle,
        description,
        resumes,
        scenario,
        reponses or [],
        exigences,
        preuves_attendues,
        regles,
    )

    reponse = await client.aio.models.generate_content(
        model=settings.gemini_model,
        contents=prompt,
        config={
            "response_mime_type": "application/json",
            "response_schema": ResultatEvidenceCompliance,
        },
    )

    parsed = getattr(reponse, "parsed", None)
    if isinstance(parsed, ResultatEvidenceCompliance):
        return parsed

    # Repli si le SDK ne peuple pas .parsed pour une raison ou une autre -
    # on retente un parsing manuel du JSON brut plutot que d'echouer.
    return ResultatEvidenceCompliance.model_validate_json(reponse.text)

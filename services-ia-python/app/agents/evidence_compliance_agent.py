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


class ResultatEvidenceCompliance(BaseModel):
    couverture_preuve: bool = Field(description="Les documents fournis concernent-ils reellement ce critere ?")
    justification_couverture: str
    probabilite_conformite: float = Field(ge=0, le=1)
    confiance: float = Field(ge=0, le=1)
    justification_conformite: str


def _construire_prompt(code: str, libelle: str, description: str | None, resumes: list[str]) -> str:
    resumes_formates = "\n".join(f"- {r}" for r in resumes) if resumes else "(aucun resume disponible)"
    description_ligne = f"\nDescription : {description}" if description else ""

    return (
        "Tu es un agent d'evaluation RSE pour la plateforme Smartex Sustway.\n\n"
        f"Critere a evaluer :\nCode : {code}\nLibelle : {libelle}{description_ligne}\n\n"
        f"Resumes des documents deposes comme preuves pour ce critere :\n{resumes_formates}\n\n"
        "Evalue :\n"
        "1. couverture_preuve : les documents fournis concernent-ils reellement ce critere "
        "(meme partiellement) ?\n"
        "2. probabilite_conformite : probabilite (0 a 1) que l'entreprise satisfasse ce critere, "
        "sur la seule base des preuves fournies. 0 = clairement non conforme ou aucune preuve "
        "pertinente. 1 = clairement conforme. Valeurs intermediaires si preuve partielle, "
        "ambigue ou insuffisante.\n"
        "3. confiance : ton degre de certitude dans cette estimation. Une preuve ambigue ou "
        "insuffisante doit donner une CONFIANCE BASSE, pas une probabilite proche de 0,5 "
        "presentee avec une confiance elevee - ce sont deux informations distinctes.\n\n"
        "Ne jamais inventer de contenu absent des resumes fournis. Justifie chaque evaluation "
        "en une phrase, en francais."
    )


async def evaluer(code: str, libelle: str, description: str | None, resumes: list[str]) -> ResultatEvidenceCompliance:
    settings = get_settings()
    client = get_client()
    prompt = _construire_prompt(code, libelle, description, resumes)

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

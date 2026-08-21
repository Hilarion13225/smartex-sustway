"""
Risk Agent — CDC §10, réservé à la formule Avancées (RG21).

À ne pas confondre avec le risque attendu (RG26 : (1 - probabilité) ×
criticité), qui est un calcul déterministe effectué côté Quarkus et ne
dépend d'aucun appel IA. Le Risk Agent, lui, détecte des signaux d'anomalie
dans le contenu même des preuves — incohérences, preuve trop générique
ou visiblement issue d'un gabarit non personnalisé, contradiction avec la
conclusion du Compliance Agent — indépendamment de la probabilité de
conformité déjà calculée. Ces signaux sont destinés à attirer l'attention
d'un expert (file de revue, module 9) ou à alimenter le Recommendation
Agent, pas à modifier le score ni la probabilité de conformité.
"""

from pydantic import BaseModel, Field

from app.config import get_settings
from app.services.gemini_client import get_client

CATEGORIES_VALIDES = (
    "INCOHERENCE",
    "PREUVE_GENERIQUE",
    "INFORMATION_MANQUANTE",
    "CONTRADICTION_AVEC_EVALUATION",
    "AUTRE",
)


class ResultatRisque(BaseModel):
    signal_risque: bool = Field(
        description="Un signal d'anomalie ou de risque a-t-il été détecté dans les preuves ?"
    )
    categorie: str | None = Field(
        default=None,
        description=(
            "Catégorie du signal si signal_risque est vrai, sinon null. "
            f"Une valeur parmi : {', '.join(CATEGORIES_VALIDES)}."
        ),
    )
    justification: str = Field(
        description="Explication en une ou deux phrases, en français. Chaîne vide si aucun signal détecté."
    )


def _construire_prompt(
    code: str,
    libelle: str,
    description: str | None,
    resumes: list[str],
    probabilite_conformite: float,
    confiance: float,
    justification_conformite: str,
) -> str:
    resumes_formates = "\n".join(f"- {r}" for r in resumes) if resumes else "(aucun résumé disponible)"
    description_ligne = f"\nDescription : {description}" if description else ""

    return (
        "Tu es un agent de détection de risque pour un audit RSE (plateforme Smartex Sustway), "
        "en formule Avancées. Ton rôle est DIFFÉRENT de celui de l'agent de conformité : tu ne "
        "réévalues pas la probabilité de conformité, tu cherches des signaux d'alerte dans le "
        "contenu des preuves elles-mêmes, que la conformité estimée soit haute ou basse.\n\n"
        f"Critère audité :\nCode : {code}\nLibellé : {libelle}{description_ligne}\n\n"
        f"Résumés des documents déposés comme preuves :\n{resumes_formates}\n\n"
        "Conclusion déjà produite par l'agent de conformité (pour contexte uniquement — "
        "ne la recalcule pas) :\n"
        f"- Probabilité de conformité estimée : {probabilite_conformite:.2f}\n"
        f"- Confiance de cette estimation : {confiance:.2f}\n"
        f"- Justification : {justification_conformite}\n\n"
        "Recherche spécifiquement :\n"
        "1. INCOHERENCE : dates, chiffres ou affirmations qui se contredisent entre les documents.\n"
        "2. PREUVE_GENERIQUE : document qui ressemble à un modèle/gabarit non personnalisé "
        "(aucune date précise, aucun nom propre, formulations vagues et interchangeables d'une "
        "entreprise à l'autre) plutôt qu'une preuve réellement propre à cette entreprise.\n"
        "3. INFORMATION_MANQUANTE : un élément normalement attendu pour ce type de critère "
        "(signature, date d'entrée en vigueur, responsable nommé) est absent alors que le "
        "document prétend l'inclure.\n"
        "4. CONTRADICTION_AVEC_EVALUATION : le contenu réel des résumés ne soutient pas la "
        "conclusion de conformité rapportée ci-dessus.\n"
        "5. AUTRE : tout autre signal de risque notable non couvert ci-dessus.\n\n"
        "Ne signale RIEN si les preuves paraissent normales et cohérentes — un signal_risque à "
        "true doit rester l'exception, pas la règle. Ne jamais inventer un signal non étayé par "
        "le contenu des résumés. Réponds en français."
    )


async def evaluer(
    code: str,
    libelle: str,
    description: str | None,
    resumes: list[str],
    probabilite_conformite: float,
    confiance: float,
    justification_conformite: str,
) -> ResultatRisque:
    settings = get_settings()
    client = get_client()
    prompt = _construire_prompt(
        code, libelle, description, resumes, probabilite_conformite, confiance, justification_conformite
    )

    reponse = await client.aio.models.generate_content(
        model=settings.gemini_model,
        contents=prompt,
        config={
            "response_mime_type": "application/json",
            "response_schema": ResultatRisque,
        },
    )

    parsed = getattr(reponse, "parsed", None)
    if isinstance(parsed, ResultatRisque):
        resultat = parsed
    else:
        # Repli si le SDK ne peuple pas .parsed — voir evidence_compliance_agent
        # pour le même motif.
        resultat = ResultatRisque.model_validate_json(reponse.text)

    if resultat.categorie is not None and resultat.categorie not in CATEGORIES_VALIDES:
        resultat.categorie = "AUTRE"

    return resultat

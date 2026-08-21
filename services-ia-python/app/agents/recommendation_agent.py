"""
Recommendation Agent — CDC §10, réservé à la formule Avancées (RG21).

Propose des pistes d'amélioration concrètes pour un critère, sur la seule
base des preuves déjà analysées et de la conclusion du Compliance Agent —
jamais de conseil générique déconnecté du contenu réel des documents.

Portée volontairement limitée à ce lot (Phase E) : cet agent produit un
texte de recommandation attaché à l'évaluation, pas encore la génération
automatique de non-conformités/actions correctives (module 11 du CDC,
prévu en Phase G — "Finalisation" — qui s'appuiera sur risque_evaluation
et non_conforme, déjà en base mais non encore alimentées).

Volet financements verts (§7.7, §10) : le CDC prévoit que cet agent couvre
aussi les axes de mise en conformité vis-à-vis des critères bailleur non
conformes. Comme le mapping critères ↔ Performance Standards IFC/SFI est
un livrable préalable des experts métier RSE non encore disponible
(Phase F, §7.7), cet agent reste pour l'instant générique à tout critère —
son prompt s'étendra naturellement sans changement de contrat une fois
l'applicabilité "bailleur" (RG39) alimentée en base.
"""

from pydantic import BaseModel, Field

from app.config import get_settings
from app.services.gemini_client import get_client


class ResultatRecommandation(BaseModel):
    recommandation_necessaire: bool = Field(
        description=(
            "Existe-t-il une marge d'amélioration réelle sur ce critère, au vu des preuves "
            "et de la conclusion de conformité ? False si la conformité est déjà pleine et "
            "sans réserve — ne pas inventer une recommandation dans ce cas."
        )
    )
    pistes_amelioration: str = Field(
        description=(
            "Pistes concrètes et actionnables, en 2 à 4 phrases maximum, en français. "
            "Chaîne vide si recommandation_necessaire est false."
        )
    )


def _construire_prompt(
    code: str,
    libelle: str,
    description: str | None,
    resumes: list[str],
    probabilite_conformite: float,
    couverture_preuve: bool,
    justification_conformite: str,
) -> str:
    resumes_formates = "\n".join(f"- {r}" for r in resumes) if resumes else "(aucun résumé disponible)"
    description_ligne = f"\nDescription : {description}" if description else ""

    return (
        "Tu es un agent de recommandation pour un audit RSE (plateforme Smartex Sustway), "
        "en formule Avancées. Ton rôle est de proposer des pistes d'amélioration concrètes, "
        "PAS de réévaluer la conformité — appuie-toi sur la conclusion déjà produite.\n\n"
        f"Critère audité :\nCode : {code}\nLibellé : {libelle}{description_ligne}\n\n"
        f"Résumés des documents déposés comme preuves :\n{resumes_formates}\n\n"
        "Conclusion déjà produite par l'agent de conformité (pour contexte uniquement — "
        "ne la recalcule pas) :\n"
        f"- Probabilité de conformité estimée : {probabilite_conformite:.2f}\n"
        f"- Couverture de preuve jugée suffisante : {couverture_preuve}\n"
        f"- Justification : {justification_conformite}\n\n"
        "Si la conformité est déjà pleine et sans réserve (probabilité proche de 1, couverture "
        "de preuve suffisante, aucune lacune identifiable dans les résumés), réponds "
        "recommandation_necessaire=false et pistes_amelioration vide — ne cherche pas à "
        "inventer une amélioration qui n'a pas lieu d'être.\n"
        "Sinon, propose 2 à 4 phrases d'actions concrètes et réalistes pour combler "
        "spécifiquement les lacunes identifiées dans les résumés ci-dessus (jamais un conseil "
        "générique de type \"améliorer la conformité\" sans lien avec le contenu réel des "
        "preuves). Réponds en français."
    )


async def evaluer(
    code: str,
    libelle: str,
    description: str | None,
    resumes: list[str],
    probabilite_conformite: float,
    couverture_preuve: bool,
    justification_conformite: str,
) -> ResultatRecommandation:
    settings = get_settings()
    client = get_client()
    prompt = _construire_prompt(
        code, libelle, description, resumes, probabilite_conformite, couverture_preuve, justification_conformite
    )

    reponse = await client.aio.models.generate_content(
        model=settings.gemini_model,
        contents=prompt,
        config={
            "response_mime_type": "application/json",
            "response_schema": ResultatRecommandation,
        },
    )

    parsed = getattr(reponse, "parsed", None)
    if isinstance(parsed, ResultatRecommandation):
        return parsed

    # Repli si le SDK ne peuple pas .parsed — voir evidence_compliance_agent
    # pour le même motif.
    return ResultatRecommandation.model_validate_json(reponse.text)

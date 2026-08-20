"""
Document Agent — CDC §10, premier maillon du pipeline d'agents IA.

Extrait un résumé factuel du contenu d'un document déposé comme preuve.
Gemini étant multimodal, le fichier (PDF/image) est envoyé directement,
sans étape d'OCR/extraction séparée.
"""

from google.genai import types

from app.config import get_settings
from app.services.gemini_client import get_client

PROMPT = (
    "Tu es un assistant d'audit RSE pour la plateforme Smartex Sustway. "
    "Voici un document déposé comme preuve pour un audit de responsabilité "
    "sociétale des entreprises. Résume factuellement son contenu utile à "
    "l'audit (politiques mentionnées, dates, engagements chiffrés, "
    "signataires), en 5 phrases maximum. Si le document ne contient rien "
    "d'exploitable pour un audit RSE, dis-le explicitement. Ne porte aucun "
    "jugement de conformité : décris seulement ce que contient le document. "
    "Réponds en français, en texte simple (pas de JSON, pas de mise en forme)."
)


async def extraire(contenu: bytes, type_mime: str, nom: str) -> str:
    settings = get_settings()
    client = get_client()

    reponse = await client.aio.models.generate_content(
        model=settings.gemini_model,
        contents=[
            types.Part.from_bytes(data=contenu, mime_type=type_mime),
            PROMPT,
        ],
    )

    texte = (reponse.text or "").strip()
    return texte if texte else f"[{nom}] Aucun contenu exploitable extrait par le Document Agent."

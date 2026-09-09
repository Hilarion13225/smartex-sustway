"""
Extraction d'un référentiel depuis un fichier.

Route distincte de celles de l'analyse d'audit : deux domaines, deux
contrats. Elle reçoit un fichier déjà contrôlé par Quarkus — type, taille,
antivirus — et rend une proposition de structure. Elle n'écrit rien, ne
publie rien, ne valide rien.
"""

import base64
import logging

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from app.agents import referentiel_import_agent
from app.extraction.base import ExtractionImpossible
from app.models.import_referentiel import BrouillonImporte
from app.services.authentification import exiger_appel_de_service
from app.services.gemini_client import GeminiNonConfigure

logger = logging.getLogger(__name__)

router = APIRouter()


class ExtraireReferentielRequest(BaseModel):
    """
    Le fichier arrive par la requête, comme pour les pièces d'audit.

    Ce service n'a aujourd'hui aucun accès au stockage objet — ni identifiants,
    ni client configuré — et lui en donner serait une décision de sécurité à
    part entière. Transmettre le contenu reprend le mécanisme déjà en place
    pour `document_agent`, sans nouveau secret à distribuer.
    """

    import_id: str
    nom_fichier: str
    type_mime: str
    contenu_base64: str


class ExtraireReferentielResponse(BaseModel):
    import_id: str
    brouillon: BrouillonImporte
    metadonnees: dict = Field(default_factory=dict)


@router.post("/extraction", response_model=ExtraireReferentielResponse)
async def extraire_referentiel(
    payload: ExtraireReferentielRequest,
    _appelant: str = Depends(exiger_appel_de_service),
) -> ExtraireReferentielResponse:
    try:
        contenu = base64.b64decode(payload.contenu_base64, validate=True)
    except Exception as exc:
        raise HTTPException(status_code=422, detail="Contenu base64 invalide") from exc

    if not contenu:
        raise HTTPException(status_code=422, detail="Fichier vide")

    try:
        resultat = await referentiel_import_agent.analyser(
            contenu=contenu, nom_fichier=payload.nom_fichier, type_mime=payload.type_mime
        )
    except ExtractionImpossible as exc:
        # Le fichier n'est pas lisible : l'import passera en ECHEC côté Java,
        # avec ce motif. Le fichier source y reste conservé.
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except referentiel_import_agent.ExtractionRefusee as exc:
        # La sortie du modèle ne respecte pas le contrat. Elle n'est pas
        # réparée : un contenu à demi conforme deviendrait un brouillon dont
        # personne ne saurait ce qu'il contient réellement.
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except GeminiNonConfigure as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except Exception as exc:
        logger.exception("Echec de l'extraction du referentiel %s", payload.import_id)
        raise HTTPException(
            status_code=503, detail=f"Echec de l'extraction : {exc}"
        ) from exc

    return ExtraireReferentielResponse(
        import_id=payload.import_id,
        brouillon=resultat["brouillon"],
        metadonnees=resultat["metadonnees"],
    )

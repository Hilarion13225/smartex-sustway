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
from app.services.appel_gemini import classer_erreur
from app.services.assainissement import assainir, message_public
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
        #
        # Le motif est assaini avant de sortir : il enrobe une erreur de
        # validation Pydantic, laquelle rapporte la valeur reçue — donc un
        # fragment du document importé.
        raise HTTPException(status_code=422, detail=assainir(str(exc))) from exc
    except GeminiNonConfigure as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except Exception as exc:
        # Même anomalie qu'à `evaluations.py` : l'exception brute d'un SDK
        # réseau ne doit pas franchir la frontière du service.
        logger.error(
            "Échec de l'extraction du référentiel %s : %s",
            payload.import_id,
            assainir(f"{type(exc).__name__}: {exc}"),
        )
        raise HTTPException(
            status_code=503,
            # La catégorie remplace le message brut : elle dit à l'API
            # appelante si le quota est épuisé ou si le service est en
            # panne — ce dont elle a besoin — sans lui livrer la prose du
            # fournisseur.
            detail=message_public(exc, "Échec de l'extraction", classer_erreur(exc).value),
        ) from exc

    return ExtraireReferentielResponse(
        import_id=payload.import_id,
        brouillon=resultat["brouillon"],
        metadonnees=resultat["metadonnees"],
    )

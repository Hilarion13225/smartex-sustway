"""
Authentification des appels entrants.

Ce service ne décide d'aucun droit et n'expose aucune donnée d'organisation ;
ce qu'il protège, c'est lui-même. Il fait travailler un modèle payant au
quota limité, et lit des documents qu'on lui confie. Sans contrôle, tout
conteneur du réseau pouvait le solliciter — le port n'est plus publié vers
l'extérieur depuis la phase 2, mais l'intérieur restait ouvert.

Le mécanisme réutilise le matériel déjà en place plutôt que d'ajouter un
secret : l'API signe un jeton court avec sa clé privée, ce service le vérifie
avec la clé publique. La clé privée ne quitte jamais l'API, et la clé publique
n'est pas un secret — elle peut être distribuée sans précaution particulière.

Deux garanties tiennent les deux directions fermées. Un jeton de session
d'utilisateur ne passe pas ici : il ne porte ni cette audience ni ce purpose.
Et un jeton de service présenté à l'API serait refusé par son propre filtre,
qui n'accepte que purpose=SESSION. Un secret unique ouvrant les deux portes
n'en fermerait aucune.
"""

from __future__ import annotations

import logging

from fastapi import Header, HTTPException

from app.config import get_settings

logger = logging.getLogger(__name__)

AUDIENCE_ATTENDUE = "services-ia"
PURPOSE_ATTENDU = "SERVICE_IA"


class ConfigurationManquante(RuntimeError):
    """Aucune clé publique n'est configurée : le service ne peut vérifier personne."""


def _cle_publique() -> str:
    """
    Clé publique de vérification, par chemin ou en clair.

    Les deux formes existent parce que les deux environnements diffèrent : en
    développement la clé est un fichier monté, en production une variable,
    comme le fait déjà l'API pour la même paire de clés.
    """
    settings = get_settings()
    if settings.jwt_public_key_path:
        try:
            with open(settings.jwt_public_key_path, encoding="utf-8") as fichier:
                return fichier.read()
        except OSError as exc:
            raise ConfigurationManquante(
                f"Clé publique illisible ({settings.jwt_public_key_path}) : {exc}"
            ) from exc
    if settings.jwt_public_key:
        return settings.jwt_public_key
    raise ConfigurationManquante(
        "Aucune clé publique configurée (SMARTEX_JWT_PUBLIC_KEY_PATH ou "
        "SMARTEX_JWT_PUBLIC_KEY) : les appels entrants ne peuvent pas être vérifiés"
    )


async def exiger_appel_de_service(authorization: str | None = Header(default=None)) -> str:
    """
    Vérifie le jeton de service porté par la requête.

    Le service refuse tout si sa clé n'est pas configurée. Ouvrir en l'absence
    de clé serait le pire des comportements : la protection disparaîtrait
    silencieusement le jour où la configuration se perdrait, sans que rien ne
    le signale.
    """
    settings = get_settings()

    try:
        cle = _cle_publique()
    except ConfigurationManquante as exc:
        logger.error("Vérification impossible : %s", exc)
        raise HTTPException(
            status_code=503, detail="Service mal configuré : vérification des appels impossible"
        ) from exc

    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Jeton de service absent")

    jeton = authorization.removeprefix("Bearer ").strip()

    try:
        import jwt  # PyJWT
    except ImportError as exc:  # pragma: no cover - dépendance déclarée
        logger.error("PyJWT indisponible : impossible de vérifier les appels entrants")
        raise HTTPException(status_code=503, detail="Service mal configuré") from exc

    try:
        charge = jwt.decode(
            jeton,
            cle,
            algorithms=["RS256"],
            audience=AUDIENCE_ATTENDUE,
            issuer=settings.jwt_issuer,
        )
    except Exception as exc:
        # Le motif reste dans les journaux du service. Le renvoyer à l'appelant
        # lui apprendrait quelle vérification a échoué, donc laquelle contourner.
        logger.warning("Jeton de service refusé : %s", exc)
        raise HTTPException(status_code=401, detail="Jeton de service invalide") from exc

    if charge.get("purpose") != PURPOSE_ATTENDU:
        # Un jeton de session est cryptographiquement valide : seule cette
        # vérification empêche qu'il serve à faire travailler le modèle.
        logger.warning("Jeton refusé : purpose %s au lieu de %s", charge.get("purpose"), PURPOSE_ATTENDU)
        raise HTTPException(status_code=401, detail="Jeton de service invalide")

    return charge.get("sub", "inconnu")

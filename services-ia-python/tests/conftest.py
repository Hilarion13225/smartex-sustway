"""
Réglages communs à la suite.

Les routes du service exigent depuis la phase 3D un jeton de service signé par
l'API Java. Les tests qui éprouvent le pipeline n'ont rien à dire sur cette
vérification, et leur faire fabriquer un jeton à chaque appel ne prouverait
rien de plus tout en rendant chacun d'eux illisible. Ils passent donc par une
dépendance neutralisée.

La vérification elle-même est éprouvée à part, dans
`test_authentification_service.py`, qui retire cette neutralisation. C'est
important : sans ce fichier-là, la neutralisation posée ici ferait disparaître
la garantie de toute la suite sans qu'aucun test n'échoue.
"""

import pytest

from app.main import app
from app.services.authentification import exiger_appel_de_service

APPELANT_DE_TEST = "api-quarkus"


@pytest.fixture(autouse=True)
def appel_de_service_admis():
    """Fait comme si l'appelant avait présenté un jeton de service valide."""
    app.dependency_overrides[exiger_appel_de_service] = lambda: APPELANT_DE_TEST
    yield
    app.dependency_overrides.pop(exiger_appel_de_service, None)


@pytest.fixture
def authentification_reelle():
    """
    Rétablit la vérification réelle pour la durée d'un test.

    À demander explicitement, après la fixture automatique ci-dessus : l'ordre
    compte, celle-ci défait ce que l'autre vient de poser.
    """
    app.dependency_overrides.pop(exiger_appel_de_service, None)
    yield

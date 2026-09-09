"""
Socle commun aux extracteurs.

Un extracteur transforme un fichier brut en sections de texte localisées. Il
ne comprend rien au métier : il ne sait pas ce qu'est un critère, et c'est
voulu. Comprendre est le travail de l'agent ; localiser est le travail de
l'extracteur, parce que lui seul mesure réellement une page, une ligne ou un
paragraphe.

C'est aussi ce qui permet de découper l'envoi au modèle : sans frontières
mesurées, on ne saurait pas où couper un document sans perdre la trace de ce
qu'on a coupé.
"""

from __future__ import annotations

from dataclasses import dataclass, field

from app.models.import_referentiel import Localisation, TypeSource


class ExtractionImpossible(RuntimeError):
    """Le fichier ne peut pas être lu. Le motif est destiné à l'administrateur."""


@dataclass
class Section:
    """Un fragment de document, avec l'endroit exact d'où il vient."""

    texte: str
    localisation: Localisation

    def taille(self) -> int:
        return len(self.texte)


@dataclass
class SourceExtraite:
    """Ce qu'un extracteur rend : des sections, et ce qu'il a mesuré du fichier."""

    type_source: TypeSource
    sections: list[Section] = field(default_factory=list)
    metadonnees: dict = field(default_factory=dict)

    def texte_total(self) -> int:
        return sum(s.taille() for s in self.sections)

    def non_vide(self) -> bool:
        return any(s.texte.strip() for s in self.sections)


class Extracteur:
    """Contrat commun. Chaque format en fournit une implémentation."""

    type_source: TypeSource

    def extraire(self, contenu: bytes, nom_fichier: str) -> SourceExtraite:
        raise NotImplementedError

"""
Contrat d'import d'un référentiel.

Ces modèles décrivent ce que l'extraction a le droit de produire. Ils sont le
miroir exact du modèle Java : mêmes énumérations, même hiérarchie, mêmes
portées de règles. Une divergence ici ne se verrait pas tout de suite — elle
se verrait au moment où Java refuserait d'insérer ce que Python a validé.

Deux choses n'y figurent pas, délibérément. `validee_par` et `validee_le`
appartiennent au workflow humain côté Java : ce service n'a rien à dire sur
qui a validé quoi, et pouvoir l'écrire lui permettrait de prétendre qu'un
contenu a été accepté. Et l'origine est forcée à IMPORT_IA à la construction,
sans que le modèle puisse en décider autrement.
"""

from __future__ import annotations

from enum import Enum

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator


# --- Énumérations, miroir des types PostgreSQL -------------------------------


class TypeApplicabilite(str, Enum):
    GENERALE = "GENERALE"
    SECTORIELLE = "SECTORIELLE"
    BAILLEUR = "BAILLEUR"


class NiveauCriticite(str, Enum):
    FAIBLE = "FAIBLE"
    MOYENNE = "MOYENNE"
    ELEVEE = "ELEVEE"
    CRITIQUE = "CRITIQUE"


class TypeQuestion(str, Enum):
    OUVERTE = "OUVERTE"
    FERMEE = "FERMEE"


class EchelleReponse(str, Enum):
    MATURITE = "MATURITE"
    BINAIRE = "BINAIRE"


class TypePreuveAttendue(str, Enum):
    POLITIQUE = "POLITIQUE"
    PROCEDURE = "PROCEDURE"
    REGISTRE = "REGISTRE"
    RAPPORT = "RAPPORT"
    CERTIFICAT = "CERTIFICAT"
    INDICATEUR = "INDICATEUR"
    DOCUMENT_LEGAL = "DOCUMENT_LEGAL"
    PREUVE_OPERATIONNELLE = "PREUVE_OPERATIONNELLE"
    AUTRE = "AUTRE"


class TypeRegleAnalyse(str, Enum):
    PRESENCE = "PRESENCE"
    ELEMENT_ATTENDU = "ELEMENT_ATTENDU"
    DATE_VALIDITE = "DATE_VALIDITE"
    SIGNATURE = "SIGNATURE"
    COHERENCE_DECLARATION = "COHERENCE_DECLARATION"
    INCOHERENCE = "INCOHERENCE"
    CONDITION = "CONDITION"


class TypeSource(str, Enum):
    PDF = "PDF"
    DOCX = "DOCX"
    XLSX = "XLSX"
    CSV = "CSV"
    JSON = "JSON"


# --- Localisation dans la source --------------------------------------------


class Localisation(BaseModel):
    """
    Où l'information a été lue dans le document.

    Chaque format n'en renseigne que ce qu'il connaît réellement : une page
    pour un PDF, une feuille et une ligne pour un tableur, un paragraphe pour
    un document texte, un chemin pour du JSON. Les champs qu'il ne mesure pas
    restent nuls — une localisation approximative serait pire qu'absente,
    puisqu'elle enverrait le relecteur au mauvais endroit avec confiance.
    """

    model_config = ConfigDict(extra="forbid")

    type: TypeSource
    page: int | None = None
    feuille: str | None = None
    ligne: int | None = None
    cellule: str | None = None
    paragraphe: int | None = None
    chemin: str | None = None


class ElementExtrait(BaseModel):
    """Ce que tout élément proposé porte en commun."""

    model_config = ConfigDict(extra="forbid")

    localisation: Localisation | None = None
    texte_source: str | None = Field(
        default=None,
        description="Passage du document dont l'élément est tiré, pour relecture.",
    )
    confiance: float | None = Field(
        default=None,
        ge=0,
        le=1,
        description=(
            "Appréciation du modèle sur sa propre extraction. Informative : "
            "elle ne vaut jamais validation, et une confiance élevée n'autorise "
            "aucune publication automatique."
        ),
    )


# --- Contenu métier ----------------------------------------------------------


class RegleAnalyseExtraite(ElementExtrait):
    """
    Règle proposée, avec sa portée.

    La portée descend du plus général au plus précis, comme côté Java : sans
    référence elle porte sur le critère, avec `exigence_code` sur l'exigence,
    avec les deux sur une pièce attendue précise. Nommer une pièce sans son
    exigence rendrait la portée indéterminable.
    """

    code: str = Field(min_length=1, max_length=40)
    type: TypeRegleAnalyse
    libelle: str = Field(min_length=1, max_length=300)
    severite: NiveauCriticite = NiveauCriticite.MOYENNE
    exigence_code: str | None = None
    preuve_attendue_libelle: str | None = None
    definition: dict = Field(default_factory=dict)

    @model_validator(mode="after")
    def _portee_coherente(self) -> "RegleAnalyseExtraite":
        if self.preuve_attendue_libelle and not self.exigence_code:
            raise ValueError(
                "Une règle portant sur une preuve attendue doit aussi nommer son exigence"
            )
        return self


class PreuveAttendueExtraite(ElementExtrait):
    """Ce que l'audit attendrait en démonstration — pas une pièce déposée."""

    type: TypePreuveAttendue = TypePreuveAttendue.AUTRE
    libelle: str = Field(min_length=1, max_length=300)
    description: str | None = None
    obligatoire: bool = True
    ordre: int = 0


class ExigenceExtraite(ElementExtrait):
    code: str | None = Field(default=None, max_length=40)
    intitule: str = Field(min_length=1, max_length=300)
    enonce: str = Field(min_length=1)
    ordre: int = 0
    preuves_attendues: list[PreuveAttendueExtraite] = Field(default_factory=list)


class QuestionExtraite(ElementExtrait):
    code: str | None = Field(default=None, max_length=30)
    libelle: str = Field(min_length=1)
    type: TypeQuestion = TypeQuestion.FERMEE
    echelle_reponse: EchelleReponse = EchelleReponse.MATURITE
    obligatoire: bool = True
    ordre: int = 0


class CritereExtrait(ElementExtrait):
    code: str = Field(min_length=1, max_length=30)
    libelle: str = Field(min_length=1, max_length=500)
    description: str | None = None
    sous_domaine_code: str | None = Field(default=None, max_length=30)
    applicabilite: TypeApplicabilite = TypeApplicabilite.GENERALE
    criticite: NiveauCriticite | None = None
    coefficient_ponderation: float = Field(default=1.0, ge=1, le=3)
    ordre: int = 0
    questions: list[QuestionExtraite] = Field(default_factory=list)
    exigences: list[ExigenceExtraite] = Field(default_factory=list)
    regles_analyse: list[RegleAnalyseExtraite] = Field(default_factory=list)

    @model_validator(mode="after")
    def _portees_resolvables(self) -> "CritereExtrait":
        """Une règle ne peut viser qu'une exigence et une pièce de ce critère."""
        codes_exigences = {e.code for e in self.exigences if e.code}
        libelles_par_exigence = {
            e.code: {p.libelle for p in e.preuves_attendues} for e in self.exigences if e.code
        }
        for regle in self.regles_analyse:
            if regle.exigence_code and regle.exigence_code not in codes_exigences:
                raise ValueError(
                    f"La règle {regle.code} vise l'exigence {regle.exigence_code}, "
                    f"absente du critère {self.code}"
                )
            if regle.preuve_attendue_libelle:
                connues = libelles_par_exigence.get(regle.exigence_code, set())
                if regle.preuve_attendue_libelle not in connues:
                    raise ValueError(
                        f"La règle {regle.code} vise une preuve attendue absente de "
                        f"l'exigence {regle.exigence_code}"
                    )
        return self


class SousDomaineExtrait(ElementExtrait):
    code: str = Field(min_length=1, max_length=30)
    nom: str = Field(min_length=1, max_length=300)
    description: str | None = None
    ordre: int = 0


class DomaineExtrait(ElementExtrait):
    code: str = Field(min_length=1, max_length=30)
    nom: str = Field(min_length=1, max_length=200)
    description: str | None = None
    ordre: int = 0
    sous_domaines: list[SousDomaineExtrait] = Field(default_factory=list)
    criteres: list[CritereExtrait] = Field(default_factory=list)

    @model_validator(mode="after")
    def _sous_domaines_resolvables(self) -> "DomaineExtrait":
        connus = {sd.code for sd in self.sous_domaines}
        for critere in self.criteres:
            if critere.sous_domaine_code and critere.sous_domaine_code not in connus:
                raise ValueError(
                    f"Le critère {critere.code} se rattache au sous-domaine "
                    f"{critere.sous_domaine_code}, absent du domaine {self.code}"
                )
        return self


class ReferentielExtrait(BaseModel):
    model_config = ConfigDict(extra="forbid")

    code: str = Field(min_length=1, max_length=30)
    nom: str = Field(min_length=1, max_length=200)
    description: str | None = None


class BrouillonImporte(BaseModel):
    """
    Résultat complet d'une extraction, prêt à être proposé.

    Rien ici n'est publié ni validé : c'est une proposition que Java déposera
    dans une version brouillon, marquée IMPORT_IA, et qu'une personne devra
    accepter élément par élément.
    """

    model_config = ConfigDict(extra="forbid")

    referentiel: ReferentielExtrait
    domaines: list[DomaineExtrait] = Field(default_factory=list)

    @model_validator(mode="after")
    def _codes_uniques(self) -> "BrouillonImporte":
        """
        Les codes doivent être uniques là où la base l'exige.

        Un doublon glissé entre deux lots ne serait vu qu'à l'insertion, sur
        une contrainte d'unicité, une fois le brouillon à moitié écrit.
        """
        codes_domaines = [d.code for d in self.domaines]
        doublons = {c for c in codes_domaines if codes_domaines.count(c) > 1}
        if doublons:
            raise ValueError(f"Codes de domaine en double : {', '.join(sorted(doublons))}")

        for domaine in self.domaines:
            codes = [c.code for c in domaine.criteres]
            doublons = {c for c in codes if codes.count(c) > 1}
            if doublons:
                raise ValueError(
                    f"Codes de critère en double dans {domaine.code} : "
                    f"{', '.join(sorted(doublons))}"
                )
        return self

    def compter(self) -> dict[str, int]:
        """Volumétrie de la proposition, pour le suivi de l'import."""
        criteres = [c for d in self.domaines for c in d.criteres]
        exigences = [e for c in criteres for e in c.exigences]
        return {
            "domaines": len(self.domaines),
            "sous_domaines": sum(len(d.sous_domaines) for d in self.domaines),
            "criteres": len(criteres),
            "questions": sum(len(c.questions) for c in criteres),
            "exigences": len(exigences),
            "preuves_attendues": sum(len(e.preuves_attendues) for e in exigences),
            "regles_analyse": sum(len(c.regles_analyse) for c in criteres),
        }


# --- Erreurs -----------------------------------------------------------------


class ErreurExtraction(BaseModel):
    """
    Motif d'échec, exploitable par l'administrateur.

    Le champ `detail` porte ce qui permet de comprendre : le message de
    validation, la section fautive. Un échec sans détail laisserait devant un
    import mort sans rien à corriger.
    """

    model_config = ConfigDict(extra="forbid")

    code: str
    message: str
    detail: str | None = None

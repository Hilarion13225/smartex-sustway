"""
Contrat IA V2 — miroir Python du contrat émis par l'API Java.

Le V1 est plat : douze champs de même rang, un seul consommateur implicite.
Le V2 les regroupe en blocs nommés, non pour transporter davantage — le
payload reste unique — mais pour que l'orchestrateur compose l'entrée de
chaque agent à partir de frontières explicites. Le moindre privilège devient
alors vérifiable par lecture et par test, au lieu d'être déclaré en
commentaire.

Ces modèles vivent EN PARALLÈLE des modèles V1 de `routers/evaluations.py`,
qui restent la voie de production. Rien ici ne remplace quoi que ce soit.

Sur la tolérance aux champs inconnus : ces modèles ne sont volontairement PAS
stricts. Pydantic ignore par défaut ce qu'il ne connaît pas, et c'est
exactement ce que la stratégie de version prévoit — un ajout de champ
optionnel relève du mineur, qu'un service plus ancien doit pouvoir ignorer
sans dommage. Ce qui doit être refusé bruyamment, c'est un MAJEUR inconnu, et
c'est `verifier_version_supportee` qui s'en charge. Interdire les champs
inconnus rendrait tout déploiement décalé impossible, pour une sécurité que la
version apporte déjà.
"""

from __future__ import annotations

import re
from typing import Any, Literal
from uuid import UUID

from pydantic import BaseModel, Field, model_validator

# Version portée par ces modèles. Le majeur gouverne la compatibilité :
# un payload de majeur différent est refusé, jamais traité en dégradé.
CONTRAT_VERSION = "2.0"
MAJEUR_SUPPORTE = "2"

# `<code_exigence>-P<rang>` — le rang commence à 1. Miroir exact de la forme
# validée côté Java par `ReferencesPreuvesAttendues`.
FORME_REFERENCE = re.compile(r"^[A-Za-z0-9._-]+-P[1-9][0-9]*$")

NIVEAU_CRITERE = "CRITERE"
NIVEAU_EXIGENCE = "EXIGENCE"
NIVEAU_PREUVE_ATTENDUE = "PREUVE_ATTENDUE"


class VersionContratNonSupportee(ValueError):
    """Le payload annonce un majeur que ce service ne sait pas honorer."""


def verifier_version_supportee(version: str | None) -> None:
    """
    Refuse explicitement ce qui ne peut pas être honoré.

    L'absence du champ vaut "1.0" : c'est la forme historique, antérieure à
    l'introduction du versionnement. Elle n'a rien à faire sur une route V2.
    """
    valeur = version or "1.0"
    majeur = valeur.split(".", 1)[0]
    if majeur != MAJEUR_SUPPORTE:
        raise VersionContratNonSupportee(
            f"Contrat IA version {valeur} : ce service honore le majeur {MAJEUR_SUPPORTE}"
        )


# === Blocs du contexte ====================================================


class Tracabilite(BaseModel):
    """
    Identifiants de corrélation.

    Aucun agent ne les reçoit : des UUID n'ont aucune valeur pour un modèle de
    langage. Ils servent la corrélation des journaux, côté Java la persistance.
    """

    audit_id: UUID | None = None
    audit_critere_id: UUID
    referentiel_version_id: UUID | None = None


class Situation(BaseModel):
    """Où l'on se trouve : un même code de critère existe dans plusieurs référentiels."""

    referentiel_code: str | None = None
    referentiel_nom: str | None = None
    version_numero: str | None = None
    domaine_code: str | None = None
    domaine_nom: str | None = None
    sous_domaine_code: str | None = None
    sous_domaine_nom: str | None = None


class Critere(BaseModel):
    """Ce qui est audité."""

    code: str = Field(min_length=1)
    libelle: str = Field(min_length=1)
    description: str | None = None


class Exigence(BaseModel):
    """Ce que le critère exige de l'organisation."""

    code: str = Field(min_length=1)
    intitule: str = Field(min_length=1)
    enonce: str = Field(min_length=1)


class PreuveAttendue(BaseModel):
    """
    Ce que l'audit attend en démonstration — à distinguer des pièces, qui sont
    ce que l'organisation a réellement déposé.

    `reference` est LOCALE AU PAYLOAD. Ce n'est ni un UUID, ni une clé
    primaire, ni un identifiant persistant : elle est produite par Java à la
    construction et n'est pas comparable d'une requête à l'autre. Ce service ne
    doit jamais chercher à la résoudre vers un identifiant — cette résolution
    appartient à Java, seul détenteur de la correspondance.
    """

    reference: str = Field(min_length=1)
    exigence_code: str = Field(min_length=1)
    type: str = "AUTRE"
    libelle: str = Field(min_length=1)
    description: str | None = None
    obligatoire: bool = True

    @model_validator(mode="after")
    def _forme_et_coherence(self) -> "PreuveAttendue":
        if not FORME_REFERENCE.match(self.reference):
            raise ValueError(
                f"Référence de preuve attendue malformée : '{self.reference}' "
                "(forme attendue : <code_exigence>-P<rang>)"
            )
        # La référence porte le code de son exigence : une incohérence ici
        # signalerait une numérotation qui a dérivé de son parent, et rendrait
        # tout rattachement de règle trompeur.
        if not self.reference.startswith(f"{self.exigence_code}-P"):
            raise ValueError(
                f"Référence '{self.reference}' incohérente avec son exigence "
                f"'{self.exigence_code}'"
            )
        return self


class Portee(BaseModel):
    """
    Sur quoi porte une règle.

    Le V1 laissait la portée se déduire de deux champs nullables, cascade
    reproduite à l'identique dans le formatage du prompt : une logique métier
    implicite, dupliquée. Ici elle est nommée, donc validable.

    `reference` est nulle si et seulement si le niveau est CRITERE — une règle
    de portée critère ne reçoit jamais une référence de pièce par commodité.
    """

    niveau: Literal["CRITERE", "EXIGENCE", "PREUVE_ATTENDUE"]
    reference: str | None = None

    @model_validator(mode="after")
    def _reference_selon_le_niveau(self) -> "Portee":
        if self.niveau == NIVEAU_CRITERE:
            if self.reference is not None:
                raise ValueError("Une portée CRITERE ne doit porter aucune référence")
            return self
        if not self.reference:
            raise ValueError(f"Une portée {self.niveau} exige une référence")
        if self.niveau == NIVEAU_PREUVE_ATTENDUE and not FORME_REFERENCE.match(self.reference):
            raise ValueError(
                f"Référence de preuve attendue malformée : '{self.reference}'"
            )
        return self


class RegleAnalyse(BaseModel):
    """
    Une règle du référentiel.

    `definition` reste une carte libre : ses clés varient d'un type de règle à
    l'autre et le schéma est ouvert par conception. Une classe dédiée figerait
    ce que le référentiel a précisément voulu laisser extensible.
    """

    code: str = Field(min_length=1)
    type: str = Field(min_length=1)
    libelle: str = Field(min_length=1)
    severite: str = "MOYENNE"
    portee: Portee
    definition: dict[str, Any] = Field(default_factory=dict)


class Catalogue(BaseModel):
    """
    Ce que le référentiel exige, et comment le vérifier.

    Bloc indissociable : une règle désigne sa cible par la référence d'une
    exigence ou d'une preuve attendue de ces mêmes listes.

    Les trois listes peuvent être vides sans que ce soit une anomalie — 37 des
    92 critères du catalogue publié ne portent aucune règle, et c'est une
    décision métier assumée, pas un défaut à signaler.
    """

    exigences: list[Exigence] = Field(default_factory=list)
    preuves_attendues: list[PreuveAttendue] = Field(default_factory=list)
    regles_analyse: list[RegleAnalyse] = Field(default_factory=list)

    @model_validator(mode="after")
    def _coherence_interne(self) -> "Catalogue":
        codes_exigences = {e.code for e in self.exigences}

        references: set[str] = set()
        for preuve in self.preuves_attendues:
            if preuve.reference in references:
                raise ValueError(
                    f"Référence en double dans le payload : {preuve.reference}"
                )
            references.add(preuve.reference)
            # Une preuve attendue orpheline ferait juger l'organisation sur une
            # attente dont l'énoncé n'a pas été transmis.
            if preuve.exigence_code not in codes_exigences:
                raise ValueError(
                    f"Preuve attendue '{preuve.reference}' rattachée à une exigence "
                    f"absente du payload : {preuve.exigence_code}"
                )

        for regle in self.regles_analyse:
            portee = regle.portee
            if portee.niveau == NIVEAU_PREUVE_ATTENDUE and portee.reference not in references:
                raise ValueError(
                    f"Règle {regle.code} : référence de preuve attendue non résoluble "
                    f"— {portee.reference}"
                )
            if portee.niveau == NIVEAU_EXIGENCE and portee.reference not in codes_exigences:
                raise ValueError(
                    f"Règle {regle.code} : exigence visée absente du payload "
                    f"— {portee.reference}"
                )
        return self

    def references_preuves(self) -> set[str]:
        """Les références effectivement transmises — seules admissibles en sortie."""
        return {p.reference for p in self.preuves_attendues}

    def codes_exigences(self) -> set[str]:
        return {e.code for e in self.exigences}

    def codes_regles(self) -> set[str]:
        return {r.code for r in self.regles_analyse}


class Reponse(BaseModel):
    """
    `valeur` porte le libellé complet — « 3 — Défini » — pour que le modèle
    dispose de l'intitulé et non d'un rang isolé. `niveau` l'accompagne sans le
    remplacer : exploitable sans réanalyser une chaîne, et nul pour les
    réponses fermées d'avant V26.
    """

    question: str = Field(min_length=1)
    valeur: str | None = None
    niveau: int | None = Field(default=None, ge=1, le=5)
    commentaire: str | None = None


class Declaration(BaseModel):
    """
    Ce que l'organisation affirme, sans preuve.

    Scénario et réponses réunis : deux formes d'une même chose, que le prompt
    traite déjà comme un couple d'affirmations non vérifiées.
    """

    scenario: str | None = None
    reponses: list[Reponse] = Field(default_factory=list)


class Piece(BaseModel):
    """
    Ce que l'organisation a réellement déposé.

    `preuve_attendue_reference` est le point d'extension prévu pour le
    rattachement d'une pièce à la preuve attendue qu'elle vise : toujours nul
    aujourd'hui, il évitera de rouvrir le contrat le jour où le modèle de
    données portera l'information.
    """

    reference: str = Field(min_length=1)
    nom: str = Field(min_length=1)
    type_mime: str = Field(min_length=1)
    taille: int = Field(ge=0)
    contenu_base64: str = Field(min_length=1)
    preuve_attendue_reference: str | None = None


class Organisation(BaseModel):
    """
    Le seul contexte d'entreprise transmis — et à deux agents seulement.

    Ni raison sociale, ni taille, ni effectif : nommer l'entreprise exposerait
    le modèle à ce qu'il croit savoir d'elle. Le bloc est absent plutôt que
    présent à null quand le secteur n'est pas renseigné : signaler l'ignorance
    inviterait le modèle à la commenter.
    """

    secteur: str | None = None


class Options(BaseModel):
    """
    Ce que le service doit faire, non ce qu'il doit comprendre.

    Le code de formule n'est pas transmis : ce service ne connaît pas la notion
    d'abonnement et n'a aucune raison d'en dépendre.
    """

    analyse_risque: bool = False
    generer_recommandation: bool = False


class EvaluerCritereRequestV2(BaseModel):
    """Le contexte complet soumis au pipeline d'agents."""

    contrat_version: str = CONTRAT_VERSION
    tracabilite: Tracabilite
    situation: Situation | None = None
    critere: Critere
    catalogue: Catalogue = Field(default_factory=Catalogue)
    declaration: Declaration | None = None
    pieces: list[Piece] = Field(default_factory=list)
    organisation: Organisation | None = None
    options: Options = Field(default_factory=Options)

    @model_validator(mode="after")
    def _au_moins_une_source(self) -> "EvaluerCritereRequestV2":
        # Même règle qu'en V1, chemins de champs nouveaux : sans matière, il
        # n'y a rien à analyser et l'appel au modèle serait une dépense sans
        # objet.
        declaration = self.declaration
        a_declare = declaration is not None and (
            declaration.scenario is not None or bool(declaration.reponses)
        )
        if not self.pieces and not a_declare:
            raise ValueError(
                "Aucune source d'analyse : au moins une pièce, un scénario ou une "
                "réponse est requis"
            )
        return self

    @model_validator(mode="after")
    def _references_de_pieces_uniques(self) -> "EvaluerCritereRequestV2":
        vues: set[str] = set()
        for piece in self.pieces:
            if piece.reference in vues:
                raise ValueError(f"Référence de pièce en double : {piece.reference}")
            vues.add(piece.reference)
        return self


# === Sorties des agents ====================================================


class ElementReleve(BaseModel):
    """
    Ce que le Document Agent a effectivement constaté face à un élément attendu.

    `presence` est obligatoire et sans valeur par défaut : c'est ce qui rend la
    non-réponse impossible. Un agent à qui l'on dit quoi chercher est incité à
    le trouver ; exiger une valeur pour chaque référence, absence comprise,
    rend l'écart visible plutôt que silencieux.

    Quatre valeurs, et la quatrième compte autant que les trois autres :

      PRESENT         l'élément est observable dans le document
      PARTIEL         une partie l'est, le reste ne l'est pas
      ABSENT          rien de tel n'a été retrouvé dans un document lisible
      NON_VERIFIABLE  le document ne permet pas d'en juger

    ABSENT et NON_VERIFIABLE ne doivent jamais être confondus. « Je n'ai rien
    trouvé » et « je n'ai pas pu regarder » conduisent à des décisions
    d'audit opposées : la première appelle une action de l'organisation, la
    seconde un document lisible. Un scan illisible classé ABSENT ferait
    reprocher à une entreprise une lacune qui n'en est peut-être pas une.

    `elements_releves` porte ce qui a été observé, `elements_manquants` ce qui
    n'a pas été retrouvé — jamais un jugement de conformité. Séparer les deux
    listes plutôt que d'écrire une phrase mêlant les deux est ce qui rend le
    relevé contradictoire lisible et vérifiable.
    """

    reference: str = Field(min_length=1)
    presence: Literal["PRESENT", "PARTIEL", "ABSENT", "NON_VERIFIABLE"]
    elements_releves: list[str] = Field(default_factory=list)
    elements_manquants: list[str] = Field(default_factory=list)


class AnalyseDocumentV2(BaseModel):
    """
    Ce qu'un agent en aval verra du document — il ne lit jamais le fichier.

    `confiance_lecture` mesure la LECTURE, jamais la conformité : un document
    parfaitement lisible qui ne démontre rien a une confiance de lecture
    élevée. Confondre les deux ferait qu'un scan net et vide serait tenu pour
    aussi probant qu'un document net et complet.
    """

    piece_reference: str = Field(min_length=1)
    nom: str = Field(min_length=1)
    resume: str = Field(min_length=1)
    constats: list[ElementReleve] = Field(default_factory=list)
    confiance_lecture: float | None = Field(default=None, ge=0, le=1)


class Rattachement(BaseModel):
    """Ce à quoi une sortie se rattache dans le référentiel transmis."""

    niveau: Literal["EXIGENCE", "PREUVE_ATTENDUE", "REGLE"]
    reference: str = Field(min_length=1)


class EvaluationPreuve(BaseModel):
    """
    Ce qu'il advient d'UNE preuve attendue, et pourquoi.

    Sans ce détail, un superviseur lit une probabilité globale sans pouvoir la
    contester : il ne sait ni quelle attente a pesé, ni quelle pièce a servi.
    C'est le niveau auquel un désaccord d'audit se discute.

    Quatre couvertures, et la quatrième n'est pas une insuffisance :

      COMPLETE        l'attente est démontrée par ce qui a été observé
      PARTIELLE       une partie l'est, le reste ne l'est pas
      INSUFFISANTE    rien de probant n'a été observé dans des pièces lisibles
      NON_VERIFIABLE  les pièces ne permettent pas de conclure

    INSUFFISANTE reproche quelque chose à l'organisation ; NON_VERIFIABLE ne
    reproche rien et appelle une pièce lisible. Les confondre ferait pénaliser
    une entreprise pour un scan illisible.

    Les trois listes séparent ce qui a été vu, ce qui manque, et ce qui n'a pas
    pu être jugé. Les fondre en une phrase rendrait l'écart indiscutable.
    """

    reference: str = Field(min_length=1)
    couverture: Literal["COMPLETE", "PARTIELLE", "INSUFFISANTE", "NON_VERIFIABLE"]
    pieces_utilisees: list[str] = Field(default_factory=list)
    elements_observes: list[str] = Field(default_factory=list)
    elements_manquants: list[str] = Field(default_factory=list)
    elements_non_verifiables: list[str] = Field(default_factory=list)
    # Deux pièces qui se contredisent sur un même point : l'agent le signale
    # au lieu de trancher seul. Arbitrer sans le dire ferait disparaître une
    # information dont un auditeur a besoin.
    conflit: str | None = None
    justification: str = ""


class ResultatEvidenceV2(BaseModel):
    """
    Les cinq champs V1 sont conservés à l'identique — noms compris — parce
    qu'ils alimentent des colonnes existantes.

    Deux ajouts, tous deux structurés à partir de ce que le modèle produisait
    déjà en prose : `elements_manquants` rattache les écarts au référentiel,
    `evaluations` détaille attente par attente.

    Sémantique des deux nombres, et elle n'est pas symétrique :

      probabilite_conformite  probabilité que l'exigence soit satisfaite, au vu
                              des seuls éléments fournis
      confiance               degré de certitude DANS cette estimation

    Une attente non vérifiable doit abaisser la CONFIANCE, pas la probabilité :
    ne pas avoir pu regarder n'est pas avoir constaté une lacune. Faire baisser
    la probabilité reviendrait à sanctionner un scan illisible comme une
    non-conformité. C'est la même règle que le prompt V1 énonçait déjà pour la
    preuve ambiguë, appliquée ici à NON_VERIFIABLE.
    """

    couverture_preuve: bool
    justification_couverture: str
    probabilite_conformite: float = Field(ge=0, le=1)
    confiance: float = Field(ge=0, le=1)
    justification_conformite: str
    elements_manquants: list[Rattachement] = Field(default_factory=list)
    evaluations: list[EvaluationPreuve] = Field(default_factory=list)


# Catégories de signal, V2. Les cinq premières viennent du V1 et gardent leur
# sens ; les deux dernières comblent un manque que le V1 ne pouvait pas voir,
# faute de recevoir des constats structurés.
CATEGORIES_RISQUE_V2 = (
    "INCOHERENCE",
    "PREUVE_GENERIQUE",
    "INFORMATION_MANQUANTE",
    "CONTRADICTION_AVEC_EVALUATION",
    # Nouvelles : le V1 ne recevait qu'un résumé libre et ne pouvait
    # distinguer ni l'illisible du manquant, ni le déclaré du démontré.
    "INFORMATION_NON_VERIFIABLE",
    "DECLARATION_NON_CORROBOREE",
    "AUTRE",
)


class SignalRisque(BaseModel):
    """
    Un signal, et ce à quoi il se rattache.

    Sans rattachement, un signal de risque est une phrase que personne ne peut
    contester : on ne sait ni sur quelle attente il porte, ni sur quelle pièce.
    C'est le niveau auquel un auditeur peut vérifier ou écarter l'alerte.

    `rattachement` est nul pour un signal portant sur la situation d'ensemble —
    une déclaration non corroborée par aucune pièce, par exemple, ne vise
    aucune preuve attendue en particulier.
    """

    categorie: str = Field(min_length=1)
    rattachement: Rattachement | None = None
    pieces_concernees: list[str] = Field(default_factory=list)
    justification: str = Field(min_length=1)


class ResultatRisqueV2(BaseModel):
    """
    Le signal de risque, et ce qui le fonde.

    Les trois champs V1 sont conservés à l'identique — ils alimentent
    `signal_risque`, `categorie_risque` et `justification_risque` en base.

    Deux ajouts, transportés et non persistés :

      confiance   certitude DANS le diagnostic de risque
      signaux     le détail, rattaché au référentiel

    Sur `confiance` : la spécification l'avait écartée, faute d'usage défini —
    un second nombre invitait à l'agréger avec celui d'Evidence sans qu'on
    sache ce que l'agrégat aurait voulu dire. Elle en a un désormais : une
    information non vérifiable doit accroître l'incertitude du diagnostic sans
    alourdir le risque lui-même. C'est précisément ce que ce champ porte, et
    rien d'autre.

    Ce qui reste refusé, et ne changera pas : ni gravité, ni impact, ni
    probabilité de risque. La plateforme calcule déjà le risque attendu RG26 —
    (1 − probabilité) × criticité — de façon déterministe côté Java. Demander
    une graduation au modèle reviendrait à lui confier ce calcul.
    """

    signal_risque: bool
    categorie: str | None = None
    justification: str = ""
    confiance: float = Field(default=0.5, ge=0, le=1)
    signaux: list[SignalRisque] = Field(default_factory=list)


class ActionRecommandee(BaseModel):
    """
    Une action, et ce qu'elle vient combler.

    Le rattachement n'est pas décoratif : il rend vérifiable la contrainte de
    non-invention. Une action portant sur une référence absente du contexte
    transmis est une exigence inventée, et doit être refusée plutôt que
    présentée à un auditeur.
    """

    action: str = Field(min_length=1)
    rattachement: Rattachement


class ResultatRecommandationV2(BaseModel):
    """
    Les deux champs V1 sont conservés — ils alimentent des colonnes existantes
    et restent le texte lisible affiché aujourd'hui. `actions` s'y ajoute.

    Pas de `priorite` : elle se dérive côté Java de la sévérité de la règle
    rattachée, donnée que Java possède et que le modèle n'a pas.
    """

    recommandation_necessaire: bool
    pistes_amelioration: str = ""
    actions: list[ActionRecommandee] = Field(default_factory=list)


def verifier_rattachements(
    rattachements: list[Rattachement],
    catalogue: Catalogue,
) -> list[Rattachement]:
    """
    Ne garde que ce qui désigne réellement quelque chose du contexte transmis.

    Une référence hors de ce contexte est soit une erreur de recopie, soit une
    invention. Dans les deux cas elle est écartée : l'accepter laisserait
    passer une recommandation portant sur une exigence qui n'existe pas —
    crédible, et fausse.

    La fonction rend la liste retenue plutôt que de lever : une action fautive
    ne doit pas invalider les autres. L'appelant journalise ce qui a été écarté.
    """
    connues = {
        NIVEAU_EXIGENCE: catalogue.codes_exigences(),
        NIVEAU_PREUVE_ATTENDUE: catalogue.references_preuves(),
        "REGLE": catalogue.codes_regles(),
    }
    return [r for r in rattachements if r.reference in connues.get(r.niveau, set())]

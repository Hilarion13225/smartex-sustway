"""
Document Agent V2 — le relevé, et ce qui l'empêche de devenir un verdict.

Ces tests éprouvent le recoupement, pas le modèle : Gemini est remplacé par un
double qui rend exactement ce qu'on veut lui faire dire, y compris des sorties
fautives qu'un vrai modèle produirait rarement mais pourrait produire. C'est
précisément l'intérêt — on ne peut pas éprouver le refus d'une référence
inventée en espérant qu'un modèle en invente une.

La résistance du PROMPT aux hallucinations, elle, ne se démontre pas par un
double : elle se démontre par une exécution réelle. Voir
`test_document_agent_v2_reel.py`.
"""

from __future__ import annotations

import asyncio
import base64
import json

import pytest

from app.agents import document_agent_v2
from app.agents.document_agent_v2 import (
    AttenteDocumentaire,
    DocumentAgentRequestV2,
    attentes_depuis,
)
from app.models.contrat_v2 import Catalogue, Critere, ElementReleve, Piece


def executer(coroutine):
    """
    Exécute une coroutine dans un test synchrone.

    Le projet n'a ni pytest-asyncio ni plugin anyio configuré, et en ajouter un
    pour ces quelques tests changerait les dépendances du service pour un
    besoin qu'une ligne couvre. `asyncio.run` suffit, et isole mieux : chaque
    test ouvre et referme sa propre boucle.
    """
    return asyncio.run(coroutine)


CRITERE = Critere(code="D1-01", libelle="Avez-vous formalisé un code de conduite ?")

TEXTE_PAR_DEFAUT = "Code de conduite et d'éthique de l'organisation."


def piece(texte: str = TEXTE_PAR_DEFAUT, nom: str = "doc.txt") -> Piece:
    contenu = texte.encode("utf-8")
    return Piece(
        reference="p1",
        nom=nom,
        type_mime="text/plain",
        taille=len(contenu),
        contenu_base64=base64.b64encode(contenu).decode("ascii"),
    )


def attente(reference: str, libelle: str = "Code de conduite", **kw) -> AttenteDocumentaire:
    return AttenteDocumentaire(reference=reference, libelle=libelle, **kw)


def requete(*attentes: AttenteDocumentaire, texte: str = TEXTE_PAR_DEFAUT) -> DocumentAgentRequestV2:
    return DocumentAgentRequestV2(
        piece=piece(texte), critere=CRITERE, attentes=list(attentes)
    )


def analyser(*attentes: AttenteDocumentaire, texte: str = TEXTE_PAR_DEFAUT):
    return executer(document_agent_v2.analyser(requete(*attentes, texte=texte)))


class _ReponseGemini:
    def __init__(self, charge: dict):
        self.text = json.dumps(charge, ensure_ascii=False)


@pytest.fixture
def gemini(monkeypatch):
    """
    Remplace l'appel Gemini par un double programmable.

    Rend une fonction : on lui donne la sortie brute que le modèle est censé
    produire, et le test observe ce que l'agent en fait. La liste rendue
    accumule les prompts soumis, ce qui permet de les inspecter.
    """
    appels: list[str] = []

    def programmer(charge: dict) -> list[str]:
        class _Modeles:
            async def generate_content(self, **kwargs):
                appels.append(kwargs["contents"][1])
                return _ReponseGemini(charge)

        class _Aio:
            models = _Modeles()

        class _Client:
            aio = _Aio()

        monkeypatch.setattr(document_agent_v2, "get_client", lambda: _Client())
        return appels

    return programmer


def lecture(constats: list[dict], resume: str = "Résumé factuel.", confiance: float = 0.9) -> dict:
    return {"resume": resume, "constats": constats, "confiance_lecture": confiance}


def constat(reference: str, presence: str, releves=None, manquants=None) -> dict:
    return {
        "reference": reference,
        "presence": presence,
        "elements_releves": releves or [],
        "elements_manquants": manquants or [],
    }


# === 1-3. Les statuts de présence ==========================================


def test_1_element_clairement_present(gemini):
    gemini(lecture([
        constat("D1-01-E1-P1", "PRESENT",
                releves=["Le document contient une section consacrée à l'éthique."])
    ]))

    resultat = analyser(attente("D1-01-E1-P1"))

    assert resultat.constats[0].presence == "PRESENT"
    assert resultat.constats[0].elements_releves == [
        "Le document contient une section consacrée à l'éthique."
    ]


def test_2_element_absent(gemini):
    gemini(lecture([
        constat("D1-01-E1-P1", "ABSENT",
                manquants=["Aucune signature de la direction n'a été retrouvée."])
    ]))

    releve = analyser(attente("D1-01-E1-P1")).constats[0]

    assert releve.presence == "ABSENT"
    assert releve.elements_releves == []
    # Formulation de constat de lecture, pas d'affirmation sur le monde.
    assert "retrouvée" in releve.elements_manquants[0]


def test_3_document_illisible_donne_non_verifiable(gemini):
    gemini(lecture(
        [constat("D1-01-E1-P1", "NON_VERIFIABLE",
                 manquants=["Le scan ne comporte aucun texte exploitable."])],
        confiance=0.1,
    ))

    resultat = analyser(attente("D1-01-E1-P1"))

    assert resultat.constats[0].presence == "NON_VERIFIABLE"
    assert resultat.confiance_lecture == 0.1


# === 4-5. Ne pas compléter, ne pas déduire =================================


def test_4_information_partielle_nest_pas_completee(gemini):
    gemini(lecture([
        constat("D1-01-E1-P1", "PARTIEL",
                releves=["Le document énonce des valeurs générales."],
                manquants=["Aucune date n'a été retrouvée.",
                           "Aucun signataire n'a été retrouvé."])
    ]))

    releve = analyser(attente("D1-01-E1-P1")).constats[0]

    assert releve.presence == "PARTIEL"
    assert len(releve.elements_manquants) == 2
    # Ce qui manque reste dans les manquants : rien ne remonte en relevé.
    assert all("date" not in observe.lower() for observe in releve.elements_releves)


def test_5_une_attente_mentionnee_ne_vaut_pas_constat(gemini):
    """
    Le document parle de « validation » sans dire par qui : PARTIEL, pas
    PRESENT. C'est le cœur du garde-fou — une attente n'est pas une preuve.
    """
    gemini(lecture([
        constat("D1-01-E1-P1", "PARTIEL",
                releves=["Le document mentionne une validation, sans en préciser l'auteur."],
                manquants=["L'auteur de la validation n'est pas indiqué."])
    ]))

    releve = analyser(
        attente("D1-01-E1-P1", elements_attendus=["validation par la direction"]),
        texte="La présente politique a fait l'objet d'une validation.",
    ).constats[0]

    assert releve.presence != "PRESENT"


# === 6. Plusieurs attentes =================================================


def test_6_une_sortie_par_reference(gemini):
    gemini(lecture([
        constat("D1-01-E1-P1", "PRESENT", releves=["a"]),
        constat("D1-01-E1-P2", "ABSENT", manquants=["b"]),
        constat("D1-01-E2-P1", "NON_VERIFIABLE"),
    ]))

    resultat = analyser(
        attente("D1-01-E1-P1"), attente("D1-01-E1-P2"), attente("D1-01-E2-P1"))

    assert [c.reference for c in resultat.constats] == [
        "D1-01-E1-P1", "D1-01-E1-P2", "D1-01-E2-P1"
    ]


def test_6bis_ordre_reproductible_meme_si_le_modele_permute(gemini):
    """L'ordre est celui des attentes, non celui du modèle : deux lectures comparables."""
    gemini(lecture([
        constat("D1-01-E1-P2", "ABSENT"),
        constat("D1-01-E1-P1", "PRESENT", releves=["a"]),
    ]))

    resultat = analyser(attente("D1-01-E1-P1"), attente("D1-01-E1-P2"))

    assert [c.reference for c in resultat.constats] == ["D1-01-E1-P1", "D1-01-E1-P2"]


# === 7-9. Le refus des références étrangères ===============================


def test_7_reference_inconnue_est_ecartee(gemini):
    gemini(lecture([
        constat("D1-01-E1-P1", "PRESENT", releves=["a"]),
        constat("D1-01-E1-P9", "PRESENT", releves=["inventé"]),
    ]))

    resultat = analyser(attente("D1-01-E1-P1"))

    assert [c.reference for c in resultat.constats] == ["D1-01-E1-P1"]


def test_8_reference_dune_autre_exigence_est_ecartee(gemini):
    gemini(lecture([constat("D1-01-E2-P1", "PRESENT", releves=["x"])]))

    resultat = analyser(attente("D1-01-E1-P1"))

    # La référence étrangère est écartée, et l'attente réelle est complétée
    # plutôt que laissée muette : le contrat promet une valeur par attente.
    assert [c.reference for c in resultat.constats] == ["D1-01-E1-P1"]
    assert resultat.constats[0].presence == "NON_VERIFIABLE"


def test_9_reference_malformee_est_ecartee(gemini):
    gemini(lecture([
        constat("pas-une-reference", "PRESENT", releves=["x"]),
        constat("D1-01-E1-P1", "ABSENT", manquants=["rien"]),
    ]))

    resultat = analyser(attente("D1-01-E1-P1"))

    assert [c.reference for c in resultat.constats] == ["D1-01-E1-P1"]
    assert resultat.constats[0].presence == "ABSENT"


def test_9bis_constat_en_double_ne_produit_quune_ligne(gemini):
    gemini(lecture([
        constat("D1-01-E1-P1", "PRESENT", releves=["premier"]),
        constat("D1-01-E1-P1", "ABSENT", manquants=["second"]),
    ]))

    resultat = analyser(attente("D1-01-E1-P1"))

    assert len(resultat.constats) == 1
    assert resultat.constats[0].presence == "PRESENT"


# === 10-11. Les cas limites ================================================


def test_10_aucune_attente(gemini):
    gemini(lecture([], resume="Document décrivant une politique interne."))

    resultat = analyser()

    assert resultat.constats == []
    assert resultat.resume.startswith("Document décrivant")


def test_11_document_vide_ne_declenche_aucun_appel(monkeypatch):
    """
    Sans contenu exploitable, il n'y a rien à soumettre.

    Aucun appel au modèle — et surtout aucune attente classée ABSENT : ne pas
    pouvoir lire n'est pas constater une absence.

    Le document est ici quasi vide plutôt que strictement vide : le contrat
    refuse un `contenu_base64` vide, et à juste titre — Java n'enverrait
    jamais un champ sans contenu. Le cas réel est le fichier tronqué ou
    quasi vide, que l'agent écarte sur la taille décodée.
    """
    def refuser():
        raise AssertionError("Aucun appel Gemini ne doit avoir lieu sur un document vide")

    monkeypatch.setattr(document_agent_v2, "get_client", refuser)

    resultat = analyser(attente("D1-01-E1-P1"), attente("D1-01-E1-P2"), texte="\n \n")

    assert resultat.confiance_lecture == 0.0
    assert {c.presence for c in resultat.constats} == {"NON_VERIFIABLE"}
    assert len(resultat.constats) == 2


def test_11bis_base64_corrompu_est_traite(monkeypatch):
    def refuser():
        raise AssertionError("Aucun appel Gemini attendu")

    monkeypatch.setattr(document_agent_v2, "get_client", refuser)

    corrompue = piece().model_copy(update={"contenu_base64": "ceci n'est pas du base64 !!"})
    demande = DocumentAgentRequestV2(
        piece=corrompue, critere=CRITERE, attentes=[attente("D1-01-E1-P1")])

    resultat = executer(document_agent_v2.analyser(demande))

    assert resultat.constats[0].presence == "NON_VERIFIABLE"
    assert resultat.confiance_lecture == 0.0


# === 12-13. Localisation et confiance ======================================


def test_12_aucune_localisation_inventee(gemini):
    appels = gemini(lecture([constat("D1-01-E1-P1", "PRESENT", releves=["a"])]))

    analyser(attente("D1-01-E1-P1"))

    prompt = appels[0].lower()
    assert "aucune page" in prompt
    assert "aucun paragraphe" in prompt
    # Et le contrat n'offre aucun champ où en loger une.
    assert "localisation" not in ElementReleve.model_fields
    assert "page" not in ElementReleve.model_fields


def test_13_confiance_de_lecture_independante_de_la_conformite(gemini):
    """
    Un document parfaitement lisible qui ne démontre rien : confiance de
    lecture ÉLEVÉE, constat ABSENT. Les confondre ferait qu'un scan net et
    vide passerait pour aussi probant qu'un document net et complet.
    """
    gemini(lecture(
        [constat("D1-01-E1-P1", "ABSENT", manquants=["Rien de tel n'a été retrouvé."])],
        confiance=0.98,
    ))

    resultat = analyser(attente("D1-01-E1-P1"))

    assert resultat.confiance_lecture == 0.98
    assert resultat.constats[0].presence == "ABSENT"


# === Le prompt sépare l'attente de l'observation ===========================


def test_le_prompt_separe_attente_et_observation(gemini):
    appels = gemini(lecture([constat("D1-01-E1-P1", "ABSENT", manquants=["x"])]))

    analyser(attente("D1-01-E1-P1", elements_attendus=["validation par la direction"]))

    prompt = appels[0]
    assert "CE QUE L'AUDIT ATTEND" in prompt
    assert "attentes, PAS des constats" in prompt
    assert "une attente n'est pas une preuve" in prompt
    assert "N'invente jamais" in prompt
    # NON_VERIFIABLE est explicitement distingué d'ABSENT.
    assert "ne pas pouvoir vérifier n'est pas constater une absence" in prompt.lower()
    # L'élément attendu est bien passé au modèle.
    assert "validation par la direction" in prompt
    # Et le rôle est cadré : relever, pas juger.
    assert "Il n'est pas de juger" in prompt


# === Composition des attentes depuis le catalogue ==========================


def test_attentes_depuis_le_catalogue():
    catalogue = Catalogue.model_validate({
        "exigences": [{"code": "D1-01-E1", "intitule": "I", "enonce": "E"}],
        "preuves_attendues": [
            {"reference": "D1-01-E1-P1", "exigence_code": "D1-01-E1",
             "type": "POLITIQUE", "libelle": "Code de conduite", "obligatoire": True},
            {"reference": "D1-01-E1-P2", "exigence_code": "D1-01-E1",
             "type": "REGISTRE", "libelle": "Registre", "obligatoire": False},
        ],
        "regles_analyse": [
            {"code": "R1", "type": "SIGNATURE", "libelle": "Validé par la direction",
             "severite": "ELEVEE",
             "portee": {"niveau": "PREUVE_ATTENDUE", "reference": "D1-01-E1-P1"},
             "definition": {"mention_attendue": "validation par la direction"}},
            {"code": "R2", "type": "ELEMENT_ATTENDU", "libelle": "Couvre les parties prenantes",
             "severite": "MOYENNE",
             "portee": {"niveau": "PREUVE_ATTENDUE", "reference": "D1-01-E1-P1"},
             "definition": {"elements": ["parties prenantes internes",
                                         "parties prenantes externes"]}},
            # Portée critère : ne doit être rattachée à aucune pièce.
            {"code": "R3", "type": "PRESENCE", "libelle": "Règle générale",
             "severite": "FAIBLE", "portee": {"niveau": "CRITERE"}, "definition": {}},
        ],
    })

    attentes = attentes_depuis(catalogue)

    assert [a.reference for a in attentes] == ["D1-01-E1-P1", "D1-01-E1-P2"]
    assert attentes[0].elements_attendus == [
        "validation par la direction",
        "parties prenantes internes",
        "parties prenantes externes",
    ]
    # La règle de portée critère n'est rattachée à aucune pièce : la rattacher
    # ferait relever un élément général comme s'il devait figurer là.
    assert attentes[1].elements_attendus == []
    assert "Règle générale" not in attentes[0].elements_attendus


def test_la_severite_nest_pas_transmise_au_releve(gemini):
    """La graduation appartient à l'agent de conformité, pas au relevé."""
    appels = gemini(lecture([constat("D1-01-E1-P1", "ABSENT")]))

    analyser(attente("D1-01-E1-P1", elements_attendus=["validation par la direction"]))

    assert "ELEVEE" not in appels[0]
    assert "sévérité" not in appels[0].lower()

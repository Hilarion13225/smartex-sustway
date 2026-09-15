"""
Chaînage réel Document V2 → Evidence V2.

Les phases 3 et 4 ont éprouvé chaque agent séparément, et les constats soumis
à Evidence y étaient fabriqués à la main. C'est précisément ce qui ne prouve
rien sur la jointure : un contrat peut être respecté des deux côtés et ne pas
se raccorder — une référence numérotée différemment, une pièce que l'aval ne
retrouve pas, une information perdue au passage.

Ici, rien n'est fabriqué entre les deux. La sortie du Document Agent est
passée telle quelle à Evidence, et c'est cette continuité qui est éprouvée.

Les deux agents appellent réellement Gemini. Chaque cas coûte donc deux
appels ; les documents sont synthétiques et fictifs, aucune écriture nulle
part.
"""

from __future__ import annotations

import asyncio
import base64
import json
import os

import pytest

from app.agents import document_agent_v2, evidence_compliance_agent_v2 as evidence
from app.agents.document_agent_v2 import DocumentAgentRequestV2, attentes_depuis
from app.agents.evidence_compliance_agent_v2 import EvidenceComplianceRequestV2
from app.models.contrat_v2 import (
    AnalyseDocumentV2,
    Catalogue,
    Critere,
    Declaration,
    Piece,
    ResultatEvidenceV2,
)
from app.services.gemini_client import get_client

pytestmark = pytest.mark.skipif(
    not os.environ.get("SMARTEX_GEMINI_API_KEY"),
    reason="Gemini non configuré : chaînage réel ignoré",
)


@pytest.fixture(autouse=True)
def client_neuf_par_test():
    """Le pool HTTP du client se lie à la boucle qui l'a créé ; chaque test ouvre la sienne."""
    get_client.cache_clear()
    yield
    get_client.cache_clear()


CRITERE = Critere(
    code="D1-01",
    libelle="Avez-vous formalisé un code de conduite validé par la direction ?",
)

CATALOGUE = Catalogue.model_validate({
    "exigences": [{
        "code": "D1-01-E1",
        "intitule": "Code de conduite formalisé et validé",
        "enonce": "L'organisation doit disposer d'un code de conduite écrit, "
                  "daté et validé par sa direction.",
    }],
    "preuves_attendues": [{
        "reference": "D1-01-E1-P1",
        "exigence_code": "D1-01-E1",
        "type": "POLITIQUE",
        "libelle": "Code de conduite et d'éthique",
        "description": "Document daté et validé par la direction.",
        "obligatoire": True,
    }],
    "regles_analyse": [{
        "code": "D1-01-R1",
        "type": "SIGNATURE",
        "libelle": "Le code doit être validé par la direction",
        "severite": "ELEVEE",
        "portee": {"niveau": "PREUVE_ATTENDUE", "reference": "D1-01-E1-P1"},
        "definition": {"mention_attendue": "validation ou approbation par la direction",
                       "elements": ["date d'entrée en vigueur", "signataire"]},
    }],
})


def piece_texte(texte: str, nom: str = "document-de-test.txt") -> Piece:
    contenu = texte.encode("utf-8")
    return Piece(
        reference="p1", nom=nom, type_mime="text/plain",
        taille=len(contenu),
        contenu_base64=base64.b64encode(contenu).decode("ascii"),
    )


def piece_illisible() -> Piece:
    """
    Un fichier réellement non exploitable.

    Des octets binaires déclarés en text/plain : le modèle reçoit quelque
    chose qu'il ne peut pas lire, sans qu'on lui souffle la réponse. Écrire
    « ce document est illisible » dans un fichier texte reviendrait à tester
    sa capacité à recopier une consigne, pas à constater une impossibilité.
    """
    contenu = bytes(range(256)) * 4
    return Piece(
        reference="p1", nom="scan-illisible.txt", type_mime="text/plain",
        taille=len(contenu),
        contenu_base64=base64.b64encode(contenu).decode("ascii"),
    )


async def _chainer(piece: Piece, catalogue: Catalogue,
                   declaration: Declaration | None = None):
    """
    La chaîne complète, sans intervention entre les deux agents.

    Le seul raccordement est `attentes_depuis(catalogue)` d'un côté et
    `analyses_documents=[analyse]` de l'autre. Si la jointure demandait autre
    chose, ce serait ici que cela se verrait.

    Les deux agents s'exécutent dans UNE SEULE boucle — comme en production,
    où un unique événement de requête les enchaîne. Deux `asyncio.run`
    successifs réutiliseraient le pool HTTP du client, lié à la première
    boucle, désormais fermée.
    """
    analyse = await document_agent_v2.analyser(DocumentAgentRequestV2(
        piece=piece, critere=CRITERE, attentes=attentes_depuis(catalogue)))

    requete = EvidenceComplianceRequestV2(
        critere=CRITERE, catalogue=catalogue,
        analyses_documents=[analyse], declaration=declaration)

    resultat = await evidence.evaluer(requete)
    return analyse, resultat, requete


def chainer(piece: Piece, declaration: Declaration | None = None,
            catalogue: Catalogue = CATALOGUE
            ) -> tuple[AnalyseDocumentV2, ResultatEvidenceV2, EvidenceComplianceRequestV2]:
    return asyncio.run(_chainer(piece, catalogue, declaration))


def verifier_le_contrat(analyse: AnalyseDocumentV2, resultat: ResultatEvidenceV2,
                        requete: EvidenceComplianceRequestV2, piece: Piece) -> None:
    """
    Les invariants de jointure, vérifiés à chaque cas.

    Groupés ici plutôt que répétés : ils ne dépendent pas du scénario, et un
    cas qui les enfreindrait le ferait pour la même raison qu'un autre.
    """
    references_catalogue = [p.reference for p in CATALOGUE.preuves_attendues]

    # Mêmes références locales, de bout en bout, sans invention.
    assert [c.reference for c in analyse.constats] == references_catalogue
    assert [e.reference for e in resultat.evaluations] == references_catalogue

    # Mêmes pièces, sans invention.
    assert analyse.piece_reference == piece.reference
    for evaluation in resultat.evaluations:
        assert set(evaluation.pieces_utilisees) <= {piece.reference}, evaluation

    # Rien n'est perdu au passage : la lecture et sa confiance arrivent bien.
    assert analyse.resume
    assert requete.analyses_documents[0].confiance_lecture == analyse.confiance_lecture
    assert requete.analyses_documents[0].constats == analyse.constats

    # Les écarts ne rattachent que du connu.
    connues = set(references_catalogue) | {r.code for r in CATALOGUE.regles_analyse}
    for manquant in resultat.elements_manquants:
        assert manquant.reference in connues, manquant

    # Bornes.
    assert 0.0 <= resultat.probabilite_conformite <= 1.0
    assert 0.0 <= resultat.confiance <= 1.0

    # Aucun contenu brut n'a pu atteindre Evidence : c'est une propriété du
    # type, revérifiée ici sur le payload réellement construit.
    charge = requete.model_dump_json()
    assert piece.contenu_base64 not in charge
    assert "contenu_base64" not in charge


# === CAS A — document complet ==============================================


def test_cas_a_document_complet():
    piece = piece_texte(
        "CODE DE CONDUITE ET D'ÉTHIQUE\n\n"
        "Date d'entrée en vigueur : 12 mars 2024.\n"
        "Approuvé par la Directrice Générale, A. Koffi.\n"
        "Signature : A. Koffi\n\n"
        "Le présent code énonce les valeurs et principes régissant les relations "
        "de l'organisation avec ses parties prenantes internes et externes."
    )

    analyse, resultat, requete = chainer(piece)
    verifier_le_contrat(analyse, resultat, requete, piece)

    assert analyse.constats[0].presence == "PRESENT", analyse.constats[0]
    assert resultat.evaluations[0].couverture == "COMPLETE", resultat.evaluations[0]
    assert resultat.probabilite_conformite >= 0.6, resultat.probabilite_conformite


# === CAS B — document partiel ==============================================


def test_cas_b_document_partiel():
    piece = piece_texte(
        "CODE DE CONDUITE ET D'ÉTHIQUE\n\n"
        "Le présent code énonce les valeurs et principes régissant les relations "
        "de l'organisation avec ses parties prenantes internes et externes.\n"
        "Aucune autre mention ne figure dans ce document."
    )

    analyse, resultat, requete = chainer(piece)
    verifier_le_contrat(analyse, resultat, requete, piece)

    assert analyse.constats[0].presence in ("PARTIEL", "ABSENT"), analyse.constats[0]
    evaluation = resultat.evaluations[0]
    assert evaluation.couverture in ("PARTIELLE", "INSUFFISANTE"), evaluation
    # L'écart est nommé, et il remonte au référentiel.
    assert evaluation.elements_manquants, evaluation
    references = {m.reference for m in resultat.elements_manquants}
    assert "D1-01-E1-P1" in references
    assert "D1-01-R1" in references, "La règle portant sur cette pièce est en écart"


# === CAS C — document lisible sans preuve ==================================


def test_cas_c_document_lisible_sans_preuve():
    piece = piece_texte(
        "NOTE DE SERVICE\n\n"
        "Les horaires d'ouverture des bureaux sont modifiés à compter du "
        "1er avril : ouverture à 8h, fermeture à 17h.\n"
        "Merci de votre attention."
    )

    analyse, resultat, requete = chainer(piece)
    verifier_le_contrat(analyse, resultat, requete, piece)

    assert analyse.constats[0].presence == "ABSENT", analyse.constats[0]
    assert resultat.evaluations[0].couverture == "INSUFFISANTE", resultat.evaluations[0]
    assert resultat.probabilite_conformite <= 0.4, resultat.probabilite_conformite
    # Lisible : la confiance de lecture ne doit pas s'effondrer.
    assert analyse.confiance_lecture is not None and analyse.confiance_lecture >= 0.5


# === CAS D — document non vérifiable =======================================


def test_cas_d_document_non_verifiable_ne_devient_jamais_absent():
    """
    Le cas qui compte le plus.

    Une pièce illisible ne doit reprocher rien à personne. Si le Document
    Agent dit NON_VERIFIABLE et qu'Evidence répond INSUFFISANTE, la chaîne
    transforme une impossibilité de lecture en non-conformité — et une
    entreprise se voit reprocher un mauvais scan.
    """
    piece = piece_illisible()

    analyse, resultat, requete = chainer(piece)
    verifier_le_contrat(analyse, resultat, requete, piece)

    assert analyse.constats[0].presence == "NON_VERIFIABLE", analyse.constats[0]
    evaluation = resultat.evaluations[0]
    assert evaluation.couverture == "NON_VERIFIABLE", evaluation
    assert evaluation.couverture != "INSUFFISANTE"
    # Et rien n'est reproché : un point non jugeable n'est pas un manque.
    assert resultat.elements_manquants == [], resultat.elements_manquants


# === CAS E — déclaration contredite ========================================


def test_cas_e_declaration_ne_devient_pas_preuve():
    piece = piece_texte(
        "CODE DE CONDUITE\n\n"
        "L'organisation s'engage à respecter des principes d'intégrité.\n"
        "Ce document ne comporte ni date, ni mention de validation."
    )
    declaration = Declaration(reponses=[{
        "question": "Votre code de conduite est-il validé par la direction ?",
        "valeur": "5 — Optimisé",
        "niveau": 5,
        "commentaire": "Notre code est validé par la direction depuis 2020.",
    }])

    analyse, resultat, requete = chainer(piece, declaration)
    verifier_le_contrat(analyse, resultat, requete, piece)

    assert analyse.constats[0].presence != "PRESENT", analyse.constats[0]
    evaluation = resultat.evaluations[0]
    assert evaluation.couverture != "COMPLETE", (
        "Une déclaration ne doit pas suffire à tenir l'attente pour démontrée"
    )


# === Propagation des quatre états ==========================================


@pytest.mark.parametrize(
    "presence, couvertures_admises",
    [
        ("PRESENT", {"COMPLETE", "PARTIELLE"}),
        ("PARTIEL", {"PARTIELLE", "INSUFFISANTE"}),
        ("ABSENT", {"INSUFFISANTE"}),
        ("NON_VERIFIABLE", {"NON_VERIFIABLE"}),
    ],
)
def test_propagation_des_quatre_etats(presence, couvertures_admises):
    """
    Aucune conversion implicite entre les quatre états.

    Evidence appelé seul, avec un constat maîtrisé : ce test isole la
    traduction constat → couverture, là où les cas A-E l'observent au bout
    d'une chaîne où le Document Agent peut lui-même hésiter.

    La contrainte la plus stricte porte sur NON_VERIFIABLE : une seule
    couverture admise, aucune tolérance.
    """
    # Les observations doivent réellement correspondre à ce que le catalogue
    # attend. Un constat PRESENT dont le contenu observé serait un texte
    # quelconque ne démontrerait rien, et l'agent aurait raison de ne pas
    # conclure COMPLETE — le test mesurerait alors la pauvreté du décor, pas
    # la traduction constat → couverture.
    observations = {
        "PRESENT": (
            ["Date d'entrée en vigueur : 12 mars 2024.",
             "Approuvé par la Directrice Générale, A. Koffi.",
             "Signature de la Directrice Générale apposée."],
            [],
        ),
        "PARTIEL": (
            ["Valeurs et principes énoncés."],
            ["Aucune date d'entrée en vigueur n'a été retrouvée.",
             "Aucun signataire n'a été retrouvé."],
        ),
        "ABSENT": ([], ["Aucun élément relatif à la validation n'a été retrouvé."]),
        "NON_VERIFIABLE": ([], []),
    }
    releves, manquants = observations[presence]

    analyse = AnalyseDocumentV2(
        piece_reference="p1",
        nom="document-de-test.txt",
        resume=("Le document ne comporte aucun texte exploitable."
                if presence == "NON_VERIFIABLE"
                else "Code de conduite et d'éthique de l'organisation."),
        constats=[{
            "reference": "D1-01-E1-P1",
            "presence": presence,
            "elements_releves": releves,
            "elements_manquants": manquants,
        }],
        confiance_lecture=0.2 if presence == "NON_VERIFIABLE" else 0.95,
    )

    resultat = asyncio.run(evidence.evaluer(EvidenceComplianceRequestV2(
        critere=CRITERE, catalogue=CATALOGUE, analyses_documents=[analyse])))

    assert resultat.evaluations[0].couverture in couvertures_admises, (
        f"{presence} → {resultat.evaluations[0].couverture}"
    )


# === Déterminisme de l'ordre ===============================================


def test_ordre_final_suit_le_catalogue():
    """
    Trois attentes, et l'ordre final doit être celui du catalogue.

    Ni le Document Agent ni Evidence ne décident de l'ordre : chacun réordonne
    sur la liste qu'il a reçue. Deux analyses du même contexte restent donc
    comparables ligne à ligne.
    """
    catalogue = Catalogue.model_validate({
        "exigences": [{"code": "D1-01-E1", "intitule": "I", "enonce": "E"}],
        "preuves_attendues": [
            {"reference": f"D1-01-E1-P{rang}", "exigence_code": "D1-01-E1",
             "type": "POLITIQUE", "libelle": libelle, "obligatoire": True}
            for rang, libelle in enumerate(
                ["Code de conduite", "Registre des signalements", "Charte fournisseurs"], start=1)
        ],
        "regles_analyse": [],
    })
    piece = piece_texte(
        "CODE DE CONDUITE\n\nPrincipes d'intégrité applicables aux collaborateurs.\n"
        "Aucun registre ni charte fournisseurs n'est joint."
    )

    analyse, resultat, _ = chainer(piece, catalogue=catalogue)

    attendu = ["D1-01-E1-P1", "D1-01-E1-P2", "D1-01-E1-P3"]
    assert [c.reference for c in analyse.constats] == attendu
    assert [e.reference for e in resultat.evaluations] == attendu


# === Sécurité de la jointure ===============================================


def test_aucun_contenu_brut_ne_franchit_la_jointure():
    """
    Le Document Agent reçoit le fichier ; Evidence ne peut pas le recevoir.

    Vérifié deux fois : sur le type — `AnalyseDocumentV2` n'a aucun champ de
    contenu — et sur le payload réellement sérialisé.
    """
    piece = piece_texte("CODE DE CONDUITE\n\nContenu confidentiel de démonstration.")

    analyse, _, requete = chainer(piece)

    assert "contenu_base64" not in AnalyseDocumentV2.model_fields
    assert "pieces" not in EvidenceComplianceRequestV2.model_fields

    charge = json.loads(requete.model_dump_json())
    serialise = json.dumps(charge, ensure_ascii=False)
    assert piece.contenu_base64 not in serialise
    assert "Contenu confidentiel de démonstration" not in serialise or (
        # Le résumé peut légitimement citer le document ; le contenu BRUT, non.
        analyse.resume in serialise
    )

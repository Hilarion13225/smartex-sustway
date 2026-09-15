"""
Pipeline IA V2 complet, réellement chaîné, contre Gemini.

Chaque agent a été validé seul, et deux jointures sur trois ne l'avaient
jamais été : les entrées d'Evidence, de Risk et de Recommendation étaient
fabriquées à la main dans leurs tests respectifs. C'est exactement ce qui ne
prouve rien — un contrat peut être respecté de part et d'autre sans que la
chaîne tienne.

Ici, rien n'est fabriqué entre les maillons :

    Document V2 → Evidence V2 → Risk V2 → Recommendation V2

Chaque sortie devient l'entrée du suivant, telle quelle.

Les quatre agents s'exécutent dans UNE SEULE boucle asyncio — comme en
production, où une même requête les enchaîne, et parce que le pool HTTP du
client Gemini se lie à la boucle qui l'a créé.

Un scénario coûte quatre appels Gemini (cinq avec deux documents). Les
fixtures sont synthétiques et fictives ; aucune écriture nulle part.

Les assertions sémantiques restent souples — le modèle a une latitude
légitime sur la formulation. Les invariants STRUCTURELS, eux, sont stricts :
références conservées, aucune fuite de contenu, aucune exigence transmise à
Risk.
"""

from __future__ import annotations

import asyncio
import base64
import json
import os
from dataclasses import dataclass, field

import pytest

from app.agents import (
    document_agent_v2,
    evidence_compliance_agent_v2 as evidence,
    recommendation_agent_v2 as recommendation,
    risk_agent_v2 as risk,
)
from app.agents.document_agent_v2 import DocumentAgentRequestV2, attentes_depuis
from app.agents.evidence_compliance_agent_v2 import EvidenceComplianceRequestV2
from app.agents.recommendation_agent_v2 import RecommendationAgentRequestV2
from app.agents.risk_agent_v2 import RiskAgentRequestV2, catalogue_risque_depuis
from app.models.contrat_v2 import (
    AnalyseDocumentV2,
    Catalogue,
    Critere,
    Declaration,
    Organisation,
    Piece,
    ResultatEvidenceV2,
    ResultatRecommandationV2,
    ResultatRisqueV2,
    Situation,
)
from app.services.gemini_client import get_client

pytestmark = pytest.mark.skipif(
    not os.environ.get("SMARTEX_GEMINI_API_KEY"),
    reason="Gemini non configuré : pipeline réel ignoré",
)


@pytest.fixture(autouse=True)
def client_neuf_par_scenario():
    """Le pool HTTP se lie à la boucle créatrice ; chaque scénario ouvre la sienne."""
    get_client.cache_clear()
    yield
    get_client.cache_clear()


# === Décor ================================================================

CRITERE = Critere(
    code="D1-01",
    libelle="Avez-vous formalisé un code de conduite validé par la direction ?",
)

SITUATION = Situation(
    referentiel_code="SMARTEX_SUSTWAY",
    referentiel_nom="Référentiel RSE Smartex Sustway",
    version_numero="2.1",
    domaine_code="D1",
    domaine_nom="Valeurs et principes éthiques",
)

CATALOGUE = Catalogue.model_validate({
    "exigences": [{
        "code": "D1-01-E1",
        "intitule": "Code de conduite formalisé et validé",
        "enonce": "L'organisation doit disposer d'un code de conduite écrit, "
                  "daté et validé par sa direction.",
    }],
    "preuves_attendues": [{
        "reference": "D1-01-E1-P1", "exigence_code": "D1-01-E1",
        "type": "POLITIQUE", "libelle": "Code de conduite et d'éthique",
        "description": "Document daté et validé par la direction.",
        "obligatoire": True,
    }],
    "regles_analyse": [{
        "code": "D1-01-R1", "type": "SIGNATURE",
        "libelle": "Le code doit être validé par la direction",
        "severite": "ELEVEE",
        "portee": {"niveau": "PREUVE_ATTENDUE", "reference": "D1-01-E1-P1"},
        "definition": {"mention_attendue": "validation par la direction",
                       "elements": ["date d'entrée en vigueur", "signataire"]},
    }],
})

REFERENCES_ADMISES = {"D1-01-E1", "D1-01-E1-P1", "D1-01-R1"}

# L'énoncé d'exigence, mot pour mot : il ne doit apparaître dans AUCUN
# payload en aval d'Evidence.
ENONCE_EXIGENCE = CATALOGUE.exigences[0].enonce


def piece(texte: str, reference: str = "p1", nom: str | None = None) -> Piece:
    contenu = texte.encode("utf-8")
    return Piece(
        reference=reference, nom=nom or f"{reference}-document-de-test.txt",
        type_mime="text/plain", taille=len(contenu),
        contenu_base64=base64.b64encode(contenu).decode("ascii"),
    )


def piece_illisible(reference: str = "p1") -> Piece:
    """Octets binaires en text/plain : non exploitable, sans souffler la réponse."""
    contenu = bytes(range(256)) * 4
    return Piece(
        reference=reference, nom="scan-illisible.txt", type_mime="text/plain",
        taille=len(contenu), contenu_base64=base64.b64encode(contenu).decode("ascii"),
    )


# === Exécution de la chaîne ===============================================


@dataclass
class Trace:
    """Les quatre sorties, et les quatre requêtes qui les ont produites."""

    analyses: list[AnalyseDocumentV2] = field(default_factory=list)
    requete_evidence: EvidenceComplianceRequestV2 | None = None
    resultat_evidence: ResultatEvidenceV2 | None = None
    requete_risque: RiskAgentRequestV2 | None = None
    resultat_risque: ResultatRisqueV2 | None = None
    requete_reco: RecommendationAgentRequestV2 | None = None
    resultat_reco: ResultatRecommandationV2 | None = None

    def resume(self, titre: str) -> str:
        lignes = [f"\n--- {titre} " + "-" * max(0, 56 - len(titre))]
        for analyse in self.analyses:
            constats = ", ".join(f"{c.reference}={c.presence}" for c in analyse.constats)
            lignes.append(
                f"Document   [{analyse.piece_reference}] {constats} "
                f"(lecture {analyse.confiance_lecture:.2f})")
        e = self.resultat_evidence
        couvertures = ", ".join(f"{v.reference}={v.couverture}" for v in e.evaluations)
        lignes.append(
            f"Evidence   {couvertures} | p={e.probabilite_conformite:.2f} "
            f"c={e.confiance:.2f} | écarts={[m.reference for m in e.elements_manquants]}")
        for evaluation in e.evaluations:
            if evaluation.conflit:
                lignes.append(f"           CONFLIT [{evaluation.reference}] : {evaluation.conflit}")
        r = self.resultat_risque
        lignes.append(
            f"Risk       signal={r.signal_risque} cat={r.categorie} "
            f"c={r.confiance:.2f} | signaux={[s.categorie for s in r.signaux]}")
        c = self.resultat_reco
        lignes.append(
            f"Reco       nécessaire={c.recommandation_necessaire} | "
            f"actions={[a.rattachement.reference for a in c.actions]}")
        return "\n".join(lignes)


async def _executer(pieces: list[Piece], declaration: Declaration | None,
                    organisation: Organisation | None, catalogue: Catalogue) -> Trace:
    trace = Trace()

    # 1. Document — un appel par pièce, aucune fusion.
    for p in pieces:
        trace.analyses.append(await document_agent_v2.analyser(DocumentAgentRequestV2(
            piece=p, critere=CRITERE, attentes=attentes_depuis(catalogue))))

    # 2. Evidence — reçoit les analyses telles quelles. Pas de secteur.
    trace.requete_evidence = EvidenceComplianceRequestV2(
        critere=CRITERE, situation=SITUATION, catalogue=catalogue,
        declaration=declaration, analyses_documents=trace.analyses)
    trace.resultat_evidence = await evidence.evaluer(trace.requete_evidence)

    # 3. Risk — catalogue réduit, sans exigences. Secteur admis.
    trace.requete_risque = RiskAgentRequestV2(
        critere=CRITERE, situation=SITUATION, organisation=organisation,
        catalogue=catalogue_risque_depuis(catalogue), declaration=declaration,
        resultat_evidence=trace.resultat_evidence)
    trace.resultat_risque = await risk.evaluer(trace.requete_risque)

    # 4. Recommendation — catalogue entier, plus les deux diagnostics.
    trace.requete_reco = RecommendationAgentRequestV2(
        critere=CRITERE, situation=SITUATION, organisation=organisation,
        catalogue=catalogue, declaration=declaration,
        analyses_documents=trace.analyses,
        resultat_evidence=trace.resultat_evidence,
        resultat_risque=trace.resultat_risque)
    trace.resultat_reco = await recommendation.recommander(trace.requete_reco)

    return trace


def executer(titre: str, pieces: list[Piece], declaration: Declaration | None = None,
             organisation: Organisation | None = None,
             catalogue: Catalogue = CATALOGUE) -> Trace:
    trace = asyncio.run(_executer(pieces, declaration, organisation, catalogue))
    print(trace.resume(titre))
    verifier_les_invariants(trace, pieces, catalogue)
    return trace


# === Invariants structurels — stricts =====================================


def verifier_les_invariants(trace: Trace, pieces: list[Piece], catalogue: Catalogue) -> None:
    """
    Ce qui doit être vrai quel que soit le scénario.

    Groupés ici plutôt que répétés : ils ne dépendent pas du cas, et un
    scénario qui les enfreindrait le ferait pour la même raison qu'un autre.
    """
    references = [p.reference for p in catalogue.preuves_attendues]
    codes_pieces = {p.reference for p in pieces}
    admises = {p.reference for p in catalogue.preuves_attendues} \
        | {e.code for e in catalogue.exigences} \
        | {r.code for r in catalogue.regles_analyse}

    # --- A. Document → Evidence -------------------------------------------
    for analyse in trace.analyses:
        assert [c.reference for c in analyse.constats] == references, analyse
        assert analyse.piece_reference in codes_pieces
    assert [e.reference for e in trace.resultat_evidence.evaluations] == references
    # Les analyses arrivent intactes : ni tronquées, ni reconstruites.
    assert trace.requete_evidence.analyses_documents == trace.analyses
    for evaluation in trace.resultat_evidence.evaluations:
        assert set(evaluation.pieces_utilisees) <= codes_pieces, evaluation
    for manquant in trace.resultat_evidence.elements_manquants:
        assert manquant.reference in admises, manquant

    # --- B. Evidence → Risk -----------------------------------------------
    assert trace.requete_risque.resultat_evidence == trace.resultat_evidence
    charge_risque = trace.requete_risque.model_dump_json()
    # Les exigences ne franchissent pas cette jointure.
    assert ENONCE_EXIGENCE not in charge_risque, "L'énoncé d'exigence a fuité vers Risk"
    assert "exigences" not in json.loads(charge_risque)
    # Ni le contenu brut.
    for p in pieces:
        assert p.contenu_base64 not in charge_risque
    assert "contenu_base64" not in charge_risque
    for signal in trace.resultat_risque.signaux:
        if signal.rattachement:
            assert signal.rattachement.reference in admises, signal
        assert set(signal.pieces_concernees) <= codes_pieces, signal

    # --- C. Risk → Recommendation -----------------------------------------
    assert trace.requete_reco.resultat_risque == trace.resultat_risque
    assert trace.requete_reco.resultat_evidence == trace.resultat_evidence
    charge_reco = trace.requete_reco.model_dump_json()
    for p in pieces:
        assert p.contenu_base64 not in charge_reco
    assert "contenu_base64" not in charge_reco
    # Aucune action ne peut sortir sans se rattacher au référentiel transmis.
    for action in trace.resultat_reco.actions:
        assert action.rattachement.reference in admises, action

    # --- Bornes -----------------------------------------------------------
    assert 0.0 <= trace.resultat_evidence.probabilite_conformite <= 1.0
    assert 0.0 <= trace.resultat_evidence.confiance <= 1.0
    assert 0.0 <= trace.resultat_risque.confiance <= 1.0


def texte_reco(trace: Trace) -> str:
    return " ".join([trace.resultat_reco.pistes_amelioration]
                    + [a.action for a in trace.resultat_reco.actions]).lower()


def categories(trace: Trace) -> set[str]:
    return {s.categorie for s in trace.resultat_risque.signaux} | {
        trace.resultat_risque.categorie}


# === Les scénarios ========================================================


def test_1_cas_conforme():
    """Conformité pleine : aucun risque, et donc aucune recommandation à forcer."""
    trace = executer("1. CONFORME", [piece(
        "CODE DE CONDUITE ET D'ÉTHIQUE\n\n"
        "Date d'entrée en vigueur : 12 mars 2024.\n"
        "Approuvé et signé par la Directrice Générale, A. Koffi.\n\n"
        "Le présent code énonce les valeurs et principes régissant les relations "
        "de l'organisation avec ses parties prenantes internes et externes."
    )])

    assert trace.analyses[0].constats[0].presence == "PRESENT"
    assert trace.resultat_evidence.evaluations[0].couverture == "COMPLETE"
    assert trace.resultat_evidence.probabilite_conformite >= 0.6
    # Cas 8 : aucun risque → recommandation cohérente, pas d'action forcée.
    assert trace.resultat_risque.signal_risque is False, trace.resultat_risque
    assert trace.resultat_reco.recommandation_necessaire is False, trace.resultat_reco


def test_2_preuve_absente():
    """Cas 7 : un manquement établi doit produire un risque, puis une action."""
    trace = executer("2. PREUVE ABSENTE", [piece(
        "NOTE DE SERVICE\n\n"
        "Les horaires d'ouverture des bureaux sont modifiés à compter du 1er avril.\n"
        "Merci de votre attention."
    )])

    assert trace.analyses[0].constats[0].presence == "ABSENT"
    assert trace.resultat_evidence.evaluations[0].couverture == "INSUFFISANTE"
    assert trace.resultat_evidence.probabilite_conformite <= 0.4
    assert "D1-01-E1-P1" in {m.reference for m in trace.resultat_evidence.elements_manquants}
    assert trace.resultat_risque.signal_risque is True, trace.resultat_risque
    assert trace.resultat_reco.recommandation_necessaire is True
    assert trace.resultat_reco.actions, "Un manquement établi doit produire une action"


def test_3_preuve_partielle():
    trace = executer("3. PREUVE PARTIELLE", [piece(
        "CODE DE CONDUITE ET D'ÉTHIQUE\n\n"
        "Le présent code énonce les valeurs et principes régissant les relations "
        "de l'organisation avec ses parties prenantes internes et externes.\n"
        "Aucune autre mention ne figure dans ce document."
    )])

    assert trace.analyses[0].constats[0].presence in ("PARTIEL", "ABSENT")
    assert trace.resultat_evidence.evaluations[0].couverture in ("PARTIELLE", "INSUFFISANTE")
    assert trace.resultat_evidence.evaluations[0].elements_manquants
    assert trace.resultat_reco.recommandation_necessaire is True


def test_4_document_non_verifiable():
    """
    Le garde-fou qui traverse toute la chaîne.

    Un scan illisible ne doit devenir ni une absence chez Evidence, ni un
    manquement chez Risk, ni une action corrective chez Recommendation. À
    chaque maillon, la tentation est de conclure ; à chaque maillon, elle doit
    être refusée.
    """
    trace = executer("4. NON VERIFIABLE", [piece_illisible()])

    assert trace.analyses[0].constats[0].presence == "NON_VERIFIABLE"
    assert trace.resultat_evidence.evaluations[0].couverture == "NON_VERIFIABLE"
    # Aucun écart reproché : on n'a pas pu regarder.
    assert trace.resultat_evidence.elements_manquants == []
    assert "INFORMATION_MANQUANTE" not in categories(trace), categories(trace)
    # Et la recommandation, si elle existe, porte sur la lisibilité.
    if trace.resultat_reco.recommandation_necessaire:
        texte = texte_reco(trace)
        assert any(mot in texte for mot in
                   ("lisible", "exploitable", "lisibilité", "copie", "numéris",
                    "version", "format")), texte


def test_5_declaration_non_corroboree():
    trace = executer(
        "5. DECLARATION NON CORROBOREE",
        [piece("CODE DE CONDUITE\n\nL'organisation s'engage à respecter des "
               "principes d'intégrité.\nCe document ne comporte ni date, ni "
               "mention de validation.")],
        declaration=Declaration(reponses=[{
            "question": "Votre code de conduite est-il validé par la direction ?",
            "valeur": "5 — Optimisé", "niveau": 5,
            "commentaire": "Notre code est validé par la direction depuis 2020."}]))

    # La déclaration ne tient pas lieu de démonstration.
    assert trace.resultat_evidence.evaluations[0].couverture != "COMPLETE"
    assert trace.resultat_risque.signal_risque is True, trace.resultat_risque
    assert trace.resultat_reco.recommandation_necessaire is True


def test_6_documents_contradictoires():
    """
    Deux pièces se contredisent sur LE MÊME FAIT.

    La première version de ce test opposait un document complet à un document
    incomplet — ce qui n'est pas une contradiction mais une inégalité de
    contenu, et la chaîne avait raison de conclure que l'organisation dispose
    d'un code valide. Ici les deux pièces affirment l'inverse l'une de
    l'autre sur l'approbation : la chaîne ne peut pas trancher sans arbitrer,
    et arbitrer sans le dire ferait disparaître une information dont un
    auditeur a besoin.
    """
    trace = executer("6. DOCUMENTS CONTRADICTOIRES", [
        piece("CODE DE CONDUITE\n\n"
              "Date d'entrée en vigueur : 12 mars 2024.\n"
              "Ce document a été approuvé et signé par la Directrice Générale, "
              "A. Koffi, le 12 mars 2024.", reference="p1"),
        piece("CODE DE CONDUITE\n\n"
              "Date d'entrée en vigueur : 12 mars 2024.\n"
              "AVERTISSEMENT : ce document n'a PAS été approuvé par la direction. "
              "Il est diffusé à titre de projet et aucune signature n'y figure.",
              reference="p2"),
    ])

    assert len(trace.analyses) == 2
    assert {a.piece_reference for a in trace.analyses} == {"p1", "p2"}

    evaluation = trace.resultat_evidence.evaluations[0]
    trace_conflit = " ".join(
        [evaluation.conflit or "", evaluation.justification,
         trace.resultat_evidence.justification_conformite,
         trace.resultat_risque.justification or ""]
        + [s.justification for s in trace.resultat_risque.signaux]).lower()

    # Le conflit doit être signalé quelque part : champ dédié d'Evidence, ou
    # texte explicite. Ce qui est refusé, c'est le silence.
    assert (evaluation.conflit is not None
            or any(mot in trace_conflit for mot in
                   ("contradict", "diverg", "incohér", "oppos", "n'a pas été approuvé",
                    "projet"))), (
        f"Conflit non signalé — couverture={evaluation.couverture}, "
        f"signal={trace.resultat_risque.signal_risque} — {trace_conflit}"
    )
    # Et la chaîne ne doit pas conclure à une conformité pleine et tranquille.
    assert not (evaluation.couverture == "COMPLETE"
                and trace.resultat_risque.signal_risque is False), (
        "La chaîne a arbitré le conflit en silence"
    )


def test_9_secteur_present_sur_toute_la_chaine():
    """
    Le secteur atteint Risk et Recommendation, jamais Evidence.

    C'est la décision 2 : le jugement de conformité reste identique pour deux
    organisations qui déposent les mêmes pièces ; seul l'accompagnement
    s'adapte.
    """
    secteur = "Agro-industrie"
    trace = executer(
        "9. SECTEUR PRESENT",
        [piece("CODE DE CONDUITE\n\nPrincipes d'intégrité.\n"
               "Aucune date ni mention de validation.")],
        organisation=Organisation(secteur=secteur))

    # Evidence ne le reçoit pas — propriété du type, revérifiée sur le payload.
    assert "organisation" not in EvidenceComplianceRequestV2.model_fields
    assert secteur not in trace.requete_evidence.model_dump_json()
    # Risk et Recommendation le reçoivent.
    assert secteur in trace.requete_risque.model_dump_json()
    assert secteur in trace.requete_reco.model_dump_json()
    # Et aucune obligation légale n'est inventée pour autant.
    texte = texte_reco(trace) + " " + trace.resultat_risque.justification.lower()
    for invention in ("article l.", "décret n", "loi n°", "sanction pénale",
                      "amende de", "certification obligatoire"):
        assert invention not in texte, f"invention réglementaire : {invention} — {texte}"

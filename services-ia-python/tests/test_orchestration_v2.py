"""
Tests de l'orchestration V2 — le chaînage des quatre agents.

Ce qui est éprouvé ici n'est pas la qualité d'une analyse — celle-là est
vérifiée contre le vrai Gemini dans les fichiers `*_reel.py` — mais le fil
qui relie les agents : l'ordre, ce qui passe de l'un à l'autre, ce qui ne
passe pas, et ce qui se produit quand l'un d'eux tombe.

Chaque agent est servi par un faux client qui rend une réponse conforme à
son schéma. Aucun quota n'est consommé.
"""

import asyncio
import base64
import json
import uuid

import pytest

from app.models.contrat_v2 import EvaluerCritereRequestV2
from app.services import orchestration_v2
from app.services.orchestration_v2 import EchecAgentBloquant, executer

AGENTS = ("document_agent_v2", "evidence_compliance_agent_v2",
          "risk_agent_v2", "recommendation_agent_v2")


def lancer(coroutine):
    """Le projet n'embarque aucun greffon asyncio pour pytest."""
    return asyncio.run(coroutine)


def payload(**surcharges) -> EvaluerCritereRequestV2:
    """Un contexte V2 valide, minimal mais complet. Données fictives."""
    brut = {
        "contrat_version": "2.0",
        "tracabilite": {
            "audit_id": str(uuid.uuid4()),
            "audit_critere_id": str(uuid.uuid4()),
            "referentiel_version_id": str(uuid.uuid4()),
        },
        "situation": {
            "referentiel_code": "SMARTEX_SUSTWAY",
            "referentiel_nom": "Référentiel RSE",
            "version_numero": "2.1",
            "domaine_code": "D1",
            "domaine_nom": "Valeurs et principes éthiques",
        },
        "critere": {
            "code": "D1-01",
            "libelle": "Avez-vous formalisé un code de conduite ?",
            "description": None,
        },
        "catalogue": {
            "exigences": [{
                "code": "D1-01-E1",
                "intitule": "Code de conduite formalisé",
                "enonce": "L'organisation doit disposer d'un code écrit.",
            }],
            "preuves_attendues": [{
                "reference": "D1-01-E1-P1",
                "exigence_code": "D1-01-E1",
                "type": "POLITIQUE",
                "libelle": "Code de conduite",
                "description": "Document daté et validé.",
                "obligatoire": True,
            }],
            "regles_analyse": [{
                "code": "D1-01-R1",
                "type": "SIGNATURE",
                "libelle": "Validation par la direction",
                "severite": "ELEVEE",
                "portee": {"niveau": "PREUVE_ATTENDUE", "reference": "D1-01-E1-P1"},
                "definition": {"mention_attendue": "validation par la direction"},
            }],
        },
        "declaration": {
            "scenario": None,
            "reponses": [{
                "question": "Avez-vous formalisé un code de conduite ?",
                "valeur": "3 — Défini",
                "niveau": 3,
                "commentaire": None,
            }],
        },
        "pieces": [{
            "reference": "p1",
            "nom": "code-de-conduite.txt",
            "type_mime": "text/plain",
            "taille": 120,
            "contenu_base64": base64.b64encode(
                "Code de conduite validé par la direction le 3 mars 2025. "
                "Diffusé à l'ensemble du personnel.".encode()).decode(),
            "preuve_attendue_reference": None,
        }],
        "organisation": {"secteur": "Agro-industrie"},
        "options": {"analyse_risque": True, "generer_recommandation": True},
    }
    brut.update(surcharges)
    return EvaluerCritereRequestV2.model_validate(brut)


# --- Faux fournisseur ----------------------------------------------------


class _FauxUsage:
    prompt_token_count = 100
    candidates_token_count = 20
    total_token_count = 120


class _FauxReponse:
    def __init__(self, charge: dict):
        self.text = json.dumps(charge)
        self.model_version = "gemini-3.5-flash-lite"
        self.response_id = "r-" + uuid.uuid4().hex[:12]
        self.usage_metadata = _FauxUsage()


class _FauxClient:
    """
    Rend la charge prévue pour l'agent qu'il sert, ou lève.

    Il enregistre chaque appel : c'est ainsi qu'on démontre l'ordre des
    agents et le fait qu'un agent désactivé n'est pas appelé — deux
    propriétés invisibles dans le résultat.
    """

    def __init__(self, journal: list, agent: str, charge=None, erreur=None):
        self.journal = journal
        self.agent = agent
        self.charge = charge
        self.erreur = erreur

    @property
    def aio(self):
        return self

    @property
    def models(self):
        return self

    async def generate_content(self, **kwargs):
        self.journal.append((self.agent, kwargs))
        if self.erreur is not None:
            raise self.erreur
        return _FauxReponse(self.charge)


LECTURE = {
    "resume": "Le document présente un code de conduite validé par la direction.",
    "constats": [{
        "reference": "D1-01-E1-P1",
        "presence": "PRESENT",
        "elements_releves": ["Validation par la direction, datée du 3 mars 2025."],
        "elements_manquants": [],
    }],
    "confiance_lecture": 0.9,
}

EVIDENCE = {
    "couverture_preuve": True,
    "justification_couverture": "La pièce couvre l'attente.",
    "probabilite_conformite": 0.8,
    "confiance": 0.85,
    "justification_conformite": "Le code est formalisé et validé.",
    "evaluations": [{
        "reference": "D1-01-E1-P1",
        "couverture": "COMPLETE",
        "pieces_utilisees": ["p1"],
        "elements_observes": ["Validation par la direction."],
        "elements_manquants": [],
        "elements_non_verifiables": [],
        "conflit": None,
        "justification": "Document conforme à l'attente.",
    }],
}

RISQUE = {
    "signal_risque": False,
    "categorie": None,
    "justification": "Aucun signal particulier.",
    "confiance": 0.8,
    "signaux": [],
}

RECOMMANDATION = {
    "recommandation_necessaire": True,
    "pistes_amelioration": "Diffuser le code lors de l'accueil des nouveaux entrants.",
    "actions": [{
        "action": "Intégrer le code de conduite au parcours d'accueil.",
        "rattachement_niveau": "PREUVE_ATTENDUE",
        "rattachement_reference": "D1-01-E1-P1",
    }],
}


@pytest.fixture
def journal():
    return []


def cabler(monkeypatch, journal, *, document=LECTURE, evidence_=EVIDENCE,
           risque=RISQUE, recommandation=RECOMMANDATION,
           erreur_document=None, erreur_evidence=None,
           erreur_risque=None, erreur_recommandation=None):
    """Substitue un faux client à chacun des quatre agents."""
    from app.agents import (document_agent_v2, evidence_compliance_agent_v2,
                            recommendation_agent_v2, risk_agent_v2)

    reglages = [
        (document_agent_v2, "DOCUMENT", document, erreur_document),
        (evidence_compliance_agent_v2, "EVIDENCE", evidence_, erreur_evidence),
        (risk_agent_v2, "RISK", risque, erreur_risque),
        (recommendation_agent_v2, "RECOMMENDATION", recommandation, erreur_recommandation),
    ]
    for module, nom, charge, erreur in reglages:
        client = _FauxClient(journal, nom, charge, erreur)
        monkeypatch.setattr(module, "get_client", lambda c=client: c)


# === Le chemin complet ==================================================


def test_le_chemin_complet_execute_les_quatre_agents(monkeypatch, journal):
    cabler(monkeypatch, journal)

    enveloppe = lancer(executer(payload()))

    assert enveloppe.execution.agents_executes == [
        "DOCUMENT", "EVIDENCE", "RISK", "RECOMMENDATION"]
    assert enveloppe.execution.statut == "TERMINE"
    assert enveloppe.resultat.evidence.probabilite_conformite == 0.8
    assert enveloppe.resultat.risque is not None
    assert enveloppe.resultat.recommandation is not None


def test_l_ordre_des_agents_est_impose_par_leurs_dependances(monkeypatch, journal):
    """
    Evidence a besoin des analyses documentaires, Risk du résultat
    d'Evidence, Recommendation des deux. L'ordre n'est pas une convention :
    l'inverser priverait chaque agent de son entrée.
    """
    cabler(monkeypatch, journal)

    lancer(executer(payload()))

    assert [agent for agent, _ in journal] == [
        "DOCUMENT", "EVIDENCE", "RISK", "RECOMMENDATION"]


def test_une_analyse_documentaire_par_piece(monkeypatch, journal):
    p = payload()
    seconde = p.pieces[0].model_copy(update={"reference": "p2", "nom": "annexe.txt"})
    p = p.model_copy(update={"pieces": [p.pieces[0], seconde]})
    cabler(monkeypatch, journal)

    enveloppe = lancer(executer(p))

    assert len(enveloppe.resultat.analyses_documents) == 2
    assert [a.piece_reference for a in enveloppe.resultat.analyses_documents] == ["p1", "p2"]
    assert [agent for agent, _ in journal].count("DOCUMENT") == 2


# === Les options ========================================================


def test_risk_desactive_n_est_pas_appele(monkeypatch, journal):
    cabler(monkeypatch, journal)
    p = payload()
    p = p.model_copy(update={"options": p.options.model_copy(
        update={"analyse_risque": False})})

    enveloppe = lancer(executer(p))

    assert "RISK" not in enveloppe.execution.agents_executes
    assert enveloppe.resultat.risque is None
    assert "RISK" not in [agent for agent, _ in journal]


def test_recommendation_desactivee_n_est_pas_appelee(monkeypatch, journal):
    cabler(monkeypatch, journal)
    p = payload()
    p = p.model_copy(update={"options": p.options.model_copy(
        update={"generer_recommandation": False})})

    enveloppe = lancer(executer(p))

    assert "RECOMMENDATION" not in enveloppe.execution.agents_executes
    assert enveloppe.resultat.recommandation is None


def test_les_deux_options_desactivees_laissent_la_chaine_minimale(monkeypatch, journal):
    cabler(monkeypatch, journal)
    p = payload()
    p = p.model_copy(update={"options": p.options.model_copy(
        update={"analyse_risque": False, "generer_recommandation": False})})

    enveloppe = lancer(executer(p))

    assert enveloppe.execution.agents_executes == ["DOCUMENT", "EVIDENCE"]
    assert enveloppe.execution.statut == "TERMINE"


# === Les échecs =========================================================


def test_un_echec_du_document_agent_est_bloquant(monkeypatch, journal):
    """
    Conclure sur des pièces qu'on n'a pas pu soumettre reviendrait à juger
    sans avoir regardé.
    """
    cabler(monkeypatch, journal, erreur_document=RuntimeError("429 RESOURCE_EXHAUSTED"))

    with pytest.raises(EchecAgentBloquant) as capture:
        lancer(executer(payload()))

    assert capture.value.agent == "DOCUMENT"
    assert capture.value.categorie == "QUOTA"


def test_un_echec_de_l_agent_evidence_est_bloquant(monkeypatch, journal):
    cabler(monkeypatch, journal, erreur_evidence=RuntimeError("panne"))

    with pytest.raises(EchecAgentBloquant) as capture:
        lancer(executer(payload()))

    assert capture.value.agent == "EVIDENCE"


def test_un_echec_du_risk_agent_conserve_le_resultat_evidence(monkeypatch, journal):
    """
    Facultatif : son échec est classé et tracé, il n'annule pas le travail
    de conformité déjà produit. Et le statut ne prétend pas que tout s'est
    bien passé.
    """
    cabler(monkeypatch, journal, erreur_risque=RuntimeError("429 RESOURCE_EXHAUSTED"))

    enveloppe = lancer(executer(payload()))

    assert enveloppe.resultat.evidence.probabilite_conformite == 0.8
    assert enveloppe.resultat.risque is None
    assert enveloppe.execution.statut == "PARTIEL"
    assert [e.type.value for e in enveloppe.execution.erreurs] == ["QUOTA"]
    assert "RISK" not in enveloppe.execution.agents_executes


def test_un_echec_de_recommendation_n_empeche_pas_le_reste(monkeypatch, journal):
    cabler(monkeypatch, journal, erreur_recommandation=RuntimeError("NOT_FOUND"))

    enveloppe = lancer(executer(payload()))

    assert enveloppe.resultat.evidence is not None
    assert enveloppe.resultat.risque is not None
    assert enveloppe.resultat.recommandation is None
    assert enveloppe.execution.statut == "PARTIEL"


def test_un_echec_facultatif_n_est_jamais_converti_en_succes(monkeypatch, journal):
    cabler(monkeypatch, journal, erreur_risque=RuntimeError("panne"),
           erreur_recommandation=RuntimeError("panne"))

    enveloppe = lancer(executer(payload()))

    assert enveloppe.execution.statut == "PARTIEL"
    assert len(enveloppe.execution.erreurs) == 2


# === Ce qui circule, et ce qui ne circule pas ===========================


def test_le_contenu_brut_n_est_transmis_qu_au_document_agent(monkeypatch, journal):
    """
    La pièce est lue une fois, par l'agent à qui elle est destinée. Les
    suivants ne reçoivent que des constats.
    """
    cabler(monkeypatch, journal)

    lancer(executer(payload()))

    for agent, kwargs in journal:
        contenu = kwargs.get("contents")
        if agent == "DOCUMENT":
            # Une liste [Part binaire, prompt].
            assert isinstance(contenu, list)
            continue
        assert isinstance(contenu, str)
        assert "Code de conduite validé par la direction" not in contenu


def test_les_constats_documentaires_parviennent_a_l_agent_evidence(monkeypatch, journal):
    cabler(monkeypatch, journal)

    lancer(executer(payload()))

    prompt_evidence = next(k["contents"] for a, k in journal if a == "EVIDENCE")
    assert "D1-01-E1-P1" in prompt_evidence
    assert "Validation par la direction" in prompt_evidence


def test_le_resultat_evidence_parvient_au_risk_agent(monkeypatch, journal):
    cabler(monkeypatch, journal)

    lancer(executer(payload()))

    prompt_risque = next(k["contents"] for a, k in journal if a == "RISK")
    assert "0.8" in prompt_risque or "0,8" in prompt_risque


def test_la_reponse_ne_contient_ni_contenu_ni_base64(monkeypatch, journal):
    cabler(monkeypatch, journal)

    enveloppe = lancer(executer(payload()))
    rendu = enveloppe.model_dump_json()

    assert "Q29kZSBkZSBjb25kdWl0" not in rendu
    assert "contenu_base64" not in rendu
    assert "Code de conduite validé par la direction le 3 mars" not in rendu


def test_le_bloc_execution_ne_porte_que_des_mesures(monkeypatch, journal):
    """
    On énumère les clés plutôt que de faire confiance à la discipline
    d'écriture : un champ ajouté par mégarde ferait échouer ce test.
    """
    cabler(monkeypatch, journal)

    enveloppe = lancer(executer(payload()))

    assert set(enveloppe.execution.model_dump()) == {
        "contrat_execution_version", "provider", "requested_model", "statut",
        "agents_executes", "started_at", "finished_at", "duration_ms",
        "appels", "erreurs",
    }


# === Les métadonnées d'exécution ========================================


def test_chaque_appel_laisse_sa_trace(monkeypatch, journal):
    cabler(monkeypatch, journal)

    enveloppe = lancer(executer(payload()))

    assert len(enveloppe.execution.appels) == 4
    for trace in enveloppe.execution.appels:
        assert trace.served_model == "gemini-3.5-flash-lite"
        assert trace.response_id
        assert trace.usage is not None
        assert trace.usage.total_token_count == 120


def test_la_trace_documentaire_porte_la_reference_de_piece(monkeypatch, journal):
    """Ce qui distingue plusieurs appels d'un même agent dans une passe."""
    cabler(monkeypatch, journal)

    enveloppe = lancer(executer(payload()))

    documentaires = [t for t in enveloppe.execution.appels if t.agent == "DOCUMENT"]
    assert [t.piece_reference for t in documentaires] == ["p1"]


def test_l_enveloppe_porte_les_deux_versions_de_contrat(monkeypatch, journal):
    cabler(monkeypatch, journal)

    enveloppe = lancer(executer(payload()))

    assert enveloppe.resultat.contrat_version == "2.0"
    assert enveloppe.execution.contrat_execution_version == "1.0"
    assert enveloppe.execution.provider == "google-genai"


def test_la_duree_totale_couvre_celle_des_appels(monkeypatch, journal):
    cabler(monkeypatch, journal)

    enveloppe = lancer(executer(payload()))

    assert enveloppe.execution.duration_ms >= 0
    assert enveloppe.execution.finished_at >= enveloppe.execution.started_at


# === Cohérence des références ===========================================


def test_une_reference_inventee_par_le_modele_est_ecartee(monkeypatch, journal):
    """
    Le recoupement des agents écarte ce qui ne désigne rien du catalogue.
    L'orchestrateur n'a pas à le refaire — mais il ne doit pas le défaire.
    """
    evidence_fautif = dict(EVIDENCE)
    evidence_fautif["evaluations"] = EVIDENCE["evaluations"] + [{
        "reference": "D9-99-E1-P1",
        "couverture": "COMPLETE",
        "pieces_utilisees": [],
        "elements_observes": [],
        "elements_manquants": [],
        "elements_non_verifiables": [],
        "conflit": None,
        "justification": "Attente inexistante.",
    }]
    cabler(monkeypatch, journal, evidence_=evidence_fautif)

    enveloppe = lancer(executer(payload()))

    references = [e.reference for e in enveloppe.resultat.evidence.evaluations]
    assert "D9-99-E1-P1" not in references
    assert references == ["D1-01-E1-P1"]


def test_le_statut_non_verifiable_survit_au_chainage(monkeypatch, journal):
    """
    `NON_VERIFIABLE` dit qu'on n'a pas pu regarder ; `INSUFFISANTE` qu'on a
    regardé. Les confondre ferait porter à l'organisation le coût d'un
    défaut technique de lecture.
    """
    lecture = dict(LECTURE)
    lecture["constats"] = [{
        "reference": "D1-01-E1-P1",
        "presence": "NON_VERIFIABLE",
        "elements_releves": [],
        "elements_manquants": [],
    }]
    evidence_ = dict(EVIDENCE)
    evidence_["evaluations"] = [{
        "reference": "D1-01-E1-P1",
        "couverture": "NON_VERIFIABLE",
        "pieces_utilisees": ["p1"],
        "elements_observes": [],
        "elements_manquants": [],
        "elements_non_verifiables": ["Le document n'a pas pu être lu."],
        "conflit": None,
        "justification": "Pièce illisible.",
    }]
    cabler(monkeypatch, journal, document=lecture, evidence_=evidence_)

    enveloppe = lancer(executer(payload()))

    assert enveloppe.resultat.analyses_documents[0].constats[0].presence == "NON_VERIFIABLE"
    evaluation = enveloppe.resultat.evidence.evaluations[0]
    assert evaluation.couverture == "NON_VERIFIABLE"
    assert evaluation.elements_non_verifiables == ["Le document n'a pas pu être lu."]
    assert evaluation.elements_manquants == []


def test_une_couverture_partielle_est_conservee_telle_quelle(monkeypatch, journal):
    evidence_ = dict(EVIDENCE)
    evidence_["couverture_preuve"] = False
    evidence_["probabilite_conformite"] = 0.35
    evidence_["evaluations"] = [{
        "reference": "D1-01-E1-P1",
        "couverture": "PARTIELLE",
        "pieces_utilisees": ["p1"],
        "elements_observes": ["Code présent."],
        "elements_manquants": ["Aucune date de validation."],
        "elements_non_verifiables": [],
        "conflit": None,
        "justification": "Le code existe mais n'est pas daté.",
    }]
    cabler(monkeypatch, journal, evidence_=evidence_)

    enveloppe = lancer(executer(payload()))

    assert enveloppe.resultat.evidence.evaluations[0].couverture == "PARTIELLE"
    assert enveloppe.resultat.evidence.couverture_preuve is False
    assert enveloppe.resultat.evidence.probabilite_conformite == 0.35


# === Isolation des collectes ============================================


def test_deux_orchestrations_ne_melangent_pas_leurs_traces(monkeypatch, journal):
    """
    La collecte de traces vit dans un `ContextVar`, pas dans une variable
    de module : deux missions traitées en parallèle doivent avoir chacune
    la sienne. Le défaut inverse ne se verrait que sous charge.
    """
    cabler(monkeypatch, journal)

    async def deux_en_parallele():
        return await asyncio.gather(executer(payload()), executer(payload()))

    premiere, seconde = lancer(deux_en_parallele())

    assert len(premiere.execution.appels) == 4
    assert len(seconde.execution.appels) == 4
    identifiants_a = {t.response_id for t in premiere.execution.appels}
    identifiants_b = {t.response_id for t in seconde.execution.appels}
    assert not (identifiants_a & identifiants_b), "les traces se sont mélangées"


def test_la_collecte_est_refermee_meme_apres_un_echec(monkeypatch, journal):
    from app.services.appel_gemini import traces_collectees

    cabler(monkeypatch, journal, erreur_evidence=RuntimeError("panne"))

    with pytest.raises(EchecAgentBloquant):
        lancer(executer(payload()))

    assert traces_collectees() is None

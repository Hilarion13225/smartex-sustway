"""
Pipeline d'import : contrat, extracteurs, lots, fusion.

Ce qui est éprouvé ici tient en une phrase : ce que le modèle rend est accepté
seulement s'il respecte le contrat, et il n'est jamais réparé. Une sortie
approximative doit faire échouer l'extraction, pas produire un brouillon dont
personne ne saurait ce qu'il contient.

Gemini est systématiquement remplacé par un double : la suite ne doit
dépendre ni d'une clé API, ni du réseau, ni du quota.
"""

import base64
import csv
import io
import json
from unittest.mock import AsyncMock, patch

import pytest
from fastapi.testclient import TestClient
from pydantic import ValidationError

from app.agents import referentiel_import_agent
from app.agents.referentiel_import_agent import ExtractionRefusee, _fusionner, _lots
from app.extraction.base import ExtractionImpossible, Section
from app.extraction.formats import (
    ExtracteurCsv,
    ExtracteurDocx,
    ExtracteurJson,
    ExtracteurPdf,
    ExtracteurXlsx,
    extracteur_pour,
)
from app.main import app
from app.models.import_referentiel import (
    BrouillonImporte,
    CritereExtrait,
    DomaineExtrait,
    ExigenceExtraite,
    Localisation,
    PreuveAttendueExtraite,
    ReferentielExtrait,
    RegleAnalyseExtraite,
    TypeSource,
)
from app.services.validation_regles import DefinitionInvalide, verifier_definition

client = TestClient(app)


# --- Contrat Pydantic --------------------------------------------------------


def _brouillon_minimal(code_critere="D1-01"):
    return BrouillonImporte(
        referentiel=ReferentielExtrait(code="TEST", nom="Référentiel de test"),
        domaines=[
            DomaineExtrait(
                code="D1",
                nom="Gouvernance",
                criteres=[CritereExtrait(code=code_critere, libelle="Un critère")],
            )
        ],
    )


def test_un_brouillon_conforme_est_accepte():
    brouillon = _brouillon_minimal()
    assert brouillon.compter()["criteres"] == 1


def test_champ_obligatoire_absent_est_refuse():
    with pytest.raises(ValidationError):
        CritereExtrait(libelle="Un critère sans code")


def test_enum_invalide_est_refusee():
    with pytest.raises(ValidationError):
        PreuveAttendueExtraite(type="CAPTURE_ECRAN", libelle="Une pièce")


def test_cle_inconnue_est_refusee():
    """
    Le contrat refuse ce qu'il ne connaît pas.

    Accepter une clé en trop la ferait disparaître silencieusement : le
    relecteur croirait avoir importé une information que rien ne porte.
    """
    with pytest.raises(ValidationError):
        ReferentielExtrait(code="TEST", nom="Test", champ_invente="valeur")


def test_une_regle_sur_une_piece_doit_nommer_son_exigence():
    with pytest.raises(ValidationError):
        RegleAnalyseExtraite(
            code="R1",
            type="PRESENCE",
            libelle="Sans exigence",
            preuve_attendue_libelle="Une pièce",
            definition={"elements": ["x"]},
        )


def test_une_regle_ne_peut_viser_une_exigence_absente():
    with pytest.raises(ValidationError):
        CritereExtrait(
            code="D1-01",
            libelle="Un critère",
            regles_analyse=[
                RegleAnalyseExtraite(
                    code="R1",
                    type="PRESENCE",
                    libelle="Vise une exigence fantôme",
                    exigence_code="D1-01-E9",
                    definition={"elements": ["x"]},
                )
            ],
        )


def test_un_critere_ne_peut_viser_un_sous_domaine_absent():
    with pytest.raises(ValidationError):
        DomaineExtrait(
            code="D1",
            nom="Gouvernance",
            criteres=[
                CritereExtrait(code="D1-01", libelle="Un critère", sous_domaine_code="D1-S9")
            ],
        )


def test_codes_de_critere_en_double_sont_refuses():
    with pytest.raises(ValidationError):
        BrouillonImporte(
            referentiel=ReferentielExtrait(code="TEST", nom="Test"),
            domaines=[
                DomaineExtrait(
                    code="D1",
                    nom="Gouvernance",
                    criteres=[
                        CritereExtrait(code="D1-01", libelle="Premier"),
                        CritereExtrait(code="D1-01", libelle="Doublon"),
                    ],
                )
            ],
        )


def test_la_confiance_reste_dans_ses_bornes():
    with pytest.raises(ValidationError):
        CritereExtrait(code="D1-01", libelle="Un critère", confiance=1.4)


def test_le_contrat_ne_permet_pas_de_declarer_une_validation_humaine():
    """
    `validee_par` et `validee_le` appartiennent au workflow humain côté Java.

    Si ce service pouvait les écrire, il pourrait prétendre qu'un contenu a
    été accepté par quelqu'un.
    """
    with pytest.raises(ValidationError):
        ExigenceExtraite(
            intitule="Une exigence",
            enonce="Énoncé",
            validee_par="00000000-0000-0000-0000-000000000000",
        )


# --- Validation des règles, miroir du Java -----------------------------------


def test_une_definition_conforme_passe():
    verifier_definition("DATE_VALIDITE", {"champ": "date de révision"})


def test_une_cle_obligatoire_manquante_est_refusee():
    with pytest.raises(DefinitionInvalide):
        verifier_definition("DATE_VALIDITE", {})


def test_une_cle_inconnue_dans_une_definition_est_refusee():
    with pytest.raises(DefinitionInvalide):
        verifier_definition("PRESENCE", {"elements": ["x"], "cle_inventee": "valeur"})


def test_un_type_de_regle_inconnu_est_refuse():
    with pytest.raises(DefinitionInvalide):
        verifier_definition("VERIFICATION_MAGIQUE", {})


# --- Extracteurs -------------------------------------------------------------


def test_csv_detecte_le_point_virgule():
    contenu = "code;libelle\nD1-01;Gouvernance\nD1-02;Éthique\n".encode("utf-8")
    source = ExtracteurCsv().extraire(contenu, "grille.csv")

    assert source.metadonnees["separateur"] == ";"
    assert len(source.sections) == 2
    assert source.sections[0].localisation.ligne == 2
    assert "Gouvernance" in source.sections[0].texte
    # L'en-tête accompagne la valeur : sans cela, le modèle recevrait des
    # colonnes anonymes.
    assert "code" in source.sections[0].texte


def test_csv_detecte_la_tabulation():
    contenu = "code\tlibelle\nD1-01\tGouvernance\n".encode("utf-8")
    source = ExtracteurCsv().extraire(contenu, "grille.csv")
    assert source.metadonnees["separateur"] == "\t"


def test_csv_accepte_un_encodage_hérité():
    contenu = "code;libelle\nD1-01;Éthique\n".encode("cp1252")
    source = ExtracteurCsv().extraire(contenu, "grille.csv")
    assert "Éthique" in source.sections[0].texte


def test_csv_vide_echoue_explicitement():
    with pytest.raises(ExtractionImpossible):
        ExtracteurCsv().extraire(b"", "grille.csv")


def test_json_conserve_les_chemins():
    contenu = json.dumps(
        {"domaines": [{"code": "D1", "criteres": [{"code": "D1-01"}]}]}
    ).encode("utf-8")
    source = ExtracteurJson().extraire(contenu, "grille.json")

    chemins = [s.localisation.chemin for s in source.sections]
    assert any(c.startswith("$.domaines[0]") for c in chemins)
    assert all(s.localisation.type == TypeSource.JSON for s in source.sections)


def test_json_invalide_est_refuse():
    with pytest.raises(ExtractionImpossible) as exc:
        ExtracteurJson().extraire(b"{ ceci n'est pas du json", "grille.json")
    assert "JSON invalide" in str(exc.value)


def test_xlsx_conserve_feuille_et_ligne():
    openpyxl = pytest.importorskip("openpyxl")
    classeur = openpyxl.Workbook()
    feuille = classeur.active
    feuille.title = "Critères"
    feuille.append(["code", "libelle"])
    feuille.append(["D1-01", "Gouvernance"])
    tampon = io.BytesIO()
    classeur.save(tampon)

    source = ExtracteurXlsx().extraire(tampon.getvalue(), "grille.xlsx")

    assert len(source.sections) == 1
    assert source.sections[0].localisation.feuille == "Critères"
    assert source.sections[0].localisation.ligne == 2
    assert source.metadonnees["feuilles"]["Critères"] == 1


def test_xlsx_lit_chaque_feuille_avec_ses_propres_entetes():
    """Rien ne garantit que deux feuilles partagent une structure."""
    openpyxl = pytest.importorskip("openpyxl")
    classeur = openpyxl.Workbook()
    premiere = classeur.active
    premiere.title = "Critères"
    premiere.append(["code", "libelle"])
    premiere.append(["D1-01", "Gouvernance"])
    seconde = classeur.create_sheet("Preuves")
    seconde.append(["type", "intitule", "obligatoire"])
    seconde.append(["POLITIQUE", "Politique RSE", "oui"])
    tampon = io.BytesIO()
    classeur.save(tampon)

    source = ExtracteurXlsx().extraire(tampon.getvalue(), "grille.xlsx")

    textes = {s.localisation.feuille: s.texte for s in source.sections}
    assert "code : D1-01" in textes["Critères"]
    assert "type : POLITIQUE" in textes["Preuves"]


def test_docx_lit_les_paragraphes_et_les_tableaux():
    docx = pytest.importorskip("docx")
    document = docx.Document()
    document.add_paragraph("Référentiel de test")
    tableau = document.add_table(rows=1, cols=2)
    tableau.rows[0].cells[0].text = "D1-01"
    tableau.rows[0].cells[1].text = "Gouvernance"
    tampon = io.BytesIO()
    document.save(tampon)

    source = ExtracteurDocx().extraire(tampon.getvalue(), "grille.docx")

    textes = [s.texte for s in source.sections]
    assert any("Référentiel de test" in t for t in textes)
    # Un référentiel s'écrit souvent en tableau : les perdre rendrait un
    # document apparemment vide sans rien signaler.
    assert any("D1-01" in t and "Gouvernance" in t for t in textes)
    assert source.metadonnees["tableaux"] == 1


def test_docx_corrompu_echoue_explicitement():
    with pytest.raises(ExtractionImpossible):
        ExtracteurDocx().extraire(b"ceci n'est pas un docx", "grille.docx")


def test_pdf_corrompu_echoue_explicitement():
    with pytest.raises(ExtractionImpossible):
        ExtracteurPdf().extraire(b"ceci n'est pas un pdf", "grille.pdf")


def test_un_type_inconnu_na_pas_dextracteur():
    with pytest.raises(ExtractionImpossible):
        extracteur_pour("image/png")


def test_chaque_format_annonce_a_son_extracteur():
    for type_mime in (
        "application/pdf",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "text/csv",
        "application/json",
    ):
        assert extracteur_pour(type_mime) is not None


# --- Lots et fusion ----------------------------------------------------------


def _section(texte, ligne):
    return Section(texte=texte, localisation=Localisation(type=TypeSource.CSV, ligne=ligne))


def test_les_lots_respectent_la_taille_et_lordre():
    sections = [_section("x" * 40, i) for i in range(1, 6)]
    lots = _lots(sections, taille_maximale=100)

    assert len(lots) == 3
    # L'ordre du document est conservé : une section n'est jamais déplacée.
    assert lots[0][0].localisation.ligne == 1
    assert lots[-1][-1].localisation.ligne == 5


def test_une_section_nest_jamais_coupee():
    """Couper une section lui ferait perdre sa localisation."""
    sections = [_section("x" * 500, 1)]
    lots = _lots(sections, taille_maximale=100)
    assert len(lots) == 1
    assert lots[0][0].taille() == 500


def test_la_fusion_reunit_les_criteres_dun_meme_domaine():
    premier = _brouillon_minimal("D1-01")
    second = _brouillon_minimal("D1-02")

    fusionne, doublons = _fusionner([premier, second])

    assert doublons == []
    assert len(fusionne.domaines) == 1
    assert {c.code for c in fusionne.domaines[0].criteres} == {"D1-01", "D1-02"}


def test_la_fusion_ecarte_un_doublon_sans_le_supprimer_du_journal(caplog):
    """
    Un critère vu deux fois n'est pas fusionné en silence.

    Le second est écarté du brouillon et la duplication rapportée : c'est au
    relecteur de trancher, pas au pipeline.

    Elle est désormais rendue à l'appelant, et pas seulement écrite dans les
    journaux : côté produit, personne ne lit les journaux du service, et un
    critère mis de côté sans que quiconque le sache est une information
    perdue.
    """
    premier = _brouillon_minimal("D1-01")
    second = _brouillon_minimal("D1-01")

    with caplog.at_level("WARNING"):
        fusionne, doublons = _fusionner([premier, second])

    assert len(fusionne.domaines[0].criteres) == 1
    assert "double" in caplog.text
    assert doublons == [
        {"type": "CRITERE", "code": "D1-01", "domaine_code": "D1", "libelle": "Un critère"}
    ]


def test_la_fusion_sans_resultat_echoue():
    with pytest.raises(ExtractionRefusee):
        _fusionner([])


# --- Route et gestion d'erreurs ----------------------------------------------


def _requete(contenu: bytes, type_mime="text/csv", nom="grille.csv"):
    return {
        "import_id": "11111111-1111-1111-1111-111111111111",
        "nom_fichier": nom,
        "type_mime": type_mime,
        "contenu_base64": base64.b64encode(contenu).decode(),
    }


@patch("app.agents.referentiel_import_agent._analyser_lot", new_callable=AsyncMock)
def test_extraction_nominale(mock_lot):
    mock_lot.return_value = _brouillon_minimal()
    contenu = "code;libelle\nD1-01;Gouvernance\n".encode("utf-8")

    reponse = client.post("/api/v1/referentiels/imports/extraction", json=_requete(contenu))

    assert reponse.status_code == 200
    corps = reponse.json()
    assert corps["brouillon"]["referentiel"]["code"] == "TEST"
    assert corps["metadonnees"]["criteres"] == 1
    assert corps["metadonnees"]["type_source"] == "CSV"
    assert corps["metadonnees"]["separateur"] == ";"


@patch("app.agents.referentiel_import_agent._analyser_lot", new_callable=AsyncMock)
def test_une_regle_incoherente_fait_echouer_lextraction(mock_lot):
    """La sortie n'est pas réparée : une règle mal formée rejette l'ensemble."""
    brouillon = BrouillonImporte(
        referentiel=ReferentielExtrait(code="TEST", nom="Test"),
        domaines=[
            DomaineExtrait(
                code="D1",
                nom="Gouvernance",
                criteres=[
                    CritereExtrait(
                        code="D1-01",
                        libelle="Un critère",
                        regles_analyse=[
                            RegleAnalyseExtraite(
                                code="R1",
                                type="DATE_VALIDITE",
                                libelle="Sans champ de date",
                                definition={},
                            )
                        ],
                    )
                ],
            )
        ],
    )
    mock_lot.return_value = brouillon

    reponse = client.post(
        "/api/v1/referentiels/imports/extraction",
        json=_requete("code;libelle\nD1-01;Gouvernance\n".encode("utf-8")),
    )

    assert reponse.status_code == 422
    assert "champ" in reponse.json()["detail"]


def test_fichier_vide_est_refuse():
    reponse = client.post("/api/v1/referentiels/imports/extraction", json=_requete(b""))
    assert reponse.status_code == 422


def test_base64_invalide_est_refuse():
    requete = _requete(b"x")
    requete["contenu_base64"] = "ceci n'est pas du base64 !!"
    reponse = client.post("/api/v1/referentiels/imports/extraction", json=requete)
    assert reponse.status_code == 422


def test_fichier_illisible_est_refuse_avec_son_motif():
    reponse = client.post(
        "/api/v1/referentiels/imports/extraction",
        json=_requete(b"{ pas du json", "application/json", "grille.json"),
    )
    assert reponse.status_code == 422
    assert "JSON invalide" in reponse.json()["detail"]


@patch("app.agents.referentiel_import_agent._analyser_lot", new_callable=AsyncMock)
def test_une_erreur_du_modele_ne_produit_aucun_brouillon(mock_lot):
    mock_lot.side_effect = ExtractionRefusee("Structure non conforme au contrat")

    reponse = client.post(
        "/api/v1/referentiels/imports/extraction",
        json=_requete("code;libelle\nD1-01;Gouvernance\n".encode("utf-8")),
    )

    assert reponse.status_code == 422
    assert "non conforme" in reponse.json()["detail"]


@patch("app.agents.referentiel_import_agent._analyser_lot", new_callable=AsyncMock)
def test_un_appel_en_timeout_ne_produit_aucun_brouillon(mock_lot):
    mock_lot.side_effect = TimeoutError("Délai dépassé")

    reponse = client.post(
        "/api/v1/referentiels/imports/extraction",
        json=_requete("code;libelle\nD1-01;Gouvernance\n".encode("utf-8")),
    )

    assert reponse.status_code == 503


@patch("app.agents.referentiel_import_agent._analyser_lot", new_callable=AsyncMock)
def test_un_quota_epuise_est_rapporte_sans_brouillon(mock_lot):
    mock_lot.side_effect = RuntimeError("429 RESOURCE_EXHAUSTED")

    reponse = client.post(
        "/api/v1/referentiels/imports/extraction",
        json=_requete("code;libelle\nD1-01;Gouvernance\n".encode("utf-8")),
    )

    assert reponse.status_code == 503
    # L'appelant doit pouvoir distinguer un quota épuisé d'une panne, mais
    # par une catégorie stable et non par le texte brut du fournisseur :
    # celui-ci peut embarquer une URL authentifiée ou un fragment de requête,
    # et il ne franchit plus la frontière du service (phase 5.6).
    detail = reponse.json()["detail"]
    assert "QUOTA" in detail
    assert "RESOURCE_EXHAUSTED" not in detail


def test_les_deux_pipelines_restent_distincts():
    """
    L'import et l'analyse d'audit ne partagent ni route ni agent.

    Les confondre donnerait un agent qui fait mal les deux : lire un cadre
    d'audit et juger une organisation au regard d'un critère ne demandent ni
    le même prompt, ni le même contrat de sortie.
    """
    chemins = {route.path for route in app.routes}
    assert "/api/v1/referentiels/imports/extraction" in chemins
    assert "/api/v1/evaluations/critere" in chemins

    from app.agents import evidence_compliance_agent

    assert referentiel_import_agent.PROMPT != evidence_compliance_agent._construire_prompt(
        code="X", libelle="Y", description=None, resumes=[], scenario=None, reponses=[]
    )

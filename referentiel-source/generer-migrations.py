# -*- coding: utf-8 -*-
"""
Génère les migrations du catalogue à partir de la source versionnée.

    V55 — sème le catalogue réel dans une nouvelle version, et la publie.
    V56 — en dérive un brouillon, y écrit le contenu métier, et le publie.

Les deux migrations sont générées et non écrites à la main : la source de
vérité est le JSON extrait de l'existant et le contenu métier rédigé à côté.
Les modifier directement ferait diverger le dépôt de ce qu'il produit.

Aucun identifiant n'est écrit en dur : tout est résolu par les codes stables
du catalogue et la version visée.
"""

import io
import json
import os
import sys

BASE = os.path.dirname(os.path.abspath(__file__))
DEPOT = os.path.dirname(BASE)
MIGRATIONS = os.path.join(DEPOT, "api-quarkus", "src", "main", "resources", "db", "migration")

sys.path.insert(0, os.path.join(BASE, "contenu-metier"))

import ifc_sfi              # noqa: E402
import pri                  # noqa: E402
import smartex_sustway_a    # noqa: E402
import smartex_sustway_b    # noqa: E402

REFERENTIELS = ("SMARTEX_SUSTWAY", "IFC_SFI", "PRI")

CONTENU = {
    "IFC_SFI": ifc_sfi.CONTENU,
    "PRI": pri.CONTENU,
    "SMARTEX_SUSTWAY": dict(smartex_sustway_a.CONTENU, **smartex_sustway_b.CONTENU),
}

VERSION_CATALOGUE = "2.0"
VERSION_CONTENU = "2.1"

TYPES_PREUVE = {"POLITIQUE", "PROCEDURE", "REGISTRE", "RAPPORT", "CERTIFICAT",
                "INDICATEUR", "DOCUMENT_LEGAL", "PREUVE_OPERATIONNELLE", "AUTRE"}
TYPES_REGLE = {"PRESENCE", "ELEMENT_ATTENDU", "DATE_VALIDITE", "SIGNATURE",
               "COHERENCE_DECLARATION", "INCOHERENCE", "CONDITION"}
SEVERITES = {"FAIBLE", "MOYENNE", "ELEVEE", "CRITIQUE"}

# Schémas de RegleAnalyseValidation, répliqués pour refuser dès la génération
# une définition que l'API rejetterait ensuite.
SCHEMAS = {
    "PRESENCE": ({"elements"}, {"tolerance"}),
    "ELEMENT_ATTENDU": ({"elements"}, {"emplacement"}),
    "DATE_VALIDITE": ({"champ"}, {"anciennete_maximale_mois", "posterieure_a"}),
    "SIGNATURE": (set(), {"autorites_acceptees", "mention_attendue"}),
    "COHERENCE_DECLARATION": ({"elements"}, {"ecart_tolere"}),
    "INCOHERENCE": ({"elements"}, set()),
    "CONDITION": ({"condition"}, {"elements"}),
}


def q(texte):
    """Littéral SQL, apostrophes doublées. NULL si absent."""
    if texte is None:
        return "NULL"
    return "'" + str(texte).replace("'", "''") + "'"


def charger_catalogue():
    catalogue = {}
    for code in REFERENTIELS:
        with io.open(os.path.join(BASE, code + ".json"), encoding="utf-8") as f:
            catalogue[code] = json.load(f)
    return catalogue


def criteres_du_catalogue(referentiel):
    """Aplatit le catalogue : (domaine, critère) dans l'ordre de lecture."""
    for domaine in referentiel["domaines"] or []:
        for critere in domaine["criteres"] or []:
            yield domaine, critere


def valider(catalogue):
    """Le contenu métier doit correspondre exactement au catalogue."""
    erreurs = []
    for ref in REFERENTIELS:
        codes_catalogue = {c["code"] for _, c in criteres_du_catalogue(catalogue[ref])}
        codes_contenu = set(CONTENU[ref])

        for code in sorted(codes_catalogue - codes_contenu):
            erreurs.append(ref + "/" + code + " : critère sans contenu métier")
        for code in sorted(codes_contenu - codes_catalogue):
            erreurs.append(ref + "/" + code + " : contenu métier sans critère correspondant")

        for code, c in CONTENU[ref].items():
            ou = ref + "/" + code
            if len(c["intitule"]) > 300:
                erreurs.append(ou + " : intitulé de plus de 300 caractères")
            if not c["enonce"].strip():
                erreurs.append(ou + " : énoncé vide")
            for (typ, lib, _desc, _obl) in c["preuves"]:
                if typ not in TYPES_PREUVE:
                    erreurs.append(ou + " : type de preuve inconnu " + typ)
                if len(lib) > 300:
                    erreurs.append(ou + " : libellé de preuve trop long")
            vus = set()
            for (suffixe, typ, lib, sev, portee, defn) in c["regles"]:
                if suffixe in vus:
                    erreurs.append(ou + " : code de règle en double " + suffixe)
                vus.add(suffixe)
                if typ not in TYPES_REGLE:
                    erreurs.append(ou + " : type de règle inconnu " + typ)
                if sev not in SEVERITES:
                    erreurs.append(ou + " : sévérité inconnue " + sev)
                obligatoires, facultatives = SCHEMAS[typ]
                manquantes = obligatoires - set(defn)
                if manquantes:
                    erreurs.append(ou + "/" + suffixe + " : clés obligatoires manquantes "
                                   + ", ".join(sorted(manquantes)))
                inconnues = set(defn) - obligatoires - facultatives
                if inconnues:
                    erreurs.append(ou + "/" + suffixe + " : clés inconnues "
                                   + ", ".join(sorted(inconnues)))
                if isinstance(portee, int) and portee >= len(c["preuves"]):
                    erreurs.append(ou + "/" + suffixe + " : portée vers une preuve inexistante")
    return erreurs


# =====================================================================
# V55 — semis du catalogue réel
# =====================================================================

ENTETE_V55 = """-- =====================================================================
-- Catalogue réel du référentiel, semé depuis la source versionnée
-- =====================================================================
-- GÉNÉRÉE — ne pas modifier à la main.
-- Source : referentiel-source/*.json, via referentiel-source/generer-migrations.py
--
-- Deux catalogues coexistaient sans que rien ne le signale : celui que
-- produisaient V11 et V20 (145 critères, codes VE-01, PS1-01, P1-01…) et
-- celui que l'application utilisait réellement (136 critères, codes D1-01
-- à D6-93, portant le questionnaire tel qu'il est posé). Le second avait
-- été chargé directement en base, hors migrations : aucune installation
-- neuve ne pouvait le reproduire.
--
-- Cette migration le sème depuis une source désormais versionnée. Elle ne
-- corrige rien au passage : les coquilles du catalogue sont reproduites
-- telles quelles, faute de quoi la reproduction ne serait plus vérifiable.
--
-- Elle procède par nouvelle version plutôt qu'en écrasant l'existant. Sur
-- une base neuve, la version 1.0 issue de V11/V20 est archivée et la 2.0
-- devient courante. Sur une base en service, la 1.0 qui porte déjà le
-- catalogue réel est archivée à l'identique, et les missions qui l'ont
-- auditée continuent de la lire : leur questionnaire figé ne bouge pas.
-- Dans les deux cas, la version publiée à l'arrivée est le catalogue réel.
-- =====================================================================

-- --- 1. Périmètre ------------------------------------------------------

CREATE TEMP TABLE _semis (referentiel_id uuid PRIMARY KEY, ancienne uuid, nouvelle uuid)
    ON COMMIT DROP;

INSERT INTO _semis (referentiel_id, ancienne)
SELECT r.id, v.id
  FROM referentiel r
  JOIN referentiel_version v ON v.referentiel_id = r.id AND v.statut = 'PUBLIEE'
 WHERE r.code IN ('SMARTEX_SUSTWAY', 'IFC_SFI', 'PRI');

DO $$
DECLARE
    nb integer;
BEGIN
    SELECT count(*) INTO nb FROM _semis;
    IF nb <> 3 THEN
        RAISE EXCEPTION 'Périmètre inattendu : % version(s) publiée(s) pour les trois référentiels, 3 attendues', nb;
    END IF;
END $$;

-- --- 2. Ouverture de la version du catalogue réel ----------------------

WITH nouvelles AS (
    INSERT INTO referentiel_version
        (referentiel_id, numero, notes, nombre_domaines, nombre_criteres,
         statut, creee_le, remplace_version_id)
    SELECT s.referentiel_id, '{version}',
           'Catalogue réel semé depuis la source versionnée (referentiel-source).',
           0, 0, 'BROUILLON', now(), s.ancienne
      FROM _semis s
    RETURNING id, remplace_version_id
)
UPDATE _semis s SET nouvelle = n.id FROM nouvelles n WHERE n.remplace_version_id = s.ancienne;

-- --- 3. Contenu du catalogue -------------------------------------------
"""

PIED_V55 = """
-- --- 4. Publication de la version du catalogue -------------------------
--
-- Archiver d'abord, publier ensuite : l'index partiel n'autorise qu'une
-- version publiée par référentiel et rejetterait l'ordre inverse.

UPDATE referentiel_version v SET statut = 'ARCHIVEE'
  FROM _semis s WHERE s.ancienne = v.id;

UPDATE referentiel_version v
   SET statut = 'PUBLIEE',
       publiee_le = now(),
       nombre_domaines = (SELECT count(*) FROM domaine d WHERE d.referentiel_version_id = v.id),
       nombre_criteres = (SELECT count(*) FROM critere c
                           WHERE c.referentiel_version_id = v.id AND c.actif)
  FROM _semis s WHERE s.nouvelle = v.id;

UPDATE referentiel r SET version = '{version}'
  FROM _semis s WHERE s.referentiel_id = r.id;

-- --- 5. Vérification ---------------------------------------------------

DO $verif$
DECLARE
    attendu    CONSTANT integer := {total_criteres};
    obtenu     integer;
    sans_exig  integer;
    sans_quest integer;
    incoherent integer;
BEGIN
    SELECT count(*) INTO obtenu
      FROM critere c JOIN _semis s ON s.nouvelle = c.referentiel_version_id;
    IF obtenu <> attendu THEN
        RAISE EXCEPTION 'Semis incomplet : % critère(s) semé(s), % attendu(s)', obtenu, attendu;
    END IF;

    SELECT count(*) INTO sans_exig
      FROM critere c JOIN _semis s ON s.nouvelle = c.referentiel_version_id
     WHERE NOT EXISTS (SELECT 1 FROM exigence e WHERE e.critere_id = c.id);
    IF sans_exig > 0 THEN
        RAISE EXCEPTION '% critère(s) semé(s) sans exigence initiale', sans_exig;
    END IF;

    SELECT count(*) INTO sans_quest
      FROM critere c JOIN _semis s ON s.nouvelle = c.referentiel_version_id
     WHERE NOT EXISTS (SELECT 1 FROM question q WHERE q.critere_id = c.id);
    IF sans_quest > 0 THEN
        RAISE EXCEPTION '% critère(s) semé(s) sans question', sans_quest;
    END IF;

    -- Rien ne doit traverser les versions.
    SELECT count(*) INTO incoherent FROM (
        SELECT 1 FROM critere c JOIN domaine d ON d.id = c.domaine_id
         WHERE c.referentiel_version_id <> d.referentiel_version_id
        UNION ALL
        SELECT 1 FROM sous_domaine sd JOIN domaine d ON d.id = sd.domaine_id
         WHERE sd.referentiel_version_id <> d.referentiel_version_id
        UNION ALL
        SELECT 1 FROM question qq JOIN critere c ON c.id = qq.critere_id
         WHERE qq.referentiel_version_id <> c.referentiel_version_id
        UNION ALL
        SELECT 1 FROM exigence e JOIN critere c ON c.id = e.critere_id
         WHERE e.referentiel_version_id <> c.referentiel_version_id
    ) x;
    IF incoherent > 0 THEN
        RAISE EXCEPTION '% ligne(s) rattachées à une version différente de leur parent', incoherent;
    END IF;

    RAISE NOTICE 'Catalogue réel semé : % critères en version {version}', obtenu;
END;
$verif$;
"""


def generer_v55(catalogue):
    total = sum(len(list(criteres_du_catalogue(catalogue[r]))) for r in REFERENTIELS)
    lignes = [ENTETE_V55.replace("{version}", VERSION_CATALOGUE)]
    a = lignes.append

    for ref in REFERENTIELS:
        r = catalogue[ref]
        a("\n-- ======================= " + ref + " =======================\n")

        # La version cible du référentiel, retrouvée par son code.
        version = ("(SELECT s.nouvelle FROM _semis s JOIN referentiel r ON r.id = s.referentiel_id"
                   " WHERE r.code = " + q(ref) + ")")
        referentiel = "(SELECT id FROM referentiel WHERE code = " + q(ref) + ")"

        for domaine in r["domaines"] or []:
            a("INSERT INTO domaine (referentiel_id, referentiel_version_id, code, nom, description, ordre)")
            a("VALUES (" + referentiel + ", " + version + ", " + q(domaine["code"]) + ", "
              + q(domaine["nom"]) + ", " + q(domaine["description"]) + ", "
              + str(domaine["ordre"]) + ");")

            for sd in domaine["sousDomaines"] or []:
                a("INSERT INTO sous_domaine (domaine_id, referentiel_version_id, code, nom,"
                  " description, ordre)")
                a("SELECT d.id, d.referentiel_version_id, " + q(sd["code"]) + ", " + q(sd["nom"])
                  + ", " + q(sd["description"]) + ", " + str(sd["ordre"]))
                a("  FROM domaine d WHERE d.referentiel_version_id = " + version
                  + " AND d.code = " + q(domaine["code"]) + ";")

            for c in domaine["criteres"] or []:
                sd_code = c["sousDomaineCode"]
                a("INSERT INTO critere (domaine_id, sous_domaine_id, referentiel_version_id, code,"
                  " libelle, description, applicabilite, criticite_id, actif, coefficient_ponderation)")
                a("SELECT d.id, "
                  + ("(SELECT sd.id FROM sous_domaine sd WHERE sd.domaine_id = d.id AND sd.code = "
                     + q(sd_code) + ")" if sd_code else "NULL")
                  + ", d.referentiel_version_id, " + q(c["code"]) + ", " + q(c["libelle"]) + ", "
                  + q(c["description"]) + ", " + q(c["applicabilite"]) + "::type_applicabilite, "
                  + ("(SELECT cr.id FROM criticite cr WHERE cr.code = " + q(c["criticiteCode"])
                     + "::niveau_criticite)" if c["criticiteCode"] else "NULL")
                  + ", " + ("true" if c["actif"] else "false") + ", "
                  + c["coefficientPonderation"])
                a("  FROM domaine d WHERE d.referentiel_version_id = " + version
                  + " AND d.code = " + q(domaine["code"]) + ";")

                for qu in c["questions"] or []:
                    a("INSERT INTO question (critere_id, referentiel_version_id, code, libelle,"
                      " type, ordre, obligatoire, echelle_reponse)")
                    a("SELECT c.id, c.referentiel_version_id, " + q(qu["code"]) + ", "
                      + q(qu["libelle"]) + ", " + q(qu["type"]) + "::type_question, "
                      + str(qu["ordre"]) + ", " + ("true" if qu["obligatoire"] else "false")
                      + ", " + q(qu["echelleReponse"]))
                    a("  FROM critere c WHERE c.referentiel_version_id = " + version
                      + " AND c.code = " + q(c["code"]) + ";")

                # Exigence d'amorçage, comme V50 l'a posée pour l'ancien
                # catalogue : tout critère porte au moins une exigence, et
                # celle-ci est marquée pour qu'on sache qu'elle reste à écrire.
                a("INSERT INTO exigence (critere_id, referentiel_version_id, code, intitule,"
                  " enonce, ordre, origine)")
                a("SELECT c.id, c.referentiel_version_id, c.code || '-E1', left(c.libelle, 300),"
                  " c.libelle, 0, 'CONTENU_INITIAL'")
                a("  FROM critere c WHERE c.referentiel_version_id = " + version
                  + " AND c.code = " + q(c["code"]) + ";")
                a("")

    a(PIED_V55.replace("{version}", VERSION_CATALOGUE).replace("{total_criteres}", str(total)))
    return "\n".join(lignes), total


# =====================================================================
# V56 — contenu métier
# =====================================================================

ENTETE_V56 = """-- =====================================================================
-- Contenu métier du référentiel
-- =====================================================================
-- GÉNÉRÉE — ne pas modifier à la main.
-- Source : referentiel-source/contenu-metier/, via generer-migrations.py
--
-- Les exigences semées avec le catalogue reprenaient le libellé de leur
-- critère : un amorçage, marqué CONTENU_INITIAL pour qu'on sache ce qui
-- restait à écrire. Cette migration écrit ce contenu — une exigence
-- vérifiable par critère, les preuves qui permettraient de la démontrer, et
-- les règles selon lesquelles l'analyse doit conclure.
--
-- Le contenu d'une version publiée étant immuable, la version du catalogue
-- n'est pas touchée : un brouillon en est dérivé, enrichi, puis publié.
--
-- Ce que cette migration n'écrit pas, délibérément : aucune référence
-- réglementaire, aucun seuil chiffré, aucune certification présentée comme
-- obligatoire. Là où le critère renvoie à la loi, l'exigence dit « la
-- législation applicable » ; là où il évoque une certification, l'exigence
-- porte sur le système de management et le certificat reste facultatif.
-- =====================================================================

-- --- 1. Périmètre ------------------------------------------------------

CREATE TEMP TABLE _enrichissement (source uuid PRIMARY KEY, cible uuid) ON COMMIT DROP;

INSERT INTO _enrichissement (source)
SELECT v.id
  FROM referentiel_version v
  JOIN referentiel r ON r.id = v.referentiel_id
 WHERE v.statut = 'PUBLIEE' AND v.numero = '{version_source}'
   AND r.code IN ('SMARTEX_SUSTWAY', 'IFC_SFI', 'PRI');

DO $$
DECLARE
    nb integer;
BEGIN
    SELECT count(*) INTO nb FROM _enrichissement;
    IF nb <> 3 THEN
        RAISE EXCEPTION 'Périmètre inattendu : % version(s) {version_source} publiée(s), 3 attendues', nb;
    END IF;
END $$;

-- --- 2. Brouillon dérivé de la version du catalogue --------------------

WITH brouillons AS (
    INSERT INTO referentiel_version
        (referentiel_id, numero, notes, nombre_domaines, nombre_criteres,
         statut, creee_le, remplace_version_id)
    SELECT v.referentiel_id, '{version_cible}',
           'Contenu métier : exigences rédigées, preuves attendues et règles d''analyse.',
           0, 0, 'BROUILLON', now(), v.id
      FROM referentiel_version v JOIN _enrichissement e ON e.source = v.id
    RETURNING id, remplace_version_id
)
UPDATE _enrichissement e SET cible = b.id FROM brouillons b WHERE b.remplace_version_id = e.source;

-- --- 3. Copie du catalogue vers le brouillon ---------------------------

CREATE TEMP TABLE _map_domaine (ancien uuid PRIMARY KEY, nouveau uuid NOT NULL) ON COMMIT DROP;
CREATE TEMP TABLE _map_sous_domaine (ancien uuid PRIMARY KEY, nouveau uuid NOT NULL) ON COMMIT DROP;
CREATE TEMP TABLE _map_critere (ancien uuid PRIMARY KEY, nouveau uuid NOT NULL) ON COMMIT DROP;

WITH source AS (
    SELECT d.id AS ancien_id, d.referentiel_id, d.code, d.nom, d.description, d.ordre,
           e.cible AS version_cible, gen_random_uuid() AS nouveau_id
      FROM domaine d JOIN _enrichissement e ON e.source = d.referentiel_version_id
), inserees AS (
    INSERT INTO domaine (id, referentiel_id, referentiel_version_id, code, nom, description, ordre)
    SELECT nouveau_id, referentiel_id, version_cible, code, nom, description, ordre FROM source
    RETURNING id
)
INSERT INTO _map_domaine SELECT ancien_id, nouveau_id FROM source;

WITH source AS (
    SELECT sd.id AS ancien_id, sd.code, sd.nom, sd.description, sd.ordre,
           m.nouveau AS domaine_cible, e.cible AS version_cible, gen_random_uuid() AS nouveau_id
      FROM sous_domaine sd
      JOIN _map_domaine m ON m.ancien = sd.domaine_id
      JOIN _enrichissement e ON e.source = sd.referentiel_version_id
), inserees AS (
    INSERT INTO sous_domaine (id, domaine_id, referentiel_version_id, code, nom, description, ordre)
    SELECT nouveau_id, domaine_cible, version_cible, code, nom, description, ordre FROM source
    RETURNING id
)
INSERT INTO _map_sous_domaine SELECT ancien_id, nouveau_id FROM source;

WITH source AS (
    SELECT c.id AS ancien_id, c.code, c.libelle, c.description, c.applicabilite, c.criticite_id,
           c.actif, c.coefficient_ponderation, m.nouveau AS domaine_cible,
           ms.nouveau AS sous_domaine_cible, e.cible AS version_cible,
           gen_random_uuid() AS nouveau_id
      FROM critere c
      JOIN _map_domaine m ON m.ancien = c.domaine_id
      LEFT JOIN _map_sous_domaine ms ON ms.ancien = c.sous_domaine_id
      JOIN _enrichissement e ON e.source = c.referentiel_version_id
), inserees AS (
    INSERT INTO critere (id, domaine_id, sous_domaine_id, referentiel_version_id, code, libelle,
                         description, applicabilite, criticite_id, actif, coefficient_ponderation)
    SELECT nouveau_id, domaine_cible, sous_domaine_cible, version_cible, code, libelle,
           description, applicabilite, criticite_id, actif, coefficient_ponderation FROM source
    RETURNING id
)
INSERT INTO _map_critere SELECT ancien_id, nouveau_id FROM source;

INSERT INTO question (critere_id, referentiel_version_id, code, libelle, type, ordre,
                      obligatoire, echelle_reponse)
SELECT m.nouveau, e.cible, q.code, q.libelle, q.type, q.ordre, q.obligatoire, q.echelle_reponse
  FROM question q
  JOIN _map_critere m ON m.ancien = q.critere_id
  JOIN _enrichissement e ON e.source = q.referentiel_version_id;

-- Les rattachements sectoriels et bailleurs suivent la copie : les omettre
-- ferait perdre silencieusement la portée d'un critère à la version suivante.
INSERT INTO critere_secteur (critere_id, secteur_id, applicable, criticite_id)
SELECT m.nouveau, cs.secteur_id, cs.applicable, cs.criticite_id
  FROM critere_secteur cs JOIN _map_critere m ON m.ancien = cs.critere_id;

INSERT INTO critere_bailleur (critere_id, bailleur_id, applicable)
SELECT m.nouveau, cb.bailleur_id, cb.applicable
  FROM critere_bailleur cb JOIN _map_critere m ON m.ancien = cb.critere_id;

INSERT INTO critere_coefficient_secteur (critere_id, secteur_id, coefficient)
SELECT m.nouveau, ccs.secteur_id, ccs.coefficient
  FROM critere_coefficient_secteur ccs JOIN _map_critere m ON m.ancien = ccs.critere_id;

INSERT INTO critere_criticite_secteur (critere_id, secteur_id, criticite_id)
SELECT m.nouveau, ccr.secteur_id, ccr.criticite_id
  FROM critere_criticite_secteur ccr JOIN _map_critere m ON m.ancien = ccr.critere_id;

-- Les exigences d'amorçage suivent aussi : elles sont réécrites juste après,
-- mais tout critère doit porter une exigence à chaque instant.
INSERT INTO exigence (critere_id, referentiel_version_id, code, intitule, enonce, ordre, origine)
SELECT m.nouveau, e.cible, x.code, x.intitule, x.enonce, x.ordre, x.origine
  FROM exigence x
  JOIN _map_critere m ON m.ancien = x.critere_id
  JOIN _enrichissement e ON e.source = x.referentiel_version_id;

-- --- 4. Contenu métier -------------------------------------------------
"""

PIED_V56 = """
-- --- 5. Publication ----------------------------------------------------

UPDATE referentiel_version v SET statut = 'ARCHIVEE'
  FROM _enrichissement e WHERE e.source = v.id;

UPDATE referentiel_version v
   SET statut = 'PUBLIEE',
       publiee_le = now(),
       nombre_domaines = (SELECT count(*) FROM domaine d WHERE d.referentiel_version_id = v.id),
       nombre_criteres = (SELECT count(*) FROM critere c
                           WHERE c.referentiel_version_id = v.id AND c.actif)
  FROM _enrichissement e WHERE e.cible = v.id;

UPDATE referentiel r SET version = '{version_cible}'
  FROM _enrichissement e JOIN referentiel_version v ON v.id = e.cible
 WHERE v.referentiel_id = r.id;

-- --- 6. Vérification ---------------------------------------------------

DO $verif$
DECLARE
    exig_attendues    CONSTANT integer := {nb_exigences};
    preuves_attendues CONSTANT integer := {nb_preuves};
    regles_attendues  CONSTANT integer := {nb_regles};
    nb_exig    integer;
    nb_preuves integer;
    nb_regles  integer;
    restantes  integer;
    incoherent integer;
BEGIN
    SELECT count(*) INTO nb_exig
      FROM exigence x JOIN _enrichissement e ON e.cible = x.referentiel_version_id;
    SELECT count(*) INTO nb_preuves
      FROM preuve_attendue p JOIN _enrichissement e ON e.cible = p.referentiel_version_id;
    SELECT count(*) INTO nb_regles
      FROM regle_analyse ra JOIN _enrichissement e ON e.cible = ra.referentiel_version_id;

    IF nb_exig <> exig_attendues THEN
        RAISE EXCEPTION 'Enrichissement : % exigence(s), % attendue(s)', nb_exig, exig_attendues;
    END IF;
    IF nb_preuves <> preuves_attendues THEN
        RAISE EXCEPTION 'Enrichissement : % preuve(s) attendue(s), % attendue(s)',
            nb_preuves, preuves_attendues;
    END IF;
    IF nb_regles <> regles_attendues THEN
        RAISE EXCEPTION 'Enrichissement : % règle(s), % attendue(s)', nb_regles, regles_attendues;
    END IF;

    SELECT count(*) INTO restantes
      FROM exigence x JOIN _enrichissement e ON e.cible = x.referentiel_version_id
     WHERE x.origine = 'CONTENU_INITIAL';
    IF restantes > 0 THEN
        RAISE EXCEPTION '% exigence(s) restées à l''état d''amorçage', restantes;
    END IF;

    SELECT count(*) INTO incoherent FROM (
        SELECT 1 FROM exigence x JOIN critere c ON c.id = x.critere_id
         WHERE x.referentiel_version_id <> c.referentiel_version_id
        UNION ALL
        SELECT 1 FROM preuve_attendue p JOIN exigence x ON x.id = p.exigence_id
         WHERE p.referentiel_version_id <> x.referentiel_version_id
        UNION ALL
        SELECT 1 FROM regle_analyse ra JOIN critere c ON c.id = ra.critere_id
         WHERE ra.referentiel_version_id <> c.referentiel_version_id
        UNION ALL
        SELECT 1 FROM regle_analyse ra JOIN exigence x ON x.id = ra.exigence_id
         WHERE ra.referentiel_version_id <> x.referentiel_version_id
        UNION ALL
        SELECT 1 FROM regle_analyse ra JOIN preuve_attendue p ON p.id = ra.preuve_attendue_id
         WHERE ra.referentiel_version_id <> p.referentiel_version_id
    ) x;
    IF incoherent > 0 THEN
        RAISE EXCEPTION '% ligne(s) rattachées à une version différente de leur parent', incoherent;
    END IF;

    RAISE NOTICE 'Contenu métier publié : % exigences, % preuves attendues, % règles',
        nb_exig, nb_preuves, nb_regles;
END;
$verif$;
"""


def generer_v56(catalogue):
    lignes = [ENTETE_V56.replace("{version_source}", VERSION_CATALOGUE)
                        .replace("{version_cible}", VERSION_CONTENU)]
    a = lignes.append
    ne = np = nr = 0

    for ref in REFERENTIELS:
        a("\n-- ======================= " + ref + " =======================\n")
        for _domaine, critere in criteres_du_catalogue(catalogue[ref]):
            code = critere["code"]
            c = CONTENU[ref][code]
            ne += 1

            a("-- " + ref + " / " + code)
            a("UPDATE exigence ex SET intitule = " + q(c["intitule"]) + ",")
            a("       enonce = " + q(c["enonce"]) + ",")
            a("       origine = 'CONTENU_HUMAIN'")
            a("  FROM critere cr")
            a("  JOIN domaine d ON d.id = cr.domaine_id")
            a("  JOIN referentiel r ON r.id = d.referentiel_id")
            a("  JOIN _enrichissement en ON en.cible = cr.referentiel_version_id")
            a(" WHERE ex.critere_id = cr.id AND r.code = " + q(ref)
              + " AND cr.code = " + q(code) + ";")

            for ordre, (typ, lib, desc, obl) in enumerate(c["preuves"]):
                np += 1
                a("INSERT INTO preuve_attendue (exigence_id, referentiel_version_id, type,"
                  " libelle, description, obligatoire, ordre)")
                a("SELECT ex.id, ex.referentiel_version_id, " + q(typ)
                  + "::type_preuve_attendue, " + q(lib) + ", " + q(desc) + ", "
                  + ("true" if obl else "false") + ", " + str(ordre))
                a("  FROM exigence ex")
                a("  JOIN critere cr ON cr.id = ex.critere_id")
                a("  JOIN domaine d ON d.id = cr.domaine_id")
                a("  JOIN referentiel r ON r.id = d.referentiel_id")
                a("  JOIN _enrichissement en ON en.cible = cr.referentiel_version_id")
                a(" WHERE r.code = " + q(ref) + " AND cr.code = " + q(code) + ";")

            for ordre, (suffixe, typ, lib, sev, portee, defn) in enumerate(c["regles"]):
                nr += 1
                definition = json.dumps(defn, ensure_ascii=False)
                a("INSERT INTO regle_analyse (critere_id, exigence_id, preuve_attendue_id,"
                  " referentiel_version_id, code, type, libelle, severite, definition, ordre)")
                a("SELECT cr.id, "
                  + ("ex.id" if portee is not None else "NULL")
                  + ", " + ("p.id" if isinstance(portee, int) else "NULL")
                  + ", cr.referentiel_version_id, " + q(code + "-" + suffixe) + ", "
                  + q(typ) + "::type_regle_analyse, " + q(lib) + ", "
                  + q(sev) + "::niveau_criticite, " + q(definition) + "::jsonb, " + str(ordre))
                a("  FROM critere cr")
                a("  JOIN domaine d ON d.id = cr.domaine_id")
                a("  JOIN referentiel r ON r.id = d.referentiel_id")
                a("  JOIN _enrichissement en ON en.cible = cr.referentiel_version_id")
                if portee is not None:
                    a("  JOIN exigence ex ON ex.critere_id = cr.id")
                if isinstance(portee, int):
                    a("  JOIN preuve_attendue p ON p.exigence_id = ex.id AND p.ordre = "
                      + str(portee))
                a(" WHERE r.code = " + q(ref) + " AND cr.code = " + q(code) + ";")
            a("")

    a(PIED_V56.replace("{version_cible}", VERSION_CONTENU)
              .replace("{nb_exigences}", str(ne))
              .replace("{nb_preuves}", str(np))
              .replace("{nb_regles}", str(nr)))
    return "\n".join(lignes), ne, np, nr


if __name__ == "__main__":
    catalogue = charger_catalogue()

    erreurs = valider(catalogue)
    if erreurs:
        print("CONTENU INVALIDE, rien n'a ete ecrit :")
        for e in erreurs:
            print("  - " + e)
        sys.exit(1)

    sql55, total = generer_v55(catalogue)
    io.open(os.path.join(MIGRATIONS, "V55__catalogue_reel_du_referentiel.sql"),
            "w", encoding="utf-8", newline="\n").write(sql55)

    sql56, ne, np, nr = generer_v56(catalogue)
    io.open(os.path.join(MIGRATIONS, "V56__contenu_metier_du_referentiel.sql"),
            "w", encoding="utf-8", newline="\n").write(sql56)

    print("V55 : %d criteres semes" % total)
    print("V56 : %d exigences, %d preuves attendues, %d regles" % (ne, np, nr))

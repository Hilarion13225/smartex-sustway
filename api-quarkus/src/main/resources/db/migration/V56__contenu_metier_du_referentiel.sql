-- =====================================================================
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
 WHERE v.statut = 'PUBLIEE' AND v.numero = '2.0'
   AND r.code IN ('SMARTEX_SUSTWAY', 'IFC_SFI', 'PRI');

DO $$
DECLARE
    nb integer;
BEGIN
    SELECT count(*) INTO nb FROM _enrichissement;
    IF nb <> 3 THEN
        RAISE EXCEPTION 'Périmètre inattendu : % version(s) 2.0 publiée(s), 3 attendues', nb;
    END IF;
END $$;

-- --- 2. Brouillon dérivé de la version du catalogue --------------------

WITH brouillons AS (
    INSERT INTO referentiel_version
        (referentiel_id, numero, notes, nombre_domaines, nombre_criteres,
         statut, creee_le, remplace_version_id)
    SELECT v.referentiel_id, '2.1',
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


-- ======================= SMARTEX_SUSTWAY =======================

-- SMARTEX_SUSTWAY / D1-01
UPDATE exigence ex SET intitule = 'Code de conduite et d''éthique formalisé',
       enonce = 'L''organisation doit disposer d''un code de conduite et d''éthique écrit, énonçant les valeurs et principes qui régissent ses relations avec ses parties prenantes internes et externes, validé par sa direction et daté.',
       origine = 'CONTENU_HUMAIN'
  FROM critere cr
  JOIN domaine d ON d.id = cr.domaine_id
  JOIN referentiel r ON r.id = d.referentiel_id
  JOIN _enrichissement en ON en.cible = cr.referentiel_version_id
 WHERE ex.critere_id = cr.id AND r.code = 'SMARTEX_SUSTWAY' AND cr.code = 'D1-01';
INSERT INTO preuve_attendue (exigence_id, referentiel_version_id, type, libelle, description, obligatoire, ordre)
SELECT ex.id, ex.referentiel_version_id, 'POLITIQUE'::type_preuve_attendue, 'Code de conduite et d''éthique', 'Document daté et validé, couvrant les parties prenantes internes et externes.', true, 0
  FROM exigence ex
  JOIN critere cr ON cr.id = ex.critere_id
  JOIN domaine d ON d.id = cr.domaine_id
  JOIN referentiel r ON r.id = d.referentiel_id
  JOIN _enrichissement en ON en.cible = cr.referentiel_version_id
 WHERE r.code = 'SMARTEX_SUSTWAY' AND cr.code = 'D1-01';
INSERT INTO regle_analyse (critere_id, exigence_id, preuve_attendue_id, referentiel_version_id, code, type, libelle, severite, definition, ordre)
SELECT cr.id, ex.id, p.id, cr.referentiel_version_id, 'D1-01-R1', 'SIGNATURE'::type_regle_analyse, 'Le code doit être validé par la direction', 'ELEVEE'::niveau_criticite, '{"mention_attendue": "validation ou approbation par la direction"}'::jsonb, 0
  FROM critere cr
  JOIN domaine d ON d.id = cr.domaine_id
  JOIN referentiel r ON r.id = d.referentiel_id
  JOIN _enrichissement en ON en.cible = cr.referentiel_version_id
  JOIN exigence ex ON ex.critere_id = cr.id
  JOIN preuve_attendue p ON p.exigence_id = ex.id AND p.ordre = 0
 WHERE r.code = 'SMARTEX_SUSTWAY' AND cr.code = 'D1-01';
INSERT INTO regle_analyse (critere_id, exigence_id, preuve_attendue_id, referentiel_version_id, code, type, libelle, severite, definition, ordre)
SELECT cr.id, ex.id, p.id, cr.referentiel_version_id, 'D1-01-R2', 'ELEMENT_ATTENDU'::type_regle_analyse, 'Le code doit couvrir les parties prenantes internes et externes', 'MOYENNE'::niveau_criticite, '{"elements": ["valeurs et principes", "parties prenantes internes", "parties prenantes externes"]}'::jsonb, 1
  FROM critere cr
  JOIN domaine d ON d.id = cr.domaine_id
  JOIN referentiel r ON r.id = d.referentiel_id
  JOIN _enrichissement en ON en.cible = cr.referentiel_version_id
  JOIN exigence ex ON ex.critere_id = cr.id
  JOIN preuve_attendue p ON p.exigence_id = ex.id AND p.ordre = 0
 WHERE r.code = 'SMARTEX_SUSTWAY' AND cr.code = 'D1-01';

-- SMARTEX_SUSTWAY / D1-02
UPDATE exigence ex SET intitule = 'Sensibilisation des salariés aux valeurs de l''entreprise',
       enonce = 'L''organisation doit porter ses valeurs et ses règles de conduite à la connaissance de ses salariés par des actions identifiables — accueil des nouveaux entrants, sessions de sensibilisation, diffusion interne — et en conserver la trace.',
       origine = 'CONTENU_HUMAIN'
  FROM critere cr
  JOIN domaine d ON d.id = cr.domaine_id
  JOIN referentiel r ON r.id = d.referentiel_id
  JOIN _enrichissement en ON en.cible = cr.referentiel_version_id
 WHERE ex.critere_id = cr.id AND r.code = 'SMARTEX_SUSTWAY' AND cr.code = 'D1-02';
INSERT INTO preuve_attendue (exigence_id, referentiel_version_id, type, libelle, description, obligatoire, ordre)
SELECT ex.id, ex.referentiel_version_id, 'REGISTRE'::type_preuve_attendue, 'Trace des actions de sensibilisation menées', 'Dates, formats et participants.', true, 0
  FROM exigence ex
  JOIN critere cr ON cr.id = ex.critere_id
  JOIN domaine d ON d.id = cr.domaine_id
  JOIN referentiel r ON r.id = d.referentiel_id
  JOIN _enrichissement en ON en.cible = cr.referentiel_version_id
 WHERE r.code = 'SMARTEX_SUSTWAY' AND cr.code = 'D1-02';
INSERT INTO preuve_attendue (exigence_id, referentiel_version_id, type, libelle, description, obligatoire, ordre)
SELECT ex.id, ex.referentiel_version_id, 'PREUVE_OPERATIONNELLE'::type_preuve_attendue, 'Supports de sensibilisation interne', 'Livret d''accueil, affichage, supports de session.', false, 1
  FROM exigence ex
  JOIN critere cr ON cr.id = ex.critere_id
  JOIN domaine d ON d.id = cr.domaine_id
  JOIN referentiel r ON r.id = d.referentiel_id
  JOIN _enrichissement en ON en.cible = cr.referentiel_version_id
 WHERE r.code = 'SMARTEX_SUSTWAY' AND cr.code = 'D1-02';
INSERT INTO regle_analyse (critere_id, exigence_id, preuve_attendue_id, referentiel_version_id, code, type, libelle, severite, definition, ordre)
SELECT cr.id, ex.id, p.id, cr.referentiel_version_id, 'D1-02-R1', 'DATE_VALIDITE'::type_regle_analyse, 'Des actions doivent avoir été menées récemment', 'MOYENNE'::niveau_criticite, '{"champ": "date de la dernière action de sensibilisation"}'::jsonb, 0
  FROM critere cr
  JOIN domaine d ON d.id = cr.domaine_id
  JOIN referentiel r ON r.id = d.referentiel_id
  JOIN _enrichissement en ON en.cible = cr.referentiel_version_id
  JOIN exigence ex ON ex.critere_id = cr.id
  JOIN preuve_attendue p ON p.exigence_id = ex.id AND p.ordre = 0
 WHERE r.code = 'SMARTEX_SUSTWAY' AND cr.code = 'D1-02';

-- SMARTEX_SUSTWAY / D1-03
UPDATE exigence ex SET intitule = 'Communication des valeurs aux parties prenantes externes',
       enonce = 'L''organisation doit communiquer ses valeurs à ses clients, partenaires, fournisseurs et autres parties intéressées, par des supports identifiables, et pouvoir en produire des exemples.',
       origine = 'CONTENU_HUMAIN'
  FROM critere cr
  JOIN domaine d ON d.id = cr.domaine_id
  JOIN referentiel r ON r.id = d.referentiel_id
  JOIN _enrichissement en ON en.cible = cr.referentiel_version_id
 WHERE ex.critere_id = cr.id AND r.code = 'SMARTEX_SUSTWAY' AND cr.code = 'D1-03';
INSERT INTO preuve_attendue (exigence_id, referentiel_version_id, type, libelle, description, obligatoire, ordre)
SELECT ex.id, ex.referentiel_version_id, 'PREUVE_OPERATIONNELLE'::type_preuve_attendue, 'Supports de communication externe', 'Site internet, plaquettes, présentations commerciales, courriers.', true, 0
  FROM exigence ex
  JOIN critere cr ON cr.id = ex.critere_id
  JOIN domaine d ON d.id = cr.domaine_id
  JOIN referentiel r ON r.id = d.referentiel_id
  JOIN _enrichissement en ON en.cible = cr.referentiel_version_id
 WHERE r.code = 'SMARTEX_SUSTWAY' AND cr.code = 'D1-03';

-- SMARTEX_SUSTWAY / D1-04
UPDATE exigence ex SET intitule = 'Redevabilité sur les impacts des décisions et activités',
       enonce = 'L''organisation doit rendre compte des impacts de ses décisions et de ses activités à son personnel et à ses autres parties prenantes, en couvrant au minimum les impacts environnementaux, économiques et sociaux ainsi que les risques de santé et de sécurité, selon une périodicité qu''elle définit.',
       origine = 'CONTENU_HUMAIN'
  FROM critere cr
  JOIN domaine d ON d.id = cr.domaine_id
  JOIN referentiel r ON r.id = d.referentiel_id
  JOIN _enrichissement en ON en.cible = cr.referentiel_version_id
 WHERE ex.critere_id = cr.id AND r.code = 'SMARTEX_SUSTWAY' AND cr.code = 'D1-04';
INSERT INTO preuve_attendue (exigence_id, referentiel_version_id, type, libelle, description, obligatoire, ordre)
SELECT ex.id, ex.referentiel_version_id, 'RAPPORT'::type_preuve_attendue, 'Support de reddition de comptes', 'Rapport, bilan ou communication couvrant les impacts de la période.', true, 0
  FROM exigence ex
  JOIN critere cr ON cr.id = ex.critere_id
  JOIN domaine d ON d.id = cr.domaine_id
  JOIN referentiel r ON r.id = d.referentiel_id
  JOIN _enrichissement en ON en.cible = cr.referentiel_version_id
 WHERE r.code = 'SMARTEX_SUSTWAY' AND cr.code = 'D1-04';
INSERT INTO preuve_attendue (exigence_id, referentiel_version_id, type, libelle, description, obligatoire, ordre)
SELECT ex.id, ex.referentiel_version_id, 'PROCEDURE'::type_preuve_attendue, 'Modalités de reddition de comptes', 'Périodicité, destinataires et canaux retenus.', false, 1
  FROM exigence ex
  JOIN critere cr ON cr.id = ex.critere_id
  JOIN domaine d ON d.id = cr.domaine_id
  JOIN referentiel r ON r.id = d.referentiel_id
  JOIN _enrichissement en ON en.cible = cr.referentiel_version_id
 WHERE r.code = 'SMARTEX_SUSTWAY' AND cr.code = 'D1-04';
INSERT INTO regle_analyse (critere_id, exigence_id, preuve_attendue_id, referentiel_version_id, code, type, libelle, severite, definition, ordre)
SELECT cr.id, ex.id, p.id, cr.referentiel_version_id, 'D1-04-R1', 'ELEMENT_ATTENDU'::type_regle_analyse, 'Les catégories d''impact attendues doivent être traitées', 'MOYENNE'::niveau_criticite, '{"elements": ["impacts environnementaux", "impacts économiques", "impacts sociaux", "risques de santé et de sécurité"]}'::jsonb, 0
  FROM critere cr
  JOIN domaine d ON d.id = cr.domaine_id
  JOIN referentiel r ON r.id = d.referentiel_id
  JOIN _enrichissement en ON en.cible = cr.referentiel_version_id
  JOIN exigence ex ON ex.critere_id = cr.id
  JOIN preuve_attendue p ON p.exigence_id = ex.id AND p.ordre = 0
 WHERE r.code = 'SMARTEX_SUSTWAY' AND cr.code = 'D1-04';

-- SMARTEX_SUSTWAY / D1-05
UPDATE exigence ex SET intitule = 'Transparence sur les décisions à impact significatif',
       enonce = 'L''organisation doit communiquer des informations sur les décisions et activités ayant un impact significatif sur la société, l''économie ou l''environnement, et rendre ces informations accessibles aux parties prenantes concernées.',
       origine = 'CONTENU_HUMAIN'
  FROM critere cr
  JOIN domaine d ON d.id = cr.domaine_id
  JOIN referentiel r ON r.id = d.referentiel_id
  JOIN _enrichissement en ON en.cible = cr.referentiel_version_id
 WHERE ex.critere_id = cr.id AND r.code = 'SMARTEX_SUSTWAY' AND cr.code = 'D1-05';
INSERT INTO preuve_attendue (exigence_id, referentiel_version_id, type, libelle, description, obligatoire, ordre)
SELECT ex.id, ex.referentiel_version_id, 'PREUVE_OPERATIONNELLE'::type_preuve_attendue, 'Informations publiées sur les décisions significatives', 'Publications, communiqués, pages du site, rapports.', true, 0
  FROM exigence ex
  JOIN critere cr ON cr.id = ex.critere_id
  JOIN domaine d ON d.id = cr.domaine_id
  JOIN referentiel r ON r.id = d.referentiel_id
  JOIN _enrichissement en ON en.cible = cr.referentiel_version_id
 WHERE r.code = 'SMARTEX_SUSTWAY' AND cr.code = 'D1-05';

-- SMARTEX_SUSTWAY / D1-06
UPDATE exigence ex SET intitule = 'Cartographie des parties prenantes et de leurs attentes',
       enonce = 'L''organisation doit disposer d''une cartographie de ses parties prenantes identifiant, pour chacune, ses attentes et exigences, et pouvoir montrer comment ces attentes sont prises en compte dans ses décisions et activités.',
       origine = 'CONTENU_HUMAIN'
  FROM critere cr
  JOIN domaine d ON d.id = cr.domaine_id
  JOIN referentiel r ON r.id = d.referentiel_id
  JOIN _enrichissement en ON en.cible = cr.referentiel_version_id
 WHERE ex.critere_id = cr.id AND r.code = 'SMARTEX_SUSTWAY' AND cr.code = 'D1-06';
INSERT INTO preuve_attendue (exigence_id, referentiel_version_id, type, libelle, description, obligatoire, ordre)
SELECT ex.id, ex.referentiel_version_id, 'RAPPORT'::type_preuve_attendue, 'Cartographie des parties prenantes', 'Parties prenantes identifiées et attentes associées.', true, 0
  FROM exigence ex
  JOIN critere cr ON cr.id = ex.critere_id
  JOIN domaine d ON d.id = cr.domaine_id
  JOIN referentiel r ON r.id = d.referentiel_id
  JOIN _enrichissement en ON en.cible = cr.referentiel_version_id
 WHERE r.code = 'SMARTEX_SUSTWAY' AND cr.code = 'D1-06';
INSERT INTO preuve_attendue (exigence_id, referentiel_version_id, type, libelle, description, obligatoire, ordre)
SELECT ex.id, ex.referentiel_version_id, 'PROCEDURE'::type_preuve_attendue, 'Modalités de prise en compte des attentes', 'Décrit comment les attentes remontent et sont traitées.', false, 1
  FROM exigence ex
  JOIN critere cr ON cr.id = ex.critere_id
  JOIN domaine d ON d.id = cr.domaine_id
  JOIN referentiel r ON r.id = d.referentiel_id
  JOIN _enrichissement en ON en.cible = cr.referentiel_version_id
 WHERE r.code = 'SMARTEX_SUSTWAY' AND cr.code = 'D1-06';
INSERT INTO regle_analyse (critere_id, exigence_id, preuve_attendue_id, referentiel_version_id, code, type, libelle, severite, definition, ordre)
SELECT cr.id, ex.id, p.id, cr.referentiel_version_id, 'D1-06-R1', 'ELEMENT_ATTENDU'::type_regle_analyse, 'La cartographie doit associer des attentes aux parties prenantes', 'MOYENNE'::niveau_criticite, '{"elements": ["parties prenantes identifiées", "attentes et besoins associés"]}'::jsonb, 0
  FROM critere cr
  JOIN domaine d ON d.id = cr.domaine_id
  JOIN referentiel r ON r.id = d.referentiel_id
  JOIN _enrichissement en ON en.cible = cr.referentiel_version_id
  JOIN exigence ex ON ex.critere_id = cr.id
  JOIN preuve_attendue p ON p.exigence_id = ex.id AND p.ordre = 0
 WHERE r.code = 'SMARTEX_SUSTWAY' AND cr.code = 'D1-06';

-- SMARTEX_SUSTWAY / D1-07
UPDATE exigence ex SET intitule = 'Dispositif de respect des droits humains',
       enonce = 'L''organisation doit disposer d''un dispositif interne — engagement écrit, responsabilité identifiée et modalités de signalement — assurant le respect des droits humains dans ses activités.',
       origine = 'CONTENU_HUMAIN'
  FROM critere cr
  JOIN domaine d ON d.id = cr.domaine_id
  JOIN referentiel r ON r.id = d.referentiel_id
  JOIN _enrichissement en ON en.cible = cr.referentiel_version_id
 WHERE ex.critere_id = cr.id AND r.code = 'SMARTEX_SUSTWAY' AND cr.code = 'D1-07';
INSERT INTO preuve_attendue (exigence_id, referentiel_version_id, type, libelle, description, obligatoire, ordre)
SELECT ex.id, ex.referentiel_version_id, 'POLITIQUE'::type_preuve_attendue, 'Engagement écrit en matière de droits humains', 'Document validé énonçant l''engagement de l''organisation.', true, 0
  FROM exigence ex
  JOIN critere cr ON cr.id = ex.critere_id
  JOIN domaine d ON d.id = cr.domaine_id
  JOIN referentiel r ON r.id = d.referentiel_id
  JOIN _enrichissement en ON en.cible = cr.referentiel_version_id
 WHERE r.code = 'SMARTEX_SUSTWAY' AND cr.code = 'D1-07';
INSERT INTO preuve_attendue (exigence_id, referentiel_version_id, type, libelle, description, obligatoire, ordre)
SELECT ex.id, ex.referentiel_version_id, 'PROCEDURE'::type_preuve_attendue, 'Modalités de signalement et de traitement', 'Canal de signalement et responsabilité désignée.', false, 1
  FROM exigence ex
  JOIN critere cr ON cr.id = ex.critere_id
  JOIN domaine d ON d.id = cr.domaine_id
  JOIN referentiel r ON r.id = d.referentiel_id
  JOIN _enrichissement en ON en.cible = cr.referentiel_version_id
 WHERE r.code = 'SMARTEX_SUSTWAY' AND cr.code = 'D1-07';
INSERT INTO regle_analyse (critere_id, exigence_id, preuve_attendue_id, referentiel_version_id, code, type, libelle, severite, definition, ordre)
SELECT cr.id, ex.id, NULL, cr.referentiel_version_id, 'D1-07-R1', 'ELEMENT_ATTENDU'::type_regle_analyse, 'Le dispositif doit désigner une responsabilité et un canal', 'MOYENNE'::niveau_criticite, '{"elements": ["engagement écrit", "responsabilité désignée", "canal de signalement"]}'::jsonb, 0
  FROM critere cr
  JOIN domaine d ON d.id = cr.domaine_id
  JOIN referentiel r ON r.id = d.referentiel_id
  JOIN _enrichissement en ON en.cible = cr.referentiel_version_id
  JOIN exigence ex ON ex.critere_id = cr.id
 WHERE r.code = 'SMARTEX_SUSTWAY' AND cr.code = 'D1-07';

-- SMARTEX_SUSTWAY / D2-08
UPDATE exigence ex SET intitule = 'Diffusion des résultats financiers et non financiers',
       enonce = 'L''organisation doit diffuser ses résultats financiers et non financiers auprès des destinataires concernés, dans des conditions garantissant leur accessibilité, et pouvoir produire les documents diffusés.',
       origine = 'CONTENU_HUMAIN'
  FROM critere cr
  JOIN domaine d ON d.id = cr.domaine_id
  JOIN referentiel r ON r.id = d.referentiel_id
  JOIN _enrichissement en ON en.cible = cr.referentiel_version_id
 WHERE ex.critere_id = cr.id AND r.code = 'SMARTEX_SUSTWAY' AND cr.code = 'D2-08';
INSERT INTO preuve_attendue (exigence_id, referentiel_version_id, type, libelle, description, obligatoire, ordre)
SELECT ex.id, ex.referentiel_version_id, 'RAPPORT'::type_preuve_attendue, 'États financiers ou rapport annuel diffusé', 'Document du dernier exercice, tel que diffusé.', true, 0
  FROM exigence ex
  JOIN critere cr ON cr.id = ex.critere_id
  JOIN domaine d ON d.id = cr.domaine_id
  JOIN referentiel r ON r.id = d.referentiel_id
  JOIN _enrichissement en ON en.cible = cr.referentiel_version_id
 WHERE r.code = 'SMARTEX_SUSTWAY' AND cr.code = 'D2-08';
INSERT INTO preuve_attendue (exigence_id, referentiel_version_id, type, libelle, description, obligatoire, ordre)
SELECT ex.id, ex.referentiel_version_id, 'RAPPORT'::type_preuve_attendue, 'Information non financière diffusée', 'Rapport extra-financier, bilan RSE ou équivalent.', false, 1
  FROM exigence ex
  JOIN critere cr ON cr.id = ex.critere_id
  JOIN domaine d ON d.id = cr.domaine_id
  JOIN referentiel r ON r.id = d.referentiel_id
  JOIN _enrichissement en ON en.cible = cr.referentiel_version_id
 WHERE r.code = 'SMARTEX_SUSTWAY' AND cr.code = 'D2-08';
INSERT INTO regle_analyse (critere_id, exigence_id, preuve_attendue_id, referentiel_version_id, code, type, libelle, severite, definition, ordre)
SELECT cr.id, ex.id, p.id, cr.referentiel_version_id, 'D2-08-R1', 'DATE_VALIDITE'::type_regle_analyse, 'Les documents doivent porter sur le dernier exercice clos', 'MOYENNE'::niveau_criticite, '{"champ": "exercice couvert", "anciennete_maximale_mois": 24}'::jsonb, 0
  FROM critere cr
  JOIN domaine d ON d.id = cr.domaine_id
  JOIN referentiel r ON r.id = d.referentiel_id
  JOIN _enrichissement en ON en.cible = cr.referentiel_version_id
  JOIN exigence ex ON ex.critere_id = cr.id
  JOIN preuve_attendue p ON p.exigence_id = ex.id AND p.ordre = 0
 WHERE r.code = 'SMARTEX_SUSTWAY' AND cr.code = 'D2-08';

-- SMARTEX_SUSTWAY / D2-09
UPDATE exigence ex SET intitule = 'Respect des droits de propriété des associés',
       enonce = 'L''organisation doit respecter les droits attachés à la qualité d''associé ou d''actionnaire tels qu''ils résultent de ses statuts et de la législation applicable, notamment l''accès à l''information et la participation aux décisions relevant de leur compétence.',
       origine = 'CONTENU_HUMAIN'
  FROM critere cr
  JOIN domaine d ON d.id = cr.domaine_id
  JOIN referentiel r ON r.id = d.referentiel_id
  JOIN _enrichissement en ON en.cible = cr.referentiel_version_id
 WHERE ex.critere_id = cr.id AND r.code = 'SMARTEX_SUSTWAY' AND cr.code = 'D2-09';
INSERT INTO preuve_attendue (exigence_id, referentiel_version_id, type, libelle, description, obligatoire, ordre)
SELECT ex.id, ex.referentiel_version_id, 'DOCUMENT_LEGAL'::type_preuve_attendue, 'Statuts de l''organisation', 'Document en vigueur définissant les droits des associés.', true, 0
  FROM exigence ex
  JOIN critere cr ON cr.id = ex.critere_id
  JOIN domaine d ON d.id = cr.domaine_id
  JOIN referentiel r ON r.id = d.referentiel_id
  JOIN _enrichissement en ON en.cible = cr.referentiel_version_id
 WHERE r.code = 'SMARTEX_SUSTWAY' AND cr.code = 'D2-09';
INSERT INTO preuve_attendue (exigence_id, referentiel_version_id, type, libelle, description, obligatoire, ordre)
SELECT ex.id, ex.referentiel_version_id, 'REGISTRE'::type_preuve_attendue, 'Procès-verbaux des assemblées', 'Attestent de la convocation et de la tenue des assemblées.', false, 1
  FROM exigence ex
  JOIN critere cr ON cr.id = ex.critere_id
  JOIN domaine d ON d.id = cr.domaine_id
  JOIN referentiel r ON r.id = d.referentiel_id
  JOIN _enrichissement en ON en.cible = cr.referentiel_version_id
 WHERE r.code = 'SMARTEX_SUSTWAY' AND cr.code = 'D2-09';

-- SMARTEX_SUSTWAY / D2-10
UPDATE exigence ex SET intitule = 'Actionnariat salarié',
       enonce = 'L''organisation doit pouvoir décrire la place des salariés dans la structure de son capital et, le cas échéant, les dispositifs par lesquels elle favorise l''actionnariat salarié. En l''absence d''un tel dispositif, elle doit pouvoir l''indiquer explicitement.',
       origine = 'CONTENU_HUMAIN'
  FROM critere cr
  JOIN domaine d ON d.id = cr.domaine_id
  JOIN referentiel r ON r.id = d.referentiel_id
  JOIN _enrichissement en ON en.cible = cr.referentiel_version_id
 WHERE ex.critere_id = cr.id AND r.code = 'SMARTEX_SUSTWAY' AND cr.code = 'D2-10';
INSERT INTO preuve_attendue (exigence_id, referentiel_version_id, type, libelle, description, obligatoire, ordre)
SELECT ex.id, ex.referentiel_version_id, 'DOCUMENT_LEGAL'::type_preuve_attendue, 'Éléments sur la structure du capital', 'Répartition du capital faisant apparaître la part détenue par les salariés.', true, 0
  FROM exigence ex
  JOIN critere cr ON cr.id = ex.critere_id
  JOIN domaine d ON d.id = cr.domaine_id
  JOIN referentiel r ON r.id = d.referentiel_id
  JOIN _enrichissement en ON en.cible = cr.referentiel_version_id
 WHERE r.code = 'SMARTEX_SUSTWAY' AND cr.code = 'D2-10';

-- SMARTEX_SUSTWAY / D2-11
UPDATE exigence ex SET intitule = 'Représentation des salariés au conseil d''administration',
       enonce = 'Lorsque l''organisation est dotée d''un conseil d''administration ou d''un organe équivalent, elle doit pouvoir indiquer si les salariés y sont représentés et selon quelles modalités.',
       origine = 'CONTENU_HUMAIN'
  FROM critere cr
  JOIN domaine d ON d.id = cr.domaine_id
  JOIN referentiel r ON r.id = d.referentiel_id
  JOIN _enrichissement en ON en.cible = cr.referentiel_version_id
 WHERE ex.critere_id = cr.id AND r.code = 'SMARTEX_SUSTWAY' AND cr.code = 'D2-11';
INSERT INTO preuve_attendue (exigence_id, referentiel_version_id, type, libelle, description, obligatoire, ordre)
SELECT ex.id, ex.referentiel_version_id, 'DOCUMENT_LEGAL'::type_preuve_attendue, 'Composition du conseil d''administration', 'Document indiquant la qualité de chaque membre.', true, 0
  FROM exigence ex
  JOIN critere cr ON cr.id = ex.critere_id
  JOIN domaine d ON d.id = cr.domaine_id
  JOIN referentiel r ON r.id = d.referentiel_id
  JOIN _enrichissement en ON en.cible = cr.referentiel_version_id
 WHERE r.code = 'SMARTEX_SUSTWAY' AND cr.code = 'D2-11';
INSERT INTO regle_analyse (critere_id, exigence_id, preuve_attendue_id, referentiel_version_id, code, type, libelle, severite, definition, ordre)
SELECT cr.id, ex.id, p.id, cr.referentiel_version_id, 'D2-11-R1', 'ELEMENT_ATTENDU'::type_regle_analyse, 'La composition doit permettre d''identifier les représentants salariés', 'MOYENNE'::niveau_criticite, '{"elements": ["composition de l''organe", "qualité des membres"]}'::jsonb, 0
  FROM critere cr
  JOIN domaine d ON d.id = cr.domaine_id
  JOIN referentiel r ON r.id = d.referentiel_id
  JOIN _enrichissement en ON en.cible = cr.referentiel_version_id
  JOIN exigence ex ON ex.critere_id = cr.id
  JOIN preuve_attendue p ON p.exigence_id = ex.id AND p.ordre = 0
 WHERE r.code = 'SMARTEX_SUSTWAY' AND cr.code = 'D2-11';

-- SMARTEX_SUSTWAY / D2-12
UPDATE exigence ex SET intitule = 'Indépendance des administrateurs',
       enonce = 'Lorsque l''organisation est dotée d''un conseil d''administration ou d''un organe équivalent, elle doit pouvoir indiquer si certains de ses membres sont indépendants et sur quels critères cette indépendance est appréciée.',
       origine = 'CONTENU_HUMAIN'
  FROM critere cr
  JOIN domaine d ON d.id = cr.domaine_id
  JOIN referentiel r ON r.id = d.referentiel_id
  JOIN _enrichissement en ON en.cible = cr.referentiel_version_id
 WHERE ex.critere_id = cr.id AND r.code = 'SMARTEX_SUSTWAY' AND cr.code = 'D2-12';
INSERT INTO preuve_attendue (exigence_id, referentiel_version_id, type, libelle, description, obligatoire, ordre)
SELECT ex.id, ex.referentiel_version_id, 'DOCUMENT_LEGAL'::type_preuve_attendue, 'Composition du conseil et critères d''indépendance', 'Document identifiant les membres indépendants et le critère retenu.', true, 0
  FROM exigence ex
  JOIN critere cr ON cr.id = ex.critere_id
  JOIN domaine d ON d.id = cr.domaine_id
  JOIN referentiel r ON r.id = d.referentiel_id
  JOIN _enrichissement en ON en.cible = cr.referentiel_version_id
 WHERE r.code = 'SMARTEX_SUSTWAY' AND cr.code = 'D2-12';

-- SMARTEX_SUSTWAY / D2-13
UPDATE exigence ex SET intitule = 'Comités spécialisés de contrôle',
       enonce = 'L''organisation doit pouvoir indiquer si des comités spécialisés de contrôle — audit, risques, rémunérations ou équivalents — existent auprès de son organe de gouvernance, et en préciser la composition et le mandat.',
       origine = 'CONTENU_HUMAIN'
  FROM critere cr
  JOIN domaine d ON d.id = cr.domaine_id
  JOIN referentiel r ON r.id = d.referentiel_id
  JOIN _enrichissement en ON en.cible = cr.referentiel_version_id
 WHERE ex.critere_id = cr.id AND r.code = 'SMARTEX_SUSTWAY' AND cr.code = 'D2-13';
INSERT INTO preuve_attendue (exigence_id, referentiel_version_id, type, libelle, description, obligatoire, ordre)
SELECT ex.id, ex.referentiel_version_id, 'DOCUMENT_LEGAL'::type_preuve_attendue, 'Acte constitutif ou règlement des comités', 'Composition et mandat des comités existants.', true, 0
  FROM exigence ex
  JOIN critere cr ON cr.id = ex.critere_id
  JOIN domaine d ON d.id = cr.domaine_id
  JOIN referentiel r ON r.id = d.referentiel_id
  JOIN _enrichissement en ON en.cible = cr.referentiel_version_id
 WHERE r.code = 'SMARTEX_SUSTWAY' AND cr.code = 'D2-13';

-- SMARTEX_SUSTWAY / D2-14
UPDATE exigence ex SET intitule = 'Politique formalisée de lutte contre la corruption',
       enonce = 'L''organisation doit disposer d''une politique écrite de lutte contre la corruption, établie en connaissance de la législation applicable dans les pays où elle opère, énonçant les comportements interdits et les conduites attendues.',
       origine = 'CONTENU_HUMAIN'
  FROM critere cr
  JOIN domaine d ON d.id = cr.domaine_id
  JOIN referentiel r ON r.id = d.referentiel_id
  JOIN _enrichissement en ON en.cible = cr.referentiel_version_id
 WHERE ex.critere_id = cr.id AND r.code = 'SMARTEX_SUSTWAY' AND cr.code = 'D2-14';
INSERT INTO preuve_attendue (exigence_id, referentiel_version_id, type, libelle, description, obligatoire, ordre)
SELECT ex.id, ex.referentiel_version_id, 'POLITIQUE'::type_preuve_attendue, 'Politique de lutte contre la corruption', 'Document daté et validé, énonçant interdits et conduites attendues.', true, 0
  FROM exigence ex
  JOIN critere cr ON cr.id = ex.critere_id
  JOIN domaine d ON d.id = cr.domaine_id
  JOIN referentiel r ON r.id = d.referentiel_id
  JOIN _enrichissement en ON en.cible = cr.referentiel_version_id
 WHERE r.code = 'SMARTEX_SUSTWAY' AND cr.code = 'D2-14';
INSERT INTO regle_analyse (critere_id, exigence_id, preuve_attendue_id, referentiel_version_id, code, type, libelle, severite, definition, ordre)
SELECT cr.id, ex.id, p.id, cr.referentiel_version_id, 'D2-14-R1', 'SIGNATURE'::type_regle_analyse, 'La politique doit être validée par la direction', 'ELEVEE'::niveau_criticite, '{"mention_attendue": "validation ou approbation par la direction"}'::jsonb, 0
  FROM critere cr
  JOIN domaine d ON d.id = cr.domaine_id
  JOIN referentiel r ON r.id = d.referentiel_id
  JOIN _enrichissement en ON en.cible = cr.referentiel_version_id
  JOIN exigence ex ON ex.critere_id = cr.id
  JOIN preuve_attendue p ON p.exigence_id = ex.id AND p.ordre = 0
 WHERE r.code = 'SMARTEX_SUSTWAY' AND cr.code = 'D2-14';
INSERT INTO regle_analyse (critere_id, exigence_id, preuve_attendue_id, referentiel_version_id, code, type, libelle, severite, definition, ordre)
SELECT cr.id, ex.id, p.id, cr.referentiel_version_id, 'D2-14-R2', 'ELEMENT_ATTENDU'::type_regle_analyse, 'La politique doit énoncer les comportements interdits', 'ELEVEE'::niveau_criticite, '{"elements": ["comportements interdits", "conduites attendues"]}'::jsonb, 1
  FROM critere cr
  JOIN domaine d ON d.id = cr.domaine_id
  JOIN referentiel r ON r.id = d.referentiel_id
  JOIN _enrichissement en ON en.cible = cr.referentiel_version_id
  JOIN exigence ex ON ex.critere_id = cr.id
  JOIN preuve_attendue p ON p.exigence_id = ex.id AND p.ordre = 0
 WHERE r.code = 'SMARTEX_SUSTWAY' AND cr.code = 'D2-14';

-- SMARTEX_SUSTWAY / D2-15
UPDATE exigence ex SET intitule = 'Responsable de la conformité anti-corruption',
       enonce = 'L''organisation doit désigner une personne ou un comité chargé de veiller au respect des mesures anti-corruption, de la sensibilisation du personnel, de l''évaluation des risques de corruption et de la vigilance sur les projets associés à ses activités. La désignation doit être écrite et le périmètre de la mission précisé.',
       origine = 'CONTENU_HUMAIN'
  FROM critere cr
  JOIN domaine d ON d.id = cr.domaine_id
  JOIN referentiel r ON r.id = d.referentiel_id
  JOIN _enrichissement en ON en.cible = cr.referentiel_version_id
 WHERE ex.critere_id = cr.id AND r.code = 'SMARTEX_SUSTWAY' AND cr.code = 'D2-15';
INSERT INTO preuve_attendue (exigence_id, referentiel_version_id, type, libelle, description, obligatoire, ordre)
SELECT ex.id, ex.referentiel_version_id, 'DOCUMENT_LEGAL'::type_preuve_attendue, 'Acte de désignation du responsable ou du comité', 'Note, décision ou lettre de mission précisant le périmètre.', true, 0
  FROM exigence ex
  JOIN critere cr ON cr.id = ex.critere_id
  JOIN domaine d ON d.id = cr.domaine_id
  JOIN referentiel r ON r.id = d.referentiel_id
  JOIN _enrichissement en ON en.cible = cr.referentiel_version_id
 WHERE r.code = 'SMARTEX_SUSTWAY' AND cr.code = 'D2-15';
INSERT INTO preuve_attendue (exigence_id, referentiel_version_id, type, libelle, description, obligatoire, ordre)
SELECT ex.id, ex.referentiel_version_id, 'REGISTRE'::type_preuve_attendue, 'Trace des actions menées', 'Sensibilisations, évaluations de risques, vigilance sur les projets.', false, 1
  FROM exigence ex
  JOIN critere cr ON cr.id = ex.critere_id
  JOIN domaine d ON d.id = cr.domaine_id
  JOIN referentiel r ON r.id = d.referentiel_id
  JOIN _enrichissement en ON en.cible = cr.referentiel_version_id
 WHERE r.code = 'SMARTEX_SUSTWAY' AND cr.code = 'D2-15';
INSERT INTO regle_analyse (critere_id, exigence_id, preuve_attendue_id, referentiel_version_id, code, type, libelle, severite, definition, ordre)
SELECT cr.id, ex.id, p.id, cr.referentiel_version_id, 'D2-15-R1', 'ELEMENT_ATTENDU'::type_regle_analyse, 'La mission doit couvrir les quatre volets attendus', 'MOYENNE'::niveau_criticite, '{"elements": ["supervision de la conformité", "sensibilisation du personnel", "évaluation des risques de corruption", "vigilance sur les projets"]}'::jsonb, 0
  FROM critere cr
  JOIN domaine d ON d.id = cr.domaine_id
  JOIN referentiel r ON r.id = d.referentiel_id
  JOIN _enrichissement en ON en.cible = cr.referentiel_version_id
  JOIN exigence ex ON ex.critere_id = cr.id
  JOIN preuve_attendue p ON p.exigence_id = ex.id AND p.ordre = 0
 WHERE r.code = 'SMARTEX_SUSTWAY' AND cr.code = 'D2-15';

-- SMARTEX_SUSTWAY / D2-16
UPDATE exigence ex SET intitule = 'Action contre toutes les formes de corruption',
       enonce = 'L''organisation doit prendre des mesures couvrant les différentes formes de corruption — publique et privée, active et passive, extorsion et paiements de facilitation — et pouvoir décrire les dispositifs de prévention et de détection qu''elle a mis en place.',
       origine = 'CONTENU_HUMAIN'
  FROM critere cr
  JOIN domaine d ON d.id = cr.domaine_id
  JOIN referentiel r ON r.id = d.referentiel_id
  JOIN _enrichissement en ON en.cible = cr.referentiel_version_id
 WHERE ex.critere_id = cr.id AND r.code = 'SMARTEX_SUSTWAY' AND cr.code = 'D2-16';
INSERT INTO preuve_attendue (exigence_id, referentiel_version_id, type, libelle, description, obligatoire, ordre)
SELECT ex.id, ex.referentiel_version_id, 'PROCEDURE'::type_preuve_attendue, 'Dispositifs de prévention et de détection', 'Contrôles, canal d''alerte, règles sur les cadeaux et paiements.', true, 0
  FROM exigence ex
  JOIN critere cr ON cr.id = ex.critere_id
  JOIN domaine d ON d.id = cr.domaine_id
  JOIN referentiel r ON r.id = d.referentiel_id
  JOIN _enrichissement en ON en.cible = cr.referentiel_version_id
 WHERE r.code = 'SMARTEX_SUSTWAY' AND cr.code = 'D2-16';
INSERT INTO preuve_attendue (exigence_id, referentiel_version_id, type, libelle, description, obligatoire, ordre)
SELECT ex.id, ex.referentiel_version_id, 'REGISTRE'::type_preuve_attendue, 'Registre des signalements et de leur traitement', 'Trace des alertes reçues et des suites, éventuellement anonymisée.', false, 1
  FROM exigence ex
  JOIN critere cr ON cr.id = ex.critere_id
  JOIN domaine d ON d.id = cr.domaine_id
  JOIN referentiel r ON r.id = d.referentiel_id
  JOIN _enrichissement en ON en.cible = cr.referentiel_version_id
 WHERE r.code = 'SMARTEX_SUSTWAY' AND cr.code = 'D2-16';
INSERT INTO regle_analyse (critere_id, exigence_id, preuve_attendue_id, referentiel_version_id, code, type, libelle, severite, definition, ordre)
SELECT cr.id, ex.id, p.id, cr.referentiel_version_id, 'D2-16-R1', 'ELEMENT_ATTENDU'::type_regle_analyse, 'Les formes de corruption visées doivent être couvertes', 'MOYENNE'::niveau_criticite, '{"elements": ["corruption publique et privée", "corruption active et passive", "extorsion et paiements de facilitation"]}'::jsonb, 0
  FROM critere cr
  JOIN domaine d ON d.id = cr.domaine_id
  JOIN referentiel r ON r.id = d.referentiel_id
  JOIN _enrichissement en ON en.cible = cr.referentiel_version_id
  JOIN exigence ex ON ex.critere_id = cr.id
  JOIN preuve_attendue p ON p.exigence_id = ex.id AND p.ordre = 0
 WHERE r.code = 'SMARTEX_SUSTWAY' AND cr.code = 'D2-16';

-- SMARTEX_SUSTWAY / D2-17
UPDATE exigence ex SET intitule = 'Système de management anti-corruption',
       enonce = 'L''organisation doit déployer un système de management anti-corruption structuré — évaluation des risques, mesures de maîtrise, contrôle et amélioration. Le critère vise un système orienté vers la certification ISO 37001 : la certification effective n''est pas exigée, mais si elle a été obtenue, le certificat en atteste.',
       origine = 'CONTENU_HUMAIN'
  FROM critere cr
  JOIN domaine d ON d.id = cr.domaine_id
  JOIN referentiel r ON r.id = d.referentiel_id
  JOIN _enrichissement en ON en.cible = cr.referentiel_version_id
 WHERE ex.critere_id = cr.id AND r.code = 'SMARTEX_SUSTWAY' AND cr.code = 'D2-17';
INSERT INTO preuve_attendue (exigence_id, referentiel_version_id, type, libelle, description, obligatoire, ordre)
SELECT ex.id, ex.referentiel_version_id, 'PROCEDURE'::type_preuve_attendue, 'Description du système de management anti-corruption', 'Périmètre, évaluation des risques, mesures de maîtrise et contrôle.', true, 0
  FROM exigence ex
  JOIN critere cr ON cr.id = ex.critere_id
  JOIN domaine d ON d.id = cr.domaine_id
  JOIN referentiel r ON r.id = d.referentiel_id
  JOIN _enrichissement en ON en.cible = cr.referentiel_version_id
 WHERE r.code = 'SMARTEX_SUSTWAY' AND cr.code = 'D2-17';
INSERT INTO preuve_attendue (exigence_id, referentiel_version_id, type, libelle, description, obligatoire, ordre)
SELECT ex.id, ex.referentiel_version_id, 'CERTIFICAT'::type_preuve_attendue, 'Certificat ISO 37001', 'Facultatif : atteste d''une certification effectivement obtenue.', false, 1
  FROM exigence ex
  JOIN critere cr ON cr.id = ex.critere_id
  JOIN domaine d ON d.id = cr.domaine_id
  JOIN referentiel r ON r.id = d.referentiel_id
  JOIN _enrichissement en ON en.cible = cr.referentiel_version_id
 WHERE r.code = 'SMARTEX_SUSTWAY' AND cr.code = 'D2-17';
INSERT INTO regle_analyse (critere_id, exigence_id, preuve_attendue_id, referentiel_version_id, code, type, libelle, severite, definition, ordre)
SELECT cr.id, ex.id, p.id, cr.referentiel_version_id, 'D2-17-R1', 'DATE_VALIDITE'::type_regle_analyse, 'Le certificat produit doit être en cours de validité', 'MOYENNE'::niveau_criticite, '{"champ": "date de fin de validité du certificat"}'::jsonb, 0
  FROM critere cr
  JOIN domaine d ON d.id = cr.domaine_id
  JOIN referentiel r ON r.id = d.referentiel_id
  JOIN _enrichissement en ON en.cible = cr.referentiel_version_id
  JOIN exigence ex ON ex.critere_id = cr.id
  JOIN preuve_attendue p ON p.exigence_id = ex.id AND p.ordre = 1
 WHERE r.code = 'SMARTEX_SUSTWAY' AND cr.code = 'D2-17';

-- SMARTEX_SUSTWAY / D2-18
UPDATE exigence ex SET intitule = 'Conformité fiscale et coopération avec les autorités',
       enonce = 'L''organisation doit se conformer aux obligations fiscales qui lui sont applicables et coopérer avec les autorités compétentes. Elle doit pouvoir justifier de la régularité de sa situation fiscale par une attestation ou tout document équivalent délivré par l''administration.',
       origine = 'CONTENU_HUMAIN'
  FROM critere cr
  JOIN domaine d ON d.id = cr.domaine_id
  JOIN referentiel r ON r.id = d.referentiel_id
  JOIN _enrichissement en ON en.cible = cr.referentiel_version_id
 WHERE ex.critere_id = cr.id AND r.code = 'SMARTEX_SUSTWAY' AND cr.code = 'D2-18';
INSERT INTO preuve_attendue (exigence_id, referentiel_version_id, type, libelle, description, obligatoire, ordre)
SELECT ex.id, ex.referentiel_version_id, 'DOCUMENT_LEGAL'::type_preuve_attendue, 'Attestation de régularité fiscale', 'Document délivré par l''administration fiscale compétente.', true, 0
  FROM exigence ex
  JOIN critere cr ON cr.id = ex.critere_id
  JOIN domaine d ON d.id = cr.domaine_id
  JOIN referentiel r ON r.id = d.referentiel_id
  JOIN _enrichissement en ON en.cible = cr.referentiel_version_id
 WHERE r.code = 'SMARTEX_SUSTWAY' AND cr.code = 'D2-18';
INSERT INTO regle_analyse (critere_id, exigence_id, preuve_attendue_id, referentiel_version_id, code, type, libelle, severite, definition, ordre)
SELECT cr.id, ex.id, p.id, cr.referentiel_version_id, 'D2-18-R1', 'DATE_VALIDITE'::type_regle_analyse, 'L''attestation doit être récente', 'ELEVEE'::niveau_criticite, '{"champ": "date de délivrance de l''attestation", "anciennete_maximale_mois": 12}'::jsonb, 0
  FROM critere cr
  JOIN domaine d ON d.id = cr.domaine_id
  JOIN referentiel r ON r.id = d.referentiel_id
  JOIN _enrichissement en ON en.cible = cr.referentiel_version_id
  JOIN exigence ex ON ex.critere_id = cr.id
  JOIN preuve_attendue p ON p.exigence_id = ex.id AND p.ordre = 0
 WHERE r.code = 'SMARTEX_SUSTWAY' AND cr.code = 'D2-18';

-- SMARTEX_SUSTWAY / D2-19
UPDATE exigence ex SET intitule = 'Politiques de protection des droits des salariés',
       enonce = 'L''organisation doit disposer de politiques écrites protégeant les droits de ses salariés, et pouvoir indiquer dans quelle mesure ces exigences sont portées auprès de sa chaîne de valeur.',
       origine = 'CONTENU_HUMAIN'
  FROM critere cr
  JOIN domaine d ON d.id = cr.domaine_id
  JOIN referentiel r ON r.id = d.referentiel_id
  JOIN _enrichissement en ON en.cible = cr.referentiel_version_id
 WHERE ex.critere_id = cr.id AND r.code = 'SMARTEX_SUSTWAY' AND cr.code = 'D2-19';
INSERT INTO preuve_attendue (exigence_id, referentiel_version_id, type, libelle, description, obligatoire, ordre)
SELECT ex.id, ex.referentiel_version_id, 'POLITIQUE'::type_preuve_attendue, 'Politiques de protection des droits des salariés', 'Documents couvrant les droits protégés et leur portée.', true, 0
  FROM exigence ex
  JOIN critere cr ON cr.id = ex.critere_id
  JOIN domaine d ON d.id = cr.domaine_id
  JOIN referentiel r ON r.id = d.referentiel_id
  JOIN _enrichissement en ON en.cible = cr.referentiel_version_id
 WHERE r.code = 'SMARTEX_SUSTWAY' AND cr.code = 'D2-19';
INSERT INTO preuve_attendue (exigence_id, referentiel_version_id, type, libelle, description, obligatoire, ordre)
SELECT ex.id, ex.referentiel_version_id, 'DOCUMENT_LEGAL'::type_preuve_attendue, 'Clauses répercutées auprès des partenaires', 'Clauses contractuelles ou charte fournisseurs.', false, 1
  FROM exigence ex
  JOIN critere cr ON cr.id = ex.critere_id
  JOIN domaine d ON d.id = cr.domaine_id
  JOIN referentiel r ON r.id = d.referentiel_id
  JOIN _enrichissement en ON en.cible = cr.referentiel_version_id
 WHERE r.code = 'SMARTEX_SUSTWAY' AND cr.code = 'D2-19';

-- SMARTEX_SUSTWAY / D2-20
UPDATE exigence ex SET intitule = 'Dialogue avec les acteurs des droits humains',
       enonce = 'L''organisation doit pouvoir décrire les échanges qu''elle entretient avec les autorités, les organisations syndicales, les ONG ou d''autres organismes sur les questions liées aux droits humains, et en conserver la trace.',
       origine = 'CONTENU_HUMAIN'
  FROM critere cr
  JOIN domaine d ON d.id = cr.domaine_id
  JOIN referentiel r ON r.id = d.referentiel_id
  JOIN _enrichissement en ON en.cible = cr.referentiel_version_id
 WHERE ex.critere_id = cr.id AND r.code = 'SMARTEX_SUSTWAY' AND cr.code = 'D2-20';
INSERT INTO preuve_attendue (exigence_id, referentiel_version_id, type, libelle, description, obligatoire, ordre)
SELECT ex.id, ex.referentiel_version_id, 'REGISTRE'::type_preuve_attendue, 'Trace des échanges menés', 'Dates, interlocuteurs et sujets abordés.', false, 0
  FROM exigence ex
  JOIN critere cr ON cr.id = ex.critere_id
  JOIN domaine d ON d.id = cr.domaine_id
  JOIN referentiel r ON r.id = d.referentiel_id
  JOIN _enrichissement en ON en.cible = cr.referentiel_version_id
 WHERE r.code = 'SMARTEX_SUSTWAY' AND cr.code = 'D2-20';

-- SMARTEX_SUSTWAY / D2-21
UPDATE exigence ex SET intitule = 'Prévention de la complicité dans les atteintes aux droits humains',
       enonce = 'L''organisation doit disposer d''un dispositif de vigilance lui permettant de s''assurer qu''elle ne contribue pas, directement ou par ses relations d''affaires, à des atteintes aux droits humains, et de traiter les situations portées à sa connaissance.',
       origine = 'CONTENU_HUMAIN'
  FROM critere cr
  JOIN domaine d ON d.id = cr.domaine_id
  JOIN referentiel r ON r.id = d.referentiel_id
  JOIN _enrichissement en ON en.cible = cr.referentiel_version_id
 WHERE ex.critere_id = cr.id AND r.code = 'SMARTEX_SUSTWAY' AND cr.code = 'D2-21';
INSERT INTO preuve_attendue (exigence_id, referentiel_version_id, type, libelle, description, obligatoire, ordre)
SELECT ex.id, ex.referentiel_version_id, 'PROCEDURE'::type_preuve_attendue, 'Dispositif de vigilance sur les droits humains', 'Critères d''examen des relations d''affaires et traitement des alertes.', true, 0
  FROM exigence ex
  JOIN critere cr ON cr.id = ex.critere_id
  JOIN domaine d ON d.id = cr.domaine_id
  JOIN referentiel r ON r.id = d.referentiel_id
  JOIN _enrichissement en ON en.cible = cr.referentiel_version_id
 WHERE r.code = 'SMARTEX_SUSTWAY' AND cr.code = 'D2-21';
INSERT INTO regle_analyse (critere_id, exigence_id, preuve_attendue_id, referentiel_version_id, code, type, libelle, severite, definition, ordre)
SELECT cr.id, ex.id, p.id, cr.referentiel_version_id, 'D2-21-R1', 'ELEMENT_ATTENDU'::type_regle_analyse, 'Le dispositif doit couvrir les relations d''affaires', 'MOYENNE'::niveau_criticite, '{"elements": ["examen des relations d''affaires", "traitement des alertes"]}'::jsonb, 0
  FROM critere cr
  JOIN domaine d ON d.id = cr.domaine_id
  JOIN referentiel r ON r.id = d.referentiel_id
  JOIN _enrichissement en ON en.cible = cr.referentiel_version_id
  JOIN exigence ex ON ex.critere_id = cr.id
  JOIN preuve_attendue p ON p.exigence_id = ex.id AND p.ordre = 0
 WHERE r.code = 'SMARTEX_SUSTWAY' AND cr.code = 'D2-21';

-- SMARTEX_SUSTWAY / D3-22
UPDATE exigence ex SET intitule = 'Respect de l''âge minimum d''admission à l''emploi',
       enonce = 'L''organisation doit connaître l''âge minimum d''admission à l''emploi fixé par la législation applicable et s''assurer qu''aucune personne n''ayant pas atteint cet âge n''est employée, au moyen d''une vérification documentée à l''embauche.',
       origine = 'CONTENU_HUMAIN'
  FROM critere cr
  JOIN domaine d ON d.id = cr.domaine_id
  JOIN referentiel r ON r.id = d.referentiel_id
  JOIN _enrichissement en ON en.cible = cr.referentiel_version_id
 WHERE ex.critere_id = cr.id AND r.code = 'SMARTEX_SUSTWAY' AND cr.code = 'D3-22';
INSERT INTO preuve_attendue (exigence_id, referentiel_version_id, type, libelle, description, obligatoire, ordre)
SELECT ex.id, ex.referentiel_version_id, 'PROCEDURE'::type_preuve_attendue, 'Procédure de vérification de l''âge à l''embauche', 'Pièces exigées et contrôle effectué.', true, 0
  FROM exigence ex
  JOIN critere cr ON cr.id = ex.critere_id
  JOIN domaine d ON d.id = cr.domaine_id
  JOIN referentiel r ON r.id = d.referentiel_id
  JOIN _enrichissement en ON en.cible = cr.referentiel_version_id
 WHERE r.code = 'SMARTEX_SUSTWAY' AND cr.code = 'D3-22';
INSERT INTO preuve_attendue (exigence_id, referentiel_version_id, type, libelle, description, obligatoire, ordre)
SELECT ex.id, ex.referentiel_version_id, 'POLITIQUE'::type_preuve_attendue, 'Engagement écrit relatif au travail des enfants', 'Politique ou clause interdisant l''emploi en dessous de l''âge légal.', false, 1
  FROM exigence ex
  JOIN critere cr ON cr.id = ex.critere_id
  JOIN domaine d ON d.id = cr.domaine_id
  JOIN referentiel r ON r.id = d.referentiel_id
  JOIN _enrichissement en ON en.cible = cr.referentiel_version_id
 WHERE r.code = 'SMARTEX_SUSTWAY' AND cr.code = 'D3-22';
INSERT INTO regle_analyse (critere_id, exigence_id, preuve_attendue_id, referentiel_version_id, code, type, libelle, severite, definition, ordre)
SELECT cr.id, ex.id, p.id, cr.referentiel_version_id, 'D3-22-R1', 'PRESENCE'::type_regle_analyse, 'Un contrôle de l''âge à l''embauche doit être décrit', 'ELEVEE'::niveau_criticite, '{"elements": ["vérification de l''âge", "pièces justificatives exigées"]}'::jsonb, 0
  FROM critere cr
  JOIN domaine d ON d.id = cr.domaine_id
  JOIN referentiel r ON r.id = d.referentiel_id
  JOIN _enrichissement en ON en.cible = cr.referentiel_version_id
  JOIN exigence ex ON ex.critere_id = cr.id
  JOIN preuve_attendue p ON p.exigence_id = ex.id AND p.ordre = 0
 WHERE r.code = 'SMARTEX_SUSTWAY' AND cr.code = 'D3-22';

-- SMARTEX_SUSTWAY / D3-23
UPDATE exigence ex SET intitule = 'Vigilance sur le travail des enfants chez les partenaires',
       enonce = 'L''organisation doit porter auprès de ses fournisseurs et sous-traitants l''exigence de ne pas employer d''enfants en dessous de l''âge légal, par une clause contractuelle, une charte ou une démarche équivalente dont elle conserve la trace.',
       origine = 'CONTENU_HUMAIN'
  FROM critere cr
  JOIN domaine d ON d.id = cr.domaine_id
  JOIN referentiel r ON r.id = d.referentiel_id
  JOIN _enrichissement en ON en.cible = cr.referentiel_version_id
 WHERE ex.critere_id = cr.id AND r.code = 'SMARTEX_SUSTWAY' AND cr.code = 'D3-23';
INSERT INTO preuve_attendue (exigence_id, referentiel_version_id, type, libelle, description, obligatoire, ordre)
SELECT ex.id, ex.referentiel_version_id, 'DOCUMENT_LEGAL'::type_preuve_attendue, 'Clause ou charte transmise aux partenaires', 'Exemple de clause contractuelle ou de charte signée.', true, 0
  FROM exigence ex
  JOIN critere cr ON cr.id = ex.critere_id
  JOIN domaine d ON d.id = cr.domaine_id
  JOIN referentiel r ON r.id = d.referentiel_id
  JOIN _enrichissement en ON en.cible = cr.referentiel_version_id
 WHERE r.code = 'SMARTEX_SUSTWAY' AND cr.code = 'D3-23';
INSERT INTO regle_analyse (critere_id, exigence_id, preuve_attendue_id, referentiel_version_id, code, type, libelle, severite, definition, ordre)
SELECT cr.id, ex.id, p.id, cr.referentiel_version_id, 'D3-23-R1', 'ELEMENT_ATTENDU'::type_regle_analyse, 'L''exigence doit figurer dans le document transmis', 'MOYENNE'::niveau_criticite, '{"elements": ["interdiction du travail des enfants", "engagement du partenaire"]}'::jsonb, 0
  FROM critere cr
  JOIN domaine d ON d.id = cr.domaine_id
  JOIN referentiel r ON r.id = d.referentiel_id
  JOIN _enrichissement en ON en.cible = cr.referentiel_version_id
  JOIN exigence ex ON ex.critere_id = cr.id
  JOIN preuve_attendue p ON p.exigence_id = ex.id AND p.ordre = 0
 WHERE r.code = 'SMARTEX_SUSTWAY' AND cr.code = 'D3-23';

-- SMARTEX_SUSTWAY / D3-24
UPDATE exigence ex SET intitule = 'Respect des règles applicables aux conditions d''emploi',
       enonce = 'L''organisation doit connaître et appliquer les règles issues de la législation en vigueur en matière de durée du travail, de rémunération minimale, de majoration des heures supplémentaires, de repos hebdomadaire, de jours fériés, de congés annuels payés et de congés parentaux, et pouvoir en justifier.',
       origine = 'CONTENU_HUMAIN'
  FROM critere cr
  JOIN domaine d ON d.id = cr.domaine_id
  JOIN referentiel r ON r.id = d.referentiel_id
  JOIN _enrichissement en ON en.cible = cr.referentiel_version_id
 WHERE ex.critere_id = cr.id AND r.code = 'SMARTEX_SUSTWAY' AND cr.code = 'D3-24';
INSERT INTO preuve_attendue (exigence_id, referentiel_version_id, type, libelle, description, obligatoire, ordre)
SELECT ex.id, ex.referentiel_version_id, 'REGISTRE'::type_preuve_attendue, 'Éléments de suivi du temps de travail et des congés', 'Registres, plannings ou extraits du système de gestion des temps.', true, 0
  FROM exigence ex
  JOIN critere cr ON cr.id = ex.critere_id
  JOIN domaine d ON d.id = cr.domaine_id
  JOIN referentiel r ON r.id = d.referentiel_id
  JOIN _enrichissement en ON en.cible = cr.referentiel_version_id
 WHERE r.code = 'SMARTEX_SUSTWAY' AND cr.code = 'D3-24';
INSERT INTO preuve_attendue (exigence_id, referentiel_version_id, type, libelle, description, obligatoire, ordre)
SELECT ex.id, ex.referentiel_version_id, 'DOCUMENT_LEGAL'::type_preuve_attendue, 'Bulletins de paie ou modèle de bulletin', 'Permettent de vérifier rémunération et majorations appliquées.', false, 1
  FROM exigence ex
  JOIN critere cr ON cr.id = ex.critere_id
  JOIN domaine d ON d.id = cr.domaine_id
  JOIN referentiel r ON r.id = d.referentiel_id
  JOIN _enrichissement en ON en.cible = cr.referentiel_version_id
 WHERE r.code = 'SMARTEX_SUSTWAY' AND cr.code = 'D3-24';
INSERT INTO regle_analyse (critere_id, exigence_id, preuve_attendue_id, referentiel_version_id, code, type, libelle, severite, definition, ordre)
SELECT cr.id, ex.id, NULL, cr.referentiel_version_id, 'D3-24-R1', 'ELEMENT_ATTENDU'::type_regle_analyse, 'Les éléments attendus doivent être identifiables', 'ELEVEE'::niveau_criticite, '{"elements": ["durée du travail", "rémunération", "heures supplémentaires", "repos hebdomadaire", "congés annuels payés"]}'::jsonb, 0
  FROM critere cr
  JOIN domaine d ON d.id = cr.domaine_id
  JOIN referentiel r ON r.id = d.referentiel_id
  JOIN _enrichissement en ON en.cible = cr.referentiel_version_id
  JOIN exigence ex ON ex.critere_id = cr.id
 WHERE r.code = 'SMARTEX_SUSTWAY' AND cr.code = 'D3-24';

-- SMARTEX_SUSTWAY / D3-25
UPDATE exigence ex SET intitule = 'Politique formalisée d''égalité des chances',
       enonce = 'L''organisation doit disposer d''une politique écrite d''égalité des chances et de non-discrimination, couvrant au minimum le recrutement, la gestion des carrières, les conditions de rémunération et la promotion de la diversité et de la parité.',
       origine = 'CONTENU_HUMAIN'
  FROM critere cr
  JOIN domaine d ON d.id = cr.domaine_id
  JOIN referentiel r ON r.id = d.referentiel_id
  JOIN _enrichissement en ON en.cible = cr.referentiel_version_id
 WHERE ex.critere_id = cr.id AND r.code = 'SMARTEX_SUSTWAY' AND cr.code = 'D3-25';
INSERT INTO preuve_attendue (exigence_id, referentiel_version_id, type, libelle, description, obligatoire, ordre)
SELECT ex.id, ex.referentiel_version_id, 'POLITIQUE'::type_preuve_attendue, 'Politique d''égalité des chances et de non-discrimination', 'Document daté et validé, couvrant les processus RH concernés.', true, 0
  FROM exigence ex
  JOIN critere cr ON cr.id = ex.critere_id
  JOIN domaine d ON d.id = cr.domaine_id
  JOIN referentiel r ON r.id = d.referentiel_id
  JOIN _enrichissement en ON en.cible = cr.referentiel_version_id
 WHERE r.code = 'SMARTEX_SUSTWAY' AND cr.code = 'D3-25';
INSERT INTO preuve_attendue (exigence_id, referentiel_version_id, type, libelle, description, obligatoire, ordre)
SELECT ex.id, ex.referentiel_version_id, 'INDICATEUR'::type_preuve_attendue, 'Indicateurs de diversité ou de parité', 'Répartition des effectifs, écarts constatés.', false, 1
  FROM exigence ex
  JOIN critere cr ON cr.id = ex.critere_id
  JOIN domaine d ON d.id = cr.domaine_id
  JOIN referentiel r ON r.id = d.referentiel_id
  JOIN _enrichissement en ON en.cible = cr.referentiel_version_id
 WHERE r.code = 'SMARTEX_SUSTWAY' AND cr.code = 'D3-25';
INSERT INTO regle_analyse (critere_id, exigence_id, preuve_attendue_id, referentiel_version_id, code, type, libelle, severite, definition, ordre)
SELECT cr.id, ex.id, p.id, cr.referentiel_version_id, 'D3-25-R1', 'ELEMENT_ATTENDU'::type_regle_analyse, 'La politique doit couvrir les processus RH attendus', 'MOYENNE'::niveau_criticite, '{"elements": ["recrutement", "gestion des carrières", "conditions de rémunération", "diversité et parité"]}'::jsonb, 0
  FROM critere cr
  JOIN domaine d ON d.id = cr.domaine_id
  JOIN referentiel r ON r.id = d.referentiel_id
  JOIN _enrichissement en ON en.cible = cr.referentiel_version_id
  JOIN exigence ex ON ex.critere_id = cr.id
  JOIN preuve_attendue p ON p.exigence_id = ex.id AND p.ordre = 0
 WHERE r.code = 'SMARTEX_SUSTWAY' AND cr.code = 'D3-25';

-- SMARTEX_SUSTWAY / D3-26
UPDATE exigence ex SET intitule = 'Responsable de l''égalité des chances',
       enonce = 'L''organisation doit désigner une personne ou un comité chargé de veiller au respect des mesures d''égalité des chances et d''en superviser l''application, par une désignation écrite précisant le périmètre de la mission.',
       origine = 'CONTENU_HUMAIN'
  FROM critere cr
  JOIN domaine d ON d.id = cr.domaine_id
  JOIN referentiel r ON r.id = d.referentiel_id
  JOIN _enrichissement en ON en.cible = cr.referentiel_version_id
 WHERE ex.critere_id = cr.id AND r.code = 'SMARTEX_SUSTWAY' AND cr.code = 'D3-26';
INSERT INTO preuve_attendue (exigence_id, referentiel_version_id, type, libelle, description, obligatoire, ordre)
SELECT ex.id, ex.referentiel_version_id, 'DOCUMENT_LEGAL'::type_preuve_attendue, 'Acte de désignation', 'Note, décision ou lettre de mission précisant le périmètre.', true, 0
  FROM exigence ex
  JOIN critere cr ON cr.id = ex.critere_id
  JOIN domaine d ON d.id = cr.domaine_id
  JOIN referentiel r ON r.id = d.referentiel_id
  JOIN _enrichissement en ON en.cible = cr.referentiel_version_id
 WHERE r.code = 'SMARTEX_SUSTWAY' AND cr.code = 'D3-26';

-- SMARTEX_SUSTWAY / D3-27
UPDATE exigence ex SET intitule = 'Emploi des personnes en situation de handicap',
       enonce = 'L''organisation doit pouvoir décrire les dispositions qu''elle prend en faveur de l''emploi des personnes en situation de handicap — recrutement, aménagement des postes, partenariats — ou, à défaut, exposer les raisons pour lesquelles aucune disposition n''a été prise.',
       origine = 'CONTENU_HUMAIN'
  FROM critere cr
  JOIN domaine d ON d.id = cr.domaine_id
  JOIN referentiel r ON r.id = d.referentiel_id
  JOIN _enrichissement en ON en.cible = cr.referentiel_version_id
 WHERE ex.critere_id = cr.id AND r.code = 'SMARTEX_SUSTWAY' AND cr.code = 'D3-27';
INSERT INTO preuve_attendue (exigence_id, referentiel_version_id, type, libelle, description, obligatoire, ordre)
SELECT ex.id, ex.referentiel_version_id, 'PREUVE_OPERATIONNELLE'::type_preuve_attendue, 'Éléments attestant des dispositions prises', 'Conventions, aménagements réalisés, actions de recrutement.', false, 0
  FROM exigence ex
  JOIN critere cr ON cr.id = ex.critere_id
  JOIN domaine d ON d.id = cr.domaine_id
  JOIN referentiel r ON r.id = d.referentiel_id
  JOIN _enrichissement en ON en.cible = cr.referentiel_version_id
 WHERE r.code = 'SMARTEX_SUSTWAY' AND cr.code = 'D3-27';

-- SMARTEX_SUSTWAY / D3-28
UPDATE exigence ex SET intitule = 'Élimination du travail forcé',
       enonce = 'L''organisation doit avoir pris des mesures écartant toute forme de travail forcé ou obligatoire dans ses activités : engagement libre, liberté de quitter l''emploi, absence de rétention de documents d''identité ou de caution financière.',
       origine = 'CONTENU_HUMAIN'
  FROM critere cr
  JOIN domaine d ON d.id = cr.domaine_id
  JOIN referentiel r ON r.id = d.referentiel_id
  JOIN _enrichissement en ON en.cible = cr.referentiel_version_id
 WHERE ex.critere_id = cr.id AND r.code = 'SMARTEX_SUSTWAY' AND cr.code = 'D3-28';
INSERT INTO preuve_attendue (exigence_id, referentiel_version_id, type, libelle, description, obligatoire, ordre)
SELECT ex.id, ex.referentiel_version_id, 'POLITIQUE'::type_preuve_attendue, 'Engagement écrit contre le travail forcé', 'Politique ou clause contractuelle.', true, 0
  FROM exigence ex
  JOIN critere cr ON cr.id = ex.critere_id
  JOIN domaine d ON d.id = cr.domaine_id
  JOIN referentiel r ON r.id = d.referentiel_id
  JOIN _enrichissement en ON en.cible = cr.referentiel_version_id
 WHERE r.code = 'SMARTEX_SUSTWAY' AND cr.code = 'D3-28';
INSERT INTO regle_analyse (critere_id, exigence_id, preuve_attendue_id, referentiel_version_id, code, type, libelle, severite, definition, ordre)
SELECT cr.id, ex.id, NULL, cr.referentiel_version_id, 'D3-28-R1', 'ELEMENT_ATTENDU'::type_regle_analyse, 'Les garanties attendues doivent être identifiables', 'ELEVEE'::niveau_criticite, '{"elements": ["consentement libre", "liberté de quitter l''emploi", "absence de rétention de documents d''identité"]}'::jsonb, 0
  FROM critere cr
  JOIN domaine d ON d.id = cr.domaine_id
  JOIN referentiel r ON r.id = d.referentiel_id
  JOIN _enrichissement en ON en.cible = cr.referentiel_version_id
  JOIN exigence ex ON ex.critere_id = cr.id
 WHERE r.code = 'SMARTEX_SUSTWAY' AND cr.code = 'D3-28';

-- SMARTEX_SUSTWAY / D3-29
UPDATE exigence ex SET intitule = 'Audits sur le travail forcé dans la chaîne de valeur',
       enonce = 'L''organisation doit conduire, selon une périodicité qu''elle définit, des vérifications auprès de sa chaîne de valeur portant sur l''absence de travail forcé, et en conserver les rapports.',
       origine = 'CONTENU_HUMAIN'
  FROM critere cr
  JOIN domaine d ON d.id = cr.domaine_id
  JOIN referentiel r ON r.id = d.referentiel_id
  JOIN _enrichissement en ON en.cible = cr.referentiel_version_id
 WHERE ex.critere_id = cr.id AND r.code = 'SMARTEX_SUSTWAY' AND cr.code = 'D3-29';
INSERT INTO preuve_attendue (exigence_id, referentiel_version_id, type, libelle, description, obligatoire, ordre)
SELECT ex.id, ex.referentiel_version_id, 'RAPPORT'::type_preuve_attendue, 'Rapports d''audit fournisseurs sur le travail forcé', 'Périmètre audité, constats et suites données.', true, 0
  FROM exigence ex
  JOIN critere cr ON cr.id = ex.critere_id
  JOIN domaine d ON d.id = cr.domaine_id
  JOIN referentiel r ON r.id = d.referentiel_id
  JOIN _enrichissement en ON en.cible = cr.referentiel_version_id
 WHERE r.code = 'SMARTEX_SUSTWAY' AND cr.code = 'D3-29';
INSERT INTO regle_analyse (critere_id, exigence_id, preuve_attendue_id, referentiel_version_id, code, type, libelle, severite, definition, ordre)
SELECT cr.id, ex.id, p.id, cr.referentiel_version_id, 'D3-29-R1', 'DATE_VALIDITE'::type_regle_analyse, 'Les audits doivent être récents', 'MOYENNE'::niveau_criticite, '{"champ": "date du dernier audit"}'::jsonb, 0
  FROM critere cr
  JOIN domaine d ON d.id = cr.domaine_id
  JOIN referentiel r ON r.id = d.referentiel_id
  JOIN _enrichissement en ON en.cible = cr.referentiel_version_id
  JOIN exigence ex ON ex.critere_id = cr.id
  JOIN preuve_attendue p ON p.exigence_id = ex.id AND p.ordre = 0
 WHERE r.code = 'SMARTEX_SUSTWAY' AND cr.code = 'D3-29';

-- SMARTEX_SUSTWAY / D3-30
UPDATE exigence ex SET intitule = 'Lutte contre la précarité de l''emploi',
       enonce = 'L''organisation doit pouvoir décrire les dispositions qu''elle prend pour limiter la précarité des emplois qu''elle propose — recours aux contrats durables, conditions de renouvellement, perspectives d''évolution — et les appuyer sur des éléments factuels tels que la répartition de ses effectifs par type de contrat.',
       origine = 'CONTENU_HUMAIN'
  FROM critere cr
  JOIN domaine d ON d.id = cr.domaine_id
  JOIN referentiel r ON r.id = d.referentiel_id
  JOIN _enrichissement en ON en.cible = cr.referentiel_version_id
 WHERE ex.critere_id = cr.id AND r.code = 'SMARTEX_SUSTWAY' AND cr.code = 'D3-30';
INSERT INTO preuve_attendue (exigence_id, referentiel_version_id, type, libelle, description, obligatoire, ordre)
SELECT ex.id, ex.referentiel_version_id, 'INDICATEUR'::type_preuve_attendue, 'Répartition des effectifs par type de contrat', 'Données sur au moins une période, permettant d''apprécier la structure d''emploi.', true, 0
  FROM exigence ex
  JOIN critere cr ON cr.id = ex.critere_id
  JOIN domaine d ON d.id = cr.domaine_id
  JOIN referentiel r ON r.id = d.referentiel_id
  JOIN _enrichissement en ON en.cible = cr.referentiel_version_id
 WHERE r.code = 'SMARTEX_SUSTWAY' AND cr.code = 'D3-30';

-- SMARTEX_SUSTWAY / D3-31
UPDATE exigence ex SET intitule = 'Promotion d''emplois décents',
       enonce = 'L''organisation doit pouvoir décrire les dispositions par lesquelles elle favorise des emplois décents — rémunération, protection sociale, conditions d''exercice, dialogue — et les appuyer sur des éléments vérifiables.',
       origine = 'CONTENU_HUMAIN'
  FROM critere cr
  JOIN domaine d ON d.id = cr.domaine_id
  JOIN referentiel r ON r.id = d.referentiel_id
  JOIN _enrichissement en ON en.cible = cr.referentiel_version_id
 WHERE ex.critere_id = cr.id AND r.code = 'SMARTEX_SUSTWAY' AND cr.code = 'D3-31';
INSERT INTO preuve_attendue (exigence_id, referentiel_version_id, type, libelle, description, obligatoire, ordre)
SELECT ex.id, ex.referentiel_version_id, 'PREUVE_OPERATIONNELLE'::type_preuve_attendue, 'Éléments attestant des dispositions prises', 'Accords, notes internes, dispositifs de protection sociale.', false, 0
  FROM exigence ex
  JOIN critere cr ON cr.id = ex.critere_id
  JOIN domaine d ON d.id = cr.domaine_id
  JOIN referentiel r ON r.id = d.referentiel_id
  JOIN _enrichissement en ON en.cible = cr.referentiel_version_id
 WHERE r.code = 'SMARTEX_SUSTWAY' AND cr.code = 'D3-31';

-- SMARTEX_SUSTWAY / D3-32
UPDATE exigence ex SET intitule = 'Politique formalisée de formation',
       enonce = 'L''organisation doit disposer d''une politique de formation écrite et cohérente avec les postes occupés, identifiant les besoins de compétences, les formations prévues et les moyens qui leur sont consacrés.',
       origine = 'CONTENU_HUMAIN'
  FROM critere cr
  JOIN domaine d ON d.id = cr.domaine_id
  JOIN referentiel r ON r.id = d.referentiel_id
  JOIN _enrichissement en ON en.cible = cr.referentiel_version_id
 WHERE ex.critere_id = cr.id AND r.code = 'SMARTEX_SUSTWAY' AND cr.code = 'D3-32';
INSERT INTO preuve_attendue (exigence_id, referentiel_version_id, type, libelle, description, obligatoire, ordre)
SELECT ex.id, ex.referentiel_version_id, 'POLITIQUE'::type_preuve_attendue, 'Politique ou plan de formation', 'Besoins identifiés, formations prévues et moyens associés.', true, 0
  FROM exigence ex
  JOIN critere cr ON cr.id = ex.critere_id
  JOIN domaine d ON d.id = cr.domaine_id
  JOIN referentiel r ON r.id = d.referentiel_id
  JOIN _enrichissement en ON en.cible = cr.referentiel_version_id
 WHERE r.code = 'SMARTEX_SUSTWAY' AND cr.code = 'D3-32';
INSERT INTO preuve_attendue (exigence_id, referentiel_version_id, type, libelle, description, obligatoire, ordre)
SELECT ex.id, ex.referentiel_version_id, 'REGISTRE'::type_preuve_attendue, 'Registre des formations dispensées', 'Dates, thèmes et participants.', false, 1
  FROM exigence ex
  JOIN critere cr ON cr.id = ex.critere_id
  JOIN domaine d ON d.id = cr.domaine_id
  JOIN referentiel r ON r.id = d.referentiel_id
  JOIN _enrichissement en ON en.cible = cr.referentiel_version_id
 WHERE r.code = 'SMARTEX_SUSTWAY' AND cr.code = 'D3-32';
INSERT INTO regle_analyse (critere_id, exigence_id, preuve_attendue_id, referentiel_version_id, code, type, libelle, severite, definition, ordre)
SELECT cr.id, ex.id, NULL, cr.referentiel_version_id, 'D3-32-R1', 'COHERENCE_DECLARATION'::type_regle_analyse, 'Les formations dispensées doivent correspondre au plan annoncé', 'MOYENNE'::niveau_criticite, '{"elements": ["formations prévues au plan", "formations effectivement dispensées"]}'::jsonb, 0
  FROM critere cr
  JOIN domaine d ON d.id = cr.domaine_id
  JOIN referentiel r ON r.id = d.referentiel_id
  JOIN _enrichissement en ON en.cible = cr.referentiel_version_id
  JOIN exigence ex ON ex.critere_id = cr.id
 WHERE r.code = 'SMARTEX_SUSTWAY' AND cr.code = 'D3-32';

-- SMARTEX_SUSTWAY / D3-33
UPDATE exigence ex SET intitule = 'Responsable du déploiement des formations',
       enonce = 'L''organisation doit désigner une personne ou un comité chargé du déploiement de ses programmes de formation, par une désignation écrite précisant le périmètre de la mission.',
       origine = 'CONTENU_HUMAIN'
  FROM critere cr
  JOIN domaine d ON d.id = cr.domaine_id
  JOIN referentiel r ON r.id = d.referentiel_id
  JOIN _enrichissement en ON en.cible = cr.referentiel_version_id
 WHERE ex.critere_id = cr.id AND r.code = 'SMARTEX_SUSTWAY' AND cr.code = 'D3-33';
INSERT INTO preuve_attendue (exigence_id, referentiel_version_id, type, libelle, description, obligatoire, ordre)
SELECT ex.id, ex.referentiel_version_id, 'DOCUMENT_LEGAL'::type_preuve_attendue, 'Acte de désignation', 'Note, décision ou lettre de mission.', true, 0
  FROM exigence ex
  JOIN critere cr ON cr.id = ex.critere_id
  JOIN domaine d ON d.id = cr.domaine_id
  JOIN referentiel r ON r.id = d.referentiel_id
  JOIN _enrichissement en ON en.cible = cr.referentiel_version_id
 WHERE r.code = 'SMARTEX_SUSTWAY' AND cr.code = 'D3-33';

-- SMARTEX_SUSTWAY / D3-34
UPDATE exigence ex SET intitule = 'Santé, sécurité et hygiène sur le lieu de travail',
       enonce = 'L''organisation doit assurer des conditions de santé, de sécurité et d''hygiène adaptées aux risques de ses activités : évaluation des risques professionnels, mesures de prévention associées, équipements de protection et suivi des incidents.',
       origine = 'CONTENU_HUMAIN'
  FROM critere cr
  JOIN domaine d ON d.id = cr.domaine_id
  JOIN referentiel r ON r.id = d.referentiel_id
  JOIN _enrichissement en ON en.cible = cr.referentiel_version_id
 WHERE ex.critere_id = cr.id AND r.code = 'SMARTEX_SUSTWAY' AND cr.code = 'D3-34';
INSERT INTO preuve_attendue (exigence_id, referentiel_version_id, type, libelle, description, obligatoire, ordre)
SELECT ex.id, ex.referentiel_version_id, 'RAPPORT'::type_preuve_attendue, 'Évaluation des risques professionnels', 'Document identifiant les risques par poste et les mesures retenues.', true, 0
  FROM exigence ex
  JOIN critere cr ON cr.id = ex.critere_id
  JOIN domaine d ON d.id = cr.domaine_id
  JOIN referentiel r ON r.id = d.referentiel_id
  JOIN _enrichissement en ON en.cible = cr.referentiel_version_id
 WHERE r.code = 'SMARTEX_SUSTWAY' AND cr.code = 'D3-34';
INSERT INTO preuve_attendue (exigence_id, referentiel_version_id, type, libelle, description, obligatoire, ordre)
SELECT ex.id, ex.referentiel_version_id, 'REGISTRE'::type_preuve_attendue, 'Registre des incidents et accidents', 'Trace des événements survenus et des suites données.', false, 1
  FROM exigence ex
  JOIN critere cr ON cr.id = ex.critere_id
  JOIN domaine d ON d.id = cr.domaine_id
  JOIN referentiel r ON r.id = d.referentiel_id
  JOIN _enrichissement en ON en.cible = cr.referentiel_version_id
 WHERE r.code = 'SMARTEX_SUSTWAY' AND cr.code = 'D3-34';
INSERT INTO preuve_attendue (exigence_id, referentiel_version_id, type, libelle, description, obligatoire, ordre)
SELECT ex.id, ex.referentiel_version_id, 'PREUVE_OPERATIONNELLE'::type_preuve_attendue, 'Éléments attestant des moyens en place', 'Équipements de protection, signalétique, installations sanitaires.', false, 2
  FROM exigence ex
  JOIN critere cr ON cr.id = ex.critere_id
  JOIN domaine d ON d.id = cr.domaine_id
  JOIN referentiel r ON r.id = d.referentiel_id
  JOIN _enrichissement en ON en.cible = cr.referentiel_version_id
 WHERE r.code = 'SMARTEX_SUSTWAY' AND cr.code = 'D3-34';
INSERT INTO regle_analyse (critere_id, exigence_id, preuve_attendue_id, referentiel_version_id, code, type, libelle, severite, definition, ordre)
SELECT cr.id, ex.id, p.id, cr.referentiel_version_id, 'D3-34-R1', 'ELEMENT_ATTENDU'::type_regle_analyse, 'L''évaluation doit associer risques et mesures de prévention', 'ELEVEE'::niveau_criticite, '{"elements": ["risques identifiés par poste", "mesures de prévention"]}'::jsonb, 0
  FROM critere cr
  JOIN domaine d ON d.id = cr.domaine_id
  JOIN referentiel r ON r.id = d.referentiel_id
  JOIN _enrichissement en ON en.cible = cr.referentiel_version_id
  JOIN exigence ex ON ex.critere_id = cr.id
  JOIN preuve_attendue p ON p.exigence_id = ex.id AND p.ordre = 0
 WHERE r.code = 'SMARTEX_SUSTWAY' AND cr.code = 'D3-34';
INSERT INTO regle_analyse (critere_id, exigence_id, preuve_attendue_id, referentiel_version_id, code, type, libelle, severite, definition, ordre)
SELECT cr.id, ex.id, p.id, cr.referentiel_version_id, 'D3-34-R2', 'DATE_VALIDITE'::type_regle_analyse, 'L''évaluation des risques doit être à jour', 'ELEVEE'::niveau_criticite, '{"champ": "date de dernière mise à jour de l''évaluation"}'::jsonb, 1
  FROM critere cr
  JOIN domaine d ON d.id = cr.domaine_id
  JOIN referentiel r ON r.id = d.referentiel_id
  JOIN _enrichissement en ON en.cible = cr.referentiel_version_id
  JOIN exigence ex ON ex.critere_id = cr.id
  JOIN preuve_attendue p ON p.exigence_id = ex.id AND p.ordre = 0
 WHERE r.code = 'SMARTEX_SUSTWAY' AND cr.code = 'D3-34';

-- SMARTEX_SUSTWAY / D3-35
UPDATE exigence ex SET intitule = 'Amélioration de l''environnement de travail',
       enonce = 'L''organisation doit pouvoir décrire les actions engagées pour améliorer l''environnement de travail de ses collaborateurs — espaces de repos, restauration, vestiaires, aménagements — et en apporter des éléments factuels.',
       origine = 'CONTENU_HUMAIN'
  FROM critere cr
  JOIN domaine d ON d.id = cr.domaine_id
  JOIN referentiel r ON r.id = d.referentiel_id
  JOIN _enrichissement en ON en.cible = cr.referentiel_version_id
 WHERE ex.critere_id = cr.id AND r.code = 'SMARTEX_SUSTWAY' AND cr.code = 'D3-35';
INSERT INTO preuve_attendue (exigence_id, referentiel_version_id, type, libelle, description, obligatoire, ordre)
SELECT ex.id, ex.referentiel_version_id, 'PREUVE_OPERATIONNELLE'::type_preuve_attendue, 'Éléments attestant des aménagements réalisés', 'Photographies, plans, notes internes, factures de travaux.', false, 0
  FROM exigence ex
  JOIN critere cr ON cr.id = ex.critere_id
  JOIN domaine d ON d.id = cr.domaine_id
  JOIN referentiel r ON r.id = d.referentiel_id
  JOIN _enrichissement en ON en.cible = cr.referentiel_version_id
 WHERE r.code = 'SMARTEX_SUSTWAY' AND cr.code = 'D3-35';

-- SMARTEX_SUSTWAY / D3-36
UPDATE exigence ex SET intitule = 'Système de management de la santé et de la sécurité au travail',
       enonce = 'L''organisation doit formaliser son engagement en matière de santé et de sécurité au travail par un système de management structuré — politique, évaluation des risques, programme d''action et revue. Le critère vise un système orienté vers une certification reconnue en santé et sécurité au travail : la certification effective n''est pas exigée, mais si elle a été obtenue, le certificat en atteste.',
       origine = 'CONTENU_HUMAIN'
  FROM critere cr
  JOIN domaine d ON d.id = cr.domaine_id
  JOIN referentiel r ON r.id = d.referentiel_id
  JOIN _enrichissement en ON en.cible = cr.referentiel_version_id
 WHERE ex.critere_id = cr.id AND r.code = 'SMARTEX_SUSTWAY' AND cr.code = 'D3-36';
INSERT INTO preuve_attendue (exigence_id, referentiel_version_id, type, libelle, description, obligatoire, ordre)
SELECT ex.id, ex.referentiel_version_id, 'PROCEDURE'::type_preuve_attendue, 'Description du système de management santé-sécurité', 'Politique, périmètre, programme d''action et revue.', true, 0
  FROM exigence ex
  JOIN critere cr ON cr.id = ex.critere_id
  JOIN domaine d ON d.id = cr.domaine_id
  JOIN referentiel r ON r.id = d.referentiel_id
  JOIN _enrichissement en ON en.cible = cr.referentiel_version_id
 WHERE r.code = 'SMARTEX_SUSTWAY' AND cr.code = 'D3-36';
INSERT INTO preuve_attendue (exigence_id, referentiel_version_id, type, libelle, description, obligatoire, ordre)
SELECT ex.id, ex.referentiel_version_id, 'CERTIFICAT'::type_preuve_attendue, 'Certificat de management santé-sécurité', 'Facultatif : atteste d''une certification effectivement obtenue.', false, 1
  FROM exigence ex
  JOIN critere cr ON cr.id = ex.critere_id
  JOIN domaine d ON d.id = cr.domaine_id
  JOIN referentiel r ON r.id = d.referentiel_id
  JOIN _enrichissement en ON en.cible = cr.referentiel_version_id
 WHERE r.code = 'SMARTEX_SUSTWAY' AND cr.code = 'D3-36';
INSERT INTO regle_analyse (critere_id, exigence_id, preuve_attendue_id, referentiel_version_id, code, type, libelle, severite, definition, ordre)
SELECT cr.id, ex.id, p.id, cr.referentiel_version_id, 'D3-36-R1', 'DATE_VALIDITE'::type_regle_analyse, 'Le certificat produit doit être en cours de validité', 'MOYENNE'::niveau_criticite, '{"champ": "date de fin de validité du certificat"}'::jsonb, 0
  FROM critere cr
  JOIN domaine d ON d.id = cr.domaine_id
  JOIN referentiel r ON r.id = d.referentiel_id
  JOIN _enrichissement en ON en.cible = cr.referentiel_version_id
  JOIN exigence ex ON ex.critere_id = cr.id
  JOIN preuve_attendue p ON p.exigence_id = ex.id AND p.ordre = 1
 WHERE r.code = 'SMARTEX_SUSTWAY' AND cr.code = 'D3-36';

-- SMARTEX_SUSTWAY / D3-37
UPDATE exigence ex SET intitule = 'Système de management des conditions de travail',
       enonce = 'L''organisation doit formaliser son engagement en faveur de conditions de travail décentes par un système de management structuré couvrant les pratiques sociales. Le critère vise un système orienté vers la certification SA 8000 : la certification effective n''est pas exigée, mais si elle a été obtenue, le certificat en atteste.',
       origine = 'CONTENU_HUMAIN'
  FROM critere cr
  JOIN domaine d ON d.id = cr.domaine_id
  JOIN referentiel r ON r.id = d.referentiel_id
  JOIN _enrichissement en ON en.cible = cr.referentiel_version_id
 WHERE ex.critere_id = cr.id AND r.code = 'SMARTEX_SUSTWAY' AND cr.code = 'D3-37';
INSERT INTO preuve_attendue (exigence_id, referentiel_version_id, type, libelle, description, obligatoire, ordre)
SELECT ex.id, ex.referentiel_version_id, 'PROCEDURE'::type_preuve_attendue, 'Description du système de management des conditions de travail', 'Politique sociale, périmètre et modalités de contrôle.', true, 0
  FROM exigence ex
  JOIN critere cr ON cr.id = ex.critere_id
  JOIN domaine d ON d.id = cr.domaine_id
  JOIN referentiel r ON r.id = d.referentiel_id
  JOIN _enrichissement en ON en.cible = cr.referentiel_version_id
 WHERE r.code = 'SMARTEX_SUSTWAY' AND cr.code = 'D3-37';
INSERT INTO preuve_attendue (exigence_id, referentiel_version_id, type, libelle, description, obligatoire, ordre)
SELECT ex.id, ex.referentiel_version_id, 'CERTIFICAT'::type_preuve_attendue, 'Certificat SA 8000', 'Facultatif : atteste d''une certification effectivement obtenue.', false, 1
  FROM exigence ex
  JOIN critere cr ON cr.id = ex.critere_id
  JOIN domaine d ON d.id = cr.domaine_id
  JOIN referentiel r ON r.id = d.referentiel_id
  JOIN _enrichissement en ON en.cible = cr.referentiel_version_id
 WHERE r.code = 'SMARTEX_SUSTWAY' AND cr.code = 'D3-37';
INSERT INTO regle_analyse (critere_id, exigence_id, preuve_attendue_id, referentiel_version_id, code, type, libelle, severite, definition, ordre)
SELECT cr.id, ex.id, p.id, cr.referentiel_version_id, 'D3-37-R1', 'DATE_VALIDITE'::type_regle_analyse, 'Le certificat produit doit être en cours de validité', 'MOYENNE'::niveau_criticite, '{"champ": "date de fin de validité du certificat"}'::jsonb, 0
  FROM critere cr
  JOIN domaine d ON d.id = cr.domaine_id
  JOIN referentiel r ON r.id = d.referentiel_id
  JOIN _enrichissement en ON en.cible = cr.referentiel_version_id
  JOIN exigence ex ON ex.critere_id = cr.id
  JOIN preuve_attendue p ON p.exigence_id = ex.id AND p.ordre = 1
 WHERE r.code = 'SMARTEX_SUSTWAY' AND cr.code = 'D3-37';

-- SMARTEX_SUSTWAY / D3-38
UPDATE exigence ex SET intitule = 'Renforcement du dialogue social',
       enonce = 'L''organisation doit disposer d''espaces de dialogue avec ses salariés ou leurs représentants, se réunissant selon une périodicité identifiable, et conserver la trace des échanges tenus.',
       origine = 'CONTENU_HUMAIN'
  FROM critere cr
  JOIN domaine d ON d.id = cr.domaine_id
  JOIN referentiel r ON r.id = d.referentiel_id
  JOIN _enrichissement en ON en.cible = cr.referentiel_version_id
 WHERE ex.critere_id = cr.id AND r.code = 'SMARTEX_SUSTWAY' AND cr.code = 'D3-38';
INSERT INTO preuve_attendue (exigence_id, referentiel_version_id, type, libelle, description, obligatoire, ordre)
SELECT ex.id, ex.referentiel_version_id, 'REGISTRE'::type_preuve_attendue, 'Comptes rendus des instances de dialogue', 'Dates, participants et sujets abordés.', true, 0
  FROM exigence ex
  JOIN critere cr ON cr.id = ex.critere_id
  JOIN domaine d ON d.id = cr.domaine_id
  JOIN referentiel r ON r.id = d.referentiel_id
  JOIN _enrichissement en ON en.cible = cr.referentiel_version_id
 WHERE r.code = 'SMARTEX_SUSTWAY' AND cr.code = 'D3-38';
INSERT INTO regle_analyse (critere_id, exigence_id, preuve_attendue_id, referentiel_version_id, code, type, libelle, severite, definition, ordre)
SELECT cr.id, ex.id, p.id, cr.referentiel_version_id, 'D3-38-R1', 'DATE_VALIDITE'::type_regle_analyse, 'Des réunions doivent avoir eu lieu récemment', 'MOYENNE'::niveau_criticite, '{"champ": "date de la dernière réunion"}'::jsonb, 0
  FROM critere cr
  JOIN domaine d ON d.id = cr.domaine_id
  JOIN referentiel r ON r.id = d.referentiel_id
  JOIN _enrichissement en ON en.cible = cr.referentiel_version_id
  JOIN exigence ex ON ex.critere_id = cr.id
  JOIN preuve_attendue p ON p.exigence_id = ex.id AND p.ordre = 0
 WHERE r.code = 'SMARTEX_SUSTWAY' AND cr.code = 'D3-38';

-- SMARTEX_SUSTWAY / D3-39
UPDATE exigence ex SET intitule = 'Respect de la liberté d''association',
       enonce = 'L''organisation doit respecter la liberté de ses salariés de constituer des organisations représentatives et d''y adhérer, et ne prendre aucune mesure défavorable fondée sur l''exercice de cette liberté.',
       origine = 'CONTENU_HUMAIN'
  FROM critere cr
  JOIN domaine d ON d.id = cr.domaine_id
  JOIN referentiel r ON r.id = d.referentiel_id
  JOIN _enrichissement en ON en.cible = cr.referentiel_version_id
 WHERE ex.critere_id = cr.id AND r.code = 'SMARTEX_SUSTWAY' AND cr.code = 'D3-39';
INSERT INTO preuve_attendue (exigence_id, referentiel_version_id, type, libelle, description, obligatoire, ordre)
SELECT ex.id, ex.referentiel_version_id, 'POLITIQUE'::type_preuve_attendue, 'Engagement écrit relatif à la liberté d''association', 'Politique, accord ou clause du règlement intérieur.', true, 0
  FROM exigence ex
  JOIN critere cr ON cr.id = ex.critere_id
  JOIN domaine d ON d.id = cr.domaine_id
  JOIN referentiel r ON r.id = d.referentiel_id
  JOIN _enrichissement en ON en.cible = cr.referentiel_version_id
 WHERE r.code = 'SMARTEX_SUSTWAY' AND cr.code = 'D3-39';

-- SMARTEX_SUSTWAY / D3-40
UPDATE exigence ex SET intitule = 'Droit de négociation collective',
       enonce = 'L''organisation doit reconnaître le droit de négociation collective de ses salariés et en faciliter l''exercice, et pouvoir produire les accords conclus ou la trace des négociations menées.',
       origine = 'CONTENU_HUMAIN'
  FROM critere cr
  JOIN domaine d ON d.id = cr.domaine_id
  JOIN referentiel r ON r.id = d.referentiel_id
  JOIN _enrichissement en ON en.cible = cr.referentiel_version_id
 WHERE ex.critere_id = cr.id AND r.code = 'SMARTEX_SUSTWAY' AND cr.code = 'D3-40';
INSERT INTO preuve_attendue (exigence_id, referentiel_version_id, type, libelle, description, obligatoire, ordre)
SELECT ex.id, ex.referentiel_version_id, 'DOCUMENT_LEGAL'::type_preuve_attendue, 'Accords collectifs ou comptes rendus de négociation', 'Documents attestant de négociations effectivement tenues.', true, 0
  FROM exigence ex
  JOIN critere cr ON cr.id = ex.critere_id
  JOIN domaine d ON d.id = cr.domaine_id
  JOIN referentiel r ON r.id = d.referentiel_id
  JOIN _enrichissement en ON en.cible = cr.referentiel_version_id
 WHERE r.code = 'SMARTEX_SUSTWAY' AND cr.code = 'D3-40';

-- SMARTEX_SUSTWAY / D3-41
UPDATE exigence ex SET intitule = 'Procédure d''examen des réclamations',
       enonce = 'L''organisation doit disposer d''une procédure écrite d''examen des réclamations individuelles et collectives, précisant les modalités de saisine, les délais de traitement et les voies de conciliation volontaire.',
       origine = 'CONTENU_HUMAIN'
  FROM critere cr
  JOIN domaine d ON d.id = cr.domaine_id
  JOIN referentiel r ON r.id = d.referentiel_id
  JOIN _enrichissement en ON en.cible = cr.referentiel_version_id
 WHERE ex.critere_id = cr.id AND r.code = 'SMARTEX_SUSTWAY' AND cr.code = 'D3-41';
INSERT INTO preuve_attendue (exigence_id, referentiel_version_id, type, libelle, description, obligatoire, ordre)
SELECT ex.id, ex.referentiel_version_id, 'PROCEDURE'::type_preuve_attendue, 'Procédure d''examen des réclamations', 'Saisine, délais, responsables et conciliation.', true, 0
  FROM exigence ex
  JOIN critere cr ON cr.id = ex.critere_id
  JOIN domaine d ON d.id = cr.domaine_id
  JOIN referentiel r ON r.id = d.referentiel_id
  JOIN _enrichissement en ON en.cible = cr.referentiel_version_id
 WHERE r.code = 'SMARTEX_SUSTWAY' AND cr.code = 'D3-41';
INSERT INTO preuve_attendue (exigence_id, referentiel_version_id, type, libelle, description, obligatoire, ordre)
SELECT ex.id, ex.referentiel_version_id, 'REGISTRE'::type_preuve_attendue, 'Registre des réclamations et de leur traitement', 'Trace des saisines et des suites données.', false, 1
  FROM exigence ex
  JOIN critere cr ON cr.id = ex.critere_id
  JOIN domaine d ON d.id = cr.domaine_id
  JOIN referentiel r ON r.id = d.referentiel_id
  JOIN _enrichissement en ON en.cible = cr.referentiel_version_id
 WHERE r.code = 'SMARTEX_SUSTWAY' AND cr.code = 'D3-41';
INSERT INTO regle_analyse (critere_id, exigence_id, preuve_attendue_id, referentiel_version_id, code, type, libelle, severite, definition, ordre)
SELECT cr.id, ex.id, p.id, cr.referentiel_version_id, 'D3-41-R1', 'ELEMENT_ATTENDU'::type_regle_analyse, 'La procédure doit préciser saisine, délais et conciliation', 'MOYENNE'::niveau_criticite, '{"elements": ["modalités de saisine", "délai de traitement", "mécanisme de conciliation"]}'::jsonb, 0
  FROM critere cr
  JOIN domaine d ON d.id = cr.domaine_id
  JOIN referentiel r ON r.id = d.referentiel_id
  JOIN _enrichissement en ON en.cible = cr.referentiel_version_id
  JOIN exigence ex ON ex.critere_id = cr.id
  JOIN preuve_attendue p ON p.exigence_id = ex.id AND p.ordre = 0
 WHERE r.code = 'SMARTEX_SUSTWAY' AND cr.code = 'D3-41';

-- SMARTEX_SUSTWAY / D3-42
UPDATE exigence ex SET intitule = 'Moyens d''exercice des représentants du personnel',
       enonce = 'Lorsque des représentants du personnel existent, l''organisation doit leur donner les moyens d''exercer leurs fonctions — accès aux locaux, possibilité de se réunir, diffusion d''informations — et pouvoir décrire ces moyens.',
       origine = 'CONTENU_HUMAIN'
  FROM critere cr
  JOIN domaine d ON d.id = cr.domaine_id
  JOIN referentiel r ON r.id = d.referentiel_id
  JOIN _enrichissement en ON en.cible = cr.referentiel_version_id
 WHERE ex.critere_id = cr.id AND r.code = 'SMARTEX_SUSTWAY' AND cr.code = 'D3-42';
INSERT INTO preuve_attendue (exigence_id, referentiel_version_id, type, libelle, description, obligatoire, ordre)
SELECT ex.id, ex.referentiel_version_id, 'PREUVE_OPERATIONNELLE'::type_preuve_attendue, 'Éléments attestant des moyens accordés', 'Note interne, accord, mise à disposition de local ou de panneau.', true, 0
  FROM exigence ex
  JOIN critere cr ON cr.id = ex.critere_id
  JOIN domaine d ON d.id = cr.domaine_id
  JOIN referentiel r ON r.id = d.referentiel_id
  JOIN _enrichissement en ON en.cible = cr.referentiel_version_id
 WHERE r.code = 'SMARTEX_SUSTWAY' AND cr.code = 'D3-42';

-- SMARTEX_SUSTWAY / D3-43
UPDATE exigence ex SET intitule = 'Retombées positives pour les communautés d''implantation',
       enonce = 'L''organisation doit pouvoir décrire les retombées de ses activités pour les communautés où elle est implantée — emplois, formations, développement culturel ou éducatif, accès aux technologies — et les appuyer sur des éléments factuels.',
       origine = 'CONTENU_HUMAIN'
  FROM critere cr
  JOIN domaine d ON d.id = cr.domaine_id
  JOIN referentiel r ON r.id = d.referentiel_id
  JOIN _enrichissement en ON en.cible = cr.referentiel_version_id
 WHERE ex.critere_id = cr.id AND r.code = 'SMARTEX_SUSTWAY' AND cr.code = 'D3-43';
INSERT INTO preuve_attendue (exigence_id, referentiel_version_id, type, libelle, description, obligatoire, ordre)
SELECT ex.id, ex.referentiel_version_id, 'RAPPORT'::type_preuve_attendue, 'Bilan des retombées locales', 'Actions menées et effets constatés sur la période.', true, 0
  FROM exigence ex
  JOIN critere cr ON cr.id = ex.critere_id
  JOIN domaine d ON d.id = cr.domaine_id
  JOIN referentiel r ON r.id = d.referentiel_id
  JOIN _enrichissement en ON en.cible = cr.referentiel_version_id
 WHERE r.code = 'SMARTEX_SUSTWAY' AND cr.code = 'D3-43';
INSERT INTO preuve_attendue (exigence_id, referentiel_version_id, type, libelle, description, obligatoire, ordre)
SELECT ex.id, ex.referentiel_version_id, 'INDICATEUR'::type_preuve_attendue, 'Données chiffrées des retombées', 'Recrutements locaux, montants engagés, bénéficiaires.', false, 1
  FROM exigence ex
  JOIN critere cr ON cr.id = ex.critere_id
  JOIN domaine d ON d.id = cr.domaine_id
  JOIN referentiel r ON r.id = d.referentiel_id
  JOIN _enrichissement en ON en.cible = cr.referentiel_version_id
 WHERE r.code = 'SMARTEX_SUSTWAY' AND cr.code = 'D3-43';

-- SMARTEX_SUSTWAY / D3-44
UPDATE exigence ex SET intitule = 'Dialogue avec les communautés locales sur les sujets sensibles',
       enonce = 'L''organisation doit disposer d''un canal de dialogue avec les communautés riveraines permettant de traiter les sujets controversés liés à ses activités, et conserver la trace des échanges et des suites données.',
       origine = 'CONTENU_HUMAIN'
  FROM critere cr
  JOIN domaine d ON d.id = cr.domaine_id
  JOIN referentiel r ON r.id = d.referentiel_id
  JOIN _enrichissement en ON en.cible = cr.referentiel_version_id
 WHERE ex.critere_id = cr.id AND r.code = 'SMARTEX_SUSTWAY' AND cr.code = 'D3-44';
INSERT INTO preuve_attendue (exigence_id, referentiel_version_id, type, libelle, description, obligatoire, ordre)
SELECT ex.id, ex.referentiel_version_id, 'REGISTRE'::type_preuve_attendue, 'Trace des échanges avec les riverains', 'Réclamations reçues, réunions tenues et suites données.', true, 0
  FROM exigence ex
  JOIN critere cr ON cr.id = ex.critere_id
  JOIN domaine d ON d.id = cr.domaine_id
  JOIN referentiel r ON r.id = d.referentiel_id
  JOIN _enrichissement en ON en.cible = cr.referentiel_version_id
 WHERE r.code = 'SMARTEX_SUSTWAY' AND cr.code = 'D3-44';
INSERT INTO regle_analyse (critere_id, exigence_id, preuve_attendue_id, referentiel_version_id, code, type, libelle, severite, definition, ordre)
SELECT cr.id, ex.id, p.id, cr.referentiel_version_id, 'D3-44-R1', 'ELEMENT_ATTENDU'::type_regle_analyse, 'La trace doit faire apparaître les suites données', 'MOYENNE'::niveau_criticite, '{"elements": ["sujets soulevés", "suites données"]}'::jsonb, 0
  FROM critere cr
  JOIN domaine d ON d.id = cr.domaine_id
  JOIN referentiel r ON r.id = d.referentiel_id
  JOIN _enrichissement en ON en.cible = cr.referentiel_version_id
  JOIN exigence ex ON ex.critere_id = cr.id
  JOIN preuve_attendue p ON p.exigence_id = ex.id AND p.ordre = 0
 WHERE r.code = 'SMARTEX_SUSTWAY' AND cr.code = 'D3-44';

-- SMARTEX_SUSTWAY / D3-45
UPDATE exigence ex SET intitule = 'Soutien aux projets de la communauté locale',
       enonce = 'L''organisation doit pouvoir décrire les soutiens financiers ou matériels qu''elle apporte à des activités ou projets de la communauté locale, et en produire la trace.',
       origine = 'CONTENU_HUMAIN'
  FROM critere cr
  JOIN domaine d ON d.id = cr.domaine_id
  JOIN referentiel r ON r.id = d.referentiel_id
  JOIN _enrichissement en ON en.cible = cr.referentiel_version_id
 WHERE ex.critere_id = cr.id AND r.code = 'SMARTEX_SUSTWAY' AND cr.code = 'D3-45';
INSERT INTO preuve_attendue (exigence_id, referentiel_version_id, type, libelle, description, obligatoire, ordre)
SELECT ex.id, ex.referentiel_version_id, 'DOCUMENT_LEGAL'::type_preuve_attendue, 'Conventions de don, de mécénat ou de partenariat', 'Documents attestant des soutiens accordés.', false, 0
  FROM exigence ex
  JOIN critere cr ON cr.id = ex.critere_id
  JOIN domaine d ON d.id = cr.domaine_id
  JOIN referentiel r ON r.id = d.referentiel_id
  JOIN _enrichissement en ON en.cible = cr.referentiel_version_id
 WHERE r.code = 'SMARTEX_SUSTWAY' AND cr.code = 'D3-45';

-- SMARTEX_SUSTWAY / D3-46
UPDATE exigence ex SET intitule = 'Acquittement régulier des impôts locaux',
       enonce = 'L''organisation doit s''acquitter des impôts et taxes locaux dont elle est redevable selon les échéances applicables, et pouvoir justifier de la régularité de sa situation.',
       origine = 'CONTENU_HUMAIN'
  FROM critere cr
  JOIN domaine d ON d.id = cr.domaine_id
  JOIN referentiel r ON r.id = d.referentiel_id
  JOIN _enrichissement en ON en.cible = cr.referentiel_version_id
 WHERE ex.critere_id = cr.id AND r.code = 'SMARTEX_SUSTWAY' AND cr.code = 'D3-46';
INSERT INTO preuve_attendue (exigence_id, referentiel_version_id, type, libelle, description, obligatoire, ordre)
SELECT ex.id, ex.referentiel_version_id, 'DOCUMENT_LEGAL'::type_preuve_attendue, 'Justificatifs de paiement des impôts locaux', 'Quittances, avis d''imposition acquittés ou attestation de régularité.', true, 0
  FROM exigence ex
  JOIN critere cr ON cr.id = ex.critere_id
  JOIN domaine d ON d.id = cr.domaine_id
  JOIN referentiel r ON r.id = d.referentiel_id
  JOIN _enrichissement en ON en.cible = cr.referentiel_version_id
 WHERE r.code = 'SMARTEX_SUSTWAY' AND cr.code = 'D3-46';
INSERT INTO regle_analyse (critere_id, exigence_id, preuve_attendue_id, referentiel_version_id, code, type, libelle, severite, definition, ordre)
SELECT cr.id, ex.id, p.id, cr.referentiel_version_id, 'D3-46-R1', 'DATE_VALIDITE'::type_regle_analyse, 'Les justificatifs doivent porter sur la période récente', 'ELEVEE'::niveau_criticite, '{"champ": "période couverte par le justificatif", "anciennete_maximale_mois": 12}'::jsonb, 0
  FROM critere cr
  JOIN domaine d ON d.id = cr.domaine_id
  JOIN referentiel r ON r.id = d.referentiel_id
  JOIN _enrichissement en ON en.cible = cr.referentiel_version_id
  JOIN exigence ex ON ex.critere_id = cr.id
  JOIN preuve_attendue p ON p.exigence_id = ex.id AND p.ordre = 0
 WHERE r.code = 'SMARTEX_SUSTWAY' AND cr.code = 'D3-46';

-- SMARTEX_SUSTWAY / D4-47
UPDATE exigence ex SET intitule = 'Conformité environnementale réglementaire',
       enonce = 'L''organisation doit avoir identifié les dispositions législatives et réglementaires environnementales applicables à ses activités et pouvoir justifier des autorisations, déclarations ou contrôles qu''elles imposent.',
       origine = 'CONTENU_HUMAIN'
  FROM critere cr
  JOIN domaine d ON d.id = cr.domaine_id
  JOIN referentiel r ON r.id = d.referentiel_id
  JOIN _enrichissement en ON en.cible = cr.referentiel_version_id
 WHERE ex.critere_id = cr.id AND r.code = 'SMARTEX_SUSTWAY' AND cr.code = 'D4-47';
INSERT INTO preuve_attendue (exigence_id, referentiel_version_id, type, libelle, description, obligatoire, ordre)
SELECT ex.id, ex.referentiel_version_id, 'REGISTRE'::type_preuve_attendue, 'Recensement des obligations environnementales applicables', 'Liste des textes et obligations identifiés pour les activités exercées.', true, 0
  FROM exigence ex
  JOIN critere cr ON cr.id = ex.critere_id
  JOIN domaine d ON d.id = cr.domaine_id
  JOIN referentiel r ON r.id = d.referentiel_id
  JOIN _enrichissement en ON en.cible = cr.referentiel_version_id
 WHERE r.code = 'SMARTEX_SUSTWAY' AND cr.code = 'D4-47';
INSERT INTO preuve_attendue (exigence_id, referentiel_version_id, type, libelle, description, obligatoire, ordre)
SELECT ex.id, ex.referentiel_version_id, 'DOCUMENT_LEGAL'::type_preuve_attendue, 'Autorisations ou récépissés de déclaration', 'Documents délivrés par les autorités compétentes.', false, 1
  FROM exigence ex
  JOIN critere cr ON cr.id = ex.critere_id
  JOIN domaine d ON d.id = cr.domaine_id
  JOIN referentiel r ON r.id = d.referentiel_id
  JOIN _enrichissement en ON en.cible = cr.referentiel_version_id
 WHERE r.code = 'SMARTEX_SUSTWAY' AND cr.code = 'D4-47';
INSERT INTO regle_analyse (critere_id, exigence_id, preuve_attendue_id, referentiel_version_id, code, type, libelle, severite, definition, ordre)
SELECT cr.id, ex.id, p.id, cr.referentiel_version_id, 'D4-47-R1', 'DATE_VALIDITE'::type_regle_analyse, 'Les autorisations produites doivent être en cours de validité', 'ELEVEE'::niveau_criticite, '{"champ": "date de fin de validité de l''autorisation"}'::jsonb, 0
  FROM critere cr
  JOIN domaine d ON d.id = cr.domaine_id
  JOIN referentiel r ON r.id = d.referentiel_id
  JOIN _enrichissement en ON en.cible = cr.referentiel_version_id
  JOIN exigence ex ON ex.critere_id = cr.id
  JOIN preuve_attendue p ON p.exigence_id = ex.id AND p.ordre = 1
 WHERE r.code = 'SMARTEX_SUSTWAY' AND cr.code = 'D4-47';

-- SMARTEX_SUSTWAY / D4-48
UPDATE exigence ex SET intitule = 'Système interne de management de l''environnement',
       enonce = 'L''organisation doit disposer d''un système interne de management de l''environnement comportant des objectifs définis, des responsables désignés, des moyens affectés et un suivi des réalisations.',
       origine = 'CONTENU_HUMAIN'
  FROM critere cr
  JOIN domaine d ON d.id = cr.domaine_id
  JOIN referentiel r ON r.id = d.referentiel_id
  JOIN _enrichissement en ON en.cible = cr.referentiel_version_id
 WHERE ex.critere_id = cr.id AND r.code = 'SMARTEX_SUSTWAY' AND cr.code = 'D4-48';
INSERT INTO preuve_attendue (exigence_id, referentiel_version_id, type, libelle, description, obligatoire, ordre)
SELECT ex.id, ex.referentiel_version_id, 'PROCEDURE'::type_preuve_attendue, 'Description du système de management environnemental', 'Objectifs, responsables, moyens et modalités de suivi.', true, 0
  FROM exigence ex
  JOIN critere cr ON cr.id = ex.critere_id
  JOIN domaine d ON d.id = cr.domaine_id
  JOIN referentiel r ON r.id = d.referentiel_id
  JOIN _enrichissement en ON en.cible = cr.referentiel_version_id
 WHERE r.code = 'SMARTEX_SUSTWAY' AND cr.code = 'D4-48';
INSERT INTO preuve_attendue (exigence_id, referentiel_version_id, type, libelle, description, obligatoire, ordre)
SELECT ex.id, ex.referentiel_version_id, 'POLITIQUE'::type_preuve_attendue, 'Charte ou politique environnementale', 'Document énonçant les engagements de l''organisation.', false, 1
  FROM exigence ex
  JOIN critere cr ON cr.id = ex.critere_id
  JOIN domaine d ON d.id = cr.domaine_id
  JOIN referentiel r ON r.id = d.referentiel_id
  JOIN _enrichissement en ON en.cible = cr.referentiel_version_id
 WHERE r.code = 'SMARTEX_SUSTWAY' AND cr.code = 'D4-48';
INSERT INTO regle_analyse (critere_id, exigence_id, preuve_attendue_id, referentiel_version_id, code, type, libelle, severite, definition, ordre)
SELECT cr.id, ex.id, p.id, cr.referentiel_version_id, 'D4-48-R1', 'ELEMENT_ATTENDU'::type_regle_analyse, 'Les quatre composantes attendues doivent être présentes', 'MOYENNE'::niveau_criticite, '{"elements": ["objectifs définis", "responsables désignés", "moyens affectés", "suivi des réalisations"]}'::jsonb, 0
  FROM critere cr
  JOIN domaine d ON d.id = cr.domaine_id
  JOIN referentiel r ON r.id = d.referentiel_id
  JOIN _enrichissement en ON en.cible = cr.referentiel_version_id
  JOIN exigence ex ON ex.critere_id = cr.id
  JOIN preuve_attendue p ON p.exigence_id = ex.id AND p.ordre = 0
 WHERE r.code = 'SMARTEX_SUSTWAY' AND cr.code = 'D4-48';

-- SMARTEX_SUSTWAY / D4-49
UPDATE exigence ex SET intitule = 'Sensibilisation du personnel à la responsabilité environnementale',
       enonce = 'L''organisation doit mener auprès de son personnel des actions de sensibilisation ou de formation portant sur les mesures de protection de l''environnement qui le concernent, et en conserver la trace.',
       origine = 'CONTENU_HUMAIN'
  FROM critere cr
  JOIN domaine d ON d.id = cr.domaine_id
  JOIN referentiel r ON r.id = d.referentiel_id
  JOIN _enrichissement en ON en.cible = cr.referentiel_version_id
 WHERE ex.critere_id = cr.id AND r.code = 'SMARTEX_SUSTWAY' AND cr.code = 'D4-49';
INSERT INTO preuve_attendue (exigence_id, referentiel_version_id, type, libelle, description, obligatoire, ordre)
SELECT ex.id, ex.referentiel_version_id, 'REGISTRE'::type_preuve_attendue, 'Trace des actions de sensibilisation environnementale', 'Dates, thèmes et participants.', true, 0
  FROM exigence ex
  JOIN critere cr ON cr.id = ex.critere_id
  JOIN domaine d ON d.id = cr.domaine_id
  JOIN referentiel r ON r.id = d.referentiel_id
  JOIN _enrichissement en ON en.cible = cr.referentiel_version_id
 WHERE r.code = 'SMARTEX_SUSTWAY' AND cr.code = 'D4-49';
INSERT INTO regle_analyse (critere_id, exigence_id, preuve_attendue_id, referentiel_version_id, code, type, libelle, severite, definition, ordre)
SELECT cr.id, ex.id, p.id, cr.referentiel_version_id, 'D4-49-R1', 'DATE_VALIDITE'::type_regle_analyse, 'Des actions doivent avoir été menées récemment', 'MOYENNE'::niveau_criticite, '{"champ": "date de la dernière action"}'::jsonb, 0
  FROM critere cr
  JOIN domaine d ON d.id = cr.domaine_id
  JOIN referentiel r ON r.id = d.referentiel_id
  JOIN _enrichissement en ON en.cible = cr.referentiel_version_id
  JOIN exigence ex ON ex.critere_id = cr.id
  JOIN preuve_attendue p ON p.exigence_id = ex.id AND p.ordre = 0
 WHERE r.code = 'SMARTEX_SUSTWAY' AND cr.code = 'D4-49';

-- SMARTEX_SUSTWAY / D4-50
UPDATE exigence ex SET intitule = 'Système de management environnemental sur tous les sites',
       enonce = 'L''organisation doit déployer un système de management environnemental couvrant l''ensemble de ses sites. Le critère vise un système orienté vers la certification ISO 14001 : la certification effective n''est pas exigée, mais si elle a été obtenue, le certificat en atteste et son périmètre doit être vérifiable.',
       origine = 'CONTENU_HUMAIN'
  FROM critere cr
  JOIN domaine d ON d.id = cr.domaine_id
  JOIN referentiel r ON r.id = d.referentiel_id
  JOIN _enrichissement en ON en.cible = cr.referentiel_version_id
 WHERE ex.critere_id = cr.id AND r.code = 'SMARTEX_SUSTWAY' AND cr.code = 'D4-50';
INSERT INTO preuve_attendue (exigence_id, referentiel_version_id, type, libelle, description, obligatoire, ordre)
SELECT ex.id, ex.referentiel_version_id, 'PROCEDURE'::type_preuve_attendue, 'Description du système et de son périmètre', 'Sites couverts, processus et modalités de revue.', true, 0
  FROM exigence ex
  JOIN critere cr ON cr.id = ex.critere_id
  JOIN domaine d ON d.id = cr.domaine_id
  JOIN referentiel r ON r.id = d.referentiel_id
  JOIN _enrichissement en ON en.cible = cr.referentiel_version_id
 WHERE r.code = 'SMARTEX_SUSTWAY' AND cr.code = 'D4-50';
INSERT INTO preuve_attendue (exigence_id, referentiel_version_id, type, libelle, description, obligatoire, ordre)
SELECT ex.id, ex.referentiel_version_id, 'CERTIFICAT'::type_preuve_attendue, 'Certificat ISO 14001', 'Facultatif : atteste d''une certification effectivement obtenue.', false, 1
  FROM exigence ex
  JOIN critere cr ON cr.id = ex.critere_id
  JOIN domaine d ON d.id = cr.domaine_id
  JOIN referentiel r ON r.id = d.referentiel_id
  JOIN _enrichissement en ON en.cible = cr.referentiel_version_id
 WHERE r.code = 'SMARTEX_SUSTWAY' AND cr.code = 'D4-50';
INSERT INTO regle_analyse (critere_id, exigence_id, preuve_attendue_id, referentiel_version_id, code, type, libelle, severite, definition, ordre)
SELECT cr.id, ex.id, p.id, cr.referentiel_version_id, 'D4-50-R1', 'DATE_VALIDITE'::type_regle_analyse, 'Le certificat produit doit être en cours de validité', 'MOYENNE'::niveau_criticite, '{"champ": "date de fin de validité du certificat"}'::jsonb, 0
  FROM critere cr
  JOIN domaine d ON d.id = cr.domaine_id
  JOIN referentiel r ON r.id = d.referentiel_id
  JOIN _enrichissement en ON en.cible = cr.referentiel_version_id
  JOIN exigence ex ON ex.critere_id = cr.id
  JOIN preuve_attendue p ON p.exigence_id = ex.id AND p.ordre = 1
 WHERE r.code = 'SMARTEX_SUSTWAY' AND cr.code = 'D4-50';
INSERT INTO regle_analyse (critere_id, exigence_id, preuve_attendue_id, referentiel_version_id, code, type, libelle, severite, definition, ordre)
SELECT cr.id, ex.id, p.id, cr.referentiel_version_id, 'D4-50-R2', 'ELEMENT_ATTENDU'::type_regle_analyse, 'Le périmètre couvert doit être identifiable', 'MOYENNE'::niveau_criticite, '{"elements": ["périmètre de certification", "sites couverts"]}'::jsonb, 1
  FROM critere cr
  JOIN domaine d ON d.id = cr.domaine_id
  JOIN referentiel r ON r.id = d.referentiel_id
  JOIN _enrichissement en ON en.cible = cr.referentiel_version_id
  JOIN exigence ex ON ex.critere_id = cr.id
  JOIN preuve_attendue p ON p.exigence_id = ex.id AND p.ordre = 1
 WHERE r.code = 'SMARTEX_SUSTWAY' AND cr.code = 'D4-50';

-- SMARTEX_SUSTWAY / D4-51
UPDATE exigence ex SET intitule = 'Dispositifs d''intervention sur les impacts environnementaux',
       enonce = 'L''organisation doit disposer de moyens d''intervention adaptés aux impacts environnementaux que ses activités peuvent produire — confinement, dépollution, alerte — et pouvoir en décrire la mise en œuvre.',
       origine = 'CONTENU_HUMAIN'
  FROM critere cr
  JOIN domaine d ON d.id = cr.domaine_id
  JOIN referentiel r ON r.id = d.referentiel_id
  JOIN _enrichissement en ON en.cible = cr.referentiel_version_id
 WHERE ex.critere_id = cr.id AND r.code = 'SMARTEX_SUSTWAY' AND cr.code = 'D4-51';
INSERT INTO preuve_attendue (exigence_id, referentiel_version_id, type, libelle, description, obligatoire, ordre)
SELECT ex.id, ex.referentiel_version_id, 'PROCEDURE'::type_preuve_attendue, 'Procédures d''intervention en cas d''incident environnemental', 'Conduite à tenir, moyens disponibles et responsables.', true, 0
  FROM exigence ex
  JOIN critere cr ON cr.id = ex.critere_id
  JOIN domaine d ON d.id = cr.domaine_id
  JOIN referentiel r ON r.id = d.referentiel_id
  JOIN _enrichissement en ON en.cible = cr.referentiel_version_id
 WHERE r.code = 'SMARTEX_SUSTWAY' AND cr.code = 'D4-51';
INSERT INTO preuve_attendue (exigence_id, referentiel_version_id, type, libelle, description, obligatoire, ordre)
SELECT ex.id, ex.referentiel_version_id, 'PREUVE_OPERATIONNELLE'::type_preuve_attendue, 'Éléments attestant des moyens disponibles', 'Kits d''intervention, rétentions, équipements en place.', false, 1
  FROM exigence ex
  JOIN critere cr ON cr.id = ex.critere_id
  JOIN domaine d ON d.id = cr.domaine_id
  JOIN referentiel r ON r.id = d.referentiel_id
  JOIN _enrichissement en ON en.cible = cr.referentiel_version_id
 WHERE r.code = 'SMARTEX_SUSTWAY' AND cr.code = 'D4-51';

-- SMARTEX_SUSTWAY / D4-52
UPDATE exigence ex SET intitule = 'Études d''impact environnemental périodiques',
       enonce = 'L''organisation doit conduire des études d''impact environnemental selon une périodicité ou à l''occasion des évolutions qui le justifient, et en rendre les conclusions accessibles aux parties prenantes concernées.',
       origine = 'CONTENU_HUMAIN'
  FROM critere cr
  JOIN domaine d ON d.id = cr.domaine_id
  JOIN referentiel r ON r.id = d.referentiel_id
  JOIN _enrichissement en ON en.cible = cr.referentiel_version_id
 WHERE ex.critere_id = cr.id AND r.code = 'SMARTEX_SUSTWAY' AND cr.code = 'D4-52';
INSERT INTO preuve_attendue (exigence_id, referentiel_version_id, type, libelle, description, obligatoire, ordre)
SELECT ex.id, ex.referentiel_version_id, 'RAPPORT'::type_preuve_attendue, 'Études d''impact environnemental réalisées', 'Rapports datés, avec périmètre et conclusions.', true, 0
  FROM exigence ex
  JOIN critere cr ON cr.id = ex.critere_id
  JOIN domaine d ON d.id = cr.domaine_id
  JOIN referentiel r ON r.id = d.referentiel_id
  JOIN _enrichissement en ON en.cible = cr.referentiel_version_id
 WHERE r.code = 'SMARTEX_SUSTWAY' AND cr.code = 'D4-52';
INSERT INTO regle_analyse (critere_id, exigence_id, preuve_attendue_id, referentiel_version_id, code, type, libelle, severite, definition, ordre)
SELECT cr.id, ex.id, p.id, cr.referentiel_version_id, 'D4-52-R1', 'DATE_VALIDITE'::type_regle_analyse, 'L''étude la plus récente doit être exploitable', 'MOYENNE'::niveau_criticite, '{"champ": "date de la dernière étude"}'::jsonb, 0
  FROM critere cr
  JOIN domaine d ON d.id = cr.domaine_id
  JOIN referentiel r ON r.id = d.referentiel_id
  JOIN _enrichissement en ON en.cible = cr.referentiel_version_id
  JOIN exigence ex ON ex.critere_id = cr.id
  JOIN preuve_attendue p ON p.exigence_id = ex.id AND p.ordre = 0
 WHERE r.code = 'SMARTEX_SUSTWAY' AND cr.code = 'D4-52';

-- SMARTEX_SUSTWAY / D4-53
UPDATE exigence ex SET intitule = 'Approche de précaution face aux risques environnementaux',
       enonce = 'L''organisation doit pouvoir décrire la manière dont elle tient compte des incertitudes environnementales dans ses décisions — analyse préalable, mesures conservatoires, renoncement à certaines options — et illustrer cette approche par des cas concrets. Ce critère est principalement déclaratif : la preuve documentaire y est plus difficile que le constat d''une démarche.',
       origine = 'CONTENU_HUMAIN'
  FROM critere cr
  JOIN domaine d ON d.id = cr.domaine_id
  JOIN referentiel r ON r.id = d.referentiel_id
  JOIN _enrichissement en ON en.cible = cr.referentiel_version_id
 WHERE ex.critere_id = cr.id AND r.code = 'SMARTEX_SUSTWAY' AND cr.code = 'D4-53';
INSERT INTO preuve_attendue (exigence_id, referentiel_version_id, type, libelle, description, obligatoire, ordre)
SELECT ex.id, ex.referentiel_version_id, 'PREUVE_OPERATIONNELLE'::type_preuve_attendue, 'Éléments illustrant l''approche de précaution', 'Comptes rendus de décision, analyses préalables, arbitrages documentés.', false, 0
  FROM exigence ex
  JOIN critere cr ON cr.id = ex.critere_id
  JOIN domaine d ON d.id = cr.domaine_id
  JOIN referentiel r ON r.id = d.referentiel_id
  JOIN _enrichissement en ON en.cible = cr.referentiel_version_id
 WHERE r.code = 'SMARTEX_SUSTWAY' AND cr.code = 'D4-53';

-- SMARTEX_SUSTWAY / D4-54
UPDATE exigence ex SET intitule = 'Prise en compte de l''impact environnemental des nouveaux produits',
       enonce = 'Lorsque l''organisation développe de nouveaux produits ou services, elle doit examiner leur impact environnemental potentiel — consommation d''énergie, recyclabilité, émissions — et conserver la trace de cet examen.',
       origine = 'CONTENU_HUMAIN'
  FROM critere cr
  JOIN domaine d ON d.id = cr.domaine_id
  JOIN referentiel r ON r.id = d.referentiel_id
  JOIN _enrichissement en ON en.cible = cr.referentiel_version_id
 WHERE ex.critere_id = cr.id AND r.code = 'SMARTEX_SUSTWAY' AND cr.code = 'D4-54';
INSERT INTO preuve_attendue (exigence_id, referentiel_version_id, type, libelle, description, obligatoire, ordre)
SELECT ex.id, ex.referentiel_version_id, 'PROCEDURE'::type_preuve_attendue, 'Modalités de prise en compte de l''environnement en conception', 'Critères examinés et moment de leur prise en compte.', true, 0
  FROM exigence ex
  JOIN critere cr ON cr.id = ex.critere_id
  JOIN domaine d ON d.id = cr.domaine_id
  JOIN referentiel r ON r.id = d.referentiel_id
  JOIN _enrichissement en ON en.cible = cr.referentiel_version_id
 WHERE r.code = 'SMARTEX_SUSTWAY' AND cr.code = 'D4-54';
INSERT INTO preuve_attendue (exigence_id, referentiel_version_id, type, libelle, description, obligatoire, ordre)
SELECT ex.id, ex.referentiel_version_id, 'RAPPORT'::type_preuve_attendue, 'Exemples d''analyses réalisées', 'Analyses environnementales de produits ou services développés.', false, 1
  FROM exigence ex
  JOIN critere cr ON cr.id = ex.critere_id
  JOIN domaine d ON d.id = cr.domaine_id
  JOIN referentiel r ON r.id = d.referentiel_id
  JOIN _enrichissement en ON en.cible = cr.referentiel_version_id
 WHERE r.code = 'SMARTEX_SUSTWAY' AND cr.code = 'D4-54';
INSERT INTO regle_analyse (critere_id, exigence_id, preuve_attendue_id, referentiel_version_id, code, type, libelle, severite, definition, ordre)
SELECT cr.id, ex.id, p.id, cr.referentiel_version_id, 'D4-54-R1', 'ELEMENT_ATTENDU'::type_regle_analyse, 'Les critères environnementaux examinés doivent être identifiables', 'MOYENNE'::niveau_criticite, '{"elements": ["consommation d''énergie", "recyclabilité", "pollution ou émissions"]}'::jsonb, 0
  FROM critere cr
  JOIN domaine d ON d.id = cr.domaine_id
  JOIN referentiel r ON r.id = d.referentiel_id
  JOIN _enrichissement en ON en.cible = cr.referentiel_version_id
  JOIN exigence ex ON ex.critere_id = cr.id
  JOIN preuve_attendue p ON p.exigence_id = ex.id AND p.ordre = 0
 WHERE r.code = 'SMARTEX_SUSTWAY' AND cr.code = 'D4-54';

-- SMARTEX_SUSTWAY / D4-55
UPDATE exigence ex SET intitule = 'Suivi et contrôle des consommations d''eau',
       enonce = 'L''organisation doit suivre ses consommations d''eau par des relevés réguliers, conserver l''historique de ces relevés et être en mesure de détecter les écarts anormaux, notamment les fuites.',
       origine = 'CONTENU_HUMAIN'
  FROM critere cr
  JOIN domaine d ON d.id = cr.domaine_id
  JOIN referentiel r ON r.id = d.referentiel_id
  JOIN _enrichissement en ON en.cible = cr.referentiel_version_id
 WHERE ex.critere_id = cr.id AND r.code = 'SMARTEX_SUSTWAY' AND cr.code = 'D4-55';
INSERT INTO preuve_attendue (exigence_id, referentiel_version_id, type, libelle, description, obligatoire, ordre)
SELECT ex.id, ex.referentiel_version_id, 'INDICATEUR'::type_preuve_attendue, 'Relevés de consommation d''eau', 'Historique sur plusieurs périodes comparables.', true, 0
  FROM exigence ex
  JOIN critere cr ON cr.id = ex.critere_id
  JOIN domaine d ON d.id = cr.domaine_id
  JOIN referentiel r ON r.id = d.referentiel_id
  JOIN _enrichissement en ON en.cible = cr.referentiel_version_id
 WHERE r.code = 'SMARTEX_SUSTWAY' AND cr.code = 'D4-55';
INSERT INTO preuve_attendue (exigence_id, referentiel_version_id, type, libelle, description, obligatoire, ordre)
SELECT ex.id, ex.referentiel_version_id, 'PROCEDURE'::type_preuve_attendue, 'Modalités de relevé et de détection des écarts', 'Fréquence des relevés et traitement des anomalies.', false, 1
  FROM exigence ex
  JOIN critere cr ON cr.id = ex.critere_id
  JOIN domaine d ON d.id = cr.domaine_id
  JOIN referentiel r ON r.id = d.referentiel_id
  JOIN _enrichissement en ON en.cible = cr.referentiel_version_id
 WHERE r.code = 'SMARTEX_SUSTWAY' AND cr.code = 'D4-55';
INSERT INTO regle_analyse (critere_id, exigence_id, preuve_attendue_id, referentiel_version_id, code, type, libelle, severite, definition, ordre)
SELECT cr.id, ex.id, p.id, cr.referentiel_version_id, 'D4-55-R1', 'PRESENCE'::type_regle_analyse, 'Un historique de consommation doit être fourni', 'ELEVEE'::niveau_criticite, '{"elements": ["relevés de consommation d''eau", "périodes couvertes"]}'::jsonb, 0
  FROM critere cr
  JOIN domaine d ON d.id = cr.domaine_id
  JOIN referentiel r ON r.id = d.referentiel_id
  JOIN _enrichissement en ON en.cible = cr.referentiel_version_id
  JOIN exigence ex ON ex.critere_id = cr.id
  JOIN preuve_attendue p ON p.exigence_id = ex.id AND p.ordre = 0
 WHERE r.code = 'SMARTEX_SUSTWAY' AND cr.code = 'D4-55';

-- SMARTEX_SUSTWAY / D4-56
UPDATE exigence ex SET intitule = 'Objectifs de réduction de la consommation d''eau',
       enonce = 'L''organisation doit s''être fixé des objectifs de réduction de sa consommation d''eau, quantitatifs ou qualitatifs, formulés de manière vérifiable et rattachés à une échéance.',
       origine = 'CONTENU_HUMAIN'
  FROM critere cr
  JOIN domaine d ON d.id = cr.domaine_id
  JOIN referentiel r ON r.id = d.referentiel_id
  JOIN _enrichissement en ON en.cible = cr.referentiel_version_id
 WHERE ex.critere_id = cr.id AND r.code = 'SMARTEX_SUSTWAY' AND cr.code = 'D4-56';
INSERT INTO preuve_attendue (exigence_id, referentiel_version_id, type, libelle, description, obligatoire, ordre)
SELECT ex.id, ex.referentiel_version_id, 'RAPPORT'::type_preuve_attendue, 'Objectifs de réduction de la consommation d''eau', 'Objectifs retenus, échéance et point d''avancement.', true, 0
  FROM exigence ex
  JOIN critere cr ON cr.id = ex.critere_id
  JOIN domaine d ON d.id = cr.domaine_id
  JOIN referentiel r ON r.id = d.referentiel_id
  JOIN _enrichissement en ON en.cible = cr.referentiel_version_id
 WHERE r.code = 'SMARTEX_SUSTWAY' AND cr.code = 'D4-56';
INSERT INTO regle_analyse (critere_id, exigence_id, preuve_attendue_id, referentiel_version_id, code, type, libelle, severite, definition, ordre)
SELECT cr.id, ex.id, p.id, cr.referentiel_version_id, 'D4-56-R1', 'ELEMENT_ATTENDU'::type_regle_analyse, 'L''objectif doit être rattaché à une échéance', 'MOYENNE'::niveau_criticite, '{"elements": ["objectif de réduction", "échéance"]}'::jsonb, 0
  FROM critere cr
  JOIN domaine d ON d.id = cr.domaine_id
  JOIN referentiel r ON r.id = d.referentiel_id
  JOIN _enrichissement en ON en.cible = cr.referentiel_version_id
  JOIN exigence ex ON ex.critere_id = cr.id
  JOIN preuve_attendue p ON p.exigence_id = ex.id AND p.ordre = 0
 WHERE r.code = 'SMARTEX_SUSTWAY' AND cr.code = 'D4-56';
INSERT INTO regle_analyse (critere_id, exigence_id, preuve_attendue_id, referentiel_version_id, code, type, libelle, severite, definition, ordre)
SELECT cr.id, ex.id, NULL, cr.referentiel_version_id, 'D4-56-R2', 'COHERENCE_DECLARATION'::type_regle_analyse, 'L''avancement annoncé doit s''appuyer sur les relevés fournis', 'MOYENNE'::niveau_criticite, '{"elements": ["objectif annoncé", "évolution constatée des consommations"]}'::jsonb, 1
  FROM critere cr
  JOIN domaine d ON d.id = cr.domaine_id
  JOIN referentiel r ON r.id = d.referentiel_id
  JOIN _enrichissement en ON en.cible = cr.referentiel_version_id
  JOIN exigence ex ON ex.critere_id = cr.id
 WHERE r.code = 'SMARTEX_SUSTWAY' AND cr.code = 'D4-56';

-- SMARTEX_SUSTWAY / D4-57
UPDATE exigence ex SET intitule = 'Système de management de la consommation d''eau',
       enonce = 'L''organisation doit disposer d''un dispositif organisé de gestion de sa consommation d''eau — responsabilités, moyens, revue périodique — qu''il fasse ou non l''objet d''une certification.',
       origine = 'CONTENU_HUMAIN'
  FROM critere cr
  JOIN domaine d ON d.id = cr.domaine_id
  JOIN referentiel r ON r.id = d.referentiel_id
  JOIN _enrichissement en ON en.cible = cr.referentiel_version_id
 WHERE ex.critere_id = cr.id AND r.code = 'SMARTEX_SUSTWAY' AND cr.code = 'D4-57';
INSERT INTO preuve_attendue (exigence_id, referentiel_version_id, type, libelle, description, obligatoire, ordre)
SELECT ex.id, ex.referentiel_version_id, 'PROCEDURE'::type_preuve_attendue, 'Description du dispositif de gestion de l''eau', 'Responsabilités, moyens et revue périodique.', true, 0
  FROM exigence ex
  JOIN critere cr ON cr.id = ex.critere_id
  JOIN domaine d ON d.id = cr.domaine_id
  JOIN referentiel r ON r.id = d.referentiel_id
  JOIN _enrichissement en ON en.cible = cr.referentiel_version_id
 WHERE r.code = 'SMARTEX_SUSTWAY' AND cr.code = 'D4-57';
INSERT INTO preuve_attendue (exigence_id, referentiel_version_id, type, libelle, description, obligatoire, ordre)
SELECT ex.id, ex.referentiel_version_id, 'CERTIFICAT'::type_preuve_attendue, 'Certificat éventuel', 'Facultatif : le critère n''exige aucune certification.', false, 1
  FROM exigence ex
  JOIN critere cr ON cr.id = ex.critere_id
  JOIN domaine d ON d.id = cr.domaine_id
  JOIN referentiel r ON r.id = d.referentiel_id
  JOIN _enrichissement en ON en.cible = cr.referentiel_version_id
 WHERE r.code = 'SMARTEX_SUSTWAY' AND cr.code = 'D4-57';

-- SMARTEX_SUSTWAY / D4-58
UPDATE exigence ex SET intitule = 'Suivi et contrôle de la consommation d''énergie',
       enonce = 'L''organisation doit suivre sa consommation d''énergie par des relevés réguliers, conserver l''historique de ces relevés et pouvoir en analyser l''évolution.',
       origine = 'CONTENU_HUMAIN'
  FROM critere cr
  JOIN domaine d ON d.id = cr.domaine_id
  JOIN referentiel r ON r.id = d.referentiel_id
  JOIN _enrichissement en ON en.cible = cr.referentiel_version_id
 WHERE ex.critere_id = cr.id AND r.code = 'SMARTEX_SUSTWAY' AND cr.code = 'D4-58';
INSERT INTO preuve_attendue (exigence_id, referentiel_version_id, type, libelle, description, obligatoire, ordre)
SELECT ex.id, ex.referentiel_version_id, 'INDICATEUR'::type_preuve_attendue, 'Relevés de consommation d''énergie', 'Historique sur plusieurs périodes comparables, par source si possible.', true, 0
  FROM exigence ex
  JOIN critere cr ON cr.id = ex.critere_id
  JOIN domaine d ON d.id = cr.domaine_id
  JOIN referentiel r ON r.id = d.referentiel_id
  JOIN _enrichissement en ON en.cible = cr.referentiel_version_id
 WHERE r.code = 'SMARTEX_SUSTWAY' AND cr.code = 'D4-58';
INSERT INTO preuve_attendue (exigence_id, referentiel_version_id, type, libelle, description, obligatoire, ordre)
SELECT ex.id, ex.referentiel_version_id, 'PROCEDURE'::type_preuve_attendue, 'Modalités de relevé et d''analyse', 'Fréquence des relevés et traitement des écarts.', false, 1
  FROM exigence ex
  JOIN critere cr ON cr.id = ex.critere_id
  JOIN domaine d ON d.id = cr.domaine_id
  JOIN referentiel r ON r.id = d.referentiel_id
  JOIN _enrichissement en ON en.cible = cr.referentiel_version_id
 WHERE r.code = 'SMARTEX_SUSTWAY' AND cr.code = 'D4-58';
INSERT INTO regle_analyse (critere_id, exigence_id, preuve_attendue_id, referentiel_version_id, code, type, libelle, severite, definition, ordre)
SELECT cr.id, ex.id, p.id, cr.referentiel_version_id, 'D4-58-R1', 'PRESENCE'::type_regle_analyse, 'Un historique de consommation doit être fourni', 'ELEVEE'::niveau_criticite, '{"elements": ["relevés de consommation d''énergie", "périodes couvertes"]}'::jsonb, 0
  FROM critere cr
  JOIN domaine d ON d.id = cr.domaine_id
  JOIN referentiel r ON r.id = d.referentiel_id
  JOIN _enrichissement en ON en.cible = cr.referentiel_version_id
  JOIN exigence ex ON ex.critere_id = cr.id
  JOIN preuve_attendue p ON p.exigence_id = ex.id AND p.ordre = 0
 WHERE r.code = 'SMARTEX_SUSTWAY' AND cr.code = 'D4-58';

-- SMARTEX_SUSTWAY / D4-59
UPDATE exigence ex SET intitule = 'Objectifs de réduction de la consommation d''énergie',
       enonce = 'L''organisation doit s''être fixé des objectifs de réduction de sa consommation d''énergie, quantitatifs ou qualitatifs, formulés de manière vérifiable et rattachés à une échéance.',
       origine = 'CONTENU_HUMAIN'
  FROM critere cr
  JOIN domaine d ON d.id = cr.domaine_id
  JOIN referentiel r ON r.id = d.referentiel_id
  JOIN _enrichissement en ON en.cible = cr.referentiel_version_id
 WHERE ex.critere_id = cr.id AND r.code = 'SMARTEX_SUSTWAY' AND cr.code = 'D4-59';
INSERT INTO preuve_attendue (exigence_id, referentiel_version_id, type, libelle, description, obligatoire, ordre)
SELECT ex.id, ex.referentiel_version_id, 'RAPPORT'::type_preuve_attendue, 'Objectifs de réduction de la consommation d''énergie', 'Objectifs retenus, échéance et point d''avancement.', true, 0
  FROM exigence ex
  JOIN critere cr ON cr.id = ex.critere_id
  JOIN domaine d ON d.id = cr.domaine_id
  JOIN referentiel r ON r.id = d.referentiel_id
  JOIN _enrichissement en ON en.cible = cr.referentiel_version_id
 WHERE r.code = 'SMARTEX_SUSTWAY' AND cr.code = 'D4-59';
INSERT INTO regle_analyse (critere_id, exigence_id, preuve_attendue_id, referentiel_version_id, code, type, libelle, severite, definition, ordre)
SELECT cr.id, ex.id, p.id, cr.referentiel_version_id, 'D4-59-R1', 'ELEMENT_ATTENDU'::type_regle_analyse, 'L''objectif doit être rattaché à une échéance', 'MOYENNE'::niveau_criticite, '{"elements": ["objectif de réduction", "échéance"]}'::jsonb, 0
  FROM critere cr
  JOIN domaine d ON d.id = cr.domaine_id
  JOIN referentiel r ON r.id = d.referentiel_id
  JOIN _enrichissement en ON en.cible = cr.referentiel_version_id
  JOIN exigence ex ON ex.critere_id = cr.id
  JOIN preuve_attendue p ON p.exigence_id = ex.id AND p.ordre = 0
 WHERE r.code = 'SMARTEX_SUSTWAY' AND cr.code = 'D4-59';

-- SMARTEX_SUSTWAY / D4-60
UPDATE exigence ex SET intitule = 'Système de management de l''énergie',
       enonce = 'L''organisation doit disposer d''un dispositif organisé de gestion de sa consommation d''énergie — responsabilités, moyens, revue périodique — qu''il fasse ou non l''objet d''une certification. Lorsqu''une certification de management de l''énergie a été obtenue, le certificat en atteste.',
       origine = 'CONTENU_HUMAIN'
  FROM critere cr
  JOIN domaine d ON d.id = cr.domaine_id
  JOIN referentiel r ON r.id = d.referentiel_id
  JOIN _enrichissement en ON en.cible = cr.referentiel_version_id
 WHERE ex.critere_id = cr.id AND r.code = 'SMARTEX_SUSTWAY' AND cr.code = 'D4-60';
INSERT INTO preuve_attendue (exigence_id, referentiel_version_id, type, libelle, description, obligatoire, ordre)
SELECT ex.id, ex.referentiel_version_id, 'PROCEDURE'::type_preuve_attendue, 'Description du dispositif de gestion de l''énergie', 'Responsabilités, moyens et revue périodique.', true, 0
  FROM exigence ex
  JOIN critere cr ON cr.id = ex.critere_id
  JOIN domaine d ON d.id = cr.domaine_id
  JOIN referentiel r ON r.id = d.referentiel_id
  JOIN _enrichissement en ON en.cible = cr.referentiel_version_id
 WHERE r.code = 'SMARTEX_SUSTWAY' AND cr.code = 'D4-60';
INSERT INTO preuve_attendue (exigence_id, referentiel_version_id, type, libelle, description, obligatoire, ordre)
SELECT ex.id, ex.referentiel_version_id, 'CERTIFICAT'::type_preuve_attendue, 'Certificat de management de l''énergie', 'Facultatif : le critère n''exige aucune certification.', false, 1
  FROM exigence ex
  JOIN critere cr ON cr.id = ex.critere_id
  JOIN domaine d ON d.id = cr.domaine_id
  JOIN referentiel r ON r.id = d.referentiel_id
  JOIN _enrichissement en ON en.cible = cr.referentiel_version_id
 WHERE r.code = 'SMARTEX_SUSTWAY' AND cr.code = 'D4-60';
INSERT INTO regle_analyse (critere_id, exigence_id, preuve_attendue_id, referentiel_version_id, code, type, libelle, severite, definition, ordre)
SELECT cr.id, ex.id, p.id, cr.referentiel_version_id, 'D4-60-R1', 'DATE_VALIDITE'::type_regle_analyse, 'Le certificat produit doit être en cours de validité', 'MOYENNE'::niveau_criticite, '{"champ": "date de fin de validité du certificat"}'::jsonb, 0
  FROM critere cr
  JOIN domaine d ON d.id = cr.domaine_id
  JOIN referentiel r ON r.id = d.referentiel_id
  JOIN _enrichissement en ON en.cible = cr.referentiel_version_id
  JOIN exigence ex ON ex.critere_id = cr.id
  JOIN preuve_attendue p ON p.exigence_id = ex.id AND p.ordre = 1
 WHERE r.code = 'SMARTEX_SUSTWAY' AND cr.code = 'D4-60';

-- SMARTEX_SUSTWAY / D4-61
UPDATE exigence ex SET intitule = 'Recours aux énergies renouvelables',
       enonce = 'L''organisation doit pouvoir indiquer si elle recourt à des sources d''énergie renouvelables, dans quelle proportion et sous quelle forme — production propre, contrat de fourniture — et en apporter la justification.',
       origine = 'CONTENU_HUMAIN'
  FROM critere cr
  JOIN domaine d ON d.id = cr.domaine_id
  JOIN referentiel r ON r.id = d.referentiel_id
  JOIN _enrichissement en ON en.cible = cr.referentiel_version_id
 WHERE ex.critere_id = cr.id AND r.code = 'SMARTEX_SUSTWAY' AND cr.code = 'D4-61';
INSERT INTO preuve_attendue (exigence_id, referentiel_version_id, type, libelle, description, obligatoire, ordre)
SELECT ex.id, ex.referentiel_version_id, 'DOCUMENT_LEGAL'::type_preuve_attendue, 'Contrat de fourniture ou justificatif d''installation', 'Contrat d''énergie renouvelable ou facture d''installation.', false, 0
  FROM exigence ex
  JOIN critere cr ON cr.id = ex.critere_id
  JOIN domaine d ON d.id = cr.domaine_id
  JOIN referentiel r ON r.id = d.referentiel_id
  JOIN _enrichissement en ON en.cible = cr.referentiel_version_id
 WHERE r.code = 'SMARTEX_SUSTWAY' AND cr.code = 'D4-61';
INSERT INTO preuve_attendue (exigence_id, referentiel_version_id, type, libelle, description, obligatoire, ordre)
SELECT ex.id, ex.referentiel_version_id, 'INDICATEUR'::type_preuve_attendue, 'Part des énergies renouvelables dans la consommation', 'Donnée chiffrée sur la période.', false, 1
  FROM exigence ex
  JOIN critere cr ON cr.id = ex.critere_id
  JOIN domaine d ON d.id = cr.domaine_id
  JOIN referentiel r ON r.id = d.referentiel_id
  JOIN _enrichissement en ON en.cible = cr.referentiel_version_id
 WHERE r.code = 'SMARTEX_SUSTWAY' AND cr.code = 'D4-61';

-- SMARTEX_SUSTWAY / D4-62
UPDATE exigence ex SET intitule = 'Suivi et contrôle des rejets atmosphériques',
       enonce = 'Lorsque les activités de l''organisation produisent des rejets atmosphériques, elle doit en assurer le suivi par des mesures ou des estimations documentées et en conserver l''historique.',
       origine = 'CONTENU_HUMAIN'
  FROM critere cr
  JOIN domaine d ON d.id = cr.domaine_id
  JOIN referentiel r ON r.id = d.referentiel_id
  JOIN _enrichissement en ON en.cible = cr.referentiel_version_id
 WHERE ex.critere_id = cr.id AND r.code = 'SMARTEX_SUSTWAY' AND cr.code = 'D4-62';
INSERT INTO preuve_attendue (exigence_id, referentiel_version_id, type, libelle, description, obligatoire, ordre)
SELECT ex.id, ex.referentiel_version_id, 'INDICATEUR'::type_preuve_attendue, 'Relevés ou estimations des rejets atmosphériques', 'Historique par source et par période.', true, 0
  FROM exigence ex
  JOIN critere cr ON cr.id = ex.critere_id
  JOIN domaine d ON d.id = cr.domaine_id
  JOIN referentiel r ON r.id = d.referentiel_id
  JOIN _enrichissement en ON en.cible = cr.referentiel_version_id
 WHERE r.code = 'SMARTEX_SUSTWAY' AND cr.code = 'D4-62';
INSERT INTO preuve_attendue (exigence_id, referentiel_version_id, type, libelle, description, obligatoire, ordre)
SELECT ex.id, ex.referentiel_version_id, 'RAPPORT'::type_preuve_attendue, 'Rapports de mesure ou de contrôle', 'Contrôles réalisés, le cas échéant par un organisme extérieur.', false, 1
  FROM exigence ex
  JOIN critere cr ON cr.id = ex.critere_id
  JOIN domaine d ON d.id = cr.domaine_id
  JOIN referentiel r ON r.id = d.referentiel_id
  JOIN _enrichissement en ON en.cible = cr.referentiel_version_id
 WHERE r.code = 'SMARTEX_SUSTWAY' AND cr.code = 'D4-62';
INSERT INTO regle_analyse (critere_id, exigence_id, preuve_attendue_id, referentiel_version_id, code, type, libelle, severite, definition, ordre)
SELECT cr.id, ex.id, p.id, cr.referentiel_version_id, 'D4-62-R1', 'PRESENCE'::type_regle_analyse, 'Des données de rejets doivent être fournies', 'MOYENNE'::niveau_criticite, '{"elements": ["rejets atmosphériques", "périodes couvertes"]}'::jsonb, 0
  FROM critere cr
  JOIN domaine d ON d.id = cr.domaine_id
  JOIN referentiel r ON r.id = d.referentiel_id
  JOIN _enrichissement en ON en.cible = cr.referentiel_version_id
  JOIN exigence ex ON ex.critere_id = cr.id
  JOIN preuve_attendue p ON p.exigence_id = ex.id AND p.ordre = 0
 WHERE r.code = 'SMARTEX_SUSTWAY' AND cr.code = 'D4-62';

-- SMARTEX_SUSTWAY / D4-63
UPDATE exigence ex SET intitule = 'Objectifs de réduction des rejets atmosphériques',
       enonce = 'L''organisation doit s''être fixé des objectifs de réduction de ses rejets atmosphériques, quantitatifs ou qualitatifs, rattachés à une échéance.',
       origine = 'CONTENU_HUMAIN'
  FROM critere cr
  JOIN domaine d ON d.id = cr.domaine_id
  JOIN referentiel r ON r.id = d.referentiel_id
  JOIN _enrichissement en ON en.cible = cr.referentiel_version_id
 WHERE ex.critere_id = cr.id AND r.code = 'SMARTEX_SUSTWAY' AND cr.code = 'D4-63';
INSERT INTO preuve_attendue (exigence_id, referentiel_version_id, type, libelle, description, obligatoire, ordre)
SELECT ex.id, ex.referentiel_version_id, 'RAPPORT'::type_preuve_attendue, 'Objectifs de réduction des rejets atmosphériques', 'Objectifs retenus, échéance et point d''avancement.', true, 0
  FROM exigence ex
  JOIN critere cr ON cr.id = ex.critere_id
  JOIN domaine d ON d.id = cr.domaine_id
  JOIN referentiel r ON r.id = d.referentiel_id
  JOIN _enrichissement en ON en.cible = cr.referentiel_version_id
 WHERE r.code = 'SMARTEX_SUSTWAY' AND cr.code = 'D4-63';

-- SMARTEX_SUSTWAY / D4-64
UPDATE exigence ex SET intitule = 'Système de management des rejets atmosphériques',
       enonce = 'L''organisation doit disposer d''un dispositif organisé de gestion de ses rejets atmosphériques — responsabilités, moyens de maîtrise, revue périodique — qu''il fasse ou non l''objet d''une certification.',
       origine = 'CONTENU_HUMAIN'
  FROM critere cr
  JOIN domaine d ON d.id = cr.domaine_id
  JOIN referentiel r ON r.id = d.referentiel_id
  JOIN _enrichissement en ON en.cible = cr.referentiel_version_id
 WHERE ex.critere_id = cr.id AND r.code = 'SMARTEX_SUSTWAY' AND cr.code = 'D4-64';
INSERT INTO preuve_attendue (exigence_id, referentiel_version_id, type, libelle, description, obligatoire, ordre)
SELECT ex.id, ex.referentiel_version_id, 'PROCEDURE'::type_preuve_attendue, 'Description du dispositif de gestion des rejets atmosphériques', 'Responsabilités, moyens de maîtrise et revue.', true, 0
  FROM exigence ex
  JOIN critere cr ON cr.id = ex.critere_id
  JOIN domaine d ON d.id = cr.domaine_id
  JOIN referentiel r ON r.id = d.referentiel_id
  JOIN _enrichissement en ON en.cible = cr.referentiel_version_id
 WHERE r.code = 'SMARTEX_SUSTWAY' AND cr.code = 'D4-64';

-- SMARTEX_SUSTWAY / D4-65
UPDATE exigence ex SET intitule = 'Suivi et contrôle des rejets liquides',
       enonce = 'Lorsque les activités de l''organisation produisent des rejets liquides, elle doit en assurer le suivi par des mesures ou des analyses documentées et en conserver l''historique.',
       origine = 'CONTENU_HUMAIN'
  FROM critere cr
  JOIN domaine d ON d.id = cr.domaine_id
  JOIN referentiel r ON r.id = d.referentiel_id
  JOIN _enrichissement en ON en.cible = cr.referentiel_version_id
 WHERE ex.critere_id = cr.id AND r.code = 'SMARTEX_SUSTWAY' AND cr.code = 'D4-65';
INSERT INTO preuve_attendue (exigence_id, referentiel_version_id, type, libelle, description, obligatoire, ordre)
SELECT ex.id, ex.referentiel_version_id, 'INDICATEUR'::type_preuve_attendue, 'Relevés ou analyses des rejets liquides', 'Historique par point de rejet et par période.', true, 0
  FROM exigence ex
  JOIN critere cr ON cr.id = ex.critere_id
  JOIN domaine d ON d.id = cr.domaine_id
  JOIN referentiel r ON r.id = d.referentiel_id
  JOIN _enrichissement en ON en.cible = cr.referentiel_version_id
 WHERE r.code = 'SMARTEX_SUSTWAY' AND cr.code = 'D4-65';
INSERT INTO preuve_attendue (exigence_id, referentiel_version_id, type, libelle, description, obligatoire, ordre)
SELECT ex.id, ex.referentiel_version_id, 'RAPPORT'::type_preuve_attendue, 'Rapports d''analyse', 'Analyses réalisées, le cas échéant par un laboratoire extérieur.', false, 1
  FROM exigence ex
  JOIN critere cr ON cr.id = ex.critere_id
  JOIN domaine d ON d.id = cr.domaine_id
  JOIN referentiel r ON r.id = d.referentiel_id
  JOIN _enrichissement en ON en.cible = cr.referentiel_version_id
 WHERE r.code = 'SMARTEX_SUSTWAY' AND cr.code = 'D4-65';
INSERT INTO regle_analyse (critere_id, exigence_id, preuve_attendue_id, referentiel_version_id, code, type, libelle, severite, definition, ordre)
SELECT cr.id, ex.id, p.id, cr.referentiel_version_id, 'D4-65-R1', 'PRESENCE'::type_regle_analyse, 'Des données de rejets doivent être fournies', 'MOYENNE'::niveau_criticite, '{"elements": ["rejets liquides", "périodes couvertes"]}'::jsonb, 0
  FROM critere cr
  JOIN domaine d ON d.id = cr.domaine_id
  JOIN referentiel r ON r.id = d.referentiel_id
  JOIN _enrichissement en ON en.cible = cr.referentiel_version_id
  JOIN exigence ex ON ex.critere_id = cr.id
  JOIN preuve_attendue p ON p.exigence_id = ex.id AND p.ordre = 0
 WHERE r.code = 'SMARTEX_SUSTWAY' AND cr.code = 'D4-65';

-- SMARTEX_SUSTWAY / D4-66
UPDATE exigence ex SET intitule = 'Objectifs de réduction des rejets liquides',
       enonce = 'L''organisation doit s''être fixé des objectifs de réduction de ses rejets liquides, quantitatifs ou qualitatifs, rattachés à une échéance.',
       origine = 'CONTENU_HUMAIN'
  FROM critere cr
  JOIN domaine d ON d.id = cr.domaine_id
  JOIN referentiel r ON r.id = d.referentiel_id
  JOIN _enrichissement en ON en.cible = cr.referentiel_version_id
 WHERE ex.critere_id = cr.id AND r.code = 'SMARTEX_SUSTWAY' AND cr.code = 'D4-66';
INSERT INTO preuve_attendue (exigence_id, referentiel_version_id, type, libelle, description, obligatoire, ordre)
SELECT ex.id, ex.referentiel_version_id, 'RAPPORT'::type_preuve_attendue, 'Objectifs de réduction des rejets liquides', 'Objectifs retenus, échéance et point d''avancement.', true, 0
  FROM exigence ex
  JOIN critere cr ON cr.id = ex.critere_id
  JOIN domaine d ON d.id = cr.domaine_id
  JOIN referentiel r ON r.id = d.referentiel_id
  JOIN _enrichissement en ON en.cible = cr.referentiel_version_id
 WHERE r.code = 'SMARTEX_SUSTWAY' AND cr.code = 'D4-66';

-- SMARTEX_SUSTWAY / D4-67
UPDATE exigence ex SET intitule = 'Système de management des rejets liquides',
       enonce = 'L''organisation doit disposer d''un dispositif organisé de gestion de ses rejets liquides — responsabilités, moyens de maîtrise, revue périodique — qu''il fasse ou non l''objet d''une certification.',
       origine = 'CONTENU_HUMAIN'
  FROM critere cr
  JOIN domaine d ON d.id = cr.domaine_id
  JOIN referentiel r ON r.id = d.referentiel_id
  JOIN _enrichissement en ON en.cible = cr.referentiel_version_id
 WHERE ex.critere_id = cr.id AND r.code = 'SMARTEX_SUSTWAY' AND cr.code = 'D4-67';
INSERT INTO preuve_attendue (exigence_id, referentiel_version_id, type, libelle, description, obligatoire, ordre)
SELECT ex.id, ex.referentiel_version_id, 'PROCEDURE'::type_preuve_attendue, 'Description du dispositif de gestion des rejets liquides', 'Responsabilités, moyens de maîtrise et revue.', true, 0
  FROM exigence ex
  JOIN critere cr ON cr.id = ex.critere_id
  JOIN domaine d ON d.id = cr.domaine_id
  JOIN referentiel r ON r.id = d.referentiel_id
  JOIN _enrichissement en ON en.cible = cr.referentiel_version_id
 WHERE r.code = 'SMARTEX_SUSTWAY' AND cr.code = 'D4-67';

-- SMARTEX_SUSTWAY / D4-68
UPDATE exigence ex SET intitule = 'Suivi et contrôle des déchets solides',
       enonce = 'L''organisation doit suivre ses déchets solides par flux — quantités produites, destinations, prestataires — et conserver la trace des enlèvements réalisés.',
       origine = 'CONTENU_HUMAIN'
  FROM critere cr
  JOIN domaine d ON d.id = cr.domaine_id
  JOIN referentiel r ON r.id = d.referentiel_id
  JOIN _enrichissement en ON en.cible = cr.referentiel_version_id
 WHERE ex.critere_id = cr.id AND r.code = 'SMARTEX_SUSTWAY' AND cr.code = 'D4-68';
INSERT INTO preuve_attendue (exigence_id, referentiel_version_id, type, libelle, description, obligatoire, ordre)
SELECT ex.id, ex.referentiel_version_id, 'REGISTRE'::type_preuve_attendue, 'Registre de suivi des déchets', 'Quantités par flux, dates d''enlèvement et destinations.', true, 0
  FROM exigence ex
  JOIN critere cr ON cr.id = ex.critere_id
  JOIN domaine d ON d.id = cr.domaine_id
  JOIN referentiel r ON r.id = d.referentiel_id
  JOIN _enrichissement en ON en.cible = cr.referentiel_version_id
 WHERE r.code = 'SMARTEX_SUSTWAY' AND cr.code = 'D4-68';
INSERT INTO preuve_attendue (exigence_id, referentiel_version_id, type, libelle, description, obligatoire, ordre)
SELECT ex.id, ex.referentiel_version_id, 'DOCUMENT_LEGAL'::type_preuve_attendue, 'Bordereaux ou attestations de prise en charge', 'Documents remis par les prestataires de collecte.', false, 1
  FROM exigence ex
  JOIN critere cr ON cr.id = ex.critere_id
  JOIN domaine d ON d.id = cr.domaine_id
  JOIN referentiel r ON r.id = d.referentiel_id
  JOIN _enrichissement en ON en.cible = cr.referentiel_version_id
 WHERE r.code = 'SMARTEX_SUSTWAY' AND cr.code = 'D4-68';
INSERT INTO regle_analyse (critere_id, exigence_id, preuve_attendue_id, referentiel_version_id, code, type, libelle, severite, definition, ordre)
SELECT cr.id, ex.id, p.id, cr.referentiel_version_id, 'D4-68-R1', 'ELEMENT_ATTENDU'::type_regle_analyse, 'Le registre doit identifier flux, quantités et destinations', 'MOYENNE'::niveau_criticite, '{"elements": ["flux de déchets", "quantités", "destinations"]}'::jsonb, 0
  FROM critere cr
  JOIN domaine d ON d.id = cr.domaine_id
  JOIN referentiel r ON r.id = d.referentiel_id
  JOIN _enrichissement en ON en.cible = cr.referentiel_version_id
  JOIN exigence ex ON ex.critere_id = cr.id
  JOIN preuve_attendue p ON p.exigence_id = ex.id AND p.ordre = 0
 WHERE r.code = 'SMARTEX_SUSTWAY' AND cr.code = 'D4-68';

-- SMARTEX_SUSTWAY / D4-69
UPDATE exigence ex SET intitule = 'Objectifs de réduction des déchets solides',
       enonce = 'L''organisation doit s''être fixé des objectifs de réduction de ses déchets solides, quantitatifs ou qualitatifs, rattachés à une échéance.',
       origine = 'CONTENU_HUMAIN'
  FROM critere cr
  JOIN domaine d ON d.id = cr.domaine_id
  JOIN referentiel r ON r.id = d.referentiel_id
  JOIN _enrichissement en ON en.cible = cr.referentiel_version_id
 WHERE ex.critere_id = cr.id AND r.code = 'SMARTEX_SUSTWAY' AND cr.code = 'D4-69';
INSERT INTO preuve_attendue (exigence_id, referentiel_version_id, type, libelle, description, obligatoire, ordre)
SELECT ex.id, ex.referentiel_version_id, 'RAPPORT'::type_preuve_attendue, 'Objectifs de réduction des déchets', 'Objectifs retenus, échéance et point d''avancement.', true, 0
  FROM exigence ex
  JOIN critere cr ON cr.id = ex.critere_id
  JOIN domaine d ON d.id = cr.domaine_id
  JOIN referentiel r ON r.id = d.referentiel_id
  JOIN _enrichissement en ON en.cible = cr.referentiel_version_id
 WHERE r.code = 'SMARTEX_SUSTWAY' AND cr.code = 'D4-69';

-- SMARTEX_SUSTWAY / D4-70
UPDATE exigence ex SET intitule = 'Système de management des déchets solides',
       enonce = 'L''organisation doit disposer d''un dispositif organisé de gestion de ses déchets — responsabilités, tri, filières retenues, revue périodique — qu''il fasse ou non l''objet d''une certification.',
       origine = 'CONTENU_HUMAIN'
  FROM critere cr
  JOIN domaine d ON d.id = cr.domaine_id
  JOIN referentiel r ON r.id = d.referentiel_id
  JOIN _enrichissement en ON en.cible = cr.referentiel_version_id
 WHERE ex.critere_id = cr.id AND r.code = 'SMARTEX_SUSTWAY' AND cr.code = 'D4-70';
INSERT INTO preuve_attendue (exigence_id, referentiel_version_id, type, libelle, description, obligatoire, ordre)
SELECT ex.id, ex.referentiel_version_id, 'PROCEDURE'::type_preuve_attendue, 'Description du dispositif de gestion des déchets', 'Responsabilités, tri, filières et revue.', true, 0
  FROM exigence ex
  JOIN critere cr ON cr.id = ex.critere_id
  JOIN domaine d ON d.id = cr.domaine_id
  JOIN referentiel r ON r.id = d.referentiel_id
  JOIN _enrichissement en ON en.cible = cr.referentiel_version_id
 WHERE r.code = 'SMARTEX_SUSTWAY' AND cr.code = 'D4-70';

-- SMARTEX_SUSTWAY / D5-71
UPDATE exigence ex SET intitule = 'Protection des données et de la vie privée des clients',
       enonce = 'L''organisation doit disposer de dispositions écrites encadrant la collecte, l''utilisation, la conservation et la sécurité des données personnelles de ses clients, conformes aux règles applicables là où elle opère.',
       origine = 'CONTENU_HUMAIN'
  FROM critere cr
  JOIN domaine d ON d.id = cr.domaine_id
  JOIN referentiel r ON r.id = d.referentiel_id
  JOIN _enrichissement en ON en.cible = cr.referentiel_version_id
 WHERE ex.critere_id = cr.id AND r.code = 'SMARTEX_SUSTWAY' AND cr.code = 'D5-71';
INSERT INTO preuve_attendue (exigence_id, referentiel_version_id, type, libelle, description, obligatoire, ordre)
SELECT ex.id, ex.referentiel_version_id, 'POLITIQUE'::type_preuve_attendue, 'Politique de protection des données personnelles', 'Finalités, durées de conservation, droits des personnes et sécurité.', true, 0
  FROM exigence ex
  JOIN critere cr ON cr.id = ex.critere_id
  JOIN domaine d ON d.id = cr.domaine_id
  JOIN referentiel r ON r.id = d.referentiel_id
  JOIN _enrichissement en ON en.cible = cr.referentiel_version_id
 WHERE r.code = 'SMARTEX_SUSTWAY' AND cr.code = 'D5-71';
INSERT INTO preuve_attendue (exigence_id, referentiel_version_id, type, libelle, description, obligatoire, ordre)
SELECT ex.id, ex.referentiel_version_id, 'PROCEDURE'::type_preuve_attendue, 'Mesures de sécurité des données', 'Contrôles d''accès, sauvegardes, gestion des incidents.', false, 1
  FROM exigence ex
  JOIN critere cr ON cr.id = ex.critere_id
  JOIN domaine d ON d.id = cr.domaine_id
  JOIN referentiel r ON r.id = d.referentiel_id
  JOIN _enrichissement en ON en.cible = cr.referentiel_version_id
 WHERE r.code = 'SMARTEX_SUSTWAY' AND cr.code = 'D5-71';
INSERT INTO regle_analyse (critere_id, exigence_id, preuve_attendue_id, referentiel_version_id, code, type, libelle, severite, definition, ordre)
SELECT cr.id, ex.id, p.id, cr.referentiel_version_id, 'D5-71-R1', 'ELEMENT_ATTENDU'::type_regle_analyse, 'La politique doit couvrir les éléments attendus', 'MOYENNE'::niveau_criticite, '{"elements": ["finalités de la collecte", "durée de conservation", "droits des personnes", "mesures de sécurité"]}'::jsonb, 0
  FROM critere cr
  JOIN domaine d ON d.id = cr.domaine_id
  JOIN referentiel r ON r.id = d.referentiel_id
  JOIN _enrichissement en ON en.cible = cr.referentiel_version_id
  JOIN exigence ex ON ex.critere_id = cr.id
  JOIN preuve_attendue p ON p.exigence_id = ex.id AND p.ordre = 0
 WHERE r.code = 'SMARTEX_SUSTWAY' AND cr.code = 'D5-71';

-- SMARTEX_SUSTWAY / D5-72
UPDATE exigence ex SET intitule = 'Information des clients sur les produits et services',
       enonce = 'L''organisation doit fournir à ses clients les informations nécessaires pour choisir en connaissance de cause — caractéristiques, conditions d''usage, précautions, prix — par des supports identifiables.',
       origine = 'CONTENU_HUMAIN'
  FROM critere cr
  JOIN domaine d ON d.id = cr.domaine_id
  JOIN referentiel r ON r.id = d.referentiel_id
  JOIN _enrichissement en ON en.cible = cr.referentiel_version_id
 WHERE ex.critere_id = cr.id AND r.code = 'SMARTEX_SUSTWAY' AND cr.code = 'D5-72';
INSERT INTO preuve_attendue (exigence_id, referentiel_version_id, type, libelle, description, obligatoire, ordre)
SELECT ex.id, ex.referentiel_version_id, 'PREUVE_OPERATIONNELLE'::type_preuve_attendue, 'Supports d''information client', 'Notices, fiches produit, conditions générales, étiquetage.', true, 0
  FROM exigence ex
  JOIN critere cr ON cr.id = ex.critere_id
  JOIN domaine d ON d.id = cr.domaine_id
  JOIN referentiel r ON r.id = d.referentiel_id
  JOIN _enrichissement en ON en.cible = cr.referentiel_version_id
 WHERE r.code = 'SMARTEX_SUSTWAY' AND cr.code = 'D5-72';

-- SMARTEX_SUSTWAY / D5-73
UPDATE exigence ex SET intitule = 'Sécurité et santé des clients dans l''usage des produits',
       enonce = 'L''organisation doit avoir identifié les risques pour la sécurité et la santé liés à l''usage de ses produits ou services et pris les mesures correspondantes — avertissements, consignes d''usage, dispositifs de rappel.',
       origine = 'CONTENU_HUMAIN'
  FROM critere cr
  JOIN domaine d ON d.id = cr.domaine_id
  JOIN referentiel r ON r.id = d.referentiel_id
  JOIN _enrichissement en ON en.cible = cr.referentiel_version_id
 WHERE ex.critere_id = cr.id AND r.code = 'SMARTEX_SUSTWAY' AND cr.code = 'D5-73';
INSERT INTO preuve_attendue (exigence_id, referentiel_version_id, type, libelle, description, obligatoire, ordre)
SELECT ex.id, ex.referentiel_version_id, 'PROCEDURE'::type_preuve_attendue, 'Mesures de sécurité pour les utilisateurs', 'Avertissements, consignes d''usage, procédure de rappel.', true, 0
  FROM exigence ex
  JOIN critere cr ON cr.id = ex.critere_id
  JOIN domaine d ON d.id = cr.domaine_id
  JOIN referentiel r ON r.id = d.referentiel_id
  JOIN _enrichissement en ON en.cible = cr.referentiel_version_id
 WHERE r.code = 'SMARTEX_SUSTWAY' AND cr.code = 'D5-73';
INSERT INTO regle_analyse (critere_id, exigence_id, preuve_attendue_id, referentiel_version_id, code, type, libelle, severite, definition, ordre)
SELECT cr.id, ex.id, p.id, cr.referentiel_version_id, 'D5-73-R1', 'ELEMENT_ATTENDU'::type_regle_analyse, 'Les mesures attendues doivent être identifiables', 'MOYENNE'::niveau_criticite, '{"elements": ["risques identifiés", "avertissements ou consignes", "procédure de rappel"]}'::jsonb, 0
  FROM critere cr
  JOIN domaine d ON d.id = cr.domaine_id
  JOIN referentiel r ON r.id = d.referentiel_id
  JOIN _enrichissement en ON en.cible = cr.referentiel_version_id
  JOIN exigence ex ON ex.critere_id = cr.id
  JOIN preuve_attendue p ON p.exigence_id = ex.id AND p.ordre = 0
 WHERE r.code = 'SMARTEX_SUSTWAY' AND cr.code = 'D5-73';

-- SMARTEX_SUSTWAY / D5-74
UPDATE exigence ex SET intitule = 'Qualité des biens et services comme objectif central',
       enonce = 'L''organisation doit avoir formalisé un objectif de qualité de ses biens ou services, assorti de modalités de contrôle et d''un traitement des non-conformités constatées.',
       origine = 'CONTENU_HUMAIN'
  FROM critere cr
  JOIN domaine d ON d.id = cr.domaine_id
  JOIN referentiel r ON r.id = d.referentiel_id
  JOIN _enrichissement en ON en.cible = cr.referentiel_version_id
 WHERE ex.critere_id = cr.id AND r.code = 'SMARTEX_SUSTWAY' AND cr.code = 'D5-74';
INSERT INTO preuve_attendue (exigence_id, referentiel_version_id, type, libelle, description, obligatoire, ordre)
SELECT ex.id, ex.referentiel_version_id, 'POLITIQUE'::type_preuve_attendue, 'Politique ou engagement qualité', 'Objectifs de qualité retenus et responsabilités.', true, 0
  FROM exigence ex
  JOIN critere cr ON cr.id = ex.critere_id
  JOIN domaine d ON d.id = cr.domaine_id
  JOIN referentiel r ON r.id = d.referentiel_id
  JOIN _enrichissement en ON en.cible = cr.referentiel_version_id
 WHERE r.code = 'SMARTEX_SUSTWAY' AND cr.code = 'D5-74';
INSERT INTO preuve_attendue (exigence_id, referentiel_version_id, type, libelle, description, obligatoire, ordre)
SELECT ex.id, ex.referentiel_version_id, 'REGISTRE'::type_preuve_attendue, 'Suivi des non-conformités et réclamations', 'Trace des écarts constatés et des suites données.', false, 1
  FROM exigence ex
  JOIN critere cr ON cr.id = ex.critere_id
  JOIN domaine d ON d.id = cr.domaine_id
  JOIN referentiel r ON r.id = d.referentiel_id
  JOIN _enrichissement en ON en.cible = cr.referentiel_version_id
 WHERE r.code = 'SMARTEX_SUSTWAY' AND cr.code = 'D5-74';

-- SMARTEX_SUSTWAY / D5-75
UPDATE exigence ex SET intitule = 'Promotion d''une consommation responsable',
       enonce = 'L''organisation doit pouvoir décrire les actions par lesquelles elle informe ou sensibilise ses consommateurs à une consommation responsable, et en produire les supports.',
       origine = 'CONTENU_HUMAIN'
  FROM critere cr
  JOIN domaine d ON d.id = cr.domaine_id
  JOIN referentiel r ON r.id = d.referentiel_id
  JOIN _enrichissement en ON en.cible = cr.referentiel_version_id
 WHERE ex.critere_id = cr.id AND r.code = 'SMARTEX_SUSTWAY' AND cr.code = 'D5-75';
INSERT INTO preuve_attendue (exigence_id, referentiel_version_id, type, libelle, description, obligatoire, ordre)
SELECT ex.id, ex.referentiel_version_id, 'PREUVE_OPERATIONNELLE'::type_preuve_attendue, 'Supports de sensibilisation des consommateurs', 'Campagnes, mentions sur les produits, contenus pédagogiques.', false, 0
  FROM exigence ex
  JOIN critere cr ON cr.id = ex.critere_id
  JOIN domaine d ON d.id = cr.domaine_id
  JOIN referentiel r ON r.id = d.referentiel_id
  JOIN _enrichissement en ON en.cible = cr.referentiel_version_id
 WHERE r.code = 'SMARTEX_SUSTWAY' AND cr.code = 'D5-75';

-- SMARTEX_SUSTWAY / D5-76
UPDATE exigence ex SET intitule = 'Service après-vente et traitement des réclamations',
       enonce = 'L''organisation doit disposer d''un dispositif de traitement des réclamations et litiges de ses clients, dont les modalités de saisine et les délais de réponse sont portés à leur connaissance.',
       origine = 'CONTENU_HUMAIN'
  FROM critere cr
  JOIN domaine d ON d.id = cr.domaine_id
  JOIN referentiel r ON r.id = d.referentiel_id
  JOIN _enrichissement en ON en.cible = cr.referentiel_version_id
 WHERE ex.critere_id = cr.id AND r.code = 'SMARTEX_SUSTWAY' AND cr.code = 'D5-76';
INSERT INTO preuve_attendue (exigence_id, referentiel_version_id, type, libelle, description, obligatoire, ordre)
SELECT ex.id, ex.referentiel_version_id, 'PROCEDURE'::type_preuve_attendue, 'Procédure de traitement des réclamations clients', 'Modalités de saisine, délais et responsables.', true, 0
  FROM exigence ex
  JOIN critere cr ON cr.id = ex.critere_id
  JOIN domaine d ON d.id = cr.domaine_id
  JOIN referentiel r ON r.id = d.referentiel_id
  JOIN _enrichissement en ON en.cible = cr.referentiel_version_id
 WHERE r.code = 'SMARTEX_SUSTWAY' AND cr.code = 'D5-76';
INSERT INTO preuve_attendue (exigence_id, referentiel_version_id, type, libelle, description, obligatoire, ordre)
SELECT ex.id, ex.referentiel_version_id, 'REGISTRE'::type_preuve_attendue, 'Registre des réclamations et de leur traitement', 'Trace des saisines et des suites données.', false, 1
  FROM exigence ex
  JOIN critere cr ON cr.id = ex.critere_id
  JOIN domaine d ON d.id = cr.domaine_id
  JOIN referentiel r ON r.id = d.referentiel_id
  JOIN _enrichissement en ON en.cible = cr.referentiel_version_id
 WHERE r.code = 'SMARTEX_SUSTWAY' AND cr.code = 'D5-76';
INSERT INTO regle_analyse (critere_id, exigence_id, preuve_attendue_id, referentiel_version_id, code, type, libelle, severite, definition, ordre)
SELECT cr.id, ex.id, p.id, cr.referentiel_version_id, 'D5-76-R1', 'ELEMENT_ATTENDU'::type_regle_analyse, 'La procédure doit préciser saisine et délais', 'MOYENNE'::niveau_criticite, '{"elements": ["modalités de saisine", "délai de réponse"]}'::jsonb, 0
  FROM critere cr
  JOIN domaine d ON d.id = cr.domaine_id
  JOIN referentiel r ON r.id = d.referentiel_id
  JOIN _enrichissement en ON en.cible = cr.referentiel_version_id
  JOIN exigence ex ON ex.critere_id = cr.id
  JOIN preuve_attendue p ON p.exigence_id = ex.id AND p.ordre = 0
 WHERE r.code = 'SMARTEX_SUSTWAY' AND cr.code = 'D5-76';

-- SMARTEX_SUSTWAY / D5-77
UPDATE exigence ex SET intitule = 'Études de satisfaction client',
       enonce = 'L''organisation doit mesurer la satisfaction de ses clients selon une périodicité qu''elle définit, et conserver les résultats obtenus ainsi que les suites données.',
       origine = 'CONTENU_HUMAIN'
  FROM critere cr
  JOIN domaine d ON d.id = cr.domaine_id
  JOIN referentiel r ON r.id = d.referentiel_id
  JOIN _enrichissement en ON en.cible = cr.referentiel_version_id
 WHERE ex.critere_id = cr.id AND r.code = 'SMARTEX_SUSTWAY' AND cr.code = 'D5-77';
INSERT INTO preuve_attendue (exigence_id, referentiel_version_id, type, libelle, description, obligatoire, ordre)
SELECT ex.id, ex.referentiel_version_id, 'RAPPORT'::type_preuve_attendue, 'Résultats des enquêtes de satisfaction', 'Méthode, période, résultats et suites données.', true, 0
  FROM exigence ex
  JOIN critere cr ON cr.id = ex.critere_id
  JOIN domaine d ON d.id = cr.domaine_id
  JOIN referentiel r ON r.id = d.referentiel_id
  JOIN _enrichissement en ON en.cible = cr.referentiel_version_id
 WHERE r.code = 'SMARTEX_SUSTWAY' AND cr.code = 'D5-77';
INSERT INTO regle_analyse (critere_id, exigence_id, preuve_attendue_id, referentiel_version_id, code, type, libelle, severite, definition, ordre)
SELECT cr.id, ex.id, p.id, cr.referentiel_version_id, 'D5-77-R1', 'DATE_VALIDITE'::type_regle_analyse, 'L''enquête la plus récente doit être exploitable', 'MOYENNE'::niveau_criticite, '{"champ": "date de la dernière enquête"}'::jsonb, 0
  FROM critere cr
  JOIN domaine d ON d.id = cr.domaine_id
  JOIN referentiel r ON r.id = d.referentiel_id
  JOIN _enrichissement en ON en.cible = cr.referentiel_version_id
  JOIN exigence ex ON ex.critere_id = cr.id
  JOIN preuve_attendue p ON p.exigence_id = ex.id AND p.ordre = 0
 WHERE r.code = 'SMARTEX_SUSTWAY' AND cr.code = 'D5-77';

-- SMARTEX_SUSTWAY / D5-78
UPDATE exigence ex SET intitule = 'Système de management de la qualité',
       enonce = 'L''organisation doit déployer un système de management de la qualité structuré — processus identifiés, contrôles, traitement des non-conformités, revue. Le critère vise un système orienté vers la certification ISO 9001 : la certification effective n''est pas exigée, mais si elle a été obtenue, le certificat en atteste.',
       origine = 'CONTENU_HUMAIN'
  FROM critere cr
  JOIN domaine d ON d.id = cr.domaine_id
  JOIN referentiel r ON r.id = d.referentiel_id
  JOIN _enrichissement en ON en.cible = cr.referentiel_version_id
 WHERE ex.critere_id = cr.id AND r.code = 'SMARTEX_SUSTWAY' AND cr.code = 'D5-78';
INSERT INTO preuve_attendue (exigence_id, referentiel_version_id, type, libelle, description, obligatoire, ordre)
SELECT ex.id, ex.referentiel_version_id, 'PROCEDURE'::type_preuve_attendue, 'Description du système de management de la qualité', 'Processus, contrôles, non-conformités et revue.', true, 0
  FROM exigence ex
  JOIN critere cr ON cr.id = ex.critere_id
  JOIN domaine d ON d.id = cr.domaine_id
  JOIN referentiel r ON r.id = d.referentiel_id
  JOIN _enrichissement en ON en.cible = cr.referentiel_version_id
 WHERE r.code = 'SMARTEX_SUSTWAY' AND cr.code = 'D5-78';
INSERT INTO preuve_attendue (exigence_id, referentiel_version_id, type, libelle, description, obligatoire, ordre)
SELECT ex.id, ex.referentiel_version_id, 'CERTIFICAT'::type_preuve_attendue, 'Certificat ISO 9001', 'Facultatif : atteste d''une certification effectivement obtenue.', false, 1
  FROM exigence ex
  JOIN critere cr ON cr.id = ex.critere_id
  JOIN domaine d ON d.id = cr.domaine_id
  JOIN referentiel r ON r.id = d.referentiel_id
  JOIN _enrichissement en ON en.cible = cr.referentiel_version_id
 WHERE r.code = 'SMARTEX_SUSTWAY' AND cr.code = 'D5-78';
INSERT INTO regle_analyse (critere_id, exigence_id, preuve_attendue_id, referentiel_version_id, code, type, libelle, severite, definition, ordre)
SELECT cr.id, ex.id, p.id, cr.referentiel_version_id, 'D5-78-R1', 'DATE_VALIDITE'::type_regle_analyse, 'Le certificat produit doit être en cours de validité', 'MOYENNE'::niveau_criticite, '{"champ": "date de fin de validité du certificat"}'::jsonb, 0
  FROM critere cr
  JOIN domaine d ON d.id = cr.domaine_id
  JOIN referentiel r ON r.id = d.referentiel_id
  JOIN _enrichissement en ON en.cible = cr.referentiel_version_id
  JOIN exigence ex ON ex.critere_id = cr.id
  JOIN preuve_attendue p ON p.exigence_id = ex.id AND p.ordre = 1
 WHERE r.code = 'SMARTEX_SUSTWAY' AND cr.code = 'D5-78';

-- SMARTEX_SUSTWAY / D5-79
UPDATE exigence ex SET intitule = 'Respect des règles de concurrence du secteur',
       enonce = 'L''organisation doit avoir identifié les règles de concurrence applicables à son secteur et disposer de dispositions internes écartant les pratiques déloyales — ententes, dénigrement, usage abusif d''informations confidentielles.',
       origine = 'CONTENU_HUMAIN'
  FROM critere cr
  JOIN domaine d ON d.id = cr.domaine_id
  JOIN referentiel r ON r.id = d.referentiel_id
  JOIN _enrichissement en ON en.cible = cr.referentiel_version_id
 WHERE ex.critere_id = cr.id AND r.code = 'SMARTEX_SUSTWAY' AND cr.code = 'D5-79';
INSERT INTO preuve_attendue (exigence_id, referentiel_version_id, type, libelle, description, obligatoire, ordre)
SELECT ex.id, ex.referentiel_version_id, 'POLITIQUE'::type_preuve_attendue, 'Dispositions internes en matière de concurrence', 'Règles de conduite commerciale et pratiques interdites.', true, 0
  FROM exigence ex
  JOIN critere cr ON cr.id = ex.critere_id
  JOIN domaine d ON d.id = cr.domaine_id
  JOIN referentiel r ON r.id = d.referentiel_id
  JOIN _enrichissement en ON en.cible = cr.referentiel_version_id
 WHERE r.code = 'SMARTEX_SUSTWAY' AND cr.code = 'D5-79';
INSERT INTO regle_analyse (critere_id, exigence_id, preuve_attendue_id, referentiel_version_id, code, type, libelle, severite, definition, ordre)
SELECT cr.id, ex.id, p.id, cr.referentiel_version_id, 'D5-79-R1', 'ELEMENT_ATTENDU'::type_regle_analyse, 'Les pratiques interdites doivent être énoncées', 'MOYENNE'::niveau_criticite, '{"elements": ["pratiques commerciales interdites", "conduites attendues des commerciaux"]}'::jsonb, 0
  FROM critere cr
  JOIN domaine d ON d.id = cr.domaine_id
  JOIN referentiel r ON r.id = d.referentiel_id
  JOIN _enrichissement en ON en.cible = cr.referentiel_version_id
  JOIN exigence ex ON ex.critere_id = cr.id
  JOIN preuve_attendue p ON p.exigence_id = ex.id AND p.ordre = 0
 WHERE r.code = 'SMARTEX_SUSTWAY' AND cr.code = 'D5-79';

-- SMARTEX_SUSTWAY / D5-80
UPDATE exigence ex SET intitule = 'Sensibilisation des fournisseurs aux impacts environnementaux',
       enonce = 'L''organisation doit porter auprès de ses fournisseurs et sous-traitants l''attente qu''ils identifient et réduisent les principaux impacts environnementaux de leurs activités, et conserver la trace de cette démarche.',
       origine = 'CONTENU_HUMAIN'
  FROM critere cr
  JOIN domaine d ON d.id = cr.domaine_id
  JOIN referentiel r ON r.id = d.referentiel_id
  JOIN _enrichissement en ON en.cible = cr.referentiel_version_id
 WHERE ex.critere_id = cr.id AND r.code = 'SMARTEX_SUSTWAY' AND cr.code = 'D5-80';
INSERT INTO preuve_attendue (exigence_id, referentiel_version_id, type, libelle, description, obligatoire, ordre)
SELECT ex.id, ex.referentiel_version_id, 'PREUVE_OPERATIONNELLE'::type_preuve_attendue, 'Trace de la démarche auprès des fournisseurs', 'Charte transmise, questionnaire, réunion ou courrier.', true, 0
  FROM exigence ex
  JOIN critere cr ON cr.id = ex.critere_id
  JOIN domaine d ON d.id = cr.domaine_id
  JOIN referentiel r ON r.id = d.referentiel_id
  JOIN _enrichissement en ON en.cible = cr.referentiel_version_id
 WHERE r.code = 'SMARTEX_SUSTWAY' AND cr.code = 'D5-80';

-- SMARTEX_SUSTWAY / D5-81
UPDATE exigence ex SET intitule = 'Sensibilisation des fournisseurs aux impacts sociaux',
       enonce = 'L''organisation doit porter auprès de ses fournisseurs et sous-traitants l''attente qu''ils identifient et réduisent les principaux impacts sociaux de leurs activités, et conserver la trace de cette démarche.',
       origine = 'CONTENU_HUMAIN'
  FROM critere cr
  JOIN domaine d ON d.id = cr.domaine_id
  JOIN referentiel r ON r.id = d.referentiel_id
  JOIN _enrichissement en ON en.cible = cr.referentiel_version_id
 WHERE ex.critere_id = cr.id AND r.code = 'SMARTEX_SUSTWAY' AND cr.code = 'D5-81';
INSERT INTO preuve_attendue (exigence_id, referentiel_version_id, type, libelle, description, obligatoire, ordre)
SELECT ex.id, ex.referentiel_version_id, 'PREUVE_OPERATIONNELLE'::type_preuve_attendue, 'Trace de la démarche auprès des fournisseurs', 'Charte transmise, questionnaire, réunion ou courrier.', true, 0
  FROM exigence ex
  JOIN critere cr ON cr.id = ex.critere_id
  JOIN domaine d ON d.id = cr.domaine_id
  JOIN referentiel r ON r.id = d.referentiel_id
  JOIN _enrichissement en ON en.cible = cr.referentiel_version_id
 WHERE r.code = 'SMARTEX_SUSTWAY' AND cr.code = 'D5-81';

-- SMARTEX_SUSTWAY / D5-82
UPDATE exigence ex SET intitule = 'Analyse des offres en coût total',
       enonce = 'L''organisation doit analyser les offres de ses fournisseurs et sous-traitants au-delà du seul prix d''achat, en prenant en compte les autres composantes du coût — logistique, usage, après-vente, durée de vie — et conserver la trace de cette analyse.',
       origine = 'CONTENU_HUMAIN'
  FROM critere cr
  JOIN domaine d ON d.id = cr.domaine_id
  JOIN referentiel r ON r.id = d.referentiel_id
  JOIN _enrichissement en ON en.cible = cr.referentiel_version_id
 WHERE ex.critere_id = cr.id AND r.code = 'SMARTEX_SUSTWAY' AND cr.code = 'D5-82';
INSERT INTO preuve_attendue (exigence_id, referentiel_version_id, type, libelle, description, obligatoire, ordre)
SELECT ex.id, ex.referentiel_version_id, 'PROCEDURE'::type_preuve_attendue, 'Méthode d''analyse des offres', 'Critères d''attribution et composantes de coût prises en compte.', true, 0
  FROM exigence ex
  JOIN critere cr ON cr.id = ex.critere_id
  JOIN domaine d ON d.id = cr.domaine_id
  JOIN referentiel r ON r.id = d.referentiel_id
  JOIN _enrichissement en ON en.cible = cr.referentiel_version_id
 WHERE r.code = 'SMARTEX_SUSTWAY' AND cr.code = 'D5-82';
INSERT INTO preuve_attendue (exigence_id, referentiel_version_id, type, libelle, description, obligatoire, ordre)
SELECT ex.id, ex.referentiel_version_id, 'RAPPORT'::type_preuve_attendue, 'Exemples d''analyses comparatives réalisées', 'Grilles de comparaison ou rapports de sélection.', false, 1
  FROM exigence ex
  JOIN critere cr ON cr.id = ex.critere_id
  JOIN domaine d ON d.id = cr.domaine_id
  JOIN referentiel r ON r.id = d.referentiel_id
  JOIN _enrichissement en ON en.cible = cr.referentiel_version_id
 WHERE r.code = 'SMARTEX_SUSTWAY' AND cr.code = 'D5-82';
INSERT INTO regle_analyse (critere_id, exigence_id, preuve_attendue_id, referentiel_version_id, code, type, libelle, severite, definition, ordre)
SELECT cr.id, ex.id, p.id, cr.referentiel_version_id, 'D5-82-R1', 'ELEMENT_ATTENDU'::type_regle_analyse, 'Les composantes du coût total doivent être identifiables', 'MOYENNE'::niveau_criticite, '{"elements": ["prix d''acquisition", "coûts logistiques", "coûts après-vente"]}'::jsonb, 0
  FROM critere cr
  JOIN domaine d ON d.id = cr.domaine_id
  JOIN referentiel r ON r.id = d.referentiel_id
  JOIN _enrichissement en ON en.cible = cr.referentiel_version_id
  JOIN exigence ex ON ex.critere_id = cr.id
  JOIN preuve_attendue p ON p.exigence_id = ex.id AND p.ordre = 0
 WHERE r.code = 'SMARTEX_SUSTWAY' AND cr.code = 'D5-82';

-- SMARTEX_SUSTWAY / D5-83
UPDATE exigence ex SET intitule = 'Critères sociaux et environnementaux dans les achats',
       enonce = 'L''organisation doit intégrer des critères sociaux et environnementaux dans son processus d''achat, et pouvoir montrer où ces critères interviennent dans la sélection des fournisseurs.',
       origine = 'CONTENU_HUMAIN'
  FROM critere cr
  JOIN domaine d ON d.id = cr.domaine_id
  JOIN referentiel r ON r.id = d.referentiel_id
  JOIN _enrichissement en ON en.cible = cr.referentiel_version_id
 WHERE ex.critere_id = cr.id AND r.code = 'SMARTEX_SUSTWAY' AND cr.code = 'D5-83';
INSERT INTO preuve_attendue (exigence_id, referentiel_version_id, type, libelle, description, obligatoire, ordre)
SELECT ex.id, ex.referentiel_version_id, 'PROCEDURE'::type_preuve_attendue, 'Processus d''achat intégrant des critères ESG', 'Critères retenus et stade auquel ils interviennent.', true, 0
  FROM exigence ex
  JOIN critere cr ON cr.id = ex.critere_id
  JOIN domaine d ON d.id = cr.domaine_id
  JOIN referentiel r ON r.id = d.referentiel_id
  JOIN _enrichissement en ON en.cible = cr.referentiel_version_id
 WHERE r.code = 'SMARTEX_SUSTWAY' AND cr.code = 'D5-83';

-- SMARTEX_SUSTWAY / D5-84
UPDATE exigence ex SET intitule = 'Politique d''achats responsables formalisée',
       enonce = 'L''organisation doit disposer d''une politique d''achats responsables écrite, fondée sur des principes environnementaux, sociaux, de gouvernance et d''éthique, validée et portée à la connaissance des acteurs concernés.',
       origine = 'CONTENU_HUMAIN'
  FROM critere cr
  JOIN domaine d ON d.id = cr.domaine_id
  JOIN referentiel r ON r.id = d.referentiel_id
  JOIN _enrichissement en ON en.cible = cr.referentiel_version_id
 WHERE ex.critere_id = cr.id AND r.code = 'SMARTEX_SUSTWAY' AND cr.code = 'D5-84';
INSERT INTO preuve_attendue (exigence_id, referentiel_version_id, type, libelle, description, obligatoire, ordre)
SELECT ex.id, ex.referentiel_version_id, 'POLITIQUE'::type_preuve_attendue, 'Politique d''achats responsables', 'Principes retenus, périmètre et responsabilités.', true, 0
  FROM exigence ex
  JOIN critere cr ON cr.id = ex.critere_id
  JOIN domaine d ON d.id = cr.domaine_id
  JOIN referentiel r ON r.id = d.referentiel_id
  JOIN _enrichissement en ON en.cible = cr.referentiel_version_id
 WHERE r.code = 'SMARTEX_SUSTWAY' AND cr.code = 'D5-84';
INSERT INTO regle_analyse (critere_id, exigence_id, preuve_attendue_id, referentiel_version_id, code, type, libelle, severite, definition, ordre)
SELECT cr.id, ex.id, p.id, cr.referentiel_version_id, 'D5-84-R1', 'ELEMENT_ATTENDU'::type_regle_analyse, 'Les quatre familles de principes doivent être couvertes', 'MOYENNE'::niveau_criticite, '{"elements": ["principes environnementaux", "principes sociaux", "principes de gouvernance", "principes éthiques"]}'::jsonb, 0
  FROM critere cr
  JOIN domaine d ON d.id = cr.domaine_id
  JOIN referentiel r ON r.id = d.referentiel_id
  JOIN _enrichissement en ON en.cible = cr.referentiel_version_id
  JOIN exigence ex ON ex.critere_id = cr.id
  JOIN preuve_attendue p ON p.exigence_id = ex.id AND p.ordre = 0
 WHERE r.code = 'SMARTEX_SUSTWAY' AND cr.code = 'D5-84';

-- SMARTEX_SUSTWAY / D5-85
UPDATE exigence ex SET intitule = 'Formation des acteurs de la chaîne d''approvisionnement',
       enonce = 'L''organisation doit former ou sensibiliser les acteurs internes de sa chaîne d''approvisionnement — achats, logistique, comptabilité fournisseurs, qualité — à sa politique d''achats responsables, et en conserver la trace.',
       origine = 'CONTENU_HUMAIN'
  FROM critere cr
  JOIN domaine d ON d.id = cr.domaine_id
  JOIN referentiel r ON r.id = d.referentiel_id
  JOIN _enrichissement en ON en.cible = cr.referentiel_version_id
 WHERE ex.critere_id = cr.id AND r.code = 'SMARTEX_SUSTWAY' AND cr.code = 'D5-85';
INSERT INTO preuve_attendue (exigence_id, referentiel_version_id, type, libelle, description, obligatoire, ordre)
SELECT ex.id, ex.referentiel_version_id, 'REGISTRE'::type_preuve_attendue, 'Trace des actions de formation ou de sensibilisation', 'Dates, thèmes et participants par fonction.', true, 0
  FROM exigence ex
  JOIN critere cr ON cr.id = ex.critere_id
  JOIN domaine d ON d.id = cr.domaine_id
  JOIN referentiel r ON r.id = d.referentiel_id
  JOIN _enrichissement en ON en.cible = cr.referentiel_version_id
 WHERE r.code = 'SMARTEX_SUSTWAY' AND cr.code = 'D5-85';

-- SMARTEX_SUSTWAY / D5-86
UPDATE exigence ex SET intitule = 'Système de management des achats responsables',
       enonce = 'L''organisation doit structurer sa démarche d''achats responsables — responsabilités, critères, évaluation des fournisseurs, revue. Le critère vise un système orienté vers les lignes directrices ISO 20400 : aucune certification n''est exigée, ces lignes directrices n''étant pas une norme certifiable.',
       origine = 'CONTENU_HUMAIN'
  FROM critere cr
  JOIN domaine d ON d.id = cr.domaine_id
  JOIN referentiel r ON r.id = d.referentiel_id
  JOIN _enrichissement en ON en.cible = cr.referentiel_version_id
 WHERE ex.critere_id = cr.id AND r.code = 'SMARTEX_SUSTWAY' AND cr.code = 'D5-86';
INSERT INTO preuve_attendue (exigence_id, referentiel_version_id, type, libelle, description, obligatoire, ordre)
SELECT ex.id, ex.referentiel_version_id, 'PROCEDURE'::type_preuve_attendue, 'Description de la démarche d''achats responsables', 'Responsabilités, critères, évaluation et revue.', true, 0
  FROM exigence ex
  JOIN critere cr ON cr.id = ex.critere_id
  JOIN domaine d ON d.id = cr.domaine_id
  JOIN referentiel r ON r.id = d.referentiel_id
  JOIN _enrichissement en ON en.cible = cr.referentiel_version_id
 WHERE r.code = 'SMARTEX_SUSTWAY' AND cr.code = 'D5-86';

-- SMARTEX_SUSTWAY / D5-87
UPDATE exigence ex SET intitule = 'Association des fournisseurs à la politique d''achats responsables',
       enonce = 'L''organisation doit associer ses fournisseurs et sous-traitants à sa politique d''achats responsables, par une charte, une clause contractuelle ou un engagement équivalent dont elle conserve la trace.',
       origine = 'CONTENU_HUMAIN'
  FROM critere cr
  JOIN domaine d ON d.id = cr.domaine_id
  JOIN referentiel r ON r.id = d.referentiel_id
  JOIN _enrichissement en ON en.cible = cr.referentiel_version_id
 WHERE ex.critere_id = cr.id AND r.code = 'SMARTEX_SUSTWAY' AND cr.code = 'D5-87';
INSERT INTO preuve_attendue (exigence_id, referentiel_version_id, type, libelle, description, obligatoire, ordre)
SELECT ex.id, ex.referentiel_version_id, 'DOCUMENT_LEGAL'::type_preuve_attendue, 'Charte fournisseurs ou clause contractuelle', 'Document transmis et, si possible, retourné signé.', true, 0
  FROM exigence ex
  JOIN critere cr ON cr.id = ex.critere_id
  JOIN domaine d ON d.id = cr.domaine_id
  JOIN referentiel r ON r.id = d.referentiel_id
  JOIN _enrichissement en ON en.cible = cr.referentiel_version_id
 WHERE r.code = 'SMARTEX_SUSTWAY' AND cr.code = 'D5-87';
INSERT INTO regle_analyse (critere_id, exigence_id, preuve_attendue_id, referentiel_version_id, code, type, libelle, severite, definition, ordre)
SELECT cr.id, ex.id, p.id, cr.referentiel_version_id, 'D5-87-R1', 'SIGNATURE'::type_regle_analyse, 'L''engagement du fournisseur doit être matérialisé', 'MOYENNE'::niveau_criticite, '{"mention_attendue": "engagement ou signature du fournisseur"}'::jsonb, 0
  FROM critere cr
  JOIN domaine d ON d.id = cr.domaine_id
  JOIN referentiel r ON r.id = d.referentiel_id
  JOIN _enrichissement en ON en.cible = cr.referentiel_version_id
  JOIN exigence ex ON ex.critere_id = cr.id
  JOIN preuve_attendue p ON p.exigence_id = ex.id AND p.ordre = 0
 WHERE r.code = 'SMARTEX_SUSTWAY' AND cr.code = 'D5-87';

-- SMARTEX_SUSTWAY / D5-88
UPDATE exigence ex SET intitule = 'Audits des fournisseurs au regard des exigences RSE',
       enonce = 'L''organisation doit conduire des audits ou évaluations de ses fournisseurs et sous-traitants au regard de ses exigences RSE, selon une périodicité ou des critères de sélection qu''elle définit, et en conserver les rapports.',
       origine = 'CONTENU_HUMAIN'
  FROM critere cr
  JOIN domaine d ON d.id = cr.domaine_id
  JOIN referentiel r ON r.id = d.referentiel_id
  JOIN _enrichissement en ON en.cible = cr.referentiel_version_id
 WHERE ex.critere_id = cr.id AND r.code = 'SMARTEX_SUSTWAY' AND cr.code = 'D5-88';
INSERT INTO preuve_attendue (exigence_id, referentiel_version_id, type, libelle, description, obligatoire, ordre)
SELECT ex.id, ex.referentiel_version_id, 'RAPPORT'::type_preuve_attendue, 'Rapports d''audit ou d''évaluation fournisseurs', 'Périmètre, constats et suites données.', true, 0
  FROM exigence ex
  JOIN critere cr ON cr.id = ex.critere_id
  JOIN domaine d ON d.id = cr.domaine_id
  JOIN referentiel r ON r.id = d.referentiel_id
  JOIN _enrichissement en ON en.cible = cr.referentiel_version_id
 WHERE r.code = 'SMARTEX_SUSTWAY' AND cr.code = 'D5-88';
INSERT INTO regle_analyse (critere_id, exigence_id, preuve_attendue_id, referentiel_version_id, code, type, libelle, severite, definition, ordre)
SELECT cr.id, ex.id, p.id, cr.referentiel_version_id, 'D5-88-R1', 'DATE_VALIDITE'::type_regle_analyse, 'Les audits doivent être récents', 'MOYENNE'::niveau_criticite, '{"champ": "date du dernier audit fournisseur"}'::jsonb, 0
  FROM critere cr
  JOIN domaine d ON d.id = cr.domaine_id
  JOIN referentiel r ON r.id = d.referentiel_id
  JOIN _enrichissement en ON en.cible = cr.referentiel_version_id
  JOIN exigence ex ON ex.critere_id = cr.id
  JOIN preuve_attendue p ON p.exigence_id = ex.id AND p.ordre = 0
 WHERE r.code = 'SMARTEX_SUSTWAY' AND cr.code = 'D5-88';

-- SMARTEX_SUSTWAY / D5-90
UPDATE exigence ex SET intitule = 'Enquêtes de satisfaction des fournisseurs',
       enonce = 'L''organisation doit recueillir l''appréciation de ses fournisseurs et sous-traitants sur la relation d''affaires — équité financière, qualité des échanges, gestion des litiges — et conserver les résultats obtenus.',
       origine = 'CONTENU_HUMAIN'
  FROM critere cr
  JOIN domaine d ON d.id = cr.domaine_id
  JOIN referentiel r ON r.id = d.referentiel_id
  JOIN _enrichissement en ON en.cible = cr.referentiel_version_id
 WHERE ex.critere_id = cr.id AND r.code = 'SMARTEX_SUSTWAY' AND cr.code = 'D5-90';
INSERT INTO preuve_attendue (exigence_id, referentiel_version_id, type, libelle, description, obligatoire, ordre)
SELECT ex.id, ex.referentiel_version_id, 'RAPPORT'::type_preuve_attendue, 'Résultats des enquêtes fournisseurs', 'Méthode, période, résultats et suites données.', true, 0
  FROM exigence ex
  JOIN critere cr ON cr.id = ex.critere_id
  JOIN domaine d ON d.id = cr.domaine_id
  JOIN referentiel r ON r.id = d.referentiel_id
  JOIN _enrichissement en ON en.cible = cr.referentiel_version_id
 WHERE r.code = 'SMARTEX_SUSTWAY' AND cr.code = 'D5-90';
INSERT INTO regle_analyse (critere_id, exigence_id, preuve_attendue_id, referentiel_version_id, code, type, libelle, severite, definition, ordre)
SELECT cr.id, ex.id, p.id, cr.referentiel_version_id, 'D5-90-R1', 'ELEMENT_ATTENDU'::type_regle_analyse, 'Les thèmes attendus doivent être couverts', 'MOYENNE'::niveau_criticite, '{"elements": ["équité financière", "qualité des échanges", "gestion des litiges"]}'::jsonb, 0
  FROM critere cr
  JOIN domaine d ON d.id = cr.domaine_id
  JOIN referentiel r ON r.id = d.referentiel_id
  JOIN _enrichissement en ON en.cible = cr.referentiel_version_id
  JOIN exigence ex ON ex.critere_id = cr.id
  JOIN preuve_attendue p ON p.exigence_id = ex.id AND p.ordre = 0
 WHERE r.code = 'SMARTEX_SUSTWAY' AND cr.code = 'D5-90';

-- SMARTEX_SUSTWAY / D6-91
UPDATE exigence ex SET intitule = 'Équipe dédiée à la RSE',
       enonce = 'L''organisation doit avoir désigné une personne ou une équipe en charge de la RSE, quelles que soient les dimensions couvertes, par une désignation écrite précisant le périmètre de la mission et les moyens affectés.',
       origine = 'CONTENU_HUMAIN'
  FROM critere cr
  JOIN domaine d ON d.id = cr.domaine_id
  JOIN referentiel r ON r.id = d.referentiel_id
  JOIN _enrichissement en ON en.cible = cr.referentiel_version_id
 WHERE ex.critere_id = cr.id AND r.code = 'SMARTEX_SUSTWAY' AND cr.code = 'D6-91';
INSERT INTO preuve_attendue (exigence_id, referentiel_version_id, type, libelle, description, obligatoire, ordre)
SELECT ex.id, ex.referentiel_version_id, 'DOCUMENT_LEGAL'::type_preuve_attendue, 'Acte de désignation de l''équipe RSE', 'Note, décision ou organigramme précisant le périmètre.', true, 0
  FROM exigence ex
  JOIN critere cr ON cr.id = ex.critere_id
  JOIN domaine d ON d.id = cr.domaine_id
  JOIN referentiel r ON r.id = d.referentiel_id
  JOIN _enrichissement en ON en.cible = cr.referentiel_version_id
 WHERE r.code = 'SMARTEX_SUSTWAY' AND cr.code = 'D6-91';
INSERT INTO regle_analyse (critere_id, exigence_id, preuve_attendue_id, referentiel_version_id, code, type, libelle, severite, definition, ordre)
SELECT cr.id, ex.id, p.id, cr.referentiel_version_id, 'D6-91-R1', 'ELEMENT_ATTENDU'::type_regle_analyse, 'La désignation doit préciser le périmètre de la mission', 'MOYENNE'::niveau_criticite, '{"elements": ["personne ou équipe désignée", "périmètre de la mission"]}'::jsonb, 0
  FROM critere cr
  JOIN domaine d ON d.id = cr.domaine_id
  JOIN referentiel r ON r.id = d.referentiel_id
  JOIN _enrichissement en ON en.cible = cr.referentiel_version_id
  JOIN exigence ex ON ex.critere_id = cr.id
  JOIN preuve_attendue p ON p.exigence_id = ex.id AND p.ordre = 0
 WHERE r.code = 'SMARTEX_SUSTWAY' AND cr.code = 'D6-91';

-- SMARTEX_SUSTWAY / D6-92
UPDATE exigence ex SET intitule = 'Publication annuelle d''un rapport RSE',
       enonce = 'L''organisation doit publier chaque année un rapport rendant compte de ses pratiques et de ses résultats en matière de RSE, de performance ESG ou de développement durable.',
       origine = 'CONTENU_HUMAIN'
  FROM critere cr
  JOIN domaine d ON d.id = cr.domaine_id
  JOIN referentiel r ON r.id = d.referentiel_id
  JOIN _enrichissement en ON en.cible = cr.referentiel_version_id
 WHERE ex.critere_id = cr.id AND r.code = 'SMARTEX_SUSTWAY' AND cr.code = 'D6-92';
INSERT INTO preuve_attendue (exigence_id, referentiel_version_id, type, libelle, description, obligatoire, ordre)
SELECT ex.id, ex.referentiel_version_id, 'RAPPORT'::type_preuve_attendue, 'Rapport RSE ou de développement durable', 'Rapport publié couvrant le dernier exercice.', true, 0
  FROM exigence ex
  JOIN critere cr ON cr.id = ex.critere_id
  JOIN domaine d ON d.id = cr.domaine_id
  JOIN referentiel r ON r.id = d.referentiel_id
  JOIN _enrichissement en ON en.cible = cr.referentiel_version_id
 WHERE r.code = 'SMARTEX_SUSTWAY' AND cr.code = 'D6-92';
INSERT INTO regle_analyse (critere_id, exigence_id, preuve_attendue_id, referentiel_version_id, code, type, libelle, severite, definition, ordre)
SELECT cr.id, ex.id, p.id, cr.referentiel_version_id, 'D6-92-R1', 'DATE_VALIDITE'::type_regle_analyse, 'Le rapport doit couvrir le dernier exercice clos', 'ELEVEE'::niveau_criticite, '{"champ": "exercice couvert par le rapport", "anciennete_maximale_mois": 24}'::jsonb, 0
  FROM critere cr
  JOIN domaine d ON d.id = cr.domaine_id
  JOIN referentiel r ON r.id = d.referentiel_id
  JOIN _enrichissement en ON en.cible = cr.referentiel_version_id
  JOIN exigence ex ON ex.critere_id = cr.id
  JOIN preuve_attendue p ON p.exigence_id = ex.id AND p.ordre = 0
 WHERE r.code = 'SMARTEX_SUSTWAY' AND cr.code = 'D6-92';

-- SMARTEX_SUSTWAY / D6-93
UPDATE exigence ex SET intitule = 'Accessibilité publique du rapport RSE',
       enonce = 'Le rapport RSE publié par l''organisation doit être accessible à toute personne souhaitant en prendre connaissance, par un canal public identifiable, et l''organisation doit pouvoir indiquer lequel.',
       origine = 'CONTENU_HUMAIN'
  FROM critere cr
  JOIN domaine d ON d.id = cr.domaine_id
  JOIN referentiel r ON r.id = d.referentiel_id
  JOIN _enrichissement en ON en.cible = cr.referentiel_version_id
 WHERE ex.critere_id = cr.id AND r.code = 'SMARTEX_SUSTWAY' AND cr.code = 'D6-93';
INSERT INTO preuve_attendue (exigence_id, referentiel_version_id, type, libelle, description, obligatoire, ordre)
SELECT ex.id, ex.referentiel_version_id, 'PREUVE_OPERATIONNELLE'::type_preuve_attendue, 'Élément attestant de l''accessibilité du rapport', 'Adresse de publication, capture de la page, mise à disposition sur demande.', true, 0
  FROM exigence ex
  JOIN critere cr ON cr.id = ex.critere_id
  JOIN domaine d ON d.id = cr.domaine_id
  JOIN referentiel r ON r.id = d.referentiel_id
  JOIN _enrichissement en ON en.cible = cr.referentiel_version_id
 WHERE r.code = 'SMARTEX_SUSTWAY' AND cr.code = 'D6-93';
INSERT INTO regle_analyse (critere_id, exigence_id, preuve_attendue_id, referentiel_version_id, code, type, libelle, severite, definition, ordre)
SELECT cr.id, ex.id, NULL, cr.referentiel_version_id, 'D6-93-R1', 'COHERENCE_DECLARATION'::type_regle_analyse, 'Le canal annoncé doit correspondre au rapport effectivement publié', 'MOYENNE'::niveau_criticite, '{"elements": ["canal de publication annoncé", "rapport effectivement accessible"]}'::jsonb, 0
  FROM critere cr
  JOIN domaine d ON d.id = cr.domaine_id
  JOIN referentiel r ON r.id = d.referentiel_id
  JOIN _enrichissement en ON en.cible = cr.referentiel_version_id
  JOIN exigence ex ON ex.critere_id = cr.id
 WHERE r.code = 'SMARTEX_SUSTWAY' AND cr.code = 'D6-93';


-- ======================= IFC_SFI =======================

-- IFC_SFI / D1-01
UPDATE exigence ex SET intitule = 'Système de gestion environnementale documenté',
       enonce = 'L''organisation doit disposer d''un système de gestion environnementale documenté, couvrant l''identification de ses impacts environnementaux, les mesures de maîtrise retenues, les responsabilités associées et le suivi de leur mise en œuvre. La documentation doit être à jour et refléter les activités réellement exercées.',
       origine = 'CONTENU_HUMAIN'
  FROM critere cr
  JOIN domaine d ON d.id = cr.domaine_id
  JOIN referentiel r ON r.id = d.referentiel_id
  JOIN _enrichissement en ON en.cible = cr.referentiel_version_id
 WHERE ex.critere_id = cr.id AND r.code = 'IFC_SFI' AND cr.code = 'D1-01';
INSERT INTO preuve_attendue (exigence_id, referentiel_version_id, type, libelle, description, obligatoire, ordre)
SELECT ex.id, ex.referentiel_version_id, 'POLITIQUE'::type_preuve_attendue, 'Politique environnementale de l''organisation', 'Document validé par la direction, énonçant les engagements environnementaux.', true, 0
  FROM exigence ex
  JOIN critere cr ON cr.id = ex.critere_id
  JOIN domaine d ON d.id = cr.domaine_id
  JOIN referentiel r ON r.id = d.referentiel_id
  JOIN _enrichissement en ON en.cible = cr.referentiel_version_id
 WHERE r.code = 'IFC_SFI' AND cr.code = 'D1-01';
INSERT INTO preuve_attendue (exigence_id, referentiel_version_id, type, libelle, description, obligatoire, ordre)
SELECT ex.id, ex.referentiel_version_id, 'PROCEDURE'::type_preuve_attendue, 'Procédures de maîtrise des impacts environnementaux', 'Procédures décrivant les dispositions opérationnelles et les responsabilités.', true, 1
  FROM exigence ex
  JOIN critere cr ON cr.id = ex.critere_id
  JOIN domaine d ON d.id = cr.domaine_id
  JOIN referentiel r ON r.id = d.referentiel_id
  JOIN _enrichissement en ON en.cible = cr.referentiel_version_id
 WHERE r.code = 'IFC_SFI' AND cr.code = 'D1-01';
INSERT INTO preuve_attendue (exigence_id, referentiel_version_id, type, libelle, description, obligatoire, ordre)
SELECT ex.id, ex.referentiel_version_id, 'REGISTRE'::type_preuve_attendue, 'Registre des impacts environnementaux identifiés', 'Recensement des impacts, de leur évaluation et des mesures associées.', false, 2
  FROM exigence ex
  JOIN critere cr ON cr.id = ex.critere_id
  JOIN domaine d ON d.id = cr.domaine_id
  JOIN referentiel r ON r.id = d.referentiel_id
  JOIN _enrichissement en ON en.cible = cr.referentiel_version_id
 WHERE r.code = 'IFC_SFI' AND cr.code = 'D1-01';
INSERT INTO regle_analyse (critere_id, exigence_id, preuve_attendue_id, referentiel_version_id, code, type, libelle, severite, definition, ordre)
SELECT cr.id, ex.id, p.id, cr.referentiel_version_id, 'D1-01-R1', 'SIGNATURE'::type_regle_analyse, 'La politique environnementale doit être validée par la direction', 'ELEVEE'::niveau_criticite, '{"mention_attendue": "validation ou approbation par la direction"}'::jsonb, 0
  FROM critere cr
  JOIN domaine d ON d.id = cr.domaine_id
  JOIN referentiel r ON r.id = d.referentiel_id
  JOIN _enrichissement en ON en.cible = cr.referentiel_version_id
  JOIN exigence ex ON ex.critere_id = cr.id
  JOIN preuve_attendue p ON p.exigence_id = ex.id AND p.ordre = 0
 WHERE r.code = 'IFC_SFI' AND cr.code = 'D1-01';
INSERT INTO regle_analyse (critere_id, exigence_id, preuve_attendue_id, referentiel_version_id, code, type, libelle, severite, definition, ordre)
SELECT cr.id, ex.id, NULL, cr.referentiel_version_id, 'D1-01-R2', 'ELEMENT_ATTENDU'::type_regle_analyse, 'Le système doit désigner des responsabilités et un suivi', 'MOYENNE'::niveau_criticite, '{"elements": ["responsabilités désignées", "modalités de suivi", "mesures de maîtrise des impacts"]}'::jsonb, 1
  FROM critere cr
  JOIN domaine d ON d.id = cr.domaine_id
  JOIN referentiel r ON r.id = d.referentiel_id
  JOIN _enrichissement en ON en.cible = cr.referentiel_version_id
  JOIN exigence ex ON ex.critere_id = cr.id
 WHERE r.code = 'IFC_SFI' AND cr.code = 'D1-01';

-- IFC_SFI / D1-02
UPDATE exigence ex SET intitule = 'Système de gestion sociale documenté',
       enonce = 'L''organisation doit disposer d''un système de gestion des aspects sociaux documenté, couvrant les conditions de travail, la santé et la sécurité, et les relations avec les personnes affectées par ses activités, avec des responsabilités identifiées et un suivi de leur mise en œuvre.',
       origine = 'CONTENU_HUMAIN'
  FROM critere cr
  JOIN domaine d ON d.id = cr.domaine_id
  JOIN referentiel r ON r.id = d.referentiel_id
  JOIN _enrichissement en ON en.cible = cr.referentiel_version_id
 WHERE ex.critere_id = cr.id AND r.code = 'IFC_SFI' AND cr.code = 'D1-02';
INSERT INTO preuve_attendue (exigence_id, referentiel_version_id, type, libelle, description, obligatoire, ordre)
SELECT ex.id, ex.referentiel_version_id, 'POLITIQUE'::type_preuve_attendue, 'Politique sociale ou de gestion des ressources humaines', 'Document validé par la direction couvrant les engagements sociaux.', true, 0
  FROM exigence ex
  JOIN critere cr ON cr.id = ex.critere_id
  JOIN domaine d ON d.id = cr.domaine_id
  JOIN referentiel r ON r.id = d.referentiel_id
  JOIN _enrichissement en ON en.cible = cr.referentiel_version_id
 WHERE r.code = 'IFC_SFI' AND cr.code = 'D1-02';
INSERT INTO preuve_attendue (exigence_id, referentiel_version_id, type, libelle, description, obligatoire, ordre)
SELECT ex.id, ex.referentiel_version_id, 'PROCEDURE'::type_preuve_attendue, 'Procédures de gestion des aspects sociaux', 'Procédures relatives aux conditions de travail et à la santé-sécurité.', true, 1
  FROM exigence ex
  JOIN critere cr ON cr.id = ex.critere_id
  JOIN domaine d ON d.id = cr.domaine_id
  JOIN referentiel r ON r.id = d.referentiel_id
  JOIN _enrichissement en ON en.cible = cr.referentiel_version_id
 WHERE r.code = 'IFC_SFI' AND cr.code = 'D1-02';
INSERT INTO regle_analyse (critere_id, exigence_id, preuve_attendue_id, referentiel_version_id, code, type, libelle, severite, definition, ordre)
SELECT cr.id, ex.id, NULL, cr.referentiel_version_id, 'D1-02-R1', 'ELEMENT_ATTENDU'::type_regle_analyse, 'Le système doit couvrir travail, santé-sécurité et parties affectées', 'MOYENNE'::niveau_criticite, '{"elements": ["conditions de travail", "santé et sécurité au travail", "relations avec les personnes affectées"]}'::jsonb, 0
  FROM critere cr
  JOIN domaine d ON d.id = cr.domaine_id
  JOIN referentiel r ON r.id = d.referentiel_id
  JOIN _enrichissement en ON en.cible = cr.referentiel_version_id
  JOIN exigence ex ON ex.critere_id = cr.id
 WHERE r.code = 'IFC_SFI' AND cr.code = 'D1-02';

-- IFC_SFI / D1-03
UPDATE exigence ex SET intitule = 'Étude d''impact préalable aux projets',
       enonce = 'Lorsque l''organisation engage un projet susceptible d''avoir des impacts environnementaux ou sociaux, elle doit conduire une étude d''impact avant le démarrage des travaux, et en conserver le rapport ainsi que les mesures d''atténuation qui en découlent. L''étendue de l''étude dépend de la nature du projet et des obligations applicables localement.',
       origine = 'CONTENU_HUMAIN'
  FROM critere cr
  JOIN domaine d ON d.id = cr.domaine_id
  JOIN referentiel r ON r.id = d.referentiel_id
  JOIN _enrichissement en ON en.cible = cr.referentiel_version_id
 WHERE ex.critere_id = cr.id AND r.code = 'IFC_SFI' AND cr.code = 'D1-03';
INSERT INTO preuve_attendue (exigence_id, referentiel_version_id, type, libelle, description, obligatoire, ordre)
SELECT ex.id, ex.referentiel_version_id, 'RAPPORT'::type_preuve_attendue, 'Étude d''impact environnemental et social', 'Rapport d''étude daté, antérieur au démarrage du projet concerné.', true, 0
  FROM exigence ex
  JOIN critere cr ON cr.id = ex.critere_id
  JOIN domaine d ON d.id = cr.domaine_id
  JOIN referentiel r ON r.id = d.referentiel_id
  JOIN _enrichissement en ON en.cible = cr.referentiel_version_id
 WHERE r.code = 'IFC_SFI' AND cr.code = 'D1-03';
INSERT INTO preuve_attendue (exigence_id, referentiel_version_id, type, libelle, description, obligatoire, ordre)
SELECT ex.id, ex.referentiel_version_id, 'DOCUMENT_LEGAL'::type_preuve_attendue, 'Autorisation ou avis de l''autorité compétente', 'Lorsque la réglementation locale en prévoit une.', false, 1
  FROM exigence ex
  JOIN critere cr ON cr.id = ex.critere_id
  JOIN domaine d ON d.id = cr.domaine_id
  JOIN referentiel r ON r.id = d.referentiel_id
  JOIN _enrichissement en ON en.cible = cr.referentiel_version_id
 WHERE r.code = 'IFC_SFI' AND cr.code = 'D1-03';
INSERT INTO regle_analyse (critere_id, exigence_id, preuve_attendue_id, referentiel_version_id, code, type, libelle, severite, definition, ordre)
SELECT cr.id, ex.id, p.id, cr.referentiel_version_id, 'D1-03-R1', 'DATE_VALIDITE'::type_regle_analyse, 'L''étude doit être antérieure au démarrage du projet', 'ELEVEE'::niveau_criticite, '{"champ": "date de l''étude d''impact"}'::jsonb, 0
  FROM critere cr
  JOIN domaine d ON d.id = cr.domaine_id
  JOIN referentiel r ON r.id = d.referentiel_id
  JOIN _enrichissement en ON en.cible = cr.referentiel_version_id
  JOIN exigence ex ON ex.critere_id = cr.id
  JOIN preuve_attendue p ON p.exigence_id = ex.id AND p.ordre = 0
 WHERE r.code = 'IFC_SFI' AND cr.code = 'D1-03';
INSERT INTO regle_analyse (critere_id, exigence_id, preuve_attendue_id, referentiel_version_id, code, type, libelle, severite, definition, ordre)
SELECT cr.id, ex.id, p.id, cr.referentiel_version_id, 'D1-03-R2', 'ELEMENT_ATTENDU'::type_regle_analyse, 'L''étude doit énoncer des mesures d''atténuation', 'MOYENNE'::niveau_criticite, '{"elements": ["mesures d''atténuation", "impacts identifiés"]}'::jsonb, 1
  FROM critere cr
  JOIN domaine d ON d.id = cr.domaine_id
  JOIN referentiel r ON r.id = d.referentiel_id
  JOIN _enrichissement en ON en.cible = cr.referentiel_version_id
  JOIN exigence ex ON ex.critere_id = cr.id
  JOIN preuve_attendue p ON p.exigence_id = ex.id AND p.ordre = 0
 WHERE r.code = 'IFC_SFI' AND cr.code = 'D1-03';

-- IFC_SFI / D1-04
UPDATE exigence ex SET intitule = 'Plan de suivi et reporting périodique',
       enonce = 'L''organisation doit disposer d''un dispositif de suivi de sa performance environnementale et sociale, précisant les indicateurs suivis, leur périodicité et les destinataires du reporting, et produire effectivement ces rapports selon la périodicité annoncée.',
       origine = 'CONTENU_HUMAIN'
  FROM critere cr
  JOIN domaine d ON d.id = cr.domaine_id
  JOIN referentiel r ON r.id = d.referentiel_id
  JOIN _enrichissement en ON en.cible = cr.referentiel_version_id
 WHERE ex.critere_id = cr.id AND r.code = 'IFC_SFI' AND cr.code = 'D1-04';
INSERT INTO preuve_attendue (exigence_id, referentiel_version_id, type, libelle, description, obligatoire, ordre)
SELECT ex.id, ex.referentiel_version_id, 'PROCEDURE'::type_preuve_attendue, 'Plan de suivi et de reporting', 'Document précisant indicateurs, périodicité et destinataires.', true, 0
  FROM exigence ex
  JOIN critere cr ON cr.id = ex.critere_id
  JOIN domaine d ON d.id = cr.domaine_id
  JOIN referentiel r ON r.id = d.referentiel_id
  JOIN _enrichissement en ON en.cible = cr.referentiel_version_id
 WHERE r.code = 'IFC_SFI' AND cr.code = 'D1-04';
INSERT INTO preuve_attendue (exigence_id, referentiel_version_id, type, libelle, description, obligatoire, ordre)
SELECT ex.id, ex.referentiel_version_id, 'RAPPORT'::type_preuve_attendue, 'Rapports de suivi produits sur la période', 'Rapports effectivement établis, attestant que le plan est appliqué.', true, 1
  FROM exigence ex
  JOIN critere cr ON cr.id = ex.critere_id
  JOIN domaine d ON d.id = cr.domaine_id
  JOIN referentiel r ON r.id = d.referentiel_id
  JOIN _enrichissement en ON en.cible = cr.referentiel_version_id
 WHERE r.code = 'IFC_SFI' AND cr.code = 'D1-04';
INSERT INTO regle_analyse (critere_id, exigence_id, preuve_attendue_id, referentiel_version_id, code, type, libelle, severite, definition, ordre)
SELECT cr.id, ex.id, NULL, cr.referentiel_version_id, 'D1-04-R1', 'COHERENCE_DECLARATION'::type_regle_analyse, 'Les rapports produits doivent correspondre à la périodicité annoncée', 'MOYENNE'::niveau_criticite, '{"elements": ["périodicité annoncée dans le plan", "dates des rapports effectivement produits"]}'::jsonb, 0
  FROM critere cr
  JOIN domaine d ON d.id = cr.domaine_id
  JOIN referentiel r ON r.id = d.referentiel_id
  JOIN _enrichissement en ON en.cible = cr.referentiel_version_id
  JOIN exigence ex ON ex.critere_id = cr.id
 WHERE r.code = 'IFC_SFI' AND cr.code = 'D1-04';

-- IFC_SFI / D2-05
UPDATE exigence ex SET intitule = 'Absence de travail forcé dans les relations de travail',
       enonce = 'L''organisation doit s''assurer qu''aucune de ses relations de travail ne relève du travail forcé ou obligatoire : engagement librement consenti, liberté de quitter l''emploi, absence de rétention de documents d''identité ou de cautions. Cet engagement doit être formalisé et opposable, y compris dans les contrats.',
       origine = 'CONTENU_HUMAIN'
  FROM critere cr
  JOIN domaine d ON d.id = cr.domaine_id
  JOIN referentiel r ON r.id = d.referentiel_id
  JOIN _enrichissement en ON en.cible = cr.referentiel_version_id
 WHERE ex.critere_id = cr.id AND r.code = 'IFC_SFI' AND cr.code = 'D2-05';
INSERT INTO preuve_attendue (exigence_id, referentiel_version_id, type, libelle, description, obligatoire, ordre)
SELECT ex.id, ex.referentiel_version_id, 'POLITIQUE'::type_preuve_attendue, 'Engagement écrit contre le travail forcé', 'Politique ou clause contractuelle interdisant le travail forcé.', true, 0
  FROM exigence ex
  JOIN critere cr ON cr.id = ex.critere_id
  JOIN domaine d ON d.id = cr.domaine_id
  JOIN referentiel r ON r.id = d.referentiel_id
  JOIN _enrichissement en ON en.cible = cr.referentiel_version_id
 WHERE r.code = 'IFC_SFI' AND cr.code = 'D2-05';
INSERT INTO preuve_attendue (exigence_id, referentiel_version_id, type, libelle, description, obligatoire, ordre)
SELECT ex.id, ex.referentiel_version_id, 'DOCUMENT_LEGAL'::type_preuve_attendue, 'Modèle de contrat de travail', 'Permet de vérifier les conditions d''engagement et de rupture.', false, 1
  FROM exigence ex
  JOIN critere cr ON cr.id = ex.critere_id
  JOIN domaine d ON d.id = cr.domaine_id
  JOIN referentiel r ON r.id = d.referentiel_id
  JOIN _enrichissement en ON en.cible = cr.referentiel_version_id
 WHERE r.code = 'IFC_SFI' AND cr.code = 'D2-05';
INSERT INTO regle_analyse (critere_id, exigence_id, preuve_attendue_id, referentiel_version_id, code, type, libelle, severite, definition, ordre)
SELECT cr.id, ex.id, NULL, cr.referentiel_version_id, 'D2-05-R1', 'ELEMENT_ATTENDU'::type_regle_analyse, 'Rechercher les garanties contre le travail forcé', 'ELEVEE'::niveau_criticite, '{"elements": ["consentement libre à l''embauche", "liberté de quitter l''emploi", "absence de rétention de documents d''identité", "absence de caution financière exigée du salarié"]}'::jsonb, 0
  FROM critere cr
  JOIN domaine d ON d.id = cr.domaine_id
  JOIN referentiel r ON r.id = d.referentiel_id
  JOIN _enrichissement en ON en.cible = cr.referentiel_version_id
  JOIN exigence ex ON ex.critere_id = cr.id
 WHERE r.code = 'IFC_SFI' AND cr.code = 'D2-05';

-- IFC_SFI / D2-06
UPDATE exigence ex SET intitule = 'Absence de travail des enfants',
       enonce = 'L''organisation doit s''assurer qu''aucune personne n''ayant pas atteint l''âge minimum d''admission à l''emploi fixé par la législation applicable n''est employée, et disposer d''un dispositif de vérification de l''âge à l''embauche.',
       origine = 'CONTENU_HUMAIN'
  FROM critere cr
  JOIN domaine d ON d.id = cr.domaine_id
  JOIN referentiel r ON r.id = d.referentiel_id
  JOIN _enrichissement en ON en.cible = cr.referentiel_version_id
 WHERE ex.critere_id = cr.id AND r.code = 'IFC_SFI' AND cr.code = 'D2-06';
INSERT INTO preuve_attendue (exigence_id, referentiel_version_id, type, libelle, description, obligatoire, ordre)
SELECT ex.id, ex.referentiel_version_id, 'POLITIQUE'::type_preuve_attendue, 'Engagement écrit contre le travail des enfants', 'Politique ou clause contractuelle fixant l''âge minimum d''embauche.', true, 0
  FROM exigence ex
  JOIN critere cr ON cr.id = ex.critere_id
  JOIN domaine d ON d.id = cr.domaine_id
  JOIN referentiel r ON r.id = d.referentiel_id
  JOIN _enrichissement en ON en.cible = cr.referentiel_version_id
 WHERE r.code = 'IFC_SFI' AND cr.code = 'D2-06';
INSERT INTO preuve_attendue (exigence_id, referentiel_version_id, type, libelle, description, obligatoire, ordre)
SELECT ex.id, ex.referentiel_version_id, 'PROCEDURE'::type_preuve_attendue, 'Procédure de vérification de l''âge à l''embauche', 'Décrit les pièces exigées et le contrôle effectué.', true, 1
  FROM exigence ex
  JOIN critere cr ON cr.id = ex.critere_id
  JOIN domaine d ON d.id = cr.domaine_id
  JOIN referentiel r ON r.id = d.referentiel_id
  JOIN _enrichissement en ON en.cible = cr.referentiel_version_id
 WHERE r.code = 'IFC_SFI' AND cr.code = 'D2-06';
INSERT INTO regle_analyse (critere_id, exigence_id, preuve_attendue_id, referentiel_version_id, code, type, libelle, severite, definition, ordre)
SELECT cr.id, ex.id, p.id, cr.referentiel_version_id, 'D2-06-R1', 'PRESENCE'::type_regle_analyse, 'Un dispositif de vérification de l''âge doit être décrit', 'ELEVEE'::niveau_criticite, '{"elements": ["vérification de l''âge", "pièces justificatives exigées"]}'::jsonb, 0
  FROM critere cr
  JOIN domaine d ON d.id = cr.domaine_id
  JOIN referentiel r ON r.id = d.referentiel_id
  JOIN _enrichissement en ON en.cible = cr.referentiel_version_id
  JOIN exigence ex ON ex.critere_id = cr.id
  JOIN preuve_attendue p ON p.exigence_id = ex.id AND p.ordre = 1
 WHERE r.code = 'IFC_SFI' AND cr.code = 'D2-06';

-- IFC_SFI / D2-07
UPDATE exigence ex SET intitule = 'Formation santé et sécurité des employés',
       enonce = 'L''organisation doit former ses employés aux risques de santé et de sécurité liés à leur poste, et conserver la trace des formations dispensées : contenu, dates et participants.',
       origine = 'CONTENU_HUMAIN'
  FROM critere cr
  JOIN domaine d ON d.id = cr.domaine_id
  JOIN referentiel r ON r.id = d.referentiel_id
  JOIN _enrichissement en ON en.cible = cr.referentiel_version_id
 WHERE ex.critere_id = cr.id AND r.code = 'IFC_SFI' AND cr.code = 'D2-07';
INSERT INTO preuve_attendue (exigence_id, referentiel_version_id, type, libelle, description, obligatoire, ordre)
SELECT ex.id, ex.referentiel_version_id, 'REGISTRE'::type_preuve_attendue, 'Registre des formations santé-sécurité', 'Dates, thèmes et participants aux sessions dispensées.', true, 0
  FROM exigence ex
  JOIN critere cr ON cr.id = ex.critere_id
  JOIN domaine d ON d.id = cr.domaine_id
  JOIN referentiel r ON r.id = d.referentiel_id
  JOIN _enrichissement en ON en.cible = cr.referentiel_version_id
 WHERE r.code = 'IFC_SFI' AND cr.code = 'D2-07';
INSERT INTO preuve_attendue (exigence_id, referentiel_version_id, type, libelle, description, obligatoire, ordre)
SELECT ex.id, ex.referentiel_version_id, 'PROCEDURE'::type_preuve_attendue, 'Programme ou plan de formation santé-sécurité', 'Décrit les formations prévues et leur périodicité.', false, 1
  FROM exigence ex
  JOIN critere cr ON cr.id = ex.critere_id
  JOIN domaine d ON d.id = cr.domaine_id
  JOIN referentiel r ON r.id = d.referentiel_id
  JOIN _enrichissement en ON en.cible = cr.referentiel_version_id
 WHERE r.code = 'IFC_SFI' AND cr.code = 'D2-07';
INSERT INTO regle_analyse (critere_id, exigence_id, preuve_attendue_id, referentiel_version_id, code, type, libelle, severite, definition, ordre)
SELECT cr.id, ex.id, p.id, cr.referentiel_version_id, 'D2-07-R1', 'ELEMENT_ATTENDU'::type_regle_analyse, 'Le registre doit identifier dates, thèmes et participants', 'MOYENNE'::niveau_criticite, '{"elements": ["dates des sessions", "thèmes traités", "participants"]}'::jsonb, 0
  FROM critere cr
  JOIN domaine d ON d.id = cr.domaine_id
  JOIN referentiel r ON r.id = d.referentiel_id
  JOIN _enrichissement en ON en.cible = cr.referentiel_version_id
  JOIN exigence ex ON ex.critere_id = cr.id
  JOIN preuve_attendue p ON p.exigence_id = ex.id AND p.ordre = 0
 WHERE r.code = 'IFC_SFI' AND cr.code = 'D2-07';
INSERT INTO regle_analyse (critere_id, exigence_id, preuve_attendue_id, referentiel_version_id, code, type, libelle, severite, definition, ordre)
SELECT cr.id, ex.id, p.id, cr.referentiel_version_id, 'D2-07-R2', 'DATE_VALIDITE'::type_regle_analyse, 'Les formations doivent être récentes', 'MOYENNE'::niveau_criticite, '{"champ": "date de la dernière session de formation"}'::jsonb, 1
  FROM critere cr
  JOIN domaine d ON d.id = cr.domaine_id
  JOIN referentiel r ON r.id = d.referentiel_id
  JOIN _enrichissement en ON en.cible = cr.referentiel_version_id
  JOIN exigence ex ON ex.critere_id = cr.id
  JOIN preuve_attendue p ON p.exigence_id = ex.id AND p.ordre = 0
 WHERE r.code = 'IFC_SFI' AND cr.code = 'D2-07';

-- IFC_SFI / D2-08
UPDATE exigence ex SET intitule = 'Mécanisme de plainte accessible aux travailleurs',
       enonce = 'L''organisation doit mettre à la disposition de ses travailleurs un mécanisme de plainte accessible, dont les modalités de saisine et de traitement sont portées à leur connaissance, et conserver la trace des plaintes reçues et de leur suite.',
       origine = 'CONTENU_HUMAIN'
  FROM critere cr
  JOIN domaine d ON d.id = cr.domaine_id
  JOIN referentiel r ON r.id = d.referentiel_id
  JOIN _enrichissement en ON en.cible = cr.referentiel_version_id
 WHERE ex.critere_id = cr.id AND r.code = 'IFC_SFI' AND cr.code = 'D2-08';
INSERT INTO preuve_attendue (exigence_id, referentiel_version_id, type, libelle, description, obligatoire, ordre)
SELECT ex.id, ex.referentiel_version_id, 'PROCEDURE'::type_preuve_attendue, 'Procédure de traitement des plaintes des travailleurs', 'Modalités de saisine, délais et responsabilités de traitement.', true, 0
  FROM exigence ex
  JOIN critere cr ON cr.id = ex.critere_id
  JOIN domaine d ON d.id = cr.domaine_id
  JOIN referentiel r ON r.id = d.referentiel_id
  JOIN _enrichissement en ON en.cible = cr.referentiel_version_id
 WHERE r.code = 'IFC_SFI' AND cr.code = 'D2-08';
INSERT INTO preuve_attendue (exigence_id, referentiel_version_id, type, libelle, description, obligatoire, ordre)
SELECT ex.id, ex.referentiel_version_id, 'REGISTRE'::type_preuve_attendue, 'Registre des plaintes reçues et de leur traitement', 'Trace des saisines et des suites données, éventuellement anonymisée.', false, 1
  FROM exigence ex
  JOIN critere cr ON cr.id = ex.critere_id
  JOIN domaine d ON d.id = cr.domaine_id
  JOIN referentiel r ON r.id = d.referentiel_id
  JOIN _enrichissement en ON en.cible = cr.referentiel_version_id
 WHERE r.code = 'IFC_SFI' AND cr.code = 'D2-08';
INSERT INTO regle_analyse (critere_id, exigence_id, preuve_attendue_id, referentiel_version_id, code, type, libelle, severite, definition, ordre)
SELECT cr.id, ex.id, p.id, cr.referentiel_version_id, 'D2-08-R1', 'ELEMENT_ATTENDU'::type_regle_analyse, 'La procédure doit préciser saisine, délais et suites', 'MOYENNE'::niveau_criticite, '{"elements": ["modalités de saisine", "délai de traitement", "suites données"]}'::jsonb, 0
  FROM critere cr
  JOIN domaine d ON d.id = cr.domaine_id
  JOIN referentiel r ON r.id = d.referentiel_id
  JOIN _enrichissement en ON en.cible = cr.referentiel_version_id
  JOIN exigence ex ON ex.critere_id = cr.id
  JOIN preuve_attendue p ON p.exigence_id = ex.id AND p.ordre = 0
 WHERE r.code = 'IFC_SFI' AND cr.code = 'D2-08';

-- IFC_SFI / D2-09
UPDATE exigence ex SET intitule = 'Mécanisme de résolution des conflits du travail',
       enonce = 'L''organisation doit disposer d''un dispositif de résolution des différends avec ses travailleurs, distinct ou complémentaire du mécanisme de plainte, et en décrire les étapes ainsi que les personnes qui en ont la charge.',
       origine = 'CONTENU_HUMAIN'
  FROM critere cr
  JOIN domaine d ON d.id = cr.domaine_id
  JOIN referentiel r ON r.id = d.referentiel_id
  JOIN _enrichissement en ON en.cible = cr.referentiel_version_id
 WHERE ex.critere_id = cr.id AND r.code = 'IFC_SFI' AND cr.code = 'D2-09';
INSERT INTO preuve_attendue (exigence_id, referentiel_version_id, type, libelle, description, obligatoire, ordre)
SELECT ex.id, ex.referentiel_version_id, 'PROCEDURE'::type_preuve_attendue, 'Procédure de résolution des conflits du travail', 'Étapes, interlocuteurs et modalités de recours.', true, 0
  FROM exigence ex
  JOIN critere cr ON cr.id = ex.critere_id
  JOIN domaine d ON d.id = cr.domaine_id
  JOIN referentiel r ON r.id = d.referentiel_id
  JOIN _enrichissement en ON en.cible = cr.referentiel_version_id
 WHERE r.code = 'IFC_SFI' AND cr.code = 'D2-09';

-- IFC_SFI / D3-10
UPDATE exigence ex SET intitule = 'Mesure et maîtrise de la consommation d''énergie',
       enonce = 'L''organisation doit mesurer sa consommation d''énergie de façon régulière et disposer d''un objectif de maîtrise ou de réduction de cette consommation, assorti du suivi permettant d''en constater l''évolution.',
       origine = 'CONTENU_HUMAIN'
  FROM critere cr
  JOIN domaine d ON d.id = cr.domaine_id
  JOIN referentiel r ON r.id = d.referentiel_id
  JOIN _enrichissement en ON en.cible = cr.referentiel_version_id
 WHERE ex.critere_id = cr.id AND r.code = 'IFC_SFI' AND cr.code = 'D3-10';
INSERT INTO preuve_attendue (exigence_id, referentiel_version_id, type, libelle, description, obligatoire, ordre)
SELECT ex.id, ex.referentiel_version_id, 'INDICATEUR'::type_preuve_attendue, 'Relevés de consommation d''énergie', 'Données de consommation sur plusieurs périodes comparables.', true, 0
  FROM exigence ex
  JOIN critere cr ON cr.id = ex.critere_id
  JOIN domaine d ON d.id = cr.domaine_id
  JOIN referentiel r ON r.id = d.referentiel_id
  JOIN _enrichissement en ON en.cible = cr.referentiel_version_id
 WHERE r.code = 'IFC_SFI' AND cr.code = 'D3-10';
INSERT INTO preuve_attendue (exigence_id, referentiel_version_id, type, libelle, description, obligatoire, ordre)
SELECT ex.id, ex.referentiel_version_id, 'RAPPORT'::type_preuve_attendue, 'Objectif de maîtrise ou de réduction et suivi associé', 'Document énonçant l''objectif retenu et l''avancement constaté.', false, 1
  FROM exigence ex
  JOIN critere cr ON cr.id = ex.critere_id
  JOIN domaine d ON d.id = cr.domaine_id
  JOIN referentiel r ON r.id = d.referentiel_id
  JOIN _enrichissement en ON en.cible = cr.referentiel_version_id
 WHERE r.code = 'IFC_SFI' AND cr.code = 'D3-10';
INSERT INTO regle_analyse (critere_id, exigence_id, preuve_attendue_id, referentiel_version_id, code, type, libelle, severite, definition, ordre)
SELECT cr.id, ex.id, p.id, cr.referentiel_version_id, 'D3-10-R1', 'PRESENCE'::type_regle_analyse, 'Des relevés de consommation doivent être fournis', 'ELEVEE'::niveau_criticite, '{"elements": ["consommation d''énergie", "périodes de relevé"]}'::jsonb, 0
  FROM critere cr
  JOIN domaine d ON d.id = cr.domaine_id
  JOIN referentiel r ON r.id = d.referentiel_id
  JOIN _enrichissement en ON en.cible = cr.referentiel_version_id
  JOIN exigence ex ON ex.critere_id = cr.id
  JOIN preuve_attendue p ON p.exigence_id = ex.id AND p.ordre = 0
 WHERE r.code = 'IFC_SFI' AND cr.code = 'D3-10';
INSERT INTO regle_analyse (critere_id, exigence_id, preuve_attendue_id, referentiel_version_id, code, type, libelle, severite, definition, ordre)
SELECT cr.id, ex.id, NULL, cr.referentiel_version_id, 'D3-10-R2', 'COHERENCE_DECLARATION'::type_regle_analyse, 'L''objectif déclaré doit se retrouver dans les données fournies', 'MOYENNE'::niveau_criticite, '{"elements": ["objectif de réduction déclaré", "évolution constatée dans les relevés"]}'::jsonb, 1
  FROM critere cr
  JOIN domaine d ON d.id = cr.domaine_id
  JOIN referentiel r ON r.id = d.referentiel_id
  JOIN _enrichissement en ON en.cible = cr.referentiel_version_id
  JOIN exigence ex ON ex.critere_id = cr.id
 WHERE r.code = 'IFC_SFI' AND cr.code = 'D3-10';

-- IFC_SFI / D3-11
UPDATE exigence ex SET intitule = 'Mesure et maîtrise de la consommation d''eau',
       enonce = 'L''organisation doit mesurer sa consommation d''eau de façon régulière et disposer d''un objectif de maîtrise ou de réduction de cette consommation, assorti du suivi permettant d''en constater l''évolution.',
       origine = 'CONTENU_HUMAIN'
  FROM critere cr
  JOIN domaine d ON d.id = cr.domaine_id
  JOIN referentiel r ON r.id = d.referentiel_id
  JOIN _enrichissement en ON en.cible = cr.referentiel_version_id
 WHERE ex.critere_id = cr.id AND r.code = 'IFC_SFI' AND cr.code = 'D3-11';
INSERT INTO preuve_attendue (exigence_id, referentiel_version_id, type, libelle, description, obligatoire, ordre)
SELECT ex.id, ex.referentiel_version_id, 'INDICATEUR'::type_preuve_attendue, 'Relevés de consommation d''eau', 'Données de consommation sur plusieurs périodes comparables.', true, 0
  FROM exigence ex
  JOIN critere cr ON cr.id = ex.critere_id
  JOIN domaine d ON d.id = cr.domaine_id
  JOIN referentiel r ON r.id = d.referentiel_id
  JOIN _enrichissement en ON en.cible = cr.referentiel_version_id
 WHERE r.code = 'IFC_SFI' AND cr.code = 'D3-11';
INSERT INTO preuve_attendue (exigence_id, referentiel_version_id, type, libelle, description, obligatoire, ordre)
SELECT ex.id, ex.referentiel_version_id, 'RAPPORT'::type_preuve_attendue, 'Objectif de maîtrise ou de réduction et suivi associé', 'Document énonçant l''objectif retenu et l''avancement constaté.', false, 1
  FROM exigence ex
  JOIN critere cr ON cr.id = ex.critere_id
  JOIN domaine d ON d.id = cr.domaine_id
  JOIN referentiel r ON r.id = d.referentiel_id
  JOIN _enrichissement en ON en.cible = cr.referentiel_version_id
 WHERE r.code = 'IFC_SFI' AND cr.code = 'D3-11';
INSERT INTO regle_analyse (critere_id, exigence_id, preuve_attendue_id, referentiel_version_id, code, type, libelle, severite, definition, ordre)
SELECT cr.id, ex.id, p.id, cr.referentiel_version_id, 'D3-11-R1', 'PRESENCE'::type_regle_analyse, 'Des relevés de consommation doivent être fournis', 'ELEVEE'::niveau_criticite, '{"elements": ["consommation d''eau", "périodes de relevé"]}'::jsonb, 0
  FROM critere cr
  JOIN domaine d ON d.id = cr.domaine_id
  JOIN referentiel r ON r.id = d.referentiel_id
  JOIN _enrichissement en ON en.cible = cr.referentiel_version_id
  JOIN exigence ex ON ex.critere_id = cr.id
  JOIN preuve_attendue p ON p.exigence_id = ex.id AND p.ordre = 0
 WHERE r.code = 'IFC_SFI' AND cr.code = 'D3-11';

-- IFC_SFI / D3-14
UPDATE exigence ex SET intitule = 'Tri des déchets à la source',
       enonce = 'L''organisation doit trier ses déchets par catégorie à la source, disposer des moyens matériels correspondants et avoir porté les consignes de tri à la connaissance des personnes concernées.',
       origine = 'CONTENU_HUMAIN'
  FROM critere cr
  JOIN domaine d ON d.id = cr.domaine_id
  JOIN referentiel r ON r.id = d.referentiel_id
  JOIN _enrichissement en ON en.cible = cr.referentiel_version_id
 WHERE ex.critere_id = cr.id AND r.code = 'IFC_SFI' AND cr.code = 'D3-14';
INSERT INTO preuve_attendue (exigence_id, referentiel_version_id, type, libelle, description, obligatoire, ordre)
SELECT ex.id, ex.referentiel_version_id, 'PROCEDURE'::type_preuve_attendue, 'Consignes de tri des déchets', 'Document décrivant les catégories triées et les modalités.', true, 0
  FROM exigence ex
  JOIN critere cr ON cr.id = ex.critere_id
  JOIN domaine d ON d.id = cr.domaine_id
  JOIN referentiel r ON r.id = d.referentiel_id
  JOIN _enrichissement en ON en.cible = cr.referentiel_version_id
 WHERE r.code = 'IFC_SFI' AND cr.code = 'D3-14';
INSERT INTO preuve_attendue (exigence_id, referentiel_version_id, type, libelle, description, obligatoire, ordre)
SELECT ex.id, ex.referentiel_version_id, 'PREUVE_OPERATIONNELLE'::type_preuve_attendue, 'Éléments attestant du tri effectif', 'Photographies des points de collecte, signalétique, bordereaux par flux.', false, 1
  FROM exigence ex
  JOIN critere cr ON cr.id = ex.critere_id
  JOIN domaine d ON d.id = cr.domaine_id
  JOIN referentiel r ON r.id = d.referentiel_id
  JOIN _enrichissement en ON en.cible = cr.referentiel_version_id
 WHERE r.code = 'IFC_SFI' AND cr.code = 'D3-14';
INSERT INTO regle_analyse (critere_id, exigence_id, preuve_attendue_id, referentiel_version_id, code, type, libelle, severite, definition, ordre)
SELECT cr.id, ex.id, p.id, cr.referentiel_version_id, 'D3-14-R1', 'ELEMENT_ATTENDU'::type_regle_analyse, 'Les catégories de déchets triés doivent être identifiées', 'MOYENNE'::niveau_criticite, '{"elements": ["catégories de déchets", "modalités de tri"]}'::jsonb, 0
  FROM critere cr
  JOIN domaine d ON d.id = cr.domaine_id
  JOIN referentiel r ON r.id = d.referentiel_id
  JOIN _enrichissement en ON en.cible = cr.referentiel_version_id
  JOIN exigence ex ON ex.critere_id = cr.id
  JOIN preuve_attendue p ON p.exigence_id = ex.id AND p.ordre = 0
 WHERE r.code = 'IFC_SFI' AND cr.code = 'D3-14';

-- IFC_SFI / D3-15
UPDATE exigence ex SET intitule = 'Recyclage ou valorisation des déchets',
       enonce = 'L''organisation doit orienter ses déchets vers le recyclage ou la valorisation lorsque des filières existent et sont accessibles, et conserver la trace des quantités remises et des prestataires sollicités.',
       origine = 'CONTENU_HUMAIN'
  FROM critere cr
  JOIN domaine d ON d.id = cr.domaine_id
  JOIN referentiel r ON r.id = d.referentiel_id
  JOIN _enrichissement en ON en.cible = cr.referentiel_version_id
 WHERE ex.critere_id = cr.id AND r.code = 'IFC_SFI' AND cr.code = 'D3-15';
INSERT INTO preuve_attendue (exigence_id, referentiel_version_id, type, libelle, description, obligatoire, ordre)
SELECT ex.id, ex.referentiel_version_id, 'REGISTRE'::type_preuve_attendue, 'Registre des enlèvements de déchets', 'Quantités par flux, dates et destination.', true, 0
  FROM exigence ex
  JOIN critere cr ON cr.id = ex.critere_id
  JOIN domaine d ON d.id = cr.domaine_id
  JOIN referentiel r ON r.id = d.referentiel_id
  JOIN _enrichissement en ON en.cible = cr.referentiel_version_id
 WHERE r.code = 'IFC_SFI' AND cr.code = 'D3-15';
INSERT INTO preuve_attendue (exigence_id, referentiel_version_id, type, libelle, description, obligatoire, ordre)
SELECT ex.id, ex.referentiel_version_id, 'DOCUMENT_LEGAL'::type_preuve_attendue, 'Contrat ou attestation du prestataire de collecte', 'Identifie la filière de traitement retenue.', false, 1
  FROM exigence ex
  JOIN critere cr ON cr.id = ex.critere_id
  JOIN domaine d ON d.id = cr.domaine_id
  JOIN referentiel r ON r.id = d.referentiel_id
  JOIN _enrichissement en ON en.cible = cr.referentiel_version_id
 WHERE r.code = 'IFC_SFI' AND cr.code = 'D3-15';
INSERT INTO regle_analyse (critere_id, exigence_id, preuve_attendue_id, referentiel_version_id, code, type, libelle, severite, definition, ordre)
SELECT cr.id, ex.id, p.id, cr.referentiel_version_id, 'D3-15-R1', 'ELEMENT_ATTENDU'::type_regle_analyse, 'La destination des déchets doit être identifiable', 'MOYENNE'::niveau_criticite, '{"elements": ["filière de traitement", "quantités remises", "dates"]}'::jsonb, 0
  FROM critere cr
  JOIN domaine d ON d.id = cr.domaine_id
  JOIN referentiel r ON r.id = d.referentiel_id
  JOIN _enrichissement en ON en.cible = cr.referentiel_version_id
  JOIN exigence ex ON ex.critere_id = cr.id
  JOIN preuve_attendue p ON p.exigence_id = ex.id AND p.ordre = 0
 WHERE r.code = 'IFC_SFI' AND cr.code = 'D3-15';

-- IFC_SFI / D4-16
UPDATE exigence ex SET intitule = 'Plan d''urgence en cas d''accident',
       enonce = 'L''organisation doit disposer d''un plan d''urgence adapté aux risques de ses activités, identifiant les scénarios retenus, les conduites à tenir, les moyens d''alerte et les personnes responsables, et l''avoir porté à la connaissance des personnes concernées.',
       origine = 'CONTENU_HUMAIN'
  FROM critere cr
  JOIN domaine d ON d.id = cr.domaine_id
  JOIN referentiel r ON r.id = d.referentiel_id
  JOIN _enrichissement en ON en.cible = cr.referentiel_version_id
 WHERE ex.critere_id = cr.id AND r.code = 'IFC_SFI' AND cr.code = 'D4-16';
INSERT INTO preuve_attendue (exigence_id, referentiel_version_id, type, libelle, description, obligatoire, ordre)
SELECT ex.id, ex.referentiel_version_id, 'PROCEDURE'::type_preuve_attendue, 'Plan d''urgence ou plan d''intervention', 'Scénarios, conduites à tenir, moyens d''alerte et responsables.', true, 0
  FROM exigence ex
  JOIN critere cr ON cr.id = ex.critere_id
  JOIN domaine d ON d.id = cr.domaine_id
  JOIN referentiel r ON r.id = d.referentiel_id
  JOIN _enrichissement en ON en.cible = cr.referentiel_version_id
 WHERE r.code = 'IFC_SFI' AND cr.code = 'D4-16';
INSERT INTO preuve_attendue (exigence_id, referentiel_version_id, type, libelle, description, obligatoire, ordre)
SELECT ex.id, ex.referentiel_version_id, 'REGISTRE'::type_preuve_attendue, 'Trace des exercices ou simulations réalisés', 'Dates et participants aux exercices d''évacuation ou de simulation.', false, 1
  FROM exigence ex
  JOIN critere cr ON cr.id = ex.critere_id
  JOIN domaine d ON d.id = cr.domaine_id
  JOIN referentiel r ON r.id = d.referentiel_id
  JOIN _enrichissement en ON en.cible = cr.referentiel_version_id
 WHERE r.code = 'IFC_SFI' AND cr.code = 'D4-16';
INSERT INTO regle_analyse (critere_id, exigence_id, preuve_attendue_id, referentiel_version_id, code, type, libelle, severite, definition, ordre)
SELECT cr.id, ex.id, p.id, cr.referentiel_version_id, 'D4-16-R1', 'ELEMENT_ATTENDU'::type_regle_analyse, 'Le plan doit identifier scénarios, alerte et responsables', 'ELEVEE'::niveau_criticite, '{"elements": ["scénarios d''accident", "moyens d''alerte", "responsables désignés", "conduites à tenir"]}'::jsonb, 0
  FROM critere cr
  JOIN domaine d ON d.id = cr.domaine_id
  JOIN referentiel r ON r.id = d.referentiel_id
  JOIN _enrichissement en ON en.cible = cr.referentiel_version_id
  JOIN exigence ex ON ex.critere_id = cr.id
  JOIN preuve_attendue p ON p.exigence_id = ex.id AND p.ordre = 0
 WHERE r.code = 'IFC_SFI' AND cr.code = 'D4-16';
INSERT INTO regle_analyse (critere_id, exigence_id, preuve_attendue_id, referentiel_version_id, code, type, libelle, severite, definition, ordre)
SELECT cr.id, ex.id, p.id, cr.referentiel_version_id, 'D4-16-R2', 'DATE_VALIDITE'::type_regle_analyse, 'Le plan doit avoir été revu récemment', 'MOYENNE'::niveau_criticite, '{"champ": "date de dernière révision du plan"}'::jsonb, 1
  FROM critere cr
  JOIN domaine d ON d.id = cr.domaine_id
  JOIN referentiel r ON r.id = d.referentiel_id
  JOIN _enrichissement en ON en.cible = cr.referentiel_version_id
  JOIN exigence ex ON ex.critere_id = cr.id
  JOIN preuve_attendue p ON p.exigence_id = ex.id AND p.ordre = 0
 WHERE r.code = 'IFC_SFI' AND cr.code = 'D4-16';

-- IFC_SFI / D4-17
UPDATE exigence ex SET intitule = 'Information des communautés sur les risques',
       enonce = 'Lorsque les activités de l''organisation présentent des risques pour les populations riveraines, celle-ci doit les en informer par des moyens adaptés et conserver la trace de ces actions d''information.',
       origine = 'CONTENU_HUMAIN'
  FROM critere cr
  JOIN domaine d ON d.id = cr.domaine_id
  JOIN referentiel r ON r.id = d.referentiel_id
  JOIN _enrichissement en ON en.cible = cr.referentiel_version_id
 WHERE ex.critere_id = cr.id AND r.code = 'IFC_SFI' AND cr.code = 'D4-17';
INSERT INTO preuve_attendue (exigence_id, referentiel_version_id, type, libelle, description, obligatoire, ordre)
SELECT ex.id, ex.referentiel_version_id, 'PREUVE_OPERATIONNELLE'::type_preuve_attendue, 'Supports d''information des riverains', 'Affiches, réunions publiques, courriers, comptes rendus.', true, 0
  FROM exigence ex
  JOIN critere cr ON cr.id = ex.critere_id
  JOIN domaine d ON d.id = cr.domaine_id
  JOIN referentiel r ON r.id = d.referentiel_id
  JOIN _enrichissement en ON en.cible = cr.referentiel_version_id
 WHERE r.code = 'IFC_SFI' AND cr.code = 'D4-17';

-- IFC_SFI / D4-18
UPDATE exigence ex SET intitule = 'Mesures matérielles de sécurité des sites',
       enonce = 'L''organisation doit mettre en place, sur ses sites, les mesures de sécurité adaptées aux risques identifiés — signalisation, délimitation des zones dangereuses, contrôle des accès — et pouvoir en justifier l''existence effective.',
       origine = 'CONTENU_HUMAIN'
  FROM critere cr
  JOIN domaine d ON d.id = cr.domaine_id
  JOIN referentiel r ON r.id = d.referentiel_id
  JOIN _enrichissement en ON en.cible = cr.referentiel_version_id
 WHERE ex.critere_id = cr.id AND r.code = 'IFC_SFI' AND cr.code = 'D4-18';
INSERT INTO preuve_attendue (exigence_id, referentiel_version_id, type, libelle, description, obligatoire, ordre)
SELECT ex.id, ex.referentiel_version_id, 'PREUVE_OPERATIONNELLE'::type_preuve_attendue, 'Éléments attestant des mesures en place', 'Photographies de la signalisation, des clôtures, des dispositifs d''accès.', true, 0
  FROM exigence ex
  JOIN critere cr ON cr.id = ex.critere_id
  JOIN domaine d ON d.id = cr.domaine_id
  JOIN referentiel r ON r.id = d.referentiel_id
  JOIN _enrichissement en ON en.cible = cr.referentiel_version_id
 WHERE r.code = 'IFC_SFI' AND cr.code = 'D4-18';
INSERT INTO preuve_attendue (exigence_id, referentiel_version_id, type, libelle, description, obligatoire, ordre)
SELECT ex.id, ex.referentiel_version_id, 'PROCEDURE'::type_preuve_attendue, 'Consignes de sécurité et de contrôle des accès', 'Document décrivant les dispositions applicables sur site.', false, 1
  FROM exigence ex
  JOIN critere cr ON cr.id = ex.critere_id
  JOIN domaine d ON d.id = cr.domaine_id
  JOIN referentiel r ON r.id = d.referentiel_id
  JOIN _enrichissement en ON en.cible = cr.referentiel_version_id
 WHERE r.code = 'IFC_SFI' AND cr.code = 'D4-18';
INSERT INTO regle_analyse (critere_id, exigence_id, preuve_attendue_id, referentiel_version_id, code, type, libelle, severite, definition, ordre)
SELECT cr.id, ex.id, NULL, cr.referentiel_version_id, 'D4-18-R1', 'PRESENCE'::type_regle_analyse, 'Rechercher les dispositifs de sécurité décrits', 'MOYENNE'::niveau_criticite, '{"elements": ["signalisation des risques", "délimitation des zones dangereuses", "contrôle des accès"]}'::jsonb, 0
  FROM critere cr
  JOIN domaine d ON d.id = cr.domaine_id
  JOIN referentiel r ON r.id = d.referentiel_id
  JOIN _enrichissement en ON en.cible = cr.referentiel_version_id
  JOIN exigence ex ON ex.critere_id = cr.id
 WHERE r.code = 'IFC_SFI' AND cr.code = 'D4-18';

-- IFC_SFI / D5-19
UPDATE exigence ex SET intitule = 'Consultation préalable des populations affectées',
       enonce = 'Lorsque les activités de l''organisation impliquent l''acquisition de terres ou la restriction d''usage de terrains occupés, les populations affectées doivent être consultées avant la décision, et la trace de cette consultation conservée.',
       origine = 'CONTENU_HUMAIN'
  FROM critere cr
  JOIN domaine d ON d.id = cr.domaine_id
  JOIN referentiel r ON r.id = d.referentiel_id
  JOIN _enrichissement en ON en.cible = cr.referentiel_version_id
 WHERE ex.critere_id = cr.id AND r.code = 'IFC_SFI' AND cr.code = 'D5-19';
INSERT INTO preuve_attendue (exigence_id, referentiel_version_id, type, libelle, description, obligatoire, ordre)
SELECT ex.id, ex.referentiel_version_id, 'RAPPORT'::type_preuve_attendue, 'Compte rendu de la consultation des populations affectées', 'Dates, participants, sujets abordés et suites annoncées.', true, 0
  FROM exigence ex
  JOIN critere cr ON cr.id = ex.critere_id
  JOIN domaine d ON d.id = cr.domaine_id
  JOIN referentiel r ON r.id = d.referentiel_id
  JOIN _enrichissement en ON en.cible = cr.referentiel_version_id
 WHERE r.code = 'IFC_SFI' AND cr.code = 'D5-19';
INSERT INTO regle_analyse (critere_id, exigence_id, preuve_attendue_id, referentiel_version_id, code, type, libelle, severite, definition, ordre)
SELECT cr.id, ex.id, p.id, cr.referentiel_version_id, 'D5-19-R1', 'DATE_VALIDITE'::type_regle_analyse, 'La consultation doit précéder l''acquisition', 'ELEVEE'::niveau_criticite, '{"champ": "date de la consultation"}'::jsonb, 0
  FROM critere cr
  JOIN domaine d ON d.id = cr.domaine_id
  JOIN referentiel r ON r.id = d.referentiel_id
  JOIN _enrichissement en ON en.cible = cr.referentiel_version_id
  JOIN exigence ex ON ex.critere_id = cr.id
  JOIN preuve_attendue p ON p.exigence_id = ex.id AND p.ordre = 0
 WHERE r.code = 'IFC_SFI' AND cr.code = 'D5-19';

-- IFC_SFI / D5-20
UPDATE exigence ex SET intitule = 'Plan de compensation des personnes affectées',
       enonce = 'Lorsqu''une acquisition de terres entraîne une perte de biens, de revenus ou d''accès pour des personnes ou des ménages, l''organisation doit disposer d''un plan de compensation écrit précisant les bénéficiaires, la base d''évaluation retenue et les modalités de versement.',
       origine = 'CONTENU_HUMAIN'
  FROM critere cr
  JOIN domaine d ON d.id = cr.domaine_id
  JOIN referentiel r ON r.id = d.referentiel_id
  JOIN _enrichissement en ON en.cible = cr.referentiel_version_id
 WHERE ex.critere_id = cr.id AND r.code = 'IFC_SFI' AND cr.code = 'D5-20';
INSERT INTO preuve_attendue (exigence_id, referentiel_version_id, type, libelle, description, obligatoire, ordre)
SELECT ex.id, ex.referentiel_version_id, 'PROCEDURE'::type_preuve_attendue, 'Plan de compensation', 'Bénéficiaires, base d''évaluation et modalités de versement.', true, 0
  FROM exigence ex
  JOIN critere cr ON cr.id = ex.critere_id
  JOIN domaine d ON d.id = cr.domaine_id
  JOIN referentiel r ON r.id = d.referentiel_id
  JOIN _enrichissement en ON en.cible = cr.referentiel_version_id
 WHERE r.code = 'IFC_SFI' AND cr.code = 'D5-20';
INSERT INTO preuve_attendue (exigence_id, referentiel_version_id, type, libelle, description, obligatoire, ordre)
SELECT ex.id, ex.referentiel_version_id, 'REGISTRE'::type_preuve_attendue, 'Registre des compensations versées', 'Trace des versements effectués et de leurs bénéficiaires.', false, 1
  FROM exigence ex
  JOIN critere cr ON cr.id = ex.critere_id
  JOIN domaine d ON d.id = cr.domaine_id
  JOIN referentiel r ON r.id = d.referentiel_id
  JOIN _enrichissement en ON en.cible = cr.referentiel_version_id
 WHERE r.code = 'IFC_SFI' AND cr.code = 'D5-20';
INSERT INTO regle_analyse (critere_id, exigence_id, preuve_attendue_id, referentiel_version_id, code, type, libelle, severite, definition, ordre)
SELECT cr.id, ex.id, p.id, cr.referentiel_version_id, 'D5-20-R1', 'ELEMENT_ATTENDU'::type_regle_analyse, 'Le plan doit exposer sa base d''évaluation', 'ELEVEE'::niveau_criticite, '{"elements": ["base d''évaluation des compensations", "bénéficiaires identifiés", "modalités de versement"]}'::jsonb, 0
  FROM critere cr
  JOIN domaine d ON d.id = cr.domaine_id
  JOIN referentiel r ON r.id = d.referentiel_id
  JOIN _enrichissement en ON en.cible = cr.referentiel_version_id
  JOIN exigence ex ON ex.critere_id = cr.id
  JOIN preuve_attendue p ON p.exigence_id = ex.id AND p.ordre = 0
 WHERE r.code = 'IFC_SFI' AND cr.code = 'D5-20';

-- IFC_SFI / D5-21
UPDATE exigence ex SET intitule = 'Suivi des personnes réinstallées',
       enonce = 'Lorsque des personnes ont été réinstallées du fait des activités de l''organisation, celle-ci doit assurer un suivi de leur situation après la réinstallation et en conserver les constats.',
       origine = 'CONTENU_HUMAIN'
  FROM critere cr
  JOIN domaine d ON d.id = cr.domaine_id
  JOIN referentiel r ON r.id = d.referentiel_id
  JOIN _enrichissement en ON en.cible = cr.referentiel_version_id
 WHERE ex.critere_id = cr.id AND r.code = 'IFC_SFI' AND cr.code = 'D5-21';
INSERT INTO preuve_attendue (exigence_id, referentiel_version_id, type, libelle, description, obligatoire, ordre)
SELECT ex.id, ex.referentiel_version_id, 'RAPPORT'::type_preuve_attendue, 'Rapport de suivi des personnes réinstallées', 'Constats postérieurs à la réinstallation.', true, 0
  FROM exigence ex
  JOIN critere cr ON cr.id = ex.critere_id
  JOIN domaine d ON d.id = cr.domaine_id
  JOIN referentiel r ON r.id = d.referentiel_id
  JOIN _enrichissement en ON en.cible = cr.referentiel_version_id
 WHERE r.code = 'IFC_SFI' AND cr.code = 'D5-21';

-- IFC_SFI / D6-22
UPDATE exigence ex SET intitule = 'Identification préalable des zones sensibles',
       enonce = 'Avant d''engager une activité sur un site nouveau, l''organisation doit vérifier la présence de zones sensibles ou protégées à proximité et conserver la trace de cette identification, y compris lorsqu''elle conclut à l''absence de zone concernée.',
       origine = 'CONTENU_HUMAIN'
  FROM critere cr
  JOIN domaine d ON d.id = cr.domaine_id
  JOIN referentiel r ON r.id = d.referentiel_id
  JOIN _enrichissement en ON en.cible = cr.referentiel_version_id
 WHERE ex.critere_id = cr.id AND r.code = 'IFC_SFI' AND cr.code = 'D6-22';
INSERT INTO preuve_attendue (exigence_id, referentiel_version_id, type, libelle, description, obligatoire, ordre)
SELECT ex.id, ex.referentiel_version_id, 'RAPPORT'::type_preuve_attendue, 'Étude ou note d''identification des zones sensibles', 'Périmètre examiné, sources consultées et conclusion.', true, 0
  FROM exigence ex
  JOIN critere cr ON cr.id = ex.critere_id
  JOIN domaine d ON d.id = cr.domaine_id
  JOIN referentiel r ON r.id = d.referentiel_id
  JOIN _enrichissement en ON en.cible = cr.referentiel_version_id
 WHERE r.code = 'IFC_SFI' AND cr.code = 'D6-22';
INSERT INTO regle_analyse (critere_id, exigence_id, preuve_attendue_id, referentiel_version_id, code, type, libelle, severite, definition, ordre)
SELECT cr.id, ex.id, p.id, cr.referentiel_version_id, 'D6-22-R1', 'DATE_VALIDITE'::type_regle_analyse, 'L''identification doit précéder le démarrage de l''activité', 'ELEVEE'::niveau_criticite, '{"champ": "date de l''identification"}'::jsonb, 0
  FROM critere cr
  JOIN domaine d ON d.id = cr.domaine_id
  JOIN referentiel r ON r.id = d.referentiel_id
  JOIN _enrichissement en ON en.cible = cr.referentiel_version_id
  JOIN exigence ex ON ex.critere_id = cr.id
  JOIN preuve_attendue p ON p.exigence_id = ex.id AND p.ordre = 0
 WHERE r.code = 'IFC_SFI' AND cr.code = 'D6-22';

-- IFC_SFI / D6-23
UPDATE exigence ex SET intitule = 'Mesures de restauration écologique',
       enonce = 'Lorsque les activités de l''organisation portent atteinte à des milieux à forte biodiversité ou à des ressources naturelles vivantes, celle-ci doit prévoir des mesures de restauration ou de compensation écologique, en préciser le calendrier et en suivre la réalisation.',
       origine = 'CONTENU_HUMAIN'
  FROM critere cr
  JOIN domaine d ON d.id = cr.domaine_id
  JOIN referentiel r ON r.id = d.referentiel_id
  JOIN _enrichissement en ON en.cible = cr.referentiel_version_id
 WHERE ex.critere_id = cr.id AND r.code = 'IFC_SFI' AND cr.code = 'D6-23';
INSERT INTO preuve_attendue (exigence_id, referentiel_version_id, type, libelle, description, obligatoire, ordre)
SELECT ex.id, ex.referentiel_version_id, 'PROCEDURE'::type_preuve_attendue, 'Plan de restauration ou de compensation écologique', 'Mesures retenues, calendrier et responsables.', true, 0
  FROM exigence ex
  JOIN critere cr ON cr.id = ex.critere_id
  JOIN domaine d ON d.id = cr.domaine_id
  JOIN referentiel r ON r.id = d.referentiel_id
  JOIN _enrichissement en ON en.cible = cr.referentiel_version_id
 WHERE r.code = 'IFC_SFI' AND cr.code = 'D6-23';
INSERT INTO preuve_attendue (exigence_id, referentiel_version_id, type, libelle, description, obligatoire, ordre)
SELECT ex.id, ex.referentiel_version_id, 'PREUVE_OPERATIONNELLE'::type_preuve_attendue, 'Éléments attestant de la réalisation des mesures', 'Photographies, constats de terrain, rapports d''avancement.', false, 1
  FROM exigence ex
  JOIN critere cr ON cr.id = ex.critere_id
  JOIN domaine d ON d.id = cr.domaine_id
  JOIN referentiel r ON r.id = d.referentiel_id
  JOIN _enrichissement en ON en.cible = cr.referentiel_version_id
 WHERE r.code = 'IFC_SFI' AND cr.code = 'D6-23';
INSERT INTO regle_analyse (critere_id, exigence_id, preuve_attendue_id, referentiel_version_id, code, type, libelle, severite, definition, ordre)
SELECT cr.id, ex.id, p.id, cr.referentiel_version_id, 'D6-23-R1', 'ELEMENT_ATTENDU'::type_regle_analyse, 'Le plan doit préciser mesures et calendrier', 'MOYENNE'::niveau_criticite, '{"elements": ["mesures de restauration", "calendrier de réalisation"]}'::jsonb, 0
  FROM critere cr
  JOIN domaine d ON d.id = cr.domaine_id
  JOIN referentiel r ON r.id = d.referentiel_id
  JOIN _enrichissement en ON en.cible = cr.referentiel_version_id
  JOIN exigence ex ON ex.critere_id = cr.id
  JOIN preuve_attendue p ON p.exigence_id = ex.id AND p.ordre = 0
 WHERE r.code = 'IFC_SFI' AND cr.code = 'D6-23';

-- IFC_SFI / D6-26
UPDATE exigence ex SET intitule = 'Exploitation durable des ressources halieutiques',
       enonce = 'Lorsque l''organisation exploite des ressources halieutiques, elle doit décrire les dispositions par lesquelles cette exploitation reste soutenable — zones et périodes d''exploitation, engins utilisés, volumes prélevés — et justifier du respect des autorisations applicables.',
       origine = 'CONTENU_HUMAIN'
  FROM critere cr
  JOIN domaine d ON d.id = cr.domaine_id
  JOIN referentiel r ON r.id = d.referentiel_id
  JOIN _enrichissement en ON en.cible = cr.referentiel_version_id
 WHERE ex.critere_id = cr.id AND r.code = 'IFC_SFI' AND cr.code = 'D6-26';
INSERT INTO preuve_attendue (exigence_id, referentiel_version_id, type, libelle, description, obligatoire, ordre)
SELECT ex.id, ex.referentiel_version_id, 'DOCUMENT_LEGAL'::type_preuve_attendue, 'Autorisations d''exploitation', 'Licences ou permis délivrés par l''autorité compétente.', true, 0
  FROM exigence ex
  JOIN critere cr ON cr.id = ex.critere_id
  JOIN domaine d ON d.id = cr.domaine_id
  JOIN referentiel r ON r.id = d.referentiel_id
  JOIN _enrichissement en ON en.cible = cr.referentiel_version_id
 WHERE r.code = 'IFC_SFI' AND cr.code = 'D6-26';
INSERT INTO preuve_attendue (exigence_id, referentiel_version_id, type, libelle, description, obligatoire, ordre)
SELECT ex.id, ex.referentiel_version_id, 'REGISTRE'::type_preuve_attendue, 'Relevés des volumes prélevés', 'Quantités, zones et périodes d''exploitation.', false, 1
  FROM exigence ex
  JOIN critere cr ON cr.id = ex.critere_id
  JOIN domaine d ON d.id = cr.domaine_id
  JOIN referentiel r ON r.id = d.referentiel_id
  JOIN _enrichissement en ON en.cible = cr.referentiel_version_id
 WHERE r.code = 'IFC_SFI' AND cr.code = 'D6-26';
INSERT INTO regle_analyse (critere_id, exigence_id, preuve_attendue_id, referentiel_version_id, code, type, libelle, severite, definition, ordre)
SELECT cr.id, ex.id, p.id, cr.referentiel_version_id, 'D6-26-R1', 'DATE_VALIDITE'::type_regle_analyse, 'L''autorisation doit être en cours de validité', 'ELEVEE'::niveau_criticite, '{"champ": "date de fin de validité de l''autorisation"}'::jsonb, 0
  FROM critere cr
  JOIN domaine d ON d.id = cr.domaine_id
  JOIN referentiel r ON r.id = d.referentiel_id
  JOIN _enrichissement en ON en.cible = cr.referentiel_version_id
  JOIN exigence ex ON ex.critere_id = cr.id
  JOIN preuve_attendue p ON p.exigence_id = ex.id AND p.ordre = 0
 WHERE r.code = 'IFC_SFI' AND cr.code = 'D6-26';

-- IFC_SFI / D7-27
UPDATE exigence ex SET intitule = 'Consentement libre, préalable et éclairé',
       enonce = 'Lorsque les activités de l''organisation affectent des communautés autochtones, celle-ci doit conduire un processus de consultation recherchant leur consentement libre, préalable et éclairé, et en conserver la trace : information transmise, échanges tenus et position exprimée par la communauté.',
       origine = 'CONTENU_HUMAIN'
  FROM critere cr
  JOIN domaine d ON d.id = cr.domaine_id
  JOIN referentiel r ON r.id = d.referentiel_id
  JOIN _enrichissement en ON en.cible = cr.referentiel_version_id
 WHERE ex.critere_id = cr.id AND r.code = 'IFC_SFI' AND cr.code = 'D7-27';
INSERT INTO preuve_attendue (exigence_id, referentiel_version_id, type, libelle, description, obligatoire, ordre)
SELECT ex.id, ex.referentiel_version_id, 'RAPPORT'::type_preuve_attendue, 'Compte rendu du processus de consultation', 'Information transmise, échanges tenus et position exprimée.', true, 0
  FROM exigence ex
  JOIN critere cr ON cr.id = ex.critere_id
  JOIN domaine d ON d.id = cr.domaine_id
  JOIN referentiel r ON r.id = d.referentiel_id
  JOIN _enrichissement en ON en.cible = cr.referentiel_version_id
 WHERE r.code = 'IFC_SFI' AND cr.code = 'D7-27';
INSERT INTO regle_analyse (critere_id, exigence_id, preuve_attendue_id, referentiel_version_id, code, type, libelle, severite, definition, ordre)
SELECT cr.id, ex.id, p.id, cr.referentiel_version_id, 'D7-27-R1', 'ELEMENT_ATTENDU'::type_regle_analyse, 'Le compte rendu doit établir le caractère préalable et éclairé', 'ELEVEE'::niveau_criticite, '{"elements": ["information transmise à la communauté", "date des échanges", "position exprimée par la communauté"]}'::jsonb, 0
  FROM critere cr
  JOIN domaine d ON d.id = cr.domaine_id
  JOIN referentiel r ON r.id = d.referentiel_id
  JOIN _enrichissement en ON en.cible = cr.referentiel_version_id
  JOIN exigence ex ON ex.critere_id = cr.id
  JOIN preuve_attendue p ON p.exigence_id = ex.id AND p.ordre = 0
 WHERE r.code = 'IFC_SFI' AND cr.code = 'D7-27';

-- IFC_SFI / D7-28
UPDATE exigence ex SET intitule = 'Respect des traditions et cultures locales',
       enonce = 'L''organisation doit avoir identifié les usages, traditions et pratiques culturelles des communautés concernées par ses activités, et pris des dispositions pour éviter d''y porter atteinte.',
       origine = 'CONTENU_HUMAIN'
  FROM critere cr
  JOIN domaine d ON d.id = cr.domaine_id
  JOIN referentiel r ON r.id = d.referentiel_id
  JOIN _enrichissement en ON en.cible = cr.referentiel_version_id
 WHERE ex.critere_id = cr.id AND r.code = 'IFC_SFI' AND cr.code = 'D7-28';
INSERT INTO preuve_attendue (exigence_id, referentiel_version_id, type, libelle, description, obligatoire, ordre)
SELECT ex.id, ex.referentiel_version_id, 'PROCEDURE'::type_preuve_attendue, 'Dispositions prises au regard des usages locaux', 'Note ou procédure décrivant les précautions retenues.', true, 0
  FROM exigence ex
  JOIN critere cr ON cr.id = ex.critere_id
  JOIN domaine d ON d.id = cr.domaine_id
  JOIN referentiel r ON r.id = d.referentiel_id
  JOIN _enrichissement en ON en.cible = cr.referentiel_version_id
 WHERE r.code = 'IFC_SFI' AND cr.code = 'D7-28';

-- IFC_SFI / D7-29
UPDATE exigence ex SET intitule = 'Partage des bénéfices avec les communautés',
       enonce = 'L''organisation doit pouvoir décrire les retombées directes de ses activités pour les communautés concernées — emplois, formations, infrastructures ou services — et en apporter des éléments factuels.',
       origine = 'CONTENU_HUMAIN'
  FROM critere cr
  JOIN domaine d ON d.id = cr.domaine_id
  JOIN referentiel r ON r.id = d.referentiel_id
  JOIN _enrichissement en ON en.cible = cr.referentiel_version_id
 WHERE ex.critere_id = cr.id AND r.code = 'IFC_SFI' AND cr.code = 'D7-29';
INSERT INTO preuve_attendue (exigence_id, referentiel_version_id, type, libelle, description, obligatoire, ordre)
SELECT ex.id, ex.referentiel_version_id, 'RAPPORT'::type_preuve_attendue, 'Bilan des retombées locales', 'Emplois créés, formations dispensées, infrastructures financées.', true, 0
  FROM exigence ex
  JOIN critere cr ON cr.id = ex.critere_id
  JOIN domaine d ON d.id = cr.domaine_id
  JOIN referentiel r ON r.id = d.referentiel_id
  JOIN _enrichissement en ON en.cible = cr.referentiel_version_id
 WHERE r.code = 'IFC_SFI' AND cr.code = 'D7-29';
INSERT INTO preuve_attendue (exigence_id, referentiel_version_id, type, libelle, description, obligatoire, ordre)
SELECT ex.id, ex.referentiel_version_id, 'INDICATEUR'::type_preuve_attendue, 'Données chiffrées des retombées', 'Effectifs recrutés localement, montants engagés.', false, 1
  FROM exigence ex
  JOIN critere cr ON cr.id = ex.critere_id
  JOIN domaine d ON d.id = cr.domaine_id
  JOIN referentiel r ON r.id = d.referentiel_id
  JOIN _enrichissement en ON en.cible = cr.referentiel_version_id
 WHERE r.code = 'IFC_SFI' AND cr.code = 'D7-29';

-- IFC_SFI / D8-30
UPDATE exigence ex SET intitule = 'Identification du patrimoine culturel proche',
       enonce = 'L''organisation doit avoir vérifié la présence de sites archéologiques, historiques ou culturels à proximité de ses activités, et conserver la trace de cette identification, y compris lorsqu''elle conclut à l''absence de site concerné.',
       origine = 'CONTENU_HUMAIN'
  FROM critere cr
  JOIN domaine d ON d.id = cr.domaine_id
  JOIN referentiel r ON r.id = d.referentiel_id
  JOIN _enrichissement en ON en.cible = cr.referentiel_version_id
 WHERE ex.critere_id = cr.id AND r.code = 'IFC_SFI' AND cr.code = 'D8-30';
INSERT INTO preuve_attendue (exigence_id, referentiel_version_id, type, libelle, description, obligatoire, ordre)
SELECT ex.id, ex.referentiel_version_id, 'RAPPORT'::type_preuve_attendue, 'Note d''identification du patrimoine culturel', 'Périmètre examiné, sources consultées et conclusion.', true, 0
  FROM exigence ex
  JOIN critere cr ON cr.id = ex.critere_id
  JOIN domaine d ON d.id = cr.domaine_id
  JOIN referentiel r ON r.id = d.referentiel_id
  JOIN _enrichissement en ON en.cible = cr.referentiel_version_id
 WHERE r.code = 'IFC_SFI' AND cr.code = 'D8-30';

-- IFC_SFI / D8-31
UPDATE exigence ex SET intitule = 'Procédure de découverte fortuite',
       enonce = 'L''organisation doit disposer d''une procédure applicable en cas de découverte fortuite de vestiges lors de travaux : arrêt des opérations concernées, préservation du site, information de l''autorité compétente et conditions de reprise.',
       origine = 'CONTENU_HUMAIN'
  FROM critere cr
  JOIN domaine d ON d.id = cr.domaine_id
  JOIN referentiel r ON r.id = d.referentiel_id
  JOIN _enrichissement en ON en.cible = cr.referentiel_version_id
 WHERE ex.critere_id = cr.id AND r.code = 'IFC_SFI' AND cr.code = 'D8-31';
INSERT INTO preuve_attendue (exigence_id, referentiel_version_id, type, libelle, description, obligatoire, ordre)
SELECT ex.id, ex.referentiel_version_id, 'PROCEDURE'::type_preuve_attendue, 'Procédure de découverte fortuite', 'Conduite à tenir, personnes à alerter et conditions de reprise.', true, 0
  FROM exigence ex
  JOIN critere cr ON cr.id = ex.critere_id
  JOIN domaine d ON d.id = cr.domaine_id
  JOIN referentiel r ON r.id = d.referentiel_id
  JOIN _enrichissement en ON en.cible = cr.referentiel_version_id
 WHERE r.code = 'IFC_SFI' AND cr.code = 'D8-31';
INSERT INTO regle_analyse (critere_id, exigence_id, preuve_attendue_id, referentiel_version_id, code, type, libelle, severite, definition, ordre)
SELECT cr.id, ex.id, p.id, cr.referentiel_version_id, 'D8-31-R1', 'ELEMENT_ATTENDU'::type_regle_analyse, 'La procédure doit prévoir arrêt, préservation et alerte', 'MOYENNE'::niveau_criticite, '{"elements": ["arrêt des travaux", "préservation du site", "information de l''autorité compétente"]}'::jsonb, 0
  FROM critere cr
  JOIN domaine d ON d.id = cr.domaine_id
  JOIN referentiel r ON r.id = d.referentiel_id
  JOIN _enrichissement en ON en.cible = cr.referentiel_version_id
  JOIN exigence ex ON ex.critere_id = cr.id
  JOIN preuve_attendue p ON p.exigence_id = ex.id AND p.ordre = 0
 WHERE r.code = 'IFC_SFI' AND cr.code = 'D8-31';

-- IFC_SFI / D8-32
UPDATE exigence ex SET intitule = 'Respect et valorisation des traditions culturelles locales',
       enonce = 'L''organisation doit pouvoir décrire les dispositions par lesquelles elle respecte les traditions culturelles des territoires où elle opère, et le cas échéant les actions par lesquelles elle contribue à leur valorisation.',
       origine = 'CONTENU_HUMAIN'
  FROM critere cr
  JOIN domaine d ON d.id = cr.domaine_id
  JOIN referentiel r ON r.id = d.referentiel_id
  JOIN _enrichissement en ON en.cible = cr.referentiel_version_id
 WHERE ex.critere_id = cr.id AND r.code = 'IFC_SFI' AND cr.code = 'D8-32';
INSERT INTO preuve_attendue (exigence_id, referentiel_version_id, type, libelle, description, obligatoire, ordre)
SELECT ex.id, ex.referentiel_version_id, 'PREUVE_OPERATIONNELLE'::type_preuve_attendue, 'Éléments attestant des actions menées', 'Comptes rendus, conventions, supports de communication.', false, 0
  FROM exigence ex
  JOIN critere cr ON cr.id = ex.critere_id
  JOIN domaine d ON d.id = cr.domaine_id
  JOIN referentiel r ON r.id = d.referentiel_id
  JOIN _enrichissement en ON en.cible = cr.referentiel_version_id
 WHERE r.code = 'IFC_SFI' AND cr.code = 'D8-32';


-- ======================= PRI =======================

-- PRI / D1-01
UPDATE exigence ex SET intitule = 'Intégration de critères ESG dans les décisions d''investissement',
       enonce = 'L''organisation doit intégrer des critères environnementaux, sociaux et de gouvernance dans ses décisions d''investissement, et pouvoir montrer par quels éléments ces critères pèsent réellement sur la décision : critères retenus, moment de leur prise en compte et trace dans les dossiers d''investissement.',
       origine = 'CONTENU_HUMAIN'
  FROM critere cr
  JOIN domaine d ON d.id = cr.domaine_id
  JOIN referentiel r ON r.id = d.referentiel_id
  JOIN _enrichissement en ON en.cible = cr.referentiel_version_id
 WHERE ex.critere_id = cr.id AND r.code = 'PRI' AND cr.code = 'D1-01';
INSERT INTO preuve_attendue (exigence_id, referentiel_version_id, type, libelle, description, obligatoire, ordre)
SELECT ex.id, ex.referentiel_version_id, 'POLITIQUE'::type_preuve_attendue, 'Politique d''investissement responsable', 'Document énonçant les critères ESG retenus et leur place dans la décision.', true, 0
  FROM exigence ex
  JOIN critere cr ON cr.id = ex.critere_id
  JOIN domaine d ON d.id = cr.domaine_id
  JOIN referentiel r ON r.id = d.referentiel_id
  JOIN _enrichissement en ON en.cible = cr.referentiel_version_id
 WHERE r.code = 'PRI' AND cr.code = 'D1-01';
INSERT INTO preuve_attendue (exigence_id, referentiel_version_id, type, libelle, description, obligatoire, ordre)
SELECT ex.id, ex.referentiel_version_id, 'PROCEDURE'::type_preuve_attendue, 'Procédure d''instruction des dossiers d''investissement', 'Décrit à quel stade les critères ESG interviennent.', false, 1
  FROM exigence ex
  JOIN critere cr ON cr.id = ex.critere_id
  JOIN domaine d ON d.id = cr.domaine_id
  JOIN referentiel r ON r.id = d.referentiel_id
  JOIN _enrichissement en ON en.cible = cr.referentiel_version_id
 WHERE r.code = 'PRI' AND cr.code = 'D1-01';
INSERT INTO preuve_attendue (exigence_id, referentiel_version_id, type, libelle, description, obligatoire, ordre)
SELECT ex.id, ex.referentiel_version_id, 'RAPPORT'::type_preuve_attendue, 'Exemples de dossiers instruits avec analyse ESG', 'Dossiers anonymisés montrant l''application effective des critères.', false, 2
  FROM exigence ex
  JOIN critere cr ON cr.id = ex.critere_id
  JOIN domaine d ON d.id = cr.domaine_id
  JOIN referentiel r ON r.id = d.referentiel_id
  JOIN _enrichissement en ON en.cible = cr.referentiel_version_id
 WHERE r.code = 'PRI' AND cr.code = 'D1-01';
INSERT INTO regle_analyse (critere_id, exigence_id, preuve_attendue_id, referentiel_version_id, code, type, libelle, severite, definition, ordre)
SELECT cr.id, ex.id, NULL, cr.referentiel_version_id, 'D1-01-R1', 'ELEMENT_ATTENDU'::type_regle_analyse, 'Les trois dimensions ESG doivent être couvertes', 'MOYENNE'::niveau_criticite, '{"elements": ["critères environnementaux", "critères sociaux", "critères de gouvernance"]}'::jsonb, 0
  FROM critere cr
  JOIN domaine d ON d.id = cr.domaine_id
  JOIN referentiel r ON r.id = d.referentiel_id
  JOIN _enrichissement en ON en.cible = cr.referentiel_version_id
  JOIN exigence ex ON ex.critere_id = cr.id
 WHERE r.code = 'PRI' AND cr.code = 'D1-01';
INSERT INTO regle_analyse (critere_id, exigence_id, preuve_attendue_id, referentiel_version_id, code, type, libelle, severite, definition, ordre)
SELECT cr.id, ex.id, NULL, cr.referentiel_version_id, 'D1-01-R2', 'COHERENCE_DECLARATION'::type_regle_analyse, 'Les critères annoncés doivent se retrouver dans les dossiers instruits', 'MOYENNE'::niveau_criticite, '{"elements": ["critères ESG énoncés dans la politique", "critères effectivement appliqués dans les dossiers"]}'::jsonb, 1
  FROM critere cr
  JOIN domaine d ON d.id = cr.domaine_id
  JOIN referentiel r ON r.id = d.referentiel_id
  JOIN _enrichissement en ON en.cible = cr.referentiel_version_id
  JOIN exigence ex ON ex.critere_id = cr.id
 WHERE r.code = 'PRI' AND cr.code = 'D1-01';

-- PRI / D1-14
UPDATE exigence ex SET intitule = 'Méthodologie formalisée d''évaluation des risques ESG',
       enonce = 'L''organisation doit disposer d''une méthodologie écrite d''évaluation des risques et opportunités ESG, précisant les dimensions examinées, la façon dont elles sont appréciées et la manière dont le résultat est utilisé.',
       origine = 'CONTENU_HUMAIN'
  FROM critere cr
  JOIN domaine d ON d.id = cr.domaine_id
  JOIN referentiel r ON r.id = d.referentiel_id
  JOIN _enrichissement en ON en.cible = cr.referentiel_version_id
 WHERE ex.critere_id = cr.id AND r.code = 'PRI' AND cr.code = 'D1-14';
INSERT INTO preuve_attendue (exigence_id, referentiel_version_id, type, libelle, description, obligatoire, ordre)
SELECT ex.id, ex.referentiel_version_id, 'PROCEDURE'::type_preuve_attendue, 'Méthodologie d''évaluation des risques et opportunités ESG', 'Dimensions examinées, mode d''appréciation et usage du résultat.', true, 0
  FROM exigence ex
  JOIN critere cr ON cr.id = ex.critere_id
  JOIN domaine d ON d.id = cr.domaine_id
  JOIN referentiel r ON r.id = d.referentiel_id
  JOIN _enrichissement en ON en.cible = cr.referentiel_version_id
 WHERE r.code = 'PRI' AND cr.code = 'D1-14';
INSERT INTO regle_analyse (critere_id, exigence_id, preuve_attendue_id, referentiel_version_id, code, type, libelle, severite, definition, ordre)
SELECT cr.id, ex.id, p.id, cr.referentiel_version_id, 'D1-14-R1', 'ELEMENT_ATTENDU'::type_regle_analyse, 'La méthodologie doit décrire son mode d''appréciation', 'MOYENNE'::niveau_criticite, '{"elements": ["dimensions examinées", "mode d''appréciation", "usage du résultat"]}'::jsonb, 0
  FROM critere cr
  JOIN domaine d ON d.id = cr.domaine_id
  JOIN referentiel r ON r.id = d.referentiel_id
  JOIN _enrichissement en ON en.cible = cr.referentiel_version_id
  JOIN exigence ex ON ex.critere_id = cr.id
  JOIN preuve_attendue p ON p.exigence_id = ex.id AND p.ordre = 0
 WHERE r.code = 'PRI' AND cr.code = 'D1-14';

-- PRI / D1-15
UPDATE exigence ex SET intitule = 'Comparaison des projets sur leur performance ESG',
       enonce = 'Lorsque plusieurs projets d''investissement sont mis en concurrence, l''organisation doit les comparer sur leur performance ESG avant validation, et conserver la trace de cette comparaison.',
       origine = 'CONTENU_HUMAIN'
  FROM critere cr
  JOIN domaine d ON d.id = cr.domaine_id
  JOIN referentiel r ON r.id = d.referentiel_id
  JOIN _enrichissement en ON en.cible = cr.referentiel_version_id
 WHERE ex.critere_id = cr.id AND r.code = 'PRI' AND cr.code = 'D1-15';
INSERT INTO preuve_attendue (exigence_id, referentiel_version_id, type, libelle, description, obligatoire, ordre)
SELECT ex.id, ex.referentiel_version_id, 'RAPPORT'::type_preuve_attendue, 'Éléments de comparaison ESG entre projets', 'Grilles, notes ou comptes rendus de comité montrant la comparaison.', true, 0
  FROM exigence ex
  JOIN critere cr ON cr.id = ex.critere_id
  JOIN domaine d ON d.id = cr.domaine_id
  JOIN referentiel r ON r.id = d.referentiel_id
  JOIN _enrichissement en ON en.cible = cr.referentiel_version_id
 WHERE r.code = 'PRI' AND cr.code = 'D1-15';
INSERT INTO regle_analyse (critere_id, exigence_id, preuve_attendue_id, referentiel_version_id, code, type, libelle, severite, definition, ordre)
SELECT cr.id, ex.id, p.id, cr.referentiel_version_id, 'D1-15-R1', 'DATE_VALIDITE'::type_regle_analyse, 'La comparaison doit précéder la validation du projet', 'MOYENNE'::niveau_criticite, '{"champ": "date de la comparaison"}'::jsonb, 0
  FROM critere cr
  JOIN domaine d ON d.id = cr.domaine_id
  JOIN referentiel r ON r.id = d.referentiel_id
  JOIN _enrichissement en ON en.cible = cr.referentiel_version_id
  JOIN exigence ex ON ex.critere_id = cr.id
  JOIN preuve_attendue p ON p.exigence_id = ex.id AND p.ordre = 0
 WHERE r.code = 'PRI' AND cr.code = 'D1-15';

-- PRI / D2-16
UPDATE exigence ex SET intitule = 'Exercice des droits de vote au regard des enjeux ESG',
       enonce = 'Lorsque l''organisation détient des droits de vote dans des sociétés, elle doit les exercer en tenant compte des enjeux ESG, disposer de principes de vote écrits et conserver la trace des votes émis.',
       origine = 'CONTENU_HUMAIN'
  FROM critere cr
  JOIN domaine d ON d.id = cr.domaine_id
  JOIN referentiel r ON r.id = d.referentiel_id
  JOIN _enrichissement en ON en.cible = cr.referentiel_version_id
 WHERE ex.critere_id = cr.id AND r.code = 'PRI' AND cr.code = 'D2-16';
INSERT INTO preuve_attendue (exigence_id, referentiel_version_id, type, libelle, description, obligatoire, ordre)
SELECT ex.id, ex.referentiel_version_id, 'POLITIQUE'::type_preuve_attendue, 'Politique de vote', 'Principes appliqués lors des votes, incluant les enjeux ESG.', true, 0
  FROM exigence ex
  JOIN critere cr ON cr.id = ex.critere_id
  JOIN domaine d ON d.id = cr.domaine_id
  JOIN referentiel r ON r.id = d.referentiel_id
  JOIN _enrichissement en ON en.cible = cr.referentiel_version_id
 WHERE r.code = 'PRI' AND cr.code = 'D2-16';
INSERT INTO preuve_attendue (exigence_id, referentiel_version_id, type, libelle, description, obligatoire, ordre)
SELECT ex.id, ex.referentiel_version_id, 'REGISTRE'::type_preuve_attendue, 'Relevé des votes exercés', 'Assemblées concernées, résolutions et sens du vote.', false, 1
  FROM exigence ex
  JOIN critere cr ON cr.id = ex.critere_id
  JOIN domaine d ON d.id = cr.domaine_id
  JOIN referentiel r ON r.id = d.referentiel_id
  JOIN _enrichissement en ON en.cible = cr.referentiel_version_id
 WHERE r.code = 'PRI' AND cr.code = 'D2-16';
INSERT INTO regle_analyse (critere_id, exigence_id, preuve_attendue_id, referentiel_version_id, code, type, libelle, severite, definition, ordre)
SELECT cr.id, ex.id, NULL, cr.referentiel_version_id, 'D2-16-R1', 'COHERENCE_DECLARATION'::type_regle_analyse, 'Les votes émis doivent être cohérents avec la politique de vote', 'MOYENNE'::niveau_criticite, '{"elements": ["principes énoncés dans la politique de vote", "sens des votes effectivement émis"]}'::jsonb, 0
  FROM critere cr
  JOIN domaine d ON d.id = cr.domaine_id
  JOIN referentiel r ON r.id = d.referentiel_id
  JOIN _enrichissement en ON en.cible = cr.referentiel_version_id
  JOIN exigence ex ON ex.critere_id = cr.id
 WHERE r.code = 'PRI' AND cr.code = 'D2-16';

-- PRI / D2-17
UPDATE exigence ex SET intitule = 'Dialogue régulier avec les sociétés investies',
       enonce = 'L''organisation doit entretenir un dialogue régulier avec les sociétés dans lesquelles elle investit sur leurs pratiques ESG, et conserver la trace de ces échanges : interlocuteurs, sujets abordés et suites.',
       origine = 'CONTENU_HUMAIN'
  FROM critere cr
  JOIN domaine d ON d.id = cr.domaine_id
  JOIN referentiel r ON r.id = d.referentiel_id
  JOIN _enrichissement en ON en.cible = cr.referentiel_version_id
 WHERE ex.critere_id = cr.id AND r.code = 'PRI' AND cr.code = 'D2-17';
INSERT INTO preuve_attendue (exigence_id, referentiel_version_id, type, libelle, description, obligatoire, ordre)
SELECT ex.id, ex.referentiel_version_id, 'REGISTRE'::type_preuve_attendue, 'Trace des échanges avec les sociétés investies', 'Dates, interlocuteurs, sujets ESG abordés et suites données.', true, 0
  FROM exigence ex
  JOIN critere cr ON cr.id = ex.critere_id
  JOIN domaine d ON d.id = cr.domaine_id
  JOIN referentiel r ON r.id = d.referentiel_id
  JOIN _enrichissement en ON en.cible = cr.referentiel_version_id
 WHERE r.code = 'PRI' AND cr.code = 'D2-17';
INSERT INTO regle_analyse (critere_id, exigence_id, preuve_attendue_id, referentiel_version_id, code, type, libelle, severite, definition, ordre)
SELECT cr.id, ex.id, p.id, cr.referentiel_version_id, 'D2-17-R1', 'ELEMENT_ATTENDU'::type_regle_analyse, 'Les échanges doivent porter sur des sujets ESG identifiables', 'MOYENNE'::niveau_criticite, '{"elements": ["sujets ESG abordés", "dates des échanges", "suites données"]}'::jsonb, 0
  FROM critere cr
  JOIN domaine d ON d.id = cr.domaine_id
  JOIN referentiel r ON r.id = d.referentiel_id
  JOIN _enrichissement en ON en.cible = cr.referentiel_version_id
  JOIN exigence ex ON ex.critere_id = cr.id
  JOIN preuve_attendue p ON p.exigence_id = ex.id AND p.ordre = 0
 WHERE r.code = 'PRI' AND cr.code = 'D2-17';

-- PRI / D2-18
UPDATE exigence ex SET intitule = 'Politique d''engagement actionnarial documentée',
       enonce = 'L''organisation doit disposer d''une politique d''engagement actionnarial écrite, précisant les situations dans lesquelles elle intervient auprès des sociétés investies, les moyens qu''elle mobilise et la façon dont elle rend compte de cet engagement.',
       origine = 'CONTENU_HUMAIN'
  FROM critere cr
  JOIN domaine d ON d.id = cr.domaine_id
  JOIN referentiel r ON r.id = d.referentiel_id
  JOIN _enrichissement en ON en.cible = cr.referentiel_version_id
 WHERE ex.critere_id = cr.id AND r.code = 'PRI' AND cr.code = 'D2-18';
INSERT INTO preuve_attendue (exigence_id, referentiel_version_id, type, libelle, description, obligatoire, ordre)
SELECT ex.id, ex.referentiel_version_id, 'POLITIQUE'::type_preuve_attendue, 'Politique d''engagement actionnarial', 'Situations d''intervention, moyens mobilisés et reddition de comptes.', true, 0
  FROM exigence ex
  JOIN critere cr ON cr.id = ex.critere_id
  JOIN domaine d ON d.id = cr.domaine_id
  JOIN referentiel r ON r.id = d.referentiel_id
  JOIN _enrichissement en ON en.cible = cr.referentiel_version_id
 WHERE r.code = 'PRI' AND cr.code = 'D2-18';
INSERT INTO regle_analyse (critere_id, exigence_id, preuve_attendue_id, referentiel_version_id, code, type, libelle, severite, definition, ordre)
SELECT cr.id, ex.id, p.id, cr.referentiel_version_id, 'D2-18-R1', 'SIGNATURE'::type_regle_analyse, 'La politique doit être validée par l''organe compétent', 'MOYENNE'::niveau_criticite, '{"mention_attendue": "validation par l''organe de gouvernance"}'::jsonb, 0
  FROM critere cr
  JOIN domaine d ON d.id = cr.domaine_id
  JOIN referentiel r ON r.id = d.referentiel_id
  JOIN _enrichissement en ON en.cible = cr.referentiel_version_id
  JOIN exigence ex ON ex.critere_id = cr.id
  JOIN preuve_attendue p ON p.exigence_id = ex.id AND p.ordre = 0
 WHERE r.code = 'PRI' AND cr.code = 'D2-18';

-- PRI / D3-19
UPDATE exigence ex SET intitule = 'Demande de publication ESG aux sociétés investies',
       enonce = 'L''organisation doit demander aux sociétés dans lesquelles elle investit de publier des informations ESG, et conserver la trace de ces demandes ainsi que des réponses obtenues.',
       origine = 'CONTENU_HUMAIN'
  FROM critere cr
  JOIN domaine d ON d.id = cr.domaine_id
  JOIN referentiel r ON r.id = d.referentiel_id
  JOIN _enrichissement en ON en.cible = cr.referentiel_version_id
 WHERE ex.critere_id = cr.id AND r.code = 'PRI' AND cr.code = 'D3-19';
INSERT INTO preuve_attendue (exigence_id, referentiel_version_id, type, libelle, description, obligatoire, ordre)
SELECT ex.id, ex.referentiel_version_id, 'REGISTRE'::type_preuve_attendue, 'Trace des demandes de publication adressées', 'Sociétés sollicitées, informations demandées et réponses obtenues.', true, 0
  FROM exigence ex
  JOIN critere cr ON cr.id = ex.critere_id
  JOIN domaine d ON d.id = cr.domaine_id
  JOIN referentiel r ON r.id = d.referentiel_id
  JOIN _enrichissement en ON en.cible = cr.referentiel_version_id
 WHERE r.code = 'PRI' AND cr.code = 'D3-19';

-- PRI / D3-20
UPDATE exigence ex SET intitule = 'Vérification des données ESG publiées par un tiers',
       enonce = 'Lorsque l''organisation s''appuie sur des données ESG publiées, elle doit indiquer si ces données font l''objet d''une vérification par un tiers indépendant et, le cas échéant, en produire l''attestation.',
       origine = 'CONTENU_HUMAIN'
  FROM critere cr
  JOIN domaine d ON d.id = cr.domaine_id
  JOIN referentiel r ON r.id = d.referentiel_id
  JOIN _enrichissement en ON en.cible = cr.referentiel_version_id
 WHERE ex.critere_id = cr.id AND r.code = 'PRI' AND cr.code = 'D3-20';
INSERT INTO preuve_attendue (exigence_id, referentiel_version_id, type, libelle, description, obligatoire, ordre)
SELECT ex.id, ex.referentiel_version_id, 'CERTIFICAT'::type_preuve_attendue, 'Attestation ou rapport de vérification par un tiers', 'Identifie le tiers, le périmètre vérifié et la conclusion.', true, 0
  FROM exigence ex
  JOIN critere cr ON cr.id = ex.critere_id
  JOIN domaine d ON d.id = cr.domaine_id
  JOIN referentiel r ON r.id = d.referentiel_id
  JOIN _enrichissement en ON en.cible = cr.referentiel_version_id
 WHERE r.code = 'PRI' AND cr.code = 'D3-20';
INSERT INTO regle_analyse (critere_id, exigence_id, preuve_attendue_id, referentiel_version_id, code, type, libelle, severite, definition, ordre)
SELECT cr.id, ex.id, p.id, cr.referentiel_version_id, 'D3-20-R1', 'ELEMENT_ATTENDU'::type_regle_analyse, 'L''attestation doit identifier le tiers et le périmètre', 'MOYENNE'::niveau_criticite, '{"elements": ["identité du tiers vérificateur", "périmètre vérifié", "conclusion"]}'::jsonb, 0
  FROM critere cr
  JOIN domaine d ON d.id = cr.domaine_id
  JOIN referentiel r ON r.id = d.referentiel_id
  JOIN _enrichissement en ON en.cible = cr.referentiel_version_id
  JOIN exigence ex ON ex.critere_id = cr.id
  JOIN preuve_attendue p ON p.exigence_id = ex.id AND p.ordre = 0
 WHERE r.code = 'PRI' AND cr.code = 'D3-20';
INSERT INTO regle_analyse (critere_id, exigence_id, preuve_attendue_id, referentiel_version_id, code, type, libelle, severite, definition, ordre)
SELECT cr.id, ex.id, p.id, cr.referentiel_version_id, 'D3-20-R2', 'DATE_VALIDITE'::type_regle_analyse, 'La vérification doit porter sur un exercice récent', 'MOYENNE'::niveau_criticite, '{"champ": "exercice couvert par la vérification"}'::jsonb, 1
  FROM critere cr
  JOIN domaine d ON d.id = cr.domaine_id
  JOIN referentiel r ON r.id = d.referentiel_id
  JOIN _enrichissement en ON en.cible = cr.referentiel_version_id
  JOIN exigence ex ON ex.critere_id = cr.id
  JOIN preuve_attendue p ON p.exigence_id = ex.id AND p.ordre = 0
 WHERE r.code = 'PRI' AND cr.code = 'D3-20';

-- PRI / D4-22
UPDATE exigence ex SET intitule = 'Promotion des PRI auprès des partenaires financiers',
       enonce = 'L''organisation doit pouvoir décrire les démarches par lesquelles elle encourage ses partenaires financiers à adopter les Principes pour l''investissement responsable, et en apporter des éléments factuels.',
       origine = 'CONTENU_HUMAIN'
  FROM critere cr
  JOIN domaine d ON d.id = cr.domaine_id
  JOIN referentiel r ON r.id = d.referentiel_id
  JOIN _enrichissement en ON en.cible = cr.referentiel_version_id
 WHERE ex.critere_id = cr.id AND r.code = 'PRI' AND cr.code = 'D4-22';
INSERT INTO preuve_attendue (exigence_id, referentiel_version_id, type, libelle, description, obligatoire, ordre)
SELECT ex.id, ex.referentiel_version_id, 'PREUVE_OPERATIONNELLE'::type_preuve_attendue, 'Éléments attestant des démarches menées', 'Courriers, présentations, comptes rendus de rencontres.', false, 0
  FROM exigence ex
  JOIN critere cr ON cr.id = ex.critere_id
  JOIN domaine d ON d.id = cr.domaine_id
  JOIN referentiel r ON r.id = d.referentiel_id
  JOIN _enrichissement en ON en.cible = cr.referentiel_version_id
 WHERE r.code = 'PRI' AND cr.code = 'D4-22';

-- PRI / D4-23
UPDATE exigence ex SET intitule = 'Participation à des initiatives collectives ESG',
       enonce = 'L''organisation doit pouvoir justifier de sa participation à des initiatives collectives ou associations professionnelles portant sur les enjeux ESG, en indiquant lesquelles et sous quelle forme.',
       origine = 'CONTENU_HUMAIN'
  FROM critere cr
  JOIN domaine d ON d.id = cr.domaine_id
  JOIN referentiel r ON r.id = d.referentiel_id
  JOIN _enrichissement en ON en.cible = cr.referentiel_version_id
 WHERE ex.critere_id = cr.id AND r.code = 'PRI' AND cr.code = 'D4-23';
INSERT INTO preuve_attendue (exigence_id, referentiel_version_id, type, libelle, description, obligatoire, ordre)
SELECT ex.id, ex.referentiel_version_id, 'DOCUMENT_LEGAL'::type_preuve_attendue, 'Preuve d''adhésion ou de participation', 'Attestation d''adhésion, convention ou compte rendu de participation.', true, 0
  FROM exigence ex
  JOIN critere cr ON cr.id = ex.critere_id
  JOIN domaine d ON d.id = cr.domaine_id
  JOIN referentiel r ON r.id = d.referentiel_id
  JOIN _enrichissement en ON en.cible = cr.referentiel_version_id
 WHERE r.code = 'PRI' AND cr.code = 'D4-23';

-- PRI / D4-24
UPDATE exigence ex SET intitule = 'Intégration des PRI dans les contrats et chartes',
       enonce = 'L''organisation doit intégrer une référence aux Principes pour l''investissement responsable dans ses contrats ou chartes de collaboration, et pouvoir en produire un exemple.',
       origine = 'CONTENU_HUMAIN'
  FROM critere cr
  JOIN domaine d ON d.id = cr.domaine_id
  JOIN referentiel r ON r.id = d.referentiel_id
  JOIN _enrichissement en ON en.cible = cr.referentiel_version_id
 WHERE ex.critere_id = cr.id AND r.code = 'PRI' AND cr.code = 'D4-24';
INSERT INTO preuve_attendue (exigence_id, referentiel_version_id, type, libelle, description, obligatoire, ordre)
SELECT ex.id, ex.referentiel_version_id, 'DOCUMENT_LEGAL'::type_preuve_attendue, 'Contrat ou charte comportant la référence aux PRI', 'Exemple de clause ou d''article intégrant les principes.', true, 0
  FROM exigence ex
  JOIN critere cr ON cr.id = ex.critere_id
  JOIN domaine d ON d.id = cr.domaine_id
  JOIN referentiel r ON r.id = d.referentiel_id
  JOIN _enrichissement en ON en.cible = cr.referentiel_version_id
 WHERE r.code = 'PRI' AND cr.code = 'D4-24';
INSERT INTO regle_analyse (critere_id, exigence_id, preuve_attendue_id, referentiel_version_id, code, type, libelle, severite, definition, ordre)
SELECT cr.id, ex.id, p.id, cr.referentiel_version_id, 'D4-24-R1', 'ELEMENT_ATTENDU'::type_regle_analyse, 'La référence aux PRI doit figurer dans le document', 'MOYENNE'::niveau_criticite, '{"elements": ["référence aux Principes pour l''investissement responsable"]}'::jsonb, 0
  FROM critere cr
  JOIN domaine d ON d.id = cr.domaine_id
  JOIN referentiel r ON r.id = d.referentiel_id
  JOIN _enrichissement en ON en.cible = cr.referentiel_version_id
  JOIN exigence ex ON ex.critere_id = cr.id
  JOIN preuve_attendue p ON p.exigence_id = ex.id AND p.ordre = 0
 WHERE r.code = 'PRI' AND cr.code = 'D4-24';

-- PRI / D5-25
UPDATE exigence ex SET intitule = 'Collaboration avec d''autres signataires des PRI',
       enonce = 'L''organisation doit pouvoir décrire les collaborations engagées avec d''autres signataires des PRI et l''objet de ces collaborations.',
       origine = 'CONTENU_HUMAIN'
  FROM critere cr
  JOIN domaine d ON d.id = cr.domaine_id
  JOIN referentiel r ON r.id = d.referentiel_id
  JOIN _enrichissement en ON en.cible = cr.referentiel_version_id
 WHERE ex.critere_id = cr.id AND r.code = 'PRI' AND cr.code = 'D5-25';
INSERT INTO preuve_attendue (exigence_id, referentiel_version_id, type, libelle, description, obligatoire, ordre)
SELECT ex.id, ex.referentiel_version_id, 'PREUVE_OPERATIONNELLE'::type_preuve_attendue, 'Éléments attestant des collaborations', 'Conventions, comptes rendus, publications communes.', false, 0
  FROM exigence ex
  JOIN critere cr ON cr.id = ex.critere_id
  JOIN domaine d ON d.id = cr.domaine_id
  JOIN referentiel r ON r.id = d.referentiel_id
  JOIN _enrichissement en ON en.cible = cr.referentiel_version_id
 WHERE r.code = 'PRI' AND cr.code = 'D5-25';

-- PRI / D5-26
UPDATE exigence ex SET intitule = 'Participation à des coalitions d''investisseurs',
       enonce = 'L''organisation doit pouvoir justifier de sa participation à des coalitions d''investisseurs constituées autour de thématiques ESG, en indiquant lesquelles et la nature de son engagement.',
       origine = 'CONTENU_HUMAIN'
  FROM critere cr
  JOIN domaine d ON d.id = cr.domaine_id
  JOIN referentiel r ON r.id = d.referentiel_id
  JOIN _enrichissement en ON en.cible = cr.referentiel_version_id
 WHERE ex.critere_id = cr.id AND r.code = 'PRI' AND cr.code = 'D5-26';
INSERT INTO preuve_attendue (exigence_id, referentiel_version_id, type, libelle, description, obligatoire, ordre)
SELECT ex.id, ex.referentiel_version_id, 'DOCUMENT_LEGAL'::type_preuve_attendue, 'Preuve de participation à une coalition', 'Adhésion, déclaration commune ou convention.', true, 0
  FROM exigence ex
  JOIN critere cr ON cr.id = ex.critere_id
  JOIN domaine d ON d.id = cr.domaine_id
  JOIN referentiel r ON r.id = d.referentiel_id
  JOIN _enrichissement en ON en.cible = cr.referentiel_version_id
 WHERE r.code = 'PRI' AND cr.code = 'D5-26';

-- PRI / D5-27
UPDATE exigence ex SET intitule = 'Projets communs de plaidoyer ou de recherche ESG',
       enonce = 'L''organisation doit pouvoir décrire les projets communs de plaidoyer ou de recherche ESG auxquels elle prend part, et en produire les livrables ou les traces.',
       origine = 'CONTENU_HUMAIN'
  FROM critere cr
  JOIN domaine d ON d.id = cr.domaine_id
  JOIN referentiel r ON r.id = d.referentiel_id
  JOIN _enrichissement en ON en.cible = cr.referentiel_version_id
 WHERE ex.critere_id = cr.id AND r.code = 'PRI' AND cr.code = 'D5-27';
INSERT INTO preuve_attendue (exigence_id, referentiel_version_id, type, libelle, description, obligatoire, ordre)
SELECT ex.id, ex.referentiel_version_id, 'RAPPORT'::type_preuve_attendue, 'Livrables des projets communs', 'Publications, prises de position ou travaux de recherche.', false, 0
  FROM exigence ex
  JOIN critere cr ON cr.id = ex.critere_id
  JOIN domaine d ON d.id = cr.domaine_id
  JOIN referentiel r ON r.id = d.referentiel_id
  JOIN _enrichissement en ON en.cible = cr.referentiel_version_id
 WHERE r.code = 'PRI' AND cr.code = 'D5-27';

-- PRI / D6-28
UPDATE exigence ex SET intitule = 'Publication d''un rapport annuel ESG',
       enonce = 'L''organisation doit publier chaque année un rapport rendant compte de ses pratiques et de ses progrès en matière d''investissement responsable, et le rendre accessible à ses parties prenantes.',
       origine = 'CONTENU_HUMAIN'
  FROM critere cr
  JOIN domaine d ON d.id = cr.domaine_id
  JOIN referentiel r ON r.id = d.referentiel_id
  JOIN _enrichissement en ON en.cible = cr.referentiel_version_id
 WHERE ex.critere_id = cr.id AND r.code = 'PRI' AND cr.code = 'D6-28';
INSERT INTO preuve_attendue (exigence_id, referentiel_version_id, type, libelle, description, obligatoire, ordre)
SELECT ex.id, ex.referentiel_version_id, 'RAPPORT'::type_preuve_attendue, 'Rapport annuel ESG ou PRI', 'Rapport publié couvrant le dernier exercice.', true, 0
  FROM exigence ex
  JOIN critere cr ON cr.id = ex.critere_id
  JOIN domaine d ON d.id = cr.domaine_id
  JOIN referentiel r ON r.id = d.referentiel_id
  JOIN _enrichissement en ON en.cible = cr.referentiel_version_id
 WHERE r.code = 'PRI' AND cr.code = 'D6-28';
INSERT INTO regle_analyse (critere_id, exigence_id, preuve_attendue_id, referentiel_version_id, code, type, libelle, severite, definition, ordre)
SELECT cr.id, ex.id, p.id, cr.referentiel_version_id, 'D6-28-R1', 'DATE_VALIDITE'::type_regle_analyse, 'Le rapport doit couvrir le dernier exercice clos', 'ELEVEE'::niveau_criticite, '{"champ": "exercice couvert par le rapport", "anciennete_maximale_mois": 24}'::jsonb, 0
  FROM critere cr
  JOIN domaine d ON d.id = cr.domaine_id
  JOIN referentiel r ON r.id = d.referentiel_id
  JOIN _enrichissement en ON en.cible = cr.referentiel_version_id
  JOIN exigence ex ON ex.critere_id = cr.id
  JOIN preuve_attendue p ON p.exigence_id = ex.id AND p.ordre = 0
 WHERE r.code = 'PRI' AND cr.code = 'D6-28';

-- PRI / D6-29
UPDATE exigence ex SET intitule = 'Mesure chiffrée des progrès',
       enonce = 'L''organisation doit suivre ses progrès ESG au moyen d''indicateurs chiffrés, comparables d''une période à l''autre, et publier ou conserver les valeurs constatées.',
       origine = 'CONTENU_HUMAIN'
  FROM critere cr
  JOIN domaine d ON d.id = cr.domaine_id
  JOIN referentiel r ON r.id = d.referentiel_id
  JOIN _enrichissement en ON en.cible = cr.referentiel_version_id
 WHERE ex.critere_id = cr.id AND r.code = 'PRI' AND cr.code = 'D6-29';
INSERT INTO preuve_attendue (exigence_id, referentiel_version_id, type, libelle, description, obligatoire, ordre)
SELECT ex.id, ex.referentiel_version_id, 'INDICATEUR'::type_preuve_attendue, 'Indicateurs ESG suivis', 'Valeurs sur au moins deux périodes comparables.', true, 0
  FROM exigence ex
  JOIN critere cr ON cr.id = ex.critere_id
  JOIN domaine d ON d.id = cr.domaine_id
  JOIN referentiel r ON r.id = d.referentiel_id
  JOIN _enrichissement en ON en.cible = cr.referentiel_version_id
 WHERE r.code = 'PRI' AND cr.code = 'D6-29';
INSERT INTO regle_analyse (critere_id, exigence_id, preuve_attendue_id, referentiel_version_id, code, type, libelle, severite, definition, ordre)
SELECT cr.id, ex.id, p.id, cr.referentiel_version_id, 'D6-29-R1', 'PRESENCE'::type_regle_analyse, 'Des valeurs chiffrées sur plusieurs périodes doivent être fournies', 'MOYENNE'::niveau_criticite, '{"elements": ["indicateurs chiffrés", "périodes comparables"]}'::jsonb, 0
  FROM critere cr
  JOIN domaine d ON d.id = cr.domaine_id
  JOIN referentiel r ON r.id = d.referentiel_id
  JOIN _enrichissement en ON en.cible = cr.referentiel_version_id
  JOIN exigence ex ON ex.critere_id = cr.id
  JOIN preuve_attendue p ON p.exigence_id = ex.id AND p.ordre = 0
 WHERE r.code = 'PRI' AND cr.code = 'D6-29';


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

UPDATE referentiel r SET version = '2.1'
  FROM _enrichissement e JOIN referentiel_version v ON v.id = e.cible
 WHERE v.referentiel_id = r.id;

-- --- 6. Vérification ---------------------------------------------------

DO $verif$
DECLARE
    exig_attendues    CONSTANT integer := 136;
    preuves_attendues CONSTANT integer := 196;
    regles_attendues  CONSTANT integer := 98;
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

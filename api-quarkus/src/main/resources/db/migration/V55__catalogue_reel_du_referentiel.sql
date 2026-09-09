-- =====================================================================
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
    SELECT s.referentiel_id, '2.0',
           'Catalogue réel semé depuis la source versionnée (referentiel-source).',
           0, 0, 'BROUILLON', now(), s.ancienne
      FROM _semis s
    RETURNING id, remplace_version_id
)
UPDATE _semis s SET nouvelle = n.id FROM nouvelles n WHERE n.remplace_version_id = s.ancienne;

-- --- 3. Contenu du catalogue -------------------------------------------


-- ======================= SMARTEX_SUSTWAY =======================

INSERT INTO domaine (referentiel_id, referentiel_version_id, code, nom, description, ordre)
VALUES ((SELECT id FROM referentiel WHERE code = 'SMARTEX_SUSTWAY'), (SELECT s.nouvelle FROM _semis s JOIN referentiel r ON r.id = s.referentiel_id WHERE r.code = 'SMARTEX_SUSTWAY'), 'D1', 'Les valeurs et principes éthiques, de RSE / ESG / Développement Durable qui régissent le fonctionnement de l''entreprise dans son environnement concurrentiel', 'Dimension "Les valeurs et principes éthiques, de RSE / ESG / Développement Durable qui régissent le fonctionnement de l''entreprise dans son environnement concurrentiel" (adaptation aux principes de l''ISO 26000).', 1);
INSERT INTO critere (domaine_id, sous_domaine_id, referentiel_version_id, code, libelle, description, applicabilite, criticite_id, actif, coefficient_ponderation)
SELECT d.id, NULL, d.referentiel_version_id, 'D1-01', 'Avez-vous défini et formalisé, au sein de votre entreprise, dans un "Code de conduite et d''éthique", les valeurs et principes sur lesquels se fondent vos relations avec l''ensemble de vos parties prenantes (internes comme externes) ?', NULL, 'GENERALE'::type_applicabilite, (SELECT cr.id FROM criticite cr WHERE cr.code = 'MOYENNE'::niveau_criticite), true, 3.0
  FROM domaine d WHERE d.referentiel_version_id = (SELECT s.nouvelle FROM _semis s JOIN referentiel r ON r.id = s.referentiel_id WHERE r.code = 'SMARTEX_SUSTWAY') AND d.code = 'D1';
INSERT INTO question (critere_id, referentiel_version_id, code, libelle, type, ordre, obligatoire, echelle_reponse)
SELECT c.id, c.referentiel_version_id, 'D1-01-Q1', 'Avez-vous défini et formalisé, au sein de votre entreprise, dans un "Code de conduite et d''éthique", les valeurs et principes sur lesquels se fondent vos relations avec l''ensemble de vos parties prenantes (internes comme externes) ?', 'FERMEE'::type_question, 1, true, 'MATURITE'
  FROM critere c WHERE c.referentiel_version_id = (SELECT s.nouvelle FROM _semis s JOIN referentiel r ON r.id = s.referentiel_id WHERE r.code = 'SMARTEX_SUSTWAY') AND c.code = 'D1-01';
INSERT INTO exigence (critere_id, referentiel_version_id, code, intitule, enonce, ordre, origine)
SELECT c.id, c.referentiel_version_id, c.code || '-E1', left(c.libelle, 300), c.libelle, 0, 'CONTENU_INITIAL'
  FROM critere c WHERE c.referentiel_version_id = (SELECT s.nouvelle FROM _semis s JOIN referentiel r ON r.id = s.referentiel_id WHERE r.code = 'SMARTEX_SUSTWAY') AND c.code = 'D1-01';

INSERT INTO critere (domaine_id, sous_domaine_id, referentiel_version_id, code, libelle, description, applicabilite, criticite_id, actif, coefficient_ponderation)
SELECT d.id, NULL, d.referentiel_version_id, 'D1-02', 'Initiez les salariés à l’importance des valeurs et des règles de conduite de l''entreprise', NULL, 'GENERALE'::type_applicabilite, (SELECT cr.id FROM criticite cr WHERE cr.code = 'MOYENNE'::niveau_criticite), true, 3.0
  FROM domaine d WHERE d.referentiel_version_id = (SELECT s.nouvelle FROM _semis s JOIN referentiel r ON r.id = s.referentiel_id WHERE r.code = 'SMARTEX_SUSTWAY') AND d.code = 'D1';
INSERT INTO question (critere_id, referentiel_version_id, code, libelle, type, ordre, obligatoire, echelle_reponse)
SELECT c.id, c.referentiel_version_id, 'D1-02-Q1', 'Initiez les salariés à l’importance des valeurs et des règles de conduite de l''entreprise', 'FERMEE'::type_question, 1, true, 'MATURITE'
  FROM critere c WHERE c.referentiel_version_id = (SELECT s.nouvelle FROM _semis s JOIN referentiel r ON r.id = s.referentiel_id WHERE r.code = 'SMARTEX_SUSTWAY') AND c.code = 'D1-02';
INSERT INTO exigence (critere_id, referentiel_version_id, code, intitule, enonce, ordre, origine)
SELECT c.id, c.referentiel_version_id, c.code || '-E1', left(c.libelle, 300), c.libelle, 0, 'CONTENU_INITIAL'
  FROM critere c WHERE c.referentiel_version_id = (SELECT s.nouvelle FROM _semis s JOIN referentiel r ON r.id = s.referentiel_id WHERE r.code = 'SMARTEX_SUSTWAY') AND c.code = 'D1-02';

INSERT INTO critere (domaine_id, sous_domaine_id, referentiel_version_id, code, libelle, description, applicabilite, criticite_id, actif, coefficient_ponderation)
SELECT d.id, NULL, d.referentiel_version_id, 'D1-03', 'Communiquez les valeurs de l''entreprise aux clients, partenaires commerciaux, fournisseurs et autres parties intéressées (par ex., lors de présentations commerciales, dans le matériel de marketing ou les communications informelles) ?', NULL, 'GENERALE'::type_applicabilite, (SELECT cr.id FROM criticite cr WHERE cr.code = 'MOYENNE'::niveau_criticite), true, 3.0
  FROM domaine d WHERE d.referentiel_version_id = (SELECT s.nouvelle FROM _semis s JOIN referentiel r ON r.id = s.referentiel_id WHERE r.code = 'SMARTEX_SUSTWAY') AND d.code = 'D1';
INSERT INTO question (critere_id, referentiel_version_id, code, libelle, type, ordre, obligatoire, echelle_reponse)
SELECT c.id, c.referentiel_version_id, 'D1-03-Q1', 'Communiquez les valeurs de l''entreprise aux clients, partenaires commerciaux, fournisseurs et autres parties intéressées (par ex., lors de présentations commerciales, dans le matériel de marketing ou les communications informelles) ?', 'FERMEE'::type_question, 1, true, 'MATURITE'
  FROM critere c WHERE c.referentiel_version_id = (SELECT s.nouvelle FROM _semis s JOIN referentiel r ON r.id = s.referentiel_id WHERE r.code = 'SMARTEX_SUSTWAY') AND c.code = 'D1-03';
INSERT INTO exigence (critere_id, referentiel_version_id, code, intitule, enonce, ordre, origine)
SELECT c.id, c.referentiel_version_id, c.code || '-E1', left(c.libelle, 300), c.libelle, 0, 'CONTENU_INITIAL'
  FROM critere c WHERE c.referentiel_version_id = (SELECT s.nouvelle FROM _semis s JOIN referentiel r ON r.id = s.referentiel_id WHERE r.code = 'SMARTEX_SUSTWAY') AND c.code = 'D1-03';

INSERT INTO critere (domaine_id, sous_domaine_id, referentiel_version_id, code, libelle, description, applicabilite, criticite_id, actif, coefficient_ponderation)
SELECT d.id, NULL, d.referentiel_version_id, 'D1-04', 'Redevabilité : Rendre des comptes à la société sur les impacts engendrés par un organisme, par ses activités et ses décisions : Votre entreprise rend-t-elle compte des impacts de ces décisions et activités au personnel et aux autres parties prenantes (les fournisseurs, l’Etat, Clients, Consommateurs, actionnaires, les riverains) ? (impacts environnementaux ; impacts économiques ; impacts sociaux ; risques de santé – sécurité ; ….,).', NULL, 'GENERALE'::type_applicabilite, (SELECT cr.id FROM criticite cr WHERE cr.code = 'MOYENNE'::niveau_criticite), true, 3.0
  FROM domaine d WHERE d.referentiel_version_id = (SELECT s.nouvelle FROM _semis s JOIN referentiel r ON r.id = s.referentiel_id WHERE r.code = 'SMARTEX_SUSTWAY') AND d.code = 'D1';
INSERT INTO question (critere_id, referentiel_version_id, code, libelle, type, ordre, obligatoire, echelle_reponse)
SELECT c.id, c.referentiel_version_id, 'D1-04-Q1', 'Redevabilité : Rendre des comptes à la société sur les impacts engendrés par un organisme, par ses activités et ses décisions : Votre entreprise rend-t-elle compte des impacts de ces décisions et activités au personnel et aux autres parties prenantes (les fournisseurs, l’Etat, Clients, Consommateurs, actionnaires, les riverains) ? (impacts environnementaux ; impacts économiques ; impacts sociaux ; risques de santé – sécurité ; ….,).', 'FERMEE'::type_question, 1, true, 'MATURITE'
  FROM critere c WHERE c.referentiel_version_id = (SELECT s.nouvelle FROM _semis s JOIN referentiel r ON r.id = s.referentiel_id WHERE r.code = 'SMARTEX_SUSTWAY') AND c.code = 'D1-04';
INSERT INTO exigence (critere_id, referentiel_version_id, code, intitule, enonce, ordre, origine)
SELECT c.id, c.referentiel_version_id, c.code || '-E1', left(c.libelle, 300), c.libelle, 0, 'CONTENU_INITIAL'
  FROM critere c WHERE c.referentiel_version_id = (SELECT s.nouvelle FROM _semis s JOIN referentiel r ON r.id = s.referentiel_id WHERE r.code = 'SMARTEX_SUSTWAY') AND c.code = 'D1-04';

INSERT INTO critere (domaine_id, sous_domaine_id, referentiel_version_id, code, libelle, description, applicabilite, criticite_id, actif, coefficient_ponderation)
SELECT d.id, NULL, d.referentiel_version_id, 'D1-05', 'Transparence : communiquer et fournir des informations sur les décisions et sur les activités qui ont un impact significatif sur la société, l''économie, l''environnement présent et futur ?', NULL, 'GENERALE'::type_applicabilite, (SELECT cr.id FROM criticite cr WHERE cr.code = 'MOYENNE'::niveau_criticite), true, 3.0
  FROM domaine d WHERE d.referentiel_version_id = (SELECT s.nouvelle FROM _semis s JOIN referentiel r ON r.id = s.referentiel_id WHERE r.code = 'SMARTEX_SUSTWAY') AND d.code = 'D1';
INSERT INTO question (critere_id, referentiel_version_id, code, libelle, type, ordre, obligatoire, echelle_reponse)
SELECT c.id, c.referentiel_version_id, 'D1-05-Q1', 'Transparence : communiquer et fournir des informations sur les décisions et sur les activités qui ont un impact significatif sur la société, l''économie, l''environnement présent et futur ?', 'FERMEE'::type_question, 1, true, 'MATURITE'
  FROM critere c WHERE c.referentiel_version_id = (SELECT s.nouvelle FROM _semis s JOIN referentiel r ON r.id = s.referentiel_id WHERE r.code = 'SMARTEX_SUSTWAY') AND c.code = 'D1-05';
INSERT INTO exigence (critere_id, referentiel_version_id, code, intitule, enonce, ordre, origine)
SELECT c.id, c.referentiel_version_id, c.code || '-E1', left(c.libelle, 300), c.libelle, 0, 'CONTENU_INITIAL'
  FROM critere c WHERE c.referentiel_version_id = (SELECT s.nouvelle FROM _semis s JOIN referentiel r ON r.id = s.referentiel_id WHERE r.code = 'SMARTEX_SUSTWAY') AND c.code = 'D1-05';

INSERT INTO critere (domaine_id, sous_domaine_id, referentiel_version_id, code, libelle, description, applicabilite, criticite_id, actif, coefficient_ponderation)
SELECT d.id, NULL, d.referentiel_version_id, 'D1-06', 'Reconnaissance des intérêts des parties prenantes : Construire la cartographie des parties prenantes, Identifier leurs attentes, leurs besoins et exigences et s''assurer que les décisions et activités répondent à ces attentes identifiées ?', NULL, 'GENERALE'::type_applicabilite, (SELECT cr.id FROM criticite cr WHERE cr.code = 'MOYENNE'::niveau_criticite), true, 3.0
  FROM domaine d WHERE d.referentiel_version_id = (SELECT s.nouvelle FROM _semis s JOIN referentiel r ON r.id = s.referentiel_id WHERE r.code = 'SMARTEX_SUSTWAY') AND d.code = 'D1';
INSERT INTO question (critere_id, referentiel_version_id, code, libelle, type, ordre, obligatoire, echelle_reponse)
SELECT c.id, c.referentiel_version_id, 'D1-06-Q1', 'Reconnaissance des intérêts des parties prenantes : Construire la cartographie des parties prenantes, Identifier leurs attentes, leurs besoins et exigences et s''assurer que les décisions et activités répondent à ces attentes identifiées ?', 'FERMEE'::type_question, 1, true, 'MATURITE'
  FROM critere c WHERE c.referentiel_version_id = (SELECT s.nouvelle FROM _semis s JOIN referentiel r ON r.id = s.referentiel_id WHERE r.code = 'SMARTEX_SUSTWAY') AND c.code = 'D1-06';
INSERT INTO exigence (critere_id, referentiel_version_id, code, intitule, enonce, ordre, origine)
SELECT c.id, c.referentiel_version_id, c.code || '-E1', left(c.libelle, 300), c.libelle, 0, 'CONTENU_INITIAL'
  FROM critere c WHERE c.referentiel_version_id = (SELECT s.nouvelle FROM _semis s JOIN referentiel r ON r.id = s.referentiel_id WHERE r.code = 'SMARTEX_SUSTWAY') AND c.code = 'D1-06';

INSERT INTO critere (domaine_id, sous_domaine_id, referentiel_version_id, code, libelle, description, applicabilite, criticite_id, actif, coefficient_ponderation)
SELECT d.id, NULL, d.referentiel_version_id, 'D1-07', 'Respect des droits de l''homme : L’entreprise doit disposer d’un dispositif administratif qui permet le respect des droits de l’homme et la reconnaissance de leur importance ?', NULL, 'GENERALE'::type_applicabilite, (SELECT cr.id FROM criticite cr WHERE cr.code = 'MOYENNE'::niveau_criticite), true, 1.0
  FROM domaine d WHERE d.referentiel_version_id = (SELECT s.nouvelle FROM _semis s JOIN referentiel r ON r.id = s.referentiel_id WHERE r.code = 'SMARTEX_SUSTWAY') AND d.code = 'D1';
INSERT INTO question (critere_id, referentiel_version_id, code, libelle, type, ordre, obligatoire, echelle_reponse)
SELECT c.id, c.referentiel_version_id, 'D1-07-Q1', 'Respect des droits de l''homme : L’entreprise doit disposer d’un dispositif administratif qui permet le respect des droits de l’homme et la reconnaissance de leur importance ?', 'FERMEE'::type_question, 1, true, 'MATURITE'
  FROM critere c WHERE c.referentiel_version_id = (SELECT s.nouvelle FROM _semis s JOIN referentiel r ON r.id = s.referentiel_id WHERE r.code = 'SMARTEX_SUSTWAY') AND c.code = 'D1-07';
INSERT INTO exigence (critere_id, referentiel_version_id, code, intitule, enonce, ordre, origine)
SELECT c.id, c.referentiel_version_id, c.code || '-E1', left(c.libelle, 300), c.libelle, 0, 'CONTENU_INITIAL'
  FROM critere c WHERE c.referentiel_version_id = (SELECT s.nouvelle FROM _semis s JOIN referentiel r ON r.id = s.referentiel_id WHERE r.code = 'SMARTEX_SUSTWAY') AND c.code = 'D1-07';

INSERT INTO domaine (referentiel_id, referentiel_version_id, code, nom, description, ordre)
VALUES ((SELECT id FROM referentiel WHERE code = 'SMARTEX_SUSTWAY'), (SELECT s.nouvelle FROM _semis s JOIN referentiel r ON r.id = s.referentiel_id WHERE r.code = 'SMARTEX_SUSTWAY'), 'D2', 'Bonnes pratiques relatives à la dimension « Gouvernance d’entreprise', 'Dimension Bonnes pratiques relatives à la dimension « Gouvernance d’entreprise »', 2);
INSERT INTO sous_domaine (domaine_id, referentiel_version_id, code, nom, description, ordre)
SELECT d.id, d.referentiel_version_id, 'D2-S1', 'A) Information financière et conseil d’administration', 'A) Information financière et conseil d’administration', 1
  FROM domaine d WHERE d.referentiel_version_id = (SELECT s.nouvelle FROM _semis s JOIN referentiel r ON r.id = s.referentiel_id WHERE r.code = 'SMARTEX_SUSTWAY') AND d.code = 'D2';
INSERT INTO sous_domaine (domaine_id, referentiel_version_id, code, nom, description, ordre)
SELECT d.id, d.referentiel_version_id, 'D2-S2', 'B) Lutte contre la corruption', 'B) Lutte contre la corruption', 2
  FROM domaine d WHERE d.referentiel_version_id = (SELECT s.nouvelle FROM _semis s JOIN referentiel r ON r.id = s.referentiel_id WHERE r.code = 'SMARTEX_SUSTWAY') AND d.code = 'D2';
INSERT INTO sous_domaine (domaine_id, referentiel_version_id, code, nom, description, ordre)
SELECT d.id, d.referentiel_version_id, 'D2-S3', 'C) Discipline fiscale', 'C) Discipline fiscale', 3
  FROM domaine d WHERE d.referentiel_version_id = (SELECT s.nouvelle FROM _semis s JOIN referentiel r ON r.id = s.referentiel_id WHERE r.code = 'SMARTEX_SUSTWAY') AND d.code = 'D2';
INSERT INTO sous_domaine (domaine_id, referentiel_version_id, code, nom, description, ordre)
SELECT d.id, d.referentiel_version_id, 'D2-S4', 'D) Droits de l’homme', 'D) Droits de l’homme', 4
  FROM domaine d WHERE d.referentiel_version_id = (SELECT s.nouvelle FROM _semis s JOIN referentiel r ON r.id = s.referentiel_id WHERE r.code = 'SMARTEX_SUSTWAY') AND d.code = 'D2';
INSERT INTO critere (domaine_id, sous_domaine_id, referentiel_version_id, code, libelle, description, applicabilite, criticite_id, actif, coefficient_ponderation)
SELECT d.id, (SELECT sd.id FROM sous_domaine sd WHERE sd.domaine_id = d.id AND sd.code = 'D2-S1'), d.referentiel_version_id, 'D2-08', 'Diffuser les informations sur les résultats financiers et non financiers de l’entreprise et garantir leur transparence et leur accès.', NULL, 'GENERALE'::type_applicabilite, (SELECT cr.id FROM criticite cr WHERE cr.code = 'MOYENNE'::niveau_criticite), true, 3.0
  FROM domaine d WHERE d.referentiel_version_id = (SELECT s.nouvelle FROM _semis s JOIN referentiel r ON r.id = s.referentiel_id WHERE r.code = 'SMARTEX_SUSTWAY') AND d.code = 'D2';
INSERT INTO question (critere_id, referentiel_version_id, code, libelle, type, ordre, obligatoire, echelle_reponse)
SELECT c.id, c.referentiel_version_id, 'D2-08-Q1', 'Diffuser les informations sur les résultats financiers et non financiers de l’entreprise et garantir leur transparence et leur accès.', 'FERMEE'::type_question, 1, true, 'MATURITE'
  FROM critere c WHERE c.referentiel_version_id = (SELECT s.nouvelle FROM _semis s JOIN referentiel r ON r.id = s.referentiel_id WHERE r.code = 'SMARTEX_SUSTWAY') AND c.code = 'D2-08';
INSERT INTO exigence (critere_id, referentiel_version_id, code, intitule, enonce, ordre, origine)
SELECT c.id, c.referentiel_version_id, c.code || '-E1', left(c.libelle, 300), c.libelle, 0, 'CONTENU_INITIAL'
  FROM critere c WHERE c.referentiel_version_id = (SELECT s.nouvelle FROM _semis s JOIN referentiel r ON r.id = s.referentiel_id WHERE r.code = 'SMARTEX_SUSTWAY') AND c.code = 'D2-08';

INSERT INTO critere (domaine_id, sous_domaine_id, referentiel_version_id, code, libelle, description, applicabilite, criticite_id, actif, coefficient_ponderation)
SELECT d.id, (SELECT sd.id FROM sous_domaine sd WHERE sd.domaine_id = d.id AND sd.code = 'D2-S1'), d.referentiel_version_id, 'D2-09', 'Garantir le respect des droits de propriété tels que mentionnés dans les textes (les propriétaires de l’entreprise sont bénéficiaires des résultats de l’utilisation de leurs droits).', NULL, 'GENERALE'::type_applicabilite, (SELECT cr.id FROM criticite cr WHERE cr.code = 'MOYENNE'::niveau_criticite), true, 2.0
  FROM domaine d WHERE d.referentiel_version_id = (SELECT s.nouvelle FROM _semis s JOIN referentiel r ON r.id = s.referentiel_id WHERE r.code = 'SMARTEX_SUSTWAY') AND d.code = 'D2';
INSERT INTO question (critere_id, referentiel_version_id, code, libelle, type, ordre, obligatoire, echelle_reponse)
SELECT c.id, c.referentiel_version_id, 'D2-09-Q1', 'Garantir le respect des droits de propriété tels que mentionnés dans les textes (les propriétaires de l’entreprise sont bénéficiaires des résultats de l’utilisation de leurs droits).', 'FERMEE'::type_question, 1, true, 'MATURITE'
  FROM critere c WHERE c.referentiel_version_id = (SELECT s.nouvelle FROM _semis s JOIN referentiel r ON r.id = s.referentiel_id WHERE r.code = 'SMARTEX_SUSTWAY') AND c.code = 'D2-09';
INSERT INTO exigence (critere_id, referentiel_version_id, code, intitule, enonce, ordre, origine)
SELECT c.id, c.referentiel_version_id, c.code || '-E1', left(c.libelle, 300), c.libelle, 0, 'CONTENU_INITIAL'
  FROM critere c WHERE c.referentiel_version_id = (SELECT s.nouvelle FROM _semis s JOIN referentiel r ON r.id = s.referentiel_id WHERE r.code = 'SMARTEX_SUSTWAY') AND c.code = 'D2-09';

INSERT INTO critere (domaine_id, sous_domaine_id, referentiel_version_id, code, libelle, description, applicabilite, criticite_id, actif, coefficient_ponderation)
SELECT d.id, (SELECT sd.id FROM sous_domaine sd WHERE sd.domaine_id = d.id AND sd.code = 'D2-S1'), d.referentiel_version_id, 'D2-10', 'Promouvoir l’actionnariat salarié (analyse structure du capital).', NULL, 'GENERALE'::type_applicabilite, (SELECT cr.id FROM criticite cr WHERE cr.code = 'MOYENNE'::niveau_criticite), true, 2.0
  FROM domaine d WHERE d.referentiel_version_id = (SELECT s.nouvelle FROM _semis s JOIN referentiel r ON r.id = s.referentiel_id WHERE r.code = 'SMARTEX_SUSTWAY') AND d.code = 'D2';
INSERT INTO question (critere_id, referentiel_version_id, code, libelle, type, ordre, obligatoire, echelle_reponse)
SELECT c.id, c.referentiel_version_id, 'D2-10-Q1', 'Promouvoir l’actionnariat salarié (analyse structure du capital).', 'FERMEE'::type_question, 1, true, 'MATURITE'
  FROM critere c WHERE c.referentiel_version_id = (SELECT s.nouvelle FROM _semis s JOIN referentiel r ON r.id = s.referentiel_id WHERE r.code = 'SMARTEX_SUSTWAY') AND c.code = 'D2-10';
INSERT INTO exigence (critere_id, referentiel_version_id, code, intitule, enonce, ordre, origine)
SELECT c.id, c.referentiel_version_id, c.code || '-E1', left(c.libelle, 300), c.libelle, 0, 'CONTENU_INITIAL'
  FROM critere c WHERE c.referentiel_version_id = (SELECT s.nouvelle FROM _semis s JOIN referentiel r ON r.id = s.referentiel_id WHERE r.code = 'SMARTEX_SUSTWAY') AND c.code = 'D2-10';

INSERT INTO critere (domaine_id, sous_domaine_id, referentiel_version_id, code, libelle, description, applicabilite, criticite_id, actif, coefficient_ponderation)
SELECT d.id, (SELECT sd.id FROM sous_domaine sd WHERE sd.domaine_id = d.id AND sd.code = 'D2-S1'), d.referentiel_version_id, 'D2-11', 'Admettre le principe de représentation des salariés au conseil d’administration (analyse du Conseil d''administration)', NULL, 'GENERALE'::type_applicabilite, (SELECT cr.id FROM criticite cr WHERE cr.code = 'MOYENNE'::niveau_criticite), true, 3.0
  FROM domaine d WHERE d.referentiel_version_id = (SELECT s.nouvelle FROM _semis s JOIN referentiel r ON r.id = s.referentiel_id WHERE r.code = 'SMARTEX_SUSTWAY') AND d.code = 'D2';
INSERT INTO question (critere_id, referentiel_version_id, code, libelle, type, ordre, obligatoire, echelle_reponse)
SELECT c.id, c.referentiel_version_id, 'D2-11-Q1', 'Admettre le principe de représentation des salariés au conseil d’administration (analyse du Conseil d''administration)', 'FERMEE'::type_question, 1, true, 'MATURITE'
  FROM critere c WHERE c.referentiel_version_id = (SELECT s.nouvelle FROM _semis s JOIN referentiel r ON r.id = s.referentiel_id WHERE r.code = 'SMARTEX_SUSTWAY') AND c.code = 'D2-11';
INSERT INTO exigence (critere_id, referentiel_version_id, code, intitule, enonce, ordre, origine)
SELECT c.id, c.referentiel_version_id, c.code || '-E1', left(c.libelle, 300), c.libelle, 0, 'CONTENU_INITIAL'
  FROM critere c WHERE c.referentiel_version_id = (SELECT s.nouvelle FROM _semis s JOIN referentiel r ON r.id = s.referentiel_id WHERE r.code = 'SMARTEX_SUSTWAY') AND c.code = 'D2-11';

INSERT INTO critere (domaine_id, sous_domaine_id, referentiel_version_id, code, libelle, description, applicabilite, criticite_id, actif, coefficient_ponderation)
SELECT d.id, (SELECT sd.id FROM sous_domaine sd WHERE sd.domaine_id = d.id AND sd.code = 'D2-S1'), d.referentiel_version_id, 'D2-12', 'Admettre le principe d’indépendance des administrateurs (analyse du Conseil d''administration)', NULL, 'GENERALE'::type_applicabilite, (SELECT cr.id FROM criticite cr WHERE cr.code = 'MOYENNE'::niveau_criticite), true, 3.0
  FROM domaine d WHERE d.referentiel_version_id = (SELECT s.nouvelle FROM _semis s JOIN referentiel r ON r.id = s.referentiel_id WHERE r.code = 'SMARTEX_SUSTWAY') AND d.code = 'D2';
INSERT INTO question (critere_id, referentiel_version_id, code, libelle, type, ordre, obligatoire, echelle_reponse)
SELECT c.id, c.referentiel_version_id, 'D2-12-Q1', 'Admettre le principe d’indépendance des administrateurs (analyse du Conseil d''administration)', 'FERMEE'::type_question, 1, true, 'MATURITE'
  FROM critere c WHERE c.referentiel_version_id = (SELECT s.nouvelle FROM _semis s JOIN referentiel r ON r.id = s.referentiel_id WHERE r.code = 'SMARTEX_SUSTWAY') AND c.code = 'D2-12';
INSERT INTO exigence (critere_id, referentiel_version_id, code, intitule, enonce, ordre, origine)
SELECT c.id, c.referentiel_version_id, c.code || '-E1', left(c.libelle, 300), c.libelle, 0, 'CONTENU_INITIAL'
  FROM critere c WHERE c.referentiel_version_id = (SELECT s.nouvelle FROM _semis s JOIN referentiel r ON r.id = s.referentiel_id WHERE r.code = 'SMARTEX_SUSTWAY') AND c.code = 'D2-12';

INSERT INTO critere (domaine_id, sous_domaine_id, referentiel_version_id, code, libelle, description, applicabilite, criticite_id, actif, coefficient_ponderation)
SELECT d.id, (SELECT sd.id FROM sous_domaine sd WHERE sd.domaine_id = d.id AND sd.code = 'D2-S1'), d.referentiel_version_id, 'D2-13', 'Admettre l’existence de comités spécialisés de contrôle (analyse du Conseil d''administration)', NULL, 'GENERALE'::type_applicabilite, (SELECT cr.id FROM criticite cr WHERE cr.code = 'MOYENNE'::niveau_criticite), true, 1.0
  FROM domaine d WHERE d.referentiel_version_id = (SELECT s.nouvelle FROM _semis s JOIN referentiel r ON r.id = s.referentiel_id WHERE r.code = 'SMARTEX_SUSTWAY') AND d.code = 'D2';
INSERT INTO question (critere_id, referentiel_version_id, code, libelle, type, ordre, obligatoire, echelle_reponse)
SELECT c.id, c.referentiel_version_id, 'D2-13-Q1', 'Admettre l’existence de comités spécialisés de contrôle (analyse du Conseil d''administration)', 'FERMEE'::type_question, 1, true, 'MATURITE'
  FROM critere c WHERE c.referentiel_version_id = (SELECT s.nouvelle FROM _semis s JOIN referentiel r ON r.id = s.referentiel_id WHERE r.code = 'SMARTEX_SUSTWAY') AND c.code = 'D2-13';
INSERT INTO exigence (critere_id, referentiel_version_id, code, intitule, enonce, ordre, origine)
SELECT c.id, c.referentiel_version_id, c.code || '-E1', left(c.libelle, 300), c.libelle, 0, 'CONTENU_INITIAL'
  FROM critere c WHERE c.referentiel_version_id = (SELECT s.nouvelle FROM _semis s JOIN referentiel r ON r.id = s.referentiel_id WHERE r.code = 'SMARTEX_SUSTWAY') AND c.code = 'D2-13';

INSERT INTO critere (domaine_id, sous_domaine_id, referentiel_version_id, code, libelle, description, applicabilite, criticite_id, actif, coefficient_ponderation)
SELECT d.id, (SELECT sd.id FROM sous_domaine sd WHERE sd.domaine_id = d.id AND sd.code = 'D2-S2'), d.referentiel_version_id, 'D2-14', 'Connaître la législation nationale en matière de lutte contre la corruption et formaliser de façon concrète une politique de lutte contre la corruption', NULL, 'GENERALE'::type_applicabilite, (SELECT cr.id FROM criticite cr WHERE cr.code = 'MOYENNE'::niveau_criticite), true, 2.0
  FROM domaine d WHERE d.referentiel_version_id = (SELECT s.nouvelle FROM _semis s JOIN referentiel r ON r.id = s.referentiel_id WHERE r.code = 'SMARTEX_SUSTWAY') AND d.code = 'D2';
INSERT INTO question (critere_id, referentiel_version_id, code, libelle, type, ordre, obligatoire, echelle_reponse)
SELECT c.id, c.referentiel_version_id, 'D2-14-Q1', 'Connaître la législation nationale en matière de lutte contre la corruption et formaliser de façon concrète une politique de lutte contre la corruption', 'FERMEE'::type_question, 1, true, 'MATURITE'
  FROM critere c WHERE c.referentiel_version_id = (SELECT s.nouvelle FROM _semis s JOIN referentiel r ON r.id = s.referentiel_id WHERE r.code = 'SMARTEX_SUSTWAY') AND c.code = 'D2-14';
INSERT INTO exigence (critere_id, referentiel_version_id, code, intitule, enonce, ordre, origine)
SELECT c.id, c.referentiel_version_id, c.code || '-E1', left(c.libelle, 300), c.libelle, 0, 'CONTENU_INITIAL'
  FROM critere c WHERE c.referentiel_version_id = (SELECT s.nouvelle FROM _semis s JOIN referentiel r ON r.id = s.referentiel_id WHERE r.code = 'SMARTEX_SUSTWAY') AND c.code = 'D2-14';

INSERT INTO critere (domaine_id, sous_domaine_id, referentiel_version_id, code, libelle, description, applicabilite, criticite_id, actif, coefficient_ponderation)
SELECT d.id, (SELECT sd.id FROM sous_domaine sd WHERE sd.domaine_id = d.id AND sd.code = 'D2-S2'), d.referentiel_version_id, 'D2-15', 'désigner une personne ou un comité en charge d’exiger le respect et de superviser la conformité aux mesures anti-corruption, de la formation et la sensibilisation de l’ensemble du personnel, de l’évaluation des risques de corruption et de l’exercice d’un devoir de vigilance quant aux projets associés aux activités de l’entreprise.', NULL, 'GENERALE'::type_applicabilite, (SELECT cr.id FROM criticite cr WHERE cr.code = 'MOYENNE'::niveau_criticite), true, 2.0
  FROM domaine d WHERE d.referentiel_version_id = (SELECT s.nouvelle FROM _semis s JOIN referentiel r ON r.id = s.referentiel_id WHERE r.code = 'SMARTEX_SUSTWAY') AND d.code = 'D2';
INSERT INTO question (critere_id, referentiel_version_id, code, libelle, type, ordre, obligatoire, echelle_reponse)
SELECT c.id, c.referentiel_version_id, 'D2-15-Q1', 'désigner une personne ou un comité en charge d’exiger le respect et de superviser la conformité aux mesures anti-corruption, de la formation et la sensibilisation de l’ensemble du personnel, de l’évaluation des risques de corruption et de l’exercice d’un devoir de vigilance quant aux projets associés aux activités de l’entreprise.', 'FERMEE'::type_question, 1, true, 'MATURITE'
  FROM critere c WHERE c.referentiel_version_id = (SELECT s.nouvelle FROM _semis s JOIN referentiel r ON r.id = s.referentiel_id WHERE r.code = 'SMARTEX_SUSTWAY') AND c.code = 'D2-15';
INSERT INTO exigence (critere_id, referentiel_version_id, code, intitule, enonce, ordre, origine)
SELECT c.id, c.referentiel_version_id, c.code || '-E1', left(c.libelle, 300), c.libelle, 0, 'CONTENU_INITIAL'
  FROM critere c WHERE c.referentiel_version_id = (SELECT s.nouvelle FROM _semis s JOIN referentiel r ON r.id = s.referentiel_id WHERE r.code = 'SMARTEX_SUSTWAY') AND c.code = 'D2-15';

INSERT INTO critere (domaine_id, sous_domaine_id, referentiel_version_id, code, libelle, description, applicabilite, criticite_id, actif, coefficient_ponderation)
SELECT d.id, (SELECT sd.id FROM sous_domaine sd WHERE sd.domaine_id = d.id AND sd.code = 'D2-S2'), d.referentiel_version_id, 'D2-16', 'Agir contre la corruption sous toutes ses formes (la corruption publique et privée, ainsi que la corruption active et passive), y compris l’extorsion de fonds et les pots-de-vin.', NULL, 'GENERALE'::type_applicabilite, (SELECT cr.id FROM criticite cr WHERE cr.code = 'MOYENNE'::niveau_criticite), true, 2.0
  FROM domaine d WHERE d.referentiel_version_id = (SELECT s.nouvelle FROM _semis s JOIN referentiel r ON r.id = s.referentiel_id WHERE r.code = 'SMARTEX_SUSTWAY') AND d.code = 'D2';
INSERT INTO question (critere_id, referentiel_version_id, code, libelle, type, ordre, obligatoire, echelle_reponse)
SELECT c.id, c.referentiel_version_id, 'D2-16-Q1', 'Agir contre la corruption sous toutes ses formes (la corruption publique et privée, ainsi que la corruption active et passive), y compris l’extorsion de fonds et les pots-de-vin.', 'FERMEE'::type_question, 1, true, 'MATURITE'
  FROM critere c WHERE c.referentiel_version_id = (SELECT s.nouvelle FROM _semis s JOIN referentiel r ON r.id = s.referentiel_id WHERE r.code = 'SMARTEX_SUSTWAY') AND c.code = 'D2-16';
INSERT INTO exigence (critere_id, referentiel_version_id, code, intitule, enonce, ordre, origine)
SELECT c.id, c.referentiel_version_id, c.code || '-E1', left(c.libelle, 300), c.libelle, 0, 'CONTENU_INITIAL'
  FROM critere c WHERE c.referentiel_version_id = (SELECT s.nouvelle FROM _semis s JOIN referentiel r ON r.id = s.referentiel_id WHERE r.code = 'SMARTEX_SUSTWAY') AND c.code = 'D2-16';

INSERT INTO critere (domaine_id, sous_domaine_id, referentiel_version_id, code, libelle, description, applicabilite, criticite_id, actif, coefficient_ponderation)
SELECT d.id, (SELECT sd.id FROM sous_domaine sd WHERE sd.domaine_id = d.id AND sd.code = 'D2-S2'), d.referentiel_version_id, 'D2-17', 'Déployer un système de management anti-corruption qui vise à la certification ISO 37001 v 2017, (qui définit une série de mesures pour aider les organismes à prévenir, détecter et traiter les problèmes de corruption)', NULL, 'GENERALE'::type_applicabilite, (SELECT cr.id FROM criticite cr WHERE cr.code = 'MOYENNE'::niveau_criticite), true, 2.0
  FROM domaine d WHERE d.referentiel_version_id = (SELECT s.nouvelle FROM _semis s JOIN referentiel r ON r.id = s.referentiel_id WHERE r.code = 'SMARTEX_SUSTWAY') AND d.code = 'D2';
INSERT INTO question (critere_id, referentiel_version_id, code, libelle, type, ordre, obligatoire, echelle_reponse)
SELECT c.id, c.referentiel_version_id, 'D2-17-Q1', 'Déployer un système de management anti-corruption qui vise à la certification ISO 37001 v 2017, (qui définit une série de mesures pour aider les organismes à prévenir, détecter et traiter les problèmes de corruption)', 'FERMEE'::type_question, 1, true, 'MATURITE'
  FROM critere c WHERE c.referentiel_version_id = (SELECT s.nouvelle FROM _semis s JOIN referentiel r ON r.id = s.referentiel_id WHERE r.code = 'SMARTEX_SUSTWAY') AND c.code = 'D2-17';
INSERT INTO exigence (critere_id, referentiel_version_id, code, intitule, enonce, ordre, origine)
SELECT c.id, c.referentiel_version_id, c.code || '-E1', left(c.libelle, 300), c.libelle, 0, 'CONTENU_INITIAL'
  FROM critere c WHERE c.referentiel_version_id = (SELECT s.nouvelle FROM _semis s JOIN referentiel r ON r.id = s.referentiel_id WHERE r.code = 'SMARTEX_SUSTWAY') AND c.code = 'D2-17';

INSERT INTO critere (domaine_id, sous_domaine_id, referentiel_version_id, code, libelle, description, applicabilite, criticite_id, actif, coefficient_ponderation)
SELECT d.id, (SELECT sd.id FROM sous_domaine sd WHERE sd.domaine_id = d.id AND sd.code = 'D2-S3'), d.referentiel_version_id, 'D2-18', 'Agir en toute conformité avec la lettre et l’esprit des lois et règlements fiscaux et coopérer avec les autorités compétentes.', NULL, 'GENERALE'::type_applicabilite, (SELECT cr.id FROM criticite cr WHERE cr.code = 'MOYENNE'::niveau_criticite), true, 3.0
  FROM domaine d WHERE d.referentiel_version_id = (SELECT s.nouvelle FROM _semis s JOIN referentiel r ON r.id = s.referentiel_id WHERE r.code = 'SMARTEX_SUSTWAY') AND d.code = 'D2';
INSERT INTO question (critere_id, referentiel_version_id, code, libelle, type, ordre, obligatoire, echelle_reponse)
SELECT c.id, c.referentiel_version_id, 'D2-18-Q1', 'Agir en toute conformité avec la lettre et l’esprit des lois et règlements fiscaux et coopérer avec les autorités compétentes.', 'FERMEE'::type_question, 1, true, 'MATURITE'
  FROM critere c WHERE c.referentiel_version_id = (SELECT s.nouvelle FROM _semis s JOIN referentiel r ON r.id = s.referentiel_id WHERE r.code = 'SMARTEX_SUSTWAY') AND c.code = 'D2-18';
INSERT INTO exigence (critere_id, referentiel_version_id, code, intitule, enonce, ordre, origine)
SELECT c.id, c.referentiel_version_id, c.code || '-E1', left(c.libelle, 300), c.libelle, 0, 'CONTENU_INITIAL'
  FROM critere c WHERE c.referentiel_version_id = (SELECT s.nouvelle FROM _semis s JOIN referentiel r ON r.id = s.referentiel_id WHERE r.code = 'SMARTEX_SUSTWAY') AND c.code = 'D2-18';

INSERT INTO critere (domaine_id, sous_domaine_id, referentiel_version_id, code, libelle, description, applicabilite, criticite_id, actif, coefficient_ponderation)
SELECT d.id, (SELECT sd.id FROM sous_domaine sd WHERE sd.domaine_id = d.id AND sd.code = 'D2-S4'), d.referentiel_version_id, 'D2-19', 'Développer des politiques spécifiques qui protègent les droits des salariés dans l’entreprise et plus globalement tout au long de la chaîne de valeur', NULL, 'GENERALE'::type_applicabilite, (SELECT cr.id FROM criticite cr WHERE cr.code = 'MOYENNE'::niveau_criticite), true, 3.0
  FROM domaine d WHERE d.referentiel_version_id = (SELECT s.nouvelle FROM _semis s JOIN referentiel r ON r.id = s.referentiel_id WHERE r.code = 'SMARTEX_SUSTWAY') AND d.code = 'D2';
INSERT INTO question (critere_id, referentiel_version_id, code, libelle, type, ordre, obligatoire, echelle_reponse)
SELECT c.id, c.referentiel_version_id, 'D2-19-Q1', 'Développer des politiques spécifiques qui protègent les droits des salariés dans l’entreprise et plus globalement tout au long de la chaîne de valeur', 'FERMEE'::type_question, 1, true, 'MATURITE'
  FROM critere c WHERE c.referentiel_version_id = (SELECT s.nouvelle FROM _semis s JOIN referentiel r ON r.id = s.referentiel_id WHERE r.code = 'SMARTEX_SUSTWAY') AND c.code = 'D2-19';
INSERT INTO exigence (critere_id, referentiel_version_id, code, intitule, enonce, ordre, origine)
SELECT c.id, c.referentiel_version_id, c.code || '-E1', left(c.libelle, 300), c.libelle, 0, 'CONTENU_INITIAL'
  FROM critere c WHERE c.referentiel_version_id = (SELECT s.nouvelle FROM _semis s JOIN referentiel r ON r.id = s.referentiel_id WHERE r.code = 'SMARTEX_SUSTWAY') AND c.code = 'D2-19';

INSERT INTO critere (domaine_id, sous_domaine_id, referentiel_version_id, code, libelle, description, applicabilite, criticite_id, actif, coefficient_ponderation)
SELECT d.id, (SELECT sd.id FROM sous_domaine sd WHERE sd.domaine_id = d.id AND sd.code = 'D2-S4'), d.referentiel_version_id, 'D2-20', 'Engager le dialogue avec les gouvernements, les syndicats, les ONG et autres organismes afin de mieux faire connaître les problèmes liés à l’application des droits de l’homme.', NULL, 'GENERALE'::type_applicabilite, (SELECT cr.id FROM criticite cr WHERE cr.code = 'MOYENNE'::niveau_criticite), true, 3.0
  FROM domaine d WHERE d.referentiel_version_id = (SELECT s.nouvelle FROM _semis s JOIN referentiel r ON r.id = s.referentiel_id WHERE r.code = 'SMARTEX_SUSTWAY') AND d.code = 'D2';
INSERT INTO question (critere_id, referentiel_version_id, code, libelle, type, ordre, obligatoire, echelle_reponse)
SELECT c.id, c.referentiel_version_id, 'D2-20-Q1', 'Engager le dialogue avec les gouvernements, les syndicats, les ONG et autres organismes afin de mieux faire connaître les problèmes liés à l’application des droits de l’homme.', 'FERMEE'::type_question, 1, true, 'MATURITE'
  FROM critere c WHERE c.referentiel_version_id = (SELECT s.nouvelle FROM _semis s JOIN referentiel r ON r.id = s.referentiel_id WHERE r.code = 'SMARTEX_SUSTWAY') AND c.code = 'D2-20';
INSERT INTO exigence (critere_id, referentiel_version_id, code, intitule, enonce, ordre, origine)
SELECT c.id, c.referentiel_version_id, c.code || '-E1', left(c.libelle, 300), c.libelle, 0, 'CONTENU_INITIAL'
  FROM critere c WHERE c.referentiel_version_id = (SELECT s.nouvelle FROM _semis s JOIN referentiel r ON r.id = s.referentiel_id WHERE r.code = 'SMARTEX_SUSTWAY') AND c.code = 'D2-20';

INSERT INTO critere (domaine_id, sous_domaine_id, referentiel_version_id, code, libelle, description, applicabilite, criticite_id, actif, coefficient_ponderation)
SELECT d.id, (SELECT sd.id FROM sous_domaine sd WHERE sd.domaine_id = d.id AND sd.code = 'D2-S4'), d.referentiel_version_id, 'D2-21', 'Veiller à ce que l’entreprise ne se rende pas complice de violations des droits de l’homme.', NULL, 'GENERALE'::type_applicabilite, (SELECT cr.id FROM criticite cr WHERE cr.code = 'MOYENNE'::niveau_criticite), true, 1.0
  FROM domaine d WHERE d.referentiel_version_id = (SELECT s.nouvelle FROM _semis s JOIN referentiel r ON r.id = s.referentiel_id WHERE r.code = 'SMARTEX_SUSTWAY') AND d.code = 'D2';
INSERT INTO question (critere_id, referentiel_version_id, code, libelle, type, ordre, obligatoire, echelle_reponse)
SELECT c.id, c.referentiel_version_id, 'D2-21-Q1', 'Veiller à ce que l’entreprise ne se rende pas complice de violations des droits de l’homme.', 'FERMEE'::type_question, 1, true, 'MATURITE'
  FROM critere c WHERE c.referentiel_version_id = (SELECT s.nouvelle FROM _semis s JOIN referentiel r ON r.id = s.referentiel_id WHERE r.code = 'SMARTEX_SUSTWAY') AND c.code = 'D2-21';
INSERT INTO exigence (critere_id, referentiel_version_id, code, intitule, enonce, ordre, origine)
SELECT c.id, c.referentiel_version_id, c.code || '-E1', left(c.libelle, 300), c.libelle, 0, 'CONTENU_INITIAL'
  FROM critere c WHERE c.referentiel_version_id = (SELECT s.nouvelle FROM _semis s JOIN referentiel r ON r.id = s.referentiel_id WHERE r.code = 'SMARTEX_SUSTWAY') AND c.code = 'D2-21';

INSERT INTO domaine (referentiel_id, referentiel_version_id, code, nom, description, ordre)
VALUES ((SELECT id FROM referentiel WHERE code = 'SMARTEX_SUSTWAY'), (SELECT s.nouvelle FROM _semis s JOIN referentiel r ON r.id = s.referentiel_id WHERE r.code = 'SMARTEX_SUSTWAY'), 'D3', 'Bonnes pratiques sociales', 'Dimension Bonnes pratiques sociales (normes fondamentales de travail) et sociétales (implication de l’entreprise auprès des communautés et en faveur du développement local / ancrage territorial de l’entreprise)', 3);
INSERT INTO sous_domaine (domaine_id, referentiel_version_id, code, nom, description, ordre)
SELECT d.id, d.referentiel_version_id, 'D3-S1', 'A) L’emploi', 'A) L’emploi', 1
  FROM domaine d WHERE d.referentiel_version_id = (SELECT s.nouvelle FROM _semis s JOIN referentiel r ON r.id = s.referentiel_id WHERE r.code = 'SMARTEX_SUSTWAY') AND d.code = 'D3';
INSERT INTO sous_domaine (domaine_id, referentiel_version_id, code, nom, description, ordre)
SELECT d.id, d.referentiel_version_id, 'D3-S2', 'B) La formation', 'B) La formation', 2
  FROM domaine d WHERE d.referentiel_version_id = (SELECT s.nouvelle FROM _semis s JOIN referentiel r ON r.id = s.referentiel_id WHERE r.code = 'SMARTEX_SUSTWAY') AND d.code = 'D3';
INSERT INTO sous_domaine (domaine_id, referentiel_version_id, code, nom, description, ordre)
SELECT d.id, d.referentiel_version_id, 'D3-S3', 'C) Les conditions de travail et de vie', 'C) Les conditions de travail et de vie', 3
  FROM domaine d WHERE d.referentiel_version_id = (SELECT s.nouvelle FROM _semis s JOIN referentiel r ON r.id = s.referentiel_id WHERE r.code = 'SMARTEX_SUSTWAY') AND d.code = 'D3';
INSERT INTO sous_domaine (domaine_id, referentiel_version_id, code, nom, description, ordre)
SELECT d.id, d.referentiel_version_id, 'D3-S4', 'D) Les relations professionnelles', 'D) Les relations professionnelles', 4
  FROM domaine d WHERE d.referentiel_version_id = (SELECT s.nouvelle FROM _semis s JOIN referentiel r ON r.id = s.referentiel_id WHERE r.code = 'SMARTEX_SUSTWAY') AND d.code = 'D3';
INSERT INTO sous_domaine (domaine_id, referentiel_version_id, code, nom, description, ordre)
SELECT d.id, d.referentiel_version_id, 'D3-S5', 'E) Implication de l’entreprise auprès des communautés et en faveur du développement local', 'E) Implication de l’entreprise auprès des communautés et en faveur du développement local', 5
  FROM domaine d WHERE d.referentiel_version_id = (SELECT s.nouvelle FROM _semis s JOIN referentiel r ON r.id = s.referentiel_id WHERE r.code = 'SMARTEX_SUSTWAY') AND d.code = 'D3';
INSERT INTO critere (domaine_id, sous_domaine_id, referentiel_version_id, code, libelle, description, applicabilite, criticite_id, actif, coefficient_ponderation)
SELECT d.id, (SELECT sd.id FROM sous_domaine sd WHERE sd.domaine_id = d.id AND sd.code = 'D3-S1'), d.referentiel_version_id, 'D3-22', 'Contribuer à l’abolition du travail des enfants par une bonne connaissance et le respect de la législation en vigueur par rapport à l’âge minimum d’admission à l’emploi.', NULL, 'GENERALE'::type_applicabilite, (SELECT cr.id FROM criticite cr WHERE cr.code = 'MOYENNE'::niveau_criticite), true, 3.0
  FROM domaine d WHERE d.referentiel_version_id = (SELECT s.nouvelle FROM _semis s JOIN referentiel r ON r.id = s.referentiel_id WHERE r.code = 'SMARTEX_SUSTWAY') AND d.code = 'D3';
INSERT INTO question (critere_id, referentiel_version_id, code, libelle, type, ordre, obligatoire, echelle_reponse)
SELECT c.id, c.referentiel_version_id, 'D3-22-Q1', 'Contribuer à l’abolition du travail des enfants par une bonne connaissance et le respect de la législation en vigueur par rapport à l’âge minimum d’admission à l’emploi.', 'FERMEE'::type_question, 1, true, 'MATURITE'
  FROM critere c WHERE c.referentiel_version_id = (SELECT s.nouvelle FROM _semis s JOIN referentiel r ON r.id = s.referentiel_id WHERE r.code = 'SMARTEX_SUSTWAY') AND c.code = 'D3-22';
INSERT INTO exigence (critere_id, referentiel_version_id, code, intitule, enonce, ordre, origine)
SELECT c.id, c.referentiel_version_id, c.code || '-E1', left(c.libelle, 300), c.libelle, 0, 'CONTENU_INITIAL'
  FROM critere c WHERE c.referentiel_version_id = (SELECT s.nouvelle FROM _semis s JOIN referentiel r ON r.id = s.referentiel_id WHERE r.code = 'SMARTEX_SUSTWAY') AND c.code = 'D3-22';

INSERT INTO critere (domaine_id, sous_domaine_id, referentiel_version_id, code, libelle, description, applicabilite, criticite_id, actif, coefficient_ponderation)
SELECT d.id, (SELECT sd.id FROM sous_domaine sd WHERE sd.domaine_id = d.id AND sd.code = 'D3-S1'), d.referentiel_version_id, 'D3-23', 'Coopérer avec les différents partenaires de la chaîne de fournisseurs et sous-traitants afin de ne pas employer des enfants en dessous de l’âge légal.', NULL, 'GENERALE'::type_applicabilite, (SELECT cr.id FROM criticite cr WHERE cr.code = 'MOYENNE'::niveau_criticite), true, 2.0
  FROM domaine d WHERE d.referentiel_version_id = (SELECT s.nouvelle FROM _semis s JOIN referentiel r ON r.id = s.referentiel_id WHERE r.code = 'SMARTEX_SUSTWAY') AND d.code = 'D3';
INSERT INTO question (critere_id, referentiel_version_id, code, libelle, type, ordre, obligatoire, echelle_reponse)
SELECT c.id, c.referentiel_version_id, 'D3-23-Q1', 'Coopérer avec les différents partenaires de la chaîne de fournisseurs et sous-traitants afin de ne pas employer des enfants en dessous de l’âge légal.', 'FERMEE'::type_question, 1, true, 'MATURITE'
  FROM critere c WHERE c.referentiel_version_id = (SELECT s.nouvelle FROM _semis s JOIN referentiel r ON r.id = s.referentiel_id WHERE r.code = 'SMARTEX_SUSTWAY') AND c.code = 'D3-23';
INSERT INTO exigence (critere_id, referentiel_version_id, code, intitule, enonce, ordre, origine)
SELECT c.id, c.referentiel_version_id, c.code || '-E1', left(c.libelle, 300), c.libelle, 0, 'CONTENU_INITIAL'
  FROM critere c WHERE c.referentiel_version_id = (SELECT s.nouvelle FROM _semis s JOIN referentiel r ON r.id = s.referentiel_id WHERE r.code = 'SMARTEX_SUSTWAY') AND c.code = 'D3-23';

INSERT INTO critere (domaine_id, sous_domaine_id, referentiel_version_id, code, libelle, description, applicabilite, criticite_id, actif, coefficient_ponderation)
SELECT d.id, (SELECT sd.id FROM sous_domaine sd WHERE sd.domaine_id = d.id AND sd.code = 'D3-S1'), d.referentiel_version_id, 'D3-24', 'Connaître et prendre des mesures afin de respecter la législation en vigueur par rapport à la durée du travail, au salaire minimum qu''il faut verser aux travailleurs, à la prime de temps supplémentaire, aux jours de repos hebdomadaire, aux jours fériés et congés annuels payés, aux congés parentaux.', NULL, 'GENERALE'::type_applicabilite, (SELECT cr.id FROM criticite cr WHERE cr.code = 'MOYENNE'::niveau_criticite), true, 3.0
  FROM domaine d WHERE d.referentiel_version_id = (SELECT s.nouvelle FROM _semis s JOIN referentiel r ON r.id = s.referentiel_id WHERE r.code = 'SMARTEX_SUSTWAY') AND d.code = 'D3';
INSERT INTO question (critere_id, referentiel_version_id, code, libelle, type, ordre, obligatoire, echelle_reponse)
SELECT c.id, c.referentiel_version_id, 'D3-24-Q1', 'Connaître et prendre des mesures afin de respecter la législation en vigueur par rapport à la durée du travail, au salaire minimum qu''il faut verser aux travailleurs, à la prime de temps supplémentaire, aux jours de repos hebdomadaire, aux jours fériés et congés annuels payés, aux congés parentaux.', 'FERMEE'::type_question, 1, true, 'MATURITE'
  FROM critere c WHERE c.referentiel_version_id = (SELECT s.nouvelle FROM _semis s JOIN referentiel r ON r.id = s.referentiel_id WHERE r.code = 'SMARTEX_SUSTWAY') AND c.code = 'D3-24';
INSERT INTO exigence (critere_id, referentiel_version_id, code, intitule, enonce, ordre, origine)
SELECT c.id, c.referentiel_version_id, c.code || '-E1', left(c.libelle, 300), c.libelle, 0, 'CONTENU_INITIAL'
  FROM critere c WHERE c.referentiel_version_id = (SELECT s.nouvelle FROM _semis s JOIN referentiel r ON r.id = s.referentiel_id WHERE r.code = 'SMARTEX_SUSTWAY') AND c.code = 'D3-24';

INSERT INTO critere (domaine_id, sous_domaine_id, referentiel_version_id, code, libelle, description, applicabilite, criticite_id, actif, coefficient_ponderation)
SELECT d.id, (SELECT sd.id FROM sous_domaine sd WHERE sd.domaine_id = d.id AND sd.code = 'D3-S1'), d.referentiel_version_id, 'D3-25', 'Disposer d’une politique formalisée d’égalité des chances au sein de l''entreprise et lutter ainsi contre les toutes les formes de discriminations et les inégalités ou disparités, (surtout dans les processus de recrutement, la gestion des carrières, les conditions de salaires, la promotion de diversité, la promotion de la parité hommes et femmes ; …)', NULL, 'GENERALE'::type_applicabilite, (SELECT cr.id FROM criticite cr WHERE cr.code = 'MOYENNE'::niveau_criticite), true, 2.0
  FROM domaine d WHERE d.referentiel_version_id = (SELECT s.nouvelle FROM _semis s JOIN referentiel r ON r.id = s.referentiel_id WHERE r.code = 'SMARTEX_SUSTWAY') AND d.code = 'D3';
INSERT INTO question (critere_id, referentiel_version_id, code, libelle, type, ordre, obligatoire, echelle_reponse)
SELECT c.id, c.referentiel_version_id, 'D3-25-Q1', 'Disposer d’une politique formalisée d’égalité des chances au sein de l''entreprise et lutter ainsi contre les toutes les formes de discriminations et les inégalités ou disparités, (surtout dans les processus de recrutement, la gestion des carrières, les conditions de salaires, la promotion de diversité, la promotion de la parité hommes et femmes ; …)', 'FERMEE'::type_question, 1, true, 'MATURITE'
  FROM critere c WHERE c.referentiel_version_id = (SELECT s.nouvelle FROM _semis s JOIN referentiel r ON r.id = s.referentiel_id WHERE r.code = 'SMARTEX_SUSTWAY') AND c.code = 'D3-25';
INSERT INTO exigence (critere_id, referentiel_version_id, code, intitule, enonce, ordre, origine)
SELECT c.id, c.referentiel_version_id, c.code || '-E1', left(c.libelle, 300), c.libelle, 0, 'CONTENU_INITIAL'
  FROM critere c WHERE c.referentiel_version_id = (SELECT s.nouvelle FROM _semis s JOIN referentiel r ON r.id = s.referentiel_id WHERE r.code = 'SMARTEX_SUSTWAY') AND c.code = 'D3-25';

INSERT INTO critere (domaine_id, sous_domaine_id, referentiel_version_id, code, libelle, description, applicabilite, criticite_id, actif, coefficient_ponderation)
SELECT d.id, (SELECT sd.id FROM sous_domaine sd WHERE sd.domaine_id = d.id AND sd.code = 'D3-S1'), d.referentiel_version_id, 'D3-26', 'désigner une personne ou un comité en charge d’exiger le respect et de superviser la conformité aux mesures prises en matière d’égalité des chances au sein de l’entreprise.', NULL, 'GENERALE'::type_applicabilite, (SELECT cr.id FROM criticite cr WHERE cr.code = 'MOYENNE'::niveau_criticite), true, 2.0
  FROM domaine d WHERE d.referentiel_version_id = (SELECT s.nouvelle FROM _semis s JOIN referentiel r ON r.id = s.referentiel_id WHERE r.code = 'SMARTEX_SUSTWAY') AND d.code = 'D3';
INSERT INTO question (critere_id, referentiel_version_id, code, libelle, type, ordre, obligatoire, echelle_reponse)
SELECT c.id, c.referentiel_version_id, 'D3-26-Q1', 'désigner une personne ou un comité en charge d’exiger le respect et de superviser la conformité aux mesures prises en matière d’égalité des chances au sein de l’entreprise.', 'FERMEE'::type_question, 1, true, 'MATURITE'
  FROM critere c WHERE c.referentiel_version_id = (SELECT s.nouvelle FROM _semis s JOIN referentiel r ON r.id = s.referentiel_id WHERE r.code = 'SMARTEX_SUSTWAY') AND c.code = 'D3-26';
INSERT INTO exigence (critere_id, referentiel_version_id, code, intitule, enonce, ordre, origine)
SELECT c.id, c.referentiel_version_id, c.code || '-E1', left(c.libelle, 300), c.libelle, 0, 'CONTENU_INITIAL'
  FROM critere c WHERE c.referentiel_version_id = (SELECT s.nouvelle FROM _semis s JOIN referentiel r ON r.id = s.referentiel_id WHERE r.code = 'SMARTEX_SUSTWAY') AND c.code = 'D3-26';

INSERT INTO critere (domaine_id, sous_domaine_id, referentiel_version_id, code, libelle, description, applicabilite, criticite_id, actif, coefficient_ponderation)
SELECT d.id, (SELECT sd.id FROM sous_domaine sd WHERE sd.domaine_id = d.id AND sd.code = 'D3-S1'), d.referentiel_version_id, 'D3-27', 'Prendre des dispositions afin de donner l’opportunité à l’entreprise de pouvoir soutenir des initiatives sociales portant sur l’emploi des personnes à handicap', NULL, 'GENERALE'::type_applicabilite, (SELECT cr.id FROM criticite cr WHERE cr.code = 'MOYENNE'::niveau_criticite), true, 1.0
  FROM domaine d WHERE d.referentiel_version_id = (SELECT s.nouvelle FROM _semis s JOIN referentiel r ON r.id = s.referentiel_id WHERE r.code = 'SMARTEX_SUSTWAY') AND d.code = 'D3';
INSERT INTO question (critere_id, referentiel_version_id, code, libelle, type, ordre, obligatoire, echelle_reponse)
SELECT c.id, c.referentiel_version_id, 'D3-27-Q1', 'Prendre des dispositions afin de donner l’opportunité à l’entreprise de pouvoir soutenir des initiatives sociales portant sur l’emploi des personnes à handicap', 'FERMEE'::type_question, 1, true, 'MATURITE'
  FROM critere c WHERE c.referentiel_version_id = (SELECT s.nouvelle FROM _semis s JOIN referentiel r ON r.id = s.referentiel_id WHERE r.code = 'SMARTEX_SUSTWAY') AND c.code = 'D3-27';
INSERT INTO exigence (critere_id, referentiel_version_id, code, intitule, enonce, ordre, origine)
SELECT c.id, c.referentiel_version_id, c.code || '-E1', left(c.libelle, 300), c.libelle, 0, 'CONTENU_INITIAL'
  FROM critere c WHERE c.referentiel_version_id = (SELECT s.nouvelle FROM _semis s JOIN referentiel r ON r.id = s.referentiel_id WHERE r.code = 'SMARTEX_SUSTWAY') AND c.code = 'D3-27';

INSERT INTO critere (domaine_id, sous_domaine_id, referentiel_version_id, code, libelle, description, applicabilite, criticite_id, actif, coefficient_ponderation)
SELECT d.id, (SELECT sd.id FROM sous_domaine sd WHERE sd.domaine_id = d.id AND sd.code = 'D3-S1'), d.referentiel_version_id, 'D3-28', 'Prendre des mesures afin d’éliminer toutes les formes de travail forcé ou obligatoire.', NULL, 'GENERALE'::type_applicabilite, (SELECT cr.id FROM criticite cr WHERE cr.code = 'MOYENNE'::niveau_criticite), true, 1.0
  FROM domaine d WHERE d.referentiel_version_id = (SELECT s.nouvelle FROM _semis s JOIN referentiel r ON r.id = s.referentiel_id WHERE r.code = 'SMARTEX_SUSTWAY') AND d.code = 'D3';
INSERT INTO question (critere_id, referentiel_version_id, code, libelle, type, ordre, obligatoire, echelle_reponse)
SELECT c.id, c.referentiel_version_id, 'D3-28-Q1', 'Prendre des mesures afin d’éliminer toutes les formes de travail forcé ou obligatoire.', 'FERMEE'::type_question, 1, true, 'MATURITE'
  FROM critere c WHERE c.referentiel_version_id = (SELECT s.nouvelle FROM _semis s JOIN referentiel r ON r.id = s.referentiel_id WHERE r.code = 'SMARTEX_SUSTWAY') AND c.code = 'D3-28';
INSERT INTO exigence (critere_id, referentiel_version_id, code, intitule, enonce, ordre, origine)
SELECT c.id, c.referentiel_version_id, c.code || '-E1', left(c.libelle, 300), c.libelle, 0, 'CONTENU_INITIAL'
  FROM critere c WHERE c.referentiel_version_id = (SELECT s.nouvelle FROM _semis s JOIN referentiel r ON r.id = s.referentiel_id WHERE r.code = 'SMARTEX_SUSTWAY') AND c.code = 'D3-28';

INSERT INTO critere (domaine_id, sous_domaine_id, referentiel_version_id, code, libelle, description, applicabilite, criticite_id, actif, coefficient_ponderation)
SELECT d.id, (SELECT sd.id FROM sous_domaine sd WHERE sd.domaine_id = d.id AND sd.code = 'D3-S1'), d.referentiel_version_id, 'D3-29', 'Conduire régulièrement des audits afin de déterminer si de la main d’œuvre forcée est employée sur la chaîne de valeur de l’entreprise', NULL, 'GENERALE'::type_applicabilite, (SELECT cr.id FROM criticite cr WHERE cr.code = 'MOYENNE'::niveau_criticite), true, 2.0
  FROM domaine d WHERE d.referentiel_version_id = (SELECT s.nouvelle FROM _semis s JOIN referentiel r ON r.id = s.referentiel_id WHERE r.code = 'SMARTEX_SUSTWAY') AND d.code = 'D3';
INSERT INTO question (critere_id, referentiel_version_id, code, libelle, type, ordre, obligatoire, echelle_reponse)
SELECT c.id, c.referentiel_version_id, 'D3-29-Q1', 'Conduire régulièrement des audits afin de déterminer si de la main d’œuvre forcée est employée sur la chaîne de valeur de l’entreprise', 'FERMEE'::type_question, 1, true, 'MATURITE'
  FROM critere c WHERE c.referentiel_version_id = (SELECT s.nouvelle FROM _semis s JOIN referentiel r ON r.id = s.referentiel_id WHERE r.code = 'SMARTEX_SUSTWAY') AND c.code = 'D3-29';
INSERT INTO exigence (critere_id, referentiel_version_id, code, intitule, enonce, ordre, origine)
SELECT c.id, c.referentiel_version_id, c.code || '-E1', left(c.libelle, 300), c.libelle, 0, 'CONTENU_INITIAL'
  FROM critere c WHERE c.referentiel_version_id = (SELECT s.nouvelle FROM _semis s JOIN referentiel r ON r.id = s.referentiel_id WHERE r.code = 'SMARTEX_SUSTWAY') AND c.code = 'D3-29';

INSERT INTO critere (domaine_id, sous_domaine_id, referentiel_version_id, code, libelle, description, applicabilite, criticite_id, actif, coefficient_ponderation)
SELECT d.id, (SELECT sd.id FROM sous_domaine sd WHERE sd.domaine_id = d.id AND sd.code = 'D3-S1'), d.referentiel_version_id, 'D3-30', 'Renforcer la lutte contre la précarité des emplois en prenant des dispositions pour garantir leur sécurité', NULL, 'GENERALE'::type_applicabilite, (SELECT cr.id FROM criticite cr WHERE cr.code = 'MOYENNE'::niveau_criticite), true, 3.0
  FROM domaine d WHERE d.referentiel_version_id = (SELECT s.nouvelle FROM _semis s JOIN referentiel r ON r.id = s.referentiel_id WHERE r.code = 'SMARTEX_SUSTWAY') AND d.code = 'D3';
INSERT INTO question (critere_id, referentiel_version_id, code, libelle, type, ordre, obligatoire, echelle_reponse)
SELECT c.id, c.referentiel_version_id, 'D3-30-Q1', 'Renforcer la lutte contre la précarité des emplois en prenant des dispositions pour garantir leur sécurité', 'FERMEE'::type_question, 1, true, 'MATURITE'
  FROM critere c WHERE c.referentiel_version_id = (SELECT s.nouvelle FROM _semis s JOIN referentiel r ON r.id = s.referentiel_id WHERE r.code = 'SMARTEX_SUSTWAY') AND c.code = 'D3-30';
INSERT INTO exigence (critere_id, referentiel_version_id, code, intitule, enonce, ordre, origine)
SELECT c.id, c.referentiel_version_id, c.code || '-E1', left(c.libelle, 300), c.libelle, 0, 'CONTENU_INITIAL'
  FROM critere c WHERE c.referentiel_version_id = (SELECT s.nouvelle FROM _semis s JOIN referentiel r ON r.id = s.referentiel_id WHERE r.code = 'SMARTEX_SUSTWAY') AND c.code = 'D3-30';

INSERT INTO critere (domaine_id, sous_domaine_id, referentiel_version_id, code, libelle, description, applicabilite, criticite_id, actif, coefficient_ponderation)
SELECT d.id, (SELECT sd.id FROM sous_domaine sd WHERE sd.domaine_id = d.id AND sd.code = 'D3-S1'), d.referentiel_version_id, 'D3-31', 'Prendre des dispositions pour promouvoir des emplois productifs ou décents dans l’entreprise', NULL, 'GENERALE'::type_applicabilite, (SELECT cr.id FROM criticite cr WHERE cr.code = 'MOYENNE'::niveau_criticite), true, 2.0
  FROM domaine d WHERE d.referentiel_version_id = (SELECT s.nouvelle FROM _semis s JOIN referentiel r ON r.id = s.referentiel_id WHERE r.code = 'SMARTEX_SUSTWAY') AND d.code = 'D3';
INSERT INTO question (critere_id, referentiel_version_id, code, libelle, type, ordre, obligatoire, echelle_reponse)
SELECT c.id, c.referentiel_version_id, 'D3-31-Q1', 'Prendre des dispositions pour promouvoir des emplois productifs ou décents dans l’entreprise', 'FERMEE'::type_question, 1, true, 'MATURITE'
  FROM critere c WHERE c.referentiel_version_id = (SELECT s.nouvelle FROM _semis s JOIN referentiel r ON r.id = s.referentiel_id WHERE r.code = 'SMARTEX_SUSTWAY') AND c.code = 'D3-31';
INSERT INTO exigence (critere_id, referentiel_version_id, code, intitule, enonce, ordre, origine)
SELECT c.id, c.referentiel_version_id, c.code || '-E1', left(c.libelle, 300), c.libelle, 0, 'CONTENU_INITIAL'
  FROM critere c WHERE c.referentiel_version_id = (SELECT s.nouvelle FROM _semis s JOIN referentiel r ON r.id = s.referentiel_id WHERE r.code = 'SMARTEX_SUSTWAY') AND c.code = 'D3-31';

INSERT INTO critere (domaine_id, sous_domaine_id, referentiel_version_id, code, libelle, description, applicabilite, criticite_id, actif, coefficient_ponderation)
SELECT d.id, (SELECT sd.id FROM sous_domaine sd WHERE sd.domaine_id = d.id AND sd.code = 'D3-S2'), d.referentiel_version_id, 'D3-32', 'Disposer d’une politique formalisée et cohérente de formation en vue de développer les compétences des collaborateurs sur leurs postes spécifiques.', NULL, 'GENERALE'::type_applicabilite, (SELECT cr.id FROM criticite cr WHERE cr.code = 'MOYENNE'::niveau_criticite), true, 2.0
  FROM domaine d WHERE d.referentiel_version_id = (SELECT s.nouvelle FROM _semis s JOIN referentiel r ON r.id = s.referentiel_id WHERE r.code = 'SMARTEX_SUSTWAY') AND d.code = 'D3';
INSERT INTO question (critere_id, referentiel_version_id, code, libelle, type, ordre, obligatoire, echelle_reponse)
SELECT c.id, c.referentiel_version_id, 'D3-32-Q1', 'Disposer d’une politique formalisée et cohérente de formation en vue de développer les compétences des collaborateurs sur leurs postes spécifiques.', 'FERMEE'::type_question, 1, true, 'MATURITE'
  FROM critere c WHERE c.referentiel_version_id = (SELECT s.nouvelle FROM _semis s JOIN referentiel r ON r.id = s.referentiel_id WHERE r.code = 'SMARTEX_SUSTWAY') AND c.code = 'D3-32';
INSERT INTO exigence (critere_id, referentiel_version_id, code, intitule, enonce, ordre, origine)
SELECT c.id, c.referentiel_version_id, c.code || '-E1', left(c.libelle, 300), c.libelle, 0, 'CONTENU_INITIAL'
  FROM critere c WHERE c.referentiel_version_id = (SELECT s.nouvelle FROM _semis s JOIN referentiel r ON r.id = s.referentiel_id WHERE r.code = 'SMARTEX_SUSTWAY') AND c.code = 'D3-32';

INSERT INTO critere (domaine_id, sous_domaine_id, referentiel_version_id, code, libelle, description, applicabilite, criticite_id, actif, coefficient_ponderation)
SELECT d.id, (SELECT sd.id FROM sous_domaine sd WHERE sd.domaine_id = d.id AND sd.code = 'D3-S2'), d.referentiel_version_id, 'D3-33', 'désigner une personne ou un comité en charge du déploiement des programmes de formation de l’entreprise en faveur des collaborateurs', NULL, 'GENERALE'::type_applicabilite, (SELECT cr.id FROM criticite cr WHERE cr.code = 'MOYENNE'::niveau_criticite), true, 3.0
  FROM domaine d WHERE d.referentiel_version_id = (SELECT s.nouvelle FROM _semis s JOIN referentiel r ON r.id = s.referentiel_id WHERE r.code = 'SMARTEX_SUSTWAY') AND d.code = 'D3';
INSERT INTO question (critere_id, referentiel_version_id, code, libelle, type, ordre, obligatoire, echelle_reponse)
SELECT c.id, c.referentiel_version_id, 'D3-33-Q1', 'désigner une personne ou un comité en charge du déploiement des programmes de formation de l’entreprise en faveur des collaborateurs', 'FERMEE'::type_question, 1, true, 'MATURITE'
  FROM critere c WHERE c.referentiel_version_id = (SELECT s.nouvelle FROM _semis s JOIN referentiel r ON r.id = s.referentiel_id WHERE r.code = 'SMARTEX_SUSTWAY') AND c.code = 'D3-33';
INSERT INTO exigence (critere_id, referentiel_version_id, code, intitule, enonce, ordre, origine)
SELECT c.id, c.referentiel_version_id, c.code || '-E1', left(c.libelle, 300), c.libelle, 0, 'CONTENU_INITIAL'
  FROM critere c WHERE c.referentiel_version_id = (SELECT s.nouvelle FROM _semis s JOIN referentiel r ON r.id = s.referentiel_id WHERE r.code = 'SMARTEX_SUSTWAY') AND c.code = 'D3-33';

INSERT INTO critere (domaine_id, sous_domaine_id, referentiel_version_id, code, libelle, description, applicabilite, criticite_id, actif, coefficient_ponderation)
SELECT d.id, (SELECT sd.id FROM sous_domaine sd WHERE sd.domaine_id = d.id AND sd.code = 'D3-S3'), d.referentiel_version_id, 'D3-34', 'Assurer les normes les plus élevées de santé, sécurité et d’hygiène sur le lieu du travail.', NULL, 'GENERALE'::type_applicabilite, (SELECT cr.id FROM criticite cr WHERE cr.code = 'MOYENNE'::niveau_criticite), true, 3.0
  FROM domaine d WHERE d.referentiel_version_id = (SELECT s.nouvelle FROM _semis s JOIN referentiel r ON r.id = s.referentiel_id WHERE r.code = 'SMARTEX_SUSTWAY') AND d.code = 'D3';
INSERT INTO question (critere_id, referentiel_version_id, code, libelle, type, ordre, obligatoire, echelle_reponse)
SELECT c.id, c.referentiel_version_id, 'D3-34-Q1', 'Assurer les normes les plus élevées de santé, sécurité et d’hygiène sur le lieu du travail.', 'FERMEE'::type_question, 1, true, 'MATURITE'
  FROM critere c WHERE c.referentiel_version_id = (SELECT s.nouvelle FROM _semis s JOIN referentiel r ON r.id = s.referentiel_id WHERE r.code = 'SMARTEX_SUSTWAY') AND c.code = 'D3-34';
INSERT INTO exigence (critere_id, referentiel_version_id, code, intitule, enonce, ordre, origine)
SELECT c.id, c.referentiel_version_id, c.code || '-E1', left(c.libelle, 300), c.libelle, 0, 'CONTENU_INITIAL'
  FROM critere c WHERE c.referentiel_version_id = (SELECT s.nouvelle FROM _semis s JOIN referentiel r ON r.id = s.referentiel_id WHERE r.code = 'SMARTEX_SUSTWAY') AND c.code = 'D3-34';

INSERT INTO critere (domaine_id, sous_domaine_id, referentiel_version_id, code, libelle, description, applicabilite, criticite_id, actif, coefficient_ponderation)
SELECT d.id, (SELECT sd.id FROM sous_domaine sd WHERE sd.domaine_id = d.id AND sd.code = 'D3-S3'), d.referentiel_version_id, 'D3-35', 'Entreprendre des actions qui visent à améliorer l’environnement de travail des collaborateurs, (notamment, mise à disposition de salle, de coin repas, restaurant d’entreprise, vestiaire ; ….).', NULL, 'GENERALE'::type_applicabilite, (SELECT cr.id FROM criticite cr WHERE cr.code = 'MOYENNE'::niveau_criticite), true, 2.0
  FROM domaine d WHERE d.referentiel_version_id = (SELECT s.nouvelle FROM _semis s JOIN referentiel r ON r.id = s.referentiel_id WHERE r.code = 'SMARTEX_SUSTWAY') AND d.code = 'D3';
INSERT INTO question (critere_id, referentiel_version_id, code, libelle, type, ordre, obligatoire, echelle_reponse)
SELECT c.id, c.referentiel_version_id, 'D3-35-Q1', 'Entreprendre des actions qui visent à améliorer l’environnement de travail des collaborateurs, (notamment, mise à disposition de salle, de coin repas, restaurant d’entreprise, vestiaire ; ….).', 'FERMEE'::type_question, 1, true, 'MATURITE'
  FROM critere c WHERE c.referentiel_version_id = (SELECT s.nouvelle FROM _semis s JOIN referentiel r ON r.id = s.referentiel_id WHERE r.code = 'SMARTEX_SUSTWAY') AND c.code = 'D3-35';
INSERT INTO exigence (critere_id, referentiel_version_id, code, intitule, enonce, ordre, origine)
SELECT c.id, c.referentiel_version_id, c.code || '-E1', left(c.libelle, 300), c.libelle, 0, 'CONTENU_INITIAL'
  FROM critere c WHERE c.referentiel_version_id = (SELECT s.nouvelle FROM _semis s JOIN referentiel r ON r.id = s.referentiel_id WHERE r.code = 'SMARTEX_SUSTWAY') AND c.code = 'D3-35';

INSERT INTO critere (domaine_id, sous_domaine_id, referentiel_version_id, code, libelle, description, applicabilite, criticite_id, actif, coefficient_ponderation)
SELECT d.id, (SELECT sd.id FROM sous_domaine sd WHERE sd.domaine_id = d.id AND sd.code = 'D3-S3'), d.referentiel_version_id, 'D3-36', 'Formaliser l’engagement de l’entreprise en faveur des conditions de travail décentes et de sécurité en déployant un système de management qui vise à la certification OHSAS 18001 v 2007 (Santé et Sécurité sur le lieu du travail), qui est un grand signal, ou ISO 45001 v 2018.', NULL, 'GENERALE'::type_applicabilite, (SELECT cr.id FROM criticite cr WHERE cr.code = 'MOYENNE'::niveau_criticite), true, 2.0
  FROM domaine d WHERE d.referentiel_version_id = (SELECT s.nouvelle FROM _semis s JOIN referentiel r ON r.id = s.referentiel_id WHERE r.code = 'SMARTEX_SUSTWAY') AND d.code = 'D3';
INSERT INTO question (critere_id, referentiel_version_id, code, libelle, type, ordre, obligatoire, echelle_reponse)
SELECT c.id, c.referentiel_version_id, 'D3-36-Q1', 'Formaliser l’engagement de l’entreprise en faveur des conditions de travail décentes et de sécurité en déployant un système de management qui vise à la certification OHSAS 18001 v 2007 (Santé et Sécurité sur le lieu du travail), qui est un grand signal, ou ISO 45001 v 2018.', 'FERMEE'::type_question, 1, true, 'MATURITE'
  FROM critere c WHERE c.referentiel_version_id = (SELECT s.nouvelle FROM _semis s JOIN referentiel r ON r.id = s.referentiel_id WHERE r.code = 'SMARTEX_SUSTWAY') AND c.code = 'D3-36';
INSERT INTO exigence (critere_id, referentiel_version_id, code, intitule, enonce, ordre, origine)
SELECT c.id, c.referentiel_version_id, c.code || '-E1', left(c.libelle, 300), c.libelle, 0, 'CONTENU_INITIAL'
  FROM critere c WHERE c.referentiel_version_id = (SELECT s.nouvelle FROM _semis s JOIN referentiel r ON r.id = s.referentiel_id WHERE r.code = 'SMARTEX_SUSTWAY') AND c.code = 'D3-36';

INSERT INTO critere (domaine_id, sous_domaine_id, referentiel_version_id, code, libelle, description, applicabilite, criticite_id, actif, coefficient_ponderation)
SELECT d.id, (SELECT sd.id FROM sous_domaine sd WHERE sd.domaine_id = d.id AND sd.code = 'D3-S3'), d.referentiel_version_id, 'D3-37', 'Formaliser l’engagement de l’entreprise en faveur des conditions de travail décentes en déployant un système de management qui vise à la certification SA 8000 (les bonnes pratiques sociales relatives aux conditions de travail), qui est un grand signal.', NULL, 'GENERALE'::type_applicabilite, (SELECT cr.id FROM criticite cr WHERE cr.code = 'MOYENNE'::niveau_criticite), true, 3.0
  FROM domaine d WHERE d.referentiel_version_id = (SELECT s.nouvelle FROM _semis s JOIN referentiel r ON r.id = s.referentiel_id WHERE r.code = 'SMARTEX_SUSTWAY') AND d.code = 'D3';
INSERT INTO question (critere_id, referentiel_version_id, code, libelle, type, ordre, obligatoire, echelle_reponse)
SELECT c.id, c.referentiel_version_id, 'D3-37-Q1', 'Formaliser l’engagement de l’entreprise en faveur des conditions de travail décentes en déployant un système de management qui vise à la certification SA 8000 (les bonnes pratiques sociales relatives aux conditions de travail), qui est un grand signal.', 'FERMEE'::type_question, 1, true, 'MATURITE'
  FROM critere c WHERE c.referentiel_version_id = (SELECT s.nouvelle FROM _semis s JOIN referentiel r ON r.id = s.referentiel_id WHERE r.code = 'SMARTEX_SUSTWAY') AND c.code = 'D3-37';
INSERT INTO exigence (critere_id, referentiel_version_id, code, intitule, enonce, ordre, origine)
SELECT c.id, c.referentiel_version_id, c.code || '-E1', left(c.libelle, 300), c.libelle, 0, 'CONTENU_INITIAL'
  FROM critere c WHERE c.referentiel_version_id = (SELECT s.nouvelle FROM _semis s JOIN referentiel r ON r.id = s.referentiel_id WHERE r.code = 'SMARTEX_SUSTWAY') AND c.code = 'D3-37';

INSERT INTO critere (domaine_id, sous_domaine_id, referentiel_version_id, code, libelle, description, applicabilite, criticite_id, actif, coefficient_ponderation)
SELECT d.id, (SELECT sd.id FROM sous_domaine sd WHERE sd.domaine_id = d.id AND sd.code = 'D3-S4'), d.referentiel_version_id, 'D3-38', 'Prendre des mesures afin de renforcer le dialogue social au sein de l’entreprise', NULL, 'GENERALE'::type_applicabilite, (SELECT cr.id FROM criticite cr WHERE cr.code = 'MOYENNE'::niveau_criticite), true, 2.0
  FROM domaine d WHERE d.referentiel_version_id = (SELECT s.nouvelle FROM _semis s JOIN referentiel r ON r.id = s.referentiel_id WHERE r.code = 'SMARTEX_SUSTWAY') AND d.code = 'D3';
INSERT INTO question (critere_id, referentiel_version_id, code, libelle, type, ordre, obligatoire, echelle_reponse)
SELECT c.id, c.referentiel_version_id, 'D3-38-Q1', 'Prendre des mesures afin de renforcer le dialogue social au sein de l’entreprise', 'FERMEE'::type_question, 1, true, 'MATURITE'
  FROM critere c WHERE c.referentiel_version_id = (SELECT s.nouvelle FROM _semis s JOIN referentiel r ON r.id = s.referentiel_id WHERE r.code = 'SMARTEX_SUSTWAY') AND c.code = 'D3-38';
INSERT INTO exigence (critere_id, referentiel_version_id, code, intitule, enonce, ordre, origine)
SELECT c.id, c.referentiel_version_id, c.code || '-E1', left(c.libelle, 300), c.libelle, 0, 'CONTENU_INITIAL'
  FROM critere c WHERE c.referentiel_version_id = (SELECT s.nouvelle FROM _semis s JOIN referentiel r ON r.id = s.referentiel_id WHERE r.code = 'SMARTEX_SUSTWAY') AND c.code = 'D3-38';

INSERT INTO critere (domaine_id, sous_domaine_id, referentiel_version_id, code, libelle, description, applicabilite, criticite_id, actif, coefficient_ponderation)
SELECT d.id, (SELECT sd.id FROM sous_domaine sd WHERE sd.domaine_id = d.id AND sd.code = 'D3-S4'), d.referentiel_version_id, 'D3-39', 'Prendre des mesures afin de respecter la liberté d’association des salariés.', NULL, 'GENERALE'::type_applicabilite, (SELECT cr.id FROM criticite cr WHERE cr.code = 'MOYENNE'::niveau_criticite), true, 1.0
  FROM domaine d WHERE d.referentiel_version_id = (SELECT s.nouvelle FROM _semis s JOIN referentiel r ON r.id = s.referentiel_id WHERE r.code = 'SMARTEX_SUSTWAY') AND d.code = 'D3';
INSERT INTO question (critere_id, referentiel_version_id, code, libelle, type, ordre, obligatoire, echelle_reponse)
SELECT c.id, c.referentiel_version_id, 'D3-39-Q1', 'Prendre des mesures afin de respecter la liberté d’association des salariés.', 'FERMEE'::type_question, 1, true, 'MATURITE'
  FROM critere c WHERE c.referentiel_version_id = (SELECT s.nouvelle FROM _semis s JOIN referentiel r ON r.id = s.referentiel_id WHERE r.code = 'SMARTEX_SUSTWAY') AND c.code = 'D3-39';
INSERT INTO exigence (critere_id, referentiel_version_id, code, intitule, enonce, ordre, origine)
SELECT c.id, c.referentiel_version_id, c.code || '-E1', left(c.libelle, 300), c.libelle, 0, 'CONTENU_INITIAL'
  FROM critere c WHERE c.referentiel_version_id = (SELECT s.nouvelle FROM _semis s JOIN referentiel r ON r.id = s.referentiel_id WHERE r.code = 'SMARTEX_SUSTWAY') AND c.code = 'D3-39';

INSERT INTO critere (domaine_id, sous_domaine_id, referentiel_version_id, code, libelle, description, applicabilite, criticite_id, actif, coefficient_ponderation)
SELECT d.id, (SELECT sd.id FROM sous_domaine sd WHERE sd.domaine_id = d.id AND sd.code = 'D3-S4'), d.referentiel_version_id, 'D3-40', 'Reconnaître et faciliter le droit de négociation collective des salariés.', NULL, 'GENERALE'::type_applicabilite, (SELECT cr.id FROM criticite cr WHERE cr.code = 'MOYENNE'::niveau_criticite), true, 2.0
  FROM domaine d WHERE d.referentiel_version_id = (SELECT s.nouvelle FROM _semis s JOIN referentiel r ON r.id = s.referentiel_id WHERE r.code = 'SMARTEX_SUSTWAY') AND d.code = 'D3';
INSERT INTO question (critere_id, referentiel_version_id, code, libelle, type, ordre, obligatoire, echelle_reponse)
SELECT c.id, c.referentiel_version_id, 'D3-40-Q1', 'Reconnaître et faciliter le droit de négociation collective des salariés.', 'FERMEE'::type_question, 1, true, 'MATURITE'
  FROM critere c WHERE c.referentiel_version_id = (SELECT s.nouvelle FROM _semis s JOIN referentiel r ON r.id = s.referentiel_id WHERE r.code = 'SMARTEX_SUSTWAY') AND c.code = 'D3-40';
INSERT INTO exigence (critere_id, referentiel_version_id, code, intitule, enonce, ordre, origine)
SELECT c.id, c.referentiel_version_id, c.code || '-E1', left(c.libelle, 300), c.libelle, 0, 'CONTENU_INITIAL'
  FROM critere c WHERE c.referentiel_version_id = (SELECT s.nouvelle FROM _semis s JOIN referentiel r ON r.id = s.referentiel_id WHERE r.code = 'SMARTEX_SUSTWAY') AND c.code = 'D3-40';

INSERT INTO critere (domaine_id, sous_domaine_id, referentiel_version_id, code, libelle, description, applicabilite, criticite_id, actif, coefficient_ponderation)
SELECT d.id, (SELECT sd.id FROM sous_domaine sd WHERE sd.domaine_id = d.id AND sd.code = 'D3-S4'), d.referentiel_version_id, 'D3-41', 'Etablir des procédures pour l’examen de réclamations individuelles ou collectives et des mécanismes de conciliation volontaire.', NULL, 'GENERALE'::type_applicabilite, (SELECT cr.id FROM criticite cr WHERE cr.code = 'MOYENNE'::niveau_criticite), true, 3.0
  FROM domaine d WHERE d.referentiel_version_id = (SELECT s.nouvelle FROM _semis s JOIN referentiel r ON r.id = s.referentiel_id WHERE r.code = 'SMARTEX_SUSTWAY') AND d.code = 'D3';
INSERT INTO question (critere_id, referentiel_version_id, code, libelle, type, ordre, obligatoire, echelle_reponse)
SELECT c.id, c.referentiel_version_id, 'D3-41-Q1', 'Etablir des procédures pour l’examen de réclamations individuelles ou collectives et des mécanismes de conciliation volontaire.', 'FERMEE'::type_question, 1, true, 'MATURITE'
  FROM critere c WHERE c.referentiel_version_id = (SELECT s.nouvelle FROM _semis s JOIN referentiel r ON r.id = s.referentiel_id WHERE r.code = 'SMARTEX_SUSTWAY') AND c.code = 'D3-41';
INSERT INTO exigence (critere_id, referentiel_version_id, code, intitule, enonce, ordre, origine)
SELECT c.id, c.referentiel_version_id, c.code || '-E1', left(c.libelle, 300), c.libelle, 0, 'CONTENU_INITIAL'
  FROM critere c WHERE c.referentiel_version_id = (SELECT s.nouvelle FROM _semis s JOIN referentiel r ON r.id = s.referentiel_id WHERE r.code = 'SMARTEX_SUSTWAY') AND c.code = 'D3-41';

INSERT INTO critere (domaine_id, sous_domaine_id, referentiel_version_id, code, libelle, description, applicabilite, criticite_id, actif, coefficient_ponderation)
SELECT d.id, (SELECT sd.id FROM sous_domaine sd WHERE sd.domaine_id = d.id AND sd.code = 'D3-S4'), d.referentiel_version_id, 'D3-42', 'Permettre aux représentants des salariés d’exercer leurs fonctions en les autorisant à se retrouver dans les locaux de l’entreprise, distribuer les notes du syndicat, etc.', NULL, 'GENERALE'::type_applicabilite, (SELECT cr.id FROM criticite cr WHERE cr.code = 'MOYENNE'::niveau_criticite), true, 3.0
  FROM domaine d WHERE d.referentiel_version_id = (SELECT s.nouvelle FROM _semis s JOIN referentiel r ON r.id = s.referentiel_id WHERE r.code = 'SMARTEX_SUSTWAY') AND d.code = 'D3';
INSERT INTO question (critere_id, referentiel_version_id, code, libelle, type, ordre, obligatoire, echelle_reponse)
SELECT c.id, c.referentiel_version_id, 'D3-42-Q1', 'Permettre aux représentants des salariés d’exercer leurs fonctions en les autorisant à se retrouver dans les locaux de l’entreprise, distribuer les notes du syndicat, etc.', 'FERMEE'::type_question, 1, true, 'MATURITE'
  FROM critere c WHERE c.referentiel_version_id = (SELECT s.nouvelle FROM _semis s JOIN referentiel r ON r.id = s.referentiel_id WHERE r.code = 'SMARTEX_SUSTWAY') AND c.code = 'D3-42';
INSERT INTO exigence (critere_id, referentiel_version_id, code, intitule, enonce, ordre, origine)
SELECT c.id, c.referentiel_version_id, c.code || '-E1', left(c.libelle, 300), c.libelle, 0, 'CONTENU_INITIAL'
  FROM critere c WHERE c.referentiel_version_id = (SELECT s.nouvelle FROM _semis s JOIN referentiel r ON r.id = s.referentiel_id WHERE r.code = 'SMARTEX_SUSTWAY') AND c.code = 'D3-42';

INSERT INTO critere (domaine_id, sous_domaine_id, referentiel_version_id, code, libelle, description, applicabilite, criticite_id, actif, coefficient_ponderation)
SELECT d.id, (SELECT sd.id FROM sous_domaine sd WHERE sd.domaine_id = d.id AND sd.code = 'D3-S5'), d.referentiel_version_id, 'D3-43', 'Etre attentif à ce que les activités de l’entreprise aient des retombées positives pour les communautés où elle est implantée (en termes d’emplois, de formation, de développement de la culture locale, d’éducation, de développement des technologies et leur accès ; …).', NULL, 'GENERALE'::type_applicabilite, (SELECT cr.id FROM criticite cr WHERE cr.code = 'MOYENNE'::niveau_criticite), true, 3.0
  FROM domaine d WHERE d.referentiel_version_id = (SELECT s.nouvelle FROM _semis s JOIN referentiel r ON r.id = s.referentiel_id WHERE r.code = 'SMARTEX_SUSTWAY') AND d.code = 'D3';
INSERT INTO question (critere_id, referentiel_version_id, code, libelle, type, ordre, obligatoire, echelle_reponse)
SELECT c.id, c.referentiel_version_id, 'D3-43-Q1', 'Etre attentif à ce que les activités de l’entreprise aient des retombées positives pour les communautés où elle est implantée (en termes d’emplois, de formation, de développement de la culture locale, d’éducation, de développement des technologies et leur accès ; …).', 'FERMEE'::type_question, 1, true, 'MATURITE'
  FROM critere c WHERE c.referentiel_version_id = (SELECT s.nouvelle FROM _semis s JOIN referentiel r ON r.id = s.referentiel_id WHERE r.code = 'SMARTEX_SUSTWAY') AND c.code = 'D3-43';
INSERT INTO exigence (critere_id, referentiel_version_id, code, intitule, enonce, ordre, origine)
SELECT c.id, c.referentiel_version_id, c.code || '-E1', left(c.libelle, 300), c.libelle, 0, 'CONTENU_INITIAL'
  FROM critere c WHERE c.referentiel_version_id = (SELECT s.nouvelle FROM _semis s JOIN referentiel r ON r.id = s.referentiel_id WHERE r.code = 'SMARTEX_SUSTWAY') AND c.code = 'D3-43';

INSERT INTO critere (domaine_id, sous_domaine_id, referentiel_version_id, code, libelle, description, applicabilite, criticite_id, actif, coefficient_ponderation)
SELECT d.id, (SELECT sd.id FROM sous_domaine sd WHERE sd.domaine_id = d.id AND sd.code = 'D3-S5'), d.referentiel_version_id, 'D3-44', 'Dialogue ouvert et constructif avec les communautés locales sur les questions controversées ou sensibles qui impliquent l’entreprise (par exemple, l’accumulation de déchets à l’extérieur des locaux, les véhicules obstruant les rues et les trottoirs ; …)', NULL, 'GENERALE'::type_applicabilite, (SELECT cr.id FROM criticite cr WHERE cr.code = 'MOYENNE'::niveau_criticite), true, 3.0
  FROM domaine d WHERE d.referentiel_version_id = (SELECT s.nouvelle FROM _semis s JOIN referentiel r ON r.id = s.referentiel_id WHERE r.code = 'SMARTEX_SUSTWAY') AND d.code = 'D3';
INSERT INTO question (critere_id, referentiel_version_id, code, libelle, type, ordre, obligatoire, echelle_reponse)
SELECT c.id, c.referentiel_version_id, 'D3-44-Q1', 'Dialogue ouvert et constructif avec les communautés locales sur les questions controversées ou sensibles qui impliquent l’entreprise (par exemple, l’accumulation de déchets à l’extérieur des locaux, les véhicules obstruant les rues et les trottoirs ; …)', 'FERMEE'::type_question, 1, true, 'MATURITE'
  FROM critere c WHERE c.referentiel_version_id = (SELECT s.nouvelle FROM _semis s JOIN referentiel r ON r.id = s.referentiel_id WHERE r.code = 'SMARTEX_SUSTWAY') AND c.code = 'D3-44';
INSERT INTO exigence (critere_id, referentiel_version_id, code, intitule, enonce, ordre, origine)
SELECT c.id, c.referentiel_version_id, c.code || '-E1', left(c.libelle, 300), c.libelle, 0, 'CONTENU_INITIAL'
  FROM critere c WHERE c.referentiel_version_id = (SELECT s.nouvelle FROM _semis s JOIN referentiel r ON r.id = s.referentiel_id WHERE r.code = 'SMARTEX_SUSTWAY') AND c.code = 'D3-44';

INSERT INTO critere (domaine_id, sous_domaine_id, referentiel_version_id, code, libelle, description, applicabilite, criticite_id, actif, coefficient_ponderation)
SELECT d.id, (SELECT sd.id FROM sous_domaine sd WHERE sd.domaine_id = d.id AND sd.code = 'D3-S5'), d.referentiel_version_id, 'D3-45', 'Soutenir financièrement les activités et les projets de la communauté locale (notamment à travers des dons de bienfaisance, actions de lutte contre le SIDA, sponsoring ou mécénat culturel, sportif, environnemental), et contribuer ainsi au développement économique du tissu local.', NULL, 'GENERALE'::type_applicabilite, (SELECT cr.id FROM criticite cr WHERE cr.code = 'MOYENNE'::niveau_criticite), true, 1.0
  FROM domaine d WHERE d.referentiel_version_id = (SELECT s.nouvelle FROM _semis s JOIN referentiel r ON r.id = s.referentiel_id WHERE r.code = 'SMARTEX_SUSTWAY') AND d.code = 'D3';
INSERT INTO question (critere_id, referentiel_version_id, code, libelle, type, ordre, obligatoire, echelle_reponse)
SELECT c.id, c.referentiel_version_id, 'D3-45-Q1', 'Soutenir financièrement les activités et les projets de la communauté locale (notamment à travers des dons de bienfaisance, actions de lutte contre le SIDA, sponsoring ou mécénat culturel, sportif, environnemental), et contribuer ainsi au développement économique du tissu local.', 'FERMEE'::type_question, 1, true, 'MATURITE'
  FROM critere c WHERE c.referentiel_version_id = (SELECT s.nouvelle FROM _semis s JOIN referentiel r ON r.id = s.referentiel_id WHERE r.code = 'SMARTEX_SUSTWAY') AND c.code = 'D3-45';
INSERT INTO exigence (critere_id, referentiel_version_id, code, intitule, enonce, ordre, origine)
SELECT c.id, c.referentiel_version_id, c.code || '-E1', left(c.libelle, 300), c.libelle, 0, 'CONTENU_INITIAL'
  FROM critere c WHERE c.referentiel_version_id = (SELECT s.nouvelle FROM _semis s JOIN referentiel r ON r.id = s.referentiel_id WHERE r.code = 'SMARTEX_SUSTWAY') AND c.code = 'D3-45';

INSERT INTO critere (domaine_id, sous_domaine_id, referentiel_version_id, code, libelle, description, applicabilite, criticite_id, actif, coefficient_ponderation)
SELECT d.id, (SELECT sd.id FROM sous_domaine sd WHERE sd.domaine_id = d.id AND sd.code = 'D3-S5'), d.referentiel_version_id, 'D3-46', 'S’acquitter de façon régulière de ses impôts locaux.', NULL, 'GENERALE'::type_applicabilite, (SELECT cr.id FROM criticite cr WHERE cr.code = 'MOYENNE'::niveau_criticite), true, 3.0
  FROM domaine d WHERE d.referentiel_version_id = (SELECT s.nouvelle FROM _semis s JOIN referentiel r ON r.id = s.referentiel_id WHERE r.code = 'SMARTEX_SUSTWAY') AND d.code = 'D3';
INSERT INTO question (critere_id, referentiel_version_id, code, libelle, type, ordre, obligatoire, echelle_reponse)
SELECT c.id, c.referentiel_version_id, 'D3-46-Q1', 'S’acquitter de façon régulière de ses impôts locaux.', 'FERMEE'::type_question, 1, true, 'MATURITE'
  FROM critere c WHERE c.referentiel_version_id = (SELECT s.nouvelle FROM _semis s JOIN referentiel r ON r.id = s.referentiel_id WHERE r.code = 'SMARTEX_SUSTWAY') AND c.code = 'D3-46';
INSERT INTO exigence (critere_id, referentiel_version_id, code, intitule, enonce, ordre, origine)
SELECT c.id, c.referentiel_version_id, c.code || '-E1', left(c.libelle, 300), c.libelle, 0, 'CONTENU_INITIAL'
  FROM critere c WHERE c.referentiel_version_id = (SELECT s.nouvelle FROM _semis s JOIN referentiel r ON r.id = s.referentiel_id WHERE r.code = 'SMARTEX_SUSTWAY') AND c.code = 'D3-46';

INSERT INTO domaine (referentiel_id, referentiel_version_id, code, nom, description, ordre)
VALUES ((SELECT id FROM referentiel WHERE code = 'SMARTEX_SUSTWAY'), (SELECT s.nouvelle FROM _semis s JOIN referentiel r ON r.id = s.referentiel_id WHERE r.code = 'SMARTEX_SUSTWAY'), 'D4', 'Bonnes pratiques de protection de l’environnement et de l’atmosphère', 'Dimension Bonnes pratiques de protection de l’environnement et de l’atmosphère', 4);
INSERT INTO sous_domaine (domaine_id, referentiel_version_id, code, nom, description, ordre)
SELECT d.id, d.referentiel_version_id, 'D4-S1', 'A) Mesures d’ordre général', 'A) Mesures d’ordre général', 1
  FROM domaine d WHERE d.referentiel_version_id = (SELECT s.nouvelle FROM _semis s JOIN referentiel r ON r.id = s.referentiel_id WHERE r.code = 'SMARTEX_SUSTWAY') AND d.code = 'D4';
INSERT INTO sous_domaine (domaine_id, referentiel_version_id, code, nom, description, ordre)
SELECT d.id, d.referentiel_version_id, 'D4-S2', 'B) Gestion des consommations d’eau', 'B) Gestion des consommations d’eau', 2
  FROM domaine d WHERE d.referentiel_version_id = (SELECT s.nouvelle FROM _semis s JOIN referentiel r ON r.id = s.referentiel_id WHERE r.code = 'SMARTEX_SUSTWAY') AND d.code = 'D4';
INSERT INTO sous_domaine (domaine_id, referentiel_version_id, code, nom, description, ordre)
SELECT d.id, d.referentiel_version_id, 'D4-S3', 'C) Gestion des consommations d’énergie', 'C) Gestion des consommations d’énergie', 3
  FROM domaine d WHERE d.referentiel_version_id = (SELECT s.nouvelle FROM _semis s JOIN referentiel r ON r.id = s.referentiel_id WHERE r.code = 'SMARTEX_SUSTWAY') AND d.code = 'D4';
INSERT INTO sous_domaine (domaine_id, referentiel_version_id, code, nom, description, ordre)
SELECT d.id, d.referentiel_version_id, 'D4-S4', 'D) Gestion des rejets atmosphériques', 'D) Gestion des rejets atmosphériques', 4
  FROM domaine d WHERE d.referentiel_version_id = (SELECT s.nouvelle FROM _semis s JOIN referentiel r ON r.id = s.referentiel_id WHERE r.code = 'SMARTEX_SUSTWAY') AND d.code = 'D4';
INSERT INTO sous_domaine (domaine_id, referentiel_version_id, code, nom, description, ordre)
SELECT d.id, d.referentiel_version_id, 'D4-S5', 'E) Gestion des rejets liquides', 'E) Gestion des rejets liquides', 5
  FROM domaine d WHERE d.referentiel_version_id = (SELECT s.nouvelle FROM _semis s JOIN referentiel r ON r.id = s.referentiel_id WHERE r.code = 'SMARTEX_SUSTWAY') AND d.code = 'D4';
INSERT INTO sous_domaine (domaine_id, referentiel_version_id, code, nom, description, ordre)
SELECT d.id, d.referentiel_version_id, 'D4-S6', 'F) Gestion des déchets solides', 'F) Gestion des déchets solides', 6
  FROM domaine d WHERE d.referentiel_version_id = (SELECT s.nouvelle FROM _semis s JOIN referentiel r ON r.id = s.referentiel_id WHERE r.code = 'SMARTEX_SUSTWAY') AND d.code = 'D4';
INSERT INTO critere (domaine_id, sous_domaine_id, referentiel_version_id, code, libelle, description, applicabilite, criticite_id, actif, coefficient_ponderation)
SELECT d.id, (SELECT sd.id FROM sous_domaine sd WHERE sd.domaine_id = d.id AND sd.code = 'D4-S1'), d.referentiel_version_id, 'D4-47', 'Prendre des mesures pour assurer la conformité de ses activités aux dispositions législatives et réglementaires applicables en matière de protection de d’environnement', NULL, 'GENERALE'::type_applicabilite, (SELECT cr.id FROM criticite cr WHERE cr.code = 'MOYENNE'::niveau_criticite), true, 2.0
  FROM domaine d WHERE d.referentiel_version_id = (SELECT s.nouvelle FROM _semis s JOIN referentiel r ON r.id = s.referentiel_id WHERE r.code = 'SMARTEX_SUSTWAY') AND d.code = 'D4';
INSERT INTO question (critere_id, referentiel_version_id, code, libelle, type, ordre, obligatoire, echelle_reponse)
SELECT c.id, c.referentiel_version_id, 'D4-47-Q1', 'Prendre des mesures pour assurer la conformité de ses activités aux dispositions législatives et réglementaires applicables en matière de protection de d’environnement', 'FERMEE'::type_question, 1, true, 'MATURITE'
  FROM critere c WHERE c.referentiel_version_id = (SELECT s.nouvelle FROM _semis s JOIN referentiel r ON r.id = s.referentiel_id WHERE r.code = 'SMARTEX_SUSTWAY') AND c.code = 'D4-47';
INSERT INTO exigence (critere_id, referentiel_version_id, code, intitule, enonce, ordre, origine)
SELECT c.id, c.referentiel_version_id, c.code || '-E1', left(c.libelle, 300), c.libelle, 0, 'CONTENU_INITIAL'
  FROM critere c WHERE c.referentiel_version_id = (SELECT s.nouvelle FROM _semis s JOIN referentiel r ON r.id = s.referentiel_id WHERE r.code = 'SMARTEX_SUSTWAY') AND c.code = 'D4-47';

INSERT INTO critere (domaine_id, sous_domaine_id, referentiel_version_id, code, libelle, description, applicabilite, criticite_id, actif, coefficient_ponderation)
SELECT d.id, (SELECT sd.id FROM sous_domaine sd WHERE sd.domaine_id = d.id AND sd.code = 'D4-S1'), d.referentiel_version_id, 'D4-48', 'Disposer d''un système interne de management de l''environnement, avec des objectifs bien fixés, des responsables et moyens concrètement mobilisés et suivi des réalisations (par exemple, appliquer une charte environnementale).', NULL, 'GENERALE'::type_applicabilite, (SELECT cr.id FROM criticite cr WHERE cr.code = 'MOYENNE'::niveau_criticite), true, 1.0
  FROM domaine d WHERE d.referentiel_version_id = (SELECT s.nouvelle FROM _semis s JOIN referentiel r ON r.id = s.referentiel_id WHERE r.code = 'SMARTEX_SUSTWAY') AND d.code = 'D4';
INSERT INTO question (critere_id, referentiel_version_id, code, libelle, type, ordre, obligatoire, echelle_reponse)
SELECT c.id, c.referentiel_version_id, 'D4-48-Q1', 'Disposer d''un système interne de management de l''environnement, avec des objectifs bien fixés, des responsables et moyens concrètement mobilisés et suivi des réalisations (par exemple, appliquer une charte environnementale).', 'FERMEE'::type_question, 1, true, 'MATURITE'
  FROM critere c WHERE c.referentiel_version_id = (SELECT s.nouvelle FROM _semis s JOIN referentiel r ON r.id = s.referentiel_id WHERE r.code = 'SMARTEX_SUSTWAY') AND c.code = 'D4-48';
INSERT INTO exigence (critere_id, referentiel_version_id, code, intitule, enonce, ordre, origine)
SELECT c.id, c.referentiel_version_id, c.code || '-E1', left(c.libelle, 300), c.libelle, 0, 'CONTENU_INITIAL'
  FROM critere c WHERE c.referentiel_version_id = (SELECT s.nouvelle FROM _semis s JOIN referentiel r ON r.id = s.referentiel_id WHERE r.code = 'SMARTEX_SUSTWAY') AND c.code = 'D4-48';

INSERT INTO critere (domaine_id, sous_domaine_id, referentiel_version_id, code, libelle, description, applicabilite, criticite_id, actif, coefficient_ponderation)
SELECT d.id, (SELECT sd.id FROM sous_domaine sd WHERE sd.domaine_id = d.id AND sd.code = 'D4-S1'), d.referentiel_version_id, 'D4-49', 'Prendre des initiatives pour promouvoir une plus grande responsabilité environnementale auprès de tout le personnel, (par exemple, établir un programme de formation du personnel visant la connaissance et la mise en œuvre pratique des mesures concernant la protection de l''environnement).', NULL, 'GENERALE'::type_applicabilite, (SELECT cr.id FROM criticite cr WHERE cr.code = 'MOYENNE'::niveau_criticite), true, 1.0
  FROM domaine d WHERE d.referentiel_version_id = (SELECT s.nouvelle FROM _semis s JOIN referentiel r ON r.id = s.referentiel_id WHERE r.code = 'SMARTEX_SUSTWAY') AND d.code = 'D4';
INSERT INTO question (critere_id, referentiel_version_id, code, libelle, type, ordre, obligatoire, echelle_reponse)
SELECT c.id, c.referentiel_version_id, 'D4-49-Q1', 'Prendre des initiatives pour promouvoir une plus grande responsabilité environnementale auprès de tout le personnel, (par exemple, établir un programme de formation du personnel visant la connaissance et la mise en œuvre pratique des mesures concernant la protection de l''environnement).', 'FERMEE'::type_question, 1, true, 'MATURITE'
  FROM critere c WHERE c.referentiel_version_id = (SELECT s.nouvelle FROM _semis s JOIN referentiel r ON r.id = s.referentiel_id WHERE r.code = 'SMARTEX_SUSTWAY') AND c.code = 'D4-49';
INSERT INTO exigence (critere_id, referentiel_version_id, code, intitule, enonce, ordre, origine)
SELECT c.id, c.referentiel_version_id, c.code || '-E1', left(c.libelle, 300), c.libelle, 0, 'CONTENU_INITIAL'
  FROM critere c WHERE c.referentiel_version_id = (SELECT s.nouvelle FROM _semis s JOIN referentiel r ON r.id = s.referentiel_id WHERE r.code = 'SMARTEX_SUSTWAY') AND c.code = 'D4-49';

INSERT INTO critere (domaine_id, sous_domaine_id, referentiel_version_id, code, libelle, description, applicabilite, criticite_id, actif, coefficient_ponderation)
SELECT d.id, (SELECT sd.id FROM sous_domaine sd WHERE sd.domaine_id = d.id AND sd.code = 'D4-S1'), d.referentiel_version_id, 'D4-50', 'Formaliser l’engagement de l’entreprise en faveur de la protection de l’environnement et de l’atmosphère en déployant un système de management environnemental, sur tous ses sites, qui vise à la certification ISO 14001 v 2004 qui est un grand signal envoyé au marché', NULL, 'GENERALE'::type_applicabilite, (SELECT cr.id FROM criticite cr WHERE cr.code = 'MOYENNE'::niveau_criticite), true, 2.0
  FROM domaine d WHERE d.referentiel_version_id = (SELECT s.nouvelle FROM _semis s JOIN referentiel r ON r.id = s.referentiel_id WHERE r.code = 'SMARTEX_SUSTWAY') AND d.code = 'D4';
INSERT INTO question (critere_id, referentiel_version_id, code, libelle, type, ordre, obligatoire, echelle_reponse)
SELECT c.id, c.referentiel_version_id, 'D4-50-Q1', 'Formaliser l’engagement de l’entreprise en faveur de la protection de l’environnement et de l’atmosphère en déployant un système de management environnemental, sur tous ses sites, qui vise à la certification ISO 14001 v 2004 qui est un grand signal envoyé au marché', 'FERMEE'::type_question, 1, true, 'MATURITE'
  FROM critere c WHERE c.referentiel_version_id = (SELECT s.nouvelle FROM _semis s JOIN referentiel r ON r.id = s.referentiel_id WHERE r.code = 'SMARTEX_SUSTWAY') AND c.code = 'D4-50';
INSERT INTO exigence (critere_id, referentiel_version_id, code, intitule, enonce, ordre, origine)
SELECT c.id, c.referentiel_version_id, c.code || '-E1', left(c.libelle, 300), c.libelle, 0, 'CONTENU_INITIAL'
  FROM critere c WHERE c.referentiel_version_id = (SELECT s.nouvelle FROM _semis s JOIN referentiel r ON r.id = s.referentiel_id WHERE r.code = 'SMARTEX_SUSTWAY') AND c.code = 'D4-50';

INSERT INTO critere (domaine_id, sous_domaine_id, referentiel_version_id, code, libelle, description, applicabilite, criticite_id, actif, coefficient_ponderation)
SELECT d.id, (SELECT sd.id FROM sous_domaine sd WHERE sd.domaine_id = d.id AND sd.code = 'D4-S1'), d.referentiel_version_id, 'D4-51', 'Disposer de dispositifs d’intervention plus efficaces concernant les impacts de ses activités sur l’environnement', NULL, 'GENERALE'::type_applicabilite, (SELECT cr.id FROM criticite cr WHERE cr.code = 'MOYENNE'::niveau_criticite), true, 2.0
  FROM domaine d WHERE d.referentiel_version_id = (SELECT s.nouvelle FROM _semis s JOIN referentiel r ON r.id = s.referentiel_id WHERE r.code = 'SMARTEX_SUSTWAY') AND d.code = 'D4';
INSERT INTO question (critere_id, referentiel_version_id, code, libelle, type, ordre, obligatoire, echelle_reponse)
SELECT c.id, c.referentiel_version_id, 'D4-51-Q1', 'Disposer de dispositifs d’intervention plus efficaces concernant les impacts de ses activités sur l’environnement', 'FERMEE'::type_question, 1, true, 'MATURITE'
  FROM critere c WHERE c.referentiel_version_id = (SELECT s.nouvelle FROM _semis s JOIN referentiel r ON r.id = s.referentiel_id WHERE r.code = 'SMARTEX_SUSTWAY') AND c.code = 'D4-51';
INSERT INTO exigence (critere_id, referentiel_version_id, code, intitule, enonce, ordre, origine)
SELECT c.id, c.referentiel_version_id, c.code || '-E1', left(c.libelle, 300), c.libelle, 0, 'CONTENU_INITIAL'
  FROM critere c WHERE c.referentiel_version_id = (SELECT s.nouvelle FROM _semis s JOIN referentiel r ON r.id = s.referentiel_id WHERE r.code = 'SMARTEX_SUSTWAY') AND c.code = 'D4-51';

INSERT INTO critere (domaine_id, sous_domaine_id, referentiel_version_id, code, libelle, description, applicabilite, criticite_id, actif, coefficient_ponderation)
SELECT d.id, (SELECT sd.id FROM sous_domaine sd WHERE sd.domaine_id = d.id AND sd.code = 'D4-S1'), d.referentiel_version_id, 'D4-52', 'Conduire régulièrement et en toute transparence des études d’impacts environnementaux.', NULL, 'GENERALE'::type_applicabilite, (SELECT cr.id FROM criticite cr WHERE cr.code = 'MOYENNE'::niveau_criticite), true, 1.0
  FROM domaine d WHERE d.referentiel_version_id = (SELECT s.nouvelle FROM _semis s JOIN referentiel r ON r.id = s.referentiel_id WHERE r.code = 'SMARTEX_SUSTWAY') AND d.code = 'D4';
INSERT INTO question (critere_id, referentiel_version_id, code, libelle, type, ordre, obligatoire, echelle_reponse)
SELECT c.id, c.referentiel_version_id, 'D4-52-Q1', 'Conduire régulièrement et en toute transparence des études d’impacts environnementaux.', 'FERMEE'::type_question, 1, true, 'MATURITE'
  FROM critere c WHERE c.referentiel_version_id = (SELECT s.nouvelle FROM _semis s JOIN referentiel r ON r.id = s.referentiel_id WHERE r.code = 'SMARTEX_SUSTWAY') AND c.code = 'D4-52';
INSERT INTO exigence (critere_id, referentiel_version_id, code, intitule, enonce, ordre, origine)
SELECT c.id, c.referentiel_version_id, c.code || '-E1', left(c.libelle, 300), c.libelle, 0, 'CONTENU_INITIAL'
  FROM critere c WHERE c.referentiel_version_id = (SELECT s.nouvelle FROM _semis s JOIN referentiel r ON r.id = s.referentiel_id WHERE r.code = 'SMARTEX_SUSTWAY') AND c.code = 'D4-52';

INSERT INTO critere (domaine_id, sous_domaine_id, referentiel_version_id, code, libelle, description, applicabilite, criticite_id, actif, coefficient_ponderation)
SELECT d.id, (SELECT sd.id FROM sous_domaine sd WHERE sd.domaine_id = d.id AND sd.code = 'D4-S1'), d.referentiel_version_id, 'D4-53', 'Adopter une attitude de précaution face aux défis environnementaux', NULL, 'GENERALE'::type_applicabilite, (SELECT cr.id FROM criticite cr WHERE cr.code = 'MOYENNE'::niveau_criticite), true, 3.0
  FROM domaine d WHERE d.referentiel_version_id = (SELECT s.nouvelle FROM _semis s JOIN referentiel r ON r.id = s.referentiel_id WHERE r.code = 'SMARTEX_SUSTWAY') AND d.code = 'D4';
INSERT INTO question (critere_id, referentiel_version_id, code, libelle, type, ordre, obligatoire, echelle_reponse)
SELECT c.id, c.referentiel_version_id, 'D4-53-Q1', 'Adopter une attitude de précaution face aux défis environnementaux', 'FERMEE'::type_question, 1, true, 'MATURITE'
  FROM critere c WHERE c.referentiel_version_id = (SELECT s.nouvelle FROM _semis s JOIN referentiel r ON r.id = s.referentiel_id WHERE r.code = 'SMARTEX_SUSTWAY') AND c.code = 'D4-53';
INSERT INTO exigence (critere_id, referentiel_version_id, code, intitule, enonce, ordre, origine)
SELECT c.id, c.referentiel_version_id, c.code || '-E1', left(c.libelle, 300), c.libelle, 0, 'CONTENU_INITIAL'
  FROM critere c WHERE c.referentiel_version_id = (SELECT s.nouvelle FROM _semis s JOIN referentiel r ON r.id = s.referentiel_id WHERE r.code = 'SMARTEX_SUSTWAY') AND c.code = 'D4-53';

INSERT INTO critere (domaine_id, sous_domaine_id, referentiel_version_id, code, libelle, description, applicabilite, criticite_id, actif, coefficient_ponderation)
SELECT d.id, (SELECT sd.id FROM sous_domaine sd WHERE sd.domaine_id = d.id AND sd.code = 'D4-S1'), d.referentiel_version_id, 'D4-54', 'Tenir compte de l’impact environnemental potentiel lorsque l’entreprise développe de nouveaux produits et services (par exemple, en évaluant la consommation d’énergie, la recyclabilité ou la pollution).', NULL, 'GENERALE'::type_applicabilite, (SELECT cr.id FROM criticite cr WHERE cr.code = 'MOYENNE'::niveau_criticite), true, 3.0
  FROM domaine d WHERE d.referentiel_version_id = (SELECT s.nouvelle FROM _semis s JOIN referentiel r ON r.id = s.referentiel_id WHERE r.code = 'SMARTEX_SUSTWAY') AND d.code = 'D4';
INSERT INTO question (critere_id, referentiel_version_id, code, libelle, type, ordre, obligatoire, echelle_reponse)
SELECT c.id, c.referentiel_version_id, 'D4-54-Q1', 'Tenir compte de l’impact environnemental potentiel lorsque l’entreprise développe de nouveaux produits et services (par exemple, en évaluant la consommation d’énergie, la recyclabilité ou la pollution).', 'FERMEE'::type_question, 1, true, 'MATURITE'
  FROM critere c WHERE c.referentiel_version_id = (SELECT s.nouvelle FROM _semis s JOIN referentiel r ON r.id = s.referentiel_id WHERE r.code = 'SMARTEX_SUSTWAY') AND c.code = 'D4-54';
INSERT INTO exigence (critere_id, referentiel_version_id, code, intitule, enonce, ordre, origine)
SELECT c.id, c.referentiel_version_id, c.code || '-E1', left(c.libelle, 300), c.libelle, 0, 'CONTENU_INITIAL'
  FROM critere c WHERE c.referentiel_version_id = (SELECT s.nouvelle FROM _semis s JOIN referentiel r ON r.id = s.referentiel_id WHERE r.code = 'SMARTEX_SUSTWAY') AND c.code = 'D4-54';

INSERT INTO critere (domaine_id, sous_domaine_id, referentiel_version_id, code, libelle, description, applicabilite, criticite_id, actif, coefficient_ponderation)
SELECT d.id, (SELECT sd.id FROM sous_domaine sd WHERE sd.domaine_id = d.id AND sd.code = 'D4-S2'), d.referentiel_version_id, 'D4-55', 'Disposer d’un système de suivi et de contrôle des consommations d’eau de l’entreprise (l’eau étant un bien précieux, sa consommation doit être maîtrisée afin d''éviter toute sur-consommation ou fuite. De plus, cette maîtrise apporte une économie sur la facture d''eau).', NULL, 'GENERALE'::type_applicabilite, (SELECT cr.id FROM criticite cr WHERE cr.code = 'MOYENNE'::niveau_criticite), true, 2.0
  FROM domaine d WHERE d.referentiel_version_id = (SELECT s.nouvelle FROM _semis s JOIN referentiel r ON r.id = s.referentiel_id WHERE r.code = 'SMARTEX_SUSTWAY') AND d.code = 'D4';
INSERT INTO question (critere_id, referentiel_version_id, code, libelle, type, ordre, obligatoire, echelle_reponse)
SELECT c.id, c.referentiel_version_id, 'D4-55-Q1', 'Disposer d’un système de suivi et de contrôle des consommations d’eau de l’entreprise (l’eau étant un bien précieux, sa consommation doit être maîtrisée afin d''éviter toute sur-consommation ou fuite. De plus, cette maîtrise apporte une économie sur la facture d''eau).', 'FERMEE'::type_question, 1, true, 'MATURITE'
  FROM critere c WHERE c.referentiel_version_id = (SELECT s.nouvelle FROM _semis s JOIN referentiel r ON r.id = s.referentiel_id WHERE r.code = 'SMARTEX_SUSTWAY') AND c.code = 'D4-55';
INSERT INTO exigence (critere_id, referentiel_version_id, code, intitule, enonce, ordre, origine)
SELECT c.id, c.referentiel_version_id, c.code || '-E1', left(c.libelle, 300), c.libelle, 0, 'CONTENU_INITIAL'
  FROM critere c WHERE c.referentiel_version_id = (SELECT s.nouvelle FROM _semis s JOIN referentiel r ON r.id = s.referentiel_id WHERE r.code = 'SMARTEX_SUSTWAY') AND c.code = 'D4-55';

INSERT INTO critere (domaine_id, sous_domaine_id, referentiel_version_id, code, libelle, description, applicabilite, criticite_id, actif, coefficient_ponderation)
SELECT d.id, (SELECT sd.id FROM sous_domaine sd WHERE sd.domaine_id = d.id AND sd.code = 'D4-S2'), d.referentiel_version_id, 'D4-56', 'Avoir des objectifs quantitatifs et/ou qualitatifs de réduction de la consommation d’eau de l’entreprise', NULL, 'GENERALE'::type_applicabilite, (SELECT cr.id FROM criticite cr WHERE cr.code = 'MOYENNE'::niveau_criticite), true, 2.0
  FROM domaine d WHERE d.referentiel_version_id = (SELECT s.nouvelle FROM _semis s JOIN referentiel r ON r.id = s.referentiel_id WHERE r.code = 'SMARTEX_SUSTWAY') AND d.code = 'D4';
INSERT INTO question (critere_id, referentiel_version_id, code, libelle, type, ordre, obligatoire, echelle_reponse)
SELECT c.id, c.referentiel_version_id, 'D4-56-Q1', 'Avoir des objectifs quantitatifs et/ou qualitatifs de réduction de la consommation d’eau de l’entreprise', 'FERMEE'::type_question, 1, true, 'MATURITE'
  FROM critere c WHERE c.referentiel_version_id = (SELECT s.nouvelle FROM _semis s JOIN referentiel r ON r.id = s.referentiel_id WHERE r.code = 'SMARTEX_SUSTWAY') AND c.code = 'D4-56';
INSERT INTO exigence (critere_id, referentiel_version_id, code, intitule, enonce, ordre, origine)
SELECT c.id, c.referentiel_version_id, c.code || '-E1', left(c.libelle, 300), c.libelle, 0, 'CONTENU_INITIAL'
  FROM critere c WHERE c.referentiel_version_id = (SELECT s.nouvelle FROM _semis s JOIN referentiel r ON r.id = s.referentiel_id WHERE r.code = 'SMARTEX_SUSTWAY') AND c.code = 'D4-56';

INSERT INTO critere (domaine_id, sous_domaine_id, referentiel_version_id, code, libelle, description, applicabilite, criticite_id, actif, coefficient_ponderation)
SELECT d.id, (SELECT sd.id FROM sous_domaine sd WHERE sd.domaine_id = d.id AND sd.code = 'D4-S2'), d.referentiel_version_id, 'D4-57', 'Disposer d’un système de management de la consommation d’eau (certifiable ou pas)', NULL, 'GENERALE'::type_applicabilite, (SELECT cr.id FROM criticite cr WHERE cr.code = 'MOYENNE'::niveau_criticite), true, 3.0
  FROM domaine d WHERE d.referentiel_version_id = (SELECT s.nouvelle FROM _semis s JOIN referentiel r ON r.id = s.referentiel_id WHERE r.code = 'SMARTEX_SUSTWAY') AND d.code = 'D4';
INSERT INTO question (critere_id, referentiel_version_id, code, libelle, type, ordre, obligatoire, echelle_reponse)
SELECT c.id, c.referentiel_version_id, 'D4-57-Q1', 'Disposer d’un système de management de la consommation d’eau (certifiable ou pas)', 'FERMEE'::type_question, 1, true, 'MATURITE'
  FROM critere c WHERE c.referentiel_version_id = (SELECT s.nouvelle FROM _semis s JOIN referentiel r ON r.id = s.referentiel_id WHERE r.code = 'SMARTEX_SUSTWAY') AND c.code = 'D4-57';
INSERT INTO exigence (critere_id, referentiel_version_id, code, intitule, enonce, ordre, origine)
SELECT c.id, c.referentiel_version_id, c.code || '-E1', left(c.libelle, 300), c.libelle, 0, 'CONTENU_INITIAL'
  FROM critere c WHERE c.referentiel_version_id = (SELECT s.nouvelle FROM _semis s JOIN referentiel r ON r.id = s.referentiel_id WHERE r.code = 'SMARTEX_SUSTWAY') AND c.code = 'D4-57';

INSERT INTO critere (domaine_id, sous_domaine_id, referentiel_version_id, code, libelle, description, applicabilite, criticite_id, actif, coefficient_ponderation)
SELECT d.id, (SELECT sd.id FROM sous_domaine sd WHERE sd.domaine_id = d.id AND sd.code = 'D4-S3'), d.referentiel_version_id, 'D4-58', 'Disposer d’un système de suivi et de contrôle de votre consommation d’énergie', NULL, 'GENERALE'::type_applicabilite, (SELECT cr.id FROM criticite cr WHERE cr.code = 'MOYENNE'::niveau_criticite), true, 3.0
  FROM domaine d WHERE d.referentiel_version_id = (SELECT s.nouvelle FROM _semis s JOIN referentiel r ON r.id = s.referentiel_id WHERE r.code = 'SMARTEX_SUSTWAY') AND d.code = 'D4';
INSERT INTO question (critere_id, referentiel_version_id, code, libelle, type, ordre, obligatoire, echelle_reponse)
SELECT c.id, c.referentiel_version_id, 'D4-58-Q1', 'Disposer d’un système de suivi et de contrôle de votre consommation d’énergie', 'FERMEE'::type_question, 1, true, 'MATURITE'
  FROM critere c WHERE c.referentiel_version_id = (SELECT s.nouvelle FROM _semis s JOIN referentiel r ON r.id = s.referentiel_id WHERE r.code = 'SMARTEX_SUSTWAY') AND c.code = 'D4-58';
INSERT INTO exigence (critere_id, referentiel_version_id, code, intitule, enonce, ordre, origine)
SELECT c.id, c.referentiel_version_id, c.code || '-E1', left(c.libelle, 300), c.libelle, 0, 'CONTENU_INITIAL'
  FROM critere c WHERE c.referentiel_version_id = (SELECT s.nouvelle FROM _semis s JOIN referentiel r ON r.id = s.referentiel_id WHERE r.code = 'SMARTEX_SUSTWAY') AND c.code = 'D4-58';

INSERT INTO critere (domaine_id, sous_domaine_id, referentiel_version_id, code, libelle, description, applicabilite, criticite_id, actif, coefficient_ponderation)
SELECT d.id, (SELECT sd.id FROM sous_domaine sd WHERE sd.domaine_id = d.id AND sd.code = 'D4-S3'), d.referentiel_version_id, 'D4-59', 'Avoir des objectifs quantitatifs et/ou qualitatifs de réduction de votre consommation d’énergie', NULL, 'GENERALE'::type_applicabilite, (SELECT cr.id FROM criticite cr WHERE cr.code = 'MOYENNE'::niveau_criticite), true, 2.0
  FROM domaine d WHERE d.referentiel_version_id = (SELECT s.nouvelle FROM _semis s JOIN referentiel r ON r.id = s.referentiel_id WHERE r.code = 'SMARTEX_SUSTWAY') AND d.code = 'D4';
INSERT INTO question (critere_id, referentiel_version_id, code, libelle, type, ordre, obligatoire, echelle_reponse)
SELECT c.id, c.referentiel_version_id, 'D4-59-Q1', 'Avoir des objectifs quantitatifs et/ou qualitatifs de réduction de votre consommation d’énergie', 'FERMEE'::type_question, 1, true, 'MATURITE'
  FROM critere c WHERE c.referentiel_version_id = (SELECT s.nouvelle FROM _semis s JOIN referentiel r ON r.id = s.referentiel_id WHERE r.code = 'SMARTEX_SUSTWAY') AND c.code = 'D4-59';
INSERT INTO exigence (critere_id, referentiel_version_id, code, intitule, enonce, ordre, origine)
SELECT c.id, c.referentiel_version_id, c.code || '-E1', left(c.libelle, 300), c.libelle, 0, 'CONTENU_INITIAL'
  FROM critere c WHERE c.referentiel_version_id = (SELECT s.nouvelle FROM _semis s JOIN referentiel r ON r.id = s.referentiel_id WHERE r.code = 'SMARTEX_SUSTWAY') AND c.code = 'D4-59';

INSERT INTO critere (domaine_id, sous_domaine_id, referentiel_version_id, code, libelle, description, applicabilite, criticite_id, actif, coefficient_ponderation)
SELECT d.id, (SELECT sd.id FROM sous_domaine sd WHERE sd.domaine_id = d.id AND sd.code = 'D4-S3'), d.referentiel_version_id, 'D4-60', 'Disposer d’un système de management de la consommation d’énergie certifiable ou pas, notamment, avec la norme ISO 51001 v 2011', NULL, 'GENERALE'::type_applicabilite, (SELECT cr.id FROM criticite cr WHERE cr.code = 'MOYENNE'::niveau_criticite), true, 3.0
  FROM domaine d WHERE d.referentiel_version_id = (SELECT s.nouvelle FROM _semis s JOIN referentiel r ON r.id = s.referentiel_id WHERE r.code = 'SMARTEX_SUSTWAY') AND d.code = 'D4';
INSERT INTO question (critere_id, referentiel_version_id, code, libelle, type, ordre, obligatoire, echelle_reponse)
SELECT c.id, c.referentiel_version_id, 'D4-60-Q1', 'Disposer d’un système de management de la consommation d’énergie certifiable ou pas, notamment, avec la norme ISO 51001 v 2011', 'FERMEE'::type_question, 1, true, 'MATURITE'
  FROM critere c WHERE c.referentiel_version_id = (SELECT s.nouvelle FROM _semis s JOIN referentiel r ON r.id = s.referentiel_id WHERE r.code = 'SMARTEX_SUSTWAY') AND c.code = 'D4-60';
INSERT INTO exigence (critere_id, referentiel_version_id, code, intitule, enonce, ordre, origine)
SELECT c.id, c.referentiel_version_id, c.code || '-E1', left(c.libelle, 300), c.libelle, 0, 'CONTENU_INITIAL'
  FROM critere c WHERE c.referentiel_version_id = (SELECT s.nouvelle FROM _semis s JOIN referentiel r ON r.id = s.referentiel_id WHERE r.code = 'SMARTEX_SUSTWAY') AND c.code = 'D4-60';

INSERT INTO critere (domaine_id, sous_domaine_id, referentiel_version_id, code, libelle, description, applicabilite, criticite_id, actif, coefficient_ponderation)
SELECT d.id, (SELECT sd.id FROM sous_domaine sd WHERE sd.domaine_id = d.id AND sd.code = 'D4-S3'), d.referentiel_version_id, 'D4-61', 'Recourir à des sources d’énergie alternatives notamment les énergies renouvelables / le solaire.', NULL, 'GENERALE'::type_applicabilite, (SELECT cr.id FROM criticite cr WHERE cr.code = 'MOYENNE'::niveau_criticite), true, 1.0
  FROM domaine d WHERE d.referentiel_version_id = (SELECT s.nouvelle FROM _semis s JOIN referentiel r ON r.id = s.referentiel_id WHERE r.code = 'SMARTEX_SUSTWAY') AND d.code = 'D4';
INSERT INTO question (critere_id, referentiel_version_id, code, libelle, type, ordre, obligatoire, echelle_reponse)
SELECT c.id, c.referentiel_version_id, 'D4-61-Q1', 'Recourir à des sources d’énergie alternatives notamment les énergies renouvelables / le solaire.', 'FERMEE'::type_question, 1, true, 'MATURITE'
  FROM critere c WHERE c.referentiel_version_id = (SELECT s.nouvelle FROM _semis s JOIN referentiel r ON r.id = s.referentiel_id WHERE r.code = 'SMARTEX_SUSTWAY') AND c.code = 'D4-61';
INSERT INTO exigence (critere_id, referentiel_version_id, code, intitule, enonce, ordre, origine)
SELECT c.id, c.referentiel_version_id, c.code || '-E1', left(c.libelle, 300), c.libelle, 0, 'CONTENU_INITIAL'
  FROM critere c WHERE c.referentiel_version_id = (SELECT s.nouvelle FROM _semis s JOIN referentiel r ON r.id = s.referentiel_id WHERE r.code = 'SMARTEX_SUSTWAY') AND c.code = 'D4-61';

INSERT INTO critere (domaine_id, sous_domaine_id, referentiel_version_id, code, libelle, description, applicabilite, criticite_id, actif, coefficient_ponderation)
SELECT d.id, (SELECT sd.id FROM sous_domaine sd WHERE sd.domaine_id = d.id AND sd.code = 'D4-S4'), d.referentiel_version_id, 'D4-62', 'Disposer d’un système de suivi et de contrôle des rejets atmosphériques de l’entreprise', NULL, 'GENERALE'::type_applicabilite, (SELECT cr.id FROM criticite cr WHERE cr.code = 'MOYENNE'::niveau_criticite), true, 3.0
  FROM domaine d WHERE d.referentiel_version_id = (SELECT s.nouvelle FROM _semis s JOIN referentiel r ON r.id = s.referentiel_id WHERE r.code = 'SMARTEX_SUSTWAY') AND d.code = 'D4';
INSERT INTO question (critere_id, referentiel_version_id, code, libelle, type, ordre, obligatoire, echelle_reponse)
SELECT c.id, c.referentiel_version_id, 'D4-62-Q1', 'Disposer d’un système de suivi et de contrôle des rejets atmosphériques de l’entreprise', 'FERMEE'::type_question, 1, true, 'MATURITE'
  FROM critere c WHERE c.referentiel_version_id = (SELECT s.nouvelle FROM _semis s JOIN referentiel r ON r.id = s.referentiel_id WHERE r.code = 'SMARTEX_SUSTWAY') AND c.code = 'D4-62';
INSERT INTO exigence (critere_id, referentiel_version_id, code, intitule, enonce, ordre, origine)
SELECT c.id, c.referentiel_version_id, c.code || '-E1', left(c.libelle, 300), c.libelle, 0, 'CONTENU_INITIAL'
  FROM critere c WHERE c.referentiel_version_id = (SELECT s.nouvelle FROM _semis s JOIN referentiel r ON r.id = s.referentiel_id WHERE r.code = 'SMARTEX_SUSTWAY') AND c.code = 'D4-62';

INSERT INTO critere (domaine_id, sous_domaine_id, referentiel_version_id, code, libelle, description, applicabilite, criticite_id, actif, coefficient_ponderation)
SELECT d.id, (SELECT sd.id FROM sous_domaine sd WHERE sd.domaine_id = d.id AND sd.code = 'D4-S4'), d.referentiel_version_id, 'D4-63', 'Avoir des objectifs quantitatifs et/ou qualitatifs de réduction des rejets atmosphériques de l’entreprise', NULL, 'GENERALE'::type_applicabilite, (SELECT cr.id FROM criticite cr WHERE cr.code = 'MOYENNE'::niveau_criticite), true, 2.0
  FROM domaine d WHERE d.referentiel_version_id = (SELECT s.nouvelle FROM _semis s JOIN referentiel r ON r.id = s.referentiel_id WHERE r.code = 'SMARTEX_SUSTWAY') AND d.code = 'D4';
INSERT INTO question (critere_id, referentiel_version_id, code, libelle, type, ordre, obligatoire, echelle_reponse)
SELECT c.id, c.referentiel_version_id, 'D4-63-Q1', 'Avoir des objectifs quantitatifs et/ou qualitatifs de réduction des rejets atmosphériques de l’entreprise', 'FERMEE'::type_question, 1, true, 'MATURITE'
  FROM critere c WHERE c.referentiel_version_id = (SELECT s.nouvelle FROM _semis s JOIN referentiel r ON r.id = s.referentiel_id WHERE r.code = 'SMARTEX_SUSTWAY') AND c.code = 'D4-63';
INSERT INTO exigence (critere_id, referentiel_version_id, code, intitule, enonce, ordre, origine)
SELECT c.id, c.referentiel_version_id, c.code || '-E1', left(c.libelle, 300), c.libelle, 0, 'CONTENU_INITIAL'
  FROM critere c WHERE c.referentiel_version_id = (SELECT s.nouvelle FROM _semis s JOIN referentiel r ON r.id = s.referentiel_id WHERE r.code = 'SMARTEX_SUSTWAY') AND c.code = 'D4-63';

INSERT INTO critere (domaine_id, sous_domaine_id, referentiel_version_id, code, libelle, description, applicabilite, criticite_id, actif, coefficient_ponderation)
SELECT d.id, (SELECT sd.id FROM sous_domaine sd WHERE sd.domaine_id = d.id AND sd.code = 'D4-S4'), d.referentiel_version_id, 'D4-64', 'Disposer d’un système de management de des rejets atmosphériques de l’entreprise, (certifiable ou pas)', NULL, 'GENERALE'::type_applicabilite, (SELECT cr.id FROM criticite cr WHERE cr.code = 'MOYENNE'::niveau_criticite), true, 2.0
  FROM domaine d WHERE d.referentiel_version_id = (SELECT s.nouvelle FROM _semis s JOIN referentiel r ON r.id = s.referentiel_id WHERE r.code = 'SMARTEX_SUSTWAY') AND d.code = 'D4';
INSERT INTO question (critere_id, referentiel_version_id, code, libelle, type, ordre, obligatoire, echelle_reponse)
SELECT c.id, c.referentiel_version_id, 'D4-64-Q1', 'Disposer d’un système de management de des rejets atmosphériques de l’entreprise, (certifiable ou pas)', 'FERMEE'::type_question, 1, true, 'MATURITE'
  FROM critere c WHERE c.referentiel_version_id = (SELECT s.nouvelle FROM _semis s JOIN referentiel r ON r.id = s.referentiel_id WHERE r.code = 'SMARTEX_SUSTWAY') AND c.code = 'D4-64';
INSERT INTO exigence (critere_id, referentiel_version_id, code, intitule, enonce, ordre, origine)
SELECT c.id, c.referentiel_version_id, c.code || '-E1', left(c.libelle, 300), c.libelle, 0, 'CONTENU_INITIAL'
  FROM critere c WHERE c.referentiel_version_id = (SELECT s.nouvelle FROM _semis s JOIN referentiel r ON r.id = s.referentiel_id WHERE r.code = 'SMARTEX_SUSTWAY') AND c.code = 'D4-64';

INSERT INTO critere (domaine_id, sous_domaine_id, referentiel_version_id, code, libelle, description, applicabilite, criticite_id, actif, coefficient_ponderation)
SELECT d.id, (SELECT sd.id FROM sous_domaine sd WHERE sd.domaine_id = d.id AND sd.code = 'D4-S5'), d.referentiel_version_id, 'D4-65', 'Disposer d’un système de suivi et de contrôle des rejets liquides de l’entreprise', NULL, 'GENERALE'::type_applicabilite, (SELECT cr.id FROM criticite cr WHERE cr.code = 'MOYENNE'::niveau_criticite), true, 2.0
  FROM domaine d WHERE d.referentiel_version_id = (SELECT s.nouvelle FROM _semis s JOIN referentiel r ON r.id = s.referentiel_id WHERE r.code = 'SMARTEX_SUSTWAY') AND d.code = 'D4';
INSERT INTO question (critere_id, referentiel_version_id, code, libelle, type, ordre, obligatoire, echelle_reponse)
SELECT c.id, c.referentiel_version_id, 'D4-65-Q1', 'Disposer d’un système de suivi et de contrôle des rejets liquides de l’entreprise', 'FERMEE'::type_question, 1, true, 'MATURITE'
  FROM critere c WHERE c.referentiel_version_id = (SELECT s.nouvelle FROM _semis s JOIN referentiel r ON r.id = s.referentiel_id WHERE r.code = 'SMARTEX_SUSTWAY') AND c.code = 'D4-65';
INSERT INTO exigence (critere_id, referentiel_version_id, code, intitule, enonce, ordre, origine)
SELECT c.id, c.referentiel_version_id, c.code || '-E1', left(c.libelle, 300), c.libelle, 0, 'CONTENU_INITIAL'
  FROM critere c WHERE c.referentiel_version_id = (SELECT s.nouvelle FROM _semis s JOIN referentiel r ON r.id = s.referentiel_id WHERE r.code = 'SMARTEX_SUSTWAY') AND c.code = 'D4-65';

INSERT INTO critere (domaine_id, sous_domaine_id, referentiel_version_id, code, libelle, description, applicabilite, criticite_id, actif, coefficient_ponderation)
SELECT d.id, (SELECT sd.id FROM sous_domaine sd WHERE sd.domaine_id = d.id AND sd.code = 'D4-S5'), d.referentiel_version_id, 'D4-66', 'Avoir des objectifs quantitatifs et/ou qualitatifs de réduction de vos rejets liquides', NULL, 'GENERALE'::type_applicabilite, (SELECT cr.id FROM criticite cr WHERE cr.code = 'MOYENNE'::niveau_criticite), true, 3.0
  FROM domaine d WHERE d.referentiel_version_id = (SELECT s.nouvelle FROM _semis s JOIN referentiel r ON r.id = s.referentiel_id WHERE r.code = 'SMARTEX_SUSTWAY') AND d.code = 'D4';
INSERT INTO question (critere_id, referentiel_version_id, code, libelle, type, ordre, obligatoire, echelle_reponse)
SELECT c.id, c.referentiel_version_id, 'D4-66-Q1', 'Avoir des objectifs quantitatifs et/ou qualitatifs de réduction de vos rejets liquides', 'FERMEE'::type_question, 1, true, 'MATURITE'
  FROM critere c WHERE c.referentiel_version_id = (SELECT s.nouvelle FROM _semis s JOIN referentiel r ON r.id = s.referentiel_id WHERE r.code = 'SMARTEX_SUSTWAY') AND c.code = 'D4-66';
INSERT INTO exigence (critere_id, referentiel_version_id, code, intitule, enonce, ordre, origine)
SELECT c.id, c.referentiel_version_id, c.code || '-E1', left(c.libelle, 300), c.libelle, 0, 'CONTENU_INITIAL'
  FROM critere c WHERE c.referentiel_version_id = (SELECT s.nouvelle FROM _semis s JOIN referentiel r ON r.id = s.referentiel_id WHERE r.code = 'SMARTEX_SUSTWAY') AND c.code = 'D4-66';

INSERT INTO critere (domaine_id, sous_domaine_id, referentiel_version_id, code, libelle, description, applicabilite, criticite_id, actif, coefficient_ponderation)
SELECT d.id, (SELECT sd.id FROM sous_domaine sd WHERE sd.domaine_id = d.id AND sd.code = 'D4-S5'), d.referentiel_version_id, 'D4-67', 'Disposer d''un système de management des rejets liquides de l’entreprise, (certifiable ou pas)', NULL, 'GENERALE'::type_applicabilite, (SELECT cr.id FROM criticite cr WHERE cr.code = 'MOYENNE'::niveau_criticite), true, 1.0
  FROM domaine d WHERE d.referentiel_version_id = (SELECT s.nouvelle FROM _semis s JOIN referentiel r ON r.id = s.referentiel_id WHERE r.code = 'SMARTEX_SUSTWAY') AND d.code = 'D4';
INSERT INTO question (critere_id, referentiel_version_id, code, libelle, type, ordre, obligatoire, echelle_reponse)
SELECT c.id, c.referentiel_version_id, 'D4-67-Q1', 'Disposer d''un système de management des rejets liquides de l’entreprise, (certifiable ou pas)', 'FERMEE'::type_question, 1, true, 'MATURITE'
  FROM critere c WHERE c.referentiel_version_id = (SELECT s.nouvelle FROM _semis s JOIN referentiel r ON r.id = s.referentiel_id WHERE r.code = 'SMARTEX_SUSTWAY') AND c.code = 'D4-67';
INSERT INTO exigence (critere_id, referentiel_version_id, code, intitule, enonce, ordre, origine)
SELECT c.id, c.referentiel_version_id, c.code || '-E1', left(c.libelle, 300), c.libelle, 0, 'CONTENU_INITIAL'
  FROM critere c WHERE c.referentiel_version_id = (SELECT s.nouvelle FROM _semis s JOIN referentiel r ON r.id = s.referentiel_id WHERE r.code = 'SMARTEX_SUSTWAY') AND c.code = 'D4-67';

INSERT INTO critere (domaine_id, sous_domaine_id, referentiel_version_id, code, libelle, description, applicabilite, criticite_id, actif, coefficient_ponderation)
SELECT d.id, (SELECT sd.id FROM sous_domaine sd WHERE sd.domaine_id = d.id AND sd.code = 'D4-S6'), d.referentiel_version_id, 'D4-68', 'Disposer d’un système de suivi et de contrôle de vos déchets solides divers', NULL, 'GENERALE'::type_applicabilite, (SELECT cr.id FROM criticite cr WHERE cr.code = 'MOYENNE'::niveau_criticite), true, 3.0
  FROM domaine d WHERE d.referentiel_version_id = (SELECT s.nouvelle FROM _semis s JOIN referentiel r ON r.id = s.referentiel_id WHERE r.code = 'SMARTEX_SUSTWAY') AND d.code = 'D4';
INSERT INTO question (critere_id, referentiel_version_id, code, libelle, type, ordre, obligatoire, echelle_reponse)
SELECT c.id, c.referentiel_version_id, 'D4-68-Q1', 'Disposer d’un système de suivi et de contrôle de vos déchets solides divers', 'FERMEE'::type_question, 1, true, 'MATURITE'
  FROM critere c WHERE c.referentiel_version_id = (SELECT s.nouvelle FROM _semis s JOIN referentiel r ON r.id = s.referentiel_id WHERE r.code = 'SMARTEX_SUSTWAY') AND c.code = 'D4-68';
INSERT INTO exigence (critere_id, referentiel_version_id, code, intitule, enonce, ordre, origine)
SELECT c.id, c.referentiel_version_id, c.code || '-E1', left(c.libelle, 300), c.libelle, 0, 'CONTENU_INITIAL'
  FROM critere c WHERE c.referentiel_version_id = (SELECT s.nouvelle FROM _semis s JOIN referentiel r ON r.id = s.referentiel_id WHERE r.code = 'SMARTEX_SUSTWAY') AND c.code = 'D4-68';

INSERT INTO critere (domaine_id, sous_domaine_id, referentiel_version_id, code, libelle, description, applicabilite, criticite_id, actif, coefficient_ponderation)
SELECT d.id, (SELECT sd.id FROM sous_domaine sd WHERE sd.domaine_id = d.id AND sd.code = 'D4-S6'), d.referentiel_version_id, 'D4-69', 'Avoir des objectifs quantitatifs et/ou qualitatifs de réduction de vos déchets solides divers', NULL, 'GENERALE'::type_applicabilite, (SELECT cr.id FROM criticite cr WHERE cr.code = 'MOYENNE'::niveau_criticite), true, 2.0
  FROM domaine d WHERE d.referentiel_version_id = (SELECT s.nouvelle FROM _semis s JOIN referentiel r ON r.id = s.referentiel_id WHERE r.code = 'SMARTEX_SUSTWAY') AND d.code = 'D4';
INSERT INTO question (critere_id, referentiel_version_id, code, libelle, type, ordre, obligatoire, echelle_reponse)
SELECT c.id, c.referentiel_version_id, 'D4-69-Q1', 'Avoir des objectifs quantitatifs et/ou qualitatifs de réduction de vos déchets solides divers', 'FERMEE'::type_question, 1, true, 'MATURITE'
  FROM critere c WHERE c.referentiel_version_id = (SELECT s.nouvelle FROM _semis s JOIN referentiel r ON r.id = s.referentiel_id WHERE r.code = 'SMARTEX_SUSTWAY') AND c.code = 'D4-69';
INSERT INTO exigence (critere_id, referentiel_version_id, code, intitule, enonce, ordre, origine)
SELECT c.id, c.referentiel_version_id, c.code || '-E1', left(c.libelle, 300), c.libelle, 0, 'CONTENU_INITIAL'
  FROM critere c WHERE c.referentiel_version_id = (SELECT s.nouvelle FROM _semis s JOIN referentiel r ON r.id = s.referentiel_id WHERE r.code = 'SMARTEX_SUSTWAY') AND c.code = 'D4-69';

INSERT INTO critere (domaine_id, sous_domaine_id, referentiel_version_id, code, libelle, description, applicabilite, criticite_id, actif, coefficient_ponderation)
SELECT d.id, (SELECT sd.id FROM sous_domaine sd WHERE sd.domaine_id = d.id AND sd.code = 'D4-S6'), d.referentiel_version_id, 'D4-70', 'Disposer d’un système de management de vos déchets solides divers, (certifiable ou pas)', NULL, 'GENERALE'::type_applicabilite, (SELECT cr.id FROM criticite cr WHERE cr.code = 'MOYENNE'::niveau_criticite), true, 3.0
  FROM domaine d WHERE d.referentiel_version_id = (SELECT s.nouvelle FROM _semis s JOIN referentiel r ON r.id = s.referentiel_id WHERE r.code = 'SMARTEX_SUSTWAY') AND d.code = 'D4';
INSERT INTO question (critere_id, referentiel_version_id, code, libelle, type, ordre, obligatoire, echelle_reponse)
SELECT c.id, c.referentiel_version_id, 'D4-70-Q1', 'Disposer d’un système de management de vos déchets solides divers, (certifiable ou pas)', 'FERMEE'::type_question, 1, true, 'MATURITE'
  FROM critere c WHERE c.referentiel_version_id = (SELECT s.nouvelle FROM _semis s JOIN referentiel r ON r.id = s.referentiel_id WHERE r.code = 'SMARTEX_SUSTWAY') AND c.code = 'D4-70';
INSERT INTO exigence (critere_id, referentiel_version_id, code, intitule, enonce, ordre, origine)
SELECT c.id, c.referentiel_version_id, c.code || '-E1', left(c.libelle, 300), c.libelle, 0, 'CONTENU_INITIAL'
  FROM critere c WHERE c.referentiel_version_id = (SELECT s.nouvelle FROM _semis s JOIN referentiel r ON r.id = s.referentiel_id WHERE r.code = 'SMARTEX_SUSTWAY') AND c.code = 'D4-70';

INSERT INTO domaine (referentiel_id, referentiel_version_id, code, nom, description, ordre)
VALUES ((SELECT id FROM referentiel WHERE code = 'SMARTEX_SUSTWAY'), (SELECT s.nouvelle FROM _semis s JOIN referentiel r ON r.id = s.referentiel_id WHERE r.code = 'SMARTEX_SUSTWAY'), 'D5', 'Bonnes pratiques relatives à la dimension « Economie', 'Dimension Bonnes pratiques relatives à la dimension « Economie » intégrant les parties prenantes / comportement de l’entreprise sur le marché', 5);
INSERT INTO sous_domaine (domaine_id, referentiel_version_id, code, nom, description, ordre)
SELECT d.id, d.referentiel_version_id, 'D5-S1', 'A) Les relations avec les clients/consommateurs', 'A) Les relations avec les clients/consommateurs.', 1
  FROM domaine d WHERE d.referentiel_version_id = (SELECT s.nouvelle FROM _semis s JOIN referentiel r ON r.id = s.referentiel_id WHERE r.code = 'SMARTEX_SUSTWAY') AND d.code = 'D5';
INSERT INTO sous_domaine (domaine_id, referentiel_version_id, code, nom, description, ordre)
SELECT d.id, d.referentiel_version_id, 'D5-S2', 'B) La concurrence', 'B) La concurrence.', 2
  FROM domaine d WHERE d.referentiel_version_id = (SELECT s.nouvelle FROM _semis s JOIN referentiel r ON r.id = s.referentiel_id WHERE r.code = 'SMARTEX_SUSTWAY') AND d.code = 'D5';
INSERT INTO sous_domaine (domaine_id, referentiel_version_id, code, nom, description, ordre)
SELECT d.id, d.referentiel_version_id, 'D5-S3', 'C) Les relations avec les fournisseurs et sous-traitants', 'C) Les relations avec les fournisseurs et sous-traitants.', 3
  FROM domaine d WHERE d.referentiel_version_id = (SELECT s.nouvelle FROM _semis s JOIN referentiel r ON r.id = s.referentiel_id WHERE r.code = 'SMARTEX_SUSTWAY') AND d.code = 'D5';
INSERT INTO critere (domaine_id, sous_domaine_id, referentiel_version_id, code, libelle, description, applicabilite, criticite_id, actif, coefficient_ponderation)
SELECT d.id, (SELECT sd.id FROM sous_domaine sd WHERE sd.domaine_id = d.id AND sd.code = 'D5-S1'), d.referentiel_version_id, 'D5-71', 'Prendre des dispositions afin de garantir la protection des données et la vie privée des clients / consommateurs', NULL, 'GENERALE'::type_applicabilite, (SELECT cr.id FROM criticite cr WHERE cr.code = 'MOYENNE'::niveau_criticite), true, 1.0
  FROM domaine d WHERE d.referentiel_version_id = (SELECT s.nouvelle FROM _semis s JOIN referentiel r ON r.id = s.referentiel_id WHERE r.code = 'SMARTEX_SUSTWAY') AND d.code = 'D5';
INSERT INTO question (critere_id, referentiel_version_id, code, libelle, type, ordre, obligatoire, echelle_reponse)
SELECT c.id, c.referentiel_version_id, 'D5-71-Q1', 'Prendre des dispositions afin de garantir la protection des données et la vie privée des clients / consommateurs', 'FERMEE'::type_question, 1, true, 'MATURITE'
  FROM critere c WHERE c.referentiel_version_id = (SELECT s.nouvelle FROM _semis s JOIN referentiel r ON r.id = s.referentiel_id WHERE r.code = 'SMARTEX_SUSTWAY') AND c.code = 'D5-71';
INSERT INTO exigence (critere_id, referentiel_version_id, code, intitule, enonce, ordre, origine)
SELECT c.id, c.referentiel_version_id, c.code || '-E1', left(c.libelle, 300), c.libelle, 0, 'CONTENU_INITIAL'
  FROM critere c WHERE c.referentiel_version_id = (SELECT s.nouvelle FROM _semis s JOIN referentiel r ON r.id = s.referentiel_id WHERE r.code = 'SMARTEX_SUSTWAY') AND c.code = 'D5-71';

INSERT INTO critere (domaine_id, sous_domaine_id, referentiel_version_id, code, libelle, description, applicabilite, criticite_id, actif, coefficient_ponderation)
SELECT d.id, (SELECT sd.id FROM sous_domaine sd WHERE sd.domaine_id = d.id AND sd.code = 'D5-S1'), d.referentiel_version_id, 'D5-72', 'Fournir toutes les informations nécessaires sur les produits et services afin de permettre aux clients / consommateurs d’opérer des choix en toute connaissance de cause', NULL, 'GENERALE'::type_applicabilite, (SELECT cr.id FROM criticite cr WHERE cr.code = 'MOYENNE'::niveau_criticite), true, 3.0
  FROM domaine d WHERE d.referentiel_version_id = (SELECT s.nouvelle FROM _semis s JOIN referentiel r ON r.id = s.referentiel_id WHERE r.code = 'SMARTEX_SUSTWAY') AND d.code = 'D5';
INSERT INTO question (critere_id, referentiel_version_id, code, libelle, type, ordre, obligatoire, echelle_reponse)
SELECT c.id, c.referentiel_version_id, 'D5-72-Q1', 'Fournir toutes les informations nécessaires sur les produits et services afin de permettre aux clients / consommateurs d’opérer des choix en toute connaissance de cause', 'FERMEE'::type_question, 1, true, 'MATURITE'
  FROM critere c WHERE c.referentiel_version_id = (SELECT s.nouvelle FROM _semis s JOIN referentiel r ON r.id = s.referentiel_id WHERE r.code = 'SMARTEX_SUSTWAY') AND c.code = 'D5-72';
INSERT INTO exigence (critere_id, referentiel_version_id, code, intitule, enonce, ordre, origine)
SELECT c.id, c.referentiel_version_id, c.code || '-E1', left(c.libelle, 300), c.libelle, 0, 'CONTENU_INITIAL'
  FROM critere c WHERE c.referentiel_version_id = (SELECT s.nouvelle FROM _semis s JOIN referentiel r ON r.id = s.referentiel_id WHERE r.code = 'SMARTEX_SUSTWAY') AND c.code = 'D5-72';

INSERT INTO critere (domaine_id, sous_domaine_id, referentiel_version_id, code, libelle, description, applicabilite, criticite_id, actif, coefficient_ponderation)
SELECT d.id, (SELECT sd.id FROM sous_domaine sd WHERE sd.domaine_id = d.id AND sd.code = 'D5-S1'), d.referentiel_version_id, 'D5-73', 'Prendre des mesures qui garantissent la sécurité et la santé des clients/ consommateurs dans l’utilisation des biens ou services de l’entreprise', NULL, 'GENERALE'::type_applicabilite, (SELECT cr.id FROM criticite cr WHERE cr.code = 'MOYENNE'::niveau_criticite), true, 1.0
  FROM domaine d WHERE d.referentiel_version_id = (SELECT s.nouvelle FROM _semis s JOIN referentiel r ON r.id = s.referentiel_id WHERE r.code = 'SMARTEX_SUSTWAY') AND d.code = 'D5';
INSERT INTO question (critere_id, referentiel_version_id, code, libelle, type, ordre, obligatoire, echelle_reponse)
SELECT c.id, c.referentiel_version_id, 'D5-73-Q1', 'Prendre des mesures qui garantissent la sécurité et la santé des clients/ consommateurs dans l’utilisation des biens ou services de l’entreprise', 'FERMEE'::type_question, 1, true, 'MATURITE'
  FROM critere c WHERE c.referentiel_version_id = (SELECT s.nouvelle FROM _semis s JOIN referentiel r ON r.id = s.referentiel_id WHERE r.code = 'SMARTEX_SUSTWAY') AND c.code = 'D5-73';
INSERT INTO exigence (critere_id, referentiel_version_id, code, intitule, enonce, ordre, origine)
SELECT c.id, c.referentiel_version_id, c.code || '-E1', left(c.libelle, 300), c.libelle, 0, 'CONTENU_INITIAL'
  FROM critere c WHERE c.referentiel_version_id = (SELECT s.nouvelle FROM _semis s JOIN referentiel r ON r.id = s.referentiel_id WHERE r.code = 'SMARTEX_SUSTWAY') AND c.code = 'D5-73';

INSERT INTO critere (domaine_id, sous_domaine_id, referentiel_version_id, code, libelle, description, applicabilite, criticite_id, actif, coefficient_ponderation)
SELECT d.id, (SELECT sd.id FROM sous_domaine sd WHERE sd.domaine_id = d.id AND sd.code = 'D5-S1'), d.referentiel_version_id, 'D5-74', 'Faire de la qualité des biens ou services fournis aux clients / consommateurs un des objectifs centraux de l’entreprise', NULL, 'GENERALE'::type_applicabilite, (SELECT cr.id FROM criticite cr WHERE cr.code = 'MOYENNE'::niveau_criticite), true, 3.0
  FROM domaine d WHERE d.referentiel_version_id = (SELECT s.nouvelle FROM _semis s JOIN referentiel r ON r.id = s.referentiel_id WHERE r.code = 'SMARTEX_SUSTWAY') AND d.code = 'D5';
INSERT INTO question (critere_id, referentiel_version_id, code, libelle, type, ordre, obligatoire, echelle_reponse)
SELECT c.id, c.referentiel_version_id, 'D5-74-Q1', 'Faire de la qualité des biens ou services fournis aux clients / consommateurs un des objectifs centraux de l’entreprise', 'FERMEE'::type_question, 1, true, 'MATURITE'
  FROM critere c WHERE c.referentiel_version_id = (SELECT s.nouvelle FROM _semis s JOIN referentiel r ON r.id = s.referentiel_id WHERE r.code = 'SMARTEX_SUSTWAY') AND c.code = 'D5-74';
INSERT INTO exigence (critere_id, referentiel_version_id, code, intitule, enonce, ordre, origine)
SELECT c.id, c.referentiel_version_id, c.code || '-E1', left(c.libelle, 300), c.libelle, 0, 'CONTENU_INITIAL'
  FROM critere c WHERE c.referentiel_version_id = (SELECT s.nouvelle FROM _semis s JOIN referentiel r ON r.id = s.referentiel_id WHERE r.code = 'SMARTEX_SUSTWAY') AND c.code = 'D5-74';

INSERT INTO critere (domaine_id, sous_domaine_id, referentiel_version_id, code, libelle, description, applicabilite, criticite_id, actif, coefficient_ponderation)
SELECT d.id, (SELECT sd.id FROM sous_domaine sd WHERE sd.domaine_id = d.id AND sd.code = 'D5-S1'), d.referentiel_version_id, 'D5-75', 'Promouvoir une consommation responsable / durable auprès des consommateurs par l’éducation et la sensibilisation', NULL, 'GENERALE'::type_applicabilite, (SELECT cr.id FROM criticite cr WHERE cr.code = 'MOYENNE'::niveau_criticite), true, 2.0
  FROM domaine d WHERE d.referentiel_version_id = (SELECT s.nouvelle FROM _semis s JOIN referentiel r ON r.id = s.referentiel_id WHERE r.code = 'SMARTEX_SUSTWAY') AND d.code = 'D5';
INSERT INTO question (critere_id, referentiel_version_id, code, libelle, type, ordre, obligatoire, echelle_reponse)
SELECT c.id, c.referentiel_version_id, 'D5-75-Q1', 'Promouvoir une consommation responsable / durable auprès des consommateurs par l’éducation et la sensibilisation', 'FERMEE'::type_question, 1, true, 'MATURITE'
  FROM critere c WHERE c.referentiel_version_id = (SELECT s.nouvelle FROM _semis s JOIN referentiel r ON r.id = s.referentiel_id WHERE r.code = 'SMARTEX_SUSTWAY') AND c.code = 'D5-75';
INSERT INTO exigence (critere_id, referentiel_version_id, code, intitule, enonce, ordre, origine)
SELECT c.id, c.referentiel_version_id, c.code || '-E1', left(c.libelle, 300), c.libelle, 0, 'CONTENU_INITIAL'
  FROM critere c WHERE c.referentiel_version_id = (SELECT s.nouvelle FROM _semis s JOIN referentiel r ON r.id = s.referentiel_id WHERE r.code = 'SMARTEX_SUSTWAY') AND c.code = 'D5-75';

INSERT INTO critere (domaine_id, sous_domaine_id, referentiel_version_id, code, libelle, description, applicabilite, criticite_id, actif, coefficient_ponderation)
SELECT d.id, (SELECT sd.id FROM sous_domaine sd WHERE sd.domaine_id = d.id AND sd.code = 'D5-S1'), d.referentiel_version_id, 'D5-76', 'Mettre en place un service après-vente afin d’assister et de résoudre les réclamations et litiges des clients / consommateurs', NULL, 'GENERALE'::type_applicabilite, (SELECT cr.id FROM criticite cr WHERE cr.code = 'MOYENNE'::niveau_criticite), true, 1.0
  FROM domaine d WHERE d.referentiel_version_id = (SELECT s.nouvelle FROM _semis s JOIN referentiel r ON r.id = s.referentiel_id WHERE r.code = 'SMARTEX_SUSTWAY') AND d.code = 'D5';
INSERT INTO question (critere_id, referentiel_version_id, code, libelle, type, ordre, obligatoire, echelle_reponse)
SELECT c.id, c.referentiel_version_id, 'D5-76-Q1', 'Mettre en place un service après-vente afin d’assister et de résoudre les réclamations et litiges des clients / consommateurs', 'FERMEE'::type_question, 1, true, 'MATURITE'
  FROM critere c WHERE c.referentiel_version_id = (SELECT s.nouvelle FROM _semis s JOIN referentiel r ON r.id = s.referentiel_id WHERE r.code = 'SMARTEX_SUSTWAY') AND c.code = 'D5-76';
INSERT INTO exigence (critere_id, referentiel_version_id, code, intitule, enonce, ordre, origine)
SELECT c.id, c.referentiel_version_id, c.code || '-E1', left(c.libelle, 300), c.libelle, 0, 'CONTENU_INITIAL'
  FROM critere c WHERE c.referentiel_version_id = (SELECT s.nouvelle FROM _semis s JOIN referentiel r ON r.id = s.referentiel_id WHERE r.code = 'SMARTEX_SUSTWAY') AND c.code = 'D5-76';

INSERT INTO critere (domaine_id, sous_domaine_id, referentiel_version_id, code, libelle, description, applicabilite, criticite_id, actif, coefficient_ponderation)
SELECT d.id, (SELECT sd.id FROM sous_domaine sd WHERE sd.domaine_id = d.id AND sd.code = 'D5-S1'), d.referentiel_version_id, 'D5-77', 'Mener des études de satisfaction clients.', NULL, 'GENERALE'::type_applicabilite, (SELECT cr.id FROM criticite cr WHERE cr.code = 'MOYENNE'::niveau_criticite), true, 3.0
  FROM domaine d WHERE d.referentiel_version_id = (SELECT s.nouvelle FROM _semis s JOIN referentiel r ON r.id = s.referentiel_id WHERE r.code = 'SMARTEX_SUSTWAY') AND d.code = 'D5';
INSERT INTO question (critere_id, referentiel_version_id, code, libelle, type, ordre, obligatoire, echelle_reponse)
SELECT c.id, c.referentiel_version_id, 'D5-77-Q1', 'Mener des études de satisfaction clients.', 'FERMEE'::type_question, 1, true, 'MATURITE'
  FROM critere c WHERE c.referentiel_version_id = (SELECT s.nouvelle FROM _semis s JOIN referentiel r ON r.id = s.referentiel_id WHERE r.code = 'SMARTEX_SUSTWAY') AND c.code = 'D5-77';
INSERT INTO exigence (critere_id, referentiel_version_id, code, intitule, enonce, ordre, origine)
SELECT c.id, c.referentiel_version_id, c.code || '-E1', left(c.libelle, 300), c.libelle, 0, 'CONTENU_INITIAL'
  FROM critere c WHERE c.referentiel_version_id = (SELECT s.nouvelle FROM _semis s JOIN referentiel r ON r.id = s.referentiel_id WHERE r.code = 'SMARTEX_SUSTWAY') AND c.code = 'D5-77';

INSERT INTO critere (domaine_id, sous_domaine_id, referentiel_version_id, code, libelle, description, applicabilite, criticite_id, actif, coefficient_ponderation)
SELECT d.id, (SELECT sd.id FROM sous_domaine sd WHERE sd.domaine_id = d.id AND sd.code = 'D5-S1'), d.referentiel_version_id, 'D5-78', 'Déployer un système de management qui vise à la certification ISO 9001 v 2015. qui est un grand signal envoyé au marché.', NULL, 'GENERALE'::type_applicabilite, (SELECT cr.id FROM criticite cr WHERE cr.code = 'MOYENNE'::niveau_criticite), true, 2.0
  FROM domaine d WHERE d.referentiel_version_id = (SELECT s.nouvelle FROM _semis s JOIN referentiel r ON r.id = s.referentiel_id WHERE r.code = 'SMARTEX_SUSTWAY') AND d.code = 'D5';
INSERT INTO question (critere_id, referentiel_version_id, code, libelle, type, ordre, obligatoire, echelle_reponse)
SELECT c.id, c.referentiel_version_id, 'D5-78-Q1', 'Déployer un système de management qui vise à la certification ISO 9001 v 2015. qui est un grand signal envoyé au marché.', 'FERMEE'::type_question, 1, true, 'MATURITE'
  FROM critere c WHERE c.referentiel_version_id = (SELECT s.nouvelle FROM _semis s JOIN referentiel r ON r.id = s.referentiel_id WHERE r.code = 'SMARTEX_SUSTWAY') AND c.code = 'D5-78';
INSERT INTO exigence (critere_id, referentiel_version_id, code, intitule, enonce, ordre, origine)
SELECT c.id, c.referentiel_version_id, c.code || '-E1', left(c.libelle, 300), c.libelle, 0, 'CONTENU_INITIAL'
  FROM critere c WHERE c.referentiel_version_id = (SELECT s.nouvelle FROM _semis s JOIN referentiel r ON r.id = s.referentiel_id WHERE r.code = 'SMARTEX_SUSTWAY') AND c.code = 'D5-78';

INSERT INTO critere (domaine_id, sous_domaine_id, referentiel_version_id, code, libelle, description, applicabilite, criticite_id, actif, coefficient_ponderation)
SELECT d.id, (SELECT sd.id FROM sous_domaine sd WHERE sd.domaine_id = d.id AND sd.code = 'D5-S2'), d.referentiel_version_id, 'D5-79', 'Connaître et Respecter les règles qui régissent le secteur et éviter toute forme de « concurrence déloyale ».', NULL, 'GENERALE'::type_applicabilite, (SELECT cr.id FROM criticite cr WHERE cr.code = 'MOYENNE'::niveau_criticite), true, 2.0
  FROM domaine d WHERE d.referentiel_version_id = (SELECT s.nouvelle FROM _semis s JOIN referentiel r ON r.id = s.referentiel_id WHERE r.code = 'SMARTEX_SUSTWAY') AND d.code = 'D5';
INSERT INTO question (critere_id, referentiel_version_id, code, libelle, type, ordre, obligatoire, echelle_reponse)
SELECT c.id, c.referentiel_version_id, 'D5-79-Q1', 'Connaître et Respecter les règles qui régissent le secteur et éviter toute forme de « concurrence déloyale ».', 'FERMEE'::type_question, 1, true, 'MATURITE'
  FROM critere c WHERE c.referentiel_version_id = (SELECT s.nouvelle FROM _semis s JOIN referentiel r ON r.id = s.referentiel_id WHERE r.code = 'SMARTEX_SUSTWAY') AND c.code = 'D5-79';
INSERT INTO exigence (critere_id, referentiel_version_id, code, intitule, enonce, ordre, origine)
SELECT c.id, c.referentiel_version_id, c.code || '-E1', left(c.libelle, 300), c.libelle, 0, 'CONTENU_INITIAL'
  FROM critere c WHERE c.referentiel_version_id = (SELECT s.nouvelle FROM _semis s JOIN referentiel r ON r.id = s.referentiel_id WHERE r.code = 'SMARTEX_SUSTWAY') AND c.code = 'D5-79';

INSERT INTO critere (domaine_id, sous_domaine_id, referentiel_version_id, code, libelle, description, applicabilite, criticite_id, actif, coefficient_ponderation)
SELECT d.id, (SELECT sd.id FROM sous_domaine sd WHERE sd.domaine_id = d.id AND sd.code = 'D5-S3'), d.referentiel_version_id, 'D5-80', 'Sensibiliser les fournisseurs et sous-traitants à la RSE en les encourageant à identifier les principaux impacts environnementaux de leurs activités et à les réduire', NULL, 'GENERALE'::type_applicabilite, (SELECT cr.id FROM criticite cr WHERE cr.code = 'MOYENNE'::niveau_criticite), true, 2.0
  FROM domaine d WHERE d.referentiel_version_id = (SELECT s.nouvelle FROM _semis s JOIN referentiel r ON r.id = s.referentiel_id WHERE r.code = 'SMARTEX_SUSTWAY') AND d.code = 'D5';
INSERT INTO question (critere_id, referentiel_version_id, code, libelle, type, ordre, obligatoire, echelle_reponse)
SELECT c.id, c.referentiel_version_id, 'D5-80-Q1', 'Sensibiliser les fournisseurs et sous-traitants à la RSE en les encourageant à identifier les principaux impacts environnementaux de leurs activités et à les réduire', 'FERMEE'::type_question, 1, true, 'MATURITE'
  FROM critere c WHERE c.referentiel_version_id = (SELECT s.nouvelle FROM _semis s JOIN referentiel r ON r.id = s.referentiel_id WHERE r.code = 'SMARTEX_SUSTWAY') AND c.code = 'D5-80';
INSERT INTO exigence (critere_id, referentiel_version_id, code, intitule, enonce, ordre, origine)
SELECT c.id, c.referentiel_version_id, c.code || '-E1', left(c.libelle, 300), c.libelle, 0, 'CONTENU_INITIAL'
  FROM critere c WHERE c.referentiel_version_id = (SELECT s.nouvelle FROM _semis s JOIN referentiel r ON r.id = s.referentiel_id WHERE r.code = 'SMARTEX_SUSTWAY') AND c.code = 'D5-80';

INSERT INTO critere (domaine_id, sous_domaine_id, referentiel_version_id, code, libelle, description, applicabilite, criticite_id, actif, coefficient_ponderation)
SELECT d.id, (SELECT sd.id FROM sous_domaine sd WHERE sd.domaine_id = d.id AND sd.code = 'D5-S3'), d.referentiel_version_id, 'D5-81', 'Sensibiliser les fournisseurs et sous-traitants à la RSE en les encourageant à identifier les principaux impacts sociaux de leurs activités et à les réduire', NULL, 'GENERALE'::type_applicabilite, (SELECT cr.id FROM criticite cr WHERE cr.code = 'MOYENNE'::niveau_criticite), true, 3.0
  FROM domaine d WHERE d.referentiel_version_id = (SELECT s.nouvelle FROM _semis s JOIN referentiel r ON r.id = s.referentiel_id WHERE r.code = 'SMARTEX_SUSTWAY') AND d.code = 'D5';
INSERT INTO question (critere_id, referentiel_version_id, code, libelle, type, ordre, obligatoire, echelle_reponse)
SELECT c.id, c.referentiel_version_id, 'D5-81-Q1', 'Sensibiliser les fournisseurs et sous-traitants à la RSE en les encourageant à identifier les principaux impacts sociaux de leurs activités et à les réduire', 'FERMEE'::type_question, 1, true, 'MATURITE'
  FROM critere c WHERE c.referentiel_version_id = (SELECT s.nouvelle FROM _semis s JOIN referentiel r ON r.id = s.referentiel_id WHERE r.code = 'SMARTEX_SUSTWAY') AND c.code = 'D5-81';
INSERT INTO exigence (critere_id, referentiel_version_id, code, intitule, enonce, ordre, origine)
SELECT c.id, c.referentiel_version_id, c.code || '-E1', left(c.libelle, 300), c.libelle, 0, 'CONTENU_INITIAL'
  FROM critere c WHERE c.referentiel_version_id = (SELECT s.nouvelle FROM _semis s JOIN referentiel r ON r.id = s.referentiel_id WHERE r.code = 'SMARTEX_SUSTWAY') AND c.code = 'D5-81';

INSERT INTO critere (domaine_id, sous_domaine_id, referentiel_version_id, code, libelle, description, applicabilite, criticite_id, actif, coefficient_ponderation)
SELECT d.id, (SELECT sd.id FROM sous_domaine sd WHERE sd.domaine_id = d.id AND sd.code = 'D5-S3'), d.referentiel_version_id, 'D5-82', 'Analyser les offres des fournisseurs / sous-traitants suivant les critères d''attribution en « mieux disance » et en raisonnant en « coût total » par la prise en compte de l’ensemble des composantes du coût (prix du bien ou du service, les coûts logistiques associés supportés, les coûts après vente, …) et sur le long terme', NULL, 'GENERALE'::type_applicabilite, (SELECT cr.id FROM criticite cr WHERE cr.code = 'MOYENNE'::niveau_criticite), true, 3.0
  FROM domaine d WHERE d.referentiel_version_id = (SELECT s.nouvelle FROM _semis s JOIN referentiel r ON r.id = s.referentiel_id WHERE r.code = 'SMARTEX_SUSTWAY') AND d.code = 'D5';
INSERT INTO question (critere_id, referentiel_version_id, code, libelle, type, ordre, obligatoire, echelle_reponse)
SELECT c.id, c.referentiel_version_id, 'D5-82-Q1', 'Analyser les offres des fournisseurs / sous-traitants suivant les critères d''attribution en « mieux disance » et en raisonnant en « coût total » par la prise en compte de l’ensemble des composantes du coût (prix du bien ou du service, les coûts logistiques associés supportés, les coûts après vente, …) et sur le long terme', 'FERMEE'::type_question, 1, true, 'MATURITE'
  FROM critere c WHERE c.referentiel_version_id = (SELECT s.nouvelle FROM _semis s JOIN referentiel r ON r.id = s.referentiel_id WHERE r.code = 'SMARTEX_SUSTWAY') AND c.code = 'D5-82';
INSERT INTO exigence (critere_id, referentiel_version_id, code, intitule, enonce, ordre, origine)
SELECT c.id, c.referentiel_version_id, c.code || '-E1', left(c.libelle, 300), c.libelle, 0, 'CONTENU_INITIAL'
  FROM critere c WHERE c.referentiel_version_id = (SELECT s.nouvelle FROM _semis s JOIN referentiel r ON r.id = s.referentiel_id WHERE r.code = 'SMARTEX_SUSTWAY') AND c.code = 'D5-82';

INSERT INTO critere (domaine_id, sous_domaine_id, referentiel_version_id, code, libelle, description, applicabilite, criticite_id, actif, coefficient_ponderation)
SELECT d.id, (SELECT sd.id FROM sous_domaine sd WHERE sd.domaine_id = d.id AND sd.code = 'D5-S3'), d.referentiel_version_id, 'D5-83', 'Prendre en compte des critères sociaux et environnementaux dans le processus d’achats de l’entreprise', NULL, 'GENERALE'::type_applicabilite, (SELECT cr.id FROM criticite cr WHERE cr.code = 'MOYENNE'::niveau_criticite), true, 1.0
  FROM domaine d WHERE d.referentiel_version_id = (SELECT s.nouvelle FROM _semis s JOIN referentiel r ON r.id = s.referentiel_id WHERE r.code = 'SMARTEX_SUSTWAY') AND d.code = 'D5';
INSERT INTO question (critere_id, referentiel_version_id, code, libelle, type, ordre, obligatoire, echelle_reponse)
SELECT c.id, c.referentiel_version_id, 'D5-83-Q1', 'Prendre en compte des critères sociaux et environnementaux dans le processus d’achats de l’entreprise', 'FERMEE'::type_question, 1, true, 'MATURITE'
  FROM critere c WHERE c.referentiel_version_id = (SELECT s.nouvelle FROM _semis s JOIN referentiel r ON r.id = s.referentiel_id WHERE r.code = 'SMARTEX_SUSTWAY') AND c.code = 'D5-83';
INSERT INTO exigence (critere_id, referentiel_version_id, code, intitule, enonce, ordre, origine)
SELECT c.id, c.referentiel_version_id, c.code || '-E1', left(c.libelle, 300), c.libelle, 0, 'CONTENU_INITIAL'
  FROM critere c WHERE c.referentiel_version_id = (SELECT s.nouvelle FROM _semis s JOIN referentiel r ON r.id = s.referentiel_id WHERE r.code = 'SMARTEX_SUSTWAY') AND c.code = 'D5-83';

INSERT INTO critere (domaine_id, sous_domaine_id, referentiel_version_id, code, libelle, description, applicabilite, criticite_id, actif, coefficient_ponderation)
SELECT d.id, (SELECT sd.id FROM sous_domaine sd WHERE sd.domaine_id = d.id AND sd.code = 'D5-S3'), d.referentiel_version_id, 'D5-84', 'Formaliser de façon concrète une politique d’achats responsables pour l’entreprise fondée sur des principes environnementaux, sociaux, de gouvernance et d’éthique', NULL, 'GENERALE'::type_applicabilite, (SELECT cr.id FROM criticite cr WHERE cr.code = 'MOYENNE'::niveau_criticite), true, 2.0
  FROM domaine d WHERE d.referentiel_version_id = (SELECT s.nouvelle FROM _semis s JOIN referentiel r ON r.id = s.referentiel_id WHERE r.code = 'SMARTEX_SUSTWAY') AND d.code = 'D5';
INSERT INTO question (critere_id, referentiel_version_id, code, libelle, type, ordre, obligatoire, echelle_reponse)
SELECT c.id, c.referentiel_version_id, 'D5-84-Q1', 'Formaliser de façon concrète une politique d’achats responsables pour l’entreprise fondée sur des principes environnementaux, sociaux, de gouvernance et d’éthique', 'FERMEE'::type_question, 1, true, 'MATURITE'
  FROM critere c WHERE c.referentiel_version_id = (SELECT s.nouvelle FROM _semis s JOIN referentiel r ON r.id = s.referentiel_id WHERE r.code = 'SMARTEX_SUSTWAY') AND c.code = 'D5-84';
INSERT INTO exigence (critere_id, referentiel_version_id, code, intitule, enonce, ordre, origine)
SELECT c.id, c.referentiel_version_id, c.code || '-E1', left(c.libelle, 300), c.libelle, 0, 'CONTENU_INITIAL'
  FROM critere c WHERE c.referentiel_version_id = (SELECT s.nouvelle FROM _semis s JOIN referentiel r ON r.id = s.referentiel_id WHERE r.code = 'SMARTEX_SUSTWAY') AND c.code = 'D5-84';

INSERT INTO critere (domaine_id, sous_domaine_id, referentiel_version_id, code, libelle, description, applicabilite, criticite_id, actif, coefficient_ponderation)
SELECT d.id, (SELECT sd.id FROM sous_domaine sd WHERE sd.domaine_id = d.id AND sd.code = 'D5-S3'), d.referentiel_version_id, 'D5-85', 'Impliquer et former l’ensemble des acteurs de la supply-chain à la politique d’achats responsables de l’entreprise (acheteurs, logistique, comptabilité fournisseurs, qualité fournisseurs …).', NULL, 'GENERALE'::type_applicabilite, (SELECT cr.id FROM criticite cr WHERE cr.code = 'MOYENNE'::niveau_criticite), true, 2.0
  FROM domaine d WHERE d.referentiel_version_id = (SELECT s.nouvelle FROM _semis s JOIN referentiel r ON r.id = s.referentiel_id WHERE r.code = 'SMARTEX_SUSTWAY') AND d.code = 'D5';
INSERT INTO question (critere_id, referentiel_version_id, code, libelle, type, ordre, obligatoire, echelle_reponse)
SELECT c.id, c.referentiel_version_id, 'D5-85-Q1', 'Impliquer et former l’ensemble des acteurs de la supply-chain à la politique d’achats responsables de l’entreprise (acheteurs, logistique, comptabilité fournisseurs, qualité fournisseurs …).', 'FERMEE'::type_question, 1, true, 'MATURITE'
  FROM critere c WHERE c.referentiel_version_id = (SELECT s.nouvelle FROM _semis s JOIN referentiel r ON r.id = s.referentiel_id WHERE r.code = 'SMARTEX_SUSTWAY') AND c.code = 'D5-85';
INSERT INTO exigence (critere_id, referentiel_version_id, code, intitule, enonce, ordre, origine)
SELECT c.id, c.referentiel_version_id, c.code || '-E1', left(c.libelle, 300), c.libelle, 0, 'CONTENU_INITIAL'
  FROM critere c WHERE c.referentiel_version_id = (SELECT s.nouvelle FROM _semis s JOIN referentiel r ON r.id = s.referentiel_id WHERE r.code = 'SMARTEX_SUSTWAY') AND c.code = 'D5-85';

INSERT INTO critere (domaine_id, sous_domaine_id, referentiel_version_id, code, libelle, description, applicabilite, criticite_id, actif, coefficient_ponderation)
SELECT d.id, (SELECT sd.id FROM sous_domaine sd WHERE sd.domaine_id = d.id AND sd.code = 'D5-S3'), d.referentiel_version_id, 'D5-86', 'Déployer un système de management des achats qui vise à la certification ISO 20400 v 2017, (lignes directrices pour intégrer la responsabilité sociétale dans le processus achats de l’entreprise)', NULL, 'GENERALE'::type_applicabilite, (SELECT cr.id FROM criticite cr WHERE cr.code = 'MOYENNE'::niveau_criticite), true, 1.0
  FROM domaine d WHERE d.referentiel_version_id = (SELECT s.nouvelle FROM _semis s JOIN referentiel r ON r.id = s.referentiel_id WHERE r.code = 'SMARTEX_SUSTWAY') AND d.code = 'D5';
INSERT INTO question (critere_id, referentiel_version_id, code, libelle, type, ordre, obligatoire, echelle_reponse)
SELECT c.id, c.referentiel_version_id, 'D5-86-Q1', 'Déployer un système de management des achats qui vise à la certification ISO 20400 v 2017, (lignes directrices pour intégrer la responsabilité sociétale dans le processus achats de l’entreprise)', 'FERMEE'::type_question, 1, true, 'MATURITE'
  FROM critere c WHERE c.referentiel_version_id = (SELECT s.nouvelle FROM _semis s JOIN referentiel r ON r.id = s.referentiel_id WHERE r.code = 'SMARTEX_SUSTWAY') AND c.code = 'D5-86';
INSERT INTO exigence (critere_id, referentiel_version_id, code, intitule, enonce, ordre, origine)
SELECT c.id, c.referentiel_version_id, c.code || '-E1', left(c.libelle, 300), c.libelle, 0, 'CONTENU_INITIAL'
  FROM critere c WHERE c.referentiel_version_id = (SELECT s.nouvelle FROM _semis s JOIN referentiel r ON r.id = s.referentiel_id WHERE r.code = 'SMARTEX_SUSTWAY') AND c.code = 'D5-86';

INSERT INTO critere (domaine_id, sous_domaine_id, referentiel_version_id, code, libelle, description, applicabilite, criticite_id, actif, coefficient_ponderation)
SELECT d.id, (SELECT sd.id FROM sous_domaine sd WHERE sd.domaine_id = d.id AND sd.code = 'D5-S3'), d.referentiel_version_id, 'D5-87', 'Encourager ou associer les fournisseurs et sous-traitants à la politique d’achats responsables de l’entreprise', NULL, 'GENERALE'::type_applicabilite, (SELECT cr.id FROM criticite cr WHERE cr.code = 'MOYENNE'::niveau_criticite), true, 2.0
  FROM domaine d WHERE d.referentiel_version_id = (SELECT s.nouvelle FROM _semis s JOIN referentiel r ON r.id = s.referentiel_id WHERE r.code = 'SMARTEX_SUSTWAY') AND d.code = 'D5';
INSERT INTO question (critere_id, referentiel_version_id, code, libelle, type, ordre, obligatoire, echelle_reponse)
SELECT c.id, c.referentiel_version_id, 'D5-87-Q1', 'Encourager ou associer les fournisseurs et sous-traitants à la politique d’achats responsables de l’entreprise', 'FERMEE'::type_question, 1, true, 'MATURITE'
  FROM critere c WHERE c.referentiel_version_id = (SELECT s.nouvelle FROM _semis s JOIN referentiel r ON r.id = s.referentiel_id WHERE r.code = 'SMARTEX_SUSTWAY') AND c.code = 'D5-87';
INSERT INTO exigence (critere_id, referentiel_version_id, code, intitule, enonce, ordre, origine)
SELECT c.id, c.referentiel_version_id, c.code || '-E1', left(c.libelle, 300), c.libelle, 0, 'CONTENU_INITIAL'
  FROM critere c WHERE c.referentiel_version_id = (SELECT s.nouvelle FROM _semis s JOIN referentiel r ON r.id = s.referentiel_id WHERE r.code = 'SMARTEX_SUSTWAY') AND c.code = 'D5-87';

INSERT INTO critere (domaine_id, sous_domaine_id, referentiel_version_id, code, libelle, description, applicabilite, criticite_id, actif, coefficient_ponderation)
SELECT d.id, (SELECT sd.id FROM sous_domaine sd WHERE sd.domaine_id = d.id AND sd.code = 'D5-S3'), d.referentiel_version_id, 'D5-88', 'Réaliser des audits fournisseurs / sous-traitants au regard des exigences RSE / DD de l’entreprise', NULL, 'GENERALE'::type_applicabilite, (SELECT cr.id FROM criticite cr WHERE cr.code = 'MOYENNE'::niveau_criticite), true, 2.0
  FROM domaine d WHERE d.referentiel_version_id = (SELECT s.nouvelle FROM _semis s JOIN referentiel r ON r.id = s.referentiel_id WHERE r.code = 'SMARTEX_SUSTWAY') AND d.code = 'D5';
INSERT INTO question (critere_id, referentiel_version_id, code, libelle, type, ordre, obligatoire, echelle_reponse)
SELECT c.id, c.referentiel_version_id, 'D5-88-Q1', 'Réaliser des audits fournisseurs / sous-traitants au regard des exigences RSE / DD de l’entreprise', 'FERMEE'::type_question, 1, true, 'MATURITE'
  FROM critere c WHERE c.referentiel_version_id = (SELECT s.nouvelle FROM _semis s JOIN referentiel r ON r.id = s.referentiel_id WHERE r.code = 'SMARTEX_SUSTWAY') AND c.code = 'D5-88';
INSERT INTO exigence (critere_id, referentiel_version_id, code, intitule, enonce, ordre, origine)
SELECT c.id, c.referentiel_version_id, c.code || '-E1', left(c.libelle, 300), c.libelle, 0, 'CONTENU_INITIAL'
  FROM critere c WHERE c.referentiel_version_id = (SELECT s.nouvelle FROM _semis s JOIN referentiel r ON r.id = s.referentiel_id WHERE r.code = 'SMARTEX_SUSTWAY') AND c.code = 'D5-88';

INSERT INTO critere (domaine_id, sous_domaine_id, referentiel_version_id, code, libelle, description, applicabilite, criticite_id, actif, coefficient_ponderation)
SELECT d.id, (SELECT sd.id FROM sous_domaine sd WHERE sd.domaine_id = d.id AND sd.code = 'D5-S3'), d.referentiel_version_id, 'D5-90', 'Réaliser des enquêtes de satisfaction fournisseurs / sous-traitants relativement à l’assurance d’une équité financière à leur égard, aux bons échanges de relations d’affaires et de collaboration, de gestion des litiges', NULL, 'GENERALE'::type_applicabilite, (SELECT cr.id FROM criticite cr WHERE cr.code = 'MOYENNE'::niveau_criticite), true, 3.0
  FROM domaine d WHERE d.referentiel_version_id = (SELECT s.nouvelle FROM _semis s JOIN referentiel r ON r.id = s.referentiel_id WHERE r.code = 'SMARTEX_SUSTWAY') AND d.code = 'D5';
INSERT INTO question (critere_id, referentiel_version_id, code, libelle, type, ordre, obligatoire, echelle_reponse)
SELECT c.id, c.referentiel_version_id, 'D5-90-Q1', 'Réaliser des enquêtes de satisfaction fournisseurs / sous-traitants relativement à l’assurance d’une équité financière à leur égard, aux bons échanges de relations d’affaires et de collaboration, de gestion des litiges', 'FERMEE'::type_question, 1, true, 'MATURITE'
  FROM critere c WHERE c.referentiel_version_id = (SELECT s.nouvelle FROM _semis s JOIN referentiel r ON r.id = s.referentiel_id WHERE r.code = 'SMARTEX_SUSTWAY') AND c.code = 'D5-90';
INSERT INTO exigence (critere_id, referentiel_version_id, code, intitule, enonce, ordre, origine)
SELECT c.id, c.referentiel_version_id, c.code || '-E1', left(c.libelle, 300), c.libelle, 0, 'CONTENU_INITIAL'
  FROM critere c WHERE c.referentiel_version_id = (SELECT s.nouvelle FROM _semis s JOIN referentiel r ON r.id = s.referentiel_id WHERE r.code = 'SMARTEX_SUSTWAY') AND c.code = 'D5-90';

INSERT INTO domaine (referentiel_id, referentiel_version_id, code, nom, description, ordre)
VALUES ((SELECT id FROM referentiel WHERE code = 'SMARTEX_SUSTWAY'), (SELECT s.nouvelle FROM _semis s JOIN referentiel r ON r.id = s.referentiel_id WHERE r.code = 'SMARTEX_SUSTWAY'), 'D6', 'Prise en charge organisationnelle de la RSE dans l’entreprise', 'Dimension Prise en charge organisationnelle de la RSE dans l’entreprise.', 6);
INSERT INTO critere (domaine_id, sous_domaine_id, referentiel_version_id, code, libelle, description, applicabilite, criticite_id, actif, coefficient_ponderation)
SELECT d.id, NULL, d.referentiel_version_id, 'D6-91', 'Une équipe est-elle mise en place et dédiée à la RSE, peu importe la ou les dimensions de cette dernière traitée/s par l’entreprise ?', NULL, 'GENERALE'::type_applicabilite, (SELECT cr.id FROM criticite cr WHERE cr.code = 'MOYENNE'::niveau_criticite), true, 2.0
  FROM domaine d WHERE d.referentiel_version_id = (SELECT s.nouvelle FROM _semis s JOIN referentiel r ON r.id = s.referentiel_id WHERE r.code = 'SMARTEX_SUSTWAY') AND d.code = 'D6';
INSERT INTO question (critere_id, referentiel_version_id, code, libelle, type, ordre, obligatoire, echelle_reponse)
SELECT c.id, c.referentiel_version_id, 'D6-91-Q1', 'Une équipe est-elle mise en place et dédiée à la RSE, peu importe la ou les dimensions de cette dernière traitée/s par l’entreprise ?', 'FERMEE'::type_question, 1, true, 'BINAIRE'
  FROM critere c WHERE c.referentiel_version_id = (SELECT s.nouvelle FROM _semis s JOIN referentiel r ON r.id = s.referentiel_id WHERE r.code = 'SMARTEX_SUSTWAY') AND c.code = 'D6-91';
INSERT INTO exigence (critere_id, referentiel_version_id, code, intitule, enonce, ordre, origine)
SELECT c.id, c.referentiel_version_id, c.code || '-E1', left(c.libelle, 300), c.libelle, 0, 'CONTENU_INITIAL'
  FROM critere c WHERE c.referentiel_version_id = (SELECT s.nouvelle FROM _semis s JOIN referentiel r ON r.id = s.referentiel_id WHERE r.code = 'SMARTEX_SUSTWAY') AND c.code = 'D6-91';

INSERT INTO critere (domaine_id, sous_domaine_id, referentiel_version_id, code, libelle, description, applicabilite, criticite_id, actif, coefficient_ponderation)
SELECT d.id, NULL, d.referentiel_version_id, 'D6-92', 'Publiez-vous un rapport de RSE / ESG / Développement Durable chaque année ?', NULL, 'GENERALE'::type_applicabilite, (SELECT cr.id FROM criticite cr WHERE cr.code = 'MOYENNE'::niveau_criticite), true, 3.0
  FROM domaine d WHERE d.referentiel_version_id = (SELECT s.nouvelle FROM _semis s JOIN referentiel r ON r.id = s.referentiel_id WHERE r.code = 'SMARTEX_SUSTWAY') AND d.code = 'D6';
INSERT INTO question (critere_id, referentiel_version_id, code, libelle, type, ordre, obligatoire, echelle_reponse)
SELECT c.id, c.referentiel_version_id, 'D6-92-Q1', 'Publiez-vous un rapport de RSE / ESG / Développement Durable chaque année ?', 'FERMEE'::type_question, 1, true, 'BINAIRE'
  FROM critere c WHERE c.referentiel_version_id = (SELECT s.nouvelle FROM _semis s JOIN referentiel r ON r.id = s.referentiel_id WHERE r.code = 'SMARTEX_SUSTWAY') AND c.code = 'D6-92';
INSERT INTO exigence (critere_id, referentiel_version_id, code, intitule, enonce, ordre, origine)
SELECT c.id, c.referentiel_version_id, c.code || '-E1', left(c.libelle, 300), c.libelle, 0, 'CONTENU_INITIAL'
  FROM critere c WHERE c.referentiel_version_id = (SELECT s.nouvelle FROM _semis s JOIN referentiel r ON r.id = s.referentiel_id WHERE r.code = 'SMARTEX_SUSTWAY') AND c.code = 'D6-92';

INSERT INTO critere (domaine_id, sous_domaine_id, referentiel_version_id, code, libelle, description, applicabilite, criticite_id, actif, coefficient_ponderation)
SELECT d.id, NULL, d.referentiel_version_id, 'D6-93', 'Le rapport de RSE / ESG / Développement Durable publié chaque année est il accessible à tous ceux qui voudraient en savoir davantage sur vos pratiques pour des questions de transparence ?', NULL, 'GENERALE'::type_applicabilite, (SELECT cr.id FROM criticite cr WHERE cr.code = 'MOYENNE'::niveau_criticite), true, 3.0
  FROM domaine d WHERE d.referentiel_version_id = (SELECT s.nouvelle FROM _semis s JOIN referentiel r ON r.id = s.referentiel_id WHERE r.code = 'SMARTEX_SUSTWAY') AND d.code = 'D6';
INSERT INTO question (critere_id, referentiel_version_id, code, libelle, type, ordre, obligatoire, echelle_reponse)
SELECT c.id, c.referentiel_version_id, 'D6-93-Q1', 'Le rapport de RSE / ESG / Développement Durable publié chaque année est il accessible à tous ceux qui voudraient en savoir davantage sur vos pratiques pour des questions de transparence ?', 'FERMEE'::type_question, 1, true, 'BINAIRE'
  FROM critere c WHERE c.referentiel_version_id = (SELECT s.nouvelle FROM _semis s JOIN referentiel r ON r.id = s.referentiel_id WHERE r.code = 'SMARTEX_SUSTWAY') AND c.code = 'D6-93';
INSERT INTO exigence (critere_id, referentiel_version_id, code, intitule, enonce, ordre, origine)
SELECT c.id, c.referentiel_version_id, c.code || '-E1', left(c.libelle, 300), c.libelle, 0, 'CONTENU_INITIAL'
  FROM critere c WHERE c.referentiel_version_id = (SELECT s.nouvelle FROM _semis s JOIN referentiel r ON r.id = s.referentiel_id WHERE r.code = 'SMARTEX_SUSTWAY') AND c.code = 'D6-93';


-- ======================= IFC_SFI =======================

INSERT INTO domaine (referentiel_id, referentiel_version_id, code, nom, description, ordre)
VALUES ((SELECT id FROM referentiel WHERE code = 'IFC_SFI'), (SELECT s.nouvelle FROM _semis s JOIN referentiel r ON r.id = s.referentiel_id WHERE r.code = 'IFC_SFI'), 'D1', 'Évaluation et gestion des risques et impacts', '1. Évaluation et gestion des risques et impacts avec pour objectif principal Mettre en place un système de gestion environnementale et sociale', 1);
INSERT INTO critere (domaine_id, sous_domaine_id, referentiel_version_id, code, libelle, description, applicabilite, criticite_id, actif, coefficient_ponderation)
SELECT d.id, NULL, d.referentiel_version_id, 'D1-01', 'L’entreprise dispose‑t‑elle d’un système de gestion environnemental documenté ?', NULL, 'GENERALE'::type_applicabilite, (SELECT cr.id FROM criticite cr WHERE cr.code = 'MOYENNE'::niveau_criticite), true, 3.0
  FROM domaine d WHERE d.referentiel_version_id = (SELECT s.nouvelle FROM _semis s JOIN referentiel r ON r.id = s.referentiel_id WHERE r.code = 'IFC_SFI') AND d.code = 'D1';
INSERT INTO question (critere_id, referentiel_version_id, code, libelle, type, ordre, obligatoire, echelle_reponse)
SELECT c.id, c.referentiel_version_id, 'D1-01-Q1', 'L’entreprise dispose‑t‑elle d’un système de gestion environnemental documenté ?', 'FERMEE'::type_question, 1, true, 'MATURITE'
  FROM critere c WHERE c.referentiel_version_id = (SELECT s.nouvelle FROM _semis s JOIN referentiel r ON r.id = s.referentiel_id WHERE r.code = 'IFC_SFI') AND c.code = 'D1-01';
INSERT INTO exigence (critere_id, referentiel_version_id, code, intitule, enonce, ordre, origine)
SELECT c.id, c.referentiel_version_id, c.code || '-E1', left(c.libelle, 300), c.libelle, 0, 'CONTENU_INITIAL'
  FROM critere c WHERE c.referentiel_version_id = (SELECT s.nouvelle FROM _semis s JOIN referentiel r ON r.id = s.referentiel_id WHERE r.code = 'IFC_SFI') AND c.code = 'D1-01';

INSERT INTO critere (domaine_id, sous_domaine_id, referentiel_version_id, code, libelle, description, applicabilite, criticite_id, actif, coefficient_ponderation)
SELECT d.id, NULL, d.referentiel_version_id, 'D1-02', 'L’entreprise dispose‑t‑elle d’un système de gestion social documenté ?', NULL, 'GENERALE'::type_applicabilite, (SELECT cr.id FROM criticite cr WHERE cr.code = 'MOYENNE'::niveau_criticite), true, 3.0
  FROM domaine d WHERE d.referentiel_version_id = (SELECT s.nouvelle FROM _semis s JOIN referentiel r ON r.id = s.referentiel_id WHERE r.code = 'IFC_SFI') AND d.code = 'D1';
INSERT INTO question (critere_id, referentiel_version_id, code, libelle, type, ordre, obligatoire, echelle_reponse)
SELECT c.id, c.referentiel_version_id, 'D1-02-Q1', 'L’entreprise dispose‑t‑elle d’un système de gestion social documenté ?', 'FERMEE'::type_question, 1, true, 'MATURITE'
  FROM critere c WHERE c.referentiel_version_id = (SELECT s.nouvelle FROM _semis s JOIN referentiel r ON r.id = s.referentiel_id WHERE r.code = 'IFC_SFI') AND c.code = 'D1-02';
INSERT INTO exigence (critere_id, referentiel_version_id, code, intitule, enonce, ordre, origine)
SELECT c.id, c.referentiel_version_id, c.code || '-E1', left(c.libelle, 300), c.libelle, 0, 'CONTENU_INITIAL'
  FROM critere c WHERE c.referentiel_version_id = (SELECT s.nouvelle FROM _semis s JOIN referentiel r ON r.id = s.referentiel_id WHERE r.code = 'IFC_SFI') AND c.code = 'D1-02';

INSERT INTO critere (domaine_id, sous_domaine_id, referentiel_version_id, code, libelle, description, applicabilite, criticite_id, actif, coefficient_ponderation)
SELECT d.id, NULL, d.referentiel_version_id, 'D1-03', 'Les études d’impact sont‑elles réalisées avant chaque projet ?', NULL, 'GENERALE'::type_applicabilite, (SELECT cr.id FROM criticite cr WHERE cr.code = 'MOYENNE'::niveau_criticite), true, 2.0
  FROM domaine d WHERE d.referentiel_version_id = (SELECT s.nouvelle FROM _semis s JOIN referentiel r ON r.id = s.referentiel_id WHERE r.code = 'IFC_SFI') AND d.code = 'D1';
INSERT INTO question (critere_id, referentiel_version_id, code, libelle, type, ordre, obligatoire, echelle_reponse)
SELECT c.id, c.referentiel_version_id, 'D1-03-Q1', 'Les études d’impact sont‑elles réalisées avant chaque projet ?', 'FERMEE'::type_question, 1, true, 'MATURITE'
  FROM critere c WHERE c.referentiel_version_id = (SELECT s.nouvelle FROM _semis s JOIN referentiel r ON r.id = s.referentiel_id WHERE r.code = 'IFC_SFI') AND c.code = 'D1-03';
INSERT INTO exigence (critere_id, referentiel_version_id, code, intitule, enonce, ordre, origine)
SELECT c.id, c.referentiel_version_id, c.code || '-E1', left(c.libelle, 300), c.libelle, 0, 'CONTENU_INITIAL'
  FROM critere c WHERE c.referentiel_version_id = (SELECT s.nouvelle FROM _semis s JOIN referentiel r ON r.id = s.referentiel_id WHERE r.code = 'IFC_SFI') AND c.code = 'D1-03';

INSERT INTO critere (domaine_id, sous_domaine_id, referentiel_version_id, code, libelle, description, applicabilite, criticite_id, actif, coefficient_ponderation)
SELECT d.id, NULL, d.referentiel_version_id, 'D1-04', 'Existe‑t‑il un plan de suivi et de reporting régulier ?', NULL, 'GENERALE'::type_applicabilite, (SELECT cr.id FROM criticite cr WHERE cr.code = 'MOYENNE'::niveau_criticite), true, 3.0
  FROM domaine d WHERE d.referentiel_version_id = (SELECT s.nouvelle FROM _semis s JOIN referentiel r ON r.id = s.referentiel_id WHERE r.code = 'IFC_SFI') AND d.code = 'D1';
INSERT INTO question (critere_id, referentiel_version_id, code, libelle, type, ordre, obligatoire, echelle_reponse)
SELECT c.id, c.referentiel_version_id, 'D1-04-Q1', 'Existe‑t‑il un plan de suivi et de reporting régulier ?', 'FERMEE'::type_question, 1, true, 'MATURITE'
  FROM critere c WHERE c.referentiel_version_id = (SELECT s.nouvelle FROM _semis s JOIN referentiel r ON r.id = s.referentiel_id WHERE r.code = 'IFC_SFI') AND c.code = 'D1-04';
INSERT INTO exigence (critere_id, referentiel_version_id, code, intitule, enonce, ordre, origine)
SELECT c.id, c.referentiel_version_id, c.code || '-E1', left(c.libelle, 300), c.libelle, 0, 'CONTENU_INITIAL'
  FROM critere c WHERE c.referentiel_version_id = (SELECT s.nouvelle FROM _semis s JOIN referentiel r ON r.id = s.referentiel_id WHERE r.code = 'IFC_SFI') AND c.code = 'D1-04';

INSERT INTO domaine (referentiel_id, referentiel_version_id, code, nom, description, ordre)
VALUES ((SELECT id FROM referentiel WHERE code = 'IFC_SFI'), (SELECT s.nouvelle FROM _semis s JOIN referentiel r ON r.id = s.referentiel_id WHERE r.code = 'IFC_SFI'), 'D2', 'Main-d’œuvre et conditions de travail', '2. Main-d’œuvre et conditions de travail avec pour objectif principal Respect des droits des travailleurs et normes OIT', 2);
INSERT INTO critere (domaine_id, sous_domaine_id, referentiel_version_id, code, libelle, description, applicabilite, criticite_id, actif, coefficient_ponderation)
SELECT d.id, NULL, d.referentiel_version_id, 'D2-05', 'Les contrats respectent‑ils les normes de l’OIT concernant le travail forcé ?', NULL, 'GENERALE'::type_applicabilite, (SELECT cr.id FROM criticite cr WHERE cr.code = 'MOYENNE'::niveau_criticite), true, 3.0
  FROM domaine d WHERE d.referentiel_version_id = (SELECT s.nouvelle FROM _semis s JOIN referentiel r ON r.id = s.referentiel_id WHERE r.code = 'IFC_SFI') AND d.code = 'D2';
INSERT INTO question (critere_id, referentiel_version_id, code, libelle, type, ordre, obligatoire, echelle_reponse)
SELECT c.id, c.referentiel_version_id, 'D2-05-Q1', 'Les contrats respectent‑ils les normes de l’OIT concernant le travail forcé ?', 'FERMEE'::type_question, 1, true, 'MATURITE'
  FROM critere c WHERE c.referentiel_version_id = (SELECT s.nouvelle FROM _semis s JOIN referentiel r ON r.id = s.referentiel_id WHERE r.code = 'IFC_SFI') AND c.code = 'D2-05';
INSERT INTO exigence (critere_id, referentiel_version_id, code, intitule, enonce, ordre, origine)
SELECT c.id, c.referentiel_version_id, c.code || '-E1', left(c.libelle, 300), c.libelle, 0, 'CONTENU_INITIAL'
  FROM critere c WHERE c.referentiel_version_id = (SELECT s.nouvelle FROM _semis s JOIN referentiel r ON r.id = s.referentiel_id WHERE r.code = 'IFC_SFI') AND c.code = 'D2-05';

INSERT INTO critere (domaine_id, sous_domaine_id, referentiel_version_id, code, libelle, description, applicabilite, criticite_id, actif, coefficient_ponderation)
SELECT d.id, NULL, d.referentiel_version_id, 'D2-06', 'Les contrats respectent‑ils les normes de l’OIT concernant le travail des enfants ?', NULL, 'GENERALE'::type_applicabilite, (SELECT cr.id FROM criticite cr WHERE cr.code = 'MOYENNE'::niveau_criticite), true, 3.0
  FROM domaine d WHERE d.referentiel_version_id = (SELECT s.nouvelle FROM _semis s JOIN referentiel r ON r.id = s.referentiel_id WHERE r.code = 'IFC_SFI') AND d.code = 'D2';
INSERT INTO question (critere_id, referentiel_version_id, code, libelle, type, ordre, obligatoire, echelle_reponse)
SELECT c.id, c.referentiel_version_id, 'D2-06-Q1', 'Les contrats respectent‑ils les normes de l’OIT concernant le travail des enfants ?', 'FERMEE'::type_question, 1, true, 'MATURITE'
  FROM critere c WHERE c.referentiel_version_id = (SELECT s.nouvelle FROM _semis s JOIN referentiel r ON r.id = s.referentiel_id WHERE r.code = 'IFC_SFI') AND c.code = 'D2-06';
INSERT INTO exigence (critere_id, referentiel_version_id, code, intitule, enonce, ordre, origine)
SELECT c.id, c.referentiel_version_id, c.code || '-E1', left(c.libelle, 300), c.libelle, 0, 'CONTENU_INITIAL'
  FROM critere c WHERE c.referentiel_version_id = (SELECT s.nouvelle FROM _semis s JOIN referentiel r ON r.id = s.referentiel_id WHERE r.code = 'IFC_SFI') AND c.code = 'D2-06';

INSERT INTO critere (domaine_id, sous_domaine_id, referentiel_version_id, code, libelle, description, applicabilite, criticite_id, actif, coefficient_ponderation)
SELECT d.id, NULL, d.referentiel_version_id, 'D2-07', 'Les employés bénéficient‑ils de formations en matière de santé/sécurité au travail ?', NULL, 'GENERALE'::type_applicabilite, (SELECT cr.id FROM criticite cr WHERE cr.code = 'MOYENNE'::niveau_criticite), true, 3.0
  FROM domaine d WHERE d.referentiel_version_id = (SELECT s.nouvelle FROM _semis s JOIN referentiel r ON r.id = s.referentiel_id WHERE r.code = 'IFC_SFI') AND d.code = 'D2';
INSERT INTO question (critere_id, referentiel_version_id, code, libelle, type, ordre, obligatoire, echelle_reponse)
SELECT c.id, c.referentiel_version_id, 'D2-07-Q1', 'Les employés bénéficient‑ils de formations en matière de santé/sécurité au travail ?', 'FERMEE'::type_question, 1, true, 'MATURITE'
  FROM critere c WHERE c.referentiel_version_id = (SELECT s.nouvelle FROM _semis s JOIN referentiel r ON r.id = s.referentiel_id WHERE r.code = 'IFC_SFI') AND c.code = 'D2-07';
INSERT INTO exigence (critere_id, referentiel_version_id, code, intitule, enonce, ordre, origine)
SELECT c.id, c.referentiel_version_id, c.code || '-E1', left(c.libelle, 300), c.libelle, 0, 'CONTENU_INITIAL'
  FROM critere c WHERE c.referentiel_version_id = (SELECT s.nouvelle FROM _semis s JOIN referentiel r ON r.id = s.referentiel_id WHERE r.code = 'IFC_SFI') AND c.code = 'D2-07';

INSERT INTO critere (domaine_id, sous_domaine_id, referentiel_version_id, code, libelle, description, applicabilite, criticite_id, actif, coefficient_ponderation)
SELECT d.id, NULL, d.referentiel_version_id, 'D2-08', 'Y a‑t‑il un mécanisme de plainte pour les travailleurs ?', NULL, 'GENERALE'::type_applicabilite, (SELECT cr.id FROM criticite cr WHERE cr.code = 'MOYENNE'::niveau_criticite), true, 2.0
  FROM domaine d WHERE d.referentiel_version_id = (SELECT s.nouvelle FROM _semis s JOIN referentiel r ON r.id = s.referentiel_id WHERE r.code = 'IFC_SFI') AND d.code = 'D2';
INSERT INTO question (critere_id, referentiel_version_id, code, libelle, type, ordre, obligatoire, echelle_reponse)
SELECT c.id, c.referentiel_version_id, 'D2-08-Q1', 'Y a‑t‑il un mécanisme de plainte pour les travailleurs ?', 'FERMEE'::type_question, 1, true, 'MATURITE'
  FROM critere c WHERE c.referentiel_version_id = (SELECT s.nouvelle FROM _semis s JOIN referentiel r ON r.id = s.referentiel_id WHERE r.code = 'IFC_SFI') AND c.code = 'D2-08';
INSERT INTO exigence (critere_id, referentiel_version_id, code, intitule, enonce, ordre, origine)
SELECT c.id, c.referentiel_version_id, c.code || '-E1', left(c.libelle, 300), c.libelle, 0, 'CONTENU_INITIAL'
  FROM critere c WHERE c.referentiel_version_id = (SELECT s.nouvelle FROM _semis s JOIN referentiel r ON r.id = s.referentiel_id WHERE r.code = 'IFC_SFI') AND c.code = 'D2-08';

INSERT INTO critere (domaine_id, sous_domaine_id, referentiel_version_id, code, libelle, description, applicabilite, criticite_id, actif, coefficient_ponderation)
SELECT d.id, NULL, d.referentiel_version_id, 'D2-09', 'Y a‑t‑il un mécanisme de résolution de conflits pour les travailleurs ?', NULL, 'GENERALE'::type_applicabilite, (SELECT cr.id FROM criticite cr WHERE cr.code = 'MOYENNE'::niveau_criticite), true, 1.0
  FROM domaine d WHERE d.referentiel_version_id = (SELECT s.nouvelle FROM _semis s JOIN referentiel r ON r.id = s.referentiel_id WHERE r.code = 'IFC_SFI') AND d.code = 'D2';
INSERT INTO question (critere_id, referentiel_version_id, code, libelle, type, ordre, obligatoire, echelle_reponse)
SELECT c.id, c.referentiel_version_id, 'D2-09-Q1', 'Y a‑t‑il un mécanisme de résolution de conflits pour les travailleurs ?', 'FERMEE'::type_question, 1, true, 'MATURITE'
  FROM critere c WHERE c.referentiel_version_id = (SELECT s.nouvelle FROM _semis s JOIN referentiel r ON r.id = s.referentiel_id WHERE r.code = 'IFC_SFI') AND c.code = 'D2-09';
INSERT INTO exigence (critere_id, referentiel_version_id, code, intitule, enonce, ordre, origine)
SELECT c.id, c.referentiel_version_id, c.code || '-E1', left(c.libelle, 300), c.libelle, 0, 'CONTENU_INITIAL'
  FROM critere c WHERE c.referentiel_version_id = (SELECT s.nouvelle FROM _semis s JOIN referentiel r ON r.id = s.referentiel_id WHERE r.code = 'IFC_SFI') AND c.code = 'D2-09';

INSERT INTO domaine (referentiel_id, referentiel_version_id, code, nom, description, ordre)
VALUES ((SELECT id FROM referentiel WHERE code = 'IFC_SFI'), (SELECT s.nouvelle FROM _semis s JOIN referentiel r ON r.id = s.referentiel_id WHERE r.code = 'IFC_SFI'), 'D3', 'Utilisation rationnelle des ressources et prévention de la pollution', '3. Utilisation rationnelle des ressources et prévention de la pollution avec pour objectif principal Réduction des émissions et gestion des déchets', 3);
INSERT INTO critere (domaine_id, sous_domaine_id, referentiel_version_id, code, libelle, description, applicabilite, criticite_id, actif, coefficient_ponderation)
SELECT d.id, NULL, d.referentiel_version_id, 'D3-10', 'L’entreprise mesure‑t‑elle sa consommation d’énergie avec l''ambiiton de la maîtriser, ou la réduire ?', NULL, 'GENERALE'::type_applicabilite, (SELECT cr.id FROM criticite cr WHERE cr.code = 'MOYENNE'::niveau_criticite), true, 3.0
  FROM domaine d WHERE d.referentiel_version_id = (SELECT s.nouvelle FROM _semis s JOIN referentiel r ON r.id = s.referentiel_id WHERE r.code = 'IFC_SFI') AND d.code = 'D3';
INSERT INTO question (critere_id, referentiel_version_id, code, libelle, type, ordre, obligatoire, echelle_reponse)
SELECT c.id, c.referentiel_version_id, 'D3-10-Q1', 'L’entreprise mesure‑t‑elle sa consommation d’énergie avec l''ambiiton de la maîtriser, ou la réduire ?', 'FERMEE'::type_question, 1, true, 'MATURITE'
  FROM critere c WHERE c.referentiel_version_id = (SELECT s.nouvelle FROM _semis s JOIN referentiel r ON r.id = s.referentiel_id WHERE r.code = 'IFC_SFI') AND c.code = 'D3-10';
INSERT INTO exigence (critere_id, referentiel_version_id, code, intitule, enonce, ordre, origine)
SELECT c.id, c.referentiel_version_id, c.code || '-E1', left(c.libelle, 300), c.libelle, 0, 'CONTENU_INITIAL'
  FROM critere c WHERE c.referentiel_version_id = (SELECT s.nouvelle FROM _semis s JOIN referentiel r ON r.id = s.referentiel_id WHERE r.code = 'IFC_SFI') AND c.code = 'D3-10';

INSERT INTO critere (domaine_id, sous_domaine_id, referentiel_version_id, code, libelle, description, applicabilite, criticite_id, actif, coefficient_ponderation)
SELECT d.id, NULL, d.referentiel_version_id, 'D3-11', 'L’entreprise mesure‑t‑elle sa consommation d’eau avec l''ambiiton de la maîtriser, ou la réduire ?', NULL, 'GENERALE'::type_applicabilite, (SELECT cr.id FROM criticite cr WHERE cr.code = 'MOYENNE'::niveau_criticite), true, 3.0
  FROM domaine d WHERE d.referentiel_version_id = (SELECT s.nouvelle FROM _semis s JOIN referentiel r ON r.id = s.referentiel_id WHERE r.code = 'IFC_SFI') AND d.code = 'D3';
INSERT INTO question (critere_id, referentiel_version_id, code, libelle, type, ordre, obligatoire, echelle_reponse)
SELECT c.id, c.referentiel_version_id, 'D3-11-Q1', 'L’entreprise mesure‑t‑elle sa consommation d’eau avec l''ambiiton de la maîtriser, ou la réduire ?', 'FERMEE'::type_question, 1, true, 'MATURITE'
  FROM critere c WHERE c.referentiel_version_id = (SELECT s.nouvelle FROM _semis s JOIN referentiel r ON r.id = s.referentiel_id WHERE r.code = 'IFC_SFI') AND c.code = 'D3-11';
INSERT INTO exigence (critere_id, referentiel_version_id, code, intitule, enonce, ordre, origine)
SELECT c.id, c.referentiel_version_id, c.code || '-E1', left(c.libelle, 300), c.libelle, 0, 'CONTENU_INITIAL'
  FROM critere c WHERE c.referentiel_version_id = (SELECT s.nouvelle FROM _semis s JOIN referentiel r ON r.id = s.referentiel_id WHERE r.code = 'IFC_SFI') AND c.code = 'D3-11';

INSERT INTO critere (domaine_id, sous_domaine_id, referentiel_version_id, code, libelle, description, applicabilite, criticite_id, actif, coefficient_ponderation)
SELECT d.id, NULL, d.referentiel_version_id, 'D3-14', 'Les différents déchets de l''entreprise sont‑ils triés ?', NULL, 'GENERALE'::type_applicabilite, (SELECT cr.id FROM criticite cr WHERE cr.code = 'MOYENNE'::niveau_criticite), true, 1.0
  FROM domaine d WHERE d.referentiel_version_id = (SELECT s.nouvelle FROM _semis s JOIN referentiel r ON r.id = s.referentiel_id WHERE r.code = 'IFC_SFI') AND d.code = 'D3';
INSERT INTO question (critere_id, referentiel_version_id, code, libelle, type, ordre, obligatoire, echelle_reponse)
SELECT c.id, c.referentiel_version_id, 'D3-14-Q1', 'Les différents déchets de l''entreprise sont‑ils triés ?', 'FERMEE'::type_question, 1, true, 'MATURITE'
  FROM critere c WHERE c.referentiel_version_id = (SELECT s.nouvelle FROM _semis s JOIN referentiel r ON r.id = s.referentiel_id WHERE r.code = 'IFC_SFI') AND c.code = 'D3-14';
INSERT INTO exigence (critere_id, referentiel_version_id, code, intitule, enonce, ordre, origine)
SELECT c.id, c.referentiel_version_id, c.code || '-E1', left(c.libelle, 300), c.libelle, 0, 'CONTENU_INITIAL'
  FROM critere c WHERE c.referentiel_version_id = (SELECT s.nouvelle FROM _semis s JOIN referentiel r ON r.id = s.referentiel_id WHERE r.code = 'IFC_SFI') AND c.code = 'D3-14';

INSERT INTO critere (domaine_id, sous_domaine_id, referentiel_version_id, code, libelle, description, applicabilite, criticite_id, actif, coefficient_ponderation)
SELECT d.id, NULL, d.referentiel_version_id, 'D3-15', 'Les différents déchets de l''entreprise sont‑ils recyclés ou valorisés ?', NULL, 'GENERALE'::type_applicabilite, (SELECT cr.id FROM criticite cr WHERE cr.code = 'MOYENNE'::niveau_criticite), true, 3.0
  FROM domaine d WHERE d.referentiel_version_id = (SELECT s.nouvelle FROM _semis s JOIN referentiel r ON r.id = s.referentiel_id WHERE r.code = 'IFC_SFI') AND d.code = 'D3';
INSERT INTO question (critere_id, referentiel_version_id, code, libelle, type, ordre, obligatoire, echelle_reponse)
SELECT c.id, c.referentiel_version_id, 'D3-15-Q1', 'Les différents déchets de l''entreprise sont‑ils recyclés ou valorisés ?', 'FERMEE'::type_question, 1, true, 'MATURITE'
  FROM critere c WHERE c.referentiel_version_id = (SELECT s.nouvelle FROM _semis s JOIN referentiel r ON r.id = s.referentiel_id WHERE r.code = 'IFC_SFI') AND c.code = 'D3-15';
INSERT INTO exigence (critere_id, referentiel_version_id, code, intitule, enonce, ordre, origine)
SELECT c.id, c.referentiel_version_id, c.code || '-E1', left(c.libelle, 300), c.libelle, 0, 'CONTENU_INITIAL'
  FROM critere c WHERE c.referentiel_version_id = (SELECT s.nouvelle FROM _semis s JOIN referentiel r ON r.id = s.referentiel_id WHERE r.code = 'IFC_SFI') AND c.code = 'D3-15';

INSERT INTO domaine (referentiel_id, referentiel_version_id, code, nom, description, ordre)
VALUES ((SELECT id FROM referentiel WHERE code = 'IFC_SFI'), (SELECT s.nouvelle FROM _semis s JOIN referentiel r ON r.id = s.referentiel_id WHERE r.code = 'IFC_SFI'), 'D4', 'Santé, sécurité et sûreté des communautés', '4. Santé, sécurité et sûreté des communautés avec pour objectif principal Protéger les populations locales contre les risques', 4);
INSERT INTO critere (domaine_id, sous_domaine_id, referentiel_version_id, code, libelle, description, applicabilite, criticite_id, actif, coefficient_ponderation)
SELECT d.id, NULL, d.referentiel_version_id, 'D4-16', 'L’entreprise a‑t‑elle un plan d’urgence en cas d’accident industriel ?', NULL, 'GENERALE'::type_applicabilite, (SELECT cr.id FROM criticite cr WHERE cr.code = 'MOYENNE'::niveau_criticite), true, 3.0
  FROM domaine d WHERE d.referentiel_version_id = (SELECT s.nouvelle FROM _semis s JOIN referentiel r ON r.id = s.referentiel_id WHERE r.code = 'IFC_SFI') AND d.code = 'D4';
INSERT INTO question (critere_id, referentiel_version_id, code, libelle, type, ordre, obligatoire, echelle_reponse)
SELECT c.id, c.referentiel_version_id, 'D4-16-Q1', 'L’entreprise a‑t‑elle un plan d’urgence en cas d’accident industriel ?', 'FERMEE'::type_question, 1, true, 'MATURITE'
  FROM critere c WHERE c.referentiel_version_id = (SELECT s.nouvelle FROM _semis s JOIN referentiel r ON r.id = s.referentiel_id WHERE r.code = 'IFC_SFI') AND c.code = 'D4-16';
INSERT INTO exigence (critere_id, referentiel_version_id, code, intitule, enonce, ordre, origine)
SELECT c.id, c.referentiel_version_id, c.code || '-E1', left(c.libelle, 300), c.libelle, 0, 'CONTENU_INITIAL'
  FROM critere c WHERE c.referentiel_version_id = (SELECT s.nouvelle FROM _semis s JOIN referentiel r ON r.id = s.referentiel_id WHERE r.code = 'IFC_SFI') AND c.code = 'D4-16';

INSERT INTO critere (domaine_id, sous_domaine_id, referentiel_version_id, code, libelle, description, applicabilite, criticite_id, actif, coefficient_ponderation)
SELECT d.id, NULL, d.referentiel_version_id, 'D4-17', 'Les communautés locales sont‑elles informées des risques liés aux activités de l''entreprise ?', NULL, 'GENERALE'::type_applicabilite, (SELECT cr.id FROM criticite cr WHERE cr.code = 'MOYENNE'::niveau_criticite), true, 1.0
  FROM domaine d WHERE d.referentiel_version_id = (SELECT s.nouvelle FROM _semis s JOIN referentiel r ON r.id = s.referentiel_id WHERE r.code = 'IFC_SFI') AND d.code = 'D4';
INSERT INTO question (critere_id, referentiel_version_id, code, libelle, type, ordre, obligatoire, echelle_reponse)
SELECT c.id, c.referentiel_version_id, 'D4-17-Q1', 'Les communautés locales sont‑elles informées des risques liés aux activités de l''entreprise ?', 'FERMEE'::type_question, 1, true, 'MATURITE'
  FROM critere c WHERE c.referentiel_version_id = (SELECT s.nouvelle FROM _semis s JOIN referentiel r ON r.id = s.referentiel_id WHERE r.code = 'IFC_SFI') AND c.code = 'D4-17';
INSERT INTO exigence (critere_id, referentiel_version_id, code, intitule, enonce, ordre, origine)
SELECT c.id, c.referentiel_version_id, c.code || '-E1', left(c.libelle, 300), c.libelle, 0, 'CONTENU_INITIAL'
  FROM critere c WHERE c.referentiel_version_id = (SELECT s.nouvelle FROM _semis s JOIN referentiel r ON r.id = s.referentiel_id WHERE r.code = 'IFC_SFI') AND c.code = 'D4-17';

INSERT INTO critere (domaine_id, sous_domaine_id, referentiel_version_id, code, libelle, description, applicabilite, criticite_id, actif, coefficient_ponderation)
SELECT d.id, NULL, d.referentiel_version_id, 'D4-18', 'Des mesures de sécurité (signalisation, clôtures, gardiennage) sont‑elles en place ?', NULL, 'GENERALE'::type_applicabilite, (SELECT cr.id FROM criticite cr WHERE cr.code = 'MOYENNE'::niveau_criticite), true, 3.0
  FROM domaine d WHERE d.referentiel_version_id = (SELECT s.nouvelle FROM _semis s JOIN referentiel r ON r.id = s.referentiel_id WHERE r.code = 'IFC_SFI') AND d.code = 'D4';
INSERT INTO question (critere_id, referentiel_version_id, code, libelle, type, ordre, obligatoire, echelle_reponse)
SELECT c.id, c.referentiel_version_id, 'D4-18-Q1', 'Des mesures de sécurité (signalisation, clôtures, gardiennage) sont‑elles en place ?', 'FERMEE'::type_question, 1, true, 'MATURITE'
  FROM critere c WHERE c.referentiel_version_id = (SELECT s.nouvelle FROM _semis s JOIN referentiel r ON r.id = s.referentiel_id WHERE r.code = 'IFC_SFI') AND c.code = 'D4-18';
INSERT INTO exigence (critere_id, referentiel_version_id, code, intitule, enonce, ordre, origine)
SELECT c.id, c.referentiel_version_id, c.code || '-E1', left(c.libelle, 300), c.libelle, 0, 'CONTENU_INITIAL'
  FROM critere c WHERE c.referentiel_version_id = (SELECT s.nouvelle FROM _semis s JOIN referentiel r ON r.id = s.referentiel_id WHERE r.code = 'IFC_SFI') AND c.code = 'D4-18';

INSERT INTO domaine (referentiel_id, referentiel_version_id, code, nom, description, ordre)
VALUES ((SELECT id FROM referentiel WHERE code = 'IFC_SFI'), (SELECT s.nouvelle FROM _semis s JOIN referentiel r ON r.id = s.referentiel_id WHERE r.code = 'IFC_SFI'), 'D5', 'Acquisition de terres et réinstallation involontaire', '5. Acquisition de terres et réinstallation involontaire avec pour objectif principal Minimiser les déplacements forcés et indemniser équitablement', 5);
INSERT INTO critere (domaine_id, sous_domaine_id, referentiel_version_id, code, libelle, description, applicabilite, criticite_id, actif, coefficient_ponderation)
SELECT d.id, NULL, d.referentiel_version_id, 'D5-19', 'Les populations affectées sont‑elles consultées avant toute acquisition ?', NULL, 'GENERALE'::type_applicabilite, (SELECT cr.id FROM criticite cr WHERE cr.code = 'MOYENNE'::niveau_criticite), true, 1.0
  FROM domaine d WHERE d.referentiel_version_id = (SELECT s.nouvelle FROM _semis s JOIN referentiel r ON r.id = s.referentiel_id WHERE r.code = 'IFC_SFI') AND d.code = 'D5';
INSERT INTO question (critere_id, referentiel_version_id, code, libelle, type, ordre, obligatoire, echelle_reponse)
SELECT c.id, c.referentiel_version_id, 'D5-19-Q1', 'Les populations affectées sont‑elles consultées avant toute acquisition ?', 'FERMEE'::type_question, 1, true, 'MATURITE'
  FROM critere c WHERE c.referentiel_version_id = (SELECT s.nouvelle FROM _semis s JOIN referentiel r ON r.id = s.referentiel_id WHERE r.code = 'IFC_SFI') AND c.code = 'D5-19';
INSERT INTO exigence (critere_id, referentiel_version_id, code, intitule, enonce, ordre, origine)
SELECT c.id, c.referentiel_version_id, c.code || '-E1', left(c.libelle, 300), c.libelle, 0, 'CONTENU_INITIAL'
  FROM critere c WHERE c.referentiel_version_id = (SELECT s.nouvelle FROM _semis s JOIN referentiel r ON r.id = s.referentiel_id WHERE r.code = 'IFC_SFI') AND c.code = 'D5-19';

INSERT INTO critere (domaine_id, sous_domaine_id, referentiel_version_id, code, libelle, description, applicabilite, criticite_id, actif, coefficient_ponderation)
SELECT d.id, NULL, d.referentiel_version_id, 'D5-20', 'Existe‑t‑il un plan de compensation équitable et transparent ?', NULL, 'GENERALE'::type_applicabilite, (SELECT cr.id FROM criticite cr WHERE cr.code = 'MOYENNE'::niveau_criticite), true, 2.0
  FROM domaine d WHERE d.referentiel_version_id = (SELECT s.nouvelle FROM _semis s JOIN referentiel r ON r.id = s.referentiel_id WHERE r.code = 'IFC_SFI') AND d.code = 'D5';
INSERT INTO question (critere_id, referentiel_version_id, code, libelle, type, ordre, obligatoire, echelle_reponse)
SELECT c.id, c.referentiel_version_id, 'D5-20-Q1', 'Existe‑t‑il un plan de compensation équitable et transparent ?', 'FERMEE'::type_question, 1, true, 'MATURITE'
  FROM critere c WHERE c.referentiel_version_id = (SELECT s.nouvelle FROM _semis s JOIN referentiel r ON r.id = s.referentiel_id WHERE r.code = 'IFC_SFI') AND c.code = 'D5-20';
INSERT INTO exigence (critere_id, referentiel_version_id, code, intitule, enonce, ordre, origine)
SELECT c.id, c.referentiel_version_id, c.code || '-E1', left(c.libelle, 300), c.libelle, 0, 'CONTENU_INITIAL'
  FROM critere c WHERE c.referentiel_version_id = (SELECT s.nouvelle FROM _semis s JOIN referentiel r ON r.id = s.referentiel_id WHERE r.code = 'IFC_SFI') AND c.code = 'D5-20';

INSERT INTO critere (domaine_id, sous_domaine_id, referentiel_version_id, code, libelle, description, applicabilite, criticite_id, actif, coefficient_ponderation)
SELECT d.id, NULL, d.referentiel_version_id, 'D5-21', 'Le suivi des personnes réinstallées est‑il assuré ?', NULL, 'GENERALE'::type_applicabilite, (SELECT cr.id FROM criticite cr WHERE cr.code = 'MOYENNE'::niveau_criticite), true, 2.0
  FROM domaine d WHERE d.referentiel_version_id = (SELECT s.nouvelle FROM _semis s JOIN referentiel r ON r.id = s.referentiel_id WHERE r.code = 'IFC_SFI') AND d.code = 'D5';
INSERT INTO question (critere_id, referentiel_version_id, code, libelle, type, ordre, obligatoire, echelle_reponse)
SELECT c.id, c.referentiel_version_id, 'D5-21-Q1', 'Le suivi des personnes réinstallées est‑il assuré ?', 'FERMEE'::type_question, 1, true, 'MATURITE'
  FROM critere c WHERE c.referentiel_version_id = (SELECT s.nouvelle FROM _semis s JOIN referentiel r ON r.id = s.referentiel_id WHERE r.code = 'IFC_SFI') AND c.code = 'D5-21';
INSERT INTO exigence (critere_id, referentiel_version_id, code, intitule, enonce, ordre, origine)
SELECT c.id, c.referentiel_version_id, c.code || '-E1', left(c.libelle, 300), c.libelle, 0, 'CONTENU_INITIAL'
  FROM critere c WHERE c.referentiel_version_id = (SELECT s.nouvelle FROM _semis s JOIN referentiel r ON r.id = s.referentiel_id WHERE r.code = 'IFC_SFI') AND c.code = 'D5-21';

INSERT INTO domaine (referentiel_id, referentiel_version_id, code, nom, description, ordre)
VALUES ((SELECT id FROM referentiel WHERE code = 'IFC_SFI'), (SELECT s.nouvelle FROM _semis s JOIN referentiel r ON r.id = s.referentiel_id WHERE r.code = 'IFC_SFI'), 'D6', 'Conservation de la biodiversité et gestion durable des ressources naturelles vivantes', '6. Conservation de la biodiversité et gestion durable des ressources naturelles vivantes avec pour objectif principal Protéger les écosystèmes et espèces', 6);
INSERT INTO critere (domaine_id, sous_domaine_id, referentiel_version_id, code, libelle, description, applicabilite, criticite_id, actif, coefficient_ponderation)
SELECT d.id, NULL, d.referentiel_version_id, 'D6-22', 'Aavant le lancement de tout projet ou toute activité dans une zone donénée, l’entreprise identifie-t-elle les zones sensibles ou protégées ?', NULL, 'GENERALE'::type_applicabilite, (SELECT cr.id FROM criticite cr WHERE cr.code = 'MOYENNE'::niveau_criticite), true, 2.0
  FROM domaine d WHERE d.referentiel_version_id = (SELECT s.nouvelle FROM _semis s JOIN referentiel r ON r.id = s.referentiel_id WHERE r.code = 'IFC_SFI') AND d.code = 'D6';
INSERT INTO question (critere_id, referentiel_version_id, code, libelle, type, ordre, obligatoire, echelle_reponse)
SELECT c.id, c.referentiel_version_id, 'D6-22-Q1', 'Aavant le lancement de tout projet ou toute activité dans une zone donénée, l’entreprise identifie-t-elle les zones sensibles ou protégées ?', 'FERMEE'::type_question, 1, true, 'MATURITE'
  FROM critere c WHERE c.referentiel_version_id = (SELECT s.nouvelle FROM _semis s JOIN referentiel r ON r.id = s.referentiel_id WHERE r.code = 'IFC_SFI') AND c.code = 'D6-22';
INSERT INTO exigence (critere_id, referentiel_version_id, code, intitule, enonce, ordre, origine)
SELECT c.id, c.referentiel_version_id, c.code || '-E1', left(c.libelle, 300), c.libelle, 0, 'CONTENU_INITIAL'
  FROM critere c WHERE c.referentiel_version_id = (SELECT s.nouvelle FROM _semis s JOIN referentiel r ON r.id = s.referentiel_id WHERE r.code = 'IFC_SFI') AND c.code = 'D6-22';

INSERT INTO critere (domaine_id, sous_domaine_id, referentiel_version_id, code, libelle, description, applicabilite, criticite_id, actif, coefficient_ponderation)
SELECT d.id, NULL, d.referentiel_version_id, 'D6-23', 'L''entreprise prévoit-elle des mesures de restauration écologique dans le cadre de ses activités lorsque des zones à forte biodiversité et ressources naturelles sont touchées', NULL, 'GENERALE'::type_applicabilite, (SELECT cr.id FROM criticite cr WHERE cr.code = 'MOYENNE'::niveau_criticite), true, 3.0
  FROM domaine d WHERE d.referentiel_version_id = (SELECT s.nouvelle FROM _semis s JOIN referentiel r ON r.id = s.referentiel_id WHERE r.code = 'IFC_SFI') AND d.code = 'D6';
INSERT INTO question (critere_id, referentiel_version_id, code, libelle, type, ordre, obligatoire, echelle_reponse)
SELECT c.id, c.referentiel_version_id, 'D6-23-Q1', 'L''entreprise prévoit-elle des mesures de restauration écologique dans le cadre de ses activités lorsque des zones à forte biodiversité et ressources naturelles sont touchées', 'FERMEE'::type_question, 1, true, 'MATURITE'
  FROM critere c WHERE c.referentiel_version_id = (SELECT s.nouvelle FROM _semis s JOIN referentiel r ON r.id = s.referentiel_id WHERE r.code = 'IFC_SFI') AND c.code = 'D6-23';
INSERT INTO exigence (critere_id, referentiel_version_id, code, intitule, enonce, ordre, origine)
SELECT c.id, c.referentiel_version_id, c.code || '-E1', left(c.libelle, 300), c.libelle, 0, 'CONTENU_INITIAL'
  FROM critere c WHERE c.referentiel_version_id = (SELECT s.nouvelle FROM _semis s JOIN referentiel r ON r.id = s.referentiel_id WHERE r.code = 'IFC_SFI') AND c.code = 'D6-23';

INSERT INTO critere (domaine_id, sous_domaine_id, referentiel_version_id, code, libelle, description, applicabilite, criticite_id, actif, coefficient_ponderation)
SELECT d.id, NULL, d.referentiel_version_id, 'D6-26', 'Les ressources naturelles pêche sont‑elles exploitées de manière durable ? Comment ?', NULL, 'GENERALE'::type_applicabilite, (SELECT cr.id FROM criticite cr WHERE cr.code = 'MOYENNE'::niveau_criticite), true, 3.0
  FROM domaine d WHERE d.referentiel_version_id = (SELECT s.nouvelle FROM _semis s JOIN referentiel r ON r.id = s.referentiel_id WHERE r.code = 'IFC_SFI') AND d.code = 'D6';
INSERT INTO question (critere_id, referentiel_version_id, code, libelle, type, ordre, obligatoire, echelle_reponse)
SELECT c.id, c.referentiel_version_id, 'D6-26-Q1', 'Les ressources naturelles pêche sont‑elles exploitées de manière durable ? Comment ?', 'FERMEE'::type_question, 1, true, 'MATURITE'
  FROM critere c WHERE c.referentiel_version_id = (SELECT s.nouvelle FROM _semis s JOIN referentiel r ON r.id = s.referentiel_id WHERE r.code = 'IFC_SFI') AND c.code = 'D6-26';
INSERT INTO exigence (critere_id, referentiel_version_id, code, intitule, enonce, ordre, origine)
SELECT c.id, c.referentiel_version_id, c.code || '-E1', left(c.libelle, 300), c.libelle, 0, 'CONTENU_INITIAL'
  FROM critere c WHERE c.referentiel_version_id = (SELECT s.nouvelle FROM _semis s JOIN referentiel r ON r.id = s.referentiel_id WHERE r.code = 'IFC_SFI') AND c.code = 'D6-26';

INSERT INTO domaine (referentiel_id, referentiel_version_id, code, nom, description, ordre)
VALUES ((SELECT id FROM referentiel WHERE code = 'IFC_SFI'), (SELECT s.nouvelle FROM _semis s JOIN referentiel r ON r.id = s.referentiel_id WHERE r.code = 'IFC_SFI'), 'D7', 'Peuples autochtones', '7. Peuples autochtones avec pour objectif principal Respect des droits et consentement libre, préalable et éclairé (CLPE)', 7);
INSERT INTO critere (domaine_id, sous_domaine_id, referentiel_version_id, code, libelle, description, applicabilite, criticite_id, actif, coefficient_ponderation)
SELECT d.id, NULL, d.referentiel_version_id, 'D7-27', 'Les communautés autochtones sont‑elles consultées avec consentement libre, préalable et éclairé (CLPE) ?', NULL, 'GENERALE'::type_applicabilite, (SELECT cr.id FROM criticite cr WHERE cr.code = 'MOYENNE'::niveau_criticite), true, 2.0
  FROM domaine d WHERE d.referentiel_version_id = (SELECT s.nouvelle FROM _semis s JOIN referentiel r ON r.id = s.referentiel_id WHERE r.code = 'IFC_SFI') AND d.code = 'D7';
INSERT INTO question (critere_id, referentiel_version_id, code, libelle, type, ordre, obligatoire, echelle_reponse)
SELECT c.id, c.referentiel_version_id, 'D7-27-Q1', 'Les communautés autochtones sont‑elles consultées avec consentement libre, préalable et éclairé (CLPE) ?', 'FERMEE'::type_question, 1, true, 'MATURITE'
  FROM critere c WHERE c.referentiel_version_id = (SELECT s.nouvelle FROM _semis s JOIN referentiel r ON r.id = s.referentiel_id WHERE r.code = 'IFC_SFI') AND c.code = 'D7-27';
INSERT INTO exigence (critere_id, referentiel_version_id, code, intitule, enonce, ordre, origine)
SELECT c.id, c.referentiel_version_id, c.code || '-E1', left(c.libelle, 300), c.libelle, 0, 'CONTENU_INITIAL'
  FROM critere c WHERE c.referentiel_version_id = (SELECT s.nouvelle FROM _semis s JOIN referentiel r ON r.id = s.referentiel_id WHERE r.code = 'IFC_SFI') AND c.code = 'D7-27';

INSERT INTO critere (domaine_id, sous_domaine_id, referentiel_version_id, code, libelle, description, applicabilite, criticite_id, actif, coefficient_ponderation)
SELECT d.id, NULL, d.referentiel_version_id, 'D7-28', 'Les projets respectent‑ils les traditions et cultures locales ?', NULL, 'GENERALE'::type_applicabilite, (SELECT cr.id FROM criticite cr WHERE cr.code = 'MOYENNE'::niveau_criticite), true, 3.0
  FROM domaine d WHERE d.referentiel_version_id = (SELECT s.nouvelle FROM _semis s JOIN referentiel r ON r.id = s.referentiel_id WHERE r.code = 'IFC_SFI') AND d.code = 'D7';
INSERT INTO question (critere_id, referentiel_version_id, code, libelle, type, ordre, obligatoire, echelle_reponse)
SELECT c.id, c.referentiel_version_id, 'D7-28-Q1', 'Les projets respectent‑ils les traditions et cultures locales ?', 'FERMEE'::type_question, 1, true, 'MATURITE'
  FROM critere c WHERE c.referentiel_version_id = (SELECT s.nouvelle FROM _semis s JOIN referentiel r ON r.id = s.referentiel_id WHERE r.code = 'IFC_SFI') AND c.code = 'D7-28';
INSERT INTO exigence (critere_id, referentiel_version_id, code, intitule, enonce, ordre, origine)
SELECT c.id, c.referentiel_version_id, c.code || '-E1', left(c.libelle, 300), c.libelle, 0, 'CONTENU_INITIAL'
  FROM critere c WHERE c.referentiel_version_id = (SELECT s.nouvelle FROM _semis s JOIN referentiel r ON r.id = s.referentiel_id WHERE r.code = 'IFC_SFI') AND c.code = 'D7-28';

INSERT INTO critere (domaine_id, sous_domaine_id, referentiel_version_id, code, libelle, description, applicabilite, criticite_id, actif, coefficient_ponderation)
SELECT d.id, NULL, d.referentiel_version_id, 'D7-29', 'Des bénéfices directs (emploi, infrastructures) sont‑ils partagés avec ces communautés ?', NULL, 'GENERALE'::type_applicabilite, (SELECT cr.id FROM criticite cr WHERE cr.code = 'MOYENNE'::niveau_criticite), true, 3.0
  FROM domaine d WHERE d.referentiel_version_id = (SELECT s.nouvelle FROM _semis s JOIN referentiel r ON r.id = s.referentiel_id WHERE r.code = 'IFC_SFI') AND d.code = 'D7';
INSERT INTO question (critere_id, referentiel_version_id, code, libelle, type, ordre, obligatoire, echelle_reponse)
SELECT c.id, c.referentiel_version_id, 'D7-29-Q1', 'Des bénéfices directs (emploi, infrastructures) sont‑ils partagés avec ces communautés ?', 'FERMEE'::type_question, 1, true, 'MATURITE'
  FROM critere c WHERE c.referentiel_version_id = (SELECT s.nouvelle FROM _semis s JOIN referentiel r ON r.id = s.referentiel_id WHERE r.code = 'IFC_SFI') AND c.code = 'D7-29';
INSERT INTO exigence (critere_id, referentiel_version_id, code, intitule, enonce, ordre, origine)
SELECT c.id, c.referentiel_version_id, c.code || '-E1', left(c.libelle, 300), c.libelle, 0, 'CONTENU_INITIAL'
  FROM critere c WHERE c.referentiel_version_id = (SELECT s.nouvelle FROM _semis s JOIN referentiel r ON r.id = s.referentiel_id WHERE r.code = 'IFC_SFI') AND c.code = 'D7-29';

INSERT INTO domaine (referentiel_id, referentiel_version_id, code, nom, description, ordre)
VALUES ((SELECT id FROM referentiel WHERE code = 'IFC_SFI'), (SELECT s.nouvelle FROM _semis s JOIN referentiel r ON r.id = s.referentiel_id WHERE r.code = 'IFC_SFI'), 'D8', 'Patrimoine culturel', '8. Patrimoine culturel avec pour objectif principal Préserver les sites et traditions', 8);
INSERT INTO critere (domaine_id, sous_domaine_id, referentiel_version_id, code, libelle, description, applicabilite, criticite_id, actif, coefficient_ponderation)
SELECT d.id, NULL, d.referentiel_version_id, 'D8-30', 'L’entreprise a‑t‑elle identifié les sites archéologiques ou historiques proches de ses activités ?', NULL, 'GENERALE'::type_applicabilite, (SELECT cr.id FROM criticite cr WHERE cr.code = 'MOYENNE'::niveau_criticite), true, 2.0
  FROM domaine d WHERE d.referentiel_version_id = (SELECT s.nouvelle FROM _semis s JOIN referentiel r ON r.id = s.referentiel_id WHERE r.code = 'IFC_SFI') AND d.code = 'D8';
INSERT INTO question (critere_id, referentiel_version_id, code, libelle, type, ordre, obligatoire, echelle_reponse)
SELECT c.id, c.referentiel_version_id, 'D8-30-Q1', 'L’entreprise a‑t‑elle identifié les sites archéologiques ou historiques proches de ses activités ?', 'FERMEE'::type_question, 1, true, 'MATURITE'
  FROM critere c WHERE c.referentiel_version_id = (SELECT s.nouvelle FROM _semis s JOIN referentiel r ON r.id = s.referentiel_id WHERE r.code = 'IFC_SFI') AND c.code = 'D8-30';
INSERT INTO exigence (critere_id, referentiel_version_id, code, intitule, enonce, ordre, origine)
SELECT c.id, c.referentiel_version_id, c.code || '-E1', left(c.libelle, 300), c.libelle, 0, 'CONTENU_INITIAL'
  FROM critere c WHERE c.referentiel_version_id = (SELECT s.nouvelle FROM _semis s JOIN referentiel r ON r.id = s.referentiel_id WHERE r.code = 'IFC_SFI') AND c.code = 'D8-30';

INSERT INTO critere (domaine_id, sous_domaine_id, referentiel_version_id, code, libelle, description, applicabilite, criticite_id, actif, coefficient_ponderation)
SELECT d.id, NULL, d.referentiel_version_id, 'D8-31', 'Existe‑t‑il un plan de sauvegarde en cas de découverte fortuite ?', NULL, 'GENERALE'::type_applicabilite, (SELECT cr.id FROM criticite cr WHERE cr.code = 'MOYENNE'::niveau_criticite), true, 3.0
  FROM domaine d WHERE d.referentiel_version_id = (SELECT s.nouvelle FROM _semis s JOIN referentiel r ON r.id = s.referentiel_id WHERE r.code = 'IFC_SFI') AND d.code = 'D8';
INSERT INTO question (critere_id, referentiel_version_id, code, libelle, type, ordre, obligatoire, echelle_reponse)
SELECT c.id, c.referentiel_version_id, 'D8-31-Q1', 'Existe‑t‑il un plan de sauvegarde en cas de découverte fortuite ?', 'FERMEE'::type_question, 1, true, 'MATURITE'
  FROM critere c WHERE c.referentiel_version_id = (SELECT s.nouvelle FROM _semis s JOIN referentiel r ON r.id = s.referentiel_id WHERE r.code = 'IFC_SFI') AND c.code = 'D8-31';
INSERT INTO exigence (critere_id, referentiel_version_id, code, intitule, enonce, ordre, origine)
SELECT c.id, c.referentiel_version_id, c.code || '-E1', left(c.libelle, 300), c.libelle, 0, 'CONTENU_INITIAL'
  FROM critere c WHERE c.referentiel_version_id = (SELECT s.nouvelle FROM _semis s JOIN referentiel r ON r.id = s.referentiel_id WHERE r.code = 'IFC_SFI') AND c.code = 'D8-31';

INSERT INTO critere (domaine_id, sous_domaine_id, referentiel_version_id, code, libelle, description, applicabilite, criticite_id, actif, coefficient_ponderation)
SELECT d.id, NULL, d.referentiel_version_id, 'D8-32', 'Les traditions culturelles locales sont‑elles respectées et valorisées ?', NULL, 'GENERALE'::type_applicabilite, (SELECT cr.id FROM criticite cr WHERE cr.code = 'MOYENNE'::niveau_criticite), true, 3.0
  FROM domaine d WHERE d.referentiel_version_id = (SELECT s.nouvelle FROM _semis s JOIN referentiel r ON r.id = s.referentiel_id WHERE r.code = 'IFC_SFI') AND d.code = 'D8';
INSERT INTO question (critere_id, referentiel_version_id, code, libelle, type, ordre, obligatoire, echelle_reponse)
SELECT c.id, c.referentiel_version_id, 'D8-32-Q1', 'Les traditions culturelles locales sont‑elles respectées et valorisées ?', 'FERMEE'::type_question, 1, true, 'MATURITE'
  FROM critere c WHERE c.referentiel_version_id = (SELECT s.nouvelle FROM _semis s JOIN referentiel r ON r.id = s.referentiel_id WHERE r.code = 'IFC_SFI') AND c.code = 'D8-32';
INSERT INTO exigence (critere_id, referentiel_version_id, code, intitule, enonce, ordre, origine)
SELECT c.id, c.referentiel_version_id, c.code || '-E1', left(c.libelle, 300), c.libelle, 0, 'CONTENU_INITIAL'
  FROM critere c WHERE c.referentiel_version_id = (SELECT s.nouvelle FROM _semis s JOIN referentiel r ON r.id = s.referentiel_id WHERE r.code = 'IFC_SFI') AND c.code = 'D8-32';


-- ======================= PRI =======================

INSERT INTO domaine (referentiel_id, referentiel_version_id, code, nom, description, ordre)
VALUES ((SELECT id FROM referentiel WHERE code = 'PRI'), (SELECT s.nouvelle FROM _semis s JOIN referentiel r ON r.id = s.referentiel_id WHERE r.code = 'PRI'), 'D1', 'Incorporer les enjeux ESG dans l’analyse et la décision d’investissement', '1. Incorporer les enjeux ESG dans l’analyse et la décision d’investissement avec pour objectif principal Intégrer les risques / opportunités ESG dans les portefeuilles', 1);
INSERT INTO critere (domaine_id, sous_domaine_id, referentiel_version_id, code, libelle, description, applicabilite, criticite_id, actif, coefficient_ponderation)
SELECT d.id, NULL, d.referentiel_version_id, 'D1-01', 'L’entreprise intègre‑t‑elle des critères ESG dans ses décisions d’investissement ? (Environnement avec enjeux clés de Réduction des émissions de CO₂, gestion de l’énergie et de l’eau, protection de la biodiversité; Social avecdes enjeux clés de Conditions de travail, inclusion, droits humains, relations avec les communautés; et Gouvernance avec les enjeux clés Transparence, lutte contre la corruption, composition des conseils, rémunération des dirigeants).', NULL, 'GENERALE'::type_applicabilite, (SELECT cr.id FROM criticite cr WHERE cr.code = 'MOYENNE'::niveau_criticite), true, 3.0
  FROM domaine d WHERE d.referentiel_version_id = (SELECT s.nouvelle FROM _semis s JOIN referentiel r ON r.id = s.referentiel_id WHERE r.code = 'PRI') AND d.code = 'D1';
INSERT INTO question (critere_id, referentiel_version_id, code, libelle, type, ordre, obligatoire, echelle_reponse)
SELECT c.id, c.referentiel_version_id, 'D1-01-Q1', 'L’entreprise intègre‑t‑elle des critères ESG dans ses décisions d’investissement ? (Environnement avec enjeux clés de Réduction des émissions de CO₂, gestion de l’énergie et de l’eau, protection de la biodiversité; Social avecdes enjeux clés de Conditions de travail, inclusion, droits humains, relations avec les communautés; et Gouvernance avec les enjeux clés Transparence, lutte contre la corruption, composition des conseils, rémunération des dirigeants).', 'FERMEE'::type_question, 1, true, 'MATURITE'
  FROM critere c WHERE c.referentiel_version_id = (SELECT s.nouvelle FROM _semis s JOIN referentiel r ON r.id = s.referentiel_id WHERE r.code = 'PRI') AND c.code = 'D1-01';
INSERT INTO exigence (critere_id, referentiel_version_id, code, intitule, enonce, ordre, origine)
SELECT c.id, c.referentiel_version_id, c.code || '-E1', left(c.libelle, 300), c.libelle, 0, 'CONTENU_INITIAL'
  FROM critere c WHERE c.referentiel_version_id = (SELECT s.nouvelle FROM _semis s JOIN referentiel r ON r.id = s.referentiel_id WHERE r.code = 'PRI') AND c.code = 'D1-01';

INSERT INTO critere (domaine_id, sous_domaine_id, referentiel_version_id, code, libelle, description, applicabilite, criticite_id, actif, coefficient_ponderation)
SELECT d.id, NULL, d.referentiel_version_id, 'D1-14', 'Existe‑t‑il une méthodologie formalisée pour évaluer les risques/opportunités ESG ?', NULL, 'GENERALE'::type_applicabilite, (SELECT cr.id FROM criticite cr WHERE cr.code = 'MOYENNE'::niveau_criticite), true, 3.0
  FROM domaine d WHERE d.referentiel_version_id = (SELECT s.nouvelle FROM _semis s JOIN referentiel r ON r.id = s.referentiel_id WHERE r.code = 'PRI') AND d.code = 'D1';
INSERT INTO question (critere_id, referentiel_version_id, code, libelle, type, ordre, obligatoire, echelle_reponse)
SELECT c.id, c.referentiel_version_id, 'D1-14-Q1', 'Existe‑t‑il une méthodologie formalisée pour évaluer les risques/opportunités ESG ?', 'FERMEE'::type_question, 1, true, 'MATURITE'
  FROM critere c WHERE c.referentiel_version_id = (SELECT s.nouvelle FROM _semis s JOIN referentiel r ON r.id = s.referentiel_id WHERE r.code = 'PRI') AND c.code = 'D1-14';
INSERT INTO exigence (critere_id, referentiel_version_id, code, intitule, enonce, ordre, origine)
SELECT c.id, c.referentiel_version_id, c.code || '-E1', left(c.libelle, 300), c.libelle, 0, 'CONTENU_INITIAL'
  FROM critere c WHERE c.referentiel_version_id = (SELECT s.nouvelle FROM _semis s JOIN referentiel r ON r.id = s.referentiel_id WHERE r.code = 'PRI') AND c.code = 'D1-14';

INSERT INTO critere (domaine_id, sous_domaine_id, referentiel_version_id, code, libelle, description, applicabilite, criticite_id, actif, coefficient_ponderation)
SELECT d.id, NULL, d.referentiel_version_id, 'D1-15', '. Les projets sont‑ils comparés selon leur performance ESG avant validation ?', NULL, 'GENERALE'::type_applicabilite, (SELECT cr.id FROM criticite cr WHERE cr.code = 'MOYENNE'::niveau_criticite), true, 2.0
  FROM domaine d WHERE d.referentiel_version_id = (SELECT s.nouvelle FROM _semis s JOIN referentiel r ON r.id = s.referentiel_id WHERE r.code = 'PRI') AND d.code = 'D1';
INSERT INTO question (critere_id, referentiel_version_id, code, libelle, type, ordre, obligatoire, echelle_reponse)
SELECT c.id, c.referentiel_version_id, 'D1-15-Q1', '. Les projets sont‑ils comparés selon leur performance ESG avant validation ?', 'FERMEE'::type_question, 1, true, 'MATURITE'
  FROM critere c WHERE c.referentiel_version_id = (SELECT s.nouvelle FROM _semis s JOIN referentiel r ON r.id = s.referentiel_id WHERE r.code = 'PRI') AND c.code = 'D1-15';
INSERT INTO exigence (critere_id, referentiel_version_id, code, intitule, enonce, ordre, origine)
SELECT c.id, c.referentiel_version_id, c.code || '-E1', left(c.libelle, 300), c.libelle, 0, 'CONTENU_INITIAL'
  FROM critere c WHERE c.referentiel_version_id = (SELECT s.nouvelle FROM _semis s JOIN referentiel r ON r.id = s.referentiel_id WHERE r.code = 'PRI') AND c.code = 'D1-15';

INSERT INTO domaine (referentiel_id, referentiel_version_id, code, nom, description, ordre)
VALUES ((SELECT id FROM referentiel WHERE code = 'PRI'), (SELECT s.nouvelle FROM _semis s JOIN referentiel r ON r.id = s.referentiel_id WHERE r.code = 'PRI'), 'D2', 'Être des propriétaires actifs', '2. Être des propriétaires actifs avec pour objectif principal Exercer les droits d’actionnaires en tenant compte des enjeux ESG', 2);
INSERT INTO critere (domaine_id, sous_domaine_id, referentiel_version_id, code, libelle, description, applicabilite, criticite_id, actif, coefficient_ponderation)
SELECT d.id, NULL, d.referentiel_version_id, 'D2-16', 'L’entreprise exerce‑t‑elle ses droits de vote en assemblée générale en tenant compte des enjeux ESG ?', NULL, 'GENERALE'::type_applicabilite, (SELECT cr.id FROM criticite cr WHERE cr.code = 'MOYENNE'::niveau_criticite), true, 3.0
  FROM domaine d WHERE d.referentiel_version_id = (SELECT s.nouvelle FROM _semis s JOIN referentiel r ON r.id = s.referentiel_id WHERE r.code = 'PRI') AND d.code = 'D2';
INSERT INTO question (critere_id, referentiel_version_id, code, libelle, type, ordre, obligatoire, echelle_reponse)
SELECT c.id, c.referentiel_version_id, 'D2-16-Q1', 'L’entreprise exerce‑t‑elle ses droits de vote en assemblée générale en tenant compte des enjeux ESG ?', 'FERMEE'::type_question, 1, true, 'MATURITE'
  FROM critere c WHERE c.referentiel_version_id = (SELECT s.nouvelle FROM _semis s JOIN referentiel r ON r.id = s.referentiel_id WHERE r.code = 'PRI') AND c.code = 'D2-16';
INSERT INTO exigence (critere_id, referentiel_version_id, code, intitule, enonce, ordre, origine)
SELECT c.id, c.referentiel_version_id, c.code || '-E1', left(c.libelle, 300), c.libelle, 0, 'CONTENU_INITIAL'
  FROM critere c WHERE c.referentiel_version_id = (SELECT s.nouvelle FROM _semis s JOIN referentiel r ON r.id = s.referentiel_id WHERE r.code = 'PRI') AND c.code = 'D2-16';

INSERT INTO critere (domaine_id, sous_domaine_id, referentiel_version_id, code, libelle, description, applicabilite, criticite_id, actif, coefficient_ponderation)
SELECT d.id, NULL, d.referentiel_version_id, 'D2-17', 'Des dialogues réguliers sont‑ils menés avec les sociétés investies sur leurs pratiques ESG ?', NULL, 'GENERALE'::type_applicabilite, (SELECT cr.id FROM criticite cr WHERE cr.code = 'MOYENNE'::niveau_criticite), true, 3.0
  FROM domaine d WHERE d.referentiel_version_id = (SELECT s.nouvelle FROM _semis s JOIN referentiel r ON r.id = s.referentiel_id WHERE r.code = 'PRI') AND d.code = 'D2';
INSERT INTO question (critere_id, referentiel_version_id, code, libelle, type, ordre, obligatoire, echelle_reponse)
SELECT c.id, c.referentiel_version_id, 'D2-17-Q1', 'Des dialogues réguliers sont‑ils menés avec les sociétés investies sur leurs pratiques ESG ?', 'FERMEE'::type_question, 1, true, 'MATURITE'
  FROM critere c WHERE c.referentiel_version_id = (SELECT s.nouvelle FROM _semis s JOIN referentiel r ON r.id = s.referentiel_id WHERE r.code = 'PRI') AND c.code = 'D2-17';
INSERT INTO exigence (critere_id, referentiel_version_id, code, intitule, enonce, ordre, origine)
SELECT c.id, c.referentiel_version_id, c.code || '-E1', left(c.libelle, 300), c.libelle, 0, 'CONTENU_INITIAL'
  FROM critere c WHERE c.referentiel_version_id = (SELECT s.nouvelle FROM _semis s JOIN referentiel r ON r.id = s.referentiel_id WHERE r.code = 'PRI') AND c.code = 'D2-17';

INSERT INTO critere (domaine_id, sous_domaine_id, referentiel_version_id, code, libelle, description, applicabilite, criticite_id, actif, coefficient_ponderation)
SELECT d.id, NULL, d.referentiel_version_id, 'D2-18', 'Y a‑t‑il une politique d’engagement actionnarial documentée ?', NULL, 'GENERALE'::type_applicabilite, (SELECT cr.id FROM criticite cr WHERE cr.code = 'MOYENNE'::niveau_criticite), true, 3.0
  FROM domaine d WHERE d.referentiel_version_id = (SELECT s.nouvelle FROM _semis s JOIN referentiel r ON r.id = s.referentiel_id WHERE r.code = 'PRI') AND d.code = 'D2';
INSERT INTO question (critere_id, referentiel_version_id, code, libelle, type, ordre, obligatoire, echelle_reponse)
SELECT c.id, c.referentiel_version_id, 'D2-18-Q1', 'Y a‑t‑il une politique d’engagement actionnarial documentée ?', 'FERMEE'::type_question, 1, true, 'MATURITE'
  FROM critere c WHERE c.referentiel_version_id = (SELECT s.nouvelle FROM _semis s JOIN referentiel r ON r.id = s.referentiel_id WHERE r.code = 'PRI') AND c.code = 'D2-18';
INSERT INTO exigence (critere_id, referentiel_version_id, code, intitule, enonce, ordre, origine)
SELECT c.id, c.referentiel_version_id, c.code || '-E1', left(c.libelle, 300), c.libelle, 0, 'CONTENU_INITIAL'
  FROM critere c WHERE c.referentiel_version_id = (SELECT s.nouvelle FROM _semis s JOIN referentiel r ON r.id = s.referentiel_id WHERE r.code = 'PRI') AND c.code = 'D2-18';

INSERT INTO domaine (referentiel_id, referentiel_version_id, code, nom, description, ordre)
VALUES ((SELECT id FROM referentiel WHERE code = 'PRI'), (SELECT s.nouvelle FROM _semis s JOIN referentiel r ON r.id = s.referentiel_id WHERE r.code = 'PRI'), 'D3', 'Exiger une divulgation appropriée des enjeux ESG', '3. Exiger une divulgation appropriée des enjeux ESG avec pour objectif principal Demander aux entreprises de publier des données ESG fiables', 3);
INSERT INTO critere (domaine_id, sous_domaine_id, referentiel_version_id, code, libelle, description, applicabilite, criticite_id, actif, coefficient_ponderation)
SELECT d.id, NULL, d.referentiel_version_id, 'D3-19', 'L’entreprise demande‑t‑elle aux sociétés investies de publier des rapports ESG ?', NULL, 'GENERALE'::type_applicabilite, (SELECT cr.id FROM criticite cr WHERE cr.code = 'MOYENNE'::niveau_criticite), true, 3.0
  FROM domaine d WHERE d.referentiel_version_id = (SELECT s.nouvelle FROM _semis s JOIN referentiel r ON r.id = s.referentiel_id WHERE r.code = 'PRI') AND d.code = 'D3';
INSERT INTO question (critere_id, referentiel_version_id, code, libelle, type, ordre, obligatoire, echelle_reponse)
SELECT c.id, c.referentiel_version_id, 'D3-19-Q1', 'L’entreprise demande‑t‑elle aux sociétés investies de publier des rapports ESG ?', 'FERMEE'::type_question, 1, true, 'MATURITE'
  FROM critere c WHERE c.referentiel_version_id = (SELECT s.nouvelle FROM _semis s JOIN referentiel r ON r.id = s.referentiel_id WHERE r.code = 'PRI') AND c.code = 'D3-19';
INSERT INTO exigence (critere_id, referentiel_version_id, code, intitule, enonce, ordre, origine)
SELECT c.id, c.referentiel_version_id, c.code || '-E1', left(c.libelle, 300), c.libelle, 0, 'CONTENU_INITIAL'
  FROM critere c WHERE c.referentiel_version_id = (SELECT s.nouvelle FROM _semis s JOIN referentiel r ON r.id = s.referentiel_id WHERE r.code = 'PRI') AND c.code = 'D3-19';

INSERT INTO critere (domaine_id, sous_domaine_id, referentiel_version_id, code, libelle, description, applicabilite, criticite_id, actif, coefficient_ponderation)
SELECT d.id, NULL, d.referentiel_version_id, 'D3-20', 'Les données publiées sont‑elles vérifiées par des tiers indépendants ?', NULL, 'GENERALE'::type_applicabilite, (SELECT cr.id FROM criticite cr WHERE cr.code = 'MOYENNE'::niveau_criticite), true, 3.0
  FROM domaine d WHERE d.referentiel_version_id = (SELECT s.nouvelle FROM _semis s JOIN referentiel r ON r.id = s.referentiel_id WHERE r.code = 'PRI') AND d.code = 'D3';
INSERT INTO question (critere_id, referentiel_version_id, code, libelle, type, ordre, obligatoire, echelle_reponse)
SELECT c.id, c.referentiel_version_id, 'D3-20-Q1', 'Les données publiées sont‑elles vérifiées par des tiers indépendants ?', 'FERMEE'::type_question, 1, true, 'MATURITE'
  FROM critere c WHERE c.referentiel_version_id = (SELECT s.nouvelle FROM _semis s JOIN referentiel r ON r.id = s.referentiel_id WHERE r.code = 'PRI') AND c.code = 'D3-20';
INSERT INTO exigence (critere_id, referentiel_version_id, code, intitule, enonce, ordre, origine)
SELECT c.id, c.referentiel_version_id, c.code || '-E1', left(c.libelle, 300), c.libelle, 0, 'CONTENU_INITIAL'
  FROM critere c WHERE c.referentiel_version_id = (SELECT s.nouvelle FROM _semis s JOIN referentiel r ON r.id = s.referentiel_id WHERE r.code = 'PRI') AND c.code = 'D3-20';

INSERT INTO domaine (referentiel_id, referentiel_version_id, code, nom, description, ordre)
VALUES ((SELECT id FROM referentiel WHERE code = 'PRI'), (SELECT s.nouvelle FROM _semis s JOIN referentiel r ON r.id = s.referentiel_id WHERE r.code = 'PRI'), 'D4', 'Promouvoir l’acceptation des PRI dans l’industrie', '4. Promouvoir l’acceptation des PRI dans l’industrie avec pour objectif principal Encourager d’autres acteurs financiers à adopter les PRI', 4);
INSERT INTO critere (domaine_id, sous_domaine_id, referentiel_version_id, code, libelle, description, applicabilite, criticite_id, actif, coefficient_ponderation)
SELECT d.id, NULL, d.referentiel_version_id, 'D4-22', 'L’entreprise encourage‑t‑elle ses partenaires financiers à adopter les PRI ?', NULL, 'GENERALE'::type_applicabilite, (SELECT cr.id FROM criticite cr WHERE cr.code = 'MOYENNE'::niveau_criticite), true, 3.0
  FROM domaine d WHERE d.referentiel_version_id = (SELECT s.nouvelle FROM _semis s JOIN referentiel r ON r.id = s.referentiel_id WHERE r.code = 'PRI') AND d.code = 'D4';
INSERT INTO question (critere_id, referentiel_version_id, code, libelle, type, ordre, obligatoire, echelle_reponse)
SELECT c.id, c.referentiel_version_id, 'D4-22-Q1', 'L’entreprise encourage‑t‑elle ses partenaires financiers à adopter les PRI ?', 'FERMEE'::type_question, 1, true, 'MATURITE'
  FROM critere c WHERE c.referentiel_version_id = (SELECT s.nouvelle FROM _semis s JOIN referentiel r ON r.id = s.referentiel_id WHERE r.code = 'PRI') AND c.code = 'D4-22';
INSERT INTO exigence (critere_id, referentiel_version_id, code, intitule, enonce, ordre, origine)
SELECT c.id, c.referentiel_version_id, c.code || '-E1', left(c.libelle, 300), c.libelle, 0, 'CONTENU_INITIAL'
  FROM critere c WHERE c.referentiel_version_id = (SELECT s.nouvelle FROM _semis s JOIN referentiel r ON r.id = s.referentiel_id WHERE r.code = 'PRI') AND c.code = 'D4-22';

INSERT INTO critere (domaine_id, sous_domaine_id, referentiel_version_id, code, libelle, description, applicabilite, criticite_id, actif, coefficient_ponderation)
SELECT d.id, NULL, d.referentiel_version_id, 'D4-23', 'Participe‑t‑elle à des initiatives collectives ou associations professionnelles ESG ?', NULL, 'GENERALE'::type_applicabilite, (SELECT cr.id FROM criticite cr WHERE cr.code = 'MOYENNE'::niveau_criticite), true, 1.0
  FROM domaine d WHERE d.referentiel_version_id = (SELECT s.nouvelle FROM _semis s JOIN referentiel r ON r.id = s.referentiel_id WHERE r.code = 'PRI') AND d.code = 'D4';
INSERT INTO question (critere_id, referentiel_version_id, code, libelle, type, ordre, obligatoire, echelle_reponse)
SELECT c.id, c.referentiel_version_id, 'D4-23-Q1', 'Participe‑t‑elle à des initiatives collectives ou associations professionnelles ESG ?', 'FERMEE'::type_question, 1, true, 'MATURITE'
  FROM critere c WHERE c.referentiel_version_id = (SELECT s.nouvelle FROM _semis s JOIN referentiel r ON r.id = s.referentiel_id WHERE r.code = 'PRI') AND c.code = 'D4-23';
INSERT INTO exigence (critere_id, referentiel_version_id, code, intitule, enonce, ordre, origine)
SELECT c.id, c.referentiel_version_id, c.code || '-E1', left(c.libelle, 300), c.libelle, 0, 'CONTENU_INITIAL'
  FROM critere c WHERE c.referentiel_version_id = (SELECT s.nouvelle FROM _semis s JOIN referentiel r ON r.id = s.referentiel_id WHERE r.code = 'PRI') AND c.code = 'D4-23';

INSERT INTO critere (domaine_id, sous_domaine_id, referentiel_version_id, code, libelle, description, applicabilite, criticite_id, actif, coefficient_ponderation)
SELECT d.id, NULL, d.referentiel_version_id, 'D4-24', 'Les PRI sont‑ils intégrés dans les contrats ou chartes de collaboration ?', NULL, 'GENERALE'::type_applicabilite, (SELECT cr.id FROM criticite cr WHERE cr.code = 'MOYENNE'::niveau_criticite), true, 3.0
  FROM domaine d WHERE d.referentiel_version_id = (SELECT s.nouvelle FROM _semis s JOIN referentiel r ON r.id = s.referentiel_id WHERE r.code = 'PRI') AND d.code = 'D4';
INSERT INTO question (critere_id, referentiel_version_id, code, libelle, type, ordre, obligatoire, echelle_reponse)
SELECT c.id, c.referentiel_version_id, 'D4-24-Q1', 'Les PRI sont‑ils intégrés dans les contrats ou chartes de collaboration ?', 'FERMEE'::type_question, 1, true, 'MATURITE'
  FROM critere c WHERE c.referentiel_version_id = (SELECT s.nouvelle FROM _semis s JOIN referentiel r ON r.id = s.referentiel_id WHERE r.code = 'PRI') AND c.code = 'D4-24';
INSERT INTO exigence (critere_id, referentiel_version_id, code, intitule, enonce, ordre, origine)
SELECT c.id, c.referentiel_version_id, c.code || '-E1', left(c.libelle, 300), c.libelle, 0, 'CONTENU_INITIAL'
  FROM critere c WHERE c.referentiel_version_id = (SELECT s.nouvelle FROM _semis s JOIN referentiel r ON r.id = s.referentiel_id WHERE r.code = 'PRI') AND c.code = 'D4-24';

INSERT INTO domaine (referentiel_id, referentiel_version_id, code, nom, description, ordre)
VALUES ((SELECT id FROM referentiel WHERE code = 'PRI'), (SELECT s.nouvelle FROM _semis s JOIN referentiel r ON r.id = s.referentiel_id WHERE r.code = 'PRI'), 'D5', '5. Travailler ensemble pour plus d’efficacité', '5. 5. Travailler ensemble pour plus d’efficacité avec pour objectif principal Coopérer entre signataires pour renforcer l’impact', 5);
INSERT INTO critere (domaine_id, sous_domaine_id, referentiel_version_id, code, libelle, description, applicabilite, criticite_id, actif, coefficient_ponderation)
SELECT d.id, NULL, d.referentiel_version_id, 'D5-25', 'L’entreprise collabore‑t‑elle avec d’autres signataires PRI pour renforcer l’impact ?', NULL, 'GENERALE'::type_applicabilite, (SELECT cr.id FROM criticite cr WHERE cr.code = 'MOYENNE'::niveau_criticite), true, 1.0
  FROM domaine d WHERE d.referentiel_version_id = (SELECT s.nouvelle FROM _semis s JOIN referentiel r ON r.id = s.referentiel_id WHERE r.code = 'PRI') AND d.code = 'D5';
INSERT INTO question (critere_id, referentiel_version_id, code, libelle, type, ordre, obligatoire, echelle_reponse)
SELECT c.id, c.referentiel_version_id, 'D5-25-Q1', 'L’entreprise collabore‑t‑elle avec d’autres signataires PRI pour renforcer l’impact ?', 'FERMEE'::type_question, 1, true, 'MATURITE'
  FROM critere c WHERE c.referentiel_version_id = (SELECT s.nouvelle FROM _semis s JOIN referentiel r ON r.id = s.referentiel_id WHERE r.code = 'PRI') AND c.code = 'D5-25';
INSERT INTO exigence (critere_id, referentiel_version_id, code, intitule, enonce, ordre, origine)
SELECT c.id, c.referentiel_version_id, c.code || '-E1', left(c.libelle, 300), c.libelle, 0, 'CONTENU_INITIAL'
  FROM critere c WHERE c.referentiel_version_id = (SELECT s.nouvelle FROM _semis s JOIN referentiel r ON r.id = s.referentiel_id WHERE r.code = 'PRI') AND c.code = 'D5-25';

INSERT INTO critere (domaine_id, sous_domaine_id, referentiel_version_id, code, libelle, description, applicabilite, criticite_id, actif, coefficient_ponderation)
SELECT d.id, NULL, d.referentiel_version_id, 'D5-26', 'Participe‑t‑elle à des coalitions d’investisseurs sur des thématiques ESG (climat, droits humains) ?', NULL, 'GENERALE'::type_applicabilite, (SELECT cr.id FROM criticite cr WHERE cr.code = 'MOYENNE'::niveau_criticite), true, 2.0
  FROM domaine d WHERE d.referentiel_version_id = (SELECT s.nouvelle FROM _semis s JOIN referentiel r ON r.id = s.referentiel_id WHERE r.code = 'PRI') AND d.code = 'D5';
INSERT INTO question (critere_id, referentiel_version_id, code, libelle, type, ordre, obligatoire, echelle_reponse)
SELECT c.id, c.referentiel_version_id, 'D5-26-Q1', 'Participe‑t‑elle à des coalitions d’investisseurs sur des thématiques ESG (climat, droits humains) ?', 'FERMEE'::type_question, 1, true, 'MATURITE'
  FROM critere c WHERE c.referentiel_version_id = (SELECT s.nouvelle FROM _semis s JOIN referentiel r ON r.id = s.referentiel_id WHERE r.code = 'PRI') AND c.code = 'D5-26';
INSERT INTO exigence (critere_id, referentiel_version_id, code, intitule, enonce, ordre, origine)
SELECT c.id, c.referentiel_version_id, c.code || '-E1', left(c.libelle, 300), c.libelle, 0, 'CONTENU_INITIAL'
  FROM critere c WHERE c.referentiel_version_id = (SELECT s.nouvelle FROM _semis s JOIN referentiel r ON r.id = s.referentiel_id WHERE r.code = 'PRI') AND c.code = 'D5-26';

INSERT INTO critere (domaine_id, sous_domaine_id, referentiel_version_id, code, libelle, description, applicabilite, criticite_id, actif, coefficient_ponderation)
SELECT d.id, NULL, d.referentiel_version_id, 'D5-27', 'Des projets communs de plaidoyer ou de recherche ESG sont‑ils menés ?', NULL, 'GENERALE'::type_applicabilite, (SELECT cr.id FROM criticite cr WHERE cr.code = 'MOYENNE'::niveau_criticite), true, 2.0
  FROM domaine d WHERE d.referentiel_version_id = (SELECT s.nouvelle FROM _semis s JOIN referentiel r ON r.id = s.referentiel_id WHERE r.code = 'PRI') AND d.code = 'D5';
INSERT INTO question (critere_id, referentiel_version_id, code, libelle, type, ordre, obligatoire, echelle_reponse)
SELECT c.id, c.referentiel_version_id, 'D5-27-Q1', 'Des projets communs de plaidoyer ou de recherche ESG sont‑ils menés ?', 'FERMEE'::type_question, 1, true, 'MATURITE'
  FROM critere c WHERE c.referentiel_version_id = (SELECT s.nouvelle FROM _semis s JOIN referentiel r ON r.id = s.referentiel_id WHERE r.code = 'PRI') AND c.code = 'D5-27';
INSERT INTO exigence (critere_id, referentiel_version_id, code, intitule, enonce, ordre, origine)
SELECT c.id, c.referentiel_version_id, c.code || '-E1', left(c.libelle, 300), c.libelle, 0, 'CONTENU_INITIAL'
  FROM critere c WHERE c.referentiel_version_id = (SELECT s.nouvelle FROM _semis s JOIN referentiel r ON r.id = s.referentiel_id WHERE r.code = 'PRI') AND c.code = 'D5-27';

INSERT INTO domaine (referentiel_id, referentiel_version_id, code, nom, description, ordre)
VALUES ((SELECT id FROM referentiel WHERE code = 'PRI'), (SELECT s.nouvelle FROM _semis s JOIN referentiel r ON r.id = s.referentiel_id WHERE r.code = 'PRI'), 'D6', 'Rendre compte des activités et progrès', '6. Rendre compte des activités et progrès avec pour objectif principal Publier régulièrement les actions et résultats ESG', 6);
INSERT INTO critere (domaine_id, sous_domaine_id, referentiel_version_id, code, libelle, description, applicabilite, criticite_id, actif, coefficient_ponderation)
SELECT d.id, NULL, d.referentiel_version_id, 'D6-28', 'L’entreprise publie‑t‑elle un rapport annuel PRI ou ESG ?', NULL, 'GENERALE'::type_applicabilite, (SELECT cr.id FROM criticite cr WHERE cr.code = 'MOYENNE'::niveau_criticite), true, 2.0
  FROM domaine d WHERE d.referentiel_version_id = (SELECT s.nouvelle FROM _semis s JOIN referentiel r ON r.id = s.referentiel_id WHERE r.code = 'PRI') AND d.code = 'D6';
INSERT INTO question (critere_id, referentiel_version_id, code, libelle, type, ordre, obligatoire, echelle_reponse)
SELECT c.id, c.referentiel_version_id, 'D6-28-Q1', 'L’entreprise publie‑t‑elle un rapport annuel PRI ou ESG ?', 'FERMEE'::type_question, 1, true, 'MATURITE'
  FROM critere c WHERE c.referentiel_version_id = (SELECT s.nouvelle FROM _semis s JOIN referentiel r ON r.id = s.referentiel_id WHERE r.code = 'PRI') AND c.code = 'D6-28';
INSERT INTO exigence (critere_id, referentiel_version_id, code, intitule, enonce, ordre, origine)
SELECT c.id, c.referentiel_version_id, c.code || '-E1', left(c.libelle, 300), c.libelle, 0, 'CONTENU_INITIAL'
  FROM critere c WHERE c.referentiel_version_id = (SELECT s.nouvelle FROM _semis s JOIN referentiel r ON r.id = s.referentiel_id WHERE r.code = 'PRI') AND c.code = 'D6-28';

INSERT INTO critere (domaine_id, sous_domaine_id, referentiel_version_id, code, libelle, description, applicabilite, criticite_id, actif, coefficient_ponderation)
SELECT d.id, NULL, d.referentiel_version_id, 'D6-29', 'Les progrès réalisés sont‑ils mesurés par des indicateurs chiffrés ?', NULL, 'GENERALE'::type_applicabilite, (SELECT cr.id FROM criticite cr WHERE cr.code = 'MOYENNE'::niveau_criticite), true, 3.0
  FROM domaine d WHERE d.referentiel_version_id = (SELECT s.nouvelle FROM _semis s JOIN referentiel r ON r.id = s.referentiel_id WHERE r.code = 'PRI') AND d.code = 'D6';
INSERT INTO question (critere_id, referentiel_version_id, code, libelle, type, ordre, obligatoire, echelle_reponse)
SELECT c.id, c.referentiel_version_id, 'D6-29-Q1', 'Les progrès réalisés sont‑ils mesurés par des indicateurs chiffrés ?', 'FERMEE'::type_question, 1, true, 'MATURITE'
  FROM critere c WHERE c.referentiel_version_id = (SELECT s.nouvelle FROM _semis s JOIN referentiel r ON r.id = s.referentiel_id WHERE r.code = 'PRI') AND c.code = 'D6-29';
INSERT INTO exigence (critere_id, referentiel_version_id, code, intitule, enonce, ordre, origine)
SELECT c.id, c.referentiel_version_id, c.code || '-E1', left(c.libelle, 300), c.libelle, 0, 'CONTENU_INITIAL'
  FROM critere c WHERE c.referentiel_version_id = (SELECT s.nouvelle FROM _semis s JOIN referentiel r ON r.id = s.referentiel_id WHERE r.code = 'PRI') AND c.code = 'D6-29';


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

UPDATE referentiel r SET version = '2.0'
  FROM _semis s WHERE s.referentiel_id = r.id;

-- --- 5. Vérification ---------------------------------------------------

DO $verif$
DECLARE
    attendu    CONSTANT integer := 136;
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

    RAISE NOTICE 'Catalogue réel semé : % critères en version 2.0', obtenu;
END;
$verif$;

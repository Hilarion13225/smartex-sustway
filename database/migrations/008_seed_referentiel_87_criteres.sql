-- =====================================================================
-- SEED — Référentiel Smartex Sustway : 6 domaines + 87 critères
-- =====================================================================
-- Source : CDC v1.5/1.6, section 7. Codes, libellés et criticité générale
-- repris tels quels. Toute la criticité posée ici est la criticité
-- GÉNÉRALE (colonne "Criticité" du CDC §7) — le CDC indique explicitement
-- (§7, §13) que ces valeurs sont "une première estimation, mise en
-- production sans validation préalable exhaustive des experts métier et
-- ajustée progressivement au fil des lots d'évaluations". Les variations
-- de criticité par secteur (CRITERE_CRITICITE_SECTEUR) et les
-- applicabilités sectorielles/bailleur (RG34/RG39) ne sont PAS encore
-- renseignées ici : tous les critères sont chargés en applicabilité
-- GENERALE, en attendant le mapping produit par le back-office (phase F).
--
-- Idem pour les questions/indicateurs (RG09) : le CDC ne fournit pas le
-- libellé détaillé des questions par critère (seulement le critère
-- lui-même) — une seule question générique de type "preuve documentaire"
-- est créée par critère, comme point de départ technique, PAS comme
-- contenu validé. À affiner avec les experts métier RSE.
-- =====================================================================

-- --- Domaines (6 parties) --------------------------------------------

INSERT INTO domaine (referentiel_id, code, nom, description, ordre)
SELECT r.id, v.code, v.nom, v.description, v.ordre
FROM referentiel r,
(VALUES
  ('VE',   'Valeurs et éthique de l''entreprise',                'CDC §7.1 — Partie I',   1),
  ('GOUV', 'Gouvernance d''entreprise',                           'CDC §7.2 — Partie II',  2),
  ('SOC',  'Social et sociétal',                                  'CDC §7.3 — Partie III', 3),
  ('ENV',  'Environnement et atmosphère',                         'CDC §7.4 — Partie IV',  4),
  ('ECO',  'Économie et comportement sur le marché',              'CDC §7.5 — Partie V',   5),
  ('ORG',  'Prise en charge organisationnelle de la RSE',         'CDC §7.6 — Partie VI',  6)
) AS v(code, nom, description, ordre)
WHERE r.code = 'SMARTEX_SUSTWAY'
ON CONFLICT (referentiel_id, code) DO NOTHING;

-- --- Critères (87) -----------------------------------------------------

INSERT INTO critere (domaine_id, code, libelle, criticite_id, applicabilite, actif)
SELECT d.id, v.code, v.libelle, ct.id, 'GENERALE'::type_applicabilite, true
FROM (VALUES
  -- Partie I — Valeurs et éthique de l'entreprise
  ('VE',   'VE-01',   'Définir et formaliser les valeurs et règles de conduite de l''entreprise', 'MOYENNE'),
  ('VE',   'VE-02',   'Sensibiliser les salariés aux valeurs et règles de conduite', 'MOYENNE'),
  ('VE',   'VE-03',   'Communiquer les valeurs aux clients, partenaires et fournisseurs', 'FAIBLE'),

  -- Partie II — Gouvernance d'entreprise
  ('GOUV', 'GOUV-01', 'Diffuser et garantir la transparence des résultats financiers et non financiers', 'ELEVEE'),
  ('GOUV', 'GOUV-02', 'Garantir le respect des droits de propriété', 'MOYENNE'),
  ('GOUV', 'GOUV-03', 'Promouvoir l''actionnariat salarié', 'FAIBLE'),
  ('GOUV', 'GOUV-04', 'Représentation des salariés au conseil d''administration', 'MOYENNE'),
  ('GOUV', 'GOUV-05', 'Indépendance des administrateurs', 'MOYENNE'),
  ('GOUV', 'GOUV-06', 'Existence de comités spécialisés de contrôle', 'MOYENNE'),
  ('GOUV', 'GOUV-07', 'Connaître et formaliser une politique de lutte contre la corruption', 'ELEVEE'),
  ('GOUV', 'GOUV-08', 'Désigner un responsable de la conformité anti-corruption', 'ELEVEE'),
  ('GOUV', 'GOUV-09', 'Agir contre la corruption sous toutes ses formes', 'CRITIQUE'),
  ('GOUV', 'GOUV-10', 'Système de management anti-corruption (ISO 37001)', 'ELEVEE'),
  ('GOUV', 'GOUV-11', 'Conformité aux lois et règlements fiscaux', 'CRITIQUE'),
  ('GOUV', 'GOUV-12', 'Politiques de protection des droits des salariés', 'ELEVEE'),
  ('GOUV', 'GOUV-13', 'Dialogue avec les parties prenantes sur les droits de l''Homme', 'MOYENNE'),
  ('GOUV', 'GOUV-14', 'Non-complicité de violations des droits de l''Homme', 'CRITIQUE'),

  -- Partie III — Social et sociétal
  ('SOC',  'SOC-01',  'Abolition du travail des enfants', 'CRITIQUE'),
  ('SOC',  'SOC-02',  'Coopération avec les fournisseurs contre le travail des enfants', 'CRITIQUE'),
  ('SOC',  'SOC-03',  'Respect de la durée du travail, du salaire minimum et des congés', 'CRITIQUE'),
  ('SOC',  'SOC-04',  'Politique formalisée d''égalité des chances', 'ELEVEE'),
  ('SOC',  'SOC-05',  'Responsable de la conformité en matière d''égalité des chances', 'MOYENNE'),
  ('SOC',  'SOC-06',  'Soutien à l''emploi des personnes en situation de handicap', 'MOYENNE'),
  ('SOC',  'SOC-07',  'Élimination du travail forcé ou obligatoire', 'CRITIQUE'),
  ('SOC',  'SOC-08',  'Audits de la main-d''œuvre forcée dans la chaîne de valeur', 'ELEVEE'),
  ('SOC',  'SOC-09',  'Lutte contre la précarité de l''emploi', 'MOYENNE'),
  ('SOC',  'SOC-10',  'Promotion d''emplois productifs et décents', 'MOYENNE'),
  ('SOC',  'SOC-11',  'Politique formalisée de formation des collaborateurs', 'MOYENNE'),
  ('SOC',  'SOC-12',  'Responsable des programmes de formation', 'FAIBLE'),
  ('SOC',  'SOC-13',  'Normes de santé, sécurité et hygiène au travail', 'CRITIQUE'),
  ('SOC',  'SOC-14',  'Amélioration de l''environnement de travail', 'FAIBLE'),
  ('SOC',  'SOC-15',  'Système de management santé-sécurité (ISO 45001)', 'ELEVEE'),
  ('SOC',  'SOC-16',  'Système de management des conditions de travail (SA 8000)', 'ELEVEE'),
  ('SOC',  'SOC-17',  'Renforcement du dialogue social', 'MOYENNE'),
  ('SOC',  'SOC-18',  'Respect de la liberté d''association', 'CRITIQUE'),
  ('SOC',  'SOC-19',  'Reconnaissance du droit de négociation collective', 'ELEVEE'),
  ('SOC',  'SOC-20',  'Procédures de réclamations et de conciliation', 'MOYENNE'),
  ('SOC',  'SOC-21',  'Facilitation de l''activité des représentants du personnel', 'MOYENNE'),
  ('SOC',  'SOC-22',  'Retombées positives pour les communautés locales', 'MOYENNE'),
  ('SOC',  'SOC-23',  'Dialogue avec les communautés sur les sujets sensibles', 'MOYENNE'),
  ('SOC',  'SOC-24',  'Soutien financier aux projets communautaires', 'FAIBLE'),
  ('SOC',  'SOC-25',  'Régularité du paiement des impôts locaux', 'ELEVEE'),

  -- Partie IV — Environnement et atmosphère
  ('ENV',  'ENV-01',  'Conformité aux dispositions légales environnementales', 'CRITIQUE'),
  ('ENV',  'ENV-02',  'Système interne de management environnemental', 'ELEVEE'),
  ('ENV',  'ENV-03',  'Sensibilisation et formation du personnel à l''environnement', 'MOYENNE'),
  ('ENV',  'ENV-04',  'Système de management environnemental certifié (ISO 14001)', 'ELEVEE'),
  ('ENV',  'ENV-05',  'Dispositifs d''intervention sur les impacts environnementaux', 'MOYENNE'),
  ('ENV',  'ENV-06',  'Études d''impact environnemental régulières et transparentes', 'ELEVEE'),
  ('ENV',  'ENV-07',  'Attitude de précaution face aux défis environnementaux', 'MOYENNE'),
  ('ENV',  'ENV-08',  'Prise en compte de l''impact environnemental en conception produit', 'MOYENNE'),
  ('ENV',  'ENV-09',  'Suivi et contrôle de la consommation d''eau', 'MOYENNE'),
  ('ENV',  'ENV-10',  'Objectifs de réduction de la consommation d''eau', 'FAIBLE'),
  ('ENV',  'ENV-11',  'Système de management de la consommation d''eau', 'FAIBLE'),
  ('ENV',  'ENV-12',  'Suivi et contrôle de la consommation d''énergie', 'MOYENNE'),
  ('ENV',  'ENV-13',  'Objectifs de réduction de la consommation d''énergie', 'FAIBLE'),
  ('ENV',  'ENV-14',  'Système de management de l''énergie (ISO 50001)', 'MOYENNE'),
  ('ENV',  'ENV-15',  'Recours aux énergies renouvelables', 'FAIBLE'),
  ('ENV',  'ENV-16',  'Suivi et contrôle des rejets atmosphériques', 'ELEVEE'),
  ('ENV',  'ENV-17',  'Objectifs de réduction des rejets atmosphériques', 'MOYENNE'),
  ('ENV',  'ENV-18',  'Système de management des rejets atmosphériques', 'MOYENNE'),
  ('ENV',  'ENV-19',  'Suivi et contrôle des rejets liquides', 'CRITIQUE'),
  ('ENV',  'ENV-20',  'Objectifs de réduction des rejets liquides', 'MOYENNE'),
  ('ENV',  'ENV-21',  'Système de management des rejets liquides', 'MOYENNE'),
  ('ENV',  'ENV-22',  'Suivi et contrôle des déchets solides', 'MOYENNE'),
  ('ENV',  'ENV-23',  'Objectifs de réduction des déchets solides', 'FAIBLE'),
  ('ENV',  'ENV-24',  'Système de management des déchets solides', 'MOYENNE'),

  -- Partie V — Économie et comportement sur le marché
  ('ECO',  'ECO-01',  'Protection des données et de la vie privée des clients', 'ELEVEE'),
  ('ECO',  'ECO-02',  'Information suffisante pour un choix éclairé des consommateurs', 'MOYENNE'),
  ('ECO',  'ECO-03',  'Sécurité et santé des consommateurs', 'CRITIQUE'),
  ('ECO',  'ECO-04',  'Qualité des biens et services comme objectif central', 'MOYENNE'),
  ('ECO',  'ECO-05',  'Promotion de la consommation responsable', 'FAIBLE'),
  ('ECO',  'ECO-06',  'Service après-vente et gestion des réclamations', 'MOYENNE'),
  ('ECO',  'ECO-07',  'Études de satisfaction clients', 'FAIBLE'),
  ('ECO',  'ECO-08',  'Système de management qualité (ISO 9001)', 'FAIBLE'),
  ('ECO',  'ECO-09',  'Respect des règles de concurrence loyale', 'ELEVEE'),
  ('ECO',  'ECO-10',  'Sensibilisation des fournisseurs aux impacts environnementaux', 'MOYENNE'),
  ('ECO',  'ECO-11',  'Sensibilisation des fournisseurs aux impacts sociaux', 'MOYENNE'),
  ('ECO',  'ECO-12',  'Analyse des offres en coût total / mieux-disance', 'FAIBLE'),
  ('ECO',  'ECO-13',  'Critères sociaux et environnementaux dans les achats', 'MOYENNE'),
  ('ECO',  'ECO-14',  'Politique formalisée d''achats responsables', 'ELEVEE'),
  ('ECO',  'ECO-15',  'Formation des acteurs de la supply-chain aux achats responsables', 'MOYENNE'),
  ('ECO',  'ECO-16',  'Système de management des achats (ISO 20400)', 'MOYENNE'),
  ('ECO',  'ECO-17',  'Association des fournisseurs à la politique d''achats responsables', 'FAIBLE'),
  ('ECO',  'ECO-18',  'Audits RSE des fournisseurs et sous-traitants', 'ELEVEE'),
  ('ECO',  'ECO-19',  'Enquêtes de satisfaction fournisseurs', 'FAIBLE'),

  -- Partie VI — Prise en charge organisationnelle de la RSE
  ('ORG',  'ORG-01',  'Équipe dédiée à la RSE au sein de l''entreprise', 'MOYENNE'),
  ('ORG',  'ORG-02',  'Publication d''un rapport RSE / Développement Durable annuel', 'ELEVEE')

) AS v(domaine_code, code, libelle, criticite)
JOIN referentiel r ON r.code = 'SMARTEX_SUSTWAY'
JOIN domaine d ON d.referentiel_id = r.id AND d.code = v.domaine_code
JOIN criticite ct ON ct.code = v.criticite::niveau_criticite
ON CONFLICT (domaine_id, code) DO NOTHING;

-- --- Question générique par critère (placeholder — voir en-tête) -------

INSERT INTO question (critere_id, code, libelle, type, ordre, obligatoire)
SELECT c.id, c.code || '-Q1', 'Disposez-vous d''une preuve documentaire pour : ' || c.libelle || ' ?', 'FERMEE', 1, true
FROM critere c
JOIN domaine d ON d.id = c.domaine_id
JOIN referentiel r ON r.id = d.referentiel_id AND r.code = 'SMARTEX_SUSTWAY'
ON CONFLICT (critere_id, code) DO NOTHING;

-- =====================================================================
-- SEED — Référentiels PRI, GRESB, ITIE, IFC/SFI : domaines + critères
-- =====================================================================
-- Les lignes `referentiel` (PRI, GRESB, ITIE, IFC_SFI) existent depuis V2
-- mais sans aucun domaine/critère : un audit créé sur l'un de ces
-- référentiels composait un questionnaire vide (QuestionnaireService lit
-- critere -> domaine -> referentiel_id, voir RG34). Ce lot les peuple,
-- selon la structure publique de chaque référentiel :
--   PRI    : les 6 Principes for Responsible Investment (secteur finance),
--            déclinés en critères évaluables.
--   GRESB  : les aspects Management (leadership, politiques, risques,
--            engagement) et Performance (énergie, GES, eau, déchets,
--            certifications, confort des occupants) du Real Estate
--            Assessment (secteur immobilier).
--   ITIE   : les 7 exigences du Standard ITIE 2023 (cadre légal,
--            attribution des titres, production, collecte et allocation
--            des revenus, retombées socio-économiques, résultats).
--   IFC/SFI: les 8 Performance Standards de la Société Financière
--            Internationale.
-- Comme pour V11 (SMARTEX_SUSTWAY) : criticité GÉNÉRALE uniquement
-- (applicabilité sectorielle non renseignée ici), et une question
-- générique "preuve documentaire" par critère comme point de départ
-- technique — à affiner avec les experts métier de chaque référentiel.
--
-- Ce lot est indépendant du mécanisme CRITERE_BAILLEUR (RG40, table
-- `bailleur` + `critere_bailleur`) qui tague des critères d'UN AUTRE
-- référentiel (ex. Smartex Sustway) comme pertinents pour un bailleur —
-- toujours inactif faute de mapping (voir QuestionnaireService). Ici, il
-- s'agit au contraire de rendre IFC/SFI utilisable comme référentiel de
-- mission à part entière, au même titre que PRI/GRESB/ITIE.
-- =====================================================================

-- =====================================================================
-- PRI — Principles for Responsible Investment (6 domaines, 30 critères)
-- =====================================================================

INSERT INTO domaine (referentiel_id, code, nom, description, ordre)
SELECT r.id, v.code, v.nom, v.description, v.ordre
FROM referentiel r,
(VALUES
  ('P1', 'Intégration ESG dans l''investissement',       'Principe 1 — analyse et décision d''investissement', 1),
  ('P2', 'Actionnariat actif',                            'Principe 2 — politiques d''engagement et de vote',    2),
  ('P3', 'Transparence des participations',                'Principe 3 — reporting ESG exigé des investis',       3),
  ('P4', 'Promotion des Principes',                        'Principe 4 — diffusion dans le secteur',              4),
  ('P5', 'Collaboration sectorielle',                      'Principe 5 — efficacité collective',                  5),
  ('P6', 'Reporting sur la mise en œuvre',                 'Principe 6 — suivi et publication des progrès',       6)
) AS v(code, nom, description, ordre)
WHERE r.code = 'PRI'
ON CONFLICT (referentiel_id, code) DO NOTHING;

INSERT INTO critere (domaine_id, code, libelle, criticite_id, applicabilite, actif)
SELECT d.id, v.code, v.libelle, ct.id, 'GENERALE'::type_applicabilite, true
FROM (VALUES
  ('P1', 'P1-01', 'Politique d''investissement responsable formalisée et approuvée par la direction', 'ELEVEE'),
  ('P1', 'P1-02', 'Intégration systématique des critères ESG dans l''analyse de crédit/investissement', 'ELEVEE'),
  ('P1', 'P1-03', 'Outils et méthodologies d''évaluation ESG des contreparties', 'MOYENNE'),
  ('P1', 'P1-04', 'Formation des équipes d''investissement aux enjeux ESG', 'MOYENNE'),
  ('P1', 'P1-05', 'Exclusions sectorielles ou normatives formalisées', 'MOYENNE'),
  ('P1', 'P1-06', 'Prise en compte des risques climatiques dans les décisions d''investissement', 'ELEVEE'),
  ('P1', 'P1-07', 'Due diligence ESG renforcée sur les nouvelles contreparties', 'MOYENNE'),
  ('P1', 'P1-08', 'Suivi des controverses ESG des contreparties en portefeuille', 'MOYENNE'),

  ('P2', 'P2-01', 'Politique d''engagement actionnarial formalisée', 'MOYENNE'),
  ('P2', 'P2-02', 'Politique de vote intégrant des critères ESG', 'MOYENNE'),
  ('P2', 'P2-03', 'Dialogue structuré avec les entreprises en portefeuille sur les enjeux ESG', 'MOYENNE'),
  ('P2', 'P2-04', 'Escalade formalisée en cas de non-réponse aux enjeux ESG soulevés', 'FAIBLE'),
  ('P2', 'P2-05', 'Publication du bilan annuel de vote et d''engagement', 'FAIBLE'),

  ('P3', 'P3-01', 'Exigence de reporting ESG standardisé auprès des participations', 'MOYENNE'),
  ('P3', 'P3-02', 'Utilisation de standards reconnus (GRI, SASB, TCFD, ISSB) dans les exigences de reporting', 'MOYENNE'),
  ('P3', 'P3-03', 'Vérification ou audit des données ESG déclarées par les participations', 'FAIBLE'),
  ('P3', 'P3-04', 'Accompagnement des participations en phase de montée en maturité ESG', 'FAIBLE'),
  ('P3', 'P3-05', 'Intégration des données ESG dans les rapports aux clients/investisseurs', 'MOYENNE'),

  ('P4', 'P4-01', 'Participation à des initiatives sectorielles de place sur l''investissement responsable', 'FAIBLE'),
  ('P4', 'P4-02', 'Clauses ESG intégrées dans les mandats de gestion délégués', 'MOYENNE'),
  ('P4', 'P4-03', 'Sensibilisation des partenaires (courtiers, dépositaires, prestataires) aux exigences ESG', 'FAIBLE'),
  ('P4', 'P4-04', 'Contribution au développement de standards ESG sectoriels', 'FAIBLE'),

  ('P5', 'P5-01', 'Participation à des groupes de travail ou coalitions d''investisseurs responsables', 'FAIBLE'),
  ('P5', 'P5-02', 'Mutualisation d''outils ou de données ESG avec d''autres acteurs du secteur', 'FAIBLE'),
  ('P5', 'P5-03', 'Contribution à des consultations réglementaires sur la finance durable', 'FAIBLE'),

  ('P6', 'P6-01', 'Publication d''un rapport annuel dédié à l''investissement responsable', 'ELEVEE'),
  ('P6', 'P6-02', 'Indicateurs quantitatifs de suivi de la mise en œuvre des Principes', 'MOYENNE'),
  ('P6', 'P6-03', 'Vérification externe (assurance) du reporting ESG', 'FAIBLE'),
  ('P6', 'P6-04', 'Fixation d''objectifs chiffrés et trajectoire de progrès ESG', 'MOYENNE'),
  ('P6', 'P6-05', 'Alignement du reporting avec les recommandations TCFD/ISSB', 'MOYENNE')
) AS v(domaine_code, code, libelle, criticite)
JOIN referentiel r ON r.code = 'PRI'
JOIN domaine d ON d.referentiel_id = r.id AND d.code = v.domaine_code
JOIN criticite ct ON ct.code = v.criticite::niveau_criticite
ON CONFLICT (domaine_id, code) DO NOTHING;

-- =====================================================================
-- GRESB — Global Real Estate Sustainability Benchmark (10 domaines, 37 critères)
-- =====================================================================

INSERT INTO domaine (referentiel_id, code, nom, description, ordre)
SELECT r.id, v.code, v.nom, v.description, v.ordre
FROM referentiel r,
(VALUES
  ('MGT-LEAD',   'Leadership et stratégie ESG',           'Composante Management — portage de la stratégie',        1),
  ('MGT-POL',    'Politiques et publication',              'Composante Management — politiques et reporting',        2),
  ('MGT-RISK',   'Gestion des risques ESG',                 'Composante Management — risques climatiques et ESG',     3),
  ('MGT-ENGAGE', 'Engagement des parties prenantes',        'Composante Management — locataires, prestataires',       4),
  ('PERF-ENER',  'Performance énergétique',                 'Composante Performance — énergie du patrimoine',          5),
  ('PERF-GES',   'Émissions de gaz à effet de serre',       'Composante Performance — bilan carbone et trajectoire',   6),
  ('PERF-EAU',   'Gestion de l''eau',                        'Composante Performance — consommation et récupération',  7),
  ('PERF-DECH',  'Gestion des déchets',                      'Composante Performance — tri, valorisation, chantier',   8),
  ('PERF-CERT',  'Certifications et qualité du bâti',        'Composante Performance — labels et diagnostics',         9),
  ('PERF-COMM',  'Santé, bien-être et communautés',          'Composante Performance — confort des occupants',        10)
) AS v(code, nom, description, ordre)
WHERE r.code = 'GRESB'
ON CONFLICT (referentiel_id, code) DO NOTHING;

INSERT INTO critere (domaine_id, code, libelle, criticite_id, applicabilite, actif)
SELECT d.id, v.code, v.libelle, ct.id, 'GENERALE'::type_applicabilite, true
FROM (VALUES
  ('MGT-LEAD', 'MGT-LEAD-01', 'Stratégie ESG immobilière formalisée avec objectifs chiffrés', 'ELEVEE'),
  ('MGT-LEAD', 'MGT-LEAD-02', 'Portage de la stratégie ESG au niveau du comité de direction', 'MOYENNE'),
  ('MGT-LEAD', 'MGT-LEAD-03', 'Ressources dédiées (budget, effectifs) à la performance durable du patrimoine', 'MOYENNE'),
  ('MGT-LEAD', 'MGT-LEAD-04', 'Adhésion à des initiatives sectorielles de durabilité immobilière', 'FAIBLE'),

  ('MGT-POL', 'MGT-POL-01', 'Politique environnementale formalisée couvrant l''ensemble du patrimoine', 'ELEVEE'),
  ('MGT-POL', 'MGT-POL-02', 'Politique sociale (santé, sécurité, inclusion) applicable aux actifs gérés', 'MOYENNE'),
  ('MGT-POL', 'MGT-POL-03', 'Publication d''un rapport de durabilité annuel du patrimoine', 'MOYENNE'),
  ('MGT-POL', 'MGT-POL-04', 'Couverture du reporting par un standard reconnu (GRI, EPRA sBPR)', 'FAIBLE'),

  ('MGT-RISK', 'MGT-RISK-01', 'Cartographie des risques climatiques physiques sur le patrimoine', 'ELEVEE'),
  ('MGT-RISK', 'MGT-RISK-02', 'Cartographie des risques de transition (réglementation énergétique, carbone)', 'ELEVEE'),
  ('MGT-RISK', 'MGT-RISK-03', 'Intégration des risques ESG dans les décisions d''acquisition/cession', 'MOYENNE'),
  ('MGT-RISK', 'MGT-RISK-04', 'Plan de continuité face aux risques climatiques extrêmes', 'MOYENNE'),

  ('MGT-ENGAGE', 'MGT-ENGAGE-01', 'Dialogue structuré avec les locataires sur la performance durable', 'MOYENNE'),
  ('MGT-ENGAGE', 'MGT-ENGAGE-02', 'Dialogue avec les prestataires et gestionnaires d''actifs sur les exigences ESG', 'MOYENNE'),
  ('MGT-ENGAGE', 'MGT-ENGAGE-03', 'Implication des collectivités locales dans les projets immobiliers', 'FAIBLE'),
  ('MGT-ENGAGE', 'MGT-ENGAGE-04', 'Clauses ESG intégrées dans les baux verts (« green leases »)', 'MOYENNE'),

  ('PERF-ENER', 'PERF-ENER-01', 'Suivi de la consommation énergétique du patrimoine (compteurs, sous-comptage)', 'ELEVEE'),
  ('PERF-ENER', 'PERF-ENER-02', 'Objectifs chiffrés de réduction de la consommation énergétique', 'ELEVEE'),
  ('PERF-ENER', 'PERF-ENER-03', 'Part des actifs alimentés par des énergies renouvelables', 'MOYENNE'),
  ('PERF-ENER', 'PERF-ENER-04', 'Programme de rénovation énergétique du patrimoine existant', 'ELEVEE'),
  ('PERF-ENER', 'PERF-ENER-05', 'Certification énergétique des nouveaux projets (BREEAM, LEED, HQE)', 'MOYENNE'),

  ('PERF-GES', 'PERF-GES-01', 'Bilan carbone du patrimoine couvrant les scopes 1 et 2', 'ELEVEE'),
  ('PERF-GES', 'PERF-GES-02', 'Bilan carbone étendu au scope 3 (construction, locataires)', 'MOYENNE'),
  ('PERF-GES', 'PERF-GES-03', 'Trajectoire de décarbonation alignée sur un scénario reconnu (SBTi, 1,5°C)', 'ELEVEE'),
  ('PERF-GES', 'PERF-GES-04', 'Compensation carbone résiduelle documentée et vérifiée', 'FAIBLE'),

  ('PERF-EAU', 'PERF-EAU-01', 'Suivi de la consommation d''eau du patrimoine', 'MOYENNE'),
  ('PERF-EAU', 'PERF-EAU-02', 'Objectifs de réduction de la consommation d''eau', 'MOYENNE'),
  ('PERF-EAU', 'PERF-EAU-03', 'Dispositifs de récupération et réutilisation des eaux pluviales', 'FAIBLE'),

  ('PERF-DECH', 'PERF-DECH-01', 'Suivi et tri des déchets générés par le patrimoine', 'MOYENNE'),
  ('PERF-DECH', 'PERF-DECH-02', 'Objectifs de valorisation/recyclage des déchets', 'MOYENNE'),
  ('PERF-DECH', 'PERF-DECH-03', 'Gestion des déchets de chantier lors des travaux', 'FAIBLE'),

  ('PERF-CERT', 'PERF-CERT-01', 'Part du patrimoine disposant d''une certification environnementale reconnue', 'MOYENNE'),
  ('PERF-CERT', 'PERF-CERT-02', 'Diagnostics de performance énergétique à jour sur l''ensemble du patrimoine', 'ELEVEE'),
  ('PERF-CERT', 'PERF-CERT-03', 'Accessibilité et confort d''usage intégrés dès la conception', 'FAIBLE'),

  ('PERF-COMM', 'PERF-COMM-01', 'Qualité de l''air intérieur suivie dans les bâtiments occupés', 'MOYENNE'),
  ('PERF-COMM', 'PERF-COMM-02', 'Aménagements favorisant le bien-être des occupants (lumière naturelle, espaces verts)', 'FAIBLE'),
  ('PERF-COMM', 'PERF-COMM-03', 'Contribution du patrimoine à la vie des communautés locales', 'FAIBLE')
) AS v(domaine_code, code, libelle, criticite)
JOIN referentiel r ON r.code = 'GRESB'
JOIN domaine d ON d.referentiel_id = r.id AND d.code = v.domaine_code
JOIN criticite ct ON ct.code = v.criticite::niveau_criticite
ON CONFLICT (domaine_id, code) DO NOTHING;

-- =====================================================================
-- ITIE — Initiative pour la Transparence dans les Industries Extractives
-- (7 domaines, 27 critères — exigences du Standard ITIE 2023)
-- =====================================================================

INSERT INTO domaine (referentiel_id, code, nom, description, ordre)
SELECT r.id, v.code, v.nom, v.description, v.ordre
FROM referentiel r,
(VALUES
  ('CADRE',     'Cadre légal et institutionnel',   'Exigence 2 — cadre légal, licences, bénéficiaires effectifs', 1),
  ('ATTRIB',    'Octroi des titres et exploration', 'Exigence 2 — attribution des titres miniers/pétroliers',      2),
  ('PROD',      'Suivi de la production',           'Exigence 3 — volumes et valeur de la production',             3),
  ('REV-COLL',  'Collecte des revenus',              'Exigence 4 — paiements aux administrations publiques',       4),
  ('REV-ALLOC', 'Allocation des revenus',            'Exigence 5 — répartition et transferts infranationaux',      5),
  ('IMPACT-SOC','Dépenses sociales et économiques',  'Exigence 6 — retombées locales et fermeture des sites',      6),
  ('RESULT',    'Résultats et impact',               'Exigence 7 — évaluation et accès aux données',                7)
) AS v(code, nom, description, ordre)
WHERE r.code = 'ITIE'
ON CONFLICT (referentiel_id, code) DO NOTHING;

INSERT INTO critere (domaine_id, code, libelle, criticite_id, applicabilite, actif)
SELECT d.id, v.code, v.libelle, ct.id, 'GENERALE'::type_applicabilite, true
FROM (VALUES
  ('CADRE', 'CADRE-01', 'Cadre légal régissant le secteur extractif rendu public', 'ELEVEE'),
  ('CADRE', 'CADRE-02', 'Registre public des titres et licences d''exploration/exploitation', 'ELEVEE'),
  ('CADRE', 'CADRE-03', 'Transparence sur les bénéficiaires effectifs des sociétés extractives', 'CRITIQUE'),
  ('CADRE', 'CADRE-04', 'Publication des contrats et licences signés avec l''État', 'ELEVEE'),
  ('CADRE', 'CADRE-05', 'Participation de l''entreprise au processus multipartite ITIE national', 'MOYENNE'),

  ('ATTRIB', 'ATTRIB-01', 'Procédure d''attribution des licences documentée et transparente', 'ELEVEE'),
  ('ATTRIB', 'ATTRIB-02', 'Critères techniques et financiers d''octroi des licences publiés', 'MOYENNE'),
  ('ATTRIB', 'ATTRIB-03', 'Registre cadastral minier/pétrolier accessible au public', 'MOYENNE'),
  ('ATTRIB', 'ATTRIB-04', 'Absence de conflit d''intérêts dans l''attribution des titres', 'CRITIQUE'),

  ('PROD', 'PROD-01', 'Volumes de production déclarés et publiés', 'ELEVEE'),
  ('PROD', 'PROD-02', 'Valeur de la production déclarée', 'ELEVEE'),
  ('PROD', 'PROD-03', 'Système de mesure et de traçabilité de la production', 'MOYENNE'),
  ('PROD', 'PROD-04', 'Exportations déclarées et réconciliées avec les douanes', 'MOYENNE'),

  ('REV-COLL', 'REV-COLL-01', 'Paiements aux administrations publiques déclarés de façon désagrégée', 'CRITIQUE'),
  ('REV-COLL', 'REV-COLL-02', 'Réconciliation des paiements avec les recettes déclarées par l''État', 'ELEVEE'),
  ('REV-COLL', 'REV-COLL-03', 'Respect des obligations fiscales et redevances minières/pétrolières', 'CRITIQUE'),
  ('REV-COLL', 'REV-COLL-04', 'Paiements en nature (infrastructures, troc) déclarés et valorisés', 'MOYENNE'),

  ('REV-ALLOC', 'REV-ALLOC-01', 'Transferts infranationaux liés à l''activité extractive tracés', 'MOYENNE'),
  ('REV-ALLOC', 'REV-ALLOC-02', 'Contribution à des fonds souverains ou de stabilisation documentée', 'FAIBLE'),
  ('REV-ALLOC', 'REV-ALLOC-03', 'Transparence sur les dépenses quasi-fiscales de l''entreprise', 'ELEVEE'),

  ('IMPACT-SOC', 'IMPACT-SOC-01', 'Dépenses sociales volontaires (santé, éducation, infrastructures) déclarées', 'MOYENNE'),
  ('IMPACT-SOC', 'IMPACT-SOC-02', 'Contenu local : emploi et achats locaux favorisés', 'ELEVEE'),
  ('IMPACT-SOC', 'IMPACT-SOC-03', 'Politique de transfert de compétences aux communautés locales', 'FAIBLE'),
  ('IMPACT-SOC', 'IMPACT-SOC-04', 'Gestion transparente des plans de fermeture et de réhabilitation des sites', 'ELEVEE'),

  ('RESULT', 'RESULT-01', 'Évaluation périodique de l''impact économique de l''activité extractive', 'FAIBLE'),
  ('RESULT', 'RESULT-02', 'Publication de données en formats ouverts et réutilisables', 'FAIBLE'),
  ('RESULT', 'RESULT-03', 'Mécanisme de traitement des plaintes des communautés affectées', 'ELEVEE')
) AS v(domaine_code, code, libelle, criticite)
JOIN referentiel r ON r.code = 'ITIE'
JOIN domaine d ON d.referentiel_id = r.id AND d.code = v.domaine_code
JOIN criticite ct ON ct.code = v.criticite::niveau_criticite
ON CONFLICT (domaine_id, code) DO NOTHING;

-- =====================================================================
-- IFC/SFI — 8 Performance Standards (8 domaines, 31 critères)
-- =====================================================================

INSERT INTO domaine (referentiel_id, code, nom, description, ordre)
SELECT r.id, v.code, v.nom, v.description, v.ordre
FROM referentiel r,
(VALUES
  ('PS1', 'Évaluation et gestion des risques et impacts E&S', 'Performance Standard 1', 1),
  ('PS2', 'Main-d''œuvre et conditions de travail',            'Performance Standard 2', 2),
  ('PS3', 'Utilisation efficace des ressources et pollution',   'Performance Standard 3', 3),
  ('PS4', 'Santé, sécurité et sûreté des communautés',          'Performance Standard 4', 4),
  ('PS5', 'Acquisition de terres et réinstallation',            'Performance Standard 5', 5),
  ('PS6', 'Conservation de la biodiversité',                    'Performance Standard 6', 6),
  ('PS7', 'Peuples autochtones',                                'Performance Standard 7', 7),
  ('PS8', 'Patrimoine culturel',                                'Performance Standard 8', 8)
) AS v(code, nom, description, ordre)
WHERE r.code = 'IFC_SFI'
ON CONFLICT (referentiel_id, code) DO NOTHING;

INSERT INTO critere (domaine_id, code, libelle, criticite_id, applicabilite, actif)
SELECT d.id, v.code, v.libelle, ct.id, 'GENERALE'::type_applicabilite, true
FROM (VALUES
  ('PS1', 'PS1-01', 'Système de gestion environnementale et sociale (SGES) formalisé', 'ELEVEE'),
  ('PS1', 'PS1-02', 'Évaluation des risques et impacts E&S réalisée avant tout projet', 'ELEVEE'),
  ('PS1', 'PS1-03', 'Plan d''engagement des parties prenantes formalisé', 'MOYENNE'),
  ('PS1', 'PS1-04', 'Mécanisme de gestion des plaintes accessible aux parties affectées', 'ELEVEE'),
  ('PS1', 'PS1-05', 'Suivi et reporting périodique de la performance E&S', 'MOYENNE'),

  ('PS2', 'PS2-01', 'Politique de gestion des ressources humaines conforme aux normes internationales', 'ELEVEE'),
  ('PS2', 'PS2-02', 'Non-discrimination et égalité des chances dans l''emploi', 'ELEVEE'),
  ('PS2', 'PS2-03', 'Mécanisme de règlement des griefs pour les travailleurs', 'MOYENNE'),
  ('PS2', 'PS2-04', 'Santé et sécurité au travail conformes aux bonnes pratiques internationales', 'CRITIQUE'),
  ('PS2', 'PS2-05', 'Gestion responsable de la main-d''œuvre des fournisseurs et sous-traitants', 'MOYENNE'),

  ('PS3', 'PS3-01', 'Suivi de la consommation de ressources (énergie, eau, matières)', 'MOYENNE'),
  ('PS3', 'PS3-02', 'Mesures de prévention et de réduction de la pollution', 'ELEVEE'),
  ('PS3', 'PS3-03', 'Gestion des déchets dangereux conforme aux standards internationaux', 'ELEVEE'),
  ('PS3', 'PS3-04', 'Suivi des émissions de gaz à effet de serre du projet', 'MOYENNE'),

  ('PS4', 'PS4-01', 'Évaluation des risques du projet pour la santé et la sécurité des communautés', 'ELEVEE'),
  ('PS4', 'PS4-02', 'Plan de gestion des situations d''urgence impliquant les communautés', 'MOYENNE'),
  ('PS4', 'PS4-03', 'Encadrement du personnel de sécurité conforme aux droits humains', 'CRITIQUE'),

  ('PS5', 'PS5-01', 'Procédure d''acquisition foncière conforme aux standards internationaux', 'ELEVEE'),
  ('PS5', 'PS5-02', 'Plan d''action de réinstallation en cas de déplacement de populations', 'CRITIQUE'),
  ('PS5', 'PS5-03', 'Compensation juste et préalable des personnes affectées', 'CRITIQUE'),
  ('PS5', 'PS5-04', 'Restauration des moyens de subsistance des populations déplacées', 'ELEVEE'),

  ('PS6', 'PS6-01', 'Évaluation des impacts sur la biodiversité et les habitats naturels', 'ELEVEE'),
  ('PS6', 'PS6-02', 'Application de la hiérarchie d''atténuation (éviter, réduire, restaurer, compenser)', 'ELEVEE'),
  ('PS6', 'PS6-03', 'Absence d''impact significatif sur les habitats critiques ou zones protégées', 'CRITIQUE'),
  ('PS6', 'PS6-04', 'Plan de gestion de la biodiversité pour les projets à risque', 'MOYENNE'),

  ('PS7', 'PS7-01', 'Identification de la présence de peuples autochtones dans la zone du projet', 'ELEVEE'),
  ('PS7', 'PS7-02', 'Consultation libre, préalable et éclairée des peuples autochtones', 'CRITIQUE'),
  ('PS7', 'PS7-03', 'Mesures spécifiques de protection des droits et du patrimoine autochtones', 'ELEVEE'),

  ('PS8', 'PS8-01', 'Identification du patrimoine culturel présent sur la zone du projet', 'MOYENNE'),
  ('PS8', 'PS8-02', 'Procédure de découverte fortuite de vestiges culturels', 'FAIBLE'),
  ('PS8', 'PS8-03', 'Préservation ou valorisation du patrimoine culturel affecté', 'FAIBLE')
) AS v(domaine_code, code, libelle, criticite)
JOIN referentiel r ON r.code = 'IFC_SFI'
JOIN domaine d ON d.referentiel_id = r.id AND d.code = v.domaine_code
JOIN criticite ct ON ct.code = v.criticite::niveau_criticite
ON CONFLICT (domaine_id, code) DO NOTHING;

-- =====================================================================
-- Question générique par critère (placeholder — voir en-tête, même
-- approche que V11 pour Smartex Sustway)
-- =====================================================================

INSERT INTO question (critere_id, code, libelle, type, ordre, obligatoire)
SELECT c.id, c.code || '-Q1', 'Disposez-vous d''une preuve documentaire pour : ' || c.libelle || ' ?', 'FERMEE', 1, true
FROM critere c
JOIN domaine d ON d.id = c.domaine_id
JOIN referentiel r ON r.id = d.referentiel_id
WHERE r.code IN ('PRI', 'GRESB', 'ITIE', 'IFC_SFI')
ON CONFLICT (critere_id, code) DO NOTHING;

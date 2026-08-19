-- =====================================================================
-- SEED — Données de référence (Rôles, Permissions de base, Criticité,
-- Formules d'abonnement, Bailleur pilote)
-- =====================================================================

-- Rôles (CDC section 4)
INSERT INTO role (code, nom, description) VALUES
  ('SUPER_ADMIN', 'Super administrateur', 'Gestion des référentiels, des abonnements, de tous les comptes'),
  ('ADMIN_AUDIT', 'Administrateur métier', 'Gestion des missions, supervision des audits'),
  ('EXPERT_REVIEWER', 'Expert RSE', 'Revue ciblée des évaluations à faible confiance IA (formule Avancées)'),
  ('RESPONSABLE_ENTREPRISE', 'Responsable entreprise', 'Création d''audits, dépôt de preuves, suivi des actions'),
  ('EMPLOYE', 'Employé', 'Contribution ponctuelle à la collecte de preuves'),
  ('VISITEUR', 'Visiteur (Free)', 'Consultation uniquement, mode démonstration')
ON CONFLICT (code) DO NOTHING;

-- Criticité (§7, poids utilisés dans le calcul du risque attendu — RG26)
INSERT INTO criticite (code, libelle, poids) VALUES
  ('FAIBLE', 'Faible', 1.0),
  ('MOYENNE', 'Moyenne', 2.0),
  ('ELEVEE', 'Élevée', 3.0),
  ('CRITIQUE', 'Critique', 4.0)
ON CONFLICT (code) DO NOTHING;

-- Formules d'abonnement (CDC section 5)
INSERT INTO formule_abonnement (code, nom, description, prix_mensuel, prix_annuel, active) VALUES
  ('FREE', 'Free', 'Mode de visite et de démonstration, aucune action de création/modification/suppression', 0, 0, TRUE),
  ('STANDARD', 'Standard', 'Pipeline IA basique (Document, Compliance, Scoring), rapport simple', NULL, NULL, TRUE),
  ('AVANCEES', 'Avancées', 'Pipeline IA complet (+ Risk, Recommendation), revue experte, rapport détaillé, indice de préparation financements verts', NULL, NULL, TRUE)
ON CONFLICT (code) DO NOTHING;
-- Note : prix_mensuel/prix_annuel à compléter lors du cadrage tarifaire avec Smartex Expertises.

-- Bailleur pilote — volet financements verts (décision actée CDC §13)
INSERT INTO bailleur (code, nom, description) VALUES
  ('IFC_SFI', 'IFC / SFI', 'Société Financière Internationale — 8 Performance Standards. Bailleur pilote du volet financements verts (autres bailleurs envisagés en V2)')
ON CONFLICT (code) DO NOTHING;

-- Référentiel Smartex Sustway (racine — les 87 critères sont chargés en phase D,
-- une fois le back-office / la validation progressive des experts métier lancée)
INSERT INTO referentiel (code, nom, type, description, version) VALUES
  ('SMARTEX_SUSTWAY', 'Référentiel Smartex Sustway', 'SMARTEX', 'Grille de bonnes pratiques RSE issue de l''étude sectorielle CGECI (2018), 87 critères en 6 parties', '1.0'),
  ('PRI', 'PRI', 'PRI', 'Principles for Responsible Investment — secteur finance', '1.0'),
  ('GRESB', 'GRESB', 'GRESB', 'Global Real Estate Sustainability Benchmark — secteur immobilier', '1.0'),
  ('ITIE', 'ITIE', 'ITIE', 'Initiative pour la Transparence dans les Industries Extractives — secteur minier', '1.0'),
  ('IFC_SFI', 'Référentiel bailleur IFC/SFI', 'IFC_SFI', 'Référentiel transversal financements verts, superposé aux autres référentiels (RG40)', '1.0')
ON CONFLICT (code) DO NOTHING;

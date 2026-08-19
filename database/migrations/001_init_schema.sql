-- =====================================================================
-- SMARTEX SUSTWAY — SCHÉMA POSTGRESQL
-- Généré à partir du MCD v1 (12 blocs) et du CDC v1.5/1.6
-- Phase A du plan de projet — Fondations métier
-- =====================================================================
-- Convention : PK en UUID (gen_random_uuid()), horodatage created_at/
-- updated_at en timestamptz, trigger générique de mise à jour de
-- updated_at, ENUM PostgreSQL pour les champs à valeurs fermées citées
-- dans le CDC (statuts, criticité, applicabilité...).
-- =====================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;   -- gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS citext;     -- email insensible à la casse

-- ---------------------------------------------------------------------
-- Fonction utilitaire : mise à jour automatique de updated_at
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =====================================================================
-- TYPES ÉNUMÉRÉS
-- =====================================================================

CREATE TYPE statut_generique       AS ENUM ('ACTIF', 'INACTIF', 'SUSPENDU', 'ARCHIVE');
CREATE TYPE statut_utilisateur     AS ENUM ('EN_ATTENTE_VERIFICATION', 'ACTIF', 'SUSPENDU', 'DESACTIVE');
CREATE TYPE taille_entreprise      AS ENUM ('TPE', 'PME', 'ETI', 'GRANDE_ENTREPRISE');
CREATE TYPE periodicite_facturation AS ENUM ('MENSUELLE', 'ANNUELLE');
CREATE TYPE statut_abonnement      AS ENUM ('ACTIF', 'EXPIRE', 'RESILIE', 'EN_ATTENTE_PAIEMENT');
CREATE TYPE fournisseur_paiement   AS ENUM ('PI_SPI', 'WAVE');
CREATE TYPE statut_paiement        AS ENUM ('EN_ATTENTE', 'REUSSI', 'ECHOUE', 'REMBOURSE');
CREATE TYPE type_referentiel       AS ENUM ('SMARTEX', 'PRI', 'GRESB', 'ITIE', 'IFC_SFI');
CREATE TYPE type_question          AS ENUM ('OUVERTE', 'FERMEE');
CREATE TYPE niveau_criticite       AS ENUM ('FAIBLE', 'MOYENNE', 'ELEVEE', 'CRITIQUE');
CREATE TYPE type_applicabilite     AS ENUM ('GENERALE', 'SECTORIELLE', 'BAILLEUR');
CREATE TYPE statut_audit           AS ENUM ('BROUILLON', 'EN_COURS', 'TERMINE', 'ANNULE');
CREATE TYPE role_mission_auditeur  AS ENUM ('AUDITEUR_PRINCIPAL', 'AUDITEUR_SECONDAIRE', 'EXPERT_REVIEWER', 'OBSERVATEUR');
CREATE TYPE statut_scan_document   AS ENUM ('EN_ATTENTE', 'SAIN', 'INFECTE', 'ERREUR');
CREATE TYPE type_preuve            AS ENUM ('PIECE', 'JUSTIFICATIF', 'AUTRE');
CREATE TYPE formule_pipeline       AS ENUM ('STANDARD', 'AVANCEES');
CREATE TYPE statut_pipeline        AS ENUM ('EN_ATTENTE', 'EN_COURS', 'TERMINE', 'ERREUR');
CREATE TYPE type_agent_ia          AS ENUM ('DOCUMENT', 'EVIDENCE', 'COMPLIANCE', 'RISK', 'SCORING', 'RECOMMENDATION', 'REPORTING');
CREATE TYPE statut_execution_agent AS ENUM ('EN_ATTENTE', 'EN_COURS', 'TERMINE', 'ERREUR');
CREATE TYPE source_evaluation      AS ENUM ('IA', 'EXPERT');
CREATE TYPE statut_evaluation      AS ENUM ('PROVISOIRE', 'EN_REVUE', 'VALIDEE');
CREATE TYPE statut_revue_experte   AS ENUM ('EN_ATTENTE', 'EN_COURS', 'TERMINEE');
CREATE TYPE niveau_non_conformite  AS ENUM ('MINEURE', 'MODEREE', 'MAJEURE', 'CRITIQUE');
CREATE TYPE statut_non_conformite  AS ENUM ('OUVERTE', 'EN_TRAITEMENT', 'CLOTUREE');
CREATE TYPE statut_action_corrective AS ENUM ('OUVERTE', 'EN_COURS', 'TERMINEE', 'VALIDEE');
CREATE TYPE priorite_action        AS ENUM ('BASSE', 'MOYENNE', 'HAUTE', 'CRITIQUE');
CREATE TYPE type_rapport           AS ENUM ('SYNTHESE', 'DETAILLE', 'PLAN_ACTION', 'INDICE_FINANCEMENTS_VERTS');
CREATE TYPE format_rapport         AS ENUM ('PDF', 'CSV', 'EXCEL');

-- =====================================================================
-- BLOC 1 — UTILISATEURS & RBAC
-- =====================================================================

CREATE TABLE role (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code          VARCHAR(50)  NOT NULL UNIQUE,   -- SUPER_ADMIN, ADMIN_AUDIT, EXPERT_REVIEWER, RESPONSABLE_ENTREPRISE, EMPLOYE, VISITEUR
  nom           VARCHAR(150) NOT NULL,
  description   TEXT
);
COMMENT ON TABLE role IS 'Rôles applicatifs — CDC section 4';

CREATE TABLE permission (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code          VARCHAR(100) NOT NULL UNIQUE,
  nom           VARCHAR(150) NOT NULL,
  description   TEXT
);

CREATE TABLE role_permission (
  role_id       UUID NOT NULL REFERENCES role(id) ON DELETE CASCADE,
  permission_id UUID NOT NULL REFERENCES permission(id) ON DELETE CASCADE,
  PRIMARY KEY (role_id, permission_id)
);

CREATE TABLE utilisateur (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nom                 VARCHAR(150) NOT NULL,
  prenom              VARCHAR(150) NOT NULL,
  email               CITEXT NOT NULL UNIQUE,
  mot_de_passe_hash   TEXT NOT NULL,
  email_verifie       BOOLEAN NOT NULL DEFAULT FALSE,
  deuxfa_active       BOOLEAN NOT NULL DEFAULT FALSE,      -- 2FA optionnelle, RG36
  deuxfa_methode      VARCHAR(20),                          -- 'SMS' | 'APP'
  statut              statut_utilisateur NOT NULL DEFAULT 'EN_ATTENTE_VERIFICATION',
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);
COMMENT ON TABLE utilisateur IS 'RG36 : compte activé uniquement après vérification email ; 2FA optionnelle';

CREATE TRIGGER trg_utilisateur_updated_at
  BEFORE UPDATE ON utilisateur
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX idx_utilisateur_email ON utilisateur (email);

-- =====================================================================
-- BLOC 2 — ENTREPRISES, PAYS & SITES
-- =====================================================================

CREATE TABLE pays (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nom               VARCHAR(150) NOT NULL,
  code_iso_alpha2   CHAR(2) NOT NULL UNIQUE,
  code_iso_alpha3   CHAR(3) NOT NULL UNIQUE,
  code_numerique    CHAR(3) NOT NULL UNIQUE
);
COMMENT ON TABLE pays IS 'RG01 : un pays est identifié de manière unique';

CREATE TABLE secteur (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code          VARCHAR(50) NOT NULL UNIQUE,
  nom           VARCHAR(150) NOT NULL,
  description   TEXT
);
COMMENT ON TABLE secteur IS 'Liste sectorielle basée sur l''étude CGECI (décision actée CDC section 13)';

CREATE TABLE entreprise (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  raison_sociale      VARCHAR(255) NOT NULL,
  identifiant_legal   VARCHAR(100) NOT NULL UNIQUE,   -- RG02
  secteur_id          UUID REFERENCES secteur(id) ON DELETE RESTRICT,
  taille              taille_entreprise,
  statut              statut_generique NOT NULL DEFAULT 'ACTIF',
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);
COMMENT ON TABLE entreprise IS 'RG02 : identité légale unique. RG34 : secteur/taille utilisés pour la composition dynamique du questionnaire';

CREATE TRIGGER trg_entreprise_updated_at
  BEFORE UPDATE ON entreprise
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE entreprise_pays (
  entreprise_id   UUID NOT NULL REFERENCES entreprise(id) ON DELETE CASCADE,
  pays_id         UUID NOT NULL REFERENCES pays(id) ON DELETE RESTRICT,
  PRIMARY KEY (entreprise_id, pays_id)
);
COMMENT ON TABLE entreprise_pays IS 'RG03 : une entreprise peut exercer dans plusieurs pays (N-N)';

CREATE TABLE site (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entreprise_id UUID NOT NULL REFERENCES entreprise(id) ON DELETE CASCADE,
  pays_id       UUID NOT NULL REFERENCES pays(id) ON DELETE RESTRICT,
  nom           VARCHAR(255) NOT NULL,
  adresse       TEXT,
  ville         VARCHAR(150),
  code_postal   VARCHAR(20),
  statut        statut_generique NOT NULL DEFAULT 'ACTIF'
);
COMMENT ON TABLE site IS 'RG04 : une entreprise peut posséder plusieurs sites';

CREATE INDEX idx_site_entreprise ON site (entreprise_id);

CREATE TABLE utilisateur_entreprise (
  utilisateur_id    UUID NOT NULL REFERENCES utilisateur(id) ON DELETE CASCADE,
  entreprise_id     UUID NOT NULL REFERENCES entreprise(id) ON DELETE CASCADE,
  site_id           UUID REFERENCES site(id) ON DELETE SET NULL,
  role_id           UUID NOT NULL REFERENCES role(id) ON DELETE RESTRICT,
  date_affectation  TIMESTAMPTZ NOT NULL DEFAULT now(),
  statut            statut_generique NOT NULL DEFAULT 'ACTIF',
  PRIMARY KEY (utilisateur_id, entreprise_id, site_id)
);
COMMENT ON TABLE utilisateur_entreprise IS 'RG05 : rattachement utilisateur/entreprise (table de liaison RBAC)';

-- =====================================================================
-- BLOC 3 — ABONNEMENTS & PAIEMENTS
-- =====================================================================

CREATE TABLE formule_abonnement (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code          VARCHAR(20) NOT NULL UNIQUE,     -- FREE, STANDARD, AVANCEES
  nom           VARCHAR(100) NOT NULL,
  description   TEXT,
  prix_mensuel  NUMERIC(10,2),
  prix_annuel   NUMERIC(10,2),
  active        BOOLEAN NOT NULL DEFAULT TRUE
);
COMMENT ON TABLE formule_abonnement IS 'CDC section 5 — Free / Standard / Avancées';

CREATE TABLE abonnement (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entreprise_id UUID NOT NULL REFERENCES entreprise(id) ON DELETE CASCADE,
  formule_id    UUID NOT NULL REFERENCES formule_abonnement(id) ON DELETE RESTRICT,
  periodicite   periodicite_facturation,
  date_debut    DATE NOT NULL,
  date_fin      DATE,
  statut        statut_abonnement NOT NULL DEFAULT 'EN_ATTENTE_PAIEMENT',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
COMMENT ON TABLE abonnement IS 'RG24 : une organisation ne peut être créée sans formule valide. RG20 : audit possible seulement si abonnement actif';

CREATE INDEX idx_abonnement_entreprise ON abonnement (entreprise_id);

CREATE TABLE paiement (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  abonnement_id   UUID NOT NULL REFERENCES abonnement(id) ON DELETE CASCADE,
  fournisseur     fournisseur_paiement NOT NULL,   -- PI-SPI / Wave, décision actée §13
  reference       VARCHAR(150) NOT NULL UNIQUE,
  montant         NUMERIC(10,2) NOT NULL,
  devise          CHAR(3) NOT NULL DEFAULT 'XOF',
  statut          statut_paiement NOT NULL DEFAULT 'EN_ATTENTE',
  date_paiement   TIMESTAMPTZ
);
CREATE INDEX idx_paiement_abonnement ON paiement (abonnement_id);

-- =====================================================================
-- BLOC 4 — RÉFÉRENTIELS RSE
-- =====================================================================

CREATE TABLE criticite (
  id      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code    niveau_criticite NOT NULL UNIQUE,
  libelle VARCHAR(100) NOT NULL,
  poids   NUMERIC(4,2) NOT NULL   -- poids utilisé dans le calcul du risque attendu (RG26)
);

CREATE TABLE bailleur (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code          VARCHAR(30) NOT NULL UNIQUE,   -- ex. 'IFC_SFI'
  nom           VARCHAR(150) NOT NULL,
  description   TEXT
);
COMMENT ON TABLE bailleur IS 'RG40 : référentiel bailleur transversal (volet financements verts) — CDC v1.5 §7.7';

CREATE TABLE referentiel (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code          VARCHAR(30) NOT NULL UNIQUE,
  nom           VARCHAR(200) NOT NULL,
  type          type_referentiel NOT NULL,
  description   TEXT,
  version       VARCHAR(20) NOT NULL DEFAULT '1.0',
  statut        statut_generique NOT NULL DEFAULT 'ACTIF',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
COMMENT ON TABLE referentiel IS 'RG07 : un référentiel se décompose en plusieurs domaines. Versioning administré via back-office';

CREATE TABLE domaine (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referentiel_id  UUID NOT NULL REFERENCES referentiel(id) ON DELETE CASCADE,
  code            VARCHAR(30) NOT NULL,
  nom             VARCHAR(200) NOT NULL,
  description     TEXT,
  ordre           INTEGER NOT NULL DEFAULT 0,
  UNIQUE (referentiel_id, code)
);
COMMENT ON TABLE domaine IS 'RG08 : un domaine se décompose en plusieurs critères';

CREATE TABLE critere (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  domaine_id    UUID NOT NULL REFERENCES domaine(id) ON DELETE CASCADE,
  code          VARCHAR(30) NOT NULL,          -- ex. VE-01, GOUV-07, ENV-19...
  libelle       VARCHAR(500) NOT NULL,
  description   TEXT,
  applicabilite type_applicabilite NOT NULL DEFAULT 'GENERALE',  -- RG34 / RG39
  criticite_id  UUID REFERENCES criticite(id) ON DELETE RESTRICT, -- criticité générale par défaut
  actif         BOOLEAN NOT NULL DEFAULT TRUE,
  UNIQUE (domaine_id, code)
);
COMMENT ON TABLE critere IS 'RG09 : un critère peut posséder plusieurs questions. RG34/RG39 : applicabilité générale/sectorielle/bailleur';

CREATE INDEX idx_critere_domaine ON critere (domaine_id);

CREATE TABLE critere_secteur (
  critere_id  UUID NOT NULL REFERENCES critere(id) ON DELETE CASCADE,
  secteur_id  UUID NOT NULL REFERENCES secteur(id) ON DELETE CASCADE,
  applicable  BOOLEAN NOT NULL DEFAULT TRUE,
  criticite_id UUID REFERENCES criticite(id) ON DELETE RESTRICT,  -- surcharge sectorielle, peut être NULL
  PRIMARY KEY (critere_id, secteur_id)
);
COMMENT ON TABLE critere_secteur IS 'Applicabilité sectorielle du critère (RG34)';

CREATE TABLE critere_criticite_secteur (
  critere_id    UUID NOT NULL REFERENCES critere(id) ON DELETE CASCADE,
  secteur_id    UUID NOT NULL REFERENCES secteur(id) ON DELETE CASCADE,
  criticite_id  UUID NOT NULL REFERENCES criticite(id) ON DELETE RESTRICT,
  PRIMARY KEY (critere_id, secteur_id)
);
COMMENT ON TABLE critere_criticite_secteur IS 'RG37 : criticité variable selon le secteur d''activité (décision actée §13)';

CREATE TABLE critere_ponderation (
  critere_id    UUID NOT NULL REFERENCES critere(id) ON DELETE CASCADE,
  entreprise_id UUID NOT NULL REFERENCES entreprise(id) ON DELETE CASCADE,
  coefficient   NUMERIC(3,1) NOT NULL DEFAULT 1.0 CHECK (coefficient BETWEEN 1 AND 3),
  PRIMARY KEY (critere_id, entreprise_id)
);
COMMENT ON TABLE critere_ponderation IS 'Coefficient de pondération (1 à 3) modifiable par chaque entreprise cliente — §11.2';

CREATE TABLE critere_bailleur (
  critere_id  UUID NOT NULL REFERENCES critere(id) ON DELETE CASCADE,
  bailleur_id UUID NOT NULL REFERENCES bailleur(id) ON DELETE CASCADE,
  applicable  BOOLEAN NOT NULL DEFAULT TRUE,
  PRIMARY KEY (critere_id, bailleur_id)
);
COMMENT ON TABLE critere_bailleur IS 'RG39 : applicabilité bailleur (financements verts, volet IFC/SFI — CDC v1.5 §7.7)';

CREATE TABLE question (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  critere_id    UUID NOT NULL REFERENCES critere(id) ON DELETE CASCADE,
  code          VARCHAR(30) NOT NULL,
  libelle       TEXT NOT NULL,
  type          type_question NOT NULL DEFAULT 'FERMEE',
  ordre         INTEGER NOT NULL DEFAULT 0,
  obligatoire   BOOLEAN NOT NULL DEFAULT TRUE,
  UNIQUE (critere_id, code)
);
COMMENT ON TABLE question IS 'RG09 : plusieurs questions/indicateurs détaillés par critère (décision actée §13)';

-- =====================================================================
-- BLOC 5 — AUDITS & QUESTIONNAIRE
-- =====================================================================

CREATE TABLE audit (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entreprise_id           UUID NOT NULL REFERENCES entreprise(id) ON DELETE CASCADE,
  referentiel_id          UUID NOT NULL REFERENCES referentiel(id) ON DELETE RESTRICT,
  formule_abonnement_id   UUID REFERENCES formule_abonnement(id) ON DELETE RESTRICT,
  nom                     VARCHAR(255) NOT NULL,
  description             TEXT,
  date_debut              DATE NOT NULL,
  date_fin                DATE,
  statut                  statut_audit NOT NULL DEFAULT 'BROUILLON',
  created_by              UUID REFERENCES utilisateur(id) ON DELETE SET NULL,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);
COMMENT ON TABLE audit IS 'RG10/RG11 : une entreprise peut faire l''objet de plusieurs audits, sur un référentiel et une période donnés';

CREATE INDEX idx_audit_entreprise ON audit (entreprise_id);
CREATE INDEX idx_audit_referentiel ON audit (referentiel_id);

CREATE TABLE audit_site (
  audit_id  UUID NOT NULL REFERENCES audit(id) ON DELETE CASCADE,
  site_id   UUID NOT NULL REFERENCES site(id) ON DELETE CASCADE,
  PRIMARY KEY (audit_id, site_id)
);
COMMENT ON TABLE audit_site IS 'RG12 : une mission peut concerner plusieurs sites';

CREATE TABLE audit_auditeur (
  audit_id        UUID NOT NULL REFERENCES audit(id) ON DELETE CASCADE,
  utilisateur_id  UUID NOT NULL REFERENCES utilisateur(id) ON DELETE CASCADE,
  role_mission    role_mission_auditeur NOT NULL DEFAULT 'AUDITEUR_PRINCIPAL',
  PRIMARY KEY (audit_id, utilisateur_id)
);
COMMENT ON TABLE audit_auditeur IS 'RG06 : un auditeur/expert peut être affecté à plusieurs missions';

CREATE TABLE audit_critere (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  audit_id              UUID NOT NULL REFERENCES audit(id) ON DELETE CASCADE,
  critere_id            UUID NOT NULL REFERENCES critere(id) ON DELETE RESTRICT,
  actif                 BOOLEAN NOT NULL DEFAULT TRUE,
  applicable            BOOLEAN NOT NULL DEFAULT TRUE,
  coefficient_ponderation NUMERIC(3,1) NOT NULL DEFAULT 1.0,
  criticite_id          UUID REFERENCES criticite(id) ON DELETE RESTRICT,
  statut                VARCHAR(30) NOT NULL DEFAULT 'A_EVALUER',
  UNIQUE (audit_id, critere_id)
);
COMMENT ON TABLE audit_critere IS 'RG35 : le score est recalculé sur les seuls critères actifs/applicables de l''audit (numérateur et dénominateur cohérents)';

CREATE INDEX idx_audit_critere_audit ON audit_critere (audit_id);

CREATE TABLE audit_question (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  audit_critere_id  UUID NOT NULL REFERENCES audit_critere(id) ON DELETE CASCADE,
  question_id       UUID NOT NULL REFERENCES question(id) ON DELETE RESTRICT,
  statut             VARCHAR(30) NOT NULL DEFAULT 'A_REPONDRE',
  UNIQUE (audit_critere_id, question_id)
);

-- =====================================================================
-- BLOC 6 — DOCUMENTS & PREUVES
-- =====================================================================

CREATE TABLE document (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entreprise_id     UUID NOT NULL REFERENCES entreprise(id) ON DELETE CASCADE,
  site_id           UUID REFERENCES site(id) ON DELETE SET NULL,
  nom_original      VARCHAR(500) NOT NULL,
  nom_stockage      VARCHAR(500) NOT NULL,
  type_mime         VARCHAR(150) NOT NULL,
  taille            BIGINT NOT NULL,
  chemin_stockage   TEXT NOT NULL,           -- clé S3/MinIO
  hash              VARCHAR(128) NOT NULL,
  statut_scan       statut_scan_document NOT NULL DEFAULT 'EN_ATTENTE',
  uploaded_by       UUID REFERENCES utilisateur(id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
COMMENT ON TABLE document IS 'Exigence sécurité §1.4 : scan antivirus à l''upload, restriction des types de fichiers';

CREATE INDEX idx_document_entreprise ON document (entreprise_id);

CREATE TABLE preuve (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id   UUID NOT NULL REFERENCES document(id) ON DELETE CASCADE,
  audit_id      UUID NOT NULL REFERENCES audit(id) ON DELETE CASCADE,
  description   TEXT,
  type          type_preuve NOT NULL DEFAULT 'PIECE',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
COMMENT ON TABLE preuve IS 'RG15 : une évaluation peut être associée à plusieurs preuves ; un document peut servir à plusieurs critères';

CREATE TABLE preuve_critere (
  preuve_id         UUID NOT NULL REFERENCES preuve(id) ON DELETE CASCADE,
  audit_critere_id  UUID NOT NULL REFERENCES audit_critere(id) ON DELETE CASCADE,
  PRIMARY KEY (preuve_id, audit_critere_id)
);

-- =====================================================================
-- BLOC 7 — PIPELINE IA
-- =====================================================================

CREATE TABLE analyse_ia (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  audit_id    UUID NOT NULL REFERENCES audit(id) ON DELETE CASCADE,
  statut      statut_pipeline NOT NULL DEFAULT 'EN_ATTENTE',
  formule     formule_pipeline NOT NULL,     -- RG21 : pipeline dépend de la formule souscrite
  date_debut  TIMESTAMPTZ,
  date_fin    TIMESTAMPTZ,
  erreur      TEXT
);
COMMENT ON TABLE analyse_ia IS 'RG21 : pipeline d''agents IA exécuté sur une mission selon la formule';

CREATE INDEX idx_analyse_ia_audit ON analyse_ia (audit_id);

CREATE TABLE execution_agent (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  analyse_ia_id     UUID NOT NULL REFERENCES analyse_ia(id) ON DELETE CASCADE,
  agent             type_agent_ia NOT NULL,
  statut            statut_execution_agent NOT NULL DEFAULT 'EN_ATTENTE',
  input_reference   TEXT,
  output_reference  TEXT,
  date_debut        TIMESTAMPTZ,
  date_fin          TIMESTAMPTZ
);
COMMENT ON TABLE execution_agent IS 'Orchestrateur (§10) : Document/Evidence/Compliance/Risk/Scoring/Recommendation/Reporting Agents';

CREATE INDEX idx_execution_agent_analyse ON execution_agent (analyse_ia_id);

-- =====================================================================
-- BLOC 8 — ÉVALUATIONS & REVUE EXPERTE
-- =====================================================================

CREATE TABLE evaluation (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  audit_critere_id    UUID NOT NULL REFERENCES audit_critere(id) ON DELETE CASCADE,
  probabilite_conforme NUMERIC(5,4) NOT NULL CHECK (probabilite_conforme BETWEEN 0 AND 1),  -- RG27
  note                SMALLINT NOT NULL CHECK (note BETWEEN 1 AND 5),                        -- RG13
  confiance_ia        NUMERIC(5,4) CHECK (confiance_ia BETWEEN 0 AND 1),                     -- RG38 (seuil 80%)
  justification       TEXT,
  source              source_evaluation NOT NULL DEFAULT 'IA',
  auteur_id           UUID REFERENCES utilisateur(id) ON DELETE SET NULL,
  date_evaluation     TIMESTAMPTZ NOT NULL DEFAULT now(),
  version_referentiel VARCHAR(20),
  statut              statut_evaluation NOT NULL DEFAULT 'PROVISOIRE'
);
COMMENT ON TABLE evaluation IS 'RG14 : historique complet (probabilité, note dérivée, justification, preuves, auteur, date, version référentiel). RG27 : note jamais saisie directement par l''IA';

CREATE INDEX idx_evaluation_audit_critere ON evaluation (audit_critere_id);

CREATE TABLE revue_experte (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  evaluation_id         UUID NOT NULL REFERENCES evaluation(id) ON DELETE CASCADE,
  expert_id             UUID REFERENCES utilisateur(id) ON DELETE SET NULL,
  statut                statut_revue_experte NOT NULL DEFAULT 'EN_ATTENTE',
  commentaire           TEXT,
  probabilite_initiale  NUMERIC(5,4),
  probabilite_finale    NUMERIC(5,4),
  note_initiale         SMALLINT,
  note_finale           SMALLINT,
  date_attribution      TIMESTAMPTZ NOT NULL DEFAULT now(),
  date_completion       TIMESTAMPTZ
);
COMMENT ON TABLE revue_experte IS 'RG22/RG38 : file de revue experte si confiance IA < 80% (formule Avancées uniquement)';

-- =====================================================================
-- BLOC 9 — SCORING & RISQUE
-- =====================================================================

CREATE TABLE score_domaine (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  audit_id          UUID NOT NULL REFERENCES audit(id) ON DELETE CASCADE,
  domaine_id        UUID NOT NULL REFERENCES domaine(id) ON DELETE CASCADE,
  score             NUMERIC(6,2) NOT NULL,       -- somme notes / somme coefficients (RG32)
  coefficient_total NUMERIC(8,2) NOT NULL,
  date_calcul       TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (audit_id, domaine_id)
);
COMMENT ON TABLE score_domaine IS 'RG32 : score du domaine = somme des notes obtenues / somme des coefficients de pondération du domaine';

CREATE TABLE score_audit (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  audit_id      UUID NOT NULL REFERENCES audit(id) ON DELETE CASCADE,
  score_global  NUMERIC(6,2) NOT NULL,
  date_calcul   TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (audit_id)
);
COMMENT ON TABLE score_audit IS 'RG32 : score RSE global de l''audit';

CREATE TABLE risque_evaluation (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  evaluation_id   UUID NOT NULL REFERENCES evaluation(id) ON DELETE CASCADE,
  probabilite     NUMERIC(5,4) NOT NULL,
  criticite_poids NUMERIC(4,2) NOT NULL,
  risque_attendu  NUMERIC(6,4) NOT NULL,          -- RG26 : (1 - probabilité) × poids criticité
  niveau_priorite niveau_non_conformite,
  date_calcul     TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (evaluation_id)
);
COMMENT ON TABLE risque_evaluation IS 'RG26/§11.3 : risque attendu = (1 - probabilité conformité) × poids criticité (spécifique secteur le cas échéant)';

CREATE TABLE indice_preparation (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  audit_id      UUID NOT NULL REFERENCES audit(id) ON DELETE CASCADE,
  bailleur_id   UUID NOT NULL REFERENCES bailleur(id) ON DELETE CASCADE,
  score         NUMERIC(6,2) NOT NULL,
  date_calcul   TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (audit_id, bailleur_id)
);
COMMENT ON TABLE indice_preparation IS 'RG41/RG42/RG43 : indice de préparation bailleur, formule Avancées uniquement, readiness ≠ garantie d''éligibilité';

-- =====================================================================
-- BLOC 10 — NON-CONFORMITÉS & ACTIONS CORRECTIVES
-- =====================================================================

CREATE TABLE non_conforme (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  evaluation_id   UUID NOT NULL REFERENCES evaluation(id) ON DELETE CASCADE,
  titre           VARCHAR(255) NOT NULL,
  description     TEXT,
  niveau          niveau_non_conformite NOT NULL,
  risque_attendu  NUMERIC(6,4),
  statut          statut_non_conformite NOT NULL DEFAULT 'OUVERTE',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
COMMENT ON TABLE non_conforme IS 'RG17 : une évaluation peut générer zéro, une ou plusieurs non-conformités';

CREATE INDEX idx_non_conforme_evaluation ON non_conforme (evaluation_id);

CREATE TABLE action_corrective (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  non_conforme_id UUID NOT NULL REFERENCES non_conforme(id) ON DELETE CASCADE,
  titre           VARCHAR(255) NOT NULL,
  description     TEXT,
  responsable_id  UUID REFERENCES utilisateur(id) ON DELETE SET NULL,
  date_echeance   DATE,
  statut          statut_action_corrective NOT NULL DEFAULT 'OUVERTE',
  priorite        priorite_action NOT NULL DEFAULT 'MOYENNE',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
COMMENT ON TABLE action_corrective IS 'RG18 : une non-conformité peut donner lieu à plusieurs actions correctives';

CREATE TRIGGER trg_action_corrective_updated_at
  BEFORE UPDATE ON action_corrective
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX idx_action_corrective_nc ON action_corrective (non_conforme_id);

-- =====================================================================
-- BLOC 11 — RAPPORTS
-- =====================================================================

CREATE TABLE rapport (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  audit_id          UUID NOT NULL REFERENCES audit(id) ON DELETE CASCADE,
  type              type_rapport NOT NULL,
  format            format_rapport NOT NULL,
  chemin_stockage   TEXT NOT NULL,
  version           VARCHAR(20) NOT NULL DEFAULT '1.0',
  genere_par        UUID REFERENCES utilisateur(id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
COMMENT ON TABLE rapport IS 'Module 12 : rapport simple/détaillé, export CSV/PDF, indice de préparation bailleur (Avancées)';

CREATE INDEX idx_rapport_audit ON rapport (audit_id);

-- =====================================================================
-- BLOC 12 — JOURNALISATION
-- =====================================================================

CREATE TABLE audit_log (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  utilisateur_id  UUID REFERENCES utilisateur(id) ON DELETE SET NULL,
  entreprise_id   UUID REFERENCES entreprise(id) ON DELETE SET NULL,
  action          VARCHAR(150) NOT NULL,
  entite          VARCHAR(100) NOT NULL,
  entite_id       UUID,
  ip_address      INET,
  user_agent      TEXT,
  details         JSONB,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
COMMENT ON TABLE audit_log IS 'RG19 : journal d''audit. Exigence §1.4 : couvre aussi les accès en lecture aux documents financiers/RH';

CREATE INDEX idx_audit_log_entreprise ON audit_log (entreprise_id);
CREATE INDEX idx_audit_log_utilisateur ON audit_log (utilisateur_id);
CREATE INDEX idx_audit_log_created_at ON audit_log (created_at);
CREATE INDEX idx_audit_log_details_gin ON audit_log USING GIN (details);

-- =====================================================================
-- FIN DU SCHÉMA
-- =====================================================================

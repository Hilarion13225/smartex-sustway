-- RG09 : un critère porte plusieurs questions/indicateurs — les réponses de
-- l'entreprise cliente n'étaient jusqu'ici stockées nulle part, si bien que
-- audit_question.statut restait indéfiniment à 'A_REPONDRE'. La collecte
-- déclarative complète désormais la collecte de preuves documentaires : les
-- deux alimentent l'analyse IA du critère (CDC §10).

CREATE TYPE valeur_reponse AS ENUM ('OUI', 'NON', 'PARTIEL', 'NON_APPLICABLE');

CREATE TABLE reponse_question (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  audit_question_id UUID NOT NULL UNIQUE REFERENCES audit_question(id) ON DELETE CASCADE,
  valeur            valeur_reponse,
  commentaire       TEXT,
  auteur_id         UUID REFERENCES utilisateur(id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_reponse_question_audit_question ON reponse_question (audit_question_id);

COMMENT ON TABLE reponse_question IS 'RG09 — réponse de l''entreprise cliente à une question du questionnaire figé dans la mission (une réponse au plus par question d''audit, révisable tant que le critère n''est pas évalué).';
COMMENT ON COLUMN reponse_question.valeur IS 'Réponse fermée ; NULL pour une question ouverte, dont le contenu est porté par commentaire.';

-- Scénario textuel : description libre de la situation réelle de l'entreprise
-- sur ce critère, transmise au pipeline d'agents IA au même titre que les
-- preuves documentaires.
ALTER TABLE audit_critere ADD COLUMN scenario TEXT;

COMMENT ON COLUMN audit_critere.scenario IS 'Scénario textuel décrivant la situation de l''entreprise sur ce critère, saisi par le client et analysé par l''IA en complément des preuves.';

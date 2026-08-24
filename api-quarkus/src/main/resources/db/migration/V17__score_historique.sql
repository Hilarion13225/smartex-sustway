CREATE TABLE score_historique (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  audit_id      UUID NOT NULL REFERENCES audit(id) ON DELETE CASCADE,
  date          DATE NOT NULL,
  score_global  NUMERIC(4,2) NOT NULL,
  UNIQUE (audit_id, date)
);

CREATE INDEX idx_score_historique_audit ON score_historique (audit_id);

COMMENT ON TABLE score_historique IS 'Instantane quotidien du score global d''une mission (RG32), enregistre a chaque evaluation validee -- au plus une ligne par mission et par jour (UPSERT sur audit_id+date), pour tracer l''evolution dans le temps sans faire exploser la table a chaque recalcul de lecture.';

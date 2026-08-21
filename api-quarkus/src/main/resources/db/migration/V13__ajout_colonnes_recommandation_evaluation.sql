-- Recommendation Agent (CDC §10, Phase E, formule Avancées / RG21) :
-- pistes d'amélioration proposées pour le critère. Portée limitée à ce
-- lot : la génération automatique de non-conformités/actions correctives
-- (module 11, tables non_conforme/action_corrective déjà en base depuis
-- V1) est prévue en Phase G, pas ici.

ALTER TABLE evaluation
  ADD COLUMN recommandation_necessaire BOOLEAN,
  ADD COLUMN pistes_amelioration        TEXT;

COMMENT ON COLUMN evaluation.recommandation_necessaire IS 'Recommendation Agent (formule Avancées) : existe-t-il une marge d''amélioration réelle sur ce critère ? NULL si l''agent n''a pas été exécuté (formule Standard).';

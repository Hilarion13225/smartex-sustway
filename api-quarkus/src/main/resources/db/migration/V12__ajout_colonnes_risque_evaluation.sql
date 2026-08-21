-- Risk Agent (CDC §10, Phase E, formule Avancées / RG21) : signal
-- d'anomalie détecté dans le contenu des preuves, distinct du risque
-- attendu déterministe (RG26, non stocké ici, calculé à la volée).

ALTER TABLE evaluation
  ADD COLUMN signal_risque       BOOLEAN,
  ADD COLUMN categorie_risque    VARCHAR(50),
  ADD COLUMN justification_risque TEXT;

COMMENT ON COLUMN evaluation.signal_risque IS 'Risk Agent (formule Avancées) : signal d''anomalie dans les preuves. NULL si le Risk Agent n''a pas été exécuté (formule Standard).';
COMMENT ON COLUMN evaluation.categorie_risque IS 'Catégorie du signal si signal_risque est vrai : INCOHERENCE, PREUVE_GENERIQUE, INFORMATION_MANQUANTE, CONTRADICTION_AVEC_EVALUATION, AUTRE.';

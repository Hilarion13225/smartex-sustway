-- =====================================================================
-- Traçabilité de la rectification opérée par l'IA
-- =====================================================================
-- Le pipeline reçoit déjà le niveau déclaré par l'entreprise et a pour
-- consigne de ne pas le prendre pour acquis : « une déclaration favorable
-- sans document à l'appui doit réduire la confiance, pas augmenter
-- mécaniquement la probabilité de conformité ». La rectification a donc
-- lieu, mais rien ne la conservait : l'évaluation IA écrasait la
-- déclaration sans mémoire de ce qui avait été déclaré.
--
-- Le niveau déclaré au moment de l'analyse est désormais figé sur
-- l'évaluation. Le comparer plus tard aux réponses courantes ne dirait
-- rien : celles-ci ont pu changer depuis. Une trace d'audit doit rester
-- vraie après coup.
--
-- Null pour une évaluation saisie par un humain — elle EST la déclaration,
-- il n'y a rien à rectifier — comme pour une analyse lancée sur un critère
-- sans réponse déclarée.
-- =====================================================================

ALTER TABLE evaluation
  ADD COLUMN niveau_declare smallint,
  ADD CONSTRAINT evaluation_niveau_declare_check
      CHECK (niveau_declare IS NULL OR niveau_declare BETWEEN 1 AND 5);

COMMENT ON COLUMN evaluation.niveau_declare IS
  'Niveau déclaré par l''entreprise au moment de l''analyse IA. Comparé à `note`, il montre la rectification opérée au vu des preuves.';

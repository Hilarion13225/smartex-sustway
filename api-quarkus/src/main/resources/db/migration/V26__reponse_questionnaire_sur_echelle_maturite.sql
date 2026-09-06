-- =====================================================================
-- Questionnaire (RG09) : réponse sur l'échelle de maturité à cinq niveaux
-- =====================================================================
-- Le questionnaire attendait une valeur fermée (OUI / NON / PARTIEL /
-- NON_APPLICABLE). Le référentiel métier attend en réalité un niveau de
-- maturité de 1 à 5 — la même échelle que celle déjà utilisée pour la
-- note d'évaluation (« Totalement réactive » … « Fortement activée »).
--
-- Colonne numérique plutôt qu'extension du type `valeur_reponse` : la
-- réponse devient une grandeur ordonnée, directement comparable à
-- evaluation.note et exploitable par ScoringEngine, là où un enum aurait
-- imposé une table de correspondance à chaque usage. L'ancienne colonne
-- `valeur` est conservée telle quelle : elle porte des réponses déjà
-- saisies, que rien ne permet de convertir sans interpréter (« PARTIEL »
-- ne désigne pas un niveau précis), et RG14 interdit de les écraser.
--
-- Les deux colonnes sont donc nullables et lues dans cet ordre : niveau
-- d'abord, valeur en repli pour l'historique (voir
-- EvaluationResource.reponsesDeclarees).
-- =====================================================================

ALTER TABLE reponse_question
  ADD COLUMN niveau smallint,
  ADD CONSTRAINT reponse_question_niveau_check CHECK (niveau IS NULL OR niveau BETWEEN 1 AND 5);

COMMENT ON COLUMN reponse_question.niveau IS
  'Niveau de maturité déclaré (1 à 5). Remplace `valeur`, conservée pour les réponses antérieures.';

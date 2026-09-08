-- =====================================================================
-- Seule l'analyse IA produit une note
-- =====================================================================
-- La déclaration d'une organisation créait jusqu'ici une évaluation de
-- source EXPERT, que le score retenait dès qu'elle était la plus récente.
-- Une organisation pouvait donc annuler une rectification de l'IA en
-- redéclarant simplement un niveau plus favorable — ce qui s'est produit
-- cinq fois dans les données de développement, dont un critère où l'IA
-- avait retenu 1 et où le 5 déclaré avait repris le dessus.
--
-- Désormais, la déclaration est rangée dans le questionnaire (RG09) et ne
-- crée plus d'évaluation ; le score ne lit que les évaluations de source
-- IA. Les évaluations EXPERT existantes sont conservées (RG14 impose de
-- garder l'historique complet) mais sortent mécaniquement du calcul.
--
-- Reste à reprendre l'état des critères : ceux dont la seule évaluation
-- était une déclaration ne sont plus « évalués » mais « déclarés », en
-- attente de l'analyse qui leur donnera une note à la clôture de la
-- mission. Leur niveau déclaré est déjà dans reponse_question, reporté
-- par l'ancien enregistrement — rien n'est perdu.
-- =====================================================================

UPDATE audit_critere ac
SET statut = 'DECLARE'
WHERE ac.statut = 'EVALUE'
  AND NOT EXISTS (
      SELECT 1 FROM evaluation e
      WHERE e.audit_critere_id = ac.id AND e.source = 'IA'
  );

COMMENT ON COLUMN audit_critere.statut IS
    'A_EVALUER : rien de fourni. DECLARE : niveau déclaré par l''organisation, en attente d''analyse. EVALUE : analysé par l''IA, porte une note.';

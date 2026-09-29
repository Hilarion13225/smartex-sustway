-- =====================================================================
-- La description de la formule Avancées ne promet plus de revue experte
-- =====================================================================
-- V23 a retiré la revue experte du produit — le mécanisme et le rôle
-- EXPERT_REVIEWER — avec ce motif : « toute évaluation IA est désormais
-- directement définitive ». La description commerciale de la formule, elle,
-- est restée telle quelle : elle annonce encore « revue experte » dans
-- `formule_abonnement.description`.
--
-- Ce n'est pas un détail d'affichage. Cette colonne est la source des puces
-- de la page Formules (voir `pointsDescription` dans lib/formules.js, dont le
-- commentaire précise que « les puces affichées sont la donnée réelle du
-- produit »). La promesse repartait donc de la base à chaque affichage, et
-- serait revenue sur toute base reconstruite.
--
-- Rien ne relit aujourd'hui les verdicts de l'IA : `evaluation:valider` ne
-- distingue pas les formules, et depuis V72 c'est le responsable de
-- l'organisation auditée qui entérine ses propres résultats.
--
-- Ce que cette migration NE fait PAS : elle ne touche ni aux permissions, ni
-- aux rôles, ni au prix. Seule la phrase change.
-- =====================================================================

UPDATE formule_abonnement
SET description = 'Pipeline IA complet (+ Risk, Recommendation), rapport détaillé, indice de préparation financements verts'
WHERE code = 'AVANCEES'
  AND description LIKE '%revue experte%';

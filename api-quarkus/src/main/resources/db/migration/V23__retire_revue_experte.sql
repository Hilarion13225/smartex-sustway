-- =====================================================================
-- Retrait de la revue experte (mécanisme + rôle EXPERT_REVIEWER)
-- =====================================================================
-- Décision produit : toute évaluation IA est désormais directement
-- définitive (voir EvaluationResource.evaluer, RG16), quelle que soit la
-- confiance retournée par le pipeline. Le rôle EXPERT_REVIEWER n'existait
-- que pour traiter cette file — il disparaît avec elle plutôt que de
-- rester un rôle invitable sans fonction réelle.
--
-- Nettoyage des rattachements AVANT suppression du rôle : role_id est en
-- ON DELETE RESTRICT sur utilisateur_entreprise (V1) et sans clause
-- explicite (donc RESTRICT par défaut) sur invitation.role_id (V16) —
-- un DELETE direct sur la ligne role échouerait sinon en présence d'un
-- compte déjà rattaché avec ce rôle (ex. un expert réellement invité).
-- =====================================================================

DELETE FROM invitation
WHERE role_id IN (SELECT id FROM role WHERE code = 'EXPERT_REVIEWER');

DELETE FROM utilisateur_entreprise
WHERE role_id IN (SELECT id FROM role WHERE code = 'EXPERT_REVIEWER');

DROP TABLE IF EXISTS revue_experte;
DROP TYPE IF EXISTS statut_revue_experte;

-- La permission revue:traiter n'a plus aucun endpoint pour la consommer
-- (RevueExperteResource supprimé) — retirée de tous les rôles qui
-- l'avaient (SUPER_ADMIN, ADMIN_AUDIT, EXPERT_REVIEWER), pas seulement de
-- ce dernier. role_permission.permission_id est en ON DELETE CASCADE (V1).
DELETE FROM permission WHERE code = 'revue:traiter';

-- role_permission.role_id est en ON DELETE CASCADE (V1) : les éventuelles
-- lignes restantes pour EXPERT_REVIEWER partent avec la ligne role.
DELETE FROM role WHERE code = 'EXPERT_REVIEWER';

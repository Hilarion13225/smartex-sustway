-- =====================================================================
-- Retire EXPERT_REVIEWER de l'enum role_mission_auditeur
-- =====================================================================
-- Concept distinct de la revue experte (V23) — role_mission_auditeur
-- étiquette un membre de l'équipe *affectée à une mission d'audit*
-- (audit_auditeur.role_mission), sans lien avec la table role ni la
-- table revue_experte supprimées par V23, et jamais exposé côté
-- frontend. Retiré ici par cohérence, à la demande explicite du produit.
--
-- PostgreSQL ne permet pas de retirer une valeur d'un type ENUM
-- directement (pas de ALTER TYPE ... DROP VALUE) : on recrée le type
-- sans cette valeur, après avoir replié toute ligne existante qui
-- l'utiliserait sur la valeur par défaut (AUDITEUR_PRINCIPAL) — sinon le
-- cast USING échouerait sur ces lignes.
-- =====================================================================

UPDATE audit_auditeur SET role_mission = 'AUDITEUR_PRINCIPAL' WHERE role_mission = 'EXPERT_REVIEWER';

ALTER TYPE role_mission_auditeur RENAME TO role_mission_auditeur_ancien;
CREATE TYPE role_mission_auditeur AS ENUM ('AUDITEUR_PRINCIPAL', 'AUDITEUR_SECONDAIRE', 'OBSERVATEUR');

ALTER TABLE audit_auditeur ALTER COLUMN role_mission DROP DEFAULT;
ALTER TABLE audit_auditeur
  ALTER COLUMN role_mission TYPE role_mission_auditeur
  USING role_mission::text::role_mission_auditeur;
ALTER TABLE audit_auditeur ALTER COLUMN role_mission SET DEFAULT 'AUDITEUR_PRINCIPAL';

DROP TYPE role_mission_auditeur_ancien;

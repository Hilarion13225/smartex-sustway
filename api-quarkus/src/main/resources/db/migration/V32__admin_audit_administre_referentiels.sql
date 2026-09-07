-- =====================================================================
-- L'Admin Audit administre les référentiels
-- =====================================================================
-- `referentiel:administrer` n'était accordée qu'à SUPER_ADMIN : le
-- responsable audit pouvait consulter le catalogue mais ni créer, ni
-- modifier, ni versionner un référentiel.
--
-- Or c'est lui qui pilote le dispositif d'audit : choisir les cadres
-- d'évaluation, les structurer en domaines et critères et les faire
-- évoluer fait partie de son métier, pas de l'administration technique de
-- la plateforme. SUPER_ADMIN conserve la permission, il ne la détient
-- simplement plus seul.
--
-- Les endpoints correspondants portent @RolesAllowed et sont élargis dans
-- le même lot : la permission seule ne suffirait pas à les ouvrir.
-- =====================================================================

INSERT INTO role_permission (role_id, permission_id)
SELECT r.id, p.id
FROM role r, permission p
WHERE r.code = 'ADMIN_AUDIT'
  AND p.code = 'referentiel:administrer'
  AND NOT EXISTS (
      SELECT 1 FROM role_permission rp
      WHERE rp.role_id = r.id AND rp.permission_id = p.id
  );

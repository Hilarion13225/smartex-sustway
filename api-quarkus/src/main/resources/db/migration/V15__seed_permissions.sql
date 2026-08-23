-- Les tables permission / role_permission existaient depuis V1 mais
-- n'avaient jamais ete alimentees : AutorisationService.possedePermission()
-- renvoyait donc toujours faux, et n'etait de fait appele nulle part cote
-- ressources. Ce seed aligne le modele de permissions fines en base sur
-- PERMISSIONS_PAR_ROLE cote frontend (auth/permissions.js), pour que les
-- deux modeles restent une seule et meme source de verite.

INSERT INTO permission (code, nom) VALUES
  ('entreprise:creer', 'Creer une entreprise'),
  ('entreprise:modifier', 'Modifier l''entreprise et ses sites'),
  ('audit:creer', 'Lancer une mission d''audit'),
  ('audit:modifier', 'Modifier une mission (plan d''actions, non-conformites)'),
  ('preuve:deposer', 'Deposer des documents et preuves'),
  ('revue:traiter', 'Traiter la file de revue experte'),
  ('referentiel:administrer', 'Administrer les referentiels'),
  ('rapport:consulter', 'Consulter les rapports'),
  ('rapport:detaille', 'Acceder au rapport detaille'),
  ('bailleur:consulter', 'Consulter l''indice IFC/SFI');

INSERT INTO role_permission (role_id, permission_id)
SELECT r.id, p.id
FROM (VALUES
  ('SUPER_ADMIN', 'entreprise:creer'),
  ('SUPER_ADMIN', 'entreprise:modifier'),
  ('SUPER_ADMIN', 'audit:creer'),
  ('SUPER_ADMIN', 'audit:modifier'),
  ('SUPER_ADMIN', 'preuve:deposer'),
  ('SUPER_ADMIN', 'revue:traiter'),
  ('SUPER_ADMIN', 'referentiel:administrer'),
  ('SUPER_ADMIN', 'rapport:consulter'),
  ('SUPER_ADMIN', 'rapport:detaille'),
  ('SUPER_ADMIN', 'bailleur:consulter'),

  ('ADMIN_AUDIT', 'entreprise:creer'),
  ('ADMIN_AUDIT', 'entreprise:modifier'),
  ('ADMIN_AUDIT', 'audit:creer'),
  ('ADMIN_AUDIT', 'audit:modifier'),
  ('ADMIN_AUDIT', 'preuve:deposer'),
  ('ADMIN_AUDIT', 'revue:traiter'),
  ('ADMIN_AUDIT', 'rapport:consulter'),
  ('ADMIN_AUDIT', 'rapport:detaille'),
  ('ADMIN_AUDIT', 'bailleur:consulter'),

  ('EXPERT_REVIEWER', 'revue:traiter'),
  ('EXPERT_REVIEWER', 'rapport:consulter'),
  ('EXPERT_REVIEWER', 'rapport:detaille'),
  ('EXPERT_REVIEWER', 'bailleur:consulter'),

  ('RESPONSABLE_ENTREPRISE', 'entreprise:creer'),
  ('RESPONSABLE_ENTREPRISE', 'entreprise:modifier'),
  ('RESPONSABLE_ENTREPRISE', 'audit:creer'),
  ('RESPONSABLE_ENTREPRISE', 'audit:modifier'),
  ('RESPONSABLE_ENTREPRISE', 'preuve:deposer'),
  ('RESPONSABLE_ENTREPRISE', 'rapport:consulter'),
  ('RESPONSABLE_ENTREPRISE', 'bailleur:consulter'),

  ('EMPLOYE', 'preuve:deposer'),
  ('EMPLOYE', 'rapport:consulter'),

  ('VISITEUR', 'rapport:consulter')
) AS voulu(role_code, permission_code)
JOIN role r ON r.code = voulu.role_code
JOIN permission p ON p.code = voulu.permission_code;

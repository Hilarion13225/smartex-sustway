-- =====================================================================
-- Valider une évaluation est une capacité à part
-- =====================================================================
-- Le pipeline V2 produit désormais des évaluations EN_REVUE. Les faire
-- passer à VALIDEE les fait entrer dans le score officiel et déclenche la
-- génération des non-conformités : c'est le geste qui transforme un
-- résultat de machine en verdict opposable.
--
-- Aucune permission existante ne convient :
--
--   `analyse:executer` produit le résultat. Produire n'est pas valider —
--   sans quoi celui qui lance l'analyse validerait sa propre sortie, et la
--   revue humaine ne serait qu'une formalité automatique.
--
--   `audit:cloturer` fige la mission entière. Valider un critère n'est pas
--   clore une mission, et la clôture ne doit pas emporter l'acceptation
--   silencieuse de tout ce qui n'a pas été relu.
--
--   `audit:modifier` porte sur les plans d'action et les non-conformités,
--   c'est-à-dire sur le travail quotidien de la mission.
--
-- Attribution volontairement étroite : SUPER_ADMIN et ADMIN_AUDIT.
-- RESPONSABLE_ENTREPRISE en est EXCLU, alors qu'il détient déjà
-- `analyse:executer` et `audit:cloturer`. C'est le point de cette
-- migration : la relecture d'un résultat d'IA relève de l'administration
-- métier de l'audit, pas de l'organisation auditée — qui ne peut pas être
-- à la fois le sujet de l'évaluation et celui qui l'entérine.
-- =====================================================================

INSERT INTO permission (code, nom, description) VALUES
    ('evaluation:valider', 'Valider une evaluation IA',
     'Faire passer une evaluation de EN_REVUE a VALIDEE. Le resultat entre alors dans le score officiel. Distincte de l''execution de l''analyse : produire un resultat n''est pas l''accepter.')
ON CONFLICT (code) DO NOTHING;

INSERT INTO role_permission (role_id, permission_id)
SELECT r.id, p.id
FROM role r, permission p
WHERE r.code IN ('SUPER_ADMIN', 'ADMIN_AUDIT')
  AND p.code = 'evaluation:valider'
  AND NOT EXISTS (
      SELECT 1 FROM role_permission rp
      WHERE rp.role_id = r.id AND rp.permission_id = p.id
  );

-- Vérifications : la migration échoue plutôt que de laisser une
-- attribution partielle, qui se traduirait par des 403 inexpliqués — ou
-- une attribution trop large, qui serait pire et passerait inaperçue.
DO $$
DECLARE
    attendus integer := 2;   -- 2 rôles x 1 permission
    obtenus  integer;
    fuite    integer;
BEGIN
    SELECT count(*) INTO obtenus
    FROM role_permission rp
    JOIN role r ON r.id = rp.role_id
    JOIN permission p ON p.id = rp.permission_id
    WHERE r.code IN ('SUPER_ADMIN', 'ADMIN_AUDIT')
      AND p.code = 'evaluation:valider';

    IF obtenus <> attendus THEN
        RAISE EXCEPTION 'Attribution incomplete : % lignes attendues, % posees', attendus, obtenus;
    END IF;

    -- Aucun autre rôle ne doit porter cette permission. En particulier,
    -- détenir `analyse:executer` ne doit jamais l'emporter avec soi.
    SELECT count(*) INTO fuite
    FROM role_permission rp
    JOIN role r ON r.id = rp.role_id
    JOIN permission p ON p.id = rp.permission_id
    WHERE p.code = 'evaluation:valider'
      AND r.code NOT IN ('SUPER_ADMIN', 'ADMIN_AUDIT');

    IF fuite > 0 THEN
        RAISE EXCEPTION 'Permission de validation accordee a % role(s) non prevu(s)', fuite;
    END IF;
END $$;

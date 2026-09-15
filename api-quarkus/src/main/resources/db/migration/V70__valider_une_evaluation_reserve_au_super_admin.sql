-- =====================================================================
-- La validation d'une évaluation revient au seul SUPER_ADMIN
-- =====================================================================
-- V66 accordait `evaluation:valider` à SUPER_ADMIN et ADMIN_AUDIT, en
-- reprenant le motif de V42 pour les permissions d'analyse et de clôture.
--
-- L'exécution des tests a montré que cette seconde attribution est inerte :
-- ADMIN_AUDIT est un rôle INACTIF, qu'un déclencheur en base refuse
-- d'attribuer à quiconque.
--
--     ERROR: Le rôle ADMIN_AUDIT est désactivé et ne peut plus être attribué
--
-- Une permission accordée à un rôle que personne ne peut porter n'est pas
-- neutre : elle laisse croire qu'un second profil peut valider, et
-- quiconque lit `role_permission` en tirera une conclusion fausse.
--
-- L'arbitrage métier a tranché : la validation revient au seul SUPER_ADMIN.
-- Cette migration retire donc l'attribution à ADMIN_AUDIT — sans réactiver
-- le rôle, sans le supprimer, et sans toucher aux autres permissions qu'il
-- porte pour l'historique.
--
-- V66 n'est pas modifiée : elle a été exécutée, et une migration appliquée
-- ne se réécrit pas. La correction passe par une migration nouvelle, ce
-- qui laisse au passage la trace du raisonnement.
-- =====================================================================

DELETE FROM role_permission rp
USING role r, permission p
WHERE rp.role_id = r.id
  AND rp.permission_id = p.id
  AND p.code = 'evaluation:valider'
  AND r.code <> 'SUPER_ADMIN';

-- Vérification : exactement un rôle porteur, et c'est le bon.
--
-- Structurelle et non numérique au sens des données métier : le nombre de
-- rôles porteurs d'une permission est un invariant de conception, identique
-- sur toutes les bases, contrairement au nombre de non-conformités.
DO $$
DECLARE
    porteurs integer;
    correct  integer;
BEGIN
    SELECT count(*) INTO porteurs
    FROM role_permission rp
    JOIN permission p ON p.id = rp.permission_id
    WHERE p.code = 'evaluation:valider';

    SELECT count(*) INTO correct
    FROM role_permission rp
    JOIN role r ON r.id = rp.role_id
    JOIN permission p ON p.id = rp.permission_id
    WHERE p.code = 'evaluation:valider' AND r.code = 'SUPER_ADMIN';

    IF correct <> 1 THEN
        RAISE EXCEPTION 'SUPER_ADMIN doit porter evaluation:valider (% attribution trouvee)', correct;
    END IF;

    IF porteurs <> 1 THEN
        RAISE EXCEPTION 'evaluation:valider est portee par % role(s) au lieu d''un seul', porteurs;
    END IF;
END $$;

COMMENT ON TABLE role_permission IS
    'Attribution des permissions aux rôles. evaluation:valider est réservée à SUPER_ADMIN : produire un résultat d''IA n''est pas l''accepter, et l''organisation auditée ne peut pas entériner sa propre évaluation.';

-- =====================================================================
-- Le responsable d'entreprise peut valider les évaluations de son audit
-- =====================================================================
-- V66 réservait `evaluation:valider` à SUPER_ADMIN et ADMIN_AUDIT, puis
-- V70 l'a resserrée sur SUPER_ADMIN seul (ADMIN_AUDIT étant inactif). Le
-- motif tenait en une phrase : l'organisation auditée ne peut pas être à
-- la fois le sujet de l'évaluation et celui qui l'entérine.
--
-- L'usage a montré la conséquence : aucune mission ne peut aller à son
-- terme sans qu'un compte Smartex valide chaque critère. Le score, les
-- non-conformités et le rapport sont tous en aval de ce geste. Le produit
-- était donc inutilisable en autonomie par un client.
--
-- L'arbitrage retenu : le responsable valide les évaluations de sa propre
-- entreprise. Il en avait déjà tout le matériau — le détail V2 et les
-- justifications métier lui sont ouverts depuis 5.8.1 — mais pas le droit.
--
-- Ce que cette migration ne change pas :
--
--   * le COLLABORATEUR reste exclu, comme tous les autres rôles ;
--   * SUPER_ADMIN conserve la permission ;
--   * aucune permission n'est créée : `evaluation:valider` existe depuis
--     V66 et garde son sens ;
--   * `analyse:executer` et `audit:cloturer` restent des capacités
--     distinctes — produire un résultat, l'accepter, et clore la mission
--     demeurent trois gestes séparés.
--
-- Aucune donnée métier n'est touchée : ni évaluation, ni mission, ni
-- référentiel, ni non-conformité. Seule une ligne de rattachement est
-- ajoutée.
-- =====================================================================

INSERT INTO role_permission (role_id, permission_id)
SELECT r.id, p.id
FROM role r
CROSS JOIN permission p
WHERE r.code = 'RESPONSABLE_ENTREPRISE'
  AND p.code = 'evaluation:valider'
  AND NOT EXISTS (
      SELECT 1 FROM role_permission rp
      WHERE rp.role_id = r.id AND rp.permission_id = p.id
  );

-- La migration se vérifie elle-même, comme V66 et V70 : une attribution
-- silencieusement incomplète laisserait le produit dans l'état qu'elle
-- prétend corriger.
DO $$
DECLARE
    porteurs integer;
    attendus integer;
    fuite    integer;
BEGIN
    SELECT count(*) INTO porteurs
    FROM role_permission rp
    JOIN role r ON r.id = rp.role_id
    JOIN permission p ON p.id = rp.permission_id
    WHERE p.code = 'evaluation:valider'
      AND r.code IN ('SUPER_ADMIN', 'RESPONSABLE_ENTREPRISE');

    SELECT count(*) INTO attendus
    FROM role r
    WHERE r.code IN ('SUPER_ADMIN', 'RESPONSABLE_ENTREPRISE');

    IF porteurs <> attendus THEN
        RAISE EXCEPTION 'Attribution incomplete : % role(s) attendu(s), % porteur(s)', attendus, porteurs;
    END IF;

    -- Aucun des autres rôles DU PRODUIT ne doit porter cette permission. Le
    -- collaborateur en particulier : il exécute le travail, il ne l'entérine
    -- pas.
    --
    -- La vérification est nommative, et non « tout rôle sauf les deux » comme
    -- en V66 et V70. Ces migrations retiraient la permission et pouvaient
    -- donc parler de l'état global ; celle-ci l'ajoute, et interdire des
    -- rôles qu'elle n'a pas créés la ferait échouer sur toute base portant un
    -- rôle applicatif ou temporaire supplémentaire — ce qui est le cas de la
    -- base de tests. Une migration vérifie son propre effet, pas l'état du
    -- monde.
    SELECT count(*) INTO fuite
    FROM role_permission rp
    JOIN role r ON r.id = rp.role_id
    JOIN permission p ON p.id = rp.permission_id
    WHERE p.code = 'evaluation:valider'
      AND r.code IN ('COLLABORATEUR', 'EMPLOYE', 'VISITEUR');

    IF fuite > 0 THEN
        RAISE EXCEPTION 'Permission de validation accordee a % role(s) non prevu(s)', fuite;
    END IF;
END $$;

-- =====================================================================
-- Deux capacités distinctes : exécuter une analyse, clôturer une mission
-- =====================================================================
-- Lancer le pipeline IA s'autorisait jusqu'ici par `preuve:deposer`, la
-- même permission que le dépôt d'un document. Les deux actions n'ont
-- pourtant rien de commun : déposer une pièce est le travail quotidien
-- d'un collaborateur, déclencher une analyse engage un coût, consomme un
-- quota et écrit des résultats dans la mission. Un collaborateur pouvait
-- donc lancer une analyse par simple appel d'URL, ce qu'une vérification
-- sur l'API a confirmé.
--
-- Clôturer une mission est une troisième capacité, encore différente :
-- elle fige le résultat. Elle relevait de ROLES_INTERNES_SMARTEX, ce qui
-- interdisait au responsable d'entreprise de clôturer ses propres
-- missions alors que c'est son rôle.
--
-- D'où deux permissions et non une seule : `analyse:executer` n'accorde
-- jamais le droit de clôturer, `audit:cloturer` n'accorde jamais celui de
-- lancer le pipeline. Aucune permission existante ne les couvrait —
-- `audit:modifier` porte sur les plans d'actions et les non-conformités.
--
-- ADMIN_AUDIT les reçoit aussi : il est encore actif à ce stade, et le
-- priver de capacités qu'il exerce aujourd'hui casserait son usage avant
-- même la bascule des rattachements.
--
-- Ce que cette migration NE fait PAS : aucune suppression, aucun rôle
-- retiré, aucun rattachement déplacé, aucune permission enlevée.
-- =====================================================================

INSERT INTO permission (code, nom, description) VALUES
    ('analyse:executer', 'Executer une analyse IA',
     'Lancer ou relancer le pipeline d''agents sur une mission. Distincte du depot de preuve : l''analyse engage un cout et ecrit des resultats.'),
    ('audit:cloturer', 'Cloturer une mission',
     'Figer le resultat d''une mission d''audit. Distincte de l''execution de l''analyse.')
ON CONFLICT (code) DO NOTHING;

-- Rôles autorisés à exécuter une analyse. Le collaborateur en est exclu :
-- il fournit la matière, il ne déclenche pas l'évaluation.
INSERT INTO role_permission (role_id, permission_id)
SELECT r.id, p.id
FROM role r, permission p
WHERE r.code IN ('SUPER_ADMIN', 'ADMIN_AUDIT', 'RESPONSABLE_ENTREPRISE')
  AND p.code IN ('analyse:executer', 'audit:cloturer')
  AND NOT EXISTS (
      SELECT 1 FROM role_permission rp
      WHERE rp.role_id = r.id AND rp.permission_id = p.id
  );

-- Vérifications : la migration échoue plutôt que de laisser une
-- attribution partielle, qui se traduirait par des 403 inexpliqués.
DO $$
DECLARE
    attendus integer := 6;   -- 3 rôles x 2 permissions
    obtenus  integer;
    fuite    integer;
BEGIN
    SELECT count(*) INTO obtenus
    FROM role_permission rp
    JOIN role r ON r.id = rp.role_id
    JOIN permission p ON p.id = rp.permission_id
    WHERE r.code IN ('SUPER_ADMIN', 'ADMIN_AUDIT', 'RESPONSABLE_ENTREPRISE')
      AND p.code IN ('analyse:executer', 'audit:cloturer');

    IF obtenus <> attendus THEN
        RAISE EXCEPTION 'Attribution incomplete : % lignes attendues, % posees', attendus, obtenus;
    END IF;

    -- Aucun rôle non prévu ne doit porter ces permissions.
    SELECT count(*) INTO fuite
    FROM role_permission rp
    JOIN role r ON r.id = rp.role_id
    JOIN permission p ON p.id = rp.permission_id
    WHERE p.code IN ('analyse:executer', 'audit:cloturer')
      AND r.code NOT IN ('SUPER_ADMIN', 'ADMIN_AUDIT', 'RESPONSABLE_ENTREPRISE');

    IF fuite > 0 THEN
        RAISE EXCEPTION 'Permission d''analyse ou de cloture accordee a % role(s) non prevu(s)', fuite;
    END IF;
END $$;

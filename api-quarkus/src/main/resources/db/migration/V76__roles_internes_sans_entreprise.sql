-- =====================================================================
-- Les rôles internes ne sont plus rattachés à une entreprise
-- =====================================================================
-- SUPER_ADMIN et ADMIN_AUDIT appartiennent à l'éditeur de la solution, pas
-- aux organisations que la plateforme évalue. Le modèle ne savait pourtant
-- pas l'exprimer : `utilisateur_entreprise` exigeait une entreprise, si bien
-- qu'un administrateur devait être inscrit comme membre d'un client — il
-- apparaissait alors dans la liste de ses membres, comme s'il en faisait
-- partie.
--
-- Leur accès ne dépendait déjà pas de ce rattachement :
-- AutorisationService.estAccesGlobalActif ne regarde que le code du rôle.
-- Détacher ces comptes ne leur retire donc aucun droit.
--
-- Ce que cette migration NE fait PAS : aucun rôle n'est réactivé. ADMIN_AUDIT
-- reste INACTIF depuis V44 ; la règle est écrite pour lui au cas où il serait
-- réintroduit, mais il demeure inattribuable.
-- =====================================================================

-- 1. L'entreprise devient facultative.
ALTER TABLE utilisateur_entreprise
    ALTER COLUMN entreprise_id DROP NOT NULL;

COMMENT ON COLUMN utilisateur_entreprise.entreprise_id IS
    'Organisation de rattachement. NULL pour les rôles internes (SUPER_ADMIN, ADMIN_AUDIT), qui sont des rôles de plateforme et n''appartiennent à aucune organisation auditée.';

-- 2. Un rôle interne n'a pas d'entreprise ; un rôle client en a une.
--    Posé en base et non dans les ressources REST : quatre endroits du code
--    créent un rattachement, et un oubli dans l'un d'eux suffirait à
--    réintroduire un administrateur dans la liste des membres d'un client.
--    Même raisonnement que le déclencheur de V44 sur les rôles inactifs.
CREATE OR REPLACE FUNCTION exiger_coherence_entreprise_du_role()
RETURNS TRIGGER AS $$
DECLARE
    code_role TEXT;
BEGIN
    SELECT r.code INTO code_role FROM role r WHERE r.id = NEW.role_id;

    IF code_role IN ('SUPER_ADMIN', 'ADMIN_AUDIT') THEN
        IF NEW.entreprise_id IS NOT NULL THEN
            RAISE EXCEPTION 'Le rôle % est un rôle de plateforme : il ne se rattache à aucune organisation', code_role
                USING ERRCODE = 'check_violation',
                      HINT = 'Laissez entreprise_id à NULL pour les rôles internes.';
        END IF;
    ELSIF NEW.entreprise_id IS NULL THEN
        RAISE EXCEPTION 'Le rôle % doit être rattaché à une organisation', code_role
            USING ERRCODE = 'check_violation',
                  HINT = 'Seuls SUPER_ADMIN et ADMIN_AUDIT peuvent exister sans entreprise.';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS utilisateur_entreprise_coherence_role ON utilisateur_entreprise;
CREATE TRIGGER utilisateur_entreprise_coherence_role
    BEFORE INSERT OR UPDATE ON utilisateur_entreprise
    FOR EACH ROW EXECUTE FUNCTION exiger_coherence_entreprise_du_role();

-- 3. Unicité des rattachements sans entreprise.
--    Les deux index existants portent sur (utilisateur, entreprise) : avec
--    entreprise_id à NULL ils ne contraignent plus rien, NULL n'étant égal à
--    rien en SQL. Sans cet index, un même compte pourrait recevoir dix fois
--    le rôle SUPER_ADMIN.
CREATE UNIQUE INDEX IF NOT EXISTS uq_utilisateur_role_sans_entreprise
    ON utilisateur_entreprise (utilisateur_id, role_id)
    WHERE entreprise_id IS NULL;

-- 4. Détacher les rattachements internes déjà posés.
--    Le déclencheur ci-dessus refuserait désormais de les écrire tels quels ;
--    ils sont donc mis en conformité plutôt que laissés en infraction.
UPDATE utilisateur_entreprise ue
SET entreprise_id = NULL
FROM role r
WHERE ue.role_id = r.id
  AND r.code IN ('SUPER_ADMIN', 'ADMIN_AUDIT')
  AND ue.entreprise_id IS NOT NULL;

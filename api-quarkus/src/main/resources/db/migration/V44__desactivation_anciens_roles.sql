-- =====================================================================
-- Désactivation des trois rôles remplacés — sans suppression
-- =====================================================================
-- V43 a vidé ADMIN_AUDIT, EMPLOYE et VISITEUR de leurs rattachements. Ils
-- restent en base : les supprimer rendrait l'archive V41 inexploitable
-- pour un retour arrière, et ferait disparaître l'historique de ce que ces
-- rôles portaient.
--
-- La table `role` n'avait aucune notion d'activation. Elle reçoit donc un
-- statut sur le type `statut_generique`, déjà employé par entreprise et
-- utilisateur_entreprise — plutôt qu'un booléen ad hoc qui aurait fait
-- coexister deux conventions.
--
-- Un rôle inactif ne doit plus pouvoir être attribué. Le contrôle est posé
-- en base par un déclencheur, et non seulement dans les ressources REST :
-- quatre endroits du code créent un rattachement (création d'entreprise,
-- acceptation d'invitation, ajout d'un membre, back-office), et un oubli
-- dans l'un d'eux rouvrirait la porte.
--
-- Ce que cette migration NE fait PAS : aucune suppression de rôle, de
-- permission, de rattachement ni d'historique.
-- =====================================================================

ALTER TABLE role
    ADD COLUMN IF NOT EXISTS statut statut_generique NOT NULL DEFAULT 'ACTIF';

COMMENT ON COLUMN role.statut IS
    'ACTIF : attribuable. INACTIF : conservé pour l''historique, ne peut plus être attribué (voir le déclencheur refuser_role_inactif).';

UPDATE role
SET statut = 'INACTIF'
WHERE code IN ('ADMIN_AUDIT', 'EMPLOYE', 'VISITEUR');

-- Garde-fou : aucun rattachement, existant ou nouveau, ne peut pointer
-- vers un rôle inactif. Le déclencheur porte sur INSERT et sur UPDATE du
-- rôle, pour couvrir aussi une réaffectation vers un rôle retiré.
CREATE OR REPLACE FUNCTION refuser_role_inactif() RETURNS trigger AS $$
DECLARE
    code_role text;
    statut_role statut_generique;
BEGIN
    SELECT r.code, r.statut INTO code_role, statut_role FROM role r WHERE r.id = NEW.role_id;
    IF statut_role = 'INACTIF' THEN
        RAISE EXCEPTION 'Le rôle % est désactivé et ne peut plus être attribué', code_role
            USING ERRCODE = 'check_violation';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_refuser_role_inactif ON utilisateur_entreprise;
CREATE TRIGGER trg_refuser_role_inactif
    BEFORE INSERT OR UPDATE OF role_id ON utilisateur_entreprise
    FOR EACH ROW EXECUTE FUNCTION refuser_role_inactif();

-- Une invitation fige un rôle avant même la création du compte : le même
-- garde-fou s'y applique, sinon un rôle retiré reviendrait par ce chemin.
DROP TRIGGER IF EXISTS trg_refuser_role_inactif_invitation ON invitation;
CREATE TRIGGER trg_refuser_role_inactif_invitation
    BEFORE INSERT OR UPDATE OF role_id ON invitation
    FOR EACH ROW EXECUTE FUNCTION refuser_role_inactif();

-- Vérifications.
DO $$
DECLARE
    inactifs   integer;
    orphelins  integer;
    actifs     integer;
BEGIN
    SELECT count(*) INTO inactifs FROM role
    WHERE code IN ('ADMIN_AUDIT', 'EMPLOYE', 'VISITEUR') AND statut = 'INACTIF';
    IF inactifs <> 3 THEN
        RAISE EXCEPTION 'Désactivation incomplète : % rôle(s) sur 3', inactifs;
    END IF;

    -- Aucun rattachement ne doit subsister sur un rôle désactivé.
    SELECT count(*) INTO orphelins
    FROM utilisateur_entreprise ue JOIN role r ON r.id = ue.role_id
    WHERE r.statut = 'INACTIF';
    IF orphelins > 0 THEN
        RAISE EXCEPTION '% rattachement(s) encore sur un rôle désactivé', orphelins;
    END IF;

    SELECT count(*) INTO actifs FROM role WHERE statut = 'ACTIF';
    IF actifs <> 3 THEN
        RAISE EXCEPTION 'Rôles actifs : 3 attendus, % trouvés', actifs;
    END IF;
END $$;

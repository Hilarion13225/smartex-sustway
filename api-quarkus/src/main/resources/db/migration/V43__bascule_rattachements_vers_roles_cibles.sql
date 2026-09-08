-- =====================================================================
-- Bascule des rattachements vers les trois rôles cibles
-- =====================================================================
-- L'architecture ne retient que SUPER_ADMIN, RESPONSABLE_ENTREPRISE et
-- COLLABORATEUR. Cette migration déplace les rattachements des trois rôles
-- appelés à disparaître :
--
--   ADMIN_AUDIT  -> SUPER_ADMIN     permissions strictement identiques
--   EMPLOYE      -> COLLABORATEUR   mêmes permissions
--   VISITEUR     -> COLLABORATEUR   gagne preuve:deposer
--
-- Le gain de permission du VISITEUR est voulu : ces comptes ont été créés
-- par invitation comme salariés de leur entreprise, et fournir des pièces
-- justificatives fait partie de ce qu'on attend d'un collaborateur. Aucun
-- des trois n'a jamais rien produit, la bascule ne modifie donc aucune
-- donnée métier.
--
-- Les anciens rôles ne sont PAS supprimés : ils restent en base, vidés de
-- leurs rattachements, ce qui laisse V41 (archive) exploitable pour un
-- retour arrière ligne à ligne.
--
-- La migration échoue si les préconditions ne sont pas réunies, plutôt que
-- de déplacer à l'aveugle.
-- =====================================================================

-- Précondition : les rôles cibles existent et l'archive V41 est en place.
DO $$
DECLARE
    manquants integer;
    archives  integer;
BEGIN
    SELECT count(*) INTO manquants FROM (
        SELECT unnest(ARRAY['SUPER_ADMIN','RESPONSABLE_ENTREPRISE','COLLABORATEUR']) AS code
        EXCEPT SELECT code FROM role
    ) x;
    IF manquants > 0 THEN
        RAISE EXCEPTION 'Rôle cible absent : % manquant(s)', manquants;
    END IF;

    SELECT count(*) INTO archives FROM utilisateur_entreprise_archive_v41;
    IF archives = 0 THEN
        RAISE EXCEPTION 'Archive V41 vide : bascule refusée, aucun retour arrière possible';
    END IF;
END $$;

-- Photographie d'avant bascule, pour la vérification finale.
CREATE TEMP TABLE _avant_v43 AS
SELECT count(*) AS total,
       count(*) FILTER (WHERE r.code = 'ADMIN_AUDIT') AS admin_audit,
       count(*) FILTER (WHERE r.code = 'EMPLOYE')     AS employe,
       count(*) FILTER (WHERE r.code = 'VISITEUR')    AS visiteur,
       count(*) FILTER (WHERE r.code = 'SUPER_ADMIN') AS super_admin,
       count(*) FILTER (WHERE r.code = 'COLLABORATEUR') AS collaborateur
FROM utilisateur_entreprise ue JOIN role r ON r.id = ue.role_id;

UPDATE utilisateur_entreprise ue
SET role_id = (SELECT id FROM role WHERE code = 'SUPER_ADMIN')
WHERE ue.role_id = (SELECT id FROM role WHERE code = 'ADMIN_AUDIT');

UPDATE utilisateur_entreprise ue
SET role_id = (SELECT id FROM role WHERE code = 'COLLABORATEUR')
WHERE ue.role_id IN (SELECT id FROM role WHERE code IN ('EMPLOYE', 'VISITEUR'));

-- Vérifications : aucun rattachement perdu, aucun ancien rôle résiduel,
-- aucun utilisateur devenu porteur de deux rattachements sur une même
-- entreprise du fait de la bascule.
DO $$
DECLARE
    a           _avant_v43%ROWTYPE;
    apres_total integer;
    residuels   integer;
    doublons    integer;
    attendu_sa  integer;
    attendu_col integer;
    obtenu_sa   integer;
    obtenu_col  integer;
BEGIN
    SELECT * INTO a FROM _avant_v43;

    SELECT count(*) INTO apres_total FROM utilisateur_entreprise;
    IF apres_total <> a.total THEN
        RAISE EXCEPTION 'Rattachements perdus : % avant, % après', a.total, apres_total;
    END IF;

    SELECT count(*) INTO residuels
    FROM utilisateur_entreprise ue JOIN role r ON r.id = ue.role_id
    WHERE r.code IN ('ADMIN_AUDIT', 'EMPLOYE', 'VISITEUR');
    IF residuels > 0 THEN
        RAISE EXCEPTION 'Bascule incomplète : % rattachement(s) sur un ancien rôle', residuels;
    END IF;

    attendu_sa  := a.super_admin + a.admin_audit;
    attendu_col := a.collaborateur + a.employe + a.visiteur;

    SELECT count(*) INTO obtenu_sa
    FROM utilisateur_entreprise ue JOIN role r ON r.id = ue.role_id WHERE r.code = 'SUPER_ADMIN';
    SELECT count(*) INTO obtenu_col
    FROM utilisateur_entreprise ue JOIN role r ON r.id = ue.role_id WHERE r.code = 'COLLABORATEUR';

    IF obtenu_sa <> attendu_sa THEN
        RAISE EXCEPTION 'SUPER_ADMIN : % attendus, % obtenus', attendu_sa, obtenu_sa;
    END IF;
    IF obtenu_col <> attendu_col THEN
        RAISE EXCEPTION 'COLLABORATEUR : % attendus, % obtenus', attendu_col, obtenu_col;
    END IF;

    SELECT count(*) INTO doublons FROM (
        SELECT utilisateur_id, entreprise_id FROM utilisateur_entreprise
        GROUP BY utilisateur_id, entreprise_id HAVING count(*) > 1
    ) d;
    IF doublons > 0 THEN
        RAISE EXCEPTION 'Bascule fautive : % utilisateur(s) avec deux rattachements sur une même entreprise', doublons;
    END IF;
END $$;

DROP TABLE _avant_v43;

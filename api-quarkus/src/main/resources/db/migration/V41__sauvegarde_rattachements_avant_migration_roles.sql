-- =====================================================================
-- Sauvegarde des rattachements avant la migration des rôles
-- =====================================================================
-- La phase 2 basculera les rattachements ADMIN_AUDIT vers SUPER_ADMIN et
-- EMPLOYE / VISITEUR vers COLLABORATEUR. Une bascule de rôle ne se relit
-- pas : une fois `role_id` écrasé, plus rien ne dit quel rôle portait
-- l'utilisateur auparavant, et le journal d'audit ne trace pas ces lignes.
--
-- Cette table fige donc l'état exact d'avant migration, ligne à ligne, avec
-- le code du rôle en clair — de sorte qu'un retour arrière reste possible
-- même si un rôle venait à être renommé ou supprimé plus tard.
--
-- Elle est conservée après la migration : c'est une archive, pas un
-- fichier temporaire. Son coût est de quelques dizaines de lignes.
--
-- Ce que cette migration NE fait PAS : aucune écriture dans
-- utilisateur_entreprise, aucune suppression, aucun rôle modifié.
-- =====================================================================

CREATE TABLE utilisateur_entreprise_archive_v41 (
    id                    uuid PRIMARY KEY,
    utilisateur_id        uuid NOT NULL,
    entreprise_id         uuid NOT NULL,
    site_id               uuid,
    role_id               uuid NOT NULL,
    -- Le code du rôle est copié en clair, et non seulement son identifiant :
    -- c'est ce qui permet de restaurer même si la ligne de `role` disparaît.
    role_code             varchar(50) NOT NULL,
    utilisateur_email     varchar(255) NOT NULL,
    entreprise_raison_sociale varchar(255) NOT NULL,
    date_affectation      timestamptz NOT NULL,
    statut                varchar(30) NOT NULL,
    archive_le            timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE utilisateur_entreprise_archive_v41 IS
    'Photographie de utilisateur_entreprise prise avant la migration des rôles (phase 2). Conservée comme archive de restauration ; ne jamais la vider.';

INSERT INTO utilisateur_entreprise_archive_v41 (
    id, utilisateur_id, entreprise_id, site_id, role_id, role_code,
    utilisateur_email, entreprise_raison_sociale, date_affectation, statut
)
SELECT ue.id, ue.utilisateur_id, ue.entreprise_id, ue.site_id, ue.role_id,
       r.code, u.email, e.raison_sociale, ue.date_affectation, ue.statut::text
FROM utilisateur_entreprise ue
JOIN role r ON r.id = ue.role_id
JOIN utilisateur u ON u.id = ue.utilisateur_id
JOIN entreprise e ON e.id = ue.entreprise_id;

-- Filet de sécurité : la migration échoue si la copie est incomplète, plutôt
-- que de laisser croire à une sauvegarde partielle.
DO $$
DECLARE
    source integer;
    copie  integer;
BEGIN
    SELECT count(*) INTO source FROM utilisateur_entreprise;
    SELECT count(*) INTO copie  FROM utilisateur_entreprise_archive_v41;
    IF source <> copie THEN
        RAISE EXCEPTION 'Sauvegarde incomplète : % rattachements en source, % archivés', source, copie;
    END IF;
END $$;

-- =====================================================================
-- FIX — utilisateur_entreprise : site_id doit rester nullable (RG05)
-- =====================================================================
-- Le MCD prévoit site_id comme FK nullable (un utilisateur peut être
-- rattaché à une entreprise entière, sans site précis). Mais en
-- PostgreSQL, toute colonne faisant partie d'une PRIMARY KEY devient
-- implicitement NOT NULL — la contrainte posée en 001_init_schema.sql
-- (PRIMARY KEY (utilisateur_id, entreprise_id, site_id)) rendait donc
-- site_id obligatoire malgré ON DELETE SET NULL sur la FK, ce qui aurait
-- provoqué une erreur au moment où PostgreSQL essaie d'appliquer ce SET
-- NULL si un site est supprimé.
--
-- Correction : clé primaire de substitution (id) + deux index d'unicité
-- partielle qui reproduisent la même règle métier que l'ancienne PK,
-- site_id nullable inclus.
-- =====================================================================

ALTER TABLE utilisateur_entreprise DROP CONSTRAINT utilisateur_entreprise_pkey;

-- Supprimer la PK ne retire pas le NOT NULL implicite laissé sur la colonne :
-- il faut le lever explicitement.
ALTER TABLE utilisateur_entreprise ALTER COLUMN site_id DROP NOT NULL;

ALTER TABLE utilisateur_entreprise
  ADD COLUMN id UUID NOT NULL DEFAULT gen_random_uuid();

ALTER TABLE utilisateur_entreprise ADD PRIMARY KEY (id);

-- Un utilisateur ne peut être rattaché qu'une seule fois à une entreprise
-- sans site précis (site_id NULL)...
CREATE UNIQUE INDEX uq_utilisateur_entreprise_sans_site
  ON utilisateur_entreprise (utilisateur_id, entreprise_id)
  WHERE site_id IS NULL;

-- ...et qu'une seule fois par site précis lorsqu'un site est renseigné.
CREATE UNIQUE INDEX uq_utilisateur_entreprise_avec_site
  ON utilisateur_entreprise (utilisateur_id, entreprise_id, site_id)
  WHERE site_id IS NOT NULL;

COMMENT ON TABLE utilisateur_entreprise IS 'RG05 : rattachement utilisateur/entreprise, site optionnel (voir fix 002 pour la nullabilité réelle de site_id)';

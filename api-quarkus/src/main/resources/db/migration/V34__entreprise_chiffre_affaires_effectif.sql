-- =====================================================================
-- Caractérisation d'une entreprise : chiffre d'affaires et effectif
-- =====================================================================
-- L'entreprise n'était décrite que par une tranche de taille (TPE, PME,
-- ETI, GRANDE_ENTREPRISE). Les grilles d'évaluation la caractérisent par
-- deux grandeurs chiffrées : son chiffre d'affaires et son effectif.
--
-- Ces deux valeurs sont conservées telles qu'elles sont déclarées plutôt
-- que dérivées de la tranche : deux entreprises de la même tranche n'ont
-- ni le même poids économique ni le même effectif, et le classement d'un
-- portefeuille perdrait tout son sens à les confondre.
--
-- La tranche est conservée : elle reste utile au filtrage et à la
-- composition sectorielle du questionnaire (RG34), et rien n'oblige une
-- entreprise à communiquer son chiffre d'affaires.
-- =====================================================================

ALTER TABLE entreprise
  ADD COLUMN chiffre_affaires numeric(16,2),
  ADD COLUMN devise_chiffre_affaires varchar(3) NOT NULL DEFAULT 'XOF',
  ADD COLUMN effectif integer,
  ADD CONSTRAINT entreprise_chiffre_affaires_positif
      CHECK (chiffre_affaires IS NULL OR chiffre_affaires >= 0),
  ADD CONSTRAINT entreprise_effectif_positif
      CHECK (effectif IS NULL OR effectif >= 0);

COMMENT ON COLUMN entreprise.chiffre_affaires IS
  'Chiffre d''affaires annuel déclaré. Null tant qu''il n''est pas communiqué.';
COMMENT ON COLUMN entreprise.effectif IS
  'Effectif déclaré, en nombre de personnes. Null tant qu''il n''est pas communiqué.';

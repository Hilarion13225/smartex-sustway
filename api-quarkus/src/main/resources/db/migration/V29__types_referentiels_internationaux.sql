-- =====================================================================
-- Catalogue de référentiels : ouverture aux standards internationaux
-- =====================================================================
-- Le type `type_referentiel` ne connaissait que les cinq référentiels
-- déjà présents (SMARTEX, PRI, GRESB, ITIE, IFC_SFI). La plateforme se
-- destine à centraliser l'ensemble des cadres utilisés en audit ESG : sans
-- ces valeurs, créer un référentiel ISO 14001 ou GRI était impossible.
--
-- Seules les valeurs sont ajoutées ; aucun référentiel n'est créé. Les
-- contenus (domaines, critères) relèvent d'un travail métier, pas d'une
-- migration.
--
-- PostgreSQL interdit d'employer une valeur d'énuméré dans la transaction
-- qui l'ajoute : ce lot se limite donc aux ALTER TYPE, et toute insertion
-- s'appuyant dessus devra passer par une migration ultérieure.
-- =====================================================================

ALTER TYPE type_referentiel ADD VALUE IF NOT EXISTS 'ISO';
ALTER TYPE type_referentiel ADD VALUE IF NOT EXISTS 'GRI';
ALTER TYPE type_referentiel ADD VALUE IF NOT EXISTS 'SASB';
ALTER TYPE type_referentiel ADD VALUE IF NOT EXISTS 'TCFD';
ALTER TYPE type_referentiel ADD VALUE IF NOT EXISTS 'CSRD';
ALTER TYPE type_referentiel ADD VALUE IF NOT EXISTS 'ISSB';
ALTER TYPE type_referentiel ADD VALUE IF NOT EXISTS 'CDP';
ALTER TYPE type_referentiel ADD VALUE IF NOT EXISTS 'UNGC';
ALTER TYPE type_referentiel ADD VALUE IF NOT EXISTS 'AUTRE';

-- =====================================================================
-- FIX — pays : CHAR -> VARCHAR sur les codes ISO
-- =====================================================================
-- CHAR(n) et VARCHAR(n) sont fonctionnellement équivalents ici (les codes
-- ISO alpha-2/alpha-3/numériques font toujours exactement 2 ou 3
-- caractères, donc aucun problème de padding). Mais Hibernate valide par
-- défaut les colonnes String comme VARCHAR : garder CHAR obligeait à
-- ruser côté entité JPA (columnDefinition) sans même éliminer
-- l'avertissement de validation au démarrage. Plus simple d'aligner la
-- base sur l'attente standard de l'ORM.
-- Aucune perte de données : conversion directe, aucune valeur ne dépasse
-- la longueur cible.
-- =====================================================================

ALTER TABLE pays ALTER COLUMN code_iso_alpha2 TYPE VARCHAR(2);
ALTER TABLE pays ALTER COLUMN code_iso_alpha3 TYPE VARCHAR(3);
ALTER TABLE pays ALTER COLUMN code_numerique TYPE VARCHAR(3);

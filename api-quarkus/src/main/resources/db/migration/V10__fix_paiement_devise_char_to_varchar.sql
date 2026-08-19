-- =====================================================================
-- FIX — paiement.devise : CHAR -> VARCHAR
-- =====================================================================
-- Même situation que le fix 003 sur pays.code_iso_alpha2/3 : CHAR(3) et
-- VARCHAR(3) sont équivalents pour un code devise toujours à 3 caractères
-- (XOF, EUR, USD...), mais Hibernate valide par défaut les colonnes String
-- comme VARCHAR. Alignement de la base sur l'attente standard de l'ORM.
-- =====================================================================

ALTER TABLE paiement ALTER COLUMN devise TYPE VARCHAR(3);
-- Neutralise le résidu de cast ('XOF'::bpchar) laissé par la conversion :
-- sans cette ligne, le DEFAULT reste techniquement correct (Postgres caste
-- implicitement) mais affiche un type obsolète dans \d, source de confusion.
ALTER TABLE paiement ALTER COLUMN devise SET DEFAULT 'XOF';

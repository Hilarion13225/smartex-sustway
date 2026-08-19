-- =====================================================================
-- FIX — audit_log : INET -> VARCHAR(45) sur ip_address
-- =====================================================================
-- PostgreSQL refuse de lier un paramètre JDBC de type VARCHAR sur une
-- colonne INET sans cast explicite (contrairement à une valeur SQL
-- littérale) : "la colonne « ip_address » est de type inet mais
-- l'expression est de type character varying". Le binding correct côté
-- Hibernate nécessiterait d'envelopper la valeur dans un
-- org.postgresql.util.PGobject, pour un bénéfice nul ici puisqu'aucun
-- opérateur réseau PostgreSQL (contenance de sous-réseau, etc.) n'est
-- utilisé sur cette colonne — elle sert uniquement à la traçabilité RG19.
-- VARCHAR(45) couvre une adresse IPv6 dans sa forme la plus longue.
-- =====================================================================

ALTER TABLE audit_log ALTER COLUMN ip_address TYPE VARCHAR(45);

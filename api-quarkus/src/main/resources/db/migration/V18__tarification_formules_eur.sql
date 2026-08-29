-- =====================================================================
-- Tarification des formules en euros (remplace les montants provisoires
-- en FCFA de V8) — pas de remise annuelle : prix_annuel = 12 x prix_mensuel.
-- =====================================================================

UPDATE formule_abonnement SET prix_mensuel = 5000,  prix_annuel = 60000  WHERE code = 'STANDARD';
UPDATE formule_abonnement SET prix_mensuel = 10000, prix_annuel = 120000 WHERE code = 'AVANCEES';

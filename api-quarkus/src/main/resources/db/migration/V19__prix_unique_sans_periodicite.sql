-- =====================================================================
-- Suppression de la périodicité de facturation (mensuel/annuel) :
-- chaque formule n'a plus qu'un prix unique. Les montants restent ceux
-- de V18 (V18.prix_annuel = 12 x prix_mensuel, sans remise annuelle —
-- prix_mensuel est donc bien le montant à conserver).
-- =====================================================================

ALTER TABLE formule_abonnement ADD COLUMN prix NUMERIC(10,2);
UPDATE formule_abonnement SET prix = prix_mensuel;
ALTER TABLE formule_abonnement ALTER COLUMN prix SET NOT NULL;
ALTER TABLE formule_abonnement DROP COLUMN prix_mensuel;
ALTER TABLE formule_abonnement DROP COLUMN prix_annuel;

ALTER TABLE abonnement DROP COLUMN periodicite;
DROP TYPE periodicite_facturation;

-- Cohérence avec la tarification en euros (V18) : seul le défaut change,
-- les paiements déjà enregistrés (en FCFA, avant V18) ne sont pas réécrits.
ALTER TABLE paiement ALTER COLUMN devise SET DEFAULT 'EUR';

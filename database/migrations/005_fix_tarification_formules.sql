-- =====================================================================
-- FIX — Tarification provisoire des formules Standard / Avancées
-- =====================================================================
-- Le seed initial (V2) laissait prix_mensuel/prix_annuel à NULL avec la
-- note "à compléter lors du cadrage tarifaire avec Smartex Expertises"
-- (CDC §5.3 : modalités PI-SPI/Wave encore à cadrer). Nécessaire main-
-- tenant pour pouvoir calculer un montant de paiement (phase C) : montants
-- provisoires, clairement à ajuster avec Smartex Expertises avant toute
-- mise en production réelle (aucun paiement réel n'est encore traité —
-- voir PaiementService, stub en attendant l'intégration PI-SPI/Wave).
-- =====================================================================

UPDATE formule_abonnement SET prix_mensuel = 0,      prix_annuel = 0       WHERE code = 'FREE';
UPDATE formule_abonnement SET prix_mensuel = 50000,  prix_annuel = 500000  WHERE code = 'STANDARD';
UPDATE formule_abonnement SET prix_mensuel = 150000, prix_annuel = 1500000 WHERE code = 'AVANCEES';

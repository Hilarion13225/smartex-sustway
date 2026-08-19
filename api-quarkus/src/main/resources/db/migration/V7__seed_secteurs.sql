-- =====================================================================
-- SEED — Secteurs d'activité (liste CGECI provisoire — CDC §13 : "liste
-- sectorielle basée sur l'étude CGECI existante")
-- =====================================================================
-- Liste provisoire à 9 secteurs, reprise du prototype frontend en attendant
-- la liste CGECI complète et validée (livrable back-office, phase F).
-- Nécessaire dès maintenant : la création d'une entreprise référence un
-- secteur (entreprise.secteur_id), et le frontend en a besoin pour son
-- formulaire d'inscription.
-- =====================================================================

INSERT INTO secteur (code, nom) VALUES
  ('AGRO_INDUSTRIE', 'Agro-industrie'),
  ('BANQUE_ASSURANCE', 'Banque et assurance'),
  ('BTP_IMMOBILIER', 'BTP et immobilier'),
  ('DISTRIBUTION_COMMERCE', 'Distribution et commerce'),
  ('ENERGIE', 'Énergie'),
  ('INDUSTRIE_MANUFACTURIERE', 'Industrie manufacturière'),
  ('MINES_EXTRACTION', 'Mines et extraction'),
  ('SERVICES_TIC', 'Services et TIC'),
  ('TRANSPORT_LOGISTIQUE', 'Transport et logistique')
ON CONFLICT (code) DO NOTHING;

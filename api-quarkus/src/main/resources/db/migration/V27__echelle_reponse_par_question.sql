-- =====================================================================
-- Questionnaire : échelle de réponse propre à chaque question
-- =====================================================================
-- L'échelle de maturité à cinq niveaux convient aux questions qui
-- décrivent une pratique (« L'entreprise dispose-t-elle d'un SGES ? »),
-- pas à celles qui constatent un fait (« Utilisez-vous des produits
-- chimiques interdits ? »). Répondre « Politique formalisée et mise en
-- œuvre de manière proactive » à cette seconde forme n'a pas de sens.
--
-- Chaque question porte donc son échelle : MATURITE (1 à 5) ou BINAIRE
-- (oui / non). La réponse binaire se range dans reponse_question.valeur,
-- déjà prévue pour OUI/NON, tandis que reponse_question.niveau reste
-- réservée aux questions de maturité.
--
-- Colonne texte contrainte plutôt qu'un type énuméré : ajouter une valeur
-- à un enum PostgreSQL interdit de l'utiliser dans la même transaction,
-- ce qui imposerait de scinder ce lot en deux migrations.
-- =====================================================================

ALTER TABLE question
  ADD COLUMN echelle_reponse varchar(20) NOT NULL DEFAULT 'MATURITE',
  ADD CONSTRAINT question_echelle_reponse_check
    CHECK (echelle_reponse IN ('MATURITE', 'BINAIRE'));

COMMENT ON COLUMN question.echelle_reponse IS
  'MATURITE : réponse sur l''échelle 1-5 (reponse_question.niveau). '
  'BINAIRE : constat de fait, réponse oui/non (reponse_question.valeur).';

-- --- Questions factuelles du référentiel IFC/SFI -----------------------
--
-- Elles constatent une situation qui déclenche ou non l'application de la
-- Norme : la présence de produits chimiques dangereux, d'un déplacement de
-- population, d'une zone protégée, de territoires autochtones ou d'une
-- restriction d'accès à des sites sacrés.

UPDATE question q
SET echelle_reponse = 'BINAIRE'
FROM critere c, domaine d, referentiel r
WHERE q.critere_id = c.id
  AND c.domaine_id = d.id
  AND d.referentiel_id = r.id
  AND r.code = 'IFC_SFI'
  AND c.code IN ('PS3-05', 'PS5-01', 'PS6-01', 'PS7-01', 'PS8-04');

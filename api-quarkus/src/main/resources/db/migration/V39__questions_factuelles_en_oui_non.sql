-- =====================================================================
-- Trois constats factuels repassent en réponse Oui/Non
-- =====================================================================
-- L'échelle de maturité en cinq niveaux décrit le degré d'installation
-- d'une pratique. Elle n'a pas de sens pour un constat : une équipe RSE
-- existe ou n'existe pas, un rapport annuel est publié ou ne l'est pas.
-- Demander « à quel point » publiez-vous un rapport oblige l'entreprise
-- à inventer une nuance là où il n'y en a pas.
--
-- La distinction existait déjà (V27, colonne echelle_reponse) mais avait
-- disparu avec le remplacement des référentiels par la grille RSE
-- importée de l'Excel du client : les 136 questions y étaient toutes en
-- MATURITE, et le composant de réponse binaire ne s'affichait plus nulle
-- part.
--
-- Les six autres questions interrogatives de la grille (D1-01 à D1-07)
-- restent sur l'échelle : formaliser un code de conduite, cartographier
-- ses parties prenantes ou rendre des comptes sont des démarches qui
-- s'installent par degrés, quelle que soit la forme de la phrase.
-- =====================================================================

UPDATE question q
SET echelle_reponse = 'BINAIRE'
FROM critere c, domaine d, referentiel r
WHERE q.critere_id = c.id
  AND c.domaine_id = d.id
  AND d.referentiel_id = r.id
  AND r.code = 'SMARTEX_SUSTWAY'
  AND c.code IN ('D6-91', 'D6-92', 'D6-93');

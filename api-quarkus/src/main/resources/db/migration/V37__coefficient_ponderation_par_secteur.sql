-- =====================================================================
-- Pondération d'un critère variable selon le secteur de l'entreprise
-- =====================================================================
-- Le coefficient 1-3 issu de la grille RSE pèse dans la note d'un critère
-- (RG31 : note = niveau × coefficient). Il était jusqu'ici le même pour
-- toutes les organisations, alors qu'un critère n'a pas le même poids
-- selon le métier : la gestion des déchets dangereux est déterminante
-- pour une mine, marginale pour une société de services.
--
-- Cette table porte les exceptions. Un critère sans ligne pour le secteur
-- audité garde le coefficient de la grille : on ne saisit donc que ce qui
-- s'écarte de la règle générale, et non 136 critères × 9 secteurs.
--
-- La criticité sectorielle (critere_criticite_secteur) reste un axe
-- distinct : elle ne touche pas la note mais la priorité des écarts
-- constatés (RG26). Les deux répondent à des questions différentes —
-- « combien ce critère compte-t-il dans le score ? » d'un côté, « quelle
-- urgence si l'organisation y échoue ? » de l'autre.
-- =====================================================================

CREATE TABLE critere_coefficient_secteur (
    critere_id  uuid NOT NULL REFERENCES critere(id) ON DELETE CASCADE,
    secteur_id  uuid NOT NULL REFERENCES secteur(id) ON DELETE CASCADE,
    -- Mêmes bornes que critere.coefficient_ponderation : la surcharge doit
    -- rester lisible sur la même échelle 1-3 que la grille d'origine.
    coefficient numeric(3,1) NOT NULL,
    created_at  timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (critere_id, secteur_id),
    CONSTRAINT critere_coefficient_secteur_borne CHECK (coefficient >= 1 AND coefficient <= 3)
);

COMMENT ON TABLE critere_coefficient_secteur IS
    'Coefficient de pondération d''un critère pour un secteur donné ; à défaut, celui du critère s''applique.';

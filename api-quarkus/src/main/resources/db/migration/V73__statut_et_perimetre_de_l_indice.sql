-- =====================================================================
-- L'indice de préparation dit désormais ce qu'il ignore
-- =====================================================================
-- `indice_preparation.score` était NOT NULL. Quand aucun critère n'était
-- marqué applicable à un bailleur — l'état réel de la base aujourd'hui,
-- `critere_bailleur` étant vide — le calcul portait sur un ensemble vide
-- et ScoringEngine rendait 0. L'API répondait donc 200 avec un score de
-- 0.00, que rien ne distinguait d'une préparation réellement nulle.
--
-- Les deux situations appellent des décisions opposées : l'une demande du
-- travail de mise en conformité, l'autre du paramétrage. Un chiffre ne
-- peut pas porter cette différence ; un statut le peut.
--
-- Trois colonnes sont ajoutées :
--
--   * `statut` dit pourquoi il y a — ou non — un score ;
--   * `nombre_criteres_tagues` donne le périmètre théorique du bailleur ;
--   * `nombre_criteres_retenus` donne ce qui est réellement entré dans le
--     calcul pour cette mission.
--
-- Les deux compteurs ne font pas double emploi avec le statut : ils
-- séparent « la mission n'est pas assez avancée » de « aucun critère tagué
-- n'appartient à son référentiel », deux cas que SANS_EVALUATION recouvre
-- tous les deux.
--
-- La contrainte UNIQUE (audit_id, bailleur_id) n'est pas touchée : un
-- calcul continue d'écraser le précédent. L'historisation en instantanés
-- est un autre sujet, délibérément reporté — la lever est difficilement
-- réversible une fois des doublons créés.
--
-- Aucune reprise de données : la table est vide (0 ligne). Les valeurs par
-- défaut n'existent que pour satisfaire le NOT NULL à l'ajout des colonnes
-- et ne seront appliquées à aucune ligne existante.
-- =====================================================================

CREATE TYPE statut_indice AS ENUM (
    'NON_CALCULABLE',
    'SANS_EVALUATION',
    'CALCULE'
);

ALTER TABLE indice_preparation
    ALTER COLUMN score DROP NOT NULL;

ALTER TABLE indice_preparation
    ADD COLUMN statut statut_indice NOT NULL DEFAULT 'CALCULE',
    ADD COLUMN nombre_criteres_tagues  integer NOT NULL DEFAULT 0,
    ADD COLUMN nombre_criteres_retenus integer NOT NULL DEFAULT 0;

COMMENT ON COLUMN indice_preparation.statut IS
    'Pourquoi l''indice porte — ou non — un score. NON_CALCULABLE : aucun critère applicable au bailleur. SANS_EVALUATION : des critères applicables existent mais aucun n''est validé dans cette mission. CALCULE : le score a un sens.';
COMMENT ON COLUMN indice_preparation.score IS
    'RG41 : score pondéré sur les seuls critères tagués. Nul dès que le statut n''est pas CALCULE — un zéro ne doit jamais tenir lieu d''absence de données.';
COMMENT ON COLUMN indice_preparation.nombre_criteres_tagues IS
    'Périmètre théorique : critères marqués applicables à ce bailleur, toutes missions confondues.';
COMMENT ON COLUMN indice_preparation.nombre_criteres_retenus IS
    'Périmètre effectif : critères de cette mission réellement entrés dans le calcul (actifs, applicables, évaluation validée).';

-- Le score et le statut ne peuvent pas se contredire : un CALCULE sans
-- score, ou un score sans CALCULE, serait un indice dont on ne saurait pas
-- quoi lire. La règle est tenue par la base et non seulement par le
-- service, pour qu'aucun futur chemin d'écriture ne puisse la contourner.
ALTER TABLE indice_preparation
    ADD CONSTRAINT indice_score_coherent_avec_statut CHECK (
        (statut = 'CALCULE' AND score IS NOT NULL)
        OR (statut <> 'CALCULE' AND score IS NULL)
    );

-- Un périmètre effectif ne peut pas dépasser le périmètre théorique.
ALTER TABLE indice_preparation
    ADD CONSTRAINT indice_perimetre_coherent CHECK (
        nombre_criteres_retenus <= nombre_criteres_tagues
    );

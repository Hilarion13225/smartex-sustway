-- =====================================================================
-- Le détail que le contrat V2 produit, et que rien ne savait recevoir
-- =====================================================================
-- Le pipeline V2 ne rend pas seulement une probabilité : il se prononce
-- attente par attente, document par document, et rattache ses signaux de
-- risque à des éléments précis du référentiel. Rien de tout cela n'avait
-- d'emplacement — `evaluation` est plate, et sa seule table fille porte
-- des documents, pas des attentes.
--
-- Trois tables, trois grains distincts :
--
--   analyse_document_constat  un constat par (document × attente)
--   evaluation_preuve         un avis de synthèse par attente
--   evaluation_constat        une remarque rattachée à un élément
--
-- La règle appliquée est celle du schéma cible : ce qui se cherche devient
-- une colonne, ce qui se lit reste en JSONB — mais appliquée À L'INTÉRIEUR
-- de chaque constat, pas à l'objet entier. Une référence résolvable en
-- UUID devient une clé étrangère, jamais du JSONB : aucune des six
-- colonnes JSONB déjà présentes dans ce schéma ne contient de clé
-- étrangère déguisée, et y déroger rendrait impossible la question
-- « quelles attentes sont insuffisantes sur cette mission ? ».
-- =====================================================================

-- --- 1. Constats documentaires ----------------------------------------
--
-- C'est cette table qui préserve les contradictions. Deux documents
-- affirmant des choses opposées sur la même attente produisent DEUX
-- lignes, chacune rattachée à son document. Aucune ne peut écraser
-- l'autre. Une structure qui n'en garderait qu'une par attente perdrait le
-- conflit — et le conflit est un fait d'audit, pas une erreur à trancher.

CREATE TABLE analyse_document_constat (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

    evaluation_document_analyse_id uuid NOT NULL
        REFERENCES evaluation_document_analyse(id) ON DELETE CASCADE,

    -- RESTRICT : une preuve attendue sur laquelle un constat a été rendu
    -- ne se supprime pas silencieusement du référentiel.
    preuve_attendue_id uuid NOT NULL
        REFERENCES preuve_attendue(id) ON DELETE RESTRICT,

    presence presence_constat NOT NULL,

    -- Prose énumérée : elle se lit, elle ne se cherche pas.
    elements_releves   jsonb,
    elements_manquants jsonb,

    ordre integer NOT NULL DEFAULT 0
);

COMMENT ON TABLE analyse_document_constat IS
    'Ce qu''un document dit d''une preuve attendue. Plusieurs documents peuvent se contredire sur la même attente : chacun garde sa ligne.';

CREATE INDEX adc_analyse_idx
    ON analyse_document_constat (evaluation_document_analyse_id, ordre);

-- « Quels documents démontrent cette attente ? »
CREATE INDEX adc_preuve_idx
    ON analyse_document_constat (preuve_attendue_id);

-- --- 2. Évaluation par preuve attendue ---------------------------------
--
-- Le cœur du contrat V2. `couverture` est une énumération à quatre
-- valeurs, jamais un booléen : `evaluation.couverture_preuve` est conservé
-- pour la compatibilité V1 mais cesse d'être la source de vérité.

CREATE TABLE evaluation_preuve (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

    evaluation_id uuid NOT NULL
        REFERENCES evaluation(id) ON DELETE CASCADE,

    preuve_attendue_id uuid NOT NULL
        REFERENCES preuve_attendue(id) ON DELETE RESTRICT,

    couverture couverture_preuve_attendue NOT NULL,

    -- Nullable, et distinct de la justification : c'est sa PRÉSENCE qui se
    -- cherche (« quelles attentes portent un conflit ? »), son contenu qui
    -- se lit. Le fondre dans le texte de justification rendrait la question
    -- inatteignable.
    conflit text,

    justification text,

    elements_observes  jsonb,
    elements_manquants jsonb,

    -- Jamais fusionnée avec `elements_manquants`. Un élément non
    -- vérifiable n'est pas un élément manquant : le premier dit qu'on n'a
    -- pas pu regarder, le second qu'on a regardé. La fusion serait
    -- irréversible.
    elements_non_verifiables jsonb,

    -- Références locales des pièces ayant servi. Reste en JSONB parce que
    -- le lien pièce → attente est déjà porté relationnellement par
    -- analyse_document_constat, qui le fait mieux.
    pieces_utilisees jsonb,

    ordre integer NOT NULL DEFAULT 0,

    -- Une évaluation ne se prononce qu'une fois sur chaque attente.
    CONSTRAINT evaluation_preuve_unique UNIQUE (evaluation_id, preuve_attendue_id)
);

COMMENT ON TABLE evaluation_preuve IS
    'Avis de synthèse du pipeline sur une preuve attendue. NON_VERIFIABLE (« on n''a pas pu regarder ») est distinct de INSUFFISANTE (« on a regardé »).';
COMMENT ON COLUMN evaluation_preuve.elements_non_verifiables IS
    'Éléments qu''aucune pièce n''a permis de vérifier. Distincts des éléments manquants : ne jamais fusionner les deux listes.';

-- « Quelles attentes sont insuffisantes sur ce référentiel ? »
CREATE INDEX evaluation_preuve_couverture_idx
    ON evaluation_preuve (preuve_attendue_id, couverture);

-- Index partiel, très sélectif : les conflits restent rares.
CREATE INDEX evaluation_preuve_conflit_idx
    ON evaluation_preuve (evaluation_id)
    WHERE conflit IS NOT NULL;

-- --- 3. Remarques rattachées -------------------------------------------
--
-- Signaux de risque et éléments manquants partagent cette table parce
-- qu'ils ont exactement la même forme : un rattachement à un élément du
-- référentiel, plus une justification. Les séparer produirait deux tables
-- identiques pour une différence qui tient dans une valeur d'énumération.
-- Le discriminant `nature` permettra de les scinder plus tard sans
-- migration ambiguë si les deux notions divergent.

CREATE TABLE evaluation_constat (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

    evaluation_id uuid NOT NULL
        REFERENCES evaluation(id) ON DELETE CASCADE,

    nature nature_constat NOT NULL,

    niveau_rattachement niveau_rattachement NOT NULL,
    exigence_id        uuid REFERENCES exigence(id) ON DELETE RESTRICT,
    preuve_attendue_id uuid REFERENCES preuve_attendue(id) ON DELETE RESTRICT,
    regle_analyse_id   uuid REFERENCES regle_analyse(id) ON DELETE RESTRICT,

    -- Catégorie de risque. Nulle pour un élément manquant, qui n'en a pas.
    categorie varchar(40),

    justification text,

    -- Références locales des pièces concernées.
    pieces_concernees jsonb,

    ordre integer NOT NULL DEFAULT 0,

    -- Exactement une cible, et cohérente avec le niveau déclaré. Sans ce
    -- contrôle, rien n'empêcherait une ligne annonçant EXIGENCE tout en
    -- pointant une règle — une incohérence silencieuse, indétectable en
    -- lecture, et qui ne se manifesterait qu'au moment d'afficher un
    -- rattachement absurde à un auditeur.
    CONSTRAINT evaluation_constat_cible_coherente CHECK (
        (niveau_rattachement = 'EXIGENCE'
            AND exigence_id IS NOT NULL
            AND preuve_attendue_id IS NULL
            AND regle_analyse_id IS NULL)
        OR (niveau_rattachement = 'PREUVE_ATTENDUE'
            AND preuve_attendue_id IS NOT NULL
            AND exigence_id IS NULL
            AND regle_analyse_id IS NULL)
        OR (niveau_rattachement = 'REGLE'
            AND regle_analyse_id IS NOT NULL
            AND exigence_id IS NULL
            AND preuve_attendue_id IS NULL)
    )
);

COMMENT ON TABLE evaluation_constat IS
    'Remarque rattachée à un élément du référentiel : signal du Risk Agent, ou élément manquant relevé par l''agent de conformité. Le signal IA n''est jamais le risque déterministe RG26, qui reste dans risque_evaluation.';

CREATE INDEX evaluation_constat_nature_idx
    ON evaluation_constat (evaluation_id, nature);

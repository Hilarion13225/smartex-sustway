-- =====================================================================
-- Le plan d'action, au niveau de la mission
-- =====================================================================
-- Un plan d'action est un objet de pilotage de mission. Le suspendre à un
-- axe donnerait autant de plans que d'axes, alors que la réalité est
-- inverse : un plan regroupe plusieurs axes, et une même action en traite
-- souvent plusieurs à la fois — « formaliser et diffuser la politique
-- RSE » en couvre couramment trois.
--
-- C'est cette double multiplicité qui impose une table de liaison. Un
-- `axe_id` posé directement sur l'action l'interdirait, et obligerait à
-- dupliquer l'action autant de fois qu'elle répond à des axes — chaque
-- copie portant alors son propre responsable et sa propre échéance, sans
-- que rien ne dise qu'il s'agit du même travail.
--
-- `action_corrective` n'est pas réutilisée : son `non_conforme_id` est
-- NOT NULL. Y loger une action issue d'un axe forcerait à fabriquer une
-- non-conformité fictive, c'est-à-dire à transformer une proposition
-- d'amélioration en constat d'écart. Les deux objets coexistent, avec des
-- déclencheurs distincts.
-- =====================================================================

CREATE TABLE plan_action (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

    audit_id uuid NOT NULL REFERENCES audit(id) ON DELETE CASCADE,

    titre       varchar(255) NOT NULL,
    description text,

    statut statut_plan NOT NULL DEFAULT 'BROUILLON',

    responsable_id uuid REFERENCES utilisateur(id) ON DELETE SET NULL,
    date_echeance  date,

    -- Un plan est créé par une personne. `origine` existe pour homogénéité
    -- avec les axes et pour le jour où un plan serait pré-rempli à partir
    -- d'axes validés — auquel cas il resterait un brouillon à reprendre.
    origine origine_axe NOT NULL DEFAULT 'HUMAIN',

    created_by uuid REFERENCES utilisateur(id) ON DELETE SET NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz
);

COMMENT ON TABLE plan_action IS
    'Plan de pilotage d''une mission. Regroupe des actions qui répondent chacune à un ou plusieurs axes d''amélioration validés.';

CREATE INDEX plan_action_audit_idx ON plan_action (audit_id, statut);

-- --- Actions du plan ---------------------------------------------------
--
-- Les deux énumérations sont celles d'`action_corrective`. En créer de
-- nouvelles donnerait deux vocabulaires pour le même concept dans la même
-- application, et obligerait l'interface à traduire selon la provenance de
-- l'action.

CREATE TABLE action_plan (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

    plan_action_id uuid NOT NULL REFERENCES plan_action(id) ON DELETE CASCADE,

    titre       varchar(255) NOT NULL,
    description text,

    responsable_id uuid REFERENCES utilisateur(id) ON DELETE SET NULL,
    date_echeance  date,

    statut   statut_action_corrective NOT NULL DEFAULT 'OUVERTE',
    priorite priorite_action          NOT NULL DEFAULT 'MOYENNE',

    ordre integer NOT NULL DEFAULT 0,

    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz
);

COMMENT ON TABLE action_plan IS
    'Action d''un plan de mission. Distincte d''action_corrective, qui répond à une non-conformité constatée et non à un axe d''amélioration.';

CREATE INDEX action_plan_plan_idx ON action_plan (plan_action_id, ordre);

-- --- Liaison action ↔ axes ---------------------------------------------
--
-- La clé primaire composite porte l'idempotence : rattacher deux fois le
-- même axe à la même action est structurellement impossible, sans qu'aucun
-- code n'ait à le vérifier.

CREATE TABLE action_axe (
    action_plan_id      uuid NOT NULL REFERENCES action_plan(id) ON DELETE CASCADE,
    axe_amelioration_id uuid NOT NULL REFERENCES axe_amelioration(id) ON DELETE CASCADE,

    PRIMARY KEY (action_plan_id, axe_amelioration_id)
);

COMMENT ON TABLE action_axe IS
    'Une action peut répondre à plusieurs axes, un axe peut être traité par plusieurs actions — ou par aucune, s''il a été proposé sans être repris.';

-- Parcours dans l'autre sens : « quelles actions traitent cet axe ? ».
-- La clé primaire ne couvre que le sens action → axes.
CREATE INDEX action_axe_axe_idx ON action_axe (axe_amelioration_id);

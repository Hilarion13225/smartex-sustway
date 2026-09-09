-- =====================================================================
-- RegleAnalyse : comment confronter ce qui est fourni à ce qui est exigé
-- =====================================================================
-- La règle est une donnée, le prompt en est le rendu. Stocker le
-- comportement d'analyse dans un champ « prompt » libre reviendrait à
-- coder la logique métier dans du texte : impossible à valider, à
-- comparer entre versions, ou à faire évoluer sans relire chaque ligne.
--
-- La portée est un choix d'architecture, pas une commodité. Trois niveaux
-- de règles existent réellement :
--
--   - sur une preuve attendue : « la procédure doit être signée »,
--     « sa date de révision doit avoir moins de deux ans » ;
--   - sur une exigence : « au moins une des pièces attendues doit être
--     présente », « la déclaration doit concorder avec les pièces » ;
--   - sur le critère : « détecter une contradiction entre les exigences »,
--     qui ne se rattache à aucune exigence en particulier.
--
-- D'où une seule table portant les trois rattachements, du plus général au
-- plus précis : `critere_id` toujours renseigné, `exigence_id` et
-- `preuve_attendue_id` facultatifs, le plus profond des trois donnant la
-- portée. Les rattacher par de vraies clés étrangères plutôt que par des
-- identifiants nichés dans le JSON garde l'intégrité : supprimer une
-- exigence d'un brouillon emporte ses règles, et aucune règle ne peut
-- désigner une exigence qui n'existe pas.
--
-- Le caractère obligatoire d'une pièce n'est pas une règle : c'est une
-- propriété de la preuve attendue (`preuve_attendue.obligatoire`). Le
-- redire ici créerait deux sources de vérité.
-- =====================================================================

CREATE TYPE type_regle_analyse AS ENUM (
    'PRESENCE',               -- l'élément attendu doit être trouvé
    'ELEMENT_ATTENDU',        -- éléments précis à rechercher dans la pièce
    'DATE_VALIDITE',          -- une date doit exister et rester dans une fenêtre
    'SIGNATURE',              -- validation ou signature par une autorité identifiée
    'COHERENCE_DECLARATION',  -- la déclaration doit concorder avec les pièces
    'INCOHERENCE',            -- contradiction à détecter
    'CONDITION'               -- condition exprimée sur les faits rassemblés
);

CREATE TABLE regle_analyse (
    id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    referentiel_version_id uuid NOT NULL REFERENCES referentiel_version(id) ON DELETE RESTRICT,
    critere_id             uuid NOT NULL REFERENCES critere(id) ON DELETE CASCADE,
    exigence_id            uuid REFERENCES exigence(id) ON DELETE CASCADE,
    preuve_attendue_id     uuid REFERENCES preuve_attendue(id) ON DELETE CASCADE,
    code                   varchar(40) NOT NULL,
    type                   type_regle_analyse NOT NULL,
    libelle                varchar(300) NOT NULL,
    severite               niveau_criticite NOT NULL DEFAULT 'MOYENNE',
    definition             jsonb NOT NULL DEFAULT '{}'::jsonb,
    ordre                  integer NOT NULL DEFAULT 0,
    CONSTRAINT regle_analyse_code_unique UNIQUE (critere_id, code),
    -- Une règle portant sur une preuve attendue nomme forcément l'exigence
    -- de cette pièce : sans quoi sa portée serait ambiguë.
    CONSTRAINT regle_analyse_portee_coherente
        CHECK (preuve_attendue_id IS NULL OR exigence_id IS NOT NULL),
    -- La définition est un objet, jamais un tableau ni un scalaire : les
    -- paramètres sont nommés, et la validation par type se fait côté
    -- application (RegleAnalyseValidation).
    CONSTRAINT regle_analyse_definition_objet
        CHECK (jsonb_typeof(definition) = 'object')
);

CREATE INDEX idx_regle_analyse_critere ON regle_analyse (critere_id, ordre);
CREATE INDEX idx_regle_analyse_exigence ON regle_analyse (exigence_id);
CREATE INDEX idx_regle_analyse_preuve_attendue ON regle_analyse (preuve_attendue_id);
CREATE INDEX idx_regle_analyse_version ON regle_analyse (referentiel_version_id);

COMMENT ON TABLE regle_analyse IS
    'Règle d''évaluation d''un critère, portée par le référentiel et rendue en prompt par le service d''agents. Jamais un prompt stocké tel quel.';
COMMENT ON COLUMN regle_analyse.definition IS
    'Paramètres propres au type de règle, en objet JSON. Validés à l''écriture selon le type (voir RegleAnalyseValidation côté Java).';
COMMENT ON COLUMN regle_analyse.severite IS
    'Poids du manquement pour l''agent. N''entre pas dans le calcul du score, qui reste porté par la criticité du critère (RG31).';

-- --- Cohérence des rattachements ---------------------------------------
--
-- Les clés étrangères garantissent que les parents existent, pas qu'ils
-- forment une chaîne. Une règle pourrait nommer l'exigence d'un autre
-- critère, ou une pièce d'une autre exigence : le déclencheur l'interdit.

CREATE OR REPLACE FUNCTION exiger_chaine_de_portee_regle() RETURNS trigger AS $fonction$
DECLARE
    critere_de_l_exigence uuid;
    exigence_de_la_preuve uuid;
BEGIN
    IF NEW.exigence_id IS NOT NULL THEN
        SELECT e.critere_id INTO critere_de_l_exigence FROM exigence e WHERE e.id = NEW.exigence_id;
        IF critere_de_l_exigence IS DISTINCT FROM NEW.critere_id THEN
            RAISE EXCEPTION 'L''exigence visée appartient à un autre critère que celui de la règle'
                USING ERRCODE = 'check_violation';
        END IF;
    END IF;

    IF NEW.preuve_attendue_id IS NOT NULL THEN
        SELECT p.exigence_id INTO exigence_de_la_preuve
          FROM preuve_attendue p WHERE p.id = NEW.preuve_attendue_id;
        IF exigence_de_la_preuve IS DISTINCT FROM NEW.exigence_id THEN
            RAISE EXCEPTION 'La preuve attendue visée appartient à une autre exigence que celle de la règle'
                USING ERRCODE = 'check_violation';
        END IF;
    END IF;

    RETURN NEW;
END;
$fonction$ LANGUAGE plpgsql;

CREATE TRIGGER regle_analyse_chaine_de_portee
    BEFORE INSERT OR UPDATE ON regle_analyse
    FOR EACH ROW EXECUTE FUNCTION exiger_chaine_de_portee_regle();

-- Aucune règle initiale : elles se rédigent référentiel par référentiel.
-- Sans règle, le comportement d'analyse reste exactement celui d'avant
-- cette phase.

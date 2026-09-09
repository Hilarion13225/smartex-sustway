-- =====================================================================
-- PreuveAttendue : ce que l'audit attend en démonstration
-- =====================================================================
-- À ne pas confondre avec `document` et `preuve`, qui sont ce que
-- l'organisation fournit effectivement pendant une mission. La preuve
-- attendue appartient au référentiel : elle décrit le type d'élément que
-- l'agent doit rechercher, avant même qu'une organisation n'ait déposé
-- quoi que ce soit.
--
--   PreuveAttendue  → ce que l'audit attend      (catalogue, versionné)
--   Document/Preuve → ce que l'entreprise fournit (mission, mutable)
--
-- Elle se rattache à l'exigence, non au critère : c'est l'exigence qui doit
-- être démontrée, et deux exigences d'un même critère n'appellent pas les
-- mêmes pièces.
-- =====================================================================

CREATE TYPE type_preuve_attendue AS ENUM (
    'POLITIQUE',
    'PROCEDURE',
    'REGISTRE',
    'RAPPORT',
    'CERTIFICAT',
    'INDICATEUR',
    'DOCUMENT_LEGAL',
    'PREUVE_OPERATIONNELLE',
    'AUTRE'
);

CREATE TABLE preuve_attendue (
    id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    referentiel_version_id uuid NOT NULL REFERENCES referentiel_version(id) ON DELETE RESTRICT,
    exigence_id            uuid NOT NULL REFERENCES exigence(id) ON DELETE CASCADE,
    type                   type_preuve_attendue NOT NULL DEFAULT 'AUTRE',
    libelle                varchar(300) NOT NULL,
    description            text,
    obligatoire            boolean NOT NULL DEFAULT true,
    ordre                  integer NOT NULL DEFAULT 0
);

CREATE INDEX idx_preuve_attendue_exigence ON preuve_attendue (exigence_id, ordre);
CREATE INDEX idx_preuve_attendue_version ON preuve_attendue (referentiel_version_id);

COMMENT ON TABLE preuve_attendue IS
    'Élément que l''organisation devrait produire pour démontrer une exigence. Appartient au référentiel, contrairement à `preuve` qui est ce qu''une mission a reçu.';
COMMENT ON COLUMN preuve_attendue.description IS
    'Critères de recevabilité : ce qui rend cette pièce acceptable, et ce qui ne l''est pas.';
COMMENT ON COLUMN preuve_attendue.obligatoire IS
    'Vrai si l''absence de cette pièce empêche à elle seule de tenir l''exigence pour démontrée.';

-- Aucune donnée initiale : les preuves attendues se rédigent, elles ne se
-- déduisent pas d'un libellé. Semer ici du contenu inventé donnerait aux
-- agents des attentes que personne n'a formulées.

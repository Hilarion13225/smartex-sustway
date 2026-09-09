-- =====================================================================
-- Exigence : ce qu'un critère demande à l'organisation
-- =====================================================================
-- Le catalogue disait jusqu'ici ce qu'on évalue (le critère) et ce qu'on
-- demande de déclarer (la question), mais jamais ce qui est exigé. Le
-- service d'agents recevait donc, pour juger, un code et un libellé — et
-- rien d'autre, les 136 critères n'ayant aucune description.
--
-- L'exigence porte cet énoncé. Un critère en compte une ou plusieurs :
-- « disposer d'une procédure », « la faire valider », « la réviser
-- annuellement » sont trois exigences d'un même critère, et elles ne se
-- démontrent pas par les mêmes pièces.
--
-- L'exigence n'est pas une unité d'évaluation : le score reste calculé au
-- niveau du critère. Elle enrichit le contexte d'analyse, elle ne le
-- découpe pas.
-- =====================================================================

-- Distingue le contenu semé par cette migration de celui qu'un humain
-- écrira ensuite, et de celui qu'un import assisté proposera plus tard.
-- Sans cette marque, les 136 énoncés repris des libellés passeraient pour
-- des exigences métier rédigées, ce qu'ils ne sont pas.
CREATE TYPE origine_contenu AS ENUM ('CONTENU_INITIAL', 'CONTENU_HUMAIN', 'IMPORT_IA');

CREATE TABLE exigence (
    id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    referentiel_version_id uuid NOT NULL REFERENCES referentiel_version(id) ON DELETE RESTRICT,
    critere_id             uuid NOT NULL REFERENCES critere(id) ON DELETE CASCADE,
    code                   varchar(40) NOT NULL,
    intitule               varchar(300) NOT NULL,
    enonce                 text NOT NULL,
    ordre                  integer NOT NULL DEFAULT 0,
    origine                origine_contenu NOT NULL DEFAULT 'CONTENU_HUMAIN',
    CONSTRAINT exigence_code_unique UNIQUE (critere_id, code)
);

CREATE INDEX idx_exigence_critere ON exigence (critere_id, ordre);
CREATE INDEX idx_exigence_version ON exigence (referentiel_version_id);

COMMENT ON TABLE exigence IS
    'Ce qu''un critère exige de l''organisation. Plusieurs par critère. N''est pas une unité d''évaluation : le score reste au niveau du critère.';
COMMENT ON COLUMN exigence.enonce IS
    'Formulation de l''exigence, telle qu''elle sera soumise aux agents d''analyse.';
COMMENT ON COLUMN exigence.origine IS
    'CONTENU_INITIAL : repris du libellé du critère par la migration V50, à réécrire. CONTENU_HUMAIN : rédigé. IMPORT_IA : proposé par un import, réservé à une phase ultérieure.';

-- --- Initialisation : une exigence par critère existant ----------------
--
-- L'énoncé reprend le libellé du critère. Ce n'est pas une exigence
-- rédigée : c'est le point de départ qui rend la chaîne complète et
-- exploitable dès maintenant, marqué CONTENU_INITIAL pour qu'on sache
-- exactement ce qui reste à écrire.

INSERT INTO exigence (referentiel_version_id, critere_id, code, intitule, enonce, ordre, origine)
SELECT c.referentiel_version_id,
       c.id,
       c.code || '-E1',
       left(c.libelle, 300),
       c.libelle,
       0,
       'CONTENU_INITIAL'
  FROM critere c;

-- --- Vérification ------------------------------------------------------

DO $$
DECLARE
    criteres integer;
    exigences integer;
    sans_exigence integer;
    hors_version integer;
BEGIN
    SELECT count(*) INTO criteres FROM critere;
    SELECT count(*) INTO exigences FROM exigence;
    IF criteres <> exigences THEN
        RAISE EXCEPTION 'Initialisation incomplète : % critère(s) pour % exigence(s)', criteres, exigences;
    END IF;

    SELECT count(*) INTO sans_exigence
      FROM critere c WHERE NOT EXISTS (SELECT 1 FROM exigence e WHERE e.critere_id = c.id);
    IF sans_exigence > 0 THEN
        RAISE EXCEPTION '% critère(s) sans exigence initiale', sans_exigence;
    END IF;

    -- Une exigence appartient forcément à la version de son critère :
    -- l'inverse relierait deux versions entre elles.
    SELECT count(*) INTO hors_version
      FROM exigence e JOIN critere c ON c.id = e.critere_id
     WHERE e.referentiel_version_id <> c.referentiel_version_id;
    IF hors_version > 0 THEN
        RAISE EXCEPTION '% exigence(s) rattachées à une version différente de celle de leur critère', hors_version;
    END IF;
END $$;

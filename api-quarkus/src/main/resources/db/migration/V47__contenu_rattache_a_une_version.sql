-- =====================================================================
-- Le contenu du référentiel appartient à une version
-- =====================================================================
-- Domaines, sous-domaines, critères et questions reçoivent la version à
-- laquelle ils appartiennent. C'est ce rattachement qui rend possible
-- l'immuabilité posée en V49 : sans lui, aucune règle ne peut distinguer
-- une ligne en cours d'édition d'une ligne servant une mission close.
--
-- Colonne ajoutée nullable, remplie, puis rendue obligatoire : à aucun
-- moment la table n'est recréée ni vidée.
-- =====================================================================

ALTER TABLE domaine      ADD COLUMN referentiel_version_id uuid REFERENCES referentiel_version(id) ON DELETE RESTRICT;
ALTER TABLE sous_domaine ADD COLUMN referentiel_version_id uuid REFERENCES referentiel_version(id) ON DELETE RESTRICT;
ALTER TABLE critere      ADD COLUMN referentiel_version_id uuid REFERENCES referentiel_version(id) ON DELETE RESTRICT;
ALTER TABLE question     ADD COLUMN referentiel_version_id uuid REFERENCES referentiel_version(id) ON DELETE RESTRICT;

-- --- Reprise : tout le contenu existant rejoint la version courante ----
--
-- La descente se fait de proche en proche plutôt que par une jointure
-- unique : un sous-domaine tient sa version de son domaine, un critère de
-- son domaine, une question de son critère. Une incohérence de rattachement
-- ressortirait alors comme une ligne restée nulle, que la vérification
-- finale refuse.

UPDATE domaine d
   SET referentiel_version_id = v.id
  FROM referentiel_version v
 WHERE v.referentiel_id = d.referentiel_id
   AND v.statut = 'PUBLIEE';

UPDATE sous_domaine sd
   SET referentiel_version_id = d.referentiel_version_id
  FROM domaine d
 WHERE d.id = sd.domaine_id;

UPDATE critere c
   SET referentiel_version_id = d.referentiel_version_id
  FROM domaine d
 WHERE d.id = c.domaine_id;

UPDATE question q
   SET referentiel_version_id = c.referentiel_version_id
  FROM critere c
 WHERE c.id = q.critere_id;

ALTER TABLE domaine      ALTER COLUMN referentiel_version_id SET NOT NULL;
ALTER TABLE sous_domaine ALTER COLUMN referentiel_version_id SET NOT NULL;
ALTER TABLE critere      ALTER COLUMN referentiel_version_id SET NOT NULL;
ALTER TABLE question     ALTER COLUMN referentiel_version_id SET NOT NULL;

CREATE INDEX idx_domaine_version      ON domaine (referentiel_version_id, ordre);
CREATE INDEX idx_sous_domaine_version ON sous_domaine (referentiel_version_id);
CREATE INDEX idx_critere_version      ON critere (referentiel_version_id, code);
CREATE INDEX idx_question_version     ON question (referentiel_version_id);

-- --- Unicité des codes : par version, non plus par référentiel ---------
--
-- Une version corrective duplique le contenu de celle qu'elle remplace :
-- le domaine D1 existera dans la version 1.0 et dans la version 2.0 du même
-- référentiel. L'unicité (referentiel_id, code) l'interdirait. Elle se
-- déplace donc d'un cran, sur la version.
--
-- Les trois autres niveaux n'ont rien à changer : sous_domaine et critere
-- sont uniques par domaine, question par critère, et ces parents sont déjà
-- propres à une version.

ALTER TABLE domaine DROP CONSTRAINT domaine_referentiel_id_code_key;
ALTER TABLE domaine ADD CONSTRAINT domaine_version_code_unique UNIQUE (referentiel_version_id, code);

COMMENT ON COLUMN critere.referentiel_version_id IS
    'Version propriétaire de ce critère. Une ligne d''une version publiée n''est plus modifiable (voir V49).';

-- --- Vérification ------------------------------------------------------

DO $$
DECLARE
    orphelins text;
BEGIN
    SELECT string_agg(format('%s : %s ligne(s) sans version', t, n), ' ; ')
      INTO orphelins
      FROM (
        SELECT 'domaine' AS t, count(*) AS n FROM domaine WHERE referentiel_version_id IS NULL
        UNION ALL SELECT 'sous_domaine', count(*) FROM sous_domaine WHERE referentiel_version_id IS NULL
        UNION ALL SELECT 'critere', count(*) FROM critere WHERE referentiel_version_id IS NULL
        UNION ALL SELECT 'question', count(*) FROM question WHERE referentiel_version_id IS NULL
      ) c
     WHERE n > 0;

    IF orphelins IS NOT NULL THEN
        RAISE EXCEPTION 'Rattachement incomplet du contenu à une version — %', orphelins;
    END IF;
END $$;

-- Le contenu doit rester cohérent avec la hiérarchie : un critère et son
-- domaine appartiennent forcément à la même version.
DO $$
DECLARE
    incoherents integer;
BEGIN
    SELECT count(*) INTO incoherents
      FROM critere c JOIN domaine d ON d.id = c.domaine_id
     WHERE c.referentiel_version_id <> d.referentiel_version_id;
    IF incoherents > 0 THEN
        RAISE EXCEPTION '% critère(s) rattachés à une version différente de celle de leur domaine', incoherents;
    END IF;

    SELECT count(*) INTO incoherents
      FROM question q JOIN critere c ON c.id = q.critere_id
     WHERE q.referentiel_version_id <> c.referentiel_version_id;
    IF incoherents > 0 THEN
        RAISE EXCEPTION '% question(s) rattachées à une version différente de celle de leur critère', incoherents;
    END IF;
END $$;

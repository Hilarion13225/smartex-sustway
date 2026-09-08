-- =====================================================================
-- Une mission conserve la version exacte du référentiel qu'elle a auditée
-- =====================================================================
-- Le questionnaire d'une mission était déjà figé dans sa structure : quels
-- critères, quelles questions, quelle criticité, quel coefficient
-- (RG34/RG35, tables audit_critere et audit_question). Mais les textes
-- restaient lus en direct dans le catalogue. Une mission close pouvait
-- donc changer d'énoncé sans que personne ne l'ait décidé.
--
-- En rattachant la mission à une version, ce qu'elle a audité devient
-- déterminé : ses audit_critere pointent vers des lignes qui appartiennent
-- à cette version, et cette version est immuable (V49).
-- =====================================================================

ALTER TABLE audit
    ADD COLUMN referentiel_version_id uuid REFERENCES referentiel_version(id) ON DELETE RESTRICT;

-- --- Reprise des missions existantes -----------------------------------
--
-- Elles reçoivent la version courante de leur référentiel : c'est bien
-- celle dont leur questionnaire est issu, puisqu'il n'en existait qu'une.

UPDATE audit a
   SET referentiel_version_id = v.id
  FROM referentiel_version v
 WHERE v.referentiel_id = a.referentiel_id
   AND v.statut = 'PUBLIEE';

ALTER TABLE audit ALTER COLUMN referentiel_version_id SET NOT NULL;

CREATE INDEX idx_audit_referentiel_version ON audit (referentiel_version_id);

COMMENT ON COLUMN audit.referentiel_version_id IS
    'Version du référentiel auditée par cette mission. Immuable comme la version elle-même : c''est ce qui rend le résultat opposable.';

-- --- Vérification ------------------------------------------------------

DO $$
DECLARE
    sans_version integer;
    incoherentes integer;
BEGIN
    SELECT count(*) INTO sans_version FROM audit WHERE referentiel_version_id IS NULL;
    IF sans_version > 0 THEN
        RAISE EXCEPTION '% mission(s) sans version de référentiel', sans_version;
    END IF;

    -- La version rattachée doit bien être une version du référentiel de la
    -- mission : un décalage ici ferait auditer un cadre par un autre.
    SELECT count(*) INTO incoherentes
      FROM audit a JOIN referentiel_version v ON v.id = a.referentiel_version_id
     WHERE v.referentiel_id <> a.referentiel_id;
    IF incoherentes > 0 THEN
        RAISE EXCEPTION '% mission(s) rattachées à la version d''un autre référentiel', incoherentes;
    END IF;

    -- Chaque critère figé d'une mission doit appartenir à la version de
    -- cette mission. C'est la vérification qui prouve que la reprise n'a
    -- pas déplacé le questionnaire d'une mission existante.
    SELECT count(*) INTO incoherentes
      FROM audit_critere ac
      JOIN audit a ON a.id = ac.audit_id
      JOIN critere c ON c.id = ac.critere_id
     WHERE c.referentiel_version_id <> a.referentiel_version_id;
    IF incoherentes > 0 THEN
        RAISE EXCEPTION '% critère(s) de mission hors de la version rattachée à leur mission', incoherentes;
    END IF;
END $$;

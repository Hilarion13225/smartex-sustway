-- =====================================================================
-- Les nouvelles tables entrent sous le régime d'immuabilité de V49
-- =====================================================================
-- Exigences, preuves attendues et règles d'analyse sont du contenu de
-- référentiel au même titre que les critères : une fois leur version
-- publiée, elles ne bougent plus. Sans cela, on aurait versionné l'énoncé
-- d'un critère tout en laissant réécrire ce qu'il exige — la garantie
-- serait vidée de son sens.
--
-- Le déclencheur de V49 est réutilisé tel quel : il ne dépend que de la
-- colonne `referentiel_version_id`, que les trois tables portent.
-- =====================================================================

CREATE TRIGGER exigence_version_figee
    BEFORE INSERT OR UPDATE OR DELETE ON exigence
    FOR EACH ROW EXECUTE FUNCTION refuser_contenu_de_version_figee();

CREATE TRIGGER preuve_attendue_version_figee
    BEFORE INSERT OR UPDATE OR DELETE ON preuve_attendue
    FOR EACH ROW EXECUTE FUNCTION refuser_contenu_de_version_figee();

CREATE TRIGGER regle_analyse_version_figee
    BEFORE INSERT OR UPDATE OR DELETE ON regle_analyse
    FOR EACH ROW EXECUTE FUNCTION refuser_contenu_de_version_figee();

-- --- Un enfant reste dans la version de son parent ---------------------
--
-- L'immuabilité seule ne suffit pas. Rien n'empêcherait, dans un
-- brouillon, de rattacher une exigence à un critère d'une version publiée :
-- la ligne écrite appartient bien au brouillon, le déclencheur de V49
-- laisse passer, et la version publiée se retrouve pourtant enrichie d'une
-- exigence qu'elle n'avait pas. C'est le « déplacement vers une autre
-- version » sous sa forme la moins visible.

CREATE OR REPLACE FUNCTION exiger_meme_version_que_le_parent() RETURNS trigger AS $fonction$
DECLARE
    version_du_parent uuid;
BEGIN
    IF TG_TABLE_NAME = 'exigence' THEN
        SELECT c.referentiel_version_id INTO version_du_parent
          FROM critere c WHERE c.id = NEW.critere_id;
        IF version_du_parent IS DISTINCT FROM NEW.referentiel_version_id THEN
            RAISE EXCEPTION 'Une exigence doit appartenir à la version de son critère'
                USING ERRCODE = 'check_violation';
        END IF;

    ELSIF TG_TABLE_NAME = 'preuve_attendue' THEN
        SELECT e.referentiel_version_id INTO version_du_parent
          FROM exigence e WHERE e.id = NEW.exigence_id;
        IF version_du_parent IS DISTINCT FROM NEW.referentiel_version_id THEN
            RAISE EXCEPTION 'Une preuve attendue doit appartenir à la version de son exigence'
                USING ERRCODE = 'check_violation';
        END IF;

    ELSIF TG_TABLE_NAME = 'regle_analyse' THEN
        SELECT c.referentiel_version_id INTO version_du_parent
          FROM critere c WHERE c.id = NEW.critere_id;
        IF version_du_parent IS DISTINCT FROM NEW.referentiel_version_id THEN
            RAISE EXCEPTION 'Une règle d''analyse doit appartenir à la version de son critère'
                USING ERRCODE = 'check_violation';
        END IF;
    END IF;

    RETURN NEW;
END;
$fonction$ LANGUAGE plpgsql;

CREATE TRIGGER exigence_meme_version_que_le_parent
    BEFORE INSERT OR UPDATE ON exigence
    FOR EACH ROW EXECUTE FUNCTION exiger_meme_version_que_le_parent();

CREATE TRIGGER preuve_attendue_meme_version_que_le_parent
    BEFORE INSERT OR UPDATE ON preuve_attendue
    FOR EACH ROW EXECUTE FUNCTION exiger_meme_version_que_le_parent();

CREATE TRIGGER regle_analyse_meme_version_que_le_parent
    BEFORE INSERT OR UPDATE ON regle_analyse
    FOR EACH ROW EXECUTE FUNCTION exiger_meme_version_que_le_parent();

-- --- Vérification : les règles sont réellement appliquées --------------
--
-- Comme en V49, on tente les écritures interdites plutôt que de les
-- documenter. Les sous-transactions sont annulées dans tous les cas.

DO $verif$
DECLARE
    exigence_publiee uuid;
    critere_publie   uuid;
    version_brouillon uuid;
    passee boolean;
BEGIN
    SELECT e.id, e.critere_id INTO exigence_publiee, critere_publie
      FROM exigence e
      JOIN referentiel_version v ON v.id = e.referentiel_version_id
     WHERE v.statut = 'PUBLIEE'
     LIMIT 1;

    IF exigence_publiee IS NULL THEN
        RAISE NOTICE 'Aucune exigence en version publiée : vérification non applicable ici.';
        RETURN;
    END IF;

    -- 1. Modifier une exigence publiée
    passee := true;
    BEGIN
        UPDATE exigence SET enonce = enonce || ' (test)' WHERE id = exigence_publiee;
    EXCEPTION WHEN check_violation THEN
        passee := false;
    END;
    IF passee THEN
        RAISE EXCEPTION 'Une exigence d''une version publiée a pu être modifiée';
    END IF;

    -- 2. Supprimer une exigence publiée
    passee := true;
    BEGIN
        DELETE FROM exigence WHERE id = exigence_publiee;
    EXCEPTION WHEN check_violation THEN
        passee := false;
    END;
    IF passee THEN
        RAISE EXCEPTION 'Une exigence d''une version publiée a pu être supprimée';
    END IF;

    -- 3. Ajouter une exigence à un critère d'une version publiée
    passee := true;
    BEGIN
        INSERT INTO exigence (referentiel_version_id, critere_id, code, intitule, enonce)
        SELECT c.referentiel_version_id, c.id, 'TEST-V53', 'Test', 'Test'
          FROM critere c WHERE c.id = critere_publie;
    EXCEPTION WHEN check_violation THEN
        passee := false;
    END;
    IF passee THEN
        RAISE EXCEPTION 'Une exigence a pu être ajoutée à une version publiée';
    END IF;

    -- 4. Rattacher, depuis un brouillon, une exigence à un critère publié
    SELECT id INTO version_brouillon FROM referentiel_version WHERE statut = 'BROUILLON' LIMIT 1;
    IF version_brouillon IS NOT NULL THEN
        passee := true;
        BEGIN
            INSERT INTO exigence (referentiel_version_id, critere_id, code, intitule, enonce)
            VALUES (version_brouillon, critere_publie, 'TEST-V53-B', 'Test', 'Test');
        EXCEPTION WHEN check_violation THEN
            passee := false;
        END;
        IF passee THEN
            RAISE EXCEPTION 'Une exigence de brouillon a pu être rattachée à un critère publié';
        END IF;
    END IF;
END;
$verif$;

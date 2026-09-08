-- =====================================================================
-- Sauvegarde du catalogue avant sa mise sous versionnement
-- =====================================================================
-- Les migrations V46 à V49 rendent le contenu du référentiel propriété
-- d'une version, puis immuable une fois celle-ci publiée. C'est un
-- changement dont on ne revient pas par un simple UPDATE : une fois les
-- déclencheurs en place, corriger une reprise ratée demanderait de les
-- retirer d'abord.
--
-- L'état antérieur est donc copié tel quel, sans transformation, avant
-- toute écriture. Rien n'est supprimé ni modifié ici. Ces tables restent
-- en place après la migration : elles sont le point de retour, et leur
-- volume est négligeable (136 critères, 136 questions).
-- =====================================================================

CREATE TABLE domaine_archive_v45 AS SELECT * FROM domaine;
CREATE TABLE sous_domaine_archive_v45 AS SELECT * FROM sous_domaine;
CREATE TABLE critere_archive_v45 AS SELECT * FROM critere;
CREATE TABLE question_archive_v45 AS SELECT * FROM question;
CREATE TABLE referentiel_version_archive_v45 AS SELECT * FROM referentiel_version;

-- L'appartenance d'une mission à un référentiel est ce que V48 va préciser
-- en version : on garde de quoi la reconstituer si la reprise se trompe.
CREATE TABLE audit_referentiel_archive_v45 AS
SELECT id AS audit_id, referentiel_id, created_at FROM audit;

COMMENT ON TABLE domaine_archive_v45 IS
    'Copie du catalogue avant le versionnement (V46-V49). Point de retour, à ne pas supprimer sans décision explicite.';

-- --- Vérification ------------------------------------------------------
--
-- Une copie partielle serait pire que pas de copie : elle donnerait
-- l'illusion d'un retour possible. La migration échoue si un seul compte
-- diverge.

DO $$
DECLARE
    ecart text;
BEGIN
    SELECT string_agg(format('%s : %s ligne(s) en source, %s en copie', t, src, cop), ' ; ')
      INTO ecart
      FROM (
        SELECT 'domaine' AS t, (SELECT count(*) FROM domaine) AS src,
               (SELECT count(*) FROM domaine_archive_v45) AS cop
        UNION ALL SELECT 'sous_domaine', (SELECT count(*) FROM sous_domaine),
               (SELECT count(*) FROM sous_domaine_archive_v45)
        UNION ALL SELECT 'critere', (SELECT count(*) FROM critere),
               (SELECT count(*) FROM critere_archive_v45)
        UNION ALL SELECT 'question', (SELECT count(*) FROM question),
               (SELECT count(*) FROM question_archive_v45)
        UNION ALL SELECT 'referentiel_version', (SELECT count(*) FROM referentiel_version),
               (SELECT count(*) FROM referentiel_version_archive_v45)
        UNION ALL SELECT 'audit', (SELECT count(*) FROM audit),
               (SELECT count(*) FROM audit_referentiel_archive_v45)
      ) c
     WHERE src <> cop;

    IF ecart IS NOT NULL THEN
        RAISE EXCEPTION 'Sauvegarde incomplète du catalogue, migration interrompue — %', ecart;
    END IF;
END $$;

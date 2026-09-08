-- =====================================================================
-- La version devient l'unité d'édition du référentiel
-- =====================================================================
-- Jusqu'ici `referentiel_version` était un journal : on y consignait
-- qu'une version avait été publiée, avec sa volumétrie. Le contenu, lui,
-- restait dans un catalogue unique et mutable — modifier le libellé d'un
-- critère changeait rétroactivement ce qu'affichaient les missions déjà
-- clôturées, sans trace possible (la table `critere` n'a ni `updated_at`
-- ni historique).
--
-- La version cesse d'être un journal pour devenir l'objet que l'on édite :
-- on travaille sur un BROUILLON, on le publie, et il devient immuable.
-- V47 rattache le contenu à une version, V48 rattache les missions, V49
-- pose l'immuabilité. Cette migration-ci ne fait que préparer la table.
-- =====================================================================

CREATE TYPE statut_version_referentiel AS ENUM ('BROUILLON', 'PUBLIEE', 'ARCHIVEE');

ALTER TABLE referentiel_version
    ADD COLUMN statut statut_version_referentiel NOT NULL DEFAULT 'PUBLIEE',
    ADD COLUMN creee_le timestamptz NOT NULL DEFAULT now(),
    ADD COLUMN publiee_par uuid REFERENCES utilisateur(id) ON DELETE SET NULL,
    ADD COLUMN remplace_version_id uuid REFERENCES referentiel_version(id) ON DELETE SET NULL;

-- Un brouillon n'a pas de date de publication : la colonne cesse d'être
-- obligatoire. Les lignes existantes gardent la leur.
ALTER TABLE referentiel_version ALTER COLUMN publiee_le DROP NOT NULL;
ALTER TABLE referentiel_version ALTER COLUMN publiee_le DROP DEFAULT;

COMMENT ON COLUMN referentiel_version.statut IS
    'BROUILLON : éditable. PUBLIEE : immuable, sert les nouvelles missions. ARCHIVEE : immuable, ne sert plus que les missions passées.';
COMMENT ON COLUMN referentiel_version.remplace_version_id IS
    'Version dont celle-ci est issue par copie. Trace la filiation des versions correctives.';

-- Une seule version publiée à la fois par référentiel : c'est elle que
-- prend une nouvelle mission. Sans cette contrainte, le choix de la
-- version d'une mission deviendrait arbitraire.
CREATE UNIQUE INDEX referentiel_version_une_seule_publiee
    ON referentiel_version (referentiel_id)
    WHERE statut = 'PUBLIEE';

-- Un seul brouillon à la fois : deux brouillons concurrents sur le même
-- référentiel poseraient la question de savoir lequel reçoit une écriture,
-- sans qu'aucune réponse ne soit meilleure qu'une autre.
CREATE UNIQUE INDEX referentiel_version_un_seul_brouillon
    ON referentiel_version (referentiel_id)
    WHERE statut = 'BROUILLON';

-- --- Reprise : une version courante par référentiel --------------------
--
-- Deux cas coexistent selon les environnements. Là où V30 a alimenté la
-- table, la publication la plus récente devient la version courante et les
-- précédentes sont archivées. Là où elle est restée vide — le référentiel
-- ayant été (re)créé après V30 —, la version courante est reconstituée à
-- partir de `referentiel.version`.

UPDATE referentiel_version v
   SET statut = 'ARCHIVEE'
 WHERE EXISTS (
        SELECT 1 FROM referentiel_version plus_recente
         WHERE plus_recente.referentiel_id = v.referentiel_id
           AND plus_recente.publiee_le > v.publiee_le
       );

INSERT INTO referentiel_version (referentiel_id, numero, notes, nombre_domaines, nombre_criteres,
                                 statut, publiee_le, creee_le)
SELECT r.id,
       r.version,
       'Version courante reconstituée lors de la mise sous versionnement du catalogue (V46).',
       (SELECT count(*) FROM domaine d WHERE d.referentiel_id = r.id),
       (SELECT count(*) FROM critere c
          JOIN domaine d ON c.domaine_id = d.id
         WHERE d.referentiel_id = r.id AND c.actif),
       'PUBLIEE',
       r.created_at,
       r.created_at
  FROM referentiel r
 WHERE NOT EXISTS (
        SELECT 1 FROM referentiel_version v
         WHERE v.referentiel_id = r.id AND v.statut = 'PUBLIEE'
       );

-- --- Vérification ------------------------------------------------------

DO $$
DECLARE
    sans_version integer;
BEGIN
    SELECT count(*) INTO sans_version
      FROM referentiel r
     WHERE NOT EXISTS (SELECT 1 FROM referentiel_version v
                        WHERE v.referentiel_id = r.id AND v.statut = 'PUBLIEE');
    IF sans_version > 0 THEN
        RAISE EXCEPTION 'Reprise incomplète : % référentiel(s) sans version publiée', sans_version;
    END IF;
END $$;

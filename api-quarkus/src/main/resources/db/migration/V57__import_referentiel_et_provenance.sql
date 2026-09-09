-- =====================================================================
-- Import assisté d'un référentiel, et provenance du contenu métier
-- =====================================================================
-- L'import fait entrer dans le catalogue du contenu que personne n'a
-- écrit. Deux choses en découlent, et cette migration pose les deux.
--
-- D'abord savoir d'où vient chaque ligne. `exigence` portait déjà son
-- origine ; `preuve_attendue` et `regle_analyse` ne portaient rien, parce
-- qu'à leur création la question ne se posait pas — aucune n'était produite
-- autrement qu'à la main. Elle se pose maintenant.
--
-- Ensuite garantir qu'aucune proposition de l'IA n'atteigne une version
-- publiée sans qu'une personne l'ait acceptée. La règle est vérifiable en
-- une requête, donc imposable par déclencheur : c'est la seule façon qu'elle
-- tienne quel que soit le chemin emprunté, y compris un script d'exploitation
-- ou un endpoint ajouté plus tard.
-- =====================================================================

-- --- 1. Provenance du contenu métier -----------------------------------

ALTER TABLE preuve_attendue
    ADD COLUMN origine origine_contenu NOT NULL DEFAULT 'CONTENU_HUMAIN';
ALTER TABLE regle_analyse
    ADD COLUMN origine origine_contenu NOT NULL DEFAULT 'CONTENU_HUMAIN';

-- Corriger une proposition de l'IA en fait un contenu humain : c'est bien
-- une personne qui en répond désormais. Mais effacer la trace de sa
-- provenance rendrait l'import invérifiable après coup — on ne saurait plus
-- quelles lignes ont été suggérées par la machine. L'origine initiale est
-- donc conservée à côté.
ALTER TABLE exigence        ADD COLUMN origine_initiale origine_contenu;
ALTER TABLE preuve_attendue ADD COLUMN origine_initiale origine_contenu;
ALTER TABLE regle_analyse   ADD COLUMN origine_initiale origine_contenu;

COMMENT ON COLUMN exigence.origine_initiale IS
    'Origine à la création, conservée quand `origine` évolue. Nulle pour le contenu antérieur à l''import assisté.';

-- --- 2. Validation humaine ---------------------------------------------
--
-- Qui a validé, et quand. Nuls tant que personne ne l'a fait : c'est
-- précisément cette nullité qui interdit la publication d'un contenu
-- proposé par l'IA.

ALTER TABLE exigence
    ADD COLUMN validee_par uuid REFERENCES utilisateur(id) ON DELETE SET NULL,
    ADD COLUMN validee_le  timestamptz;
ALTER TABLE preuve_attendue
    ADD COLUMN validee_par uuid REFERENCES utilisateur(id) ON DELETE SET NULL,
    ADD COLUMN validee_le  timestamptz;
ALTER TABLE regle_analyse
    ADD COLUMN validee_par uuid REFERENCES utilisateur(id) ON DELETE SET NULL,
    ADD COLUMN validee_le  timestamptz;

-- Les deux champs vont ensemble : une validation sans validateur, ou un
-- validateur sans date, ne dit rien d'exploitable.
ALTER TABLE exigence ADD CONSTRAINT exigence_validation_complete
    CHECK ((validee_par IS NULL) = (validee_le IS NULL));
ALTER TABLE preuve_attendue ADD CONSTRAINT preuve_attendue_validation_complete
    CHECK ((validee_par IS NULL) = (validee_le IS NULL));
ALTER TABLE regle_analyse ADD CONSTRAINT regle_analyse_validation_complete
    CHECK ((validee_par IS NULL) = (validee_le IS NULL));

CREATE INDEX idx_exigence_a_valider ON exigence (referentiel_version_id)
    WHERE origine = 'IMPORT_IA' AND validee_par IS NULL;
CREATE INDEX idx_preuve_attendue_a_valider ON preuve_attendue (referentiel_version_id)
    WHERE origine = 'IMPORT_IA' AND validee_par IS NULL;
CREATE INDEX idx_regle_analyse_a_valider ON regle_analyse (referentiel_version_id)
    WHERE origine = 'IMPORT_IA' AND validee_par IS NULL;

-- --- 3. Suivi de l'import ----------------------------------------------
--
-- Les statuts s'arrêtent à la génération du brouillon. Ce qui suit — la
-- validation puis la publication — est le cycle de vie de la version, que
-- `referentiel_version.statut` porte déjà. Le redire ici créerait deux
-- vérités sur le même fait, dont l'une finirait par mentir.

CREATE TYPE statut_import_referentiel AS ENUM (
    'EN_ATTENTE',        -- fichier reçu et contrôlé, extraction non lancée
    'ANALYSE_EN_COURS',  -- extraction confiée au service d'agents
    'BROUILLON_GENERE',  -- contenu proposé, déposé dans une version brouillon
    'ECHEC'              -- extraction impossible ; le fichier source reste conservé
);

CREATE TABLE import_referentiel (
    id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    referentiel_id         uuid REFERENCES referentiel(id) ON DELETE SET NULL,
    referentiel_version_id uuid REFERENCES referentiel_version(id) ON DELETE SET NULL,
    nom_fichier            varchar(500) NOT NULL,
    type_mime              varchar(150) NOT NULL,
    taille                 bigint NOT NULL,
    hash_fichier           varchar(128) NOT NULL,
    cle_stockage           text NOT NULL,
    statut_scan            statut_scan_document NOT NULL DEFAULT 'EN_ATTENTE',
    statut                 statut_import_referentiel NOT NULL DEFAULT 'EN_ATTENTE',
    importe_par            uuid REFERENCES utilisateur(id) ON DELETE SET NULL,
    importe_le             timestamptz NOT NULL DEFAULT now(),
    analyse_debut          timestamptz,
    analyse_fin            timestamptz,
    erreur                 text,
    metadonnees            jsonb NOT NULL DEFAULT '{}'::jsonb,
    CONSTRAINT import_referentiel_metadonnees_objet
        CHECK (jsonb_typeof(metadonnees) = 'object'),
    -- Un échec doit dire pourquoi : un statut ECHEC sans message laisserait
    -- l'administrateur devant un import mort sans rien à corriger.
    CONSTRAINT import_referentiel_echec_motive
        CHECK (statut <> 'ECHEC' OR erreur IS NOT NULL)
);

CREATE INDEX idx_import_referentiel_statut ON import_referentiel (statut, importe_le DESC);
CREATE INDEX idx_import_referentiel_version ON import_referentiel (referentiel_version_id);

COMMENT ON TABLE import_referentiel IS
    'Suivi d''un import de référentiel. Le fichier source est conservé dans le stockage objet, y compris en cas d''échec : c''est une pièce de traçabilité.';
COMMENT ON COLUMN import_referentiel.cle_stockage IS
    'Emplacement du fichier original dans le stockage objet. Le binaire n''est jamais mis en base.';

-- --- 4. Aucune publication sans validation humaine ----------------------
--
-- L'IA propose, elle ne publie pas. Ce déclencheur en fait une propriété de
-- la base plutôt qu'une intention du service : publier une version qui porte
-- encore du contenu proposé et non accepté est refusé, quel que soit le
-- chemin par lequel la publication est demandée.

CREATE OR REPLACE FUNCTION refuser_publication_sans_validation() RETURNS trigger AS $fonction$
DECLARE
    en_attente integer;
BEGIN
    IF NEW.statut <> 'PUBLIEE' OR OLD.statut = 'PUBLIEE' THEN
        RETURN NEW;
    END IF;

    SELECT count(*) INTO en_attente FROM (
        SELECT 1 FROM exigence
         WHERE referentiel_version_id = NEW.id
           AND origine = 'IMPORT_IA' AND validee_par IS NULL
        UNION ALL
        SELECT 1 FROM preuve_attendue
         WHERE referentiel_version_id = NEW.id
           AND origine = 'IMPORT_IA' AND validee_par IS NULL
        UNION ALL
        SELECT 1 FROM regle_analyse
         WHERE referentiel_version_id = NEW.id
           AND origine = 'IMPORT_IA' AND validee_par IS NULL
    ) x;

    IF en_attente > 0 THEN
        RAISE EXCEPTION 'Publication refusée : % élément(s) proposé(s) par l''IA n''ont pas été validés',
            en_attente
            USING ERRCODE = 'check_violation',
                  HINT = 'Chaque élément importé doit être accepté ou retiré avant publication.';
    END IF;

    RETURN NEW;
END;
$fonction$ LANGUAGE plpgsql;

-- Se déclenche avant celui de V49 par l'ordre alphabétique des noms, ce qui
-- n'a pas d'importance : les deux refusent, et refuser deux fois vaut refuser.
CREATE TRIGGER referentiel_version_publication_validee
    BEFORE UPDATE ON referentiel_version
    FOR EACH ROW EXECUTE FUNCTION refuser_publication_sans_validation();

-- --- 5. Vérification ---------------------------------------------------
--
-- Comme en V49 et V53, on éprouve la règle plutôt que de la documenter : la
-- sous-transaction est annulée dans tous les cas.

DO $verif$
DECLARE
    ref_id      uuid;
    brouillon   uuid;
    domaine_id  uuid;
    critere_id  uuid;
    exigence_ia uuid;
    passee      boolean;
BEGIN
    -- Décor monté pour l'occasion plutôt que emprunté à l'existant : la
    -- base peut ne porter aucun brouillon au moment où cette migration
    -- passe, et une vérification qui ne s'exécute pas ne vérifie rien.
    INSERT INTO referentiel (code, nom, type)
    VALUES ('_VERIF_V57', 'Référentiel de vérification V57', 'SMARTEX')
    RETURNING id INTO ref_id;

    INSERT INTO referentiel_version (referentiel_id, numero, statut, notes)
    VALUES (ref_id, '0.1', 'BROUILLON', 'Décor de vérification de la migration V57.')
    RETURNING id INTO brouillon;

    INSERT INTO domaine (referentiel_id, referentiel_version_id, code, nom)
    VALUES (ref_id, brouillon, 'D0', 'Domaine de vérification')
    RETURNING id INTO domaine_id;

    INSERT INTO critere (domaine_id, referentiel_version_id, code, libelle)
    VALUES (domaine_id, brouillon, 'D0-01', 'Critère de vérification')
    RETURNING id INTO critere_id;

    INSERT INTO exigence (critere_id, referentiel_version_id, code, intitule, enonce, origine)
    VALUES (critere_id, brouillon, 'D0-01-E1', 'Proposition', 'Proposition non validée', 'IMPORT_IA')
    RETURNING id INTO exigence_ia;

    -- 1. Publication refusée tant que la proposition n'est pas acceptée.
    passee := true;
    BEGIN
        UPDATE referentiel_version SET statut = 'PUBLIEE' WHERE id = brouillon;
    EXCEPTION WHEN check_violation THEN
        passee := false;
    END;
    IF passee THEN
        RAISE EXCEPTION 'Une version portant du contenu IA non validé a pu être publiée';
    END IF;

    -- 2. Une fois la proposition acceptée, la publication passe. Sans ce
    --    second essai, la règle pourrait tout refuser sans qu'on le voie.
    UPDATE exigence SET validee_par = NULL, validee_le = NULL WHERE id = exigence_ia;
    UPDATE exigence SET origine = 'CONTENU_HUMAIN' WHERE id = exigence_ia;
    UPDATE referentiel_version SET statut = 'PUBLIEE' WHERE id = brouillon;

    -- Décor retiré. La version vient d'être publiée, donc immuable : on la
    -- ramène d'abord à l'état de brouillon en contournant volontairement le
    -- déclencheur, faute de quoi le décor resterait en base.
    ALTER TABLE referentiel_version DISABLE TRIGGER referentiel_version_figee;
    UPDATE referentiel_version SET statut = 'BROUILLON' WHERE id = brouillon;
    ALTER TABLE referentiel_version ENABLE TRIGGER referentiel_version_figee;

    DELETE FROM exigence WHERE referentiel_version_id = brouillon;
    DELETE FROM critere WHERE referentiel_version_id = brouillon;
    DELETE FROM domaine WHERE referentiel_version_id = brouillon;
    DELETE FROM referentiel_version WHERE id = brouillon;
    DELETE FROM referentiel WHERE id = ref_id;

    RAISE NOTICE 'Règle de publication vérifiée : refusée sans validation, acceptée après.';
END;
$verif$;

-- =====================================================================
-- Rejet d'une proposition, et traçabilité de sa source
-- =====================================================================
-- V57 a posé la moitié du geste : accepter une proposition de l'IA. Il
-- manquait l'autre, écarter celle qu'on ne retient pas.
--
-- Sans elle, un relecteur n'avait que deux issues : valider ce qu'il
-- désapprouve, ou supprimer la ligne — et perdre la trace qu'une machine
-- l'avait proposée. La barrière de publication de V57 rendait d'ailleurs la
-- seconde issue obligatoire : une proposition ni validée ni supprimée
-- bloquait la version indéfiniment.
--
-- Le rejet est donc modélisé en miroir exact de la validation : un acteur,
-- une date, et cette fois un motif facultatif. Aucun statut nouveau n'est
-- introduit — `origine` dit d'où vient le contenu, ces colonnes disent ce
-- qu'une personne en a décidé, et les deux restent lisibles séparément.
-- `origine_initiale` ne bouge dans aucun des deux cas.
--
-- Cette migration ajoute par ailleurs ce que le service d'agents mesurait
-- déjà sans que rien ne le conserve : le passage du document dont chaque
-- proposition est tirée, sa localisation, et l'appréciation du modèle sur sa
-- propre extraction. Un relecteur qui ne peut pas remonter à la source
-- valide sur parole.
-- =====================================================================

-- --- 1. Rejet ----------------------------------------------------------

ALTER TABLE exigence
    ADD COLUMN rejetee_par uuid REFERENCES utilisateur(id) ON DELETE SET NULL,
    ADD COLUMN rejetee_le  timestamptz,
    ADD COLUMN motif_rejet text;
ALTER TABLE preuve_attendue
    ADD COLUMN rejetee_par uuid REFERENCES utilisateur(id) ON DELETE SET NULL,
    ADD COLUMN rejetee_le  timestamptz,
    ADD COLUMN motif_rejet text;
ALTER TABLE regle_analyse
    ADD COLUMN rejetee_par uuid REFERENCES utilisateur(id) ON DELETE SET NULL,
    ADD COLUMN rejetee_le  timestamptz,
    ADD COLUMN motif_rejet text;

COMMENT ON COLUMN exigence.rejetee_par IS
    'Qui a écarté cette proposition. Nul si elle est en attente ou retenue. La ligne subsiste : supprimer effacerait la trace qu''une machine l''avait proposée.';
COMMENT ON COLUMN exigence.motif_rejet IS
    'Facultatif. Exiger une justification serait une décision métier que rien n''a tranchée ; l''absence de motif ne doit pas empêcher d''écarter une proposition manifestement hors sujet.';

-- Les deux champs vont ensemble, comme pour la validation : un rejet sans
-- date, ou une date sans auteur, ne dit rien d'exploitable.
ALTER TABLE exigence ADD CONSTRAINT exigence_rejet_complet
    CHECK ((rejetee_par IS NULL) = (rejetee_le IS NULL));
ALTER TABLE preuve_attendue ADD CONSTRAINT preuve_attendue_rejet_complet
    CHECK ((rejetee_par IS NULL) = (rejetee_le IS NULL));
ALTER TABLE regle_analyse ADD CONSTRAINT regle_analyse_rejet_complet
    CHECK ((rejetee_par IS NULL) = (rejetee_le IS NULL));

-- Une proposition est retenue ou écartée, jamais les deux. Sans cette
-- contrainte, un élément portant les deux marques serait ingérable : compté
-- comme validé par un écran, comme rejeté par un autre.
ALTER TABLE exigence ADD CONSTRAINT exigence_decision_unique
    CHECK (validee_par IS NULL OR rejetee_par IS NULL);
ALTER TABLE preuve_attendue ADD CONSTRAINT preuve_attendue_decision_unique
    CHECK (validee_par IS NULL OR rejetee_par IS NULL);
ALTER TABLE regle_analyse ADD CONSTRAINT regle_analyse_decision_unique
    CHECK (validee_par IS NULL OR rejetee_par IS NULL);

-- Un motif sans rejet n'a pas de sens : il laisserait croire à une décision
-- qui n'a pas été prise.
ALTER TABLE exigence ADD CONSTRAINT exigence_motif_suppose_rejet
    CHECK (motif_rejet IS NULL OR rejetee_par IS NOT NULL);
ALTER TABLE preuve_attendue ADD CONSTRAINT preuve_attendue_motif_suppose_rejet
    CHECK (motif_rejet IS NULL OR rejetee_par IS NOT NULL);
ALTER TABLE regle_analyse ADD CONSTRAINT regle_analyse_motif_suppose_rejet
    CHECK (motif_rejet IS NULL OR rejetee_par IS NOT NULL);

-- --- 2. Traçabilité de la source ---------------------------------------
--
-- Renseignés seulement quand le service d'agents les a réellement mesurés.
-- Une localisation approximative serait pire qu'absente : elle enverrait le
-- relecteur au mauvais endroit avec confiance. D'où des colonnes nulles
-- plutôt que des valeurs par défaut.

ALTER TABLE exigence
    ADD COLUMN texte_source  text,
    ADD COLUMN localisation  jsonb,
    ADD COLUMN confiance     numeric(4, 3);
ALTER TABLE preuve_attendue
    ADD COLUMN texte_source  text,
    ADD COLUMN localisation  jsonb,
    ADD COLUMN confiance     numeric(4, 3);
ALTER TABLE regle_analyse
    ADD COLUMN texte_source  text,
    ADD COLUMN localisation  jsonb,
    ADD COLUMN confiance     numeric(4, 3);

ALTER TABLE exigence ADD CONSTRAINT exigence_confiance_bornee
    CHECK (confiance IS NULL OR (confiance >= 0 AND confiance <= 1));
ALTER TABLE preuve_attendue ADD CONSTRAINT preuve_attendue_confiance_bornee
    CHECK (confiance IS NULL OR (confiance >= 0 AND confiance <= 1));
ALTER TABLE regle_analyse ADD CONSTRAINT regle_analyse_confiance_bornee
    CHECK (confiance IS NULL OR (confiance >= 0 AND confiance <= 1));

COMMENT ON COLUMN exigence.confiance IS
    'Appréciation du modèle sur sa propre extraction, entre 0 et 1. Informative : elle ne vaut jamais validation. Nulle quand le modèle n''en a fourni aucune — une absence ne devient jamais 0.';
COMMENT ON COLUMN exigence.localisation IS
    'Où le passage a été lu : page, feuille et ligne, paragraphe ou chemin, selon le format. Nulle quand la source ne permet pas de le mesurer.';

-- --- 3. Publication ----------------------------------------------------
--
-- La règle change sur un point, et un seul : une proposition écartée ne
-- bloque plus. Elle a été traitée, c'est tout ce que la barrière exige.
-- Ce qui bloque reste ce qui n'a pas été regardé.
--
-- La garantie demeure au niveau de la base, et non dans le code applicatif :
-- c'est la seule façon qu'elle tienne quel que soit le chemin emprunté, y
-- compris un script d'exploitation ou un endpoint ajouté plus tard.

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
           AND origine = 'IMPORT_IA'
           AND validee_par IS NULL AND rejetee_par IS NULL
        UNION ALL
        SELECT 1 FROM preuve_attendue
         WHERE referentiel_version_id = NEW.id
           AND origine = 'IMPORT_IA'
           AND validee_par IS NULL AND rejetee_par IS NULL
        UNION ALL
        SELECT 1 FROM regle_analyse
         WHERE referentiel_version_id = NEW.id
           AND origine = 'IMPORT_IA'
           AND validee_par IS NULL AND rejetee_par IS NULL
    ) x;

    IF en_attente > 0 THEN
        RAISE EXCEPTION 'Publication refusée : % élément(s) proposé(s) par l''IA n''ont pas été validés',
            en_attente
            USING ERRCODE = 'check_violation',
                  HINT = 'Chaque élément importé doit être accepté ou écarté avant publication.';
    END IF;

    RETURN NEW;
END;
$fonction$ LANGUAGE plpgsql;

-- Les index partiels de V57 portaient sur « proposé et non validé ». Le
-- prédicat a changé ; les remplacer évite qu'ils cessent de servir la
-- requête qu'ils étaient censés servir.
DROP INDEX IF EXISTS idx_exigence_a_valider;
DROP INDEX IF EXISTS idx_preuve_attendue_a_valider;
DROP INDEX IF EXISTS idx_regle_analyse_a_valider;

CREATE INDEX idx_exigence_a_traiter ON exigence (referentiel_version_id)
    WHERE origine = 'IMPORT_IA' AND validee_par IS NULL AND rejetee_par IS NULL;
CREATE INDEX idx_preuve_attendue_a_traiter ON preuve_attendue (referentiel_version_id)
    WHERE origine = 'IMPORT_IA' AND validee_par IS NULL AND rejetee_par IS NULL;
CREATE INDEX idx_regle_analyse_a_traiter ON regle_analyse (referentiel_version_id)
    WHERE origine = 'IMPORT_IA' AND validee_par IS NULL AND rejetee_par IS NULL;

-- --- 4. Vérification ---------------------------------------------------
--
-- Comme en V49, V53 et V57, la règle est éprouvée plutôt que documentée. Les
-- sept combinaisons de l'énoncé sont jouées.
--
-- Chaque tentative de publication est annulée, y compris quand elle réussit :
-- une exception est levée juste après l'UPDATE pour défaire la
-- sous-transaction. Sans cela, la version resterait publiée, et le décor
-- deviendrait indestructible — une version publiée ne peut plus revenir au
-- brouillon, et son contenu ne peut plus être supprimé.

DO $verif$
DECLARE
    ref_id     uuid;
    brouillon  uuid;
    domaine_id uuid;
    critere_id uuid;
    relecteur  uuid;
    e1         uuid;
    e2         uuid;
    e3         uuid;
    cas        record;
    passee     boolean;
BEGIN
    -- Un relecteur est indispensable : les contraintes exigent qu'un
    -- validateur accompagne toute date de validation. Sur une installation
    -- neuve la table est vide, d'où un compte monté pour l'occasion, retiré
    -- à la fin comme le reste du décor.
    INSERT INTO utilisateur (nom, prenom, email, mot_de_passe_hash, statut)
    VALUES ('Vérification', 'V58', '_verif_v58@smartex.invalid', 'x', 'DESACTIVE')
    RETURNING id INTO relecteur;

    INSERT INTO referentiel (code, nom, type)
    VALUES ('_VERIF_V58', 'Référentiel de vérification V58', 'SMARTEX')
    RETURNING id INTO ref_id;

    INSERT INTO referentiel_version (referentiel_id, numero, statut, notes)
    VALUES (ref_id, '0.1', 'BROUILLON', 'Décor de vérification de la migration V58.')
    RETURNING id INTO brouillon;

    INSERT INTO domaine (referentiel_id, referentiel_version_id, code, nom)
    VALUES (ref_id, brouillon, 'D0', 'Domaine de vérification')
    RETURNING id INTO domaine_id;

    INSERT INTO critere (domaine_id, referentiel_version_id, code, libelle)
    VALUES (domaine_id, brouillon, 'D0-01', 'Critère de vérification')
    RETURNING id INTO critere_id;

    FOR cas IN
        SELECT * FROM (VALUES
            (0, 0, 'aucune traitée',                          false),
            (1, 0, 'une validée, deux en attente',            false),
            (0, 1, 'une rejetée, deux en attente',            false),
            (1, 1, 'une validée, une rejetée, une en attente', false),
            (3, 0, 'trois validées',                          true),
            (2, 1, 'deux validées, une rejetée',              true),
            (0, 3, 'trois rejetées',                          true)
        ) AS t(validees, rejetees, libelle, doit_passer)
    LOOP
        DELETE FROM exigence WHERE referentiel_version_id = brouillon;

        INSERT INTO exigence (critere_id, referentiel_version_id, code, intitule, enonce,
                              origine, origine_initiale)
        VALUES (critere_id, brouillon, 'D0-01-E1', 'P1', 'Proposition 1', 'IMPORT_IA', 'IMPORT_IA')
        RETURNING id INTO e1;
        INSERT INTO exigence (critere_id, referentiel_version_id, code, intitule, enonce,
                              origine, origine_initiale)
        VALUES (critere_id, brouillon, 'D0-01-E2', 'P2', 'Proposition 2', 'IMPORT_IA', 'IMPORT_IA')
        RETURNING id INTO e2;
        INSERT INTO exigence (critere_id, referentiel_version_id, code, intitule, enonce,
                              origine, origine_initiale)
        VALUES (critere_id, brouillon, 'D0-01-E3', 'P3', 'Proposition 3', 'IMPORT_IA', 'IMPORT_IA')
        RETURNING id INTO e3;

        -- Valider fait passer l'origine à CONTENU_HUMAIN, comme le service
        -- applicatif : la vérification éprouve l'état réel, pas un état de
        -- laboratoire. Rejeter la laisse à IMPORT_IA — la proposition n'a pas
        -- été reprise, personne n'en répond.
        IF cas.validees >= 1 THEN
            UPDATE exigence SET origine = 'CONTENU_HUMAIN', validee_par = relecteur,
                   validee_le = now() WHERE id = e1;
        END IF;
        IF cas.validees >= 2 THEN
            UPDATE exigence SET origine = 'CONTENU_HUMAIN', validee_par = relecteur,
                   validee_le = now() WHERE id = e2;
        END IF;
        IF cas.validees >= 3 THEN
            UPDATE exigence SET origine = 'CONTENU_HUMAIN', validee_par = relecteur,
                   validee_le = now() WHERE id = e3;
        END IF;

        IF cas.rejetees >= 1 THEN
            UPDATE exigence SET rejetee_par = relecteur, rejetee_le = now()
             WHERE id = CASE WHEN cas.validees >= 1 THEN e3 ELSE e1 END;
        END IF;
        IF cas.rejetees >= 2 THEN
            UPDATE exigence SET rejetee_par = relecteur, rejetee_le = now() WHERE id = e2;
        END IF;
        IF cas.rejetees >= 3 THEN
            UPDATE exigence SET rejetee_par = relecteur, rejetee_le = now() WHERE id = e3;
        END IF;

        BEGIN
            UPDATE referentiel_version SET statut = 'PUBLIEE' WHERE id = brouillon;
            -- La publication est passée. On la défait aussitôt : seul le
            -- verdict nous intéresse, pas son effet.
            RAISE EXCEPTION 'publication acceptée' USING ERRCODE = 'restrict_violation';
        EXCEPTION
            WHEN restrict_violation THEN passee := true;
            WHEN check_violation THEN passee := false;
        END;

        IF passee <> cas.doit_passer THEN
            RAISE EXCEPTION 'V58 — cas « % » : publication %, attendu %',
                cas.libelle,
                CASE WHEN passee THEN 'acceptée' ELSE 'refusée' END,
                CASE WHEN cas.doit_passer THEN 'acceptée' ELSE 'refusée' END;
        END IF;
    END LOOP;

    -- Une proposition ne peut pas être retenue et écartée à la fois.
    BEGIN
        UPDATE exigence SET validee_par = relecteur, validee_le = now(),
               rejetee_par = relecteur, rejetee_le = now()
         WHERE id = e1;
        RAISE EXCEPTION 'V58 — une proposition à la fois validée et rejetée a été acceptée';
    EXCEPTION WHEN check_violation THEN
        NULL;
    END;

    -- Un motif sans rejet est refusé : il laisserait croire à une décision
    -- qui n'a pas été prise. Éprouvé sur une proposition vierge — celles du
    -- dernier scénario sont toutes rejetées, un motif y serait légitime.
    INSERT INTO exigence (critere_id, referentiel_version_id, code, intitule, enonce,
                          origine, origine_initiale)
    VALUES (critere_id, brouillon, 'D0-01-E4', 'P4', 'Proposition intacte', 'IMPORT_IA', 'IMPORT_IA')
    RETURNING id INTO e2;

    BEGIN
        UPDATE exigence SET motif_rejet = 'Hors sujet' WHERE id = e2;
        RAISE EXCEPTION 'V58 — un motif sans rejet a été accepté';
    EXCEPTION WHEN check_violation THEN
        NULL;
    END;

    -- Une confiance hors bornes est refusée : elle n'aurait aucun sens à
    -- l'écran, et « 1,4 » se lirait comme une certitude renforcée.
    BEGIN
        UPDATE exigence SET confiance = 1.4 WHERE id = e2;
        RAISE EXCEPTION 'V58 — une confiance hors de [0, 1] a été acceptée';
    EXCEPTION WHEN check_violation THEN
        NULL;
    END;

    -- Décor retiré, du plus profond au plus large — comme en V57. La
    -- suppression en cascade ne convient pas : elle retire la version avant
    -- son contenu, et le déclencheur d'immuabilité, ne retrouvant plus de
    -- statut, refuse alors de laisser partir les critères.
    DELETE FROM exigence WHERE referentiel_version_id = brouillon;
    DELETE FROM critere WHERE referentiel_version_id = brouillon;
    DELETE FROM domaine WHERE referentiel_version_id = brouillon;
    DELETE FROM referentiel_version WHERE id = brouillon;
    DELETE FROM referentiel WHERE id = ref_id;
    DELETE FROM utilisateur WHERE id = relecteur;

    RAISE NOTICE 'V58 — sept combinaisons de publication vérifiées, rejet compris.';
END;
$verif$;

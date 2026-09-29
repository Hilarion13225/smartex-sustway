-- =====================================================================
-- Provenance et validation du critère
-- =====================================================================
-- V50 a posé `origine` sur `exigence`, V57 l'a étendue à `preuve_attendue`
-- et `regle_analyse`. Trois tables : celles qui n'existaient que pour porter
-- du contenu métier importable.
--
-- `critere` date de V1. C'est une table de structure, et la fonction d'import
-- a été bâtie par-dessus sans revenir sur son modèle de provenance. Or elle
-- porte du contenu proposé : `BrouillonImporteService.deposerCritere` y écrit
-- déjà le libellé, la description, l'applicabilité, le coefficient de
-- pondération et la criticité tels que le service d'agents les rend — sans
-- rien qui dise d'où ils viennent.
--
-- La barrière de publication ne les voit donc pas. Une version portant des
-- descriptions que personne n'a relues est publiable dès lors que ses
-- exigences, preuves et règles ont été traitées. C'est exactement ce que V57
-- écarte pour les trois autres tables.
--
-- Cette migration applique à `critere` le motif déjà écrit trois fois, sans
-- table nouvelle ni type nouveau, et ajoute la quatrième branche à la
-- barrière.
--
-- L'unité validée est la LIGNE, non le champ. Accepter un critère accepte du
-- même geste son libellé, sa description, son applicabilité, son coefficient
-- et sa criticité : ces valeurs viennent de la même proposition, et les
-- séparer supposerait cinq décisions là où le relecteur n'en prend qu'une.
-- =====================================================================

-- --- 1. Provenance ------------------------------------------------------
--
-- Le défaut vaut reprise de l'historique : les 424 critères déjà en base
-- deviennent CONTENU_HUMAIN, et la barrière — qui ne regarde que IMPORT_IA —
-- ne les rencontrera jamais. Aucun UPDATE, aucune donnée métier touchée.

ALTER TABLE critere
    ADD COLUMN origine origine_contenu NOT NULL DEFAULT 'CONTENU_HUMAIN';

-- Corriger une proposition de l'IA en fait un contenu humain : c'est bien
-- une personne qui en répond désormais. Mais effacer la trace de sa
-- provenance rendrait l'import invérifiable après coup.
ALTER TABLE critere
    ADD COLUMN origine_initiale origine_contenu;

COMMENT ON COLUMN critere.origine IS
    'Provenance de la ligne — libellé, description, applicabilité, coefficient et criticité ensemble. Le défaut CONTENU_HUMAIN vaut pour tout le contenu antérieur à l''import assisté.';
COMMENT ON COLUMN critere.origine_initiale IS
    'Origine à la création, conservée quand `origine` évolue. Nulle pour le contenu antérieur à l''import assisté.';

-- --- 2. Décision humaine ------------------------------------------------
--
-- Validation et rejet en miroir, comme en V57 et V58. Nuls tant que personne
-- n'a tranché, et c'est cette nullité qui interdit la publication.

ALTER TABLE critere
    ADD COLUMN validee_par uuid REFERENCES utilisateur(id) ON DELETE SET NULL,
    ADD COLUMN validee_le  timestamptz,
    ADD COLUMN rejetee_par uuid REFERENCES utilisateur(id) ON DELETE SET NULL,
    ADD COLUMN rejetee_le  timestamptz,
    ADD COLUMN motif_rejet text;

COMMENT ON COLUMN critere.validee_par IS
    'Qui a accepté cette ligne. Nul tant que personne ne l''a fait : c''est cette nullité qui interdit la publication d''une version contenant des propositions non relues.';
COMMENT ON COLUMN critere.rejetee_par IS
    'Qui a écarté cette proposition. La ligne subsiste : supprimer un critère emporterait ses exigences, ses preuves et ses règles.';
COMMENT ON COLUMN critere.motif_rejet IS
    'Facultatif, comme en V58 : une proposition manifestement hors sujet doit pouvoir être écartée sans dissertation.';

-- Les deux champs vont ensemble : une validation sans validateur, ou un
-- validateur sans date, ne dit rien d'exploitable.
ALTER TABLE critere ADD CONSTRAINT critere_validation_complete
    CHECK ((validee_par IS NULL) = (validee_le IS NULL));
ALTER TABLE critere ADD CONSTRAINT critere_rejet_complet
    CHECK ((rejetee_par IS NULL) = (rejetee_le IS NULL));

-- Une proposition est retenue ou écartée, jamais les deux.
ALTER TABLE critere ADD CONSTRAINT critere_decision_unique
    CHECK (validee_par IS NULL OR rejetee_par IS NULL);

-- Un motif sans rejet laisserait croire à une décision qui n'a pas été prise.
ALTER TABLE critere ADD CONSTRAINT critere_motif_rejet_motive
    CHECK (motif_rejet IS NULL OR rejetee_par IS NOT NULL);

-- Même prédicat que la branche ajoutée à la barrière, et que les index
-- `*_a_traiter` de V58 : ce qui reste à regarder.
CREATE INDEX idx_critere_a_traiter ON critere (referentiel_version_id)
    WHERE origine = 'IMPORT_IA' AND validee_par IS NULL AND rejetee_par IS NULL;

-- --- 3. Publication -----------------------------------------------------
--
-- Une seule chose change : `critere` rejoint les trois tables inspectées. Le
-- prédicat de V58 est repris mot pour mot — une proposition écartée ne bloque
-- pas, elle a été traitée.
--
-- La garantie demeure au niveau de la base, et non dans le code applicatif :
-- c'est la seule façon qu'elle tienne quel que soit le chemin emprunté.

CREATE OR REPLACE FUNCTION refuser_publication_sans_validation() RETURNS trigger AS $fonction$
DECLARE
    en_attente integer;
BEGIN
    IF NEW.statut <> 'PUBLIEE' OR OLD.statut = 'PUBLIEE' THEN
        RETURN NEW;
    END IF;

    SELECT count(*) INTO en_attente FROM (
        SELECT 1 FROM critere
         WHERE referentiel_version_id = NEW.id
           AND origine = 'IMPORT_IA'
           AND validee_par IS NULL AND rejetee_par IS NULL
        UNION ALL
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

-- --- 4. Vérification ----------------------------------------------------
--
-- Comme en V49, V53, V57 et V58, la règle est éprouvée plutôt que
-- documentée. Chaque tentative de publication est annulée, y compris quand
-- elle réussit : une exception est levée juste après l'UPDATE pour défaire la
-- sous-transaction. Sans cela, la version resterait publiée, et le décor
-- deviendrait indestructible.

DO $verif$
DECLARE
    ref_id     uuid;
    brouillon  uuid;
    domaine_id uuid;
    relecteur  uuid;
    humain     uuid;
    c1         uuid;
    c2         uuid;
    cas        record;
    passee     boolean;
BEGIN
    INSERT INTO utilisateur (nom, prenom, email, mot_de_passe_hash, statut)
    VALUES ('Vérification', 'V75', '_verif_v75@smartex.invalid', 'x', 'DESACTIVE')
    RETURNING id INTO relecteur;

    INSERT INTO referentiel (code, nom, type)
    VALUES ('_VERIF_V75', 'Référentiel de vérification V75', 'SMARTEX')
    RETURNING id INTO ref_id;

    INSERT INTO referentiel_version (referentiel_id, numero, statut, notes)
    VALUES (ref_id, '0.1', 'BROUILLON', 'Décor de vérification de la migration V75.')
    RETURNING id INTO brouillon;

    INSERT INTO domaine (referentiel_id, referentiel_version_id, code, nom)
    VALUES (ref_id, brouillon, 'D0', 'Domaine de vérification')
    RETURNING id INTO domaine_id;

    -- Un critère de contenu humain, présent dans tous les scénarios : il ne
    -- doit jamais peser sur le verdict.
    INSERT INTO critere (domaine_id, referentiel_version_id, code, libelle, origine)
    VALUES (domaine_id, brouillon, 'D0-99', 'Critère humain', 'CONTENU_HUMAIN')
    RETURNING id INTO humain;

    FOR cas IN
        SELECT * FROM (VALUES
            (0, 0, 'deux propositions en attente',        false),
            (1, 0, 'une validée, une en attente',         false),
            (0, 1, 'une rejetée, une en attente',         false),
            (2, 0, 'deux validées',                       true),
            (1, 1, 'une validée, une rejetée',            true),
            (0, 2, 'deux rejetées',                       true)
        ) AS t(validees, rejetees, libelle, doit_passer)
    LOOP
        DELETE FROM critere
         WHERE referentiel_version_id = brouillon AND id <> humain;

        INSERT INTO critere (domaine_id, referentiel_version_id, code, libelle,
                             origine, origine_initiale)
        VALUES (domaine_id, brouillon, 'D0-01', 'Proposition 1', 'IMPORT_IA', 'IMPORT_IA')
        RETURNING id INTO c1;
        INSERT INTO critere (domaine_id, referentiel_version_id, code, libelle,
                             origine, origine_initiale)
        VALUES (domaine_id, brouillon, 'D0-02', 'Proposition 2', 'IMPORT_IA', 'IMPORT_IA')
        RETURNING id INTO c2;

        -- Valider fait passer l'origine à CONTENU_HUMAIN, comme le service
        -- applicatif. Rejeter la laisse à IMPORT_IA — la proposition n'a pas
        -- été reprise, personne n'en répond.
        IF cas.validees >= 1 THEN
            UPDATE critere SET origine = 'CONTENU_HUMAIN', validee_par = relecteur,
                   validee_le = now() WHERE id = c1;
        END IF;
        IF cas.validees >= 2 THEN
            UPDATE critere SET origine = 'CONTENU_HUMAIN', validee_par = relecteur,
                   validee_le = now() WHERE id = c2;
        END IF;

        IF cas.rejetees >= 1 THEN
            UPDATE critere SET rejetee_par = relecteur, rejetee_le = now()
             WHERE id = CASE WHEN cas.validees >= 1 THEN c2 ELSE c1 END;
        END IF;
        IF cas.rejetees >= 2 THEN
            UPDATE critere SET rejetee_par = relecteur, rejetee_le = now() WHERE id = c2;
        END IF;

        BEGIN
            UPDATE referentiel_version SET statut = 'PUBLIEE' WHERE id = brouillon;
            RAISE EXCEPTION 'publication acceptée' USING ERRCODE = 'restrict_violation';
        EXCEPTION
            WHEN restrict_violation THEN passee := true;
            WHEN check_violation THEN passee := false;
        END;

        IF passee <> cas.doit_passer THEN
            RAISE EXCEPTION 'V75 — cas « % » : publication %, attendu %',
                cas.libelle,
                CASE WHEN passee THEN 'acceptée' ELSE 'refusée' END,
                CASE WHEN cas.doit_passer THEN 'acceptée' ELSE 'refusée' END;
        END IF;
    END LOOP;

    -- Un critère de contenu humain seul ne bloque jamais : c'est la garantie
    -- que les 424 critères déjà en base ne deviennent pas impubliables.
    DELETE FROM critere WHERE referentiel_version_id = brouillon AND id <> humain;
    BEGIN
        UPDATE referentiel_version SET statut = 'PUBLIEE' WHERE id = brouillon;
        RAISE EXCEPTION 'publication acceptée' USING ERRCODE = 'restrict_violation';
    EXCEPTION
        WHEN restrict_violation THEN passee := true;
        WHEN check_violation THEN passee := false;
    END;
    IF NOT passee THEN
        RAISE EXCEPTION 'V75 — un critère CONTENU_HUMAIN a bloqué la publication';
    END IF;

    -- Une proposition ne peut pas être retenue et écartée à la fois.
    BEGIN
        UPDATE critere SET validee_par = relecteur, validee_le = now(),
               rejetee_par = relecteur, rejetee_le = now()
         WHERE id = humain;
        RAISE EXCEPTION 'V75 — un critère à la fois validé et rejeté a été accepté';
    EXCEPTION WHEN check_violation THEN
        NULL;
    END;

    -- Une validation sans date est refusée.
    BEGIN
        UPDATE critere SET validee_par = relecteur WHERE id = humain;
        RAISE EXCEPTION 'V75 — une validation sans date a été acceptée';
    EXCEPTION WHEN check_violation THEN
        NULL;
    END;

    -- Un motif sans rejet laisserait croire à une décision qui n'a pas été prise.
    BEGIN
        UPDATE critere SET motif_rejet = 'Hors sujet' WHERE id = humain;
        RAISE EXCEPTION 'V75 — un motif sans rejet a été accepté';
    EXCEPTION WHEN check_violation THEN
        NULL;
    END;

    -- Décor retiré, du plus profond au plus large — comme en V57 et V58. La
    -- suppression en cascade ne convient pas : elle retire la version avant
    -- son contenu, et le déclencheur d'immuabilité, ne retrouvant plus de
    -- statut, refuse alors de laisser partir les critères.
    DELETE FROM critere WHERE referentiel_version_id = brouillon;
    DELETE FROM domaine WHERE referentiel_version_id = brouillon;
    DELETE FROM referentiel_version WHERE id = brouillon;
    DELETE FROM referentiel WHERE id = ref_id;
    DELETE FROM utilisateur WHERE id = relecteur;
END;
$verif$;

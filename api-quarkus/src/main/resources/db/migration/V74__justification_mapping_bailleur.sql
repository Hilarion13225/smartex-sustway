-- =====================================================================
-- Une correspondance critère ↔ bailleur se justifie par une source
-- =====================================================================
-- `critere_bailleur` dit qu'un critère compte pour un bailleur. Elle ne dit
-- pas pourquoi. Tant que ce pourquoi n'existe nulle part, aucun mapping ne
-- peut être défendu devant un bailleur, et l'indice de préparation ne peut
-- pas distinguer une correspondance documentée d'une supposition.
--
-- Cette migration ajoute la trace documentaire, sans rien créer d'autre :
--   * aucune ligne n'est écrite dans `critere_bailleur`, qui n'est pas
--     modifiée : la justification la RÉFÉRENCE ;
--   * aucune justification n'est créée : la table naît vide ;
--   * l'indice n'en tient pas compte (V74-B).
--
-- Décisions portées par le schéma
--   * Brouillon autorisé sans source ; seule la VALIDATION exige une preuve
--     complète, faite de champs non blancs.
--   * Une seule justification vivante par couple (non rejetée, non périmée).
--     Toute nouvelle tentative crée une nouvelle ligne.
--   * Identité figée dès la création, brouillon compris : le couple
--     critère/bailleur, l'auteur et la date de création ne changent jamais.
--     Sans quoi un brouillon pourrait être déplacé vers un autre mapping et
--     emporter avec lui un historique qui ne le concerne pas.
--   * Immuabilité après décision : une validée ou une rejetée ne change plus,
--     sauf la péremption d'une validée, qui ne renseigne qu'une fois
--     `perimee_par`, `perimee_le` et `motif_peremption`. C'est la seule
--     manière de défaire une validation. Aucune suppression physique.
--     Tenue par des déclencheurs en plus du service : un CHECK ne voit pas
--     l'ancienne valeur d'une ligne.
--   * Les déclencheurs comparent la ligne entière, et non les seules colonnes
--     citées dans l'UPDATE : Hibernate réécrit toutes les colonnes à chaque
--     mise à jour, y compris celles qui n'ont pas changé.
--   * Pas de colonne `statut` : l'état se lit dans les colonnes de décision.
--   * Validation possible sur une version PUBLIÉE : justifier un mapping ne
--     modifie aucune des tables figées par V49/V53.
--   * ON DELETE RESTRICT vers le mapping : supprimer un mapping justifié,
--     directement ou par cascade depuis `critere`, est refusé ; l'API rend 409
--     et oriente vers `applicable = false`.
--   * ÉCART ASSUMÉ : clés vers `utilisateur` en RESTRICT et `created_by`
--     NOT NULL, là où la convention historique emploie SET NULL. Une
--     justification est une pièce d'audit : ses auteurs ne disparaissent pas.
--   * Les déclencheurs lèvent leurs refus avec `CONSTRAINT = 'cbj_…'`, sans
--     quoi l'API ne distinguerait pas un refus V74 d'une autre erreur SQL.
-- =====================================================================

CREATE TYPE correspondance_bailleur AS ENUM ('EXACTE', 'PARTIELLE', 'AUCUNE', 'NON_DETERMINEE');

CREATE TABLE critere_bailleur_justification (
    id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    critere_id           uuid NOT NULL,
    bailleur_id          uuid NOT NULL,
    document_nom         text,
    document_edition     text,
    document_organisme   text,
    document_url         text,
    reference_officielle text,
    titre_officiel       text,
    texte_source         text,
    localisation         jsonb,
    confiance            numeric(4,3),
    origine              origine_contenu         NOT NULL DEFAULT 'CONTENU_HUMAIN',
    correspondance       correspondance_bailleur NOT NULL DEFAULT 'NON_DETERMINEE',
    justification        text,
    validee_par          uuid,
    validee_le           timestamptz,
    rejetee_par          uuid,
    rejetee_le           timestamptz,
    motif_rejet          text,
    perimee_par          uuid,
    perimee_le           timestamptz,
    motif_peremption     text,
    created_by           uuid        NOT NULL,
    created_at           timestamptz NOT NULL DEFAULT now(),
    modifiee_par         uuid,
    modifiee_le          timestamptz,

    CONSTRAINT cbj_mapping_fkey FOREIGN KEY (critere_id, bailleur_id)
        REFERENCES critere_bailleur (critere_id, bailleur_id) ON DELETE RESTRICT,
    CONSTRAINT cbj_created_by_fkey   FOREIGN KEY (created_by)   REFERENCES utilisateur (id) ON DELETE RESTRICT,
    CONSTRAINT cbj_modifiee_par_fkey FOREIGN KEY (modifiee_par) REFERENCES utilisateur (id) ON DELETE RESTRICT,
    CONSTRAINT cbj_validee_par_fkey  FOREIGN KEY (validee_par)  REFERENCES utilisateur (id) ON DELETE RESTRICT,
    CONSTRAINT cbj_rejetee_par_fkey  FOREIGN KEY (rejetee_par)  REFERENCES utilisateur (id) ON DELETE RESTRICT,
    CONSTRAINT cbj_perimee_par_fkey  FOREIGN KEY (perimee_par)  REFERENCES utilisateur (id) ON DELETE RESTRICT,

    CONSTRAINT cbj_confiance_bornee CHECK (confiance IS NULL OR (confiance >= 0 AND confiance <= 1)),
    CONSTRAINT cbj_validation_exige_preuve_complete CHECK (
        validee_par IS NULL OR (
                document_nom         IS NOT NULL AND btrim(document_nom)         <> ''
            AND document_edition     IS NOT NULL AND btrim(document_edition)     <> ''
            AND document_organisme   IS NOT NULL AND btrim(document_organisme)   <> ''
            AND reference_officielle IS NOT NULL AND btrim(reference_officielle) <> ''
            AND texte_source         IS NOT NULL AND btrim(texte_source)         <> ''
            AND justification        IS NOT NULL AND btrim(justification)        <> ''
            AND correspondance <> 'NON_DETERMINEE'
            AND validee_le IS NOT NULL)),
    CONSTRAINT cbj_rejet_motive CHECK (
        rejetee_par IS NULL
        OR (rejetee_le IS NOT NULL AND motif_rejet IS NOT NULL AND btrim(motif_rejet) <> '')),
    CONSTRAINT cbj_motif_suppose_rejet CHECK (motif_rejet IS NULL OR rejetee_par IS NOT NULL),
    CONSTRAINT cbj_peremption_tracee CHECK (
        perimee_le IS NULL
        OR (perimee_par IS NOT NULL AND motif_peremption IS NOT NULL AND btrim(motif_peremption) <> '')),
    CONSTRAINT cbj_motif_suppose_peremption CHECK (motif_peremption IS NULL OR perimee_le IS NOT NULL),
    CONSTRAINT cbj_peremption_apres_validation CHECK (perimee_le IS NULL OR validee_par IS NOT NULL),
    CONSTRAINT cbj_decision_exclusive CHECK (validee_par IS NULL OR rejetee_par IS NULL),
    CONSTRAINT cbj_dates_de_decision_coherentes CHECK (
            (validee_par IS NULL) = (validee_le IS NULL)
        AND (rejetee_par IS NULL) = (rejetee_le IS NULL)
        AND (perimee_par IS NULL) = (perimee_le IS NULL)),
    CONSTRAINT cbj_modification_coherente CHECK ((modifiee_par IS NULL) = (modifiee_le IS NULL))
);

-- Une seule justification vivante par couple : brouillon et validée bloquent,
-- rejetée et périmée n'en bloquent pas.
CREATE UNIQUE INDEX cbj_vivante_uidx ON critere_bailleur_justification (critere_id, bailleur_id)
    WHERE perimee_le IS NULL AND rejetee_par IS NULL;
-- Ce que V74-B comptera.
CREATE INDEX cbj_comptee_idx ON critere_bailleur_justification (bailleur_id)
    WHERE validee_par IS NOT NULL AND perimee_le IS NULL;
-- Historique d'un couple ; sert aussi au contrôle RESTRICT.
CREATE INDEX cbj_historique_idx ON critere_bailleur_justification (critere_id, bailleur_id, created_at DESC);

CREATE FUNCTION cbj_refuser_modification_apres_decision() RETURNS trigger AS $fonction$
DECLARE
    champs_de_peremption CONSTANT text[] := ARRAY['perimee_par', 'perimee_le', 'motif_peremption'];
BEGIN
    -- Avant toute autre règle, et pour un brouillon aussi : l'identité d'une
    -- justification ne se déplace pas.
    IF (NEW.id, NEW.critere_id, NEW.bailleur_id, NEW.created_by, NEW.created_at)
       IS DISTINCT FROM (OLD.id, OLD.critere_id, OLD.bailleur_id, OLD.created_by, OLD.created_at) THEN
        RAISE EXCEPTION 'Justification % : son couple, son auteur et sa date de création ne changent pas', OLD.id
            USING ERRCODE = 'check_violation',
                  CONSTRAINT = 'cbj_identite_figee';
    END IF;
    IF OLD.validee_par IS NULL AND OLD.rejetee_par IS NULL THEN
        RETURN NEW;  -- brouillon : contenu libre ; validation et rejet contrôlés par les CHECK
    END IF;
    IF (to_jsonb(NEW) - champs_de_peremption) IS DISTINCT FROM (to_jsonb(OLD) - champs_de_peremption) THEN
        RAISE EXCEPTION 'Justification % déjà tranchée : seule sa péremption reste possible', OLD.id
            USING ERRCODE = 'check_violation', CONSTRAINT = 'cbj_immuable_apres_decision',
                  HINT = 'Créez une nouvelle justification pour toute nouvelle tentative.';
    END IF;
    IF OLD.perimee_le IS NOT NULL
       AND (NEW.perimee_par, NEW.perimee_le, NEW.motif_peremption)
           IS DISTINCT FROM (OLD.perimee_par, OLD.perimee_le, OLD.motif_peremption) THEN
        RAISE EXCEPTION 'Justification % déjà périmée : sa péremption est définitive', OLD.id
            USING ERRCODE = 'check_violation', CONSTRAINT = 'cbj_peremption_definitive';
    END IF;
    RETURN NEW;
END;
$fonction$ LANGUAGE plpgsql;

CREATE TRIGGER cbj_immuable_apres_decision
    BEFORE UPDATE ON critere_bailleur_justification
    FOR EACH ROW EXECUTE FUNCTION cbj_refuser_modification_apres_decision();

CREATE FUNCTION cbj_refuser_suppression() RETURNS trigger AS $fonction$
BEGIN
    RAISE EXCEPTION 'Une justification ne se supprime pas : rejetez-la ou périmez-la'
        USING ERRCODE = 'check_violation', CONSTRAINT = 'cbj_suppression_interdite';
    -- Jamais atteint : écrit pour qu'aucune évolution du RAISE ne laisse
    -- passer une suppression par un RETURN OLD implicite.
    RETURN NULL;
END;
$fonction$ LANGUAGE plpgsql;

CREATE TRIGGER cbj_suppression_interdite
    BEFORE DELETE ON critere_bailleur_justification
    FOR EACH ROW EXECUTE FUNCTION cbj_refuser_suppression();

COMMENT ON TABLE critere_bailleur_justification IS
    'Pourquoi un critère compte pour un bailleur : source officielle, passage cité et décision humaine. Référence critere_bailleur sans la modifier. Jamais supprimée, jamais réécrite après décision (voir V74).';
COMMENT ON COLUMN critere_bailleur_justification.correspondance IS
    'Degré de correspondance entre le critère et l''exigence du bailleur. NON_DETERMINEE interdit la validation.';
COMMENT ON COLUMN critere_bailleur_justification.texte_source IS
    'Passage littéral du document officiel qui fonde la correspondance. Jamais généré, jamais paraphrasé.';
COMMENT ON COLUMN critere_bailleur_justification.localisation IS
    'Où se trouve le passage dans le document (page, section…). Nul plutôt qu''approximatif.';
COMMENT ON COLUMN critere_bailleur_justification.validee_par IS
    'Décision humaine de validation, posée par SUPER_ADMIN seul. Immuable, sauf péremption.';
COMMENT ON COLUMN critere_bailleur_justification.perimee_par IS
    'Seule façon de défaire une validation : la ligne reste, datée et motivée ; une nouvelle justification peut être créée.';
COMMENT ON COLUMN critere_bailleur_justification.created_by IS
    'Auteur. NOT NULL et RESTRICT, par écart assumé à la convention SET NULL : pièce d''audit. Figé dès la création.';

DO $verif$
DECLARE
    auteur uuid; ref_id uuid; brouillon uuid; dom uuid; crit uuid; bail uuid;
    j1 uuid; j2 uuid; contrainte text;
BEGIN
    -- Tout le décor vit dans ce bloc, annulé à la fin par une exception
    -- attendue : aucune ligne ne survit, même si la vérification réussit.
    BEGIN
        INSERT INTO utilisateur (nom, prenom, email, mot_de_passe_hash, statut)
        VALUES ('Vérification', 'V74', '_verif_v74@smartex.invalid', 'x', 'DESACTIVE') RETURNING id INTO auteur;
        INSERT INTO referentiel (code, nom, type)
        VALUES ('_VERIF_V74', 'Référentiel de vérification V74', 'SMARTEX') RETURNING id INTO ref_id;
        INSERT INTO referentiel_version (referentiel_id, numero, statut, notes)
        VALUES (ref_id, '0.1', 'BROUILLON', 'Décor de vérification de la migration V74.') RETURNING id INTO brouillon;
        INSERT INTO domaine (referentiel_id, referentiel_version_id, code, nom)
        VALUES (ref_id, brouillon, 'D0', 'Domaine de vérification') RETURNING id INTO dom;
        INSERT INTO critere (domaine_id, referentiel_version_id, code, libelle)
        VALUES (dom, brouillon, 'D0-01', 'Critère de vérification') RETURNING id INTO crit;
        INSERT INTO bailleur (code, nom) VALUES ('_VERIF_V74', 'Bailleur de vérification') RETURNING id INTO bail;
        INSERT INTO critere_bailleur (critere_id, bailleur_id) VALUES (crit, bail);

        -- 1. Brouillon sans source accepté.
        INSERT INTO critere_bailleur_justification (critere_id, bailleur_id, created_by)
        VALUES (crit, bail, auteur) RETURNING id INTO j1;

        -- 2. Validation sans preuve refusée.
        BEGIN
            UPDATE critere_bailleur_justification SET validee_par = auteur, validee_le = now() WHERE id = j1;
            RAISE EXCEPTION 'V74 : une validation sans preuve a été acceptée';
        EXCEPTION WHEN check_violation THEN NULL;
        END;

        -- 3. Deuxième justification vivante refusée, par l'index attendu.
        BEGIN
            INSERT INTO critere_bailleur_justification (critere_id, bailleur_id, created_by) VALUES (crit, bail, auteur);
            RAISE EXCEPTION 'V74 : deux justifications vivantes ont coexisté';
        EXCEPTION WHEN unique_violation THEN
            GET STACKED DIAGNOSTICS contrainte = CONSTRAINT_NAME;
            IF contrainte IS DISTINCT FROM 'cbj_vivante_uidx' THEN
                RAISE EXCEPTION 'V74 : refus attendu sur cbj_vivante_uidx, obtenu %', contrainte;
            END IF;
        END;

        -- 4. Champ blanc refusé à la validation.
        BEGIN
            UPDATE critere_bailleur_justification
               SET document_nom = ' ', document_edition = 'x', document_organisme = 'x',
                   reference_officielle = 'x', texte_source = 'x', justification = 'x',
                   correspondance = 'EXACTE', validee_par = auteur, validee_le = now()
             WHERE id = j1;
            RAISE EXCEPTION 'V74 : une validation à champ blanc a été acceptée';
        EXCEPTION WHEN check_violation THEN NULL;
        END;

        -- 5. Preuve complète validée, colonnes jsonb et numeric renseignées :
        --    ce sont elles que la comparaison to_jsonb doit savoir relire.
        UPDATE critere_bailleur_justification
           SET document_nom = 'Doc', document_edition = '2012', document_organisme = 'Org',
               reference_officielle = 'PS1', texte_source = 'Passage', justification = 'Motif',
               localisation = '{"page": 12, "section": "2.1"}'::jsonb, confiance = 0.850,
               correspondance = 'EXACTE', validee_par = auteur, validee_le = now()
         WHERE id = j1;

        -- 6. Validée : ni réécriture, ni rejet, sous le nom de contrainte attendu.
        BEGIN
            UPDATE critere_bailleur_justification SET texte_source = 'Réécrit' WHERE id = j1;
            RAISE EXCEPTION 'V74 : une justification validée a été réécrite';
        EXCEPTION WHEN check_violation THEN
            GET STACKED DIAGNOSTICS contrainte = CONSTRAINT_NAME;
            IF contrainte IS DISTINCT FROM 'cbj_immuable_apres_decision' THEN
                RAISE EXCEPTION 'V74 : refus attendu sur cbj_immuable_apres_decision, obtenu %', contrainte;
            END IF;
        END;
        BEGIN
            UPDATE critere_bailleur_justification
               SET validee_par = NULL, validee_le = NULL, rejetee_par = auteur, rejetee_le = now(), motif_rejet = 'x'
             WHERE id = j1;
            RAISE EXCEPTION 'V74 : une validée a été rejetée';
        EXCEPTION WHEN check_violation THEN NULL;
        END;

        -- 7. Suppression du mapping justifié refusée, sous le nom attendu.
        BEGIN
            DELETE FROM critere_bailleur WHERE critere_id = crit AND bailleur_id = bail;
            RAISE EXCEPTION 'V74 : un mapping justifié a été supprimé';
        EXCEPTION WHEN foreign_key_violation OR restrict_violation THEN
            GET STACKED DIAGNOSTICS contrainte = CONSTRAINT_NAME;
            IF contrainte IS DISTINCT FROM 'cbj_mapping_fkey' THEN
                RAISE EXCEPTION 'V74 : refus attendu sur cbj_mapping_fkey, obtenu %', contrainte;
            END IF;
        END;

        -- 8. Péremption : refusée sans motif ; motivée, elle passe, une seule fois.
        BEGIN
            UPDATE critere_bailleur_justification SET perimee_par = auteur, perimee_le = now(), motif_peremption = '  ' WHERE id = j1;
            RAISE EXCEPTION 'V74 : une péremption sans motif a été acceptée';
        EXCEPTION WHEN check_violation THEN NULL;
        END;
        -- Même forme qu'un UPDATE d'Hibernate : toutes les colonnes sont
        -- réécrites, seules les trois de la péremption changent de valeur.
        UPDATE critere_bailleur_justification
           SET document_nom = document_nom, document_edition = document_edition,
               document_organisme = document_organisme, document_url = document_url,
               reference_officielle = reference_officielle, titre_officiel = titre_officiel,
               texte_source = texte_source, localisation = localisation, confiance = confiance,
               origine = origine, correspondance = correspondance, justification = justification,
               validee_par = validee_par, validee_le = validee_le,
               rejetee_par = rejetee_par, rejetee_le = rejetee_le, motif_rejet = motif_rejet,
               modifiee_par = modifiee_par, modifiee_le = modifiee_le,
               perimee_par = auteur, perimee_le = now(), motif_peremption = 'Édition remplacée'
         WHERE id = j1;
        BEGIN
            UPDATE critere_bailleur_justification SET motif_peremption = 'Autre' WHERE id = j1;
            RAISE EXCEPTION 'V74 : une péremption a été réécrite';
        EXCEPTION WHEN check_violation THEN NULL;
        END;

        -- 9. Nouvelle justification après péremption ; rejet non motivé refusé.
        INSERT INTO critere_bailleur_justification (critere_id, bailleur_id, created_by)
        VALUES (crit, bail, auteur) RETURNING id INTO j2;
        BEGIN
            UPDATE critere_bailleur_justification SET rejetee_par = auteur, rejetee_le = now() WHERE id = j2;
            RAISE EXCEPTION 'V74 : un rejet sans motif a été accepté';
        EXCEPTION WHEN check_violation THEN NULL;
        END;

        -- 10. Un brouillon ne réécrit pas son identité.
        BEGIN
            UPDATE critere_bailleur_justification SET created_at = created_at - interval '1 day' WHERE id = j2;
            RAISE EXCEPTION 'V74 : la date de création d''un brouillon a été réécrite';
        EXCEPTION WHEN check_violation THEN
            GET STACKED DIAGNOSTICS contrainte = CONSTRAINT_NAME;
            IF contrainte IS DISTINCT FROM 'cbj_identite_figee' THEN
                RAISE EXCEPTION 'V74 : refus attendu sur cbj_identite_figee, obtenu %', contrainte;
            END IF;
        END;

        -- 11. Aucune suppression physique.
        BEGIN
            DELETE FROM critere_bailleur_justification WHERE id = j2;
            RAISE EXCEPTION 'V74 : une justification a été supprimée';
        EXCEPTION WHEN check_violation THEN
            GET STACKED DIAGNOSTICS contrainte = CONSTRAINT_NAME;
            IF contrainte IS DISTINCT FROM 'cbj_suppression_interdite' THEN
                RAISE EXCEPTION 'V74 : refus attendu sur cbj_suppression_interdite, obtenu %', contrainte;
            END IF;
        END;

        RAISE EXCEPTION '__v74_fin_de_verification__';
    EXCEPTION WHEN raise_exception THEN
        IF SQLERRM <> '__v74_fin_de_verification__' THEN
            RAISE;
        END IF;
    END;

    IF EXISTS (SELECT 1 FROM critere_bailleur_justification) THEN
        RAISE EXCEPTION 'V74 : la table de justification devait naître vide';
    END IF;
END;
$verif$;

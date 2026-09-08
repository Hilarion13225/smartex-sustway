-- =====================================================================
-- Immuabilité d'une version publiée
-- =====================================================================
-- La garantie porte sur la base, pas seulement sur le service. Un contrôle
-- applicatif protège les chemins que l'on a pensés ; il ne protège ni un
-- script de reprise, ni une console SQL, ni un endpoint ajouté plus tard
-- par quelqu'un qui ignorait la règle. Or c'est précisément ce que la
-- version publiée doit garantir : qu'une mission close ne puisse pas
-- changer de référentiel après coup, quel que soit le chemin emprunté.
--
-- Même forme que `refuser_role_inactif()` en V44 : un déclencheur BEFORE
-- qui lève une exception plutôt qu'une contrainte, parce que la règle
-- porte sur une ligne d'une autre table que celle écrite.
-- =====================================================================

-- --- Contenu : domaine, sous-domaine, critère, question ----------------

CREATE OR REPLACE FUNCTION refuser_contenu_de_version_figee() RETURNS trigger AS $fonction$
DECLARE
    statut_vise    statut_version_referentiel;
    statut_origine statut_version_referentiel;
BEGIN
    -- Sur une modification, l'origine compte autant que la destination :
    -- déplacer une ligne d'une version publiée vers un brouillon
    -- reviendrait à retirer du contenu à une version figée.
    IF TG_OP IN ('UPDATE', 'DELETE') THEN
        SELECT v.statut INTO statut_origine
          FROM referentiel_version v WHERE v.id = OLD.referentiel_version_id;
        IF statut_origine IS DISTINCT FROM 'BROUILLON' THEN
            RAISE EXCEPTION
                'Contenu appartenant à une version % : la table % n''est plus modifiable pour cette version',
                statut_origine, TG_TABLE_NAME
                USING ERRCODE = 'check_violation',
                      HINT = 'Créez une nouvelle version brouillon à partir de la version publiée.';
        END IF;
    END IF;

    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    END IF;

    SELECT v.statut INTO statut_vise
      FROM referentiel_version v WHERE v.id = NEW.referentiel_version_id;
    IF statut_vise IS DISTINCT FROM 'BROUILLON' THEN
        RAISE EXCEPTION
            'La version visée est % : on ne peut écrire dans la table % que sur une version brouillon',
            statut_vise, TG_TABLE_NAME
            USING ERRCODE = 'check_violation',
                  HINT = 'Créez une nouvelle version brouillon à partir de la version publiée.';
    END IF;

    RETURN NEW;
END;
$fonction$ LANGUAGE plpgsql;

CREATE TRIGGER domaine_version_figee
    BEFORE INSERT OR UPDATE OR DELETE ON domaine
    FOR EACH ROW EXECUTE FUNCTION refuser_contenu_de_version_figee();

CREATE TRIGGER sous_domaine_version_figee
    BEFORE INSERT OR UPDATE OR DELETE ON sous_domaine
    FOR EACH ROW EXECUTE FUNCTION refuser_contenu_de_version_figee();

CREATE TRIGGER critere_version_figee
    BEFORE INSERT OR UPDATE OR DELETE ON critere
    FOR EACH ROW EXECUTE FUNCTION refuser_contenu_de_version_figee();

CREATE TRIGGER question_version_figee
    BEFORE INSERT OR UPDATE OR DELETE ON question
    FOR EACH ROW EXECUTE FUNCTION refuser_contenu_de_version_figee();

-- --- La version elle-même ----------------------------------------------
--
-- Deux transitions seulement sont légitimes après la création d'un
-- brouillon : le publier, et archiver la version qu'il remplace. Tout le
-- reste — renuméroter une version publiée, en retoucher les notes, la
-- ramener au brouillon — est refusé.

CREATE OR REPLACE FUNCTION refuser_modification_version_figee() RETURNS trigger AS $fonction$
BEGIN
    IF TG_OP = 'DELETE' THEN
        IF OLD.statut <> 'BROUILLON' THEN
            RAISE EXCEPTION 'La version % est % et ne peut pas être supprimée', OLD.numero, OLD.statut
                USING ERRCODE = 'check_violation',
                      HINT = 'L''historique des versions publiées est conservé (RG14).';
        END IF;
        RETURN OLD;
    END IF;

    -- Un brouillon s'édite librement, y compris pour devenir publié.
    IF OLD.statut = 'BROUILLON' THEN
        RETURN NEW;
    END IF;

    -- Une version publiée ne peut qu'être archivée, et rien d'autre ne doit
    -- bouger à cette occasion.
    IF OLD.statut = 'PUBLIEE'
       AND NEW.statut = 'ARCHIVEE'
       AND NEW.referentiel_id = OLD.referentiel_id
       AND NEW.numero = OLD.numero
       AND NEW.nombre_domaines = OLD.nombre_domaines
       AND NEW.nombre_criteres = OLD.nombre_criteres
       AND NEW.notes IS NOT DISTINCT FROM OLD.notes
       AND NEW.publiee_le IS NOT DISTINCT FROM OLD.publiee_le THEN
        RETURN NEW;
    END IF;

    RAISE EXCEPTION 'La version % est % : seul son archivage reste possible', OLD.numero, OLD.statut
        USING ERRCODE = 'check_violation',
              HINT = 'Créez une version corrective plutôt que de modifier une version publiée.';
END;
$fonction$ LANGUAGE plpgsql;

CREATE TRIGGER referentiel_version_figee
    BEFORE UPDATE OR DELETE ON referentiel_version
    FOR EACH ROW EXECUTE FUNCTION refuser_modification_version_figee();

-- --- Vérification : la règle est réellement appliquée ------------------
--
-- Poser un déclencheur sans l'éprouver reviendrait à documenter une
-- garantie. On tente donc une écriture interdite, et la migration échoue
-- si elle passe. La sous-transaction est annulée dans tous les cas :
-- aucune donnée n'est laissée derrière.

DO $verif$
DECLARE
    critere_publie uuid;
    ecriture_passee boolean := false;
BEGIN
    SELECT c.id INTO critere_publie
      FROM critere c JOIN referentiel_version v ON v.id = c.referentiel_version_id
     WHERE v.statut = 'PUBLIEE'
     LIMIT 1;

    IF critere_publie IS NULL THEN
        RAISE NOTICE 'Aucun critère en version publiée : vérification de l''immuabilité non applicable ici.';
        RETURN;
    END IF;

    BEGIN
        UPDATE critere SET libelle = libelle || ' (test immuabilité)' WHERE id = critere_publie;
        ecriture_passee := true;
    EXCEPTION WHEN check_violation THEN
        ecriture_passee := false;
    END;

    IF ecriture_passee THEN
        RAISE EXCEPTION 'Le déclencheur d''immuabilité n''a pas refusé la modification d''un critère publié';
    END IF;

    BEGIN
        DELETE FROM referentiel_version WHERE statut = 'PUBLIEE';
        ecriture_passee := true;
    EXCEPTION WHEN check_violation THEN
        ecriture_passee := false;
    END;

    IF ecriture_passee THEN
        RAISE EXCEPTION 'Le déclencheur d''immuabilité n''a pas refusé la suppression d''une version publiée';
    END IF;
END;
$verif$;

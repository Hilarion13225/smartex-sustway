-- =====================================================================
-- Historique des versions d'un référentiel
-- =====================================================================
-- La table `referentiel` ne portait qu'une chaîne `version`, écrasée à
-- chaque évolution : rien ne disait quand une version avait été publiée,
-- par qui, ni ce qu'elle changeait.
--
-- Chaque publication est désormais consignée. La version n'emporte pas de
-- copie des critères : le questionnaire d'une mission est déjà figé à sa
-- création (RG34/RG35, tables audit_critere et audit_question), donc faire
-- évoluer un référentiel n'altère aucune mission en cours. L'historique
-- documente l'évolution du catalogue, il n'a pas à la rejouer.
--
-- Les volumétries sont figées au moment de la publication : relues plus
-- tard, elles décriraient l'état courant et non celui de la version.
-- =====================================================================

CREATE TABLE referentiel_version (
    id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    referentiel_id   uuid NOT NULL REFERENCES referentiel(id) ON DELETE CASCADE,
    numero           varchar(20) NOT NULL,
    notes            text,
    nombre_domaines  integer NOT NULL DEFAULT 0,
    nombre_criteres  integer NOT NULL DEFAULT 0,
    auteur_id        uuid REFERENCES utilisateur(id) ON DELETE SET NULL,
    publiee_le       timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT referentiel_version_unique UNIQUE (referentiel_id, numero)
);

CREATE INDEX idx_referentiel_version_referentiel
    ON referentiel_version (referentiel_id, publiee_le DESC);

COMMENT ON TABLE referentiel_version IS
    'Publications successives d''un référentiel. La version courante reste portée par referentiel.version.';

-- --- Reprise de l'existant ---------------------------------------------
--
-- Chaque référentiel déjà présent reçoit sa version courante comme première
-- entrée d'historique, avec sa volumétrie du moment : sans cela, l'écran des
-- versions afficherait un historique vide pour des référentiels pourtant
-- publiés depuis des mois.

INSERT INTO referentiel_version (referentiel_id, numero, notes, nombre_domaines, nombre_criteres, publiee_le)
SELECT r.id,
       r.version,
       'Version initiale, reprise de l''existant lors de la mise en place de l''historique.',
       (SELECT count(*) FROM domaine d WHERE d.referentiel_id = r.id),
       (SELECT count(*) FROM critere c
          JOIN domaine d ON c.domaine_id = d.id
         WHERE d.referentiel_id = r.id AND c.actif),
       r.created_at
FROM referentiel r;

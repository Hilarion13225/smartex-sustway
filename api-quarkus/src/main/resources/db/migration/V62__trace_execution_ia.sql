-- =====================================================================
-- Les deux tables de trace IA deviennent exploitables
-- =====================================================================
-- `analyse_ia` et `execution_agent` existent depuis longtemps, sont vides,
-- et ne sont mappées par aucune entité JPA. Elles ne peuvent pas non plus
-- porter ce que l'instrumentation Python produit depuis la phase 5.6 :
-- ni le modèle réellement servi, ni le response_id, ni la durée mesurée,
-- ni les jetons consommés, ni la catégorie d'erreur.
--
-- Le modèle demandé est aujourd'hui `gemini-3.5-flash-lite`, valeur
-- temporaire posée pour contourner un quota. Le jour où elle changera,
-- rien dans les résultats déjà produits ne dira sous quel modèle ils ont
-- été rendus. C'est `served_model` qui répond à cela, et lui seul : le
-- fournisseur a le droit de servir autre chose que ce qu'on demande.
--
-- Risque de cette migration : nul. Les deux tables sont vides.
-- =====================================================================

-- --- 1. analyse_ia : la passe -----------------------------------------

ALTER TABLE analyse_ia
    -- L'analyse est déclenchée par critère, mais la table était modélisée
    -- par mission. Une passe échouée avant toute évaluation n'avait donc
    -- aucun critère identifiable : on savait qu'une analyse avait échoué,
    -- pas sur quoi.
    --
    -- Nullable, et c'est voulu : une passe peut échouer avant même d'avoir
    -- résolu son critère.
    ADD COLUMN audit_critere_id uuid REFERENCES audit_critere(id) ON DELETE SET NULL,

    ADD COLUMN declenche_par uuid REFERENCES utilisateur(id) ON DELETE SET NULL,

    -- Le modèle demandé, constant sur toute la passe. Le modèle servi, lui,
    -- peut varier d'un appel à l'autre : il est donc porté par
    -- `execution_agent`, pas ici.
    ADD COLUMN requested_model varchar(64),

    ADD COLUMN contrat_version varchar(10),
    ADD COLUMN contrat_execution_version varchar(10),

    -- Catégorie d'erreur, alignée sur la typologie implémentée en phase
    -- 5.6 (CONFIGURATION_MANQUANTE, QUOTA, MODELE_INDISPONIBLE,
    -- AUTHENTIFICATION_FOURNISSEUR, EXPIRATION, REPONSE_INVALIDE, INTERNE).
    --
    -- varchar et non enum : la typologie est encore susceptible d'évoluer,
    -- et faire évoluer un type énuméré PostgreSQL coûte une migration à
    -- chaque valeur ajoutée.
    ADD COLUMN erreur_type varchar(40);

COMMENT ON COLUMN analyse_ia.audit_critere_id IS
    'Critère analysé. Nul si la passe a échoué avant de le résoudre.';
COMMENT ON COLUMN analyse_ia.erreur IS
    'Cause technique, TOUJOURS assainie (phase 5.6) : jamais de clé d''API, de jeton, d''URL authentifiée ni de contenu de document.';

CREATE INDEX analyse_ia_audit_idx
    ON analyse_ia (audit_id, date_debut DESC);
CREATE INDEX analyse_ia_critere_idx
    ON analyse_ia (audit_critere_id, date_debut DESC)
    WHERE audit_critere_id IS NOT NULL;

-- --- 2. execution_agent : l'appel -------------------------------------
--
-- L'unité de trace est UN APPEL AU FOURNISSEUR, pas un agent. Le Document
-- Agent effectue un appel par pièce : une contrainte UNIQUE
-- (analyse_ia_id, agent) interdirait de tracer huit lectures
-- documentaires. Elle n'est donc volontairement pas posée — c'est
-- `piece_reference` qui distingue les appels d'un même agent.

ALTER TABLE execution_agent
    ADD COLUMN piece_reference varchar(16),

    -- Le seul témoin de ce qui a réellement répondu. S'il diffère du
    -- modèle demandé, c'est lui qui fait foi.
    ADD COLUMN served_model varchar(64),
    ADD COLUMN response_id  varchar(64),

    -- Mesurée côté Python sur une horloge monotone, pas déduite de la
    -- différence des horodatages : le fournisseur ne rend pas de
    -- `create_time`, et l'horloge murale est sensible aux ajustements NTP.
    ADD COLUMN duration_ms integer,

    -- Trois compteurs, ceux qui se sont révélés réellement peuplés lors
    -- des vérifications réelles. Nuls si le fournisseur n'a rien rapporté —
    -- un compteur absent reste nul plutôt que de devenir zéro, qui
    -- affirmerait qu'aucun jeton n'a été consommé.
    ADD COLUMN prompt_token_count     integer,
    ADD COLUMN candidates_token_count integer,
    ADD COLUMN total_token_count      integer,

    ADD COLUMN erreur_type    varchar(40),
    ADD COLUMN erreur_message text;

COMMENT ON COLUMN execution_agent.piece_reference IS
    'Référence locale de la pièce pour les appels documentaires. Distingue plusieurs appels d''un même agent au sein d''une passe.';
COMMENT ON COLUMN execution_agent.served_model IS
    'Modèle réellement servi par le fournisseur, tel que rapporté par la réponse. Peut différer du modèle demandé.';
COMMENT ON COLUMN execution_agent.erreur_message IS
    'Message assaini (phase 5.6). Ne contient jamais de secret, d''URL authentifiée ni de contenu de document.';

ALTER TABLE execution_agent
    ADD CONSTRAINT execution_agent_duree_positive
    CHECK (duration_ms IS NULL OR duration_ms >= 0);

-- Reconstitution chronologique d'une passe.
CREATE INDEX execution_agent_analyse_idx
    ON execution_agent (analyse_ia_id, date_debut);

CREATE INDEX execution_agent_agent_idx
    ON execution_agent (agent, date_debut DESC);

-- Seul ancrage permettant une réclamation auprès du fournisseur.
CREATE INDEX execution_agent_response_idx
    ON execution_agent (response_id)
    WHERE response_id IS NOT NULL;

CREATE INDEX execution_agent_erreur_idx
    ON execution_agent (erreur_type, date_debut DESC)
    WHERE erreur_type IS NOT NULL;

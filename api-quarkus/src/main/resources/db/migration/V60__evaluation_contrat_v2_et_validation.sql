-- =====================================================================
-- L'évaluation apprend d'où elle vient, et qui l'a validée
-- =====================================================================
-- Une évaluation ne dit aujourd'hui ni sous quel contrat elle a été
-- produite, ni quelle exécution l'a produite, ni qui l'a acceptée. Les 44
-- lignes existantes sont toutes VALIDEE sans qu'aucun humain n'ait rien
-- validé : le code écrit ce statut directement (RG16).
--
-- Toutes les colonnes sont nullables. C'est la condition pour que cette
-- migration ne touche aucune ligne existante et ne puisse rien casser.
--
-- `contrat_version` fait office de marqueur de génération : nul sur les 44
-- lignes historiques, '2.0' sur les évaluations produites par le pipeline
-- V2. Cela distingue le passé du présent sans écrire une seule ligne.
-- =====================================================================

ALTER TABLE evaluation
    -- Version du référentiel épinglée au moment de l'évaluation.
    --
    -- L'information est déjà dérivable : `audit.referentiel_version_id` est
    -- NOT NULL et immuable — l'entité Audit ne l'expose qu'en lecture.
    -- Cette colonne n'est donc pas une correction, c'est une assurance :
    -- elle rend l'évaluation auto-descriptive, et si une évolution
    -- permettait un jour de faire migrer une mission d'une version à
    -- l'autre, les évaluations passées resteraient rattachées à la version
    -- sous laquelle elles ont réellement été rendues.
    ADD COLUMN referentiel_version_id uuid REFERENCES referentiel_version(id) ON DELETE RESTRICT,

    -- L'exécution du pipeline qui a produit ce résultat. SET NULL : la
    -- trace technique est purgeable, le résultat métier lui survit.
    ADD COLUMN analyse_ia_id uuid REFERENCES analyse_ia(id) ON DELETE SET NULL,

    -- '2.0' pour le contrat V2. Nul = évaluation antérieure à V2.
    ADD COLUMN contrat_version varchar(10),

    -- Confiance du Risk Agent. Distincte de `confiance_ia`, qui porte la
    -- confiance de l'agent de conformité : les deux agents se prononcent
    -- sur des choses différentes et n'ont aucune raison d'être aussi sûrs
    -- l'un que l'autre.
    ADD COLUMN confiance_risque numeric(5,4),

    -- Pourquoi les preuves sont jugées suffisantes ou non. Distincte de
    -- `justification`, qui porte le raisonnement de conformité.
    ADD COLUMN justification_couverture text,

    -- Validation humaine. Nulles tant que personne n'a validé — c'est
    -- cette nullité qui distingue un résultat d'IA d'un verdict.
    ADD COLUMN validee_par uuid REFERENCES utilisateur(id) ON DELETE SET NULL,
    ADD COLUMN validee_le  timestamptz;

COMMENT ON COLUMN evaluation.referentiel_version_id IS
    'Version du référentiel au moment de l''évaluation. Nulle sur les évaluations antérieures à V2 : la valeur n''est pas reconstituable avec certitude et une valeur dérivée aurait une autorité qu''elle n''a pas.';
COMMENT ON COLUMN evaluation.contrat_version IS
    'Version du contrat IA ayant produit ce résultat. NULL = évaluation antérieure au contrat V2.';
COMMENT ON COLUMN evaluation.validee_par IS
    'Utilisateur ayant fait passer l''évaluation de EN_REVUE à VALIDEE. Nul sur les évaluations historiques, validées par le code au titre de RG16.';

-- `version_referentiel` (varchar, nulle sur 44/44) n'est ni remplie, ni
-- supprimée. La remplir dupliquerait sous une forme plus faible une
-- information que `referentiel_version_id` porte désormais correctement ;
-- la supprimer est une décision distincte, à prendre une fois la clé
-- étrangère réellement en service.
COMMENT ON COLUMN evaluation.version_referentiel IS
    'OBSOLÈTE — remplacée par referentiel_version_id. Jamais renseignée. Conservée le temps de vérifier qu''aucun code ne la lit.';

-- --- Cohérence de la validation ---------------------------------------
--
-- Une évaluation VALIDEE doit porter un validateur. La règle est juste en
-- cible mais les 44 lignes existantes la violeraient toutes : elles sont
-- VALIDEE sans `validee_par`.
--
-- La contrainte est donc restreinte aux évaluations du contrat V2. Elle
-- est exacte, ne ment pas sur le passé, et n'exige aucune écriture. Les
-- évaluations antérieures gardent la règle sous laquelle elles ont été
-- produites.
ALTER TABLE evaluation
    ADD CONSTRAINT evaluation_v2_validee_porte_un_validateur
    CHECK (
        contrat_version IS NULL
        OR statut <> 'VALIDEE'
        OR validee_par IS NOT NULL
    );

ALTER TABLE evaluation
    ADD CONSTRAINT evaluation_confiance_risque_domaine
    CHECK (confiance_risque IS NULL OR (confiance_risque >= 0 AND confiance_risque <= 1));

-- --- Index -------------------------------------------------------------

-- La requête la plus fréquente de tout le module : « la plus récente
-- évaluation de ce critère ». `id DESC` en dernier position n'est pas
-- décoratif — il départage deux évaluations écrites dans la même
-- transaction, qui porteraient un `date_evaluation` identique et
-- laisseraient l'ordre indéterminé.
CREATE INDEX evaluation_critere_recente_idx
    ON evaluation (audit_critere_id, date_evaluation DESC, id DESC);

CREATE INDEX evaluation_analyse_ia_idx
    ON evaluation (analyse_ia_id)
    WHERE analyse_ia_id IS NOT NULL;

-- Index partiel : la liste « à relire » ne porte que sur les évaluations
-- non validées, qui resteront minoritaires. Indexer les VALIDEE ne
-- servirait à rien et ferait grossir l'index avec le temps.
CREATE INDEX evaluation_a_relire_idx
    ON evaluation (audit_critere_id, statut)
    WHERE statut <> 'VALIDEE';

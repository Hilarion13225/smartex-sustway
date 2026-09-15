-- =====================================================================
-- L'analyse documentaire cesse de désigner son fichier par son nom
-- =====================================================================
-- `evaluation_document_analyse` ne porte que `nom`, `resume` et `ordre`.
-- Le seul lien entre une analyse et le fichier analysé est donc une chaîne
-- de caractères. Deux fichiers de même nom déposés sur une même mission
-- sont indiscernables, et un renommage rompt le lien.
--
-- L'objet `Document` complet est pourtant disponible au moment de la
-- persistance — `AnalyseCritereService` le manipule vingt lignes plus haut
-- pour télécharger le contenu. Il n'était simplement pas repris.
--
-- Le hash n'est pas recopié : `document.hash` est atteignable par la clé
-- étrangère, et le dupliquer créerait deux sources de vérité pouvant
-- diverger. Un hash qui diverge de son fichier est pire qu'un hash absent,
-- car il inspire une confiance injustifiée. La FK est en RESTRICT : un
-- document analysé ne peut pas être supprimé, donc le scénario « le
-- document a disparu, heureusement j'avais copié le hash » n'existe pas.
-- =====================================================================

ALTER TABLE evaluation_document_analyse
    ADD COLUMN document_id uuid REFERENCES document(id) ON DELETE RESTRICT,

    -- Référence locale de la pièce dans le payload soumis aux agents
    -- (`p1`, `p2`…). Ce n'est pas une clé : elle n'a de sens qu'à
    -- l'intérieur d'une passe. Elle sert à corréler cette analyse avec la
    -- ligne d'`execution_agent` correspondante, le Document Agent
    -- effectuant un appel par pièce.
    ADD COLUMN piece_reference varchar(16),

    ADD COLUMN confiance_lecture numeric(5,4);

COMMENT ON COLUMN evaluation_document_analyse.document_id IS
    'Document réellement analysé. Nul sur les 13 lignes antérieures à V2 : le rattachement rétroactif par nom n''est pas fiable, plusieurs documents pouvant porter le même nom sur une mission.';
COMMENT ON COLUMN evaluation_document_analyse.piece_reference IS
    'Référence locale au payload de l''analyse, jamais une identité. Sert uniquement à corréler avec execution_agent au sein d''une même passe.';

ALTER TABLE evaluation_document_analyse
    ADD CONSTRAINT eda_confiance_lecture_domaine
    CHECK (confiance_lecture IS NULL OR (confiance_lecture >= 0 AND confiance_lecture <= 1));

CREATE INDEX eda_evaluation_ordre_idx
    ON evaluation_document_analyse (evaluation_id, ordre);

-- « Où ce document a-t-il déjà servi ? » — question d'auditeur, et seule
-- justification de la colonne précédente.
CREATE INDEX eda_document_idx
    ON evaluation_document_analyse (document_id)
    WHERE document_id IS NOT NULL;

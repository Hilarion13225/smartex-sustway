-- =====================================================================
-- Traçabilité de l'analyse IA
-- =====================================================================
-- Le pipeline d'agents renvoie déjà, pour chaque critère analysé, s'il
-- juge les preuves suffisantes (`couverture_preuve`) et la liste des
-- documents lus avec leur résumé (`documents_analyses`). L'API les
-- ignorait : l'évaluation ne conservait que la probabilité, la confiance
-- et la justification.
--
-- Or l'Admin Audit ne réalise pas l'analyse — il la supervise. Sans savoir
-- quels documents l'IA a lus ni si elle a jugé les preuves suffisantes, un
-- résultat de conformité n'est pas contrôlable. Ces deux informations sont
-- donc désormais conservées avec l'évaluation.
--
-- Le résumé est stocké tel que produit par l'agent, sans le rattacher à la
-- table `document` : l'IA travaille sur les fichiers transmis pour ce
-- critère, dont l'un peut avoir été supprimé depuis. Le nom conservé ici
-- décrit ce qui a été lu au moment de l'analyse, non ce qui existe encore.
-- =====================================================================

ALTER TABLE evaluation
  ADD COLUMN couverture_preuve boolean;

COMMENT ON COLUMN evaluation.couverture_preuve IS
  'Jugement de l''IA sur la suffisance des preuves fournies. NULL pour une évaluation saisie par un humain.';

CREATE TABLE evaluation_document_analyse (
    id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    evaluation_id uuid NOT NULL REFERENCES evaluation(id) ON DELETE CASCADE,
    nom           varchar(500) NOT NULL,
    resume        text,
    ordre         integer NOT NULL DEFAULT 0
);

CREATE INDEX idx_evaluation_document_analyse_evaluation
    ON evaluation_document_analyse (evaluation_id, ordre);

COMMENT ON TABLE evaluation_document_analyse IS
    'Documents effectivement lus par l''IA lors d''une évaluation, avec le résumé qu''elle en a tiré.';

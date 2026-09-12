-- =====================================================================
-- La non-conformité acquiert une identité logique
-- =====================================================================
-- Étape STRUCTURELLE uniquement. Aucune donnée n'est écrite ici : le
-- rattachement des lignes existantes se fait en V68, et l'index d'unicité
-- en V69. Séparer les trois n'est pas de la coquetterie — si le calcul de
-- V68 se révélait faux, l'index de V69 échouerait et laisserait le schéma
-- dans un état intermédiaire connu plutôt que dans un mélange de DDL et de
-- DML partiellement appliqué.
--
-- Le problème corrigé : `NonConformiteService.genererSiNecessaire`
-- persiste sans condition, et aucune contrainte d'unicité n'existe. Chaque
-- ré-analyse d'un critère non conforme crée donc une non-conformité de
-- plus, avec le même titre — celui-ci étant dérivé du seul code du
-- critère. La base porte 39 lignes pour 22 critères.
--
-- Pourquoi `audit_critere_id` dénormalisé plutôt qu'un passage par
-- `evaluation` : la non-conformité est aujourd'hui rattachée à une
-- évaluation, donc à un INSTANTANÉ. L'identité voulue est le CRITÈRE. Un
-- index unique ne traverse pas de jointure ; atteindre le critère via
-- `evaluation` rendrait l'unicité impossible à imposer en base.
--
-- `audit_id` n'est pas ajouté : `audit_critere` porte déjà `audit_id`
-- NOT NULL avec UNIQUE (audit_id, critere_id). L'identité
-- (audit_id, audit_critere_id) est donc strictement équivalente à
-- (audit_critere_id) seule, et ajouter la première créerait une troisième
-- source de vérité pour la même information.
--
-- `evaluation_id` est CONSERVÉ : il devient « l'évaluation qui a produit
-- l'état courant », ce qui reste une information de traçabilité utile.
-- =====================================================================

ALTER TABLE non_conforme
    -- Nullable à ce stade : les 39 lignes existantes ne le portent pas
    -- encore. V68 le renseigne, et le caractère obligatoire reste
    -- applicatif — le passer NOT NULL exigerait que V68 ait réussi, ce que
    -- l'on ne peut pas garantir depuis cette migration-ci.
    ADD COLUMN audit_critere_id uuid REFERENCES audit_critere(id) ON DELETE CASCADE,

    -- Vrai par défaut : toute non-conformité créée à partir de maintenant
    -- est la courante de son critère, et l'index de V69 garantira qu'il
    -- n'y en a qu'une.
    ADD COLUMN courante boolean NOT NULL DEFAULT true,

    ADD COLUMN updated_at timestamptz;

COMMENT ON COLUMN non_conforme.audit_critere_id IS
    'Identité logique de l''écart. Un écart sur un critère reste le même écart, qu''on l''ait constaté une fois ou cinq.';
COMMENT ON COLUMN non_conforme.courante IS
    'Vrai pour la non-conformité qui représente l''état actuel du critère. Les lignes historiques sont conservées avec courante = false — rien n''est jamais supprimé.';
COMMENT ON COLUMN non_conforme.evaluation_id IS
    'Évaluation ayant produit l''état courant de cette non-conformité. Conservée pour la traçabilité ; l''identité logique est audit_critere_id.';

-- Historique par critère. Posé dès maintenant : il sert à V68 pour
-- déterminer la ligne la plus récente de chaque groupe.
CREATE INDEX non_conforme_critere_historique_idx
    ON non_conforme (audit_critere_id, created_at DESC, id DESC);

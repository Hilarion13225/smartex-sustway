-- =====================================================================
-- L'axe d'amélioration : une proposition, pas un engagement
-- =====================================================================
-- Une recommandation de l'IA n'a aujourd'hui que deux destins possibles :
-- rester du texte libre dans `evaluation.pistes_amelioration`, ou être
-- recopiée telle quelle dans la description d'une non-conformité — ce que
-- `NonConformiteService` fait déjà. Elle entre donc dans un objet
-- opposable sans que personne ne l'ait acceptée.
--
-- Cette table pose le troisième destin, le seul correct : une proposition
-- durable, tracée, soumise à une décision humaine explicite.
--
-- Le motif de validation est repris LITTÉRALEMENT de la table `exigence`
-- (V57) : origine, origine_initiale, validee_par/le, rejetee_par/le,
-- motif_rejet. Ce motif est déjà éprouvé, il tient une barrière de
-- publication en base, et le réutiliser évite d'inventer un second
-- vocabulaire de validation dans la même application.
-- =====================================================================

CREATE TABLE axe_amelioration (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Clé de tenant, NOT NULL, alors qu'elle serait dérivable via
    -- `evaluation` ou `audit_critere`. C'est délibéré : un contrôle
    -- d'accès qui coûte trois jointures est un contrôle qu'on finit par
    -- oublier d'écrire.
    audit_id uuid NOT NULL REFERENCES audit(id) ON DELETE CASCADE,

    -- Contexte du critère. SET NULL : l'axe survit au retrait du critère
    -- de la mission — la proposition reste vraie même si le critère n'est
    -- plus instruit.
    audit_critere_id uuid REFERENCES audit_critere(id) ON DELETE SET NULL,

    -- L'évaluation qui l'a produit. SET NULL pour la même raison.
    evaluation_id uuid REFERENCES evaluation(id) ON DELETE SET NULL,

    libelle     varchar(255) NOT NULL,
    description text,

    origine origine_axe NOT NULL,

    -- Conserve l'origine avant toute reprise humaine. Sans elle, un axe
    -- proposé par l'IA puis reformulé par un auditeur devient
    -- indistinguable d'un axe humain, et la traçabilité de l'origine IA
    -- est définitivement perdue.
    origine_initiale origine_axe,

    -- Rattachement facultatif à un élément du référentiel. Contrairement à
    -- `evaluation_constat`, il peut être entièrement absent : un axe
    -- transversal ne vise aucune exigence en particulier.
    niveau_rattachement niveau_rattachement,
    exigence_id        uuid REFERENCES exigence(id) ON DELETE SET NULL,
    preuve_attendue_id uuid REFERENCES preuve_attendue(id) ON DELETE SET NULL,
    regle_analyse_id   uuid REFERENCES regle_analyse(id) ON DELETE SET NULL,

    -- PROPOSE est le seul état qu'une recommandation de l'IA peut
    -- atteindre sans intervention humaine.
    statut statut_axe NOT NULL DEFAULT 'PROPOSE',

    validee_par uuid REFERENCES utilisateur(id) ON DELETE SET NULL,
    validee_le  timestamptz,

    rejetee_par uuid REFERENCES utilisateur(id) ON DELETE SET NULL,
    rejetee_le  timestamptz,
    motif_rejet text,

    created_by uuid REFERENCES utilisateur(id) ON DELETE SET NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz,

    -- Rattachement cohérent, mais facultatif. Le niveau et la cible vont
    -- ensemble ou sont tous deux absents.
    CONSTRAINT axe_cible_coherente CHECK (
        (niveau_rattachement IS NULL
            AND exigence_id IS NULL
            AND preuve_attendue_id IS NULL
            AND regle_analyse_id IS NULL)
        OR (niveau_rattachement = 'EXIGENCE'
            AND exigence_id IS NOT NULL
            AND preuve_attendue_id IS NULL
            AND regle_analyse_id IS NULL)
        OR (niveau_rattachement = 'PREUVE_ATTENDUE'
            AND preuve_attendue_id IS NOT NULL
            AND exigence_id IS NULL
            AND regle_analyse_id IS NULL)
        OR (niveau_rattachement = 'REGLE'
            AND regle_analyse_id IS NOT NULL
            AND exigence_id IS NULL
            AND preuve_attendue_id IS NULL)
    ),

    -- Le statut et les colonnes de décision disent la même chose ; ils ne
    -- doivent pas pouvoir se contredire. Un axe VALIDE sans validateur
    -- serait une validation dont personne ne répond.
    CONSTRAINT axe_validation_coherente CHECK (
        (statut = 'VALIDE') = (validee_par IS NOT NULL)
    ),
    CONSTRAINT axe_rejet_coherent CHECK (
        (statut = 'REJETE') = (rejetee_par IS NOT NULL)
    ),

    -- Un rejet sans motif ne se relit pas. Une recommandation écartée doit
    -- rester compréhensible six mois plus tard.
    CONSTRAINT axe_rejet_motive CHECK (
        statut <> 'REJETE' OR (motif_rejet IS NOT NULL AND btrim(motif_rejet) <> '')
    )
);

COMMENT ON TABLE axe_amelioration IS
    'Proposition d''amélioration. Un axe d''origine IA naît PROPOSE et n''engage rien : seule une décision humaine explicite le fait passer à VALIDE. Un axe rejeté est conservé, jamais supprimé.';
COMMENT ON COLUMN axe_amelioration.origine_initiale IS
    'Origine à la création, conservée quand `origine` évolue. Sans elle, un axe IA repris à la main devient indistinguable d''un axe humain.';

CREATE INDEX axe_audit_statut_idx      ON axe_amelioration (audit_id, statut);
CREATE INDEX axe_evaluation_idx        ON axe_amelioration (evaluation_id) WHERE evaluation_id IS NOT NULL;
CREATE INDEX axe_audit_critere_idx     ON axe_amelioration (audit_critere_id) WHERE audit_critere_id IS NOT NULL;

-- Aucune contrainte d'unicité sur cette table, et c'est un choix.
-- Deux recommandations formulées différemment pour le même problème sont
-- textuellement distinctes et sémantiquement identiques : aucune clé ne
-- les réconciliera. Le dédoublonnage est ici un geste de relecture
-- humaine — cohérent avec le fait qu'un axe est une proposition à valider.
-- Un axe redondant se rejette avec un motif, il ne se refuse pas par la
-- base.

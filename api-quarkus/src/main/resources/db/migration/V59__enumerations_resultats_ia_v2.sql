-- =====================================================================
-- Vocabulaire des résultats IA V2
-- =====================================================================
-- Le pipeline V2 distingue des états que le modèle actuel ne sait pas
-- exprimer. Le plus important est la différence entre « on a regardé et ce
-- n'est pas là » et « on n'a pas pu regarder » : aujourd'hui les deux
-- s'écrasent dans le booléen `evaluation.couverture_preuve`, qui fait
-- porter à l'organisation le coût d'un défaut technique de lecture.
--
-- Ces types sont créés seuls, avant toute table qui les emploie. Une
-- migration qui crée un type et l'utilise dans la même transaction
-- fonctionne en PostgreSQL, mais les séparer rend chaque étape rejouable
-- indépendamment et le diagnostic plus simple quand l'une échoue.
-- =====================================================================

-- Constat d'un agent documentaire sur une attente, pièce par pièce.
-- NON_VERIFIABLE n'est pas un degré d'absence : c'est une absence de
-- constat. Document illisible, hors périmètre, format non exploitable.
CREATE TYPE presence_constat AS ENUM (
    'PRESENT',
    'PARTIEL',
    'ABSENT',
    'NON_VERIFIABLE'
);

-- Couverture d'une preuve attendue, synthétisée sur l'ensemble des pièces.
-- Quatre valeurs là où `evaluation.couverture_preuve` n'en portait que deux.
CREATE TYPE couverture_preuve_attendue AS ENUM (
    'COMPLETE',
    'PARTIELLE',
    'INSUFFISANTE',
    'NON_VERIFIABLE'
);

-- Deux natures de remarque rattachée à un élément du référentiel. Elles
-- partagent une même table parce qu'elles ont exactement la même forme —
-- un rattachement et une justification. Le discriminant permettra de les
-- séparer plus tard sans migration ambiguë si elles divergent.
CREATE TYPE nature_constat AS ENUM (
    'SIGNAL_RISQUE',
    'ELEMENT_MANQUANT'
);

-- Niveau auquel une remarque ou un axe se rattache. Reprend exactement les
-- trois niveaux du contrat V2 (`Rattachement.niveau`).
CREATE TYPE niveau_rattachement AS ENUM (
    'EXIGENCE',
    'PREUVE_ATTENDUE',
    'REGLE'
);

-- Origine d'un axe d'amélioration.
--
-- Type distinct de `origine_contenu` (CONTENU_INITIAL / CONTENU_HUMAIN /
-- IMPORT_IA), et non une extension de celui-ci : ses valeurs désignent la
-- provenance du contenu d'un référentiel, où `IMPORT_IA` signifie
-- précisément « issu d'un import de document ». Un axe produit par une
-- analyse de mission ne vient d'aucun import ; réutiliser ce vocabulaire
-- ferait dire à `IMPORT_IA` autre chose selon la table.
CREATE TYPE origine_axe AS ENUM (
    'IA',
    'HUMAIN'
);

-- Cycle de vie d'un axe. `PROPOSE` est le seul état qu'une recommandation
-- de l'IA peut atteindre sans intervention humaine.
CREATE TYPE statut_axe AS ENUM (
    'PROPOSE',
    'VALIDE',
    'REJETE'
);

-- Cycle de vie d'un plan d'action.
CREATE TYPE statut_plan AS ENUM (
    'BROUILLON',
    'ACTIF',
    'CLOTURE'
);

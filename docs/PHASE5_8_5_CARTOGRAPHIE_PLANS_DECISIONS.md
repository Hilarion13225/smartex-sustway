# PHASE 5.8.5 — Cartographie et décisions : plans d'actions

## 1. STATUS

```text
PHASE 5.8.5
STATUT : CARTOGRAPHIE TERMINÉE / NON VALIDÉE
```

Cette phase **ne peut pas** être déclarée implémentée. Aucune ligne de code
fonctionnel, aucune donnée, aucune migration n'a été touchée. Le seul fichier
produit est ce rapport.

**Date de relevé : 2026-09-11.**

Convention : ce qui n'a pas été observé directement est marqué
`NON DÉMONTRÉ DANS L'EXISTANT` ou `À CONFIRMER`.

---

## 2. État technique

| Élément | État constaté |
|---|---|
| Dernière migration | **V70** |
| Java | 471/471 (référence 5.8.4, non relancé — aucun code modifié) |
| Python | 280/280 déterministes (aucun fichier Python touché) |
| Frontend | build vert (aucun fichier touché) |
| Endpoints du périmètre | **18**, sur 4 ressources |
| Permissions utilisées | **1 seule** : `audit:modifier` |
| Événements de journal codés | 8 |
| Événements réellement écrits | **2** |

---

## 3. Modèles

### 3.1 `plan_action` — 11 colonnes

| Colonne | Type | Null | Défaut |
|---|---|---|---|
| `id` | uuid | NON | `gen_random_uuid()` |
| `audit_id` | uuid | **NON** | — |
| `titre` | varchar | NON | — |
| `description` | text | oui | — |
| `statut` | `statut_plan` | NON | `'BROUILLON'` |
| `responsable_id` | uuid | oui | — |
| `date_echeance` | date | oui | — |
| `origine` | `origine_axe` | NON | `'HUMAIN'` |
| `created_by` | uuid | oui | — |
| `created_at` | timestamptz | NON | `now()` |
| `updated_at` | timestamptz | oui | — |

FK : `audit_id` → `audit` **CASCADE** ; `created_by`, `responsable_id` →
`utilisateur` SET NULL. Index : `plan_action_audit_idx (audit_id, statut)`.
**Aucun CHECK. Aucun trigger.**

> **À quoi sert réellement `plan_action` aujourd'hui ?**
> **À rien.** 0 ligne, aucun appelant frontend, aucun événement de journal
> écrit. La table, l'entité, le repository, la ressource REST et les tests
> existent ; le chemin n'a jamais été emprunté hors tests.

### 3.2 `action_plan` — 11 colonnes

| Colonne | Type | Null | Défaut |
|---|---|---|---|
| `id` | uuid | NON | `gen_random_uuid()` |
| `plan_action_id` | uuid | **NON** | — |
| `titre` | varchar | NON | — |
| `description` | text | oui | — |
| `responsable_id` | uuid | oui | — |
| `date_echeance` | date | oui | — |
| `statut` | `statut_action_corrective` | NON | `'OUVERTE'` |
| `priorite` | `priorite_action` | NON | `'MOYENNE'` |
| `ordre` | integer | NON | `0` |
| `created_at` | timestamptz | NON | `now()` |
| `updated_at` | timestamptz | oui | — |

FK : `plan_action_id` → `plan_action` **CASCADE** ; `responsable_id` SET NULL.
Index : `action_plan_plan_idx (plan_action_id, ordre)`. **Aucun CHECK, aucun
trigger.**

> **`action_plan` est-il réellement l'action enfant de `plan_action` ?**
> **Oui, et c'est structurel** : `plan_action_id` est `NOT NULL` avec CASCADE.
> Une action ne peut pas exister hors d'un plan, et la suppression du plan
> emporte ses actions. Ce point n'est pas une convention de code : la base le
> tient.

**Notez** : `action_plan` **ne porte pas `audit_id`**. Le contrôle de tenant
passe obligatoirement par `plan.audit.id`.

### 3.3 `action_axe` — table de liaison pure

2 colonnes : `action_plan_id`, `axe_amelioration_id`, toutes deux `NOT NULL`.

- **PK composite** `(action_plan_id, axe_amelioration_id)` ;
- les deux FK en **CASCADE** ;
- index secondaire `action_axe_axe_idx` pour le sens inverse.

Cardinalité réelle :

```text
axe_amelioration  ←──N:N──→  action_plan  ──N:1──→  plan_action
                (action_axe)
```

**La PK composite interdit structurellement le doublon** de rattachement : le
même axe ne peut pas être lié deux fois à la même action, sans qu'aucun code
n'ait à le vérifier.

### 3.4 `action_corrective` — 10 colonnes

FK : `non_conforme_id` **NOT NULL** CASCADE ; `responsable_id` SET NULL.
Index `idx_action_corrective_nc`. **Un trigger** :
`trg_action_corrective_updated_at`.

**Aucun lien vers `axe_amelioration`, `plan_action` ou `action_plan`.**

### 3.5 `axe_amelioration` — inchangé (5.8.4)

21 colonnes, 4 CHECK portants, 3 index. Non modifié par cette phase.

### 3.6 Énumérations

| Type | Valeurs | Utilisé par |
|---|---|---|
| `statut_plan` | `BROUILLON`, `ACTIF`, `CLOTURE` | `plan_action` |
| `statut_action_corrective` | `OUVERTE`, `EN_COURS`, `TERMINEE`, `VALIDEE` | `action_plan` **et** `action_corrective` |
| `priorite_action` | `BASSE`, `MOYENNE`, `HAUTE`, `CRITIQUE` | les deux |
| `origine_axe` | `IA`, `HUMAIN` | `axe_amelioration`, `plan_action` |
| `statut_axe` | `PROPOSE`, `VALIDE`, `REJETE` | `axe_amelioration` |

### 3.7 Anomalie de schéma relevée — asymétrie des triggers

```text
Trigger set_updated_at PRÉSENT : action_corrective, entreprise, utilisateur
Trigger set_updated_at ABSENT  : action_plan, plan_action, axe_amelioration,
                                 non_conforme, reponse_question
```

Les tables sans trigger dépendent de `@UpdateTimestamp` (Hibernate). Une
écriture SQL directe — script d'exploitation, migration — ne mettrait pas à
jour `updated_at` sur `plan_action` ni `action_plan`. **Documenté, non
corrigé** (risque MOYEN-3).

### 3.8 Ce que le schéma ne porte pas

Vérifié par requête : **aucune** colonne de progression, d'avancement, de
pourcentage, de `date_debut`, de `date_fin_reelle`, de clôture, d'annulation,
ni de `referentiel_version_id` sur les quatre tables. Les entités Java ne
portent rien de tel non plus.

---

## 4. Données réelles (aucune modification)

| Table | Lignes |
|---|---|
| `plan_action` | **0** |
| `action_plan` | **0** |
| `action_axe` | **0** |
| `action_corrective` | **2** |
| `axe_amelioration` | **4** (4 `PROPOSE`, **0 `VALIDE`**, 0 `REJETE`) |
| `non_conforme` | **39** (22 courantes, 17 historiques) |

Somme de contrôle historique : **`df9d6f5d3393f022d721734ec2776989`** —
inchangée.

Statuts réellement observés : `action_corrective` → `OUVERTE` uniquement ;
priorité → `HAUTE` uniquement. **`ACTIF`, `CLOTURE`, `EN_COURS`, `TERMINEE`,
`VALIDEE` n'ont jamais été employés en données réelles.**

Orphelins / doublons / relations invalides : **0**, les trois tables du plan
étant vides. Les CASCADE et la PK composite rendent d'ailleurs l'orphelin
structurellement impossible.

**Écart DB / code / frontend :**

| | DB | Code Java | Frontend |
|---|---|---|---|
| `plan_action` | 0 ligne | complet (entité, repo, 6 endpoints, tests) | **inexistant** |
| `action_plan` | 0 ligne | complet | **inexistant** |
| `action_corrective` | 2 lignes | complet | **3 écrans** |
| `axe_amelioration` | 4 lignes | complet (5.8.4) | 1 composant |

---

## 5. Cartographie du code Java

```text
AxeAmeliorationResource ─→ AxeAmeliorationService ─→ AxeAmeliorationRepository ─→ AxeAmelioration
PlanActionResource ──────────────(pas de service)──→ PlanActionRepository ──────→ PlanAction
                                                  └→ ActionPlanRepository ──────→ ActionPlan
ActionCorrectiveResource ────────(pas de service)──→ ActionCorrectiveRepository ─→ ActionCorrective
NonConformeResource ─────────────────────────────→ NonConformeRepository ───────→ NonConforme
                     (NonConformiteService : création uniquement)
```

**Asymétrie structurelle** : depuis 5.8.4, les axes ont un service métier
(`AxeAmeliorationService`) qui centralise création, décision, déduplication et
garde de version. **Les plans et les actions n'en ont aucun** : toute la règle
métier vit dans la ressource REST. C'est le principal écart d'architecture à
corriger avant implémentation (MAJEUR-1).

Méthodes de repository **sans aucun appelant** :
`ActionPlanRepository.traitantLAxe`, `AxeAmeliorationRepository.validesParAudit`,
`AxeAmeliorationRepository.parEvaluation`.

---

## 6. Cartographie des endpoints — 18 routes

### `PlanActionResource` — `/api/v1/entreprises/{e}/audits/{a}/plans-action`

| Méthode | Chemin | Tenant | Permission | Objet rendu |
|---|---|---|---|---|
| GET | `/` | `exigerAccesEntreprise` | — | `List<PlanActionDto>` |
| GET | `/{planId}` | idem + `parIdEtAudit` | — | `PlanActionDto` |
| POST | `/` | idem | `audit:modifier` | `PlanActionDto` (201) |
| PUT | `/{planId}` | idem | `audit:modifier` | `PlanActionDto` |
| PUT | `/{planId}/statut` | idem | `audit:modifier` | `PlanActionDto` |
| POST | `/{planId}/actions` | idem | `audit:modifier` | `ActionDto` (201) |

### `AxeAmeliorationResource` — `…/axes-amelioration`

| Méthode | Chemin | Tenant | Permission |
|---|---|---|---|
| GET | `/` (+ `?auditCritereId=`, `?statut=`) | `exigerAccesEntreprise` | — |
| GET | `/{axeId}` | idem | — |
| POST | `/` | idem | `audit:modifier` |
| POST | `/{axeId}/validation` | idem | `audit:modifier` |
| POST | `/{axeId}/rejet` | idem | `audit:modifier` |

### `ActionCorrectiveResource` — `…/non-conformites/{nc}/actions`

| Méthode | Chemin | Tenant | Permission |
|---|---|---|---|
| GET | `/` | `exigerAccesEntreprise` | — |
| POST | `/` | idem | `audit:modifier` |
| PUT | `/{actionId}/statut` | idem | `audit:modifier` |

### `NonConformeResource` — `…/non-conformites`

GET `/`, GET `/{id}`, PUT `/{id}/statut` (`audit:modifier`).

### Routes **absentes** — constat majeur

**Aucun `@DELETE` sur aucune des trois ressources du périmètre.**

Et pour `ActionPlan`, une seule route existe (la création). **Il n'existe
aucune route pour** : modifier une action, changer son statut, changer son
responsable, la supprimer, la retirer d'un axe.

Une action de plan est donc, en l'état, **créée et figée**. C'est le blocage
fonctionnel principal (CRITICAL-1).

---

## 7. Permissions

**Une seule permission gouverne tout le périmètre : `audit:modifier`.**

| Permission | Détenteurs (base) |
|---|---|
| `audit:modifier` | `SUPER_ADMIN`, `ADMIN_AUDIT` (INACTIF), `RESPONSABLE_ENTREPRISE` |
| `audit:creer` | mêmes |
| `evaluation:valider` | `SUPER_ADMIN` seul (V70) |

`audit:modifier` est **retirée en formule `FREE`** (`RESTRICTIONS_PAR_PLAN`),
côté Java comme côté frontend.

Aucune permission distincte n'existe pour : créer un plan, l'activer, le
clôturer, affecter un responsable, terminer une action. Tous ces gestes sont
indifférenciés sous `audit:modifier`.

---

## 8. Frontend

| Fichier | Ce qu'il manipule réellement |
|---|---|
| `pages/PlanActions.jsx` | **`ActionCorrective` uniquement** — malgré son nom |
| `components/audit/VoletPlanAction.jsx` | `NonConforme` → crée des `ActionCorrective` |
| `pages/NonConformites.jsx` | `NonConforme` + `ActionCorrective` (statut) |
| `components/audit/AxesAmelioration.jsx` | `axes-amelioration` (5.8.4) |
| `pages/AuditDetail.jsx` | intègre `VoletPlanAction` |
| `App.jsx` | routes `plan-actions`, `non-conformites` |

**Vérification demandée — confirmée** : `PlanActions.jsx` n'appelle que
`…/non-conformites/{id}/actions`. **Zéro occurrence de `plans-action` dans tout
`frontend-react/src`.**

L'écran nommé « Plan d'actions correctives » est donc un écran de suivi des
actions correctives, sans rapport avec `plan_action`. **Non corrigé.**

---

## 9. Décisions D9 → D40

### D9 — Qui peut créer un plan ?

- **Constat** : `POST /plans-action` exige `audit:modifier` → `SUPER_ADMIN` et
  `RESPONSABLE_ENTREPRISE` (`ADMIN_AUDIT` inactif). Retirée en `FREE`.
- **Options** : A SUPER_ADMIN seul · B RESPONSABLE seul · **C les deux** · D autre.
- **Recommandation : C**, l'état actuel. Un plan d'amélioration est un
  engagement de l'entreprise sur elle-même ; le responsable doit pouvoir le
  créer. Aucune permission nouvelle n'est nécessaire.
- **Impact** : nul, l'implémentation conserverait le contrôle existant.
- **Décision : ouverte, recommandation C.**

### D10 — Périmètre d'un plan

- **Constat, démontré** : `plan_action.audit_id` est `NOT NULL` avec CASCADE.
  Le plan appartient à **un audit**, pas à une entreprise ni à un axe.
  L'entreprise est atteinte par `audit.entreprise_id`.
- **Hiérarchie réelle** : `Entreprise → Audit → PlanAction → ActionPlan`.
  L'objectif visé par la consigne est **déjà celui du schéma**.
- **Décision : confirmée par le schéma, aucun arbitrage nécessaire.**

### D11 — Un plan peut-il regrouper plusieurs axes ?

- **Constat** : **aucune FK directe `plan_action ↔ axe_amelioration`**. Le seul
  chemin est `axe ← action_axe → action_plan → plan_action`. Un plan « traite »
  un axe uniquement parce qu'une de ses actions le vise.
- **Options** : A 1→1 · **B 1 plan → N axes** · C N→N.
- **Recommandation : B, déjà atteignable sans migration** — via les actions.
  Conséquence à assumer : un plan sans action n'est rattaché à aucun axe.
- **Décision : ouverte, recommandation B.**

### D12 — Un axe peut-il être dans plusieurs plans ?

- **Constat** : oui, structurellement. La PK `(action_plan_id, axe_amelioration_id)`
  n'interdit que le doublon sur **la même action**. Deux actions de deux plans
  différents peuvent viser le même axe.
- **Conséquences** : progression ambiguë (quel plan porte l'avancement de
  l'axe ?), responsabilité diffuse, clôture non déterminée.
- **Recommandation** : autoriser, mais **ne jamais dériver le statut d'un axe
  de celui des plans** — l'axe garde son cycle propre (`PROPOSE`/`VALIDE`/
  `REJETE`), déjà figé en 5.8.4.
- **Décision : ouverte.**

### D13 — Quand un plan est-il créé ?

- **Constat** : `plan_action.origine` vaut `HUMAIN` par défaut et **aucun code
  n'écrit jamais `IA`**. La colonne est décorative.
- **Options** : A automatique après validation d'axe · **B manuelle** ·
  C proposée par l'IA, validée humainement · D autre.
- **Recommandation : B.** L'IA propose une orientation ; un plan est un
  engagement organisationnel (responsable, échéance, budget implicite) qu'une
  machine n'a pas à prendre. Cohérent avec la ligne tenue depuis 5.7-C.
- **Décision : ouverte, recommandation B.**

### D14 — Qui crée une action ?

- **Constat** : `POST /{planId}/actions` exige `audit:modifier`. Le
  collaborateur ne peut pas créer d'action.
- **Recommandation** : conserver `audit:modifier`. Créer une action, c'est
  engager du travail ; l'exécuter, c'est autre chose (voir D21).
- **Attention** : `ActionPlan` ≠ `ActionCorrective`. Le frontend actuel ne
  crée que des `ActionCorrective` — la confusion de nommage est réelle
  (MAJEUR-2).
- **Décision : ouverte.**

### D15 — Qui est responsable d'une action ?

- **Constat, démontré** : `action_plan.responsable_id` → `utilisateur`
  `ON DELETE SET NULL`. C'est un **utilisateur**, pas un rôle ni une entité
  métier distincte.
- **Recommandation** : conserver. Ne pas inventer d'entité « responsable ».
- **Anomalie grave relevée** : voir MAJEUR-4 — aucun contrôle ne vérifie que
  ce responsable appartient à l'entreprise.
- **Décision : structure confirmée, garde à ajouter.**

### D16 — Un responsable peut-il être changé ?

- **Constat** : pour un **plan**, oui — `PUT /{planId}` réaffecte
  `responsable_id`. Pour une **action**, **non** : aucune route ne l'expose.
- **Recommandation** : oui, sous `audit:modifier`, **avec journalisation de
  l'ancien et du nouveau**. Aucun historique n'est conservé aujourd'hui (le
  journal n'enregistre jamais la valeur antérieure).
- **Décision : ouverte.**

### D17 — Statut du plan

- **Constat** : `statut_plan` = `BROUILLON` / `ACTIF` / `CLOTURE`, déjà en
  base. **Aucune valeur jamais utilisée** (0 ligne).
- **Recommandation** : **réutiliser l'enum existant tel quel**. La séquence
  proposée par la consigne (`BROUILLON → ACTIF → TERMINE` + `ANNULE`) demande
  deux valeurs nouvelles ; `CLOTURE` couvre déjà `TERMINE`. Pour `ANNULE`,
  voir D26 — un plan annulé peut rester `CLOTURE` avec un motif, ce qui évite
  une migration d'enum.
- **Décision : ouverte. Ne pas créer d'enum sans arbitrage explicite.**

### D18 — Statut d'une action

- **Constat** : `action_plan.statut` réutilise `statut_action_corrective` =
  `OUVERTE` / `EN_COURS` / `TERMINEE` / `VALIDEE`.
- **Analyse de la proposition** (`A_FAIRE`/`EN_COURS`/`BLOQUEE`/`TERMINEE`/
  `ANNULEE`) : `OUVERTE` ≡ `A_FAIRE`, `EN_COURS` et `TERMINEE` existent.
  **Manquent réellement `BLOQUEE` et `ANNULEE`** ; en revanche `VALIDEE`
  existe et n'a pas d'équivalent dans la proposition — c'est précisément ce
  qui permet le double temps de D21.
- **Recommandation** : conserver l'enum existant. `BLOQUEE` et `ANNULEE`
  relèvent d'une migration à décider séparément (MIGRATION FUTURE M-B).
- **Décision : ouverte.**

### D19 — Progression

- **Constat, vérifié par requête** : **aucune colonne de progression** sur
  aucune des quatre tables, ni dans les entités.
- **Options** : A dérivée des actions · B saisie · C les deux.
- **Recommandation : A, calculée à la lecture**, sans colonne. Le précédent
  RG26 (5.8.2) a montré qu'un indicateur dérivé calculé au moment de la
  restitution ne peut pas diverger de ses entrées, contrairement à une valeur
  persistée. Une progression saisie à la main entrerait en contradiction avec
  le décompte des actions dès la première divergence.
- **Impact : aucune migration.**
- **Décision : ouverte, recommandation A.**

### D20 — Échéance

- **Constat** : `date_echeance` (date) existe sur le plan **et** sur l'action.
  Aucune `date_debut`, aucune `date_fin_reelle`. Aucun CHECK ne lie les deux.
- **Recommandation** : une action **peut** dépasser l'échéance du plan — la
  base le permet et l'interdire par contrainte figerait des situations
  réelles. Traiter le dépassement comme **signal visuel**, jamais comme
  changement de statut automatique : un statut qui bouge sans geste humain
  n'est plus opposable. `PlanActions.jsx` applique déjà ce principe
  (`estEnRetard` est purement visuel).
- **Décision : ouverte, recommandation « signal visuel ».**

### D21 — Clôture d'une action

- **Constat** : aucune route ne permet de changer le statut d'une
  `ActionPlan`. La question ne se pose donc pas encore techniquement.
- **Recommandation** : exploiter l'enum existant en **deux temps** —
  `TERMINEE` posé par l'exécutant, `VALIDEE` posé par le responsable. C'est
  exactement ce que la quatrième valeur de `statut_action_corrective` permet,
  et cela reproduit la logique déjà retenue pour les évaluations
  (`EN_REVUE` → `VALIDEE`) et les axes (`PROPOSE` → `VALIDE`).
- **Décision : ouverte, recommandation « deux temps ».**

### D22 — Clôture d'un plan

- **Constat** : `PUT /{planId}/statut` accepte **n'importe quelle transition**,
  sans vérifier l'état des actions.
- **Options** : A non · **B oui avec justification** · C SUPER_ADMIN seul.
- **Recommandation : B.** Un plan abandonné en cours de route est une réalité
  d'audit ; le refuser pousserait à clôturer les actions en bloc pour
  contourner. La justification laisse une trace lisible — même motif que le
  `motif_rejet` obligatoire sur un axe.
- **Réserve** : aucune colonne de motif n'existe sur `plan_action`
  (MIGRATION FUTURE M-C).
- **Décision : ouverte.**

### D23 — Action sans axe

- **Constat, démontré** : **oui, structurellement autorisé.** `action_axe` est
  une table de liaison ; rien n'impose au moins une ligne. Seul
  `plan_action_id` est `NOT NULL`.
- **Recommandation** : conserver. Une action d'organisation (« réunir le
  comité ») peut appartenir à un plan sans viser un axe précis. La règle
  « une action appartient à un plan » est déjà tenue par la base.
- **Décision : confirmée par le schéma.**

### D24 — Plan sans action

- **Constat** : oui, autorisé. Aucune contrainte.
- **Recommandation** : autoriser en `BROUILLON`, **refuser le passage à
  `ACTIF`** si le plan n'a aucune action — contrôle applicatif, pas une
  contrainte de base (un CHECK ne peut pas compter des lignes d'une autre
  table).
- **Décision : ouverte.**

### D25 — Modification d'un plan

- **Constat** : `PUT /{planId}` modifie titre, description, échéance,
  responsable — **sans vérifier le statut**. Un plan `CLOTURE` reste modifiable.
- **Recommandation** : geler la modification après clôture, sauf pour
  `SUPER_ADMIN`. Les axes rattachés ne se modifient que par les actions
  (D11).
- **Décision : ouverte.**

### D26 — Suppression

- **Constat, démontré** : **aucun `@DELETE` n'existe** sur plan, action ou axe.
  Rien n'est supprimable par l'API aujourd'hui.
- **Options** : A suppression physique · B annulation · **C archivage/statut**.
- **Recommandation : C**, cohérent avec toute la ligne du projet — une
  non-conformité conforme est `CLOTUREE` et non supprimée, un axe rejeté est
  conservé avec son motif. La suppression physique détruirait de surcroît les
  actions par CASCADE.
- **Décision : ouverte, recommandation C.**

### D27 — Historique

- **Constat** : 8 événements codés, **2 seulement écrits** en base.
  `PLAN_ACTION_MODIFIE` recouvre **trois gestes distincts** (modification,
  changement de statut, ajout d'action). **Aucun événement n'enregistre la
  valeur antérieure.** Il n'existe **aucun événement `ACTION_PLAN_*`**.
- **Recommandation** : événements distincts pour création, modification,
  changement de statut (avec ancien → nouveau dans `details`), affectation,
  clôture, annulation. La colonne `audit_log.details` existe déjà et est
  prévue pour cela — aucune migration.
- **Décision : ouverte.**

### D28 — Collaborateur

- **Constat** : le collaborateur **voit tous les plans et toutes les actions**
  de la mission (`exigerAccesEntreprise` seul). Aucune notion d'affectation
  n'est exploitée : `responsable_id` existe mais n'est **jamais** un critère
  de filtrage (gap G5 de 5.8.4, confirmé).
- **Recommandation** : `COLLABORATEUR` → voit le plan et **toutes** les actions
  en lecture (le plan est un objet collectif ; masquer les actions des autres
  rendrait la progression incompréhensible), **agit uniquement sur celles qui
  lui sont affectées**. Jamais de raisonnement IA — D1 s'applique, et le DTO
  d'axe ne le porte déjà pas.
- **Nuance par rapport à la recommandation initiale de la consigne** :
  restreindre la **lecture** aux seules actions affectées casserait la lecture
  d'un plan ; c'est l'**écriture** qu'il faut restreindre.
- **Décision : ouverte — décision structurante, à trancher explicitement.**

### D29 — Responsable entreprise

- **Recommandation** : visibilité complète sur son entreprise (plans, axes,
  actions, responsables, échéances, progression), et droit de clôture. C'est
  déjà l'état actuel via `audit:modifier`.
- **Décision : confirmée par l'existant.**

### D30 — SUPER_ADMIN

- **Constat** : `estAccesGlobalActif` court-circuite tous les contrôles.
  SUPER_ADMIN voit et modifie tout, sur toutes les entreprises.
- **Recommandation** : ne rien élargir. C'est déjà maximal.
- **Décision : confirmée.**

### D31 — Axe rejeté relié à un plan

- **Constat** : `PlanActionResource.ajouterAction` **refuse déjà** tout axe dont
  le statut n'est pas `VALIDE` (409). La règle est tenue **en Java uniquement** :
  aucun CHECK sur `action_axe`, un `INSERT` direct passerait.
- **Recommandation** : non, confirmé. Envisager un trigger ou une contrainte
  (MIGRATION FUTURE M-A) si la garantie structurelle est jugée nécessaire.
- **Décision : confirmée, garantie à renforcer.**

### D32 — Axe validé obligatoire pour créer un plan ?

- **Constat** : **non.** `POST /plans-action` ne demande aucun axe. Un plan
  peut naître vide et le rester.
- **Recommandation** : ne pas l'imposer. Un plan est un contenant ; exiger un
  axe à la création empêcherait de préparer le plan avant l'arbitrage des axes.
  La contrainte utile est celle de D24 (pas d'activation à vide).
- **Décision : ouverte, recommandation « non obligatoire ».**

### D33 — Duplication des plans

- **Constat** : **aucune contrainte.** Rien n'empêche deux plans de même titre,
  mêmes axes, mêmes actions sur la même mission. Aucun index unique sur
  `plan_action`.
- **Recommandation** : pas de déduplication automatique. Un plan est un acte
  humain délibéré, contrairement à un axe produit en série par l'IA — le
  raisonnement de D17 (5.8.4) ne s'y transpose pas.
- **Décision : ouverte, recommandation « ne rien créer ».**

### D34 — Duplication des actions

- **Constat** : deux actions identiques dans le même plan sont possibles.
  Seule la PK de `action_axe` empêche le double rattachement du même axe à la
  **même** action.
- **Recommandation** : aucune déduplication sémantique (règle constante du
  projet). Au plus un avertissement d'interface.
- **Décision : ouverte.**

### D35 — Différence entre axe, plan et action

Définition métier à retenir, **cohérente avec le schéma observé** :

```text
AXE      = l'amélioration à atteindre      → rattaché au référentiel
           (exigence / preuve / règle), issu de l'IA ou d'un humain,
           soumis à validation humaine

PLAN     = l'organisation de cette amélioration dans le temps
           → appartient à UN audit, porte un responsable et une échéance

ACTION   = la tâche concrète à réaliser
           → appartient à UN plan (NOT NULL), vise 0..N axes
```

**Décision : à acter formellement.** Cette distinction est aujourd'hui portée
par les commentaires de code, pas par un document métier.

### D36 — Relation avec l'IA

- **Constat** : `plan_action.origine` accepte `IA` mais **aucun code ne l'écrit
  jamais**. L'IA ne produit que des axes, via `pistes_amelioration` →
  `actions[]` de la recommandation.
- **Recommandation : NON en V1**, conformément à la consigne. L'IA propose une
  orientation ; l'humain l'organise. Conséquence : `plan_action.origine` reste
  décoratif — soit l'assumer, soit envisager son retrait (MINEUR).
- **Décision : recommandation NON, à acter.**

### D37 — Relation avec les risques

- **Constat** : **aucune relation** entre `plan_action` et le risque RG26, le
  signal IA ou une non-conformité. Le seul lien indirect est
  `plan → audit → audit_critere → evaluation`.
- **Recommandation** : ne rien créer. Le rattachement passe déjà par l'axe, qui
  pointe l'évaluation. Ajouter une FK dupliquerait un chemin existant.
- **Décision : cartographie seule, aucune relation créée.**

### D38 — Relation avec les preuves

- **Constat** : **aucune relation** entre `action_plan` et `preuve`,
  `preuve_attendue` ou `document`. En revanche l'**axe** porte déjà
  `preuve_attendue_id`.
- **Besoin futur identifié** : rattacher la preuve **produite** par une action
  terminée (« la politique a été signée → voici le document »). Ce serait une
  table de liaison nouvelle, non une colonne.
- **Décision : besoin documenté, rien créé** (MIGRATION FUTURE M-D).

### D39 — Multi-tenant et IDOR

Chaînes vérifiées dans le code :

| Chemin | Contrôle | Verdict |
|---|---|---|
| Plan de B via mission de A | `parIdEtAudit(planId, auditId)` | **couvert** |
| Action de B via plan de A | `parIdEtAudit(id, auditId)` remonte par `plan.audit.id` | **couvert** |
| Axe de B rattaché à une action de A | `axeRepository.parIdEtAudit(axeId, auditId)` | **couvert**, testé en 5.8.4 |
| Lecture d'une mission d'une autre entreprise | `exigerAccesEntreprise` | **couvert** |
| **Affectation d'un responsable d'une autre entreprise** | **aucun** | **FAILLE — MAJEUR-4** |

**MAJEUR-4, détaillé** : `PlanActionResource` (lignes 110-112, 137-138,
199-201) résout `responsableId` par `utilisateurRepository.findById(...)`
**sans vérifier le rattachement à l'entreprise**. Un `RESPONSABLE_ENTREPRISE`
de A peut affecter un plan ou une action à un utilisateur de B, dont
l'identité serait ensuite restituée. `ActionCorrectiveResource` a le même
défaut, atténué : il vérifie au moins l'existence et rend 400 sinon.

**Second défaut** : `PlanActionResource` ne teste pas la nullité du résultat —
un `responsableId` inexistant produit `setResponsable(null)` **silencieusement**,
sans erreur, alors qu'`ActionCorrectiveResource` rend 400. Deux comportements
pour le même geste.

**Non corrigé**, conformément à la règle de la phase.

### D40 — Version du référentiel

- **Constat, vérifié** : ni `plan_action` ni `action_plan` ne portent
  `referentiel_version_id`. Le rattachement indirect existe :
  `plan → audit → referentiel_version`.
- **Recommandation** : **suffisant, ne rien ajouter.** Un plan n'est pas un
  objet de référentiel ; c'est l'**axe** qui vise un élément versionné, et
  5.8.4 a posé la garde de version à cet endroit précis. Dupliquer la colonne
  créerait deux sources de vérité.
- **Décision : rattachement indirect confirmé suffisant.**

---

## 10. Architecture cible proposée

**Aucune refonte.** Le modèle existant répond à la vision ; ce qui manque, ce
sont des routes, un service et des gardes — pas des tables.

```text
  Evaluation IA V2
        ↓
  pistes_amelioration  ──────────────┐
        ↓                            │ (texte libre, reste sur l'évaluation)
  AxeAmelioration  PROPOSE           │
        ↓ validation humaine (5.8.4) │
  AxeAmelioration  VALIDE ───────────┘
        ↓
   [geste humain : création du plan]
        ↓
  PlanAction (BROUILLON)  ── audit_id NOT NULL, CASCADE
        ↓ ajout d'actions
  ActionPlan  ── plan_action_id NOT NULL, CASCADE
        ↓ rattachement 0..N axes VALIDE
  action_axe (PK composite)
        ↓ affectation responsable + échéance
  ActionPlan (OUVERTE → EN_COURS → TERMINEE → VALIDEE)
        ↓ toutes actions VALIDEE, ou clôture motivée
  PlanAction (ACTIF → CLOTURE)

  ── chaîne parallèle, jamais fusionnée ──

  Evaluation VALIDEE (note < 5)
        ↓ RG17
  NonConforme  ── evaluation_id NOT NULL
        ↓
  ActionCorrective  ── non_conforme_id NOT NULL
```

**Ce qui manque pour l'atteindre, par ordre :**

1. un `PlanActionService` (aucune règle métier ne doit rester dans la
   ressource — c'est la leçon de 5.8.4) ;
2. les routes absentes sur `ActionPlan` (statut, responsable, modification) ;
3. la garde de tenant sur l'affectation d'un responsable (MAJEUR-4) ;
4. le contrôle des transitions de statut (plan et action) ;
5. la progression dérivée, calculée à la lecture ;
6. les événements de journal distincts, avec valeur antérieure ;
7. l'écran, et la clarification du nom `PlanActions.jsx`.

**Aucune migration n'est nécessaire pour les points 1 à 7.**

---

## 11. Matrice RBAC recommandée

| Opération | SUPER_ADMIN | RESPONSABLE_ENTREPRISE | COLLABORATEUR |
|---|---|---|---|
| Voir plan | oui | oui | **oui** (objet collectif) |
| Créer plan | oui | oui | non |
| Modifier plan | oui | oui (sauf si `CLOTURE`) | non |
| Supprimer / annuler plan | oui | oui (statut, motivé) | non |
| Voir action | oui | oui | **oui** (toutes, en lecture) |
| Créer action | oui | oui | non |
| Modifier action | oui | oui | **non** |
| Changer responsable | oui | oui | non |
| Changer statut | oui | oui | **oui, sur ses actions seulement** |
| Terminer action | oui | oui | **oui → `TERMINEE`** (pas `VALIDEE`) |
| Clôturer plan | oui | oui | non |
| Voir historique | oui | oui | non |

Deux points justifient d'être soulignés :

- **le collaborateur lit tout, n'écrit que sur ses actions** — restreindre sa
  lecture rendrait la progression du plan illisible ;
- **`TERMINEE` ≠ `VALIDEE`** — l'exécutant déclare avoir fait, le responsable
  constate. L'enum existant le permet déjà, sans migration.

Toutes ces opérations tiennent sous `audit:modifier` **sauf** « changer le
statut de ses propres actions », qui demanderait soit une permission nouvelle,
soit un contrôle applicatif sur `responsable_id = utilisateur courant`. **Le
second est recommandé** — pas de permission nouvelle.

---

## 12. Matrice des objets

| Objet | Finalité | Parent | Créé par | Modifiable par | Statut |
|---|---|---|---|---|---|
| `AxeAmelioration` | l'amélioration à atteindre | `audit` (+ `audit_critere`, `evaluation`) | IA (pipeline V2) ou humain | décision unique et définitive (5.8.4) | `PROPOSE` → `VALIDE` \| `REJETE` |
| `PlanAction` | l'organisation dans le temps | `audit` **NOT NULL** | humain uniquement (D13) | `audit:modifier` | `BROUILLON` → `ACTIF` → `CLOTURE` |
| `ActionPlan` | la tâche concrète | `plan_action` **NOT NULL** | humain | `audit:modifier` (+ exécutant sur le statut) | `OUVERTE` → `EN_COURS` → `TERMINEE` → `VALIDEE` |
| `ActionCorrective` | la correction d'un écart constaté | `non_conforme` **NOT NULL** | humain | `audit:modifier` | mêmes valeurs, cycle indépendant |

---

## 13. Transitions

### Plan — état actuel

```text
BROUILLON ⇄ ACTIF ⇄ CLOTURE      (toutes transitions libres)
```

`PUT /{planId}/statut` n'effectue **qu'une** vérification : que la valeur
existe dans l'enum. `CLOTURE → BROUILLON` est accepté. Aucun journal ne
distingue ce geste d'une modification de titre.

### Plan — cible recommandée

```text
BROUILLON ──→ ACTIF ──→ CLOTURE
     ↑                      │
     └──────────────────────┘  refusé (décision définitive, motivée)
```

Condition d'activation : au moins une action (D24).

### Action — état actuel

**Aucune transition possible** : la route n'existe pas. L'action est créée
`OUVERTE` et le reste.

### Action — cible recommandée

```text
OUVERTE ──→ EN_COURS ──→ TERMINEE ──→ VALIDEE
   ↑            │             │
   └────────────┴─────────────┘   retour possible avant VALIDEE
                                   (VALIDEE = définitif)
```

### Synthèse des défauts de transition

| Défaut | Objet | Gravité |
|---|---|---|
| Toutes transitions libres | plan | MAJEUR-3 |
| Aucune transition possible | action | CRITICAL-1 |
| Aucun journal de changement de statut | action | MAJEUR-5 |
| `PLAN_ACTION_MODIFIE` pour 3 gestes | plan | MOYEN-1 |
| Valeur antérieure jamais consignée | les deux | MOYEN-2 |

---

## 14. Risques d'architecture

### CRITICAL

**CRITICAL-1 — Une action de plan est créée puis figée.**
*Constat* : seule `POST /{planId}/actions` existe. Aucune route pour modifier,
changer le statut, réaffecter ou retirer une action.
*Impact* : le modèle de planification est inutilisable en l'état — on peut
créer un plan et des actions, jamais les faire vivre. C'est ce qui explique
qu'il soit à 0 ligne depuis son introduction.
*Décision nécessaire* : D14, D16, D18, D21.
*Recommandation* : c'est le premier chantier de l'implémentation.

### MAJEUR

**MAJEUR-1 — Aucun service métier pour les plans.**
Toute la règle vit dans `PlanActionResource`. L'asymétrie avec
`AxeAmeliorationService` (5.8.4) garantit que les règles divergeront.
*Recommandation* : créer `PlanActionService` **avant** d'ajouter des routes.

**MAJEUR-2 — `PlanActions.jsx` manipule `ActionCorrective`.**
L'écran nommé « Plan d'actions » n'a aucun rapport avec `plan_action`. Zéro
appel à `plans-action` dans tout le frontend.
*Impact* : à l'arrivée du vrai module, deux écrans porteront le même nom.
*Décision nécessaire* : renommer l'existant, ou nommer différemment le nouveau.

**MAJEUR-3 — Transitions de statut de plan entièrement libres.**
`CLOTURE → BROUILLON` accepté. Documenté en 5.8.3, toujours présent.

**MAJEUR-4 — Le responsable affecté n'est pas vérifié (faille de tenant).**
`PlanActionResource` affecte n'importe quel `utilisateur_id` sans contrôler son
rattachement à l'entreprise. Un responsable de A peut affecter un plan à un
utilisateur de B. `ActionCorrectiveResource` partage le défaut.
*Second volet* : un identifiant inexistant produit `null` silencieusement dans
`PlanActionResource`, là où `ActionCorrectiveResource` rend 400.
*Impact* : écriture inter-tenant et restitution d'identités étrangères.
*Recommandation* : garde obligatoire à l'implémentation. **Non corrigé ici.**

**MAJEUR-5 — Aucun journal sur le cycle de vie d'une action.**
Il n'existe aucun événement `ACTION_PLAN_*`. L'ajout d'une action est
journalisé sous `PLAN_ACTION_MODIFIE`.

### MOYEN

**MOYEN-1 — `PLAN_ACTION_MODIFIE` recouvre trois gestes distincts.**

**MOYEN-2 — Aucun événement ne consigne la valeur antérieure.** La colonne
`audit_log.details` existe pourtant et est prévue pour cela.

**MOYEN-3 — Asymétrie des triggers `updated_at`.** Présent sur
`action_corrective`, absent sur `plan_action`, `action_plan`,
`axe_amelioration`. Une écriture SQL directe ne l'actualiserait pas.

**MOYEN-4 — N+1 sur `GET /plans-action`.** `1 + P + (P × A)` requêtes, faute de
`join fetch` dans `ActionPlanRepository`. Sans effet à 0 ligne.

**MOYEN-5 — Aucun contrôle d'activation à vide.** Un plan sans action peut
passer `ACTIF`.

### MINEUR

**MINEUR-1 — `plan_action.origine` jamais écrite autrement que par défaut.**

**MINEUR-2 — Trois méthodes de repository sans appelant** (`traitantLAxe`,
`validesParAudit`, `parEvaluation`).

**MINEUR-3 — Aucun `ordre` exposé en écriture.** `action_plan.ordre` est
calculé à la création (`size()`) et jamais modifiable — le réordonnancement est
impossible.

---

## 15. Migrations futures (aucune créée)

Aucun numéro n'est attribué : le prochain numéro réel dépendra des phases
intermédiaires.

**MIGRATION FUTURE M-A — garantir en base qu'un axe non validé n'est pas
planifiable.**
*Pourquoi* : la règle est aujourd'hui tenue en Java seulement ; un `INSERT`
direct dans `action_axe` la contourne.
*Table* : `action_axe`. *Forme* : trigger de vérification (un CHECK ne peut pas
lire une autre table). *Impact historique* : nul, 0 ligne.
*Nécessité* : **discutable** — à ne faire que si la garantie structurelle est
jugée indispensable.

**MIGRATION FUTURE M-B — statuts `BLOQUEE` / `ANNULEE` pour les actions.**
*Pourquoi* : seulement si D18 tranche en leur faveur.
*Table* : type `statut_action_corrective`. *Impact* : **partagé avec
`action_corrective`** — ajouter une valeur affecterait les deux modèles, donc
les 2 lignes existantes et tous les écrans correctifs. **Point d'attention
réel.**

**MIGRATION FUTURE M-C — motif de clôture d'un plan.**
*Pourquoi* : si D22 retient l'option B (clôture motivée).
*Table* : `plan_action`, colonne `motif_cloture text`. *Impact* : nul, 0 ligne.

**MIGRATION FUTURE M-D — preuve produite par une action.**
*Pourquoi* : besoin identifié en D38.
*Forme* : table de liaison `action_preuve`, jamais une colonne.
*Nécessité* : **non établie en V1.**

Aucune migration n'est nécessaire pour la majorité des décisions : le schéma
existant couvre le flux cible.

---

## 16. Tests obligatoires pour l'implémentation

### Isolation multi-tenant

1. plan de A inaccessible depuis B (404) ;
2. action de A inaccessible depuis B (404) ;
3. axe de B rattaché à une action de A refusé ;
4. **responsable d'une autre entreprise refusé** (couvre MAJEUR-4) ;
5. responsable inexistant → erreur explicite, pas un `null` silencieux.

### RBAC

6. SUPER_ADMIN : accès global ;
7. RESPONSABLE_ENTREPRISE : plans de son entreprise ;
8. COLLABORATEUR : lecture oui, création non (403) ;
9. COLLABORATEUR : statut de **ses** actions oui ;
10. COLLABORATEUR : statut d'une action d'autrui non (403) ;
11. formule `FREE` : `audit:modifier` refusée.

### Cycle de vie

12. création en `BROUILLON` ; 13. ajout d'action ; 14. activation ;
15. activation d'un plan vide refusée (D24) ;
16. `CLOTURE → BROUILLON` refusé (MAJEUR-3) ;
17. `VALIDEE → OUVERTE` refusé ;
18. clôture motivée.

### Affectation

19. action affectée à un collaborateur ; 20. changement de responsable
journalisé avec l'ancien ; 21. désaffectation.

### Progression

22. progression dérivée cohérente avec les actions ; 23. plan vide → 0 % sans
division par zéro.

### D1

24. **aucun champ de raisonnement IA dans les DTO de plan et d'action** —
assertion sur le corps HTTP entier, comme en 5.8.3 et 5.8.4 ;
25. le chemin `action → axe → evaluation` ne doit pas devenir un canal
indirect de restitution de la justification.

### Journal

26. création, 27. changement de statut avec ancien → nouveau, 28. affectation,
29. clôture.

---

## 17. Gaps (10, par gravité)

| # | Gravité | Gap |
|---|---|---|
| G1 | CRITICAL | Une action de plan est créée puis figée — aucune route de modification |
| G2 | MAJEUR | Aucun service métier pour les plans (asymétrie avec les axes) |
| G3 | MAJEUR | Le responsable affecté n'est pas vérifié — écriture inter-tenant possible |
| G4 | MAJEUR | `PlanActions.jsx` manipule `ActionCorrective` — collision de nom à venir |
| G5 | MAJEUR | Transitions de statut de plan entièrement libres |
| G6 | MAJEUR | Aucun événement de journal pour le cycle de vie d'une action |
| G7 | MOYEN | Aucun journal ne consigne la valeur antérieure |
| G8 | MOYEN | Asymétrie des triggers `updated_at` |
| G9 | MOYEN | N+1 sur la liste des plans |
| G10 | MINEUR | `ordre` non modifiable — réordonnancement impossible |

---

## 18. Décisions encore bloquantes

Trois décisions commandent l'implémentation et doivent être tranchées avant :

1. **D28 — visibilité du collaborateur.** Structurante : elle détermine les
   DTO, les filtres de repository et les tests. La recommandation (lire tout,
   écrire sur les siennes) **diverge** de la proposition initiale de la
   consigne.
2. **D18 / M-B — faut-il `BLOQUEE` et `ANNULEE` ?** L'enum est **partagé** avec
   `action_corrective` : toute valeur ajoutée affecte les deux modèles.
3. **G4 / MAJEUR-2 — nommage.** Deux écrans « Plan d'actions » ne peuvent pas
   coexister ; il faut décider lequel est renommé avant d'en construire un
   second.

Les autres décisions ont une recommandation argumentée et n'empêchent pas de
démarrer.

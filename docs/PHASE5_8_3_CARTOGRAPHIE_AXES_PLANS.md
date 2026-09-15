# PHASE 5.8.3 — Cartographie : axes d'amélioration & plans d'action

**Mode : CARTOGRAPHIE UNIQUEMENT.** Aucune implémentation, aucune migration,
aucune correction. Le seul fichier créé est celui-ci.

**Date de relevé : 2026-09-11.** Tous les chiffres de ce document ont été
relevés ce jour sur la base `smartex_sustway` du conteneur `smartex-postgres`.
Ils ne sont pas repris d'une cartographie antérieure.

**Convention.** Ce qui n'a pas été observé directement est marqué
`NON DÉMONTRÉ DANS L'EXISTANT` ou `À CONFIRMER`. Rien n'est déduit d'un nom
de fichier ou d'un commentaire.

---

## 1. Périmètre inspecté

| Élément | Compte |
|---|---|
| Tables de base inspectées | 17 |
| Endpoints REST inspectés | 25, répartis sur 6 ressources |
| Composants / pages frontend inspectés | 7 |
| DTO inspectés | 6 |
| Entités JPA inspectées | 4 |
| Repositories inspectés | 4 |
| Services métier inspectés | 3 |
| Classes de test inspectées | 1 (`AxesEtPlansTest`, 16 cas) |

Tables : `axe_amelioration`, `plan_action`, `action_plan`, `action_axe`,
`action_corrective`, `non_conforme`, `evaluation`, `evaluation_preuve`,
`evaluation_constat`, `evaluation_document_analyse`, `analyse_document_constat`,
`analyse_ia`, `execution_agent`, `exigence`, `preuve_attendue`, `regle_analyse`,
`document`. Existence vérifiée pour `score_historique`, `risque_evaluation`,
`score_audit`.

---

## 2. Schéma réel — `axe_amelioration`

21 colonnes.

| Colonne | Type | Null | Défaut |
|---|---|---|---|
| `id` | uuid | NON | `gen_random_uuid()` |
| `audit_id` | uuid | NON | — |
| `audit_critere_id` | uuid | oui | — |
| `evaluation_id` | uuid | oui | — |
| `libelle` | varchar | NON | — |
| `description` | text | oui | — |
| `origine` | `origine_axe` | NON | — |
| `origine_initiale` | `origine_axe` | oui | — |
| `niveau_rattachement` | `niveau_rattachement` | oui | — |
| `exigence_id` | uuid | oui | — |
| `preuve_attendue_id` | uuid | oui | — |
| `regle_analyse_id` | uuid | oui | — |
| `statut` | `statut_axe` | NON | `'PROPOSE'` |
| `validee_par` / `validee_le` | uuid / timestamptz | oui | — |
| `rejetee_par` / `rejetee_le` | uuid / timestamptz | oui | — |
| `motif_rejet` | text | oui | — |
| `created_by` | uuid | oui | — |
| `created_at` | timestamptz | NON | `now()` |
| `updated_at` | timestamptz | oui | — |

**Quatre CHECK, tous portants :**

- `axe_cible_coherente` — le niveau de rattachement et la cible vont ensemble :
  soit les quatre colonnes sont nulles, soit exactement une cible est posée et
  correspond au niveau déclaré. Un axe ne peut donc pas prétendre viser une
  exigence tout en pointant une preuve attendue.
- `axe_validation_coherente` — `statut = VALIDE` **si et seulement si**
  `validee_par IS NOT NULL`. Équivalence stricte : un axe validé a un
  validateur, et un validateur implique un axe validé.
- `axe_rejet_coherent` — même équivalence pour `REJETE` / `rejetee_par`.
- `axe_rejet_motive` — un rejet exige un `motif_rejet` non vide après `btrim`.

**Huit clés étrangères.** `audit_id` en `ON DELETE CASCADE` ; toutes les autres
(`audit_critere_id`, `evaluation_id`, `exigence_id`, `preuve_attendue_id`,
`regle_analyse_id`, `validee_par`, `rejetee_par`, `created_by`) en
`ON DELETE SET NULL`. Conséquence observable : la suppression d'une mission
emporte ses axes, mais la suppression d'une évaluation laisse l'axe orphelin de
sa source — voir §20, écart MAJEUR-2.

**Index :** `axe_audit_statut_idx (audit_id, statut)`,
`axe_audit_critere_idx (audit_critere_id) WHERE NOT NULL`,
`axe_evaluation_idx (evaluation_id) WHERE NOT NULL`. Aucune contrainte
d'unicité métier — voir §20, écart MAJEUR-1.

---

## 3. Schéma réel — `plan_action`, `action_plan`, `action_axe`

**`plan_action`** (11 colonnes) : `id`, `audit_id` (NOT NULL, CASCADE), `titre`,
`description`, `statut` `statut_plan` défaut `'BROUILLON'`, `responsable_id`,
`date_echeance` (date), `origine` `origine_axe` défaut `'HUMAIN'`, `created_by`,
`created_at`, `updated_at`. Index `plan_action_audit_idx (audit_id, statut)`.
**Aucun CHECK.**

**`action_plan`** (11 colonnes) : `id`, `plan_action_id` (NOT NULL, CASCADE),
`titre`, `description`, `responsable_id`, `date_echeance`, `statut`
`statut_action_corrective` défaut `'OUVERTE'`, `priorite` `priorite_action`
défaut `'MOYENNE'`, `ordre` int défaut 0, `created_at`, `updated_at`. Index
`action_plan_plan_idx (plan_action_id, ordre)`. **Aucun CHECK.**

**`action_axe`** : table de liaison pure, deux colonnes, clé primaire composite
`(action_plan_id, axe_amelioration_id)`, les deux FK en CASCADE, index
secondaire `action_axe_axe_idx` pour le sens inverse. L'idempotence du
rattachement est portée par la clé primaire, pas par du code.

**Point de structure notable.** `action_plan` ne porte pas `audit_id`. Le
contrôle de tenant passe obligatoirement par `plan.audit.id`, ce que
`ActionPlanRepository.parIdEtAudit` fait explicitement. C'est un choix cohérent
avec le CASCADE, mais il rend le contrôle d'accès dépendant d'une jointure —
contrairement à `axe_amelioration` et `plan_action` qui portent la clé de tenant
en propre.

---

## 4. Schéma réel — `action_corrective` et `non_conforme`

**`action_corrective`** (10 colonnes) : `id`, `non_conforme_id` **NOT NULL**
(CASCADE), `titre`, `description`, `responsable_id`, `date_echeance`, `statut`
`statut_action_corrective` défaut `'OUVERTE'`, `priorite` `priorite_action`
défaut `'MOYENNE'`, `created_at`, `updated_at`. Index `idx_action_corrective_nc`.
**Aucun lien vers `axe_amelioration`, ni vers `plan_action`.**

**`non_conforme`** (11 colonnes) : `id`, `evaluation_id` **NOT NULL**, `titre`,
`description` (text), `niveau`, `risque_attendu` numeric, `statut`
`statut_non_conformite` défaut `'OUVERTE'`, `created_at`, `audit_critere_id`,
`courante` bool NOT NULL défaut `true`, `updated_at`.

Index notables, hérités de R1/5.7-C :
`non_conforme_courante_unique UNIQUE (audit_critere_id) WHERE courante` et
`non_conforme_critere_historique_idx (audit_critere_id, created_at DESC, id DESC)`.

---

## 5. Énumérations PostgreSQL réelles

| Type | Valeurs |
|---|---|
| `origine_axe` | `IA`, `HUMAIN` |
| `statut_axe` | `PROPOSE`, `VALIDE`, `REJETE` |
| `statut_plan` | `BROUILLON`, `ACTIF`, `CLOTURE` |
| `niveau_rattachement` | `EXIGENCE`, `PREUVE_ATTENDUE`, `REGLE` |
| `statut_action_corrective` | `OUVERTE`, `EN_COURS`, `TERMINEE`, `VALIDEE` |
| `priorite_action` | `BASSE`, `MOYENNE`, `HAUTE`, `CRITIQUE` |
| `niveau_criticite` | `FAIBLE`, `MOYENNE`, `ELEVEE`, `CRITIQUE` |

`action_plan` et `action_corrective` partagent `statut_action_corrective` et
`priorite_action` — un seul vocabulaire pour les deux familles d'actions.

---

## 6. Compteurs réels au 2026-09-11

| Table / mesure | Valeur |
|---|---|
| `axe_amelioration` | **4** |
| `plan_action` | **0** |
| `action_plan` | **0** |
| `action_axe` | **0** |
| `action_corrective` | **2** |
| `non_conforme` (total) | **39** |
| `non_conforme` courantes | **22** (toutes `OUVERTE`) |
| `evaluation` | **46** — 45 `VALIDEE`, 1 `EN_REVUE` |
| `evaluation` avec `pistes_amelioration` non vide | **23** |
| `evaluation` avec `recommandation_necessaire` | **23** |
| `analyse_ia` | **3** |
| `execution_agent` | **8** |
| `document` | **16** |
| `audit_log` `ACTION_CORRECTIVE_CREEE` | **3** |
| `audit_log` `ACTION_CORRECTIVE_STATUT_CHANGE` | **1** |
| `audit_log` `AXE_*` / `PLAN_ACTION_*` | **0** |

Les quatre axes : tous sur la même mission
`39764f70-ff80-4afe-8b50-197fd575e14f`, tous `origine = IA`,
`origine_initiale = IA`, `statut = PROPOSE`, tous rattachés à un critère **et**
à une évaluation, `created_by` nul (création machine). Deux au niveau `REGLE`,
deux au niveau `PREUVE_ATTENDUE`. Créés lors de deux passes distinctes
(2026-09-10 23:48 et 2026-09-11 09:58), deux axes chacune.

**Aucun axe validé, aucun axe rejeté, aucun axe d'origine humaine.** Les
chemins `valider`, `rejeter` et `saisiParHumain` n'ont donc jamais été
empruntés en dehors des tests — voir §19.

Les deux actions correctives datent du 2026-09-07, sont `OUVERTE` / `HAUTE`,
portent le même titre `Traiter : Avez-vous défini et formalisé…` et sont
rattachées à deux non-conformités différentes. Trois créations sont pourtant
journalisées : une action a été créée puis a disparu avec sa non-conformité
(CASCADE) lors de la déduplication V68, ou n'a jamais été commitée.
`À CONFIRMER`.

---

## 7. Flux IA → axe d'amélioration

Chaîne complète, observée dans le code :

```
Recommendation Agent V2 (Python)
  → EnveloppeV2Dto.RecommandationDto { recommandation_necessaire,
                                       pistes_amelioration,
                                       actions[] { action, rattachement } }
  → PersistanceResultatV2Service.appliquerRecommandation()
        écrit evaluation.recommandation_necessaire + evaluation.pistes_amelioration
  → PersistanceResultatV2Service.persisterAxes()
        une ligne axe_amelioration par entrée de actions[]
```

Dans `persisterAxes` (`PersistanceResultatV2Service.java:377-400`) :

- l'axe est créé par `AxeAmelioration.proposeParIa(...)` — `origine = IA`,
  `origine_initiale = IA`, `statut = PROPOSE`, en dur dans la fabrique ;
  l'appelant ne peut pas les choisir ;
- le libellé est le texte brut `action.action()`, **tronqué à 255 caractères**
  par `tronquer(...)`, avec le repli `"Action recommandée"` si le texte est nul ;
- `description` n'est **jamais** renseignée sur les axes IA ;
- le rattachement est résolu contre le catalogue transmis (§9) ; s'il échoue,
  **l'axe est conservé sans rattachement** avec un `LOG.warnf`.

**Deux champs portent la même information sous deux formes.**
`evaluation.pistes_amelioration` est le texte libre global ;
`axe_amelioration` est le même conseil éclaté en lignes rattachables. Les deux
sont écrits dans la même transaction, à partir du même objet. Rien ne garantit
ni ne vérifie leur cohérence — voir §20, écart MAJEUR-3.

---

## 8. Flux axe → plan d'action

`PlanActionResource.ajouterAction` (`PlanActionResource.java:181-229`) :

1. `exigerAccesEntreprise` puis `exigerPermission(…, audit:modifier)` ;
2. le plan est résolu par `parIdEtAudit(planId, auditId)` ;
3. `ordre` = taille de la liste actuelle des actions du plan ;
4. pour chaque `axeId` reçu : résolution par `parIdEtAudit(axeId, auditId)`,
   puis **refus 409 si `statut != VALIDE`** ;
5. `action.rattacher(axe)` alimente `action_axe`.

La barrière « seul un axe validé est planifiable » est tenue **en Java
uniquement**. Aucune contrainte de base ne l'exprime : un `INSERT` direct dans
`action_axe` avec un axe `PROPOSE` réussirait. Voir §20, écart MOYEN-1.

**Ce flux n'a jamais tourné en production** : `action_axe` est à 0.

---

## 9. Résolution des rattachements règle / preuve / exigence

`PersistanceResultatV2Service.rattacher(...)` traite trois niveaux :

| Niveau annoncé | Résolution |
|---|---|
| `PREUVE_ATTENDUE` | `contexte.references().resoudre(ref)` — table de références construite pour la passe |
| `EXIGENCE` | `exigenceRepository.parCritereActives(critereId)` filtré sur `getCode()` |
| `REGLE` | `regleAnalyseRepository.parCritereActives(critereId)` filtré sur `getCode()` |
| autre | `return false` |

Deux propriétés vérifiées dans le code :

- la résolution est **retraduite en UUID contre le catalogue du critère** ; une
  référence inventée par le modèle ne peut pas produire de FK ;
- les exigences et règles ne sont cherchées que parmi les **actives** du
  critère : un axe ne peut pas viser une règle désactivée.

`AxeAmeliorationDto.reference(axe)` restitue le code métier (`exigence.getCode()`,
`preuveAttendue.getLibelle()`, `regleAnalyse.getCode()`) plutôt que l'UUID.
Note : pour une preuve attendue c'est le **libellé**, pas un code — asymétrie
d'affichage, sans effet fonctionnel. `À CONFIRMER` si c'est voulu.

---

## 10. Flux non-conformité → action corrective

Chaîne distincte, antérieure, toujours active :

```
Evaluation → VALIDEE (RG16)
  → NonConformiteService.genererSiNecessaire()
       note >= 5      → clôture de la NC courante, aucune création
       criticité nulle → rien (RG37 : pas de risque calculable)
       NC courante     → actualiserDepuis(...)
       sinon           → création
  → NonConforme.description = justification IA + "Pistes d'amélioration : …"
  → ActionCorrectiveResource.creer (geste humain)
       action_corrective.non_conforme_id NOT NULL
```

`NonConformiteService.description(...)` (`NonConformiteService.java:113-125`)
concatène **`evaluation.getJustification()`** puis, séparé par une ligne vide,
`"Pistes d'amélioration : " + evaluation.getPistesAmelioration()`.

**21 lignes de `non_conforme` contiennent aujourd'hui la chaîne
`Pistes d'amélioration`** — donc, pour celles-là, la justification interne de
l'IA recopiée en clair dans un champ exposé sans filtrage de rôle. C'est
l'écart CRITIQUE-1 du §20.

---

## 11. `ActionCorrective` vs `ActionPlan` — la distinction réelle

| | `ActionCorrective` | `ActionPlan` |
|---|---|---|
| Parent obligatoire | `non_conforme_id` NOT NULL | `plan_action_id` NOT NULL |
| Rattachement métier | 1 non-conformité | N axes via `action_axe` |
| Déclencheur amont | écart constaté, opposable | proposition d'amélioration |
| Porte `ordre` | non | oui |
| Clé de tenant | via `non_conforme → evaluation → audit_critere` | via `plan_action.audit_id` |
| Statuts / priorités | `statut_action_corrective`, `priorite_action` | **les mêmes** |
| Exposé au frontend | oui, largement | **non** |
| Lignes en base | 2 | 0 |
| Repris dans les rapports | oui (`genererPlanAction`) | non |

La justification donnée dans `ActionPlan.java:30-48` est explicite : loger une
action issue d'un axe dans `action_corrective` obligerait à fabriquer une
non-conformité fictive, donc à transformer une proposition en constat d'écart.

**Mais la conséquence n'a pas été tirée jusqu'au bout.** Le frontend appelle
« Plan d'actions correctives » un écran qui ne manipule que
`ActionCorrective`, et les deux familles coexistent sans qu'aucun écran ne
montre la seconde. Voir §12 et §20, écart CRITIQUE-2.

---

## 12. Réalité frontend

**Aucun composant frontend n'appelle `axes-amelioration` ni `plans-action`.**
Recherche exhaustive sur `frontend-react/src` : zéro occurrence.

Ce qui existe :

| Fichier | Ce qu'il manipule réellement |
|---|---|
| `pages/PlanActions.jsx` | `ActionCorrective` uniquement. Parcourt tous les audits → toutes les NC → les actions de chaque NC. Titre affiché : « Plan d'actions correctives ». |
| `components/audit/VoletPlanAction.jsx` | `NonConforme` groupées par domaine ; bouton « Créer l'action corrective » → `POST …/non-conformites/{id}/actions`. La description affichée est `nc.description` — donc le texte du §10. |
| `pages/NonConformites.jsx` | NC d'une mission |
| `pages/NonConformitesEntreprise.jsx` | NC transverses |
| `pages/CritereEvaluation.jsx:805` | affiche `evaluation.pistesAmelioration` |
| `components/audit/CarteAnalyseIa.jsx:132-138` | affiche `pistesAmelioration` |
| `components/audit/VoletAnalysesIa.jsx:103-109` | affiche `pistesAmelioration` en points |

Routes déclarées dans `App.jsx` : `:entrepriseId/plan-actions`,
`:entrepriseId/non-conformites`,
`:entrepriseId/audits/:auditId/non-conformites`. **Aucune route axes.**

`VoletPlanAction.jsx:26-28` documente lui-même le mécanisme : « les suggestions
proviennent des pistes d'amélioration produites par le pipeline d'agents et
recopiées dans la description de chaque non-conformité ». Le contournement
décrit au §10 est donc un comportement assumé de cet écran, antérieur à
l'existence de `axe_amelioration`.

---

## 13. Inventaire API

**`AxeAmeliorationResource`** — `/api/v1/entreprises/{e}/audits/{a}/axes-amelioration`

| Méthode | Chemin | Contrôle |
|---|---|---|
| GET | `/` (+ `?statut=`) | `exigerAccesEntreprise` seul |
| GET | `/{axeId}` | `exigerAccesEntreprise` seul |
| POST | `/` | + `exigerPermission(audit:modifier)` |
| POST | `/{axeId}/validation` | + `exigerPermission(audit:modifier)` |
| POST | `/{axeId}/rejet` | + `exigerPermission(audit:modifier)` |

**`PlanActionResource`** — `…/plans-action`

| Méthode | Chemin | Contrôle |
|---|---|---|
| GET | `/` | `exigerAccesEntreprise` seul |
| GET | `/{planId}` | `exigerAccesEntreprise` seul |
| POST | `/` | + `audit:modifier` |
| PUT | `/{planId}` | + `audit:modifier` |
| PUT | `/{planId}/statut` | + `audit:modifier` |
| POST | `/{planId}/actions` | + `audit:modifier` |

**`ActionCorrectiveResource`** — `…/non-conformites/{nc}/actions` : GET,
POST (`audit:modifier`), PUT `/{actionId}/statut` (`audit:modifier`).

**`NonConformeResource`** — `…/non-conformites` : GET, GET `/{id}`,
PUT `/{id}/statut` (`audit:modifier`).

**`EvaluationResource`** : GET `/`, POST `/`, POST `/v2`, GET `/{id}/detail`,
POST `/{id}/validation`.

**`RapportResource`** : GET `/`, POST `/` (type `PLAN_ACTION` → actions
correctives uniquement), GET `/{rapportId}/telechargement`.

**DTO.** `AxeAmeliorationDto` (17 champs + `CreationDto`, `RejetDto`),
`PlanActionDto` (10 champs + `ActionDto`, `CreationDto`, `StatutDto`,
`CreationActionDto`), `ActionCorrectiveDto`, `NonConformeDto`, `EvaluationDto`,
`DetailEvaluationV2Dto`.

**`DetailEvaluationV2Dto` ne contient aucun champ axe.** Le détail V2 livré en
5.8.1/5.8.2 expose preuves, constats, constats documentaires, risque métier et
signal IA — pas les axes produits par la même passe. Voir §20, MAJEUR-4.

---

## 14. Matrice des statuts

**Axe** — trois états, transitions réellement codées :

| Depuis \ Vers | `PROPOSE` | `VALIDE` | `REJETE` |
|---|---|---|---|
| (création IA ou humaine) | oui | non | non |
| `PROPOSE` | — | `POST /validation` | `POST /rejet` |
| `VALIDE` | non | 409 « déjà validé » | **oui** — `rejeter()` remet `validee_*` à null |
| `REJETE` | non | **oui** — `valider()` remet `rejetee_*` et `motif_rejet` à null | 409 « déjà rejeté » |

Aucun retour vers `PROPOSE` n'existe. Un aller-retour `VALIDE → REJETE → VALIDE`
est possible et **efface silencieusement le motif du rejet précédent** : les
méthodes `valider` et `rejeter` (`AxeAmelioration.java:206-223`) annulent
mutuellement les champs de l'autre décision. Aucune trace de l'état antérieur
n'est conservée hors `audit_log`. Voir §20, MAJEUR-5.

**Plan** — `BROUILLON` / `ACTIF` / `CLOTURE`. `PUT /{planId}/statut` accepte
**n'importe quelle transition**, y compris `CLOTURE → BROUILLON` ; la seule
validation est que la valeur existe dans l'énumération.

**Action (les deux familles)** — `OUVERTE` / `EN_COURS` / `TERMINEE` /
`VALIDEE`, transitions libres.

**Non-conformité** — `OUVERTE` / `CLOTUREE` (+ `courante` bool).

---

## 15. Permissions par rôle — état réel en base

Rôles et leur statut :

| Rôle | Statut en base |
|---|---|
| `SUPER_ADMIN` | ACTIF |
| `RESPONSABLE_ENTREPRISE` | ACTIF |
| `COLLABORATEUR` | ACTIF |
| `ADMIN_AUDIT` | **INACTIF** |
| `EMPLOYE` | INACTIF |
| `VISITEUR` | INACTIF |

Détention des permissions utiles :

| Permission | Rôles la portant |
|---|---|
| `audit:creer` | `SUPER_ADMIN`, `ADMIN_AUDIT`, `RESPONSABLE_ENTREPRISE` |
| `audit:modifier` | `SUPER_ADMIN`, `ADMIN_AUDIT`, `RESPONSABLE_ENTREPRISE` |
| `evaluation:valider` | `SUPER_ADMIN` **seul** (V70) |

Conséquence effective, `ADMIN_AUDIT` étant inactif :

| Geste | SUPER_ADMIN | RESPONSABLE_ENTREPRISE | COLLABORATEUR |
|---|---|---|---|
| Lire les axes | oui | oui | **oui** |
| Créer / valider / rejeter un axe | oui | oui | non (403) |
| Lire les plans | oui | oui | **oui** |
| Créer / modifier un plan, ajouter une action | oui | oui | non (403) |
| Lire les NC et actions correctives | oui | oui | **oui** |
| Créer une action corrective | oui | oui | non (403) |
| Valider une évaluation | oui | non | non |

`SUPER_ADMIN` et `ADMIN_AUDIT` court-circuitent tout via
`estAccesGlobalActif` (`AutorisationService.java:98-101`). Le plan souscrit
n'entre pas en jeu pour eux (`ROLES_INTERNES_SMARTEX`).

`audit:modifier` figure dans `RESTRICTIONS_PAR_PLAN` pour aucun plan — donc
elle n'est retirée par aucune formule. En revanche `audit:creer` est retirée en
`FREE`. Un `RESPONSABLE_ENTREPRISE` en `FREE` peut donc valider des axes sur
une mission qu'il ne pourrait pas créer. `À CONFIRMER` si c'est le comportement
voulu.

---

## 16. Conformité à la décision D1

Rappel D1 : « Le collaborateur peut consulter les résultats opérationnels de
l'audit qui le concernent, mais il n'a pas accès au raisonnement détaillé de
l'IA ni à ses justifications internes. »

| Surface | Conforme ? | Constat |
|---|---|---|
| `EvaluationDto` | **oui** | `justification`, `justificationRisque`, `justificationCouverture` masqués ; `justificationsMasquees = true` |
| `GET /{id}/detail` V2 | **oui** | route filtrée en 5.8.1 |
| `axes-amelioration` GET | **oui, par nature** | un axe est un « quoi faire », pas un « pourquoi » — même nature que `pistesAmelioration`, que D1 laisse visible |
| `plans-action` GET | **oui, par nature** | contenu saisi par des humains |
| **`non-conformites` GET** | **NON** | `description` contient `evaluation.justification` en clair, sans filtrage de rôle — 21 lignes concernées |
| `VoletPlanAction.jsx` | **NON** | affiche `nc.description`, donc le même texte |
| `PlanActions.jsx` export CSV | à examiner | exporte titre/priorité/responsable, **pas** `nc.description`. Conforme en l'état. |
| Rapports `PLAN_ACTION` | **À CONFIRMER** | `genererPlanActionCsv/Pdf` parcourent les NC ; si `description` y figure, la fuite s'étend aux rapports téléchargeables. Non vérifié ligne à ligne. |

La conclusion qui compte : **D1 est tenue sur la route `evaluation`, et
contournée par la route `non-conformites`.** Le masquage a été posé sur le
canal direct sans couvrir la copie faite en amont par `NonConformiteService`.

---

## 17. Provenance IA — ce qui est tracé, ce qui ne l'est pas

**Tracé :**

- `axe_amelioration.origine` + `origine_initiale` : l'origine à la création est
  conservée même si `origine` évolue ; la fabrique `proposeParIa` est le seul
  chemin posant `IA`, et la route `POST /` force `HUMAIN` — l'appelant ne peut
  pas déclarer une fausse provenance (`AxeAmeliorationResource.java:94-100`) ;
- `evaluation_id` : l'axe pointe l'évaluation qui l'a produit ;
- `analyse_ia` (3 lignes) + `execution_agent` (8 lignes) portent
  `requested_model`, `served_model`, `response_id`, jetons, durées.

**Non tracé :**

- **aucun lien `axe_amelioration → analyse_ia`** direct. Le chemin est
  `axe → evaluation → analyse_ia`, donc perdu si `evaluation_id` passe à NULL
  par `ON DELETE SET NULL` ;
- **aucun lien `axe_amelioration → execution_agent`** : on ne peut pas dire
  quel appel du Recommendation Agent a produit un axe donné ;
- `plan_action.origine` existe (défaut `HUMAIN`) mais **aucun code ne l'écrit
  autrement** : aucun chemin ne crée de plan d'origine `IA`. La colonne est
  actuellement décorative. `NON DÉMONTRÉ DANS L'EXISTANT` qu'elle ait un usage
  prévu ;
- aucune confiance ni aucun score n'est porté par l'axe, alors que
  `evaluation.confiance_ia` en porte une pour l'évaluation entière.

---

## 18. Historique et journal d'audit

`AuditLogService.journaliser` est appelé pour : `AXE_CREE`, `AXE_VALIDE`,
`AXE_REJETE`, `PLAN_ACTION_CREE`, `PLAN_ACTION_MODIFIE` (utilisé pour trois
gestes distincts : modification du plan, changement de statut, ajout d'action).

**Zéro ligne de ces cinq actions en base** — cohérent avec §6.

Enregistré en revanche : `ACTION_CORRECTIVE_CREEE` (3),
`ACTION_CORRECTIVE_STATUT_CHANGE` (1).

**Faiblesses observées :**

- `PLAN_ACTION_MODIFIE` recouvre trois gestes ; le journal ne permettra pas de
  distinguer « le plan a été renommé » de « une action a été ajoutée » ;
- aucun geste ne journalise l'**ancienne** valeur ; un statut de plan ramené de
  `CLOTURE` à `BROUILLON` laisse une trace qui ne dit pas d'où il venait ;
- aucune table d'historique métier (équivalent de `courante` sur
  `non_conforme`) n'existe pour les axes.

---

## 19. Couverture de test

`AxesEtPlansTest` — 16 cas :

| Cas | Couvre |
|---|---|
| `unAxeProduitParLIaNaitPropose` | §7 |
| `unAxeIaPeutEtreValideParUnGesteHumain` | §14 |
| `unAxeRejeteResteConsultableAvecSonMotif` | §14 |
| `unRejetSansMotifEstRefuse` | CHECK `axe_rejet_motive` |
| `unAxeDejaValideNEstPasRevalide` | 409 |
| `unAxeCreeAlaMainEstToujoursDOrigineHumaine` | §17 |
| `leCollaborateurNeValidePasUnAxe` | §15 |
| `uneActionPeutRepondreAPlusieursAxes` | §8, N-N |
| `unAxeNonValideNePeutPasEtrePlanifie` | §8, 409 |
| `unPlanSuitSonCycleDeVie` | §14 |
| `leCollaborateurNeCreePasDePlan` | §15 |
| `unAxeDUneAutreMissionNEstPasLisibleAvecSonUuid` | IDOR |
| `unIntrusNeValidePasNiNeRejetteUnAxeDAutrui` | IDOR |
| `unPlanDUneAutreMissionNEstPasAtteignable` | IDOR |
| `uneActionNePeutPasRattacherLAxeDUneAutreMission` | IDOR |
| `laListeDesAxesNeMontreQueCeuxDeLaMission` | isolation en liste |

**Non couvert :**

- le cycle `VALIDE → REJETE → VALIDE` et l'effacement du motif (§14) ;
- une transition de plan interdite (aucune ne l'est) ;
- le contenu de `audit_log` après chaque geste ;
- `ActionPlanRepository.traitantLAxe` — méthode sans appelant ;
- `AxeAmeliorationRepository.parEvaluation` et `validesParAudit` — sans appelant ;
- la cohérence `pistes_amelioration` ↔ `axe_amelioration` (§7) ;
- le comportement après `ON DELETE SET NULL` sur `evaluation_id` ;
- **toute la chaîne frontend** : aucune infrastructure de test frontend
  n'existe (constat déjà posé en 5.8.2, inchangé).

---

## 20. Écarts relevés

### CRITIQUE

**CRITIQUE-1 — D1 contournée par `non_conforme.description`.**
`NonConformiteService.description(...)` recopie `evaluation.getJustification()`
dans un champ qu'un `COLLABORATEUR` lit sans filtrage via
`GET …/non-conformites` et via `VoletPlanAction.jsx`. **21 lignes concernées
aujourd'hui.** Le masquage posé sur `EvaluationDto` ne couvre pas cette copie.
Portée : la décision D1 n'est pas effective à l'échelle de l'application.

**CRITIQUE-2 — Deux modèles de plan d'action coexistent, un seul est
atteignable.** `plan_action` / `action_plan` / `action_axe` sont complets,
testés, exposés — et à 0 ligne, sans aucun appelant frontend. Pendant ce temps
l'écran nommé « Plan d'actions » pilote `action_corrective`. Un utilisateur qui
valide un axe aujourd'hui n'a aucun moyen de le planifier depuis l'interface.

### MAJEUR

**MAJEUR-1 — Aucune unicité sur `axe_amelioration`.** Rien n'empêche deux
passes IA sur le même critère de créer deux fois le même axe. C'est exactement
le mécanisme qui avait produit 39 non-conformités pour 22 critères, corrigé
là-bas par un index unique partiel et non ici. Les 4 axes actuels viennent de
**2 passes sur le même critère** : les libellés « Faire valider et approuver le
code de conduite… » et « Faire approuver le code de conduite… » sont deux
formulations du même conseil. La duplication est **déjà présente en base**.

**MAJEUR-2 — `evaluation_id` en `ON DELETE SET NULL`.** La suppression d'une
évaluation laisse l'axe vivant, sans source, avec `origine = IA` mais plus rien
pour dire de quelle analyse il vient. La provenance devient inaudible.

**MAJEUR-3 — Double écriture non réconciliée.** Le même conseil est écrit dans
`evaluation.pistes_amelioration` (texte) et dans `axe_amelioration` (lignes).
Aucun invariant ne les lie. 23 évaluations portent des pistes, 4 axes existent :
les deux représentations sont déjà divergentes.

**MAJEUR-4 — Le détail V2 ignore les axes.** `DetailEvaluationV2Dto` restitue
preuves, constats, risque et signal IA, mais pas les axes produits par la même
passe. L'écran de critère ne peut donc pas montrer les axes à côté du reste du
raisonnement.

**MAJEUR-5 — Les décisions sur un axe s'écrasent.** `valider()` annule
`rejetee_par` / `rejetee_le` / `motif_rejet` ; `rejeter()` annule
`validee_par` / `validee_le`. Un changement d'avis efface la décision
précédente en base. Seul `audit_log` en garde trace, sans les valeurs.

### MOYEN

**MOYEN-1 — La barrière « axe validé » est en Java seulement.** Aucun CHECK ni
trigger sur `action_axe`.

**MOYEN-2 — Transitions de plan totalement libres.** `CLOTURE → BROUILLON` est
accepté sans contrôle.

**MOYEN-3 — N+1 sur `GET /plans-action`.** `PlanActionResource.lister` appelle
`actionRepository.parPlan(p.getId())` **par plan** ; puis
`ActionDto.depuis(action)` déclenche `action.getAxes()`, `@ManyToMany(LAZY)`,
**par action**. Coût : 1 + P + (P × A) requêtes. Aucun `join fetch` dans
`ActionPlanRepository`, contrairement aux repositories de détail V2 qui en ont
reçu un en 5.8.1. Sans effet aujourd'hui (0 plan), bloquant dès l'usage.

**MOYEN-4 — `PLAN_ACTION_MODIFIE` recouvre trois gestes** (§18).

**MOYEN-5 — Trois méthodes de repository sans appelant** :
`ActionPlanRepository.traitantLAxe`, `AxeAmeliorationRepository.parEvaluation`,
`AxeAmeliorationRepository.validesParAudit`. Du code non exercé, donc non
vérifié.

### MINEUR

**MINEUR-1 — Troncature silencieuse à 255 caractères** du libellé d'axe
(`tronquer`), sans marque ni report dans `description`, qui reste nulle.

**MINEUR-2 — Repli `"Action recommandée"`** si le texte est nul : un axe vide
de sens entre en base sans être distinguable d'un axe réel.

**MINEUR-3 — Asymétrie de `referenceRattachement`** : code pour exigence et
règle, libellé pour preuve attendue (§9).

**MINEUR-4 — `plan_action.origine` jamais écrite autrement que par son défaut**
(§17).

**MINEUR-5 — Écart entre 3 journalisations `ACTION_CORRECTIVE_CREEE` et 2
lignes `action_corrective`** (§6) — `À CONFIRMER`.

---

## 21. Top 5 des écarts

1. **CRITIQUE-1** — D1 contournée par `non_conforme.description`, 21 lignes.
2. **CRITIQUE-2** — deux modèles de plan, celui qui est branché n'est pas celui
   qui a été construit.
3. **MAJEUR-1** — aucune unicité sur les axes, duplication déjà constatée.
4. **MAJEUR-3** — `pistes_amelioration` et `axe_amelioration` divergents, sans
   invariant.
5. **MAJEUR-5** — les décisions de validation/rejet s'écrasent mutuellement.

---

## 22. Décisions métier à préparer (D2–D15)

**Aucune de ces décisions n'est prise ici.** Elles sont formulées pour être
tranchées par le métier.

| # | Décision | Options relevées dans l'existant |
|---|---|---|
| **D2** | Que devient `non_conforme.description` au regard de D1 ? | (a) masquer le champ selon le rôle comme `EvaluationDto` ; (b) cesser d'y recopier la justification et n'y laisser que les pistes ; (c) scinder en deux colonnes. **Aucune n'est sans effet sur les 21 lignes existantes.** |
| **D3** | Lequel des deux modèles de plan d'action est le modèle cible ? | (a) `plan_action`/`action_plan` devient le plan, `action_corrective` reste réservée aux écarts ; (b) `action_corrective` reste seule et les axes alimentent des NC ; (c) les deux coexistent durablement avec deux écrans distincts. |
| **D4** | Un axe validé doit-il être planifiable depuis l'interface ? | Si oui, un écran manque entièrement. |
| **D5** | Quelle est l'identité logique d'un axe ? | Candidats observés : `(audit_critere_id, libelle)`, `(evaluation_id, rang)`, ou aucune — la duplication étant assumée comme historique. Détermine s'il faut un index unique partiel comme pour `non_conforme`. |
| **D6** | Une ré-analyse doit-elle actualiser les axes existants ou en créer de nouveaux ? | Le choix fait pour les NC en 5.7-C fut « actualiser » ; rien n'oblige à le reproduire. |
| **D7** | Un axe rejeté doit-il pouvoir être revalidé ? | Si oui, faut-il conserver le motif du rejet annulé ? (MAJEUR-5) |
| **D8** | Faut-il un historique des décisions sur un axe ? | Table dédiée, ou colonne `courante` comme `non_conforme`, ou `audit_log` seul. |
| **D9** | `pistes_amelioration` reste-t-il à côté de `axe_amelioration` ? | (a) les deux, avec un invariant ; (b) `pistes_amelioration` devient dérivé ; (c) les axes deviennent la seule représentation. |
| **D10** | Les axes doivent-ils figurer dans `GET /{evaluationId}/detail` ? | (MAJEUR-4) |
| **D11** | Qui valide un axe ? | Aujourd'hui `audit:modifier`, donc `RESPONSABLE_ENTREPRISE` inclus — distinct de `evaluation:valider` réservé à `SUPER_ADMIN`. À confirmer ou à resserrer. |
| **D12** | Quelles transitions de plan sont légitimes ? | (MOYEN-2) |
| **D13** | La règle « seul un axe validé est planifiable » doit-elle être portée par la base ? | (MOYEN-1) |
| **D14** | `plan_action.origine = IA` a-t-il un sens ? | Un plan entier généré par l'IA, ou la colonne est à retirer du modèle mental. |
| **D15** | Les rapports `PLAN_ACTION` doivent-ils couvrir les axes et les plans ? | Ils ne couvrent aujourd'hui que les actions correctives. |

---

## 23. Matrice de couverture

| Objet | Table | Entité | Repository | Endpoint | DTO | Frontend | Test | Données réelles |
|---|---|---|---|---|---|---|---|---|
| Axe d'amélioration | oui | oui | oui | 5 | oui | **non** | 9 cas | 4 |
| Plan d'action | oui | oui | oui | 6 | oui | **non** | 5 cas | **0** |
| Action de plan | oui | oui | oui | 1 | oui | **non** | 3 cas | **0** |
| Liaison action–axe | oui | via `@ManyToMany` | — | — | `axeIds` | **non** | 2 cas | **0** |
| Action corrective | oui | oui | oui | 3 | oui | **oui** | oui | 2 |
| Non-conformité | oui | oui | oui | 3 | oui | **oui** | oui | 39 / 22 courantes |
| Pistes d'amélioration | colonne `evaluation` | oui | — | via `EvaluationDto` | oui | **oui** | oui | 23 |

Lecture : la colonne « Frontend » sépare nettement ce qui a été construit en
5.7-C (axes, plans) de ce qui est réellement utilisé (NC, actions correctives,
pistes).

---

## 24. Conclusion

Le socle de données des axes et des plans est **complet, contraint et testé**.
Ses CHECK sont sérieux : un axe ne peut pas être validé sans validateur, ni
rejeté sans motif, ni prétendre viser deux cibles. Son isolation multi-tenant
est vérifiée par cinq tests dédiés. La provenance IA ne peut pas être falsifiée
par un appelant.

Ce qui manque n'est pas du modèle, c'est du chemin. Quatre axes attendent dans
une table qu'aucun écran n'affiche ; zéro plan a jamais été créé ; et pendant ce
temps l'écran qui porte le nom de « plan d'actions » alimente une autre table,
en y recopiant au passage la justification interne de l'IA que la décision D1
venait d'interdire au collaborateur.

Les deux écarts CRITIQUES ne sont pas de même nature. CRITIQUE-1 est un défaut
de sécurité déjà matérialisé sur 21 lignes ; il se corrige indépendamment de
tout le reste. CRITIQUE-2 est une question de modèle, et exige d'abord une
décision métier (D3), pas du code.

**Rien n'a été corrigé, migré ni implémenté dans le cadre de cette phase.**

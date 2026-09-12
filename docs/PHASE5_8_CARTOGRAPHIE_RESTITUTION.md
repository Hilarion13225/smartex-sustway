# PHASE 5.8 — Cartographie de la restitution des résultats d'audit

## SMARTEX SUSTWAY — Étape 0

> **Audit et cartographie uniquement.** Aucun schéma, aucune migration,
> aucune API, aucun frontend, aucune permission n'a été modifié.
>
> Chaque affirmation est vérifiable dans le code, dans la base, ou par
> lecture d'un fichier. Ce qui n'est pas établi porte la mention **À
> CONFIRMER**.
>
> Aucun commit.

---

## 1. État actuel — le constat qui commande tout le reste

Le pipeline V2 **produit et persiste** un résultat riche. **Presque rien
n'en ressort par l'API.**

```
 evaluation (V2)          | 2      ← exposée, mais partiellement
 evaluation_preuve        | 2      ← AUCUNE API
 evaluation_constat       | 10     ← AUCUNE API
 analyse_document_constat | 2      ← AUCUNE API
 axe_amelioration         | 4      ← API existante, AUCUN écran
 plan_action              | 0      ← API existante, AUCUN écran
```

Vérifié : aucun DTO du paquet `resource/` ne mentionne
`EvaluationPreuve`, `EvaluationConstat` ni `AnalyseDocumentConstat`.

**Le travail de la phase 5.8 n'est donc pas de produire plus de données,
mais de rendre visibles celles qui existent déjà.** C'est un point
important : il évite la tentation d'ajouter des colonnes « utiles à
l'interface » alors que l'information est déjà en base.

### Trois tables dormantes, sans entité JPA

```
RisqueEvaluation   : ABSENTE
ScoreAudit         : ABSENTE
ScoreDomaine       : ABSENTE
```

Elles existent en SQL, sont vides, et ne sont mappées par aucune classe
Java — exactement la situation où se trouvaient `analyse_ia` et
`execution_agent` avant la phase 5.7-C.

---

## 2. Backend

### 2.1 Entités et leur gouvernance

| Entité | Rôle | Qui crée | Qui modifie | Source de vérité |
|---|---|---|---|---|
| `Evaluation` | Résultat métier d'un critère | `AnalyseCritereService` (V1), `PersistanceResultatV2Service` (V2) | `ValidationEvaluationService` (statut) | **elle-même** |
| `EvaluationDocumentAnalyse` | Document lu, résumé | Persistance V1 et V2 | — | elle-même |
| `AnalyseDocumentConstat` | Constat par (document × attente) | Persistance V2 | — | elle-même |
| `EvaluationPreuve` | Avis par preuve attendue | Persistance V2 | — | **elle-même — le cœur du contrat V2** |
| `EvaluationConstat` | Signal de risque ou élément manquant, rattaché | Persistance V2 | — | elle-même |
| `AnalyseIa` | Une passe d'exécution | `AnalyseCritereV2Service` | lui-même (statut) | elle-même |
| `ExecutionAgent` | Un appel au fournisseur | `PersistanceResultatV2Service` | — | le fournisseur |
| `NonConforme` | Écart opposable | `NonConformiteService` | idem + `NonConformeResource` (statut) | elle-même |
| `ActionCorrective` | Engagement sur un écart | `ActionCorrectiveResource` | idem | elle-même |
| `AxeAmelioration` | Proposition d'amélioration | Persistance V2, `AxeAmeliorationResource` | `AxeAmeliorationResource` | elle-même |
| `PlanAction` / `ActionPlan` | Planification | `PlanActionResource` | idem | elle-même |
| `ScoreHistorique` | Instantané quotidien | `ScoreHistoriqueService` | UPSERT | **dérivée** d'`Evaluation` |

### 2.2 Services

| Service | Rôle | Note |
|---|---|---|
| `AnalyseCritereService` | Pipeline **V1** | Écrit `VALIDEE` (RG16). Toujours actif |
| `AnalyseCritereV2Service` | Pipeline **V2** | Verrou, T0/T1/T2, écrit `EN_REVUE` |
| `PersistanceResultatV2Service` | Écriture du résultat V2 | Résout les références en UUID |
| `ValidationEvaluationService` | `EN_REVUE` → `VALIDEE` | Seul chemin ; déclenche NC + instantané |
| `NonConformiteService` | Création / actualisation / clôture | Une courante par critère |
| `AuditScoreService` | Score **calculé à la volée** | Ne lit ni n'écrit `score_audit` |
| `ScoreHistoriqueService` | Instantané | UPSERT `(audit_id, date)` |
| `ClotureMissionService` | Mission → `TERMINE` | Seul écrivain de l'état terminal |

> **`AnalyseMissionService` et `AnalyseTransactionnelle`** figurent au brief.
> `AnalyseMissionService` existe ; **`AnalyseTransactionnelle` n'existe
> pas** sous ce nom dans le dépôt — la transactionnalité est portée par
> `AnalyseCritereV2Service` (T0/T1/T2) et par les annotations
> `@Transactional` des ressources.

### 2.3 Colonnes réellement disponibles sur `evaluation`

```
id · audit_critere_id · probabilite_conforme · note · confiance_ia
justification · source · auteur_id · date_evaluation · version_referentiel
statut · signal_risque · categorie_risque · justification_risque
recommandation_necessaire · pistes_amelioration · couverture_preuve
niveau_declare
— ajoutées en 5.7-C —
referentiel_version_id · analyse_ia_id · contrat_version · confiance_risque
justification_couverture · validee_par · validee_le
```

---

## 3. API

### 3.1 Endpoints existants

Tous sous `/api/v1/entreprises/{entrepriseId}/audits/{auditId}`.

**Évaluations** — `…/criteres/{auditCritereId}/evaluations`

| Méthode | Chemin | Permission | Retour |
|---|---|---|---|
| `GET` | `/` | accès entreprise | `EvaluationDto[]` |
| `POST` | `/` | `analyse:executer` | `EvaluationDto` — **pipeline V1**, statut `VALIDEE` |
| `POST` | `/v2` | `analyse:executer` | `EvaluationDto` — **pipeline V2**, statut `EN_REVUE` |
| `POST` | `/{evaluationId}/validation` | **`evaluation:valider`** | `EvaluationDto` |

**Non-conformités** — `…/non-conformites`

| `GET /` · `GET /{id}` | accès entreprise |
| `PUT /{id}/statut` | `audit:modifier` |

**Actions correctives** — `…/non-conformites/{ncId}/actions`

| `GET /` | accès entreprise |
| `POST /` · `PUT /{actionId}/statut` | `audit:modifier` |

**Axes d'amélioration** — `…/axes-amelioration`

| `GET /` (filtrable `?statut=`) · `GET /{axeId}` | accès entreprise |
| `POST /` · `POST /{axeId}/validation` · `POST /{axeId}/rejet` | `audit:modifier` |

**Plans d'action** — `…/plans-action`

| `GET /` · `GET /{planId}` | accès entreprise |
| `POST /` · `PUT /{planId}` · `PUT /{planId}/statut` · `POST /{planId}/actions` | `audit:modifier` |

**Mission et scores** — `…/audits`

| `GET /` · `GET /{auditId}` · `GET /{auditId}/criteres` | accès entreprise |
| `GET /{auditId}/score` · `GET /{auditId}/score-historique` | accès entreprise |
| `POST /{auditId}/analyse` · `GET /{auditId}/analyse` | `analyse:executer` |
| `POST /{auditId}/cloture` · `GET /{auditId}/cloture` | `audit:cloturer` |

### 3.2 Ce que `EvaluationDto` expose — et ce qu'il tait

**Exposé (16 champs)** : `id`, `auditCritereId`, `probabiliteConforme`,
`niveauEngagement`, `confianceIa`, `justification`, `couverturePreuve`,
`niveauDeclare`, `documentsAnalyses` *(nom + résumé seulement)*, `source`,
`statut`, `dateEvaluation`, `signalRisque`, `categorieRisque`,
`justificationRisque`, `recommandationNecessaire`, `pistesAmelioration`.

**Persisté mais NON exposé** :

| Donnée | Où elle est | Conséquence |
|---|---|---|
| `contratVersion` | colonne | Impossible de distinguer une évaluation V1 d'une V2 à l'écran |
| `valideePar` / `valideeLe` | colonnes | **La validation est invisible** : on voit `VALIDEE`, jamais par qui |
| `confianceRisque` | colonne | Le signal de risque s'affiche sans sa confiance |
| `justificationCouverture` | colonne | Le « pourquoi les preuves suffisent » est perdu |
| `referentielVersion` | FK | L'évaluation ne dit pas sous quelle version elle a été rendue |
| **`evaluation_preuve`** | table | **Le détail attente par attente est inatteignable** |
| **`evaluation_constat`** | table | Signaux de risque rattachés, éléments manquants |
| **`analyse_document_constat`** | table | Quel document démontre quelle attente, et les conflits |
| `document_id`, `pieceReference`, `confianceLecture` | colonnes | Le document analysé n'est identifiable que par son nom |

### 3.3 Endpoints manquants — recensés, non créés

| # | Manque | Pour |
|---|---|---|
| **E1** | Détail V2 d'une évaluation (`GET …/evaluations/{id}/detail`) | Afficher le raisonnement attente par attente |
| **E2** | Trace d'exécution (`GET …/analyses-ia`, `…/{id}/appels`) | Observabilité : modèle servi, durée, jetons |
| **E3** | Liste des évaluations **à valider** d'une mission | File de relecture du SUPER_ADMIN |
| **E4** | Signaux de risque d'une mission | Aujourd'hui dispersés par critère |
| **E5** | Synthèse de mission consolidée | Un appel au lieu de cinq |
| **E6** | `DELETE` sur un plan ou une action | Écarté volontairement en 5.7-C |

---

## 4. Statuts — matrice des transitions

### `Evaluation` — `statut_evaluation`

| Depuis | Vers | Acteur | Effet métier |
|---|---|---|---|
| *(création V1)* | `VALIDEE` | `analyse:executer` | **Entre au score, génère la NC** — RG16 |
| *(création V2)* | `EN_REVUE` | `analyse:executer` | Hors score, aucune NC |
| `EN_REVUE` | `VALIDEE` | **`evaluation:valider`** | Entre au score, NC créée/actualisée, instantané |
| `VALIDEE` | `VALIDEE` | — | **Refusé (409)** |
| `PROVISOIRE` | `VALIDEE` | — | **Refusé (409)** — état jamais atteint en pratique |

> `PROVISOIRE` est le défaut SQL et n'est **jamais écrit** par le code.

### `AnalyseIa` — `statut_pipeline`

| Depuis | Vers | Acteur | Effet |
|---|---|---|---|
| *(réservation)* | `EN_COURS` | `analyse:executer` | **Verrou logique** — bloque toute autre analyse du critère |
| `EN_COURS` | `TERMINE` | système | Libère le critère |
| `EN_COURS` | `ERREUR` | système | Libère le critère |

`EN_ATTENTE` est la valeur par défaut de la colonne, jamais écrite.

### `ExecutionAgent` — `statut_execution_agent`

Posé à la création depuis la trace (`TERMINE` ou `ERREUR`). **Aucune
transition** : un appel terminé ne change plus d'état.

### `NonConforme` — `statut_non_conformite`

| Depuis | Vers | Acteur | Effet |
|---|---|---|---|
| *(création)* | `OUVERTE` | système, à la validation | Écart opposable |
| `OUVERTE` | `EN_TRAITEMENT` | `audit:modifier` | — |
| `EN_TRAITEMENT` | `CLOTUREE` | `audit:modifier` | — |
| *(toute)* | `CLOTUREE` | système | Si le critère devient conforme (note 5) |

Orthogonal : `courante` (booléen). Une ré-analyse **actualise** la courante
sans toucher son statut métier.

### `AxeAmelioration` — `statut_axe`

| Depuis | Vers | Acteur | Effet |
|---|---|---|---|
| *(création)* | `PROPOSE` | IA ou humain | N'engage rien |
| `PROPOSE` | `VALIDE` | `audit:modifier` | **Devient planifiable** |
| `PROPOSE` | `REJETE` | `audit:modifier` | Conservé, motif obligatoire |
| `VALIDE` | `VALIDE` | — | **Refusé (409)** |

### `PlanAction` — `statut_plan`

`BROUILLON` → `ACTIF` → `CLOTURE`, par `audit:modifier`. Aucune contrainte
d'ordre imposée en base — **À CONFIRMER** si le retour arrière doit être
interdit.

### `Audit` — `statut_audit`

| Depuis | Vers | Acteur |
|---|---|---|
| `BROUILLON` | `EN_COURS` | `CycleVieMissionService`, à la première évaluation |
| `EN_COURS` | `TERMINE` | **`audit:cloturer`** — `ClotureMissionService`, seul écrivain |

---

## 5. Résultat d'évaluation — disponibilité donnée par donnée

| Donnée | Persistée | Exposée par l'API | Note |
|---|:-:|:-:|---|
| Probabilité de conformité | ✅ | ✅ | — |
| Niveau d'engagement (note) | ✅ | ✅ | RG27 : dérivée, jamais produite par l'IA |
| Confiance (conformité) | ✅ | ✅ | — |
| Confiance (risque) | ✅ | ❌ | **Colonne remplie, DTO muet** |
| Couverture (booléen V1) | ✅ | ✅ | — |
| **Couverture par attente (4 valeurs)** | ✅ | ❌ | `evaluation_preuve.couverture` |
| Niveau déclaré | ✅ | ✅ | **Nul en V2** — voir §15 |
| Justification de conformité | ✅ | ✅ | — |
| Justification de couverture | ✅ | ❌ | — |
| Éléments observés / manquants / non vérifiables | ✅ | ❌ | `evaluation_preuve`, JSONB |
| Conflit entre pièces | ✅ | ❌ | `evaluation_preuve.conflit` |
| Pièces utilisées | ✅ | ❌ | — |
| Documents analysés (nom + résumé) | ✅ | ✅ | — |
| Document identifié (`document_id`) | ✅ | ❌ | — |
| Confiance de lecture | ✅ | ❌ | — |
| Constats par document | ✅ | ❌ | `analyse_document_constat` |
| Recommandations (texte) | ✅ | ✅ | `pistes_amelioration` |
| Recommandations (axes rattachés) | ✅ | ✅ *(autre endpoint)* | `axe_amelioration` |
| Statut `EN_REVUE` / `VALIDEE` | ✅ | ✅ | — |
| Validateur et date | ✅ | ❌ | — |
| Version du référentiel | ✅ | ❌ | FK posée en V2 |
| Criticité | ✅ | ➖ | Sur `audit_critere`, exposée ailleurs |
| Coefficient de pondération | ✅ | ➖ | Idem |

**Rien à ajouter en base.** Tout ce qui manque à l'écran est déjà persisté ;
ce qui manque est l'exposition.

---

## 6. Risques — deux natures à ne jamais confondre

### A — Risque déterministe métier (RG26)

| | |
|---|---|
| Origine | Calcul, sans IA |
| Formule | `risque_attendu = (1 − probabilité) × poids de criticité` |
| Sources | `evaluation.probabilite_conforme`, `criticite.poids` |
| Persistance | `non_conforme.risque_attendu` **uniquement** |
| Table dédiée | `risque_evaluation` — **vide, sans entité JPA** |
| Affichage | Via la non-conformité |

> **Gap structurel, antérieur à l'IA** : `ScoringEngine.risqueAttendu` est
> appelé par `NonConformiteService`, qui écrit le résultat dans la
> non-conformité. Le risque attendu n'est donc **jamais calculé pour un
> critère conforme**, et `risque_evaluation` n'est alimentée par aucun code.

### B — Signal de risque IA

| | |
|---|---|
| Origine | Risk Agent V2 |
| Logique | Jugement d'un modèle de langage — **non reproductible** |
| Sources | Documents, résultat Evidence, secteur |
| Persistance | `evaluation.signal_risque` / `categorie_risque` / `justification_risque` / `confiance_risque` + `evaluation_constat` (`nature = SIGNAL_RISQUE`) |
| Affichage | Partiellement : 3 champs sur 4, sans les signaux détaillés |

### Ce que la restitution doit garantir

**Le signal du Risk Agent ne doit jamais être présenté comme une vérité
réglementaire.** Il n'entre dans aucun calcul de score ni de priorité — le
commentaire de l'entité `Evaluation` le dit déjà. À l'écran, il doit être
identifiable comme une observation de l'IA, distincte du risque attendu qui,
lui, est une multiplication.

Données mesurées sur les deux évaluations V2 : `signal_risque = true`,
catégorie `INFORMATION_MANQUANTE`, confiance `0,60`.

---

## 7. Non-conformités

| Donnée | Persistée | Exposée |
|---|:-:|:-:|
| Critère | ✅ `audit_critere_id` | ✅ |
| Sévérité | ✅ `niveau` | ✅ |
| Statut | ✅ | ✅ |
| Risque attendu | ✅ | ✅ |
| Justification | ✅ `description` | ✅ |
| Origine | ➖ implicite (toujours automatique) | ❌ |
| Actions correctives | ✅ | ✅ (compteur + liste) |
| **`courante`** | ✅ | ❌ **jamais exposée** |
| Historique | ✅ (17 lignes) | ❌ `parAuditAvecHistorique` non appelée |
| Preuve | ❌ | ❌ Aucun lien NC → preuve |

### La règle, vérifiée

```
 NC total                  | 39
 NC courantes              | 22
 NC historiques            | 17
 criteres avec >1 courante | 0
```

Garantie par l'index unique partiel `non_conforme_courante_unique`.
**Non modifiée.**

### Directement affichable / à faire évoluer

- **Affichable aujourd'hui** : liste, sévérité, statut, actions.
- **À exposer** : le drapeau `courante` et l'historique — l'API rend
  déjà 22 lignes et non 39, mais l'interface ne peut pas proposer
  « voir l'historique de cet écart ».

---

## 8. Axes d'amélioration

Quatre axes en base, tous issus des tests réels :

```
 origine | origine_initiale | statut  | niveau_rattachement | cible
---------+------------------+---------+---------------------+-------------------
 IA      | IA               | PROPOSE | REGLE               | regle_analyse_id
 IA      | IA               | PROPOSE | PREUVE_ATTENDUE     | preuve_attendue_id
 IA      | IA               | PROPOSE | REGLE               | regle_analyse_id
 IA      | IA               | PROPOSE | PREUVE_ATTENDUE     | preuve_attendue_id
```

Tous rattachés à un critère **et** à une évaluation. **Les rattachements
sont résolus en UUID** — la traduction des références locales fonctionne.

| Donnée | État |
|---|---|
| Origine IA / humaine | ✅ persistée, ✅ exposée |
| `origine_initiale` | ✅ ✅ |
| Statut | ✅ ✅ |
| Rattachement règle / preuve attendue / exigence | ✅ ✅ |
| Mission, critère, évaluation | ✅ ✅ |
| **Rattachement à une NC** | ❌ **n'existe pas** |
| **Priorité** | ❌ **n'existe pas** |
| Description | ✅ ✅ |

> **Priorité absente, et c'est un choix de conception** : le modèle V2 ne
> produit pas de priorité, elle « se dérive côté Java de la sévérité de la
> règle rattachée ». Cette dérivation **n'est pas implémentée** — un axe
> rattaché à une règle `ELEVEE` ne porte aucune priorité visible.

---

## 9. Plans d'action

| Donnée | État |
|---|---|
| Plan (titre, description, statut, responsable, échéance) | ✅ ✅ |
| Action (titre, description, responsable, échéance, statut, priorité, ordre) | ✅ ✅ |
| **Axes associés (N-N)** | ✅ ✅ |
| Rattachement à une NC | ❌ n'existe pas sur `action_plan` |
| Rattachement à un critère | ➖ indirect, par l'axe |
| Audit | ✅ ✅ |
| **Progression** | ❌ **non calculée côté API** |

### Le point de confusion à signaler

**Deux objets portent le nom « action » et ne se ressemblent pas :**

| | `ActionCorrective` | `ActionPlan` |
|---|---|---|
| Répond à | une **non-conformité** | un ou plusieurs **axes** |
| Rattachement | `non_conforme_id` NOT NULL | `plan_action_id` + N axes |
| Lignes | 2 | 0 |
| Écran | `PlanActions.jsx` | **aucun** |

**La page `PlanActions.jsx` existante manipule `ActionCorrective`, pas
`PlanAction`.** Le nom de la page et l'objet qu'elle affiche divergent
depuis la création de `plan_action` en 5.7-C. C'est le risque de confusion
le plus concret de cette cartographie.

---

## 10. Permissions — matrice réelle

Extraite de la base, rôles actifs uniquement.

| Permission | SUPER_ADMIN | RESPONSABLE | COLLABORATEUR |
|---|:-:|:-:|:-:|
| `analyse:executer` | ✅ | ✅ | ❌ |
| `audit:cloturer` | ✅ | ✅ | ❌ |
| `audit:creer` | ✅ | ✅ | ❌ |
| `audit:modifier` | ✅ | ✅ | ❌ |
| **`evaluation:valider`** | ✅ | ❌ | ❌ |
| `preuve:deposer` | ✅ | ✅ | ✅ |
| `rapport:consulter` | ✅ | ✅ | ✅ |
| `rapport:detaille` | ✅ | ❌ | ❌ |
| `referentiel:administrer` | ✅ | ❌ | ❌ |

### Traduit en gestes de restitution

| Geste | SUPER_ADMIN | RESPONSABLE | COLLABORATEUR |
|---|:-:|:-:|:-:|
| Consulter résultats, scores, risques, NC, axes | ✅ | ✅ | ✅ *(accès entreprise seul)* |
| Créer / modifier un plan, modifier une action | ✅ | ✅ | ❌ |
| Valider une évaluation | ✅ | ❌ | ❌ |
| Valider / rejeter un axe | ✅ | ✅ | ❌ |
| Lancer une analyse | ✅ | ✅ | ❌ |
| Clôturer une mission | ✅ | ✅ | ❌ |

> **Toutes les lectures sont ouvertes au collaborateur** dès lors qu'il
> appartient à l'entreprise : les `GET` n'exigent que
> `exigerAccesEntreprise`. **À CONFIRMER** : un collaborateur doit-il voir
> le détail du raisonnement de l'IA et les signaux de risque, ou seulement
> le résultat ?

`ADMIN_AUDIT` reste `INACTIF` et ne porte plus `evaluation:valider` (V70).

---

## 11. Multi-tenant

### Le motif appliqué, et il est solide

L'URL porte `entrepriseId` ; `exigerAccesEntreprise` le vérifie ; puis
`trouverAuditDeLEntreprise` contrôle que la mission appartient bien à cette
entreprise. Chaque ressource enfant est ensuite résolue par
`parIdEtAudit(id, auditId)` — un identifiant valide venu d'ailleurs ne
suffit pas.

| Ressource | Chaîne de contrôle | Éprouvé |
|---|---|:-:|
| `evaluation` | entreprise → audit → critère → évaluation | ✅ 403 / 404 |
| `axe_amelioration` | entreprise → audit → `parIdEtAudit` | ✅ 403 / 404 |
| `plan_action` | idem | ✅ 404 |
| `action_plan` | remonte par le plan | ✅ 404 |
| `non_conforme` | `parIdEtAudit` via `auditCritere.audit` | ➖ **non éprouvé par test** |
| `action_corrective` | via la NC | ➖ **non éprouvé** |
| `analyse_ia` | `audit_id` disponible | ❌ **aucune API** |
| `execution_agent` | remonte par la passe | ❌ **aucune API** |
| `document` analysé | via l'évaluation | ➖ non éprouvé directement |

### Écarts documentés, non corrigés

| # | Écart | Gravité |
|---|---|---|
| **T1** | `NonConformeResource` et `ActionCorrectiveResource` **n'ont aucun test IDOR** | moyen — le code suit le bon motif, mais rien ne le vérifie |
| **T2** | Le détail V2 n'ayant aucune API, **aucun contrôle n'existe encore** pour lui | à traiter **avec** E1, pas après |
| **T3** | `analyse_ia` / `execution_agent` sans API : leur isolation repose sur `audit_id`, **non éprouvée** | faible aujourd'hui, bloquant pour E2 |

---

## 12. Frontend

### 12.1 Pages existantes de restitution

| Route | Composant | API appelées | Affiche |
|---|---|---|---|
| `…/audits/:auditId` | `AuditDetail` | audit, critères, score, NC, sites | Vue mission |
| `…/audits/:auditId/score` | `AuditScore` | audit, score, NC | Score et répartition |
| `…/audits/:auditId/non-conformites` | `NonConformites` | NC, statut | Liste et suivi |
| `…/audits/:auditId/criteres/:id` | `CritereEvaluation` | évaluations, questions, preuves | **Détail d'un critère** |
| `…/:entrepriseId/plan-actions` | `PlanActions` | audits, actions **correctives** | Suivi des actions de NC |
| `…/:entrepriseId/non-conformites` | `NonConformitesEntreprise` | — | Vue transverse |
| `…/:entrepriseId/pipeline-ia` | `PipelineIA` | — | Suivi du pipeline |
| `…/audits/:auditId/rapports` | `Rapports` | — | Rapports |

### 12.2 Composants réutilisables déjà en place

`SyntheseMission`, `OngletsMission`, `ListeCriteres`, `CarteCritere`,
`CarteAnalyseIa`, `PanneauAnalyseIa`, `TracabiliteIa`, `VoletAnalysesIa`,
`VoletPlanAction`, `VoletPreuves`, `JaugeCirculaire`,
`CarteProgressionDomaine`, `NavigationCritere`, `ClotureMission`.

**Un vocabulaire visuel riche existe déjà.** La phase 5.8 doit s'y brancher,
pas le refaire.

### 12.3 Ce que le frontend sait déjà — et ce qu'il ignore

**Sait** : `CritereEvaluation.jsx:36` porte
`TONS_STATUT_EVAL = { PROVISOIRE: 'ambre', EN_REVUE: 'violet', VALIDEE: 'vert' }`.
Le statut `EN_REVUE` s'affiche donc déjà comme une pastille.

**Ignore complètement** :

| Manque | Vérification |
|---|---|
| **L'action de validation** | Aucun appel à `/validation` dans `src/` |
| **Les axes d'amélioration** | Aucun appel à `axes-amelioration` ; **aucune entrée de Sidebar** |
| **Les plans d'action V2** | Aucun appel à `plans-action` |
| Le détail V2 | Aucune API à appeler (E1) |
| La trace d'exécution | Aucune API (E2) |

### 12.4 Contraintes de réutilisation — rappelées

- **Layout et Sidebar existants, une seule Sidebar**, pilotée par les
  permissions. L'ajout d'une entrée « Axes d'amélioration » est une ligne
  dans `Layout.jsx`, pas une seconde navigation.
- **Header non modifié.**
- **Vitrine publique hors périmètre.**

---

## 13. Problèmes UX réellement constatés

Uniquement ce qui est vérifiable dans le code ou les données.

| # | Problème | Constat |
|---|---|---|
| **U1** | **Une évaluation `EN_REVUE` ne peut pas être validée depuis l'interface** | Aucun appel à `/validation`. Le SUPER_ADMIN doit passer par `curl` |
| **U2** | **Aucune file de relecture** | Rien ne liste les évaluations en attente d'une mission ou d'un portefeuille (E3) |
| **U3** | **Les axes IA sont invisibles** | 4 axes en base, aucune entrée de Sidebar, aucune page |
| **U4** | **« Plans d'actions » désigne deux objets différents** | La page affiche `ActionCorrective` ; `PlanAction` n'a aucun écran (§9) |
| **U5** | **Le raisonnement de l'IA n'est pas restituable** | `evaluation_preuve`, `evaluation_constat`, `analyse_document_constat` sans API |
| **U6** | **Qui a validé, et quand, est invisible** | `validee_par` / `validee_le` absents du DTO |
| **U7** | **Le signal de risque IA s'affiche sans sa confiance** | `confiance_risque` persistée, non exposée |
| **U8** | **Aucune progression de plan** | Ni champ, ni calcul côté API |
| **U9** | **Risque IA et non-conformité peuvent se confondre** | Rien dans le DTO ne distingue un signal d'un écart opposable |
| **U10** | **Le score n'est pas expliqué** | `GET /score` rend les agrégats ; le lien vers les critères qui le composent est à reconstituer côté client |

> **Non retenus faute de constat** : « résultats trop techniques » et
> « manque de synthèse mission » — `SyntheseMission` existe et est branché.
> Ce sont des jugements à porter sur pièces, pas des faits de code.

---

## 14. Architecture de restitution proposée

Fondée uniquement sur ce qui existe.

```
MISSION  (audit)
 │
 ├── Synthèse            score global, par domaine, avancement,
 │                       compteurs : en revue / validées / écarts / axes
 │                       ← GET /score, /criteres  (+ E5)
 │
 ├── Résultats
 │    └── Critère        probabilité · note · confiance · statut
 │         ├── Détail    couverture par attente (4 valeurs),
 │         │             éléments observés / manquants / non vérifiables,
 │         │             conflits, pièces utilisées      ← E1
 │         ├── Documents nom, résumé, confiance de lecture, constats ← E1
 │         ├── Validation EN_REVUE → VALIDEE             ← existe, non branché
 │         └── Trace     modèle servi, durée, jetons     ← E2
 │
 ├── Risques
 │    ├── Risque attendu (RG26)   déterministe, via la NC
 │    └── Signal IA               signal · catégorie · confiance · signaux ← E4
 │
 ├── Non-conformités     courantes par défaut, historique explicite
 │    └── Actions correctives
 │
 ├── Axes d'amélioration PROPOSE / VALIDE / REJETE, origine, rattachement
 │                       ← API existe, écran manquant
 │
 └── Plans d'action      plan → actions → N axes
                         ← API existe, écran manquant
```

### Par niveau

| Niveau | Données | Source | Statut | Action utilisateur |
|---|---|---|---|---|
| Synthèse | Agrégats | `AuditScoreService`, calculé | — | Naviguer |
| Critère | 16 champs | `EvaluationDto` | `EN_REVUE` / `VALIDEE` | Lancer, **valider** |
| Détail | Par attente | `evaluation_preuve` (**E1**) | — | Lire |
| Risques | Deux natures séparées | `evaluation` + `evaluation_constat` (**E4**) | — | Lire |
| NC | Écarts | `non_conforme` courantes | 3 statuts | Faire progresser |
| Axes | Propositions | `axe_amelioration` | 3 statuts | **Valider / rejeter** |
| Plans | Engagements | `plan_action` | 3 statuts | Créer, planifier |

---

## 15. Écarts — synthèse

### Critiques

| # | Écart | Preuve |
|---|---|---|
| **G1** | **Le détail V2 n'a aucune API** | Aucun DTO ne référence `EvaluationPreuve`, `EvaluationConstat`, `AnalyseDocumentConstat` |
| **G2** | **La validation n'est pas atteignable depuis l'interface** | Aucun appel à `/validation` dans `src/` |
| **G3** | **Axes et plans sans écran** | Aucune entrée de Sidebar, aucun appel d'API |

### Majeurs

| # | Écart | Preuve |
|---|---|---|
| **G4** | `EvaluationDto` tait 6 colonnes persistées | §3.2 |
| **G5** | Confusion « Plans d'actions » / `PlanAction` | §9 |
| **G6** | `niveau_declare` nul sur les évaluations V2 | `PersistanceResultatV2Service.niveauDeclare()` rend `null` |
| **G7** | Priorité d'axe non dérivée de la sévérité de la règle | §8 |
| **G8** | Aucun test IDOR sur NC et actions correctives | §11 |

### Mineurs

| # | Écart |
|---|---|
| **G9** | `risque_evaluation`, `score_audit`, `score_domaine` : dormantes, sans entité JPA |
| **G10** | `courante` et l'historique des NC non exposés |
| **G11** | Aucun lien NC ↔ axe |
| **G12** | Pas de progression de plan |
| **G13** | Deux chemins d'analyse coexistent avec deux règles opposées (V1 `VALIDEE`, V2 `EN_REVUE`) |

---

## 16. Décisions métier encore nécessaires

| # | Question | Bloque |
|---|---|---|
| **D1** | **Un collaborateur peut-il voir le raisonnement de l'IA** (détail par attente, signaux de risque) ou seulement le résultat ? | E1, E4 |
| **D2** | **Que devient le chemin V1 ?** Deux chemins écrivent aujourd'hui des statuts opposés. Le retirer, ou l'aligner sur `EN_REVUE` ? | Cohérence de la restitution |
| **D3** | **La file de relecture est-elle par mission ou par portefeuille ?** Le SUPER_ADMIN valide pour tous les clients | E3 |
| **D4** | **Faut-il relier un axe à une non-conformité ?** Le modèle les sépare volontairement ; l'interface pourrait avoir besoin du lien | G11 |
| **D5** | **La priorité d'un axe doit-elle être dérivée** de la sévérité de la règle rattachée, comme le prévoyait le contrat V2 ? | G7 |
| **D6** | **`niveau_declare` doit-il être renseigné en V2 ?** La comparaison déclaré / constaté est absente des évaluations V2 | G6 |
| **D7** | **Le retour arrière d'un plan** (`ACTIF` → `BROUILLON`) est-il permis ? | §4 |
| **D8** | **La trace d'exécution est-elle visible du client**, ou réservée à Smartex ? | E2 |

**D1 et D2 sont les plus structurantes** : la première détermine ce que
chaque écran montre, la seconde si la restitution doit gérer deux régimes
d'évaluation ou un seul.

---

## 17. Recommandations

1. **Ne rien ajouter en base.** Tout ce qui manque à l'écran est déjà
   persisté (§5). La tentation d'ajouter une colonne « pour l'interface »
   doit être écartée à chaque fois.

2. **Exposer avant d'afficher.** G1 bloque U5 : sans E1, aucun écran de
   détail n'est possible. L'ordre est imposé par les dépendances, pas par
   la visibilité du résultat.

3. **Traiter la sécurité avec l'exposition, pas après.** T2 le dit : le
   détail V2 n'a pas encore de contrôle d'accès parce qu'il n'a pas d'API.
   Écrire l'un sans l'autre créerait l'écart.

4. **Réutiliser le vocabulaire visuel existant** (§12.2). Quatorze
   composants d'audit sont en place ; les axes et les plans doivent s'y
   brancher.

5. **Une seule entrée de Sidebar par objet**, pilotée par les permissions
   existantes. `audit:modifier` couvre axes et plans — aucune permission
   nouvelle n'est nécessaire.

6. **Trancher D2 tôt.** Deux chemins d'analyse avec deux règles opposées
   obligeraient l'interface à expliquer pourquoi certains résultats sont
   validés d'emblée et d'autres non.

---

## 18. Ordre d'implémentation proposé

| Étape | Contenu | Débloque | Dépend de |
|---|---|---|---|
| **1** | **E1** — API du détail V2 + tests IDOR | G1, U5 | D1 |
| **2** | **Enrichir `EvaluationDto`** — 6 colonnes tues | G4, U6, U7 | — |
| **3** | **Écran de validation** sur `CritereEvaluation` | G2, U1 | étape 2 |
| **4** | **E3** — file de relecture | U2 | D3 |
| **5** | **Écran des axes** + entrée de Sidebar | G3, U3 | — |
| **6** | **Écran des plans** + clarification du nommage | G3, U4, G5 | étape 5 |
| **7** | **E4** — signaux de risque consolidés | U9 | D1 |
| **8** | **Détail du critère** — attente par attente | U5 | étape 1 |
| **9** | **E5** — synthèse consolidée | U10 | étapes 1–7 |
| **10** | **E2** — trace d'exécution | — | D8 |
| **11** | **Tests IDOR** sur NC et actions correctives | G8 | — |

### Pourquoi cet ordre

**Les étapes 1 et 2 sont les seules vraiment bloquantes** : tout écran de
détail en dépend. Elles sont aussi les moins risquées — lecture seule,
aucune écriture, aucun changement de comportement.

**L'étape 3 est celle qui débloque un usage réel** : aujourd'hui, valider
une évaluation exige `curl`. C'est le geste le plus proche d'être
inutilisable en l'état.

**Les étapes 5 et 6 rendent visible ce qui existe déjà** — 4 axes en base,
une API complète, aucun écran. Coût faible, valeur immédiate.

**L'étape 10 est la moins urgente** : l'observabilité sert Smartex, pas le
client, et dépend d'une décision (D8).

---

## Vérification

Aucun fichier de code, de schéma, de migration ou de test n'a été modifié.
Les références de stabilité restent :

```
Java     : 393
Python   : 283
Frontend : vert
```

Elles n'ont pas été réexécutées : cette étape n'a touché aucun code, et les
relancer n'aurait rien éprouvé de nouveau.

---

## Clôture

**PHASE 5.8 — CARTOGRAPHIE : TERMINÉE**

**La phase 5.8 n'est pas complète** — seule son étape de cartographie l'est.

| | |
|---|---|
| Fichiers créés | `docs/PHASE5_8_CARTOGRAPHIE_RESTITUTION.md` |
| Fichiers modifiés | **AUCUN** |
| Schéma, migrations, API, frontend, permissions | **NON MODIFIÉS** |
| Écarts recensés | 3 critiques · 5 majeurs · 5 mineurs |
| Décisions métier nécessaires | 8 |
| Commit | **AUCUN** |

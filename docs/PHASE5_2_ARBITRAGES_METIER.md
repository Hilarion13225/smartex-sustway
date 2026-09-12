# PHASE 5.2 — Arbitrages métier

> Décisions à trancher avant toute migration ou bascule Java V1 → V2.
> Aucune implémentation. Tout constat est établi par lecture du code ou
> requête sur la base `smartex_sustway`. Ce qui n'est pas démontrable est
> marqué **NON DÉMONTRÉ DANS L'EXISTANT**.

---

## 1. Résumé exécutif

Sept décisions étaient attendues. **Quatre sont déjà tranchées par le schéma
existant** — il suffit de le lire. Deux demandent un arbitrage métier réel.
Une soulève un problème de gouvernance que la cartographie n'avait pas vu.

### Ce que l'existant a déjà décidé

| Question | Réponse trouvée dans | Conséquence |
|---|---|---|
| Comment gérer une évaluation contestée ? | `statut_evaluation` porte **`EN_REVUE`**, et `AuditScoreService:61-64` **l'exclut déjà du score** en la comptant à part | La mécanique de revue existe, elle n'est simplement pas câblée |
| `score_audit` vs `score_historique` ? | Leurs **contraintes d'unicité** : `UNIQUE(audit_id)` contre `UNIQUE(audit_id, date)` | Ce ne sont pas des doublons mais deux rôles distincts |
| Comment valider la réalisation d'une action ? | `statut_action_corrective` porte déjà **`VALIDEE`** | Rien à créer |
| Quelle échelle de priorité ? | `priorite_action` : `BASSE, MOYENNE, HAUTE, CRITIQUE` | Réutilisable pour les axes |

`AuditScoreDto` expose même déjà `nombreCriteresEnRevue`, et le frontend
possède une couleur pour cet état (`CritereEvaluation.jsx:36` — `violet`).
**Toute la pile a été construite en anticipant une revue humaine qui n'a
jamais été branchée.**

### Le problème de gouvernance

`audit:modifier` — la permission qui gouverne aujourd'hui les non-conformités
et les actions correctives — est détenue par **`RESPONSABLE_ENTREPRISE`,
c'est-à-dire l'entreprise auditée**. La lui donner pour valider les résultats
IA la laisserait accepter ce qui l'arrange et contester le reste. Voir §2.3.

### Les deux vrais arbitrages

1. **Le score doit-il attendre une validation humaine ?** (§2.6)
2. **Une non-conformité en cours de traitement doit-elle être remplacée par
   une ré-analyse ?** (§4)

---

## 2. Décision 1 — Validation humaine

### 2.1 État actuel

| Constat | Preuve |
|---|---|
| `AnalyseCritereService:212` écrit **`VALIDEE` directement** | RG16 : « l'analyse constitue directement l'évaluation définitive » |
| Les 44 évaluations sont **toutes `VALIDEE`** | requête base |
| `PROVISOIRE` et `EN_REVUE` existent, **jamais écrits** | `setStatut(StatutEvaluation` n'apparaît qu'une fois dans le code |
| `SourceEvaluation.EXPERT` : 21 lignes, **plus aucun code ne l'écrit** | seul `AnalyseCritereService:199` pose une source, et c'est `IA` |
| `EVALUATION_EXPERTE_ENREGISTREE` : **31 en base, 0 dans le code** | même symptôme que `MISSION_CLOTURE_LANCEE` |
| `AuditScoreService` **sait déjà** exclure `EN_REVUE` et le compter à part | lignes 45, 61-64, 101 |
| `AuditScoreDto` expose `nombreCriteresEnRevue` | déjà dans le contrat REST |

**NON DÉMONTRÉ DANS L'EXISTANT** : par quel endpoint les 21 évaluations
`EXPERT` ont été créées, et pourquoi ce chemin a été retiré.

### 2.2 Problème

Il n'existe **aucun moyen** pour un humain de valider, contester ou corriger
un résultat IA. Le score d'audit — opposable, destiné à un rapport client —
repose entièrement sur un jugement de modèle que personne n'a accepté.

### 2.3 Rôles et permissions — le point de gouvernance

| Permission | Rôles détenteurs |
|---|---|
| `analyse:executer` | ADMIN_AUDIT, RESPONSABLE_ENTREPRISE, SUPER_ADMIN |
| `audit:modifier` | ADMIN_AUDIT, RESPONSABLE_ENTREPRISE, SUPER_ADMIN |
| `rapport:detaille` | **ADMIN_AUDIT, SUPER_ADMIN** |
| `referentiel:administrer` | **ADMIN_AUDIT, SUPER_ADMIN** |

`RESPONSABLE_ENTREPRISE` est le rôle de **l'entreprise auditée** (RG05 : le
créateur d'une entreprise le reçoit). Réutiliser `audit:modifier` pour la
validation reviendrait à laisser l'audité valider son propre audit.

Deux permissions sont déjà réservées au personnel interne Smartex —
`rapport:detaille` et `referentiel:administrer`. Le précédent existe.

**Recommandation** : une permission **`evaluation:valider`**, accordée à
**`ADMIN_AUDIT` et `SUPER_ADMIN` uniquement**.

> **À VALIDER** : `ADMIN_AUDIT` porte un accès global à toutes les entreprises
> (`ROLES_ACCES_GLOBAL`). C'est cohérent avec « un seul compte gère toutes les
> missions à ce stade du produit », mais cela signifie qu'un seul rôle valide
> les audits de tous les clients.

### 2.4 Statuts nécessaires

**Aucun nouveau statut n'est nécessaire.** Les trois valeurs existantes
suffisent :

| Statut | Sens cible | Effet sur le score |
|---|---|---|
| `PROVISOIRE` | L'IA a produit un résultat, personne ne l'a regardé | Non compté — tombe dans `nombreCriteresNonEvalues` |
| `EN_REVUE` | Un humain conteste ; le résultat est suspendu | **Exclu, compté à part** — déjà implémenté |
| `VALIDEE` | Un humain a accepté le résultat | Compté dans le score |

### 2.5 Quatre gestes distincts

| Geste | Mécanisme cible | Structure nouvelle ? |
|---|---|---|
| **Consulter** un résultat IA | `GET …/evaluations` | non — existe |
| **Valider** | `PROVISOIRE → VALIDEE` | non — statut existant |
| **Contester** | `PROVISOIRE → EN_REVUE`, avec motif | motif : **NON DÉMONTRÉ** — aucune colonne |
| **Demander une nouvelle analyse** | relancer `POST …/evaluations` | non — l'append crée une nouvelle évaluation |

L'humain ne refait jamais l'évaluation : il change un statut. C'est la
différence avec le chemin `EXPERT` disparu, qui créait une évaluation
concurrente.

> Le **motif de contestation** exige une colonne. C'est le seul ajout
> structurel de cette décision.

### 2.6 Le score doit-il attendre la validation ?

#### Options

| | Mécanisme | Coût | Risque |
|---|---|---|---|
| **A** — immédiat | statu quo : l'IA écrit `VALIDEE` | nul | Le score n'a jamais été accepté par personne ; le statut « VALIDEE » ment sur son origine |
| **B** — après validation | l'IA écrit `PROVISOIRE`, l'humain valide | **une ligne de code + un endpoint** — la mécanique de score existe déjà | Goulot : 92 critères par mission à valider |
| **C** — deux scores | score IA et score validé, distincts | modèle et écrans doublés | Lequel figure au rapport ? Ambiguïté durable |

#### Recommandation : **option B**

Trois raisons, toutes appuyées sur l'existant.

**Le coût est bien moindre qu'il n'y paraît.** `AuditScoreService` sait déjà
n'inclure que les `VALIDEE`, compter les `EN_REVUE` à part, et ranger le reste
en non évalué. `AuditScoreDto` expose déjà les trois compteurs. Le seul
changement de calcul est **un littéral** à la ligne 212 d'`AnalyseCritereService`.

**Le goulot est moins lourd qu'il n'y paraît.** Valider n'est pas réévaluer :
c'est accepter un résultat déjà produit, ligne par ligne, avec sa
justification et ses éléments manquants sous les yeux. Et le score reste
lisible en cours de route — un audit à 12 critères validés sur 92 affiche un
score calculé sur 12, ce que le DTO dit déjà.

**L'option C fabrique une ambiguïté permanente.** Deux scores obligent à
répondre, à chaque écran et à chaque export, à la question « lequel ? ». Le
coût n'est pas technique, il est cognitif, et il ne disparaît jamais.

#### Impact futur

- RG16 change de sens : l'analyse produit un résultat **définitif côté IA**,
  non un résultat **officiel**. La formulation devra être révisée.
- Les 44 évaluations existantes sont `VALIDEE` sans qu'aucun humain n'ait
  validé. **À VALIDER** : les laisser telles quelles (score inchangé, mais
  statut trompeur) ou les repasser en `PROVISOIRE` (score de 5 missions
  ramené à zéro).
- Le frontend devra afficher `nombreCriteresEnRevue`, aujourd'hui exposé et
  non consommé.

---

## 3. Décision 2 — `score_audit` / `score_historique`

### 3.1 État actuel

| Table | Lignes | Contrainte d'unicité | Écrite par |
|---|---:|---|---|
| `score_historique` | **8** | `UNIQUE (audit_id, date)` | `ScoreHistoriqueService` |
| `score_audit` | **0** | **`UNIQUE (audit_id)`** | personne — dormante |
| `score_domaine` | **0** | `UNIQUE (audit_id, domaine_id)` | personne — dormante |

`ScoreHistoriqueRepository.enregistrer` fait un `ON CONFLICT (audit_id, date)
DO UPDATE` : **une ligne par jour**, mise à jour si plusieurs analyses ont
lieu le même jour.

`AuditScoreService.calculer` est un **calcul pur**, rejoué à chaque lecture —
tableau de bord, rapport, détail de mission.

### 3.2 Problème

La cartographie 5.1 signalait un risque de doublon. **Il n'y en a pas.**

### 3.3 Recommandation : trois rôles distincts, dictés par les contraintes

Les contraintes d'unicité ont déjà tranché :

| Besoin | Support | Pourquoi |
|---|---|---|
| **Score courant** | `AuditScoreService.calculer` — calcul à la volée | Toujours juste, jamais périmé. Existe et fonctionne. |
| **Historique d'évolution** | `score_historique` | `UNIQUE(audit_id, date)` = une valeur par jour. C'est la définition d'une courbe. |
| **Score officiel figé** | `score_audit` | `UNIQUE(audit_id)` = **une seule ligne par mission**. Ce n'est pas un historique, c'est un verdict. |
| **Score par domaine figé** | `score_domaine` | `UNIQUE(audit_id, domaine_id)` = un verdict par domaine |

**`score_audit` doit être écrit une fois, à la clôture de la mission** — par
`ClotureMissionService`, seul écrivain de l'état terminal. C'est ce que sa
contrainte d'unicité exprime : une mission n'a qu'un score final.

Cela lui donne un rôle qu'aucune structure ne couvre : **figer le score au
moment où la mission est déclarée close**, de sorte qu'une modification
ultérieure des données ne réécrive pas rétroactivement le résultat d'un audit
rendu.

### 3.4 Impact futur

- `ClotureMissionService` écrirait `score_audit` et `score_domaine` — il
  n'écrit aujourd'hui que `audit.statut`.
- Les deux missions `TERMINE` existantes n'ont pas de score figé. **À
  VALIDER** : rétro-remplir ou laisser à nul.
- **Aucune structure supprimée**, conformément à la consigne.

---

## 4. Décision 3 — Non-conformité remplacée

### 4.1 État actuel

| Constat | Valeur |
|---|---|
| Non-conformités | **39**, toutes `OUVERTE` |
| Critères en portant plusieurs | **11** (7 en ont 2, 2 en ont 3, 2 en ont 4) |
| Statuts disponibles | `OUVERTE`, `EN_TRAITEMENT`, `CLOTUREE` |
| Rattachement | `non_conforme.evaluation_id` — à **une évaluation**, pas à un critère |
| Génération | `NonConformiteService.genererSiNecessaire`, si `note < 5` |
| Dédoublonnage | **aucun** |

### 4.2 Problème

Chaque ré-analyse crée une évaluation, donc une non-conformité. Un critère
analysé quatre fois porte quatre non-conformités ouvertes décrivant le même
écart. **28 des 39 lignes ouvertes sont des doublons de ré-analyse.**

Le scénario du brief l'illustre : analyse A constate « preuve absente »,
analyse B constate la preuve présente — et la non-conformité de A reste
ouverte pour toujours.

### 4.3 Options

| | Mécanisme | Inconvénient |
|---|---|---|
| **A** | Statu quo | La file d'écarts ouverts gonfle indéfiniment |
| **B** | Réutiliser `CLOTUREE` | `CLOTUREE` signifie « l'organisation a corrigé ». L'employer pour « une nouvelle analyse a eu lieu » ferait croire à un travail accompli qui n'existe pas |
| **C** | Ajouter `REMPLACEE` | Une valeur d'énumération à ajouter — migration en phase 5.5 |
| **D** | Rattacher la NC au critère au lieu de l'évaluation | Casse la traçabilité vers l'analyse qui l'a produite |

### 4.4 Recommandation : **option C**

Ajouter **`REMPLACEE`** à `statut_non_conformite`.

**Mécanisme** : lorsqu'une nouvelle évaluation IA est produite pour un
critère, les non-conformités rattachées aux évaluations **antérieures du même
critère** et encore `OUVERTE` passent à `REMPLACEE`.

**Ce qui n'est pas touché** : une non-conformité déjà en `EN_TRAITEMENT` ou
`CLOTUREE`. Elle porte un travail humain en cours ou achevé, et une
ré-analyse n'a pas à l'effacer.

> **À VALIDER — c'est le second vrai arbitrage de cette phase.** Une
> non-conformité `EN_TRAITEMENT` dont la ré-analyse montre que l'écart a
> disparu : doit-elle rester ouverte jusqu'à ce que l'organisation la clôture
> elle-même, ou basculer automatiquement ? Le choix engage la responsabilité
> de la clôture.

**Aucune suppression physique.** Les 39 lignes restent, la trace est
préservée, et la file des écarts actifs cesse de gonfler.

### 4.5 Impact futur

- Migration : une valeur d'énumération, et le rétro-traitement de **28 lignes**
  actuellement `OUVERTE`.
- Les écrans filtrant sur `OUVERTE` verront leur volume chuter — effet
  recherché, à annoncer.
- `NonConformiteService` reçoit une responsabilité nouvelle : clore les
  précédentes avant de créer la nouvelle.

---

## 5. Décision 4 — Axe d'amélioration

### 5.1 État actuel

**Aucune structure n'existe.** Les pistes d'amélioration de l'IA sont
concaténées dans `non_conforme.description` — `NonConformiteService:77-78`.

### 5.2 Problème

`non_conforme` joue aujourd'hui **deux rôles à la fois** :

- un **constat d'écart**, daté, rattaché à une analyse ;
- un **objet de progrès**, qu'on suit dans le temps et auquel on rattache des
  actions correctives.

C'est cette confusion qui produit l'accumulation du §4 : ce qu'on voudrait
voir survivre aux ré-analyses est justement ce qui est rattaché à une
évaluation périssable.

### 5.3 Définition retenue

> Un **axe d'amélioration** est un objectif de progrès durable, rattaché à un
> critère d'une mission, qui survit aux ré-analyses successives et porte les
> actions engagées pour l'atteindre.

### 5.4 Distinction avec les quatre notions voisines

| Notion | Nature | Durée de vie | Rattachement |
|---|---|---|---|
| **Évaluation** | Jugement daté | Immuable, historisée | `audit_critere` |
| **Non-conformité** | Écart constaté à une analyse | Périssable — devient `REMPLACEE` | `evaluation` |
| **Recommandation IA** | Suggestion textuelle d'un modèle | Transitoire, non persistée | sortie de l'agent |
| **Axe d'amélioration** | **Objectif durable** | **Survit aux ré-analyses** | **`audit_critere`** |
| **Action corrective** | Tâche concrète, avec responsable et échéance | Cycle propre | axe + plan |

### 5.5 Modèle proposé

| Champ | Type | Motif |
|---|---|---|
| `audit_critere_id` | FK obligatoire | Le rattachement pérenne — c'est lui qui fait survivre l'axe |
| `libelle` | texte | |
| `description` | texte | |
| `origine` | `IA` / `HUMAIN` | Un axe peut naître d'une recommandation ou d'un auditeur |
| `evaluation_origine_id` | FK **nullable** | Trace l'analyse qui l'a suggéré, sans lier son sort au sien |
| `non_conforme_id` | FK **nullable** | Lien vers l'écart qui l'a motivé, facultatif |
| `reference_type` | `EXIGENCE` / `PREUVE_ATTENDUE` / `REGLE`, nullable | Rattachement V2 |
| `reference_id` | UUID nullable | **L'identifiant réel**, résolu par Java |
| `statut` | `OUVERT` / `EN_COURS` / `ATTEINT` / `ABANDONNE` | Nouvelle énumération |
| `priorite` | `priorite_action` | **Réutilise l'énumération existante** |

**Point critique sur la référence V2** : la référence de preuve attendue
(`D1-01-E1-P1`) est **locale au payload** — décision actée en validation de
référence. Elle n'a aucun sens hors de la requête qui l'a produite. Java doit
donc la **résoudre vers l'entité** avant persistance et stocker
`reference_id`, jamais la chaîne locale.

**Le rattachement doit viser la version auditée.** Une exigence existe en
autant d'exemplaires que de versions ; `D1-01` existe en 9 exemplaires
distincts en base. L'axe doit pointer l'entité de la version gelée dans la
mission.

### 5.6 Impact futur

- Nouvelle table, nouvelle énumération de statut, nouveaux endpoints.
- `NonConformiteService` cesse de concaténer les pistes IA dans la description.
- Les recommandations V2 (`actions[].rattachement`) alimentent naturellement
  les axes — c'est leur destination.

---

## 6. Décision 5 — Plan d'action

### 6.1 État actuel

| Constat | Valeur |
|---|---|
| `action_corrective` | **2 lignes**, `OUVERTE` / `HAUTE` |
| Rattachement | `non_conforme_id` uniquement |
| Statuts | `OUVERTE, EN_COURS, TERMINEE, **VALIDEE**` |
| Priorités | `BASSE, MOYENNE, HAUTE, CRITIQUE` |
| Responsable, échéance | `responsable_id`, `date_echeance` — **existent** |
| Historique | `updated_at` + 1 trigger + journal `ACTION_CORRECTIVE_STATUT_CHANGE` |
| **Preuve de réalisation** | **NON DÉMONTRÉ DANS L'EXISTANT** — aucune colonne document |

`action_corrective` couvre déjà responsable, échéance, priorité, statut et
**validation de réalisation** (`VALIDEE`). Il ne lui manque que le
regroupement et la preuve.

### 6.2 Modèle proposé

```
axe_amelioration ──1:n── action_corrective ──n:1── plan_action ──n:1── audit
```

**Le plan est au niveau de la mission, pas de l'axe.** C'est ce qui
correspond à la pratique d'audit : le livrable est un plan d'action unique
pour la mission, dont les actions se répartissent entre les axes.

Cela répond aux deux questions du brief :

- *Un axe peut-il avoir plusieurs plans ?* Indirectement oui : ses actions
  peuvent appartenir à des plans successifs. L'axe, lui, n'appartient à aucun.
- *Un plan peut-il avoir plusieurs actions ?* Oui, c'est sa raison d'être.

### 6.3 Ce qu'il faut ajouter

| Structure | Champs |
|---|---|
| `plan_action` (nouvelle) | `audit_id`, `libelle`, `date_debut`, `date_fin`, `statut`, `responsable_id` |
| `action_corrective` (existante) | `+ axe_amelioration_id` nullable, `+ plan_action_id` nullable |

`non_conforme_id` est **conservé** — les 2 lignes existantes restent valides.

### 6.4 Preuve de réalisation

**Recommandation** : réutiliser l'infrastructure `Document` / `Preuve`
existante — dépôt, contrôle de type, scan antivirus, stockage MinIO — plutôt
que d'en créer une seconde. Une table de liaison `action_corrective` ↔
`document` suffirait.

> **À VALIDER** : la preuve de réalisation d'une action est-elle une pièce
> d'audit au même titre qu'une preuve de conformité — donc soumise au même
> contrôle antivirus et au même stockage — ou une simple pièce jointe de
> suivi ?

### 6.5 Impact futur

- Une table nouvelle, deux colonnes ajoutées, une table de liaison.
- Aucun changement sur les 2 actions existantes.

---

## 7. Décision 6 — Séparation IA / humain / métier

| Élément | IA produit | Humain valide | Métier persiste | Support |
|---|:-:|:-:|:-:|---|
| Probabilité de conformité | ✅ | ✅ par le statut | ✅ | `evaluation.probabilite_conforme` |
| Confiance | ✅ | ❌ | ✅ | `evaluation.confiance_ia` |
| Couverture de preuve | ✅ | ❌ | ✅ | `evaluation.couverture_preuve` |
| Justification | ✅ | ❌ | ✅ | `evaluation.justification` |
| **Note (1-5)** | ❌ **jamais** | ❌ | ✅ | `ScoringEngine` — RG27 |
| Éléments observés | ✅ | ❌ | ⚠️ | **NON DÉMONTRÉ** — aucune colonne |
| Éléments manquants | ✅ | ❌ | ⚠️ | idem |
| Signal de risque | ✅ | ❌ | ✅ | `evaluation.signal_risque` |
| **Risque attendu RG26** | ❌ **jamais** | ❌ | ⚠️ | calculé par `ScoringEngine`, `risque_evaluation` dormante |
| Recommandation textuelle | ✅ | ❌ | ✅ | `evaluation.pistes_amelioration` |
| Non-conformité | ❌ dérivée | ✅ statut | ✅ | `non_conforme` |
| **Axe d'amélioration** | ⚠️ suggère | ✅ **crée et arbitre** | ✅ | **à créer** |
| **Action corrective** | ❌ **jamais** | ✅ **crée** | ✅ | `action_corrective` |
| **Plan d'action** | ❌ **jamais** | ✅ **crée** | ✅ | **à créer** |
| **Score** | ❌ **jamais** | ✅ indirectement | ✅ | `AuditScoreService` + `score_audit` |

### Les trois frontières à ne jamais franchir

1. **L'IA ne note pas.** RG27. La conversion probabilité → note appartient à
   `ScoringEngine`. Vérifié : le contrat V2 n'offre aucun champ de note.
2. **L'IA ne gradue pas le risque.** RG26 — `(1 − probabilité) × criticité` —
   est déterministe côté Java. Le contrat V2 refuse explicitement gravité,
   impact et probabilité de risque.
3. **L'IA n'engage personne.** Elle suggère un axe ; elle ne crée ni action,
   ni plan, ni responsable, ni échéance. Ces objets portent des engagements
   humains.

---

## 8. Décision 7 — Politique d'historisation

| Objet | Régime | Modifiable par | État |
|---|---|---|---|
| `analyse_ia` | **Immuable** après `TERMINE`/`ERREUR` | personne | dormante |
| `execution_agent` | **Immuable** | personne | dormante |
| `evaluation` | **Append-only** — jamais réécrite | personne | ✅ **existe** |
| `evaluation.statut` | **Seule exception** — transitions contrôlées | `evaluation:valider` | à câbler |
| `evaluation_document_analyse` | Immuable, liée à l'évaluation | personne | ✅ existe |
| `non_conforme` | Append-only ; seul le **statut** évolue | `audit:modifier` + automatique vers `REMPLACEE` | ⚠️ §4 |
| `axe_amelioration` | Objet **durable** — libellé et statut modifiables | `audit:modifier` | à créer |
| `action_corrective` | Durable — tous champs modifiables tant que non `VALIDEE` | `audit:modifier` | ✅ existe |
| `plan_action` | Durable | `audit:modifier` | à créer |
| `score_historique` | **Append-only** par jour, `ON CONFLICT DO UPDATE` intra-jour | service seul | ✅ existe |
| `score_audit` | **Écrit une fois**, à la clôture, jamais modifié | `ClotureMissionService` | dormante |
| `audit_log` | **Strictement immuable** | personne | ✅ existe |

### Le principe

**Ce qui constate est immuable ; ce qui engage est modifiable.** Une
évaluation constate un état à une date — elle ne se réécrit pas, on en produit
une nouvelle. Une action corrective porte un engagement humain — elle vit,
change de responsable, glisse d'échéance.

`evaluation.statut` est la seule exception, et elle est justifiée : le statut
ne décrit pas le jugement de l'IA mais **son acceptation par un humain**, qui
est un fait postérieur.

### Journalisation à compléter

Aujourd'hui : `EVALUATION_IA_CREEE`, `NON_CONFORME_STATUT_CHANGE`,
`ACTION_CORRECTIVE_CREEE`, `ACTION_CORRECTIVE_STATUT_CHANGE`.

**Manquent** : la validation ou contestation d'une évaluation, la génération
d'une non-conformité, son passage en `REMPLACEE`, la création d'un axe ou
d'un plan, et la clôture avec figeage du score.

---

## 9. Architecture métier cible

```
                    ┌── analyse_ia ────────────────────┐
    Pipeline IA V2 ─┤   statut · formule · erreur      │  (dormante → activer)
                    │   └── execution_agent × 4        │
                    └──────────────┬───────────────────┘
                                   ▼
                          evaluation  (append-only)
                          statut: PROVISOIRE
                                   │
                    ┌──────────────┼──────────────────────┐
                    ▼              ▼                      ▼
         evaluation_document   non_conforme        risque_evaluation
              _analyse         (→ REMPLACEE)          (dormante)
                                   │
        ┌─── HUMAIN : evaluation:valider ───┐
        │   VALIDEE ──► compte au score     │
        │   EN_REVUE ─► exclu, compté à part│   ← mécanique DÉJÀ implémentée
        └───────────────┬───────────────────┘
                        ▼
              axe_amelioration  (NOUVEAU — survit aux ré-analyses)
                        │
                        ▼
              action_corrective  (existe)  ──n:1──  plan_action  (NOUVEAU)
                        │
                        ▼
                    suivi : statut · responsable · échéance · preuve
                        │
                        ▼
        CLÔTURE ──► score_audit + score_domaine  (dormantes → figer)
```

---

## 10. Tableau des décisions

| # | Décision | Recommandation | Structure nouvelle | Migration | Arbitrage métier |
|---|---|---|:-:|:-:|:-:|
| 1 | Validation humaine | Permission **`evaluation:valider`**, réservée à ADMIN_AUDIT et SUPER_ADMIN | non | 1 permission + 1 colonne motif | **oui** — §2.3 |
| 1b | Moment du score | **Option B** — après validation | non | 1 littéral | **oui** — §2.6 |
| 2 | `score_audit` / `score_historique` | **Trois rôles distincts** : calcul à la volée, historique, verdict figé | non | non — activer les dormantes | non |
| 3 | Non-conformité remplacée | **`REMPLACEE`**, sans toucher `EN_TRAITEMENT` | non | 1 valeur d'énum + 28 lignes | **oui** — §4.4 |
| 4 | Axe d'amélioration | Rattaché au **critère**, référence V2 résolue | **oui** | table + énum | non |
| 5 | Plan d'action | **Au niveau mission**, actions rattachées à un axe | **oui** | table + 2 colonnes | non |
| 6 | IA / humain / métier | Trois frontières : pas de note, pas de gradation de risque, pas d'engagement | non | non | non |
| 7 | Historisation | Ce qui constate est immuable, ce qui engage est modifiable | non | journalisation à compléter | non |

**Deux tables nouvelles au total** : `axe_amelioration` et `plan_action`.
Tout le reste réutilise ou active l'existant.

---

## 11. Questions restantes

| # | Question | Bloque |
|---|---|---|
| Q1 | Le score doit-il attendre la validation humaine ? | 5.3, 5.8 |
| Q2 | Les 44 évaluations `VALIDEE` sans validateur : conservées ou repassées en `PROVISOIRE` ? | 5.8 |
| Q3 | Une non-conformité `EN_TRAITEMENT` peut-elle être remplacée par une ré-analyse ? | 5.5 |
| Q4 | `ADMIN_AUDIT` a un accès global : un seul rôle valide tous les clients — acceptable ? | 5.8 |
| Q5 | La contestation exige-t-elle un motif obligatoire ? | 5.8 |
| Q6 | La preuve de réalisation d'une action passe-t-elle par le circuit `Document` complet ? | 5.7 |
| Q7 | Les deux missions `TERMINE` doivent-elles recevoir un `score_audit` rétroactif ? | 5.3 |
| Q8 | Les sorties V2 structurées doivent-elles être persistées ? | 5.9 |
| Q9 | `risque_evaluation` : figer RG26 ou continuer à le recalculer ? | 5.4 |

**NON DÉMONTRÉ DANS L'EXISTANT** — quatre points :

1. Par quel endpoint les 21 évaluations `EXPERT` ont été créées.
2. Pourquoi ce chemin a été retiré.
3. L'usage prévu de `SCORING` et `REPORTING` dans `type_agent_ia`.
4. Toute notion de preuve de réalisation d'une action corrective.

---

## 12. Ordre recommandé des sous-phases 5.3 → 5.9

| Phase | Objet | Dépend de | Justification du rang |
|---|---|---|---|
| **5.3** | **Traçabilité IA** — `version_referentiel`, `modele_ia`, `contrat_version`, `document_id` | rien | Colonnes additives, aucun changement de comportement, aucune décision en attente |
| **5.4** | **Suivi d'exécution** — activer `analyse_ia`, `execution_agent` | 5.3 | Tables déjà présentes ; répond aux gaps « analyse en cours » et « analyse échouée » |
| **5.5** | **Cycle de vie des non-conformités** — `REMPLACEE` | **Q3** | Corrige un défaut avéré sur 28 lignes réelles |
| **5.6** | **Axes d'amélioration** | 5.5 | Sépare l'écart constaté de l'objet suivi |
| **5.7** | **Plans d'action et suivi** | 5.6, **Q6** | Regroupe des actions qui existent déjà |
| **5.8** | **Validation humaine** | **Q1, Q2, Q4, Q5** | Le plus lourd en gouvernance ; techniquement léger |
| **5.9** | **Persistance des sorties V2** | **bascule Java V2** | Bloquée par une phase extérieure |

**5.3 peut démarrer immédiatement** — aucune question ouverte ne la bloque.

**5.8 est techniquement la plus légère et politiquement la plus lourde.** La
mécanique existe déjà dans `AuditScoreService` ; ce qui manque est une
décision sur qui valide, et sur ce qu'on fait des 44 évaluations existantes.

**5.9 reste bloquée par une phase qui n'appartient pas au périmètre 5.**
Concevoir la persistance de sorties qu'aucun code de production ne produit
encore serait prématuré.

---

## Verdict

### PHASE 5.2 : **VALIDÉE**

Les sept décisions sont instruites et une recommandation argumentée est
formulée pour chacune. Aucune n'est prise unilatéralement : les cinq qui
engagent le métier sont assorties d'un **À VALIDER** explicite, et les neuf
questions ouvertes du §11 sont nommées avec la sous-phase qu'elles bloquent.

**Trois enseignements dominent cette phase :**

1. **L'existant avait déjà décidé plus qu'on ne le croyait.** `EN_REVUE`
   implémenté dans le calcul de score, `nombreCriteresEnRevue` exposé au
   contrat REST, une couleur prévue côté frontend, `VALIDEE` disponible sur
   les actions correctives, et des contraintes d'unicité qui distinguent sans
   ambiguïté les trois tables de score. La validation humaine n'a pas à être
   inventée : elle a été prévue, puis jamais câblée.

2. **Deux tables nouvelles suffisent.** `axe_amelioration` et `plan_action`.
   Tout le reste réutilise l'existant ou active une dormante.

3. **Un problème de gouvernance était invisible en 5.1.** `audit:modifier`
   est détenue par l'entreprise auditée. La réutiliser pour valider les
   résultats IA laisserait l'audité valider son propre audit. Ce n'est pas un
   problème technique, et aucune migration ne le résoudra.

---

*Aucun fichier du projet n'a été modifié à l'exception du présent rapport.
Aucune migration. Aucune donnée. Aucun commit.*

# PHASE 5.1 — Cartographie des résultats d'analyse

> Établi par lecture du code et de la base de développement `smartex_sustway`.
> Aucune modification. Ce qui n'est pas démontrable est marqué
> **NON DÉMONTRÉ DANS L'EXISTANT**.

---

## 1. État actuel

Le pipeline d'analyse produit aujourd'hui **quatre écritures** par critère
analysé, dans cet ordre, toutes dans la même transaction que
`AnalyseCritereService.analyser` :

```
Gemini → EvaluerCritereResponseDto
           ↓
       Evaluation                    (1 ligne, source = IA)
       EvaluationDocumentAnalyse     (1 ligne par document lu)
       NonConforme                   (0 ou 1 ligne, si note < 5)
       ScoreHistorique               (1 ligne, instantané du score global)
```

Au-delà, rien n'est persisté. Les **axes d'amélioration**, les **plans
d'action** et le **suivi** n'existent pas comme entités : les pistes
d'amélioration de l'IA sont concaténées dans le texte de la non-conformité.

La chaîne s'arrête là où la Phase 5 commence.

---

## 2. Tables existantes

### 2.1 Structures actives — entité Java + dépôt + écriture réelle

| Table | Lignes | Colonnes | Alimentée par |
|---|---:|---|---|
| `evaluation` | **44** | `id, audit_critere_id, probabilite_conforme, note, confiance_ia, justification, source, auteur_id, date_evaluation, version_referentiel, statut, signal_risque, categorie_risque, justification_risque, recommandation_necessaire, pistes_amelioration, couverture_preuve, niveau_declare` | `AnalyseCritereService` |
| `evaluation_document_analyse` | **13** | `id, evaluation_id, nom, resume, ordre` | `AnalyseCritereService` |
| `non_conforme` | **39** | `id, evaluation_id, titre, description, niveau, risque_attendu, statut, created_at` | `NonConformiteService` |
| `action_corrective` | **2** | `id, non_conforme_id, titre, description, responsable_id, date_echeance, statut, priorite, created_at, updated_at` | `ActionCorrectiveResource` (saisie humaine) |
| `score_historique` | **8** | `id, audit_id, date, score_global` | `ScoreHistoriqueService` |

### 2.2 Structures dormantes — table SQL sans entité Java

| Table | Lignes | Colonnes | Entité | Dépôt |
|---|---:|---|:-:|:-:|
| `analyse_ia` | **0** | `id, audit_id, statut, formule, date_debut, date_fin, erreur` | ❌ | ❌ |
| `execution_agent` | **0** | `id, analyse_ia_id, agent, statut, input_reference, output_reference, date_debut, date_fin` | ❌ | ❌ |
| `risque_evaluation` | **0** | `id, evaluation_id, probabilite, criticite_poids, risque_attendu, niveau_priorite, date_calcul` | ❌ | ❌ |
| `score_audit` | **0** | `id, audit_id, score_global, date_calcul` | ❌ | ❌ |
| `score_domaine` | **0** | `id, audit_id, domaine_id, score, coefficient_total, date_calcul` | ❌ | ❌ |
| `critere_ponderation` | **0** | `critere_id, entreprise_id, coefficient` | ❌ | ❌ |

Ces six tables n'ont **aucun code Java** : ni entité, ni dépôt, ni service.
Elles ne sont ni lues, ni écrites. Leurs énumérations existent pourtant :

- `statut_pipeline` : `EN_ATTENTE, EN_COURS, TERMINE, ERREUR`
- `statut_execution_agent` : `EN_ATTENTE, EN_COURS, TERMINE, ERREUR`
- `type_agent_ia` : `DOCUMENT, EVIDENCE, COMPLIANCE, RISK, SCORING, RECOMMENDATION, REPORTING`
- `formule_pipeline` : `STANDARD, AVANCEES`
- `niveau_non_conformite` : `MINEURE, MODEREE, MAJEURE, CRITIQUE`

---

## 3. Services existants

| Service | Rôle | Écrit |
|---|---|---|
| `AnalyseCritereService` | Orchestre le pipeline IA d'un critère | `evaluation`, `evaluation_document_analyse` |
| `NonConformiteService` | Génère une non-conformité si `note < 5` (RG27) | `non_conforme` |
| `ScoreHistoriqueService` | Instantané du score global | `score_historique` |
| `AuditScoreService` | **Calcule** le score — sans effet de bord | rien |
| `ScoringEngine` | Probabilité → niveau (RG27) ; risque attendu (RG26) | rien, statique |
| `RapportGenerationService` | Lit évaluations, non-conformités, actions | rien |
| `IndicePreparationService` | Lit les évaluations | rien |

`AuditScoreService.calculer(audit)` est un **calcul pur, rejoué à chaque
lecture** — tableau de bord, rapport, détail de mission. Le score global n'est
donc jamais stocké autrement que par les instantanés de `score_historique`.

---

## 4. Endpoints existants

| Endpoint | Permission |
|---|---|
| `POST …/criteres/{auditCritereId}/evaluations` | `analyse:executer` |
| `GET …/criteres/{auditCritereId}/evaluations` | accès entreprise |
| `GET …/audits/{auditId}/non-conformites` | accès entreprise |
| `GET …/non-conformites/{id}` | accès entreprise |
| `PUT …/non-conformites/{id}/statut` | `audit:modifier` |
| `GET …/non-conformites/{id}/actions` | accès entreprise |
| `POST …/non-conformites/{id}/actions` | `audit:modifier` |
| `PUT …/actions/{id}/statut` | `audit:modifier` |

**Aucun endpoint** n'existe pour : lancer une analyse de mission entière et en
suivre l'avancement, consulter un risque, gérer un axe d'amélioration, gérer
un plan d'action, ou **valider humainement un résultat IA**.

---

## 5. Données réellement persistées

### 5.1 Évaluations

| Champ | Renseigné | Lecture |
|---|---:|---|
| `probabilite_conforme`, `note`, `confiance_ia` | 44/44 | cœur du scoring |
| `couverture_preuve` | 23/44 | ajouté en cours de route |
| `signal_risque`, `pistes_amelioration` | 21/44 | formule AVANCEES seule |
| `niveau_declare` | 16/44 | |
| **`version_referentiel`** | **0/44** | **colonne existante, jamais écrite** |

### 5.2 L'historisation fonctionne déjà

Une nouvelle analyse **n'écrase jamais** la précédente :

| Évaluations sur un même critère | Nombre de critères |
|---:|---:|
| 1 | 10 |
| 2 | 6 |
| 3 | 2 |
| 4 | 4 |

`EvaluationRepository.laPlusRecenteParAuditCritere` sélectionne par
`order by dateEvaluation desc`. C'est un acquis important : **la Phase 5 n'a
pas à concevoir l'historisation des évaluations, elle existe.**

### 5.3 Mais les non-conformités s'accumulent

| Non-conformités sur un même critère | Nombre de critères |
|---:|---:|
| 1 | 11 |
| 2 | 7 |
| 3 | 2 |
| 4 | 2 |

**Les 39 non-conformités sont toutes `OUVERTE`.** Un critère analysé quatre
fois porte quatre non-conformités ouvertes décrivant le même écart.

La cause est structurelle : `non_conforme.evaluation_id` rattache la
non-conformité à **une évaluation**, non à un critère. Chaque ré-analyse crée
une évaluation, donc une non-conformité. Aucun mécanisme ne clôt ni ne
remplace les précédentes.

Répartition par niveau : `MODEREE` 17, `MAJEURE` 12, `MINEURE` 10, `CRITIQUE` 0.

### 5.4 La validation humaine est un chemin mort

| Source | Lignes | Auteur renseigné | Période |
|---|---:|---:|---|
| `IA` | 23 | 0 | 07 → 10 sept. |
| `EXPERT` | 21 | 21 | 07 → 08 sept., **puis plus rien** |

`SourceEvaluation.EXPERT` n'est **écrit nulle part** dans le code actuel :
seul `AnalyseCritereService:199` pose une source, et c'est `IA`.

L'action de journal `EVALUATION_EXPERTE_ENREGISTREE` compte **31 occurrences**
en base et **0 dans le code**. C'est le même symptôme que
`MISSION_CLOTURE_LANCEE`, également absent du code.

**Il n'existe aujourd'hui aucun moyen pour un humain de valider, corriger ou
contester un résultat IA.** Le mécanisme a existé, il a disparu.

### 5.5 Journal d'audit

484 lignes. Actions liées aux résultats :

| Action | Occurrences | Existe dans le code |
|---|---:|:-:|
| `EVALUATION_EXPERTE_ENREGISTREE` | 31 | ❌ |
| `EVALUATION_IA_CREEE` | 24 | ✅ |
| `ACTION_CORRECTIVE_CREEE` | 3 | ✅ |
| `NON_CONFORME_STATUT_CHANGE` | 1 | ✅ |
| `ACTION_CORRECTIVE_STATUT_CHANGE` | 1 | ✅ |

Aucune journalisation de la génération d'une non-conformité, ni d'un
instantané de score.

---

## 6. Structures dormantes — que faire ?

Les six tables vides ne sont pas des reliquats : leur schéma correspond
précisément aux besoins de la Phase 5. **Aucune ne devrait être remplacée par
une table nouvelle.**

| Table | Ce qu'elle couvre | Verdict |
|---|---|---|
| `analyse_ia` | Une passe d'analyse : statut, formule, début, fin, erreur | **RÉUTILISER** — répond à « analyse en cours » et « analyse échouée » |
| `execution_agent` | Un agent d'une passe : lequel, statut, entrée, sortie, durée | **RÉUTILISER** — traçabilité par agent ; `type_agent_ia` contient déjà les quatre agents V2 |
| `risque_evaluation` | RG26 persisté : probabilité, poids de criticité, risque attendu, priorité | **À ARBITRER** — recalculable à la volée ; le persister fige le risque au moment de l'analyse |
| `score_audit` | Score global figé | **À ARBITRER** — recouvre `score_historique`, risque de doublon |
| `score_domaine` | Score par domaine figé | **RÉUTILISER** — aucune structure ne le couvre |
| `critere_ponderation` | Pondération par entreprise | **NE PAS TOUCHER** — hors périmètre Phase 5 |

> **Risque de doublon identifié** : `score_audit` et `score_historique` portent
> la même information — score global d'une mission à une date. Créer ou activer
> l'un sans trancher le sort de l'autre installerait deux vérités concurrentes.

`type_agent_ia` comporte `SCORING` et `REPORTING`, absents du pipeline V2.
**NON DÉMONTRÉ DANS L'EXISTANT** — aucun code ne les utilise.

---

## 7. Gaps fonctionnels

| # | Gap | Gravité |
|---|---|---|
| G1 | **Aucune validation humaine des résultats IA** — chemin disparu, §5.4 | **critique** |
| G2 | **Les non-conformités s'accumulent** à chaque ré-analyse, §5.3 | **critique** |
| G3 | Aucune notion d'**axe d'amélioration** — les pistes IA sont noyées dans le texte de la non-conformité | élevée |
| G4 | Aucune notion de **plan d'action** — `action_corrective` existe mais est isolée, sans regroupement ni échéancier global | élevée |
| G5 | Aucun **suivi** : ni avancement, ni relance, ni historique de statut au-delà du journal | élevée |
| G6 | Aucun **risque persisté** — RG26 est recalculé, jamais figé | moyenne |
| G7 | Aucun **suivi d'analyse en cours** — l'appel est synchrone, rien ne dit qu'une analyse tourne | moyenne |
| G8 | Aucune **trace d'analyse échouée** — l'échec rend un 503 et disparaît | moyenne |
| G9 | Aucun **score par domaine** persisté | faible |

---

## 8. Gaps techniques

| # | Gap | Constat |
|---|---|---|
| T1 | `evaluation.version_referentiel` **jamais renseignée** | 0/44 — impossible de savoir sous quelle version un résultat a été produit |
| T2 | **Modèle IA non tracé** | aucune colonne ; un changement de modèle change les résultats sans laisser de trace |
| T3 | **Version du contrat IA non tracée** | aucune colonne |
| T4 | **Aucun rattachement fin** | `evaluation` pointe `audit_critere_id` et rien d'autre : ni exigence, ni preuve attendue, ni règle, ni document |
| T5 | **Les sorties V2 n'ont pas de colonne** | `constats`, `evaluations`, `elements_manquants`, `signaux`, `actions`, `confiance_lecture` |
| T6 | **Aucune journalisation applicative Python** | les `logger.exception` du service d'agents sont silencieux |
| T7 | **Les deux justifications d'Evidence sont concaténées** | `evaluations.py:169` — on perd la distinction couverture / fond |
| T8 | `evaluation_document_analyse` ne relie pas au **document d'origine** | seulement `nom` et `resume` ; aucun `document_id` |

---

## 9. Architecture cible proposée

```
                         ┌─────────────── analyse_ia ───────────────┐
                         │  une passe : statut, formule, erreur     │
                         │      └── execution_agent (× 4)           │
                         └──────────────────┬───────────────────────┘
                                            │ produit
   IA V2 ──────────────────────────────────►│
                                            ▼
                                       Evaluation                    (A + B)
                                            │
                        ┌───────────────────┼───────────────────┐
                        ▼                   ▼                   ▼
                  Risque (C)          Axe d'amélioration (D)   Constats V2 (A)
                        │                   │
                        └─────────┬─────────┘
                                  ▼
                        Action corrective (E)
                                  │
                                  ▼
                          Plan d'action (F)
                                  │
                                  ▼
                             Suivi (G)
```

### Les sept natures, distinguées

| | Nature | Durée de vie | Support proposé |
|---|---|---|---|
| **A** | Données IA techniques | jetables après lecture | `execution_agent` + colonnes de traçabilité |
| **B** | Résultats métier persistants | permanents, historisés | `evaluation` (existe) |
| **C** | Risques | figés à l'analyse | `risque_evaluation` (dormante) |
| **D** | Axes d'amélioration | permanents, cycle propre | **manquant** |
| **E** | Actions correctives | permanents, cycle propre | `action_corrective` (existe) |
| **F** | Plans d'action | regroupement d'actions | **manquant** |
| **G** | Historique / audit | permanent, immuable | `audit_log` (existe) |

**Le point de conception le plus important** : aujourd'hui,
`non_conforme` joue simultanément le rôle de **constat d'écart** (B) et
d'**axe d'amélioration** (D) — d'où l'accumulation du G2. Les séparer résout
le problème sans supprimer la table : la non-conformité reste l'écart constaté
à une évaluation donnée, l'axe d'amélioration devient l'objet durable qu'on
suit dans le temps et qui survit aux ré-analyses.

---

## 10. Modèle de données cible

### 10.1 Réutilisation sans migration

| Structure | Usage cible |
|---|---|
| `evaluation` | Résultat B, inchangé |
| `evaluation_document_analyse` | Constats A, inchangé |
| `non_conforme` | **Écart constaté**, rattaché à une évaluation — inchangé |
| `action_corrective` | Action E, inchangé |
| `audit_log` | Historique G, inchangé |

### 10.2 Activation de structures dormantes — sans création

| Table | Ce qu'il faut ajouter |
|---|---|
| `analyse_ia` | entité + dépôt + service |
| `execution_agent` | idem |
| `risque_evaluation` | idem — **si** l'arbitrage §6 conclut à persister |
| `score_domaine` | idem |

### 10.3 Colonnes à ajouter sur l'existant

| Table | Colonne | Motif |
|---|---|---|
| `evaluation` | `analyse_ia_id` | rattacher une évaluation à sa passe |
| `evaluation` | `modele_ia`, `contrat_version` | T2, T3 |
| `evaluation` | *(renseigner `version_referentiel`)* | T1 — la colonne existe |
| `evaluation_document_analyse` | `document_id` | T8 |

### 10.4 Structures nouvelles — le strict minimum

Deux seulement, et aucune n'est couverte par une table existante :

| Structure | Rôle | Rattachements |
|---|---|---|
| `axe_amelioration` | Objet durable de progrès, survivant aux ré-analyses | `audit_critere_id`, référence V2 (exigence / preuve attendue / règle), statut, origine |
| `plan_action` | Regroupement d'actions avec échéance et responsable | `audit_id`, statut, période |

`action_corrective` recevrait alors `axe_amelioration_id` et `plan_action_id`,
**en conservant** `non_conforme_id` pour ne rien casser.

> **À ARBITRER** : les sorties V2 structurées (`constats`, `signaux`,
> `elements_manquants`) doivent-elles être persistées, ou restent-elles
> transitoires ? Les persister suppose des colonnes JSONB ou des tables
> filles ; ne pas les persister rend le résultat IA non ré-explicable après
> coup.

---

## 11. Relations résultats / risques / axes / actions

```
audit_critere ──1:n── evaluation ──1:n── non_conforme ──1:n── action_corrective
                          │                                          │
                          ├──1:1── risque_evaluation                 │
                          │                                          │
                          └──1:n── evaluation_document_analyse       │
                                                                     │
audit_critere ──1:n── axe_amelioration ──────────1:n─────────────────┤
                                                                     │
audit ──────── 1:n ── plan_action ───────────────1:n─────────────────┘
```

**Règle de rattachement proposée** : un axe d'amélioration se rattache au
**critère** (pérenne), une non-conformité à l'**évaluation** (datée). C'est
cette différence qui résout G2 — l'axe survit à la ré-analyse, la
non-conformité l'accompagne sans la remplacer.

**Rattachement aux références V2** : l'axe porte le triplet
`(niveau, reference)` du contrat V2 — `EXIGENCE`, `PREUVE_ATTENDUE` ou
`REGLE`. La référence de preuve attendue étant **locale au payload**
(cf. validation de référence), elle doit être **résolue par Java** vers
l'entité avant persistance : on stocke l'identifiant réel, jamais la
référence locale.

---

## 12. Stratégie d'historisation

| Objet | Stratégie | Statut |
|---|---|---|
| `evaluation` | **Append-only**, sélection par `laPlusRecenteParAuditCritere` | ✅ **existe déjà** |
| `evaluation_document_analyse` | Rattaché à l'évaluation, donc historisé de fait | ✅ existe |
| `non_conforme` | Append-only aujourd'hui, mais **sans clôture** — cause du G2 | ⚠️ à corriger |
| `analyse_ia` | Une ligne par passe, jamais réécrite | à activer |
| `axe_amelioration` | Objet durable, **statut** modifié, jamais dupliqué | à créer |
| `score_historique` | Append-only | ✅ existe |

**Proposition pour G2** : lors d'une nouvelle analyse d'un critère, les
non-conformités des évaluations antérieures passent à un statut terminal —
`REMPLACEE` ou `OBSOLETE` — plutôt que de rester `OUVERTE`. Elles restent en
base, la trace est préservée, et la file des écarts ouverts cesse de gonfler.

> Cela suppose d'ajouter une valeur à l'énumération de statut.
> **À ARBITRER** avec le métier : « remplacée » et « corrigée » ne veulent pas
> dire la même chose pour un auditeur.

---

## 13. Stratégie de validation humaine

C'est le gap le plus lourd (**G1**), et le plus délicat.

L'existant offre deux pistes, et aucune n'est complète :

1. **`SourceEvaluation.EXPERT`** — l'énumération existe, 21 lignes en base,
   `auteur_id` renseigné. Mais **aucun code ne l'écrit plus**. Le chemin a
   été retiré, pas déprécié.
2. **`Evaluation.statut`** — `PROVISOIRE` / `VALIDEE`. Aujourd'hui
   `AnalyseCritereService:212` pose **`VALIDEE` directement** (RG16 :
   « l'analyse constitue directement l'évaluation définitive »).

**Trois options, à arbitrer avec le métier :**

| Option | Mécanisme | Conséquence |
|---|---|---|
| **A** | Rétablir l'évaluation experte : une nouvelle `evaluation` de source `EXPERT` remplace celle de l'IA | Aucun changement de schéma ; l'historique montre les deux ; RG16 inchangée |
| **B** | Utiliser `statut` : l'IA produit `PROVISOIRE`, l'humain valide en `VALIDEE` | **Change RG16** — le score ne se calculerait plus qu'après validation |
| **C** | Champ de validation distinct sur `evaluation` | Nouvelle colonne ; sépare le résultat de son acceptation |

L'option **A** est la moins invasive et réutilise ce qui existe. Elle ne
répond cependant pas à « l'humain conteste sans reprendre le calcul ».

> **À ARBITRER** : le score doit-il refléter le jugement de l'IA dès l'analyse
> (RG16 actuelle), ou attendre une validation humaine ? La réponse détermine
> l'option, et elle engage la valeur juridique du rapport d'audit.

---

## 14. Stratégie de traçabilité IA

Pour qu'un résultat soit ré-explicable après coup, il faut pouvoir répondre à
sept questions. Voici ce que l'existant permet :

| Question | Aujourd'hui | Support cible |
|---|---|---|
| Quelle mission, quel critère ? | ✅ `audit_critere_id` | inchangé |
| Quelle version de référentiel ? | ❌ colonne vide | renseigner `version_referentiel` |
| Quel modèle IA ? | ❌ | colonne `modele_ia` |
| Quelle version de contrat ? | ❌ | colonne `contrat_version` |
| Quels agents ont tourné ? | ❌ | `execution_agent` |
| Quels documents lus ? | ⚠️ nom + résumé, sans `document_id` | ajouter `document_id` |
| Quelle exigence / preuve / règle visée ? | ❌ | rattachement V2 résolu par Java |

**Ce qui ne doit pas être stocké** : le texte intégral des prompts —
reconstructible depuis le contexte et la version du contrat, et le stocker
dupliquerait des données métier dans une table technique. Le contenu des
documents — déjà dans MinIO, sous contrôle d'accès.

**Analyse en cours et analyse échouée** (G7, G8) : `analyse_ia` porte déjà
`statut ∈ {EN_ATTENTE, EN_COURS, TERMINE, ERREUR}` et une colonne `erreur`.
Rien à créer.

---

## 15. Contraintes existantes à respecter

| Contrainte | État | Incidence Phase 5 |
|---|---|---|
| **Multi-tenant** | `exigerAccesEntreprise` sur tous les endpoints de résultats | Toute nouvelle route doit le porter |
| **RBAC** | `analyse:executer` pour analyser, `audit:modifier` pour les non-conformités et actions | Un axe d'amélioration relève-t-il de `audit:modifier` ? **À ARBITRER** |
| **`analyse:executer` ≠ `audit:cloturer`** | Séparation vérifiée bout en bout | Ne pas la contourner par une route de résultats |
| **Versionnement des référentiels** | Mission gelée sur une version ; publication crée de nouvelles lignes | Un axe d'amélioration rattaché à une exigence doit pointer l'entité de **la version auditée** |
| **Immutabilité des versions publiées** | Trigger PostgreSQL | Aucune écriture de résultat ne doit toucher le catalogue |
| **Isolation mission / référentiel** | `critere.id` propre à la version | Vérifié empiriquement : `D1-01` existe en 9 exemplaires distincts |
| **Historique** | `audit_log` alimenté partiellement | Journaliser les nouveaux gestes : création d'axe, de plan, validation humaine |
| **Cycle de vie des missions** | `TERMINE` écrit uniquement par `ClotureMissionService` | Une action corrective sur mission close : autorisée ? **À ARBITRER** |

---

## 16. Risques de régression

| # | Risque | Portée |
|---|---|---|
| R1 | **Doublon `score_audit` / `score_historique`** — deux vérités concurrentes | élevée |
| R2 | **Changer RG16** (option B du §13) modifierait le moment du calcul de score, donc les scores affichés | élevée |
| R3 | **Clore les non-conformités antérieures** (§12) modifie 28 lignes existantes actuellement `OUVERTE` | moyenne |
| R4 | Renseigner `version_referentiel` laisse **44 lignes historiques à nul** — les traitements devront tolérer les deux | moyenne |
| R5 | Ajouter `analyse_ia_id` sur `evaluation` : nullable pour les 44 lignes existantes | faible |
| R6 | Activer `risque_evaluation` sans retirer le calcul à la volée créerait deux sources pour RG26 | moyenne |
| R7 | Les 21 évaluations `EXPERT` orphelines n'ont **aucun endpoint** pour être relues ou corrigées | faible |
| R8 | Le pipeline V2 n'étant pas branché, la Phase 5 conçoit sur un **contrat non encore en production** | **structurelle** |

> **R8 mérite d'être pesé avant d'engager la Phase 5.2.** Concevoir la
> persistance des sorties V2 alors que Java émet encore le V1 revient à
> préparer des colonnes pour des données qu'aucun code ne produit encore.

---

## 17. Ordre recommandé des sous-phases

| Sous-phase | Objet | Dépendance | Pourquoi ce rang |
|---|---|---|---|
| **5.2** | **Arbitrages métier** — validation humaine (§13), sort de `score_audit` (§6), statut des non-conformités remplacées (§12), périmètre du secteur | aucune | Trois décisions conditionnent tout le reste du modèle |
| **5.3** | **Traçabilité IA** — `version_referentiel`, `modele_ia`, `contrat_version`, `document_id` | 5.2 | Colonnes additives, aucun changement de comportement, gain immédiat |
| **5.4** | **Suivi d'exécution** — activer `analyse_ia` et `execution_agent` | 5.3 | Répond à G7 et G8 avec des tables déjà présentes |
| **5.5** | **Correction du G2** — cycle de vie des non-conformités | 5.2 | Corrige un défaut avéré sur données réelles |
| **5.6** | **Axes d'amélioration** — nouvelle structure, rattachement V2 | 5.5 | Sépare enfin l'écart constaté de l'objet suivi |
| **5.7** | **Plans d'action et suivi** | 5.6 | Regroupe ce qui existe déjà en actions |
| **5.8** | **Validation humaine** | 5.2 | Le plus lourd ; dépend entièrement de l'arbitrage |
| **5.9** | **Persistance des sorties V2** | bascule Java | **Ne peut pas précéder le branchement du V2** |

**5.2 et 5.3 peuvent démarrer immédiatement.** 5.9 est bloquée par une phase
extérieure à la Phase 5.

---

## Verdict

### PHASE 5.1 CARTOGRAPHIE : **VALIDÉE**

Tout ce qui figure ci-dessus est établi par lecture du code ou requête sur la
base de développement. Les trois points marqués **NON DÉMONTRÉ DANS
L'EXISTANT** sont : l'usage de `SCORING` et `REPORTING` dans `type_agent_ia`,
l'origine des 21 évaluations `EXPERT`, et l'origine des 31 entrées de journal
`EVALUATION_EXPERTE_ENREGISTREE`.

**Trois constats appellent une décision avant toute conception détaillée :**

1. **La validation humaine n'existe plus** — le chemin a été retiré, laissant
   21 lignes et une énumération orphelines.
2. **Les non-conformités s'accumulent** — 28 des 39 lignes ouvertes sont des
   doublons de ré-analyse.
3. **Les six tables dormantes couvrent l'essentiel du besoin** — aucune
   structure nouvelle n'est nécessaire, sauf pour l'axe d'amélioration et le
   plan d'action.

---

*Aucun fichier du projet n'a été modifié à l'exception du présent rapport.
Aucune migration. Aucune donnée. Aucun commit.*

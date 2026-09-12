# PHASE 5.7-C CORRECTIVE — Orchestration IA V2 et exposition des résultats

## SMARTEX SUSTWAY

> Cette phase corrige les trois échecs de la 5.7-C initiale : F1
> (orchestration absente), F2 (axes et plans sans API) et l'arbitrage RBAC.
>
> **Le pipeline V2 a tourné de bout en bout contre le vrai Gemini**, et son
> résultat est persisté. Ce n'est pas une déduction : la sortie brute figure
> au §F.
>
> Aucun commit.

---

## A. Ce qui était déjà réussi en 5.7-C

Repris sans modification, et revérifié en fin de phase :

| | |
|---|---|
| Migrations V59 → V69 | appliquées, non retouchées |
| 44 évaluations historiques | intactes, somme de contrôle identique |
| 39 non-conformités | 22 courantes / 17 historiques, 0 doublon |
| Index unique partiel | en service |
| `analyse_ia`, `execution_agent` | entités et dépôts créés |
| Structures axes / plans | créées |
| Permission `evaluation:valider` | créée |

Ce qui manquait : le fil reliant les agents, et l'API exposant axes et plans.

---

## B. F1 — L'orchestration

### Le diagnostic, confirmé

`/api/v2/evaluations/critere` validait le contrat et rendait
`agents_executes=[]`. Les quatre agents fonctionnaient et étaient éprouvés
contre le vrai Gemini ; **ce n'était pas leur qualité qui manquait, c'était
le chaînage.** Aucun agent n'a été réécrit.

### Ce qui a été construit

`app/services/orchestration_v2.py` — un module dont la responsabilité
s'arrête à quatre gestes : préparer l'entrée de chaque agent, l'appeler,
passer sa sortie au suivant, agréger.

**Ce qu'il ne fait pas**, et cette liste est le cœur de sa conception :
aucun accès à PostgreSQL ou MinIO, aucune création d'évaluation, de
non-conformité ou d'axe, aucune validation, aucun calcul de score. Il rend
un résultat ; Java décide de ce qu'il en fait. Cette séparation garantit
qu'un service qui parle à un modèle de langage ne puisse jamais écrire dans
la base métier.

Une route nouvelle, `/critere/executer`, en **plus** de `/critere` qui reste
la validation contractuelle sans effet. Les deux répondent à deux besoins
distincts : éprouver un payload sans consommer de quota, et produire un
résultat.

### Le contenu brut ne circule qu'une fois

Chaque pièce est lue par le Document Agent, à qui elle est destinée. Les
agents suivants ne reçoivent que des `AnalyseDocumentV2` — des constats,
jamais des octets. Vérifié par un test qui inspecte ce qui est réellement
transmis à chaque agent :

```python
for agent, kwargs in journal:
    contenu = kwargs.get("contents")
    if agent == "DOCUMENT":
        assert isinstance(contenu, list)   # [Part binaire, prompt]
        continue
    assert "Code de conduite validé par la direction" not in contenu
```

### Dégradation

| Agent | Politique | Motif |
|---|---|---|
| Document | **bloquant** | Conclure sur des pièces qu'on n'a pas pu soumettre reviendrait à juger sans avoir regardé |
| Evidence | **bloquant** | Sans lui, il n'y a pas de résultat de conformité |
| Risk | facultatif | Son échec est classé et tracé, le résultat Evidence est conservé |
| Recommendation | facultatif | Idem |

Le statut de la passe devient `PARTIEL` — jamais `TERMINE` — quand un agent
facultatif a échoué. **Aucun échec n'est converti en succès.**

### Une seule instrumentation

`appel_gemini.py` reste l'unique point de passage vers le fournisseur ; il
n'en a pas été créé de second. Il lui a été ajouté une **collecte
optionnelle de traces**, que l'orchestrateur ouvre et referme.

Cette collecte vit dans un `ContextVar`, pas dans une variable de module.
Le premier jet utilisait une liste partagée ; deux missions traitées en
parallèle auraient mélangé leurs traces, et le défaut ne se serait vu que
sous charge. Un test lance deux orchestrations concurrentes et vérifie que
leurs `response_id` sont disjoints.

Les agents n'ont pas été touchés : leur signature rend un résultat métier,
et la modifier aurait obligé à reprendre quatre agents figés.

### L'enveloppe

```
{ "resultat":   { … ce que l'IA a conclu … },
  "execution":  { … ce qui s'est passé pour l'obtenir … } }
```

Les deux blocs ne se mélangent pas. Un test énumère les clés du bloc
`execution` plutôt que de faire confiance à la discipline d'écriture : un
champ métier ajouté par mégarde le ferait échouer.

### Côté Java

| Fichier | Rôle |
|---|---|
| `IaEvaluationClientV2` | Client REST vers `/critere/executer` |
| `EnveloppeV2Dto` | Le contrat de réponse, `ignoreUnknown` partout |
| `AnalyseCritereV2Service` | Découpage transactionnel et appel |
| `PersistanceResultatV2Service` | Résolution des références et écriture |

**Découpage transactionnel** — trois temps, jamais de transaction ouverte
pendant l'appel réseau :

```
T1  ouvrir analyse_ia (EN_COURS)     transaction courte, refermée
--  appel au service d'agents         HORS transaction
T2  persister le résultat             transaction unique
```

**La table de références.** `ConstructionContexteIa.Contexte` porte le
payload *et* la table qui permet de relire ses références. Celle-ci n'est
persistée nulle part : la résolution doit donc avoir lieu dans le même
appel. Chaque référence rendue par un agent est retraduite en UUID contre
cette table, et ce qui ne se résout pas est écarté avec une trace — une
référence inventée qui atteindrait la base y serait indiscernable d'une
vraie.

---

## C. F2 — L'API des axes et des plans

### Axes — `/{auditId}/axes-amelioration`

| Verbe | Chemin | Effet |
|---|---|---|
| `GET` | `/` | Lister, filtrable par statut |
| `GET` | `/{axeId}` | Consulter |
| `POST` | `/` | Créer un axe humain |
| `POST` | `/{axeId}/validation` | Retenir |
| `POST` | `/{axeId}/rejet` | Écarter, motif obligatoire |

**L'origine n'est pas un paramètre de création.** Un axe créé par cette
route est humain par construction ; laisser l'appelant déclarer `IA`
permettrait de fabriquer une fausse provenance.

**Un axe rejeté reste consultable avec son motif.** Effacer une
recommandation écartée rendrait la relecture invérifiable après coup.

### Plans — `/{auditId}/plans-action`

`GET /`, `GET /{planId}`, `POST /`, `PUT /{planId}`,
`PUT /{planId}/statut`, `POST /{planId}/actions`.

**Pas de suppression.** Un plan porte des engagements et un historique ; le
brief l'autorisait « uniquement si compatible avec l'historique », et rien
ne le rend nécessaire aujourd'hui. Une route destructive qu'on n'utilise pas
est une route qu'on finit par utiliser par erreur.

**Une action reçoit une liste d'axes**, pas un identifiant. Éprouvé :

```
uneActionPeutRepondreAPlusieursAxes → 3 axes rattachés à une seule action
```

**Seuls les axes validés sont planifiables** : planifier une proposition non
acceptée engagerait du travail sur une décision que personne n'a prise. Un
axe `PROPOSE` rattaché à une action rend 409.

---

## D. Correction RBAC

### La migration V70 — justifiée

V66 accordait `evaluation:valider` à SUPER_ADMIN **et** ADMIN_AUDIT. Les
tests ont montré que la seconde attribution est inerte : ADMIN_AUDIT est
`INACTIF`, et un déclencheur refuse de l'attribuer.

Une permission accordée à un rôle que personne ne peut porter n'est pas
neutre : elle laisse croire qu'un second profil peut valider. L'arbitrage a
tranché — **SUPER_ADMIN seul**.

V66 n'a pas été modifiée : elle a été exécutée, et une migration appliquée
ne se réécrit pas. La correction passe par V70, ce qui laisse au passage la
trace du raisonnement.

```
Migrating schema "public" to version "70 - valider une evaluation reserve au super admin"
Successfully applied 1 migration to schema "public", now at version v70
```

V70 vérifie son propre résultat : exactement un rôle porteur, et c'est
SUPER_ADMIN.

### Axes et plans : aucune permission nouvelle

`audit:modifier` existe et se décrit elle-même comme « Modifier une mission
(plan d'actions, non-conformités) ». Reprendre une proposition
d'amélioration relève exactement de ce travail. En créer une seconde pour
le même geste ajouterait un vocabulaire sans ajouter de contrôle.

Elle reste distincte de `evaluation:valider`, et ce n'est pas une
inconséquence : valider une évaluation fait entrer un résultat dans le score
officiel et rend un écart opposable ; valider un axe retient une suggestion
de travail. Les deux gestes n'ont ni la même portée ni le même auteur
naturel.

---

## E. Tests

### Décompte

| Suite | 5.7-C | Corrective | Écart |
|---|---:|---:|---:|
| Java | 364 | **384** | **+20** |
| Python hors Gemini | 258 | **283** | **+25** |
| Frontend | vert | **vert** | — |

### Fichiers créés

| Fichier | Tests |
|---|---:|
| `tests/test_orchestration_v2.py` | 25 |
| `AxesEtPlansTest` | 16 |
| `ConcurrenceTest` | 4 |

### Ce que les tests Python couvrent

Chemin complet · ordre des agents · une analyse par pièce · Risk désactivé ·
Recommendation désactivée · les deux désactivées · échec Document bloquant ·
échec Evidence bloquant · échec Risk facultatif · échec Recommendation
facultatif · aucun échec converti en succès · contenu brut confiné au
Document Agent · constats transmis à Evidence · résultat Evidence transmis à
Risk · pas de base64 dans la réponse · bloc `execution` sans donnée métier ·
métadonnées Gemini par appel · référence de pièce · versions de contrat ·
durée · référence inventée écartée · `NON_VERIFIABLE` préservé · couverture
partielle préservée · collectes isolées · collecte refermée après échec.

### Concurrence

| Test | Résultat |
|---|---|
| Deux ré-analyses simultanées | **une seule NC courante** |
| Deux validations simultanées | **une seule transition effective** |
| Ré-analyse séquentielle | aucune ligne ajoutée |
| Critère devenu conforme | écart clôturé, jamais supprimé |

Les threads sont synchronisés sur une `CountDownLatch` pour atteindre le
point critique ensemble — sans cela ils s'exécuteraient l'un après l'autre
et le test passerait sans rien éprouver.

### Deux défauts trouvés par les tests

**Un vrai bug de code.** `laListeDesAxesNeMontreQueCeuxDeLaMission` rendait
500 : mes requêtes HQL triaient sur `createdAt` alors que le champ de
l'entité s'appelle `creeLe`. Corrigé dans `AxeAmeliorationRepository` et
`PlanActionRepository`.

**Une contrainte qui fait son travail.** Le premier fixture de
`ConcurrenceTest` posait une évaluation V2 `VALIDEE` sans validateur ; la
base l'a refusée via `evaluation_v2_validee_porte_un_validateur`. C'est le
fixture qui était faux, pas la contrainte — corrigé en posant le validateur,
comme le fait le vrai chemin.

---

## F. Test réel Gemini — bout en bout

### Le dispositif

Mission `39764f70-…`, explicitement nommée **« TEST VERIFICATION IA - ne pas
exploiter »**, formule `AVANCEES` (donc Risk et Recommendation activés),
critère D1-01, une pièce documentaire.

### La chaîne exécutée

```
POST /api/v1/entreprises/{ent}/audits/{audit}/criteres/{critere}/evaluations/v2
→ HTTP 201 en 8,24 s
```

```json
{"id":"f2d8875d-8288-485d-bc0e-bed8793143e6",
 "probabiliteConforme":0.5000, "niveauEngagement":3, "confianceIa":0.6000,
 "justification":"Le code de conduite présente des valeurs et principes ainsi que
   les parties prenantes internes et externes, mais la validation par la direction
   et la date du document font défaut dans les éléments observés.",
 "statut":"EN_REVUE",
 "signalRisque":true, "categorieRisque":"INFORMATION_MANQUANTE",
 "recommandationNecessaire":true, …}
```

### Ce qui a été persisté

`analyse_ia` :

```
 statut  | formule  |    requested_model    | contrat_version | contrat_execution_version |     duree
---------+----------+-----------------------+-----------------+---------------------------+---------------
 ERREUR  | AVANCEES |                       | 2.0             |                           | 00:00:00.49
 TERMINE | AVANCEES | gemini-3.5-flash-lite | 2.0             | 1.0                       | 00:00:08.05
```

> La ligne `ERREUR` est celle du **premier essai**, qui a échoué en 404 parce
> que le service Python tournait encore sur son ancien processus. Elle est
> conservée : c'est exactement ce que la trace existe pour montrer, et c'est
> la démonstration incidente qu'un échec laisse bien une trace consultable.

`execution_agent` — **quatre appels, un par agent**, le Document Agent portant
sa référence de pièce :

```
     agent      | piece | statut  |     served_model      | response_id    | ms   |  p   |  c  | tot
----------------+-------+---------+-----------------------+----------------+------+------+-----+------
 DOCUMENT       | p1    | TERMINE | gemini-3.5-flash-lite | q0GjavjSN_ilxN | 2361 |  782 | 215 |  997
 EVIDENCE       |       | TERMINE | gemini-3.5-flash-lite | rUGjaujdEsXQvd | 2042 | 1430 | 315 | 1745
 RISK           |       | TERMINE | gemini-3.5-flash-lite | r0Gjaq-AFeXQ28 | 1643 | 1442 | 301 | 1743
 RECOMMENDATION |       | TERMINE | gemini-3.5-flash-lite | sEGjar6_O8Xcxs | 1437 | 1572 | 248 | 1820
```

Modèle servi réel, `response_id` réel, durée mesurée, jetons rapportés.

Le détail :

```
 evaluation_preuve        | 1   → couverture PARTIELLE, 3 éléments observés
 evaluation_constat       | 5
 analyse_document_constat | 1
 axe_amelioration         | 2
```

Les deux axes, **avec leurs rattachements résolus en UUID** :

```
 origine | origine_initiale | statut  | niveau_rattachement |            libelle
---------+------------------+---------+---------------------+--------------------------------
 IA      | IA               | PROPOSE | REGLE               | Faire valider et approuver le…
 IA      | IA               | PROPOSE | PREUVE_ATTENDUE     | Ajouter la date d'édition et…
```

### Aucune non-conformité créée avant validation

```
 id          | courante | statut  |          created_at          | updated_at | anterieure_au_test
-------------+----------+---------+------------------------------+------------+--------------------
 30925d2f-…  | t        | OUVERTE | 2026-09-10 13:42:29.04212+00 |            | t
```

La seule non-conformité du critère date de 13:42 — antérieure au test — et
son `updated_at` était nul : elle n'a pas été touchée par l'analyse.

### Points vérifiés

| | Attendu | Constaté |
|:-:|---|---|
| ✅ | `agents_executes` non vide | 4 agents |
| ✅ | Document exécuté | 1 appel, pièce `p1` |
| ✅ | Evidence exécuté | 1 appel |
| ✅ | Risk exécuté (activé) | 1 appel |
| ✅ | Recommendation exécuté (activé) | 1 appel |
| ✅ | Métadonnées d'exécution | modèle servi, `response_id`, durée, jetons |
| ✅ | `analyse_ia` persistée | 2 lignes (1 succès, 1 échec tracé) |
| ✅ | `execution_agent` persistée | 4 lignes |
| ✅ | Évaluation `EN_REVUE` | oui |
| ✅ | Document rattaché | `evaluation_document_analyse` + constat |
| ✅ | Risk IA persisté | `signal_risque`, catégorie, confiance 0,60, constats |
| ✅ | Axe IA persisté | 2, `origine = IA`, `PROPOSE` |
| ✅ | Aucune NC avant validation | confirmé |

---

## G. Validation humaine réelle

```
SUPER_ADMIN valide            → HTTP 200
revalidation immédiate        → HTTP 409
RESPONSABLE_ENTREPRISE        → HTTP 403   (statut inchangé : EN_REVUE)
COLLABORATEUR                 → HTTP 403   (statut inchangé : EN_REVUE)
```

Après validation :

```
 statut  | a_validateur | a_date | contrat_version
---------+--------------+--------+-----------------
 VALIDEE | t            | t      | 2.0
```

La non-conformité du critère a été **actualisée** (`updated_at` renseigné) et
non dupliquée : 1 ligne, 1 courante.

Journal :

```
 ANALYSE_IA_TERMINEE       | analyse_ia
 EVALUATION_CREEE_EN_REVUE | evaluation
 EVALUATION_VALIDEE        | evaluation
```

### Score

`AuditScoreService` n'a pas été modifié. Il exclut `EN_REVUE` et compte
`VALIDEE` — mécanisme préexistant, jamais touché. La formule déterministe
est inchangée ; aucun score n'est calculé par Python ni par Gemini, et RG27
reste tenu : l'IA rend une probabilité, `ScoringEngine` rend la note.

---

## H. État des données historiques

Vérifié **après** l'ensemble des tests et du test réel :

```
 evaluations pre-V2 (contrat_version NULL) | 44
 dont VALIDEE                              | 44
 somme controle historique                 | df9d6f5d3393f022d721734ec2776989
 NC total                                  | 39
 NC courantes                              | 22
 NC historiques                            | 17
 criteres avec >1 courante                 | 0
```

**La somme de contrôle est identique à celle relevée avant la 5.7-C.** Les
44 évaluations historiques n'ont pas été touchées, et se distinguent de
l'évaluation V2 par `contrat_version IS NULL` — sans qu'une seule écriture
ait été nécessaire.

Les scores historiques (8 lignes) sont inchangés.

> **Données de test créées**, toutes sur la mission explicitement nommée
> « TEST VERIFICATION IA - ne pas exploiter » : 1 évaluation V2, 2 passes
> d'analyse, 4 traces d'appel, 1 détail de preuve, 5 constats, 1 constat
> documentaire, 2 axes. Trois comptes de test préfixés `test-5.7c-` /
> `test-57c-`. Rien n'a été créé hors de cette mission.

---

## I. Nouvelles migrations

**Une seule : V70.** Justifiée au §D — elle corrige une attribution de
permission inerte, et n'aurait pas pu passer par une modification de V66,
déjà exécutée.

Aucune migration n'a été créée pour contourner un problème d'orchestration.
Le schéma V69 a suffi : l'orchestration n'a demandé aucune structure
nouvelle.

---

## J. Risques résiduels

| # | Risque | Gravité | État |
|---|---|:-:|---|
| **R1** | **Aucun verrou d'analyse concurrente branché** | moyen | `AnalyseIaRepository.enCoursSurCritere` est écrit et prêt, mais n'est appelé nulle part. Deux analyses lancées simultanément sur le même critère produiraient deux passes et deux évaluations, toutes deux légitimes au regard des contraintes |
| **R2** | **Rattachement pièce → document par l'ordre** | moyen | `p1` est le premier document du critère. C'est le seul lien possible — la référence n'a de sens que dans sa passe — mais il suppose que l'ordre de `preuveRepository.parAuditCritere` soit stable entre la construction et la persistance. Il l'est dans un même appel ; il ne le serait plus si l'appel devenait différé |
| **R3** | **`niveauDeclare` non renseigné en V2** | faible | Le chemin V1 le calcule ; le V2 rend `null`. La comparaison déclaré / constaté est donc absente des évaluations V2 |
| **R4** | **Seul SUPER_ADMIN peut valider** | **métier** | Conséquence assumée de l'arbitrage. Smartex relit chaque critère de chaque mission de chaque client — charge opérationnelle réelle |
| **R5** | **Le chemin V1 reste actif et écrit `VALIDEE`** | moyen | Voulu : la non-régression l'exigeait. Mais deux chemins coexistent avec deux règles opposées, et rien n'empêche d'appeler le V1 |
| **R6** | **`risque_evaluation` toujours vide** | faible | Gap antérieur, indépendant de l'IA : le calcul RG26 n'est persisté qu'en attribut de non-conformité |
| **R7** | **Tests IDOR partiels sur les tables de trace** | faible | `analyse_ia` et `execution_agent` ne sont pas exposées par une API ; leur isolation repose sur `analyse_ia.audit_id` et n'a donc pas pu être éprouvée par un appel |

### Sur R1 — le seul qui mérite une action rapide

Aucune contrainte ne peut l'empêcher : deux passes simultanées sont
légitimes au regard du schéma. Le remède existe déjà — il suffit d'appeler
`enCoursSurCritere` avant de créer la passe et de refuser si elle rend une
valeur. Ce n'est pas fait parce que le comportement souhaité en cas de
conflit (refus, attente, ou remplacement) est un choix métier.

---

## Critère de validation — état point par point

| | Point | État |
|:-:|---|---|
| ✅ | Orchestration Python V2 réelle | `orchestration_v2.py` |
| ✅ | Document Agent exécuté | 1 appel réel |
| ✅ | Evidence Agent exécuté | 1 appel réel |
| ✅ | Risk Agent exécuté lorsque demandé | 1 appel réel ; non appelé si désactivé (test) |
| ✅ | Recommendation exécuté lorsque demandé | idem |
| ✅ | Enveloppe `resultat`/`execution` | test énumérant les clés |
| ✅ | Métadonnées Gemini persistées | modèle servi, `response_id`, durée, jetons |
| ✅ | `analyse_ia` persistée | 2 lignes |
| ✅ | `execution_agent` persistée | 4 lignes |
| ✅ | Évaluation V2 créée `EN_REVUE` | oui |
| ✅ | Validation SUPER_ADMIN | HTTP 200 |
| ✅ | RESPONSABLE ne peut pas valider | HTTP 403 |
| ✅ | COLLABORATEUR ne peut pas valider | HTTP 403 |
| ✅ | `EN_REVUE` exclue du score | mécanisme existant, non modifié |
| ✅ | `VALIDEE` incluse | idem |
| ✅ | Axes accessibles par REST | 5 routes |
| ✅ | Plans accessibles par REST | 6 routes |
| ✅ | Actions multi-axes | 3 axes sur une action |
| ✅ | Isolation tenant démontrée | axes, plans, actions, évaluations |
| ✅ | IDOR testés | GET, POST, PUT, validation, rejet |
| ✅ | Concurrence NC testée | une seule courante |
| ✅ | Concurrence validation testée | une seule transition |
| ✅ | 44 évaluations intactes | somme de contrôle identique |
| ✅ | 39 NC conservées | 39 |
| ✅ | 22 courantes / 17 historiques | vérifié |
| ✅ | Aucun secret | aucune clé, aucun jeton |
| ✅ | Aucun prompt brut persisté | aucune colonne ne peut en recevoir |
| ✅ | Aucun document brut persisté | idem |
| ✅ | Tests Java verts | **384** |
| ✅ | Tests Python verts | **283** |
| ✅ | Frontend vert | ✓ |
| ✅ | **Test Gemini end-to-end réel réussi** | §F |

---

## Fichiers

### Créés — 10

```
services-ia-python/app/services/orchestration_v2.py
services-ia-python/tests/test_orchestration_v2.py
api-quarkus/…/ia/IaEvaluationClientV2.java
api-quarkus/…/ia/contrat/EnveloppeV2Dto.java
api-quarkus/…/mission/AnalyseCritereV2Service.java
api-quarkus/…/mission/PersistanceResultatV2Service.java
api-quarkus/…/resource/AxeAmeliorationResource.java
api-quarkus/…/resource/PlanActionResource.java
api-quarkus/…/resource/dto/AxeAmeliorationDto.java
api-quarkus/…/resource/dto/PlanActionDto.java
api-quarkus/…/test/…/resource/AxesEtPlansTest.java
api-quarkus/…/test/…/conformite/ConcurrenceTest.java
api-quarkus/src/main/resources/db/migration/V70__valider_une_evaluation_reserve_au_super_admin.sql
docs/PHASE5_7C_CORRECTIVE.md
```

### Modifiés — 5

```
services-ia-python/app/services/appel_gemini.py      collecte de traces (ContextVar)
services-ia-python/app/routers/evaluations_v2.py     route /critere/executer
api-quarkus/…/resource/EvaluationResource.java       endpoint POST /v2
api-quarkus/…/domain/repository/AxeAmeliorationRepository.java   correction HQL
api-quarkus/…/domain/repository/PlanActionRepository.java        correction HQL
```

**Aucun agent réécrit. Aucune migration existante modifiée. Aucun fichier
frontend.**

---

## Clôture

**PHASE 5.7-C CORRECTIVE — VALIDÉE**

| | |
|---|---|
| Migrations | **1** (V70), justifiée |
| Migrations existantes modifiées | **AUCUNE** |
| Agents IA réécrits | **AUCUN** |
| 44 évaluations historiques | **INTACTES** — somme de contrôle identique |
| 39 non-conformités | **CONSERVÉES** — 22 / 17 |
| Tests Java | **384/384** |
| Tests Python | **283/283** |
| Build frontend | **vert** |
| Pipeline V2 réel | **exécuté de bout en bout contre Gemini** |
| Validation humaine réelle | **exécutée** — 200 / 409 / 403 / 403 |
| Secrets, prompts, documents en base | **AUCUN** |
| Commit | **AUCUN** |

**Risque résiduel principal** : R1 — aucun verrou d'analyse concurrente
n'est branché, faute d'un choix métier sur le comportement attendu en cas
de conflit.

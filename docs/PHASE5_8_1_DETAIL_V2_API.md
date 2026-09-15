# PHASE 5.8.1 — Exposition sécurisée du détail V2

## SMARTEX SUSTWAY

> **Aucune migration.** Aucune donnée métier créée. Aucun appel à Gemini.
> Aucun fichier Python modifié.
>
> Cette étape ne fait qu'une chose : rendre lisible ce que la base porte
> déjà.
>
> Aucun commit.

---

## Résumé

Trois structures persistées depuis la phase 5.7-C n'étaient exposées par
aucune API. Une évaluation rendait un chiffre et un texte, alors que la
base portait l'avis attente par attente, ce que chaque pièce dit de chaque
attente, et les signaux rattachés.

```
 evaluation_preuve        → exposée
 evaluation_constat       → exposée
 analyse_document_constat → exposée
```

Un seul endpoint `GET`, un DTO plat, un volet replié dans l'écran existant.
**Rien n'a été produit — tout a été relu.**

---

## 1. API créée

| Méthode | Chemin | Accès |
|---|---|---|
| `GET` | `…/criteres/{auditCritereId}/evaluations/{evaluationId}/detail` | tenant + `ROLES_ADMINISTRATION_ENTREPRISE` |

**Un endpoint et non trois.** Les trois structures décrivent le même
raisonnement sous trois angles ; les séparer aurait obligé l'écran à faire
trois requêtes pour reconstituer une seule idée, et à gérer trois états de
chargement pour un seul volet.

Le chemin suit la convention du projet : il est **imbriqué sous l'entité
parente**, comme toutes les ressources existantes. Aucune route racine
`/evaluations/{id}/…` n'a été créée — elle aurait contourné la chaîne
`entreprise → audit → critère` sur laquelle repose tout le contrôle
d'accès.

### Lecture seule, vérifiée

Aucun `POST`, `PUT`, `PATCH` ni `DELETE` n'est déclaré sur ces structures.
Un test l'éprouve en attaquant l'URL avec les quatre verbes : **405** à
chaque fois.

---

## 2. DTO

`DetailEvaluationV2Dto` — un enregistrement plat, trois listes.

| Sous-DTO | Contenu |
|---|---|
| `PreuveEvalueeDto` | couverture (4 valeurs), conflit, justification, éléments observés / manquants / **non vérifiables**, pièces utilisées |
| `ConstatDto` | nature, niveau de rattachement, cible (id + libellé), catégorie, justification |
| `ConstatDocumentaireDto` | présence (4 valeurs), nom du document, référence de pièce, attente visée, éléments relevés / manquants |

`EvaluationDto` a par ailleurs reçu **6 champs déjà persistés** (§9).

### Aucune entité JPA exposée

Les entités sont recopiées champ par champ. Les renvoyer directement aurait
sérialisé des relations paresseuses — donc déclenché des requêtes
imprévues, exposé des cycles, et fait remonter des colonnes que personne
n'a décidé de publier.

### Identifiant **et** libellé

Chaque élément porte l'UUID de sa cible et son libellé métier. Le premier
sert le rattachement, le second la lecture : un auditeur ne reconnaît pas
une attente à son UUID.

---

## 3. Contrôle d'accès

```java
autorisationService.exigerAccesEntreprise(utilisateurId, entrepriseId);
autorisationService.exigerRoleSurEntreprise(utilisateurId, entrepriseId,
        AutorisationService.ROLES_ADMINISTRATION_ENTREPRISE);
trouverAuditCritereDeLaMission(entrepriseId, auditId, auditCritereId);
Evaluation evaluation = trouverEvaluationDuCritere(auditCritereId, evaluationId);
```

**Aucune seconde implémentation de la sécurité.** Les trois mécanismes
appelés existent et sont déjà employés ailleurs :
`exigerAccesEntreprise` partout, `exigerRoleSurEntreprise` avec
`ROLES_ADMINISTRATION_ENTREPRISE` pour le journal d'audit (RG05) — une
lecture sensible de même nature.

### D1 — décision non tranchée, accès non élargi

La cartographie 5.8 pose D1 : *« Un collaborateur peut-il voir le
raisonnement de l'IA, ou seulement le résultat ? »*

**Elle n'est pas tranchée dans le code**, et elle ne l'a pas été ici.

L'argument d'une ouverture existait pourtant : toutes les lectures
d'évaluation n'exigent aujourd'hui que `exigerAccesEntreprise`, et un
collaborateur voit déjà la justification, la probabilité et le signal de
risque. Appliquer la même règle au détail aurait pu passer pour de la
cohérence.

Mais le raisonnement détaillé dit plus que le résultat : il nomme ce qui
manque, cite ce qui a été observé, et signale les contradictions entre
pièces déposées. **À défaut de décision, l'accès n'est pas élargi** — c'est
la consigne, et c'est aussi le sens du choix : élargir se fait en une
ligne, restreindre après coup se fait contre un usage installé.

`ROLES_ADMINISTRATION_ENTREPRISE` vaut `{SUPER_ADMIN, ADMIN_AUDIT,
RESPONSABLE_ENTREPRISE}`. `ADMIN_AUDIT` étant `INACTIF`, l'accès effectif
est **SUPER_ADMIN et RESPONSABLE_ENTREPRISE** — exactement le minimum
demandé.

**Un test fige ce choix** (`leCollaborateurNAccedePasAuRaisonnementTantQueD1NEstPasTranchee`)
pour qu'un élargissement futur soit délibéré et non accidentel. Un second
vérifie que **le collaborateur voit toujours le résultat** : seule
l'exposition du raisonnement est restreinte.

---

## 4. Multi-tenant

La chaîne est parcourue en entier, et chaque maillon refuse :

```
utilisateur → entreprise     exigerAccesEntreprise            → 403
entreprise  → audit          trouverAuditDeLEntreprise        → 404
audit       → critère        trouverAuditCritereDeLaMission   → 404
critère     → évaluation     trouverEvaluationDuCritere       → 404
évaluation  → détail         filtré sur evaluation_id         → jamais d'autre
```

**L'identifiant de l'évaluation ne suffit jamais.** La méthode
`trouverEvaluationDuCritere` a été extraite de la validation et partagée :
elle refuse une évaluation dont le critère ne correspond pas à celui de
l'URL.

### Cohérence des données enfants

Les trois listes sont obtenues par des requêtes filtrées sur
`evaluation.id` — jamais sur un identifiant fourni par l'appelant. Il n'y a
donc **aucun paramètre par lequel demander la preuve d'une autre
évaluation** : la structure de l'API rend la manipulation impossible,
plutôt que de la refuser après coup.

Un test le vérifie sur deux évaluations détaillées du même critère : chacune
ne rend que son propre détail.

---

## 5. Tests IDOR

| Scénario | Attendu | Obtenu |
|---|---|---|
| Entreprise A → son évaluation | 200 + données | ✅ |
| Entreprise B → évaluation de A, par l'URL de A | 403 | ✅ |
| Entreprise B → évaluation de A, par sa propre URL | 404 | ✅ |
| Évaluation inexistante | 404 | ✅ |
| Évaluation d'un autre critère de la même mission | 404 | ✅ |
| Deux évaluations du même critère | jamais mélangées | ✅ |
| Collaborateur | 403 | ✅ |
| Mutation (`POST`/`PUT`/`DELETE`) | 405 | ✅ |

---

## 6. Données exposées

| Donnée | Origine |
|---|---|
| Couverture par attente (4 valeurs) | `evaluation_preuve.couverture` |
| Conflit entre pièces | `evaluation_preuve.conflit` |
| Éléments observés / manquants / **non vérifiables** | `evaluation_preuve`, JSONB |
| Pièces utilisées (références locales) | `evaluation_preuve.pieces_utilisees` |
| Nature, rattachement, catégorie, justification | `evaluation_constat` |
| Présence par (pièce × attente) | `analyse_document_constat.presence` |
| Éléments relevés / manquants par pièce | `analyse_document_constat`, JSONB |
| Nom du document, référence de pièce | `evaluation_document_analyse` |
| Libellés des cibles | `preuve_attendue`, `exigence`, `regle_analyse` |

### La distinction préservée

`elementsManquants` et `elementsNonVerifiables` sont rendus dans **deux
champs séparés**, et affichés sous deux intitulés distincts.
`NON_VERIFIABLE` dit qu'on n'a pas pu regarder ; `INSUFFISANTE` qu'on a
regardé. Les fusionner ferait porter à l'organisation le coût d'un défaut
de lecture. Un test dédié le vérifie.

---

## 7. Données volontairement non exposées

| Donnée | Raison |
|---|---|
| **Contenu du document** — octets, base64, texte intégral | Le Document Agent produit des constats structurés ; la restitution s'arrête là. Un test vérifie l'absence de `contenuBase64`, `cheminStockage` et `contenu` dans la réponse |
| `chemin_stockage`, `hash` du document | Sans usage de restitution ; le hash reste atteignable par la relation |
| Prompt, réponse brute du modèle | Jamais persistés (phase 5.6) |
| Trace d'exécution (`analyse_ia`, `execution_agent`) | Hors périmètre — **E2** de la cartographie, conditionné à D8 |
| Identifiants internes des entités du référentiel autres que la cible | Sans usage |

---

## 8. Branchement frontend

**Aucune refonte.** Le composant `DetailRaisonnementIa` est ajouté à
`CritereEvaluation.jsx`, sous le résultat existant. Ni Sidebar, ni Header,
ni route nouvelle, ni navigation. Vitrine non touchée.

### Chargé à l'ouverture, pas au montage

Le volet est replié par défaut — même motif que `HistoriqueEvaluations`
déjà présent — et ne déclenche sa requête qu'à la première ouverture. Ces
listes ne servent qu'à celui qui veut comprendre *pourquoi* une note a été
rendue ; les charger d'emblée ferait une requête par évaluation affichée.

### Les quatre états

| État | Rendu |
|---|---|
| `loading` | `<Loader message="Chargement du détail…" />` |
| `success` | Trois sections, chacune masquée si sa liste est vide |
| `empty` | « Cette évaluation n'a pas enregistré de raisonnement détaillé. » |
| `error` | `<Alerte ton="rouge">` |

**Une liste vide n'est pas une erreur** : elle dit qu'aucun détail n'a été
persisté — le cas de toute évaluation antérieure au contrat V2.

### Le volet n'est pas proposé à qui n'y a pas droit

`ROLES_DETAIL_IA` reflète le contrôle serveur. Ouvrir un volet qui
répondrait 403 serait une promesse non tenue ; le composant n'est
simplement pas rendu.

### `EN_REVUE` conservé

Le badge de statut existant (`TONS_STATUT_EVAL`) est inchangé. **Aucune
action de validation n'a été ajoutée** — elle relève de la 5.8.3.

### Deux erreurs de props corrigées

Le premier jet passait `<Loader texte=…>`, `<Vide titre= texte=>` et un
`className` à `<Alerte>`. Aucun de ces trois composants n'accepte ces
props : `Loader` et `Vide` prennent `message`, `Alerte` ne prend que
`children` et `ton`. Le build passait — JSX ne valide pas les props — et
l'écran aurait affiché des blocs vides. Corrigé par lecture de `ui.jsx`.

---

## 9. `EvaluationDto` — les six champs

La cartographie relevait six informations persistées et tues. Examen :

| Champ | Persisté | Ailleurs ? | Utile | Sécurité | Exposé |
|---|:-:|:-:|---|---|:-:|
| `contratVersion` | ✅ | non | Distingue une évaluation V1 d'une V2 | aucun enjeu | ✅ |
| `confianceRisque` | ✅ | non | Le signal de risque sans sa confiance est trompeur | aucun | ✅ |
| `justificationCouverture` | ✅ | non | Le « pourquoi les preuves suffisent » | aucun | ✅ |
| `valideePar` | ✅ | non | **Une validation sans auteur visible n'est pas une validation** | UUID seul, pas de nom ni d'email | ✅ |
| `valideeLe` | ✅ | non | Idem | aucun | ✅ |
| `versionReferentiel` | ✅ (FK) | via `audit` | Rend l'évaluation auto-descriptive | aucun | ✅ — **le numéro**, pas l'UUID |

**Aucune colonne créée. Aucune donnée dupliquée.** La version du référentiel
est rendue sous son numéro — ce qu'un auditeur reconnaît — et non sous son
identifiant.

`valideePar` n'expose que l'UUID de l'utilisateur : le nom et l'adresse
relèveraient d'une décision d'affichage qui n'a pas été prise.

---

## 10. Performances

Trois requêtes, une par structure, chacune filtrée sur `evaluation_id` et
portant ses jointures :

```sql
-- evaluation_preuve
join fetch ep.preuveAttendue pa  left join fetch pa.exigence

-- evaluation_constat
left join fetch ec.exigence  left join fetch ec.preuveAttendue  left join fetch ec.regleAnalyse

-- analyse_document_constat
join fetch adc.analyseDocument ad  join fetch adc.preuveAttendue pa  left join fetch pa.exigence
```

**Le N+1 évité, et il était réel.** Les cibles sont en chargement
paresseux ; les lire dans la boucle de construction du DTO aurait déclenché
une à deux requêtes par ligne. Sur un critère portant une dizaine
d'attentes, une lecture d'écran serait devenue une vingtaine de requêtes.

Trois jointures gauches sur `evaluation_constat` parce qu'un constat n'en
renseigne qu'une — la contrainte `evaluation_constat_cible_coherente` le
garantit. Les charger ensemble coûte trois jointures sur une requête, au
lieu d'une requête par ligne.

**La mission n'est jamais chargée.** Aucune requête ne remonte au-delà de
l'évaluation demandée.

---

## 11. Migrations

**Aucune.** Le schéma V70 reste la base courante.

L'objet de cette étape était d'exposer des données déjà présentes ; créer
une migration y aurait été un aveu que l'analyse de la 5.8 s'était trompée.

---

## 12. Résultats des tests

| Suite | Avant | Après | Écart |
|---|---:|---:|---:|
| Java | 393 | **408** | **+15** |
| Python hors Gemini | 283 | **283** | 0 |
| Frontend | vert | **vert** | — |

```
[INFO] Tests run: 15, Failures: 0, Errors: 0, Skipped: 0 -- DetailEvaluationV2Test
283 passed, 1 warning in 10.27s
✓ built in 5.25s
```

Python inchangé : aucun fichier Python n'a été touché.

### Les tests vérifient le contenu, pas le code HTTP

Sur les 15 tests, 6 inspectent les valeurs réellement rendues — couverture,
libellés, catégories, éléments observés — et non la seule réponse 200. Une
API qui répond 200 avec une liste vide ne prouve rien de son utilité.

### Frontend

**Aucune infrastructure de test frontend n'existe dans ce dépôt** — ni
Vitest, ni Jest, ni Testing Library dans `package.json`. Conformément à la
consigne, aucun framework n'a été installé. La vérification s'est limitée à
`npm run build`.

---

## 13. Données historiques

```
 evaluations pre-V2 | 44
 SOMME CONTROLE     | df9d6f5d3393f022d721734ec2776989   ← identique
 NC total           | 39
 NC courantes       | 22
 NC historiques     | 17
 derniere migration | 70
```

Somme de contrôle inchangée depuis la phase 5.7-C.

---

## 14. Décisions encore bloquantes

| # | Question | Bloque |
|---|---|---|
| **D1** | **Un collaborateur peut-il voir le raisonnement de l'IA ?** Non tranchée. L'accès n'a pas été élargi ; un test fige ce choix | L'ouverture éventuelle du détail au collaborateur, et le même arbitrage pour les signaux de risque (5.8.2) |
| **D8** | La trace d'exécution est-elle visible du client ? | E2 — non abordé ici |

**D1 reste la seule décision qui pèse sur cette étape.** Le code en tient
compte sans la trancher : l'accès minimal est en place, et l'élargir ne
coûtera qu'un changement de jeu de rôles — plus un test à retourner, ce qui
obligera à le faire sciemment.

---

## Critères de validation

| | Critère | État |
|:-:|---|---|
| ✅ | Trois données V2 accessibles par API | un endpoint, trois listes |
| ✅ | Lecture seule | 405 sur POST / PUT / DELETE |
| ✅ | DTO dédiés | `DetailEvaluationV2Dto` |
| ✅ | Aucune entité JPA exposée | recopie champ par champ |
| ✅ | Contrôle multi-tenant | chaîne complète, 4 maillons |
| ✅ | Tests IDOR | 8 scénarios |
| ✅ | Rôle SUPER_ADMIN | 200 |
| ✅ | Rôle RESPONSABLE | 200 |
| ✅ | Rôle COLLABORATEUR **traité explicitement** | 403 + test figeant le choix, D1 documentée |
| ✅ | Aucune donnée d'une autre évaluation | filtrage sur `evaluation_id`, test dédié |
| ✅ | Aucune donnée d'une autre entreprise | 403 / 404 |
| ✅ | Aucun appel Gemini supplémentaire | aucun |
| ✅ | Aucun changement Python | aucun fichier touché |
| ✅ | Aucune migration inutile | **aucune migration** |
| ✅ | Frontend branché sans refonte | volet dans le composant existant |
| ✅ | `loading` / `empty` / `error` gérés | + `success` |
| ✅ | 393+ tests Java verts | **408** |
| ✅ | 283+ tests Python verts | **283** |
| ✅ | Frontend vert | ✓ |
| ✅ | Données historiques intactes | somme de contrôle identique |
| ✅ | Rapport créé | ce document |

---

## Fichiers

### Créés — 3

```
api-quarkus/…/resource/dto/DetailEvaluationV2Dto.java
api-quarkus/…/test/…/resource/DetailEvaluationV2Test.java
docs/PHASE5_8_1_DETAIL_V2_API.md
```

### Modifiés — 6

```
api-quarkus/…/resource/EvaluationResource.java                    GET /detail + factorisation
api-quarkus/…/resource/dto/EvaluationDto.java                     +6 champs persistés
api-quarkus/…/domain/repository/EvaluationPreuveRepository.java   requête avec jointures
api-quarkus/…/domain/repository/EvaluationConstatRepository.java  idem
api-quarkus/…/domain/repository/AnalyseDocumentConstatRepository.java  idem
frontend-react/src/pages/CritereEvaluation.jsx                    volet de détail
```

**Aucun fichier Python. Aucune migration. Aucune Sidebar, aucun Header,
aucune route nouvelle.**

---

## Clôture

**PHASE 5.8.1 — DÉTAIL V2 API**
**STATUS : VALIDÉE**

Les 21 critères sont satisfaits.

| | |
|---|---|
| Migrations | **AUCUNE** — V70 inchangée |
| Endpoints créés | **1**, en lecture seule |
| Tests Java | **408/408** |
| Tests Python | **283/283** |
| Build frontend | **vert** |
| Données historiques | **INTACTES** |
| Commit | **AUCUN** |

**Décision toujours ouverte** : D1 — l'accès du collaborateur au
raisonnement de l'IA. L'accès n'a pas été élargi, et un test le fige.

Les étapes 5.8.2 (risques), 5.8.3 (validation), 5.8.4 (axes) et 5.8.5
(plans) n'ont pas été abordées.

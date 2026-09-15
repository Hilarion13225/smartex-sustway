# PHASE 5.4 — Modèle de persistance des résultats IA V2

> Conception. Aucune implémentation. Tout constat est établi par lecture du
> code ou requête sur la base `smartex_sustway`. Ce qui n'est pas démontrable
> est marqué **NON DÉMONTRÉ DANS L'EXISTANT**.

---

## 1. Résumé exécutif

Le pipeline V2 produit **34 champs** répartis sur quatre agents. La base en
accueille aujourd'hui **13**. La question de cette phase est de savoir où
ranger les 21 autres — et surtout lesquels méritent d'être rangés.

### La découverte qui structure tout le reste

**La plateforme possède déjà un motif canonique pour « l'IA propose, l'humain
tranche ».** Trois tables — `exigence`, `preuve_attendue`, `regle_analyse` —
portent le même sextuor :

```
origine · origine_initiale · validee_par · validee_le · rejetee_par · rejetee_le · motif_rejet
```

Et il **fonctionne** : 10 propositions `IMPORT_IA`, 6 validées, 1 rejetée.

Ce motif résout d'un coup le problème le plus délicat de la phase — comment
persister une recommandation IA sans qu'elle devienne un engagement métier.
Un axe d'amélioration proposé par l'IA est **une ligne d'axe** portant
`origine = IA` et aucun validateur. Il existe, il est traçable, et il
n'engage personne tant qu'un humain ne l'a pas validé.

**Aucune table de « recommandation IA » n'est donc nécessaire.**

### Le compte final

| | Structures |
|---|---|
| Réutilisées telles quelles | `evaluation`, `evaluation_document_analyse`, `non_conforme`, `action_corrective`, `document` |
| Dormantes à activer | `analyse_ia`, `execution_agent` |
| Colonnes ajoutées | **9** sur des tables existantes |
| Tables nouvelles | **4** — `evaluation_preuve`, `evaluation_signal_risque`, `axe_amelioration`, `plan_action` |
| Structures dormantes **écartées** | `risque_evaluation` — voir §7 |

### Le point où je diverge du brief

Le §7 propose de réutiliser `risque_evaluation` pour `ResultatRisqueV2`.
**C'est un faux ami** : cette table porte le risque attendu RG26 — un calcul
déterministe — et non le signal détecté par un modèle. Les confondre
installerait deux natures dans une même table. Démonstration en §7.

---

## 2. Inventaire des 34 sorties V2

Légende de la colonne **Nature** : **A** technique d'exécution · **B**
résultat métier · **C** historique/audit.

### 2.1 Document Agent V2 — 9 champs

| Champ | Persister | Où | Nature | Historique | Motif |
|---|:-:|---|:-:|:-:|---|
| `piece_reference` | ⚠️ résolu | `evaluation_document_analyse.document_id` | B | ✅ | Référence **locale au payload** — à résoudre, jamais stockée telle quelle (§6) |
| `nom` | ✅ | `evaluation_document_analyse.nom` | B | ✅ | **existe** |
| `resume` | ✅ | `evaluation_document_analyse.resume` | B | ✅ | **existe** |
| `constats[].reference` | ⚠️ résolu | JSONB — voir §5 | B | ✅ | |
| `constats[].presence` | ✅ | JSONB | B | ✅ | Granularité pièce × attente |
| `constats[].elements_releves` | ✅ | JSONB | B | ✅ | Texte libre, non recherchable |
| `constats[].elements_manquants` | ✅ | JSONB | B | ✅ | idem |
| `confiance_lecture` | ✅ | colonne | B | ✅ | Un scan illisible doit rester identifiable |
| *(durée, `response_id`)* | ✅ | `execution_agent` | **A** | ✅ | §5.3 |

### 2.2 Evidence Agent V2 — 11 champs

| Champ | Persister | Où | Nature | Historique | Motif |
|---|:-:|---|:-:|:-:|---|
| `couverture_preuve` | ✅ | `evaluation.couverture_preuve` | B | ✅ | **existe** — 23/44 |
| `probabilite_conformite` | ✅ | `evaluation.probabilite_conforme` | B | ✅ | **existe** — seule entrée de `ScoringEngine` |
| `confiance` | ✅ | `evaluation.confiance_ia` | B | ✅ | **existe** |
| `justification_couverture` | ⚠️ | `evaluation.justification` | B | ✅ | **Concaténée** avec la suivante — `evaluations.py:169` |
| `justification_conformite` | ⚠️ | idem | B | ✅ | idem |
| `evaluations[].reference` | ⚠️ résolu | `evaluation_preuve.preuve_attendue_id` | B | ✅ | **table nouvelle** |
| `evaluations[].couverture` | ✅ | `evaluation_preuve.couverture` | B | ✅ | **Recherchable** — justifie le relationnel |
| `evaluations[].pieces_utilisees` | ✅ | `evaluation_preuve` ↔ document | B | ✅ | |
| `evaluations[].elements_observes / manquants / non_verifiables` | ✅ | JSONB dans `evaluation_preuve` | B | ✅ | Texte libre |
| `evaluations[].conflit` | ✅ | `evaluation_preuve.conflit` | B | ✅ | Information d'audit, à afficher |
| `elements_manquants[]` — rattachements | ✅ | dérivable de `evaluation_preuve` | B | ✅ | **Ne pas dupliquer** : c'est un résumé des couvertures |

### 2.3 Risk Agent V2 — 8 champs

| Champ | Persister | Où | Nature | Historique | Motif |
|---|:-:|---|:-:|:-:|---|
| `signal_risque` | ✅ | `evaluation.signal_risque` | B | ✅ | **existe** — 21/44 |
| `categorie` | ✅ | `evaluation.categorie_risque` | B | ✅ | **existe** — `varchar(50)` libre |
| `justification` | ✅ | `evaluation.justification_risque` | B | ✅ | **existe** |
| `confiance` | ✅ | **colonne à ajouter** | B | ✅ | Distincte de `confiance_ia` : certitude du diagnostic de risque |
| `signaux[].categorie` | ✅ | `evaluation_signal_risque.categorie` | B | ✅ | **Recherchable** |
| `signaux[].rattachement` | ⚠️ résolu | `(type, uuid)` | B | ✅ | §6 |
| `signaux[].pieces_concernees` | ✅ | JSONB ou liaison | B | ✅ | |
| `signaux[].justification` | ✅ | colonne texte | B | ✅ | |

### 2.4 Recommendation Agent V2 — 6 champs

| Champ | Persister | Où | Nature | Historique | Motif |
|---|:-:|---|:-:|:-:|---|
| `recommandation_necessaire` | ✅ | `evaluation.recommandation_necessaire` | B | ✅ | **existe** — 21/44 |
| `pistes_amelioration` | ✅ | `evaluation.pistes_amelioration` | B | ✅ | **existe** — texte lisible affiché |
| `actions[].action` | ✅ | **`axe_amelioration.libelle`**, `origine = IA` | B | ✅ | §8 — pas de table de recommandation |
| `actions[].rattachement` | ⚠️ résolu | `axe_amelioration.reference_type/id` | B | ✅ | §6 |
| *(résumé)* | — | — | — | — | **NON DÉMONTRÉ** — le contrat V2 n'a pas de champ « résumé » distinct de `pistes_amelioration` |

### 2.5 Le compte

| | Champs |
|---|---:|
| Déjà persistables sans rien changer | **13** |
| Nécessitant une colonne | **3** |
| Nécessitant une table nouvelle | **12** |
| Résolus depuis une référence locale | **5** |
| Inexistants au contrat | **1** |

---

## 3. Réutilisation de l'existant

| Sortie V2 | Structure d'accueil | Type |
|---|---|---|
| Résultat de conformité | `evaluation` | **active — telle quelle** |
| Résumé documentaire | `evaluation_document_analyse` | **active — +2 colonnes** |
| Écart constaté | `non_conforme` | **active — telle quelle** |
| Action concrète | `action_corrective` | **active — +2 colonnes** |
| Passe d'analyse | `analyse_ia` | **dormante — à activer** |
| Trace par agent | `execution_agent` | **dormante — à activer** |
| Empreinte de pièce | `document.hash` | **active — déjà alimentée 16/16** |
| Journal des décisions | `audit_log.details` jsonb | **active — motif éprouvé** |
| Ancrage catalogue | `preuve_attendue`, `regle_analyse`, `exigence` | **actives — cibles de résolution** |

**Précédent JSONB** : six colonnes existent déjà — `audit_log.details`,
`exigence.localisation`, `preuve_attendue.localisation`,
`regle_analyse.definition`, `regle_analyse.localisation`,
`import_referentiel.metadonnees`. Le schéma ouvert de `regle_analyse.definition`
est exactement le cas des listes de texte libre traitées en §5.

---

## 4. Évaluation et validation humaine

### 4.1 Ce que l'existant démontre déjà

| Constat | Preuve |
|---|---|
| `statut_evaluation` porte `PROVISOIRE, EN_REVUE, VALIDEE` | énumération en base |
| `AuditScoreService:61-64` **exclut déjà `EN_REVUE`** et le compte à part | code |
| `AuditScoreDto` expose `nombreCriteresEnRevue` | contrat REST |
| Le frontend a une couleur pour `EN_REVUE` — violet | `CritereEvaluation.jsx:36` |
| `AnalyseCritereService:212` écrit **`VALIDEE` directement** | code |
| Les 44 évaluations sont `VALIDEE`, **sans validateur** | base |

### 4.2 Modèle cible

```
analyse_ia (EN_COURS)
     │
     ▼
evaluation.statut = PROVISOIRE          ← l'IA ne pose plus VALIDEE
     │
     │  décision humaine — permission evaluation:valider
     │
     ├──► VALIDEE     valide_par, valide_le              → compte au score
     └──► EN_REVUE    valide_par, valide_le, motif       → exclu, compté à part
```

**`PROVISOIRE` tombe aujourd'hui dans `nombreCriteresNonEvalues`** —
`AuditScoreService` ne le traite dans aucune des deux branches. C'est
sémantiquement correct : une analyse que personne n'a regardée n'est pas un
critère évalué.

### 4.3 Colonnes nécessaires

| Colonne | Table | Motif |
|---|---|---|
| `valide_par` | `evaluation` | `auteur_id` porte déjà « qui a produit » pour les 21 lignes `EXPERT` — décision **D6** de la phase 5.3 |
| `valide_le` | `evaluation` | |
| `motif_contestation` | `evaluation` | Une contestation sans motif n'apprend rien à l'auditeur suivant |

---

## 5. Éléments observés / manquants — colonne, JSONB ou table ?

C'est la décision de structure la plus lourde de cette phase. Elle ne se
tranche pas par préférence mais par usage.

### 5.1 Les cinq critères, appliqués

| Donnée | Recherche | Affichage | Auditabilité | Volumétrie | Verdict |
|---|---|---|---|---|---|
| `couverture` par attente | **oui** — « tous les critères où cette attente est INSUFFISANTE » | liste | forte | 1 ligne / (éval × attente) | **relationnel** |
| `presence` par pièce × attente | plausible | détail | forte | 1 / (doc × attente) | **JSONB** |
| `elements_observes[]` | non — texte libre | texte | forte | quelques phrases | **JSONB** |
| `elements_manquants[]` | non | texte | forte | idem | **JSONB** |
| `elements_non_verifiables[]` | non | texte | forte | idem | **JSONB** |
| `conflit` | non | texte | **forte** | 1 phrase | colonne texte |
| `categorie` de signal | **oui** — « toutes les missions avec PREUVE_GENERIQUE » | badge | forte | 0-3 / éval | **relationnel** |

### 5.2 Recommandation : hybride, sur le modèle de `regle_analyse`

`regle_analyse` combine déjà des **colonnes structurées** — `code`, `type`,
`severite` — et un **JSONB ouvert** — `definition`. C'est exactement le
partage à reproduire :

> **Ce qui se cherche devient une colonne. Ce qui se lit reste en JSONB.**

| Structure | Colonnes | JSONB |
|---|---|---|
| `evaluation_preuve` | `evaluation_id`, `preuve_attendue_id`, `couverture`, `conflit` | `elements` — les trois listes |
| `evaluation_signal_risque` | `evaluation_id`, `categorie`, `reference_type`, `reference_id`, `justification` | `pieces_concernees` |
| `evaluation_document_analyse` | +`document_id`, +`hash_analyse`, +`confiance_lecture` | `constats` |

### 5.3 Volumétrie estimée

552 `audit_critere`, 212 preuves attendues, ~2 par critère.

| Table | Estimation par mission complète |
|---|---|
| `evaluation` | ~92 |
| `evaluation_preuve` | ~130 — une par (évaluation, attente) |
| `evaluation_signal_risque` | ~50 — seulement si signal |

**Modeste.** Aucune justification volumétrique à écarter le relationnel.

### 5.4 Pourquoi pas tout en JSONB

Un `evaluations` entier en JSONB sur `evaluation` serait le plus simple à
écrire, et le plus coûteux à interroger. La question « quelles attentes du
référentiel sont le plus souvent insuffisantes » — qui est **la** question
d'un pilotage de référentiel — deviendrait un parcours de documents JSON.

### 5.5 Pourquoi pas tout en relationnel

Éclater `elements_observes` en lignes créerait une table de phrases libres,
jamais jointe, jamais filtrée, uniquement affichée. Le coût de schéma sans le
bénéfice.

---

## 6. Références locales → UUID métier

### 6.1 Le principe, déjà acté

Une référence comme `D1-01-E1-P1` est **locale au payload** : recalculée à
chaque construction, non persistée, non comparable d'une requête à l'autre.
`preuve_attendue` **ne porte aucun code métier** en base.

### 6.2 La chaîne de résolution

```
Gemini rend        "D1-01-E1-P1"
                        │
ReferencesPreuvesAttendues.exiger()    ← refuse si absente du payload
                        │
                  PreuveAttendue (entité)
                        │
                  preuve_attendue.id (UUID)     ← CE QUI EST PERSISTÉ
```

**Rien d'autre n'est stocké.** La référence locale ne survit pas à la requête.

### 6.3 Rattachement polymorphe

Le contrat V2 rattache à trois niveaux — `EXIGENCE`, `PREUVE_ATTENDUE`,
`REGLE`. Deux formes possibles :

| | Forme | Avantage | Inconvénient |
|---|---|---|---|
| **A** | `reference_type` + `reference_id` | une paire de colonnes | pas de clé étrangère — l'intégrité n'est pas garantie par la base |
| **B** | trois colonnes nullables avec FK | intégrité garantie | contrainte de cohérence à écrire |

> **Décision nécessaire — E1.** La forme **B** est préférable : elle laisse la
> base garantir qu'une référence désigne une ligne réelle, ce que le §6.2
> cherche précisément à obtenir. La forme A rouvrirait la porte aux
> identifiants orphelins que toute cette conception vise à éviter.

### 6.4 Traçabilité de la résolution

**Le rattachement doit viser l'entité de la version auditée.** `D1-01` existe
en **9 exemplaires distincts** — un par référentiel × version. Résoudre vers
la mauvaise version rattacherait un résultat à une exigence qu'il n'a jamais
vue.

`AnalyseCritereService` lit le catalogue par `critere.id` — propre à la
version. La résolution hérite donc de la bonne version **par construction**,
sans contrôle supplémentaire.

---

## 7. Risques — pourquoi `risque_evaluation` ne convient pas

### 7.1 Ce que porte la table dormante

```
risque_evaluation : id, evaluation_id, probabilite, criticite_poids,
                    risque_attendu, niveau_priorite, date_calcul
```

Ces colonnes décrivent **RG26** : `risque_attendu = (1 − probabilité) ×
criticité`. Un calcul **déterministe**, effectué par `ScoringEngine`,
qu'aucun modèle ne produit.

### 7.2 Ce que porte `ResultatRisqueV2`

```
signal_risque · categorie · justification · confiance · signaux[]
```

Un **signal détecté** par un modèle dans le contenu des preuves :
incohérence, pièce générique, information non vérifiable, déclaration non
corroborée.

### 7.3 Deux natures, deux tables

| | `risque_evaluation` | `ResultatRisqueV2` |
|---|---|---|
| Origine | calcul Java | modèle |
| Déterministe | **oui** | non |
| Recalculable | **oui**, à tout moment | non |
| Ce qu'il mesure | conséquence d'une non-conformité | **fiabilité de la preuve** |
| Graduation | `niveau_priorite` calculé | **refusée au contrat V2** |

L'en-tête de `risk_agent.py` le dit déjà : *« À ne pas confondre avec le
risque attendu (RG26 […]), qui est un calcul déterministe effectué côté
Quarkus et ne dépend d'aucun appel IA. »*

### 7.4 Verdict

**GAP démontré — type C, table nouvelle.** `evaluation_signal_risque`.

`risque_evaluation` reste dormante et **disponible** pour ce qu'elle décrit :
figer RG26 au moment de l'analyse plutôt que le recalculer — décision **Q9**
de la phase 5.2, indépendante de celle-ci.

### 7.5 Statut d'un signal

**NON DÉMONTRÉ DANS L'EXISTANT** — aucun mécanisme de traitement de signal.

> **Décision nécessaire — E2.** Un signal a-t-il un cycle de vie propre —
> « pris en compte », « écarté » — ou est-il une **observation figée**
> rattachée à une évaluation immuable ?
>
> Le second est cohérent avec la §12 : ce qui constate est immuable. Un signal
> qu'un humain veut traiter devient un **axe d'amélioration** ; le signal
> lui-même ne change pas.

---

## 8. Recommandations — trois concepts, une seule table

### 8.1 La distinction à ne pas perdre

| Concept | Nature | Qui le produit | Engage |
|---|---|---|---|
| **Recommandation IA** | Suggestion textuelle | modèle | personne |
| **Axe d'amélioration** | Objectif de progrès durable | **humain valide** | l'organisation |
| **Action corrective** | Tâche avec responsable et échéance | **humain crée** | une personne nommée |

### 8.2 Le motif déjà présent dans la plateforme

Trois tables portent le même sextuor de gouvernance, **et il est utilisé** :

| Table | `IMPORT_IA` | validées | rejetées |
|---|---:|---:|---:|
| `exigence` | 10 | 6 | 1 |

```
origine · origine_initiale · validee_par · validee_le
        · rejetee_par · rejetee_le · motif_rejet
```

Le contenu proposé par l'IA existe en base **sans engager personne**, jusqu'à
ce qu'un humain le valide. Le filtrage `parCritereActives` écarte
systématiquement ce qui n'a pas été tranché.

### 8.3 Recommandation : reproduire ce motif sur les axes

Une action recommandée par l'IA devient **une ligne d'`axe_amelioration`**
portant `origine = IA`, sans validateur.

| Conséquence | |
|---|---|
| La proposition est **tracée** | on sait ce que l'IA a suggéré, et quand |
| Elle **n'engage rien** | aucun validateur, aucun responsable, aucune échéance |
| Le rejet est **explicite et motivé** | `rejetee_par`, `motif_rejet` |
| Aucune table nouvelle pour les recommandations | le motif existe déjà |
| **Cohérence de plateforme** | même geste, même vocabulaire que la validation du catalogue |

> **Ce que cela évite** : une table `recommandation_ia` qu'il faudrait
> ensuite rapprocher des axes, avec le risque de doublon que le brief
> demande précisément d'éviter.

`pistes_amelioration` — le texte libre — reste sur `evaluation`. C'est ce que
l'écran affiche aujourd'hui, et il ne se rattache à rien.

---

## 9. Axes d'amélioration

### 9.1 Ce qui le distingue de la non-conformité

| | `non_conforme` | `axe_amelioration` |
|---|---|---|
| Rattachement | **`evaluation_id`** | **`audit_critere_id`** |
| Durée de vie | **périssable** — devient `REMPLACEE` | **durable** |
| Survit à une ré-analyse | non | **oui** |
| Sens | écart constaté à une date | objectif de progrès |

C'est ce simple changement d'ancrage qui résout l'accumulation constatée en
phase 5.1 : **28 des 39 non-conformités ouvertes sont des doublons de
ré-analyse**, parce que ce qu'on voudrait voir durer est rattaché à un objet
périssable.

### 9.2 Structure proposée

| Champ | Type | Motif |
|---|---|---|
| `audit_critere_id` | FK **obligatoire** | L'ancrage pérenne |
| `libelle`, `description` | texte | |
| `origine` | `IA` / `HUMAIN` | §8 |
| `origine_initiale` | idem | Miroir du motif catalogue |
| `evaluation_origine_id` | FK **nullable** | Trace l'analyse qui l'a suggéré, sans lier son sort au sien |
| `non_conforme_id` | FK **nullable** | L'écart qui l'a motivé, facultatif |
| `exigence_id` / `preuve_attendue_id` / `regle_analyse_id` | FK **nullables** | Rattachement V2 résolu — forme B du §6.3 |
| `validee_par`, `validee_le` | | Motif catalogue |
| `rejetee_par`, `rejetee_le`, `motif_rejet` | | Motif catalogue |
| `statut` | `OUVERT` / `EN_COURS` / `ATTEINT` / `ABANDONNE` | Nouvelle énumération |
| `priorite` | **`priorite_action`** | **Réutilise l'énumération existante** |

### 9.3 Ce qui n'y figure pas

Ni responsable, ni échéance : ce sont des attributs d'**action**, pas
d'objectif. Un axe dit *où aller* ; l'action dit *qui fait quoi, et quand*.

---

## 10. Plans d'action

### 10.1 Rattachement à la mission

Le plan est rattaché à **`audit_id`**, non à l'axe. C'est le livrable réel
d'un audit : un plan unique dont les actions se répartissent entre plusieurs
axes.

### 10.2 Structure proposée

| Champ | Type |
|---|---|
| `audit_id` | FK obligatoire |
| `nom`, `objectif` | texte |
| `date_debut`, `date_fin` | date |
| `responsable_id` | FK `utilisateur`, nullable |
| `statut` | `BROUILLON` / `ACTIF` / `CLOS` |

### 10.3 Relations

```
axe_amelioration ──1:n── action_corrective ──n:1── plan_action ──n:1── audit
```

`action_corrective` reçoit `axe_amelioration_id` et `plan_action_id`, tous
deux **nullables**, en **conservant `non_conforme_id`** — les 2 lignes
existantes restent valides sans rétro-traitement.

### 10.4 Progression

**Dérivée, jamais stockée.** Le rapport des actions `TERMINEE` ou `VALIDEE`
sur le total du plan. La stocker créerait une valeur à maintenir en cohérence
à chaque changement de statut, pour une information que la base calcule en
une requête.

C'est le même principe qu'`AuditScoreService`, qui calcule le score à chaque
lecture plutôt que de l'entretenir.

### 10.5 Preuve de réalisation

**NON DÉMONTRÉ DANS L'EXISTANT** — `action_corrective` n'a aucune colonne
document.

> **Décision nécessaire — E3.** Réutiliser le circuit `Document` complet —
> dépôt contrôlé, type MIME, scan antivirus, MinIO — via une table de liaison
> `action_corrective` ↔ `document` ? C'est la seule voie qui n'installe pas une
> seconde infrastructure de fichiers.

---

## 11. Score

### 11.1 Trois rôles, dictés par les contraintes d'unicité

| Besoin | Support | Contrainte |
|---|---|---|
| Score courant | `AuditScoreService.calculer` — calcul pur | — |
| Historique | `score_historique` | `UNIQUE (audit_id, date)` |
| Score officiel figé | `score_audit` | **`UNIQUE (audit_id)`** |
| Score par domaine figé | `score_domaine` | `UNIQUE (audit_id, domaine_id)` |

### 11.2 Influence des statuts sur le score

Déjà implémentée dans `AuditScoreService` :

| Statut | Effet | Compteur |
|---|---|---|
| `VALIDEE` | **entre dans le calcul** | `nombreCriteresEvalues` |
| `EN_REVUE` | **exclu** | `nombreCriteresEnRevue` |
| `PROVISOIRE` | exclu — aucune branche | `nombreCriteresNonEvalues` |

**Rien à concevoir.** La seule chose qui change si RG16 évolue est le littéral
de `AnalyseCritereService:212`.

### 11.3 Conception cible — non implémentée

`ClotureMissionService` — seul écrivain de l'état terminal — figerait
`score_audit` et `score_domaine` à la clôture. C'est ce que `UNIQUE(audit_id)`
exprime : une mission n'a qu'un score final.

**RG16 n'est pas modifiée ici.** Sa révision relève de la phase 5.8.

---

## 12. Historisation et règle de rapprochement

### 12.1 Deux régimes

| Régime | Objets | Comportement |
|---|---|---|
| **Constat** — immuable | `analyse_ia`, `execution_agent`, `evaluation`, `evaluation_preuve`, `evaluation_signal_risque`, `evaluation_document_analyse`, `audit_log` | Append-only. Une nouvelle analyse **ajoute**, n'écrase jamais. |
| **Engagement** — vivant | `axe_amelioration`, `action_corrective`, `plan_action` | Statut et contenu évoluent. Un seul objet dans le temps. |

`evaluation.statut` est **la seule exception** : il ne décrit pas le jugement
de l'IA mais **son acceptation**, fait postérieur.

### 12.2 La règle de rapprochement

Le brief pose exactement le bon problème : les résultats doivent s'empiler,
les axes ne doivent pas se dupliquer. Voici la règle proposée.

> **Un axe est identifié par le couple `(audit_critere_id, rattachement)`.**
> Lorsqu'une nouvelle analyse propose une action portant sur un rattachement
> pour lequel un axe **non rejeté** existe déjà sur ce critère, aucun axe
> n'est créé : l'axe existant est **rattaché à la nouvelle évaluation**.

| Cas | Comportement |
|---|---|
| Aucun axe sur ce rattachement | **créer**, `origine = IA`, non validé |
| Axe existant, `OUVERT` ou `EN_COURS` | **ne rien créer** — l'objectif est déjà suivi |
| Axe existant, `ATTEINT` | **ne rien créer**, mais tracer que l'écart est réapparu |
| Axe existant, **rejeté** | **ne rien créer** — un humain l'a écarté, l'IA ne le réimpose pas |
| L'écart a disparu | l'axe **reste ouvert** — seul un humain le clôt |

Le dernier point mérite d'être assumé : **l'IA ne clôt jamais un axe.** Elle
constate qu'un écart n'apparaît plus ; conclure que l'objectif est atteint est
un jugement humain.

> **Décision nécessaire — E4.** Le cas « axe `ATTEINT`, écart réapparu » :
> rouvrir automatiquement, ou signaler sans toucher au statut ? Le second
> respecte le principe « l'IA n'engage rien », mais risque de passer inaperçu.

---

## 13. Séparation IA / métier

| Objet | Produit IA | Persisté | Modifiable humainement | Historisé |
|---|:-:|:-:|:-:|:-:|
| Probabilité de conformité | ✅ | ✅ | ❌ | ✅ append-only |
| Confiance (conformité) | ✅ | ✅ | ❌ | ✅ |
| Confiance (risque) | ✅ | ⚠️ colonne à ajouter | ❌ | ✅ |
| Confiance de lecture | ✅ | ⚠️ colonne à ajouter | ❌ | ✅ |
| Couverture de preuve | ✅ | ✅ | ❌ | ✅ |
| Couverture par attente | ✅ | ⚠️ table nouvelle | ❌ | ✅ |
| Éléments observés / manquants | ✅ | ⚠️ JSONB | ❌ | ✅ |
| Conflit entre pièces | ✅ | ⚠️ table nouvelle | ❌ | ✅ |
| **Note 1-5** | ❌ **jamais** | ✅ | ❌ | ✅ |
| **Risque attendu RG26** | ❌ **jamais** | ⚠️ dormante | ❌ | ✅ |
| Signal de risque | ✅ | ✅ | ❌ | ✅ |
| Signaux détaillés | ✅ | ⚠️ table nouvelle | ❌ | ✅ |
| Pistes d'amélioration | ✅ | ✅ | ❌ | ✅ |
| **Statut d'évaluation** | ❌ | ✅ | ✅ `evaluation:valider` | ✅ journal |
| Non-conformité | ❌ dérivée | ✅ | ✅ statut | ✅ |
| **Axe d'amélioration** | ⚠️ **propose** | ⚠️ table nouvelle | ✅ **valide, rejette, suit** | ✅ |
| **Action corrective** | ❌ **jamais** | ✅ | ✅ | ✅ |
| **Plan d'action** | ❌ **jamais** | ⚠️ table nouvelle | ✅ | ✅ |
| Score courant | ❌ | calculé | ❌ | — |
| Score officiel | ❌ | ⚠️ dormante | ❌ | ✅ figé |

### Les trois frontières

1. **L'IA ne note pas.** RG27 — le contrat V2 n'offre aucun champ de note.
2. **L'IA ne gradue pas le risque.** RG26 est déterministe — le contrat V2
   refuse gravité, impact et probabilité de risque.
3. **L'IA n'engage personne.** Elle propose un axe ; elle ne crée ni action,
   ni plan, ni responsable, ni échéance.

---

## 14. Architecture cible

```
  MISSION (audit)
     │
     ▼
  analyse_ia                                     (dormante → activer)
     │  audit_id · statut · formule · erreur
     │  + declenche_par · modele_ia · modele_servi · contrat_version
     │
     ├── execution_agent × 4                     (dormante → activer)
     │     agent · statut · duree · response_id
     │
     ▼
  evaluation                                     (active, append-only)
     │  probabilite · confiance · couverture · signal_risque
     │  + analyse_ia_id · version_referentiel
     │  + confiance_risque · valide_par · valide_le · motif_contestation
     │
     ├── evaluation_document_analyse             (active, +document_id +hash +confiance_lecture, JSONB constats)
     ├── evaluation_preuve            NOUVELLE   (couverture par attente + JSONB éléments)
     └── evaluation_signal_risque     NOUVELLE   (catégorie + rattachement)
     │
     ▼
  VALIDATION HUMAINE            evaluation:valider
     │  PROVISOIRE ──► VALIDEE  (compte au score)
     │             └─► EN_REVUE (exclu, compté à part)
     │
     ├──► non_conforme                           (active — REMPLACEE en 5.5)
     │
     └──► axe_amelioration        NOUVELLE
            origine IA/HUMAIN · validee_par · rejetee_par · motif_rejet
            rattachement : exigence | preuve_attendue | regle_analyse
                   │
                   ▼
            action_corrective                    (active, +axe_id +plan_id)
                   │
                   ▼
            plan_action           NOUVELLE       (rattaché à la MISSION)
                   │
                   ▼
  CLÔTURE ──► score_audit + score_domaine        (dormantes → figer)
```

### Une correction au diagramme du brief

Le brief place `Plans d'action` **sous** `Axes`. Le code et la pratique
d'audit conduisent à l'inverse : le plan est rattaché à la **mission**, et ce
sont les **actions** qui portent le double rattachement — à un axe et à un
plan. Un plan traverse plusieurs axes ; il n'appartient à aucun.

---

## 15. Gaps

| # | Gap | Type | Structure | Solution |
|---|---|:-:|---|---|
| **P1** | Couverture par attente non représentable | **C** | — | `evaluation_preuve` |
| **P2** | Éléments observés / manquants / non vérifiables | **A** | `evaluation_preuve` | JSONB `elements` |
| **P3** | Conflit entre pièces perdu | **A** | `evaluation_preuve` | colonne `conflit` |
| **P4** | Signaux de risque détaillés | **C** | — | `evaluation_signal_risque` |
| **P5** | Confiance du diagnostic de risque | **A** | `evaluation` | colonne |
| **P6** | Confiance de lecture | **A** | `evaluation_document_analyse` | colonne |
| **P7** | Constats par pièce × attente | **A** | `evaluation_document_analyse` | JSONB `constats` |
| **P8** | Document lu non identifiable | **A** | `evaluation_document_analyse` | `document_id` + `hash_analyse` |
| **P9** | Rattachement d'une évaluation à sa passe | **A** | `evaluation` | `analyse_ia_id` |
| **P10** | Validation humaine non traçable | **A** | `evaluation` | `valide_par`, `valide_le`, `motif_contestation` |
| **P11** | Aucun objet de progrès durable | **C** | — | `axe_amelioration` |
| **P12** | Aucun regroupement d'actions | **C** | — | `plan_action` |
| **P13** | Actions non rattachables à un axe ou un plan | **D** | `action_corrective` | 2 FK nullables |
| **P14** | Passe d'analyse non tracée | **B** | `analyse_ia` | activer |
| **P15** | Agents non tracés | **B** | `execution_agent` | activer |
| **P16** | Deux justifications d'Evidence concaténées | **A** | `evaluation` | **À VALIDER** — 1 colonne ou statu quo |

**Répartition** : 9 ajouts de colonne (A) · 2 activations (B) · 4 tables
nouvelles (C) · 1 relation (D).

---

## 16. Décisions nécessaires

| # | Décision | Bloque | Recommandation |
|---|---|---|---|
| **E1** | Rattachement polymorphe : `(type, uuid)` ou trois FK nullables ? | axes, signaux | **trois FK** — l'intégrité garantie par la base |
| **E2** | Un signal de risque a-t-il un cycle de vie propre ? | `evaluation_signal_risque` | **non** — observation figée ; le suivi passe par l'axe |
| **E3** | Preuve de réalisation d'une action : circuit `Document` complet ? | plans d'action | **oui** — ne pas installer une seconde infrastructure |
| **E4** | Axe `ATTEINT` dont l'écart réapparaît : rouvrir ou signaler ? | règle de rapprochement | **signaler** — l'IA n'engage rien |
| **E5** | Séparer les deux justifications d'Evidence ? | P16 | à trancher — perte d'information aujourd'hui |
| **D4** *(5.3)* | Persister les sorties V2 structurées ? | **toute cette phase** | **oui** — sans elles un résultat n'est pas ré-explicable |
| **Q1** *(5.2)* | Le score attend-il la validation humaine ? | §4, §11 | option B |
| **Q3** *(5.2)* | Non-conformité `EN_TRAITEMENT` remplaçable ? | §12 | non |

---

## 17. Ordre d'implémentation

| # | Étape | Dépend de | Justification |
|---|---|---|---|
| **1** | Traçabilité minimale — `version_referentiel`, `document_id` + hash | rien | Colonnes existantes ou triviales. Aucun changement de comportement. **Étape 1 et 3 de la phase 5.3.** |
| **2** | Activer `analyse_ia` + `analyse_ia_id` sur `evaluation` | D2 (5.3) | Racine de traçabilité, table existante |
| **3** | Activer `execution_agent` | **D1 (5.3)** | Suppose que Python renvoie ses métadonnées d'exécution — il n'a **aucun accès base** |
| **4** | Colonnes simples — `confiance_risque`, `confiance_lecture`, `constats` JSONB | **bascule Java V2** | Ne peut pas précéder la production de ces sorties |
| **5** | `evaluation_preuve` + `evaluation_signal_risque` | étape 4 | Le cœur de la persistance V2 |
| **6** | Cycle de vie des non-conformités — `REMPLACEE` | Q3 | Corrige 28 lignes réelles |
| **7** | `axe_amelioration` + règle de rapprochement | étape 5, E1, E4 | Suppose les rattachements résolus |
| **8** | `plan_action` + FK sur `action_corrective` | étape 7, E3 | |
| **9** | Validation humaine — colonnes + permission + endpoint | Q1, D6 (5.3) | Le plus lourd en gouvernance |
| **10** | Figer `score_audit` / `score_domaine` à la clôture | étape 9 | Dépend du sens donné à « validé » |

### La dépendance qui domine

**Les étapes 4 à 8 sont bloquées par la bascule Java V1 → V2.** Aucune sortie
V2 n'est produite en production : le socle Java existe depuis la phase 1 et
n'est branché nulle part, `AnalyseCritereService` émet toujours le V1.

Concevoir ces colonnes est utile — c'est l'objet de cette phase. Les créer
avant la bascule produirait des colonnes vides que personne n'alimente.

**Les étapes 1, 2 et 6 échappent à cette dépendance** : elles portent sur des
données que le V1 produit déjà.

### La dépendance D1

L'étape 3 suppose que **Python renvoie ses métadonnées d'exécution dans sa
réponse** — modèle servi, `response_id`, durée par agent — pour que Java les
persiste. Le service Python n'a ni driver, ni connexion :
`SMARTEX_IA_SERVICE_URL` est la seule liaison.

**Cela implique une évolution du contrat de réponse V2**, qui ne porte
aujourd'hui aucune métadonnée d'exécution. À intégrer à la conception du
contrat avant la bascule, sous peine de devoir le rouvrir ensuite.

---

## Verdict

### PHASE 5.4 : **VALIDÉE**

Le modèle de persistance est conçu, champ par champ, sur les 34 sorties du
pipeline V2. **13 sont déjà persistables sans rien changer.** Le reste tient
en 9 colonnes, 2 activations et 4 tables nouvelles.

**Trois enseignements dominent :**

1. **La plateforme savait déjà faire « l'IA propose, l'humain tranche ».**
   Le sextuor `origine · validee_par · rejetee_par · motif_rejet` existe à
   l'identique sur trois tables et fonctionne — 10 propositions, 6 validées,
   1 rejetée. Le reproduire sur les axes évite une table de recommandations et
   donne au geste le même vocabulaire que la validation du catalogue.

2. **`risque_evaluation` est un faux ami.** Elle porte RG26 — un calcul
   déterministe — et non le signal d'un modèle. L'en-tête de `risk_agent.py`
   met en garde contre cette confusion depuis l'origine. C'est un GAP
   démontré, pas une réutilisation manquée.

3. **La bascule Java commande les deux tiers du plan.** Les étapes 4 à 8
   persistent des sorties qu'aucun code de production ne produit encore. La
   conception peut être faite — elle vient de l'être — mais la création des
   colonnes doit suivre la bascule, pas la précéder.

**Huit décisions restent ouvertes**, dont **D4** — persister ou non les
sorties structurées — qui conditionne l'ensemble de cette phase.

---

*Aucun fichier du projet n'a été modifié à l'exception du présent rapport.
Aucune migration. Aucune donnée. Aucun commit.*

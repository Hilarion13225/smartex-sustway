# PHASE 5.7-A — Cartographie de la persistance des résultats IA V2

> **Étude de mapping. Aucune migration, aucune table, aucune colonne, aucune
> écriture.** Chaque affirmation est vérifiable dans le code, dans une
> migration, ou par interrogation du schéma réel. Ce qui n'est pas établi est
> marqué **NON DÉMONTRÉ DANS L'EXISTANT**.
>
> Toutes les mesures de ce document proviennent d'interrogations réelles de
> la base `smartex_sustway` et de lectures du code, menées pendant cette
> phase. Aucune n'est reprise de mémoire d'une phase antérieure sans
> revérification.

---

## 1. Résumé exécutif

Le pipeline V2 produit quatre résultats structurés et une trace d'exécution.
Le modèle de données actuel peut en accueillir **une petite partie**, et le
fait aujourd'hui en aplatissant tout ce qui a une structure.

### Les cinq constats qui commandent tout le reste

**1. Deux tables IA existent et sont totalement vides.**

```
 analyse_ia       | 0
 execution_agent  | 0
```

Elles ne sont écrites par aucun code. La trace produite en phase 5.6 n'a donc
aucun consommateur — non par oubli, mais parce que personne n'a jamais
alimenté ces tables.

**2. `risque_evaluation` est vide, alors que c'est la table du calcul RG26.**

```
 risque_evaluation | 0
```

Le risque déterministe `(1 − probabilité) × criticité` **n'a jamais été
calculé ni persisté**. La table existe, sa contrainte `UNIQUE (evaluation_id)`
existe, et rien ne l'a jamais remplie. C'est un fait important pour le §10 :
la confusion redoutée entre le signal du Risk Agent et le calcul RG26 ne peut
pas venir d'un existant — elle viendrait d'une décision prise maintenant.

**3. Les 44 évaluations sont toutes `VALIDEE`.**

```
 evaluation.statut VALIDEE     | 44
 evaluation.statut PROVISOIRE  | 0
 evaluation.statut EN_REVUE    | 0
```

Le défaut SQL est pourtant `PROVISOIRE`. Le code écrit explicitement
`VALIDEE` à [AnalyseCritereService.java:212](api-quarkus/src/main/java/com/smartexsustway/api/mission/AnalyseCritereService.java#L212), au titre de RG16.
**Une sortie IA devient donc déjà, aujourd'hui, une évaluation définitive.**
Le §15 documente ce choix et ce qu'il coûterait de le changer.

**4. Aucune contrainte d'unicité sur `evaluation` ni sur `non_conforme`.**

L'interrogation des contraintes `UNIQUE` sur les onze tables concernées rend
exactement cinq lignes — et ni `evaluation`, ni `non_conforme`, ni
`execution_agent` n'y figurent. C'est la cause mécanique des 39
non-conformités pour 22 critères.

**5. Ni `axe_amelioration` ni `plan_action` n'existent.**

L'énumération des 64 tables du schéma ne les contient pas. Le modèle retenu
en phase 5.4 — recommandation IA → axe d'origine IA → validation humaine —
**n'a aucun support en base**. C'est le gap le plus structurant de cette
phase.

### Ce que cela implique

| | |
|---|---|
| Tables réutilisables telles quelles | `evaluation`, `non_conforme`, `score_historique` |
| Tables existantes mais **dormantes** | `analyse_ia`, `execution_agent`, `risque_evaluation`, `score_audit`, `score_domaine` |
| Tables **manquantes** | `axe_amelioration`, `plan_action` (+ 1 table de détail par preuve — §6) |
| Sorties V2 aujourd'hui **perdues** | constats documentaires, évaluations par preuve attendue, signaux de risque, actions rattachées |

---

## 2. Inventaire des sorties V2

Relevé par lecture directe de `app/models/contrat_v2.py`. **Aucun champ n'est
inventé ; aucun n'est omis.**

### 2.1 Document Agent V2 — `AnalyseDocumentV2`

| Champ | Type | Note |
|---|---|---|
| `piece_reference` | `str` | Référence **locale au payload** (`p1`, `p2`…) |
| `nom` | `str` | Nom du fichier |
| `resume` | `str` | Texte libre |
| `constats` | `list[ElementReleve]` | **Structuré** |
| `confiance_lecture` | `float \| None` | `[0,1]`, nullable |

`ElementReleve` :

| Champ | Type |
|---|---|
| `reference` | `str` — référence de preuve attendue |
| `presence` | `PRESENT \| PARTIEL \| ABSENT \| NON_VERIFIABLE` |
| `elements_releves` | `list[str]` |
| `elements_manquants` | `list[str]` |

### 2.2 Evidence/Compliance Agent V2 — `ResultatEvidenceV2`

| Champ | Type |
|---|---|
| `couverture_preuve` | `bool` |
| `justification_couverture` | `str` |
| `probabilite_conformite` | `float [0,1]` |
| `confiance` | `float [0,1]` |
| `justification_conformite` | `str` |
| `elements_manquants` | `list[Rattachement]` |
| `evaluations` | `list[EvaluationPreuve]` |

`EvaluationPreuve` :

| Champ | Type |
|---|---|
| `reference` | `str` |
| `couverture` | `COMPLETE \| PARTIELLE \| INSUFFISANTE \| NON_VERIFIABLE` |
| `pieces_utilisees` | `list[str]` |
| `elements_observes` | `list[str]` |
| `elements_manquants` | `list[str]` |
| `elements_non_verifiables` | `list[str]` |
| `conflit` | `str \| None` |
| `justification` | `str` |

### 2.3 Risk Agent V2 — `ResultatRisqueV2`

| Champ | Type |
|---|---|
| `signal_risque` | `bool` |
| `categorie` | `str \| None` |
| `justification` | `str` |
| `confiance` | `float [0,1]`, défaut `0.5` |
| `signaux` | `list[SignalRisque]` |

`SignalRisque` : `categorie`, `rattachement: Rattachement | None`,
`pieces_concernees: list[str]`, `justification`.

### 2.4 Recommendation Agent V2 — `ResultatRecommandationV2`

| Champ | Type |
|---|---|
| `recommandation_necessaire` | `bool` |
| `pistes_amelioration` | `str` |
| `actions` | `list[ActionRecommandee]` |

`ActionRecommandee` : `action: str`, `rattachement: Rattachement`
(obligatoire).

> Le modèle **ne produit pas de priorité**, par décision explicite : elle se
> dérive côté Java de la sévérité de la règle rattachée, donnée que Java
> possède et que le modèle n'a pas.

### 2.5 `Rattachement` — le pivot

| Champ | Valeurs |
|---|---|
| `niveau` | `EXIGENCE \| PREUVE_ATTENDUE \| REGLE` |
| `reference` | `str` |

**Ce type est le point de jonction de toute la cartographie.** Il apparaît
dans Evidence (`elements_manquants`), Risk (`SignalRisque.rattachement`) et
Recommendation (`ActionRecommandee.rattachement`). Toute persistance
relationnelle des sorties V2 passe par sa résolution en UUID (§5).

### 2.6 Instrumentation — `AppelTrace`

Produite par `app/services/appel_gemini.py` (phase 5.6) : `agent`,
`piece_reference`, `statut`, `provider`, `requested_model`, `served_model`,
`response_id`, `started_at`, `finished_at`, `duration_ms`, `usage`
(3 compteurs), `error` (`type`, `message`).

---

## 3. Modèle de données actuel

### 3.1 Ce qui existe réellement

`evaluation` — 18 colonnes, 44 lignes :

```
id · audit_critere_id · probabilite_conforme · note · confiance_ia
justification · source · auteur_id · date_evaluation · version_referentiel
statut · signal_risque · categorie_risque · justification_risque
recommandation_necessaire · pistes_amelioration · couverture_preuve
niveau_declare
```

`evaluation_document_analyse` — **5 colonnes**, 13 lignes :

```
id · evaluation_id · nom · resume · ordre
```

`analyse_ia` — 7 colonnes, **0 ligne** :

```
id · audit_id · statut · formule · date_debut · date_fin · erreur
```

`execution_agent` — 8 colonnes, **0 ligne** :

```
id · analyse_ia_id · agent · statut · input_reference · output_reference
date_debut · date_fin
```

`non_conforme` — 8 colonnes, 39 lignes : `id · evaluation_id · titre ·
description · niveau · risque_attendu · statut · created_at`

`action_corrective` — 10 colonnes, 2 lignes, rattachée à `non_conforme_id`.

`risque_evaluation` — 7 colonnes, **0 ligne**, `UNIQUE (evaluation_id)`.

### 3.2 Les contraintes d'unicité réelles

Interrogation de `pg_constraint` sur les onze tables concernées :

```
 audit_critere     | UNIQUE (audit_id, critere_id)
 score_domaine     | UNIQUE (audit_id, domaine_id)
 score_audit       | UNIQUE (audit_id)
 risque_evaluation | UNIQUE (evaluation_id)
 score_historique  | UNIQUE (audit_id, date)
```

**Cinq lignes, et c'est tout.** `evaluation`, `evaluation_document_analyse`,
`non_conforme`, `action_corrective`, `analyse_ia` et `execution_agent` n'ont
aucune unicité déclarée.

### 3.3 Les énumérations concernées

```
statut_evaluation        PROVISOIRE | EN_REVUE | VALIDEE
source_evaluation        IA | EXPERT
statut_pipeline          EN_ATTENTE | EN_COURS | TERMINE | ERREUR
statut_execution_agent   EN_ATTENTE | EN_COURS | TERMINE | ERREUR
type_agent_ia            DOCUMENT | EVIDENCE | COMPLIANCE | RISK | SCORING
                         | RECOMMENDATION | REPORTING
niveau_non_conformite    (partagé avec risque_evaluation.niveau_priorite)
statut_non_conformite    OUVERTE | EN_TRAITEMENT | CLOTUREE
statut_action_corrective OUVERTE | EN_COURS | TERMINEE | VALIDEE
origine_contenu          CONTENU_INITIAL | CONTENU_HUMAIN | IMPORT_IA
```

> **Gap mineur repéré** : `type_agent_ia` ne contient pas de valeur pour
> l'agent d'import de référentiel, que l'instrumentation de la phase 5.6
> étiquette `IMPORT_REFERENTIEL`. Si `execution_agent` devait un jour tracer
> cet agent, la valeur manquerait.

### 3.4 Précédent JSONB

Le schéma emploie déjà JSONB à six endroits :

```
 audit_log          | details
 exigence           | localisation
 import_referentiel | metadonnees
 preuve_attendue    | localisation
 regle_analyse      | definition
 regle_analyse      | localisation
```

Le recours à JSONB n'est donc pas une nouveauté à justifier — mais il n'est
utilisé, dans tous les cas existants, que pour **des données qu'on lit et
qu'on ne cherche pas**. C'est exactement le critère du §6.

---

## 4. Mapping Document

### 4.1 État actuel

```java
documentAnalyseRepository.persist(
        new EvaluationDocumentAnalyse(evaluation, lu.nom(), lu.resume(), rang));
```

[AnalyseCritereService.java:222-223](api-quarkus/src/main/java/com/smartexsustway/api/mission/AnalyseCritereService.java#L222-L223)

Trois données persistées : le **nom du fichier**, le **résumé**, le **rang**.

### 4.2 Le gap d'identification, démontré

La méthode dispose de l'objet `Document` complet — elle le manipule vingt
lignes plus haut :

```java
Document document = preuve.getDocument();
contenu = storageService.telecharger(document.getCheminStockage());
```

Et la table `document` porte bien ce qu'il faudrait :

```
 id · entreprise_id · site_id · nom_original · nom_stockage · type_mime
 taille · chemin_stockage · hash · statut_scan · uploaded_by · created_at
```

**`document.id` et `document.hash` existent, sont disponibles au moment de la
persistance, et ne sont pas repris.** Le seul lien entre une analyse et le
fichier analysé est aujourd'hui une **chaîne de caractères** : `nom`.

Conséquence concrète : deux fichiers de même nom déposés sur la même mission
sont indiscernables dans `evaluation_document_analyse`, et un fichier renommé
rompt le lien. **GAP MAJEUR démontré.**

### 4.3 Mapping cible

| Sortie V2 | Persistance | Colonne | Statut |
|---|---|---|---|
| `nom` | `evaluation_document_analyse` | `nom` | **EXISTE** |
| `resume` | `evaluation_document_analyse` | `resume` | **EXISTE** |
| *(rang)* | `evaluation_document_analyse` | `ordre` | **EXISTE** |
| `piece_reference` | `evaluation_document_analyse` | `piece_reference` | **COLONNE À AJOUTER** |
| → `document.id` | `evaluation_document_analyse` | `document_id` (FK) | **COLONNE À AJOUTER** |
| → `document.hash` | — | *(via la FK)* | **NON PERSISTÉE VOLONTAIREMENT** |
| `confiance_lecture` | `evaluation_document_analyse` | `confiance_lecture` | **COLONNE À AJOUTER** |
| `constats[]` | — | — | **À ARBITRER — §4.4** |

**Le hash ne doit pas être recopié.** La FK vers `document` le rend
accessible, et le dupliquer créerait deux sources de vérité pouvant diverger.
Le précédent inverse existe pourtant dans le schéma — `import_referentiel`
porte `hash_fichier` en propre — mais cette table n'a pas de FK vers
`document` : elle n'a pas le choix, `evaluation_document_analyse` l'aurait.

### 4.4 Où loger les constats

Un `ElementReleve` porte une **référence de preuve attendue**, une présence
parmi quatre valeurs, et deux listes de chaînes.

| Option | Ce qu'elle permet | Ce qu'elle coûte |
|---|---|---|
| **A — table `analyse_document_constat`** | Chercher « quels documents mentionnent la preuve X » ; FK réelle vers `preuve_attendue` | Une table de plus |
| **B — JSONB sur `evaluation_document_analyse`** | Affichage, relecture | Aucune recherche par preuve ; aucune intégrité référentielle |
| **C — non persisté** | Rien | Le détail documentaire est perdu |

**Recommandation : A.** Le constat porte une **référence résolvable en UUID**
(§5) ; le mettre en JSONB reviendrait à conserver une clé étrangère sous
forme de texte, ce qu'aucune des six colonnes JSONB existantes ne fait — elles
ne contiennent que de la localisation et des métadonnées inertes.

Les deux listes `elements_releves` / `elements_manquants` sont, elles, de la
**prose énumérée** : elles ne se cherchent pas et relèvent du JSONB, à
l'intérieur de la ligne de constat.

> C'est l'application littérale de la règle du brief — *ce qui se cherche
> devient une colonne, ce qui se lit reste en JSONB* — appliquée un cran plus
> bas que l'objet entier : **le constat est relationnel, son contenu textuel
> est JSONB.**

### 4.5 Plusieurs documents

Déjà résolu par l'existant : `evaluation_document_analyse` est une table
fille avec `ordre`, et 13 lignes coexistent pour un nombre inférieur
d'évaluations. **Aucun changement nécessaire.**

---

## 5. Références locales → UUID

**C'est le point critique de toute la bascule.**

### 5.1 La chaîne réelle

Java **construit** les références, Python ne fait que les recopier :

```
Java : PreuveAttendue (UUID)
   ↓  numeroter()
   ↓  <code_exigence>-P<rang>          ex. D1-01-E1-P1
Python : manipule la chaîne, ne résout rien
   ↓  la rend dans reference / rattachement.reference
Java : ReferencesPreuvesAttendues.resoudre(reference) → PreuveAttendue (UUID)
   ↓
persistance relationnelle
```

### 5.2 Pourquoi c'est déterministe

[ConstructionContexteIa.java:96-107](api-quarkus/src/main/java/com/smartexsustway/api/ia/contrat/ConstructionContexteIa.java#L96-L107) :

> « Le rang repart à 1 pour chaque exigence […] L'ordre vient de
> `parCritereActives`, dont le tri est **total** (exigence.ordre,
> exigence.id, ordre, id). Sans tri total, deux preuves de même rang
> échangeraient leurs références d'une analyse à l'autre. »

Le tri total est ce qui rend la numérotation **reproductible**. C'est une
propriété acquise en phase 1, et elle est la condition de tout ce chapitre.

### 5.3 Les trois niveaux de rattachement

| `niveau` | Forme de la référence | Résolution Java |
|---|---|---|
| `EXIGENCE` | le **code** de l'exigence (`D1-01-E1`) | `ExigenceRepository` par code + critère |
| `PREUVE_ATTENDUE` | `<code_exigence>-P<rang>` | `ReferencesPreuvesAttendues.resoudre` |
| `REGLE` | le **code** de la règle | `RegleAnalyseRepository` par code + critère |

Seul `PREUVE_ATTENDUE` a besoin de la table de références du payload. Les
deux autres se résolvent par code, donnée stable du référentiel.

### 5.4 La contrainte que cela impose au flux

`ReferencesPreuvesAttendues` est **locale au payload** : elle est construite
par `construire()` et rendue dans le `record Contexte(payload, references)`.

**Elle n'est persistée nulle part.** Elle vit en mémoire, le temps d'un appel.

> **Conséquence majeure pour la bascule** : la résolution des références
> **doit avoir lieu dans la même unité de travail** que la construction du
> contexte. Un traitement différé — file d'attente, reprise ultérieure,
> persistance du résultat brut pour résolution plus tard — perdrait la table
> de références et rendrait les références **irrésolvables**.
>
> Deux issues seulement : soit la résolution reste synchrone, soit la table
> de références est elle-même persistée. **Ce choix n'est pas tranché et
> relève d'un arbitrage** (§26, G7).

### 5.5 Règle absolue respectée

Aucune résolution d'UUID côté Python. Vérifié : `contrat_v2.py` ne manipule
que des chaînes, et `verifier_rattachements()` se contente d'**écarter** ce
qui ne désigne rien du catalogue transmis — sans jamais résoudre.

---

## 6. Mapping Evidence

### 6.1 Le niveau critère — déjà en place

| Sortie V2 | Colonne existante | Statut |
|---|---|---|
| `probabilite_conformite` | `evaluation.probabilite_conforme` | **EXISTE** |
| `confiance` | `evaluation.confiance_ia` | **EXISTE** |
| `couverture_preuve` | `evaluation.couverture_preuve` | **EXISTE** |
| `justification_conformite` | `evaluation.justification` | **EXISTE** |
| `justification_couverture` | — | **GAP MINEUR** — aucune colonne ; aujourd'hui perdue ou fondue dans `justification` |

### 6.2 Le niveau preuve attendue — entièrement absent

`ResultatEvidenceV2.evaluations` est une **liste structurée par preuve
attendue**. Le modèle actuel n'a **rien** pour l'accueillir : `evaluation`
est plat, et aucune table fille n'existe hormis
`evaluation_document_analyse`, qui porte des documents et non des attentes.

**GAP CRITIQUE démontré.**

### 6.3 Arbitrage colonne / JSONB / non persisté

Application de la règle du brief, champ par champ :

| Champ | Se cherche ? | Décision | Justification |
|---|:-:|---|---|
| `reference` | ✅ | **colonne** + FK `preuve_attendue_id` | C'est la clé de rattachement |
| `couverture` | ✅ | **colonne** (enum 4 valeurs) | « Quelles attentes sont INSUFFISANTE sur la mission ? » est la question métier centrale |
| `conflit` | ✅ | **colonne** (`text`, nullable) | Sa **présence** se cherche (§9) ; son contenu se lit |
| `justification` | ❌ | **colonne** `text` | Ne se cherche pas, mais unique et volumineuse : une colonne est plus simple qu'un JSONB à une clé |
| `pieces_utilisees` | ➖ | **JSONB** | Liste de références locales ; voir réserve ci-dessous |
| `elements_observes` | ❌ | **JSONB** | Prose énumérée |
| `elements_manquants` | ❌ | **JSONB** | Prose énumérée |
| `elements_non_verifiables` | ❌ | **JSONB** | Prose énumérée — mais **jamais fusionnée** avec la précédente (§7) |

> **Réserve sur `pieces_utilisees`.** La règle du brief la classerait en
> JSONB. Mais ces références désignent des documents réels, et la question
> « sur quelles pièces cette conclusion repose-t-elle ? » est exactement
> celle qu'un auditeur contesté posera. Si le §4 aboutit à une table de
> constats portant `document_id`, la traçabilité pièce → attente y sera déjà,
> et le JSONB suffira ici. **Sinon, ce champ mérite une table de liaison.**
> Point à arbitrer, dépendant de la décision du §4.4.

### 6.4 `elements_manquants` au niveau critère

`ResultatEvidenceV2.elements_manquants` est une `list[Rattachement]` — donc
des références résolvables, à trois niveaux possibles. Elle **ne doit pas**
être aplatie en texte : c'est précisément ce qui alimenterait les axes
d'amélioration rattachés (§8).

---

## 7. `NON_VERIFIABLE` — préservation de la sémantique

### 7.1 Trois valeurs, trois significations

| Valeur | Signifie |
|---|---|
| `ABSENT` / `INSUFFISANTE` | **On a regardé, et la preuve n'y est pas** |
| `NON_VERIFIABLE` | **On n'a pas pu regarder** — document illisible, hors périmètre, format non exploitable |
| `PARTIELLE` | On a regardé, une partie y est |

`NON_VERIFIABLE` n'est pas un degré d'absence : c'est une **absence de
constat**. Le confondre avec `ABSENT` transforme une incapacité de lecture en
jugement défavorable — et fait porter à l'organisation le coût d'un défaut
technique.

### 7.2 Ce qui menace cette distinction

**Le modèle actuel la détruit intégralement.** `evaluation.couverture_preuve`
est un **booléen**. Il ne peut représenter que deux états là où le contrat V2
en distingue quatre. Toute la nuance disparaît à l'écriture.

### 7.3 Ce que la persistance doit garantir

1. `couverture` conservée comme **enum à quatre valeurs**, jamais réduite à
   un booléen ;
2. `elements_non_verifiables` conservé dans une **structure distincte** de
   `elements_manquants` — les fusionner est irréversible ;
3. le booléen `couverture_preuve` du niveau critère conservé pour la
   compatibilité V1, mais **jamais considéré comme la source de vérité** du
   détail.

> **Recommandation** : une attente `NON_VERIFIABLE` ne doit pas peser dans le
> calcul de conformité comme une attente absente. **NON DÉMONTRÉ DANS
> L'EXISTANT** : aucune règle de scoring actuelle ne traite ce cas, puisque
> l'information n'existe pas en base. C'est un arbitrage métier ouvert.

---

## 8. Déclarations

### 8.1 L'invariant

Une déclaration humaine — la réponse au questionnaire — **n'est pas une
preuve**. Elle est une affirmation qui reste à corroborer.

### 8.2 Ce que l'existant fait déjà bien

Le modèle sépare déjà les deux, et à deux endroits :

**En base** : `evaluation.niveau_declare` (le déclaré) est distinct de
`evaluation.probabilite_conforme` (le constaté). Le commentaire de
[AnalyseCritereService.java:208-210](api-quarkus/src/main/java/com/smartexsustway/api/mission/AnalyseCritereService.java#L208-L210) l'explicite : le niveau déclaré est **figé au
moment de l'analyse**, « le relire plus tard ne dirait rien, les réponses
ayant pu changer depuis ».

**Au scoring** : `laPlusRecenteIaParAuditCritere` filtre sur `source = IA`.
Le commentaire du repository est sans ambiguïté :

> « Les évaluations de source EXPERT restent en base au titre de RG14, mais
> ne participent plus au score : une déclaration de l'organisation ne vaut
> qu'une fois confrontée aux preuves par le pipeline. »

**Cette garantie est acquise et ne doit pas être défaite par la bascule V2.**

### 8.3 Ce qui manque

Le lien entre une déclaration **non corroborée** et l'attente qu'elle
prétendait couvrir. En V2, cette information existe : une `EvaluationPreuve`
en `INSUFFISANTE` avec une justification citant la déclaration. Elle ne
survit à la persistance que si le §6 est mis en œuvre.

**Aucune preuve ne doit être créée à partir d'une déclaration.** Le modèle V2
ne le permet pas — `pieces_utilisees` ne référence que des pièces réellement
transmises — et la persistance ne doit pas introduire ce que le contrat
interdit.

---

## 9. Conflits

### 9.1 Le cas

Deux documents affirment des choses opposées sur la même attente :

```
Document A → PRESENT
Document B → PARTIEL
```

Ce n'est pas une erreur à trancher : c'est un **fait à conserver**. C'est
d'ailleurs le scénario 6 du pipeline, éprouvé en réel en phase 4, qui rend
`PARTIELLE` + conflit nommé + confiance 0.40.

### 9.2 Comment le modèle V2 le porte

Deux niveaux, complémentaires :

1. **`AnalyseDocumentV2.constats`** — un constat **par document**. A dit
   `PRESENT`, B dit `PARTIEL` : les deux constats coexistent, chacun rattaché
   à son document.
2. **`EvaluationPreuve.conflit`** — la synthèse, au niveau de l'attente : le
   conflit est **nommé**, et la couverture retenue est la plus prudente.

### 9.3 Ce que la persistance doit garantir

**Ne jamais écraser un constat par l'autre.** C'est structurellement acquis
si le §4.4 option A est retenu : les constats sont des lignes distinctes,
rattachées à des documents distincts. Une structure qui n'en garderait qu'un
par attente perdrait le conflit.

Le champ `conflit` doit rester **nullable et distinct de la justification** :
sa présence est une information cherchable — « quelles attentes portent un
conflit sur cette mission ? » — que sa fusion dans un texte rendrait
inatteignable.

---

## 10. Mapping Risk

### 10.1 La distinction à ne pas perdre

**`risque_evaluation` n'est pas la table du Risk Agent.** Ses colonnes le
disent sans ambiguïté :

```
 probabilite · criticite_poids · risque_attendu · niveau_priorite · date_calcul
```

C'est le **calcul déterministe RG26** : `risque_attendu = (1 − probabilité) ×
criticité`. Une multiplication, reproductible, sans IA. `UNIQUE
(evaluation_id)` : une évaluation, un calcul.

Le Risk Agent V2 produit tout autre chose : un **signal**, une **catégorie**,
une **confiance**, et des **signaux rattachés**. Rien de tout cela n'est une
multiplication.

| | `risque_evaluation` | Risk Agent V2 |
|---|---|---|
| Nature | calcul déterministe | jugement d'un modèle |
| Reproductible | ✅ | ❌ |
| Entrées | probabilité, criticité | documents, évaluations, secteur |
| Table | `risque_evaluation` | **aucune adaptée** |

**Y écrire le signal IA serait une faute de conception** : le risque attendu
cesserait d'être recalculable, et une valeur issue d'un modèle serait
indiscernable d'une valeur arithmétique.

### 10.2 Fait mesuré : la table est vide

```
 risque_evaluation | 0
```

Le calcul RG26 **n'est branché nulle part**. `ScoringEngine.risqueAttendu`
est bien appelé — mais par `NonConformiteService`, qui écrit le résultat dans
`non_conforme.risque_attendu`, **pas** dans `risque_evaluation`.

> **GAP MAJEUR, indépendant de l'IA** : la table du calcul RG26 existe, est
> contrainte, et n'est alimentée par aucun code. Le risque attendu n'est
> persisté qu'en tant qu'attribut d'une non-conformité — donc **jamais pour
> un critère conforme**.

### 10.3 Où va le résultat du Risk Agent

| Sortie V2 | Persistance | Statut |
|---|---|---|
| `signal_risque` | `evaluation.signal_risque` | **EXISTE** |
| `categorie` | `evaluation.categorie_risque` | **EXISTE** |
| `justification` | `evaluation.justification_risque` | **EXISTE** |
| `confiance` | — | **COLONNE À AJOUTER** (`confiance_risque`) |
| `signaux[]` | — | **TABLE À AJOUTER** |

Les trois premiers champs ont déjà leur colonne — héritage V1, réutilisable
tel quel. **La confiance et les signaux détaillés n'ont aucun emplacement.**

### 10.4 Structure minimale proposée pour les signaux

**Conceptuelle uniquement — aucune table n'est créée dans cette phase.**

Un signal porte : une catégorie, un rattachement (niveau + référence), des
pièces concernées, une justification. La structure minimale serait une table
fille de `evaluation`, avec la référence résolue en UUID selon le niveau, et
les pièces en JSONB.

**Alternative à considérer** : mutualiser une seule table de « constats
rattachés » servant à la fois les signaux de risque et les éléments manquants
d'Evidence, discriminée par une colonne de nature. Les deux ont exactement la
même forme — un rattachement plus une justification. **À ARBITRER en 5.7-B.**

---

## 11. Mapping Recommendation

### 11.1 L'invariant absolu

Une recommandation IA **ne devient pas** une action corrective, un
engagement, un plan validé ou une obligation. Elle est une **proposition**.

### 11.2 Ce que fait l'existant — et le risque déjà présent

`evaluation.pistes_amelioration` (texte) est déjà alimenté. Mais surtout,
`NonConformiteService.description()` **recopie ces pistes dans la description
de la non-conformité** :

```java
description.append("Pistes d'amélioration : ").append(evaluation.getPistesAmelioration());
```

Une non-conformité est un objet métier durable, opposable. **La suggestion de
l'IA y est déjà incorporée sans validation humaine** — non comme engagement,
mais comme texte de l'objet. Le franchissement n'est pas encore fait ; il est
proche.

### 11.3 Le modèle retenu (phase 5.4)

```
Recommendation IA
      ↓
AxeAmelioration (origine = IA)
      ↓
validation humaine
      ↓
objet métier (action corrective, plan)
```

### 11.4 Mapping

| Sortie V2 | Persistance | Statut |
|---|---|---|
| `recommandation_necessaire` | `evaluation.recommandation_necessaire` | **EXISTE** |
| `pistes_amelioration` | `evaluation.pistes_amelioration` | **EXISTE** |
| `actions[]` | `axe_amelioration` | **TABLE À AJOUTER** |
| `actions[].rattachement` | `axe_amelioration.exigence_id` / `preuve_attendue_id` / `regle_analyse_id` | **TABLE À AJOUTER** |
| *(priorité)* | dérivée de `regle_analyse.severite` | **EXISTE** — côté Java, jamais du modèle |

---

## 12. Axe d'amélioration

### 12.1 Le gap

**La table `axe_amelioration` n'existe pas.** Vérifié par énumération des 64
tables du schéma. **GAP CRITIQUE.**

### 12.2 Le précédent à réutiliser

Le projet possède déjà un modèle complet de proposition IA soumise à
validation humaine : la table `exigence`, issue de l'import de référentiel.

```
 origine           USER-DEFINED  NOT NULL
 origine_initiale  USER-DEFINED  NULL
 validee_par       uuid          NULL
 validee_le        timestamptz   NULL
 rejetee_par       uuid          NULL
 rejetee_le        timestamptz   NULL
 motif_rejet       text          NULL
 texte_source      text          NULL
 localisation      jsonb         NULL
 confiance         numeric       NULL
```

avec `origine_contenu = CONTENU_INITIAL | CONTENU_HUMAIN | IMPORT_IA`.

**Ce motif est éprouvé, il tient une barrière de publication en base, et il
répond exactement au besoin.** Le réutiliser évite d'inventer un second
vocabulaire de validation dans la même application.

`origine_initiale` mérite une mention : il conserve **d'où venait la
proposition avant toute reprise humaine**. Sans lui, un axe IA corrigé par un
auditeur deviendrait indistinguable d'un axe humain — et la traçabilité de
l'origine IA serait perdue.

### 12.3 Champs minimaux

**Conceptuel. Aucune table n'est créée.**

| Champ | Rôle |
|---|---|
| `id` | — |
| `audit_id` | rattachement mission — **obligatoire** (§22) |
| `audit_critere_id` | contexte du critère, nullable |
| `evaluation_id` | l'évaluation qui l'a produit — traçabilité |
| `libelle` | l'action recommandée |
| `description` | détail |
| `origine` | `IA` \| `HUMAIN` |
| `origine_initiale` | conservation de l'origine avant reprise |
| `exigence_id` / `preuve_attendue_id` / `regle_analyse_id` | rattachement résolu, **exactement un renseigné** |
| `validee_par` / `validee_le` | validation humaine |
| `rejetee_par` / `rejetee_le` / `motif_rejet` | rejet |
| `statut` | métier |
| `created_at` | — |

> L'énumération `origine_contenu` existante vaut `CONTENU_INITIAL |
> CONTENU_HUMAIN | IMPORT_IA`. Ses valeurs sont **spécifiques à l'import de
> référentiel** et ne conviennent pas telles quelles à un axe issu d'une
> analyse de mission. **À ARBITRER** : étendre l'énumération, ou en créer une
> seconde.

---

## 13. Plan d'action

### 13.1 Le gap

**La table `plan_action` n'existe pas.** **GAP MAJEUR.**

### 13.2 La décision à confirmer

```
PlanAction → rattaché à Audit/Mission        ✅ retenu
Axe → Plan                                   ❌ écarté
```

**Confirmée, et pour une raison structurelle** : un plan d'action est un
objet de pilotage de la mission. Le suspendre à un axe donnerait autant de
plans que d'axes, alors que la réalité inverse est la norme — un plan
regroupe plusieurs axes, et une action peut en traiter plusieurs à la fois.

### 13.3 Comment une action référence plusieurs axes

Relation **N-N**, donc table de liaison (`action_axe`). C'est le seul moyen
de représenter qu'une action unique — « formaliser et diffuser la politique
RSE » — répond à trois axes distincts, sans dupliquer l'action ni en perdre
la traçabilité.

### 13.4 Articulation avec l'existant

`action_corrective` existe déjà, mais elle est rattachée à
`non_conforme_id` (NOT NULL). **Elle ne peut pas porter une action issue d'un
axe** : un axe d'amélioration n'est pas une non-conformité, et forcer la
création d'une non-conformité pour loger une action serait exactement la
confusion que le §14 interdit.

---

## 14. Responsabilités — le tableau qui interdit les mélanges

| Objet | Déclencheur | Nature | Validé humainement ? |
|---|---|---|---|
| **Non-conformité** | Évaluation `VALIDEE` avec note < 5 **et** criticité résolue | **Constat opposable** — un écart mesuré | ❌ **automatique** (RG17) |
| **Axe d'amélioration** | Recommandation IA | **Proposition** — sans valeur tant qu'elle n'est pas reprise | ✅ **obligatoire** |
| **Action corrective** | Décision humaine sur une non-conformité | **Engagement** — porte un responsable et une échéance | ✅ par construction |
| **Plan d'action** | Décision humaine de pilotage | **Regroupement** d'actions à l'échelle de la mission | ✅ par construction |

### Les frontières à ne jamais franchir

| Interdit | Pourquoi |
|---|---|
| Recommandation IA → action corrective | Créerait un engagement que personne n'a pris |
| Signal Risk IA → `risque_evaluation` | Rendrait un calcul déterministe non recalculable (§10) |
| Axe non validé → plan d'action | Ferait piloter la mission sur une proposition |
| Non-conformité → axe d'amélioration | Deux natures distinctes : un constat n'est pas une suggestion |

### Le point de vigilance sur les non-conformités

La non-conformité est **le seul objet créé automatiquement**, et c'est
assumé : RG17 en fait la conséquence mécanique d'un écart constaté. Mais
cette automaticité repose sur la validité de l'évaluation qui la déclenche.
Le §15 montre que cette validité est aujourd'hui acquise sans intervention
humaine.

---

## 15. Evaluation — le statut

### 15.1 Le choix actuellement supporté par le code

```java
// RG16 : l'analyse constitue directement l'évaluation définitive.
evaluation.setStatut(StatutEvaluation.VALIDEE);
```

[AnalyseCritereService.java:211-212](api-quarkus/src/main/java/com/smartexsustway/api/mission/AnalyseCritereService.java#L211-L212)

Mesuré : **44 évaluations sur 44 en `VALIDEE`**, zéro en `PROVISOIRE`, zéro
en `EN_REVUE`. Le défaut SQL `PROVISOIRE` n'est jamais atteint.

**Le choix est donc : une sortie IA devient immédiatement définitive.** Ce
n'est pas un oubli, c'est RG16, écrit et commenté.

### 15.2 Ce que cela déclenche en cascade

`VALIDEE` n'est pas un simple libellé. Il commande, dans cet ordre :

1. l'entrée de l'évaluation dans le **score officiel** —
   `AuditScoreService` ne compte que `VALIDEE` ;
2. la **génération automatique d'une non-conformité** si la note < 5 ;
3. l'**instantané de score** dans `score_historique`.

Une analyse IA produit donc aujourd'hui, sans aucune intervention humaine :
une note officielle, une non-conformité opposable, et une entrée d'historique.

### 15.3 Le mécanisme de protection existe déjà et n'est pas utilisé

`AuditScoreService.calculer` distingue explicitement les trois statuts :

```java
if (derniere.getStatut() == StatutEvaluation.EN_REVUE) {
    nombreEnRevue++;
} else if (derniere.getStatut() == StatutEvaluation.VALIDEE) {
    // … entre dans le score
}
```

**`EN_REVUE` est déjà exclu du score et compté à part**, et le DTO expose ce
compteur. Écrire les évaluations V2 en `EN_REVUE` plutôt qu'en `VALIDEE`
suffirait à empêcher une analyse IA de contaminer le score officiel —
**sans aucune modification du moteur de scoring**.

### 15.4 Mapping des champs

| Sortie V2 | Colonne | Statut |
|---|---|---|
| `probabilite_conformite` | `probabilite_conforme` | **EXISTE** |
| *(dérivé)* | `note` | **EXISTE** — RG27, jamais produit par l'IA |
| `confiance` | `confiance_ia` | **EXISTE** |
| `couverture_preuve` | `couverture_preuve` | **EXISTE** |
| `justification_conformite` | `justification` | **EXISTE** |
| — | `niveau_declare` | **EXISTE** — figé à l'analyse |
| — | `source` | **EXISTE** — `IA` |
| — | `statut` | **EXISTE** — **valeur à arbitrer** |
| — | `version_referentiel` | **EXISTE mais jamais renseignée : 0/44** |
| — | `date_evaluation` | **EXISTE** |

> **GAP MAJEUR confirmé par mesure** : `version_referentiel` est nulle sur
> les 44 lignes. Une évaluation ne dit pas contre quelle version du
> référentiel elle a été rendue — alors que le référentiel est versionné et
> que la colonne existe.

### 15.5 Recommandation

**Écrire les évaluations V2 en `EN_REVUE`, pas en `VALIDEE`.**

Trois raisons : le mécanisme d'exclusion du score existe déjà et fonctionne ;
cela empêche la génération automatique de non-conformités sur une analyse non
relue ; et cela rend le passage à `VALIDEE` explicite, donc traçable.

**C'est un changement de règle métier (RG16). Il ne relève pas de cette
phase et doit être arbitré** — mais la cartographie serait incomplète si elle
ne montrait pas que le pipeline V2, branché tel quel sur le comportement
actuel, produirait des non-conformités opposables sans relecture.

---

## 16. Historisation

### 16.1 Le mécanisme réel

Aucune contrainte d'unicité sur `evaluation` → **l'historique se fait par
accumulation**. Mesuré :

```
 audit_critere distincts évalués   | 22
 évaluations totales               | 44
 audit_critere avec >1 évaluation  | 12
```

L'évaluation « active » est la **plus récente** :

```java
return find("auditCritere.id = ?1 order by dateEvaluation desc", auditCritereId)
        .firstResultOptional();
```

Et pour le score, la plus récente **de source IA** :

```java
find("auditCritere.id = ?1 and source = ?2 order by dateEvaluation desc",
     auditCritereId, SourceEvaluation.IA)
```

### 16.2 Réponses

| Question | Réponse | Fondement |
|---|---|---|
| Nouvelle analyse = nouvelle Evaluation ? | **Oui** | `new Evaluation(...)` + `persistAndFlush`, jamais de mise à jour |
| Mise à jour de l'ancienne ? | **Non, jamais** | Aucun `merge`, aucun `update` sur `evaluation` |
| Quelle évaluation est active ? | La plus récente par `date_evaluation`, filtrée `source=IA` pour le score | `EvaluationRepository` |
| Comment l'historique est conservé ? | Par accumulation — rien n'est supprimé | Absence de suppression dans le code |

### 16.3 Le risque de départage

L'ordre repose **uniquement** sur `date_evaluation desc`. Aucun départage
secondaire. Deux évaluations écrites dans la même transaction porteraient un
`now()` identique et l'« active » serait **indéterminée**.

Le cas ne se produit pas aujourd'hui — une analyse écrit une seule
évaluation. Il se produirait si une passe V2 écrivait plusieurs évaluations
pour un même critère.

> **Recommandation** : ajouter un départage stable (`date_evaluation desc,
> id desc`) **avant** toute bascule susceptible d'écrire plusieurs
> évaluations par critère et par transaction. Coût nul, risque évité.

---

## 17. Non-conformités

### 17.1 Le problème, mesuré

```
 non_conforme (total)               | 39
 audit_critere distincts évalués    | 22
 NC titres dupliqués (même critère) | 11
```

### 17.2 La cause, démontrée

`NonConformiteService.genererSiNecessaire` persiste **inconditionnellement** :

```java
NonConforme nonConforme = new NonConforme(evaluation, titre, description, niveau, risqueAttendu);
nonConformeRepository.persist(nonConforme);
```

Aucune recherche d'une non-conformité existante pour le même critère. Aucune
contrainte d'unicité en base. **Chaque ré-analyse d'un critère non conforme
crée une non-conformité de plus**, avec le même titre — celui-ci étant dérivé
du seul code du critère.

### 17.3 Le choix de clé logique

La non-conformité est rattachée à `evaluation_id`, non à `audit_critere_id`.
Ce choix a une conséquence directe : elle est **liée à un instantané**, pas à
un écart.

| Clé candidate | Effet | Évaluation |
|---|---|---|
| `audit_critere` | Un écart par critère ; la ré-analyse **met à jour** | ✅ **Correspond au sens métier** : le même écart reste le même |
| `audit_critere + evaluation` | Un écart par analyse — **comportement actuel** | ❌ C'est la définition du doublon |
| `audit + audit_critere` | Équivalent au premier (`audit_critere` porte déjà `audit_id`, `UNIQUE (audit_id, critere_id)`) | ➖ Redondant |

**Recommandation : `audit_critere`.** Un écart sur le critère D1-01 est le
même écart, qu'on l'ait constaté une ou cinq fois. Sa gravité et sa
description doivent être **rafraîchies** par la dernière analyse, pas
dupliquées.

### 17.4 La difficulté à ne pas sous-estimer

Une non-conformité peut porter un **statut métier** (`OUVERTE`,
`EN_TRAITEMENT`, `CLOTUREE`) et des **actions correctives rattachées**. La
mettre à jour depuis une nouvelle analyse ne doit ni réinitialiser son
statut, ni orpheliner ses actions.

> **NON DÉMONTRÉ DANS L'EXISTANT** : aucun code ne met aujourd'hui à jour une
> non-conformité depuis une analyse. Le comportement de rafraîchissement est
> **entièrement à concevoir** — c'est un arbitrage métier, pas une correction
> technique.

**Aucune modification du modèle dans cette phase.**

---

## 18. Exécutions IA

### 18.1 L'état actuel — plus dormant encore qu'il n'y paraît

Les deux tables existent et sont **vides**. Mais le fait décisif est ailleurs :

```
grep -rn "AnalyseIa|ExecutionAgent|analyse_ia|execution_agent" \
     api-quarkus/src/main/java --include=*.java
   → aucun résultat
```

**Il n'existe aucune classe Java pour ces tables** — ni entité JPA, ni dépôt,
ni DTO. Elles n'ont jamais été mappées.

La conséquence pour la planification est directe : activer la trace
d'exécution ne se réduit pas à ajouter des colonnes. Il faut **créer les
entités et les dépôts**, ce qui est un lot de développement à part entière,
distinct de la migration.

### 18.2 Le mapping, colonne par colonne

`analyse_ia` — **grain : la passe d'analyse**

| Colonne existante | Alimentation |
|---|---|
| `audit_id` | ✅ disponible |
| `statut` | ✅ `statut_pipeline` |
| `formule` | ✅ `formule_pipeline` |
| `date_debut` / `date_fin` | ✅ mesurés Python, ou Java |
| `erreur` | ✅ — **texte assaini uniquement** (phase 5.6) |

| Manquant | Statut |
|---|---|
| `audit_critere_id` | **GAP** — `analyse_ia` porte `audit_id`, pas le critère |
| `requested_model` | **COLONNE À AJOUTER** |
| `declenche_par` | **COLONNE À AJOUTER** |
| `contrat_version` / `contrat_execution_version` | **COLONNE À AJOUTER** |

> **Le gap `audit_critere_id` est structurel.** L'analyse est déclenchée par
> critère (`AnalyseCritereService`), mais `analyse_ia` est modélisée par
> mission. Une passe échouée avant toute évaluation n'a alors **aucun critère
> identifiable** — on sait qu'une analyse a échoué, pas sur quoi.

`execution_agent` — **grain : l'appel fournisseur**

| Colonne existante | Alimentation |
|---|---|
| `analyse_ia_id` | ✅ |
| `agent` | ✅ `type_agent_ia` |
| `statut` | ✅ `statut_execution_agent` — aligné sur `StatutAppel` |
| `date_debut` / `date_fin` | ✅ `started_at` / `finished_at` |
| `input_reference` | ➖ **usage NON DÉMONTRÉ** |
| `output_reference` | ➖ **usage NON DÉMONTRÉ** |

| Manquant | Correspondance `AppelTrace` |
|---|---|
| `served_model` | `served_model` — **le champ décisif** |
| `response_id` | `response_id` |
| `duration_ms` | `duration_ms` |
| `piece_reference` | `piece_reference` — distingue les appels documentaires |
| `prompt_token_count` / `candidates_token_count` / `total_token_count` | `usage` |
| `erreur_type` / `erreur_message` | `error` |

**7 colonnes à ajouter sur `execution_agent`, 4 sur `analyse_ia`.**

### 18.3 Qui crée quoi, et quand

**Proposition — non implémentée :**

| Objet | Créé par | Quand |
|---|---|---|
| `analyse_ia` | Java, avant l'appel | Au déclenchement, statut `EN_COURS` |
| `execution_agent` | Java, après retour | Une ligne par entrée de `execution.appels[]` |
| Clôture `analyse_ia` | Java | Après persistance, `TERMINE` ou `ERREUR` |

**Contrainte de la phase 5.5, toujours valable** : ne jamais tenir une
transaction ouverte pendant l'appel Python. `analyse_ia` doit donc être créée
et close dans **deux transactions distinctes**.

### 18.4 Absence d'unicité

`execution_agent` n'a **aucune** contrainte d'unicité sur
`(analyse_ia_id, agent)` — et c'est correct : le Document Agent produit
**un appel par pièce**. C'est `piece_reference` qui les distingue, d'où la
nécessité de la colonne.

---

## 19. Scores

### 19.1 La chaîne réelle

```
evaluation (statut VALIDEE, source IA)
      ↓  AuditScoreService.calculer()  — calcul pur, à la volée
score global + score par domaine
      ↓  ScoreHistoriqueService.enregistrer()
score_historique (UPSERT sur audit_id + date)
```

### 19.2 Fait mesuré : deux tables de score sont mortes

```
 score_audit      | 0
 score_domaine    | 0
 score_historique | 8
```

`AuditScoreService` **ne lit ni n'écrit** `score_audit` ou `score_domaine` :
il recalcule tout à chaque appel depuis `evaluation`, et le commentaire du
service l'assume — « un calcul pur sans effet de bord ».

> **GAP MINEUR** : deux tables contraintes (`UNIQUE (audit_id)` et
> `UNIQUE (audit_id, domaine_id)`) sont inutilisées. Elles ne gênent pas ;
> elles induisent en erreur quiconque lit le schéma.

### 19.3 La protection du score officiel

Trois filtres, tous déjà en place :

1. `AuditCritere::isActif` et `::isApplicable` ;
2. `source = IA` — une déclaration ne fait pas la note ;
3. `statut == VALIDEE` — **`EN_REVUE` est exclu et compté à part**.

**Le troisième filtre est la protection demandée par le brief.** Elle
existe. Elle n'est simplement jamais activée, puisque rien n'écrit
`EN_REVUE` (§15).

### 19.4 Historique et clôture

`score_historique` est **idempotent par jour** grâce à un UPSERT natif
`ON CONFLICT (audit_id, date) DO UPDATE`. Plusieurs analyses le même jour
mettent la ligne à jour au lieu de l'empiler. **C'est le seul mécanisme
d'idempotence réellement implémenté du modèle** — et le précédent à suivre.

---

## 20. Idempotence

### 20.1 Ce qui existe

| Mécanisme | Table | Efficace ? |
|---|---|---|
| `UNIQUE (audit_id, date)` + UPSERT | `score_historique` | ✅ **oui** |
| `UNIQUE (audit_id, critere_id)` | `audit_critere` | ✅ oui |
| `UNIQUE (evaluation_id)` | `risque_evaluation` | ✅ *(table vide)* |
| — | `evaluation` | ❌ aucune — **voulu** (§16) |
| — | `non_conforme` | ❌ aucune — **défaut** (§17) |
| — | `execution_agent` | ❌ aucune — voulu (§18.4) |

### 20.2 Clés logiques proposées

**Conceptuel. Aucune contrainte n'est créée.**

| Risque | Clé logique | Nature |
|---|---|---|
| Double persistance d'une passe | `analyse_ia (audit_id, audit_critere_id, date_debut)` | Contrainte |
| Double analyse concurrente | Verrou applicatif sur `audit_critere` | **Applicatif** — une contrainte ne l'empêche pas |
| Double exécution d'agent | `execution_agent (analyse_ia_id, agent, piece_reference, response_id)` | Contrainte |
| Double évaluation | **Aucune** — l'accumulation est voulue | — |
| Double non-conformité | `non_conforme (audit_critere_id)` | Contrainte — **§17** |
| Double axe | `axe_amelioration (evaluation_id, rattachement, libelle)` | **Insuffisant** — voir ci-dessous |
| Double action | `action_axe (action_id, axe_id)` | Contrainte |

> **Le cas de l'axe résiste à une contrainte d'unicité.** Deux
> recommandations formulées différemment pour le même problème sont
> textuellement distinctes et sémantiquement identiques. Aucune clé ne les
> réconciliera. Le dédoublonnage y est **un geste humain de relecture**,
> ce qui est cohérent avec le fait qu'un axe est une proposition à valider.

### 20.3 Le seul verrou qu'une contrainte ne remplace pas

Deux analyses lancées simultanément sur le même critère produiraient deux
`analyse_ia`, deux évaluations et deux non-conformités, **toutes légitimes au
regard des contraintes**. Seul un verrou applicatif — statut `EN_COURS`
vérifié avant lancement — l'empêche.

**NON DÉMONTRÉ DANS L'EXISTANT** : aucun verrou de ce type n'existe
aujourd'hui.

---

## 21. Reprise après échec

### 21.1 Le cas

```
Analyse 1 : Evaluation E1 · Execution X1 · Risk ERREUR
Nouvelle  : Evaluation E2 · Execution X2 · Risk OK
```

### 21.2 E1 doit-il rester ?

**Oui. Sans condition.**

Quatre raisons, dans l'ordre de force :

1. **C'est le comportement actuel, et il est cohérent.** Aucun code ne
   supprime ni ne met à jour une évaluation ; 12 critères portent déjà
   plusieurs évaluations.
2. **E1 n'est pas vide.** Un échec du Risk Agent n'invalide pas le travail
   des agents Document et Evidence : E1 porte une probabilité et une
   justification réelles, obtenues d'appels réussis.
3. **La suppression détruirait la trace de l'incident.** X1 porte le
   `response_id` et la catégorie d'erreur — les seuls ancrages d'une
   réclamation auprès du fournisseur.
4. **L'écrasement empêcherait de constater une dérive.** Si E1 et E2
   divergent fortement sur les mêmes pièces, c'est une information sur la
   stabilité du modèle. L'écrasement la supprime.

### 21.3 Ce qui suffit

`laPlusRecenteIaParAuditCritere` fait déjà le nécessaire : E2 devient active,
E1 reste consultable. **Aucun mécanisme supplémentaire n'est requis.**

Seule réserve, celle du §16.3 : le départage doit être stable si E1 et E2
pouvaient partager un horodatage.

### 21.4 Le cas de la reprise partielle

Faut-il rejouer seulement l'agent en échec ? **Non recommandé.** Le Risk
Agent consomme les sorties d'Evidence ; rejouer Risk seul supposerait de
figer les sorties précédentes, donc de les persister avant validation.

> **Interdiction du brief respectée** : aucune reprise automatique
> (implémentée en phase 5.6). Une reprise est un geste explicite.

---

## 22. Tenant et sécurité

### 22.1 La chaîne de rattachement

```
evaluation → audit_critere → audit → entreprise
                          ↘ critere → referentiel_version → referentiel
```

`audit_critere` porte `audit_id` **NOT NULL** avec `UNIQUE (audit_id,
critere_id)`. Le chaînage est solide : toute évaluation est rattachable à une
entreprise en deux jointures.

### 22.2 Les risques IDOR identifiés

| Risque | Gravité | État |
|---|---|---|
| Lire l'évaluation d'une autre entreprise par UUID | **élevé** | Le chaînage permet le contrôle ; **son application effective dans les ressources n'a pas été auditée dans cette phase** |
| `axe_amelioration` sans `audit_id` obligatoire | **élevé** | **À PRÉVENIR** — d'où le NOT NULL du §12.3 |
| `execution_agent` atteignable sans passer par l'audit | **moyen** | `analyse_ia.audit_id` fournit le rattachement |
| Trace exposant un contenu client | **traité** | Phase 5.6 : la trace ne porte qu'identifiants et mesures |

### 22.3 Le point de vigilance des nouvelles tables

Toute table ajoutée doit porter un rattachement **direct** à `audit_id`, même
lorsqu'un chemin indirect existe. Un axe rattaché uniquement à
`evaluation_id` obligerait à trois jointures pour un contrôle d'accès — et un
contrôle coûteux est un contrôle qu'on finit par oublier.

### 22.4 Version de référentiel

`evaluation.version_referentiel` est **nulle sur 44 lignes**. Ce n'est pas
qu'un défaut de traçabilité : une évaluation rendue contre la V1 d'un
référentiel n'est pas comparable à une évaluation rendue contre la V2, et
rien ne permet aujourd'hui de les distinguer. **GAP MAJEUR.**

---

## 23. Matrice finale

| Objet V2 | Table actuelle | Nouvelle colonne | Nouvelle table | Relation | Validation humaine | Historisation |
|---|---|---|---|---|:-:|---|
| `probabilite_conformite` | `evaluation` | — | — | `audit_critere` | ❌ auto | accumulation |
| `confiance` (Evidence) | `evaluation.confiance_ia` | — | — | idem | ❌ | accumulation |
| `couverture_preuve` | `evaluation` | — | — | idem | ❌ | accumulation |
| `justification_conformite` | `evaluation.justification` | — | — | idem | ❌ | accumulation |
| `justification_couverture` | — | ✅ | — | idem | ❌ | accumulation |
| `evaluations[]` (par preuve) | **aucune** | — | ✅ | → `preuve_attendue` | ❌ | par évaluation |
| `elements_manquants` (Evidence) | **aucune** | — | ✅ | → rattachement | ❌ | par évaluation |
| `nom`, `resume` (Document) | `evaluation_document_analyse` | — | — | → `evaluation` | ❌ | par évaluation |
| `piece_reference` | — | ✅ | — | idem | ❌ | idem |
| `document_id` | — | ✅ (FK) | — | → `document` | ❌ | idem |
| `confiance_lecture` | — | ✅ | — | idem | ❌ | idem |
| `constats[]` | **aucune** | — | ✅ | → `preuve_attendue` + `document` | ❌ | idem |
| `signal_risque` | `evaluation` | — | — | — | ❌ | accumulation |
| `categorie` (Risk) | `evaluation.categorie_risque` | — | — | — | ❌ | accumulation |
| `justification` (Risk) | `evaluation.justification_risque` | — | — | — | ❌ | accumulation |
| `confiance` (Risk) | — | ✅ | — | — | ❌ | accumulation |
| `signaux[]` | **aucune** | — | ✅ | → rattachement | ❌ | par évaluation |
| `recommandation_necessaire` | `evaluation` | — | — | — | ❌ | accumulation |
| `pistes_amelioration` | `evaluation` | — | — | — | ❌ | accumulation |
| `actions[]` | **aucune** | — | ✅ `axe_amelioration` | → `audit` + rattachement | ✅ **obligatoire** | par axe |
| *(plan)* | **aucune** | — | ✅ `plan_action` + `action_axe` | → `audit` | ✅ | par plan |
| Passe d'exécution | `analyse_ia` **(vide)** | ✅ ×4 | — | → `audit` | ❌ | par passe |
| Appel fournisseur | `execution_agent` **(vide)** | ✅ ×7 | — | → `analyse_ia` | ❌ | par appel |
| Risque RG26 | `risque_evaluation` **(vide)** | — | — | → `evaluation` | ❌ | 1 par évaluation |

---

## 24. Gaps

### CRITIQUE

| # | Gap | Démonstration |
|---|---|---|
| **G1** | **`axe_amelioration` n'existe pas** | Absente des 64 tables. Sans elle, une recommandation IA n'a que deux destins : rester du texte dans `pistes_amelioration`, ou devenir un objet métier sans validation |
| **G2** | **Le détail par preuve attendue n'a aucune table** | `ResultatEvidenceV2.evaluations` est perdu à 100 %. C'est le cœur du contrat V2 |
| **G3** | **`NON_VERIFIABLE` est détruit à l'écriture** | `evaluation.couverture_preuve` est un `boolean` face à quatre valeurs |

### MAJEUR

| # | Gap | Démonstration |
|---|---|---|
| **G4** | **`plan_action` n'existe pas** | Absente. `action_corrective.non_conforme_id` est NOT NULL : une action issue d'un axe n'a nulle part où aller |
| **G5** | **Doublons de non-conformités** | 39 lignes / 22 critères, 11 groupes dupliqués. `persist` inconditionnel + aucune unicité |
| **G6** | **Le document analysé n'est pas identifié** | `evaluation_document_analyse` ne porte que `nom`. `document.id` et `document.hash` sont disponibles et ignorés |
| **G7** | **La table de références n'est pas persistée** | `ReferencesPreuvesAttendues` vit en mémoire. Toute résolution différée est impossible (§5.4) |
| **G8** | **`version_referentiel` jamais renseignée** | 0/44 |
| **G9** | **`analyse_ia` n'a pas `audit_critere_id`** | Une passe échouée avant évaluation n'a aucun critère identifiable |
| **G10** | **`risque_evaluation` jamais alimentée** | 0 ligne. Le risque RG26 n'existe qu'en attribut de non-conformité, donc jamais pour un critère conforme |
| **G11** | **11 colonnes manquantes sur les tables d'exécution** | 4 sur `analyse_ia`, 7 sur `execution_agent` |
| **G11b** | **Aucune entité ni dépôt Java pour `analyse_ia` / `execution_agent`** | `grep` sur `api-quarkus/src/main/java` : **aucun résultat**. Les tables ne sont pas mappées |
| **G12** | **Une évaluation IA devient `VALIDEE` sans relecture** | 44/44. Déclenche score, non-conformité et historique (§15.2) |

### MINEUR

| # | Gap | Démonstration |
|---|---|---|
| **G13** | `score_audit` et `score_domaine` mortes | 0 ligne, jamais lues par `AuditScoreService` |
| **G14** | `justification_couverture` sans colonne | Champ V2 sans destination |
| **G15** | `type_agent_ia` sans valeur pour l'import | L'instrumentation étiquette `IMPORT_REFERENTIEL`, absent de l'énumération |
| **G16** | Départage d'historisation non stable | Tri sur `date_evaluation` seul (§16.3) |
| **G17** | `input_reference` / `output_reference` | Usage **NON DÉMONTRÉ** |
| **G18** | Aucun verrou d'analyse concurrente | **NON DÉMONTRÉ DANS L'EXISTANT** |

---

## 25. Ordre de migration futur

**Déduit des dépendances réelles, non repris d'un modèle imposé.**

Le critère d'ordonnancement est double : **ce qui ne casse rien passe
d'abord**, et **ce qui débloque la traçabilité prime sur ce qui ajoute des
fonctionnalités**.

| # | Migration | Débloque | Dépend de | Risque |
|---|---|---|---|:-:|
| **M0** | *(pas une migration)* Entités et dépôts Java pour `analyse_ia` / `execution_agent` | **G11b** | — | **nul** |
| **M1** | Colonnes d'exécution : 4 sur `analyse_ia`, 7 sur `execution_agent` | G9, G11 | — | **nul** — tables vides |
| **M2** | `evaluation` : `confiance_risque`, `justification_couverture` (+ renseigner `version_referentiel`) | G8, G14 | — | **faible** — colonnes nullables |
| **M3** | `evaluation_document_analyse` : `document_id`, `piece_reference`, `confiance_lecture` | G6 | — | **faible** — nullables pour l'existant |
| **M4** | Table du détail par preuve attendue (+ constats documentaires) | **G2, G3** | M3 | moyen |
| **M5** | Table des rattachements (signaux Risk + éléments manquants) | Risk détaillé | M4 (mutualisation ?) | moyen |
| **M6** | `axe_amelioration` | **G1** | M4 | moyen |
| **M7** | `plan_action` + `action_axe` | G4 | M6 | moyen |
| **M8** | Unicité sur `non_conforme` + reprise des doublons | G5 | arbitrage §17 | **élevé** — touche des données existantes |

### Pourquoi cet ordre

**M1 en premier** : les deux tables sont vides, la migration ne peut rien
casser, et elle rend immédiatement exploitable la trace produite en phase
5.6. C'est le meilleur rapport valeur/risque du lot.

**M4 avant M6** : un axe d'amélioration rattaché à une preuve attendue
suppose que le détail par preuve existe.

**M8 en dernier, et seul** : c'est la seule migration qui touche des données
métier existantes. Elle exige une décision sur le sort des 11 groupes de
doublons — fusion, conservation, purge — qui n'est pas une décision
technique.

> **M2 mérite une précision** : renseigner `version_referentiel` sur les 44
> lignes existantes n'est **pas** une migration de données anodine. La
> version applicable au moment de chaque analyse passée n'est pas
> reconstituable de façon certaine. **Recommandation : ne rien rétro-remplir**
> — une valeur nulle honnête vaut mieux qu'une valeur reconstituée.

---

## 26. Préparation de la bascule V2

### 26.1 Le flux cible

```
POST /analyse
   ↓
Java : ConstructionContexteIa.construire()
   → Contexte(payload, references)          ← references vit en mémoire
   ↓
Java : ouvre analyse_ia (EN_COURS)          ← transaction 1, fermée
   ↓
Python : POST /api/v2/evaluations/critere   ← HORS transaction
   ↓
{ resultat, execution }
   ↓
Java : valide la structure (contrat_version)
   ↓
Java : résout les références → UUID          ← avec `references`
   ↓
Java : transaction 2
   → evaluation · document_analyse · détail par preuve
   → signaux · axes (origine = IA, non validés)
   → execution_agent × n · clôture analyse_ia
   ↓
réponse API
```

### 26.2 Les cinq points durs

| # | Point | Nature |
|---|---|---|
| **1** | `references` doit survivre jusqu'à la résolution (§5.4) | **Contrainte d'architecture** |
| **2** | Deux transactions distinctes, jamais une ouverte pendant l'appel | Contrainte, phase 5.5 |
| **3** | Une référence non résolvable ne doit pas faire échouer toute la passe | Décision — l'existant écarte déjà l'invalide côté Python |
| **4** | Le statut de l'évaluation : `VALIDEE` ou `EN_REVUE` (§15.5) | **Arbitrage métier** |
| **5** | La clé de non-conformité (§17.3) | **Arbitrage métier** |

### 26.3 Ce qui est prêt

- Le contrat V2 est figé, éprouvé contre le vrai Gemini (phase 4).
- Les références locales sont déterministes et résolvables (§5.2).
- La trace d'exécution est produite et assainie (phase 5.6).
- Le mécanisme d'exclusion du score par `EN_REVUE` existe (§19.3).
- Le motif de validation humaine existe et est éprouvé (`exigence`, §12.2).

### 26.4 Ce qui bloque

**Deux décisions métier**, avant toute écriture de migration :

1. **Une analyse IA V2 produit-elle une évaluation définitive ?** Le code
   actuel dit oui (RG16). Le contrat V2, avec sa notion de
   `NON_VERIFIABLE` et de confiance, suggère que non.
2. **Une non-conformité est-elle liée à un écart ou à une analyse ?** La
   réponse détermine la clé, donc le sort des 39 lignes existantes.

**Aucune migration ne devrait être écrite avant que ces deux points soient
tranchés** : ils déterminent la forme des tables, pas seulement leur contenu.

---

## Clôture

**PHASE 5.7-A — VALIDÉE**

**Fichiers créés :**

```
docs/PHASE5_7A_CARTOGRAPHIE_PERSISTANCE_V2.md
```

**Fichiers modifiés :** AUCUN

| | |
|---|---|
| Migrations | **AUCUNE** — V58 reste la dernière |
| Base | **NON MODIFIÉE** |
| Données | **AUCUNE MODIFICATION** — étude en lecture seule |
| Tables créées | **AUCUNE** |
| Colonnes créées ou supprimées | **AUCUNE** |
| Agents | **NON MODIFIÉS** |
| V2 branché en production | **NON** |
| Routes métier | **NON MODIFIÉES** |
| Tests | **NON EXÉCUTÉS** — aucun code modifié ; dernier état connu : 258 hors Gemini, 61 réels, 344 Java |
| Commit | **AUCUN** |

**Gaps recensés :** 3 CRITIQUES · 10 MAJEURS · 6 MINEURS — **tous démontrés
par le code ou le schéma.**

**Deux décisions métier conditionnent la suite** (§26.4) : le statut d'une
évaluation issue du pipeline V2, et la clé logique d'une non-conformité.
Elles déterminent la **forme** des tables, pas seulement leur contenu — aucune
migration ne devrait être écrite avant qu'elles soient tranchées.

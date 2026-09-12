# PHASE 5.8.2 — Cartographie des risques

## SMARTEX SUSTWAY — Étape 1

> **Cartographie et contrat uniquement.** Aucune API, aucun frontend,
> aucune migration, aucun fichier Python, aucun schéma n'a été modifié.
>
> Chaque affirmation est vérifiée dans le code ou mesurée en base. Ce qui
> n'est pas établi porte la mention **À CONFIRMER**.
>
> Aucun commit.

---

## Résumé

Deux notions de risque coexistent, et elles ne se ressemblent en rien.

```
RG26         (1 − probabilité) × poids de criticité      arithmétique, reproductible
Risk Agent   jugement d'un modèle de langage             non reproductible
```

**Le constat principal, vérifié dans le code** : `ScoringEngine.risqueAttendu`
n'a **qu'un seul appelant en production**, `NonConformiteService:81`, et
deux sorties anticipées le précèdent. Le risque déterministe n'est donc
calculé que pour un critère qui porte un écart — jamais pour un critère
conforme.

**Nuance mesurée, et elle change la priorité** : aucun critère n'a
aujourd'hui une dernière évaluation conforme. Le trou est **structurel,
sans occurrence actuelle**.

---

## 1. RG26 — le risque déterministe

### 1.1 La formule

`ScoringEngine.java:99` :

```java
return BigDecimal.ONE.subtract(probabiliteConformite)
        .multiply(poidsCriticite)
        .setScale(4, RoundingMode.HALF_UP);
```

Soit **`risque_attendu = (1 − probabilité de conformité) × poids de
criticité`**.

Le commentaire de la méthode est explicite : *« Ne participe jamais au score
(RG33) : sert uniquement à prioriser les non-conformités. »*

### 1.2 Les poids, mesurés

```
 FAIBLE   | 1.00
 MOYENNE  | 2.00
 ELEVEE   | 3.00
 CRITIQUE | 4.00
```

Le risque attendu vit donc dans `[0 ; 4]`.

### 1.3 La dérivation du niveau

`ScoringEngine.java:117` :

```
 ≥ 3.0  → CRITIQUE
 ≥ 2.0  → MAJEURE
 ≥ 1.0  → MODEREE
 sinon  → MINEURE
```

> **Le code signale lui-même une limite** : *« ATTENTION : seuils
> provisoires. Le CDC (§13) indique explicitement que ce calibrage doit se
> faire de façon itérative avec les experts métier. »*
>
> Une conséquence arithmétique mérite d'être vue : avec un poids `FAIBLE`
> (1,00), le risque attendu ne peut pas dépasser 1,00 — un critère de
> criticité faible **ne peut donc jamais être MAJEURE ni CRITIQUE**, même à
> probabilité de conformité nulle. C'est cohérent, mais cela signifie que
> trois des quatre niveaux sont inatteignables pour un quart des critères.
> **À CONFIRMER** avec le métier ; hors périmètre de cette phase.

### 1.4 Les réponses aux huit questions

| Question | Réponse |
|---|---|
| **Que calcule RG26 ?** | Le risque attendu d'un critère, et le niveau de priorité qui s'en déduit |
| **À partir de quelles données ?** | `evaluation.probabilite_conforme` et `criticite.poids` via `audit_critere.criticite_id` |
| **À quel moment ?** | À la génération d'une non-conformité — c'est-à-dire, en V2, **à la validation humaine** |
| **Pour quel objet ?** | Une `Evaluation`, mais le résultat est écrit sur la `NonConforme` |
| **Où est-il persisté ?** | `non_conforme.risque_attendu` et `non_conforme.niveau` — **nulle part ailleurs** |
| **Pour quel statut d'évaluation ?** | Indirectement `VALIDEE` : la NC naît à la validation |
| **Si le critère est conforme (note 5) ?** | **RG26 n'est pas calculé.** Sortie anticipée, ligne 63 |
| **Si le critère est non conforme ?** | Calculé, puis persisté sur la NC |

### 1.5 Le chemin réel, ligne par ligne

```java
if (evaluation.getNote() >= NIVEAU_ENGAGEMENT_MAXIMAL) {   // ← sortie 1
    courante.ifPresent(nc -> nc.setStatut(CLOTUREE));
    return Optional.empty();                                //   RG26 jamais calculé
}
Criticite criticite = auditCritere.getCriticite();
if (criticite == null) {                                    // ← sortie 2
    return Optional.empty();                                //   RG26 jamais calculé
}
BigDecimal risqueAttendu = ScoringEngine.risqueAttendu(…);   // ← seul appel
```

**Un seul appelant en production**, vérifié par recherche exhaustive sur
`src/main`.

---

## 2. Le risque d'un critère conforme

### 2.1 Le fait, vérifié

| Question | Réponse |
|---|---|
| Le risque RG26 existe-t-il conceptuellement ? | **Oui** — la formule s'applique : `(1 − 1,00) × poids = 0,00` |
| Est-il calculé ? | **Non** — sortie anticipée avant l'appel |
| Est-il persisté ? | **Non** |
| Est-il récupérable ? | **Oui, par recalcul** — les deux entrées sont persistées |
| Peut-il être affiché ? | **Oui, sans rien ajouter en base** |

L'affirmation de la cartographie 5.8 est donc **confirmée par le code**.

### 2.2 La portée réelle, mesurée

```
 evaluations note=5 (conformes)                       | 5
 evaluations note<5                                   | 41
 audit_critere SANS criticite                         | 0
 criteres dont la derniere eval est conforme (note=5) | 0
 criteres derniere eval non conforme                  | 22
 dont NC courante                                     | 22
 criteres evalues SANS risque RG26 recuperable        | 0
```

Et les cinq évaluations conformes :

```
 note | source | statut  | est_la_derniere
------+--------+---------+-----------------
    5 | EXPERT | VALIDEE | f      (×5)
```

**Trois faits qui nuancent le gap** :

1. **Aucun critère n'a aujourd'hui une dernière évaluation conforme.** Le
   trou est structurel, pas observable.
2. **Les cinq évaluations conformes sont toutes de source `EXPERT`** et
   toutes supplantées. Aucune analyse IA n'a jamais rendu note 5 sur ces
   données.
3. **La seconde sortie anticipée ne se déclenche jamais** : les 552
   `audit_critere` portent tous une criticité.

> Le gap est **réel et à corriger**, mais sa priorité est celle d'une
> anticipation, pas d'un incident. Le présenter comme un défaut visible
> aujourd'hui serait inexact.

### 2.3 Ce qu'un critère conforme devrait montrer

`(1 − 1,00) × poids = 0,00` → niveau `MINEURE`.

Un risque nul est une information : il dit que le critère ne pèse plus sur
le profil de risque de la mission. L'absence de valeur, elle, ne dit rien —
et se lit comme « non calculé » aussi bien que « pas de risque ».

---

## 3. Le Risk Agent V2

### 3.1 Ce que le contrat produit

`app/models/contrat_v2.py` — `ResultatRisqueV2` :

| Champ | Type |
|---|---|
| `signal_risque` | `bool` |
| `categorie` | `str \| None` |
| `justification` | `str` |
| `confiance` | `float [0,1]`, défaut 0,5 |
| `signaux` | `list[SignalRisque]` |

`SignalRisque` : `categorie`, `rattachement` (niveau + référence),
`pieces_concernees`, `justification`.

### 3.2 Ce qu'il reçoit

`RiskAgentRequestV2` : `critere`, `situation`, `organisation`,
`catalogue` (**amputé de ses exigences**), `declaration`,
`resultat_evidence`.

> Le catalogue transmis au Risk Agent est volontairement réduit :
> `CatalogueRisque` **n'a structurellement pas de champ `exigences`**. Le
> Risk Agent n'a pas à connaître le détail des exigences pour signaler une
> anomalie, et ne pas les lui transmettre est le geste le plus simple pour
> qu'il ne puisse pas s'en servir.

### 3.3 Le chemin Python → Java → base

```
risk_agent_v2.evaluer()
    ↓  ResultatRisqueV2
orchestration_v2 → EnveloppeV2.resultat.risque
    ↓  HTTP
EnveloppeV2Dto.RisqueDto
    ↓  PersistanceResultatV2Service
evaluation.signal_risque / categorie_risque / justification_risque / confiance_risque
evaluation_constat (nature = SIGNAL_RISQUE)
```

`PersistanceResultatV2Service:148-151` écrit les quatre scalaires ;
`persisterSignauxDeRisque` écrit les signaux détaillés, **avec leur
rattachement résolu en UUID**.

### 3.4 Persisté / non persisté

| Champ | Persisté | Où |
|---|:-:|---|
| `signal_risque` | ✅ | `evaluation.signal_risque` |
| `categorie` | ✅ | `evaluation.categorie_risque` |
| `justification` | ✅ | `evaluation.justification_risque` |
| `confiance` | ✅ | `evaluation.confiance_risque` — **V2 seulement** |
| `signaux[].categorie` | ✅ | `evaluation_constat.categorie` |
| `signaux[].rattachement` | ✅ | `evaluation_constat` + FK résolue |
| `signaux[].pieces_concernees` | ✅ | `evaluation_constat.pieces_concernees` (JSONB) |
| `signaux[].justification` | ✅ | `evaluation_constat.justification` |
| **Signal sans rattachement** | ❌ | Écarté à la persistance — voir ci-dessous |

> **Un signal sans rattachement est perdu.** `persisterSignauxDeRisque`
> ignore les signaux dont `rattachement` est nul : *« un signal sans
> rattachement ne désigne rien de précis ; il reste porté par la
> justification globale du risque »*. C'est défendable — la table exige une
> cible — mais c'est une perte d'information à connaître. **À CONFIRMER**
> si le Risk Agent en produit réellement.

### 3.5 L'asymétrie V1 / V2, mesurée

```
 eval avec signal_risque non nul | 23
 dont signal_risque = true       | 16
 eval avec categorie_risque      | 16
 eval avec confiance_risque      |  2     ← V2 uniquement
 constats SIGNAL_RISQUE          |  4
 constats ELEMENT_MANQUANT       |  6
```

`AnalyseCritereService` (V1) écrit trois champs sur quatre : **il n'écrit
jamais `confiance_risque`**, ce champ n'existant pas dans le contrat V1.
Une restitution qui afficherait la confiance devra donc gérer son absence
sur 21 évaluations sur 23.

---

## 4. `analyse_ia`

| Colonne | Contenu |
|---|---|
| `audit_id`, `audit_critere_id` | Rattachement — le second nullable |
| `statut` | `EN_ATTENTE \| EN_COURS \| TERMINE \| ERREUR` |
| `formule` | `STANDARD \| AVANCEES` |
| `date_debut`, `date_fin` | — |
| `erreur`, `erreur_type` | Texte **assaini** |
| `declenche_par`, `requested_model` | — |
| `contrat_version`, `contrat_execution_version` | — |

**Relation avec `evaluation`** : `evaluation.analyse_ia_id`, nullable,
`ON DELETE SET NULL` — la trace est purgeable, le résultat métier lui
survit.

**Aucune colonne de résultat.** `analyse_ia` ne porte ni payload, ni
résultat, ni rien du Risk Agent : elle décrit **l'exécution**, pas ce qui en
est sorti.

`execution_agent` porte un appel par agent, dont `RISK` — avec son modèle
servi, sa durée, ses jetons. Utile à l'observabilité, **sans valeur pour la
restitution métier du risque**.

> **Réponse à §4** : les informations du Risk Agent **ne sont pas
> restituables depuis `analyse_ia`**. Elles vivent sur `evaluation` et
> `evaluation_constat`, exposées depuis la 5.8.1 pour la seconde.

---

## 5. `risque_evaluation` — dormante depuis l'origine

| Colonne | Type |
|---|---|
| `id` | `uuid` PK |
| `evaluation_id` | `uuid` **UNIQUE**, FK → `evaluation`, `ON DELETE CASCADE` |
| `probabilite` | `numeric` NOT NULL |
| `criticite_poids` | `numeric` NOT NULL |
| `risque_attendu` | `numeric` NOT NULL |
| `niveau_priorite` | `niveau_non_conformite`, nullable |
| `date_calcul` | `timestamptz` NOT NULL |

| Vérification | Résultat |
|---|---|
| Migration d'origine | **`V1__init_schema.sql`** — présente depuis le tout premier jour |
| Contraintes | PK, `UNIQUE (evaluation_id)`, FK CASCADE |
| Index | Les deux dérivés des contraintes |
| Entité JPA | **AUCUNE** |
| Écriture | **AUCUNE** |
| Endpoint | **AUCUN** |
| Lignes | **0** |

La seule mention du nom dans `src/main/java` est un **commentaire** dans
`EvaluationConstat.java`.

### Ce que sa structure dit

Ses colonnes sont la formule RG26 décomposée : les deux entrées, le
résultat, le niveau dérivé, et la date. **C'est exactement la table conçue
pour ce que cette phase veut restituer**, et elle dort depuis V1.

> **Elle n'est pas nécessaire à la restitution.** Les deux entrées étant
> persistées, le risque est recalculable à la lecture. Sa valeur serait
> ailleurs : figer le risque tel qu'il a été calculé, y compris si les
> seuils ou les poids changeaient. Voir §14.

---

## 6. `NonConforme`

| Champ | Correspond à RG26 ? |
|---|---|
| `risque_attendu` | ✅ **le résultat de RG26** |
| `niveau` | ✅ **la priorité dérivée** |
| `evaluation_id` | ➖ l'évaluation qui a produit l'état courant |
| `audit_critere_id` | ➖ l'identité logique de l'écart |
| `statut` | ❌ métier — `OUVERTE \| EN_TRAITEMENT \| CLOTUREE` |
| `titre`, `description` | ❌ texte |
| `courante` | ❌ drapeau d'état |
| `created_at`, `updated_at` | ❌ |

**Absents** : probabilité, impact, preuve. Le champ `probabilite` n'existe
pas sur `non_conforme` — il reste sur l'évaluation. « Impact » n'existe
sous aucun nom : le **poids de criticité** en tient lieu, et il n'est pas
recopié.

### Distribution mesurée des niveaux (NC courantes)

```
 MODEREE | 10
 MINEURE |  7
 MAJEURE |  5
```

Aucune `CRITIQUE` — cohérent avec le seuil de 3,0 et les poids observés.

### La confusion à ne jamais commettre

| | `non_conforme.risque_attendu` | `evaluation.signal_risque` |
|---|---|---|
| Origine | Arithmétique | Modèle de langage |
| Reproductible | ✅ | ❌ |
| Entre dans une priorité | ✅ | **jamais** |
| Opposable | ✅ | ❌ |

Le commentaire de l'entité `Evaluation` le dit déjà : le signal *« ne
participe à aucun calcul de score ni de priorité, il sert uniquement de
signal informatif »*.

---

## 7. Matrice de vérité

| Information | Source | Déterministe / IA | Persistée ? | Critère conforme ? | Exposable ? |
|---|---|---|:-:|---|:-:|
| **Probabilité de conformité** | `evaluation.probabilite_conforme` | **Ni l'un ni l'autre** — produite par l'IA, puis traitée comme une donnée | ✅ | ✅ oui | ✅ déjà exposée |
| **Poids de criticité** (tient lieu d'impact) | `criticite.poids` via `audit_critere` | Déterministe | ✅ | ✅ oui | ❌ **jamais exposé** |
| **Risque attendu** | `ScoringEngine` | **Déterministe** | ⚠️ `non_conforme` seulement | ❌ **non calculé** | ⚠️ via la NC |
| **Niveau de risque** (priorité) | `ScoringEngine` | **Déterministe** | ⚠️ `non_conforme.niveau` | ❌ non calculé | ⚠️ via la NC |
| **Sévérité de la NC** | `non_conforme.niveau` | Déterministe | ✅ | ❌ pas de NC | ✅ exposée |
| **`signalRisque`** | Risk Agent | **IA** | ✅ 23 lignes | ✅ oui | ✅ exposée |
| **Catégorie IA** | Risk Agent | **IA** | ✅ 16 lignes | ✅ oui | ✅ exposée |
| **Justification IA** | Risk Agent | **IA** | ✅ | ✅ oui | ✅ exposée |
| **Confiance IA** | Risk Agent | **IA** | ⚠️ **V2 seulement** — 2 lignes | ✅ oui | ✅ depuis 5.8.1, **non affichée** |
| **Signaux détaillés** | Risk Agent | **IA** | ✅ 4 lignes | ✅ oui | ✅ depuis 5.8.1 |
| **Statut NC** | `non_conforme.statut` | Métier humain | ✅ | ❌ pas de NC | ✅ exposée |

### Les trous, lus dans la matrice

| # | Trou | Nature |
|---|---|---|
| **T1** | Risque attendu et niveau **non calculés pour un critère conforme** | Code — sortie anticipée |
| **T2** | Poids de criticité **jamais exposé**, alors qu'il tient lieu d'impact | API |
| **T3** | Risque attendu accessible **uniquement par la non-conformité** | Architecture |
| **T4** | Confiance IA persistée depuis 5.7-C, exposée depuis 5.8.1, **jamais affichée** | Frontend |
| **T5** | Aucun champ nommé « impact » | Modèle — le poids en tient lieu |

**Aucun de ces trous n'exige d'ajouter une donnée en base.** T1 est un
recalcul, T2 et T3 une exposition, T4 un affichage.

---

## 8. Données disponibles

Tout ce qu'il faut pour restituer les deux risques est persisté :

| Pour le risque déterministe | Où |
|---|---|
| Probabilité | `evaluation.probabilite_conforme` |
| Poids de criticité | `criticite.poids` via `audit_critere.criticite_id` |
| Risque attendu | **recalculable** — `ScoringEngine.risqueAttendu` est une fonction pure |
| Niveau | **recalculable** — `prioriteNonConformite` |
| Valeur figée à la création de la NC | `non_conforme.risque_attendu` |

| Pour le signal IA | Où |
|---|---|
| Signal, catégorie, justification | `evaluation` |
| Confiance | `evaluation.confiance_risque` — V2 seulement |
| Signaux rattachés | `evaluation_constat`, exposés depuis 5.8.1 |

---

## 9. Données manquantes

**Aucune, au sens strict.** Il n'existe pas d'information de risque
produite et non persistée.

Ce qui manque est de la **restitution**, pas de la donnée :

| # | Manque | Remède |
|---|---|---|
| M1 | Le risque déterministe d'un critère conforme | Recalcul à la lecture, ou levée de la sortie anticipée |
| M2 | Le poids de criticité dans l'API | Un champ dans un DTO |
| M3 | Le risque déterministe sans passer par la NC | Un DTO de risque |
| M4 | L'affichage de la confiance IA | Frontend |
| M5 | La séparation visuelle des deux risques | Frontend |

---

## 10. Contrat de restitution proposé

Deux blocs, **jamais fondus dans le même champ**.

### Bloc A — Risque déterministe

```
risqueDeterministe : {
  probabiliteConformite : 0.5000        evaluation
  poidsCriticite        : 3.00          criticite.poids
  criticiteCode         : "ELEVEE"
  risqueAttendu         : 1.5000        (1 − p) × poids
  niveau                : "MODEREE"     seuils ScoringEngine
  source                : "RG26"
  explication           : "(1 − 0,50) × 3,00 = 1,50"
  fige                  : true|false    figé sur la NC, ou recalculé
}
```

**`explication` est le champ qui porte le sens** : un risque déterministe
qui ne montre pas son calcul se lit comme un avis. Le montrer est ce qui
le distingue du signal IA.

**`fige`** dit si la valeur vient de `non_conforme.risque_attendu` — donc
telle qu'elle a été calculée à la validation — ou d'un recalcul à la
lecture. La distinction compte si les seuils évoluent.

### Bloc B — Signal IA

```
signalIa : {
  present      : true
  categorie    : "INFORMATION_MANQUANTE"
  justification: "…"
  confiance    : 0.6000 | null          null sur les évaluations V1
  signaux      : [...]                  déjà exposés en 5.8.1
  source       : "RISK_AGENT_V2"
  avertissement: "Signal généré par l'IA — aide à l'analyse,
                  sans valeur réglementaire"
}
```

**L'avertissement est porté par l'API, pas seulement par l'écran.** Un
champ de données qui voyage sans son avertissement finit recopié dans un
rapport où il passe pour un constat.

### Ce que le contrat interdit

- Aucun champ commun aux deux blocs.
- Aucun agrégat « niveau de risque global » mêlant les deux.
- Aucun tri, filtre ou priorité fondé sur le signal IA.

---

## 11. `EN_REVUE` — ce qui s'affiche, et quand

Le cycle n'est pas modifié.

| Donnée | Pendant `EN_REVUE` | Après `VALIDEE` |
|---|---|---|
| Signal IA | **Affichable** — il est persisté dès l'analyse | Identique |
| Probabilité, poids | **Affichables** | Identiques |
| Risque déterministe **recalculé** | **Affichable** | Identique |
| Risque déterministe **figé** (`non_conforme.risque_attendu`) | **N'existe pas encore** | Existe |
| Niveau de la NC | **N'existe pas encore** | Existe |

**Ce qui change à la validation** : la non-conformité naît, et avec elle la
valeur figée du risque. Avant, tout est recalculable ; après, une valeur
fait foi.

> **Conséquence de conception** : si la restitution montre un risque
> déterministe pendant `EN_REVUE`, elle doit dire qu'il est **provisoire** —
> sans quoi un écart entre l'affichage d'avant et d'après la validation
> passerait pour une incohérence. C'est le rôle du champ `fige`.

---

## 12. Permissions

### 12.1 Existant, mesuré

| | SUPER_ADMIN | RESPONSABLE | COLLABORATEUR |
|---|:-:|:-:|:-:|
| Résultat d'évaluation (dont signal IA, catégorie, justification) | ✅ | ✅ | ✅ |
| Détail V2 — raisonnement, signaux rattachés | ✅ | ✅ | **❌ (5.8.1)** |
| Non-conformités — dont `risque_attendu` et `niveau` | ✅ | ✅ | ✅ |

**Le collaborateur voit donc déjà** : le signal IA, sa catégorie, sa
justification, et le risque attendu d'une non-conformité. Ce n'est pas une
hypothèse : ces champs sont dans `EvaluationDto` et `NonConformeDto`, tous
deux ouverts à l'accès entreprise.

### 12.2 Ce dont chaque rôle a besoin

**RESPONSABLE_ENTREPRISE** — comprendre son score, ses priorités, préparer
ses actions :

| Besoin | Donnée |
|---|---|
| Comprendre le score | Probabilité et coefficient par critère |
| Identifier les priorités | Risque attendu et niveau, **tous critères** |
| Repérer les critères à risque | Le classement par risque attendu |
| Préparer les actions | Justification, éléments manquants |
| Situer le signal IA | Signal + catégorie + **avertissement** |

Ce dont il n'a **pas** besoin : modèle servi, `response_id`, jetons, durée —
données d'observabilité, sans usage métier.

**SUPER_ADMIN** — administrer et valider : tout ce qui précède, plus le
détail du raisonnement (déjà ouvert en 5.8.1).

> **Il valide, il n'édite pas.** Vérifié : aucun `@PUT` ni `@PATCH` sur
> `EvaluationResource`, et `setSignalRisque` / `setCategorieRisque` /
> `setJustificationRisque` / `setConfianceRisque` ne sont appelés que par
> `AnalyseCritereService` et `PersistanceResultatV2Service`. **Aucun chemin
> d'API ne permet de modifier un résultat produit par Gemini.** Cette
> propriété doit être préservée.

---

## 13. D1 — le collaborateur

### Le point de départ, factuel

Le collaborateur **voit déjà** le signal IA, sa catégorie et sa
justification, par `EvaluationDto`. Ce qui lui est fermé depuis la 5.8.1,
c'est le **détail** : signaux rattachés, éléments manquants par attente.

### Les deux options

**OPTION A — risque déterministe complet + résultat IA synthétique**

| Visible | Fermé |
|---|---|
| Probabilité, poids, risque attendu, niveau, explication | Signaux rattachés détaillés |
| Signal IA : présent/absent, catégorie, avertissement | Justification longue du Risk Agent |

*Pour* : le collaborateur dépose les preuves ; savoir qu'un critère est à
risque élevé l'aide à prioriser ce qu'il collecte. Le risque déterministe
est une arithmétique publique, pas une opinion.

*Contre* : la catégorie IA (`INFORMATION_MANQUANTE`) peut se lire comme un
jugement.

**OPTION B — risque déterministe seul**

| Visible | Fermé |
|---|---|
| Probabilité, poids, risque attendu, niveau, explication | Tout le bloc IA |

*Pour* : sépare nettement l'arithmétique de l'opinion ; cohérent avec la
restriction posée en 5.8.1.

*Contre* : **régression par rapport à l'existant.** Le collaborateur voit
aujourd'hui le signal IA dans `EvaluationDto` ; le lui retirer serait un
retrait d'accès, pas une non-ouverture.

### Ce qui doit être arbitré

**La question n'est pas seulement « ouvrir ou non », mais aussi « faut-il
retirer ce qui est déjà ouvert ».** L'option B implique un retrait, qui est
un acte différent — et qui casserait l'affichage actuel de
`ResultatEvaluation` pour ce rôle.

| Recommandation | **Option A**, sans retrait de l'existant |
|---|---|
| Motif | Elle n'enlève rien, ajoute le risque déterministe — arithmétique et explicable — et maintient le détail fermé comme en 5.8.1 |

**Décision à prendre par le propriétaire métier. Non tranchée ici.**

---

## 14. Options de persistance

Le risque déterministe est-il à persister, ou à recalculer ?

### A — Réutiliser l'existant, recalculer à la lecture

| | |
|---|---|
| Coût | Nul — aucune migration, aucune écriture |
| Cohérence | **Toujours à jour** : reflète la probabilité courante |
| Faiblesse | Un changement de seuils ou de poids **réécrit le passé** |
| Charge | Deux multiplications par critère, en mémoire |

### B — Ajouter des colonnes à `evaluation`

| | |
|---|---|
| Coût | Migration, 2 à 4 colonnes |
| Cohérence | Figée à l'analyse |
| Faiblesse | **Duplique `non_conforme.risque_attendu`** — deux sources pour une valeur |
| Verdict | ❌ Contredit le principe « ne rien ajouter qui existe déjà » |

### C — Activer `risque_evaluation`

| | |
|---|---|
| Coût | Entité, dépôt, écriture, éventuellement rien en migration — **la table existe depuis V1** |
| Cohérence | Figée, avec ses deux entrées et sa date : **auditable** |
| Force | `UNIQUE (evaluation_id)` — un calcul par évaluation ; couvre **aussi les critères conformes** |
| Faiblesse | Une table de plus à alimenter et à tenir ; redondance partielle avec la NC |

### D — Recalcul à la lecture **et** figeage à la validation

| | |
|---|---|
| Pendant `EN_REVUE` | Recalculé, marqué provisoire |
| À la validation | Figé — dans `non_conforme` (existant) ou `risque_evaluation` |
| Force | Décrit exactement ce que le métier vit : provisoire tant que non validé, opposable ensuite |

### Recommandation

**Option A pour la 5.8.2**, et **C à considérer séparément**.

Motifs :

1. **A ne coûte rien et débloque tout.** Les deux entrées sont persistées ;
   `ScoringEngine.risqueAttendu` est une fonction pure, déjà testée (27
   tests sur `ScoringEngineTest`).
2. **Elle couvre le trou T1 sans toucher au code métier.** Un critère
   conforme rend `0,00 / MINEURE` par recalcul, sans lever la sortie
   anticipée de `NonConformiteService` — donc sans risquer de créer des
   non-conformités là où il n'y en avait pas.
3. **C répond à une autre question** : l'auditabilité du risque dans le
   temps. C'est une décision métier (D6), pas un préalable à la
   restitution.

> **Aucune migration n'est nécessaire pour la 5.8.2.** C'est la conclusion
> de cette comparaison, pas son point de départ.

---

## 15. Frontend cible

### Où le risque doit apparaître

`CritereEvaluation.jsx` → `ResultatEvaluation`, qui affiche déjà un bloc de
risque unique mêlant les deux natures :

```jsx
{evaluation.signalRisque != null ? (
  <div className={evaluation.signalRisque ? 'bg-rose-50 …' : 'bg-emerald-50 …'}>
    <ShieldAlert … />
    <p>{signalRisque ? 'Signal de risque détecté — CATEGORIE' : 'Aucun signal de risque'}</p>
```

**Un rouge vif pour un signal d'IA.** Rien ne dit au lecteur que ce bloc
n'est pas un constat réglementaire — c'est précisément la confusion que
cette phase doit lever.

### Architecture visuelle proposée

Deux blocs distincts, **dans cet ordre** : le déterministe d'abord, parce
qu'il fait autorité.

```
┌─────────────────────────────────────────────┐
│ RISQUE MÉTIER — RG26                        │
│ Niveau : MODÉRÉ          [badge coloré]     │
│ Probabilité de conformité : 50 %            │
│ Criticité du critère : Élevée (3,00)        │
│ Risque attendu : 1,50                       │
│ (1 − 0,50) × 3,00 = 1,50                    │
└─────────────────────────────────────────────┘

┌─────────────────────────────────────────────┐
│ SIGNAL DE RISQUE IA          [ton neutre]   │
│ Signal : détecté                            │
│ Catégorie : INFORMATION_MANQUANTE           │
│ Confiance : 60 %                            │
│ « … »                                       │
│ ─────────────────────────────────────────── │
│ Généré par l'IA — aide à l'analyse, sans    │
│ valeur réglementaire.                       │
└─────────────────────────────────────────────┘
```

### Trois règles visuelles

1. **Le rouge est réservé au risque métier.** Le signal IA garde un ton
   neutre ou ambre : la couleur d'alarme dit « fait établi », et un signal
   n'en est pas un.
2. **Le calcul est montré.** `(1 − 0,50) × 3,00 = 1,50` distingue à lui
   seul l'arithmétique de l'opinion.
3. **L'avertissement est dans le bloc, pas en pied de page.** Un
   avertissement qu'on peut lire sans voir la donnée ne sert à rien.

**Aucune refonte.** Les deux blocs remplacent l'unique bloc existant dans
le même composant. Ni Sidebar, ni Header, ni route.

---

## 16. Sécurité

La chaîne à respecter est celle éprouvée en 5.8.1 :

```
utilisateur → entreprise → audit → audit_critere → evaluation
```

### Analyse conceptuelle de l'IDOR

| Chemin envisageable | Risque | Parade |
|---|---|---|
| Risque dans `EvaluationDto` (enrichi) | **Aucun nouveau** — l'endpoint et son contrôle existent | Rien à faire |
| Endpoint `…/evaluations/{id}/risque` | Même risque qu'en 5.8.1 | `trouverEvaluationDuCritere`, déjà factorisée |
| Endpoint de mission `…/audits/{id}/risques` | **Nouveau** : agrège plusieurs critères | Filtrer sur `audit_id`, jamais sur une liste fournie |

> **Le chemin le moins risqué est celui qui ne crée pas d'endpoint** :
> enrichir `EvaluationDto` réutilise un contrôle d'accès déjà éprouvé par
> les tests existants. Un endpoint d'agrégation par mission mériterait ses
> propres tests IDOR.

Aucune API n'a été créée dans cette étape.

---

## 17. Décisions restantes

| # | Décision | Statut | Bloque |
|---|---|---|---|
| **D1** | **Visibilité du raisonnement IA pour COLLABORATEUR** — et, question nouvelle, faut-il *retirer* le signal IA qu'il voit déjà ? | **Ouverte** | Le périmètre du bloc IA par rôle |
| **D3** | **Afficher le risque RG26 pour un critère conforme ?** Recommandation : oui, `0,00 / MINEURE` — un risque nul est une information, une absence n'en est pas une | **Ouverte** | T1 |
| **D4** | **Afficher le signal IA pendant `EN_REVUE` ?** Il est persisté dès l'analyse. Recommandation : oui, avec mention du caractère non validé | **Ouverte** | §11 |
| **D5** | **Relation risque ↔ NC** : le risque déterministe doit-il rester porté par la non-conformité, ou devenir une donnée du critère ? | **Ouverte** | T3, option C |
| **D6** | **Historique des risques après ré-analyse** : figer chaque calcul (option C) ou ne garder que le courant ? | **Ouverte** | Option C |
| **D7** | **Calibrage des seuils** — le code signale lui-même qu'ils sont provisoires, et un poids FAIBLE plafonne à MODEREE | **Ouverte** | Hors périmètre |

**Aucune de ces décisions n'est tranchée dans le projet.** Aucune n'a été
tranchée ici.

**D3 est la plus simple et la plus utile** : elle ne coûte qu'un recalcul,
et elle ferme le seul trou structurel de cette cartographie.

---

## 18. Ordre d'implémentation proposé

| Étape | Contenu | Dépend de | Coût |
|---|---|---|---|
| **1** | Bloc risque déterministe dans `EvaluationDto` — probabilité, poids, criticité, risque attendu, niveau, explication, `fige` | **D3** | faible, aucune migration |
| **2** | Bloc signal IA structuré, avec son avertissement porté par l'API | **D1** | faible |
| **3** | Séparation visuelle des deux blocs dans `ResultatEvaluation` | 1, 2 | faible |
| **4** | Affichage de la confiance IA (T4) | 2 | très faible |
| **5** | Vue de mission « critères par risque » | 1 | moyen, endpoint + IDOR |
| **6** | Activation de `risque_evaluation` | **D5, D6** | moyen, entité + écriture |

### Pourquoi cet ordre

**Les étapes 1 à 4 ne demandent aucune migration** et réutilisent un
contrôle d'accès éprouvé. Elles ferment T1, T2, T4 et M5.

**L'étape 3 est celle qui corrige le vrai défaut** : aujourd'hui un signal
d'IA s'affiche en rouge vif, sans rien qui dise qu'il n'est pas un constat.
C'est la confusion que toute cette phase existe pour lever.

**L'étape 6 est la seule qui touche à la persistance**, et elle attend deux
décisions. La reporter ne bloque rien : le risque reste recalculable.

---

## 19. Vérifications

### Données historiques — inchangées

```
 evaluations pre-V2 | 44
 SOMME CONTROLE     | df9d6f5d3393f022d721734ec2776989
 NC total           | 39
 NC courantes       | 22
 NC historiques     | 17
 derniere migration | 70
```

### Tests

Aucun code n'a été modifié. Les références restent :

```
Java     : 408
Python   : 283
Frontend : vert
```

Elles n'ont pas été réexécutées : cette étape n'a touché aucun fichier de
code, et les relancer n'aurait rien éprouvé de nouveau.

---

## Critère de fin

| | Critère | État |
|:-:|---|---|
| ✅ | RG26 entièrement compris | Formule, seuils, appelant unique, deux sorties anticipées |
| ✅ | Risk Agent entièrement compris | Contrat, chemin Python → Java → base, asymétrie V1/V2 |
| ✅ | Séparation RG26 / IA démontrée | §6, §7, §10 |
| ✅ | Risque conforme analysé | Vérifié dans le code **et** mesuré : 0 occurrence actuelle |
| ✅ | `risque_evaluation` analysée | Dormante depuis `V1__init_schema.sql` |
| ✅ | `analyse_ia` analysée | Ne porte aucun résultat de risque |
| ✅ | `NonConforme` analysée | 2 champs sur 8 relèvent de RG26 |
| ✅ | Matrice de vérité créée | 11 lignes, 5 trous identifiés |
| ✅ | Contrat de restitution proposé | Deux blocs disjoints |
| ✅ | Sécurité analysée | Conceptuelle, 3 chemins comparés |
| ✅ | D1 explicitement traité | Deux options, recommandation, non tranché |
| ✅ | Options de persistance comparées | A, B, C, D — recommandation A |
| ✅ | Aucune modification métier | — |
| ✅ | Aucune migration | — |
| ✅ | Données historiques intactes | Somme de contrôle identique |
| ✅ | Rapport créé | Ce document |

---

## Clôture

**PHASE 5.8.2 — CARTOGRAPHIE RISQUES**
**STATUS : TERMINÉE**

Seule l'étape de cartographie est terminée. **La 5.8.2 n'est pas
implémentée.**

| | |
|---|---|
| Fichiers créés | `docs/PHASE5_8_2_CARTOGRAPHIE_RISQUES.md` |
| Fichiers modifiés | **AUCUN** |
| API, frontend, Python, schéma, migrations | **NON MODIFIÉS** |
| Trous identifiés | **5** |
| Décisions ouvertes | **6** |
| Migration nécessaire pour la restitution | **AUCUNE** — démontré au §14 |
| Commit | **AUCUN** |

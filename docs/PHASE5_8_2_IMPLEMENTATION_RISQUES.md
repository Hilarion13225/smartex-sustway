# PHASE 5.8.2 — Implémentation de la restitution des risques

## SMARTEX SUSTWAY

> **Aucune migration.** `risque_evaluation` reste dormante. Aucune écriture
> lors d'une lecture. Aucun fichier Python modifié.
>
> Aucun commit.

---

## Résumé

Deux notions de risque coexistaient, et l'interface les confondait : un
signal produit par un modèle de langage s'affichait **en rouge vif**, sans
rien qui le distingue d'un constat réglementaire.

Elles sont désormais séparées, dans la donnée comme à l'écran :

```
RISQUE MÉTIER — RG26     arithmétique, montre son calcul, rouge autorisé
SIGNAL DE RISQUE — IA    ton neutre, source nommée, avertissement porté
```

Le risque déterministe est **calculé à la lecture**, par le moteur
existant, y compris pour un critère conforme — le trou structurel relevé
par la cartographie.

---

## 1. Architecture

```
GET …/evaluations/{id}/detail          endpoint de la 5.8.1, enrichi
        ↓
RestitutionRisqueService.calculer()     lecture seule
        ↓  ScoringEngine.risqueAttendu()
DetailEvaluationV2Dto
        ├── risqueMetier : RisqueMetierDto     source = RG26
        └── signalIa     : SignalIaDto         source = RISK_AGENT
```

**Aucun endpoint nouveau.** Le risque est ajouté à celui de la 5.8.1, dont
le contrôle d'accès est déjà éprouvé par huit scénarios IDOR. La
cartographie l'avait identifié comme le chemin le moins risqué : *« celui
qui ne crée pas d'endpoint »*.

**Deux champs, jamais un.** `risqueMetier` et `signalIa` sont des objets
distincts du même DTO. Aucun champ n'est partagé, aucun agrégat ne les
mêle.

---

## 2. RG26

### Le moteur, et lui seul

```java
BigDecimal risque = ScoringEngine.risqueAttendu(probabilite, poids);
ScoringEngine.NiveauPriorite niveau = ScoringEngine.prioriteNonConformite(risque);
```

**Aucune formule recopiée.** `RestitutionRisqueService` appelle
`ScoringEngine`, seul dépositaire de RG26. Une seconde implémentation, même
identique aujourd'hui, divergerait au premier ajustement des seuils — et
rien ne signalerait laquelle fait foi.

Le moteur n'a pas été modifié : ni la formule, ni les seuils, ni le
comportement de `NonConformiteService`.

### Les tests le vérifient contre le moteur, pas contre des constantes

```java
BigDecimal attendu = ScoringEngine.risqueAttendu(new BigDecimal("0.5000"), poidsDe(critereId));
assertEquals(0, attendu.compareTo(risque.risqueAttendu()));
assertEquals(ScoringEngine.prioriteNonConformite(attendu).name(), risque.niveau());
```

Si les seuils changent un jour, ces tests suivent sans être réécrits. Des
constantes recopiées auraient figé un calibrage que le code lui-même
signale comme provisoire.

---

## 3. Calcul à la lecture

**Aucune persistance nouvelle.** Les deux entrées sont déjà en base :
`evaluation.probabilite_conforme` et `criticite.poids` via
`audit_critere.criticite_id`. `risqueAttendu` étant une fonction pure, le
recalcul rend exactement ce que le moteur aurait rendu à l'écriture.

### Calculé, ou figé — les deux sont rendus

| Champ | Sens |
|---|---|
| `risqueAttendu`, `niveau` | Recalculés depuis **l'évaluation consultée** |
| `fige` | Vrai si une non-conformité courante porte une valeur arrêtée |
| `risqueFigeNonConformite`, `niveauFigeNonConformite` | Cette valeur |

Les deux peuvent différer après une ré-analyse : la valeur figée est celle
qui a servi à prioriser, le recalcul reflète la probabilité courante. **Les
confondre ferait passer ce décalage pour une incohérence** ; les rendre
séparément le rend lisible.

Avant validation, `fige` vaut faux : rien n'a encore été arrêté.

---

## 4. Le critère conforme

### Ce que le moteur rend réellement

Vérifié avant d'écrire quoi que ce soit : `note = 5` implique
`probabilité ≥ 0,90` (RG27, `ScoringEngine.niveauEngagement`). Donc :

```
risque = (1 − p) × poids  ≤  0,10 × 4,00  =  0,40
0,40 < 1,0  →  MINEURE
```

**`MINEURE` est le résultat officiel du moteur**, pas un niveau inventé
pour l'occasion. La condition posée par le brief est donc satisfaite : on
restitue ce que le moteur dit.

### Sans créer de non-conformité

`NonConformiteService` sort avant le calcul dès que la note vaut 5. **Ce
comportement n'a pas été touché** : corriger un défaut d'affichage en
changeant une règle métier aurait créé des non-conformités là où il n'y en
avait pas.

Le second chemin, en lecture seule, contourne la sortie anticipée sans la
supprimer. Un test le vérifie explicitement :

```java
calculer(evaluationId);
assertEquals(0, compterNc(critereId), "aucune non-conformité ne doit apparaître");
```

### Le cas sans criticité (RG37)

```java
if (criticite == null) {
    return new RisqueMetier(SOURCE, probabilite, null, null, null, null,
            "Criticité non résolue pour ce critère : le risque attendu n'est pas calculable.", …);
}
```

**Pas de zéro de substitution.** Un zéro se lirait « aucun risque », ce qui
est une autre affirmation que « risque non calculable ». Le motif est dit,
pas seulement l'absence de valeur.

> Cas actuellement théorique : les 552 `audit_critere` portent tous une
> criticité. Le chemin est néanmoins traité et testé.

---

## 5. Signal IA

| Champ | Origine |
|---|---|
| `present` | `evaluation.signal_risque` |
| `categorie` | `evaluation.categorie_risque` |
| `justification` | `evaluation.justification_risque` |
| `confiance` | `evaluation.confiance_risque` — **nullable** |
| `source` | `"RISK_AGENT"` |
| `avertissement` | constante |

### La confiance absente n'est jamais fabriquée

`confiance_risque` n'existe que sur les évaluations V2 — le contrat V1 ne
la produisait pas. Mesuré : **2 évaluations sur 23** la portent.

Le champ reste `null`, et l'écran affiche **« non disponible »**. Jamais
`0`, jamais `0 %`, jamais une valeur par défaut : « inconnue » et « nulle »
sont deux affirmations différentes.

### L'avertissement voyage dans la donnée

```java
static final String AVERTISSEMENT =
        "Signal généré par l'IA — aide à l'analyse, sans valeur réglementaire.";
```

Il est porté par l'API, pas seulement par le composant. Un champ qui
circule sans son avertissement finit recopié dans un rapport où il passe
pour un constat.

### Signal absent ≠ aucun risque

`SignalIaDto.depuis` rend `null` quand `signal_risque` est nul : le Risk
Agent n'a pas tourné. Le bloc n'est alors pas affiché — plutôt que d'écrire
« aucun signal », qui affirmerait une chose qu'on ne sait pas.

---

## 6. Séparation RG26 / IA

| | Risque métier | Signal IA |
|---|---|---|
| Champ DTO | `risqueMetier` | `signalIa` |
| `source` | `"RG26"` | `"RISK_AGENT"` |
| Nature | Multiplication | Jugement d'un modèle |
| Reproductible | ✅ | ❌ |
| Montre son calcul | ✅ `explication` | — |
| Entre dans une priorité | ✅ | **jamais** |
| Couleur à l'écran | rouge autorisé | **ton neutre** |

### Ce qui est interdit, et vérifié

**La catégorie IA n'est jamais convertie en niveau RG26.** Un test le fige
sur un cas instructif : signal IA très affirmatif (confiance 0,90,
`INFORMATION_MANQUANTE`) sur un critère de criticité `FAIBLE` et de
probabilité 0,10. L'intuition dirait « risque élevé » ; le moteur dit
`MINEURE`, parce qu'un poids de 1,00 plafonne le risque à 1,00 —
strictement sous le seuil `MODEREE`.

```java
assertEquals(0, new BigDecimal("0.9000").compareTo(attendu));
assertEquals("MINEURE", risque.niveau());
```

**C'est le moteur qui tranche, jamais le signal.**

**La justification IA n'est pas recopiée** dans la description d'une
non-conformité par ce chemin : `RestitutionRisqueService` ne fait aucune
écriture.

---

## 7. Permissions

**Exactement les contrôles de la 5.8.1, sans élargissement.**

```java
autorisationService.exigerAccesEntreprise(utilisateurId, entrepriseId);
autorisationService.exigerRoleSurEntreprise(utilisateurId, entrepriseId,
        AutorisationService.ROLES_ADMINISTRATION_ENTREPRISE);
```

Aucune permission nouvelle. Aucun rôle ajouté.

| | Risque métier (détail) | Signal IA synthétique |
|---|:-:|:-:|
| SUPER_ADMIN | ✅ | ✅ |
| RESPONSABLE_ENTREPRISE | ✅ | ✅ |
| **COLLABORATEUR** | ❌ | ✅ *(inchangé)* |

### D1 n'a pas été tranchée, et n'a pas été contournée

Le risque déterministe aurait pu être ajouté à `EvaluationDto`, visible de
tous. L'argument existait : c'est une arithmétique publique, et le
collaborateur voit déjà `risque_attendu` sur les non-conformités.

**Le brief l'interdit explicitement** : *« Si une donnée supplémentaire est
nécessaire et que D1 n'est pas tranchée : ne pas l'exposer au
collaborateur. »* Le bloc a donc été placé dans l'endpoint `/detail`, déjà
fermé au collaborateur depuis la 5.8.1.

**Rien ne lui a été retiré non plus.** Le signal IA qu'il voyait dans
`EvaluationDto` reste visible — il est seulement mieux présenté (§10).

---

## 8. Multi-tenant

Aucun chemin d'accès nouveau : le risque transite par l'endpoint de la
5.8.1, dont la chaîne complète est déjà éprouvée.

```
utilisateur → entreprise → audit → audit_critere → evaluation
     403           404        404         404
```

`trouverEvaluationDuCritere` refuse une évaluation dont le critère ne
correspond pas à celui de l'URL. Les huit scénarios IDOR de
`DetailEvaluationV2Test` couvrent donc aussi le risque, et ils passent
toujours (15/15).

### La bonne évaluation

Le risque est calculé depuis **l'évaluation consultée**, jamais depuis la
dernière du critère. Une ré-analyse produit une autre probabilité, donc un
autre risque ; afficher celui d'une autre évaluation donnerait un chiffre
qui ne correspond à rien de ce qui est à l'écran.

```java
// (1 − 0,20) × 3 = 2,40   ≠   (1 − 0,80) × 3 = 0,60
assertEquals("MAJEURE", risqueAncienne.niveau());
assertEquals("MINEURE", risqueRecente.niveau());
```

---

## 9. Tests

| Suite | Avant | Après | Écart |
|---|---:|---:|---:|
| Java | 408 | **420** | **+12** |
| Python hors Gemini | 283 | **283** | 0 |
| Frontend | vert | **vert** | — |

`RestitutionRisqueTest` — 12 tests, tous vérifiant des **valeurs**, jamais
un simple 200 :

| Test | Vérifie |
|---|---|
| `leRisqueDUnCritereNonConformeEstCeluiDuMoteur` | Égalité avec `ScoringEngine` |
| `laValeurExacteEstRestituee` | `1,5000` / `MODEREE` / poids `3,00` / `ELEVEE` |
| `leCalculEstMontreEnToutesLettres` | `(1 − 0.5) × 3 = 1.5` |
| `laSourceEstIdentifieeCommeRG26` | `source = "RG26"` |
| **`unCritereConformeARisqueCalculeEtNiveauDuMoteur`** | `MINEURE`, comparé au moteur |
| **`unCritereConformeNeCreeAucuneNonConformite`** | 0 NC après calcul |
| `sansCriticiteLeRisqueEstDeclareIndeterminable` | Nuls + motif explicite |
| `laValeurFigeeApparaitUneFoisLaNonConformiteCreee` | `fige` faux puis vrai |
| `leRisqueMetierNeContientAucuneDonneeDeLIa` | Séparation des blocs |
| `leNiveauRG26NeDependQueDuCalculJamaisDeLaCategorieIa` | `MINEURE` malgré un signal fort |
| **`leCalculNecritRien`** | 3 lectures, aucune écriture |
| `leRisqueSuitLEvaluationConsulteeEtNonLaDerniere` | Deux évaluations, deux risques |

### Absence d'écriture, vérifiée

```java
long ncAvant = compterNc(critereId);
String empreinteAvant = empreinteEvaluation(evaluationId);
calculer(evaluationId); calculer(evaluationId); calculer(evaluationId);
assertEquals(ncAvant, compterNc(critereId));
assertEquals(empreinteAvant, empreinteEvaluation(evaluationId));
```

### Deux erreurs trouvées par les tests

**Une assertion fausse, la mienne.** J'avais écrit
`assertEquals("MODEREE", …)` pour `(1 − 0,10) × 1,00 = 0,90`, qui vaut
`MINEURE`. Le test a échoué et m'a corrigé — le cas est devenu le plus
instructif du lot (§6).

**Un type énuméré PostgreSQL.** `criticite.code` est de type
`niveau_criticite`, pas `varchar` : `WHERE code = ?` était refusé par la
base. Corrigé en `code::text = ?`.

---

## 10. Frontend

**Aucune refonte.** Deux modifications dans `CritereEvaluation.jsx`. Ni
Sidebar, ni Header, ni route, ni vitrine.

### Le rouge trompeur, retiré

Avant :

```jsx
className={evaluation.signalRisque ? 'bg-rose-50 text-rose-700' : 'bg-emerald-50 …'}
<p>Signal de risque détecté — INFORMATION_MANQUANTE</p>
```

Un signal d'IA en rouge alarme, sans source ni avertissement. **Le rouge
dit « fait établi » ; un signal n'en est pas un.**

Après : fond neutre, intitulé **« Signal de risque — IA »**, catégorie,
confiance (ou « non disponible »), justification, et l'avertissement en
pied de bloc, séparé par un filet.

**Le bloc s'identifie par son intitulé, sa source et son avertissement —
pas par sa couleur**, conformément au §10 du brief.

### Le bloc RG26

Dans le volet de détail déjà protégé :

```
Risque métier — RG26
[MODEREE]  1.50
Probabilité de conformité  50 %      Criticité  ELEVEE (3.00)
(1 − 0.5) × 3 = 1.5
Calcul provisoire : aucune valeur n'a encore été arrêtée pour ce critère.
```

Trois choix :

1. **Le rouge est réservé à ce bloc** (`MAJEURE`, `CRITIQUE`) : il porte un
   fait établi.
2. **Le calcul est affiché**, en police à chasse fixe. C'est ce qui
   distingue l'arithmétique de l'avis.
3. **Le caractère provisoire est dit** tant que rien n'est figé, pour qu'un
   écart avant/après validation ne passe pas pour une incohérence.

### `EN_REVUE`

Le badge de statut est inchangé. Le risque s'affiche dans les deux états.
**Aucune action de validation n'a été ajoutée** — elle relève de la 5.8.3.

### Vérification

`npm run build` — vert. **Aucune infrastructure de test frontend n'existe**
dans ce dépôt (ni Vitest, ni Jest, ni Testing Library) et aucune n'a été
installée, conformément au §19.

> **Vérification navigateur : non effectuée.** L'environnement n'a pas été
> exercé manuellement pour cette étape. Le rendu est donc **vérifié par la
> construction, pas par l'œil** — les props des composants `ui.jsx` ont été
> relues une à une, mais le rendu visuel reste à confirmer.

---

## 11. Absence de migration

**Aucune.** Le schéma V70 reste la base courante.

`risque_evaluation` **reste dormante** : aucune entité JPA, aucun dépôt,
aucune écriture, aucun endpoint. Vérifié après exécution :

```
 risque_evaluation (doit rester 0) | 0
 derniere migration                | 70
```

La cartographie avait comparé quatre options (A : recalcul, B : colonnes
sur `evaluation`, C : activer `risque_evaluation`, D : hybride) et
recommandé **A**. C'est ce qui a été fait. Les deux entrées étant
persistées et le moteur étant une fonction pure, rien n'a manqué.

---

## 12. Historique

```
 evaluations pre-V2 | 44
 SOMME CONTROLE     | df9d6f5d3393f022d721734ec2776989   ← identique
 NC total           | 39
 NC courantes       | 22
 NC historiques     | 17
```

Somme de contrôle inchangée depuis la phase 5.7-C.

**Le chemin V1 n'a pas été touché** : `AnalyseCritereService` écrit
toujours `VALIDEE`, et ses trois champs de risque sur quatre. La différence
avec V2 est conservée et documentée — `confiance_risque` reste nulle sur
les évaluations V1, et l'écran affiche « non disponible ».

---

## 13. Limites

| # | Limite | Portée |
|---|---|---|
| **L1** | **Le risque métier n'est visible que dans le volet de détail**, donc fermé au collaborateur. Conséquence de D1 non tranchée, pas d'un choix de conception | Moyenne |
| **L2** | **Aucune vue de mission par risque.** Le risque est par critère ; classer les critères d'une mission par risque décroissant demanderait un endpoint d'agrégation | Moyenne |
| **L3** | **Le rendu visuel n'a pas été vérifié en navigateur** (§10) | Faible |
| **L4** | **Les seuils restent ceux du code**, que `ScoringEngine` signale lui-même comme provisoires. Un poids `FAIBLE` plafonne à `MINEURE` | Hors périmètre |
| **L5** | **Un signal IA sans rattachement reste écarté** à la persistance (constaté en 5.8.2 cartographie) — non corrigé ici | Faible |
| **L6** | **`risque_evaluation` toujours dormante** : aucun historique du risque dans le temps | Volontaire, D5/D6 |

---

## 14. D1 — toujours ouverte

> **Un collaborateur peut-il voir le raisonnement de l'IA — et désormais le
> risque déterministe détaillé ?**

Non tranchée. Non contournée.

Ce qu'il voit aujourd'hui, inchangé : le signal IA synthétique
(présence, catégorie, justification, confiance) dans `EvaluationDto`, et le
risque attendu porté par les non-conformités.

Ce qui lui reste fermé : le volet de détail, donc le bloc `risqueMetier`
structuré et le raisonnement attente par attente.

**Une question nouvelle apparaît** : le risque déterministe est une
arithmétique publique, dont le collaborateur voit déjà le résultat sur les
non-conformités. L'ouvrir serait cohérent ; mais cela impliquerait de le
sortir du volet de détail, donc de créer un second chemin d'exposition —
une décision de conception qui dépend elle-même de D1.

---

## 15. Recommandations futures

| # | Recommandation | Dépend de |
|---|---|---|
| **R1** | **Trancher D1.** Elle bloque désormais trois choses : le détail V2, le bloc risque, et le futur affichage des axes | — |
| **R2** | **Vue de mission « critères par risque »** — classer par risque décroissant est la première question d'un responsable qui prépare ses actions | D1, L2 |
| **R3** | **Vérifier le rendu en navigateur**, en particulier le contraste du bloc neutre en thème sombre | — |
| **R4** | **Recalibrer les seuils** avec le métier : un critère de criticité faible ne peut jamais dépasser `MINEURE` | Métier |
| **R5** | **Décider du sort de `risque_evaluation`** : l'activer donnerait un historique du risque dans le temps, ou la supprimer clarifierait le schéma | D5, D6 |

---

## Critères de validation

| | Critère | État |
|:-:|---|---|
| ✅ | RG26 réutilise `ScoringEngine` existant | appel direct, aucune copie |
| ✅ | Aucune formule dupliquée | vérifié |
| ✅ | Risque conforme traité | calculé, testé, sans NC créée |
| ✅ | Aucun faux niveau inventé | `MINEURE` est le résultat du moteur |
| ✅ | Risque RG26 clairement identifié | `source = "RG26"` + explication |
| ✅ | Signal IA clairement identifié | `source = "RISK_AGENT"` + avertissement |
| ✅ | Catégorie IA ≠ niveau RG26 | test dédié |
| ✅ | Justification IA identifiée comme IA | bloc séparé, avertissement |
| ✅ | Confiance null gérée | « non disponible », jamais 0 |
| ✅ | `risque_evaluation` reste dormant | 0 ligne, aucune entité |
| ✅ | Aucune migration | V70 inchangée |
| ✅ | Aucune écriture lors d'un GET | test `leCalculNecritRien` |
| ✅ | Bonne évaluation utilisée | test dédié |
| ✅ | Multi-tenant sécurisé | chaîne de la 5.8.1 |
| ✅ | IDOR testé | 8 scénarios, toujours verts |
| ✅ | V1 non modifiée | aucun fichier touché |
| ✅ | `EN_REVUE` préservé | badge inchangé, aucune validation ajoutée |
| ✅ | Historique intact | somme de contrôle identique |
| ✅ | Frontend existant réutilisé | 2 modifications dans un composant |
| ✅ | Distinction visuelle RG26 / IA | deux blocs, deux traitements |
| ✅ | Aucun rouge trompeur | rouge retiré du signal IA |
| ✅ | Java ≥ 408 tests verts | **420** |
| ✅ | Python ≥ 283 tests verts | **283** |
| ✅ | Frontend vert | ✓ |
| ✅ | Rapport créé | ce document |

---

## Fichiers

### Créés — 3

```
api-quarkus/…/conformite/RestitutionRisqueService.java
api-quarkus/…/test/…/conformite/RestitutionRisqueTest.java
docs/PHASE5_8_2_IMPLEMENTATION_RISQUES.md
```

### Modifiés — 3

```
api-quarkus/…/resource/dto/DetailEvaluationV2Dto.java   + risqueMetier, + signalIa
api-quarkus/…/resource/EvaluationResource.java          injection + appel
frontend-react/src/pages/CritereEvaluation.jsx          bloc RG26, signal IA restylé
```

**Aucune migration. Aucun fichier Python. Aucune Sidebar, aucun Header,
aucun endpoint nouveau.**

---

## Clôture

**PHASE 5.8.2 — IMPLÉMENTATION RISQUES**
**STATUS : VALIDÉE**

Les 25 critères sont satisfaits.

| | |
|---|---|
| Migrations | **AUCUNE** — V70 inchangée |
| `risque_evaluation` | **dormante**, 0 ligne |
| Endpoints créés | **0** — enrichissement de celui de la 5.8.1 |
| Tests Java | **420/420** |
| Tests Python | **283/283** |
| Build frontend | **vert** |
| Données historiques | **INTACTES** |
| Commit | **AUCUN** |

**Décision toujours ouverte : D1.** Elle bloque désormais trois sujets — le
détail V2, le bloc risque, et le futur affichage des axes.

**Limite à connaître** : le rendu visuel n'a pas été vérifié en navigateur.

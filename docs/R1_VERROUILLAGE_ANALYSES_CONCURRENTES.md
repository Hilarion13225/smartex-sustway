# R1 — Verrouillage des analyses IA concurrentes

## SMARTEX SUSTWAY

> Correctif du seul risque résiduel de la phase 5.7-C corrective.
>
> **Aucune migration.** Le schéma V70 a suffi.
>
> Aucun commit.

---

## 1. Le problème

Rien n'empêchait deux analyses simultanées sur le même critère. Un double
clic, deux onglets, ou deux instances de l'application derrière un
répartiteur de charge lançaient **deux passes complètes** : huit appels à
Gemini au lieu de quatre, deux fois le quota consommé, deux évaluations
écrites pour la même demande.

Le code portait déjà `AnalyseIaRepository.enCoursSurCritere`, écrit lors de
la phase 5.7-C. **Il n'était appelé nulle part.**

Et l'appeler tel quel n'aurait pas suffi. Une séquence « lire, puis
écrire » laisse toujours une fenêtre entre les deux :

```
Requête A : lit « aucune analyse en cours »
Requête B : lit « aucune analyse en cours »      ← les deux ont raison
Requête A : écrit sa réservation
Requête B : écrit la sienne                      ← deux passes partent
```

Un test séquentiel n'aurait rien vu. Le défaut ne se manifeste que sous
concurrence réelle.

---

## 2. Décision métier

Confirmée par le brief, et implémentée telle quelle :

| Situation | Réponse |
|---|---|
| Une analyse est déjà en cours sur ce `audit_critere_id` | **HTTP 409** |
| Message | `Une analyse est déjà en cours pour ce critère.` |

Ni mise en attente, ni annulation de l'analyse existante, ni remplacement,
ni seconde analyse.

**409 et non 429** : ce n'est pas une limite de débit, c'est un conflit
d'état — le critère est occupé.

---

## 3. Architecture retenue

### Un verrou de ligne PostgreSQL, pas une migration

```java
public Optional<AuditCritere> verrouiller(UUID auditCritereId) {
    return find("id = ?1", auditCritereId)
            .withLock(LockModeType.PESSIMISTIC_WRITE)
            .firstResultOptional();
}
```

Traduit en `SELECT … FOR UPDATE` sur la ligne du critère de mission. Il
sérialise la séquence « vérifier puis réserver », qui devient atomique.

### Pourquoi aucune migration

Un index unique partiel sur `analyse_ia (audit_critere_id) WHERE statut =
'EN_COURS'` — sur le modèle de `non_conforme_courante_unique` — aurait
donné une garantie structurelle. Il aurait aussi exigé une migration.

Le brief est explicite : *« Une migration n'est autorisée que si l'analyse
du schéma démontre qu'elle est nécessaire pour obtenir une garantie
atomique. »* **Elle ne l'est pas** : le verrou de ligne produit exactement
la même atomicité, sans toucher au schéma.

Les deux approches se valent sur l'atomicité et diffèrent sur un point :
l'index tiendrait même si un futur chemin de code oubliait de prendre le
verrou. C'est un argument réel, et il figure au §14 comme durcissement
recommandé — pas comme un manque de cette phase.

### Pourquoi pas un verrou en mémoire

Un `synchronized`, un `ReentrantLock` ou un cache local ne protègent que le
processus qui les héberge. Deux instances derrière un répartiteur de charge
lanceraient chacune leur passe sans se voir.

**La réservation est une ligne en base**, visible de toute connexion — donc
de toute instance. Un test le vérifie explicitement en relisant la
réservation par une requête native, hors de la session qui l'a créée.

### Granularité : le critère de mission

Le verrou porte sur `audit_critere_id`, jamais sur `critere_id`.

Le même critère de référentiel appartient à autant de missions qu'il y a
d'entreprises auditées. Verrouiller sur le critère du référentiel
sérialiserait **tous les clients entre eux** — l'analyse de D1-01 chez
l'entreprise A bloquerait celle de D1-01 chez l'entreprise B.

Verrouiller la mission entière serait tout aussi faux dans l'autre sens :
un référentiel de 92 critères deviendrait analysable un critère à la fois.

---

## 4. Le mécanisme atomique

```java
private UUID reserver(UUID auditId, UUID auditCritereId, UUID declencheParId) {
    AuditCritere auditCritere = auditCritereRepository.verrouiller(auditCritereId)…  // ← FOR UPDATE

    if (preuves.isEmpty() && auditCritere.getScenario() == null) {
        throw new RienAAnalyserException();          // refus AVANT réservation
    }
    if (analyseIaRepository.enCoursSurCritere(auditCritereId).isPresent()) {
        throw new DejaEnCoursException();            // conflit
    }

    AnalyseIa passe = new AnalyseIa(audit, auditCritere, formule);  // statut EN_COURS
    analyseIaRepository.persistAndFlush(passe);
    return passe.getId();
}
```

**L'ordre des contrôles compte.** « Rien à analyser » est refusé *avant* la
réservation : une demande vide poserait sinon une réservation qu'il
faudrait ensuite défaire.

La requête B attend le commit de A sur le verrou de ligne, puis lit la
réservation de A et refuse. Il n'y a pas de fenêtre.

---

## 5. Transaction

Le découpage a été **restructuré** par ce correctif. Auparavant, une seule
transaction faisait à la fois la préparation, le téléchargement des pièces
et la création de la passe. Le verrou y aurait été tenu pendant les
téléchargements depuis le stockage objet.

```
T0  verrou + contrôles + réservation        ← court, verrou libéré au commit
T1  téléchargement des pièces + contexte     ← hors verrou
--  appel au service d'agents                ← HORS transaction
T2  persistance du résultat
```

La réservation se fait **avant** l'appel au fournisseur — l'inverse
(appeler puis vérifier) autoriserait deux appels coûteux concurrents, ce
que le brief interdit explicitement.

Le verrou de ligne n'est tenu que le temps de T0 : quelques millisecondes.
Ce qui protège ensuite, c'est la **ligne `EN_COURS`**, pas le verrou.

---

## 6. Comportement 409

```java
if (resultat instanceof AnalyseCritereV2Service.Resultat.DejaEnCours) {
    auditLogService.journaliser(utilisateurId, entrepriseId,
            "ANALYSE_IA_REFUSEE_CONCURRENCE", "audit_critere", auditCritereId);
    return erreur(409, "Une analyse est déjà en cours pour ce critère.");
}
```

`DejaEnCours` est un cas **distinct d'un échec** : rien ne s'est mal passé,
la demande arrive trop tôt. Le traiter comme une erreur 503 aurait suggéré
une panne.

**Le message est constant.** Il ne dit ni l'identifiant de l'analyse en
cours, ni qui l'a lancée, ni depuis quand. Un double clic ne doit pas
devenir un canal d'observation — et l'isolation tenant impose qu'aucune
réponse ne renseigne sur l'activité d'une autre entreprise. Ici la question
ne se pose même pas : le contrôle de tenant refuse (403) avant d'atteindre
le verrou.

Aucune exception brute, aucune pile, aucun identifiant interne, aucun
détail du fournisseur.

---

## 7. Gestion du succès

```java
passe.terminer();   // EN_COURS → TERMINE
```

Le verrou logique disparaît : `enCoursSurCritere` ne rend plus rien, et une
nouvelle analyse est possible.

**Une analyse terminée ne bloque pas une ré-analyse.** Le verrou traite la
simultanéité, pas la répétition — c'est la distinction du §16 du brief :

| | |
|---|---|
| Double clic, deux requêtes simultanées | **une seule analyse** |
| Demande explicite après la fin de la précédente | **nouvelle analyse autorisée** |

---

## 8. Gestion de l'erreur

Tous les chemins de sortie referment la réservation :

| Étape | Échec | Action |
|---|---|---|
| T1 construction du contexte | stockage indisponible | `clore(… ERREUR)` |
| Appel au service d'agents | réseau, quota, 404 | `clore(… ERREUR)` |
| T2 persistance | contrainte, base | `clore(… ERREUR)` |

`clore` s'exécute dans sa propre transaction et n'échoue jamais
bruyamment : *ne jamais masquer l'échec d'origine par celui de sa trace*.

Un échec ne condamne pas le critère — vérifié par
`unePasseEnErreurLibereLeCritere`.

> **Constaté en vrai.** La base porte une passe `ERREUR` de 0,49 s, issue du
> premier essai de la phase précédente qui avait échoué en 404. Le critère
> est resté analysable, et deux passes `TERMINE` ont suivi.

---

## 9. Processus interrompu — risque résiduel assumé

### Le cas

Une passe est `EN_COURS`, et la JVM s'arrête — arrêt brutal, `kill -9`,
redémarrage de conteneur. La ligne reste `EN_COURS` indéfiniment, et le
critère devient **inanalysable**.

Le verrou de base, lui, disparaît avec la connexion : ce n'est pas lui qui
subsiste, c'est la **réservation logique**.

### Ce qui existe dans le schéma

`analyse_ia.date_debut` est renseigné. Rien d'autre : ni horodatage
d'activité, ni battement de cœur, ni identifiant d'instance.

### Pourquoi aucun mécanisme n'a été ajouté

Détecter une passe abandonnée suppose de décider **à partir de quand** une
passe qui dure est morte. Ce seuil serait arbitraire : une analyse réelle
prend entre 8 et 18 secondes dans les mesures de cette phase, mais un
document volumineux ou un fournisseur lent peuvent l'allonger, et un seuil
trop court tuerait des analyses vivantes.

Le brief l'interdit d'ailleurs explicitement : *« NE PAS créer
automatiquement un timeout arbitraire sans justification »*.

Aucune solution non arbitraire n'existe sans un battement de cœur ou un
identifiant d'instance — c'est-à-dire sans une structure nouvelle.

### Portée réelle du risque

| | |
|---|---|
| Déclencheur | arrêt brutal de la JVM pendant une passe |
| Fenêtre | 8 à 18 secondes par critère analysé |
| Effet | **un critère** devient inanalysable, la mission et les autres critères ne le sont pas |
| Déblocage | une seule instruction SQL passant la passe en `ERREUR` |
| Fréquence attendue | rare — redéploiement pendant une analyse |

**Documenté, non corrigé.** Deux remèdes possibles, l'un et l'autre à
arbitrer :

1. un endpoint d'administration libérant une passe nommée, avec trace ;
2. une colonne d'activité rafraîchie pendant l'exécution, permettant une
   détection fondée sur un fait plutôt que sur une durée.

---

## 10. Tests de concurrence

`VerrouAnalyseConcurrenteTest` — **9 tests**.

Les threads sont relâchés ensemble par une `CountDownLatch`. Sans cela ils
s'exécuteraient l'un après l'autre et ne prouveraient rien : c'est la
différence entre tester un contrôle et tester son atomicité.

| Test | Vérifie |
|---|---|
| `deuxDemandesSimultaneesSurLeMemeCritere_uneSeuleAboutit` | 1 succès, 1 refus, 1 passe, 1 `EN_COURS` |
| `laDemandeRefuseeNeCreeNiPasseNiTrace` | 0 `execution_agent`, 0 évaluation |
| `deuxCriteresDifferentsDeLaMemeMissionPeuventDemarrerEnsemble` | 2 succès |
| `leMemeCritereDeReferentielDansDeuxMissionsNeSeBloquePas` | 2 succès |
| `deuxEntreprisesDistinctesNeSeBloquentPas` | 2 succès |
| `unePasseTermineeLibereLeCritere` | `TERMINE` → ré-analyse possible |
| `unePasseEnErreurLibereLeCritere` | `ERREUR` → ré-analyse possible |
| `deuxDemandesSuccessivesApresCloture_creentDeuxPasses` | répétition ≠ simultanéité |
| `leVerrouReposeSurLaBaseEtNonSurLaMemoireDuProcessus` | réservation visible hors session |

```
[INFO] Tests run: 9, Failures: 0, Errors: 0, Skipped: 0
```

### Un défaut de fixture corrigé

Le premier jet sélectionnait « la version publiée la plus récente ». Les
autres tests de cette base créent des référentiels d'**un seul critère** ;
la plus récente était l'un d'eux, et les neuf tests échouaient sur un
`IndexOutOfBounds`. La sélection porte désormais sur le nombre de critères,
non sur la date.

---

## 11. Test réel

Mission « TEST VERIFICATION IA - ne pas exploiter », critère D1-01, deux
requêtes HTTP lancées simultanément contre le pipeline réel.

```
requete 2 -> HTTP 409 en 0.172371s
requete 1 -> HTTP 201 en 17.650479s

"message":"Une analyse est déjà en cours pour ce critère."
```

**L'écart de temps est la démonstration.** 0,17 s contre 17,65 s : la
seconde requête a été refusée avant tout appel au fournisseur. Si elle
l'avait atteint, elle aurait duré du même ordre.

### Les traces

Passes sur D1-01 :

```
 statut  |          date_debut           |      duree      |    requested_model
---------+-------------------------------+-----------------+-----------------------
 ERREUR  | 2026-09-10 23:47:16.975355+00 | 00:00:00.493335 |
 TERMINE | 2026-09-10 23:47:54.566106+00 | 00:00:08.051494 | gemini-3.5-flash-lite
 TERMINE | 2026-09-11 09:57:50.684410+00 | 00:00:17.323634 | gemini-3.5-flash-lite
```

Appels de la passe la plus récente — **une seule série de quatre** :

```
     agent      | piece | statut  |     served_model      | duration_ms | total_token_count
----------------+-------+---------+-----------------------+-------------+-------------------
 DOCUMENT       | p1    | TERMINE | gemini-3.5-flash-lite |        1977 |              1038
 EVIDENCE       |       | TERMINE | gemini-3.5-flash-lite |        2499 |              1821
 RISK           |       | TERMINE | gemini-3.5-flash-lite |        8780 |              1799
 RECOMMENDATION |       | TERMINE | gemini-3.5-flash-lite |        1661 |              1856
```

Comptages :

```
 passes totales sur D1-01      | 3     (1 erreur ancienne + 2 terminées)
 passes EN_COURS               | 0     ← verrou libéré
 appels Gemini totaux          | 8     = 4 + 4, aucun surnuméraire
 evaluations EN_REVUE          | 1     ← la requête refusée n'en a créé aucune
```

Journal :

```
 ANALYSE_IA_REFUSEE_CONCURRENCE | audit_critere
```

---

## 12. Résultats

| Suite | Avant | Après | Écart |
|---|---:|---:|---:|
| Java | 384 | **393** | **+9** |
| Python hors Gemini | 283 | 283 | 0 |
| Frontend | vert | **vert** | — |

Python n'a pas été modifié : le verrou est entièrement côté Java, le
service d'agents n'ayant aucune connaissance de l'état des missions.

```
283 passed, 1 warning in 6.74s
✓ built in 11.32s
```

### Données historiques

```
 evaluations pre-V2        | 44
 dont VALIDEE              | 44
 SOMME CONTROLE HISTORIQUE | df9d6f5d3393f022d721734ec2776989   ← identique
 NC total                  | 39
 NC courantes              | 22
 NC historiques            | 17
 criteres avec >1 courante | 0
 score_historique          | 8
 derniere migration        | 70
```

La somme de contrôle est celle relevée avant la phase 5.7-C. Aucune donnée
historique n'a été touchée, ni par le correctif, ni par le test réel.

---

## 13. Migration

**Aucune.** Le schéma V70 reste la base courante.

Le verrou repose sur `SELECT … FOR UPDATE`, qui n'exige aucune structure
nouvelle. Créer une migration pour un verrou absent du *service* aurait été
exactement ce que le §21 du brief interdit.

---

## 14. Risques résiduels

| # | Risque | Gravité | État |
|---|---|:-:|---|
| **R1.1** | **Passe abandonnée par arrêt brutal** | moyen | §9 — documenté, non corrigé. Portée : un critère, déblocage par une instruction SQL |
| **R1.2** | **Le verrou dépend du protocole, pas du schéma** | faible | Un futur chemin de code qui créerait une `analyse_ia` sans prendre le verrou casserait l'invariant. Un index unique partiel le rendrait impossible — durcissement recommandé, écarté ici faute de nécessité démontrée |
| **R1.3** | **Le chemin V1 n'est pas verrouillé** | moyen | `AnalyseCritereService` (V1) ne crée pas d'`analyse_ia` et n'est donc pas concerné par ce verrou. Deux analyses V1 simultanées restent possibles — comportement inchangé, hors périmètre de R1 |
| **R1.4** | **Attente sur le verrou de ligne** | faible | La seconde requête attend le commit de la première avant de recevoir son 409. T0 durant quelques millisecondes, l'attente est imperceptible — mesurée à 0,17 s au test réel, dont l'essentiel est le trajet HTTP |

### Sur R1.3

Il mérite d'être vu pour ce qu'il est : le chemin V1 reste ce qu'il était
avant cette phase. Il n'a pas régressé, mais il n'a pas non plus bénéficié
du correctif. Si le V1 doit vivre encore longtemps, il faudra soit
l'aligner, soit le retirer.

---

## Critère de validation

| | Point | État |
|:-:|---|---|
| ✅ | Verrou réellement branché | `reserver()` appelé dans le chemin réel |
| ✅ | Pas de verrou mémoire uniquement | `SELECT … FOR UPDATE` + réservation en base |
| ✅ | Même critère concurrent → 1 succès + 1 × 409 | test unitaire **et** test réel |
| ✅ | Deuxième appel n'appelle pas Gemini | 0,17 s contre 17,65 s ; 4 appels tracés, pas 8 |
| ✅ | Deuxième appel ne crée pas d'évaluation | 1 évaluation `EN_REVUE` |
| ✅ | Deux critères différents peuvent tourner | test |
| ✅ | Deux missions différentes peuvent tourner | test |
| ✅ | Multi-tenant respecté | test ; 409 générique |
| ✅ | Succès libère le verrou | `TERMINE` → 0 `EN_COURS` |
| ✅ | Erreur libère le verrou | `ERREUR` → 0 `EN_COURS` |
| ✅ | Nouvelle analyse après `TERMINE` | test + test réel (3 passes sur D1-01) |
| ✅ | Nouvelle analyse après `ERREUR` | test |
| ✅ | Aucune donnée historique modifiée | somme de contrôle identique |
| ✅ | Tests Java verts | **393** |
| ✅ | Tests Python verts | **283** |
| ✅ | Frontend vert | ✓ |
| ✅ | Test réel réussi | §11 |
| ✅ | Aucun secret exposé | message constant, sans identifiant ni détail |
| ✅ | Aucun commit | — |

---

## Fichiers

### Créés — 2

```
api-quarkus/src/test/java/com/smartexsustway/api/mission/VerrouAnalyseConcurrenteTest.java
docs/R1_VERROUILLAGE_ANALYSES_CONCURRENTES.md
```

### Modifiés — 3

```
api-quarkus/…/domain/repository/AuditCritereRepository.java   + verrouiller()
api-quarkus/…/mission/AnalyseCritereV2Service.java            réservation atomique, T0/T1 séparés
api-quarkus/…/resource/EvaluationResource.java                409 + journalisation
```

**Aucune migration. Aucun fichier Python. Aucun fichier frontend. Aucun
endpoint nouveau** — le chemin existant a été modifié, comme demandé.

---

## Clôture

**R1 — VALIDÉ**

| | |
|---|---|
| Migration | **AUCUNE** — schéma V70 inchangé |
| Verrou | `SELECT … FOR UPDATE` sur `audit_critere` + réservation `EN_COURS` |
| Portée du verrou | le critère **de mission** |
| Test réel | **201 / 409**, une seule série de 4 appels Gemini |
| Tests Java | **393/393** |
| Tests Python | **283/283** |
| Build frontend | **vert** |
| Données historiques | **INTACTES** — somme de contrôle identique |
| Commit | **AUCUN** |

**Risque résiduel principal** : R1.1 — une passe abandonnée par un arrêt
brutal de la JVM laisse un critère inanalysable. Aucun mécanisme non
arbitraire n'existe dans le schéma pour le détecter ; le seuil qu'il
faudrait poser relève d'une décision, pas d'une correction.

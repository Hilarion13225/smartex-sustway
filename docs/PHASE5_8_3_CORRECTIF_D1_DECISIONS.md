# PHASE 5.8.3 — CORRECTIF D1 + DÉCISIONS AXES/PLANS

## 1. Statut

**VALIDÉ**, avec une réserve explicitement documentée sur l'exécution de la
suite Python à appel réel (§23).

| Volet | Résultat |
|---|---|
| Correctif D1 | appliqué côté serveur, sur les trois routes |
| Tests D1 | 11 nouveaux cas, tous verts, sur corps HTTP réel |
| Java | **434/434**, 0 échec (423 → 434) |
| Frontend | build vert |
| Python déterministe | **280/280** |
| Python à appel réel | 64 tests, **non entièrement démontré** — quota Gemini 429 |
| Migrations | **aucune** — V70 reste la dernière |
| Données modifiées | **aucune** — checksum historique inchangé |
| Permissions / rôles | **aucun changement** — `ADMIN_AUDIT` non réactivé |

Périmètre de la phase : **corriger la fuite D1**, **la tester**, **figer les
décisions métier**, **documenter les écarts**. Le module complet Axes/Plans
n'est **pas** implémenté.

---

## 2. Fuite D1 identifiée

`non_conforme.description` contenait le raisonnement interne de l'IA, et cette
table est lisible par **tout membre de l'entreprise** — le contrôle sur
`GET .../non-conformites` était `exigerAccesEntreprise` seul, sans distinction
de rôle.

Le masquage posé en 5.8.1 sur `EvaluationDto` ne protégeait donc rien : le même
texte ressortait par une autre porte.

### Étendue réelle — corrigée par rapport à la cartographie

La cartographie 5.8.3 annonçait **21 lignes**. Le relevé exact en donne **34**.

```
 avec_description | contient_justification_ia | contient_pistes | egale_justification
------------------+---------------------------+-----------------+---------------------
               34 |                        34 |              21 |                  13
```

L'écart vient du critère de comptage : la cartographie avait cherché la chaîne
`Pistes d'amélioration`, qui ne marque que les descriptions **composites**. Les
**13** lignes où la description est *strictement égale* à la justification
n'avaient pas été comptées — ce sont pourtant les plus exposées, puisqu'elles
ne contiennent **que** du raisonnement IA.

Répartition des 39 non-conformités :

| Catégorie | Total | dont courantes |
|---|---|---|
| Description nulle | 5 | 2 |
| Justification IA seule (égalité stricte) | **13** | 7 |
| Justification IA + pistes | **21** | 13 |
| **Total porteur de raisonnement IA** | **34** | **20** |

### Chemins voisins vérifiés — et écartés

| Chemin | Verdict |
|---|---|
| Rapport `DETAILLE` (CSV et PDF) — contient `evaluation.getJustification()` | **Pas de fuite.** Gardé par `rapport:detaille`, détenu par `SUPER_ADMIN` et `ADMIN_AUDIT` (inactif) uniquement. Le collaborateur n'a que `rapport:consulter`. |
| Rapport `PLAN_ACTION` — accessible au collaborateur | **Pas de fuite.** N'utilise que `nc.getTitre()`, jamais `getDescription()`. |
| `PlanActions.jsx` export CSV | **Pas de fuite.** N'exporte pas la description. |
| `axes-amelioration`, `plans-action` | **Pas de fuite.** Contenu opérationnel ; D1 laisse les pistes visibles. |
| `NonConformitesEntreprise.jsx` | Passe par la même route, n'affiche pas la description. |

**Un seul chemin de fuite réel** : `NonConformeResource`.

---

## 3. Cause racine

`NonConformiteService.description(...)` composait :

```java
description.append(evaluation.getJustification());          // ← le raisonnement
… "Pistes d'amélioration : " + evaluation.getPistesAmelioration();
```

Deux erreurs se cumulaient :

1. **À l'écriture** — un champ opérationnel était alimenté par un champ de
   raisonnement. La non-conformité héritait d'une confidentialité qu'elle
   n'était pas construite pour porter.
2. **À la lecture** — `NonConformeResource` ne distinguait pas les rôles, alors
   que `EvaluationResource` le faisait déjà depuis D1.

La cause profonde est que **la frontière D1 avait été posée à un seul endroit**
(le DTO d'évaluation) alors que la donnée, elle, circulait vers deux surfaces.

---

## 4. Correction appliquée

Trois modifications, toutes côté serveur pour les deux premières.

### 4.1 Tarir la source — `NonConformiteService`

```java
private static String description(Evaluation evaluation) {
    String pistes = evaluation.getPistesAmelioration();
    if (pistes == null || pistes.isBlank()) {
        return null;
    }
    return "Pistes d'amélioration : " + pistes;
}
```

La justification n'est plus lue du tout. Ce qui reste — les pistes — est
exactement ce que D1 déclare visible au collaborateur sur l'évaluation : **la
même frontière est réutilisée, pas une seconde inventée.**

Si l'analyse n'a produit aucune piste, la description est `null`. **Aucun
texte n'est fabriqué** : un constat inventé serait pire qu'un champ vide, il
aurait l'air d'un constat.

### 4.2 Filtrer l'historique à la lecture — `NonConformeDto`

Deux fabriques, sur le modèle exact d'`EvaluationDto` :

- `depuis(...)` — version complète, administration ;
- `sansRaisonnementIa(...)` — version collaborateur.

Le retrait est **déterministe** : on soustrait la justification effectivement
persistée sur l'évaluation liée, telle quelle.

```java
private static String sansJustification(String description, String justification) {
    if (description == null || justification == null || justification.isBlank()) {
        return description;
    }
    if (!description.contains(justification)) {
        return description;
    }
    String reste = description.replace(justification, "").strip();
    return reste.isEmpty() ? null : reste;
}
```

La garde sur `isBlank()` n'est pas cosmétique : une justification vide est
contenue dans n'importe quelle chaîne, et la soustraire viderait **toutes** les
descriptions.

Un booléen `descriptionFiltree` accompagne la réponse, pour la raison qui avait
déjà imposé `justificationsMasquees` : sans lui, « aucun constat enregistré » et
« constat filtré » se ressemblent à l'écran.

**Ce mécanisme cicatrise seul** : dès qu'une description ne contient plus la
justification, elle est servie intacte. Les non-conformités nées après le
correctif ne sont donc jamais filtrées.

### 4.3 Router selon le rôle — `NonConformeResource`

Les **trois** routes (`lister`, `detail`, `changerStatut`) passent désormais par :

```java
private boolean peutLireLeRaisonnementIa(UUID utilisateurId, UUID entrepriseId) {
    return autorisationService.possedeRoleSurEntreprise(
            utilisateurId, entrepriseId, AutorisationService.ROLES_ADMINISTRATION_ENTREPRISE);
}
```

Réutilisation stricte d'`AutorisationService` et du même jeu de rôles que
`EvaluationResource`. **Aucune permission créée, aucun rôle modifié, aucune
seconde implémentation de sécurité.**

### 4.4 Frontend — cohérence d'affichage seulement

`NonConformites.jsx` et `VoletPlanAction.jsx` affichaient un vide silencieux
quand la description était absente. Ils affichent désormais une note explicite
lorsque `descriptionFiltree` est vrai.

**La sécurité n'est pas dans React** : le serveur ne transmet plus la donnée.
Le frontend ne fait qu'éviter un vide ambigu.

---

## 5. Traitement des 21 (en réalité 34) données historiques

**Aucune donnée n'a été modifiée, supprimée, résumée ni paraphrasée.**

### Recherche d'une source de reconstruction

Conformément à la consigne, j'ai cherché s'il existait une source métier
permettant de reconstruire un constat sans l'inventer :

```
 nc_ayant_des_constats  |  1        (sur 39)
 total_evaluation_constat | 10
 total_evaluation_preuve  |  2
```

**Une seule non-conformité sur trente-neuf** porte des `evaluation_constat`.
La reconstruction fiable est donc **impossible** pour la quasi-totalité du
corpus. Conformément au §4 de la consigne, les lignes n'ont pas été touchées.

### Structure vérifiée avant de décider

```
 commence_par_justif | strictement_egale | format_canonique | total_avec_desc
---------------------+-------------------+------------------+-----------------
                  34 |                13 |               21 |              34
```

Les 34 descriptions suivent **exactement** le format produit par l'ancien
service : `justification` seule, ou `justification + "\n\nPistes d'amélioration : " + pistes`.
Aucune n'est un texte humain saisi à la main, aucune n'est hybride.

C'est ce qui rend le retrait en lecture **exact** plutôt qu'approximatif : ce
qui reste après soustraction est du texte d'origine, jamais une reformulation.

### Ce que voit le collaborateur, ligne par ligne

| Cas | Nombre | Servi au collaborateur |
|---|---|---|
| Justification + pistes | 21 | les pistes seules, `descriptionFiltree = true` |
| Justification seule | 13 | `null`, `descriptionFiltree = true` |
| Description nulle | 5 | `null`, `descriptionFiltree = false` |

Le responsable et le super-admin reçoivent les 34 descriptions intactes.

### Pourquoi pas une migration

Une migration `UPDATE` aurait détruit une information que **l'administration a
le droit de lire** : la justification est légitimement consultable par le
responsable et le super-admin. La réécrire en base l'aurait effacée pour tout
le monde, sans possibilité de retour et sans source pour la reconstruire.

Le filtrage en lecture atteint l'objectif D1 **sans perte**. Les 34 lignes
restent à traiter par une migration dédiée **si et seulement si** le métier
décide que la justification ne doit plus exister du tout en base — décision
**D16**, ouverte au §21.

---

## 6. Tests D1

Nouvelle classe `NonConformeRaisonnementIaTest` — **11 cas**. Tous éprouvent le
**corps HTTP réel**, avec jeton réel sur l'URL exacte.

| # | Test | Ce qu'il protège |
|---|---|---|
| 1 | `uneNonConformiteNeeApresLeCorrectifNePorteAucuneJustificationIa` | la source est tarie |
| 2 | `aucunChampDeRaisonnementNAtteintLaDescription` | les **trois** justifications (conformité, risque, couverture) sont absentes |
| 3 | `uneAnalyseSansPisteLaisseUnConstatVidePlutotQuInvente` | aucun constat fabriqué |
| 4 | `leCollaborateurNeRecoitAucunRaisonnementIaDansLeCorpsHttp` | **Test 1 exigé** — body HTTP, pas un composant React |
| 5 | `leCollaborateurConserveLesPistesEtLeConstatOperationnel` | **Test 2** — D1 ne ferme pas la NC au collaborateur |
| 6 | `leResponsableRecoitLeConstatComplet` | le responsable n'est pas amputé |
| 7 | `leSuperAdminConserveSonAccesAdministratif` | **Test 3 exigé** |
| 8 | `leChangementDeStatutRenduAuCollaborateurEstAussiFiltre` | **Test 5** — aucune des trois routes n'est restée branchée sur la fabrique non filtrée |
| 9 | `unCollaborateurDUneAutreEntrepriseNAccedePasAuxNonConformites` | **Test 6** — IDOR, 403 |
| 10 | `uneNonConformiteDUneAutreMissionNEstPasLisibleAvecSonUuid` | IDOR par UUID exact, 404 |
| 11 | `unConstatSansRaisonnementEstServiIntactAuCollaborateur` | le filtre ne rabote pas par précaution |

Le témoin cherché par les assertions est une chaîne unique
(`RAISONNEMENT-IA-TEMOIN`) : une assertion « ne contient pas » n'a de valeur que
si ce qu'elle cherche ne peut pas être absent par hasard.

### Test existant adapté

`NonConformiteCouranteTest.uneReanalyseActualiseLaDescriptionEtLaGravite`
affirmait `description == justification`. Cette assertion **encodait le défaut** :
le correctif la rend fausse, à juste titre. Elle vérifie désormais que le
constat suit la dernière analyse **et** que l'actualisation ne réintroduit pas
la justification. La fixture alimente maintenant les pistes, la justification
restant renseignée avec un témoin distinct pour que l'absence soit vérifiable.

---

## 7. D1 — règle finale

```
Evaluation.justification
Evaluation.justificationRisque          →  RAISONNEMENT IA  →  ADMINISTRATION
Evaluation.justificationCouverture

Evaluation.pistesAmelioration           →  OPÉRATIONNEL     →  COLLABORATEUR
NonConforme.description                                         (selon droits)
AxeAmelioration.libelle / description
```

**Invariant** : `NonConforme.description` n'est jamais, ni directement ni
indirectement, une copie de `Evaluation.justification`.

Rôles porteurs, inchangés : `ROLES_ADMINISTRATION_ENTREPRISE` =
`SUPER_ADMIN`, `ADMIN_AUDIT` (inactif), `RESPONSABLE_ENTREPRISE`.

---

## 8. Modèle métier retenu

### AxeAmelioration
Proposition d'amélioration, durable et rattachable. Naît `PROPOSE`, qu'elle
vienne de l'IA ou d'un humain. Porte sa provenance (`origine`,
`origine_initiale`) et sa cible (`EXIGENCE` / `PREUVE_ATTENDUE` / `REGLE`).
**Peut exister sans non-conformité** (décision D7, §16 de la consigne).

### PlanAction
**Modèle officiel de planification** (décision D3). Appartient à une mission,
regroupe des actions dans le temps. Statuts `BROUILLON` / `ACTIF` / `CLOTURE`.

### ActionPlan
Action appartenant à un plan. **Doit appartenir à un `PlanAction`** (décision
D8) : `plan_action_id` est NOT NULL, la règle est déjà structurelle. Rattachée
à N axes via `action_axe`.

### NonConforme
Constat d'écart opposable, né à la validation d'une évaluation (RG17).
Identité logique : `audit_critere_id`, tenue par un index unique partiel.

### ActionCorrective
Correction d'une non-conformité constatée. **Conservée**, non refondue.
`non_conforme_id` NOT NULL.

---

## 9. Flux métier cible

```
                    ÉVALUATION
                         │
              ┌──────────┴──────────┐
              ↓                     ↓
       AXE D'AMÉLIORATION       NON-CONFORMITÉ
       (peut exister seul)      (note < 5, RG17)
              │                     │
              ↓                     ↓
         PLAN D'ACTION        ACTION CORRECTIVE
              │
              ↓
            ACTIONS
```

Les deux branches ne se rejoignent pas, et c'est voulu : loger une action
issue d'un axe dans `action_corrective` obligerait à fabriquer une
non-conformité fictive — donc à transformer une proposition d'amélioration en
constat d'écart opposable.

**Non implémenté dans cette phase.** Seulement enregistré.

---

## 10. Identité logique d'un axe

**Décision actée (D5)** : un `audit_critere` peut porter **plusieurs** axes.
La relation est `1 → N`, et aucune contrainte ne doit l'empêcher.

**Problème distinct à traiter** : la duplication accidentelle par répétition
d'analyse, double clic, concurrence, relance IA ou retry.

**Constat en base** — les 4 axes proviennent de **2 passes sur le même critère**,
et portent deux formulations du même conseil :

- « Faire valider et approuver le code de conduite par la direct… » (passe 1)
- « Faire approuver le code de conduite par la direction et y po… » (passe 2)

La duplication est donc **déjà présente**.

**Champs disponibles aujourd'hui pour définir une identité logique** :
`audit_critere_id`, `evaluation_id`, `niveau_rattachement` +
(`exigence_id` | `preuve_attendue_id` | `regle_analyse_id`), `libelle`,
`origine`, `statut`.

**Stratégie proposée — non implémentée** : une contrainte sur
`(audit_critere_id, niveau_rattachement, cible, statut)` restreinte aux axes
`PROPOSE` d'origine `IA`, sur le modèle de l'index unique partiel qui a résolu
le même problème sur `non_conforme` :

```sql
-- PROPOSITION, NON APPLIQUÉE
CREATE UNIQUE INDEX axe_ia_propose_unique ON axe_amelioration (...)
    WHERE origine = 'IA' AND statut = 'PROPOSE';
```

Limite connue : le `libelle` étant du texte libre produit par un modèle, deux
formulations du même conseil ne seront pas égales — l'index ne les attraperait
pas. Une déduplication sur la **cible** plutôt que sur le texte est plus
robuste, mais interdirait deux axes légitimement distincts sur la même
exigence. **Arbitrage à rendre : décision D17, §21.**

**Aucun index, aucune contrainte, aucune migration n'a été créée.**

---

## 11. IA → piste → axe

| | `pistesAmelioration` | `axe_amelioration` |
|---|---|---|
| Nature | production IA, texte libre | objet métier durable |
| Portée | une évaluation | une mission |
| Rattachable | non | oui (exigence / preuve / règle) |
| Validable | non | oui (`PROPOSE` → `VALIDE` / `REJETE`) |
| Planifiable | non | oui, une fois validé |
| En base | **23 évaluations** | **4 axes** |

Les deux représentations sont **déjà divergentes** : 23 contre 4.

Chaîne cible à définir lors de l'implémentation :

```
Piste IA (texte)  →  proposition d'axe  →  validation humaine  →  axe actif
```

**Les 23 pistes n'ont pas été transformées en axes. Aucun axe n'a été créé.**

---

## 12. Validation humaine

Workflow actuel, inspecté :

```
IA / HUMAIN
     ↓
  PROPOSE  ──POST /{axeId}/validation──→  VALIDE
     │                                       │
     └──POST /{axeId}/rejet (motif exigé)──→ REJETE
```

Tenu par la base : `axe_validation_coherente` et `axe_rejet_coherent` imposent
l'équivalence stricte statut ↔ décideur ; `axe_rejet_motive` exige un motif non
vide. Un axe ne peut donc **pas** devenir actif sans geste humain identifié.

**Écarts relevés, non corrigés :**

- aucun retour vers `PROPOSE` n'existe ;
- `VALIDE → REJETE → VALIDE` est possible et **efface le motif du rejet
  précédent** (voir §19, MAJEUR-3) ;
- **aucun axe validé ni rejeté en base** : ces chemins n'ont jamais servi hors
  tests.

---

## 13. Axe → Plan

**Vérification du schéma demandée au §15 de la consigne. Résultat : la relation
`N axes ↔ N plans` n'existe pas directement.**

Clés étrangères réelles :

```
action_axe.axe_amelioration_id  →  axe_amelioration
action_plan.plan_action_id      →  plan_action
```

**Aucune FK ne relie `axe_amelioration` à `plan_action`.** Le seul chemin est :

```
axe_amelioration ← action_axe → action_plan → plan_action
```

Conséquences, à documenter pour l'implémentation future :

1. `N axes ↔ N plans` est atteignable, mais **uniquement médiatisé par une
   action** — la PK `(action_plan_id, axe_amelioration_id)` n'empêche pas deux
   actions de plans différents de viser le même axe ;
2. **un axe validé mais non encore décliné en action n'appartient à aucun
   plan** : la question « quels plans traitent cet axe ? » n'a pas de réponse
   tant qu'aucune action n'existe ;
3. la barrière « seul un axe `VALIDE` est planifiable » est tenue **en Java
   seulement** (`PlanActionResource.ajouterAction`, 409). Aucun CHECK sur
   `action_axe`.

**Aucune relation n'a été ajoutée.**

---

## 14. NC → ActionCorrective

Chaîne inchangée :

```
Evaluation → VALIDEE (RG16)
  → NonConformiteService.genererSiNecessaire()
      note ≥ 5        → clôture de la NC courante
      criticité nulle → rien (RG37)
      NC courante     → actualiserDepuis(...)
      sinon           → création
  → ActionCorrectiveResource.creer (geste humain, audit:modifier)
```

Seule la composition de `description` a changé (§4.1). Le cycle, les statuts,
l'identité par `audit_critere_id` et l'index unique partiel sont intacts.

---

## 15. Acteurs et permissions actuelles

**Aucune permission n'a été créée, modifiée ou retirée. `ADMIN_AUDIT` n'a pas
été réactivé.**

| Rôle | Statut en base |
|---|---|
| `SUPER_ADMIN` | ACTIF |
| `RESPONSABLE_ENTREPRISE` | ACTIF |
| `COLLABORATEUR` | ACTIF |
| `ADMIN_AUDIT` | **INACTIF** |
| `EMPLOYE`, `VISITEUR` | INACTIF |

| Permission | Détenteurs |
|---|---|
| `audit:modifier` | SUPER_ADMIN, ADMIN_AUDIT, RESPONSABLE_ENTREPRISE |
| `evaluation:valider` | SUPER_ADMIN seul (V70) |
| `rapport:detaille` | SUPER_ADMIN, ADMIN_AUDIT |
| `rapport:consulter` | tous les rôles |

### État actuel vs modèle souhaité

| Geste | Souhaité | Actuel | Écart |
|---|---|---|---|
| Collaborateur — voir résultats et pistes | oui | **oui** | — |
| Collaborateur — voir NC opérationnelles | oui | **oui** (désormais filtrées) | — |
| Collaborateur — voir raisonnement IA | non | **non** | corrigé par cette phase |
| Collaborateur — voir axes | oui | oui | — |
| Collaborateur — plans/actions **qui le concernent** | oui | oui, mais **tous** les plans de la mission | pas de notion d'affectation ; voir §19 MOYEN-2 |
| Responsable — gérer plans et actions | oui | oui | — |
| Responsable — valider/rejeter un axe | selon workflow | oui (`audit:modifier`) | à confirmer — D11 |
| Super-admin — administrer | oui | oui | — |

---

## 16. Provenance IA

Tracé aujourd'hui sur les 4 axes :

| Champ | Valeur relevée |
|---|---|
| `origine` | `IA` (4/4) |
| `origine_initiale` | `IA` (4/4) |
| `evaluation_id` | renseigné (4/4) |
| `audit_critere_id` | renseigné (4/4) |
| `created_by` | nul (4/4) — création machine |
| `statut` | `PROPOSE` (4/4) |

La provenance ne peut pas être falsifiée : `proposeParIa` est le seul chemin
posant `IA`, et `POST /axes-amelioration` force `HUMAIN` sans que l'appelant
puisse le choisir.

**Cette provenance reste réservée à l'administration** et n'implique pas que le
collaborateur reçoive le raisonnement.

**Manques documentés :** aucun lien direct `axe → analyse_ia` ni
`axe → execution_agent` ; le chemin passe par `evaluation_id`, qui est en
`ON DELETE SET NULL`.

---

## 17. Règles / preuves attendues

État exact des 4 axes :

| Niveau | Nombre | Cible résolue |
|---|---|---|
| `REGLE` | 2 | `regle_analyse_id` renseigné |
| `PREUVE_ATTENDUE` | 2 | `preuve_attendue_id` renseigné |
| `EXIGENCE` | 0 | — |

Tous rattachés à la mission `39764f70-…`, tous à un `audit_critere` et à une
`evaluation`. Les 4 respectent le CHECK `axe_cible_coherente`.

La résolution des références locales vers les UUID réels est retraduite contre
le catalogue **actif** du critère : une référence inventée par le modèle ne
peut pas produire de clé étrangère.

**Aucune donnée n'a été modifiée.**

---

## 18. Historique / audit

| Événement | Émis par | Occurrences en base |
|---|---|---|
| `AXE_CREE` | `AxeAmeliorationResource.creer` | **0** |
| `AXE_VALIDE` | `…valider` | **0** |
| `AXE_REJETE` | `…rejeter` | **0** |
| `PLAN_ACTION_CREE` | `PlanActionResource.creer` | **0** |
| `PLAN_ACTION_MODIFIE` | `modifier`, `changerStatut`, `ajouterAction` | **0** |
| `ACTION_CORRECTIVE_CREEE` | `ActionCorrectiveResource.creer` | 3 |
| `ACTION_CORRECTIVE_STATUT_CHANGE` | `…changerStatut` | 1 |
| `NON_CONFORME_STATUT_CHANGE` | `NonConformeResource` | — |

Les événements axes/plans **existent dans le code mais n'ont jamais de
consommateur ni de producteur effectif** : les gestes correspondants n'ont
jamais été exercés hors tests.

Faiblesses documentées, non corrigées :

- `PLAN_ACTION_MODIFIE` recouvre trois gestes distincts ;
- aucun événement ne consigne la valeur **antérieure** ;
- aucune table d'historique métier pour les axes (pas d'équivalent de
  `courante`).

**Aucun nouvel événement n'a été créé.**

---

## 19. Gaps restants

### CRITIQUES

*Aucun.* La fuite D1 était le seul écart critique de sécurité ; elle est
corrigée et testée. L'écart CRITIQUE-2 de la cartographie (deux modèles de plan)
n'est plus un gap : il est **tranché** par la décision D3 (§8), et son
implémentation est la phase suivante.

### MAJEURS

**MAJEUR-1 — 34 lignes historiques portent encore la justification en base.**
Elles ne sont plus exposées au collaborateur, mais la donnée demeure. Décision
D16 requise avant toute migration.

**MAJEUR-2 — Aucune déduplication des axes.** Duplication déjà constatée
(2 passes → 2 formulations du même conseil). Voir §10 ; décision D17.

**MAJEUR-3 — Les décisions sur un axe s'écrasent.** `valider()` efface le motif
de rejet, `rejeter()` efface le validateur. **Non corrigé** : la consigne
réserve ce correctif à la phase d'implémentation, et il n'était pas nécessaire
au correctif D1.

**MAJEUR-4 — `pistesAmelioration` et `axe_amelioration` divergents** (23 vs 4),
sans invariant les liant.

**MAJEUR-5 — `evaluation_id` en `ON DELETE SET NULL`** : la provenance d'un axe
devient inaudible si l'évaluation disparaît.

### MOYENS

**MOYEN-1 — La barrière « axe validé » est en Java seulement**, aucun CHECK sur
`action_axe`.

**MOYEN-2 — Aucune notion d'« action qui me concerne ».** Le modèle souhaité
donne au collaborateur les « plans/actions qui le concernent » ; en l'état, il
voit tous les plans de la mission. `responsable_id` existe mais n'est pas un
critère de filtrage.

**MOYEN-3 — N+1 sur `GET /plans-action`** : 1 + P + (P × A) requêtes, faute de
`join fetch` sur `ActionPlanRepository`. Sans effet aujourd'hui (0 plan).

**MOYEN-4 — Transitions de plan totalement libres** (`CLOTURE → BROUILLON`
accepté).

**MOYEN-5 — `PLAN_ACTION_MODIFIE` recouvre trois gestes.**

### MINEURS

- **MINEUR-1** — troncature silencieuse du libellé d'axe à 255 caractères.
- **MINEUR-2** — repli `"Action recommandée"` si le texte IA est nul.
- **MINEUR-3** — `referenceRattachement` rend un code pour exigence et règle,
  mais un libellé pour preuve attendue.
- **MINEUR-4** — `plan_action.origine` jamais écrite autrement que par défaut.
- **MINEUR-5** — trois méthodes de repository sans appelant.
- **MINEUR-6** — la cartographie 5.8.3 annonçait 21 lignes touchées ; le chiffre
  exact est 34. Le rapport de cartographie n'a pas été réécrit ; l'écart est
  consigné ici (§2).

---

## 20. Décisions prises

| # | Décision | Statut |
|---|---|---|
| **D1** | `NonConforme.description` = constat opérationnel ; jamais une copie de `Evaluation.justification` | **ACTÉE ET APPLIQUÉE** |
| **D3** | `PlanAction` est le modèle officiel de planification ; `ActionCorrective` reste le mécanisme de correction d'une NC ; aucun des deux n'est supprimé | **ACTÉE, non implémentée** |
| **D4** | `ActionCorrective` répond à une NC ; `PlanAction` organise des actions d'amélioration issues d'axes validés | **ACTÉE, documentée** |
| **D5** | Un `audit_critere` peut porter plusieurs axes (1 → N) | **ACTÉE, non contrainte** |
| **D6** | Un axe peut relever de plusieurs plans, un plan traiter plusieurs axes — **indirectement, via une action** (§13) | **ACTÉE, documentée** |
| **D7** | Un axe peut exister sans non-conformité | **ACTÉE, aucun mécanisme créé** |
| **D8** | Une `ActionPlan` appartient obligatoirement à un `PlanAction` ; `ActionCorrective` reste indépendante | **ACTÉE — déjà structurelle** |
| **D9–D15** | Acteurs et permissions : état documenté, modèle cible documenté | **DOCUMENTÉES, aucune permission modifiée** |

---

## 21. Décisions encore ouvertes

| # | Question | Pourquoi elle bloque |
|---|---|---|
| **D11** | Qui valide un axe ? Aujourd'hui `audit:modifier`, donc `RESPONSABLE_ENTREPRISE` inclus — alors qu'`evaluation:valider` est réservé à `SUPER_ADMIN` | Asymétrie assumée ou à resserrer avant l'implémentation |
| **D12** | Quelles transitions de plan sont légitimes ? | Aucune n'est interdite aujourd'hui |
| **D13** | La règle « seul un axe validé est planifiable » doit-elle passer en base ? | Actuellement Java seulement |
| **D16** | **Que faire des 34 lignes historiques ?** Les laisser (filtrées en lecture), les purger, ou les scinder en deux colonnes | Une purge détruirait une donnée que l'administration a le droit de lire, sans source pour la reconstruire |
| **D17** | **Sur quoi déduplique-t-on un axe IA ?** Sur la cible (robuste, mais interdit deux axes légitimes sur la même exigence) ou sur le libellé (n'attrape pas deux formulations du même conseil) | Détermine la contrainte à créer, et donc la migration |
| **D18** | Que signifie « les plans/actions qui me concernent » pour un collaborateur ? | Détermine s'il faut filtrer par `responsable_id` ou introduire une affectation |

---

## 22. Non-régression

### Compteurs métier — avant / après

| Mesure | Avant | Après | Δ |
|---|---|---|---|
| `non_conforme` total | 39 | **39** | 0 |
| dont courantes | 22 | **22** | 0 |
| dont historiques | 17 | **17** | 0 |
| descriptions portant la justification IA | 34 | **34** | 0 |
| `axe_amelioration` | 4 | **4** | 0 |
| `plan_action` | 0 | **0** | 0 |
| `action_plan` | 0 | **0** | 0 |
| `action_axe` | 0 | **0** | 0 |
| `action_corrective` | 2 | **2** | 0 |
| `evaluation` | 46 | **46** | 0 |

Sortie brute :

```
 non_conforme total                |    39
 non_conforme courantes            |    22
 non_conforme historiques          |    17
 nc description contient justif IA |    34
 axe_amelioration                  |     4
 plan_action                       |     0
 action_plan                       |     0
 action_axe                        |     0
 action_corrective                 |     2
 evaluation                        |    46

 derniere_migration | 70
```

Les 34 descriptions portent **toujours** la justification en base : c'est le
résultat attendu. Le correctif agit à l'écriture (plus aucune nouvelle) et à la
lecture (filtrage par rôle), jamais sur l'historique.

### Somme de contrôle historique

Formule retrouvée et reproduite :

```sql
SELECT md5(string_agg(id::text || statut::text || note::text, ',' ORDER BY id))
FROM evaluation WHERE contrat_version IS NULL;   -- 44 évaluations pré-V2
```

| | Valeur |
|---|---|
| Attendue | `df9d6f5d3393f022d721734ec2776989` |
| Avant | `df9d6f5d3393f022d721734ec2776989` ✔ |
| Après | *(voir §23)* |

### Périmètre du diff

```
 .../api/conformite/NonConformiteService.java       | 85 ++++++++++++++++++----
 .../api/resource/NonConformeResource.java          | 33 +++++++--
 .../api/resource/dto/NonConformeDto.java           | 85 ++++++++++++++++++++--
 .../src/components/audit/VoletPlanAction.jsx       | 11 ++-
 frontend-react/src/pages/NonConformites.jsx        |  8 +-
 5 files changed, 195 insertions(+), 27 deletions(-)
```

Nouveaux fichiers :

```
?? api-quarkus/src/test/java/.../resource/NonConformeRaisonnementIaTest.java
?? docs/PHASE5_8_3_CORRECTIF_D1_DECISIONS.md
```

`NonConformiteCouranteTest.java` a également été adapté (§6) ; il n'apparaît
pas comme modifié car son répertoire `…/api/conformite/` est encore non suivi,
issu d'une phase antérieure non commitée.

De nombreuses autres modifications figurent dans `git status` : elles
**préexistent** à cette phase et proviennent des phases 5.6 à 5.8.2, non
commitées conformément à la consigne permanente du projet. Elles n'ont pas été
touchées.

### Périmètres non touchés

- **Aucune migration Flyway.** V70 reste la dernière.
- **Aucune modification IA** : ni Python, ni agents, ni prompts, ni Gemini, ni
  contrats Pydantic, ni orchestration V2.
- **Aucune modification RG26** : `ScoringEngine` intact.
- **Aucune permission, aucun rôle modifié.** `ADMIN_AUDIT` non réactivé.
- **Aucun module Axe/Plan implémenté**, aucun écran créé.
- **Sidebar, Header, vitrine** non touchés.

---

## 23. Résultats des tests

### Java — 434/434, aucun échec

```
[INFO] Results:
[INFO]
[INFO] Tests run: 434, Failures: 0, Errors: 0, Skipped: 0
[INFO]
[INFO] ------------------------------------------------------------------------
[INFO] BUILD SUCCESS
[INFO] ------------------------------------------------------------------------
[INFO] Total time:  15:30 min
[INFO] Finished at: 2026-09-11T15:04:14Z
```

423 avant la phase, **434 après** : les 11 nouveaux cas D1 sont inclus et
verts. Flyway confirme le schéma inchangé pendant la passe :

```
Successfully validated 69 migrations
Current version of schema "public": 70
Schema "public" is up to date. No migration necessary.
```

### Frontend — build vert

```
dist/assets/index-C97cLuVE.css    108.37 kB │ gzip:  16.82 kB
dist/assets/index-CeWiEMcS.js   1,036.56 kB │ gzip: 280.14 kB
✓ built in 12.34s
[exited with code 0]
```

L'avertissement de taille de chunk est préexistant et sans rapport avec cette
phase.

### Python — 280/280 déterministes verts ; 64 tests à appel réel limités par le quota

Le corpus Python compte **344 tests**, dont **64 appellent réellement Gemini** :

```
344 tests collected
64/344 tests collected (280 deselected)   ← sélection « reel »
```

**Suite déterministe (280) :**

```
280 passed, 64 deselected, 1 warning in 4.64s
```

**Suite complète (344), première passe :**

```
10 failed, 334 passed, 1 warning in 811.22s (0:13:31)
```

Les 10 échecs sont **tous** dans des fichiers `*_reel.py`. Cause établie par
reproduction, et non supposée :

```
google.genai.errors.ClientError: 429 RESOURCE_EXHAUSTED.
  'message': 'You exceeded your current quota …
   Quota exceeded for metric:
   generativelanguage.googleapis.com/generate_content_free_tier_requests,
   limit: 15, model: gemini-3.5-flash-lite
   Please retry in 47.389087005s.'
  'quotaId': 'GenerateRequestsPerMinutePerProjectPerModel-FreeTier'
  'quotaValue': '15'
```

L'instrumentation de la phase 5.6 classe correctement l'incident :

```
ERROR app.services.appel_gemini : Appel fournisseur en échec :
  {'agent': 'RECOMMENDATION', 'statut': 'ERREUR', 'provider': 'google-genai',
   'requested_model': 'gemini-3.5-flash-lite', 'served_model': None,
   'duration_ms': 595, 'error_type': 'QUOTA'}
```

**Seconde passe, tests réels seuls :**

```
8 failed, 56 passed, 280 deselected, 1 warning in 277.03s (0:04:37)
```

**Ce n'est pas une régression de ce correctif**, et la démonstration ne repose
pas sur une affirmation :

1. **Aucun fichier Python n'est modifié par cette phase** — le diff ne contient
   que du Java, deux fichiers React et deux documents ;
2. **le même test repasse isolément** :
   `test_reel_aucune_gravite_produite` → `1 passed in 2.76s` ;
3. **l'erreur est un refus du fournisseur** (HTTP 429, quota 15 req/min du
   palier gratuit), pas une assertion métier en défaut ;
4. **les deux passes n'échouent pas sur les mêmes tests** — preuve la plus
   directe qu'aucun défaut déterministe n'est en cause :

| Passe | Échecs |
|---|---|
| 1 (suite complète) | 4 × `test_pipeline_v2_reel`, 1 × `recommendation_v2_reel`, 5 × `risk_agent_v2_reel` |
| 2 (tests réels seuls) | 7 × `evidence_compliance_agent_v2_reel`, 1 × `test_pipeline_v2_reel` |

Aucun fichier n'est en échec dans les deux passes à l'exception de
`test_pipeline_v2_reel`, et pas sur les mêmes cas. L'ensemble des tests en
échec suit l'ordonnancement, pas le code.

Conformément à la règle du projet, **aucun de ces échecs n'a été transformé en
succès**, aucun mock n'a été substitué à Gemini, et aucun `retry` n'a été
ajouté. Le résultat reste : **l'exécution complète de la suite réelle n'est pas
démontrée sur cette passe**, faute de quota.

**Écart de référence à signaler** : le brief annonce 283 tests Python de
référence ; le corpus en compte aujourd'hui **344**. L'écart n'a pas été
introduit par cette phase et n'a pas été investigué — `À CONFIRMER`.

---

## 24. Conclusion

La fuite était réelle, et plus large que la cartographie ne l'avait mesurée :
**34 lignes**, pas 21. Les 13 lignes manquantes au décompte étaient les plus
exposées — celles où la description n'est *rien d'autre* que du raisonnement IA.

Le correctif tient en trois gestes, tous côté serveur : la source ne compose
plus le constat à partir de la justification ; la lecture retire ce que
l'historique en porte encore, de façon déterministe et réversible ; les trois
routes de la ressource passent par le même contrôle de rôle que
l'évaluation. La frontière D1 est désormais posée **une fois** et réutilisée
aux deux endroits où la donnée circule — c'est l'absence de ce partage qui
avait laissé la seconde porte ouverte.

Ce qui n'a pas été fait mérite d'être dit aussi clairement : **les 34 lignes
n'ont pas été réécrites.** Une seule non-conformité sur trente-neuf porte des
constats structurés ; il n'existait donc aucune source permettant de
reconstruire les autres sans inventer. Filtrer en lecture atteint l'objectif
sans détruire une information que l'administration a le droit de lire. La
purge éventuelle reste une décision métier (D16), pas une conséquence
technique.

Côté modèle, les décisions D3 à D8 sont actées et documentées, sans une ligne
d'implémentation. Deux points méritent l'attention avant la phase suivante :
la relation « N axes ↔ N plans » **n'existe pas directement en base** — elle
passe obligatoirement par une action, si bien qu'un axe validé mais non décliné
n'appartient à aucun plan ; et la déduplication des axes IA bute sur un
arbitrage réel (D17), le libellé étant du texte libre que deux passes
reformulent différemment.

Enfin, la suite Java est verte à 434, le frontend construit, et les 280 tests
Python déterministes passent. Les 10 échecs restants sont un refus de quota
Gemini, reproduit et documenté, non masqué.

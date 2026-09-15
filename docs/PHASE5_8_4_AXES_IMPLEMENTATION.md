# PHASE 5.8.4 — Implémentation des axes d'amélioration

## 1. Statut

**VALIDÉ.**

| Volet | Résultat |
|---|---|
| Java | **471/471**, 0 échec, 0 ignoré (434 → 471) |
| Tests ajoutés | **37** (23 métier + 14 REST) |
| Python déterministe | **280/280**, inchangé |
| Frontend | build vert |
| Migrations | **aucune** — V70 reste la dernière |
| Données | **aucune modification** — 4 axes, 39 NC, checksum identique |
| Permissions / rôles | **aucun changement** |
| PlanAction / ActionCorrective | **non touchés** |
| Python | **non modifié** |

Périmètre : le cycle de vie des **axes d'amélioration** uniquement.
`PlanAction` / `ActionPlan` restent hors périmètre, conformément à la consigne.

---

## 2. Modèle `AxeAmelioration` retenu

**Le modèle existant a été conservé intégralement. Aucune colonne, aucun enum,
aucune table n'a été ajouté.**

Cartographie préalable (étape 1) — 21 colonnes déjà en place :

| Besoin de la phase | Colonne existante | Verdict |
|---|---|---|
| Provenance | `origine`, `origine_initiale` (`origine_axe`) | suffisant |
| Cycle de vie | `statut` (`statut_axe` : `PROPOSE`/`VALIDE`/`REJETE`) | suffisant |
| Traçabilité de la validation | `validee_par`, `validee_le` | suffisant |
| Traçabilité du rejet | `rejetee_par`, `rejetee_le`, `motif_rejet` | suffisant |
| Rattachement référentiel | `niveau_rattachement` + `exigence_id` / `preuve_attendue_id` / `regle_analyse_id` | suffisant |
| Tenant | `audit_id` (NOT NULL) | suffisant |
| Portée | `audit_critere_id`, `evaluation_id` | suffisant |

Quatre CHECK déjà portants, réutilisés tels quels : `axe_cible_coherente`,
`axe_validation_coherente`, `axe_rejet_coherent`, `axe_rejet_motive`.

**Aucun enum inventé** : `OrigineAxe` et `StatutAxe` couvraient déjà le besoin.

---

## 3. Flux de création

### Sources cartographiées (étape 2)

Recherche exhaustive de `new AxeAmelioration`, `proposeParIa`, `saisiParHumain`,
`AxeAmeliorationRepository` sur tout le dépôt :

| Source | Avant | Après |
|---|---|---|
| `PersistanceResultatV2Service.persisterAxes` | créait directement | **délègue au service** |
| `AxeAmeliorationResource.creer` (saisie humaine) | crée directement | inchangé (pas de dédup. sur saisie manuelle — voir §16) |
| `AxesEtPlansTest` (fixture) | test | inchangé |
| **Frontend** | **aucune création** | aucune |

**Il n'existe désormais qu'une seule chaîne de création IA**, conformément à la
consigne « ne pas créer une seconde chaîne parallèle ».

### Chaîne effective

```
Recommendation Agent V2 (Python, inchangé)
  → EnveloppeV2Dto.RecommandationDto.actions[]
  → PersistanceResultatV2Service.persisterAxes()
  → AxeAmeliorationService.proposerParIa()
        ├── troncature à 255 (longueur de colonne)
        ├── empreinte de comparaison
        ├── recherche de doublon sur le critère
        ├── création si absent          → AxeAmelioration.proposeParIa()
        └── sinon journalisation        → AXE_DOUBLON_IGNORE
  → AxeAmeliorationService.rattacher()   (garde de version, §8)
```

Un axe naît `PROPOSE`, `origine = IA`, `origine_initiale = IA`. Ces valeurs
sont posées dans la fabrique d'entité : **l'appelant ne peut pas les choisir**,
donc la provenance ne peut pas être falsifiée. La route de saisie manuelle
force symétriquement `HUMAIN`.

---

## 4. Flux de validation

```
PROPOSE ──POST /{axeId}/validation──→ VALIDE
             statut       = VALIDE
             validee_par  = décideur
             validee_le   = maintenant
             motif_rejet  = null
             rejetee_par  = null
             rejetee_le   = null
             journal      → AXE_VALIDE
```

## 5. Flux de rejet

```
PROPOSE ──POST /{axeId}/rejet {motif}──→ REJETE
             statut       = REJETE
             rejetee_par  = décideur
             rejetee_le   = maintenant
             motif_rejet  = motif (non vide, exigé par la base ET par le DTO)
             validee_par  = null
             validee_le   = null
             journal      → AXE_REJETE
```

L'axe rejeté **est conservé**. Effacer une recommandation écartée rendrait la
relecture invérifiable.

### Le défaut corrigé

La cartographie 5.8.3 signalait que `valider()` et `rejeter()` s'écrasaient
mutuellement. **L'analyse du correctif a montré que l'effacement n'était pas
l'erreur** : les contraintes `axe_validation_coherente` et
`axe_rejet_coherent` lient par *équivalence stricte* le statut et son décideur
— un axe `VALIDE` qui conserverait `rejetee_par` violerait la base. Conserver
les deux jeux de métadonnées est donc structurellement impossible.

**L'erreur était d'autoriser le second geste.** Avant, seul l'état identique
était refusé (409 sur « déjà validé ») ; passer de `VALIDE` à `REJETE`
réussissait et emportait silencieusement le validateur.

Correctif appliqué : **les transitions partent exclusivement de `PROPOSE`**.
Une décision est définitive. Les quatre cas (`VALIDE→REJETE`, `REJETE→VALIDE`,
double validation, double rejet) rendent désormais `409`, et les métadonnées de
la décision initiale survivent — c'est ce que vérifient les tests.

---

## 6. Stratégie de déduplication (D17)

### Règle V1 — déterministe et conservatrice

Avant création, le service cherche sur **le même `audit_critere`** un axe dont
l'empreinte du libellé est identique.

```java
static String empreinte(String libelle) {
    return libelle.strip().replaceAll("\\s+", " ").toLowerCase(Locale.ROOT);
}
```

Trois opérations, pas une de plus : espaces de bord retirés, suites d'espaces
ramenées à un, casse ignorée.

### Ce qui n'est pas fait, et pourquoi

| Écarté | Raison |
|---|---|
| Suppression des accents | « controle » et « contrôle » ne sont pas le même mot ; les confondre rapprocherait des propositions distinctes |
| Racinisation / suppression de mots vides | même risque, amplifié |
| Embeddings, similarité cosinus | interdit par la consigne, et introduirait un appel IA supplémentaire |
| Appel Gemini de déduplication | interdit ; le pipeline n'est pas modifié |
| Suppression automatique de propositions | jamais : une proposition perdue ne se retrouve pas |

### Limite assumée et documentée

Deux formulations différentes du même conseil **coexistent** :

```
"Mettre en place une politique de formation annuelle"
"Formaliser un programme annuel de formation"
```

→ deux axes. C'est le choix conservateur : un doublon se repère à la lecture,
une recommandation supprimée ne se retrouve pas. Le test
`deuxFormulationsDifferentesDuMemeConseilCoexistent` fixe cette limite pour
qu'elle reste un choix documenté plutôt qu'une surprise.

### Portée du contrôle

Le périmètre de comparaison est **le critère**, jamais la mission entière : le
même conseil peut légitimement valoir pour deux critères, et les fusionner
ferait perdre à quel titre il a été formulé
(`laDeduplicationNeDebordePasSurUnAutreCritere`).

**Le libellé enregistré n'est jamais modifié** : la normalisation sert à
comparer, pas à réécrire (`leLibelleConserveEstCeluiDeLaPropositionRetenue`).

Un doublon écarté est journalisé (`AXE_DOUBLON_IGNORE`) : sans trace, une
proposition écartée serait indiscernable d'une proposition jamais produite.

**Aucun index ni contrainte d'unicité n'a été créé** — `UNIQUE(audit_critere_id)`
reste proscrit (D5), et `UNIQUE(libelle)` a été jugé insuffisant.

---

## 7. Sécurité et RBAC

**Aucune permission créée. Aucun rôle modifié. `ADMIN_AUDIT` non réactivé.**

| Geste | Contrôle | SUPER_ADMIN | RESPONSABLE_ENTREPRISE | COLLABORATEUR |
|---|---|---|---|---|
| Lister / consulter | `exigerAccesEntreprise` | oui | oui | **oui** |
| Créer (saisie) | + `audit:modifier` | oui | oui | non (403) |
| Valider | + `audit:modifier` | oui | oui | **non (403)** |
| Rejeter | + `audit:modifier` | oui | oui | **non (403)** |

`audit:modifier` existait déjà et se décrit elle-même comme « Modifier une
mission (plan d'actions, non-conformités) » : reprendre une proposition
d'amélioration relève exactement de ce travail.

### D1 — ce que voit le collaborateur

Un axe **dit quoi faire** : c'est de l'opérationnel, au même titre que les
pistes d'amélioration que D1 laisse explicitement visibles. Le collaborateur
peut donc lire les axes.

Ce qu'il ne voit pas, parce que **le DTO ne le porte pas du tout** :
justification, raisonnement, constats détaillés, traces d'exécution, prompts,
jetons, réponses brutes, identifiants de modèle.

Le test `aucunRaisonnementIaNApparaitDansLaReponse` assert sur le **corps HTTP
entier**, et non sur les champs qu'on aurait pensé à regarder.

**Les droits du collaborateur n'ont pas été élargis pour afficher les axes** :
la lecture des axes était déjà ouverte à tout membre de l'entreprise avant
cette phase.

---

## 8. Multi-tenant / IDOR

Toutes les résolutions passent par le couple (identifiant, mission) :

| Vérification | Méthode | Test |
|---|---|---|
| Axe d'une autre mission par UUID exact | `parIdEtAudit(axeId, auditId)` | `unAxeDUneAutreMissionNEstPasLisibleAvecSonUuid` → 404 |
| Liste d'une autre entreprise | `exigerAccesEntreprise` | `unUtilisateurDUneAutreEntrepriseNeListePasLesAxes` → 403 |
| Décision sur l'axe d'autrui | les deux | `unIntrusNeValideNiNeRejetteLAxeDAutrui` → 404 puis 403 |
| **Combinaison incohérente** critère de B / mission de A | résolution du critère contre la mission | `unCritereDUneAutreMissionEstRefuseCommeFiltre` → 404 |

Le filtre `auditCritereId` est **résolu contre la mission avant d'être
utilisé** : son identifiant seul ne permet pas d'atteindre les axes d'une autre
mission.

---

## 9. API

**Conventions existantes réutilisées.** La consigne proposait
`/api/v1/audits/{auditId}/criteres/{auditCritereId}/axes` ; le projet utilise
partout `/api/v1/entreprises/{entrepriseId}/audits/{auditId}/...`, et
`AxeAmeliorationResource` existait déjà sous cette forme. Créer une seconde
convention aurait fait deux vocabulaires pour la même ressource.

| Méthode | Chemin | État |
|---|---|---|
| GET | `…/axes-amelioration` | **modifié** — nouveau filtre `?auditCritereId=` |
| GET | `…/axes-amelioration?statut=` | inchangé |
| GET | `…/axes-amelioration/{axeId}` | inchangé |
| POST | `…/axes-amelioration` | inchangé |
| POST | `…/axes-amelioration/{axeId}/validation` | **modifié** — passe par le service, 409 sur état terminal |
| POST | `…/axes-amelioration/{axeId}/rejet` | **modifié** — idem |

**Aucune route créée.** Le pattern `POST …/{id}/validation` est celui déjà
employé pour les évaluations et les exigences importées.

---

## 10. Frontend

**Créé** : `src/components/audit/AxesAmelioration.jsx`.
**Modifié** : `src/pages/CritereEvaluation.jsx` (import, une prop, insertion du
bloc).

**Non touchés** : Sidebar, Header, vitrine, pages marketing, Layout.

Composants réutilisés : `Alerte`, `Badge`, `Loader`, `Vide`, `SustwayLoader`,
classes `btn-primary` / `btn-secondary` / `btn-ghost` / `input` / `label`.
**Aucune bibliothèque ajoutée.**

États couverts : chargement, erreur, vide, proposition, validé, rejeté (avec
motif), confirmation avant rejet, **motif obligatoire** (bouton désactivé tant
que le motif est vide, en plus du contrôle serveur).

### Un point d'attention traité

Les boutons de décision sont conditionnés à `peut('audit:modifier', formuleCode)`.
La **formule est passée explicitement** : côté frontend, `audit:modifier` est
retirée en formule `FREE`. Sans elle, le bouton se serait affiché pour un
compte `RESPONSABLE_ENTREPRISE` en FREE que l'API aurait refusé par 403 — une
promesse non tenue.

**Aucun écran de planification n'a été créé.**

---

## 11. Tests

### Résultat — suite Java complète

```
[INFO] Tests run: 23, Failures: 0, Errors: 0, Skipped: 0 -- in ...amelioration.CycleVieAxeTest
[INFO] Tests run: 14, Failures: 0, Errors: 0, Skipped: 0 -- in ...resource.AxesApiSecuriteTest
[INFO] Tests run: 11, Failures: 0, Errors: 0, Skipped: 0 -- in ...resource.NonConformeRaisonnementIaTest
[INFO] Tests run: 23, Failures: 0, Errors: 0, Skipped: 0 -- in ...resource.IsolationMultiTenantTest
[INFO] Tests run: 27, Failures: 0, Errors: 0, Skipped: 0 -- in ...domain.rules.ScoringEngineTest
[INFO]
[INFO] Tests run: 471, Failures: 0, Errors: 0, Skipped: 0
[INFO] BUILD SUCCESS
```

434 avant la phase → **471 après**. `Skipped: 0` : le test de version du
référentiel n'a pas été ignoré, donc le cas d'une cible relevant d'une autre
version a bien été construit et son refus effectivement démontré.

### Python — inchangé

```
280 passed, 64 deselected, 1 warning in 9.76s
```

Les 64 tests à appel Gemini réel restent soumis au quota du palier gratuit
(constat de la phase 5.8.3, inchangé) ; aucun fichier Python n'a été modifié
ici.

### Frontend

```
✓ 1964 modules transformed.
✓ built in 5.97s
```

**37 tests ajoutés**, répartis en deux classes.

### `CycleVieAxeTest` — 23 cas (service métier)

Création (5) : naissance `PROPOSE` + provenance, axe sans non-conformité,
plusieurs axes par critère, libellé vide → libellé par défaut.
Déduplication (7) : identique, casse, espaces, libellé original conservé,
formulations différentes coexistantes, portée limitée au critère, empreinte.
Validation (1), Rejet (2), Transitions refusées (4), Version du référentiel (2),
Immutabilité du catalogue (1), Journalisation (2).

### `AxesApiSecuriteTest` — 14 cas (REST)

Restitution (3), isolation multi-tenant et IDOR (3), décisions par l'API (4),
D1 (2), historique et filtres (2).

### Couverture des 33 cas demandés

| Cas demandé | Test |
|---|---|
| 1–7 création | `unAxeIaNaitProposeEtGardeSaProvenance`, `unAxeExisteSansAucuneNonConformite`, `plusieursAxesCoexistentSurUnMemeCritere`, `unRattachementDeLaMemeVersionEstAccepte` |
| 8–12 déduplication | les 7 tests de la section dédiée |
| 13–16 validation | `unAxeProposeDevientValideAvecSonDecideurEtSaDate`, `leCycleProposeValideSeJoueParLApi` |
| 17–19 rejet | `unAxeProposeDevientRejeteAvecSonMotif`, `unRejetSansMotifEstRefuse` |
| 20–23 transitions invalides | `unAxeValideNePeutPlusEtreRejete`, `unAxeRejeteNePeutPlusEtreValide`, `uneSecondeValidationEstRefusee`, `unSecondRejetEstRefuse` |
| 24–28 sécurité | les 6 tests d'isolation et de D1 |
| 29–30 référentiel | `unRattachementDeLaMemeVersionEstAccepte`, `unRattachementVersUneAutreVersionEstRefuse` |
| 31–33 journal | `chaqueDecisionLaisseUneTraceAuJournal`, `unDoublonIgnoreEstJournalise` |

Le test de version est écrit avec `assumeTrue` : si le jeu de données ne
contient aucune cible d'une autre version, il est **signalé comme ignoré**, pas
compté comme réussi. Fabriquer une version de référentiel pour les besoins du
test reviendrait à modifier le catalogue.

---

## 12. Données avant / après

| Mesure | Avant | Après |
|---|---|---|
| `axe_amelioration` | 4 | **4** |
| dont `PROPOSE` | 4 | **4** |
| `plan_action` | 0 | **0** |
| `action_plan` | 0 | **0** |
| `action_axe` | 0 | **0** |
| `action_corrective` | 2 | **2** |
| `non_conforme` | 39 | **39** |
| dont courantes | 22 | **22** |
| dont historiques | 17 | **17** |
| `evaluation` | 46 | **46** |
| Somme de contrôle historique | `df9d6f5d…6989` | **`df9d6f5d…6989`** |
| Dernière migration | 70 | **70** |

**Les 4 axes historiques sont conservés, leurs statuts inchangés.** Aucune
migration de nettoyage, aucune transformation des 23 `pistes_amelioration` en
axes supplémentaires.

La divergence `pistes_amelioration = 23` / `axe_amelioration = 4` **reste
documentée et non résolue** : sa convergence relève d'une décision dédiée.

---

## 13. Migrations

**AUCUNE.** Le schéma V70 reste la dernière migration.

Justification (étape préalable obligatoire) : l'inspection du schéma a montré
que les 21 colonnes de `axe_amelioration`, les enums `origine_axe`,
`statut_axe`, `niveau_rattachement` et les quatre CHECK couvraient l'intégralité
du besoin. Créer une migration aurait été ajouter sans nécessité.

---

## 14. Impacts Python

**Aucun.** `git diff --stat -- services-ia-python` est identique à son état
d'avant la phase (9 fichiers, +82/−39, hérités des phases 5.6–5.8.2).

Non modifiés : agents Document / Evidence / Risk / Recommendation, prompts,
modèles Gemini, contrats Pydantic, orchestration V2. Les axes consomment les
`pistes_amelioration` et les `actions[]` **déjà produites**.

---

## 15. Impacts PlanAction

**Aucun.** Ni `PlanAction`, ni `ActionPlan`, ni `ActionCorrective` n'ont été
touchés. Aucune relation directe axe → plan n'a été créée : conformément à D6 et
à la cartographie, le modèle ne prévoit que le chemin
`axe ← action_axe → action_plan → plan_action`.

Un axe validé devient simplement **disponible** pour une phase ultérieure.

---

## 16. Gaps restants

### MAJEURS

**G1 — La déduplication ne couvre pas la saisie manuelle.**
`AxeAmeliorationResource.creer` crée sans passer par `proposerParIa`. Un
humain peut donc saisir un libellé identique à un axe existant. Choix
délibéré : une saisie manuelle est un acte intentionnel, et refuser
silencieusement la saisie de quelqu'un serait plus déroutant qu'un doublon
visible. À arbitrer (voir §17, D19).

**G2 — Deux formulations du même conseil coexistent.** Limite assumée de la
règle V1 (§6). Aucune déduplication sémantique n'est prévue.

**G3 — `pistes_amelioration` (23) et `axe_amelioration` (4) restent
divergents.** Aucun invariant ne les lie ; la convergence n'est pas traitée.

**G4 — `evaluation_id` reste en `ON DELETE SET NULL`.** La provenance d'un axe
devient inaudible si l'évaluation disparaît. Hors périmètre (impliquerait une
migration).

### MOYENS

**G5 — Pas de notion d'« axe qui me concerne ».** Le collaborateur voit tous
les axes de la mission. `responsable_id` n'existe pas sur l'axe.

**G6 — Le filtre `statut` s'applique en mémoire** après chargement, et non en
base, lorsqu'il est combiné à `auditCritereId`. Sans effet à ces volumes ;
à revoir si un critère portait des centaines d'axes.

**G7 — Aucune infrastructure de test frontend.** Le composant
`AxesAmelioration.jsx` n'est couvert par aucun test automatisé ; seul le build
est vérifié. Constat inchangé depuis 5.8.2.

### MINEURS

**G8 — Troncature silencieuse du libellé à 255 caractères**, sans report dans
`description`.

**G9 — `referenceRattachement`** rend un code pour l'exigence et la règle, mais
un libellé pour la preuve attendue.

**G10 — `PLAN_ACTION_MODIFIE`** recouvre toujours trois gestes distincts (hors
périmètre).

### Anomalie hors périmètre relevée, non corrigée

**G11 — La transition `VALIDE → REJETE` était possible sur les plans aussi.**
`PUT /plans-action/{planId}/statut` accepte n'importe quelle transition, y
compris `CLOTURE → BROUILLON`. Documenté en 5.8.3, **non corrigé** ici :
`PlanAction` est explicitement hors périmètre.

---

## 17. Décisions nécessitant encore arbitrage

| # | Question | Enjeu |
|---|---|---|
| **D19** | La saisie manuelle doit-elle être dédupliquée comme la création IA ? | G1 — refuser une saisie intentionnelle vs. laisser entrer un doublon |
| **D20** | Que faire des 19 pistes sans axe correspondant ? | G3 — les convertir, ou acter que pistes et axes ne se recouvrent pas |
| **D21** | Un axe doit-il porter un responsable ? | G5 — condition d'un filtrage « ce qui me concerne » |
| **D17 (suite)** | Faut-il une contrainte de base derrière la règle V1 ? | Aujourd'hui la déduplication est applicative ; un `INSERT` direct la contourne |
| **D11** (ouverte depuis 5.8.3) | Qui valide un axe ? `audit:modifier` inclut `RESPONSABLE_ENTREPRISE`, alors qu'`evaluation:valider` est réservé à `SUPER_ADMIN` | Asymétrie assumée ou à resserrer |

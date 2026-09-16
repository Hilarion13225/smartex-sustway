# SMARTEX SUSTWAY — Validation navigateur P0/P1/P2/P2.1

**Date** : 2026-09-16
**Pilote** : Chrome headless 152 via DevTools Protocol, sans installation
**Rôles testés** : SUPER_ADMIN, RESPONSABLE_ENTREPRISE, COLLABORATEUR
**Nature** : validation — aucun code, aucune base, aucune API, aucune route,
aucune permission modifiés ; aucun commit

---

```text
PHASE UX — VALIDATION NAVIGATEUR P0/P1/P2/P2.1

Résultat global :
READY_WITH_RESERVES

18 tests exécutés, 17 PASS, 1 PASS PARTIEL, 1 NON OBSERVABLE.
Une anomalie fonctionnelle réelle a été trouvée sur le 404 applicatif (P1.4) :
elle ne bloque pas l'usage mais prive la correction de son cas le plus courant.

Tests :
- T01 navigation COLLABORATEUR ................. PASS
- T02 navigation RESPONSABLE_ENTREPRISE ........ PASS
- T03 navigation SUPER_ADMIN ................... PASS
- T04 breadcrumbs .............................. PASS
- T05 noms réels des missions .................. PASS
- T06 Périmètre applicable ..................... PASS
- T07 critères EN_REVUE ........................ PASS
- T08 PipelineIA — score disponible ............ PASS
- T09 PipelineIA — score = 0 ................... PASS
- T10 PipelineIA — score indisponible .......... PASS
- T11 dashboard ................................ PASS
- T12 missions ANNULE .......................... NON OBSERVABLE
- T13 multi-organisations SUPER_ADMIN .......... PASS
- T14 404 hors /app ............................ PASS (acquis, non rejoué)
- T15 garde de route /app sans session ......... PASS (acquis, non rejoué)
- T16 états d'erreur ........................... PASS
- T17 Journal / pagination ..................... PASS
- T18 grille 4 vignettes ....................... PASS
- T19 responsive 1440 / 768 / 390 .............. PASS
- T20 404 dans /app (P1.4) ..................... PASS PARTIEL  ← anomalie A-7

Par rôle :
- COLLABORATEUR ............ PASS — 7 entrées de menu, « Périmètre applicable »
                             présent, « Questionnaire » disparu, aucune entrée
                             hors périmètre. Réserve : voir A-9.
- RESPONSABLE_ENTREPRISE ... PASS — 13 entrées, « Référentiels » correctement
                             masqué (permission absente), fils d'Ariane sans
                             niveau d'organisation (mono-organisation).
- SUPER_ADMIN .............. PASS — 18 entrées, tableau de bord transverse sur
                             5 organisations, fils d'Ariane avec organisation.

Responsive :
- 1440px : PASS — 4 vignettes sur 1 ligne, fil d'Ariane à 4 niveaux sur 1 ligne,
           aucun débordement sur les 12 pages mesurées.
- 768px  : PASS — vignettes 2×2, aucun débordement (768/768).
- 390px  : PASS — vignettes en colonne, fil d'Ariane replié, aucun débordement
           (390/390) sur PipelineIA, AuditScore, NonConformites, Questionnaire.

Console :
- Aucune erreur ni exception sur l'ensemble des pages applicatives testées.
- Deux exceptions attendues : 404 d'API sur une organisation inexistante (A-7),
  et 403 d'API sur /app/referentiels en COLLABORATEUR (A-9).

Overflow horizontal :
- Aucun. scrollWidth = clientWidth sur toutes les pages, à toutes les largeurs.

Anomalies :
1. A-7 — /app/{segment-inconnu} n'affiche pas PageIntrouvable (nouvelle, réelle)
2. A-8 — Troncature du détail des vignettes à 4 colonnes (nouvelle, cosmétique)
3. A-9 — /app/referentiels atteignable par URL directe en COLLABORATEUR (à arbitrer)
4. A-3 — Aucune mission ANNULE en base (connue, bloque T12)
5. A-1 — HMR non fiable via le bind-mount Docker/Windows (connue, corrigée)

Régressions :
- Aucune. Aucun comportement P0/P1/P2 antérieur n'a été trouvé dégradé.

Tests non observables :
- T12 (missions ANNULE) : aucune donnée en base ; en créer une modifierait la
  base, ce qui est interdit.

Conclusion :
Toutes les corrections P0, P1, P2 et P2.1 sont observées et fonctionnent, y
compris les trois états de PipelineIA et la grille à 4 colonnes. Le verdict
n'est pas READY_FOR_UX_P3 parce que A-7 prive P1.4 de son cas le plus courant :
une faute de frappe sur un seul segment d'URL ne mène pas à la page introuvable.
```

---

# 1. Les corrections, une par une

## P0

| ID | Objet | Résultat | Observation |
|---|---|---|---|
| **C-1** | Fil d'Ariane sur 3 pages | **PASS** | `AuditDetail`, `CritereEvaluation`, `AuditScore` : fils présents, hiérarchie correcte, liens exacts |
| **C-2** | « Questionnaire » → « Périmètre applicable » | **PASS** | Menu COLLABORATEUR : entrée « Périmètre applicable » dans le groupe RÉFÉRENCE ; « Questionnaire » absent. Titre de page : « Périmètre applicable » |
| **C-3** | Lien vers la fiche détaillée | **PASS** | `CritereEvaluation` atteinte, `h1` = « D6-92 — Publiez-vous un rapport de RSE… », fil `Missions › Campagne RSE 2026 › D6-92` |
| **C-4** | Alertes avant les compteurs | **PASS** | Ordre mesuré dans le DOM : « Missions à traiter » (pos. 514) → « Alertes prioritaires / Points nécessitant une attention immédiate » (1143) → vignettes « MISSIONS ACTIVES » (1374) |

Détail C-2, texte servi : *« Critères retenus pour Entreprise Test Evalue — la
criticité affichée est celle appliquée à ce secteur. C'est le périmètre que
figera la prochaine mission ; on répond aux critères depuis une mission. »*
Le rôle de la page et le renvoi vers les missions sont bien explicites.

## P1

| ID | Objet | Résultat | Observation |
|---|---|---|---|
| **P1.1** | Fil d'Ariane sur 5 pages | **PASS** | `AuditScore`, `Rapports`, `IndicePreparation`, `NonConformites`, `PlanAmeliorationDetail` — tous présents et corrects |
| **P1.2** | Portée des pages homonymes | **PASS** | `Rapports RSE` (organisation) affiche « Loc — toutes missions confondues… » ; `Rapports` (mission) reste distinct |
| **P1.3** | États d'erreur | **PASS** | voir T16 et T17 ci-dessous |
| **P1.4** | 404 dans `/app` | **PASS PARTIEL** | voir A-7 |

## P2 et P2.1

| ID | Objet | Résultat | Preuve observée |
|---|---|---|---|
| **F-05** | Organisation au fil d'Ariane | **PASS** | SUPER_ADMIN (11 organisations) : `Ivoiz › Missions › TEST VERIFICATION IA › Score`. RESPONSABLE (1 organisation) : `Missions › Campagne RSE 2026 — portefeuille test` — **aucun niveau d'organisation**, exactement comme spécifié |
| **F-07** | Libellés du menu | **PASS** | Infobulles relevées sur les 3 entrées, dans les 3 arbres : « Les écarts constatés, toutes missions confondues. », « Les actions qui traitent ces écarts. Elles naissent des non-conformités. », « Construits à partir des axes validés — distincts des actions correctives. ». Chez le COLLABORATEUR : « Le plan collectif et toutes ses actions, en lecture. » et « Les actions du plan dont vous êtes responsable. » |
| **F-08a** | Critères en revue | **PASS** | `AuditScore` de la mission Ivoiz : vignette « EN ATTENTE DE REVUE — 1 — Évaluations à valider avant d'entrer dans le score », ton violet. `PipelineIA` : vignette consolidée **et** colonne « EN REVUE » du tableau (valeurs 1 et 0). Sur une mission à 0 en revue : **rien ne s'affiche**, la grille reste à 3 vignettes |
| **F-16** | Nom réel de la mission | **PASS** | `NonConformites` : `Loc › Missions › Audit RSE annuel 2026 › Non-conformités`. `PlanAmeliorationDetail` : `ZZ-DEMO › Plans d'amélioration › ZZ-DEMO Mission 2026 › Renforcement de la gouvernance RSE`. **Aucune requête API supplémentaire** — le nom vient bien des missions déjà chargées par le `Layout` |
| **F-17** | Score indisponible ≠ zéro | **PASS** | voir T10 |
| **P2.1** | Grille 4 vignettes | **PASS** | voir T18 |

---

# 2. Les trois états de `PipelineIA`

## T08 — Score disponible · **PASS**

`/app/{ivoiz}/pipeline-ia`, sans blocage.

```
DOCUMENTS DÉPOSÉS 1 · CRITÈRES ÉVALUÉS 5 / 184 · NON ÉVALUÉS 178 · EN ATTENTE DE REVUE 1
Tableau : MISSION | ÉVALUÉS | NON ÉVALUÉS | EN REVUE
          TEST VERIFICATION IA …   0 / 92   91   1
          Campagne RSE 2026 …      5 / 92   87   0
```

Grille à **4 colonnes sur 1 ligne**. Graphique présent. Aucune erreur console.

## T09 — Score réellement nul · **PASS**

La mission « TEST VERIFICATION IA » porte `0 / 92` critères évalués et un score
global affiché `—` (aucune évaluation validée). Elle est bien **comptée** : le
dénominateur consolidé vaut 184, soit 92 + 92. Un vrai zéro reste donc un zéro
et participe aux totaux — c'est exactement la distinction que F-17 devait
préserver.

## T10 — Score indisponible · **PASS**

`/app/{ivoiz}/pipeline-ia` avec blocage réseau de
`*/api/v1/entreprises/*/audits/*/score`, strictement local à la session de test
et levé immédiatement après la mesure.

```
DOCUMENTS DÉPOSÉS 1 · CRITÈRES ÉVALUÉS 0 / 0 · NON ÉVALUÉS 0
« Le score de 2 missions n'a pas pu être chargé. Ces missions ne sont comptées
  ni dans les totaux ci-dessus ni dans le graphique ; elles figurent dans le
  tableau, avec « — » en place de leurs compteurs. »
Tableau : TEST VERIFICATION IA …  —  —
          Campagne RSE 2026 …     —  —
Graphique : absent
Grille : 3 colonnes (aucune vignette de revue, puisque aucun score chargé)
```

Les trois comportements attendus sont observés : **exclusion des totaux**,
**exclusion du graphique**, **`—` conservé dans le tableau**. Aucune erreur
console, aucun débordement.

> **Note de méthode.** Un premier essai utilisait le motif `*/score`. Il a rendu
> une page blanche — non pas à cause de l'application, mais parce que le
> filtrage de Chrome est par sous-chaîne : le motif bloquait aussi le module
> `src/lib/scoreAffiche.js`, empêchant l'application de démarrer. Le motif a été
> resserré et le test rejoué. L'erreur était dans mon protocole, pas dans le
> produit — je le consigne pour qu'il ne soit pas reproduit.

---

# 3. États d'erreur

## T16 — `RapportsEntreprise` · **PASS**

`/app/{loc}/rapports`, appel `*/audits` bloqué :

> « Impossible de joindre le serveur — vérifiez que l'API tourne (mvn quarkus:dev). »

Le message d'erreur s'affiche, et **« Aucune mission pour l'instant » n'apparaît
pas**. C'est précisément le défaut que P1.3 visait : une panne d'API ne se
présente plus comme une absence de données.

## T17 — `Journal` · **PASS**

Nominal : 50 entrées chargées, 9 types d'action, tableau rempli.

En panne (`*/journal*` bloqué) :

```
ENTRÉES CHARGÉES 0 · TYPES D'ACTION 0 · DERNIÈRE ACTION —
« Impossible de joindre le serveur — vérifiez que l'API tourne… »
Bouton : « Réessayer »
```

Le message « Aucune entrée dans le journal pour cette entreprise » **n'est pas
affiché** — la fin de liste et l'échec de chargement sont bien distingués. Le
bouton porte « Réessayer » et non « Charger plus d'entrées », donc la pagination
n'a pas progressé.

---

# 4. Grille et responsive

## T18 — Grille 4 vignettes · **PASS**

Mesures prises **sur les pages réelles**, `gridTemplateColumns` calculé :

| Page / cas | Largeur | Colonnes | Lignes | Classes |
|---|---|---|---|---|
| `AuditScore`, 4 vignettes | 1440 | **4** | **1** | `…lg:grid-cols-3 xl:grid-cols-4` |
| `AuditScore`, 3 vignettes | 1440 | 3 | 1 | `…lg:grid-cols-3` (pas de `xl:`) |
| `PipelineIA`, 4 vignettes | 1440 | **4** | **1** | `…lg:grid-cols-3 xl:grid-cols-4` |
| `PipelineIA`, 4 vignettes | 768 | 2 | 2 | idem |
| `PipelineIA`, 4 vignettes | 390 | 1 | 4 | idem |
| `AuditScore`, 4 vignettes | 390 | 1 | 4 | idem |

La quatrième colonne n'apparaît que lorsque la quatrième vignette est présente,
et l'anomalie de vignette orpheline est résolue : **une seule ligne à 1440 px**.

## T19 — Responsive · **PASS**

Aucun débordement horizontal (`scrollWidth = clientWidth`) sur les 12 pages
mesurées, aux trois largeurs. Le fil d'Ariane à quatre niveaux tient sur une
ligne à 1440 px et se replie proprement à 390 px, sur `AuditScore` comme sur
`NonConformites`. La barre latérale du COLLABORATEUR se replie correctement.

---

# 5. Anomalies

## A-7 — `/app/{segment-inconnu}` n'affiche pas `PageIntrouvable` · **nouvelle, réelle**

| | |
|---|---|
| Page | routage `App.jsx` |
| Parcours | tous |
| Rôle | tous |
| Sévérité | moyenne — n'empêche rien, mais prive P1.4 de son cas principal |

**Comportement observé**, en SUPER_ADMIN authentifié :

| URL testée | Résultat |
|---|---|
| `/app/zzz-inconnu` | « **Entreprise introuvable ou non accessible.** » — pas la page 404, aucun chemin de retour proposé, 3 erreurs 404 d'API en console |
| `/app/page-qui-nexiste-pas` | idem |
| `/app/zzz/yyy/xxx` | **`Page introuvable`** ✔ avec l'adresse demandée et le retour au tableau de bord |
| `/app/{org}/audits/zzz/rubrique-inconnue` | **`Page introuvable`** ✔ |

**Cause.** Dans `App.jsx`, la route dynamique `:entrepriseId` précède la route
attrape-tout et capte tout segment unique sous `/app`. `EntrepriseDetail` est
donc rendu avec un identifiant inexistant, et affiche son propre état vide. La
route `*` n'est atteinte que pour les chemins plus profonds.

**Conséquence.** La faute de frappe la plus courante — un seul segment erroné —
ne bénéficie pas de la correction P1.4. L'utilisateur voit un message d'absence
plutôt qu'une page d'orientation, et sans lien de retour.

**Correction proposée, non appliquée** : faire distinguer à `EntrepriseDetail`
l'organisation inconnue de l'organisation inaccessible, et rendre
`PageIntrouvable` dans le premier cas ; ou restreindre le segment `:entrepriseId`
au format UUID. La première voie est la moins risquée : elle ne touche pas au
routage.

## A-8 — Troncature du détail des vignettes à 4 colonnes · **nouvelle, cosmétique**

Sur `AuditScore` à 1440 px, la ligne de détail de chaque vignette est tronquée
plus tôt qu'auparavant : « Somme des notes / som… », « Aucune évaluation
lancé… », « Évaluations à valider ava… ». C'est la conséquence directe de P2.1 :
quatre cartes sur la largeur qui en portait trois. `StatCard` applique déjà
`truncate`, le comportement n'est donc pas nouveau, seulement plus visible.

Aucun débordement, aucune superposition. À arbitrer : soit accepter, soit
raccourcir les textes de détail, soit retirer `truncate` au profit d'un retour
à la ligne.

## A-9 — `/app/referentiels` atteignable en COLLABORATEUR · **nouvelle, à arbitrer**

Le lien est **correctement masqué** dans le menu du collaborateur — la règle de
permission fonctionne. Mais l'accès par URL directe rend la page, qui affiche
des compteurs de catalogue : 11 référentiels, 1 actif, 29 domaines, 108
critères. Deux appels d'API répondent 403, donc le serveur filtre bien une
partie des données.

Ce n'est pas une fuite de données client — il s'agit de métadonnées de
catalogue. Reste à décider si ce catalogue doit être lisible par ce rôle. Le
point est hors du périmètre UX P0/P1/P2 : aucune de ces phases n'a touché aux
permissions ni au routage de cette page.

## A-3 — Aucune mission ANNULE · **connue, bloque T12**

Statuts en base : BROUILLON=1, EN_COURS=4, TERMINE=2. Le tableau de bord
distingue correctement « En cours » et « Terminée » — observé sur les six
missions listées. Le filtrage des missions annulées reste vérifié dans le code
(`TableauDeBord` filtre `statut !== 'ANNULE'`) mais non observable.

## A-1 — HMR non fiable · **connue, corrigée**

Le watcher de Vite ne reçoit pas les événements à travers le bind-mount
Docker/Windows. Un `docker compose restart frontend-react` est nécessaire après
toute modification de `frontend-react/src`. À documenter dans le README, ou à
traiter par `server.watch.usePolling` dans `vite.config.js`.

---

# 6. Régressions

**Aucune.** Vérifié sur l'ensemble des parcours :

- les trois arbres de navigation rendent le nombre d'entrées attendu (18 / 13 / 7)
  et le filtrage par permission fonctionne — « Référentiels » est absent du menu
  du responsable comme du collaborateur ;
- les boutons « ← Retour » posés avant P0 coexistent avec les fils d'Ariane ;
- les pages homonymes restent distinctes, aucune n'a été fusionnée ;
- le score global affiche `—` et non `0` lorsqu'aucune évaluation n'est validée ;
- aucune erreur ni exception JavaScript sur les pages applicatives ;
- aucun débordement horizontal, à aucune largeur.

---

# 7. Méthode

Chrome 152 headless piloté par DevTools Protocol, sans aucune installation
(Node 24 fournit `WebSocket` nativement). Une session authentifiée par rôle,
ouverte par saisie réelle du formulaire de connexion — écriture via le setter
natif de `HTMLInputElement`, sans quoi React ignore la valeur.

Mesures collectées à chaque étape : chemin, `h1`, fil d'Ariane et ses liens,
entrées de menu et infobulles, vignettes et géométrie de leur grille, messages,
tableaux, boutons, `scrollWidth` / `clientWidth`, erreurs de console et
exceptions non capturées, capture PNG.

Les pannes ont été simulées par `Network.setBlockedURLs`, **strictement pendant
la navigation concernée et levées aussitôt** — aucun fichier, aucune
configuration, aucune donnée touchés.

Les identifiants ont été transmis par variables d'environnement en préfixe de
commande. Ils n'apparaissent dans aucun fichier, aucune capture, aucun journal,
ni dans ce rapport.

---

# 8. Ce qu'il reste à faire

1. **Arbitrer A-7** — c'est la seule anomalie fonctionnelle. Elle appelle une
   correction P2.2 de quelques lignes.
2. **Arbitrer A-8** — cosmétique, peut être laissée en l'état.
3. **Arbitrer A-9** — question de permissions, hors périmètre UX.
4. **Rejouer T12** lorsqu'une mission annulée existera.

Une fois A-7 tranchée, le verdict `READY_FOR_UX_P3` pourra être prononcé.

---

**Aucun fichier de code modifié. Aucune écriture en base. Aucun commit, aucun
push.** Les seules écritures sont ce rapport et des captures PNG dans le
répertoire temporaire de session.

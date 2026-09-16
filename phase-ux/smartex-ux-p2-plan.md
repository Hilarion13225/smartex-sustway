# SMARTEX SUSTWAY — Plan d'implémentation UX P2

**Date** : 2026-09-16
**Source** : `phase-ux/smartex-ux-p2-audit.md`
**Périmètre** : `frontend-react/src` uniquement
**Statut** : plan — **rien n'est implémenté à ce stade**

Cinq sujets retenus : **F-16**, **F-05**, **F-17**, **F-08a**, **F-07**.
Aucun ne demande de route, d'endpoint, de composant ni de donnée nouvelle.

---

# Ordre d'implémentation

L'ordre suit la règle du brief — gain d'abord, risque et dépendance ensuite —
avec une contrainte de précédence réelle : **F-16 ouvre le canal de données que
F-05 et F-08a réutilisent**, et doit donc passer en premier.

| Rang | ID | Pourquoi ici |
|---|---|---|
| 1 | **F-16** | Établit le partage `Layout → Outlet`. Sans lui, F-05 reste incomplet sur 2 pages. Un seul fichier de plomberie, deux pages consommatrices. |
| 2 | **F-05** | Se pose sur les mêmes fils d'Ariane que F-16. Les traiter séparément ferait passer deux fois sur les 7 mêmes blocs. |
| 3 | **F-17** | Gain de justesse le plus fort du lot, sur des fichiers déjà touchés en P1, sans dépendance. |
| 4 | **F-08a** | Même nature que F-17 (une donnée déjà chargée qu'on cesse d'ignorer), mais touche 3 pages au lieu d'une. |
| 5 | **F-07** | Le plus simple, mais dans `Layout.jsx` — le fichier le plus sensible du frontend. À faire quand le reste est stable. |

**Un palier de vérification après le rang 2 et un après le rang 5** :
`npx vite build` + `npm run lint` + relecture du diff. Inutile d'en faire un
après chaque sujet.

---

# F-16 — Nommer la mission dans les fils d'Ariane génériques

## Objectif

Remplacer le libellé « Mission » par le nom réel, **sans aucun appel API
supplémentaire**, en exposant aux pages les missions que le `Layout` charge
déjà.

## Comportement actuel

`NonConformites.jsx:58` et `PlanAmeliorationDetail.jsx:159` affichent
`{ libelle: 'Mission', vers: /app/{entrepriseId}/audits/{auditId} }`. Le lien
est juste, le nom manque. Ni `NonConformeDto` ni `PlanActionDto` ne le portent.

## Comportement cible

Le fil affiche le nom réel dès que la liste des missions est disponible, et
retombe sur « Mission » sinon (premier rendu, organisation en cours de bascule,
mission hors de l'organisation courante). Le repli reste, il devient transitoire.

## Fichiers concernés

| Fichier | Nature |
|---|---|
| `src/components/Layout.jsx` | passer `context={{ missions: missionsCourantes }}` à l'`<Outlet />` (ligne 660) — **une ligne, aucune logique de chargement touchée** |
| `src/pages/NonConformites.jsx` | `useOutletContext()`, résolution par `id`, repli inchangé |
| `src/pages/PlanAmeliorationDetail.jsx` | idem |

## Routes

Aucune. `App.jsx` **ne doit pas être modifié**.

## Composants

`Breadcrumb.jsx` réutilisé sans modification. Aucun composant créé.

## Critères d'acceptation

1. Depuis la sidebar → « Non-conformités » d'une mission : le fil affiche le
   nom réel de la mission.
2. Sur `/app/{org}/audits/{id}/plans/{plan}` : le fil affiche le nom réel.
3. **Rechargement direct de l'URL** (F5) : le fil affiche « Mission » puis le
   nom réel, sans erreur ni saut de mise en page.
4. Une mission absente de `missionsCourantes` donne « Mission », **jamais le
   nom d'une autre mission** — la résolution se fait par `id` exact.
5. Aucune requête réseau supplémentaire dans l'onglet Réseau du navigateur,
   avant comme après.
6. `git diff` filtré sur `api.get|post|put|delete` : **vide**.

## Tests

- **Build / lint** : `npx vite build`, `npm run lint`.
- **Navigateur** : les 4 premiers critères, plus un F5 sur chaque page.
- **Rôles** : responsable (les deux pages) et collaborateur
  (`PlanAmeliorationDetail` via « Plans d'amélioration »).
- **Régression** : la recherche de l'en-tête et la cloche d'alertes
  fonctionnent toujours — elles consomment la même `missionsCourantes`.
- **Responsive** : fil sur deux lignes en largeur téléphone, sans débordement
  horizontal (`Breadcrumb` a déjà `flex-wrap` et `truncate`).

## Risques

- **Faible.** Le seul risque structurel est de casser l'`<Outlet />`, ce qui
  serait immédiatement visible : toutes les pages disparaîtraient.
- Piège à éviter : résoudre la mission par position dans le tableau. Par `id`
  uniquement.
- Piège à éviter : déplacer le chargement de `missionsCourantes` ou en changer
  la portée. **Ne rien toucher à l'effet `Layout:355-397`.**

---

# F-05 — Nommer l'organisation dans les fils d'Ariane

## Objectif

Donner au fil d'Ariane un premier niveau portant l'organisation, **pour les
comptes qui en ont plusieurs**.

## Comportement actuel

Les 7 fils commencent par « Missions » ou « Plans d'amélioration ». Sur un
compte multi-organisations, seule la sidebar indique laquelle est active.

## Comportement cible

Quand `entreprises.length > 1`, un niveau est ajouté en tête :
`{ libelle: entreprise.raisonSociale, vers: '/app/{entrepriseId}' }`.
En mono-organisation, **rien ne change** : ajouter un niveau constant sur tous
les écrans serait du bruit.

Cette condition est une donnée réelle (`useApiAuth().entreprises`), pas une
préférence : elle distingue exactement les comptes concernés.

## Fichiers concernés

7 pages, toutes déjà porteuses d'un `Breadcrumb` :

| Fichier | `entreprises` déjà lu ? |
|---|---|
| `src/pages/AuditDetail.jsx` | oui |
| `src/pages/AuditScore.jsx` | oui |
| `src/pages/NonConformites.jsx` | oui |
| `src/pages/PlanAmeliorationDetail.jsx` | oui |
| `src/pages/Rapports.jsx` | oui |
| `src/pages/CritereEvaluation.jsx` | non — `useApiAuth()` déjà importé (ligne 23), il suffit de déstructurer `entreprises` |
| `src/pages/IndicePreparation.jsx` | non — ajouter l'import de `useApiAuth` |

## Routes

Aucune.

## Composants

`Breadcrumb.jsx` inchangé. Il filtre déjà les éléments sans `libelle`, donc un
premier niveau conditionnel ne demande aucune adaptation du composant.

## Critères d'acceptation

1. Compte **multi-organisations** : les 7 pages affichent
   `{Organisation} › Missions › … `, et le premier niveau mène à
   `/app/{entrepriseId}`.
2. Compte **mono-organisation** : les 7 fils sont **identiques à aujourd'hui**.
3. Le dernier niveau reste non cliquable et porte `aria-current="page"`.
4. `PlanAmeliorationDetail` donne `{Organisation} › Plans d'amélioration ›
   {Mission} › {titre}` — quatre niveaux, cohérent avec le commentaire du
   composant qui prévoit ce cas.
5. Aucune requête réseau supplémentaire.

## Tests

- **Build / lint**.
- **Navigateur, deux comptes** : un SUPER_ADMIN multi-organisations et un
  responsable mono-organisation. Le second est le test de non-régression le
  plus important : son écran ne doit pas bouger.
- **Rôles / accès** : le fil ne doit jamais nommer une organisation absente de
  `entreprises` — c'est déjà garanti par `entreprises.find(...)`, qui rend
  `undefined`.
- **Responsive** : 4 niveaux en largeur téléphone → le fil passe à la ligne, la
  page ne défile pas horizontalement.
- **Régression** : les boutons « ← Retour » existants restent en place.

## Risques

- **Faible**, mais le plus étendu du lot : 7 fichiers.
- Piège à éviter : oublier la garde `entreprises.length > 1` et alourdir
  l'écran de tous les comptes mono-organisation.
- Piège à éviter : un fil à 4 niveaux qui déborde. `Breadcrumb` a déjà
  `flex-wrap` et `truncate` — à vérifier à l'œil, pas à corriger d'office.

---

# F-17 — `PipelineIA` : ne plus compter une absence comme un zéro

## Objectif

Cesser de faire passer une mission dont le score n'a pas pu être chargé pour
une mission à zéro, dans les compteurs et dans le graphique.

## Comportement actuel

Le `.catch(() => null)` par mission (`PipelineIA.jsx:35`) est **voulu et
conservé**. Mais :

- `PipelineIA.jsx:56-63` — les totaux ajoutent `score?.x ?? 0` : la vignette
  « Critères évalués — X / Y » est silencieusement sous-estimée ;
- `PipelineIA.jsx:98-99` — le graphique trace `?? 0` : la mission apparaît
  comme une barre à zéro, identique à une mission réellement non commencée ;
- le tableau, lui, affiche `—`, ce qui est correct mais n'explique rien.

## Comportement cible

La page compte les missions dont le score est `null` et le dit, une fois, en
clair — par exemple une mention sous les vignettes : *« Le score de N mission(s)
n'a pas pu être chargé ; ces missions ne sont pas comptées ci-dessus. »*

Le tableau conserve ses `—`. Le graphique reste inchangé **si** la mention
suffit à lever l'ambiguïté ; à défaut, distinguer visuellement ces missions.
À trancher à la lecture de l'écran, pas d'avance.

## Fichiers concernés

`src/pages/PipelineIA.jsx` — **seul fichier**.

## Routes

Aucune.

## Composants

`Alerte` et `StatCard` existants. Aucun composant créé.

## Critères d'acceptation

1. Toutes les missions chargées : **l'écran est identique à aujourd'hui**,
   aucune mention parasite.
2. Une mission dont `/score` échoue : la mention apparaît, avec le bon compte.
3. Le `.catch(() => [])` sur `/documents` (ligne 31) et le `.catch(() => null)`
   sur `/score` (ligne 35) sont **inchangés** — vérifiable au `git diff`.
4. L'`Alerte` d'erreur globale posée en P1 fonctionne toujours.
5. Aucun appel API ajouté ni retiré.

## Tests

- **Build / lint**.
- **Navigateur** : cas nominal, puis échec provoqué d'un `/score` (DevTools,
  blocage de requête) — la mention doit apparaître et le total rester cohérent.
- **États** : chargement / vide / erreur globale / erreur partielle, les quatre
  doivent rester distincts.
- **Régression** : le graphique et le tableau continuent d'afficher les
  missions correctement chargées.

## Risques

- **Très faible** — un seul fichier, aucune logique de chargement modifiée.
- Piège à éviter : « corriger » les deux `.catch` par mission. Ils sont
  intentionnels, l'audit P1 puis l'audit P2 l'ont tous deux établi.

---

# F-08a — Rendre visibles les évaluations en attente de revue

## Objectif

Afficher `nombreCriteresEnRevue`, servi par l'API et **aujourd'hui jamais lu
par le frontend**.

## Comportement actuel

`AuditScoreDto` porte `nombreCriteresEnRevue` (documenté dans
`AuditResource:405`). Recherche dans tout `frontend-react/src` : aucune
occurrence. Une évaluation en revue ne compte ni dans le score, ni parmi les
« non évalués » : elle est invisible.

## Comportement cible

Là où le score est déjà chargé, le nombre d'évaluations en attente de revue est
affiché quand il est supérieur à zéro :

| Page | Où | Objet `score` déjà disponible ? |
|---|---|---|
| `src/pages/AuditScore.jsx` | près des compteurs de critères | oui |
| `src/components/audit/SyntheseMission.jsx` | bandeau d'avancement, via la prop `score` déjà reçue | oui |
| `src/pages/PipelineIA.jsx` | colonne ou vignette | oui |

Quand le nombre vaut zéro, **rien n'est affiché** : un « 0 en attente » sur
chaque mission serait du bruit.

## Routes

Aucune.

## Composants

`StatCard` et `Badge` existants. Aucun composant créé.
`SyntheseMission` reçoit déjà `score` en prop — sa signature ne change pas.

## Critères d'acceptation

1. Une mission avec des évaluations `EN_REVUE` l'indique, avec le compte exact
   servi par l'API.
2. Une mission sans évaluation en revue n'affiche rien de plus qu'aujourd'hui.
3. Le libellé nomme l'attente sans la confondre avec « non évalué » — ces deux
   compteurs sont distincts côté API et doivent le rester à l'écran.
4. Le chiffre n'est **jamais recalculé côté client** : il est lu tel quel.
5. Aucun appel API ajouté.

## Tests

- **Build / lint**.
- **Navigateur** : une mission avec au moins une évaluation en revue (le
  pipeline V2 en produit — `PersistanceResultatV2Service:122`), et une sans.
- **Rôles** : `RESPONSABLE_ENTREPRISE` et `SUPER_ADMIN`. Vérifier que rien ne
  s'affiche différemment pour un collaborateur qui n'a pas accès à la revue.
- **Régression** : le score global, le taux d'avancement et le compteur
  « non évalués » sont inchangés.
- **Responsive** : la vignette ou le badge supplémentaire ne casse pas la
  grille en largeur téléphone.

## Risques

- **Faible**, mais le plus étendu en surface : 3 fichiers dont un composant
  partagé (`SyntheseMission`, utilisé par `AuditDetail`).
- Piège à éviter : additionner « en revue » et « non évalué ». Ce sont deux
  compteurs distincts, et les confondre ferait mentir le total.
- Piège à éviter : présenter ce compteur comme une **file d'attente
  actionnable**. Il n'y a aucun moyen, aujourd'hui, de lister *quelles*
  évaluations attendent — c'est F-08b, hors périmètre frontend.

---

# F-07 — Préciser les libellés du menu

## Objectif

Rendre lisible, depuis le menu seul, la différence entre écarts, actions
correctives et plans d'amélioration.

## Comportement actuel

```
GROUPES_AUDIT « Suivi »        Layout:116-118
GROUPES_ENTREPRISE « Audit »   Layout:166-171
  Non-conformités · Actions correctives · Plans d'amélioration

GROUPES_COLLABORATEUR          Layout:225-229
  Plans d'amélioration · Mes actions
```

Les pages se présentent bien une fois ouvertes (`PlanActions:161`,
`PlansAmelioration:115`, `MesActions:95`) ; c'est le menu qui ne distingue rien.

## Comportement cible

Des libellés qui portent leur portée, sans allonger au point d'être tronqués —
le rendu place `{lien.libelle}` dans un `<span class="truncate">`
(`Layout:549`). La formulation exacte est à arrêter à l'écran, sur les trois
navigations, pas décidée dans ce document.

Deux contraintes fermes :

- **Aucune page renommée.** Les `PageTitre` ne bougent pas ; seuls les libellés
  de navigation changent.
- **Aucune entrée ajoutée, retirée, fusionnée ou déplacée.** Ni regroupement,
  ni sous-menu nouveau.

## Fichiers concernés

`src/components/Layout.jsx` — **uniquement les tableaux de déclaration**
(`GROUPES_AUDIT`, `GROUPES_ENTREPRISE`, `GROUPES_COLLABORATEUR`). Le rendu, le
filtre de permissions et les effets de chargement ne sont pas touchés.

## Routes

Aucune. Les `chemin: (id) => …` restent identiques au caractère près.

## Critères d'acceptation

1. Les trois navigations restent structurellement identiques : mêmes groupes,
   mêmes entrées, mêmes cibles, même ordre.
2. Aucun libellé n'est tronqué dans la sidebar, en clair comme en sombre.
3. Le lien actif reste correctement mis en évidence (`NavLink`).
4. Les entrées soumises à permission (`rapport:consulter`,
   `bailleur:consulter`, `referentiel:administrer`) restent masquées pour qui
   n'a pas le droit.
5. `git diff` sur `Layout.jsx` ne touche que des chaînes `libelle`.

## Tests

- **Build / lint**.
- **Navigateur, trois rôles** : `SUPER_ADMIN`, `RESPONSABLE_ENTREPRISE`,
  `COLLABORATEUR` — c'est le seul sujet du lot où les trois arbres sont en jeu.
- **Accès par rôle** : vérifier qu'aucune entrée n'apparaît à un rôle qui ne la
  voyait pas.
- **Responsive** : sidebar repliée puis ouverte en largeur téléphone.
- **Régression** : navigation complète sur chaque entrée modifiée ; la sidebar
  porte aussi le sélecteur d'organisation et les groupes repliables.

## Risques

- **Modéré, par le fichier plus que par le changement.** `Layout.jsx` porte les
  trois arbres de navigation, le filtre de permissions, le sélecteur
  d'organisation et le chargement partagé des missions. Un `Layout` cassé casse
  tout l'espace applicatif.
- C'est pourquoi ce sujet est **en dernier**, alors qu'il est techniquement le
  plus simple.
- Piège à éviter : corriger un `chemin` « au passage ». Les cibles ne changent
  pas.

---

# Vérifications communes, en fin de phase

| Contrôle | Attendu |
|---|---|
| `npx vite build` | `BUILD=0` |
| `npm run lint` | `LINT=0` (l'avertissement `Landing.jsx:19` est préexistant) |
| `git diff src/App.jsx` | **vide** — aucun P2 ne touche au routage |
| `git diff src/auth/` | **vide** |
| `git diff` filtré sur `api.get\|post\|put\|delete\|patch` | **vide** |
| `git diff` sur `api-quarkus/` | **vide** pour cette phase |
| Fichiers créés | **aucun** — les cinq sujets réutilisent l'existant |

---

# Ce que ce plan ne fera pas

- **F-06** (parcours de mission en 7 étapes) — classé P3. Demande un arbitrage
  métier sur la définition des phases.
- **F-08b** (file des évaluations `EN_REVUE`) — dépendance backend. Aucun
  endpoint ne liste ces évaluations autrement que critère par critère.
- **F-10** (tableau de bord SUPER_ADMIN) — constat erroné, la vue transverse
  existe déjà.
- Toute modification du backend, de la base, des migrations, des référentiels,
  du scoring, de l'IA, de l'authentification, des permissions ou des routes.
- Toute fusion, suppression ou renommage de page.
- Tout second composant `Breadcrumb`, `Header`, `Logo` ou `Sidebar`.

Aucun commit, aucun push : ils resteront soumis à votre validation explicite.

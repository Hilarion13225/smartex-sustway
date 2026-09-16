# SMARTEX SUSTWAY — Rapport d'implémentation UX P2

**Date** : 2026-09-16
**Périmètre** : `frontend-react/src` uniquement
**Verdict** : `READY_FOR_UX_P3`

---

## A. Résumé

Les cinq P2 confirmés sont implémentés. `npx vite build` → **BUILD=0**,
`npm run lint` → **LINT=0** (un avertissement préexistant sur `Landing.jsx:19`,
fichier non touché), et **16 vérifications de logique sur 16** passent.

| ID | Sujet | État |
|---|---|---|
| F-16 | Nom réel de la mission dans les fils d'Ariane, sans appel API | Fait |
| F-05 | Organisation nommée dans les fils d'Ariane multi-organisations | Fait |
| F-08a | `nombreCriteresEnRevue` enfin exploité | Fait |
| F-17 | `PipelineIA` : une absence de score n'est plus un zéro | Fait |
| F-07 | Menu — distinction des écarts, actions correctives et plans | Fait |

### Correspondance des identifiants

Votre autorisation désigne **F-16 comme PipelineIA** et la réserve Breadcrumb
sans identifiant. Dans `smartex-ux-p2-audit.md` et `smartex-ux-p2-plan.md`,
c'est l'inverse : **F-16 = Breadcrumb** (réserve A) et **F-17 = PipelineIA**
(réserve B). Les deux sujets étant décrits en toutes lettres dans votre brief
(§ 4-5 pour PipelineIA, § 6 pour le Breadcrumb), les deux sont traités. Ce
rapport conserve les identifiants des documents de référence pour qu'il se
relise à côté d'eux.

### Ordre suivi

```
F-16 (Breadcrumb / Outlet)  →  F-05  →  F-08a  →  F-17 (PipelineIA)  →  F-07
```

F-16 passe en premier parce qu'il ouvre le canal `Layout → Outlet` et touche
les mêmes blocs de fil d'Ariane que F-05 : les traiter séparément aurait fait
passer deux fois sur les mêmes lignes. F-07 reste en dernier, comme prévu, parce
qu'il touche `Layout.jsx`. La part `PipelineIA` de F-08a a été faite dans la
même passe que F-17, pour ne pas réécrire deux fois le même fichier.

**Aucun appel API ajouté, retiré ou modifié.** Aucune route touchée.
Aucun composant créé. Aucun commit, aucun push.

---

## B. F-16 — Nom réel de la mission dans les fils d'Ariane

### Problème

`NonConformites` et `PlanAmeliorationDetail` affichaient le niveau générique
« Mission ». Ni `NonConformeDto` ni `PlanActionDto` ne portent le nom — seul
`auditId` est disponible — et l'audit P1 avait conclu qu'un appel API serait
nécessaire.

### Correction

L'audit P2 a établi que cette conclusion était fausse. `Layout.jsx` charge déjà
**toutes les missions de l'organisation courante avec leur nom**, une fois par
organisation, et les partage depuis toujours avec la recherche de l'en-tête et
la cloche d'alertes. L'`<Outlet />` n'exposait simplement rien.

```jsx
<Outlet context={{ missions: missionsCourantes }} />
```

Les deux pages lisent ce contexte et résolvent **par identifiant exact** :

```js
const { missions } = useOutletContext() ?? {};
const nomMission = (missions ?? []).find((m) => m.id === auditId)?.nom ?? 'Mission';
```

Aucune requête n'a été ajoutée : l'effet de chargement de `Layout` (lignes
355-397) n'a pas été touché, ni sa portée, ni ses dépendances.

### Fichiers

- `src/components/Layout.jsx` — l'`<Outlet />` porte un contexte (1 ligne + commentaire)
- `src/pages/NonConformites.jsx`
- `src/pages/PlanAmeliorationDetail.jsx`

### Avant / après

| Cas | Avant | Après |
|---|---|---|
| Mission de l'organisation courante | `Missions › Mission › Non-conformités` | `Missions › Audit RSE 2026 › Non-conformités` |
| Plan d'amélioration | `Plans d'amélioration › Mission › Refonte achats` | `Plans d'amélioration › Audit RSE 2026 › Refonte achats` |
| Liste pas encore chargée | `Mission` | `Mission` — repli conservé, devenu transitoire |
| Mission hors organisation courante | `Mission` | `Mission` — **jamais le nom d'une autre mission** |

Le repli n'affiche ni `undefined`, ni `null`, ni identifiant technique : c'est
la chaîne littérale `'Mission'`, garantie par le `?? 'Mission'` en fin
d'expression et vérifiée par les tests de logique (§ H).

---

## C. F-05 — L'organisation nommée dans le fil d'Ariane

### Problème

Les 7 fils d'Ariane posés en P0 et P1 commençaient tous par « Missions » ou
« Plans d'amélioration ». Aucun ne nommait l'organisation. Sur un compte
multi-organisations — en pratique le SUPER_ADMIN — rien dans la page ne
confirmait laquelle était active.

### Correction

Un premier niveau est ajouté, **et seulement pour les comptes qui suivent
plusieurs organisations** :

```jsx
entreprises.length > 1 && entreprise
  ? { libelle: entreprise.raisonSociale, vers: `/app/${entrepriseId}` }
  : null,
```

La condition est une donnée réelle (`useApiAuth().entreprises`, déjà en
mémoire), pas une préférence : elle isole exactement les comptes concernés. Un
utilisateur mono-organisation ne voit **aucun changement** — ajouter un niveau
constant sur tous ses écrans aurait été du bruit.

`Breadcrumb.jsx` n'a pas été modifié : il filtre déjà les éléments sans
`libelle`, donc un `null` conditionnel disparaît de lui-même. Le ternaire rend
toujours un objet ou `null`, jamais `false`.

### Fichiers

Les 7 pages porteuses d'un fil d'Ariane :

| Fichier | Adaptation |
|---|---|
| `src/pages/AuditDetail.jsx` | niveau ajouté (`entreprise` déjà résolu) |
| `src/pages/AuditScore.jsx` | idem |
| `src/pages/NonConformites.jsx` | idem |
| `src/pages/PlanAmeliorationDetail.jsx` | idem |
| `src/pages/Rapports.jsx` | idem |
| `src/pages/CritereEvaluation.jsx` | + `entreprises` déstructuré de `useApiAuth()` déjà importé |
| `src/pages/IndicePreparation.jsx` | + import de `useApiAuth` |

### Avant / après

| Compte | Avant | Après |
|---|---|---|
| Mono-organisation | `Missions › Audit 2026 › Score` | **identique** |
| Multi-organisations | `Missions › Audit 2026 › Score` | `Acme SA › Missions › Audit 2026 › Score` |
| `PlanAmeliorationDetail`, multi | 3 niveaux | `Acme SA › Plans d'amélioration › Audit 2026 › Refonte achats` |

---

## D. F-08a — Les critères en attente de revue

### Problème

`AuditScoreDto.nombreCriteresEnRevue` est servi par l'API et documenté
(`AuditResource:405`) : *« un critère dont l'évaluation attend une revue experte
ne participe pas encore au score — il est compté séparément »*. Une recherche
dans tout `frontend-react/src` ne trouvait **aucune occurrence** de ce champ.

Conséquence : une évaluation en revue ne comptait ni dans le score, ni parmi les
critères « non évalués ». Elle n'apparaissait nulle part, et une mission pouvait
sembler achevée alors qu'une décision restait à prendre.

### Correction

Le compteur est affiché aux trois endroits où l'objet `score` est **déjà**
chargé, et uniquement quand il est supérieur à zéro.

| Fichier | Forme |
|---|---|
| `src/pages/AuditScore.jsx` | 4ᵉ `StatCard` « En attente de revue », ton violet, icône `Hourglass` |
| `src/components/audit/SyntheseMission.jsx` | ligne « N en attente de revue » sous « X / Y critères évalués » |
| `src/pages/PipelineIA.jsx` | `StatCard` consolidée + colonne « En revue » dans le tableau |

Le ton violet reprend la convention déjà en place :
`CritereEvaluation.jsx:38` associe `EN_REVUE` à `violet`.

`SyntheseMission` reçoit déjà `score` en prop — **sa signature n'a pas changé**,
et `AuditDetail` n'a pas eu à être adapté pour cela.

Le chiffre est lu tel quel, jamais recalculé côté client, et n'est jamais
additionné aux « non évalués » : ce sont deux compteurs distincts côté API et
ils le restent à l'écran.

### Avant / après

| Cas | Avant | Après |
|---|---|---|
| `nombreCriteresEnRevue = 0` | rien | **rien — inchangé** |
| `nombreCriteresEnRevue = 7` | rien | « En attente de revue : 7 » |
| Champ absent de la réponse | — | traité comme 0, rien affiché |
| Colonne « En revue » du pipeline | absente | présente **seulement** si au moins une mission en a |

Ce qui n'a **pas** été fait : la file listant *quelles* évaluations attendent
(F-08b). Elle nécessiterait un appel par mission puis un appel par critère —
plusieurs centaines de requêtes par affichage. Elle reste une dépendance
backend, et n'a été contournée d'aucune façon.

---

## E. F-17 — `PipelineIA` : une absence de score n'est plus un zéro

### Problème

Le repli par mission `.catch(() => null)` est volontaire — les audits P1 et P2
l'ont tous deux établi — et n'a pas été touché. Mais deux endroits
transformaient ensuite ce `null` en zéro :

```js
// totaux
total: acc.total + (score?.nombreCriteresTotal ?? 0),
// graphique
data={lignes.map(({ score }) => score?.nombreCriteresEvalues ?? 0)}
```

Une mission dont le score n'avait pas pu être chargé contribuait donc `0 + 0`
aux compteurs — silencieusement amputés — et apparaissait comme une **barre à
zéro**, strictement identique à une mission réellement non commencée. Le
graphique étant ce qu'on lit en premier, c'était le point le plus trompeur de
la page.

### Correction

Les missions sans score sont mises de côté, comptées, et annoncées :

```js
const lignesAvecScore = (lignes ?? []).filter(({ score }) => score);
const scoresIndisponibles = (lignes ?? []).length - lignesAvecScore.length;
```

- **Totaux** : calculés sur `lignesAvecScore` uniquement. Un vrai zéro y entre
  normalement ; une absence n'y entre pas.
- **Graphique** : tracé sur `lignesAvecScore`. Une mission sans score en est
  **absente** plutôt que d'y figurer à zéro — un `null` Chart.js aurait laissé
  le libellé sur l'axe sans barre, ce qui se relit comme un zéro. Le sous-titre
  du bloc le précise quand c'est le cas. Le bloc n'est plus rendu si aucune
  mission n'a de score.
- **Mention explicite** : une `Alerte ton="ambre"` indique combien de missions
  sont écartées et où les retrouver.
- **Tableau** : **inchangé**. Le `—` y reste, il était correct.

Aucune donnée brute n'a été modifiée : `lignes` reste l'ensemble complet et
alimente toujours le tableau.

### Fichiers

`src/pages/PipelineIA.jsx` — seul fichier.

### Avant / après

| Cas | Avant | Après |
|---|---|---|
| Mission à **vrai zéro** (`0 / 92`) | comptée, barre à zéro | **identique** — un vrai zéro reste un zéro |
| Mission **sans score** | comptée `0+0`, barre à zéro | exclue des totaux et du graphique, `—` dans le tableau |
| Mention | aucune | « Le score de 2 missions n'a pas pu être chargé. Ces missions ne sont comptées ni dans les totaux ci-dessus ni dans le graphique ; elles figurent dans le tableau, avec « — » en place de leurs compteurs. » |
| Toutes missions chargées | — | **écran identique à avant**, aucune mention parasite |
| `.catch(() => [])` documents, `.catch(() => null)` score | replis voulus | **inchangés** |

---

## F. F-07 — Distinguer les écarts, les actions correctives et les plans

### Problème

Trois entrées voisines dans le menu, sans que rien n'explique leur différence :

```
GROUPES_AUDIT « Suivi »      Non-conformités · Actions correctives · Plans d'amélioration
GROUPES_ENTREPRISE « Audit » Non-conformités · Actions correctives · Plans d'amélioration
GROUPES_COLLABORATEUR        Plans d'amélioration · Mes actions
```

Leur différence tient à l'origine de ce qu'elles listent — un écart, la
correction d'un écart, un axe validé — et il fallait ouvrir chaque page pour la
découvrir.

### Correction

Un champ `description` a été ajouté aux entrées concernées dans les trois arbres
de navigation, et le rendu le porte via l'attribut `title` du `NavLink`.

| Entrée | Explication |
|---|---|
| Non-conformités | « Les écarts constatés, toutes missions confondues. » |
| Actions correctives | « Les actions qui traitent ces écarts. Elles naissent des non-conformités. » |
| Plans d'amélioration | « Construits à partir des axes validés — distincts des actions correctives. » |
| Plans d'amélioration *(collaborateur)* | « Le plan collectif et toutes ses actions, en lecture. » |
| Mes actions *(collaborateur)* | « Les actions du plan dont vous êtes responsable. » |

Les formulations reprennent ce que les pages disent déjà d'elles-mêmes
(`PlanActions:161`, `PlansAmelioration:115`, `MesActions:95`) : le menu et la
page racontent la même chose.

**Écart assumé par rapport au plan.** Le critère d'acceptation que j'avais écrit
disait : *« le `git diff` sur `Layout.jsx` ne touche que des chaînes
`libelle` »*. Il n'est pas tenu — une ligne du rendu est également modifiée,
`title={lien.description}`. La raison : le libellé est rendu dans un
`<span class="truncate">` d'environ 26 caractères utiles, où aucune explication
n'entre sans être coupée. Renommer « Non-conformités » aurait par ailleurs
décorrélé le menu du titre de la page, ce que votre brief interdit. L'attribut
`title` est le mécanisme **déjà employé dans ce même fichier** pour l'entrée
désactivée : il n'ajoute aucune structure et ne peut ni tronquer ni casser la
mise en page.

Sa limite, à dire clairement : un `title` ne s'affiche qu'au survol, donc pas au
doigt sur mobile. Le libellé reste inchangé dans ce cas — la dégradation est
silencieuse, jamais dégradante.

### Fichiers

`src/components/Layout.jsx` — seul fichier.

### Ce qui n'a pas bougé

Vérifié ligne à ligne sur le diff : **aucun `chemin`, aucun `vers`, aucune
`permission`** n'a changé. Aucune entrée ajoutée, retirée, fusionnée ou
déplacée. Aucun titre de page renommé. Les trois arbres gardent leurs groupes,
leur ordre et leur filtrage par rôle.

---

## G. Breadcrumb — résolution du nom de mission sans appel API

Point demandé explicitement (§ 6 de l'autorisation, réserve A du rapport P1).

**Ce qui rendait la chose possible** : `Layout.jsx:363` charge
`GET /api/v1/entreprises/{id}/audits` une fois par organisation, et le
commentaire qui l'accompagne dit déjà pourquoi : *« Chargées une fois par
organisation : la recherche de l'en-tête porte sur ces missions, et la cloche
compte leurs écarts encore ouverts. Sans cette collecte partagée, chacun des
deux ferait les mêmes appels de son côté. »* Le troisième consommateur — les
fils d'Ariane — a simplement été branché sur la même collecte.

**Ce qui a été écarté** : faire transiter le nom par le `state` du routeur
(`<Link state={{ nomMission }}>`). Cette voie ne fonctionne qu'à l'arrivée par
un lien et laisse le libellé générique sur un rechargement, un favori ou une URL
collée — un fil d'Ariane dont le contenu dépendrait du chemin d'arrivée.

**Ce qui reste générique, et pourquoi c'est correct** :

- le temps du premier chargement (`missionsCourantes` part vide) ;
- pendant une bascule d'organisation ;
- si la mission n'appartient pas à l'organisation courante.

Dans ces trois cas le fil affiche `Mission` — jamais `undefined`, jamais `null`,
jamais un UUID. La résolution se fait par **identifiant exact**, jamais par
position : à défaut de correspondance, mieux vaut un libellé générique qu'un
nom emprunté à une autre mission.

**Coût réseau** : nul. Aucune requête ajoutée, avant comme après.

---

## H. Tests

### Statique

| Contrôle | Résultat |
|---|---|
| `npx vite build` | **BUILD=0** |
| `npm run lint` | **LINT=0** — seul avertissement : `Landing.jsx:19` (`SMARTEX` importé non utilisé), **préexistant**, fichier non touché |

### Logique — 16 vérifications, 16 succès

La logique pure introduite a été rejouée hors React (script temporaire, hors
dépôt) :

```
F-16 — nom de mission
  ok   mission connue                    ok   mission inconnue -> repli
  ok   contexte absent -> repli          ok   liste vide -> repli
  ok   jamais par position
F-05 — niveau organisation
  ok   mono-organisation -> rien         ok   multi-organisations -> niveau
  ok   organisation inconnue -> rien     ok   fil mono
  ok   fil multi
F-17 / F-08a — PipelineIA
  ok   tout chargé                       ok   vrai zéro compté
  ok   score absent exclu du total       ok   score absent hors graphique
  ok   en revue agrégé                   ok   en revue absent du DTO -> 0

16 vérifications OK, 0 en échec
```

Les trois cas que vous avez demandé de distinguer sur `PipelineIA` — score réel,
score zéro, score indisponible — sont couverts par les trois premières
vérifications du bloc, et le vrai zéro reste bien compté.

### Contrats API

```
git diff -U0 -- frontend-react/src | grep -E "^[-+].*api\.(get|post|put|delete|patch)"
→ aucune ligne
```

Aucun appel ajouté, retiré ni modifié. Aucun endpoint créé.

### Vérification navigateur — **non effectuée**

À dire franchement : elle n'a pas eu lieu. La pile Docker tourne
(`api-quarkus`, `frontend-react`, `postgres`… tous `running`), mais le conteneur
`frontend-react` sert une image construite, qui ne contient pas ces
modifications ; la reconstruire aurait été un effet de bord non demandé, et
aucun pilotage de navigateur n'est disponible ici.

Restent donc à vérifier à l'œil, avant toute mise en service :

1. **`PipelineIA`** — une mission à vrai zéro, une mission dont `/score` échoue
   (blocage de requête via les outils de développement), et le cas nominal.
2. **Fils d'Ariane** — un compte mono-organisation (l'écran ne doit **pas**
   bouger) et un compte multi-organisations ; un `F5` sur
   `/app/{org}/audits/{id}/non-conformites` pour voir le repli puis le nom réel.
3. **Critères en revue** — une mission à 0 en revue (rien ne doit s'afficher) et
   une mission à N > 0.
4. **Menu** — les trois rôles `SUPER_ADMIN`, `RESPONSABLE_ENTREPRISE`,
   `COLLABORATEUR` ; survol des entrées pour l'explication, et vérification
   qu'aucune entrée n'apparaît à un rôle qui ne la voyait pas.
5. **Responsive** — un fil à 4 niveaux en largeur téléphone, et la grille de
   `PipelineIA` avec sa 4ᵉ vignette.

---

## I. Non-régression

| Domaine | État |
|---|---|
| Backend | **inchangé** — aucun fichier `api-quarkus/` touché en P2 |
| API / contrats | **inchangés** — `git diff` filtré sur `api.get\|post\|put\|delete\|patch` : vide |
| Base de données | **inchangée** |
| Migrations | **inchangées** |
| Permissions | **inchangées** — aucune ligne `permission:` du `Layout` modifiée, aucun appel à `peut()` touché |
| Scoring | **inchangé** — `nombreCriteresEnRevue` est lu, jamais recalculé |
| IA | **inchangée** |
| Statuts backend | **inchangés** |
| Routage (`App.jsx`) | **inchangé en P2** — son diff se limite aux 4 lignes de P1 (`PageIntrouvable`) |
| `src/auth/` | **inchangé** — diff vide |
| Pages | aucune supprimée, aucune fusionnée, aucune renommée |
| Composants | aucun créé ; `Breadcrumb`, `Alerte`, `StatCard`, `Badge`, `Tableau` réutilisés tels quels |
| `Breadcrumb.jsx` | **non modifié** |
| En-tête / barre latérale | structure inchangée ; un seul attribut ajouté au rendu d'un lien |
| Effet de chargement du `Layout` | **non touché** — `missionsCourantes` est exposée, pas rechargée |

### Points de vigilance signalés dans le brief

- **`PipelineIA`** — vrai zéro conservé, score indisponible distinct, graphique
  cohérent, tableau **non dégradé** (`—` préservé). Les deux `.catch` par
  mission sont intacts.
- **Breadcrumb** — nom réel si connu, repli propre sinon, aucun `undefined`,
  `null` ou identifiant technique.
- **Critères en revue** — rien à 0, information visible au-delà, aucune requête
  nouvelle, aucune file complète créée.
- **Navigation** — routes, permissions, en-tête et barre latérale inchangés.

---

## J. Fichiers modifiés

**Modifiés en P2 (10)**

| Fichier | Sujets | Diff |
|---|---|---|
| `src/components/Layout.jsx` | F-16, F-07 | +50 / −15 (dont P0) |
| `src/components/audit/SyntheseMission.jsx` | F-08a | +9 / −0 |
| `src/pages/PipelineIA.jsx` | F-17, F-08a | +89 / −26 (dont P1) |
| `src/pages/AuditScore.jsx` | F-05, F-08a | +28 / −1 (dont P1) |
| `src/pages/NonConformites.jsx` | F-16, F-05 | +23 / −2 (dont P1) |
| `src/pages/PlanAmeliorationDetail.jsx` | F-16, F-05 | +21 / −1 (dont P1) |
| `src/pages/CritereEvaluation.jsx` | F-05 | +21 / −1 (dont P0) |
| `src/pages/Rapports.jsx` | F-05 | +16 / −1 (dont P1) |
| `src/pages/IndicePreparation.jsx` | F-05 | +15 / −0 (dont P1) |
| `src/pages/AuditDetail.jsx` | F-05 | +11 / −0 (dont P0) |

**Créés en P2** : aucun.

**Non touchés en P2**, bien que présents au `git diff` — ils viennent de P0 ou
P1 : `App.jsx`, `AuditsListe.jsx`, `Journal.jsx`, `Questionnaire.jsx`,
`RapportsEntreprise.jsx`, `TableauDeBord.jsx`, `TableMissions.jsx`,
`SaisieCritereMission.jsx`, `Breadcrumb.jsx`, `PageIntrouvable.jsx`.

Aucun refactor global, aucun reformatage de masse, aucun fichier modifié sans
nécessité.

---

## K. Git

```
Branche         : main
Commit courant  : d1b8bb6  « Fusionne phase3c-catalogue-reel dans main (refonte vitrine conservee) »
Commits créés   : 0        (aucun depuis le début de la phase UX)
Push            : aucun
Working tree    : modifié, non indexé
```

Le working tree contient, **non commités** :

- les modifications frontend de P0, P1 et P2 ;
- les fichiers backend de la phase 3D (importeur 2.2, migration V75), **restés
  intacts** pendant toute cette phase ;
- les rapports `phase-ux/` et `phase3d/`.

Rien n'a été commité ni poussé, et la phase 3D n'a pas été reprise.

---

## L. Réserves

1. **La vérification navigateur reste à faire** (§ H). C'est la principale
   limite de ce rapport : la logique est vérifiée, le rendu ne l'est pas.
2. **L'explication du menu (F-07) ne s'affiche qu'au survol.** Sur mobile, les
   libellés restent ceux d'avant. Une version visible en permanence demanderait
   une seconde ligne dans la barre latérale — un changement de densité qui
   dépasse le périmètre P2.
3. **La 4ᵉ vignette d'`AuditScore` et de `PipelineIA`** s'ajoute à une grille
   prévue pour 3 colonnes : elle passe à la ligne sur grand écran. À valider à
   l'œil ; c'est le point le plus susceptible d'appeler un ajustement.
4. **F-08b reste ouvert.** Savoir *combien* d'évaluations attendent ne dit pas
   *lesquelles*. La file demande un endpoint côté API.

---

```text
P0 : VALIDÉ
P1 : VALIDÉ
P2 : 5 / 5 implémentés

Build : 0
Lint  : 0
Logique : 16 / 16

Verdict :
READY_FOR_UX_P3
```

Arrêt ici : pas de commit, pas de push, pas de P3.

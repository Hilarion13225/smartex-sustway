# SMARTEX SUSTWAY — Plan d'implémentation P1

> **Document de préparation. Aucun code n'a été écrit.**
>
> Fondé sur `smartex-ux-p1-audit.md`. Tous les composants cités **existent déjà**, à une
> exception près (la page 404). Aucune correction ne touche une API, une permission ou un
> statut.

---

# 1. Ordre d'implémentation

L'ordre suit la priorité demandée — blocage de parcours, puis risque d'erreur, puis
navigation, puis compréhension — et non la facilité technique.

| Rang | ID | Correction | Motif du rang |
|---|---|---|---|
| **1** | **P1.1** | Fil d'Ariane sur les 5 pages de mission | Achève le P0 · porte P1.2 |
| **2** | **P1.2** | Nommer la portée des pages homonymes | Se greffe sur P1.1 — même passage |
| **3** | **P1.3** | États d'erreur sur 3 pages | Risque le plus élevé, indépendant |
| **4** | **P1.4** | Page 404 dans l'espace applicatif | Rupture de parcours, indépendant |

**P1.1 avant P1.2** : le fil d'Ariane règle l'essentiel de l'ambiguïté de portée ; le
sous-titre ne fait que compléter. Les traiter dans l'ordre inverse ferait écrire deux fois la
même chose.

**P1.3 et P1.4 sont indépendants** — ils peuvent être menés dans n'importe quel ordre, ou en
parallèle.

---

# 2. P1.1 — Fil d'Ariane sur les pages de mission

## Problème

Le P0 a posé `Breadcrumb` sur `AuditDetail` et `CritereEvaluation`. **Cinq pages de portée
mission ne l'ont pas** — vérifié : `Breadcrumb=0`, `ArrowLeft=2` sur chacune. Elles ne nomment
ni la mission, ni l'organisation.

## Objectif

Qu'une page de mission dise toujours de quelle mission il s'agit, et permette d'y remonter en
un clic.

## Fichiers concernés

| Fichier | Route |
|---|---|
| `src/pages/AuditScore.jsx` | `/app/:e/audits/:a/score` |
| `src/pages/NonConformites.jsx` | `/app/:e/audits/:a/non-conformites` |
| `src/pages/Rapports.jsx` | `/app/:e/audits/:a/rapports` |
| `src/pages/IndicePreparation.jsx` | `/app/:e/audits/:a/indice-preparation` |
| `src/pages/PlanAmeliorationDetail.jsx` | `/app/:e/audits/:a/plans/:planId` |

**Aucune route n'est modifiée.**

## Composants réutilisables

| Composant | Statut |
|---|---|
| `src/components/Breadcrumb.jsx` | **existe** — livré au P0, aucune modification |

## Comportement attendu

```
AuditScore · NonConformites · Rapports · IndicePreparation
    Missions › [nom de la mission] › [nom de la page]

PlanAmeliorationDetail
    Missions › [nom de la mission] › Plans › [nom du plan]
```

Le dernier segment n'est pas cliquable. Les précédents mènent à `/app/:e/audits` et
`/app/:e/audits/:a`.

**Motif à reprendre de `CritereEvaluation`** : les quatre premières pages chargent déjà
l'objet `audit` — elles disposent de `audit.nom`. Tant qu'il n'est pas chargé, afficher
« Mission », comme le P0 l'a fait, plutôt que de laisser le fil apparaître puis changer.

**Les boutons « ← Retour » sont conservés.** Remonter d'un cran sans viser et sauter à un
niveau précis ne sont pas le même geste — c'est la règle posée au P0.

## Critères d'acceptation

```
Étant donné un responsable connecté sur une mission « Campagne RSE 2026 »,
quand il ouvre les non-conformités de cette mission,
alors un fil d'Ariane affiche « Missions › Campagne RSE 2026 › Non-conformités »
et le segment « Campagne RSE 2026 » le ramène au hub de la mission.
```

```
Étant donné un utilisateur sur la page de score d'une mission,
quand la mission n'est pas encore chargée,
alors le fil affiche « Missions › Mission › Score »
et ne disparaît pas une fois le nom connu.
```

```
Étant donné un utilisateur sur le détail d'un plan d'amélioration,
quand il clique sur le segment portant le nom de la mission,
alors il arrive sur le hub de cette mission, pas sur la liste des missions.
```

## Dépendances

Aucune. Le composant est livré et éprouvé par le build P0.

## Risque de régression

| Risque | Évaluation |
|---|---|
| Rupture de route | **Nul** — aucune route touchée |
| Rupture d'API | **Nul** — aucun appel ajouté ; `audit` est déjà chargé |
| Doublon de navigation | **Nul** — `Breadcrumb` est un `<nav>` sans état |
| Décalage visuel | **Faible** — le fil s'insère au-dessus de `PageTitre`, comme au P0 |
| `PlanAmeliorationDetail` | **À vérifier** — c'est la seule des cinq qui ait un quatrième niveau ; s'assurer qu'elle dispose bien du nom de la mission et non du seul `planId` |

---

# 3. P1.2 — Nommer la portée des pages homonymes

## Problème

`NonConformites.jsx:52` et `NonConformitesEntreprise.jsx:81` portent **le même titre** —
« Non-conformités ». `Rapports.jsx:129` dit « Rapports », `RapportsEntreprise.jsx:47`
« Rapports RSE » : rien ne dit laquelle agrège les missions.

## Objectif

Qu'un titre dise s'il porte sur une mission ou sur toutes.

## Fichiers concernés

| Fichier | Portée | Proposition |
|---|---|---|
| `src/pages/NonConformites.jsx` | mission | sous-titre : *« Écarts relevés sur cette mission »* |
| `src/pages/NonConformitesEntreprise.jsx` | entreprise | sous-titre : *« Toutes missions confondues »* |
| `src/pages/Rapports.jsx` | mission | sous-titre : *« Rapports de cette mission »* |
| `src/pages/RapportsEntreprise.jsx` | entreprise | sous-titre : *« Toutes missions confondues »* |

> `NonConformitesEntreprise.jsx:116` porte déjà *« Toutes missions confondues »* sur une carte
> interne — la formule existe, il s'agit de la remonter au titre.

**Les pages ne sont ni fusionnées, ni renommées, ni déplacées.** Les deux portées restent
distinctes, comme l'audit l'a établi.

## Composants réutilisables

`PageTitre` accepte déjà `description`. Aucun composant nouveau.

## Comportement attendu

Le titre reste inchangé ; la description précise la portée. Combinée au fil d'Ariane de P1.1,
la page de mission devient sans ambiguïté.

## Critères d'acceptation

```
Étant donné un responsable qui ouvre les non-conformités depuis le menu de gauche,
alors la page indique qu'elle couvre toutes les missions.
```

```
Étant donné le même responsable qui ouvre les non-conformités depuis une mission,
alors la page indique qu'elle ne couvre que cette mission,
et le fil d'Ariane la nomme.
```

## Dépendances

**P1.1** — à faire dans le même passage sur `NonConformites.jsx` et `Rapports.jsx`.

## Risque de régression

**Quasi nul** — modification de chaînes de caractères dans une prop existante.

---

# 4. P1.3 — États d'erreur sur trois pages

## Problème

Trois pages avalent leurs erreurs et affichent le résultat comme une absence de données :

```
Journal.jsx:48             .catch(() => setFinAtteinte(true))
PipelineIA.jsx:31          .catch(() => [])
PipelineIA.jsx:41          catch { }
RapportsEntreprise.jsx:31  .catch(() => setAudits([]))
```

Aucune des trois ne rend d'`Alerte` — vérifié : `Alerte=0` sur les trois.

**C'est le risque le plus élevé du lot** : `RapportsEntreprise` annoncerait « aucun rapport »
alors que les rapports existent.

## Objectif

Distinguer « il n'y a rien » de « ça n'a pas marché ».

## Fichiers concernés

| Fichier | Route |
|---|---|
| `src/pages/Journal.jsx` | `/app/:e/journal` |
| `src/pages/PipelineIA.jsx` | `/app/:e/pipeline-ia` |
| `src/pages/RapportsEntreprise.jsx` | `/app/:e/rapports` |

## Composants réutilisables

| Composant | Statut |
|---|---|
| `Alerte` de `src/components/ui.jsx` | **existe** — motif `<Alerte ton="rouge">{erreur}</Alerte>` employé dans la plupart des pages |
| `ApiError` de `src/lib/apiClient.js` | **existe** — porte un message exploitable |

**Motif de référence** : `AuditDetail.jsx` et `Questionnaire.jsx`, qui font déjà
`setErreur(err instanceof ApiError ? err.message : '…')` puis rendent l'alerte.

## Comportement attendu

| Situation | Affichage |
|---|---|
| Chargement | `Loader` — **inchangé** |
| Données vides | `Vide` — **inchangé** |
| **Échec de l'appel** | **`<Alerte ton="rouge">` avec le message de l'API** |

**Cas particulier de `Journal`** : `.catch(() => setFinAtteinte(true))` sert la pagination
progressive. Un échec y devient « fin de liste atteinte », ce qui est faux. Il faut distinguer
la fin réelle d'un échec — sans quoi l'utilisateur croit avoir tout lu.

**Cas particulier de `PipelineIA`** : les `.catch(() => [])` par mission sont **délibérés** —
une mission inaccessible ne doit pas faire échouer toute la page. Seul le `catch {}` global de
la ligne 41 doit rendre une erreur.

> Cette nuance compte : corriger les deux à l'identique dégraderait une tolérance voulue.

## Critères d'acceptation

```
Étant donné une API qui répond en erreur,
quand un responsable ouvre les rapports de son entreprise,
alors la page affiche un message d'erreur explicite,
et n'affiche pas « aucun rapport ».
```

```
Étant donné une entreprise qui n'a réellement aucun rapport,
quand le responsable ouvre la même page,
alors elle affiche l'état vide, sans message d'erreur.
```

```
Étant donné le pipeline IA sur une entreprise dont une mission est inaccessible,
alors les autres missions restent affichées,
et l'échec partiel ne masque pas la page.
```

## Dépendances

Aucune.

## Risque de régression

| Risque | Évaluation |
|---|---|
| Changement de comportement en nominal | **Nul** — la branche d'erreur n'est empruntée qu'en échec |
| Perte de la tolérance de `PipelineIA` | **Réel si l'on corrige sans discernement** — ne toucher que le `catch` global |
| Pagination de `Journal` | **À traiter avec soin** — distinguer fin de liste et échec |

---

# 5. P1.4 — Page 404 dans l'espace applicatif

## Problème

`App.jsx:132` — `<Route path="*" element={<Navigate to="/" replace />} />`. Une URL inconnue
**sous `/app`** renvoie à la vitrine. Neuf routes portent des paramètres : une mission
supprimée ou un lien périmé éjecte l'utilisateur hors de son espace de travail, sans
explication.

## Objectif

Qu'une adresse erronée dans l'application y laisse l'utilisateur, en lui disant ce qui s'est
passé.

## Fichiers concernés

| Fichier | Nature |
|---|---|
| `src/pages/PageIntrouvable.jsx` | **à créer** — seul fichier nouveau du P1 |
| `src/App.jsx` | **une route ajoutée** sous `/app` — aucune route existante modifiée |

> C'est la seule intervention du P1 sur `App.jsx`. Le P0 n'y avait pas touché.

## Composants réutilisables

`PageTitre`, `Vide` et les classes de bouton existantes. La page vit **dans le `Layout`** :
en-tête et navigation restent en place.

## Comportement attendu

```
/app/n-importe-quoi          →  page 404 DANS le Layout
/app/:e/audits/<id-inconnu>  →  page 404 DANS le Layout
/n-importe-quoi              →  vitrine  (comportement actuel, conservé)
```

La page propose deux issues : retour au tableau de bord, et retour aux missions.

**Ce qui n'est pas dans le périmètre** : intercepter un 404 d'API sur une mission inexistante.
C'est un autre sujet — la route est valide, c'est la ressource qui manque. Les pages rendent
déjà `<Vide message="Audit introuvable ou non accessible." />`. **À ne pas confondre.**

## Critères d'acceptation

```
Étant donné un utilisateur connecté,
quand il saisit une adresse inconnue commençant par /app,
alors il voit une page « introuvable » avec la navigation en place,
et il n'est pas renvoyé sur la vitrine.
```

```
Étant donné un utilisateur non connecté,
quand il saisit une adresse inconnue ne commençant pas par /app,
alors il est renvoyé sur la vitrine, comme aujourd'hui.
```

```
Étant donné un utilisateur qui ouvre une mission supprimée,
alors la page affiche « Audit introuvable ou non accessible »,
et non la page 404.
```

## Dépendances

Aucune.

## Risque de régression

| Risque | Évaluation |
|---|---|
| Capture des routes valides | **Le risque principal.** La route `*` doit être **imbriquée sous `/app`**, après toutes les autres ; une `*` mal placée capturerait des routes existantes |
| Redirection hors `/app` | **Nul** si la route globale `*` est conservée telle quelle |
| Route protégée | **Nul** — la nouvelle route est sous `RouteProtegee`, l'authentification s'applique |

> **Point de vigilance** : c'est la seule correction du P1 qui touche le fichier de routage.
> L'ordre des routes dans `App.jsx` est déjà commenté à un endroit (ligne 126, pour l'import de
> référentiel). Même prudence ici.

---

# 6. Stratégie de test

## Ce qui est disponible

| Moyen | Disponibilité |
|---|---|
| Build de production — `npx vite build` | **oui** |
| Lint — `npm run lint` *(oxlint)* | **oui** |
| Tests unitaires ou d'intégration | **aucun** — `package.json` ne déclare qu'un script `lint` |

**Aucune infrastructure de test ne sera créée** : cela sort du périmètre P1.

## Après chaque correction

| # | Contrôle | Attendu |
|---|---|---|
| 1 | `npx vite build` | exit 0 |
| 2 | `npm run lint` | pas d'avertissement nouveau — 1 avertissement préexistant sur `Landing.jsx:19` |
| 3 | `git diff App.jsx` | **vide, sauf P1.4** |
| 4 | `git diff src/auth/` | **vide** |
| 5 | `git diff` filtré sur `api.get|post|put|delete` | **aucune ligne** |

## Vérification manuelle — indispensable

Ni le build ni le lint ne disent quoi que ce soit du rendu. **Les parcours suivants doivent
être ouverts dans un navigateur** avant de considérer le P1 acquis :

| # | Parcours | Ce qu'il faut voir |
|---|---|---|
| 1 | Mission → Score → Non-conformités → Rapports | Le fil nomme la mission sur chacune, et y ramène |
| 2 | Menu → Non-conformités, puis mission → Non-conformités | Les deux portées se distinguent |
| 3 | Rapports d'entreprise, API coupée | Un message d'erreur, pas « aucun rapport » |
| 4 | Pipeline IA, une mission inaccessible | Les autres missions restent affichées |
| 5 | `/app/nimportequoi` | Page 404 avec la navigation |
| 6 | `/nimportequoi` | Vitrine |
| 7 | Mission supprimée | « Audit introuvable », pas la 404 |

## Non-régression à confirmer

| Périmètre | Attendu |
|---|---|
| Backend, base, migrations, API | **inchangés** |
| Permissions, authentification | **inchangées** |
| Scoring, IA, référentiels | **inchangés** |
| Statuts | **inchangés** — aucun statut créé ni renommé |
| Pages | **aucune supprimée** ; `NonConformites`/`NonConformitesEntreprise` et `Rapports`/`RapportsEntreprise` **non fusionnées** |
| Header, Logo, Sidebar | **non dupliqués** |
| Routes | **44 inchangées** + 1 ajoutée en P1.4 |

---

# 7. Récapitulatif

| ID | Correction | Fichiers | Nouveau fichier | Route modifiée |
|---|---|---|---|---|
| **P1.1** | Fil d'Ariane sur 5 pages de mission | 5 | non | non |
| **P1.2** | Portée des pages homonymes | 4 *(dont 2 partagées avec P1.1)* | non | non |
| **P1.3** | États d'erreur | 3 | non | non |
| **P1.4** | Page 404 applicative | 1 + `App.jsx` | **1** | **1 ajoutée** |

**Environ 11 fichiers touchés, 1 fichier créé, 1 route ajoutée.**

Aucune correction ne touche une API, une permission, un statut ou le backend. Trois des quatre
réutilisent des composants déjà livrés.

## Réserve maintenue

Le projet n'a **aucun test frontend**, et l'application n'a **jamais été ouverte dans un
navigateur** au cours des phases P0 et P1. Le build et le lint garantissent que le code
compile ; ils ne disent rien du rendu. La vérification manuelle du § 6 n'est pas un confort —
c'est la seule preuve disponible que ces corrections fonctionnent.

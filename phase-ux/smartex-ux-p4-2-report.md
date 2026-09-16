# SMARTEX SUSTWAY — P4.2, focus clavier

**Date** : 2026-09-16 · **Périmètre** : `src/index.css` — **1 fichier, 42 insertions, 0 suppression**

```text
PHASE UX P4.2 — FOCUS CLAVIER

Verdict :
READY_FOR_P4_3
```

---

# 1. Objectif

Donner à l'espace connecté un indicateur de focus clavier cohérent avec la
marque, là où il héritait de celui du navigateur — sans toucher à la vitrine,
qui possède déjà le sien, et sans dégrader l'accessibilité existante.

Il ne s'agissait pas de corriger un défaut bloquant : l'audit P4 avait établi
que **le focus était visible dans les deux univers**. Le problème était de
cohérence visuelle, pas d'accessibilité.

---

# 2. État avant

Mesuré au clavier réel (événements `Tab` envoyés par CDP, jamais `.focus()`
programmatique, qui ne déclenche pas `:focus-visible`) :

| Univers | Indicateur |
|---|---|
| Vitrine | `outline: solid 2px rgb(224, 122, 110)` — anneau de marque |
| **Application** | `outline: auto 1px rgb(16, 16, 16)` — **anneau par défaut du navigateur** |

L'anneau par défaut ne suit ni la marque ni le thème sombre, et change d'aspect
selon le navigateur.

---

# 3. Audit des règles existantes

## Ce qui définissait déjà un focus

| Règle | Portée | Effet |
|---|---|---|
| `index.css:506-513` | `.vitrine a, button, input, select, textarea` | `outline: 2px solid rgb(var(--brand-600)); outline-offset: 2px` |
| `index.css:516-522` | idem, sous `.dark` | `outline-color: rgb(var(--brand-400))` |
| `index.css:603, 639` | `.vitrine iframe`, `.vitrine .lien-trait` | cas particuliers de la vitrine |
| `.input` | 153 usages | `outline-none` **remplacé par** `focus:border-brand-500 focus:ring-2 focus:ring-brand-100` |
| `.champ-auth`, `.champ-sidebar` | champs d'authentification et de barre latérale | même motif, `focus:ring-4` |

**Découverte importante** : `.vitrine` est posée par `LayoutPublic.jsx:32` **et
par `CadreAuth.jsx:24`** — les pages d'authentification sont donc vitrine. Elles
conservent l'anneau existant sans intervention.

## Ce qui neutralisait l'outline

Tailwind traduit `outline-none` par `outline: 2px solid transparent`, et non par
`outline-style: none`. Six éléments de l'application le portent, **tous des
champs de formulaire, aucun bouton ni lien** :

| Élément | Remplacement au focus |
|---|---|
| `CarteCritere.jsx:120` — zone de texte | `focus:ring-4 focus:border-brand-400` ✔ |
| `EnTeteApp.jsx:125` — recherche d'en-tête | `focus:ring-4 focus:border-brand-400` ✔ |
| `SaisieCodeOtp.jsx:75` — saisie du code | `focus:ring-4` dans les deux branches ✔ |
| **`Documents.jsx:131`** — recherche | **aucun** |
| **`Journal.jsx:151`** — filtre | **aucun** |
| **`Questionnaire.jsx:181`** — recherche | **aucun** |

Les trois derniers étaient donc **les seuls éléments interactifs de
l'application réellement invisibles au clavier**.

## Ce qui n'existait pas

Recherche `<button|a|Link|NavLink … focus…>` sur tout le projet : **aucun
résultat**. Aucun bouton, aucun lien ne porte de style de focus, et `.btn` n'en
définit pas. **Donc aucun risque de double anneau** en ajoutant une outline.

---

# 4. Modification effectuée

**Un seul fichier** : `src/index.css`, un bloc de règles inséré juste avant
celles de la vitrine.

```css
a:focus-visible,
button:focus-visible,
summary:focus-visible,
[role='button']:focus-visible,
[tabindex]:not([tabindex='-1']):focus-visible,
input.border-none:focus-visible {
  outline: 2px solid rgb(var(--brand-600));
  outline-offset: 2px;
}
.dark a:focus-visible,
.dark button:focus-visible,
.dark summary:focus-visible,
.dark [role='button']:focus-visible,
.dark [tabindex]:not([tabindex='-1']):focus-visible,
.dark input.border-none:focus-visible {
  outline-color: rgb(var(--brand-400));
}
```

## Trois choix, et leurs raisons

**`outline` plutôt qu'une ombre.** L'outline ne participe pas au flux : aucun
élément ne peut bouger quand le focus arrive. Vérifié sur 24 mesures — voir § 8.

**Les champs de formulaire sont volontairement absents.** `.input`,
`.champ-auth`, `.champ-sidebar` et les trois champs stylés sur place remplacent
déjà l'outline par un anneau `ring`. Les inclure aurait superposé un second
indicateur sur 153 champs.

**`input.border-none` comme seule exception.** Plutôt que de modifier trois
composants pour un besoin d'affichage, la règle s'appuie sur la classe que ces
champs portent déjà. Vérifié par balayage de tous les `<input>` du projet :
**le sélecteur correspond exactement aux trois champs visés**, tous dans
l'application, aucun faux positif, aucun en vitrine.

| Fichier | Ligne | Zone |
|---|---|---|
| `pages/Documents.jsx` | 130 | application |
| `pages/Journal.jsx` | 150 | application |
| `pages/Questionnaire.jsx` | 180 | application |

Aucun composant React créé. Aucun fichier JSX modifié.

---

# 5. Vitrine — comportement conservé

**Intact.** Les règles `.vitrine …:focus-visible` gagnent des deux façons :

| Critère | Espace connecté | Vitrine |
|---|---|---|
| Spécificité | `a:focus-visible` = **(0,1,1)** | `.vitrine a:focus-visible` = **(0,2,1)** |
| Position dans la feuille émise | caractère **64712** | caractère **65173** — **après** |

Mesure au clavier après modification, page d'accueil :

```
vitrine  1440px / 1280px / 768px / 390px
  outline: 2px rgb(224, 122, 110), offset 2px  — inchangé
```

Les pages d'authentification, couvertes par `.vitrine` via `CadreAuth`, gardent
elles aussi leur anneau.

---

# 6. Application sécurisée — comportement obtenu

```
outline: solid 2px rgb(146, 31, 24)   (= --brand-600)
outline-offset: 2px
```

Relevé sur les cinq pages applicatives testées, aux quatre largeurs :
**0 élément interactif sans anneau, 0 double anneau, layout stable partout.**

Les trois champs de recherche, auparavant invisibles au clavier, ont été
vérifiés individuellement en les atteignant par tabulations successives :

| Champ | Résultat |
|---|---|
| `Journal` — « Filtrer par action, entité ou utilisateur… » | **`solid 2px rgb(146, 31, 24)` offset 2px** |
| `Documents` — « Rechercher un document… » | **`solid 2px rgb(146, 31, 24)` offset 2px** |
| `Questionnaire` — « Rechercher un critère… » | **`solid 2px rgb(146, 31, 24)` offset 2px** |

---

# 7. Éléments testés

| Catégorie | Élément | Résultat |
|---|---|---|
| **Navigation clavier** | `Tab` | anneau sur chaque élément atteint |
| | `Shift + Tab` | revient bien à l'élément précédent, sur les 24 mesures |
| **Boutons** | primaire, secondaire, fantôme | anneau `brand-600` |
| | icon-only (`.btn-ghost p-1.5`) | anneau `brand-600`, aucun débordement |
| **Formulaires** | `input` / `select` / `textarea` via `.input` | anneau `ring` existant conservé, **aucun double** |
| | champs de recherche sans bordure | **corrigés**, voir § 6 |
| | cases à cocher, boutons radio | anneau natif du navigateur, non couvert par la règle (elle ne cible pas `input[type=checkbox]`) |
| **Navigation** | liens de la barre latérale | anneau `brand-600` |
| | liens de l'en-tête | anneau `brand-600` |
| | fil d'Ariane | anneau `brand-600` (`a:focus-visible`) |
| | liens d'action dans les tableaux | anneau `brand-600` |
| **Modales / surcouches** | **aucune modale dans l'application** — l'audit P4 l'avait établi : seule `ModaleVideo` existe, côté vitrine, où le focus est inchangé | sans objet |

---

# 8. Validation navigateur

Six pages × quatre largeurs = 24 parcours clavier, chacun avec 6 à 10
tabulations plus un `Shift+Tab`.

| Page | 1440 px | 1280 px | 768 px | 390 px |
|---|---|---|---|---|
| Vitrine | 0 sans anneau · layout stable | idem | idem | idem |
| Tableau de bord | **0 sans anneau · 0 double · stable** | idem | idem | idem |
| Mission | **0 sans anneau · 0 double · stable** | idem | idem | idem |
| Formulaire (Utilisateurs) | **0 sans anneau · 0 double · stable** | idem | idem | idem |
| Tableau + recherche (Journal) | **0 sans anneau · 0 double · stable** | idem | idem | idem |
| Actions (Référentiels) | **0 sans anneau · 0 double · stable** | idem | idem | idem |

**« Layout stable »** = `scrollWidth × scrollHeight` du document identique avant
et après le parcours complet. Vérifié sur les 24 mesures.

## Un faux positif de mon détecteur, levé

Le parcours a d'abord signalé « 1 double » sur la vitrine à 768 et 390 px. J'ai
vérifié plutôt que de le rapporter tel quel : l'élément est un
`a.btn-vitrine`, dont l'ombre calculée vaut
`rgba(0, 0, 0, 0) 0px 0px 0px 0px` — **entièrement transparente**. Mon test
cherchait `rgb` dans `box-shadow` et a capturé `rgba(…, 0)`.

**Aucun double anneau réel nulle part**, ni en vitrine ni dans l'application.

---

# 9. Build / lint / tests

| Contrôle | Résultat |
|---|---|
| `npx vite build` | **BUILD=0** |
| `npm run lint` | **0 erreur** ; 1 avertissement, `Landing.jsx:19` — préexistant, fichier non touché |
| Tests frontend | **aucun** — `package.json` n'expose que `dev`, `build`, `lint`, `preview` |
| Règle réellement émise | vérifiée dans la feuille produite : `a:focus-visible,button:focus-visible,summary:focus-visible,[role=button]:focus-visible,[tabindex]:not([tabindex="-1"]):focus-visible,input.border-none:focus-visible{outline:2px solid rgb(var(--brand-600));outline-offset:2px}` |
| Règle réellement servie | `input.border-none:focus-visible` présent dans le module servi par Vite après redémarrage du conteneur |

---

# 10. Fichiers modifiés

```
 src/index.css | 42 ++++++++++++++++++++++++++++++++++++++++++
 1 file changed, 42 insertions(+), 0 deletions(-)
```

**Un seul fichier. Aucune suppression.** Aucun composant créé, aucun fichier
JSX touché, aucune classe existante modifiée.

Aucune exception de composant n'a été nécessaire : le seul cas qui aurait exigé
de modifier du JSX — les trois champs de recherche — est traité par le
sélecteur `input.border-none`.

---

# 11. Régressions éventuelles

## Contrôles passés

| Contrôle | Résultat |
|---|---|
| Appels API | diff filtré sur `api.get\|post\|put\|delete\|patch` → **0 ligne** |
| Routes | `App.jsx` : 4 lignes, toutes de P1.4 — **rien de P4.2** |
| Auth | `git diff src/auth/` → **vide** |
| Backend | aucun fichier `api-quarkus/` touché |
| Base de données | aucune requête, aucune migration |
| Vitrine | anneau mesuré identique avant/après, aux 4 largeurs |
| Éléments désactivés | un bouton `disabled` n'est pas focusable : `:focus-visible` ne s'y applique pas |
| Déplacement de mise en page | `outline` n'entre pas dans le flux ; vérifié sur 24 mesures |

## Ce qui reste à surveiller

| Point | Pourquoi |
|---|---|
| **Thème sombre** | La variante `.dark` a été écrite par symétrie avec celle de la vitrine, mais **le parcours clavier a été mené en thème clair**. À vérifier en sombre. |
| **Cases à cocher et boutons radio** | Non ciblés par la règle ; ils gardent l'anneau natif. 7 cases et 4 boutons radio dans le projet. Comportement inchangé, mais non homogène avec le reste. |
| **Futurs champs sans bordure** | Le sélecteur `input.border-none` les couvrira automatiquement — c'est voulu, mais il faut le savoir. |

---

# 12. Conclusion

Le focus clavier de SMARTEX SustWay est désormais **visuellement cohérent et
clairement identifiable** : le même anneau bordeaux de 2 px, avec 2 px de
décalage, sur tous les boutons, liens et contrôles de l'espace connecté, aux
quatre largeurs testées.

La vitrine garde exactement son comportement, garanti par la spécificité **et**
par l'ordre des règles, tous deux vérifiés dans la feuille émise.

Trois champs de recherche qui neutralisaient l'outline sans rien mettre à la
place — les seuls éléments interactifs de l'application réellement invisibles au
clavier — sont corrigés sans qu'aucun composant ait été modifié.

Aucun double anneau, aucun déplacement de mise en page, aucun élément devenu
invisible. Le seul « double » signalé par l'instrumentation était un artefact de
mesure, levé par vérification.

```text
Verdict : READY_FOR_P4_3

Fichiers modifiés   : 1   (src/index.css, +42 / -0)
Composants modifiés : 0
Parcours clavier    : 24  (6 pages × 4 largeurs)
Sans anneau         : 0
Doubles anneaux     : 0
Déplacements        : 0
Build               : PASS
Lint                : PASS
Tests               : aucun disponible
```

---

**Arrêt ici. P4.3 n'est pas commencé : ni typographie, ni cartes, ni autre
refactoring. Aucun backend, API, base, route ou auth modifiés. Aucun commit,
aucun push.**

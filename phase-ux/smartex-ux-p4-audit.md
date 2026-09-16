# SMARTEX SUSTWAY — Audit P4, Design System / UI

**Date** : 2026-09-16
**Nature** : **STRICTEMENT READ-ONLY** — aucun fichier, code, backend, API, base,
route, auth, configuration, paquet, Docker ou Tailwind modifié ; aucun commit
**Méthode** : lecture du code + 11 vues mesurées dans le navigateur (Chrome/CDP,
session SUPER_ADMIN), à 1440, 1024, 768 et 390 px

```text
PHASE UX P4 — AUDIT DESIGN SYSTEM / UI

Verdict :
READY_FOR_P4_IMPLEMENTATION
```

---

# 1. Résumé exécutif

**SMARTEX SustWay possède déjà un Design System, et il est plus solide que ne le
laisserait croire l'absence de dossier `design-system/`.** Il n'est pas fait de
composants React mais d'un socle de jetons CSS et de classes utilitaires, sur
lequel une dizaine de primitives React viennent se poser. Ce socle est appliqué
avec une régularité inhabituelle :

- **couleurs** : palette entière en variables CSS, redéfinie par thème (`.dark`)
  et par univers (`.vitrine`) ; aucune couleur de marque codée en dur dans
  l'espace connecté, hors graphiques ;
- **boutons** : 189 usages des classes `.btn-*`, **2 boutons stylés à la main** ;
- **formulaires** : **58 `<select>` sur 58**, 9 `<textarea>` sur 10 et 92
  `<input>` sur 112 passent par `.input` — les 20 restants sont des cases à
  cocher, des champs masqués ou des champs de recherche sans bordure, délibérés ;
- **icônes** : une seule bibliothèque, `lucide-react`, 92 imports, et une échelle
  dominée à 78 % par `h-4 w-4` ;
- **accessibilité** : **0 élément interactif sans nom accessible** sur les
  11 vues mesurées, un seul `h1` par page, aucun saut de niveau de titre.

Les écarts réels sont peu nombreux mais nets, et ils se concentrent sur **ce qui
n'a pas de primitive** : les correspondances statut → couleur, les surfaces de
type « carte », les états vides et de chargement, et la palette des graphiques.

**Trois chiffres résument l'audit** : 35 dictionnaires de statuts dispersés dans
24 fichiers ; une même déclaration de surface de carte retapée **27 fois** à
l'identique ; 17 états vides écrits à la main alors que `<Vide>` est utilisé
67 fois.

Aucun problème **critique**. Deux **importants**, cinq **modérés**, quatre
**mineurs**.

---

# 2. État actuel du Design System

## Ce qui existe

| Couche | Emplacement | Contenu |
|---|---|---|
| Jetons de couleur | `src/index.css` `:root`, `.dark`, `.vitrine` | `--ink-50…900`, `--brand-50…900`, `--surface`, `--marine`, `--feuille` |
| Mapping Tailwind | `tailwind.config.js` | `ink`, `brand`, `surface`, `marine`, `feuille` via `rgb(var(--x) / <alpha-value>)` |
| Typographie | `tailwind.config.js` | `sans` (Inter), `display` / `titre` (Satoshi), `chiffres` (Inter) |
| Élévation | `tailwind.config.js` | `shadow-soft`, `shadow-glow` |
| Classes utilitaires | `src/index.css` `@layer components` | 46 classes : `.btn*`, `.input`, `.label`, `.th`, `.td`, `.card*`, `.carte-*`, `.lien-app*`, `.champ-*`, `.sidebar-*` |
| Primitives React | `src/components/ui.jsx` | `Card`, `CardHeader`, `PageTitre`, `Badge`, `StatCard`, `Barre`, `Vide`, `Loader`, `Alerte`, `Tableau` |
| Primitives hors `ui.jsx` | `src/components/` | `Breadcrumb`, `SustwayLoader`, `Revele`, `Logo`, `charts.jsx` |

**Pas de dossier `src/layouts/`** : les gabarits sont `Layout.jsx` (espace
connecté) et `LayoutPublic.jsx` (vitrine), dans `components/`.

## Ce qui n'existe pas, et l'a-t-on remarqué

| Primitive attendue | Statut réel |
|---|---|
| `Button` | **classe CSS, pas composant** — et cela fonctionne (189 usages, 2 écarts) |
| `Input` / `Select` | **classe CSS `.input`** — 58/58 selects conformes |
| `Modal` | **inexistant dans l'application.** Une seule modale dans tout le produit, `ModaleVideo`, côté vitrine. L'application ouvre des panneaux en ligne (`afficherFormulaire`, volets), jamais de superposition |
| `Tooltip` | **inexistant** — l'attribut `title` natif sert, notamment pour les infobulles du menu posées en P2 |
| `Toast` | **inexistant** — chaque page rend son retour en ligne via `Alerte` (114 usages) |
| `ErrorState` / `LoadingState` | `Alerte` et `Loader` en tiennent lieu |

L'absence de modale et de toast n'est pas un manque : c'est un parti pris
cohérent, appliqué partout. Il est classé **CONSERVER** au § 19.

---

# 3. Palette / couleurs

## Le socle

Toute la palette passe par des variables CSS, ce qui permet au thème sombre et à
la vitrine de redéfinir le sens des mêmes classes sans réécrire une seule page.

| Rôle | Jeton | Clair | Sombre | Vitrine |
|---|---|---|---|---|
| Fond de page | `ink-50` | `246 247 249` | `16 20 28` | `244 245 241` |
| Surface / carte | `surface` | `255 255 255` | `23 28 38` | `255 255 255` |
| Bordure | `ink-100` / `ink-200` | clair | sombre | papier |
| Texte principal | `ink-900` | `31 37 51` | `240 243 247` | `20 35 75` |
| Texte atténué | `ink-400` / `ink-500` | — | inversé | — |
| Primaire | `brand-600` | `146 31 24` | idem | redéfini |
| Titraille marine | `marine` | `26 42 99` | `199 214 247` | `20 35 75` |
| Sémantique « conforme » | `feuille` | `5 150 105` | idem | idem |

Le commentaire de `tailwind.config.js` justifie explicitement le choix du
bordeaux, « délibérément distinct du rouge d'alerte (rose-\*) pour qu'un bouton
principal ne se confonde jamais avec un message d'erreur ». Cette intention est
respectée dans le code : `.btn-danger` utilise `rose-600`, `.btn-primary`
`brand-600`.

## Couleurs sémantiques

Centralisées dans `ui.jsx:50`, `TONS` — six tons : `neutre`, `vert`, `bleu`,
`ambre`, `rouge`, `violet`, chacun avec sa déclinaison sombre. Employées par
`Badge` (73 usages) et `Alerte` (114 usages).

Usage direct des familles Tailwind correspondantes, hors `Badge` :
emerald 69, amber 38, rose 29, blue 7, violet 6. Ces valeurs restent alignées
sur `TONS`, qui emploie les mêmes familles.

## Écarts constatés

### C-1 · Hexadécimaux dans l'espace connecté — **MODÉRÉ**

59 hexadécimaux dans 12 fichiers. La très grande majorité est légitime : vitrine
(`Landing`, `PreuveVersVerdict`, `RoueDeming`, `PiedPublic`) et graphiques, où
une couleur SVG ou Chart.js ne peut pas être une classe Tailwind.

**Quatre le sont moins**, dans l'application :

| Fichier | Valeur | Problème |
|---|---|---|
| `components/audit/SyntheseMission.jsx:5` | `['#059669', '#e2e8f0']` | `#059669` **est** `COULEURS.vert` ; `#e2e8f0` est un gris figé |
| `components/audit/SyntheseMission.jsx:6` | `['#921f18', '#e2e8f0']` | `#921f18` **est** `--brand-600` et `COULEURS.brand` |
| `pages/AuditScore.jsx:22` | `[…, '#eab308', …]` | amber-500 absent de la palette partagée |
| `pages/NonConformitesEntreprise.jsx:12` | `[…, '#eab308', …]` | **la même rustine, écrite deux fois** |

Conséquence : ces couleurs de graphique **ne suivent pas le thème sombre**, alors
que tout le reste de l'interface le fait. Et `COULEURS` (`charts.jsx:31`), qui
est pourtant la palette partagée des graphiques, est contournée par
`SyntheseMission` puis complétée à l'identique par deux pages.

**Recommandation** : compléter `COULEURS` d'un quatrième cran et d'un gris de
fond, puis y ramener les trois fichiers. Étendue : 4 déclarations.

### C-2 · Classes arbitraires — **MINEUR, hors espace connecté**

`text-[15px]` apparaît 60 fois dans 15 fichiers — **tous vitrine ou
authentification** (`CadreAuth`, `EnTetePublic`, `PiedPublic`, `GrilleFormules`,
`Contact`, `Faq`, `ConnexionReelle`…). Vérifié : **aucune occurrence dans
l'espace connecté.** C'est une taille de texte courant propre à la vitrine,
appliquée avec constance. `text-[11px]` (10×) sert les sur-titres.

**Recommandation** : ne pas y toucher ; documenter 15 px comme taille de corps
de la vitrine.

---

# 4. Typographie

## Matrice demandée

| Niveau | Usage attendu | Usage actuel | Cohérent ? |
|---|---|---|---|
| **H1** | titre de page | `PageTitre` → `text-xl font-semibold text-ink-900` (20 px / 600), **31 usages**. Exception assumée : `TableauDeBord:413` `text-2xl font-bold` (salutation, pas un titre de page) | **Oui** — unifié en P3 |
| **H2** | section | `text-sm font-semibold text-ink-900` — **22 occurrences**, plus `.card-title` (`text-sm font-semibold`) | Oui en interne, **mais voir T-1** |
| **H3** | sous-section | `text-sm font-semibold text-ink-900` — **4 occurrences, identiques au H2** | **Non — T-1** |
| **Body** | contenu | `text-sm` (309) et `text-xs` (273) — 81 % de tout le texte | Oui |
| **Label** | formulaire | `.label` → `text-xs font-medium uppercase tracking-wide text-ink-500`, **131 usages** | **Oui** |
| **KPI** | métrique | `StatCard` → `text-2xl font-semibold text-ink-900`, **40 usages** | **Oui** |
| **Tableau** | en-tête / cellule | `.th` (`text-xs font-semibold uppercase`) / `.td` (`text-sm`) | **Oui** |
| **Bouton** | action | `.btn` → `text-sm font-medium` | **Oui** |
| **Badge** | état | `text-xs font-medium` | **Oui** |

## T-1 · H2 et H3 sont visuellement identiques — **IMPORTANT**

Dans l'espace connecté, l'échelle typographique effective ne compte que **deux
niveaux** : le titre de page à 20 px, et tout le reste à 14 px. `text-lg` (36) et
`text-base` (46) existent mais servent surtout la vitrine et les valeurs
numériques.

Conséquence : sur une page à structure profonde — `AuditDetail`, avec ses sept
onglets et leurs sections internes — un titre de section et un titre de
sous-section ont exactement la même apparence. La hiérarchie est portée par les
bordures et les cartes, pas par la typographie.

**Preuve** : séquence de titres relevée dans le DOM de la page mission →
`1,2,2,2,2,2`. Aucun `h3` : la structure est plate parce qu'aucun style ne
distinguerait un troisième niveau.

**Recommandation** : introduire un cran intermédiaire pour les H2 de section
(`text-base font-semibold`, 16 px) et réserver `text-sm font-semibold` aux H3.
Étendue : 22 déclarations, aucune logique touchée.

## T-2 · `typoFr` réservée à la vitrine — **MINEUR**

`src/lib/typographie.js` pose l'espace fine insécable avant `? ! ; :` et dans les
guillemets. **7 appels, dans 4 fichiers, tous vitrine.** L'espace connecté affiche
donc « Publiez-vous un rapport RSE ? » sans espace fine.

**Recommandation** : `À ARBITRER`. Le texte des critères vient de l'API : le
traiter à l'affichage est possible mais touche du contenu métier.

---

# 5. Espacements / densité

## Échelle réellement employée

| Propriété | Valeurs dominantes | Exceptions notables |
|---|---|---|
| `gap` | **2** (148), **3** (109), 4 (46) | 1.5 (29), 2.5 (19), 6 (23), 16 (12, vitrine) |
| `p` | **5** (83), **4** (47) | 3 (25), 6 (20), 8 (7, vitrine) |
| `space-y` | **3** (53) | 5 (18), 4 (18), 2 (17), 6 (3) |
| `mb` | **6** (41), 4 (30) | 2 (12), 1.5 (4) |

Le rythme 2 / 3 / 4 pour les `gap` et `p-5` pour les cartes sont clairement
dominants. Les mesures navigateur confirment la régularité : **hauteur des
`.carte-stat` = 110 px sur toutes les pages et toutes les largeurs validées**.

## E-1 · Rythme vertical des pages non fixé — **MODÉRÉ**

Quatre conteneurs de page coexistent : `space-y-3`, `space-y-4`, `space-y-5`,
`space-y-6`, sans règle apparente. Exemples relevés : `Classement` en
`space-y-5`, `ReferentielsListe` en `space-y-6`, la plupart des pages en
fragment `<>` où l'espacement vient du `mb-6` de `PageTitre`.

**Impact** : faible isolément, visible en enchaînement — passer d'une page à
l'autre fait varier l'aération sans raison fonctionnelle.

**Recommandation** : fixer un rythme unique de page (`space-y-6` ou le `mb-6` de
`PageTitre`) et le documenter. Étendue : une dizaine de conteneurs racine.

## E-2 · Paddings de carte à trois valeurs — **MINEUR**

`p-5` (83) domine, mais `p-4` (47) et `p-6` (20) servent des rôles voisins. Voir
§ 8, où ce point rejoint la duplication des surfaces.

---

# 6. Boutons

## État : le point le plus solide du système

| Variante | Définition | Usages |
|---|---|---|
| `.btn` | base : `inline-flex items-center justify-center gap-2 rounded-lg px-3.5 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50` | socle des 4 suivantes |
| `.btn-primary` | `bg-brand-600 text-white hover:bg-brand-700` | **57** |
| `.btn-secondary` | `border border-ink-200 bg-surface text-ink-700 hover:bg-ink-100` | **51** |
| `.btn-ghost` | `text-ink-600 hover:bg-ink-100` | **80** |
| `.btn-danger` | `bg-rose-600 text-white hover:bg-rose-700` | **1** |
| `.btn-vitrine*` | 3 variantes, `rounded-full`, ombre `glow` | 18, vitrine |

**Hauteur, padding, rayon, typographie, gap icône/texte, état désactivé : tous
hérités de `.btn`.** Il n'y a donc pas de dérive possible sur ces propriétés.

**Implémentations concurrentes : 2** (`rounded-lg bg-brand…` écrit à la main).
Sur 189 boutons, c'est 1 %.

## B-1 · Pas de variantes `outline`, `success`, `icon-only`, `loading` — **MODÉRÉ**

Le brief en attend huit ; il en existe quatre plus trois de vitrine.

- `outline` : `.btn-secondary` en tient lieu.
- `success` : **n'existe pas**. Aucune action n'est teintée en vert — cohérent,
  le vert est réservé au sens « conforme ».
- `icon-only` : pas de variante dédiée ; les boutons à icône seule emploient
  `.btn-ghost p-1.5` avec `aria-label` (mesuré : 0 élément sans nom accessible).
- `loading` : **aucune gestion d'état de chargement sur les boutons.** Les pages
  utilisent `disabled={chargement}` et changent parfois le libellé, sans
  indicateur visuel normalisé.

**Recommandation** : `À ARBITRER` pour `loading` — c'est le seul manque réel, et
il touche les formulaires de création. Les autres variantes sont `CONSERVER`.

---

# 7. Badges / statuts

## Le composant est bon, sa alimentation ne l'est pas

`Badge` (`ui.jsx:58`) est utilisé **73 fois** et s'appuie sur les six `TONS`
centralisés. Le rendu est donc homogène. **Le problème est en amont** : la
correspondance entre un statut métier et un ton est réécrite dans chaque fichier.

### S-1 · 35 dictionnaires statut → ton dans 24 fichiers — **IMPORTANT**

Relevé exhaustif : `TONS_*` et `STATUTS` déclarés dans `pages/` et
`components/`, **sans aucun module partagé**. Exemples de duplication stricte :

| Dictionnaire | Fichiers | Identiques ? |
|---|---|---|
| `TONS_CRITICITE` = FAIBLE:neutre, MOYENNE:bleu, ELEVEE:ambre, CRITIQUE:rouge | `CritereEvaluation:37`, `Questionnaire:11`, `ReferentielDetail:14` | oui, **3 copies** |
| `TONS_NIVEAU` = MINEURE:neutre, MODEREE:bleu, MAJEURE:ambre, CRITIQUE:rouge | `NonConformites:12`, `NonConformitesEntreprise:13`, `VoletPlanAction:8` | oui, **3 copies** |
| statut de mission = BROUILLON:neutre, EN_COURS:bleu, TERMINE:vert, ANNULE:neutre | `TableMissions:7`, `RapportsEntreprise:10` | oui, **2 copies** |
| statut de non-conformité = OUVERTE:rouge, EN_TRAITEMENT:ambre, CLOTUREE:vert | `NonConformites:13`, `NonConformitesEntreprise:14` | oui, **2 copies** |

**Impact** : chaque copie est une occasion de divergence. Une en a déjà profité.

### S-2 · `ARCHIVE` d'un référentiel a deux couleurs — **MODÉRÉ, divergence réelle**

```
pages/ReferentielDetail.jsx:13   ARCHIVE: 'rouge'
pages/ReferentielsListe.jsx:28   ARCHIVE: 'neutre'
```

Le même référentiel archivé s'affiche **en rouge dans sa fiche et en gris dans
la liste**. Les trois autres valeurs (`ACTIF`, `INACTIF`, `SUSPENDU`) concordent.

### Table demandée

| État | Apparence actuelle | Variantes | Cohérent ? |
|---|---|---|---|
| Mission en cours | `bleu` | 2 déclarations identiques | **oui** |
| Mission terminée | `vert` | 2 déclarations identiques | **oui** |
| Mission annulée | `neutre` | 2 déclarations identiques | **oui** |
| Mission brouillon | `neutre` | 2 déclarations identiques | **oui** |
| Évaluation en revue | `violet` | 1 déclaration (`CritereEvaluation:38`) | **oui** |
| Non-conformité ouverte | `rouge` | 2 déclarations identiques | **oui** |
| Criticité CRITIQUE | `rouge` | 3 déclarations identiques | **oui** |
| Référentiel archivé | `rouge` **et** `neutre` | **2 divergentes** | **NON — S-2** |

### Une divergence qui n'en est pas une

`CritereEvaluation:835` déclare `TONS_NIVEAU_RG26 = { MINEURE:neutre,
MODEREE:ambre, MAJEURE:rouge, CRITIQUE:rouge }` — une échelle différente pour les
mêmes noms d'énumération. **Le code la justifie** : « Le rouge est réservé à ce
bloc, parce qu'il porte un fait établi ; le signal de l'IA, lui, s'identifie par
son intitulé ». Il s'agit du risque métier RG26, pas d'une non-conformité.
**CONSERVER**, et documenter comme exception voulue.

---

# 8. Cartes / KPI / vignettes

## Deux familles déclarées, une troisième écrite à la main

| Surface | Définition | Usages |
|---|---|---|
| `.card` | `rounded-xl border-ink-200 bg-surface shadow-sm` | 3 directs |
| `Card` (composant) | `.card` **+ `rounded-2xl border-ink-100`** | **65** |
| `.carte-app` | `rounded-2xl border-ink-100 bg-surface p-5 shadow-sm` + survol | 1 |
| `.carte-stat` | `flex items-center gap-4 rounded-2xl border-ink-100 bg-surface p-5 shadow-sm` | 2 (via `StatCard`, 40 usages) |
| `.carte-vitrine` | `rounded-2xl … shadow-soft` + survol | vitrine |

### D-1 · Le composant `Card` contredit la classe `.card` — **MODÉRÉ**

`ui.jsx:8` :

```jsx
<section className={clsx('card rounded-2xl border-ink-100', className)}>
```

`Card` applique `.card` puis en annule le rayon et la teinte de bordure. Le
résultat est correct à l'écran, mais **la classe `.card` n'est plus la
définition de la carte** : elle est une base morte que le composant corrige.
Les 3 usages directs de `.card` rendent donc un rayon et une bordure différents
des 65 usages de `Card`.

### D-2 · La surface de carte est retapée 27 fois — **IMPORTANT**

```
27 ×  rounded-2xl border border-ink-100 bg-surface p-5 shadow-sm
```

C'est, au caractère près, la définition de `.carte-app` sans ses effets de
survol — et la base de `.carte-stat`. Autres variantes voisines relevées :
`… bg-surface p-6 shadow-sm` (4), `… bg-surface p-4 shadow-sm` (2),
`rounded-xl border-ink-100 p-4` (13), `rounded-xl border-ink-100 bg-surface p-4`
(3).

**Étendue** : sur 117 surfaces bordées écrites à la main, une cinquantaine
relève de la même intention « panneau de contenu ».

**Impact** : chaque évolution du style de carte — rayon, ombre, bordure en thème
sombre — demande de repasser sur des dizaines de fichiers.

**Recommandation** : `STANDARDISER`. Réconcilier `.card` et `Card`, puis exposer
une variante « panneau » sans en-tête pour absorber les 27 occurrences.

## StatCard — conforme

`StatCard` (`ui.jsx:68`) : icône dans un carré teinté, libellé `text-xs uppercase
text-ink-500`, valeur `text-2xl font-semibold`, détail `text-xs truncate`.
40 usages, **hauteur mesurée constante à 110 px** sur toutes les pages et
largeurs. Le seul écart connu — troncature du détail à 1024 px — est la réserve
déjà actée (§ 13).

---

# 9. Formulaires

## État : très homogène, contrairement à ce qu'un comptage naïf suggère

Mesure faite sur les balises complètes, y compris celles écrites sur plusieurs
lignes :

| Élément | Total | Avec `.input` / `.champ-*` | Reste |
|---|---|---|---|
| `<select>` | 58 | **58** | — |
| `<textarea>` | 10 | **9** | 1 sans classe |
| `<input>` | 112 | **92** | 11 sans classe (cases à cocher, champs masqués), 3 champs de recherche sans bordure (volontaire), 2 `mt-0.5`, 1 `sr-only` |

`.input` porte la hauteur, la bordure, le rayon, le placeholder **et le focus**
(`focus:border-brand-500 focus:ring-2 focus:ring-brand-100`, avec variante
sombre). `.label` porte les libellés : 131 usages.

Le commentaire du code documente même le choix de `text-base` sur mobile —
« iOS zoome automatiquement sur un champ dont le texte fait moins de 16 px ».

## F-1 · Pas de composant `switch` — **MINEUR**

7 cases à cocher, 4 boutons radio, **0 `role="switch"`**. Aucun besoin non
couvert n'a été observé ; à ne créer que si un cas se présente. **CONSERVER**.

## F-2 · Pas de texte d'aide normalisé — **MODÉRÉ**

Aucune classe ni composant pour le texte d'aide sous un champ, ni pour l'erreur
de champ. Les erreurs de formulaire remontent en `Alerte` au niveau du bloc, pas
au niveau du champ. C'est cohérent, mais cela empêche de signaler **quel** champ
pose problème sur un formulaire à plusieurs entrées.

**Recommandation** : `À ARBITRER`.

---

# 10. Tableaux

`Tableau` (`ui.jsx:131`) fournit le conteneur à défilement horizontal, la mention
« Faites défiler le tableau horizontalement » sous `sm`, et les classes `.th` /
`.td`. **16 usages.**

## TB-1 · Six tableaux écrits à la main dans l'application — **MODÉRÉ**

| Fichier | Contexte |
|---|---|
| `components/tableau-bord/TableMissions.jsx` | tableau principal du tableau de bord |
| `components/audit/SyntheseMission.jsx` | score par domaine |
| `components/referentiel/VoletVersions.jsx` | versions d'un référentiel |
| `pages/Classement.jsx` | classement des organisations |
| `pages/ProjetDetail.jsx` | missions d'un projet |
| `pages/ReferentielsListe.jsx` | catalogue |

Ces six emploient `.th` / `.td` — l'apparence des cellules est donc conforme —
mais **pas le conteneur de `Tableau`** : ils ne bénéficient ni du défilement
encadré ni de l'avertissement mobile.

`pages/Formules.jsx` est également un tableau brut, côté vitrine : hors périmètre.

**Impact** : sur téléphone, un tableau large sans conteneur dédié pousse la page
en défilement horizontal. **Aucun débordement n'a pourtant été mesuré** à 390 px
sur les vues testées — les composants concernés gèrent leur propre repli en
cartes (`TableMissions` bascule en liste sous `sm`). Le risque est donc
théorique sur ces six-là, mais la règle n'est pas explicite.

**Pagination** : un seul motif, le bouton « Charger plus » de `Journal`. Pas de
pagination numérotée. **CONSERVER**.

---

# 11. États UX

| État | Primitive | Usages | Concurrence |
|---|---|---|---|
| Chargement | `Loader` (`ui.jsx:107`) | **44** | **`SustwayLoader` employé directement 61 fois** dans 12 fichiers |
| Vide | `Vide` (`ui.jsx:97`) | **67** | **17 états vides écrits à la main** (`border-dashed`) dans 12 fichiers |
| Erreur | `Alerte ton="rouge"` | **114** (toutes teintes) | aucune |
| Succès | `Alerte ton="vert"` ou message en ligne | — | **pas de toast, pas de confirmation globale** |

## E-3 · Deux façons d'afficher un chargement — **MODÉRÉ**

`Loader` = `SustwayLoader` + message centré. Mais `SustwayLoader` est aussi
appelé seul 61 fois, sans message, souvent dans un bouton ou un volet.
Les deux usages sont légitimes ; ce qui manque est la règle disant lequel
employer quand.

## E-4 · 17 états vides hors `Vide` — **MODÉRÉ**

Motif relevé 5 fois à l'identique :
`rounded-2xl border border-dashed border-ink-200 px-4 py-10 text-center text-sm text-ink-500`
— alors que `Vide` rend `… px-6 py-12` avec une icône `Info`. **Padding
différent, icône absente** : deux états vides voisins n'ont pas la même densité
selon la page.

Fichiers concernés : `DepotPreuves`, `VoletAnalysesIa`, `VoletPlanAction`,
`VoletPreuves`, `SuiviAnalyse`, `FilActivite`, `TableMissions`, `AuditDetail`,
`CritereEvaluation`, `Entreprises`.

## E-5 · Aucun retour de succès normalisé — **MODÉRÉ**

Il n'existe ni toast ni composant de confirmation. Chaque page invente son
retour : effacement après 2,5 s dans `SaisieCritereMission`, `Alerte` verte
ailleurs, rien du tout parfois. L'audit P1 avait déjà noté ce point et l'avait
jugé « cohérent, pas un manque » — il le reste **tant que chaque page en a un**,
ce qui n'a pas été vérifié exhaustivement ici.

**Recommandation** : `À ARBITRER`. Un système de toast serait une fonctionnalité
nouvelle, hors de l'esprit de P4.

---

# 12. Icônes

| Critère | Constat |
|---|---|
| Bibliothèque | **`lucide-react` seule**, 92 imports. Aucun mélange |
| Taille dominante | `h-4 w-4` — **186 occurrences (78 %)** |
| Autres tailles | `h-3.5 w-3.5` (29, fils d'Ariane et badges), `h-5 w-5` (19, en-têtes), `h-3 w-3` (5), `h-6 w-6` (4) |
| Couleur | héritée du texte, ou `text-brand-600` dans `CardHeader` |
| Décoratives | `aria-hidden` systématique sur les icônes accompagnant un texte |
| Icônes seules | toujours accompagnées d'`aria-label` — **0 élément sans nom accessible mesuré** |

**Aucune incohérence d'icône détectée.** Les icônes de menu et de page se
correspondent depuis P3 (`ClipboardList` pour les missions, `BookOpen` pour les
référentiels, `Medal` pour le classement).

Deux valeurs atypiques relevées — `h-6 w-1` et `h-5 w-28` — sont des barres et
des logos, pas des icônes.

---

# 13. Responsive UI

Mesures sur 11 vues. **`scrollWidth = clientWidth` partout** : aucun débordement
horizontal à 1440, 1024, 768 ni 390 px.

| Largeur | Comportement du système | Constat |
|---|---|---|
| 1440 | grilles 3-4 colonnes, actions en ligne | conforme |
| 1280 | grilles 3 colonnes | conforme |
| **1024** | grilles 3 colonnes, cartes ~208 px | **réserve connue** — détails de vignette tronqués |
| 768 | grilles 2 colonnes, en-têtes empilés | conforme |
| 390 | 1 colonne, sélecteurs pleine largeur, barre latérale en tiroir | conforme |

## R-1 · Réserve connue, non comptabilisée

La troncature des détails de vignette **à 1024 px** est la réserve actée en P3.1.
Elle relève de `lg:grid-cols-3` et touche aussi la disposition à trois vignettes.
**Conservée comme réserve, pas comptée comme découverte P4.**

## R-2 · Aucun changement brutal de comportement observé

Les points que le brief demandait de chercher — boutons compressés, titres qui
débordent, tableaux inutilisables, formulaires trop larges — n'ont pas été
constatés sur les vues mesurées. `TableMissions` bascule en cartes sous `sm`,
`Classement` passe son sélecteur en pleine largeur, `PageTitre` empile ses
actions.

---

# 14. Vitrine vs application

## Deux langages, délibérément séparés

| Dimension | Vitrine | Application |
|---|---|---|
| Palette | `.vitrine` redéfinit `ink`, `marine`, `brand` — papier, encre marine, bordeaux plus profond | `:root` / `.dark` |
| Boutons | `.btn-vitrine*`, `rounded-full`, `shadow-glow`, translation au survol | `.btn-*`, `rounded-lg`, transition de couleur seule |
| Cartes | `.carte-vitrine`, `rounded-2xl`, `shadow-soft`, lévitation au survol | `Card` / `.carte-app`, `shadow-sm` |
| Titraille | `font-display` (Satoshi), `text-[15px]` en corps | `font-sans` (Inter), `text-sm` en corps |
| Typographie française | `typoFr` appliquée | non appliquée |
| Focus | **anneau dessiné** `solid 2px rgb(224 122 110)` | **anneau par défaut du navigateur** `auto 1px rgb(16 16 16)` |

**Socle partagé** : les deux univers reposent sur les mêmes jetons CSS, la même
base `.btn`, la même classe `.input`, la même bibliothèque d'icônes et le même
composant `Logo`. La séparation est stylistique, pas structurelle — c'est la
bonne façon de faire.

## V-1 · Le focus est le seul écart injustifié — **MODÉRÉ**

Mesuré au clavier réel (événements `Tab` envoyés via CDP, pas de `.focus()`
programmatique qui aurait faussé le résultat) :

```
VITRINE      tab1..4 : outline solid 2px rgb(224, 122, 110)   focusVisible: true
APPLICATION  tab1..4 : outline auto 1px rgb(16, 16, 16)       focusVisible: true
```

Le focus **est visible dans les deux cas** — il n'y a pas de faute
d'accessibilité. Mais `index.css` ne définit de règle `:focus-visible` que sous
`.vitrine` (lignes 506-521, 603, 639, 748). L'espace connecté, où l'on passe
l'essentiel de son temps au clavier, hérite du cerclage par défaut du navigateur,
qui ne suit ni la marque ni le thème sombre.

**Recommandation** : `STANDARDISER` — étendre la règle `:focus-visible` de la
vitrine à l'application. Une règle CSS, aucun composant touché.

---

# 15. Composants à standardiser

| Composant | Existe ? | Implémentations concurrentes | Usages | Cohérence | Standardisation |
|---|---|---|---|---|---|
| `PageTitre` | oui | 1 (+ salutation du tableau de bord, assumée) | 31 | **élevée** | non nécessaire |
| `Breadcrumb` | oui | 1 | 7 | **élevée** | non nécessaire |
| `Button` | classe CSS | 2 boutons manuels sur 189 | 189 | **élevée** | non nécessaire ; variante `loading` à arbitrer |
| `Badge` | oui | 1 composant, **35 dictionnaires d'alimentation** | 73 | composant élevée, **données faible** | **oui — S-1** |
| `Card` | oui | **3** : `.card`, `Card`, 27 surfaces manuelles | 65 + 27 | **faible** | **oui — D-1, D-2** |
| `StatCard` | oui | 1 | 40 | **élevée** | non nécessaire |
| `Input` / `Select` | classe CSS | 1 | 153 | **élevée** | non nécessaire |
| `Table` | oui | **2** : `Tableau` + 6 tableaux bruts | 16 + 6 | moyenne | **oui — TB-1** |
| `EmptyState` | `Vide` | **2** : `Vide` + 17 manuels | 67 + 17 | moyenne | **oui — E-4** |
| `ErrorState` | `Alerte` | 1 | 114 | **élevée** | non nécessaire |
| `LoadingState` | `Loader` | **2** : `Loader` + `SustwayLoader` direct | 44 + 61 | moyenne | **oui — E-3** |
| `Modal` | **non** | — | 0 dans l'app | — | **non — CONSERVER** |
| `Alert` | `Alerte` | 1 | 114 | **élevée** | non nécessaire |
| `Tooltip` | **non** (attribut `title`) | — | — | — | **à arbitrer** |

---

# 16. Duplications

Classées par étendue décroissante.

| # | Duplication | Étendue | Preuve | Gravité |
|---|---|---|---|---|
| 1 | Dictionnaires statut → ton | **35 déclarations, 24 fichiers** | `TONS_CRITICITE` ×3, `TONS_NIVEAU` ×3, statut de mission ×2, statut de NC ×2 | **IMPORTANT** |
| 2 | Surface de carte | **27 copies identiques** | `rounded-2xl border border-ink-100 bg-surface p-5 shadow-sm` | **IMPORTANT** |
| 3 | États vides | **17 manuels**, dont 5 identiques | `border-dashed border-ink-200 px-4 py-10` | MODÉRÉ |
| 4 | Chargement | **61 `SustwayLoader` directs** vs 44 `Loader` | 12 fichiers | MODÉRÉ |
| 5 | Tableaux | **6 bruts** vs 16 `Tableau` | § 10 | MODÉRÉ |
| 6 | Palette de graphique | `'#eab308'` ajouté **deux fois** à `COULEURS` | `AuditScore:22`, `NonConformitesEntreprise:12` | MINEUR |
| 7 | Boutons stylés à la main | 2 | — | MINEUR |

---

# 17. Accessibilité UI

**Audit statique et mesures DOM uniquement.** Aucun outil de contraste
automatisé n'était disponible : **aucun jugement WCAG n'est porté ici**, et les
ratios de contraste n'ont pas été calculés.

| Critère | Mesure | Résultat |
|---|---|---|
| Nom accessible | 11 vues, 456 éléments interactifs cumulés | **0 sans nom** |
| Structure de titres | 11 vues | **1 `h1` par page, aucun saut de niveau** |
| Focus visible | Tab réel, vitrine et application | **visible dans les deux** ; voir V-1 |
| Zones interactives < 24 px | 11 vues | **2 à 3 par page** sur `dashboard`, `score`, `mission`, `non-conformités` ; 0 sur `référentiels`, `utilisateurs`, `journal`, vitrine |
| Icônes décoratives | code | `aria-hidden` systématique |
| Fil d'Ariane | `Breadcrumb.jsx` | `<nav aria-label>` + `aria-current="page"` |
| Éléments distingués par la seule couleur | `Badge` | **non** — le badge porte toujours le libellé de l'état en texte |

## A-1 · Zones interactives sous 24 px — **MODÉRÉ**

2 à 3 éléments par page mesurent moins de 24 px dans une dimension. Ce sont
typiquement les boutons à icône compacts (`.btn-ghost p-1.5` avec une icône
`h-4 w-4` → 16 + 12 = 28 px, mais certains descendent sous le seuil). Ils portent
tous un `aria-label`, donc le problème est gestuel, pas sémantique.

**Recommandation** : `À ARBITRER` — une taille de cible minimale de 24 px
demanderait de revoir `.btn-ghost` en version compacte.

## A-2 · Contraste non mesuré — **non évalué**

`ink-400` (`130 144 169`) sur `surface` blanc sert le texte atténué et les
placeholders. C'est le couple le plus exposé. **Non vérifié faute d'outil** ; à
mesurer avant toute décision.

---

# 18. Problèmes classés par priorité

## CRITIQUE

**Aucun.** Aucun écart observé n'empêche ni ne perturbe fortement l'utilisation.

## IMPORTANT

| ID | Problème | Étendue | Impact |
|---|---|---|---|
| **S-1** | 35 dictionnaires statut → ton dispersés, sans source commune | 24 fichiers | Chaque copie est une divergence en puissance ; S-2 en est la preuve |
| **D-2** | Surface de carte retapée 27 fois à l'identique | 27 occurrences | Toute évolution du style de carte demande de repasser partout |
| **T-1** | H2 et H3 visuellement identiques | 26 déclarations | Sur les pages profondes, la hiérarchie n'est plus lisible |

## MODÉRÉ

| ID | Problème |
|---|---|
| **S-2** | `ARCHIVE` d'un référentiel : rouge en fiche, gris en liste |
| **D-1** | Le composant `Card` annule la classe `.card` qu'il applique |
| **E-3** | Deux façons d'afficher un chargement, sans règle d'emploi |
| **E-4** | 17 états vides hors `Vide`, densité différente |
| **TB-1** | 6 tableaux sans le conteneur `Tableau` |
| **V-1** | Focus dessiné en vitrine, par défaut dans l'application |
| **C-1** | Couleurs de graphique en dur, insensibles au thème sombre |
| **E-1** | Rythme vertical des pages non fixé |
| **B-1** | Pas d'état `loading` normalisé sur les boutons |
| **F-2** | Pas de texte d'aide ni d'erreur au niveau du champ |
| **A-1** | 2 à 3 zones interactives sous 24 px par page |
| **E-5** | Aucun retour de succès normalisé |

## MINEUR

| ID | Problème |
|---|---|
| **E-2** | Paddings de carte à trois valeurs (`p-4`, `p-5`, `p-6`) |
| **T-2** | `typoFr` appliquée seulement en vitrine |
| **F-1** | Pas de composant `switch` |
| **C-2** | `text-[15px]` hors échelle — vitrine uniquement, appliqué avec constance |

---

# 19. Éléments à STANDARDISER / CONSERVER / À ARBITRER

## STANDARDISER

| Élément | Justification |
|---|---|
| **Dictionnaires statut → ton** (S-1, S-2) | Un module `lib/statuts.js` exportant les correspondances. C'est la seule duplication qui a **déjà** produit une divergence visible |
| **Surface de carte** (D-1, D-2) | Réconcilier `.card` et `Card`, absorber les 27 copies. Gain de maintenance immédiat |
| **Hiérarchie typographique** (T-1) | Un cran intermédiaire pour les H2. C'est ce qui manque le plus à la lisibilité des pages profondes |
| **Focus de l'application** (V-1) | Étendre la règle `:focus-visible` de la vitrine. Une règle CSS |
| **Palette de graphique** (C-1) | Compléter `COULEURS` et y ramener les 3 fichiers, pour que les graphiques suivent le thème |
| **État vide** (E-4) | Ramener les 17 manuels vers `Vide`, ou l'étendre si un cas ne rentre pas |

## CONSERVER

| Élément | Justification |
|---|---|
| **Absence de modale dans l'application** | Parti pris cohérent : panneaux en ligne partout. Une modale casserait le fil de lecture d'un audit |
| **Absence de toast** | Chaque page rend son retour près de l'action qui l'a produit. Plus précis qu'un toast global |
| **`TONS_NIVEAU_RG26`** | Divergence **documentée et voulue** : le rouge est réservé au risque métier établi |
| **Séparation vitrine / application** | Deux publics, deux langages. Le socle de jetons est partagé, c'est suffisant |
| **`text-[15px]` en vitrine** | Taille de corps propre à la vitrine, appliquée avec constance, absente de l'application |
| **`text-2xl font-bold` du tableau de bord** | Salutation, pas un titre de page |
| **Pas de variante `success` sur les boutons** | Le vert porte le sens « conforme ». Un bouton vert brouillerait ce code |
| **Boutons par classes CSS plutôt que composant** | 189 usages, 2 écarts. Le système fonctionne ; le convertir en composant serait un chantier sans gain |

## À ARBITRER

| Élément | Question posée |
|---|---|
| **État `loading` des boutons** (B-1) | Faut-il un indicateur normalisé, ou `disabled` suffit-il ? |
| **Erreur au niveau du champ** (F-2) | Les formulaires à plusieurs entrées en ont-ils besoin ? |
| **Tableaux bruts** (TB-1) | Les ramener vers `Tableau`, ou acter que certains gèrent déjà leur repli mobile ? |
| **Cible tactile de 24 px** (A-1) | Revoir `.btn-ghost` compact, ou accepter ? |
| **`typoFr` dans l'application** (T-2) | L'appliquer au contenu venu de l'API ? |
| **Rythme vertical** (E-1) | Fixer `space-y-6` partout, ou laisser chaque page décider ? |
| **Contraste** (A-2) | À mesurer avant toute décision |

---

# 20. Plan P4 recommandé

Ordonné par rapport valeur / risque, du plus sûr au plus délicat.

| Étape | Objet | Fichiers | Risque |
|---|---|---|---|
| **P4.1** | `lib/statuts.js` + reprise des 35 dictionnaires, correction de S-2 | ~24 fichiers, **remplacements seulement** | faible |
| **P4.2** | Focus `:focus-visible` de l'application | `index.css`, 1 règle | très faible |
| **P4.3** | Palette de graphique complétée, 3 fichiers ramenés | `charts.jsx`, `SyntheseMission`, `AuditScore`, `NonConformitesEntreprise` | faible |
| **P4.4** | Réconciliation `.card` / `Card` + absorption des 27 surfaces | `index.css`, `ui.jsx`, ~20 fichiers | **moyen** |
| **P4.5** | Cran typographique intermédiaire pour les H2 | ~22 déclarations | **moyen** |
| **P4.6** | États vides et chargement ramenés vers `Vide` / `Loader` | ~20 fichiers | faible |
| **P4.7** | Arbitrages du § 19 | selon décisions | — |

**P4.1 et P4.2 peuvent partir immédiatement** : l'un est un déplacement de
constantes, l'autre une règle CSS.

**P4.4 et P4.5 sont les deux seules étapes à effet visuel large.** Elles
demandent une validation navigateur dédiée sur les cinq largeurs.

---

# 21. Dépendances éventuelles

**Aucune dépendance backend, API, base de données, route, rôle ou permission.**

L'intégralité des constats porte sur `frontend-react/src`. Deux points touchent
des données servies par l'API mais **sans exiger qu'elle change** :

- les libellés de statut affichés dans les badges viennent de l'API sous forme
  d'énumérations (`EN_COURS`, `MINEURE`…) ; leur traduction visuelle est
  entièrement côté client ;
- le texte des critères et des domaines vient de l'API ; c'est ce qui rend
  l'arbitrage `typoFr` (T-2) non trivial.

Aucun paquet nouveau n'est nécessaire : `clsx` est déjà là, Tailwind aussi.

---

# 22. Risques de régression

| Étape | Risque | Surveillance |
|---|---|---|
| **P4.1** statuts | Une correspondance mal recopiée change la couleur d'un état sans qu'on le voie. **35 dictionnaires, 8 énumérations distinctes** | Comparer chaque dictionnaire avant/après, conserver `?? 'neutre'` en repli, vérifier les 8 états au navigateur |
| **P4.2** focus | Un anneau trop épais peut déborder d'un bouton compact | Vérifier `.btn-ghost p-1.5` et les liens de la barre latérale |
| **P4.3** graphiques | Une couleur de série qui change modifie la lecture d'un graphique existant | Comparer les rendus avant/après sur `AuditScore` et `SyntheseMission` |
| **P4.4** cartes | **Le plus élevé.** Toucher `.card` affecte 65 usages de `Card` plus 3 directs ; absorber 27 surfaces touche une vingtaine de fichiers | Contrôle visuel des 5 largeurs sur au moins 8 pages ; vérifier le thème sombre, où bordures et ombres se lisent différemment |
| **P4.5** typographie | Un H2 plus grand décale le rythme vertical de toutes les pages profondes | Vérifier `AuditDetail` et ses 7 onglets, `CritereEvaluation` |
| **P4.6** états | Un état vide plus haut peut déplacer ce qui suit | Vérifier les volets de `AuditDetail` |

**Contrôles applicables à toutes les étapes** : `npx vite build`,
`npm run lint`, diff filtré sur `api.get|post|put|delete|patch` vide, `App.jsx`
et `src/auth/` inchangés, puis validation navigateur avec le pilote Chrome sur
les trois rôles et les cinq largeurs.

---

# 23. Conclusion

**La question posée était : « quelles règles visuelles communes devons-nous
appliquer avant de refaire ou finir les interfaces ? »**

La réponse est plus courte qu'attendu, parce que le plus gros du travail est déjà
fait. Les jetons de couleur, les boutons, les champs, les icônes et le nommage
accessible forment un socle appliqué avec une régularité qui ne demande rien.

Six règles manquent, et elles ont toutes la même origine : **elles concernent ce
qui n'a jamais reçu de primitive.**

1. **Une seule source pour les correspondances statut → couleur.** 35
   dictionnaires, une divergence déjà avérée.
2. **Une seule définition de la surface « carte ».** Aujourd'hui trois, dont une
   retapée 27 fois.
3. **Un troisième cran typographique.** Deux niveaux ne suffisent pas à des pages
   à sept onglets.
4. **Un anneau de focus propre à l'application**, comme la vitrine en a un.
5. **Une palette de graphique qui suit le thème**, au lieu de six hexadécimaux
   figés.
6. **Un seul état vide et un seul état de chargement**, avec la règle qui dit
   lequel employer.

Rien de tout cela ne demande de refaire le design. Ce sont des règles à écrire,
puis à appliquer mécaniquement — ce qui explique le verdict.

```text
Verdict : READY_FOR_P4_IMPLEMENTATION

Problèmes CRITIQUES  : 0
Problèmes IMPORTANTS : 3   (S-1, D-2, T-1)
Problèmes MODÉRÉS    : 12
Problèmes MINEURS    : 4
À STANDARDISER       : 6
À CONSERVER          : 8
À ARBITRER           : 7
Dépendances backend  : aucune
```

---

**Aucune modification effectuée. Aucun composant créé, aucun refactor. Aucun
fichier de code, backend, API, base, route, auth, configuration, paquet, Docker
ou Tailwind modifié. Aucun commit, aucun push.**

# SMARTEX SUSTWAY — P4.5.3, badges et alertes

**Date** : 2026-09-16 · **Périmètre** : `src/components/audit/VoletAnalysesIa.jsx` — 1 fichier, 2 lignes

```text
PHASE UX P4.5.3 — BADGES ET ALERTES

Verdict :
P4.5.3_PARTIEL
```

**Pourquoi partiel** : sur les 11 éléments, **un seul** présente une équivalence
complète avec une primitive existante — il a été migré. Huit sont des variantes
légitimes, démontrées par la mesure. Deux restent à arbitrer, car les corriger
demanderait une décision qui dépasse cette étape.

**Deux chiffres de l'audit P4.5 sont corrigés ici** : le « doublon strict »
annoncé n'en est pas un, et le bloc jugé « divergent » est en réalité cohérent
avec son voisin immédiat. Les deux corrections sont mesurées, § 7 et § 8.

---

# 1. Objectif

Déterminer lesquels des 11 éléments relevés en P4.5 — 7 façon badge, 4 façon
alerte — reproduisent réellement une primitive existante, et ne migrer que ceux
dont l'équivalence est démontrée.

## Les deux primitives, lues avant toute décision

`src/components/ui.jsx` — **non modifié dans cette étape.**

```jsx
export function Badge({ children, ton = 'neutre', icone: Icone }) {
  return <span className={clsx('inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium', TONS[ton])}>
      {Icone ? <Icone className="h-3.5 w-3.5" aria-hidden /> : null}
      {children}
    </span>;
}

export function Alerte({ children, ton = 'bleu' }) {
  return <div className={clsx('flex items-start gap-2 rounded-xl px-4 py-3 text-sm', TONS[ton])}>
      <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
      <p>{children}</p>
    </div>;
}
```

Quatre propriétés de ces signatures commandent presque toutes les décisions qui
suivent, et méritent d'être posées d'emblée :

| Contrainte | Conséquence |
|---|---|
| `Badge` n'accepte **ni `className` ni `title`** | tout élément portant `truncate`, une marge ou une infobulle ne peut pas migrer sans perte |
| `Badge` rend un **`<span>`** | un élément qui est un `<li>` exige un conteneur supplémentaire |
| `Alerte` n'accepte **pas de `className`** | tout bloc portant `mt-4` / `mt-5` perdrait son espacement |
| `Alerte` impose **`<Info>`** et enveloppe ses enfants dans **`<p>`** | une icône différente est impossible ; un contenu à deux paragraphes produirait `<p>` dans `<p>` |

Les tons disponibles sont **six** : `neutre`, `bleu`, `vert`, `ambre`, `rouge`,
`violet`. **Il n'existe pas de ton `brand`.**

---

# 2. Inventaire initial

Relevé dans le code, puis mesuré au navigateur quand l'élément était atteignable.

| # | Fichier | Ligne | Élément | Classes complètes | Contenu | Primitive comparable | Équivalence | Décision |
|---|---|---|---|---|---|---|---|---|
| **B1** | `PlanAmeliorationDetail.jsx` | 263 | **`<li>`** | `rounded-full bg-ink-100 px-2.5 py-1 text-xs text-ink-600` | libellé d'axe + `<span class="ml-1 font-mono text-ink-400">` code | `Badge ton="neutre"` | **partielle** | **À ARBITRER** |
| **B2** | `plans/CarteActionPlan.jsx` | 94 | `<span>` + `title` | `rounded-full bg-ink-100 px-2 py-0.5 text-xs text-ink-600` | libellé d'axe | `Badge ton="neutre"` | **non** | CONSERVER |
| **B3** | `plans/CartePlan.jsx` | 75 | `<span>` + `title` | `truncate rounded-full bg-ink-100 px-2 py-0.5 text-xs text-ink-600` | libellé d'axe | `Badge ton="neutre"` | **non** | CONSERVER |
| **B4** | `MesActions.jsx` | 168 | `<span>` | `rounded-full bg-ink-100 px-2 py-0.5 text-xs text-ink-600` | libellé d'axe | `Badge ton="neutre"` | **non** | CONSERVER |
| **B5** | `audit/CarteCritere.jsx` | 50 | `<span>` | `rounded-full bg-brand-50 px-3 py-1 text-xs font-medium text-brand-700 dark:bg-brand-500/15 dark:text-brand-400` | `Criticité : {libellé}` | `Badge ton=TONS_CRITICITE[…]` | **partielle** | **À ARBITRER** |
| **B6** | `audit/VoletAnalysesIa.jsx` | 91 | `<span>` | `rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300` | `Conformité probable : {score}%` | `Badge ton="vert"` | **exacte** | **MIGRÉ** |
| **B7** | `audit/EnTeteDomaine.jsx` | 32 | `<span>` | `rounded-full bg-brand-50 px-3.5 py-1.5 text-xs font-semibold text-brand-700 dark:bg-brand-500/15 dark:text-brand-400` | `{n} / {total} critères complétés` | aucune | **non** | CONSERVER |
| **A1** | `audit/CarteAnalyseIa.jsx` | 37 | `<p>` | `rounded-xl bg-rose-50 px-3.5 py-2.5 text-xs text-rose-700 dark:bg-rose-500/10 dark:text-rose-300` | message d'erreur d'analyse | `Alerte ton="rouge"` | **non** | CONSERVER |
| **A2** | `audit/CarteAnalyseIa.jsx` | 152 | `<p>` | `mt-4 rounded-xl bg-amber-50 px-3.5 py-2.5 text-xs text-amber-800 dark:bg-amber-500/10 dark:text-amber-300` | avertissement de désynchronisation | `Alerte ton="ambre"` | **non** | CONSERVER |
| **A3** | `tableau-bord/PanneauAlertes.jsx` | 28 | `<p>` | `mt-5 rounded-xl bg-emerald-50 px-3.5 py-3 text-xs text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300` | « Aucun point bloquant » | `Alerte ton="vert"` | **non** | CONSERVER |
| **A4** | `CritereEvaluation.jsx` | 1002 | `<div>` + `Lightbulb` | `flex items-start gap-2 rounded-lg bg-amber-50 p-3 text-sm text-amber-800` | titre + détail, sur deux `<p>` | `Alerte ton="ambre"` | **non** | CONSERVER |

## Première correction de l'audit P4.5

L'audit annonçait « **7 `<span>** façon badge ». La lecture du code montre
**6 `<span>` et 1 `<li>`** : `PlanAmeliorationDetail:263` est un élément de liste
à l'intérieur d'un `<ul class="flex flex-wrap gap-1.5">`. Ce n'est pas un détail
de forme — c'est ce qui empêche une substitution directe (§ 7, § 9).

---

# 3. Analyse des 7 éléments façon badge

## Mesures au navigateur

Relevés `getBoundingClientRect` + `getComputedStyle`, SUPER_ADMIN, 1440 px.

| Élément | h | padding | rayon | taille | graisse | couleur texte | fond | anneau |
|---|---|---|---|---|---|---|---|---|
| **`<Badge>` de référence** | **24** | **4px 10px** | 9999px | 12px | **500** | `rgb(63,73,94)` (ink-700) | `rgb(236,238,242)` | selon ton |
| B1 `PlanAmeliorationDetail` | 24 | **4px 10px** | 9999px | 12px | **400** | `rgb(77,90,116)` (**ink-600**) | `rgb(236,238,242)` | — |
| B2 `CarteActionPlan` | **20** | **2px 8px** | 9999px | 12px | 400 | `rgb(77,90,116)` | `rgb(236,238,242)` | — |
| B5 `CarteCritere` | 24 | **4px 12px** | 9999px | 12px | 500 | `rgb(119,26,21)` (**brand-700**) | `rgb(253,242,241)` | — |
| B6 `VoletAnalysesIa` | 24 | **4px 12px** | 9999px | 12px | 500 | `rgb(4,120,87)` (emerald-700) | `rgb(236,253,245)` | — |
| B7 `EnTeteDomaine` | **28** | **6px 14px** | 9999px | 12px | **600** | `rgb(119,26,21)` | `rgb(253,242,241)` | — |

B3 et B4 n'ont pas pu être observés : les pages `/plans` et `/mes-actions` ne
présentaient aucun axe rattaché dans les données actuelles. Leur analyse repose
donc sur le code, où leur chaîne de classes est **identique à celle de B2** — ce
qui suffit à les classer, puisque le motif bloquant est dans les classes
elles-mêmes (`truncate`, `title`).

## Cas A — équivalence réelle : **1 élément**

**B6 `VoletAnalysesIa:91`.** `<span>` simple, enfant direct d'un conteneur
`flex flex-wrap items-start justify-between gap-3`, sans `title`, sans marge,
sans `truncate`, avec un unique enfant texte. Ton emerald identique à `TONS.vert`
en clair **et en sombre** (`dark:bg-emerald-500/15 dark:text-emerald-300` de part
et d'autre). Rôle identique à celui d'un badge existant : un couple libellé/valeur,
exactement comme le `<Badge ton="bleu">Criticité MOYENNE</Badge>` de la page
d'évaluation.

## Cas B — variante intentionnelle : **4 éléments**

| Élément | Ce qui l'empêche d'être un `<Badge>` |
|---|---|
| **B2** `CarteActionPlan:94` | porte `title={…}` pour révéler le code du critère. `Badge` n'accepte pas `title` : l'infobulle serait perdue. Géométrie `2px 8px` / h=20, **famille cohérente à trois** |
| **B3** `CartePlan:75` | porte `truncate` **et** `title`. `Badge` n'accepte pas `className` : la troncature serait perdue, et les libellés d'axes atteignent 400 px |
| **B4** `MesActions:168` | même chaîne que B2. Migrer celui-ci seul romprait la famille des trois jetons compacts au profit d'une cohérence de façade |
| **B7** `EnTeteDomaine:32` | ce n'est pas un état mais un **compteur d'avancement** (`2 / 91 critères complétés`). Géométrie propre (h=28, `6px 14px`, graisse 600) et ton `brand`, **absent de `TONS`** |

Les trois jetons `px-2 py-0.5` forment un objet distinct : plus petit que `Badge`,
destiné à porter des **phrases** et non des mots d'état. Mesuré sur
`PlanAmeliorationDetail`, un de ces jetons fait **372 px de large**. Ce n'est pas
un badge tronqué, c'est une étiquette.

## Cas C — ambigu : **2 éléments**

**B1 `PlanAmeliorationDetail:263`** — voir § 7.
**B5 `CarteCritere:50`** — voir ci-dessous.

### B5 : la même donnée rendue de deux façons

C'est la découverte la plus significative de cette étape, et elle ne concerne pas
la géométrie.

```jsx
// pages/CritereEvaluation.jsx:145  — passe par la source centralisée P4.1
<Badge ton={TONS_CRITICITE[critere.criticite] ?? 'neutre'}>Criticité {critere.criticite}</Badge>

// components/audit/CarteCritere.jsx:50  — pastille peinte à la main
<span className="rounded-full bg-brand-50 px-3 py-1 text-xs font-medium text-brand-700 …">
  Criticité&nbsp;: {criticite}
</span>
```

Mesuré : sur la page d'évaluation, « Criticité MOYENNE » rend **bleu**
(`rgb(29,78,216)` sur `rgb(239,246,255)`, avec anneau). Sur la carte de saisie,
« Criticité : Moyenne » rend **rouge brique** (`rgb(119,26,21)` sur
`rgb(253,242,241)`, sans anneau) — **et rendrait exactement la même couleur pour
une criticité CRITIQUE que pour une criticité FAIBLE**, puisque la teinte est
constante.

**Pourquoi la migration est bloquée.** `CarteCritere` ne reçoit pas
l'énumération, mais un libellé déjà traduit :

```jsx
// components/audit/SaisieCritereMission.jsx:370
criticite={LIBELLES_CRITICITE[critere.criticite] ?? critere.criticite ?? '—'}
// LIBELLES_CRITICITE = { FAIBLE:'Faible', MOYENNE:'Moyenne', ELEVEE:'Élevée', CRITIQUE:'Critique' }
```

`TONS_CRITICITE` est indexé par `FAIBLE` / `MOYENNE` / `ELEVEE` / `CRITIQUE`. La
prop contient `'Moyenne'`. **La correspondance centralisée ne peut pas s'y
appliquer en l'état.** La rendre applicable exige de modifier le contrat de props
de `CarteCritere` — ce qui dépasse « migration minimale » (§ 10 de la consigne).

Migrer vers un `<Badge ton="bleu">` figé serait pire : la pastille prendrait
l'apparence exacte du badge MOYENNE de l'autre écran tout en ne signifiant rien.

**Décision : À ARBITRER**, avec le chemin identifié — faire descendre
`critere.criticite` brut jusqu'à `CarteCritere`, en plus du libellé.

---

# 4. Décisions badge

## Migrés — 1

| Élément | Vers | Justification |
|---|---|---|
| **B6** `VoletAnalysesIa:91` | `<Badge ton="vert">` | même balise, même rôle, mêmes couleurs en clair et en sombre, aucun attribut perdu |

## Conservés — 4

| Élément | Motif |
|---|---|
| **B2** `CarteActionPlan:94` | `title` non transmissible ; famille de jetons compacts |
| **B3** `CartePlan:75` | `truncate` **et** `title` non transmissibles |
| **B4** `MesActions:168` | appartient à la même famille de trois ; migration isolée nuisible |
| **B7** `EnTeteDomaine:32` | compteur d'avancement, pas un état ; ton `brand` absent de `TONS` |

## À arbitrer — 2

| Élément | Question posée |
|---|---|
| **B1** `PlanAmeliorationDetail:263` | accepter +7 px de large, +2 px de haut et un texte plus foncé/plus gras en échange de l'alignement sur la primitive ? (§ 7) |
| **B5** `CarteCritere:50` | faire descendre la criticité brute jusqu'au composant pour que la couleur redevienne porteuse de sens ? |

---

# 5. Analyse des 4 éléments façon alerte

| Critère | A1 `CarteAnalyseIa:37` | A2 `CarteAnalyseIa:152` | A3 `PanneauAlertes:28` | A4 `CritereEvaluation:1002` |
|---|---|---|---|---|
| **Rôle** | erreur d'analyse IA | saisies non prises en compte | absence de point bloquant | pistes d'amélioration |
| **Contenu** | une phrase | une phrase | une phrase | **titre + détail, deux `<p>`** |
| **Couleur** | rose | ambre | émeraude | ambre |
| **Icône** | **aucune** | **aucune** | **aucune** | **`Lightbulb`** |
| **Bordure** | aucune | aucune | aucune | aucune |
| **Rayon** | `rounded-xl` | `rounded-xl` | `rounded-xl` | **`rounded-lg`** |
| **Padding** | `px-3.5 py-2.5` | `px-3.5 py-2.5` | `px-3.5 py-3` | **`p-3`** |
| **Taille** | `text-xs` | `text-xs` | `text-xs` | **`text-sm`** |
| **Marge portée** | — | **`mt-4`** | **`mt-5`** | — |
| **Comportement** | statique | statique | statique | statique |
| **Mode sombre** | `dark:` présent | `dark:` présent | `dark:` présent | **absent** |
| **Primitive comparable** | `Alerte ton="rouge"` | `Alerte ton="ambre"` | `Alerte ton="vert"` | `Alerte ton="ambre"` |

## Ce qui empêche chacune de migrer

**A1, A2, A3 — trois notes en ligne, pas des alertes de page.** Ce sont des `<p>`
à `text-xs`, **sans icône**, tandis que `<Alerte>` est un `<div>` à `text-sm`
**avec un `<Info>` imposé** et `px-4 py-3`. Les migrer ajouterait une icône dans
trois emplacements où elle n'a pas été voulue, et grossirait le texte d'un cran
dans des cartes déjà denses.

À cela s'ajoute un blocage mécanique pour deux d'entre elles : **A2 porte `mt-4`
et A3 porte `mt-5`**, et `<Alerte>` n'accepte pas de `className`. Leur espacement
serait purement et simplement perdu.

**A4 — voir § 8.** Deux blocages : `<Alerte>` impose `<Info>` là où le sens
appelle `Lightbulb`, et elle enveloppe ses enfants dans un `<p>`, ce qui
produirait `<p>` à l'intérieur d'un `<p>` pour un contenu qui en compte déjà deux.
Le navigateur refermerait le paragraphe extérieur au premier enfant, transformant
le bloc en trois paragraphes frères et détruisant la disposition `flex`.

## Observabilité

A1, A2 et A3 **n'ont pas pu être observés au navigateur** : ce sont des états
conditionnels — erreur d'analyse, désynchronisation, tableau de bord sans aucune
alerte — qu'aucune donnée actuelle ne déclenche. Les provoquer supposerait de
modifier la base, ce qui est interdit.

Leur classement ne repose pas sur une impression visuelle mais sur des faits de
code : l'absence de `className` dans la signature de `<Alerte>` et la présence de
`mt-4` / `mt-5` dans leur chaîne de classes sont vérifiables sans rendu. **A4 a,
lui, été observé et mesuré.**

---

# 6. Décisions alerte

## Migrés — 0

## Conservés — 4

| Élément | Motif |
|---|---|
| **A1** `CarteAnalyseIa:37` | note en ligne sans icône, `text-xs` ; `<Alerte>` imposerait `<Info>` et `text-sm` |
| **A2** `CarteAnalyseIa:152` | idem, **et** `mt-4` non transmissible |
| **A3** `PanneauAlertes:28` | idem, **et** `mt-5` non transmissible |
| **A4** `CritereEvaluation:1002` | icône `Lightbulb`, contenu à deux paragraphes, cohérent avec son voisin immédiat (§ 8) |

## À arbitrer — 0 sur la migration, 1 constat distinct

`A4` ne déclare **aucune variante `dark:`**. Mesuré (§ 11) : en mode sombre, il
reste `rgb(255,251,235)` — un pavé crème sur une carte devenue
`rgb(23,28,38)` — alors que le bloc juste au-dessus suit correctement le thème.
Le correctif tiendrait en une classe, calquée sur A2 :
`dark:bg-amber-500/10 dark:text-amber-300`.

**Il n'a pas été appliqué** : la consigne ouvrait trois issues — migrer, conserver,
arbitrer — et ajouter des classes n'en est aucune. Le constat est remonté pour
décision.

---

# 7. `PlanAmeliorationDetail:263`

La consigne demandait de trancher six points. Voici la réponse mesurée pour
chacun.

| Question | Réponse |
|---|---|
| **Même rôle ?** | **Oui** — étiquette neutre nommant un axe d'amélioration |
| **Mêmes couleurs ?** | **Non** — texte `rgb(77,90,116)` (ink-600) contre `rgb(63,73,94)` (ink-700). Fond identique |
| **Même rayon ?** | **Oui** — `9999px` de part et d'autre |
| **Même typographie ?** | **Non** — graisse **400** contre **500**. Taille identique (12 px) |
| **Même comportement ?** | **Oui** — aucune interaction d'aucun côté |
| **Mêmes états ?** | **Oui** — ni survol, ni focus, ni état actif |

**Quatre points sur six concordent. L'équivalence n'est donc pas complète**, et
l'audit P4.5 avait tort d'écrire « identique à `<Badge ton="neutre">` » : la
géométrie l'est — `4px 10px`, mesuré des deux côtés — mais ni la graisse ni la
couleur du texte.

## Ce que coûterait la migration, mesuré

Plutôt que d'en débattre, la substitution a été **simulée dans le navigateur** :
un clone portant la chaîne de classes exacte de `<Badge ton="neutre">` a été
inséré à côté de chaque chip réel, mesuré, puis retiré. Aucun fichier n'a été
modifié pour cet essai.

| Largeur | Chip | Avant (l × h) | Après (l × h) | Hauteur du `<li>` conteneur | Lignes | Débordement |
|---|---|---|---|---|---|---|
| **390 px** | 1 | 316 × **40** | 316 × **40** | 42 (**+2**) | 2 → 2 | aucun |
| **390 px** | 2 | 307 × 24 | **314** × 24 | 26 (**+2**) | 1 → 1 | aucun |
| **768 px** | 1 | 413 × 24 | **420** × 24 | 26 (**+2**) | 1 → 1 | aucun |
| **1440 px** | 1 | 413 × 24 | **420** × 24 | 26 (**+2**) | 1 → 1 | aucun |

**Le rendu ne casse pas** — c'est le point important, et il contredit ce que la
seule lecture du code laissait craindre. Même à 390 px, où le libellé passe sur
deux lignes, la hauteur reste à 40 px.

Le coût réel est donc modeste et entièrement chiffré :

- **+7 px de large** par chip, dus à la graisse 500 ;
- **+2 px de haut** par rangée, dus au `<li>` conteneur que la migration impose —
  `Badge` rend un `<span>`, qui ne peut pas être enfant direct d'un `<ul>` sans
  détruire la sémantique de liste ;
- un texte **plus foncé et plus gras** sur des étiquettes qui portent des phrases
  de 400 px, là où la graisse normale a pu être choisie précisément pour cela.

**Décision : À ARBITRER.** La consigne dit « si l'équivalence est complète,
migrer ; sinon, conserver et expliquer » — elle ne l'est pas. Mais l'essai montre
que la migration est réalisable sans casse, donc la conserver relève d'un choix
esthétique qui vous revient, pas d'un obstacle technique. Les deux chiffres
ci-dessus sont tout ce qu'il faut pour trancher.

---

# 8. `CritereEvaluation:1002`

La consigne demandait si les quatre blocs ont le même rôle, la même sémantique,
le même contenu et la même fonction. **Non**, et la mesure le montre sans
ambiguïté.

## Le bloc n'est pas isolé : il a un voisin

`CritereEvaluation` empile deux blocs consultatifs. Le premier, ligne 966 :

```jsx
<div className="rounded-lg border border-ink-200 bg-ink-50/60 p-3 text-sm">
  <div className="flex items-start gap-2">
    <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-ink-400" aria-hidden />
    …  {/* « Signal de risque — IA », titre + détails */}
```

Le second, ligne 1002 — celui que l'audit P4.5 voulait « standardiser » :

```jsx
<div className="flex items-start gap-2 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
  <Lightbulb className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
  <div>
    <p className="font-medium">Pistes d'amélioration</p>
    <p className="mt-0.5 text-xs">{evaluation.pistesAmelioration}</p>
```

Mesure des deux, à 1440 px, sur la même page :

| Bloc | padding | rayon | taille | largeur |
|---|---|---|---|---|
| **A4** — « Pistes d'amélioration » | **12px** | **8px** | **14px** | 449 |
| **Voisin** — « Signal de risque — IA » | **12px** | **8px** | **14px** | 449 |

**Identiques.** `rounded-lg p-3 text-sm` n'est pas une dérive : c'est la
convention des blocs consultatifs de cet écran, tenue par deux éléments empilés
l'un sur l'autre, tous deux avec une icône `h-4 w-4` en `items-start gap-2`, tous
deux à deux niveaux de texte.

## Seconde correction de l'audit P4.5

L'audit recommandait de « **STANDARDISER le quatrième sur les trois autres** »,
c'est-à-dire de le passer en `rounded-xl px-3.5 text-xs`. **Cette recommandation
était fausse.** L'appliquer aurait aligné `A4` sur trois notes situées dans
d'autres composants — et l'aurait fait diverger du bloc affiché **juste
au-dessus de lui, sur le même écran**.

L'erreur vient de la méthode : l'audit avait groupé les quatre blocs par
géométrie (`rounded-* p-*` sur fond pastel) sans vérifier ce que chacun voisinait.
C'est la même erreur de regroupement que celle corrigée en P4.5.2 pour
`SuiviAnalyse:83`.

**Décision : CONSERVER**, sans réserve sur la géométrie.

---

# 9. Structure HTML

Aucune substitution n'a été faite sans vérifier ses conséquences sémantiques. Le
tableau ci-dessous récapitule ce qui aurait changé pour chaque élément non migré.

| Élément | Structure | Display | Accessibilité | Interaction | Verdict |
|---|---|---|---|---|---|
| **B1** | `<li>` → `<span>` : exige un conteneur, sinon `<span>` enfant direct de `<ul>` — HTML invalide et perte de la sémantique de liste | inline → `inline-flex` : le libellé et le code du critère deviendraient deux éléments flex | la liste doit rester une liste pour les lecteurs d'écran | aucune | **bloquant sans conteneur** |
| **B2, B3** | inchangée | inchangé | — | **`title` perdu** : le code du critère cesse d'être révélé au survol | **bloquant** |
| **B3** | inchangée | inchangé | — | **`truncate` perdu** sur des libellés de 400 px | **bloquant** |
| **B5** | inchangée | inchangé | — | couleur cesserait de dépendre de la criticité, ou contrat de props à modifier | **bloquant en l'état** |
| **B7** | inchangée | inchangé | — | ton `brand` inexistant dans `TONS` | **bloquant** |
| **A2, A3** | inchangée | inchangé | — | **`mt-4` / `mt-5` perdus** | **bloquant** |
| **A4** | `<div>` + deux `<p>` → `<p>` enveloppant deux `<p>` : **imbrication invalide**, le navigateur refermerait le paragraphe extérieur | `flex` détruit | **icône `Lightbulb` remplacée par `Info`** : perte de sens | aucune | **bloquant** |
| **B6** | `<span>` → `<span>` | `inline` → `inline-flex`, tous deux éléments flex du même parent : **hauteur mesurée identique, 24 px** | aucun rôle ARIA de part et d'autre | aucune | **sans conséquence** |

`<Badge>` n'a reçu aucune API nouvelle. `<Alerte>` non plus. Aucune primitive
d'alerte n'a été créée.

---

# 10. Mesures avant / après

```text
Éléments façon badge avant : 7
  Migrés vers <Badge>       : 1     (B6 VoletAnalysesIa:91)
  Conservés                 : 4     (B2, B3, B4, B7)
  À arbitrer                : 2     (B1, B5)

Blocs façon alerte avant   : 4
  Migrés vers <Alerte>      : 0
  Conservés                 : 4     (A1, A2, A3, A4)
  À arbitrer                : 0     (+ 1 constat mode sombre sur A4)
```

## Le seul élément migré, avant et après

| Propriété | Avant (`<span>` local) | Après (`<Badge ton="vert">`) | Écart |
|---|---|---|---|
| Hauteur | 24 px | **24 px** | aucun |
| Largeur (score 50 %) | 179 px | **175 px** | **−4 px** |
| Largeur (score 0 %) | 172 px | **168 px** | **−4 px** |
| Padding | `4px 12px` | **`4px 10px`** | `px-3` → `px-2.5` |
| Rayon | 9999px | **9999px** | aucun |
| Taille / graisse | 12px / 500 | **12px / 500** | aucun |
| Couleur du texte | `rgb(4,120,87)` | **`rgb(4,120,87)`** | aucun |
| Fond | `rgb(236,253,245)` | **`rgb(236,253,245)`** | aucun |
| Anneau | aucun | **`ring-1 ring-emerald-200`** | ajouté — aligne sur les 73 autres badges |
| Mode sombre | `dark:bg-emerald-500/15 dark:text-emerald-300` | **identique**, + `dark:ring-emerald-500/30` | aucun sur fond et texte |

Le comportement mesuré après modification est **exactement** celui que la
simulation par clonage avait prédit avant de toucher au fichier.

Le sélecteur de l'ancienne pastille peinte à la main
(`span[class~="bg-emerald-50"][class~="px-3"]`) ne renvoie plus aucun élément :
le doublon a disparu, il n'a pas été dupliqué.

---

# 11. Validation responsive

Élément migré, page « Analyses IA » de la mission `Campagne RSE 2026`, deux
occurrences par largeur (scores 50 % et 0 %).

| Largeur | Hauteur | Largeur rendue | Padding | Rayon | Graisse | Anneau | Troncature | Débordement élément | Débordement page |
|---|---|---|---|---|---|---|---|---|---|
| **390 px** | 24 | 175 / 168 | `4px 10px` | 9999px | 500 | présent | **non** | **non** | **non** |
| **768 px** | 24 | 175 / 168 | `4px 10px` | 9999px | 500 | présent | **non** | **non** | **non** |
| **1024 px** | 24 | 175 / 168 | `4px 10px` | 9999px | 500 | présent | **non** | **non** | **non** |
| **1280 px** | 24 | 175 / 168 | `4px 10px` | 9999px | 500 | présent | **non** | **non** | **non** |
| **1440 px** | 24 | 175 / 168 | `4px 10px` | 9999px | 500 | présent | **non** | **non** | **non** |

**Rigoureusement stable aux cinq largeurs.** Le conteneur parent est
`flex flex-wrap items-start justify-between gap-3` : à 390 px le badge passe sous
le titre de la carte, sans compression ni chevauchement.

## Contrôle complémentaire : mode sombre

Mené sur `CritereEvaluation`, en basculant `.dark` sur `<html>` à l'exécution,
sans rien modifier :

| Élément | Clair | Sombre | Suit le thème ? |
|---|---|---|---|
| Carte hôte | `rgb(255,255,255)` | `rgb(23,28,38)` | **oui** |
| Voisin « Signal de risque » | `rgba(246,247,249,0.6)` | `rgba(16,20,28,0.6)` | **oui** |
| **A4 « Pistes d'amélioration »** | `rgb(255,251,235)` | **`rgb(255,251,235)`** | **non** |

C'est le constat du § 6 : A4 reste un pavé crème sur une carte sombre. Le texte y
demeure lisible — ambre foncé sur crème — mais le bloc tranche avec son voisin.

---

# 12. Validation navigateur

Chrome headless piloté par le DevTools Protocol, session SUPER_ADMIN réelle.

| Contrôle | Résultat |
|---|---|
| Pages ouvertes | plan d'amélioration, mission (onglets **Critères** et **Analyses IA**), évaluation de critère, évaluation avec recommandation, tableau de bord |
| Rendu avant modification | relevé pour B1, B2, B5, B6, B7, A4 et son voisin |
| Rendu après modification | relevé pour B6 aux 5 largeurs |
| Contrôle visuel | capture 1440 px relue : les deux badges verts s'alignent à droite des en-têtes de carte, anneau visible, aucun chevauchement |
| Interactions | aucune sur l'élément migré, ni avant ni après — vérifié par absence de `onClick`, `href`, `tabindex` et `role` |
| Simulation de migration | B1 : clone DOM mesuré puis retiré, aucun fichier touché |
| Mode sombre | basculé à l'exécution, A4 et son voisin comparés |

## Ce qui n'a pas pu être observé

| Élément | Raison |
|---|---|
| **B3** `CartePlan:75`, **B4** `MesActions:168` | aucun axe rattaché dans les données actuelles |
| **A1** `CarteAnalyseIa:37` | état d'erreur d'analyse, non déclenché |
| **A2** `CarteAnalyseIa:152` | état de désynchronisation, non déclenché |
| **A3** `PanneauAlertes:28` | exige un tableau de bord sans aucune alerte |

Ces quatre décisions sont toutes des **conservations**, et reposent sur des faits
de code vérifiables sans rendu — la signature de `<Alerte>`, qui n'accepte pas de
`className`, et les classes `mt-4` / `mt-5` / `truncate` / `title` présentes dans
les éléments. Aucune n'a été tranchée sur une impression visuelle.

---

# 13. Console

**0 erreur, 0 avertissement** sur l'ensemble des chargements de cette étape :
5 largeurs sur la page « Analyses IA » après migration, plus les relevés
préalables sur les cinq pages et le contrôle en mode sombre.

Aucune erreur React n'a été produite — en particulier, aucun avertissement
d'imbrication invalide, ce qui confirme que la migration n'a pas introduit de
`<span>` dans un contexte qui l'interdit.

---

# 14. Build / lint / tests

| Contrôle | Commande | Résultat |
|---|---|---|
| Build | `npx vite build` | **code 0** — 1971 modules transformés, terminé en 5,83 s |
| Lint | `npm run lint` (oxlint) | **code 0** — 0 erreur ; 1 avertissement `Landing.jsx:19` (`SMARTEX` importé non utilisé), **préexistant**, fichier non touché |
| Tests frontend | — | **aucun** : `package.json` n'expose que `dev`, `build`, `lint`, `preview` |

Le conteneur `smartex-frontend` a été redémarré avant mesure, conformément à
l'anomalie d'environnement connue : le montage lié Windows ne propage pas les
événements `inotify`, et Vite continuerait sinon à servir la transformation
précédente.

---

# 15. Fichiers modifiés

```
 src/components/audit/VoletAnalysesIa.jsx | 6 ++----
 1 file changed, 2 insertions(+), 4 deletions(-)
```

```diff
-import { Loader } from '../ui';
+import { Badge, Loader } from '../ui';

-            <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">
-              Conformité probable : {analyse.score}%
-            </span>
+            <Badge ton="vert">Conformité probable : {analyse.score}%</Badge>
```

**Un seul fichier.** Aucun composant créé, aucune primitive modifiée, aucun
dictionnaire de couleurs introduit.

---

# 16. Régressions éventuelles

## Contrôles passés

| Contrôle | Résultat |
|---|---|
| Appels API dans le diff | **0** |
| Routes (`App.jsx`) | **4 lignes, toutes de P1.4** — rien de P4.5.3 |
| Auth (`src/auth/`) | **diff vide** |
| Backend / base | **aucun fichier touché** (les 11 fichiers `api-quarkus` modifiés relèvent de la phase 3D, en pause) |
| Configuration | `package.json`, `tailwind.config.js`, `vite.config.js`, `docker-compose.yml` → **0** |
| Composant `<Badge>` | **non modifié** |
| Composant `<Alerte>` | **non modifié** |
| `lib/tonsStatuts.js` (source P4.1) | **diff vide** |
| `ui.jsx` | 1 ligne modifiée — **celle de P4.4 (`Card`)**, aucune de cette étape |
| 10 autres éléments du périmètre | **non modifiés** |
| HEAD | **`d1b8bb6`**, inchangé — aucun commit, aucun push |

## Constats remontés pour décision

Trois observations faites pendant l'audit, qu'il serait malhonnête de taire — et
qu'il serait tout aussi malhonnête de corriger sans votre accord, puisqu'aucune
ne relève du périmètre de cette étape.

| Constat | Mesure | Portée |
|---|---|---|
| **« Conformité probable : 0 % » s'affiche en vert** | vu et mesuré sur deux analyses, scores 50 % et 0 %, même teinte émeraude | **antérieur à cette étape** ; la migration le préserve à l'identique, sans l'aggraver ni le corriger. Y remédier suppose de décider de seuils de score — une règle métier, pas une question de design |
| **« Criticité » rend rouge brique ici, bleu ailleurs** | `rgb(119,26,21)` sur la carte de saisie, `rgb(29,78,216)` sur la page d'évaluation, pour la même valeur MOYENNE | § 3. Correction possible, mais elle passe par le contrat de props de `CarteCritere` |
| **A4 ne suit pas le mode sombre** | reste `rgb(255,251,235)` quand sa carte passe à `rgb(23,28,38)` | § 11. Une classe suffirait : `dark:bg-amber-500/10 dark:text-amber-300` |

## Ce qui reste à surveiller

| Point | Pourquoi |
|---|---|
| **B3 et B4 non observés** | leur conservation repose sur leurs classes (`truncate`, `title`), pas sur un rendu vu. À confirmer le jour où un plan aura des axes rattachés |
| **A1, A2, A3 non observés** | états conditionnels d'erreur ; même remarque |
| **L'anneau ajouté à B6** | seul changement visuel réel de l'étape. Vu en capture, conforme aux 73 autres badges |

---

# 17. Conclusion

Sur onze éléments désignés, **un seul** reproduisait vraiment une primitive
existante, et il a été migré : la pastille de score IA de `VoletAnalysesIa`
devient `<Badge ton="vert">`, pour un écart mesuré de −4 px de large et un anneau
qui l'aligne sur les 73 badges du produit. Le reste du rendu est identique au
pixel, en mode clair comme en mode sombre, aux cinq largeurs.

Les huit conservations ne sont pas des abstentions. Chacune bute sur un fait
vérifiable : `<Badge>` n'accepte ni `className` ni `title`, donc les jetons qui
portent `truncate` ou une infobulle ne peuvent pas migrer sans perte ;
`<Alerte>` n'accepte pas de `className` non plus, donc deux notes perdraient leur
espacement ; elle impose une icône `Info`, donc `Lightbulb` disparaîtrait ; elle
enveloppe ses enfants dans un `<p>`, donc un contenu à deux paragraphes
produirait une imbrication invalide. Et il n'existe pas de ton `brand`, ce qui
écarte mécaniquement deux pastilles.

Deux corrections de l'audit P4.5 méritent d'être retenues, parce qu'elles
viennent du même défaut de méthode — avoir groupé des éléments sur leur
géométrie sans regarder ce qu'ils voisinaient :

- le « **doublon strict** » de `PlanAmeliorationDetail:263` n'en est pas un. La
  géométrie est bien identique (`4px 10px` des deux côtés), mais la graisse est
  400 contre 500 et le texte `ink-600` contre `ink-700` — et c'est un `<li>`, pas
  un `<span>` ;
- le bloc « **divergent** » de `CritereEvaluation:1002` est en réalité aligné sur
  le bloc affiché juste au-dessus de lui : `12px` de padding, `8px` de rayon,
  `14px` de texte, mesurés sur les deux. Standardiser l'un sur des notes situées
  dans d'autres composants l'aurait fait diverger de son propre voisin.

Enfin, l'essai de migration de `B1` par clonage DOM a montré quelque chose que la
lecture du code ne laissait pas prévoir : elle ne casse rien, même à 390 px où le
libellé passe sur deux lignes. Son coût tient en deux nombres — +7 px de large,
+2 px de haut — ce qui la rend arbitrable sur des faits plutôt que sur une
intuition.

```text
Verdict : P4.5.3_PARTIEL

Elements facon badge     : 7  -> 1 migre, 4 conserves, 2 a arbitrer
Blocs facon alerte       : 4  -> 0 migre, 4 conserves, 0 a arbitrer
Fichiers modifies        : 1
Lignes changees          : 2 insertions, 4 suppressions
<Badge> / <Alerte>       : NON MODIFIES
Nouvelle primitive       : aucune
Nouvelle API de composant: aucune
Dictionnaire de couleurs : aucun ajout
Mesures navigateur       : 5 largeurs sur l'element migre, + mode sombre
Troncature               : 0
Debordements             : 0
Erreurs console          : 0
Build / Lint             : PASS
Corrections de l'audit P4.5 : 2
```

---

**Arrêt ici. P4.5.4 n'est pas commencé. Aucune autre incohérence P4.5 n'a été
traitée. Aucun backend, API, base, route ou auth modifiés. Aucun commit, aucun
push.**

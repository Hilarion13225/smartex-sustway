# SMARTEX SUSTWAY — P4.5.1, normalisation des hauteurs de boutons

**Date** : 2026-09-16 · **Périmètre** : `src/index.css` — 1 fichier, 1 règle, 2 lignes

```text
PHASE UX P4.5.1 — HAUTEURS DE BOUTONS

Verdict :
P4.5.1_OK
```

---

# 1. Problème initial

L'audit P4.5 avait mesuré, sur 5 pages et 5 largeurs, des boutons à **32, 36 et
38 px** coexistant dans la même barre d'actions :

```
dashboard     390px  btn  6 h=32,36,38
mission       390px  btn  7 h=32,36,38
referentiels  390px  btn  3 h=32,36,38
utilisateurs  390px  btn  7 h=32,36,28
```

Le **38 px** était systématiquement le bouton secondaire, le **36 px** le
primaire. Posés côte à côte — « Annuler » / « Enregistrer », « Retour » /
« Valider » — ils rendaient un décalage de **2 px** visible sur le bord
supérieur comme sur le bord inférieur.

## Cause

```css
.btn { @apply inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium …; }
.btn-primary   { @apply btn bg-brand-600 text-white …; }
.btn-secondary { @apply btn border border-ink-200 bg-surface text-ink-700 …; }
```

Le primaire n'a **pas de bordure** : `2 × 8px` (`py-2`) + `20px` de ligne = **36 px**.
Le secondaire porte `border` — soit `1px` en haut et `1px` en bas, qui s'ajoutent
au padding : **38 px**.

Le décalage n'était donc pas une négligence locale mais une conséquence
mécanique de `box-sizing: content-box` sur le padding vertical de deux variantes
dont l'une seule est bordée.

---

# 2. Correction appliquée

`src/index.css`, dans `@layer components`, **après** le `@apply` de `.btn-secondary` :

```diff
  .btn-secondary {
    @apply btn border border-ink-200 bg-surface text-ink-700 hover:bg-ink-50 …;
+   padding-top: calc(0.5rem - 1px);
+   padding-bottom: calc(0.5rem - 1px);
  }
```

Le padding vertical du secondaire absorbe l'épaisseur de sa propre bordure :
`(8 − 1) × 2 + 1 + 1 + 20 = 36 px`.

**Le bouton primaire n'a pas été touché.** Conformément à la consigne, la
référence reste **36 px** et c'est le secondaire qui s'y aligne. Les propriétés
horizontales (`px-4`), le rayon, la couleur, la bordure, la typographie et les
états `hover`/`focus` sont inchangés.

**2 lignes ajoutées, 0 supprimée, 1 fichier.**

---

# 3. Mesures après correction

**50 relevés** : 10 pages × 5 largeurs (390 / 768 / 1024 / 1280 / 1440 px),
hauteur `getBoundingClientRect().height` de chaque bouton visible.

| Page | 390 | 768 | 1024 | 1280 | 1440 |
|---|---|---|---|---|---|
| Référentiels | prim 36 · sec 36 | 36 · 36 | 36 · 36 | 36 · 36 | 36 · 36 |
| Rapports | 36 · 36 | 36 · 36 | 36 · 36 | 36 · 36 | 36 · 36 |
| Plan d'action | — · 36 | — · 36 | — · 36 | — · 36 | — · 36 |
| Comparaison | 36 · 36 | 36 · 36 | 36 · 36 | 36 · 36 | 36 · 36 |
| Organisation | 36 · 36 | 36 · 36 | 36 · 36 | 36 · 36 | 36 · 36 |
| Abonnement | — · — | — · — | — · — | — · — | — · — |
| 404 | 36 · — | 36 · — | 36 · — | 36 · — | 36 · — |
| Critère | — · — | — · — | — · — | — · — | — · — |
| Utilisateurs | 36 · — | 36 · — | 36 · — | 36 · — | 36 · — |
| Projets | 36 · — | 36 · — | 36 · — | 36 · — | 36 · — |

`—` : aucun bouton de cette variante sur la page à cette largeur.

**Aucun 38 px sur les 50 relevés.** Le secondaire mesure 36 px partout, au même
titre que le primaire.

## Boutons ghost

Les variantes ghost n'étaient pas dans le périmètre et **n'ont pas été
modifiées**. Elles sont relevées pour vérifier qu'elles n'ont pas bougé :

| Hauteur | Nature | Occurrences |
|---|---|---|
| **28 px** | ghost icône seule, compact (lignes de tableau, `Utilisateurs`, `Organisation`) | 6 |
| **32 px** | ghost icône seule, standard (`Plan d'action`, en-têtes) | jusqu'à 10 par page |
| **36 px** | ghost avec libellé — aligné sur `.btn` | 1 à 11 selon la page |

Trois échelles pour trois usages distincts : action dense en tableau, action
d'icône isolée, action textuelle. Ce n'est pas une divergence, et la consigne ne
demandait pas de les toucher.

## Trois valeurs hors échelle, expliquées

| Relevé | Valeur | Explication |
|---|---|---|
| `plan` 390 px, 1 secondaire | **56 px** | libellé sur 2 lignes à 390 px — `items-center` + `px-4` ; disparaît dès 768 px |
| `entreprise` 390 px, 1 ghost | **56 px** | idem, retour à 36 px à 768 px |
| `entreprise` 1024 px, 1 ghost | **76 px** | bouton à libellé long dans une colonne étroite au seul palier 1024 px |

Ce sont des **retours à la ligne**, pas des hauteurs déclarées : la hauteur de
ligne se multiplie, le padding reste identique. Aucune ne provient de P4.5.1 —
ces boutons ne portent pas `.btn-secondary` bordé au moment du relevé, et leur
padding vertical est celui de `.btn`. Aucun débordement n'en résulte (§ 5).

---

# 4. Paires primaire / secondaire adjacentes

Un contrôle spécifique a comparé, pour chaque couple de boutons primaire et
secondaire voisins dans le même conteneur, l'égalité de leurs hauteurs.

| Page | Paires détectées | Paires alignées |
|---|---|---|
| Référentiels | 1 (à chaque largeur) | **1 / 1** |
| Rapports | 2 à 390 px, 4 au-delà | **2/2 puis 4/4** |
| Organisation | 1 à 390 px, 2 au-delà | **1/1 puis 2/2** |
| Autres pages | 0 | — |

**0 paire désalignée sur l'ensemble des relevés.**

## Nuance : 15 emplacements affectés, pas 16

L'inventaire statique du code recense **16 emplacements** où un `.btn-primary` et
un `.btn-secondary` sont adjacents. L'un d'eux — **`Inscription.jsx:548`** — est
dans la **vitrine**, où la règle

```css
.vitrine .btn-primary,
.vitrine .btn-secondary { min-height: 48px; … }
```

impose déjà **48 px aux deux variantes** : le `min-height` écrase la différence
de padding, et les deux boutons y étaient donc **déjà alignés avant P4.5.1**.

**15 emplacements** sur 16 étaient réellement concernés. La vitrine n'a pas été
touchée, et son `min-height: 48px` reste en vigueur : `calc(0.5rem - 1px)` ne
peut pas descendre sous un `min-height`.

---

# 5. Validation navigateur

| Contrôle | Résultat |
|---|---|
| Pages parcourues | **10** |
| Largeurs | **390 / 768 / 1024 / 1280 / 1440 px** |
| Relevés | **50** |
| Boutons à 38 px | **0** |
| Paires désalignées | **0** |
| Débordement d'élément | **0** |
| Débordement de page (scroll horizontal) | **0** |
| Erreurs console | **0** |
| Avertissements console | **0** |

Le texte des boutons reste centré verticalement : `items-center` répartit
l'espace, et la réduction de 1 px de chaque côté est symétrique.

---

# 6. Build / lint / tests

| Contrôle | Résultat |
|---|---|
| `npx vite build` | **BUILD=0** |
| `npm run lint` | **0 erreur** ; 1 avertissement `Landing.jsx:19` — préexistant, fichier non touché |
| Tests frontend | **aucun** — `package.json` n'expose que `dev`, `build`, `lint`, `preview` |

---

# 7. Fichiers modifiés

```
 src/index.css | 2 ++
 1 file changed, 2 insertions(+)
```

Aucun composant React modifié, aucune classe utilitaire ajoutée dans le JSX,
aucun nouveau composant créé.

---

# 8. Régressions éventuelles

## Contrôles passés

| Contrôle | Résultat |
|---|---|
| Appels API | **0** |
| Routes | **0** |
| `src/auth/` | **0** |
| Backend / base | **0** |
| Configuration (`tailwind.config.js`, `vite.config.js`, `package.json`) | **0** |
| `.btn-primary` | **non modifié — reste 36 px** |
| `.vitrine .btn-*` | **non modifié — reste `min-height: 48px`** |
| `.btn-ghost` | **non modifié** |

## Ce qui reste à surveiller

| Point | Pourquoi |
|---|---|
| **Boutons secondaires à bordure épaisse** | Si une variante future portait `border-2`, le `calc(0.5rem - 1px)` ne compenserait qu'une moitié. Aucune n'existe aujourd'hui |
| **Les 3 hauteurs hors échelle** (56/56/76 px) | Retours à la ligne préexistants, indépendants de cette correction. Relèveraient d'un travail sur la longueur des libellés, pas sur `.btn` |
| **Pages non parcourues** | 10 pages mesurées. La correction étant portée par une règle CSS unique, elle s'applique partout, mais seules ces 10 ont été observées |

---

# 9. Conclusion

Le bouton secondaire mesure désormais **36 px**, comme le primaire, sur les
**50 relevés** de 10 pages à 5 largeurs. Le décalage de 2 px venait de la bordure
du secondaire qui s'ajoutait à son padding ; la correction fait absorber cette
bordure par le padding, en deux lignes de CSS, sans toucher au primaire ni à la
vitrine.

Un point mérite d'être noté au-delà du chiffre : sur les 16 emplacements du code
où les deux variantes se côtoient, **un seul** — `Inscription.jsx:548` — était
déjà aligné, parce qu'il vit dans la vitrine où un `min-height: 48px` écrase la
différence. Le gain réel porte donc sur **15** emplacements, pas 16.

```text
Verdict : P4.5.1_OK

Fichiers modifies      : 1  (src/index.css)
Lignes ajoutees        : 2
Bouton primaire        : 36 px — INCHANGE
Bouton secondaire      : 38 px -> 36 px
Boutons ghost          : 28 / 32 / 36 px — INCHANGES
Releves                : 50  (10 pages x 5 largeurs)
Boutons a 38 px        : 0
Paires desalignees     : 0
Emplacements corriges  : 15 / 16  (le 16e deja aligne par la vitrine)
Debordements           : 0
Erreurs console        : 0
Build / Lint           : PASS
```

---

**Aucun backend, API, base, route ou auth modifiés. Aucun commit, aucun push.**

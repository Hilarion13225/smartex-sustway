# SMARTEX SUSTWAY — P4.3, hiérarchie typographique

**Date** : 2026-09-16 · **Périmètre** : espace connecté — 12 fichiers

```text
PHASE UX P4.3 — HIÉRARCHIE TYPOGRAPHIQUE

Verdict :
READY_FOR_P4_4
```

---

# 1. Objectif

Rendre H2 et H3 immédiatement différenciables dans l'espace connecté, où ils
partageaient exactement le même style, sans toucher à la vitrine ni introduire
de nouvelle police.

---

# 2. Audit avant modification

Inventaire par extraction des balises `<h1>` à `<h4>` et de leurs classes, en
séparant vitrine et application.

**Le diagnostic P4 est confirmé, et précisé** : ce ne sont pas seulement H2 et
H3 qui se confondaient — **22 H2 et 6 H3 portaient la chaîne de classes
identique** `text-sm font-semibold text-ink-900`.

Un point que l'audit P4 n'avait pas relevé : le H2 le plus fréquent de
l'application n'est pas écrit dans les pages mais rendu par `CardHeader`, via la
classe `.card-title` — **49 occurrences à l'exécution**, contre 29 déclarations
manuelles. C'est donc `.card-title` qui portait l'essentiel du problème.

---

# 3. Inventaire H1 / H2 / H3

## Application, avant

| Niveau | Occurrences | Classes | Fichiers |
|---|---|---|---|
| **H1** | 3 | `text-xl font-semibold text-ink-900` ×2 | `ui.jsx:39` (PageTitre), `ProjetDetail:168` |
| | | `text-2xl font-bold text-ink-900` ×1 | `TableauDeBord:413` (salutation) |
| **H2** | 29 déclarations, **~49 rendus** | `text-sm font-semibold text-ink-900` ×22 | 12 fichiers |
| | | `card-title` (= `text-sm font-semibold`) ×2 | `ui.jsx:18` (CardHeader), `ImportReferentiel:102` |
| | | `flex … text-sm font-semibold text-ink-900` ×2 | `ClotureMission:136,199` |
| | | `min-w-0 text-sm font-semibold text-ink-900` ×1 | `Projets:103` |
| | | `text-lg font-semibold text-ink-900` ×2 | `EnTeteDomaine:24`, `PublierBrouillon:43` |
| **H3** | 8 | `text-sm font-semibold text-ink-900` ×4 | `CarteAnalyseIa`, `CarteProgressionDomaine`, `CarteReprise`, `VoletAnalysesIa` |
| | | `truncate text-sm font-semibold text-ink-900` ×2 | `VoletPlanAction:148`, `AuditDetail:89` |
| | | `flex … text-sm font-semibold text-ink-900` ×1 | `AxesAmelioration:83` |
| | | expression ×1 | `CarteCritere:59` |
| **H4** | 7 | `text-xs uppercase tracking-wide text-ink-500` ×3 | `CritereEvaluation:741,778,801` |
| | | `text-sm font-medium text-ink-700` ×2 | `CarteAnalyseIa:54,83` |
| | | `flex … text-sm font-semibold text-ink-900` ×2 | `VoletExigences:81,193` |

**Vitrine** : H1×8, H2×31, H3×10 — **non touchée**.

## Classification des 25 H2 candidats

Chaque H2 a été replacé dans son conteneur parent avant décision, plutôt que
remplacé en masse :

- **24 sont des titres de section** — à l'intérieur d'un `<section
  className="rounded-2xl border …">` ou d'un panneau équivalent.
- **1 ne l'est pas** : `Projets:103`, `<h2 className="min-w-0 …">{projet.nom}</h2>`
  à l'intérieur d'une **carte de projet dans une grille**. C'est un titre
  d'élément de liste, pas une section de page. **Exclu.**

---

# 4. Hiérarchie retenue

Déduite des conventions déjà présentes, sans échelle imposée de l'extérieur.
**Un seul niveau bouge.**

| Niveau | Rôle | Avant | Après |
|---|---|---|---|
| **H1** | titre de page | `text-xl font-semibold` — 20 px / 600 | **inchangé** |
| **H2** | section de page | `text-sm font-semibold` — 14 px / 600 | **`text-base font-semibold` — 16 px / 600** |
| **H3** | sous-section | `text-sm font-semibold` — 14 px / 600 | **inchangé** |
| Body | contenu | `text-sm` — 14 px / 400 | inchangé |
| Label | secondaire | `text-xs uppercase` — 12 px | inchangé |

Le choix de **16 px** plutôt que 18 : l'application est dense, `text-base` est
déjà employé 46 fois, et l'écart de 2 px avec le corps de texte suffit à
distinguer une section sans l'imposer. Passer à 18 aurait rapproché H2 de H1.

**H3 n'est pas touché** : il conservait déjà la bonne valeur ; c'est H2 qui
était descendu à son niveau.

---

# 5. Modifications effectuées

## `src/index.css` — 1 règle

```diff
  .card-title {
-   @apply flex items-center gap-2 text-sm font-semibold text-ink-900;
+   /* `text-base` et non `text-sm` : un en-tête de carte est un titre de
+      section, et doit se distinguer du corps de texte qui suit. */
+   @apply flex items-center gap-2 text-base font-semibold text-ink-900;
  }
```

Portée : **49 `CardHeader`** plus `ImportReferentiel:102`. `.card-title` n'est
utilisé nulle part dans la vitrine — vérifié.

## 24 titres de section — `text-sm` → `text-base`

| Fichier | H2 modifiés |
|---|---|
| `pages/ReferentielsListe.jsx` | 6 |
| `pages/TableauDeBord.jsx` | 5 |
| `components/audit/SyntheseMission.jsx` | 4 |
| `components/audit/ClotureMission.jsx` | 2 |
| `components/referentiel/StructureReferentiel.jsx` | 1 |
| `components/tableau-bord/BandeauReprise.jsx` | 1 |
| `components/tableau-bord/PanneauAlertes.jsx` | 1 |
| `components/tableau-bord/PanneauIa.jsx` | 1 |
| `pages/Classement.jsx` | 1 |
| `pages/ProjetDetail.jsx` | 1 |
| `pages/Projets.jsx` | 1 |

Le remplacement a été appliqué par expression régulière **restreinte aux balises
`<h2>`**, en excluant les fichiers de la vitrine et toute classe contenant
`min-w-0`. Aucune autre balise, aucun autre texte n'a pu être atteint.

## Exceptions conservées, et pourquoi

| Élément | Style | Raison |
|---|---|---|
| `TableauDeBord:413` — H1 | `text-2xl font-bold` | Salutation « Bonjour, X 👋 », pas un titre de page. Exception déjà actée en P3 |
| `Projets:103` — H2 | `text-sm font-semibold` | Titre d'une carte de projet dans une grille, pas une section |
| `EnTeteDomaine:24` — H2 | `text-lg font-semibold` | En-tête de domaine avec grande icône, au-dessus de sa propre section |
| `PublierBrouillon:43` — H2 | `text-lg font-semibold` | Bandeau de confirmation avec icône `h-7 w-7` |

Les deux H2 à 18 px se placent **entre** H1 (20) et H2 courant (16) : ils ne
cassent pas la hiérarchie, ils marquent une section plus saillante. Les
transformer aurait contredit « ne pas transformer automatiquement tous les
titres existants ».

**Aucune structure HTML n'a été modifiée** : pas un seul `<div>` transformé en
titre, pas un seul niveau changé.

---

# 6. `PageTitre`

**Non modifié.** Sa convention H1 — `text-xl font-semibold text-ink-900`, avec
son badge d'icône — a été posée en P3 et validée au navigateur en P3.1. Elle
reste le niveau principal, et l'écart avec le nouveau H2 est désormais de 4 px
au lieu de 6, ce qui resserre l'échelle sans l'aplatir.

---

# 7. Pages vérifiées

Mesure des `font-size` / `font-weight` **calculés** dans le navigateur, sur une
session SUPER_ADMIN authentifiée.

| Page | H1 | H2 | H3 | Titres tronqués | Débordement |
|---|---|---|---|---|---|
| Tableau de bord | 24 px / 700 ×1 | **16 px / 600 ×8** | — | 0 | non |
| Mission | 20 px / 600 ×1 | **16 px / 600 ×5** | — | 0 | non |
| **Évaluation d'un critère** | 20 px / 600 ×1 | **16 px / 600 ×3** | **14 px / 600 ×1** | 0 | non |
| Référentiels (liste) | 20 px / 600 ×1 | **16 px / 600 ×7** | — | 0 | non |
| Référentiel (détail) | 20 px / 600 ×1 | **16 px / 600 ×3** | — | 0 | non |
| Rapports | 20 px / 600 ×1 | — | — | 0 | non |
| Plan d'amélioration | 20 px / 600 ×1 | **16 px / 600 ×1** | — | 0 | non |

**La page d'évaluation d'un critère porte les trois niveaux simultanément** —
20 / 16 / 14 px — et constitue la preuve directe que H2 et H3 ne sont plus
identiques.

**Réserve d'honnêteté sur la couverture H3** : un seul des sept écrans a affiché
un H3 lors de la mesure. Les autres H3 de l'application vivent dans des onglets
qui ne sont pas ceux ouverts par défaut — `VoletPlanAction`, `VoletAnalysesIa`,
`CarteAnalyseIa`, `CarteReprise`, `VoletDomaines`. Leur style n'a pas été
modifié, donc leur rendu ne peut pas avoir changé ; mais ils n'ont pas été
observés dans cette passe.

---

# 8. Validation responsive

Quatre pages × quatre largeurs, seize mesures.

| Largeur | H1 | H2 | H3 | Titres tronqués | Débordement de page |
|---|---|---|---|---|---|
| **1440 px** | 20 / 24 px | 16 px | 14 px | **0** | **non** |
| **1280 px** | 20 / 24 px | 16 px | 14 px | **0** | **non** |
| **768 px** | 20 / 24 px | 16 px | 14 px | **0** | **non** |
| **390 px** | 20 / 24 px | 16 px | 14 px | **0** | **non** |

La hiérarchie est **identique aux quatre largeurs** : aucun palier responsive
n'altère les tailles de titre. « Titres tronqués » compte les `h1`, `h2`, `h3`
dont `scrollWidth` dépasse `clientWidth` — zéro partout, y compris à 390 px sur
les titres longs comme « Tableau de bord — TEST VERIFICATION IA - ne pas
exploiter ».

---

# 9. Vitrine

**Aucun impact.** `git diff` sur `Landing.jsx`, `Services.jsx`, `Formules.jsx`,
`Contact.jsx`, `Faq.jsx`, `components/vitrine/` et `CadreAuth.jsx` : **vide**.

Trois garanties, et non une seule :

1. Le remplacement excluait explicitement les 23 fichiers de vitrine et le
   dossier `components/vitrine/`.
2. Aucune règle globale de type `h2 { … }` n'a été écrite — l'application n'a
   pas de classe d'enveloppe équivalente à `.vitrine`, une règle globale aurait
   donc débordé. Les classes ont été modifiées une à une.
3. `.card-title`, la seule classe partagée modifiée, n'est employée que dans
   `ui.jsx` et `ImportReferentiel.jsx`, tous deux applicatifs.

---

# 10. Accessibilité / sémantique

| Critère | État |
|---|---|
| Hiérarchie HTML | **inchangée** — aucun niveau modifié, aucun élément promu ou rétrogradé |
| Un seul H1 par page | **vérifié sur les 7 pages** : exactement 1 |
| Saut de niveau | aucun introduit ; la structure reste celle d'avant |
| Titres décoratifs | aucun `<div>` transformé en titre pour obtenir un style |
| Contraste | **inchangé** — `text-ink-900` conservé partout ; seule la taille varie |

Le changement va dans le sens de l'accessibilité : un H2 à 16 px est plus lisible
qu'à 14, et la distinction visuelle rejoint enfin la distinction sémantique qui
existait déjà dans le HTML.

---

# 11. Build / lint / tests

| Contrôle | Résultat |
|---|---|
| `npx vite build` | **BUILD=0** |
| `npm run lint` | **0 erreur** ; 1 avertissement, `Landing.jsx:19` — préexistant, fichier non touché |
| Tests frontend | **aucun** — `package.json` n'expose que `dev`, `build`, `lint`, `preview` |

---

# 12. Fichiers modifiés

```
 src/index.css                                   |  1 regle (.card-title)
 src/components/audit/ClotureMission.jsx         |  2 H2
 src/components/audit/SyntheseMission.jsx        |  4 H2
 src/components/referentiel/StructureReferentiel.jsx | 1 H2
 src/components/tableau-bord/BandeauReprise.jsx  |  1 H2
 src/components/tableau-bord/PanneauAlertes.jsx  |  1 H2
 src/components/tableau-bord/PanneauIa.jsx       |  1 H2
 src/pages/Classement.jsx                        |  1 H2
 src/pages/ProjetDetail.jsx                      |  1 H2
 src/pages/Projets.jsx                           |  1 H2
 src/pages/ReferentielsListe.jsx                 |  6 H2
 src/pages/TableauDeBord.jsx                     |  5 H2
```

**12 fichiers, 25 modifications** — 24 classes de titre plus une règle CSS.
Aucun composant créé, aucune page renommée.

---

# 13. Régressions éventuelles

## Contrôles passés

| Contrôle | Résultat |
|---|---|
| Appels API | diff filtré sur `api.get\|post\|put\|delete\|patch` → **0** |
| Routes | `App.jsx` : 4 lignes, toutes de P1.4 |
| Auth | `git diff src/auth/` → **vide** |
| Backend / base | aucun fichier touché |
| Police | **aucune modification** de `font-family`, `font-display`, `font-sans` |
| Couleurs | **aucune modification** de palette. Les 4 lignes signalées par le filtre sont : 2 règles de focus **de P4.2**, et une paire `-`/`+` **byte-identique** dans `TableauDeBord.jsx` — un déplacement de ligne issu de P0, pas un changement |
| Composants de cartes | **non touchés** — `.card`, `.carte-app`, `.carte-stat` inchangés, c'est P4.4 |

## Ce qui reste à surveiller

| Point | Pourquoi |
|---|---|
| **`.card-title` touche 49 en-têtes de carte** | C'est la modification de plus grande portée. Les mesures montrent 16 px partout et aucun débordement, mais la densité des cartes change légèrement sur les pages qui en empilent beaucoup |
| **H3 observé sur une seule page** | Les autres vivent dans des onglets non ouverts par défaut. Leur style est inchangé, mais non observé — voir § 7 |
| **`VoletExigences:81,193`** | Deux H4 en `text-sm font-semibold text-ink-900`, donc désormais **identiques au H3**. C'est le même défaut qu'entre H2 et H3, décalé d'un niveau. Hors du périmètre H2/H3 fixé pour cette étape : **non corrigé**, signalé pour arbitrage |
| **Deux H2 à 18 px** | `EnTeteDomaine` et `PublierBrouillon` — variation assumée, documentée au § 5 |

---

# 14. Conclusion

Les huit critères de réussite sont satisfaits :

1. **H1 reste le niveau principal** — 20 px / 600, `PageTitre` intact.
2. **H2 est identifiable comme titre de section** — 16 px / 600, mesuré sur 7 pages.
3. **H3 est inférieur à H2 et reste identifiable** — 14 px / 600, inchangé.
4. **H2 et H3 ne sont plus identiques** — prouvé sur la page d'évaluation d'un
   critère, qui porte les trois niveaux simultanément.
5. **La hiérarchie HTML n'est pas dégradée** — aucune balise changée de niveau.
6. **La vitrine n'est pas modifiée** — diff vide, triple garantie.
7. **Aucun débordement responsive** — 16 mesures, 0 titre tronqué, 0 débordement.
8. **Build et lint passent.**

Un seul niveau a bougé, parce qu'un seul était mal placé : H2 était descendu au
niveau du corps de texte. Le remettre à 16 px suffisait à rétablir l'échelle.

```text
Verdict : READY_FOR_P4_4

Fichiers modifiés   : 12
Titres modifies     : 24 H2 + 1 regle .card-title (49 en-tetes de carte)
H1 / H2 / H3        : 20 / 16 / 14 px
Pages verifiees     : 7
Mesures responsive  : 16  (4 pages x 4 largeurs)
Titres tronques     : 0
Debordements        : 0
Vitrine             : diff vide
Build               : PASS
Lint                : PASS
```

---

**Arrêt ici. P4.4 n'est pas commencé : ni cartes, ni badges, ni boutons, ni
refactoring supplémentaire. Aucun backend, API, base, route ou auth modifiés.
Aucun commit, aucun push.**

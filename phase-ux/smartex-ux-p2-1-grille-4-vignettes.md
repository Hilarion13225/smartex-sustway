# P2.1 — Correction grille 4 vignettes

**Date** : 2026-09-16 · **Anomalie traitée** : A-2 de `smartex-ux-validation-navigateur.md`

```text
P2.1 — Correction grille 4 vignettes

Fichiers modifiés :
- frontend-react/src/pages/AuditScore.jsx   (+ import clsx, + 1 bloc de classes)
- frontend-react/src/pages/PipelineIA.jsx   (+ import clsx, + 1 bloc de classes)

Correction :
- Échelle unifiée sur les deux pages : 1 / 2 / 3 colonnes, puis 4 au palier xl
  UNIQUEMENT lorsque la quatrième vignette est présente.
- La quatrième colonne est conditionnée à la même expression que la vignette
  elle-même : `score.nombreCriteresEnRevue > 0` sur AuditScore,
  `totaux.enRevue > 0` sur PipelineIA. À trois vignettes, la grille reste
  exactement celle d'avant.
- Classes écrites en littéraux complets dans `clsx`, pour que le scanner
  Tailwind les voie ; `clsx` est déjà la convention du projet (Layout,
  TableMissions, ui.jsx).

Responsive :
- mobile (< 640px)        : 1 colonne — 3 ou 4 vignettes empilées
- tablette (640–1023px)   : 2 colonnes — 2+1 à trois vignettes, 2+2 à quatre
- desktop (1024–1279px)   : 3 colonnes — rangée pleine, ou 3+1 à quatre vignettes
- très grand écran (≥1280px) : 3 colonnes à trois vignettes, 4 colonnes à quatre
                               → plus aucune vignette orpheline

Build :
- npx vite build → BUILD=0
- CSS émis : `.xl\:grid-cols-4{grid-template-columns:repeat(4,minmax(0,1fr))}`
  à l'intérieur de `@media (width>=1280px)` — la classe n'a pas été purgée.

Lint :
- npm run lint → LINT=0
  (seul avertissement : Landing.jsx:19, préexistant, fichier non touché)

Régressions détectées :
- aucune.
  · aucun appel API touché : diff filtré sur api.get|post|put|delete|patch = 0
  · App.jsx inchangé par P2.1 (ses 4 lignes datent de P1) ; src/auth/ vide
  · backend, base, migrations, routes, rôles et permissions : intacts
  · nombre de fichiers modifiés inchangé (29) — aucun fichier nouveau
  · aucune autre logique modifiée : les deux remplacements ont été faits sous
    assertion d'unicité et de correspondance exacte

Statut :
READY_FOR_BROWSER_VALIDATION
```

---

## Détail des deux changements

### `AuditScore.jsx`

```diff
-            <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
+            <div
+              className={clsx(
+                'mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3',
+                score.nombreCriteresEnRevue > 0 && 'xl:grid-cols-4'
+              )}
+            >
```

### `PipelineIA.jsx`

```diff
-            <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
+            <div
+              className={clsx(
+                'mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3',
+                totaux.enRevue > 0 && 'xl:grid-cols-4'
+              )}
+            >
```

## Un effet de bord à connaître, sur `PipelineIA`

Votre consigne demandait « 3 colonnes sur écran large », et cette page passait
jusqu'ici à trois colonnes seulement à `xl` (1280px), là où `AuditScore` le
faisait déjà à `lg` (1024px). Appliquer l'échelle demandée harmonise les deux :
**entre 1024 et 1279px, `PipelineIA` affiche désormais 3 vignettes par rangée au
lieu de 2.**

C'est la conséquence directe de l'échelle que vous avez fixée, pas une
initiative séparée, et c'est ce qui rend les deux pages cohérentes. Le cas est
sans risque de débordement — trois cartes à ~330px dans un conteneur de 1024px,
exactement ce que `AuditScore` fait déjà à ce palier. Si vous préfériez
préserver le comportement d'origine de `PipelineIA`, la variante serait
`sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4` ; dites-le et je l'ajuste.

## Débordement horizontal

Écarté par construction : il s'agit d'une grille CSS (`display:grid`) avec
`repeat(n, minmax(0, 1fr))`. Le `minmax(0, …)` empêche une colonne de dépasser
sa piste, et les éléments passent à la ligne au lieu de déborder. Aucun
`overflow-x` n'a été ajouté ni retiré.

## Vérification de service

Le conteneur `frontend-react` a été redémarré — le HMR n'est pas fiable à
travers ce bind-mount (voir A-1 du rapport de validation). Le serveur sert bien
la correction :

```
AuditScore.jsx    xl:grid-cols-4 servi : 1
PipelineIA.jsx    xl:grid-cols-4 servi : 1
```

## Ce qui n'a pas été fait

- **Aucune validation navigateur** : aucun pilote disponible dans cette session.
- **Aucune autre anomalie corrigée** : A-1 (documentation du HMR), A-3, A-4 et
  A-5 (disponibilité des données) restent ouvertes, comme demandé.
- **Aucun commit, aucun push.**

Reste à observer, au palier ≥ 1280px, sur une mission portant des critères en
revue — la seule en base est « TEST VERIFICATION IA - ne pas exploiter »,
organisation Ivoiz : `/app/977e7acf-52de-4e91-beb6-ede23f3af68b/audits/39764f70-ff80-4afe-8b50-197fd575e14f`
puis l'onglet Score, et `/app/977e7acf-.../pipeline-ia`.

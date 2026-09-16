# SMARTEX SUSTWAY — P4.4, consolidation des cartes

**Date** : 2026-09-16 · **Périmètre** : `frontend-react/src` — 12 fichiers
**Validation** : **60 relevés navigateur** (10 pages × 6 largeurs), session
SUPER_ADMIN authentifiée

```text
PHASE UX P4.4 — CONSOLIDATION DES CARTES

Verdict :
READY_FOR_P4_5
```

---

# 1. Objectif

Supprimer les duplications de surface de carte **réellement équivalentes**, sans
casser une seule variante légitime.

L'objectif n'était pas de ramener toutes les cartes à un composant unique. Il
était de ne laisser qu'une définition là où plusieurs écrivaient la même chose,
et de documenter le reste.

---

# 2. Inventaire avant modification

Extraction du contenu exact de chaque `className`, et non comparaison de noms.

| Élément | Avant |
|---|---|
| `.card` (classe CSS) | `rounded-xl border border-ink-200 bg-surface shadow-sm` — **un seul consommateur : le composant `Card`** |
| `Card` (composant) | `clsx('card rounded-2xl border-ink-100', className)` — **annulait le rayon et la bordure de `.card`** |
| `<Card>` | **65 usages** |
| `<CardHeader>` | 49 usages |
| `.carte-app` | `…rounded-2xl border-ink-100 bg-surface p-5 shadow-sm` **+ `transition duration-300` + 3 effets de survol** — **1 usage** |
| `.carte-stat` | `flex items-center gap-4 …p-5 shadow-sm` + survol — 2 usages (dont `StatCard`) |
| `<StatCard>` | 40 usages |
| `CardContent` / `CardFooter` | **n'existent pas** — 0 occurrence |
| **Duplications exactes** | **23** — 20 en `rounded-2xl border border-ink-100 bg-surface p-5 shadow-sm`, 3 avec `min-w-0` en préfixe |

**Correction au chiffre de l'audit P4** : celui-ci annonçait « 27 duplications ».
Il comptait les occurrences de la chaîne de classes où qu'elle apparaisse. Le
nombre d'**éléments** dont la `className` vaut exactement cette chaîne est **23**.

Répartition des 23 par balise : **20 `<section>`** et **3 `<div>`** — plus, en
balises multilignes non captées par le premier balayage, 1 `<article>` et
1 `<form>`, portés à l'inventaire en cours d'étape.

---

# 3. Inventaire après modification

| Élément | Avant | Après |
|---|---|---|
| `<Card>` | 65 | **87** |
| Duplications exactes | 23 | **5** |
| `<CardHeader>` | 49 | **49** |
| `.carte-app` | 1 | **1** |
| `.carte-stat` | 2 | **2** |
| `<StatCard>` | 40 | **40** |
| `.card` (définition) | `rounded-xl` / `ink-200` | **`rounded-2xl` / `ink-100`** |
| `Card` (composant) | `clsx('card rounded-2xl border-ink-100', className)` | **`clsx('card', className)`** |

---

# 4. Classification des cartes

| Catégorie | Contenu | Décision |
|---|---|---|
| **A — Carte applicative standard** | 22 surfaces `rounded-2xl border-ink-100 bg-surface p-5 shadow-sm` portées par une `<section>` | **consolidées** vers `<Card className="p-5">` |
| **B — Carte statistique** | `.carte-stat`, via `StatCard` (40 usages) | **conservée** — identité KPI propre (flex, gap-4, survol d'ombre) |
| **C — Carte structurée** | `<Card>` + `<CardHeader>` — 49 paires | **conservée** — c'est le motif dominant |
| **D — Variante légitime** | `.carte-app` (1 usage, cliquable) ; variantes `p-4`, `p-6`, `sm:p-8` | **conservées** |
| **E — Fausse carte** | 1 `<article>`, 3 `<div>`, 1 `<form>` | **conservées** — voir § 9 |

---

# 5. Consolidation réalisée

**22 `<section>` → `<Card className="p-5">`**, dans 10 fichiers.

| Fichier | Consolidations |
|---|---|
| `pages/ReferentielsListe.jsx` | 5 |
| `pages/TableauDeBord.jsx` | 5 |
| `components/audit/SyntheseMission.jsx` | 4 |
| `components/audit/ClotureMission.jsx` | 2 |
| `components/referentiel/StructureReferentiel.jsx` | 1 |
| `components/tableau-bord/PanneauIa.jsx` | 1 |
| `pages/Classement.jsx` | 1 |
| `pages/ProjetDetail.jsx` | 1 |
| `pages/Projets.jsx` | 1 |
| `components/audit/VoletPlanAction.jsx` | 1 |
| `pages/AuditDetail.jsx` | 1 |

Les 3 variantes `min-w-0` sont devenues `<Card className="min-w-0 p-5">` —
`min-w-0` est orthogonal à la surface, le rendu est identique.

Les fermetures correspondantes ont été appariées par comptage d'imbrication, et
non par expression régulière naïve. Le diff le confirme : **22 `<section>`
retirés, 22 `<Card>` ajoutés, 22 `</section>` retirés, 22 `</Card>` ajoutés**.
Aucune autre balise n'apparaît dans le diff.

---

# 6. Pourquoi `.carte-app` n'a pas été généralisé

L'audit P4 recommandait d'absorber les duplications dans `.carte-app`. **Cette
recommandation était fausse, et n'a pas été suivie.**

`.carte-app` n'est pas la même chose que la surface dupliquée :

```
.carte-app   relative overflow-hidden rounded-2xl border border-ink-100
             bg-surface p-5 shadow-sm transition duration-300
             hover:border-brand-200 hover:shadow-soft
             motion-safe:hover:-translate-y-1

duplication  rounded-2xl border border-ink-100 bg-surface p-5 shadow-sm
```

Elle porte en plus : `relative`, `overflow-hidden`, une transition et **trois
effets de survol**, dont une lévitation.

Son **unique usage** le justifie :

```jsx
// pages/Entreprises.jsx:248
<Link to={`/app/${e.id}`} className="carte-app group block h-full">
```

C'est une **carte cliquable**. Le survol y est une affordance : il annonce que la
carte mène quelque part.

Y ramener les 22 panneaux statiques — « Progression globale », « Alertes
prioritaires », « Missions à traiter » — leur aurait donné une lévitation au
survol, **suggérant faussement qu'ils sont cliquables**. Ce n'aurait pas été une
consolidation, mais une régression d'affordance.

`.carte-app` reste donc ce qu'elle est : **la carte cliquable**, à un seul usage.

## La cible retenue existait déjà

Plutôt que d'inventer une classe, la convention en place a été suivie :

```jsx
<Card className="p-5">
```

Elle était **déjà employée 19 fois**, et 34 fois avec les variantes de `p-5`
(`mb-6 p-5`, `h-full p-5`, `mt-6 p-5`). Par ailleurs **16 `<Card>` n'ont aucun
`CardHeader`** : la carte-panneau nue est un motif établi, pas une invention.

`Card` rend `<section className={clsx('card', className)}>`, soit avec `p-5` :
`rounded-2xl border border-ink-100 bg-surface p-5 shadow-sm` — **exactement la
chaîne dupliquée**, sur **exactement la même balise**.

---

# 7. Réconciliation `.card` / `Card`

## L'état avant

```css
.card { @apply rounded-xl border border-ink-200 bg-surface shadow-sm; }
```
```jsx
<section className={clsx('card rounded-2xl border-ink-100', className)}>
```

Le composant appliquait la classe, puis en annulait le rayon et la teinte de
bordure. La définition de `.card` ne décrivait donc plus ce que l'application
rendait.

## Ce qui a permis de trancher sans risque

Deux vérifications :

1. **`.card` n'a qu'un seul consommateur.** Recherche sur tout le projet : la
   classe n'apparaît que dans `ui.jsx:8`. Les trois « usages littéraux »
   comptés par l'audit P4 étaient en réalité `card-header` et `card-title`,
   capturés par un motif trop large.
2. **Aucune règle CSS ne dépend de `.card`.** `.card-header` et `.card-title`
   sont des classes indépendantes.

## L'état après

```css
.card { @apply rounded-2xl border border-ink-100 bg-surface shadow-sm; }
```
```jsx
<section className={clsx('card', className)}>
```

`.card` porte désormais le rendu réellement utilisé ; `Card` reste une
abstraction légère qui ne corrige plus rien.

**Aucun effet visuel** : l'unique consommateur surchargeait déjà ces deux
propriétés. Confirmé par mesure — voir § 10 et § 11.

---

# 8. Duplications supprimées

**18 sur 23.**

| Niveau | Motif | Supprimées |
|---|---|---|
| **1** | `rounded-2xl border border-ink-100 bg-surface p-5 shadow-sm` sur `<section>` | **17** |
| **2** | idem avec `min-w-0` en préfixe, sur `<section>` | **3** |
| **2** | idem sur `<section key={…}>` dans un `.map()` | **2** |
| **3** | variantes `p-4`, `p-6`, `sm:p-8` | **0** — non consolidées, conformément à la consigne |

---

# 9. Duplications conservées

Cinq, chacune pour une raison de structure et non de style.

| # | Emplacement | Balise | Pourquoi elle n'est pas devenue `<Card>` |
|---|---|---|---|
| 1 | `components/audit/VoletAnalysesIa.jsx:75` | `<article>` | Élément d'une liste d'analyses, rendu dans un `.map()`. `<article>` désigne un contenu autonome — une analyse de critère en est un. `Card` rend une `<section>` : la remplacer changerait le sens sémantique de la balise |
| 2 | `components/audit/VoletPreuves.jsx:38` | `<div>` | Conteneur neutre, sans titre. Le passer en `<section>` introduirait une section sans nom accessible, ce qui n'apporte rien |
| 3 | `components/tableau-bord/PanneauAlertes.jsx:23` | `<div>` | Idem. Il porte pourtant un `<h2>` — une `<section>` s'y défendrait, mais le changement dépasse le style et relève d'une décision sémantique, pas de P4.4 |
| 4 | `pages/AuditsListe.jsx:279` | `<div>` | Conteneur neutre enveloppé dans un `<Revele>` |
| 5 | `pages/Projets.jsx:225` | `<form>` | **`Card` ne peut pas porter `onSubmit`** — il n'accepte que `children` et `className`. Le remplacer casserait la soumission du formulaire |

Le principe appliqué : **une consolidation de style ne doit pas changer une
balise**. Les 22 retenues étaient déjà des `<section>`, ce que `Card` rend ; les
cinq écartées ne le sont pas.

---

# 10. Mesures avant / après

```text
Usages .card avant  : 65 (via le composant Card ; 0 usage litteral)
Usages .card apres  : 87 (via le composant Card ; 0 usage litteral)

Usages .carte-app avant : 1
Usages .carte-app apres : 1

Usages .carte-stat avant : 2
Usages .carte-stat apres : 2

Usages StatCard avant : 40
Usages StatCard apres : 40

Usages CardHeader avant : 49
Usages CardHeader apres : 49

Duplications exactes identifiees : 23
Duplications supprimees          : 18
Variantes conservees             : 5  (1 article, 3 div, 1 form)
                                 + p-4, p-6, sm:p-8, min-w-0 : non consolidees (niveau 3)
```

## Contrôle du double padding

Une carte portant `p-5` **et** un `CardHeader` (`px-5 py-4`) insère l'en-tête au
lieu de le coller aux bords. Contrôle mené sur les 87 `<Card>` :

- **27 cas existent** dans l'application ;
- **aucun des 22 éléments consolidés n'en fait partie** — les 22 étaient des
  panneaux sans en-tête, avec un `<h2>` écrit à même le bloc ;
- le cas `AuditDetail:311` apparaît dans le relevé mais figure **sans préfixe
  `+` dans le diff** : c'est du contexte, donc **préexistant**. Sa seule ligne
  modifiée vient de la terminologie P3-3 (« entreprise » → « organisation ») ;
- ce motif coexiste de longue date avec les 9 `<Card className="p-0">` qui, eux,
  collent l'en-tête aux bords.

**Préexistant, hors périmètre P4.4. Non traité.**

---

# 11. Validation navigateur

**60 relevés** — 10 pages × 6 largeurs — mesurant pour chaque carte sa signature
calculée : rayon, couleur de bordure, padding, présence d'ombre ; plus la balise
rendue, le padding des en-têtes, le débordement de page et les erreurs console.

## Signature mesurée

| Signature | Occurrences | Correspond à |
|---|---|---|
| `16px \| rgb(236, 238, 242) \| 20px \| ombre` | **77** | `<Card className="p-5">` — rayon `rounded-2xl`, bordure `ink-100`, padding `p-5` |
| `16px \| rgb(236, 238, 242) \| 0px \| ombre` | 24 | `<Card className="p-0">` — en-tête collé aux bords |
| `16px \| rgb(236, 238, 242) \| 16px \| ombre` | 2 | variante `p-4` à 390 px (palier `sm:p-5`) |

**Le rayon et la couleur de bordure sont identiques dans les trois cas** : la
réconciliation `.card` / `Card` n'a rien changé au rendu. Le `16px` de rayon
correspond à `rounded-2xl`, exactement ce que `Card` produisait déjà par
surcharge.

## Balise rendue

`.card` est rendu en **`<section>` dans 100 % des relevés**. Aucune autre balise.

---

# 12. Résultats par largeur

| Largeur | Cartes vérifiées | Débordement | Anomalie | Résultat |
|---|---|---|---|---|
| **390 px** | 10 pages, cartes empilées | **aucun** | aucune | **PASS** |
| **768 px** | 10 pages, grilles 2 colonnes | **aucun** | aucune | **PASS** |
| **1024 px** | 10 pages, grilles 3 colonnes | **aucun** | aucune | **PASS** |
| **1280 px** | 10 pages | **aucun** | aucune | **PASS** |
| **1440 px** | 10 pages | **aucun** | aucune | **PASS** |
| **1536 px** | 10 pages | **aucun** | aucune | **PASS** |

`scrollWidth = clientWidth` sur les 60 relevés. **0 erreur console** sur les 60.

**Réserve P3.1 à 1024 px** : non rouverte, non aggravée. Elle porte sur la
troncature des détails de vignette, qui relève de `StatCard` — **non touché par
P4.4**. Elle n'est pas comptabilisée ici.

---

# 13. Pages vérifiées

Tableau de bord · Missions (liste) · Mission (détail) · Évaluation d'un critère ·
Référentiels (liste) · Référentiel (détail) · Rapports · Plan d'amélioration ·
Projets · Administration (Utilisateurs).

Deux pages affichent **0 `.card`** — `Projets` et `Missions` — parce que leurs
surfaces sont, respectivement, un `<form>` et des cartes de liste, toutes deux
conservées au § 9. C'est cohérent avec la décision, pas une anomalie.

---

# 14. Validation des 22 nouveaux usages de `Card`

> **Les 22 nouveaux usages sont-ils visuellement et fonctionnellement
> équivalents à ce qu'ils remplaçaient ?**

**Oui**, sur quatre preuves indépendantes :

1. **Calcul des classes** — `.card` + `p-5` produit
   `rounded-2xl border border-ink-100 bg-surface p-5 shadow-sm`, chaîne
   identique à celle remplacée.
2. **Mesure du rendu** — les cartes consolidées et les 5 cartes manuelles
   restantes affichent la **même signature calculée**, sur la même page et à la
   même largeur : `16px | rgb(236, 238, 242) | 20px | ombre`.
3. **Balise identique** — `<section>` avant, `<section>` après. Le diff est
   symétrique : 22 retirées, 22 ajoutées, aucune autre balise touchée.
4. **Comportement** — aucun de ces 22 blocs ne portait d'attribut autre que
   `className` (ou `key`, que React traite lui-même). Rien à transmettre, rien à
   perdre.

---

# 15. Structure HTML / sémantique

| Contrôle | Résultat |
|---|---|
| `<article>` → `<section>` | **aucun** |
| `<form>` → `<section>` | **aucun** |
| `<div>` → `<section>` | **aucun** |
| `<section>` → `<section>` | 22, via `Card` |
| Balises des 5 duplications conservées | vérifiées une à une : `<article>`, `<div>`, `<div>`, `<div>`, `<form>` — **inchangées** |
| Balise rendue par `.card` au navigateur | `<section>` sur 100 % des 60 relevés |

---

# 16. Console / erreurs

**0 erreur, 0 avertissement** sur les 60 relevés, toutes pages et toutes largeurs.

Aucun avertissement React nouveau — en particulier aucun avertissement de clé
manquante, alors que deux consolidations portent sur des éléments d'un `.map()`
(`VoletPlanAction`, `AuditDetail`) : `key` est bien transmis à `<Card>`.

---

# 17. Build / lint / tests

| Contrôle | Résultat |
|---|---|
| `npx vite build` | **BUILD=0** |
| `npm run lint` | **0 erreur** ; 1 avertissement, `Landing.jsx:19` — préexistant, fichier non touché |
| Tests frontend | **aucun** — `package.json` n'expose que `dev`, `build`, `lint`, `preview` |

Une erreur a été rencontrée puis corrigée en cours d'étape : le calcul du chemin
d'import relatif échouait sous Windows, produisant `from 'components/ui'` au lieu
de `from '../ui'` dans quatre composants. Détectée par le build, corrigée, build
repassé à 0.

---

# 18. Fichiers modifiés

```
 src/index.css                                       | .card reecrit
 src/components/ui.jsx                               | Card simplifie
 src/components/audit/ClotureMission.jsx             | 2 sections
 src/components/audit/SyntheseMission.jsx            | 4 sections
 src/components/audit/VoletPlanAction.jsx            | 1 section
 src/components/referentiel/StructureReferentiel.jsx | 1 section
 src/components/tableau-bord/PanneauIa.jsx           | 1 section
 src/pages/AuditDetail.jsx                           | 1 section
 src/pages/Classement.jsx                            | 1 section
 src/pages/ProjetDetail.jsx                          | 1 section
 src/pages/Projets.jsx                               | 1 section
 src/pages/ReferentielsListe.jsx                     | 5 sections
 src/pages/TableauDeBord.jsx                         | 5 sections
```

**13 fichiers.** Aucun composant créé, aucune page renommée.

---

# 19. Régressions

**Aucune détectée.**

| Contrôle | Résultat |
|---|---|
| Appels API | diff filtré sur `api.get\|post\|put\|delete\|patch` → **0 ligne** |
| Routes | `App.jsx` : 4 lignes, toutes de P1.4 — rien de P4.4 |
| Auth | `git diff src/auth/` → **vide** |
| Backend / base / migrations | aucun fichier touché |
| Docker, Tailwind, `package.json` | **vides** |
| Débordement horizontal | 0 sur 60 relevés |
| Erreurs console | 0 sur 60 relevés |
| `.carte-app`, `.carte-stat`, `StatCard`, `CardHeader` | comptes inchangés |

## Points à surveiller

| Point | Pourquoi |
|---|---|
| **`.card` touche désormais 87 cartes** | La définition a changé de rayon et de bordure. Sans effet mesuré, puisque l'unique consommateur surchargeait déjà ces deux propriétés — mais c'est la modification de plus grande portée de l'étape |
| **27 cas de double padding préexistants** | Non traités. Ils méritent un arbitrage : soit `p-0` partout avec en-tête collé, soit `p-5` partout avec en-tête inséré |
| **Thème sombre** | Les 60 relevés ont été pris en thème clair. La bordure `ink-100` s'inverse par variable CSS, donc sans risque théorique — mais non observé |

---

# 20. Conclusion

Les critères de sortie sont satisfaits :

- **les duplications réellement équivalentes sont réduites** — 23 → 5, soit 18
  supprimées ;
- **aucune variante légitime n'est cassée** — `.carte-app`, `.carte-stat`,
  `StatCard`, `CardHeader` inchangés ; les 5 duplications restantes conservent
  leur balise ;
- **`.card` n'a pas été modifié globalement sans justification** — il n'avait
  qu'un consommateur, qui le surchargeait déjà ;
- **les cartes restent visuellement cohérentes** — une seule signature pour un
  même rôle, mesurée sur 60 relevés ;
- **aucun débordement responsive** n'est introduit ;
- **build et lint passent** ;
- **aucune régression fonctionnelle** détectée.

Le point qui méritait le plus d'attention n'était pas la consolidation
elle-même, mais la cible : l'audit P4 désignait `.carte-app`, qui aurait donné
un comportement de survol à vingt-deux panneaux qui ne mènent nulle part. La
bonne cible était déjà dans le code, employée trente-quatre fois.

```text
Verdict : READY_FOR_P4_5

<Card>                : 65 -> 87
Duplications exactes  : 23 -> 5
CardHeader            : 49 -> 49
.carte-app            :  1 ->  1
.carte-stat           :  2 ->  2
StatCard              : 40 -> 40
Fichiers modifies     : 13
Releves navigateur    : 60  (10 pages x 6 largeurs)
Debordements          : 0
Erreurs console       : 0
Changements de balise : 0
Build / Lint          : PASS
```

---

**Aucun backend, API, base, route ou auth modifiés. Aucun commit, aucun push.**

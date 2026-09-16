# SMARTEX SUSTWAY — P4.5.2, harmonisation des états vides

**Date** : 2026-09-16 · **Périmètre** : `src/pages/Entreprises.jsx` — 1 fichier, 2 lignes

```text
PHASE UX P4.5.2 — HARMONISATION DES EMPTY STATES

Verdict :
P4.5.2_PARTIEL
```

**Pourquoi partiel** : sur les trois cas désignés par l'audit P4.5, **deux
étaient bien des états vides et ont été harmonisés**. Le troisième n'en est pas
un — c'est un **état de chargement**. Ma classification P4.5 était erronée sur ce
point. Il est conservé tel quel, avec sa justification.

---

# 1. Problème initial

L'audit P4.5 avait relevé 16 conteneurs `border-dashed` et en avait tiré
« 3 véritables états vides de niveau page » aux paddings divergents :

```
px-6 py-14   ->  Entreprises.jsx:208
px-6 py-10   ->  Entreprises.jsx:241
px-6 py-8    ->  SuiviAnalyse.jsx:83
```

là où `<Vide>` rend `px-6 py-12`.

Ce regroupement avait été fait **par géométrie** — trois conteneurs en `px-6`
avec un `py` différent — et non en vérifiant le rôle de chacun. L'audit de cette
étape a corrigé cela.

---

# 2. Audit des 3 états vides

## #1 — `src/pages/Entreprises.jsx:208` · **c'est bien un état vide de page**

```jsx
{entreprises.length === 0 ? (
  <div className="relative overflow-hidden rounded-2xl border border-dashed
                  border-ink-200 bg-surface px-6 py-14 text-center">
    <div className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-halo-brand …" aria-hidden />
    <span className="… h-14 w-14 … rounded-2xl bg-brand-50 text-brand-…"><Building2 className="h-6 w-6" /></span>
    <p className="relative mt-4 text-base font-semibold text-ink-900">Aucune organisation pour l'instant</p>
    <p className="relative mx-auto mt-1 max-w-md text-sm text-ink-500">Créez votre première organisation…</p>
    <button className="btn-vitrine relative mt-5">Créer une organisation</button>
  </div>
) : …}
```

| Critère | Constat |
|---|---|
| Structure | `<div>` au niveau de la page, frère du `<Card>` du formulaire |
| Condition | `entreprises.length === 0` — la liste principale est vide |
| Contenu | halo décoratif animé, icône 56 px, titre, description, **bouton d'action** |
| Composant parent | aucun — directement dans le corps de la page |
| Zone de dépôt ? | **non** |
| Placeholder ? | **non** |
| Dans une carte ? | **non** |

**C'est un état vide de premier lancement**, plus riche que `<Vide>` : il porte
une invitation à agir. Sa composition justifie qu'il ne soit pas remplacé par
`<Vide>` — ce que la consigne interdisait de toute façon. Seul son rythme
vertical est aligné.

## #2 — `src/pages/Entreprises.jsx:241` · **c'est bien un état vide de page**

```jsx
{entreprisesFiltrees.length === 0 ? (
  <p className="rounded-2xl border border-dashed border-ink-200 bg-surface
                px-6 py-10 text-center text-sm text-ink-500">
    Aucune organisation ne correspond à « {recherche} ».
  </p>
) : ( …grille des organisations… )}
```

| Critère | Constat |
|---|---|
| Structure | `<p>` remplaçant la grille principale |
| Condition | `entreprisesFiltrees.length === 0` — recherche sans résultat |
| Contenu | une phrase, sans icône ni action |
| Composant parent | aucun — au niveau du contenu de page |
| Zone de dépôt ? | **non** |
| Placeholder ? | **non** — il se substitue au contenu principal |
| Dans une carte ? | **non** |

**C'est l'état « aucun résultat » du contenu principal.** Plus sobre que `<Vide>`
puisqu'il ne porte qu'une ligne, mais de même rang.

## #3 — `src/components/referentiel/import/SuiviAnalyse.jsx:83` · **CE N'EST PAS UN ÉTAT VIDE**

```jsx
{enCours ? (
  <div role="status" aria-live="polite"
       className="flex flex-col items-center gap-3 rounded-2xl border border-dashed
                  border-ink-200 bg-surface px-6 py-8 text-center">
    <SustwayLoader taille="lg" />
    <p className="text-sm text-ink-700">Lecture du document en cours…</p>
    <p className="max-w-md text-xs text-ink-500">Cette étape prend de quelques secondes à
      plusieurs minutes…</p>
  </div>
) : null}
```

| Critère | Constat |
|---|---|
| Condition | `enCours = statut === STATUT.ANALYSE_EN_COURS` (l.23) |
| Rôle ARIA | **`role="status"` + `aria-live="polite"`** |
| Contenu | **un `SustwayLoader`**, un message de progression, une estimation de durée |

**C'est un état de chargement.** Le trait tireté y sert de marque d'attente, pas
de vide. Rien n'y est absent : quelque chose est en train de se produire.

Le classer parmi les états vides était une erreur de mon audit P4.5, qui les
avait groupés par géométrie. **Il n'a pas été modifié**, et son `py-8` reste
approprié : le bloc contient déjà un loader de grande taille et trois lignes de
texte, il n'a pas besoin de respiration supplémentaire.

---

# 3. Convention `<Vide>` de référence

`src/components/ui.jsx` — **non modifié**.

```jsx
<div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed
                border-ink-200 bg-surface px-6 py-12 text-center">
  <Info className="h-6 w-6 text-ink-300" aria-hidden />
  <p className="text-sm text-ink-500">{message}</p>
</div>
```

| Propriété | Valeur déclarée | Valeur mesurée au navigateur |
|---|---|---|
| Padding | `px-6 py-12` | **`48px 24px`** |
| Bordure | `border border-dashed border-ink-200` | **`dashed 1px`** |
| Rayon | `rounded-2xl` | **`16px`** |
| Fond | `bg-surface` | — |
| Typographie | `text-sm text-ink-500` | — |
| Icône | `Info`, `h-6 w-6 text-ink-300` | — |
| Action | **aucune** | — |
| Usages | **67** | — |

---

# 4. Modifications effectuées

| Empty state | Avant | Après | Résultat |
|---|---|---|---|
| **#1** `Entreprises.jsx:208` | `py-14` | **`py-12`** | **harmonisé** |
| **#2** `Entreprises.jsx:241` | `py-10` | **`py-12`** | **harmonisé** |
| **#3** `SuiviAnalyse.jsx:83` | `py-8` | **`py-8`** | **conservé — état de chargement, pas un état vide** |

**Seul le padding vertical a changé.** `px-6`, le rayon, la bordure, le fond, la
typographie, l'icône, le halo et le bouton d'action de #1 sont intacts. Aucune
structure HTML n'a été modifiée, aucun conteneur n'a été transformé en `<Vide>`.

---

# 5. Détail par fichier

## `src/pages/Entreprises.jsx` — 2 lignes

```diff
- <div className="relative overflow-hidden rounded-2xl border border-dashed border-ink-200 bg-surface px-6 py-14 text-center">
+ <div className="relative overflow-hidden rounded-2xl border border-dashed border-ink-200 bg-surface px-6 py-12 text-center">
```
```diff
- <p className="rounded-2xl border border-dashed border-ink-200 bg-surface px-6 py-10 text-center text-sm text-ink-500">
+ <p className="rounded-2xl border border-dashed border-ink-200 bg-surface px-6 py-12 text-center text-sm text-ink-500">
```

`git diff --stat` : **1 fichier, 10 insertions, 10 suppressions** — les 8 autres
lignes du diff sont du réalignement d'indentation produit par le remplacement.

## `src/components/referentiel/import/SuiviAnalyse.jsx` — **non touché**

---

# 6. Vérification des autres `border-dashed`

Inventaire après modification, **16 conteneurs**, comparé au relevé d'avant :

| Catégorie | Fichiers | État |
|---|---|---|
| **Zone de dépôt** | `DepotPreuves:62` — `p-4 transition-colors` | **inchangée** |
| **Placeholders en ligne** | `CritereEvaluation:340`, `NonConformites:292`, `ReferentielDetail:353`, `ReferentielDetail:441` — `p-3` | **inchangés** |
| **Panneaux vides dans une carte** | `VoletAnalysesIa:66`, `VoletPlanAction:126`, `VoletPreuves:31`, `TableMissions:51`, `AuditDetail:72` — `px-4 py-10` | **inchangés** |
| **État de chargement** | `SuiviAnalyse:83` — `px-6 py-8` | **inchangé** |
| **Autres contextuels** | `FilActivite:13` (`px-4 py-8`), `Inscription:345` (`p-4`), `TableauDeBord:556` (`px-4`) | **inchangés** |
| **États vides de page** | `Entreprises:208`, `Entreprises:241` | **`px-6 py-12`** |

**Aucun remplacement accidentel.** Le `git diff` du fichier ne contient que deux
lignes portant `border-dashed`, toutes deux avec `py-14`/`py-10` → `py-12`.

---

# 7. Validation responsive

## #2 — mesuré au navigateur, état réellement déclenché

L'état « aucun résultat » a été atteint en saisissant une recherche infructueuse
dans le champ de la page — et non celui de la barre latérale, distinction qui a
demandé un second essai.

| Largeur | Padding mesuré | Haut / bas | Rayon | Hauteur | Centrage | Débordement | Console |
|---|---|---|---|---|---|---|---|
| **390 px** | **`48px 24px`** | 48 / 48 | 16px | 138 px | `center` | aucun | 0 |
| **768 px** | **`48px 24px`** | 48 / 48 | 16px | 118 px | `center` | aucun | 0 |
| **1024 px** | **`48px 24px`** | 48 / 48 | 16px | 118 px | `center` | aucun | 0 |
| **1280 px** | **`48px 24px`** | 48 / 48 | 16px | 118 px | `center` | aucun | 0 |
| **1440 px** | **`48px 24px`** | 48 / 48 | 16px | 118 px | `center` | aucun | 0 |

**Identique à la référence `<Vide>`**, mesurée dans la même session :
`padding 48px 24px | rayon 16px | bordure dashed 1px`.

Les 138 px à 390 px viennent du texte qui passe sur deux lignes — comportement
normal, pas un débordement.

## #1 — non observable, et pourquoi

`#1` ne s'affiche que si `entreprises.length === 0`. La base contient
**11 organisations**, et aucun compte existant n'en voit zéro. Provoquer cet état
supposerait de modifier la base, ce que la consigne interdit.

**Ce qui est établi malgré tout** : `#1` porte désormais la chaîne `px-6 py-12`,
strictement identique à celle de `#2` et de `<Vide>`. Puisque `#2` mesure
`48px 24px` avec cette même chaîne, `#1` ne peut pas rendre autre chose — les
deux classes sont les mêmes utilitaires Tailwind, sans surcharge.

C'est une **déduction appuyée sur une mesure**, pas une observation directe. Je
le signale plutôt que de laisser croire que les cinq largeurs ont été vues sur
cet écran.

---

# 8. Validation navigateur

| Contrôle | Résultat |
|---|---|
| Référence `<Vide>` mesurée | `padding 48px 24px`, rayon `16px`, bordure `dashed 1px` |
| `#2` aux 5 largeurs | **identique à la référence** |
| Centrage | `text-align: center` conservé |
| Bordure tiretée | conservée |
| Texte | lisible, passe sur 2 lignes à 390 px |
| Actions | `#2` n'en porte pas ; celle de `#1` n'a pas été touchée |
| Débordement d'élément | **aucun** |
| Débordement de page | **aucun** |

---

# 9. Console

**0 erreur, 0 avertissement** sur les 5 chargements de la page Organisations,
état vide déclenché compris.

---

# 10. Build / lint / tests

| Contrôle | Résultat |
|---|---|
| `npx vite build` | **BUILD=0** |
| `npm run lint` | **0 erreur** ; 1 avertissement, `Landing.jsx:19` — préexistant, fichier non touché |
| Tests frontend | **aucun** — `package.json` n'expose que `dev`, `build`, `lint`, `preview` |

---

# 11. Fichiers modifiés

```
 src/pages/Entreprises.jsx | 10 +++++-----
 1 file changed, 10 insertions(+), 10 deletions(-)
```

**Un seul fichier.** Aucun composant créé, aucune structure HTML modifiée,
`<Vide>` non touché.

---

# 12. Régressions éventuelles

## Contrôles passés

| Contrôle | Résultat |
|---|---|
| Appels API | diff filtré sur `api.get\|post\|put\|delete\|patch` → **0** |
| Routes | `App.jsx` : 4 lignes, toutes de P1.4 — rien de P4.5.2 |
| Auth | `git diff src/auth/` → **vide** |
| Backend / base | aucun fichier touché |
| Configuration | `tailwind.config.js`, `vite.config.js`, `package.json`, `docker-compose.yml` → **aucun** |
| Composant `<Vide>` | **non modifié** |
| 14 autres `border-dashed` | **non modifiés** |

## Ce qui reste à surveiller

| Point | Pourquoi |
|---|---|
| **`#1` non observé** | Sa mesure est déduite, pas vue. À vérifier le jour où un compte sans organisation existera — ou lors d'une recette sur données vierges |
| **`#1` perd 8 px de hauteur** | Son halo (`h-40`, positionné en absolu) et son bouton d'action ne bougent pas, mais la composition se resserre légèrement. Non observé, pour la raison ci-dessus |

---

# 13. Conclusion

Les deux états vides qui en étaient réellement rendent désormais le même rythme
vertical que `<Vide>` : **`48px 24px`**, mesuré aux cinq largeurs pour celui qui
est atteignable, et garanti par une chaîne de classes identique pour l'autre.

Le troisième cas n'a pas été touché, et c'est le point important de cette étape :
`SuiviAnalyse:83` n'est pas un état vide mais un **état de chargement** —
`role="status"`, `aria-live="polite"`, un loader et une estimation de durée. Mon
audit P4.5 l'avait rangé avec les autres parce qu'il partageait leur géométrie
`px-6 py-*`. Lui appliquer la convention des états vides aurait aligné deux
choses qui ne disent pas la même chose.

Aucun des quatorze autres `border-dashed` n'a bougé : ni la zone de dépôt, ni les
quatre placeholders en ligne, ni les cinq panneaux vides de carte.

```text
Verdict : P4.5.2_PARTIEL

Etats vides harmonises   : 2 / 3
Exception documentee     : 1   (SuiviAnalyse:83, etat de chargement)
Fichiers modifies        : 1
Lignes de classe changees: 2
Autres border-dashed     : 14, tous inchanges
Mesures navigateur       : 5 largeurs sur #2, + la reference <Vide>
Debordements             : 0
Erreurs console          : 0
Build / Lint             : PASS
```

Le verdict est `P4.5.2_PARTIEL` au sens du § 12 de la consigne — « si une
exception justifiée doit être conservée » — et non parce qu'un travail resterait
à faire. Les trois cas sont traités : deux harmonisés, un écarté sur preuve.

---

**Arrêt ici. P4.5.3 n'est pas commencé : ni badges, ni alertes. Aucun backend,
API, base, route ou auth modifiés. Aucun commit, aucun push.**

> **Note de suivi** : le rapport **P4.5.1** (normalisation des hauteurs de
> boutons) n'a pas encore été rédigé. Ses mesures sont complètes — 50 relevés,
> primaire 36 px, secondaire 36 px, ghost icon-only 32 px, 0 paire désalignée,
> 0 débordement, 0 erreur console — et son code est en place depuis. Dites-moi
> si vous voulez que je le produise.

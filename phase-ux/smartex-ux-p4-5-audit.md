# SMARTEX SUSTWAY — Audit P4.5, composants UI

**Date** : 2026-09-16
**Nature** : **READ-ONLY** — aucun fichier modifié, aucun composant créé, aucun
refactoring ; aucun commit
**Méthode** : inventaire statique + **25 mesures navigateur** (5 pages × 5 largeurs),
session SUPER_ADMIN authentifiée, après P4.1 à P4.4

```text
PHASE UX P4.5 — AUDIT FINAL DES COMPOSANTS UI

Verdict :
READY_FOR_P4_5_IMPLEMENTATION
```

---

# 1. Résumé exécutif

Après quatre étapes de consolidation, le Design System est **sain sur l'essentiel**.
Les primitives sont employées avec une régularité qui ne demande rien : 189 usages
des classes de bouton, 73 badges, 114 alertes, 153 champs, une seule bibliothèque
d'icônes. Sur 25 mesures navigateur : **0 débordement de page, 0 badge tronqué,
0 alerte débordante, 0 erreur console**.

**Une correction à mon propre audit P4** : j'y annonçais « 2 boutons stylés à la
main ». Vérification faite, ces deux occurrences sont des `<span>` porte-icônes,
pas des boutons. Le chiffre réel est **0 sur 189**.

**Trois incohérences réelles subsistent**, toutes mesurées :

1. **Les boutons ont deux hauteurs qui devraient n'en faire qu'une** — 36 px pour
   le primaire, **38 px pour le secondaire**, parce que `.btn-secondary` ajoute
   une bordure sans réduire son padding. Les deux se côtoient en **16 endroits**.
2. **Les états vides de niveau page ont trois paddings verticaux différents** là
   où `<Vide>` en impose un.
3. **Onze éléments reproduisent une primitive sans l'employer** — 7 façon badge,
   4 façon alerte — dont deux qui en copient exactement la géométrie.

Deux signaux relevés par l'instrumentation ont été **vérifiés et écartés** comme
faux positifs : les éléments « hors cadre » et les champs « trop étroits » sont
tous à l'intérieur de tableaux à défilement horizontal, ce qui est leur
comportement normal.

**Aucun problème critique.** Une IMPORTANTE, cinq MODÉRÉES, quatre MINEURES.

---

# 2. Boutons

## Inventaire

| Variante | Définition | Usages |
|---|---|---|
| `.btn` (socle) | `inline-flex items-center justify-center gap-2 rounded-lg px-3.5 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50` | — |
| `.btn-primary` | `btn bg-brand-600 text-white hover:bg-brand-700` | **57** |
| `.btn-secondary` | `btn border border-ink-200 bg-surface text-ink-700 hover:bg-ink-100` | **51** |
| `.btn-ghost` | `btn text-ink-600 hover:bg-ink-100` | **80** |
| `.btn-danger` | `btn bg-rose-600 text-white hover:bg-rose-700` | **1** |
| `.btn-vitrine*` | 3 variantes `rounded-full` | 18, vitrine |
| **Stylés localement** | — | **0** |

Le constat P4 est donc **encore meilleur qu'annoncé** : 189 boutons, aucun écrit à
la main.

## B-1 · Le bouton secondaire est 2 px plus haut que le primaire — **IMPORTANT**

```
Fichier   : src/index.css, .btn (l.156) et .btn-secondary (l.162)
Mesure    : 25 relevés navigateur — hauteurs 36 px et 38 px coexistantes
Cause     : .btn        = 20 px (texte) + 16 px (py-2)            = 36 px
            .btn-secondary ajoute `border` sans compenser le padding
                        = 20 + 16 + 2 (bordures)                   = 38 px
Preuve    : /app/referentiels 1024px — btn-primary x12 a 36 px, btn-secondary x1 a 38 px
Fréquence : 16 emplacements où un primaire et un secondaire se cotoient
```

Les 16 emplacements : `Abonnement:139`, `ComparaisonEntreprises:108` et `:122`,
`CritereEvaluation:590`, `EntrepriseDetail:105` et `:668`, `Inscription:548`,
`PageIntrouvable:47`, `PlanActions:165`, `PlanAmeliorationDetail:182`,
`Projets:351`, `Rapports:161` et `:206`, `ReferentielsListe:236`,
`TableauDeBord:613` et `:618`.

**Impact** : deux boutons voisins d'une même rangée d'actions ne sont pas alignés.
C'est visible sur les paires « Nouveau référentiel / Exporter » et
« Tableau de bord / Revenir à… ».

**Recommandation** : `STANDARDISER`. Deux voies — donner au socle `.btn` une
bordure transparente, ou réduire de 1 px le padding vertical du secondaire. La
première est la plus sûre : elle aligne toutes les variantes d'un coup.

## B-2 · Les boutons icon-only ont deux hauteurs — **MODÉRÉ**

```
Mesure   : 28 px (x4) et 32 px (x1) sur /app/{org}/utilisateurs a 390 px
Cause    : `btn-ghost p-1.5` + icone `h-4 w-4` -> 16 + 12 = 28 px
           `btn-ghost p-1.5` + icone `h-5 w-5` -> 20 + 12 = 32 px
Usages   : 9 occurrences de `btn-ghost p-1.5`
```

Il n'existe pas de variante icon-only déclarée : chaque usage compose
`btn-ghost` + un padding, et la taille dépend de l'icône choisie.
**Recommandation** : `À ARBITRER` — une variante dédiée réglerait la taille, mais
9 usages ne justifient pas forcément une primitive de plus.

## B-3 · Ni état `loading`, ni variante `success` — **MODÉRÉ / CONSERVER**

`disabled=` apparaît 102 fois : l'attente est gérée par la désactivation, sans
indicateur visuel normalisé. Pas de variante `success` — le vert reste réservé au
sens « conforme ». **`loading` : à arbitrer. `success` : conserver.**

---

# 3. Badges / statuts

P4.1 a centralisé les correspondances ; cet audit porte sur le **rendu**.

| Critère | Constat |
|---|---|
| Composant | `Badge` — `rounded-full px-2.5 py-1 text-xs font-medium` + ton |
| Usages | **73** |
| Taille rendue | **12 px partout**, sur les 25 mesures |
| Troncature | **0** sur 25 mesures, y compris à 390 px |
| Dictionnaires locaux restants | **14**, tous à usage unique — décision P4.1, conservée |

Les états `EN_REVUE`, `TERMINE`, `ANNULE`, `ARCHIVE`, criticité, niveau, priorité
et statut de non-conformité passent tous par les constantes partagées depuis P4.1.
Le rendu est homogène entre listes et fiches.

## S-1 · Sept éléments « façon badge » hors du composant — **MODÉRÉ**

| Fichier | Géométrie | Nature |
|---|---|---|
| `PlanAmeliorationDetail:263` | `px-2.5 py-1 text-xs bg-ink-100` | **identique à `<Badge ton="neutre">`** |
| `CarteActionPlan:94`, `CartePlan:75`, `MesActions:168` | `px-2 py-0.5 text-xs bg-ink-100` | jeton compact, **cohérent entre eux** |
| `CarteCritere:50`, `VoletAnalysesIa:91` | `px-3 py-1 text-xs bg-brand-50` / `bg-emerald-50` | pastille teintée |
| `EnTeteDomaine:32` | `px-3.5 py-1.5 text-xs bg-brand-50` | pastille large |

**Un seul est un doublon strict** : `PlanAmeliorationDetail:263` reproduit
exactement `<Badge>`. Les trois jetons `px-2 py-0.5` forment une famille
cohérente, plus petite que `Badge` — candidate à une variante déclarée.
Les trois pastilles teintées sont un autre objet.

**Recommandation** : `STANDARDISER` le doublon strict ; `À ARBITRER` pour la
famille de jetons compacts.

---

# 4. Formulaires

| Élément | Total | Via `.input` / `.champ-*` | Reste |
|---|---|---|---|
| `<select>` | 58 | **58** | — |
| `<textarea>` | 10 | **9** | 1 |
| `<input>` | 112 | **92** | 11 sans classe (cases à cocher, champs masqués), 3 recherches sans bordure, 2 `mt-0.5`, 1 `sr-only` |
| Cases à cocher | 7 | — | natives |
| Boutons radio | 4 | — | natifs |
| `role="switch"` | **0** | — | inexistant, aucun besoin observé |

**Inchangé depuis P4, et toujours justifié.** Les mesures navigateur confirment :
**0 champ anormalement étroit** une fois les faux positifs écartés (§ 13).

## F-1 · Une variante compacte non déclarée — **MINEUR**

`input w-auto py-1 text-xs` — 11 occurrences dans les tableaux éditables de
`ReferentielsListe`, largeur mesurée 112 px. C'est un champ numérique en ligne,
volontairement plus petit que `.input`. Il fonctionne, mais n'est pas déclaré
comme variante. **`CONSERVER`**, à documenter.

---

# 5. Tableaux

| Critère | Constat |
|---|---|
| `<Tableau>` | **16 usages** — conteneur à défilement, mention mobile, `.th` / `.td` |
| `<table>` bruts, application | **6** — `SyntheseMission`, `VoletVersions`, `TableMissions`, `Classement`, `ProjetDetail`, `ReferentielsListe` |
| `<table>` bruts, vitrine | 1 — `Formules`, hors périmètre |
| Pagination | un seul motif, le bouton « Charger plus » de `Journal` |

## T-1 · Six tableaux sans le conteneur `Tableau` — **MODÉRÉ**

Les six emploient bien `.th` et `.td` — l'apparence des cellules est donc
conforme — mais pas le conteneur, donc ni le défilement encadré ni
l'avertissement mobile de `Tableau`.

**Nuance mesurée** : aucun débordement de page n'a été constaté sur ces pages, à
aucune largeur. Plusieurs de ces composants gèrent leur propre repli —
`TableMissions` bascule en cartes sous `sm`. Le risque est donc théorique.

**Recommandation** : `À ARBITRER`.

---

# 6. Alertes

| Critère | Constat |
|---|---|
| Composant | `Alerte` — `flex items-start gap-2 rounded-xl px-4 py-3 text-sm` + icône `Info` + ton |
| Usages | **114** |
| Débordement | **0** sur 25 mesures |
| Tons | les 6 de `TONS`, partagés avec `Badge` |

## A-1 · Quatre blocs « façon alerte » hors du composant — **MODÉRÉ**

| Fichier | Géométrie | Rôle |
|---|---|---|
| `CarteAnalyseIa:37` | `rounded-xl px-3.5 py-2.5 text-xs bg-rose-50` | note en ligne dans une carte |
| `CarteAnalyseIa:152` | `rounded-xl px-3.5 py-2.5 text-xs bg-amber-50` | idem |
| `PanneauAlertes:28` | `rounded-xl px-3.5 py-3 text-xs bg-emerald-50` | idem |
| **`CritereEvaluation:1002`** | **`rounded-lg p-3 text-sm bg-amber-50`** | **rayon et taille différents des trois autres** |

Les trois premiers forment une famille cohérente : une **note en ligne**, plus
petite que l'`Alerte` de page. Le quatrième s'en écarte sur le rayon (`lg` au lieu
de `xl`) et la taille de texte.

**Recommandation** : `STANDARDISER` le quatrième sur les trois autres ;
`À ARBITRER` la déclaration d'une variante « note ».

---

# 7. Loading states

| Élément | Usages |
|---|---|
| `<Loader>` — `SustwayLoader` + message centré | **44** |
| `<SustwayLoader>` employé directement | **61** |
| Squelettes (skeleton) | **0** |
| Bouton en chargement | **aucun motif** — `disabled` seul |

## L-1 · Deux façons d'afficher un chargement — **MODÉRÉ**

Les deux usages sont légitimes — `Loader` pour une page, `SustwayLoader` seul
pour un bouton ou un volet. Ce qui manque est la **règle** disant lequel employer.
Inchangé depuis P4. **`À ARBITRER`**.

---

# 8. Empty states

`<Vide>` — `rounded-2xl border border-dashed border-ink-200 bg-surface px-6 py-12 text-center` — **67 usages**.

**16 conteneurs `border-dashed` existent hors du composant**, mais tous ne sont
pas des états vides. Classification faite, fichier par fichier :

| Nature | Occurrences | Géométrie |
|---|---|---|
| **Zone de dépôt** | 1 — `DepotPreuves:62` | `p-4 transition-colors` — le tireté est une affordance de glisser-déposer, **pas un état vide** |
| **Placeholder en ligne** | 4 — `CritereEvaluation:340`, `NonConformites:292`, `ReferentielDetail:353` et `:441` | `p-3` — cohérents entre eux |
| **Panneau vide dans une carte** | 5 — `VoletAnalysesIa`, `VoletPlanAction`, `VoletPreuves`, `TableMissions`, `AuditDetail` | `px-4 py-10 text-center text-sm` — **cohérents entre eux** |
| **État vide de niveau page** | 3 — `Entreprises:208`, `Entreprises:241`, `SuiviAnalyse:83` | `px-6 py-14`, `px-6 py-10`, `px-6 py-8` — **trois paddings pour un même rôle** |
| Autres | 3 — `FilActivite:13`, `Inscription:345`, `TableauDeBord:556` | `px-4 py-8`, `p-4`, **`px-4` sans padding vertical** |

## E-1 · Trois paddings pour l'état vide de niveau page — **MODÉRÉ**

`<Vide>` rend `px-6 py-12`. Les trois équivalents manuels rendent `py-14`,
`py-10` et `py-8`. Même rôle, quatre hauteurs.

**Recommandation** : `STANDARDISER` — les ramener vers `<Vide>`.

## E-2 · Le panneau vide dans une carte n'a pas de primitive — **MODÉRÉ**

Cinq occurrences identiques (`px-4 py-10 text-center text-sm`), plus compactes
que `<Vide>`. Famille cohérente sans déclaration.
**Recommandation** : `À ARBITRER` — une variante compacte de `Vide`.

---

# 9. Error states

| Motif | Implémentation | Usages |
|---|---|---|
| Erreur d'API | `Alerte ton="rouge"` + message d'`ApiError` | motif unique |
| Erreur de chargement | idem, avec état vide supprimé quand une erreur existe | acquis P1.3 |
| Page introuvable | `PageIntrouvable` dans le Layout | acquis P1.4 / P2.2 |
| Erreur de permission | `Vide` avec message dédié | `Utilisateurs:127` |
| **Erreur au niveau du champ** | **aucune** | — |

Les corrections P1 sur `RapportsEntreprise` et `Journal` sont **validées et non
rouvertes**.

## ER-1 · Pas d'erreur au niveau du champ — **MODÉRÉ**

Aucune classe ni composant pour signaler quel champ pose problème. Les erreurs
remontent au bloc. Sur un formulaire à plusieurs entrées, l'utilisateur doit
deviner. Inchangé depuis P4. **`À ARBITRER`**.

---

# 10. Success states

| Motif | Occurrences |
|---|---|
| `Alerte ton="vert"` en ligne | motif principal |
| Effacement temporisé (`brouillonEnregistre`, 2,5 s) | `SaisieCritereMission` |
| **Toast / notification globale** | **0** |

L'absence de toast est un **choix cohérent**, réaffirmé : chaque page rend son
retour près de l'action qui l'a produit. **`CONSERVER`** — ne pas introduire de
toast pour « standardiser ».

---

# 11. Modales

| Recherche | Résultat |
|---|---|
| `role="dialog"` / `aria-modal` | **4 occurrences, 2 fichiers** — `ModaleVideo` et `RechercheVitrine` |
| Zone des deux | **vitrine uniquement** |
| Superpositions `fixed inset-0` | 3 — les deux ci-dessus + le voile de la barre latérale mobile (`Layout`) |
| **Modales dans l'application** | **zéro** |

**Convention confirmée par la mesure, pas supposée** : l'application ouvre des
panneaux en ligne — `afficherFormulaire`, volets d'onglet — jamais de
superposition. **`CONSERVER`. Ne pas en créer.**

---

# 12. Icônes

| Critère | Constat |
|---|---|
| Bibliothèque | **`lucide-react` seule** — aucun mélange |
| `h-4 w-4` | **214 occurrences (74 %)** |
| `h-3.5 w-3.5` | 35 — fils d'Ariane, badges |
| `h-5 w-5` | 20 — en-têtes |
| `h-9 w-9`, `h-10 w-10` | 17 — **conteneurs d'icône**, pas des icônes |
| Icônes décoratives | `aria-hidden` systématique |
| Icônes seules | toujours avec `aria-label` — 0 élément sans nom accessible (mesuré en P4) |

**Aucune incohérence d'icône.** Le seul point lié est B-2 : la taille de l'icône
dans un bouton icon-only fait varier la hauteur du bouton.

---

# 13. Responsive

25 mesures, 5 pages × 5 largeurs.

| Largeur | Boutons | Badges | Champs | Alertes | Débordement de page | Console |
|---|---|---|---|---|---|---|
| **390 px** | h 28/32/36/38, 0 débordant | 12 px, 0 tronqué | 0 étroit | 0 débordante | **non** | 0 |
| **768 px** | idem | idem | 0 étroit | 0 | **non** | 0 |
| **1024 px** | h 36/38 | idem | voir ci-dessous | 0 | **non** | 0 |
| **1280 px** | h 36/38 | idem | idem | 0 | **non** | 0 |
| **1440 px** | h 36/38 | idem | idem | 0 | **non** | 0 |

## Deux signaux vérifiés puis écartés

L'instrumentation a d'abord signalé **11 éléments « hors cadre »** et **11 champs
« trop étroits »** sur `/app/referentiels`, plus 4 boutons hors cadre sur
`/utilisateurs`. Vérification faite élément par élément :

- **tous** se trouvent à l'intérieur d'un conteneur `overflow-x-auto` — un
  tableau à défilement horizontal. Un élément d'un tableau qui défile sort
  normalement du cadre visible ; **la page, elle, ne déborde jamais** ;
- les champs « étroits » sont des `input w-auto py-1 text-xs` de 112 px, des
  champs numériques compacts dans le tableau d'édition des coefficients.

**Faux positifs de ma sonde, pas des défauts.** Je les documente pour que la
prochaine passe ne les compte pas comme des régressions.

## Réserves antérieures non rouvertes

La réserve **1024 px** de P3.1 sur le détail des vignettes n'est ni rouverte ni
comptabilisée ici : elle n'a pas été aggravée, et P4.4 n'y a pas touché.

---

# 14. Duplications

| # | Duplication | Occurrences | Équivalence | Recommandation |
|---|---|---|---|---|
| 1 | Éléments façon badge hors `Badge` | 7, en 4 géométries | **1 stricte**, 3 cohérentes entre elles, 3 autres | STANDARDISER la stricte |
| 2 | Blocs façon alerte hors `Alerte` | 4, en 2 géométries | 3 cohérentes, **1 divergente** | STANDARDISER la divergente |
| 3 | États vides de niveau page | 3 | **équivalents à `Vide`**, paddings différents | STANDARDISER |
| 4 | Panneaux vides dans une carte | 5 | cohérents entre eux, pas de primitive | À ARBITRER |
| 5 | Chargement `Loader` / `SustwayLoader` | 44 / 61 | usages distincts, règle absente | À ARBITRER |
| 6 | Tableaux bruts | 6 | cellules conformes, conteneur absent | À ARBITRER |
| 7 | Surfaces de carte manuelles | **5** | conservées avec motif en P4.4 | CONSERVER |
| 8 | Dictionnaires de statuts locaux | **14** | tous à usage unique | CONSERVER |

---

# 15. Cohérence inter-pages

Usage des primitives sur dix pages de catégories différentes :

| Page | PageTitre | Card | Badge | Alerte | Vide | Loader | Tableau |
|---|---|---|---|---|---|---|---|
| Tableau de bord | — | 5 | — | — | — | 1 | — |
| Missions (liste) | ✔ | 1 | — | 2 | 1 | 1 | — |
| Mission (détail) | ✔ | 3 | 1 | 1 | 2 | 1 | — |
| Critère | ✔ | 6 | 11 | 7 | 4 | 2 | — |
| Référentiels | ✔ | 6 | 2 | 2 | 1 | 1 | — |
| Référentiel | ✔ | 6 | 5 | 12 | 3 | 1 | 1 |
| Rapports | ✔ | 2 | 1 | 2 | 2 | 1 | 1 |
| Plan d'amélioration | ✔ | 3 | 2 | 3 | 2 | 1 | — |
| Projets | ✔ | — | 1 | 2 | 1 | 1 | — |
| Administration | ✔ | 8 | 4 | 4 | 3 | 1 | 3 |

**Deux écarts, tous deux documentés** : `TableauDeBord` n'emploie pas `PageTitre`
(salutation, exception actée en P3), et `Projets` n'emploie pas `Card` (ses
surfaces sont un `<form>` et des cartes de liste, conservées en P4.4).

Partout ailleurs, les mêmes primitives portent le même langage visuel.

---

# 16. STANDARDISER

| ID | Élément | Pourquoi |
|---|---|---|
| **B-1** | Hauteur du bouton secondaire | 2 px d'écart, visible en **16 endroits**. Le plus récurrent des écarts restants |
| **E-1** | États vides de niveau page | 3 paddings pour un rôle unique, alors que `Vide` existe |
| **S-1a** | `PlanAmeliorationDetail:263` | Reproduit exactement `<Badge ton="neutre">` |
| **A-1a** | `CritereEvaluation:1002` | Diverge des 3 autres notes en ligne sur le rayon et la taille |

---

# 17. CONSERVER

| Élément | Pourquoi |
|---|---|
| **Absence de modale dans l'application** | Convention mesurée, cohérente : panneaux en ligne partout |
| **Absence de toast** | Le retour reste près de l'action qui l'a produit |
| **Pas de variante `success` sur les boutons** | Le vert porte le sens « conforme » |
| **14 dictionnaires de statuts locaux** | Tous à usage unique — décision P4.1 |
| **5 surfaces de carte manuelles** | `<article>`, `<form>`, 3 `<div>` — décision P4.4 |
| **`input w-auto py-1 text-xs`** | Champ numérique compact dans un tableau éditable |
| **Jetons `px-2 py-0.5`** | Famille cohérente de 3, plus petite que `Badge` |
| **Boutons par classes CSS** | 189 usages, 0 écart |
| **Absence de squelettes** | Le loader de marque tient ce rôle |

---

# 18. À ARBITRER

| Élément | Question |
|---|---|
| **B-2** Boutons icon-only 28/32 px | Une variante dédiée, ou laisser la taille suivre l'icône ? |
| **B-3** État `loading` | `disabled` suffit-il ? |
| **E-2** Panneau vide compact | Déclarer une variante de `Vide` pour les 5 occurrences ? |
| **L-1** `Loader` / `SustwayLoader` | Écrire la règle d'emploi, ou laisser au cas par cas ? |
| **T-1** 6 tableaux bruts | Les ramener vers `Tableau`, ou acter qu'ils gèrent leur repli ? |
| **ER-1** Erreur au niveau du champ | Les formulaires à plusieurs entrées en ont-ils besoin ? |
| **S-1b** Famille de jetons compacts | Déclarer une variante « jeton » de `Badge` ? |

---

# 19. Problèmes classés par priorité

## CRITIQUE

**Aucun.**

## IMPORTANT

| ID | Problème | Étendue |
|---|---|---|
| **B-1** | Bouton secondaire 2 px plus haut que le primaire | 51 boutons secondaires, **16 paires visibles** |

## MODÉRÉ

| ID | Problème |
|---|---|
| **E-1** | Trois paddings pour l'état vide de niveau page |
| **S-1** | 7 éléments façon badge hors composant, dont 1 doublon strict |
| **A-1** | 4 blocs façon alerte hors composant, dont 1 divergent |
| **B-2** | Boutons icon-only à 28 et 32 px |
| **T-1** | 6 tableaux sans le conteneur `Tableau` |
| **L-1** | Deux façons d'afficher un chargement, sans règle |
| **E-2** | Panneau vide dans une carte, 5 fois sans primitive |
| **ER-1** | Pas d'erreur au niveau du champ |
| **B-3** | Pas d'état `loading` normalisé |

## MINEUR

| ID | Problème |
|---|---|
| **F-1** | Variante `.input` compacte non déclarée |
| — | `TableauDeBord:556` — état vide sans padding vertical |
| — | `Inscription:345` — `p-4` isolé parmi les états tiretés |
| — | `FilActivite:13` — `px-4 py-8 text-xs`, géométrie unique |

---

# 20. Plan d'implémentation recommandé

| Étape | Objet | Fichiers | Risque |
|---|---|---|---|
| **P4.6.1** | Aligner la hauteur des boutons | `index.css`, 1 règle | **faible** — mais touche 189 boutons |
| **P4.6.2** | Ramener 3 états vides vers `Vide` | 3 fichiers | très faible |
| **P4.6.3** | Résorber les 2 doublons stricts (badge, alerte) | 2 fichiers | très faible |
| **P4.6.4** | Arbitrages du § 18 | selon décisions | — |

**P4.6.2 et P4.6.3 sont quasi sans risque** — quelques remplacements.
**P4.6.1 est la seule à effet large** : une règle CSS, mais 189 boutons rendus.

---

# 21. Dépendances

**Aucune dépendance backend, API, base de données, route, rôle ou permission.**

Tous les constats portent sur `frontend-react/src`. Aucun paquet nouveau n'est
nécessaire.

La seule dépendance encore ouverte dans l'ensemble du périmètre UX reste
**F-08b** — la file des évaluations `EN_REVUE`, qui demande un endpoint dédié.
Elle est hors du champ de P4.5.

---

# 22. Risques de régression

| Étape | Risque | Surveillance |
|---|---|---|
| **P4.6.1** boutons | **Le plus large.** Modifier `.btn` change 189 boutons. Ajouter une bordure transparente au socle augmente chaque bouton de 2 px ; réduire le padding du secondaire le diminue de 2 px | Vérifier les rangées d'actions des 16 emplacements, aux 5 largeurs, et les boutons icon-only qui surchargent déjà le padding |
| **P4.6.2** états vides | Une hauteur différente décale ce qui suit | `Entreprises`, `SuiviAnalyse` |
| **P4.6.3** doublons | Passer au composant change l'icône (`Alerte` ajoute `Info`) | Vérifier que l'icône ne surcharge pas une note déjà dense |

**Contrôles applicables** : `npx vite build`, `npm run lint`, diff filtré sur
`api.get|post|put|delete|patch` vide, `App.jsx` et `src/auth/` inchangés, puis
validation navigateur aux 5 largeurs.

---

# 23. Conclusion

Le Design System de SMARTEX SustWay est **cohérent**. Après P4.1 à P4.4, les
primitives sont employées sans dérive : aucun bouton écrit à la main sur 189,
tous les selects passent par `.input`, une seule bibliothèque d'icônes, les
badges rendus à une taille unique, aucun débordement et aucune erreur console sur
25 mesures.

Ce qui reste tient en peu de choses, et une seule mérite le qualificatif
d'importante : **un bouton secondaire deux pixels plus haut que le primaire**,
parce qu'une bordure a été ajoutée sans réduire le padding. C'est visible dans
seize rangées d'actions, et cela se corrige en une règle.

Les autres écarts — trois paddings d'état vide, deux doublons stricts de
primitive — sont des finitions. Le reste de la liste relève d'arbitrages, pas de
défauts.

Le verdict n'est pas `NO_ACTION_REQUIRED` parce que B-1 est réel, mesuré et
récurrent. Il n'est pas non plus lourd : **trois corrections sûres et une règle
CSS** suffiraient à clore le sujet.

```text
Verdict : READY_FOR_P4_5_IMPLEMENTATION

Mesures navigateur   : 25   (5 pages x 5 largeurs)
Débordements de page : 0
Erreurs console      : 0
Badges tronqués      : 0
Alertes débordantes  : 0
Faux positifs levés  : 2    (hors-cadre et champs étroits, tous dans un tableau défilant)

CRITIQUE  : 0
IMPORTANT : 1    (B-1, hauteur du bouton secondaire)
MODÉRÉ    : 9
MINEUR    : 4

STANDARDISER : 4
CONSERVER    : 9
À ARBITRER   : 7
Dépendances backend : aucune
```

---

**Aucune modification effectuée. Aucun composant créé, aucun refactoring. Aucun
backend, API, base, route ou auth touchés. Aucun commit, aucun push.**

> **Note de suivi** : le rapport d'implémentation **P4.4** reste à produire. Sa
> collecte de mesures est complète — 59 relevés, `.card` toujours rendu en
> `<section>`, 0 débordement, 0 erreur console — mais le document n'a pas été
> rédigé, la demande P4.5 étant arrivée entre-temps. Aucun code P4.4 n'a été
> modifié depuis.

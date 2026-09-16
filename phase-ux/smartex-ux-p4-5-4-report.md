# PHASE UX P4.5.4 — PASSE FINALE

**Date** : 2026-09-16 · **Passe finale** : 7 fichiers, 40 insertions, 9 suppressions

```text
Verdict :
P4.5.4_PARTIEL
```

Les quatre sujets nommés ont été audités, et les corrections démontrées
appliquées. Le verdict reste **partiel** pour une seule raison, énoncée au § 6 :
le jeton `text-ink-400` demeure sous le seuil AA pour ses usages de métadonnée.
Le corriger relève d'une décision sur les jetons de couleur, pas de cette passe.

---

## 1. Périmètre

### Traité dans cette passe

| Sujet | Résultat | Fichiers |
|---|---|---|
| **P4.5.4-3** — H1 du tableau de bord | **corrigé** | 1 |
| **P4.5.4-4** — `CritereEvaluation:1002` en mode sombre | **corrigé** | 1 |
| **P4.5.4-5** — troncature à 1024 px | **corrigé** (3 composants) | 3 |
| **P4.5.4-6** — `text-ink-400` | **corrigé partiellement** — 3 usages sur 93 | 3 |
| **Mode sombre** — passe globale | **1 seule anomalie**, = P4.5.4-4 | — |
| **Revalidation P4.5.4-1 / -2** | **conformes, non modifiés** | 0 |

### Rappel des deux corrections déjà validées

| | |
|---|---|
| **P4.5.4-1** | `Layout.jsx:476` — `invisible lg:visible` + `transition-[transform,visibility]` : le tiroir fermé quitte l'ordre de tabulation sous `lg`, la barre du poste de travail reste intacte, l'animation est préservée |
| **P4.5.4-2** | 5 emplacements — un échec d'API n'est plus présenté comme une absence de données ; motif P1 (`erreur` + `<Alerte ton="rouge">` + garde `erreur ? null :`) |

Aucun de ces sept fichiers n'a été retouché dans cette passe (§ 8 et § 9).

---

## 2. Audit initial

Mené en lecture seule avant toute modification. Deux corrections de méthode en
sont sorties, et elles comptent autant que les mesures elles-mêmes.

### Correction de méthode nº 1 — `<main>` calcule `overflow-x: auto`

Ma sonde de troncature écartait tout élément ayant un ancêtre en
`overflow-x: auto`, pour ne pas compter les tableaux à défilement. Or le
conteneur principal de l'application est :

```jsx
<main className="flex-1 overflow-y-auto px-4 py-6 lg:px-8">
```

Tailwind n'y déclare que `overflow-y`, mais **la règle CSS impose que si un axe
n'est pas `visible`, l'autre calcule `auto`**. `getComputedStyle(main).overflowX`
vaut donc `auto`, alors que `<main>` ne défile jamais horizontalement
(`scrollWidth === clientWidth`).

Conséquence : **tout le contenu de page était silencieusement exclu** de ma
mesure de troncature. La sonde rendait « 0 troncature » partout, y compris là où
elle était bien réelle.

**Critère corrigé** : un ancêtre ne légitime un dépassement que s'il **défile
réellement** — `overflowX` permissif **et** `scrollWidth > clientWidth`.

**Ce que cela invalide dans l'audit P4.5.4 précédent** : les compteurs de
troncature du § 5 (« responsive ») ne portaient que sur l'en-tête et la barre
latérale, hors `<main>`. Les troncatures du tableau de bord à 390 px et à
1920 px n'avaient pas été vues. En revanche, la conclusion du § 6 sur 1024 px
reste exacte : elle venait d'une sonde de grilles distincte, qui n'utilisait pas
ce garde-fou. De même, « 0 débordement de page », « 0 chevauchement »,
« 0 erreur console » et « tous les tableaux dans un conteneur à défilement »
restent vrais — revérifiés ici avec la sonde corrigée.

### Correction de méthode nº 2 — l'alpha doit être composité

Après correction du mode sombre, ma sonde a d'abord annoncé un contraste interne
de **1,49** sur le bloc corrigé, ce qui aurait été alarmant. C'était un artefact :
elle lisait `rgba(245, 158, 11, 0.1)` comme une couleur **opaque**. Une fois
l'alpha composité sur le fond réellement peint derrière, le fond effectif est
`rgb(45, 41, 35)` et le contraste **10,02**.

Les deux sondes ont été corrigées avant que la moindre conclusion n'en soit tirée.

### Bascule de thème

Le mode sombre est activé par **le vrai sélecteur de thème**, pas en posant
`.dark` à la main. Le rapport P4.5.3 signalait que la bascule manuelle
n'actualise pas l'état React et fausse les composants qui changent d'illustration
par JavaScript. Cette passe n'a plus cet angle mort.

---

## 3. P4.5.4-3 — H1 du tableau de bord

### État initial

```jsx
<h1 className="text-2xl font-bold text-ink-900">Bonjour, {prenom} 👋</h1>
```

Mesuré : **24 px / 700**.

### Analyse

L'espace applicatif ne compte que **trois** `<h1>` — les autres appartiennent à
la vitrine (`titre-page`) ou aux pages d'authentification (`.vitrine h1.titre-auth`).

| Fichier | Classes | Rendu |
|---|---|---|
| `components/ui.jsx:39` (`PageTitre`) | `text-xl font-semibold` | **20 px / 600** |
| `pages/ProjetDetail.jsx:168` | `text-xl font-semibold` | **20 px / 600** |
| **`pages/TableauDeBord.jsx:413`** | `text-2xl font-bold` | **24 px / 700** |

Le point décisif n'est pas l'écart de taille mais **la structure**. `PageTitre`
rend un titre suivi d'une description :

```jsx
<h1 className="text-xl font-semibold text-ink-900">{titre}</h1>
{description ? <p className="mt-1 max-w-3xl text-sm text-ink-500">{description}</p> : null}
```

Le tableau de bord **réimplémente exactement cette forme** sans passer par le
composant :

```jsx
<h1 className="text-2xl font-bold text-ink-900">Bonjour, {prenom} 👋</h1>
<p className="mt-1 text-sm text-ink-500">Voici la situation actuelle de vos missions d’audit RSE.</p>
```

Même couple titre + description, même `mt-1`, même `text-sm text-ink-500` — mais
un H1 d'un cran au-dessus. Ce n'est donc pas une composition d'accueil distincte
qui appellerait son propre vocabulaire : c'est le même en-tête, plus gros.

Deux éléments achèvent de trancher :

- **Aucun commentaire ne justifie l'écart**, dans un fichier par ailleurs
  abondamment commenté — y compris huit lignes sur le raccourci placé juste à
  côté de ce titre.
- Les huit `<h2>` de la même page rendent **16 px / 600**, conformes à P4.3.
  Seul le H1 diverge.

### Décision

**Harmoniser.** Divergence sans justification fonctionnelle documentée.

### Correction

```diff
+          {/* Convention P4.3 : H1 = 20 px / 600, comme `PageTitre`. Cet en-tete
+              reprend la meme structure (titre + description) sans passer par le
+              composant ; il en suit donc aussi la taille. */}
-          <h1 className="text-2xl font-bold text-ink-900">Bonjour, {prenom} 👋</h1>
+          <h1 className="text-xl font-semibold text-ink-900">Bonjour, {prenom} 👋</h1>
```

**Aucun autre H1 n'a été touché.**

### Mesures

| Largeur | Taille / graisse | Hauteur | Lignes | Débordement | Console |
|---|---|---|---|---|---|
| **390 px** | **20 px / 600** | 28 px | **1** | non | 0 |
| **768 px** | **20 px / 600** | 28 px | **1** | non | 0 |
| **1024 px** | **20 px / 600** | 28 px | **1** | non | 0 |
| **1280 px** | **20 px / 600** | 28 px | **1** | non | 0 |
| **1440 px** | **20 px / 600** | 28 px | **1** | non | 0 |
| **1536 px** | **20 px / 600** | 28 px | **1** | non | 0 |
| **1920 px** | **20 px / 600** | 28 px | **1** | non | 0 |

**Aucun retour à la ligne** de la salutation, à aucune largeur — c'était le
risque à écarter. Le titre gagne même de la marge : il occupe désormais moins de
place à 390 px qu'avant.

---

## 4. P4.5.4-4 — `CritereEvaluation:1002`

### État initial, mesuré en clair et en sombre

| | Clair | Sombre |
|---|---|---|
| Fond du bloc | `rgb(255, 251, 235)` | **`rgb(255, 251, 235)`** — inchangé |
| Carte hôte | `rgb(255, 255, 255)` | `rgb(23, 28, 38)` |
| Contraste interne texte / fond | **6,84** | **6,84** |
| **Détachement du bloc sur sa carte** | **1,04** | **16,46** |
| Bloc voisin « Signal de risque — IA » | suit le thème | suit le thème |

### Analyse

Le texte a toujours été parfaitement lisible **à l'intérieur** du bloc : 6,84:1
dans les deux thèmes. Le défaut n'était pas une question de lisibilité, mais de
**rapport au support**. En clair, le bloc se détache de sa carte d'un facteur
1,04 : c'est un panneau doux, presque fondu. En sombre, ce même rapport montait à
**16,46** — le bloc devenait un pavé crème lumineux sur une carte presque noire.
Un facteur seize entre deux thèmes pour le même élément.

**Ce n'est pas intentionnel**, et le balayage statique le montre sans ambiguïté :
sur les 15 fonds de palette fixe du périmètre applicatif, **13 déclarent une
variante `dark:`**. Les trois notes strictement comparables — `CarteAnalyseIa:37`,
`CarteAnalyseIa:152`, `PanneauAlertes:28` — en déclarent toutes une. Celui-ci est
le seul à combiner un fond pastel `-50` et un texte fixe sans variante. Une teinte
`-50` est quasi blanche : elle ne fonctionne que sur fond clair.

### Décision

**Corriger**, avec le couple de classes que porte déjà la note équivalente.
Aucune palette nouvelle, aucun jeton modifié.

### Correction

```diff
+      {/* Sans variante sombre, le bloc « Pistes d’amélioration » restait crème
+          sur une carte passée en rgb(23,28,38) : son détachement de la carte
+          passait de 1,04 à 16,46. Même couple de classes que la note
+          équivalente de CarteAnalyseIa. */}
       {evaluation.recommandationNecessaire ? (
-        <div className="flex items-start gap-2 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
+        <div className="flex items-start gap-2 rounded-lg bg-amber-50 p-3 text-sm text-amber-800 dark:bg-amber-500/10 dark:text-amber-300">
```

### Mesures après correction — 390 / 768 / 1024 / 1440 px, identiques

| | Clair | Sombre **avant** | Sombre **après** |
|---|---|---|---|
| Fond déclaré | `rgb(255,251,235)` | `rgb(255,251,235)` | `rgba(245,158,11,0.1)` |
| **Fond effectif** (alpha composité) | `rgb(255,251,235)` | `rgb(255,251,235)` | **`rgb(45,41,35)`** |
| Contraste interne texte / fond | 6,84 | 6,84 | **10,02** |
| **Détachement sur la carte** | **1,04** | **16,46** | **1,18** |

Le rapport du bloc à sa carte est désormais **1,04 en clair et 1,18 en sombre** :
un panneau doux dans les deux thèmes, au lieu d'un écart de facteur seize. Et le
texte y gagne, passant de 6,84 à 10,02 en sombre.

**0 erreur console** aux quatre largeurs, dans les deux thèmes.

---

## 5. P4.5.4-5 — Troncature à 1024 px

### Pages testées

Tableau de bord, Organisations, Score de mission — **7 largeurs chacune** :
390 / 768 / 1024 / 1280 / 1440 / 1536 / 1920.

Mesure de troncature **réelle** et non géométrique : caractères effectivement
masqués (`scrollWidth > clientWidth` avec `overflow-x` non `visible`),
`line-clamp` vertical, présence de l'ellipse, présence d'un `title`, et exclusion
des conteneurs qui **défilent réellement** (§ 2) et des éléments `sr-only`.

### Résultats de l'audit, avant correction

| Page | Largeur | Éléments tronqués | Perte max | Ellipse | `title` |
|---|---|---|---|---|---|
| Score | **1024** | **3** | 40 px — **27 %** | oui | **NON** |
| Score | 768, 1280 → 1920 | **0** | — | — | — |
| Organisations | **1024** | **2** | 21 px — **28 %** | oui | **NON** |
| Organisations | 390, 768, 1280 → 1920 | **0** | — | — | — |
| Tableau de bord | **390** | **5** | 32 px — **14 %** | oui | **NON** |
| Tableau de bord | **1920** | **6** | 99 px — **35 %** | oui | **oui** |
| Tableau de bord | 768 → 1536 | **0** | — | — | — |

Détail des textes concernés :

```
score @1024   « Notes / coefficients »          106 / 111 px   -5 px
              « Évaluation validée par l’IA »   106 / 145 px  -39 px
              « Aucune évaluation lancée »      106 / 146 px  -40 px
organis@1024  « 450 M XOF »                      55 /  76 px  -21 px
              « 180 M XOF »                      55 /  76 px  -21 px
dashbrd@390   noms de missions, cartes mobiles                -23 à -32 px
dashbrd@1920  noms de missions, tableau                       -58 à -99 px
```

### Analyse

La troncature est **réelle et voulue** : chaque élément concerné porte une classe
`truncate` écrite explicitement, l'ellipse s'affiche, aucun débordement de page
n'en résulte à aucune largeur, et rien ne se chevauche. Ce n'est pas une casse de
mise en page. Conformément à la consigne, **la structure des grilles n'a pas été
touchée**.

Le vrai défaut est ailleurs, et l'audit l'a isolé : **la valeur tronquée n'est
pas récupérable**, faute de `title`. Et l'incohérence est démontrable à
l'intérieur d'un même composant — `TableMissions` pose `title={mission.nom}` sur
les cellules de son tableau (lignes 86 et 89) mais l'omet sur ses cartes mobiles
(lignes 154 et 155), **alors que ce sont les cartes qui tronquent à 390 px**.

### Corrections

**Trois composants**, une seule idée : rendre la valeur accessible sans toucher à
la mise en page.

```diff
// components/ui.jsx — detail de StatCard
+        {/* `truncate` est voulu, mais a 1024 px le detail perd jusqu'a 27 % de sa
+            longueur : le `title` garde la valeur entiere accessible. */}
-        {detail ? <p className="mt-0.5 truncate text-xs text-ink-500">{detail}</p> : null}
+        {detail ? (
+          <p className="mt-0.5 truncate text-xs text-ink-500" title={typeof detail === 'string' ? detail : undefined}>
+            {detail}
+          </p>
+        ) : null}
```

```diff
// components/tableau-bord/TableMissions.jsx — cartes mobiles
+                  {/* Le tableau ci-dessus porte deja ces `title` ; les cartes les
+                      omettaient, alors que ce sont elles qui tronquent a 390 px. */}
-                  <p className="truncate text-sm font-semibold text-ink-900">{mission.organisation}</p>
-                  <p className="truncate text-xs text-ink-500">{mission.nom}</p>
+                  <p className="truncate text-sm font-semibold text-ink-900" title={mission.organisation}>
+                    {mission.organisation}
+                  </p>
+                  <p className="truncate text-xs text-ink-500" title={mission.nom}>
+                    {mission.nom}
+                  </p>
```

```diff
// pages/Entreprises.jsx — chiffre d'affaires
+                          {/* La forme compacte tronque a 1024 px : « 450 M XOF » perd sa
+                              devise. L'infobulle porte le montant exact plutot que de
+                              repeter l'abreviation, qui n'apprendrait rien de plus. */}
-                          <dd className="truncate text-sm font-semibold tabular-nums text-ink-900">
+                          <dd
+                            className="truncate text-sm font-semibold tabular-nums text-ink-900"
+                            title={
+                              e.chiffreAffaires == null
+                                ? undefined
+                                : `${Number(e.chiffreAffaires).toLocaleString('fr-FR')} ${
+                                    e.deviseChiffreAffaires ?? ''
+                                  }`.trim()
+                            }
+                          >
```

**Un choix à signaler** : pour le chiffre d'affaires, l'infobulle porte le montant
**exact** (`450 000 000 XOF`) et non la forme compacte affichée. Répéter
« 450 M XOF » dans une infobulle n'aurait restitué que la devise perdue ; c'est le
montant que la forme compacte escamote, et c'est lui qui intéresse sur un écran
qui classe des organisations par poids économique. Le choix va légèrement au-delà
de la restitution stricte, et je le signale plutôt que de le laisser passer pour
un simple report de valeur.

### Mesures après correction, 7 largeurs

| Page | Largeur | Tronqués | **Sans `title`** | Débordement de page |
|---|---|---|---|---|
| Score | 1024 | 3 | **0** | non |
| Score | 6 autres largeurs | 0 | 0 | non |
| Organisations | 1024 | 2 | **0** | non |
| Organisations | 6 autres largeurs | 0 | 0 | non |
| Tableau de bord | 390 | 5 | **0** | non |
| Tableau de bord | 1920 | 6 | **0** | non |
| Tableau de bord | 1024 | 0 | 0 | non |

**Plus aucune valeur tronquée n'est irrécupérable.** 0 erreur console.

### Réserve honnête

Un `title` ne s'affiche ni au clavier ni au toucher. C'est une atténuation, pas
une solution complète. La solution complète supposerait de revoir la largeur des
colonnes à 1024 px, ce que la consigne protège explicitement.

---

## 6. P4.5.4-6 — `text-ink-400`

### Usages analysés

**93 occurrences dans 47 fichiers.** Chacune classée par rôle, sur son contexte
réel.

| Rôle | Nombre | Exemple | Verdict |
|---|---|---|---|
| **Icône décorative** (`aria-hidden`) | **21** | `<Lightbulb className="h-4 w-4 text-ink-400" aria-hidden />` | conservé — ce n'est pas du texte |
| **Métadonnée `text-xs`** | **35** | horodatages, codes de critère, légendes | conservé — § ci-dessous |
| **Bouton-icône** | **5** | `p-1.5 text-ink-400 hover:text-ink-700` | conservé — 3,23 passe le seuil de 3:1 des composants d'interface, et le survol fonce |
| **Tiret d'absence « — »** | **7** | `<span className="text-ink-400">—</span>` | conservé — marque d'absence, pas un contenu |
| **Placeholder** | **6** | `placeholder:text-ink-400` | conservé — tous les champs portent un `<label>` réel |
| **Mention `(facultatif)` / `(optionnel)`** | **3** | indication de formulaire | conservé |
| **État non atteint** | **1** | `jalon.atteint ? 'text-ink-800' : 'text-ink-400'` | conservé — **texte désactivé**, il doit reculer |
| **Médaille d'argent** | **1** | `MEDAILLES = ['text-amber-500', 'text-ink-400', 'text-amber-700']` | conservé — couleur décorative |
| **Chargement transitoire** | **1** | `JaugeCirculaire:39` « Analyse… », remplacé par `text-3xl text-ink-900` | conservé |
| **Métadonnée en ligne** | **2** | `AuditDetail:337` « · ville », `CarteProposition:86` « · confiance 87 % » | conservé |
| **Enveloppe d'icône** | **1** | `CarteAnalyseIa:57`, porte un `Info` et un nom `sr-only` | conservé |
| **PHRASE DE CONTENU** | **3** | voir ci-dessous | **corrigé** |
| Divers (code technique) | 12 | `font-mono` | conservé |

### Les trois vrais problèmes

Trois usages seulement portent une **phrase**, en `text-sm`, dans un rôle où le
texte est le contenu :

| Fichier | Texte | Rôle |
|---|---|---|
| `components/audit/CarteCritere.jsx:132` | « Aucune situation décrite par l'organisation. » | message d'absence, **remplace** un contenu rendu en `text-sm text-ink-700` |
| `pages/CritereEvaluation.jsx:266` | « Aucune situation décrite. » | même motif, même écran |
| `components/audit/SyntheseMission.jsx:170` | « Non évalué » | **valeur d'état** — la légende juste en dessous est en `text-xs text-ink-500`, donc **plus foncée que la valeur qu'elle décrit** |

Le troisième cas est le plus net : la hiérarchie y est inversée.

### Le jeton de destination, mesuré

| Jeton | Clair | Sombre | Seuil AA (texte < 18,66 px) |
|---|---|---|---|
| `text-ink-400` | **3,23** | **3,34** | ✗ |
| **`text-ink-500`** | **4,85** | **5,68** | **✓ dans les deux thèmes** |
| `text-ink-600` | 6,47 | 8,57 | ✓ |
| `text-ink-700` | 9,03 | 10,27 | ✓ |

`text-ink-500` est exactement le jeton que `<Vide>` emploie pour son message
d'absence (`ui.jsx:102`, `text-sm text-ink-500`). Les trois phrases corrigées
rejoignent donc la convention qui existait déjà pour leur rôle. **Aucune couleur
nouvelle, aucun jeton modifié.**

### Corrections

```diff
- <p className="mt-2.5 text-sm text-ink-400">Aucune situation décrite par l’organisation.</p>
+ <p className="mt-2.5 text-sm text-ink-500">Aucune situation décrite par l’organisation.</p>

- <p className="mt-2 text-sm text-ink-400">Aucune situation décrite.</p>
+ <p className="mt-2 text-sm text-ink-500">Aucune situation décrite.</p>

- <p className="mt-3 text-sm text-ink-400">Non évalué</p>
+ <p className="mt-3 text-sm text-ink-500">Non évalué</p>
```

Mesuré après correction, aux quatre largeurs et dans les deux thèmes :
**4,85 en clair, 5,68 en sombre**, classe `text-ink-500`, 14 px.

### Ce qui reste, et pourquoi le verdict est partiel

Les **35 usages de métadonnée** — en-têtes de section de la barre latérale,
horodatages du journal, jetons de permission — restent à 3,23 : 1 en clair et
3,34 : 1 en sombre, sous le seuil AA de 4,5 pour du texte de moins de 18,66 px.

Ils n'ont pas été changés, pour trois raisons :

1. Les remonter à `ink-500` **supprimerait le palier le plus faible** de la
   hiérarchie typographique : `ink-500` est déjà le ton du texte secondaire, et
   `ink-400` sert précisément à distinguer la métadonnée du texte secondaire.
2. Modifier la valeur du jeton `--ink-400` se répercuterait sur les 93 usages et
   sur les deux thèmes — ce n'est pas une correction minimale.
3. Les deux options relèvent d'une **décision sur les jetons de couleur**, pas
   d'une passe de cohérence.

C'est le seul point qui empêche un verdict `P4.5.4_OK`, et il est signalé comme
tel plutôt que résolu à la hâte.

---

## 7. Mode sombre

### Balayage statique complet du périmètre applicatif

Vitrine et pages d'authentification exclues, celles-ci ayant leur propre système
de couleurs.

| Catégorie | Total | Avec `dark:` | **Sans** |
|---|---|---|---|
| `bg-<palette>-<n>` | 15 | 13 | **2** |
| `text-<palette>-<n>` | 26 | 17 | **9** |
| `border-<palette>-<n>` | 4 | **4** | **0** |
| `bg-white` / `bg-black` | 10 | 0 | 10 → **tous hors périmètre** |
| `text-white` / `text-black` | 34 | 4 | 30 → voir ci-dessous |

### Anomalies confirmées

| Élément | Light | Dark attendu | Dark constaté | Cause | Correction |
|---|---|---|---|---|---|
| **`CritereEvaluation:1002`** | crème sur blanc, détachement 1,04 | fond atténué suivant la carte | crème sur `rgb(23,28,38)`, détachement **16,46** | fond pastel `-50` sans variante `dark:` | **`dark:bg-amber-500/10 dark:text-amber-300`** — § 4 |

**Une seule anomalie sur tout le périmètre.**

### Anomalies écartées, avec leur raison

| Élément | Raison |
|---|---|
| `EtapesImport:65` — `bg-emerald-500` | trait de liaison de 2 px, teinte **saturée 500** lisible sur les deux fonds ; les branches voisines emploient `bg-brand-500` et `bg-ink-100`, réactifs au thème |
| `Logo.jsx:39` | le composant reçoit `variante={estSombre ? 'clair' : 'sombre'}` — le thème est géré en amont, en JavaScript |
| `ClotureMission:165`, `CritereEvaluation:1011`, `Utilisateurs:348` | icônes de validation en `text-emerald-500/600` sur surface réactive |
| `EntrepriseDetail:624`, `Utilisateurs:271`, `Utilisateurs:316` | icônes de suppression en `text-rose-600` sur surface réactive |
| `MesActions:178` | `text-rose-600` pour une échéance dépassée ; l'alternative `text-ink-500` est réactive |
| `Layout.jsx:669` — `bg-black/40` | **voile du tiroir** : un scrim doit rester sombre dans les deux thèmes |
| `text-white` sur `bg-brand-600` (`ActionsCritere:41`, `CarteNiveauMaturite`, `CarteReponseBinaire`…) | le fond est lui aussi fixe : le couple est cohérent dans les deux thèmes |
| `AppelAction`, `PiedPublic`, `ModaleVideo` | **vitrine uniquement** — vérifié sur leurs importateurs |
| `CadreAuth` | **pages d'authentification**, panneau sombre propre ; hors périmètre autorisé |
| `BasculeTheme` | porte une prop explicite `surPanneauSombre` pour ses deux contextes |

### Éléments du Design System vérifiés au rendu, dans les deux thèmes

Cartes, panneaux, badges, alertes, textes, bordures, fonds, champs, états de
chargement, états vides, états d'erreur, éléments interactifs : **aucune autre
incohérence** relevée. Les tons de `<Badge>` et `<Alerte>` déclarent tous leur
variante sombre dans `TONS` (`ui.jsx:50-57`), inchangé depuis P4.1.

---

## 8. Revalidation P4.5.4-1

**Aucune modification.** `Layout.jsx` n'a pas été rouvert dans cette passe.

| Scénario | Mesure | Résultat |
|---|---|---|
| **390 px, fermé** | `x = -288`, `visibility: hidden`, focusables réels **0 / 22** | **0 arrêt sur 12** (Tab ×8 + Shift+Tab ×4), 0 anneau hors écran |
| **768 px, fermé** | idem | **0 arrêt sur 12** |
| **390 px, ouvert** | `x = 0`, `visibility: visible`, **22** focusables | **10 arrêts sur 10** dans le tiroir, tous à `x = 12` ; focus direct **ACCEPTÉ** |
| **768 px, ouvert** | idem | **10 / 10** ; focus direct **ACCEPTÉ** |
| **1024 px** | `visibility: visible`, 22 focusables | **12 arrêts sur 12** dans la navigation |
| **1440 px** | idem | **12 / 12** |

### Animation

`transition-property` mesuré : **`transform, visibility`**.

| Instant | Position | `visibility` |
|---|---|---|
| Ouverture, +80 ms | `x = -200` | **visible** |
| Fermeture, +60 ms | `x = -50` | **visible** |
| Fermeture, +120 ms | `x = -223` | **visible** |
| Fermeture, +200 ms | `x = -279` | **visible** |
| Fermeture, +320 ms | `x = -288` | **hidden** |

Le tiroir glisse toujours pendant les 300 ms et ne quitte l'ordre de tabulation
qu'à l'arrivée. **0 erreur console.**

---

## 9. Revalidation P4.5.4-2

**Aucune modification.** Les cinq composants n'ont pas été rouverts.

Erreurs provoquées par blocage réseau réel (`Network.setBlockedURLs`), à 390 et
1440 px, plus un passage nominal.

| Emplacement | Erreur → alerte | Erreur → message d'absence | Écran blanc | Chargeur figé | Erreurs JS | Nominal |
|---|---|---|---|---|---|---|
| `VoletPreuves` | **oui** | **non** | non | non | **0** | **OK** — vrai état vide affiché |
| `EntrepriseDetail` sites | **oui** | **non** | non | non | **0** | **OK** — vrai état vide affiché |
| `EntrepriseDetail` historique | **oui** | **non** | non | non | **0** | **OK** — données affichées |
| `ImportReferentiel` | **oui** | **non** | non | non | **0** | **OK** — données affichées |
| `FinancementsVerts` | **oui** | **non** | non | non | **0** | **OK** — données affichées |

**15 contrôles sur 15.** Les trois branches — erreur, succès sans données,
succès avec données — restent distinctes.

---

## 10. Responsive

3 pages × 7 largeurs après toutes les corrections.

| Largeur | Débordement de page | Éléments hors cadre | Tableaux hors conteneur | Tableaux débordants | Console |
|---|---|---|---|---|---|
| **390 px** | **non** (3/3) | 15 → tiroir fermé, faux positif | **0** | **0** | **0** |
| **768 px** | **non** (3/3) | 15 → tiroir fermé, faux positif | **0** | **0** | **0** |
| **1024 px** | **non** (3/3) | **0** | **0** | **0** | **0** |
| **1280 px** | **non** (3/3) | **0** | **0** | **0** | **0** |
| **1440 px** | **non** (3/3) | **0** | **0** | **0** | **0** |
| **1536 px** | **non** (3/3) | **0** | **0** | **0** | **0** |
| **1920 px** | **non** (3/3) | **0** | **0** | **0** | **0** |

Les 15 « éléments hors cadre » à 390 et 768 px restent le tiroir fermé, mesuré à
`x = -288`. La sonde relève une **position géométrique** ; `visibility: hidden` ne
déplace rien. Ce qui a changé est mesuré au § 8 : ils ne sont plus focusables.

Wrapping, boutons, badges, titres, cartes et grilles vérifiés à chaque largeur :
aucun élément coupé sans ellipse, aucun chevauchement.

---

## 11. Build

```
npx vite build   ->   code 0
                      1971 modules transformés
                      terminé en 7,92 s
```

## 12. Lint

```
npm run lint (oxlint)   ->   code 0
                             0 erreur
                             1 avertissement : src/pages/Landing.jsx:19
                             ('SMARTEX' importé non utilisé) — PRÉEXISTANT,
                             fichier non touché
```

### Deux échecs rattrapés par la chaîne de vérification

1. **Commentaire JSX mal placé.** J'avais d'abord écrit le commentaire de la
   correction P4.5.4-4 avec `//` en contexte JSX, puis en `{/* */}` **à
   l'intérieur** de la parenthèse d'un ternaire — deux formes invalides. Le lint
   l'a signalé (`Expected , or ) but found Identifier`). Le commentaire est
   désormais placé au-dessus du ternaire, en position d'enfant JSX.
2. **Correction oubliée.** La validation navigateur a montré que
   `Entreprises.jsx` tronquait toujours sans `title` (`sansTitle: 2`) : je ne
   l'avais pas modifié, alors que je l'avais annoncé. Corrigé, puis revalidé
   (`sansTitle: 0`). C'est la mesure qui l'a rattrapé, pas la relecture.

## 13. Tests

**Aucun test frontend n'existe** : `package.json` n'expose que `dev`, `build`,
`lint`, `preview`. Rien n'a été ajouté — créer une infrastructure de test sortait
du périmètre de cette passe.

---

## 14. Console navigateur

**0 erreur, 0 avertissement, 0 exception** sur l'ensemble des campagnes :

| Campagne | Chargements | Console |
|---|---|---|
| H1, 7 largeurs | 9 | **0** |
| Troncature, 3 pages × 7 largeurs | 21 | **0** |
| Mode sombre, 4 largeurs × 2 thèmes | 8 | **0** |
| Revalidation clavier, 4 largeurs | 6 | **0** |
| Revalidation réseau, 5 emplacements | 15 | **0** |
| Responsive, 3 pages × 7 largeurs | 21 | **0** |

---

## 15. Fichiers modifiés

Contribution propre à la passe finale, hors travaux antérieurs :

```
 src/pages/TableauDeBord.jsx                 |  4 +++-      (P4.5.4-3)
 src/pages/CritereEvaluation.jsx             |  6 ++++--    (P4.5.4-4 et -6)
 src/components/ui.jsx                       |  7 ++++--    (P4.5.4-5)
 src/components/tableau-bord/TableMissions.jsx |  8 +++---  (P4.5.4-5)
 src/pages/Entreprises.jsx                   | 13 +++++++--  (P4.5.4-5)
 src/components/audit/CarteCritere.jsx       |  1 +-        (P4.5.4-6)
 src/components/audit/SyntheseMission.jsx    |  1 +-        (P4.5.4-6)
 7 fichiers, 40 insertions, 9 suppressions
```

Aucun composant créé. Aucune primitive modifiée dans son API : `StatCard`
utilise sa prop `detail` existante comme `title`, sans nouvelle prop.
`<Badge>`, `<Alerte>`, `<Vide>`, `<Loader>` inchangés. `lib/tonsStatuts.js`
inchangé. `index.css` **non touché** par cette passe.

---

## 16. Diff

Les cinq diffs sont donnés en place aux § 3, 4, 5 et 6. Récapitulatif des
modifications de classes :

| Fichier | Avant | Après |
|---|---|---|
| `TableauDeBord.jsx:413` | `text-2xl font-bold` | **`text-xl font-semibold`** |
| `CritereEvaluation.jsx:1002` | `bg-amber-50 … text-amber-800` | **+ `dark:bg-amber-500/10 dark:text-amber-300`** |
| `CritereEvaluation.jsx:266` | `text-sm text-ink-400` | **`text-sm text-ink-500`** |
| `CarteCritere.jsx:132` | `text-sm text-ink-400` | **`text-sm text-ink-500`** |
| `SyntheseMission.jsx:170` | `text-sm text-ink-400` | **`text-sm text-ink-500`** |
| `ui.jsx:82` | `truncate` sans `title` | **+ `title={detail}`** |
| `TableMissions.jsx:154-155` | `truncate` sans `title` | **+ `title={…}`** ×2 |
| `Entreprises.jsx:276` | `truncate` sans `title` | **+ `title={montant exact}`** |

---

## 17. Régressions

### Contrôles de périmètre

| Contrôle | Résultat |
|---|---|
| `api-quarkus/`, `service-ia/` | **non touchés** (11 fichiers modifiés relèvent de la phase 3D, en pause) |
| Migrations de base | **0** |
| Routes (`App.jsx`) | **4 lignes, toutes de P1.4** |
| `src/auth/` | **diff vide** |
| `tailwind.config.js`, `vite.config.js`, `package.json`, `docker-compose.yml` | **0** |
| `index.css` | **non touché par cette passe** |
| Appels d'API | **0** ligne ajoutée ou supprimée |
| Logique métier | **inchangée** |
| HEAD | **`d1b8bb6`** — aucun commit, aucun push |

### Non-régression du Design System

| Phase | Attendu | Mesuré après la passe |
|---|---|---|
| P4.1 | tons issus de `tonsStatuts.js` | fichier inchangé |
| P4.2 | focus clavier | anneau sur **12/12** arrêts |
| **P4.3** | **H1 = 20 px / 600** | **20 px / 600 sur les 3 H1 applicatifs** — la divergence est résorbée |
| P4.3 | H2 = 16 px / 600 | **16 px / 600** |
| P4.4 | `.card` en `rounded-2xl` | rayon 16 px |
| P4.5.1 | boutons à 36 px | primaire 36, secondaire 36 |
| P4.5.2 | `<Vide>` inchangé | inchangé |
| P4.5.3 | badges 12 px / 24 px | 12 px / 24 px |
| P4.5.4-1 | tiroir | § 8 — conforme |
| P4.5.4-2 | états réseau | § 9 — 15/15 |

### Ce qui reste à surveiller

| Point | Pourquoi |
|---|---|
| **`title` inopérant au clavier et au toucher** | atténuation, pas solution ; la solution complète passerait par la largeur des colonnes à 1024 px |
| **Infobulle du chiffre d'affaires** | elle porte le montant exact, non l'abréviation affichée — choix délibéré, § 5 |
| **Contraste des métadonnées** | 35 usages de `text-ink-400` restent à 3,23 / 3,34 — § 6 |
| **Lecteurs d'écran** | `visibility: hidden` retire bien le tiroir de l'arbre d'accessibilité, vérifié sur le focus ; **non vérifié avec un lecteur d'écran réel**, faute d'en disposer ici |

---

## 18. Points volontairement non corrigés

| Point | Raison |
|---|---|
| **35 usages « métadonnée » de `text-ink-400`** | les remonter à `ink-500` supprimerait le palier le plus faible de la hiérarchie ; modifier le jeton toucherait 93 usages et les deux thèmes. **Décision sur les jetons de couleur, hors de cette passe.** |
| **Les 21 icônes, 6 placeholders, 7 tirets, 5 boutons-icônes, 1 état désactivé en `ink-400`** | usages légitimes : ce n'est pas du contenu qui doit rester pleinement lisible |
| **Structure des grilles à 1024 px** | la consigne protège explicitement cette structure ; la troncature y est voulue et porte désormais un `title` |
| **`EtapesImport:65`** et les 8 autres couleurs fixes sans `dark:` | teintes saturées 500/600 sur surface réactive, ou gérées en amont — § 7 |
| **Vitrine et pages d'authentification** | hors périmètre applicatif ; systèmes de couleurs propres |
| **Voile du tiroir `bg-black/40`** | un scrim doit rester sombre dans les deux thèmes |
| **Les 12 autres `.catch`** écartés en P4.5.4-2 | replis commentés, replis par organisation, listes d'options de formulaire, `AuditScore:64` |
| **Tests frontend** | aucune infrastructure n'existe ; en créer une sortait du périmètre |

---

## 19. Verdict

```text
P4.5.4_PARTIEL

Sujets audites                  : 6
Corriges                        : 4   (P4.5.4-3, -4, -5, -6 partiel)
Revalides sans modification     : 2   (P4.5.4-1, P4.5.4-2)

Fichiers modifies               : 7
Insertions / suppressions       : 40 / 9
Composants crees                : 0
Primitives modifiees            : 0
Couleurs nouvelles              : 0

P4.5.4-3  H1 tableau de bord    : 24px/700 -> 20px/600, 7 largeurs, 1 ligne
P4.5.4-4  detachement du bloc   : 1,04 / 16,46 -> 1,04 / 1,18
          contraste interne     : 6,84 / 6,84  -> 6,84 / 10,02
P4.5.4-5  valeurs sans title    : 10 -> 0
P4.5.4-6  phrases sous AA       : 3,23 / 3,34 -> 4,85 / 5,68  (3 usages)
Dark mode : anomalies           : 1 confirmee, corrigee ; 10 ecartees sur preuve
P4.5.4-1  arrets clavier        : ferme 0/12, ouvert 10/10, poste 12/12
P4.5.4-2  controles reseau      : 15 / 15

Debordement de page (7 largeurs): 0
Erreurs console                 : 0
Build / Lint                    : PASS
Backend / API / DB / routes/auth: INCHANGES
```

**Pourquoi partiel et non `OK`** : les 35 usages de `text-ink-400` en métadonnée
restent sous le seuil AA. Ce n'est pas un oubli mais un arbitrage que je n'ai pas
voulu trancher seul, parce qu'il touche à la définition des jetons de couleur et
à la hiérarchie visuelle de tout le produit. Il est décrit au § 6 avec ses deux
options et leurs conséquences.

Deux corrections de méthode méritent d'être retenues au-delà de cette phase. La
première : `<main className="overflow-y-auto">` fait **calculer** `overflow-x: auto`
à l'élément, ce qui avait rendu aveugle mon détecteur de troncature sur tout le
contenu de page — le critère correct est qu'un ancêtre ne légitime un dépassement
que s'il **défile réellement**. La seconde : un fond en `rgba(..., 0.1)` doit être
composité sur ce qui est peint derrière avant tout calcul de contraste, sans quoi
la mesure annonce 1,49 là où la réalité est 10,02.

---

**Arrêt ici. P4.6 n'est pas commencé. Aucune refonte supplémentaire. Aucun
commit, aucun push. Backend, API, base, routes et auth inchangés. J'attends votre
validation du rapport.**

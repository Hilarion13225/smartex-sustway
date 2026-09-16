# SMARTEX SUSTWAY — P4.5.4, audit états / responsive / cohérence

**Date** : 2026-09-16 · **Nature** : **AUDIT STRICTEMENT READ-ONLY** · **Aucun fichier modifié**

```text
AUDIT P4.5.4 TERMINÉ

Problèmes confirmés      : 6
Corrections obligatoires : 2
Corrections recommandées : 1
Hors périmètre           : 1
À arbitrer               : 2

Faux positifs écartés    : 6 familles
Aucune modification effectuée.
```

---

# 1. Méthode

Tout ce qui suit a été **mesuré**, jamais déduit d'une lecture seule. Deux
techniques ont servi à éviter les faux positifs qui ont coûté cher aux audits
précédents :

1. **Exclusion des conteneurs à défilement.** Un élément qui dépasse à
   l'intérieur d'un ancêtre en `overflow-x: auto` ne dépasse pas : il défile.
   La sonde remonte la chaîne des ancêtres avant de compter.
2. **Essais par clonage / mutation DOM à l'exécution.** Les correctifs proposés
   ont été éprouvés dans le navigateur en modifiant le DOM vivant, puis
   restaurés. **Aucun fichier source n'a été touché.**

**Couverture** : 42 relevés responsive (6 pages × 7 largeurs), 4 pages en
contraste clair et sombre, 2 parcours clavier réels de 12 tabulations, 18 relevés
de grilles, plus l'analyse statique des 1 371 `className` littéraux du périmètre
applicatif.

**Limite assumée de la méthode.** Le mode sombre a été activé en posant `.dark`
sur `<html>` à l'exécution. Cela active correctement les variantes CSS `dark:`
(`darkMode: 'class'`), mais **ne met pas à jour l'état React** `estSombre`. Les
composants qui changent d'illustration par JavaScript — le `Logo`, qui reçoit
`variante={estSombre ? 'clair' : 'sombre'}` — restent donc dans leur variante
claire pendant le test. Le ratio de 2,14 relevé sur le mot-clé du logo en sombre
est un **artefact de la mesure**, pas un défaut du produit, et n'est pas retenu.

---

# 2. Audit initial — ce qui a été contrôlé

| Sujet | Méthode | Résultat |
|---|---|---|
| États utilisateur | inventaire statique + rendu | § 3 |
| Error states | analyse des 17 `.catch` + rendu associé | § 4 — **problème confirmé** |
| Responsive 7 largeurs | 42 relevés | § 5 — **0 défaut** |
| Cas 1024 px | mesure des cellules de grille | § 6 — troncature volontaire |
| Tableaux | ancêtre à défilement + débordement réel | § 7 — **0 défaut** |
| Mode sombre | scan statique + mesure clair/sombre | § 8 — **1 écart, déjà connu** |
| Interactions | états déclarés + parcours clavier réel | § 9 — **problème confirmé** |
| Accessibilité | noms, labels, titres, focus, contrastes | § 10 |
| Duplications | 779 chaînes de classes distinctes | § 11 — **0 extraction justifiée** |
| Les 11 cas P4.5.3 | non-régression | § 12 — **conformes** |
| P4.1 → P4.5.3 | mesure de non-régression | § 13 — **tenues** |

---

# 3. États analysés

## Primitives d'état en service

| Primitive | Usages | Rôle |
|---|---|---|
| `<Alerte>` | **114** | erreur, avertissement, information |
| `<Vide>` | **67** | absence de contenu |
| `<Loader>` | **44** | chargement de page ou de volet |
| `SustwayLoader` | **92** | chargement en ligne |
| `role="status"` | **5** | états dynamiques annoncés |
| `aria-live` | **4** | idem |
| `disabled` | **102** | action indisponible |

## Répartition par page

Sur 45 pages, **38 déclarent les trois états** chargement / erreur / vide.
Sept ne portent que deux d'entre eux ; toutes ont été examinées (§ 4).

| État | Rendu observé | Primitive | Cohérence |
|---|---|---|---|
| loading (page) | `<Loader message="…" />` centré, `SustwayLoader` taille `lg` | `Loader` | **OK** |
| loading (en ligne) | `SustwayLoader` + texte, parfois `role="status"` | `SustwayLoader` | **OK** |
| empty (page) | cadre tireté `px-6 py-12`, icône `Info` | `Vide` | **OK** — harmonisé en P4.5.2 |
| empty (dans une carte) | cadre tireté `px-4 py-10` | local, 5 usages cohérents | **OK** — variante assumée |
| no result | phrase dans un cadre tireté | `Entreprises:241` | **OK** — harmonisé en P4.5.2 |
| error | `<Alerte ton="rouge">` + message d'`ApiError` | `Alerte` | **OK** là où déclaré — § 4 |
| warning | `<Alerte ton="ambre">` | `Alerte` | **OK** |
| success | `<Alerte ton="vert">` | `Alerte` | **OK** |
| disabled | `disabled:cursor-not-allowed disabled:opacity-50` sur `.btn` | classe de base | **OK** — une seule déclaration |
| not found | `<PageIntrouvable />` | page dédiée | **OK** — posée en P1.4 |
| permission denied | « … introuvable ou non accessible » | `Vide` | **OK** — formulation qui couvre les deux cas |
| analyse en cours | `role="status"` + `aria-live="polite"` + loader | `SuiviAnalyse:83` | **OK** — confirmé en P4.5.2 |
| analyse terminée | carte de résultat + badge de score | `Badge` | **OK** — migré en P4.5.3 |
| analyse échouée | note rose en ligne | `CarteAnalyseIa:37` | **OK** — conservé en P4.5.3 |

## Loading, empty, error et no-result ne sont pas confondus

Le cas nommé par la consigne, **`SuiviAnalyse.jsx:83`**, est bien un **état de
chargement** : il est conditionné par `statut === STATUT.ANALYSE_EN_COURS`, porte
`role="status"` et `aria-live="polite"`, et contient un `SustwayLoader`. Il n'a
pas été normalisé en état vide et ne doit pas l'être. **Vérifié, inchangé.**

Aucun autre cas de confusion entre ces quatre états n'a été trouvé côté rendu.
La confusion existe en revanche **en amont**, dans la gestion des erreurs — c'est
l'objet du paragraphe suivant.

---

# 4. Error states — **problème confirmé**

## Le motif de référence, posé en P1, est intact

```jsx
const [erreur, setErreur] = useState(null);
…
.catch((err) => setErreur(err instanceof ApiError ? err.message : 'Chargement … impossible'))
…
{erreur ? <Alerte ton="rouge">{erreur}</Alerte> : null}
…
) : erreur ? null : ( <Vide message="Aucun …" /> )
```

La partie décisive est la garde **`erreur ? null :`** : elle empêche d'afficher
« aucun élément » quand le chargement a échoué.

**Vérifié sur les trois pages nommées par la consigne** :

| Page | `erreur` déclaré | `<Alerte ton="rouge">` | Garde `erreur ? null :` |
|---|---|---|---|
| `RapportsEntreprise.jsx` | l. 25 | l. 61 | **l. 89** |
| `Journal.jsx` | l. 37 | l. 160 | **l. 180** |
| `PipelineIA.jsx` | l. 26 | l. 93 | **l. 198** |

**Aucune régression.** `PipelineIA:45` porte même un commentaire qui qualifie
explicitement ses deux `.catch` internes de replis voulus.

## Le problème : 5 écrans annoncent une absence après un échec

Sur **17 `.catch(() => setX([]))`** recensés, la plupart sont des replis
légitimes. Cinq ne le sont pas : ils remplacent un échec de chargement par une
**affirmation factuelle d'absence**, sur le contenu principal de l'écran.

| # | Fichier | Ligne | Contenu concerné | Ce que l'utilisateur lit après un échec |
|---|---|---|---|---|
| **E1** | `components/audit/VoletPreuves.jsx` | 23 | preuves — contenu de l'onglet « Preuves » | « **Aucune preuve déposée sur cette mission.** » |
| **E2** | `pages/EntrepriseDetail.jsx` | 65 | sites de l'organisation | « **Aucun site pour l'instant.** » |
| **E3** | `pages/EntrepriseDetail.jsx` | 215 | historique de score | « **Pas encore d'historique de score…** » |
| **E4** | `pages/ImportReferentiel.jsx` | 79 | liste des imports | « **Aucun import pour le moment.** » |
| **E5** | `pages/FinancementsVerts.jsx` | 40 | missions | « **Aucune mission pour l'instant — créez-en une depuis « Missions d'audit ».** » |

**E5 est le plus net** : le bloc `catch { setLignes([]); }` avale l'erreur sans
la lire, et l'écran invite ensuite l'utilisateur à créer une mission qui existe
peut-être déjà. Sur un écran de financement, c'est une affirmation à portée
métier.

**E1 est le plus grave par son contexte** : sur une mission d'audit, dire
« aucune preuve déposée » quand l'appel a échoué revient à annoncer un défaut de
conformité qui n'est pas établi.

### Deux cas de second rang

| # | Fichier | Ligne | Ce qui est affirmé |
|---|---|---|---|
| **E6** | `pages/NonConformites.jsx` | 108 | « Aucune action corrective pour l'instant. » — sous-liste d'une non-conformité |
| **E7** | `pages/ReferentielDetail.jsx` | 560 | « Aucune surcharge sectorielle — **la criticité générale s'applique partout**. » — affirmation de configuration |

## Ce qui n'est **pas** un problème, et pourquoi

| Cas | Motif de l'écartement |
|---|---|
| `PlanAmeliorationDetail.jsx:95` | **repli commenté et voulu** : « leur absence ne doit pas empêcher de lire le plan » |
| `PipelineIA.jsx:34,38` | replis internes explicitement commentés ; l'erreur globale est bien remontée |
| `Classement.jsx:36,44` | replis **par organisation** : un classement ne doit pas disparaître parce qu'une organisation répond mal |
| `AuditScore.jsx:64` | le message dit « Score **introuvable ou non accessible** » — la formulation couvre l'échec, elle n'affirme pas une absence |
| `EntrepriseDetail:282`, `Entreprises:37`, `Inscription:113/119`, `Questionnaire:36`, `AuditsListe:90`, `DepotReferentiel:45` | listes d'**options de formulaire** (secteurs, référentiels, formules) : aucune assertion d'absence n'est affichée |

---

# 5. Responsive — **0 défaut sur 42 relevés**

6 pages × 7 largeurs : 390 / 768 / 1024 / 1280 / 1440 / 1536 / 1920.

| Largeur | Débordement de page | Éléments hors cadre (hors défilement) | Chevauchements | Console |
|---|---|---|---|---|
| **390** | **non** (6/6) | 15 → **tous faux positifs** | 0 | 0 |
| **768** | **non** (6/6) | 15 → **tous faux positifs** | 0 | 0 |
| **1024** | **non** (6/6) | **0** | 0 | 0 |
| **1280** | **non** (6/6) | **0** | 0 | 0 |
| **1440** | **non** (6/6) | **0** | 0 | 0 |
| **1536** | **non** (6/6) | **0** | 0 | 0 |
| **1920** | **non** (6/6) | **0** | 0 | 0 |

Pages couvertes : tableau de bord, liste des missions, détail de mission,
évaluation de critère, référentiels, organisations. Barre latérale, en-tête,
navigation, cartes, grilles, formulaires et zones d'action inclus dans le balayage.

## Les trois familles de faux positifs, qualifiées par la mesure

**1. Les 15 « éléments hors cadre » à 390 et 768 px** — chacun a pour ancêtre
`aside` avec `transform: matrix(1, 0, 0, 1, -288, 0)` : c'est **le tiroir de
navigation fermé**, hors écran de −288 px. À 1024 px et au-delà, le compte tombe
à **0**. Faux positif visuel — mais la mesure a révélé autre chose, § 9.

**2. Le mot-clé du logo et le compteur `9+`** — signalés `scrollWidth > clientWidth`,
mais mesurés en **`overflow: visible`** : rien n'est coupé, le texte peint
simplement hors de sa boîte. La capture d'écran le confirme.

**3. « Clair », « Sombre », « Système »** — mesurés à `1 × 1 px`,
`clip: rect(0,0,0,0)`, classe `sr-only`. Ce sont les **noms accessibles** du
sélecteur de thème. Non seulement ce n'est pas un défaut, c'est la raison pour
laquelle ces boutons sont correctement nommés (§ 10).

---

# 6. Cas 1024 px — troncature volontaire, rendu fonctionnel

La réserve documentée en P3/P4.3 est **confirmée**, et strictement limitée à
1024 px.

| Page | Largeur | Colonnes | Largeur de cellule | Contenus tronqués | Chevauchement |
|---|---|---|---|---|---|
| Score de mission | **1024** | 3 | **208 px** | **3** | 0 |
| Score de mission | 1280 | 3 | 294 px | **0** | 0 |
| Score de mission | 1440 | 3 | 347 px | **0** | 0 |
| Organisations | **1024** | 2 | **79 px** | **5** | 0 |
| Organisations | 1280 | 2 | 122 px | **0** | 0 |
| Tableau de bord | 1024 | 3 | 103 px | **0** | 0 |

## Ce qui est tronqué, exactement

| Texte | Disponible | Nécessaire | Perdu | Ellipse | `title` |
|---|---|---|---|---|---|
| « Notes / coefficients » | 106 px | 111 px | 5 px | **oui** | non |
| « Évaluation validée par l'IA » | 106 px | 145 px | 39 px | **oui** | non |
| « Aucune évaluation lancée » | 106 px | 146 px | 40 px | **oui** | non |
| « 450 M XOF » (chiffre d'affaires) | 55 px | 76 px | 21 px | **oui** | non |

## Verdict : conserver

Les deux sources portent une classe **`truncate` écrite explicitement** —
`ui.jsx:82` pour le détail de `StatCard`, `Entreprises.jsx:276` pour le
`<dd>` du chiffre d'affaires. **La troncature est le comportement voulu**, pas
une casse de mise en page : l'ellipse s'affiche, rien ne déborde, rien ne se
chevauche, et au-delà de 1280 px la troncature disparaît d'elle-même.

Conformément à la consigne — « si le rendu est fonctionnel, conserver » — **la
structure n'est pas modifiée**.

Une nuance mérite votre arbitrage : aucun de ces éléments ne porte de `title`,
donc à 1024 px la valeur complète n'est pas récupérable. Pour trois libellés
secondaires c'est sans conséquence ; pour **un chiffre d'affaires**, la devise
disparaît. → **P4.5.4-5**, à arbitrer.

---

# 7. Tableaux — **0 défaut**

| Contrôle | Résultat |
|---|---|
| Tableaux visibles rencontrés | 1 par page selon la vue |
| Dans un conteneur à défilement | **100 %** |
| Défilement réellement actif | oui à 1024–1440, **non à 1920** (le tableau tient) |
| Tableaux débordant hors d'un conteneur | **0**, à toutes les largeurs |
| Contenu resté accessible | oui — le défilement fonctionne et est annoncé |

Le défilement horizontal est **volontaire** et n'a pas été touché. Les cellules
étroites relevées par les audits antérieurs restent des faux positifs : elles
vivent toutes dans un conteneur `overflow-x-auto`.

---

# 8. Mode sombre — **1 écart, déjà documenté**

## Balayage statique du périmètre applicatif

| Catégorie | Total avec couleur fixe | Avec variante `dark:` | **Sans** |
|---|---|---|---|
| Fonds (`bg-<couleur>-<n>`) | 15 | 13 | **2** |
| Textes (`text-<couleur>-<n>`) | 26 | 17 | **9** |
| Bordures (`border-<couleur>-<n>`) | 4 | **4** | **0** |

## Qualification des 11 cas sans variante

| Cas | Nature | Verdict |
|---|---|---|
| `EtapesImport.jsx:65` | trait de liaison `h-0.5` en `bg-emerald-500` — teinte **saturée 500**, lisible sur les deux fonds ; les branches voisines utilisent `bg-brand-500` et `bg-ink-100`, tous deux réactifs au thème | **faux positif** |
| `Logo.jsx:39` | feuille du logo — le composant reçoit déjà `variante={estSombre ? 'clair' : 'sombre'}`, le thème est géré en amont | **faux positif** |
| `ClotureMission:165`, `CritereEvaluation:1011`, `Utilisateurs:348` | icônes de validation en `text-emerald-500/600` sur surface réactive | **faux positif** |
| `EntrepriseDetail:599`, `Utilisateurs:271`, `Utilisateurs:316` | icônes de suppression en `text-rose-600` sur surface réactive | **faux positif** |
| `MesActions:178` | `text-rose-600` pour une échéance dépassée, alternative `text-ink-500` réactive | **faux positif** |
| **`CritereEvaluation:1002`** | **seul cas combinant un fond pastel `-50` et un texte fixe, sans aucune variante `dark:`** | **écart réel** |

Une teinte **`-50`** est quasi blanche : elle ne fonctionne que sur fond clair.
C'est précisément ce qui distingue ce cas des dix autres, qui emploient des
teintes 500/600 saturées.

## Mesure du cas signalé par la consigne

Page d'évaluation de critère, bascule `.dark` posée à l'exécution :

| Élément | Clair | Sombre | Suit le thème ? |
|---|---|---|---|
| Carte hôte | `rgb(255,255,255)` | `rgb(23,28,38)` | **oui** |
| Bloc voisin « Signal de risque — IA » | `rgba(246,247,249,0.6)` | `rgba(16,20,28,0.6)` | **oui** |
| **`CritereEvaluation:1002`** | `rgb(255,251,235)` | **`rgb(255,251,235)`** | **non** |

Le constat de P4.5.3 est reproduit à l'identique.

## Les trois questions posées par la consigne

1. **Est-ce un vrai bug ?** Oui. Le bloc reste un pavé crème sur une carte
   sombre, alors que le bloc situé juste au-dessus suit correctement le thème.
   Le texte y demeure lisible — ambre foncé sur crème — mais l'îlot tranche.
2. **Est-ce une exception intentionnelle ?** Rien ne l'indique. Les trois notes
   comparables (`CarteAnalyseIa:37`, `:152`, `PanneauAlertes:28`) déclarent
   toutes leur variante `dark:`. Celle-ci est la seule à ne pas le faire : c'est
   un oubli, pas une décision.
3. **Relève-t-il d'une autre étape ?** **Oui.** P4.5.3 a tranché « conserver » sur
   cet élément, et y ajouter des classes n'est ni une migration ni une
   conservation. Le corriger ici reviendrait à rouvrir une décision validée.

→ **P4.5.4-4, à arbitrer.** Correctif d'une classe, calqué sur son voisin
`CarteAnalyseIa:152` : `dark:bg-amber-500/10 dark:text-amber-300`.

---

# 9. Interactions — **problème confirmé**

## États déclarés

| État | Déclaration | Couverture |
|---|---|---|
| `hover` | 45 occurrences dans `index.css` | **toutes les variantes `.btn*`** |
| `disabled` | `disabled:cursor-not-allowed disabled:opacity-50` sur `.btn` | **une seule déclaration, héritée par toutes les variantes** |
| `focus-visible` | bloc global posé en P4.2 | **vérifié au clavier réel** |
| `active` | 1 occurrence | pas d'état pressé dans l'app — **choix assumé, non modifié** |

Le parcours clavier a confirmé un anneau de focus visible (`outline` non nul) sur
**12 arrêts sur 12**. P4.2 tient.

## Le tiroir de navigation fermé reste dans l'ordre de tabulation

`components/Layout.jsx:473-477` :

```jsx
<aside className={clsx(
  'sidebar-tech bordure-sidebar fixed inset-y-0 left-0 z-40 flex w-72 flex-col border-r transition-transform duration-300 lg:static lg:translate-x-0',
  ouvert ? 'translate-x-0' : '-translate-x-full'
)}>
```

Sous `lg`, quand `ouvert` vaut `false`, le tiroir est déplacé hors écran par une
transformation. **Une transformation ne retire rien de l'ordre de tabulation.**

Mesuré à 390 px et 768 px :

| Contrôle | Valeur |
|---|---|
| Position du tiroir | `x = -288`, entièrement hors écran |
| `aria-hidden` | **absent** |
| `inert` | **absent** |
| Éléments focusables à l'intérieur | **22** |
| Arrêts de tabulation dans le tiroir, sur 12 tabulations | **12 / 12** |
| Anneau de focus | peint **hors écran**, à `x = -276` |

Trace réelle, 390 px, touches `Tab` envoyées par le protocole :

```
TIROIR:button[]              x=-49  HORS-ECRAN outline=oui
TIROIR:button[Navigation]    x=-276 HORS-ECRAN outline=oui
TIROIR:a[Vue générale]       x=-276 HORS-ECRAN outline=oui
TIROIR:a[Missions d'audit]   x=-276 HORS-ECRAN outline=oui
TIROIR:a[Organisations]      x=-276 HORS-ECRAN outline=oui
TIROIR:a[Projets]            x=-276 HORS-ECRAN outline=oui
…
```

**Conséquence concrète** : sur un écran étroit, un utilisateur au clavier doit
franchir **jusqu'à 22 contrôles invisibles** avant d'atteindre la page, en
suivant un curseur de focus qu'il ne voit pas. C'est le défaut le plus net de
cette passe.

## Correctif éprouvé dans le navigateur

L'hypothèse a été testée en posant `visibility: hidden` sur le tiroir quand il
est hors écran, puis en relançant un parcours clavier réel :

| Largeur | Avant — 6 premières tabulations | Après | Barre latérale |
|---|---|---|---|
| **390 px** | **6/6 dans le tiroir**, `x = -276` | **6/6 sur la page**, `x = 16` puis 278, 326… | hors écran |
| **768 px** | **6/6 dans le tiroir** | **6/6 sur la page** | hors écran |
| **1024 px** | 6/6 dans la barre, `x = 12` | **inchangé** — correctif non applicable | **visible, intacte** |
| **1440 px** | 6/6 dans la barre, `x = 12` | **inchangé** | **visible, intacte** |

Le point important est la **non-régression au point de rupture** : à partir de
`lg`, la barre est `lg:static lg:translate-x-0` et doit rester pleinement
navigable même si `ouvert` vaut `false` — ce qui est son état par défaut. Un
`inert={!ouvert}` naïf **casserait la barre latérale du poste de travail**. La
piste retenue est conditionnée par le point de rupture, pas par l'état `ouvert`.

---

# 10. Accessibilité

| Contrôle | 390 px | 1440 px | Verdict |
|---|---|---|---|
| Boutons visibles | 8 | 9 | — |
| **Boutons sans nom accessible** | **0** | **0** | **OK** |
| Liens visibles | 31 | 32 | — |
| **Liens sans nom accessible** | **0** | **0** | **OK** |
| Champs visibles | 0 | 1 | — |
| **Champs sans label** | **0** | **0** | **OK** |
| Structure des titres | `1,2,2,2,2,2,2,2,2` | idem | **OK — aucun saut de niveau** |
| Focus visible | **oui sur 12/12 arrêts** | — | **OK** |
| `aria-live` / `role="status"` | présents sur les états dynamiques prévus | — | **OK** |
| **Tiroir fermé focusable** | **22 éléments** | sans objet | **DÉFAUT — § 9** |

## Contrastes

Ratio WCAG calculé pour chaque élément textuel visible, contre son fond peint
effectif.

| Page | Analysés | Sous le seuil (clair) | Sous le seuil (sombre) |
|---|---|---|---|
| Tableau de bord | 143 | **12** | **12** |
| Utilisateurs | 106 | **13** | **11** |
| Évaluation de critère | 81 | **4** | **2** |

**Un seul jeton est en cause**, et il est le même partout :

| Jeton | Clair | Sombre | Seuil AA (texte < 18,66 px) |
|---|---|---|---|
| **`text-ink-400`** | `rgb(130,144,169)` sur blanc → **3,23 : 1** | `rgb(100,110,133)` sur `rgb(23,28,38)` → **3,34 : 1** | **4,5 : 1** |

Il sert aux métadonnées secondaires : en-têtes de section de la barre latérale
(« Navigation », « Suivi », « Paramètres »), horodatages du journal, jetons de
permission. Il passe le seuil des grands textes (3 : 1) mais pas celui du texte
courant.

**Ce n'est pas une correction minimale.** Modifier `--ink-400` se répercuterait
sur tout le produit, dans les deux thèmes, et relève d'une décision sur les
jetons de couleur — pas de cette passe. → **P4.5.4-6, hors périmètre.**

---

# 11. Composants et duplications — **0 extraction justifiée**

**779 chaînes de `className` littérales distinctes** d'au moins 25 caractères
dans le périmètre applicatif. Les plus répétées :

| Occurrences | Fichiers | Chaîne | Nature |
|---|---|---|---|
| 22 | 10 | `text-base font-semibold text-ink-900` | rôle typographique, déjà régi par P4.3 |
| 19 | 14 | `mt-1 text-xs text-ink-500` | légende |
| 14 | 12 | `transition-colors hover:bg-ink-100/60` | état de survol |
| 13 | 4 | `mx-auto max-w-[75rem] px-5 py-16 sm:py-20` | **vitrine — hors périmètre** |
| 11 | 9 | `grid gap-3 sm:grid-cols-2` | mise en page |
| 7 | 6 | `rounded-xl border border-ink-100 p-4` | panneau interne |

Aucune ne satisfait les quatre conditions posées par la consigne. Ce sont des
**compositions d'utilitaires appliquées à des éléments différents dans des
contextes différents** — un `<p>` de légende ici, un `<span>` là — et non des
composants identiques en rôle, comportement et structure.

Les extraire produirait exactement la seconde bibliothèque de composants que ce
projet s'interdit depuis le début. `rounded-xl border border-ink-100 p-4` est le
seul candidat plausible, mais P4.4 a déjà tranché de ne pas absorber les
variantes de carte, et ce panneau est plus léger que `.card` (`rounded-xl` contre
`rounded-2xl`).

**Aucune extraction proposée.**

---

# 12. Les 11 cas P4.5.3, revérifiés

Vérification de non-régression uniquement. **Aucune migration relancée.**

| Cas | Décision P4.5.3 | Fichier modifié depuis ? | Responsive | Mode sombre | Comportement |
|---|---|---|---|---|---|
| B1 `PlanAmeliorationDetail:263` | à arbitrer | **non** | OK | réactif (`ink-*`) | inchangé |
| B2 `CarteActionPlan:94` | conservé | **non** | OK | réactif | `title` intact |
| B3 `CartePlan:75` | conservé | **non** | OK | réactif | `truncate` + `title` intacts |
| B4 `MesActions:168` | conservé | **non** | OK | réactif | inchangé |
| B5 `CarteCritere:50` | à arbitrer | **non** | OK | `dark:` déclaré | inchangé |
| **B6 `VoletAnalysesIa:91`** | **migré** | oui — la migration elle-même | **OK, 5 largeurs** | `dark:` par `TONS.vert` | inchangé |
| B7 `EnTeteDomaine:32` | conservé | **non** | OK | `dark:` déclaré | inchangé |
| A1 `CarteAnalyseIa:37` | conservé | **non** | non observable | `dark:` déclaré | inchangé |
| A2 `CarteAnalyseIa:152` | conservé | **non** | non observable | `dark:` déclaré | inchangé |
| A3 `PanneauAlertes:28` | conservé | **non** | non observable | `dark:` déclaré | inchangé |
| A4 `CritereEvaluation:1002` | conservé | **non** | OK | **écart confirmé — § 8** | inchangé |

Les décisions du rapport P4.5.3 sont respectées. Le seul élément dont le fichier
a changé est celui que P4.5.3 a migré, et il rend à l'identique à 390, 768, 1024,
1280 et 1440 px.

---

# 13. Non-régression des phases P4.1 à P4.5.3

Mesures sur 4 pages, 1440 px.

| Phase | Attendu | Mesuré | Verdict |
|---|---|---|---|
| **P4.1** | tons de statut issus de `lib/tonsStatuts.js` | fichier non modifié, badges toujours colorés par statut | **tenue** |
| **P4.2** | focus clavier global | anneau visible sur **12/12** arrêts | **tenue** |
| **P4.3** | H2 = 16 px / 600 | **16 px / 600** sur toutes les pages mesurées | **tenue** |
| **P4.3** | H1 = 20 px / 600 | **20 px / 600** sur score, organisations, utilisateurs — **24 px / 700 sur le tableau de bord** | **écart, § 14** |
| **P4.4** | `.card` en `rounded-2xl` | **rayon 16 px** sur les 12 cartes rencontrées | **tenue** |
| **P4.5.1** | boutons à 36 px | **primaire 36 px, secondaire 36 px** | **tenue** |
| **P4.5.2** | `<Vide>` à `48px 24px` | inchangé | **tenue** |
| **P4.5.3** | badges à 12 px / 24 px | **12 px / 24 px** sur 55 badges | **tenue** |
| Console | 0 erreur | **0 erreur, 0 avertissement** sur l'ensemble des relevés | **tenue** |

## Correction d'une citation du rapport P4.5.1

Le rapport P4.5.1 citait la classe de base comme
`@apply inline-flex items-center gap-2 rounded-xl px-4 py-2 …`.
Le code dit en réalité :

```css
.btn {
  @apply inline-flex items-center justify-center gap-2 rounded-lg px-3.5 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50;
}
```

`rounded-lg px-3.5`, non `rounded-xl px-4`. **Les mesures et la conclusion de
P4.5.1 ne changent pas** — la hauteur de 36 px vient de `py-2` et de la bordure,
que la citation soit exacte ou non, et le correctif `calc(0.5rem - 1px)` est en
place avec son commentaire. Seule la chaîne recopiée dans le rapport était
fausse. Je le signale pour que le document validé puisse être rectifié.

---

# 14. CORRECTIONS PROPOSÉES

## P4.5.4-1 — Le tiroir de navigation fermé reste navigable au clavier · **OBLIGATOIRE**

| | |
|---|---|
| **Fichier** | `frontend-react/src/components/Layout.jsx` |
| **Ligne** | 476 |
| **Problème** | Sous `lg`, le tiroir fermé est déplacé hors écran mais conserve **22 éléments focusables**. Un utilisateur au clavier traverse jusqu'à 22 contrôles invisibles avant d'atteindre la page. |
| **Preuve** | Parcours `Tab` réel à 390 et 768 px : **12/12** arrêts à `x = -276`, hors écran, avec anneau de focus. `aria-hidden` absent, `inert` absent. |
| **Correction minimale** | `ouvert ? 'translate-x-0' : '-translate-x-full invisible lg:visible'` — deux utilitaires Tailwind existants, aucune logique React nouvelle, aucun composant créé. |
| **Risque** | **Faible sur le fond, réel sur la forme.** `visibility: hidden` s'applique immédiatement : l'animation de fermeture serait coupée net au lieu de glisser. `transition-transform` ne couvre pas la visibilité. Si l'animation doit être préservée, la variante `transition-[transform,visibility]` devra être mesurée avant d'être retenue. |
| **Non-régression critique** | `lg:visible` laisse la barre du poste de travail intacte. Vérifié : à 1024 et 1440 px le correctif est sans effet et la tabulation parcourt normalement la navigation. |
| **Validation prévue** | parcours clavier réel aux 4 largeurs, avant/après ; ouverture et fermeture du tiroir à 390 px ; capture de l'animation ; build, lint, console. |

## P4.5.4-2 — Cinq écrans présentent un échec d'API comme une absence · **OBLIGATOIRE**

| | |
|---|---|
| **Fichiers** | `components/audit/VoletPreuves.jsx:23` · `pages/EntrepriseDetail.jsx:65` et `:215` · `pages/ImportReferentiel.jsx:79` · `pages/FinancementsVerts.jsx:40` |
| **Problème** | Le `.catch` remplace l'erreur par une liste vide ; l'écran affiche alors une affirmation d'absence — « Aucune preuve déposée sur cette mission », « Aucune mission pour l'instant — créez-en une ». |
| **Preuve** | Chaîne complète relevée pour chacun : le `.catch`, l'état mis à `[]`, et le texte exact rendu. § 4. |
| **Correction minimale** | Appliquer le motif **déjà validé en P1** : un état `erreur`, une `<Alerte ton="rouge">` avec le message d'`ApiError`, et la garde `erreur ? null :` devant l'état vide. Aucune primitive nouvelle, aucun appel d'API modifié, aucun contrat changé. |
| **Risque** | **Faible.** Le motif existe déjà dans trois pages du produit et n'a jamais posé de problème. Le seul point d'attention est `EntrepriseDetail`, qui porte deux chargements indépendants : chacun doit garder son propre état d'erreur, sans se masquer l'un l'autre. |
| **Validation prévue** | échec provoqué par `Network.setBlockedURLs` sur chaque endroit, vérification que l'alerte s'affiche **et** que le message d'absence ne s'affiche plus ; puis rétablissement et vérification du cas nominal. |

## P4.5.4-3 — Le titre du tableau de bord échappe à la convention P4.3 · **RECOMMANDÉ**

| | |
|---|---|
| **Fichier** | `frontend-react/src/pages/TableauDeBord.jsx` |
| **Ligne** | 413 |
| **Problème** | `<h1 className="text-2xl font-bold">` rend **24 px / 700**, là où P4.3 fixe H1 à **20 px / 600** et où `PageTitre` et `ProjetDetail:168` rendent bien 20 px / 600. |
| **Preuve** | Mesuré : 24 px / 700 sur le tableau de bord, 20 px / 600 sur les trois autres pages. Ligne **présente à l'identique dans `HEAD`** : ce n'est pas une régression de P4.3, c'est un élément que son balayage n'a pas couvert, celui-ci passant par `PageTitre`. |
| **Correction minimale** | `text-2xl font-bold` → `text-xl font-semibold`. |
| **Risque** | **Faible techniquement, ouvert sur le fond.** Il s'agit d'un accueil personnalisé — « Bonjour, Prénom 👋 ». Une accroche volontairement plus grande est un choix défendable. **C'est pourquoi ce point est recommandé et non obligatoire : la décision vous revient.** |
| **Validation prévue** | mesure avant/après aux 7 largeurs, contrôle qu'aucun retour à la ligne n'apparaît sur un prénom long. |

## P4.5.4-4 — `CritereEvaluation:1002` ne suit pas le mode sombre · **À ARBITRER**

| | |
|---|---|
| **Fichier** | `frontend-react/src/pages/CritereEvaluation.jsx` |
| **Ligne** | 1002 |
| **Problème** | Seul bloc du périmètre combinant un fond pastel `-50` et un texte fixe sans variante `dark:`. Reste `rgb(255,251,235)` quand sa carte passe à `rgb(23,28,38)`. |
| **Preuve** | Mesuré clair et sombre ; son voisin immédiat, lui, suit le thème. § 8. |
| **Correction minimale** | `dark:bg-amber-500/10 dark:text-amber-300`, calqué sur `CarteAnalyseIa:152`. |
| **Risque** | Faible techniquement. **Le point de vigilance est procédural** : P4.5.3 a tranché « conserver » sur cet élément, et y ajouter des classes n'est ni une migration ni une conservation. |
| **Validation prévue** | bascule de thème par le sélecteur réel — et non par `.dark` posé à la main — pour éviter l'artefact décrit en § 1. |

## P4.5.4-5 — Valeurs tronquées sans `title` à 1024 px · **À ARBITRER**

| | |
|---|---|
| **Fichiers** | `components/ui.jsx:82` (détail de `StatCard`) · `pages/Entreprises.jsx:276` (`<dd>` chiffre d'affaires) |
| **Problème** | À 1024 px, « 450 M XOF » perd 21 px sur 76 : la devise disparaît. Les trois détails de `StatCard` perdent jusqu'à 40 px. Aucun ne porte de `title`, la valeur complète n'est donc pas récupérable. |
| **Preuve** | § 6, tableau des mesures. Disparaît au-delà de 1280 px. |
| **Correction minimale** | Ajouter `title={…}` sur les deux éléments. **Ne pas toucher à la structure des grilles**, que la consigne protège explicitement. |
| **Risque** | Faible. Réserve honnête : un `title` ne sert ni au clavier ni au tactile — c'est une atténuation, pas une solution. |
| **Validation prévue** | mesure à 1024 px, vérification que l'infobulle porte la valeur entière. |

## P4.5.4-6 — `text-ink-400` sous le seuil AA · **HORS PÉRIMÈTRE**

| | |
|---|---|
| **Fichier** | `frontend-react/src/index.css`, jeton `--ink-400` |
| **Problème** | **3,23 : 1** en clair, **3,34 : 1** en sombre, pour un seuil AA de 4,5 : 1 sur du texte de moins de 18,66 px. Employé pour les métadonnées secondaires dans toute l'application. |
| **Preuve** | 29 éléments sous le seuil sur 330 analysés, tous ramenés à ce seul jeton. § 10. |
| **Pourquoi hors périmètre** | Modifier un jeton de couleur se répercute sur l'ensemble du produit et sur les deux thèmes. Ce n'est pas une correction minimale, et cela réduirait volontairement la hiérarchie visuelle que ce jeton sert à établir. Relève d'une décision sur les jetons, pas de cette passe. |
| **Correction proposée** | **aucune dans P4.5.4.** |

---

# 15. Récapitulatif

```text
AUDIT P4.5.4 TERMINÉ

Problèmes confirmés :
6

Corrections obligatoires :
2   — P4.5.4-1  tiroir fermé navigable au clavier   (Layout.jsx:476)
    — P4.5.4-2  échec d'API présenté comme absence  (5 emplacements)

Corrections recommandées :
1   — P4.5.4-3  H1 du tableau de bord hors convention P4.3

Hors périmètre :
1   — P4.5.4-6  jeton text-ink-400 sous le seuil AA

À arbitrer :
2   — P4.5.4-4  mode sombre de CritereEvaluation:1002
    — P4.5.4-5  valeurs tronquées sans title à 1024 px

Fichiers qui seraient modifiés si tout était autorisé :
  frontend-react/src/components/Layout.jsx              (P4.5.4-1)
  frontend-react/src/components/audit/VoletPreuves.jsx  (P4.5.4-2)
  frontend-react/src/pages/EntrepriseDetail.jsx         (P4.5.4-2)
  frontend-react/src/pages/ImportReferentiel.jsx        (P4.5.4-2)
  frontend-react/src/pages/FinancementsVerts.jsx        (P4.5.4-2)
  frontend-react/src/pages/TableauDeBord.jsx            (P4.5.4-3, recommandé)
  frontend-react/src/pages/CritereEvaluation.jsx        (P4.5.4-4, à arbitrer)
  frontend-react/src/components/ui.jsx                  (P4.5.4-5, à arbitrer)
  frontend-react/src/pages/Entreprises.jsx              (P4.5.4-5, à arbitrer)

Pour les seules corrections OBLIGATOIRES : 5 fichiers.

Faux positifs écartés par la mesure :
  15 éléments « hors cadre » à 390/768 px  -> tiroir fermé
  logo et compteur « 9+ » « tronqués »      -> overflow: visible
  « Clair / Sombre / Système »              -> libellés sr-only
  cellules étroites de tableaux             -> conteneurs à défilement
  troncature à 1024 px                      -> classe truncate volontaire
  10 couleurs fixes sans dark:              -> teintes 500/600 sur surface réactive

AUCUNE MODIFICATION EFFECTUÉE.
```

---

**Arrêt ici, conformément au § 16 de la consigne. Aucun fichier source n'a été
modifié. Aucun commit, aucun push. J'attends votre autorisation avant
d'implémenter, et je n'appliquerai que ce que vous aurez explicitement autorisé.**

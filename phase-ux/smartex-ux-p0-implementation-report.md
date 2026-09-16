# SMARTEX SUSTWAY — Rapport d'implémentation UX P0

> Périmètre : `frontend-react/src` uniquement. **Aucune modification du backend, de la base,
> des migrations, des API, des permissions, du scoring, de l'IA ou des référentiels.**
> Aucun commit, aucun push.

---

# 1. Résumé

Les quatre corrections P0 sont implémentées, plus la correction du filtre de statut.

| # | Correction | État |
|---|---|---|
| **C-1** | `CritereEvaluation` accessible depuis le parcours d'évaluation | **fait** |
| **C-2** | Entrée « Questionnaire » du collaborateur | **fait** |
| **C-3** | Composant `Breadcrumb` créé et intégré | **fait** |
| **C-4** | Dashboard orienté tâches | **fait — par réordonnancement** |
| **+** | `CLOTURE` → `TERMINE` sur les missions | **fait** |

**10 fichiers touchés** — 9 modifiés, 1 créé. `App.jsx` et `src/auth/` **ne sont pas
modifiés** : les 44 routes et les permissions sont intactes.

## Deux corrections à porter à mon propre audit

L'implémentation a montré que deux constats de `smartex-ux-audit.md` étaient inexacts.
Ils sont rectifiés ici.

### Rectification 1 — `StatutAudit` compte **quatre** valeurs, pas trois

L'audit annonçait `BROUILLON`, `EN_COURS`, `TERMINE`. Le type PostgreSQL `statut_audit` et
l'énumération Java en portent **quatre** :

```
BROUILLON · EN_COURS · TERMINE · ANNULE
```

`ANNULE` m'avait échappé : ma recherche ne capturait que les lignes terminées par une virgule,
et `ANNULE` est la dernière valeur de l'énumération. **Cette erreur a eu une conséquence
concrète** — voir § 6.

### Rectification 2 — `CarteReprise` **est** utilisée

L'audit disait qu'elle ne l'était pas. Vérification faite :
`PanneauAnalyseIa.jsx:44` l'affiche déjà, dans le panneau latéral de la saisie — **sa place
naturelle**. Elle n'a pas été déplacée. Le détail est au § 5.

---

# 2. C-1 — Accessibilité de `CritereEvaluation`

## Rôle fonctionnel des deux expériences

L'inspection du code montre qu'elles **ne font pas la même chose** :

| | Rôle |
|---|---|
| **`SaisieCritereMission`** *(composant)* | **Saisie en série.** Un critère après l'autre, avec `NavigationCritere` (précédent / suivant), `ListeCriteres` (saut direct), `EnTeteDomaine` (progression) et le panneau d'analyse en colonne. C'est le poste de travail. |
| **`CritereEvaluation`** *(page, 997 lignes)* | **Fiche détaillée d'un critère.** Trois sections — *Déclaration de l'organisation*, *Preuves*, *Évaluation IA* — avec le détail par pièce : `elementsObserves`, `elementsManquants`, `elementsNonVerifiables`, constats relevés, historique des évaluations. |

**Les deux sont conservées.** La seconde répond à une question que la première ne traite pas :
*« sur quoi l'IA s'est-elle fondée pour ce critère ? »*

## Point d'accès retenu

Depuis la **saisie du critère courant** — c'est là que la question se pose, au moment où l'on
lit l'analyse.

| | |
|---|---|
| **Fichier** | `src/components/audit/SaisieCritereMission.jsx` |
| **Route** | `/app/:entrepriseId/audits/:auditId/criteres/:auditCritereId` — **inchangée** |
| **Paramètres** | `entrepriseId` et `auditId` déjà reçus en props · `critere.id` déjà présent — même champ qu'utilise `VoletAnalysesIa.jsx:157` |

## Avant / après

| | |
|---|---|
| **Avant** | Un seul lien entrant dans tout le frontend, depuis `VoletAnalysesIa.jsx:157`, c'est-à-dire l'onglet « Analyses IA » — pas l'onglet « Critères ». |
| **Après** | Un lien *« Ouvrir la fiche détaillée de D1-05 »* sous la barre de navigation du critère, dans le parcours de saisie. Le lien passe `state={{ critere }}` : la page s'ouvre sans attendre un rechargement — `CritereEvaluation` lit déjà `state?.critere`. |

Le lien de `VoletAnalysesIa` est conservé. Le bouton « Retour à la mission » de
`CritereEvaluation` existait déjà.

---

# 3. C-2 — Entrée « Questionnaire »

## Ce que la page fait réellement

`Questionnaire.jsx` implémente **RG34** : l'aperçu du périmètre composé dynamiquement pour
l'entreprise — quels critères s'appliquent compte tenu de son secteur, avec la criticité
effective. Son propre commentaire le dit : *« C'est ce périmètre qui sera figé à la création
d'une mission d'audit (RG35). »*

**Vérifié** : la page ne contient aucun lien vers l'évaluation. Ce n'est pas un défaut — ce
n'est simplement pas son objet.

## La route d'évaluation réellement existante

`/app/:entrepriseId/audits/:auditId/criteres/:auditCritereId`, qui exige une **mission**. On
y accède par **Mes missions → mission → onglet Critères**.

## Ce qui a changé

| Fichier | Changement |
|---|---|
| `src/components/Layout.jsx` | L'entrée **« Questionnaire »** quitte le groupe *Ma participation*. Elle reparaît sous **« Périmètre applicable »** dans un nouveau groupe *Référence*, après le travail. |
| `src/pages/Questionnaire.jsx` | Titre *« Questionnaire applicable »* → **« Périmètre applicable »**. Description complétée : *« …on répond aux critères depuis une mission. »* Bandeau ajouté en tête : *« Pour répondre aux critères et déposer vos preuves, ouvrez une mission d'audit »* + bouton **Voir les missions**. |

**La route `/app/:e/questionnaire` est conservée** — elle reste utile, et le groupe *Référence*
la garde accessible.

## Avant / après

| | |
|---|---|
| **Avant** | Le collaborateur clique « Questionnaire » et arrive sur une liste de critères sans aucun moyen d'y répondre. |
| **Après** | Son travail est sous **« Mes missions »**, premier lien utile de sa navigation. S'il ouvre « Périmètre applicable », un bandeau lui dit où aller et l'y emmène. |

## Reprise d'une évaluation commencée

Assurée par l'existant, non modifié : `ListeCriteres` coche les critères renseignés, `EnTeteDomaine`
affiche la progression, `CarteReprise` date le dernier enregistrement dans le panneau latéral.

---

# 4. C-3 — Breadcrumb

## Le composant

`src/components/Breadcrumb.jsx` — **créé**.

| Propriété | Choix |
|---|---|
| Interface | `elements` : `[{ libelle, vers? }]`, du plus général au plus précis |
| Résolution des libellés | **Par la page appelante.** Le composant ne connaît aucune route : une page sait déjà le nom de sa mission, là où une déduction depuis l'URL devrait le redemander à l'API. |
| Navigabilité | Un élément sans `vers` n'est pas cliquable ; **le dernier ne l'est jamais** |
| Page courante | `aria-current="page"` sur le dernier élément |
| Rendu vide | `null` si aucun élément — jamais de coquille vide |
| Débordement | `truncate` par segment, `flex-wrap` sur la liste |

**Ni Header ni Sidebar ne sont dupliqués** : c'est un `<nav aria-label="Fil d'Ariane">` de
soixante lignes, sans état.

## Où il est intégré — deux pages

| Page | Fil | Pourquoi |
|---|---|---|
| **`CritereEvaluation`** | *Missions › [nom de la mission] › D1-05* | **La page la plus enfouie du produit.** Le bouton de retour ne remontait que d'un cran. |
| **`AuditDetail`** | *Missions › [nom de la mission]* | Le hub de mission, pivot du parcours. |

**Il n'a pas été ajouté ailleurs.** Sur une page de premier niveau, il n'apprendrait rien.

Dans `CritereEvaluation`, le nom de la mission n'est connu qu'une fois `audit` chargé : le fil
affiche *« Mission »* en attendant, plutôt que de disparaître puis réapparaître.

**Les boutons « ← Retour » existants sont conservés** : remonter d'un cran sans viser et sauter
à un niveau précis ne sont pas le même geste.

---

# 5. C-4 — Dashboard orienté tâches

## Ce que le dashboard faisait déjà

**Mon audit a été trop sévère.** `TableauDeBord.jsx` porte déjà un `PanneauAlertes` alimenté
par un `useMemo` (ligne 308) qui produit de vraies tâches, avec des liens vers l'écran où agir :

| Alerte | Lien |
|---|---|
| *« N écarts critiques détectés »* — dont X sur telle mission | → non-conformités de cette mission |
| *« N critères encore à évaluer »* — telle mission en concentre X | → cette mission |
| *« N missions en brouillon »* | — |

Il porte aussi **« Missions à traiter »**, classées par risque puis par avancement.

**Le problème n'était pas l'absence de tâches. C'était leur place.**

## Ce qui a changé — un réordonnancement

| Avant | Après |
|---|---|
| 1. Accueil et action principale | 1. Accueil et action principale |
| 2. **Indicateurs** *(5 compteurs)* | 2. **Missions et alertes** ← remonté |
| 3. Consolidation du portefeuille | 3. Indicateurs |
| 4. **Missions et alertes** | 4. Consolidation du portefeuille |
| 5. Graphiques | 5. Graphiques |
| 6. Analyse IA et activité | 6. Analyse IA et activité |
| 7. Actions rapides | 7. Actions rapides |

Les tâches passent **au-dessus de la ligne de flottaison**. Les délais d'animation `Revele`
ont suivi : le bloc remonté perd son `delai={60}`, les indicateurs le prennent.

**Aucun compteur n'est supprimé.** Ils passent en second rang, ce qu'ils sont.

## `CarteReprise`

**Elle est déjà utilisée** — `PanneauAnalyseIa.jsx:44`, dans le panneau latéral de la saisie.
Mon audit affirmait le contraire.

Elle **n'a pas été déplacée vers le dashboard**, et c'est délibéré : son texte est écrit pour
le niveau du critère — *« Dernier enregistrement : aucun pour ce critère »*. L'y transplanter
aurait demandé de réécrire son contenu, donc d'en faire un autre composant.

Le besoin de reprise sur le dashboard est servi par l'alerte existante *« N critères encore à
évaluer — telle mission en concentre X »*, qui porte un lien direct vers la mission concernée.
Elle est maintenant en tête d'écran.

## Données utilisées

**Aucune donnée n'a été inventée, aucun appel API ajouté.** Tout vient de ce que
`TableauDeBord.jsx` chargeait déjà : `score`, `nonConformites`, `score-historique`,
`plans-action`, et `journal` quand le rôle y donne droit.

---

# 6. Correction `CLOTURE` → `TERMINE`

## Statuts réels, vérifiés en base

```
statut_audit           BROUILLON, EN_COURS, TERMINE, ANNULE
statut_plan            BROUILLON, ACTIF, CLOTURE, ARCHIVE
statut_non_conformite  OUVERTE, EN_TRAITEMENT, CLOTUREE
projet.statut          varchar libre — pas un enum
```

## Occurrences corrigées — 6, toutes sur le statut de mission

| Fichier | Avant | Après |
|---|---|---|
| `Layout.jsx:72` | `?statut=CLOTURE` | **`?statut=TERMINE`** |
| `AuditsListe.jsx:16` | `{ valeur: 'CLOTURE' }` · `{ valeur: 'ARCHIVE' }` | **`TERMINE`** · **`ANNULE`** |
| `AuditsListe.jsx` | `filtreStatut === 'CLOTURE'` | **`=== 'TERMINE'`** |
| `TableMissions.jsx` — tons | `CLOTURE` · `ARCHIVE` | **`TERMINE`** · **`ANNULE`** |
| `TableMissions.jsx` — libellés | `CLOTURE: 'Terminée'` · `ARCHIVE: 'Archivée'` | **`TERMINE: 'Terminée'`** · **`ANNULE: 'Annulée'`** |
| `RapportsEntreprise.jsx:10` | `CLOTURE: 'neutre'` *(entrée morte)* | **`ANNULE: 'neutre'`** |

## Deux filtres morts trouvés au passage

C'est ici que la rectification du § 1 a porté. `TableauDeBord.jsx` filtrait sur un statut de
mission qui n'existe pas :

```js
const actives = missionsVue.filter((m) => m.statut !== 'ARCHIVE');   // n'écartait rien
```

`ARCHIVE` n'est pas un statut de mission. Ce filtre ne retirait jamais rien — **et une mission
annulée comptait parmi les missions actives**. Corrigé en `!== 'ANNULE'` aux deux endroits
(lignes 224 et 267).

> **C'est un changement de comportement**, le seul du lot : une mission `ANNULE` sort désormais
> du compteur « Missions actives » et de la liste « Missions à traiter ». C'est la correction
> d'un bug, pas une décision UX.

## Vérification qu'aucun statut de plan, projet ou non-conformité n'a été touché

| Fichier | `CLOTURE` conservé | Entité |
|---|---|---|
| `lib/plansAction.js` | ✔ | `statut_plan` |
| `PlanAmeliorationDetail.jsx` | ✔ | `statut_plan` |
| `PlansAmelioration.jsx` | ✔ | `statut_plan` |
| `components/plans/DialogueCloture.jsx` | ✔ | `statut_plan` |
| `Projets.jsx` · `ProjetDetail.jsx` | ✔ | `projet.statut` |
| `NonConformites.jsx` · `NonConformitesEntreprise.jsx` | ✔ | `CLOTUREE` — **mot différent** |

**Aucun remplacement global.** Chaque occurrence a été classée par entité avant d'être touchée
ou laissée.

---

# 7. Tests

## Exécutés

| Test | Commande | Résultat |
|---|---|---|
| **Build de production** | `npx vite build` | **PASS** — exit 0, à chaque étape |
| **Lint** | `npm run lint` *(oxlint)* | **PASS** — 1 avertissement |

L'unique avertissement porte sur `src/pages/Landing.jsx:19` — import `SMARTEX` inutilisé.
**`Landing.jsx` ne figure pas dans les fichiers modifiés** : l'avertissement est préexistant.

## Non disponibles

**Le projet n'a pas de tests frontend.** `package.json` ne déclare qu'un script `lint`
(`oxlint`) — ni `vitest`, ni `jest`, ni `playwright`. Aucun test unitaire ou d'intégration
n'existe côté React.

**Aucune infrastructure de test n'a été créée** : ce n'était pas dans le périmètre autorisé.

## Vérifications faites par lecture

| Contrôle | Méthode | Résultat |
|---|---|---|
| Routes intactes | `git diff App.jsx` | **vide** — les 44 routes inchangées |
| Permissions intactes | `git diff src/auth/` | **vide** |
| Aucun appel API modifié | `git diff` filtré sur `api.get|post|put|delete` | **aucune ligne** |
| Navigation `SUPER_ADMIN` | lecture de `GROUPES_AUDIT` | seul `?statut=TERMINE` changé |
| Navigation `RESPONSABLE_ENTREPRISE` | lecture de `GROUPES_ENTREPRISE` | **inchangée** |
| Navigation `COLLABORATEUR` | lecture de `GROUPES_COLLABORATEUR` | *Questionnaire* → *Périmètre applicable*, déplacé en *Référence* |
| Liens morts | cibles des liens ajoutés | 3 liens, tous vers des routes déclarées |
| Responsive de base | classes des blocs ajoutés | `flex-wrap`, `truncate`, `shrink-0` sur le fil ; `flex-wrap` sur le bandeau |

## Ce qui n'a pas été vérifié

**L'application n'a pas été ouverte dans un navigateur.** Le build et le lint passent ; le
rendu, le comportement au clic et l'affichage réel n'ont pas été observés. Une vérification
manuelle des quatre parcours reste à faire.

---

# 8. Non-régression

| Périmètre | État | Preuve |
|---|---|---|
| **Backend** | **inchangé** | aucun fichier `api-quarkus/` modifié |
| **Base de données** | **inchangée** | aucune requête d'écriture |
| **Migrations** | **inchangées** | aucun fichier `db/migration/` touché |
| **API** | **inchangée** | aucun appel modifié dans le diff |
| **Permissions** | **inchangées** | `src/auth/` non modifié |
| **Scoring** | **inchangé** | `ScoringEngine` non touché |
| **IA** | **inchangée** | `services-ia-python/` non touché |
| **Référentiels** | **inchangés** | `referentiel-source/`, `phase3d/` non touchés |
| **Statuts backend** | **inchangés** | aucun statut créé ; seules des références frontend corrigées |
| **Pages** | **aucune supprimée** | 44 pages, 44 routes |
| **`NonConformites` / `NonConformitesEntreprise`** | **non fusionnées** | |
| **`Rapports` / `RapportsEntreprise`** | **non fusionnées** | |
| **Header · Logo · Sidebar** | **non dupliqués** | `Breadcrumb` est un `<nav>` sans état |

---

# 9. Fichiers modifiés

## Créé — 1

| Fichier | Lignes | Rôle |
|---|---|---|
| `src/components/Breadcrumb.jsx` | 60 | Fil d'Ariane réutilisable |

## Modifiés — 9

| Fichier | Correction |
|---|---|
| `src/components/audit/SaisieCritereMission.jsx` | **C-1** — lien vers la fiche détaillée |
| `src/components/Layout.jsx` | **C-2** — *Questionnaire* → *Périmètre applicable*, groupe *Référence* · **filtre** `CLOTURE` → `TERMINE` |
| `src/pages/Questionnaire.jsx` | **C-2** — titre, description, bandeau vers les missions |
| `src/pages/CritereEvaluation.jsx` | **C-3** — fil d'Ariane à 3 niveaux |
| `src/pages/AuditDetail.jsx` | **C-3** — fil d'Ariane à 2 niveaux |
| `src/pages/TableauDeBord.jsx` | **C-4** — tâches remontées · **2 filtres morts** `ARCHIVE` → `ANNULE` |
| `src/pages/AuditsListe.jsx` | **filtre** — options et titre |
| `src/components/tableau-bord/TableMissions.jsx` | **filtre** — tons et libellés |
| `src/pages/RapportsEntreprise.jsx` | **filtre** — entrée morte |

**Non modifiés, et c'est volontaire** : `App.jsx`, `src/auth/`, `Header`, tout le backend.

---

# 10. Git

| | |
|---|---|
| Branche | `main` |
| Commit courant | `d1b8bb6` — *Fusionne phase3c-catalogue-reel dans main* |
| **Nouveau commit** | **aucun** |
| **Push** | **aucun** |

```
 M frontend-react/src/components/Layout.jsx
 M frontend-react/src/components/audit/SaisieCritereMission.jsx
 M frontend-react/src/components/tableau-bord/TableMissions.jsx
 M frontend-react/src/pages/AuditDetail.jsx
 M frontend-react/src/pages/AuditsListe.jsx
 M frontend-react/src/pages/CritereEvaluation.jsx
 M frontend-react/src/pages/Questionnaire.jsx
 M frontend-react/src/pages/RapportsEntreprise.jsx
 M frontend-react/src/pages/TableauDeBord.jsx
?? frontend-react/src/components/Breadcrumb.jsx
```

Le working tree porte par ailleurs les travaux de la phase 3D (`api-quarkus/`, `phase3d/`),
antérieurs et non touchés ici.

---

# Verdict

```text
READY_FOR_UX_P1
```

Les quatre corrections P0 sont implémentées, le build et le lint passent, et aucune route, API
ou permission n'a bougé.

**Deux réserves, énoncées sans détour :**

1. **Rien n'a été vérifié dans un navigateur.** Le projet n'a aucun test frontend — ni
   `vitest`, ni `jest`, ni test d'interface. Build et lint garantissent que le code compile et
   respecte les règles ; ils ne disent rien du rendu ni du comportement au clic. **Une passe
   manuelle sur les quatre parcours reste nécessaire** avant de considérer P0 comme acquis.

2. **Un changement de comportement est intervenu** : une mission `ANNULE` sort du compteur
   « Missions actives » et de la liste « Missions à traiter ». C'est la correction d'un filtre
   qui n'écartait rien, rendue possible par la découverte du quatrième statut. Signalée
   explicitement parce qu'elle modifie des chiffres affichés.

**Deux constats de mon audit sont rectifiés ici** : `StatutAudit` compte quatre valeurs et non
trois, et `CarteReprise` était déjà utilisée. Les deux documents d'audit n'ont pas été réécrits
— ce rapport fait foi sur ces deux points.

# SMARTEX SUSTWAY — Audit UX P2 (post-P0 / post-P1)

**Date** : 2026-09-16
**Nature** : strictement READ-ONLY — aucun fichier frontend, backend, route ou
migration n'a été modifié. Seuls les deux rapports de la phase ont été créés.
**Verdict** : `READY_FOR_UX_P2_IMPLEMENTATION`

---

# A. Résumé

Les cinq sujets classés P2 par l'audit P1 sont **F-05, F-06, F-07, F-08 et
F-10** (`smartex-ux-p1-audit.md` § 4 et § 5). Le plan P1
(`smartex-ux-p1-plan.md`) ne les mentionne nulle part : il ne couvrait que les
quatre P1. Aucun des cinq n'a donc été touché par l'implémentation P1.

La vérification dans le code en déplace trois :

- **F-10 est un constat erroné.** `TableauDeBord.jsx:113` boucle sur
  **toutes** les organisations accessibles, pas sur l'organisation
  sélectionnée. Le tableau de bord *est déjà* la vue transverse du
  SUPER_ADMIN, avec une colonne « organisation » et un compteur
  « N organisations suivies ». Même famille d'erreur que F-13 en P1.
- **F-08 se scinde en deux.** `AuditScoreDto` expose déjà
  `nombreCriteresEnRevue`, et **le frontend ne s'en sert nulle part** —
  un compteur de revues en attente est gratuit. En revanche, aucun endpoint
  ne liste les évaluations `EN_REVUE` d'une organisation : la file
  elle-même est une dépendance backend.
- **F-06 descend en P3.** Rien n'a changé depuis l'audit P1, qui le donnait
  déjà « largement couvert » ; sa complexité moyenne ne se justifie pas.

Les deux réserves laissées par P1 sont **toutes deux fondées et toutes deux
résolubles sans appel API supplémentaire** — ce que l'audit P1 n'avait pas vu :

- **Réserve A** : `Layout.jsx:363` charge déjà toutes les missions de
  l'organisation courante et les partage avec l'en-tête et la cloche. Les
  exposer à l'`<Outlet />` résout le fil d'Ariane générique à coût nul.
- **Réserve B** : le défaut réel n'est pas le « — » du tableau, qui est
  correct, mais le **graphique et les compteurs**, qui comptabilisent une
  mission dont le score n'a pas pu être chargé comme une mission à zéro.

**Bilan** : 5 P2 confirmés (3 d'origine + 2 issus des réserves), 1 P3, 1 déjà
corrigé, 1 dépendance backend. Aucun ne demande de nouvelle route, de nouveau
endpoint ni de nouvelle donnée.

---

# B. Les 5 P2 d'origine

## F-05 — Aucun rappel de l'organisation sur les pages de mission

```
ID                 : F-05
Problème           : Aucune page de mission ne nomme l'organisation. Le
                     contexte ne vient que du sélecteur de la sidebar.
État après P0/P1   : TOUJOURS VRAI, et désormais mesurable. P0 et P1 ont posé
                     7 fils d'Ariane ; les 7 commencent par « Missions » ou
                     « Plans d'amélioration ». Aucun ne nomme l'organisation.
                       AuditDetail:239        « Missions »
                       AuditScore:94          « Missions »
                       CritereEvaluation:125  « Missions »
                       IndicePreparation:74   « Missions »
                       NonConformites:57      « Missions »
                       Rapports:133           « Missions »
                       PlanAmeliorationDetail:158 « Plans d'amélioration »
Parcours concerné  : 1 (responsable) et 3 (super admin)
Rôle concerné      : SUPER_ADMIN avant tout — seul rôle qui change
                     d'organisation. Nul en mono-organisation.
Impact             : Sur un compte multi-organisations, rien dans la page ne
                     confirme laquelle est active. Le risque n'est pas de se
                     perdre, mais d'agir sur la mauvaise organisation.
Dépendances        : Aucune. `entreprises` vient de `useApiAuth()`, déjà en
                     mémoire. 5 des 7 pages font déjà `entreprises.find(...)`.
                     Les 2 autres (CritereEvaluation, IndicePreparation)
                     n'ont qu'à lire une valeur déjà fournie par le contexte.
Priorité retenue   : P2
Justification      : Confirmé. Coût très faible, aucun appel API, un seul
                     composant réutilisé. Pas P1 : rien n'est bloqué, et le
                     sélecteur de la sidebar affiche l'organisation en
                     permanence — c'est un rappel, pas une révélation.
```

## F-06 — Le parcours de mission n'est pas nommé bout en bout

```
ID                 : F-06
Problème           : Aucune vue des 7 étapes métier ; la mission ne dit pas
                     dans quelle phase elle se trouve.
État après P0/P1   : INCHANGÉ — et le constat d'origine reste surestimé.
                     Vérifié dans le code :
                       AuditDetail:29-40  — 7 onglets nommés, mais ce sont des
                                            zones de contenu, pas des étapes
                       SyntheseMission    — jauge d'avancement, « X / Y »,
                                            conformité, niveau de risque
                       ClotureMission     — conditions de clôture et
                                            renseignés / total
Parcours concerné  : 1
Rôle concerné      : RESPONSABLE_ENTREPRISE
Impact             : Faible. « Ce qui est fait / ce qui reste » a déjà trois
                     réponses à l'écran. Ce qui manque est le *nom* de la
                     phase, pas l'information.
Dépendances        : Aucune, mais la phase devrait être dérivée côté client de
                     plusieurs signaux (statut de mission, critères déclarés,
                     évaluations en revue, plans ouverts). Une dérivation
                     inexacte serait pire que l'absence.
Complexité         : Moyenne — composant nouveau, 7 états dérivés, et surtout
                     un arbitrage métier sur la définition des phases.
Priorité retenue   : P3  (était P2)
Justification      : Déclassement assumé. Trois éléments répondent déjà à la
                     question ; le gain est un confort de lecture pour une
                     complexité moyenne et un arbitrage métier non tranché.
                     Le brief P2 demande « utile, structurant, non
                     indispensable » — ce sujet est structurant mais son
                     utilité marginale est faible tant que les phases ne sont
                     pas définies côté métier.
```

## F-07 — Les trois pages de plans, côte à côte dans le menu

```
ID                 : F-07
Problème           : Des entrées voisines dans le menu sans que rien n'explique
                     leur différence.
État après P0/P1   : TOUJOURS VRAI, mais le constat d'origine était imprécis.
                     Vérification des trois navigations :
                       GROUPES_AUDIT « Suivi » (Layout:116-118)
                         Non-conformités · Actions correctives · Plans d'amélioration
                       GROUPES_ENTREPRISE « Audit » (Layout:166-171)
                         Non-conformités · Actions correctives · Plans d'amélioration
                       GROUPES_COLLABORATEUR (Layout:225-229)
                         Plans d'amélioration · Mes actions
                     Aucun rôle ne voit les trois entrées citées par l'audit
                     P1 ; le responsable en voit trois *autres*, et le
                     collaborateur deux.
                     Les pages, elles, se présentent bien (constat P1 exact) :
                       PlanActions:161      « actions issues des non-conformités »
                       PlansAmelioration:115 « Distincts des actions correctives »
                       MesActions:95        « dont vous êtes responsable »
Parcours concerné  : 1
Rôle concerné      : RESPONSABLE_ENTREPRISE, SUPER_ADMIN, COLLABORATEUR
Impact             : Faible — un clic lève le doute. Mais ce clic se répète
                     tant que la distinction n'est pas apprise, et
                     « Non-conformités » / « Actions correctives » désignent
                     les deux faces d'un même objet.
Dépendances        : Aucune. `Layout.jsx` seul, dans les tableaux de
                     déclaration. Le rendu (`Layout:549`) affiche
                     `{lien.libelle}` dans un `<span class="truncate">` :
                     un libellé plus long y serait tronqué.
Complexité         : Très faible.
Risque             : Faible, mais réel — `Layout.jsx` porte les 3 arbres de
                     navigation et le filtre de permissions.
Priorité retenue   : P2
Justification      : Confirmé, avec une précision du constat. Le correctif
                     tient en quelques libellés, sans structure nouvelle.
```

## F-08 — La file des décisions humaines en attente

```
ID                 : F-08
Problème           : Aucun écran ne répond à « qu'est-ce qui attend mon
                     intervention ? ».
État après P0/P1   : INCHANGÉ, mais la vérification API demandée par l'audit
                     P1 (« vérifier d'abord l'existence d'un endpoint ») a été
                     faite. Elle scinde le sujet en deux.

  ── F-08a — Le compteur d'évaluations en revue ─────────────────────────
  AuditScoreDto expose déjà `nombreCriteresEnRevue`, documenté dans
  AuditResource:405 : « un critère dont l'évaluation attend une revue experte
  (EN_REVUE) ne participe pas encore au score — il est compté séparément ».
  Recherche dans tout `frontend-react/src` : **`nombreCriteresEnRevue`
  n'apparaît nulle part.** La donnée est servie, déjà chargée par PipelineIA,
  AuditScore et TableauDeBord, et jetée.
  Dépendances : aucune. Aucun appel nouveau.
  Priorité : P2

  ── F-08b — La file elle-même ──────────────────────────────────────────
  Les évaluations ne se listent que critère par critère :
  EvaluationResource:47 → /audits/{auditId}/criteres/{auditCritereId}/evaluations
  Et `AuditCritereDto.statut` vaut A_EVALUER / DECLARE / EVALUE
  (statutsCritere.js) — il ne distingue pas EN_REVUE de VALIDEE.
  Construire la file côté client coûterait : 1 appel par mission pour les
  critères, puis 1 appel par critère pour les évaluations. Sur 92 critères et
  plusieurs missions, c'est plusieurs centaines de requêtes par affichage.
  Priorité : DÉPENDANCE BACKEND — il manque un endpoint listant les
  évaluations EN_REVUE d'une mission ou d'une organisation.

Parcours concerné  : 1 — étapes Analyse et Revue
Rôle concerné      : RESPONSABLE_ENTREPRISE, SUPER_ADMIN
Impact             : Moyen. Sans le compteur, une évaluation peut rester en
                     revue sans que personne le sache : elle ne compte pas
                     dans le score et n'apparaît pas comme « non évaluée ».
Risque             : Clôturer une mission en croyant tout validé.
```

## F-10 — Pas de tableau de bord propre au SUPER_ADMIN

```
ID                 : F-10
Problème allégué   : « Le SUPER_ADMIN voit le même tableau de bord que le
                     responsable, dépendant de l'organisation sélectionnée. »
État après P0/P1   : DÉJÀ CORRIGÉ — le constat était faux, et il l'était déjà
                     au moment de l'audit P1. P0 a touché TableauDeBord
                     (ordre des blocs, correction ANNULE) sans rien changer à
                     son périmètre, qui était déjà transverse.

                     Preuves dans le code :
                       TableauDeBord:113  entreprises.map(async (entreprise) =>
                                          — boucle sur TOUTES les organisations
                                            accessibles, pas sur la courante
                       TableauDeBord:197  organisation: entreprise.raisonSociale
                       TableMissions:91   colonne « organisation » affichée
                       TableauDeBord:471  « N organisation(s) suivie(s) »
                       TableauDeBord:320  l'alerte critique nomme l'organisation
                       TableauDeBord:395  l'export CSV porte l'organisation
                       TableauDeBord:92   commentaire : « Cette page est
                                          multi-organisations »

                     Le tableau de bord consolide déjà note et coefficient de
                     toutes les missions de toutes les organisations
                     (`consolide`, TableauDeBord:246).
Priorité retenue   : DÉJÀ CORRIGÉ
Justification      : Rien à faire. La vue transverse demandée existe. Le
                     complément éventuel — comparer les organisations entre
                     elles — est couvert par `ComparaisonEntreprises` et
                     `Classement`, comme l'audit P1 le notait lui-même.
Rectification      : portée au présent document, comme l'avait été F-13.
```

---

# C. Réserve A — Fil d'Ariane générique

## Ce qui a été vérifié

**1. Le nom de la mission est-il présent dans les données déjà chargées ?**

Non, dans aucune des deux pages.

| Page | Ce qu'elle charge | Le nom de mission y est-il ? |
|---|---|---|
| `NonConformites` | `/audits/{id}/non-conformites` | **Non** — `NonConformeDto` porte `critereCode`, `critereLibelle`, `titre`, `niveau`, `statut`… aucun champ de mission |
| `PlanAmeliorationDetail` | le plan et ses actions | **Non** — `PlanActionDto` porte `auditId`, jamais le nom |

Les deux commentaires posés en P1 dans le code sont donc exacts.

**2. Un appel API supplémentaire serait-il nécessaire ?**

`GET /api/v1/entreprises/{id}/audits/{auditId}` le donnerait, mais c'est
précisément l'appel qui a été interdit — et à juste titre pour un seul libellé.

**3. Une solution sans appel supplémentaire existe-t-elle ?**

**Oui, et elle est déjà en place à moitié.** `Layout.jsx:363-366` :

```js
// Chargées une fois par organisation : la recherche de l'en-tête porte sur
// ces missions, et la cloche compte leurs écarts encore ouverts. Sans cette
// collecte partagée, chacun des deux ferait les mêmes appels de son côté.
api.get(`/api/v1/entreprises/${entrepriseCouranteId}/audits`)
   .then(async (audits) => { setMissionsCourantes(audits ?? []); … })
```

`missionsCourantes` contient **toutes les missions de l'organisation courante,
avec leur `id` et leur `nom`**. Elle est déjà partagée avec `EnTeteApp`
(`Layout:652`). Toute page sous `/app` est rendue dans ce Layout, par
`<Outlet />` (`Layout:660`), aujourd'hui **sans contexte**.

Passer `context={{ missions: missionsCourantes }}` à l'`<Outlet />` et lire
`useOutletContext()` dans les deux pages résout le sujet **sans un seul appel
supplémentaire** — c'est exactement l'argument que le commentaire du Layout
avance déjà pour l'en-tête et la cloche.

Deux limites, à assumer plutôt qu'à masquer :

- **Fenêtre de chargement.** Au premier rendu, `missionsCourantes` est vide.
  Le repli « Mission » reste donc nécessaire — il ne disparaît pas, il devient
  transitoire.
- **Changement d'organisation.** L'effet est indexé sur
  `entrepriseCouranteId`, synchronisé depuis l'URL (`Layout:330`). Une
  résolution par `id` exact, jamais par position, évite de nommer une mission
  avec le nom d'une autre.

Une variante par `state` du routeur (`<Link state={{ nomMission }}>`) a été
écartée : elle ne fonctionne qu'à l'arrivée par un lien, et laisse le libellé
générique sur un rechargement, un favori ou un lien collé — donc un fil
d'Ariane qui change de contenu selon le chemin d'arrivée.

**4. Le gain UX justifie-t-il la modification ?**

Oui, mais modestement. Le chemin de retour est déjà juste : seul le nom manque.
Le gain réel vient de ce que le même mécanisme sert **aussi** F-05 et peut
servir F-08a. Pris isolément, ce sujet aurait relevé du P3.

**Décision** : `P2`, sous l'identifiant **F-16**, à traiter avec F-05 puisque
les deux touchent les mêmes fils d'Ariane.

---

# D. Réserve B — PipelineIA

## Ce que l'interface distingue aujourd'hui

État du code après P1 (`PipelineIA.jsx`) :

| Situation | Ce que l'écran montre | Distinguable ? |
|---|---|---|
| **Erreur globale** (la liste des missions échoue) | `Alerte` rouge, et l'état vide n'est plus rendu | **Oui** — acquis de P1 |
| **Score non chargé** pour une mission (`.catch(() => null)` ligne 35) | table : `—` dans les deux colonnes | **En partie** — le signe est juste, mais rien n'en dit la cause |
| **Critère non évalué** | `score.nombreCriteresNonEvalues`, chiffre réel | Oui |
| **Score réellement nul** | **non affiché** — cette page ne montre que des compteurs, jamais `scoreGlobal` | Sans objet ici |
| **Documents non chargés** (`.catch(() => [])` ligne 31) | StatCard « Documents déposés » à 0 | **Non** — 0 document et échec sont identiques |

## Le vrai défaut n'est pas celui qu'on croyait

Le `—` du tableau est **correct** : il ne se produit que lorsque `score` vaut
`null`, c'est-à-dire lorsque le score n'a pas pu être chargé. Le problème est
ailleurs — dans les deux endroits qui, eux, remplacent l'absence par un zéro :

**1. Les compteurs consolidés** (`PipelineIA.jsx:56-63`)

```js
const totaux = (lignes ?? []).reduce(
  (acc, { score }) => ({
    total: acc.total + (score?.nombreCriteresTotal ?? 0),
    evalues: acc.evalues + (score?.nombreCriteresEvalues ?? 0),
    …
```

Une mission dont le score a échoué contribue `0 + 0`. La vignette
« Critères évalués — X / Y » affiche alors un total **silencieusement
sous-estimé**, sans que rien n'indique qu'il est partiel.

**2. Le graphique** (`PipelineIA.jsx:98-99`)

```js
data={lignes.map(({ score }) => score?.nombreCriteresEvalues ?? 0)}
```

La mission apparaît comme une **barre à zéro**, strictement identique à une
mission réelle sans aucun critère évalué. C'est le point le plus trompeur de
la page : le graphique est ce qu'on lit en premier.

## Amélioration nécessaire et réalisable sans backend ?

Oui aux deux. `score === null` est déjà l'information suffisante ; rien ne
manque côté API. Il suffit de **compter les missions dont le score n'a pas pu
être chargé** et de le dire, plutôt que de les additionner à zéro. Aucune
modification de la logique de chargement, aucun `.catch` touché, aucun appel
nouveau — conformément au § 5 du brief.

Le cas des documents (`.catch(() => [])`, ligne 31) est le même repli voulu et
reste hors périmètre : le signaler demanderait de le modifier.

**Décision** : `P2`, sous l'identifiant **F-17**.

---

# E. Matrice finale

| ID | Problème | État | Rôle | Parcours | Impact | Dépendance | Priorité |
|---|---|---|---|---|---|---|---|
| **F-05** | L'organisation n'est nommée dans aucun fil d'Ariane | Toujours vrai | SUPER_ADMIN (multi-org.) | 1, 3 | Moyen | Aucune | **P2** |
| **F-16** | Fil d'Ariane générique « Mission » sur 2 pages | Réserve A — fondée | RESP, COLLAB | 1 | Faible | Aucune (`Layout` porte déjà la donnée) | **P2** |
| **F-17** | `PipelineIA` compte un score non chargé comme un zéro | Réserve B — fondée, défaut déplacé | RESP, ADMIN | 1 | Moyen | Aucune | **P2** |
| **F-08a** | `nombreCriteresEnRevue` servi par l'API, jamais affiché | Inchangé | RESP, ADMIN | 1 | Moyen | Aucune | **P2** |
| **F-07** | Libellés du menu des écarts et des plans | Toujours vrai, constat précisé | RESP, ADMIN, COLLAB | 1 | Faible | Aucune | **P2** |
| F-06 | Parcours de mission non nommé bout en bout | Inchangé, déjà largement couvert | RESP | 1 | Faible | Arbitrage métier | **P3** |
| F-08b | File des évaluations `EN_REVUE` | Inchangé | RESP, ADMIN | 1 | Moyen | Endpoint manquant | **DÉPENDANCE BACKEND** |
| F-10 | Tableau de bord SUPER_ADMIN | Constat erroné | ADMIN | 3 | — | — | **DÉJÀ CORRIGÉ** |

---

# F. Conclusion

```
P2 confirmés          : 5   (F-05, F-07, F-08a, F-16, F-17)
P3                    : 1   (F-06)
Déjà corrigés         : 1   (F-10)
Dépendances backend   : 1   (F-08b)
```

Des **5 P2 d'origine**, 3 sont confirmés (F-05, F-07, F-08a), 1 descend en P3
(F-06), 1 est un constat erroné (F-10) et 1 volet part en dépendance backend
(F-08b). Les **2 réserves P1** deviennent deux P2 à part entière (F-16, F-17),
ce qui ramène le total retenu à 5.

Les cinq P2 retenus partagent trois propriétés :

- **aucun appel API nouveau** — toutes les données nécessaires sont déjà
  chargées, parfois déjà chargées *et jetées* (F-08a, F-17) ;
- **aucune route nouvelle** — les 7 pages concernées existent et sont routées ;
- **aucun composant nouveau** — `Breadcrumb`, `Alerte`, `StatCard` et
  `Badge` suffisent.

Deux d'entre eux — F-05 et F-16 — touchent les mêmes fichiers et doivent être
traités ensemble.

**Ce qui n'est pas dans ce périmètre** : le backend, la base, les migrations,
les référentiels, le scoring, l'IA, l'authentification, les permissions et les
routes. Aucun P2 retenu n'en a besoin.

---

```text
P0 : VALIDÉ
P1 : VALIDÉ

P2 initial : 5
P2 confirmé : 5
P3 : 1
Déjà corrigé : 1
Dépendance backend : 1

Verdict :
READY_FOR_UX_P2_IMPLEMENTATION
```

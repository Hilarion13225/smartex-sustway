# SMARTEX SUSTWAY — Audit UX

> **Phase 1, lecture seule.** Aucun fichier du frontend, du backend, de la base ou des
> migrations n'a été modifié. Aucun commit.
>
> Périmètre : `frontend-react/src` — **125 fichiers JSX**, 44 pages, 77 composants,
> 44 routes déclarées.

---

# A. État actuel

## A.1 Chiffres

| | |
|---|---|
| Fichiers JSX analysés | **125** |
| Pages | **44** — dont 12 vitrine, 32 application |
| Composants | **77** — dont **28 dédiés à l'audit** |
| Routes déclarées | **44** |
| Routes publiques | **14** — dont **5 redirections** |
| Routes protégées | **30** |
| Navigations distinctes | **3** — une par rôle |

## A.2 Routes

**Vitrine (14)** — `/`, `/services`, `/formules`, `/methodologie`, `/formation`,
`/contact`, `/faq`, `/mentions-legales`, plus **5 redirections** (`/accueil`, `/a-propos`,
`/avantages`, `/engagement`, `/deploiement`).

**Authentification (5)** — `/connexion`, `/inscription`, `/invitation/:token`,
`/mot-de-passe-oublie`, `/reinitialiser-mot-de-passe`. Hors du `Layout` applicatif.

**Application (30)**, toutes sous `/app`, protégées par `RouteProtegee` :

| Portée | Routes |
|---|---|
| Globale | `/app` · `entreprises` · `profil` · `comparaison` · `classement` · `projets` · `projets/:id` · `referentiels` · `referentiels/import` · `referentiels/import/:id` · `referentiels/:code` |
| Entreprise | `:entrepriseId` · `/documents` · `/questionnaire` · `/abonnement` · `/utilisateurs` · `/journal` · `/plan-actions` · `/plans` · `/mes-actions` · `/non-conformites` · `/rapports` · `/financements-verts` · `/pipeline-ia` · `/audits` |
| Mission | `/audits/:auditId` · `/score` · `/non-conformites` · `/rapports` · `/indice-preparation` · `/criteres/:auditCritereId` · `/plans/:planId` |

## A.3 Navigation — trois arborescences, déjà séparées par rôle

`Layout.jsx` (655 lignes) porte **toute** la navigation. Il n'y a **pas** de composant
`Sidebar.jsx` séparé.

| Rôle | Constante | Groupes |
|---|---|---|
| `SUPER_ADMIN` | `GROUPES_AUDIT` | Navigation · Suivi · Paramètres |
| `RESPONSABLE_ENTREPRISE` | `GROUPES_ENTREPRISE` | Pilotage · Audit · Administration |
| `COLLABORATEUR` | `GROUPES_COLLABORATEUR` | Ma participation · Compte |

**C'est un acquis réel, et il ne doit pas être défait.** La navigation du collaborateur est
volontairement courte, et le code documente pourquoi : *« sans elle, le collaborateur héritait
de la navigation complète du responsable d'entreprise et voyait la comparaison d'entreprises,
le pipeline IA, les non-conformités et les plans d'actions, qui ne relèvent pas de ses
tâches »*.

Le masquage n'est pas présenté comme une sécurité — le code le dit explicitement : *« Masquer
un lien n'est pas une mesure de sécurité — les mêmes restrictions sont contrôlées par
l'API »*.

## A.4 Statuts réellement disponibles

> Le brief proposait un cycle à dix statuts (`BROUILLON → EN_PRÉPARATION → … → ARCHIVEE`).
> **Ce n'est pas ce que le système porte.** Voici les statuts réels.

| Enum | Valeurs | Nombre |
|---|---|---|
| **`StatutAudit`** (mission) | `BROUILLON` · `EN_COURS` · `TERMINE` | **3** |
| **`StatutEvaluation`** | `PROVISOIRE` · `EN_REVUE` · `VALIDEE` | 3 |
| **`STATUTS_CRITERE`** (front) | `A_EVALUER` · `DECLARE` · `EVALUE` | 3 |
| Exclusions de périmètre | `actif = false` → *Retiré du périmètre* · `applicable = false` → *Non applicable* | 2 |

Le cycle de vie réel d'une mission est donc **à trois états**, pas à dix. Toute UX qui
suggérerait davantage d'étapes mentirait sur ce que le système sait faire.

## A.5 Fonctionnalités réellement disponibles

Vérifiées dans le code, pas déduites des noms de fichiers :

| Fonction | Où | État |
|---|---|---|
| Gestion des entreprises | `Entreprises`, `EntrepriseDetail` | disponible |
| Missions d'audit | `AuditsListe`, `AuditDetail` | disponible |
| Projets multi-organisations | `Projets`, `ProjetDetail` | disponible |
| Évaluation d'un critère | `SaisieCritereMission` **et** `CritereEvaluation` | **deux implémentations** — § B |
| Dépôt de preuves | `DepotPreuves`, `VoletPreuves`, `Documents` | disponible |
| Analyse IA | `PanneauAnalyseIa`, `VoletAnalysesIa`, `PipelineIA`, `TracabiliteIa` | disponible |
| Non-conformités | `NonConformites` (mission) · `NonConformitesEntreprise` (transverse) | disponible |
| Axes d'amélioration | `AxesAmelioration` | disponible |
| Plans d'actions | `PlanActions` (correctives) · `PlansAmelioration` · `MesActions` | disponible |
| Rapports | `Rapports` (mission) · `RapportsEntreprise` (transverse) | disponible |
| Scores | `AuditScore`, `JaugeCirculaire`, `SyntheseMission` | disponible |
| Financements verts | `FinancementsVerts`, `IndicePreparation` | disponible |
| Référentiels | `ReferentielsListe`, `ReferentielDetail`, `ImportReferentiel` | disponible |
| Journal d'audit | `Journal` | disponible |
| Abonnement | `Abonnement` | disponible |
| Classement, comparaison | `Classement`, `ComparaisonEntreprises` | disponible |

**La couverture fonctionnelle est bonne.** Le problème n'est pas ce qui manque — c'est
l'accès.

---

# B. Problèmes UX

## CRITIQUE

### C-1 — Deux expériences d'évaluation concurrentes, dont la meilleure est presque inatteignable

Il existe **deux façons d'évaluer un critère** :

| | Où | Accès |
|---|---|---|
| `SaisieCritereMission` *(composant)* | onglet « Critères » de `AuditDetail` | **le chemin naturel** |
| **`CritereEvaluation`** *(page, 997 lignes)* | `/app/:e/audits/:a/criteres/:c` | **un seul lien dans toute l'application** |

`CritereEvaluation` est **le plus gros fichier du frontend**. Recherche exhaustive des liens
de navigation vers cette route : **un seul résultat**, dans
`VoletAnalysesIa.jsx:157` — c'est-à-dire dans l'onglet « Analyses IA », pas dans l'onglet
« Critères ».

**Un utilisateur qui veut évaluer ses critères ne trouvera jamais cette page.** Il utilisera
la saisie intégrée, sans savoir qu'une vue plus complète existe.

### C-2 — « Questionnaire » ne mène pas au questionnaire

La navigation du collaborateur porte une entrée **« Questionnaire »** → `/app/:e/questionnaire`.

Cette page (`Questionnaire.jsx`) est rattachée à l'**entreprise**, pas à une mission. Elle
laisse choisir un `referentielCode` et liste les critères applicables. Vérifié : **elle ne
contient aucun lien vers l'évaluation** — ni vers `CritereEvaluation`, ni vers une mission.

C'est un **explorateur de référentiel**, nommé comme l'outil de travail principal du
collaborateur. Le collaborateur qui clique dessus arrive dans une impasse.

### C-3 — Aucun fil d'Ariane, sur une hiérarchie à quatre niveaux

Recherche `Breadcrumb` / `ariane` dans tout `src/` : **aucun résultat**.

Or la hiérarchie réelle est :

```
Organisation  →  Mission  →  Critère  →  Preuve / Analyse
```

La seule aide au retour est un bouton « ← Retour » codé page par page (`AuditDetail:225`,
`Questionnaire:90`, `IndicePreparation:60`…), qui remonte **d'un cran**. Depuis
`/app/:e/audits/:a/criteres/:c`, revenir à l'organisation demande trois clics et la
connaissance du chemin.

### C-4 — Le dashboard ne répond pas à « que dois-je faire maintenant ? »

`TableauDeBord.jsx` charge, par entreprise et par mission : le score, les non-conformités,
l'historique de score, les plans d'action. Il affiche **cinq compteurs** — *Missions actives,
En cours, À risque, Taux de complétion, Plans d'amélioration* — puis des liens génériques
vers `/audits`, `/entreprises`, `/rapports`.

Ce sont des **indicateurs d'état**, pas des **tâches**. Il manque la réponse aux questions
que l'utilisateur se pose en arrivant :

- quelles preuves manquent, et sur quelle mission ;
- quelles analyses sont terminées et attendent une revue ;
- quelles actions correctives sont en retard ;
- quel critère reprendre là où je me suis arrêté.

Le composant `CarteReprise.jsx` existe déjà dans `components/audit/` — **il n'est pas utilisé
par le dashboard**.

## IMPORTANT

### I-1 — Le cycle de vie d'une mission est invisible

Trois statuts (`BROUILLON`, `EN_COURS`, `TERMINE`) et aucune représentation de la progression
entre eux. L'utilisateur ne voit nulle part *où en est* sa mission dans un parcours qui compte
pourtant sept étapes métier réelles.

### I-2 — Deux portées pour le même sujet, sans nommage lisible

| Sujet | Page mission | Page entreprise |
|---|---|---|
| Non-conformités | `NonConformites` (331 l.) | `NonConformitesEntreprise` (163 l.) |
| Rapports | `Rapports` (232 l.) | `RapportsEntreprise` (80 l.) |

**Ce ne sont pas des doublons** — vérifié : la première prend `{entrepriseId, auditId}`, la
seconde agrège les missions de l'entreprise. Le motif est légitime. Mais **la navigation
n'expose que les versions entreprise**, et les versions mission ne sont atteignables que
depuis `AuditDetail`. Rien ne signale à l'utilisateur qu'il regarde une vue agrégée ou une vue
de mission.

### I-3 — Trois pages pour les plans d'action

`PlanActions` (497 l., actions correctives issues des non-conformités) · `PlansAmelioration`
(249 l., issus des axes validés) · `MesActions` (224 l., filtre personnel).

La distinction est **réelle et documentée** dans `App.jsx`. Elle n'est **pas exprimée dans
l'interface** : trois entrées de menu voisines — *Actions correctives*, *Plans d'amélioration*,
*Mes actions* — sans rien qui explique en quoi elles diffèrent.

### I-4 — Le choix du référentiel n'est pas une étape du parcours

Le parcours cible place « Choix du référentiel » après la création de mission. Dans
l'application, le référentiel se choisit dans le **formulaire de création** (`Projets.jsx`,
`AuditsListe`), et le `Questionnaire` en propose un **autre**, indépendant, par défaut
`SMARTEX_SUSTWAY`. Deux endroits, deux logiques.

### I-5 — États d'erreur absents sur des pages de données

| Page | `Loader` | `Vide` | `Alerte` |
|---|---|---|---|
| `Journal` | 2 | 3 | **0** |
| `PipelineIA` | 2 | 3 | **0** |
| `RapportsEntreprise` | 2 | 3 | **0** |

Ces trois pages chargent des données distantes et ne prévoient **aucun affichage d'erreur**.
Une API en échec y produit un écran vide indiscernable d'une absence de données.

## MODÉRÉ

### M-1 — Cinq redirections de vitrine encore actives

`/accueil`, `/a-propos`, `/avantages`, `/engagement`, `/deploiement` redirigent vers d'autres
pages. Utile pour ne pas casser des liens existants ; à arbitrer une fois la vitrine stabilisée.

### M-2 — Aucune page d'erreur

`<Route path="*" element={<Navigate to="/" replace />} />` : une URL inconnue renvoie
silencieusement à la vitrine. Un utilisateur connecté qui se trompe d'adresse **sort de son
espace** sans comprendre pourquoi.

### M-3 — `ImportReferentiel` sur deux routes

`referentiels/import` et `referentiels/import/:importId` rendent le même composant. Le
commentaire d'`App.jsx` explique l'ordre des routes, mais l'état d'avancement d'un import
n'est pas exprimé dans l'URL autrement que par la présence d'un identifiant.

### M-4 — Le sélecteur d'organisation porte tout le contexte

La quasi-totalité des routes est de la forme `/app/:entrepriseId/…`. Le contexte vient d'un
sélecteur dans la sidebar. Sur un compte mono-entreprise, ce sélecteur est un bruit ; sur un
compte `SUPER_ADMIN` multi-entreprises, c'est le pivot de toute la navigation — et rien ne le
signale dans l'en-tête des pages.

## MINEUR

### m-1 — `AuditsListe` filtrée par paramètres d'URL non exposés

La navigation construit `?statut=EN_COURS`, `?vue=a-valider`, `?statut=CLOTURE`. Ces filtres
n'apparaissent pas comme des onglets dans la page : l'utilisateur ne peut pas passer de l'un à
l'autre sans repasser par le menu.

### m-2 — `Classement` et `ComparaisonEntreprises` sans contexte d'usage

Deux pages globales dont rien n'indique à quel moment du parcours elles servent.

---

# C. Architecture UX actuelle

```
/  (vitrine)
│
├── /services · /formules · /methodologie · /formation · /contact · /faq
│   + 5 redirections
│
├── /connexion · /inscription · /invitation/:token · /mot-de-passe-oublie
│
└── /app  [RouteProtegee]  ── Layout (Header + navigation selon rôle)
    │
    │   ┌─ SUPER_ADMIN ─────────── Navigation · Suivi · Paramètres
    │   ├─ RESPONSABLE_ENTREPRISE ─ Pilotage · Audit · Administration
    │   └─ COLLABORATEUR ────────── Ma participation · Compte
    │
    ├── /app                       TableauDeBord
    ├── /app/entreprises           Entreprises
    ├── /app/:e                    EntrepriseDetail
    │   ├── /questionnaire         Questionnaire  ← explorateur, PAS le questionnaire (C-2)
    │   ├── /documents             Documents
    │   ├── /audits                AuditsListe
    │   │   └── /:a                AuditDetail  ← hub réel de la mission
    │   │       ├── onglet Critères     → SaisieCritereMission
    │   │       ├── onglet Preuves      → VoletPreuves
    │   │       ├── onglet Analyses IA  → VoletAnalysesIa ──┐
    │   │       ├── onglet Plan         → VoletPlanAction   │ seul lien
    │   │       ├── /score                                  │ vers
    │   │       ├── /non-conformites                        │
    │   │       ├── /rapports                               ▼
    │   │       ├── /indice-preparation      /criteres/:c  CritereEvaluation (997 l.)
    │   │       └── /plans/:planId
    │   ├── /non-conformites · /rapports · /plan-actions · /plans · /mes-actions
    │   ├── /pipeline-ia · /financements-verts
    │   └── /abonnement · /utilisateurs · /journal
    │
    ├── /app/projets · /projets/:id
    ├── /app/referentiels · /import · /:code
    ├── /app/comparaison · /classement
    └── /app/profil
```

**Ce que le schéma rend visible** : le hub de mission (`AuditDetail`) est bien conçu — cinq
onglets plus cinq pages satellites. Mais la page d'évaluation la plus riche pend au bout d'un
fil unique, et l'entrée « Questionnaire » part dans une autre direction.

---

# D. Architecture UX cible

Détaillée dans `smartex-ux-architecture.md`. Principes retenus :

| # | Principe |
|---|---|
| 1 | **La mission est le contexte de travail.** Tout ce qui s'évalue, se dépose, s'analyse et se restitue vit sous `/app/:e/audits/:a`. |
| 2 | **Une seule expérience d'évaluation.** `CritereEvaluation` devient la page de travail, atteinte depuis la liste des critères. |
| 3 | **Un fil d'Ariane permanent** — Organisation › Mission › Critère. |
| 4 | **Le dashboard liste des tâches**, pas des compteurs. |
| 5 | **Le parcours de mission est visible** — sept étapes, adossées aux trois statuts réels. |
| 6 | **Les trois navigations par rôle sont conservées**, réordonnées selon le parcours. |

---

# E. Parcours par rôle

## SUPER_ADMIN

| Étape | Existe ? |
|---|---|
| Superviser les organisations | **oui** — `Entreprises`, `EntrepriseDetail` |
| Administrer les référentiels | **oui** — `ReferentielsListe`, `ReferentielDetail` |
| Importer un référentiel | **oui** — `ImportReferentiel` |
| **Valider le contenu importé** | **oui côté API**, endpoints `/validation` et `/rejet` · **écran partiel** — `components/referentiel/import/` |
| Gérer les utilisateurs | **oui** — `Utilisateurs`, par entreprise |
| Consulter les journaux | **oui** — `Journal` |
| Comparer, classer | **oui** |
| **Vue de supervision globale** | **MANQUANT** — le tableau de bord est le même que celui du responsable |

## RESPONSABLE_ENTREPRISE

| Étape | Existe ? |
|---|---|
| Accéder à son organisation | **oui** |
| Configurer l'organisation | **oui** — `EntrepriseDetail`, sites |
| Créer une mission | **oui** — depuis `AuditsListe` |
| Suivre ses missions | **oui** |
| Préparer l'audit | **partiel** — pas d'étape distincte |
| Répondre aux évaluations | **oui** — mais **deux chemins concurrents** (C-1) |
| Déposer les preuves | **oui** |
| Suivre l'analyse | **oui** — `PipelineIA`, `VoletAnalysesIa` |
| Consulter les résultats | **oui** — `AuditScore`, `SyntheseMission` |
| Suivre les non-conformités | **oui** |
| Gérer les plans d'actions | **oui** — mais trois pages (I-3) |
| Consulter les rapports | **oui** |

## COLLABORATEUR

| Étape | Existe ? |
|---|---|
| Voir les missions où il contribue | **oui** — « Mes missions » |
| **Répondre aux critères** | **MAL PLACÉ** — « Questionnaire » mène à un explorateur (C-2) |
| Déposer des preuves | **oui** — « Mes documents » |
| Suivre ses tâches | **oui** — « Mes actions » |
| Consulter le plan collectif | **oui** — « Plans d'amélioration » |

> Le code documente une intention explicite : *« Répondre au questionnaire est le travail même
> du collaborateur… Sans cette entrée il fallait traverser une mission puis un critère pour
> atteindre sa propre tâche. »* **L'intention est juste, la cible est fausse** : le lien pointe
> vers l'explorateur de référentiel.

---

# F. Parcours mission complet

| # | Étape du parcours cible | Réalité | Verdict |
|---|---|---|---|
| 1 | Inscription / connexion | `/inscription`, `/connexion`, `/invitation/:token` | **existe** |
| 2 | Configuration entreprise | `EntrepriseDetail` + sites | **existe** |
| 3 | Dashboard | `TableauDeBord` | **existe, à réorienter** (C-4) |
| 4 | Création de mission | formulaire dans `AuditsListe` | **existe** |
| 5 | Choix du référentiel | dans le formulaire de création | **existe, mal positionné** (I-4) |
| 6 | Configuration de la mission | `AuditDetail` — sites, périmètre | **existe** |
| 7 | Préparation de l'évaluation | — | **MANQUANT** — pas d'étape distincte |
| 8 | Questionnaire | `SaisieCritereMission` **ou** `CritereEvaluation` | **à unifier** (C-1) |
| 9 | Collecte des preuves | `DepotPreuves`, `VoletPreuves`, `Documents` | **existe** |
| 10 | Analyse IA | `PanneauAnalyseIa`, `PipelineIA` | **existe** |
| 11 | Revue / validation | `Rectification`, `EN_REVUE` → `VALIDEE` | **existe, peu visible** |
| 12 | Résultats | `AuditScore`, `SyntheseMission` | **existe** |
| 13 | Non-conformités / risques | `NonConformites` | **existe** |
| 14 | Axes d'amélioration | `AxesAmelioration` | **existe** |
| 15 | Plan d'actions | `PlanActions`, `PlansAmelioration` | **existe, à clarifier** (I-3) |
| 16 | Rapport | `Rapports` | **existe** |
| 17 | Suivi | `MesActions`, `ClotureMission` | **existe** |

**15 étapes sur 17 existent.** Manquent : une étape de **préparation** (7), et une
**représentation de la progression** dans le parcours.

---

# G. Parcours questionnaire

## Ce qui existe déjà — et qui est bon

Le dossier `components/audit/` porte **28 composants**, dont beaucoup répondent déjà aux
exigences du brief :

| Besoin | Composant existant |
|---|---|
| Progression par domaine | `CarteProgressionDomaine`, `EnTeteDomaine` |
| Navigation précédent/suivant | **`NavigationCritere`** |
| Reprise après interruption | **`CarteReprise`** |
| Liste des critères | `ListeCriteres` |
| Statut du critère | `statutsCritere.js` — `A_EVALUER` / `DECLARE` / `EVALUE` |
| Hors périmètre | `libelleExclusion()` — *Retiré du périmètre* / *Non applicable* |
| Saisie | `SaisieCritereMission`, `CarteReponseBinaire`, `CarteNiveauMaturite` |
| Dépôt de preuves | `DepotPreuves`, `ListeFichiers` |
| Analyse | `PanneauAnalyseIa`, `CarteAnalyseIa`, `TracabiliteIa` |
| Rectification | `Rectification` |

## Ce qui manque

| Question de l'utilisateur | Réponse actuelle |
|---|---|
| Où suis-je ? | **Partielle** — pas de fil d'Ariane (C-3) |
| Que dois-je faire ? | **Partielle** — pas de « prochain critère à traiter » |
| Ce qui est terminé ? | **Oui** — `CarteProgressionDomaine` |
| Ce qui reste ? | **Oui** |
| Pourquoi est-ce bloqué ? | **Oui** — `libelleExclusion()` |
| Comment reprendre plus tard ? | **`CarteReprise` existe — mais n'est pas sur le dashboard** |

**Le matériel est là. C'est l'assemblage qui manque.**

---

# H. Parcours preuves

```
Critère → Exigence → Preuve attendue → Dépôt → Analyse → Résultat
```

| Étape | Composant | État |
|---|---|---|
| Preuve attendue | `VoletPreuves`, `VoletExigences` | **existe** |
| Dépôt | `DepotPreuves` | **existe** |
| Liste des fichiers | `ListeFichiers` | **existe** |
| Analyse | `PanneauAnalyseIa` | **existe** |
| Vue transverse | `Documents` (255 l.) | **existe** |

**Les six états demandés** — attendue, déposée, manquante, analysée, validée, insuffisante —
ne sont pas tous distingués visuellement. Les données existent côté API
(`preuve_attendue.obligatoire`, statut d'analyse, `confiance_lecture`) ; **c'est la
représentation qui manque**, pas le modèle.

> Aucune modification du modèle métier n'est nécessaire.

---

# I. Parcours IA

```
Préparation → Analyse en cours → Terminée → Résultats IA → Revue humaine → Validation
```

| Étape | Où | État |
|---|---|---|
| Lancement | `PanneauAnalyseIa` | **existe** |
| Suivi | **`PipelineIA`** (page dédiée) | **existe** |
| Résultats | `CarteAnalyseIa`, `VoletAnalysesIa` | **existe** |
| Traçabilité | **`TracabiliteIa`** | **existe** |
| Revue humaine | `Rectification`, statut `EN_REVUE` | **existe** |
| Validation | `EN_REVUE` → `VALIDEE` | **existe** |

**Le parcours IA est le mieux outillé de l'application.** `TracabiliteIa` montre déjà d'où
vient une conclusion.

**Ce qui manque** : une vue d'ensemble répondant à *« qu'est-ce qui attend mon intervention ? »*.
`PipelineIA` montre l'état des analyses, pas la file des décisions humaines en attente.

> Le principe « l'IA ne remplace pas la validation humaine » est **déjà tenu par le backend** :
> statut `EN_REVUE` distinct de `VALIDEE`, et le garde-fou de publication des référentiels
> refuse tout contenu `IMPORT_IA` non tranché. L'UX doit le rendre lisible, pas l'inventer.

---

# J. États UX

## Mission — trois statuts réels

```
BROUILLON  ──►  EN_COURS  ──►  TERMINE
```

**Aucun statut ne doit être ajouté.** La progression métier — sept étapes — se lit dans les
**données**, non dans un statut :

| Étape affichée | Dérivée de |
|---|---|
| Configuration | statut `BROUILLON` |
| Évaluation en cours | critères `A_EVALUER` restants |
| Preuves à déposer | preuves attendues obligatoires sans dépôt |
| Analyse en cours | analyses lancées non terminées |
| Revue à faire | évaluations `EN_REVUE` |
| Résultats disponibles | score calculé |
| Clôturée | statut `TERMINE` |

## Critère

```
A_EVALUER  ──►  DECLARE  ──►  EVALUE
```
Hors parcours : `actif = false` → *Retiré du périmètre* · `applicable = false` → *Non applicable*

## Évaluation

```
PROVISOIRE  ──►  EN_REVUE  ──►  VALIDEE
```

---

# K. Pages existantes — classement

## CONSERVER (24)

`Landing` · `Services` · `Formules` · `Methodologie` · `Formation` · `Contact` · `Faq` ·
`MentionsLegales` · `ConnexionReelle` · `Inscription` · `AccepterInvitation` ·
`MotDePasseOublie` · `ReinitialiserMotDePasse` · `Entreprises` · `EntrepriseDetail` ·
`AuditsListe` · `AuditDetail` · `Documents` · `AuditScore` · `Journal` · `Abonnement` ·
`Utilisateurs` · `Profil` · `ReferentielDetail`

## DÉPLACER (4)

| Page | De | Vers | Motif |
|---|---|---|---|
| **`CritereEvaluation`** | lien unique dans « Analyses IA » | **liste des critères de la mission** | C-1 — page principale d'évaluation |
| **`Questionnaire`** | « Questionnaire » du collaborateur | **explorateur de référentiel**, renommé | C-2 |
| `IndicePreparation` | satellite de mission | rapproché de `FinancementsVerts` | cohérence |
| `MesActions` | entrée de menu isolée | **aussi sur le dashboard** | C-4 |

## FUSIONNER (0 page) — mais **unifier 2 expériences**

**Aucune page ne doit être supprimée.** Les paires apparemment redondantes
(`NonConformites` / `NonConformitesEntreprise`, `Rapports` / `RapportsEntreprise`) sont deux
**portées légitimes**, vérifiées dans le code.

À unifier : `SaisieCritereMission` et `CritereEvaluation` — **une seule expérience
d'évaluation**, la seconde étant la plus complète.

## RENOMMER (5)

| Actuel | Proposé | Motif |
|---|---|---|
| « Questionnaire » *(nav collaborateur)* | **« Explorer le référentiel »** | C-2 |
| `NonConformitesEntreprise` | « Non-conformités — toutes missions » | I-2 |
| `RapportsEntreprise` | « Rapports — toutes missions » | I-2 |
| « Actions correctives » | « Actions correctives *(non-conformités)* » | I-3 |
| « Plans d'amélioration » | « Plans d'amélioration *(axes validés)* » | I-3 |

## CORRIGER (4)

| Page | Correction |
|---|---|
| `TableauDeBord` | Orienter vers les tâches ; intégrer `CarteReprise` | C-4 |
| `Journal` | Ajouter l'état d'erreur | I-5 |
| `PipelineIA` | Ajouter l'état d'erreur · file des décisions en attente | I-5, § I |
| `RapportsEntreprise` | Ajouter l'état d'erreur | I-5 |

## MANQUANT (5)

| Écran | Besoin | Priorité |
|---|---|---|
| **Fil d'Ariane** *(composant)* | Se situer dans la hiérarchie | **P0** |
| **Page 404 / accès refusé** | Ne pas éjecter vers la vitrine | **P1** |
| **Étape de préparation de mission** | Entre configuration et évaluation | P2 |
| **File de revue humaine** | « Qu'est-ce qui attend mon intervention ? » | P2 |
| **Supervision globale `SUPER_ADMIN`** | Dashboard propre au rôle | P2 |

## REPORTER (3)

| Sujet | Motif |
|---|---|
| Redirections de vitrine (M-1) | Sans effet sur l'usage |
| `Classement`, `ComparaisonEntreprises` (m-2) | Fonctionnent ; leur place se décidera à l'usage |
| Design responsive détaillé | Hors périmètre de cette phase |

---

# L. Priorisation

## P0 — indispensable avant utilisation

| # | Action | Problème |
|---|---|---|
| **P0-1** | Rendre `CritereEvaluation` accessible depuis la liste des critères de la mission | **C-1** |
| **P0-2** | Corriger la cible de « Questionnaire » du collaborateur | **C-2** |
| **P0-3** | Fil d'Ariane permanent — Organisation › Mission › Critère | **C-3** |
| **P0-4** | Dashboard orienté tâches ; intégrer `CarteReprise` | **C-4** |

**Quatre corrections.** Aucune ne demande de nouvelle page : les composants existent.

## P1 — important

| # | Action | Problème |
|---|---|---|
| P1-1 | Bandeau de progression de mission — 7 étapes sur 3 statuts | I-1 |
| P1-2 | Nommer les portées mission / entreprise | I-2 |
| P1-3 | Distinguer les trois pages de plans d'actions | I-3 |
| P1-4 | États d'erreur sur `Journal`, `PipelineIA`, `RapportsEntreprise` | I-5 |
| P1-5 | Page 404 / accès refusé | M-2 |

## P2 — amélioration

| # | Action |
|---|---|
| P2-1 | Six états visuels de preuve |
| P2-2 | File de revue humaine |
| P2-3 | Étape de préparation de mission |
| P2-4 | Filtres de `AuditsListe` en onglets visibles |
| P2-5 | Contexte d'organisation dans l'en-tête de page |
| P2-6 | Dashboard de supervision `SUPER_ADMIN` |

## P3 — plus tard

Redirections de vitrine · place de `Classement` et `ComparaisonEntreprises` · responsive
détaillé · polish graphique.

---

# Parcours à garantir sur mobile

Sans conception détaillée à ce stade, ces parcours devront fonctionner sur petit écran :

| Parcours | Pourquoi |
|---|---|
| Connexion | Point d'entrée |
| Dashboard | Consultation rapide |
| Suivi de mission | Consultation en déplacement |
| **Questionnaire** | **Le plus exigeant** — saisie longue, reprise indispensable |
| **Dépôt de preuve** | Souvent fait depuis un téléphone, photo à l'appui |
| Consultation des résultats | Lecture |
| Suivi du plan d'action | Lecture et mise à jour ponctuelle |

`CarteReprise` prend ici tout son sens : une saisie interrompue sur mobile doit pouvoir
reprendre sur poste.

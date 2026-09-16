# SMARTEX SUSTWAY — Architecture UX cible

> **Document de conception. Aucun code n'a été écrit.**
>
> Fondé sur l'audit `smartex-ux-audit.md`. Toutes les routes, tous les composants et tous les
> statuts cités **existent déjà** : cette architecture réorganise, elle n'invente pas.

---

# 1. Principes

| # | Principe | Ce qu'il écarte |
|---|---|---|
| **1** | **La mission est le contexte de travail.** Évaluer, déposer, analyser, restituer vivent sous `/app/:e/audits/:a`. | Deux chemins concurrents vers l'évaluation |
| **2** | **Une seule expérience d'évaluation.** | `CritereEvaluation` inatteignable |
| **3** | **Toujours savoir où l'on est.** Fil d'Ariane permanent. | Trois clics pour remonter |
| **4** | **Le dashboard liste des tâches.** | Cinq compteurs sans action |
| **5** | **La progression se lit dans les données**, pas dans un statut nouveau. | Inventer des statuts backend |
| **6** | **Les trois navigations par rôle restent séparées.** | Défaire un acquis réel |
| **7** | **Rien n'est supprimé sans motif.** | Casser une fonctionnalité qui marche |

---

# 2. Sitemap

```
VITRINE                          publique, LayoutPublic
   │
   ├─ /                          Landing
   ├─ /services · /formules · /methodologie · /formation · /contact · /faq
   └─ /mentions-legales
   │
   ▼
AUTHENTIFICATION                 publique, sans Layout
   │
   ├─ /connexion  ·  /inscription
   ├─ /invitation/:token
   └─ /mot-de-passe-oublie  ·  /reinitialiser-mot-de-passe
   │
   ▼
ESPACE SÉCURISÉ                  /app — RouteProtegee + Layout
   │
   ▼
ESPACE UTILISATEUR               navigation selon le rôle
```

## Espace utilisateur — arborescence cible

```
/app                                     Tableau de bord  ◄── orienté TÂCHES
│
├── ORGANISATIONS
│   ├── /app/entreprises                 Liste
│   └── /app/:e                          Profil · sites · périmètre
│
├── MISSIONS                             ◄── le contexte de travail
│   ├── /app/:e/audits                   Liste + onglets de filtre
│   └── /app/:e/audits/:a                HUB DE MISSION
│       │   ┌─────────── bandeau de progression, 7 étapes ───────────┐
│       │
│       ├── onglet Synthèse              SyntheseMission
│       ├── onglet Critères              ListeCriteres ──┐
│       ├── onglet Preuves               VoletPreuves    │
│       ├── onglet Analyses IA           VoletAnalysesIa │
│       ├── onglet Plan                  VoletPlanAction │
│       │                                                │
│       ├── /criteres/:c   ◄─────────────────────────────┘  NOUVEAU CHEMIN
│       │       CritereEvaluation — page de travail
│       │       + NavigationCritere (précédent / suivant)
│       │
│       ├── /score                       Résultats
│       ├── /non-conformites             Écarts de CETTE mission
│       ├── /rapports                    Rapports de CETTE mission
│       ├── /indice-preparation          Financement vert
│       └── /plans/:planId               Détail d'un plan
│
├── TRANSVERSE ORGANISATION              agrège toutes les missions
│   ├── /app/:e/documents                Collecte de preuves
│   ├── /app/:e/non-conformites          Non-conformités — toutes missions
│   ├── /app/:e/rapports                 Rapports — toutes missions
│   ├── /app/:e/plan-actions             Actions correctives (non-conformités)
│   ├── /app/:e/plans                    Plans d'amélioration (axes validés)
│   ├── /app/:e/mes-actions              Mes actions
│   ├── /app/:e/pipeline-ia              Suivi des analyses
│   └── /app/:e/financements-verts       Financements verts
│
├── MULTI-ORGANISATIONS
│   ├── /app/projets · /projets/:id      Projets
│   ├── /app/comparaison                 Comparaison
│   └── /app/classement                  Classement
│
├── RÉFÉRENTIELS                         SUPER_ADMIN
│   ├── /app/referentiels                Domaines et critères
│   ├── /app/referentiels/:code          Détail
│   └── /app/referentiels/import         Import assisté
│       └── /import/:importId            Suivi d'un import
│
├── ADMINISTRATION
│   ├── /app/:e/utilisateurs             Équipe
│   ├── /app/:e/abonnement               Abonnement
│   └── /app/:e/journal                  Journal d'audit
│
├── /app/profil                          Profil & sécurité
│
└── /app/*                               404 / accès refusé   ◄── NOUVEAU
```

---

# 3. Routes cibles

| Route | Écran | Changement |
|---|---|---|
| `/app` | `TableauDeBord` | **Contenu réorienté** (P0-4) |
| `/app/entreprises` | `Entreprises` | inchangé |
| `/app/:e` | `EntrepriseDetail` | inchangé |
| `/app/:e/audits` | `AuditsListe` | filtres en onglets (P2-4) |
| `/app/:e/audits/:a` | `AuditDetail` | **+ bandeau de progression** (P1-1) |
| **`/app/:e/audits/:a/criteres/:c`** | **`CritereEvaluation`** | **atteinte depuis l'onglet Critères** (P0-1) |
| `/app/:e/audits/:a/score` · `/non-conformites` · `/rapports` · `/indice-preparation` · `/plans/:planId` | inchangés | libellés précisés |
| `/app/:e/questionnaire` | `Questionnaire` | **renommé « Explorer le référentiel »** (P0-2) |
| `/app/:e/documents` · `/non-conformites` · `/rapports` · `/plan-actions` · `/plans` · `/mes-actions` · `/pipeline-ia` · `/financements-verts` | inchangées | libellés précisés (P1-2, P1-3) |
| `/app/projets` · `/comparaison` · `/classement` · `/referentiels*` · `/profil` | inchangées | — |
| **`/app/*`** | **page 404 / accès refusé** | **nouvelle** (P1-5) |

**Aucune route n'est supprimée. Une seule est ajoutée.**

---

# 4. Navigation par rôle

## 4.1 `SUPER_ADMIN` — `GROUPES_AUDIT`

```
SUPERVISION
  · Vue générale                    /app
  · Organisations                   /app/entreprises
  · Projets                         /app/projets
  · Classement                      /app/classement
  · Comparaison d'entreprises       /app/comparaison

MISSIONS
  · Toutes les missions             /app/:e/audits
  · En cours                        /app/:e/audits?statut=EN_COURS
  · À valider                       /app/:e/audits?vue=a-valider
  · Terminées                       /app/:e/audits?statut=TERMINE     ◄── corriger CLOTURE
  · Pipeline IA                     /app/:e/pipeline-ia

SUIVI
  · Collecte de preuves             /app/:e/documents
  · Non-conformités                 /app/:e/non-conformites
  · Actions correctives             /app/:e/plan-actions
  · Plans d'amélioration            /app/:e/plans
  · Rapports                        /app/:e/rapports
  · Financements verts              /app/:e/financements-verts

RÉFÉRENTIELS                        permission referentiel:administrer
  · Domaines et critères            /app/referentiels
  · Import intelligent              /app/referentiels/import

ADMINISTRATION
  · Équipe                          /app/:e/utilisateurs
  · Abonnement et facturation       /app/:e/abonnement
  · Journal d'audit                 /app/:e/journal
  · Profil & sécurité               /app/profil
```

> **À vérifier** : la navigation actuelle construit `?statut=CLOTURE` pour « Terminées », alors
> que `StatutAudit` ne connaît que `BROUILLON`, `EN_COURS`, `TERMINE`. `CLOTURE` appartient au
> statut de **projet**, pas de mission. **Signalé, non corrigé.**

## 4.2 `RESPONSABLE_ENTREPRISE` — `GROUPES_ENTREPRISE`

```
PILOTAGE
  · Tableau de bord                 /app
  · Mon organisation                /app/:e
  · Rapports RSE                    /app/:e/rapports
  · Financements verts              /app/:e/financements-verts

AUDIT                               ◄── ordonné selon le parcours
  · Missions d'audit                /app/:e/audits
  · Collecte de preuves             /app/:e/documents
  · Pipeline IA                     /app/:e/pipeline-ia
  · Non-conformités                 /app/:e/non-conformites
  · Actions correctives             /app/:e/plan-actions
  · Plans d'amélioration            /app/:e/plans

RÉFÉRENCE
  · Explorer le référentiel         /app/:e/questionnaire      ◄── renommé
  · Comparaison d'entreprises       /app/comparaison

ADMINISTRATION
  · Équipe · Abonnement · Journal · Profil
```

## 4.3 `COLLABORATEUR` — `GROUPES_COLLABORATEUR`

```
MON TRAVAIL                         ◄── ordonné par fréquence d'usage
  · Tableau de bord                 /app
  · Mes missions                    /app/:e/audits
  · Mes actions                     /app/:e/mes-actions
  · Mes documents                   /app/:e/documents

SUIVI
  · Plans d'amélioration            /app/:e/plans
  · Explorer le référentiel         /app/:e/questionnaire      ◄── renommé

COMPTE
  · Profil & sécurité               /app/profil
```

> **L'entrée « Questionnaire » disparaît comme porte d'entrée du travail.** Le collaborateur
> accède à son travail réel par **Mes missions → mission → onglet Critères → critère**, avec le
> dashboard qui lui propose directement de reprendre là où il s'est arrêté.

---

# 5. Le hub de mission

```
┌──────────────────────────────────────────────────────────────────────┐
│  Organisation ›  Mission « Campagne RSE 2026 »            [EN_COURS] │  fil d'Ariane
├──────────────────────────────────────────────────────────────────────┤
│  ①Config ─ ②Évaluation ─ ③Preuves ─ ④Analyse ─ ⑤Revue ─ ⑥Résultats ─ ⑦Clôture │
│            ▲ vous êtes ici — 34 / 92 critères                        │
├──────────────────────────────────────────────────────────────────────┤
│  Synthèse │ Critères (92) │ Preuves │ Analyses IA │ Plan             │
├──────────────────────────────────────────────────────────────────────┤
│                                                                      │
│   D1 — Valeurs et principes éthiques          ███████░░░  5/7        │
│     ✓ D1-01  Code de conduite            Analysé par l'IA            │
│     ● D1-03  Communication des valeurs   Déclaré, en attente         │
│     ○ D1-05  Transparence                À renseigner    → [Évaluer] │
│                                                          ▲           │
│                                         mène à CritereEvaluation     │
└──────────────────────────────────────────────────────────────────────┘
        Actions : Score · Non-conformités · Rapports · Financement vert
```

**Le seul vrai changement** : chaque critère de la liste mène à `CritereEvaluation`. Le
composant `ListeCriteres` existe, `NavigationCritere` aussi.

---

# 6. Écran d'évaluation d'un critère

```
┌──────────────────────────────────────────────────────────────────────┐
│  Organisation › Mission › D1-05 Transparence           ‹ 12/92 ›     │
├──────────────────────────────────────────────────────────────────────┤
│  EXIGENCE                                                            │
│  Ce critère établit si l'organisation peut…                          │
├──────────────────────────────────────────────────────────────────────┤
│  VOTRE RÉPONSE            CarteReponseBinaire · CarteNiveauMaturite   │
├──────────────────────────────────────────────────────────────────────┤
│  PREUVES ATTENDUES        VoletPreuves · DepotPreuves                 │
│    ✓ Politique écrite          déposée · analysée                    │
│    ⚠ Trace d'application       attendue · manquante                  │
├──────────────────────────────────────────────────────────────────────┤
│  ANALYSE IA               PanneauAnalyseIa · TracabiliteIa            │
│    Statut : EN_REVUE  →  [Valider]  [Rectifier]                      │
├──────────────────────────────────────────────────────────────────────┤
│  ‹ Critère précédent            Enregistrer            Suivant ›     │
└──────────────────────────────────────────────────────────────────────┘
```

Tous les composants cités existent. `CritereEvaluation` (997 lignes) les assemble déjà.

---

# 7. Dashboard cible

Réponse à **« que dois-je faire maintenant ? »** :

```
┌──────────────────────────────────────────────────────────────────────┐
│  REPRENDRE                                    ◄── CarteReprise       │
│  Mission « Campagne RSE 2026 » — critère D1-05    [Continuer]        │
├──────────────────────────────────────────────────────────────────────┤
│  À FAIRE                                                             │
│   ⚠  7 preuves obligatoires manquantes          → Collecte           │
│   ●  12 analyses terminées, en attente de revue → Pipeline IA        │
│   ⏱  3 actions correctives en retard             → Mes actions       │
├──────────────────────────────────────────────────────────────────────┤
│  ÉTAT                    ◄── les 5 compteurs actuels, en second plan │
│   Missions actives 3 · En cours 2 · À risque 1 · Complétion 42 %     │
├──────────────────────────────────────────────────────────────────────┤
│  DISPONIBLE                                                          │
│   2 rapports générés                            → Rapports           │
└──────────────────────────────────────────────────────────────────────┘
```

**Les compteurs ne disparaissent pas** — ils passent sous les tâches. `CarteReprise` existe et
n'est pas utilisé ; toutes les données nécessaires sont déjà chargées par `TableauDeBord.jsx`
(score, non-conformités, plans d'action, historique).

---

# 8. États et leur représentation

## Mission — 3 statuts, 7 étapes lues dans les données

| Étape affichée | Dérivée de | Statut porteur |
|---|---|---|
| ① Configuration | sites et périmètre définis | `BROUILLON` |
| ② Évaluation | critères `A_EVALUER` restants | `EN_COURS` |
| ③ Preuves | preuves obligatoires sans dépôt | `EN_COURS` |
| ④ Analyse | analyses lancées non terminées | `EN_COURS` |
| ⑤ Revue | évaluations `EN_REVUE` | `EN_COURS` |
| ⑥ Résultats | score calculé | `EN_COURS` |
| ⑦ Clôture | — | `TERMINE` |

> **Aucun statut backend n'est créé.** Les étapes 2 à 6 vivent toutes sous `EN_COURS` et se
> distinguent par le comptage.

## Critère

| Statut | Libellé existant | Ton |
|---|---|---|
| `A_EVALUER` | À renseigner | neutre |
| `DECLARE` | Déclaré, en attente d'analyse | ambre |
| `EVALUE` | Analysé par l'IA | vert |
| `actif = false` | Retiré du périmètre | — |
| `applicable = false` | Non applicable | — |

## Preuve — 6 états, dérivés de l'existant

| État | Dérivé de |
|---|---|
| Attendue | `preuve_attendue` sans dépôt, `obligatoire = false` |
| **Manquante** | `preuve_attendue` sans dépôt, **`obligatoire = true`** |
| Déposée | document présent, analyse non lancée |
| Analysée | analyse terminée |
| Validée | évaluation `VALIDEE` |
| Insuffisante | analyse terminée, conclusion négative |

**Aucune modification du modèle métier.**

## Évaluation

```
PROVISOIRE  ──►  EN_REVUE  ──►  VALIDEE
```

L'IA produit `PROVISOIRE` ou `EN_REVUE`. Seule une personne pose `VALIDEE`.

---

# 9. Fil d'Ariane

Composant nouveau, unique, placé dans le `Layout` — **pas un second Header**.

| Contexte | Fil |
|---|---|
| `/app` | *Tableau de bord* |
| `/app/entreprises` | *Organisations* |
| `/app/:e` | *Organisations › Acme* |
| `/app/:e/audits` | *Organisations › Acme › Missions* |
| `/app/:e/audits/:a` | *Organisations › Acme › Campagne RSE 2026* |
| `/app/:e/audits/:a/criteres/:c` | *… › Campagne RSE 2026 › D1-05* |
| `/app/:e/documents` | *Organisations › Acme › Collecte de preuves* |

Chaque segment est cliquable. **Il remplace les boutons « ← Retour » codés page par page**,
qui pourront disparaître progressivement — sans urgence.

---

# 10. Règles de navigation

| # | Règle |
|---|---|
| **R-1** | Toute route `/app/:e/…` exige une organisation de contexte. Sans sélection → `/app/entreprises`. |
| **R-2** | Une route de mission exige la mission. Introuvable ou hors périmètre → 404, **jamais la vitrine**. |
| **R-3** | Un lien de navigation masqué **n'est pas une sécurité** — l'API tranche. |
| **R-4** | Une URL inconnue sous `/app` → page 404 **dans le Layout**. Hors `/app` → vitrine. |
| **R-5** | Une action indisponible est **affichée et désactivée**, avec son motif — jamais masquée sans explication. |
| **R-6** | Le retour se fait par le fil d'Ariane. |
| **R-7** | Un filtre de liste vit dans l'URL et se reflète dans des onglets visibles. |

---

# 11. Pages accessibles par rôle

| Écran | `SUPER_ADMIN` | `RESPONSABLE_ENTREPRISE` | `COLLABORATEUR` |
|---|:---:|:---:|:---:|
| Tableau de bord | ✔ | ✔ | ✔ |
| Organisations — liste | ✔ | — | — |
| Profil organisation | ✔ | ✔ | — |
| Missions — liste | ✔ | ✔ | ✔ *(les siennes)* |
| Hub de mission | ✔ | ✔ | ✔ |
| **Évaluation d'un critère** | ✔ | ✔ | **✔** |
| Preuves — dépôt | ✔ | ✔ | ✔ |
| Collecte de preuves | ✔ | ✔ | ✔ |
| Pipeline IA | ✔ | ✔ | — |
| Score et résultats | ✔ | ✔ | — |
| Non-conformités | ✔ | ✔ | — |
| Actions correctives | ✔ | ✔ | — |
| Plans d'amélioration | ✔ | ✔ | ✔ *(lecture)* |
| Mes actions | ✔ | ✔ | ✔ |
| Rapports | ✔ | ✔ | — |
| Financements verts | ✔ | ✔ *(formule Avancées)* | — |
| Explorer le référentiel | ✔ | ✔ | ✔ |
| Projets · Comparaison · Classement | ✔ | ✔ | — |
| Référentiels — administration | ✔ | — | — |
| Équipe · Abonnement · Journal | ✔ | ✔ | — |
| Profil & sécurité | ✔ | ✔ | ✔ |

> Reflète la navigation **actuelle**, corrigée de C-2. Aucune permission n'est inventée : les
> restrictions réelles sont celles d'`AutorisationService` et des 23 tests d'isolation
> multi-tenant.

---

# 12. Actions principales et secondaires

| Écran | Principale | Secondaires |
|---|---|---|
| Tableau de bord | **Reprendre** | Traiter une tâche · voir les rapports |
| Missions — liste | **Nouvelle mission** | Filtrer |
| Hub de mission | **Continuer l'évaluation** | Score · non-conformités · rapports · clôturer |
| Évaluation d'un critère | **Enregistrer et suivant** | Déposer une preuve · lancer l'analyse · rectifier · exclure |
| Collecte de preuves | **Déposer** | Filtrer par mission |
| Pipeline IA | **Traiter les revues** | Relancer une analyse |
| Non-conformités | **Créer une action** | Exporter |
| Plans | **Mettre à jour une action** | Clôturer le plan |
| Rapports | **Générer** | Télécharger |

---

# 13. Redirections

| Depuis | Vers | Condition |
|---|---|---|
| `/app` sans organisation | `/app/entreprises` | plusieurs organisations |
| `/app` avec une seule | *(reste)* | contexte implicite |
| Mission introuvable | **404 dans le Layout** | jamais la vitrine |
| Non connecté | `/connexion` | existant |
| URL inconnue hors `/app` | `/` | existant |
| `/accueil`, `/a-propos`, `/avantages`, `/engagement`, `/deploiement` | pages vitrine | existant, P3 |

---

# 14. Plan d'implémentation

## Étape 1 — P0, quatre corrections

| # | Action | Fichiers | Nouveau composant |
|---|---|---|---|
| P0-1 | Lien vers `CritereEvaluation` depuis l'onglet Critères | `AuditDetail.jsx`, `ListeCriteres.jsx` | non |
| P0-2 | Renommer « Questionnaire » → « Explorer le référentiel » | `Layout.jsx` | non |
| P0-3 | Fil d'Ariane | `Layout.jsx` + 1 composant | **oui — 1** |
| P0-4 | Dashboard orienté tâches + `CarteReprise` | `TableauDeBord.jsx` | non |

**Un seul composant nouveau.** Aucune route supprimée, aucun appel API modifié, aucune
permission touchée.

## Étape 2 — P1

Bandeau de progression · libellés de portée · distinction des plans · états d'erreur sur trois
pages · page 404.

## Étape 3 — P2

États de preuve · file de revue · préparation de mission · onglets de filtre · contexte
d'organisation · supervision `SUPER_ADMIN`.

## Étape 4 — P3

Redirections · place de Classement et Comparaison · responsive · polish.

---

# 15. Non-régression

Avant toute modification :

| # | Garantie |
|---|---|
| G-1 | Aucune route existante supprimée |
| G-2 | Aucun appel API modifié |
| G-3 | `RouteProtegee` et le contexte d'authentification intacts |
| G-4 | `permissions.js` et `possedePermission` intacts |
| G-5 | Les trois navigations par rôle conservées |
| G-6 | `Header` et `Layout` **réutilisés**, jamais dupliqués |
| G-7 | Aucune modification du backend, de la base, des migrations, du scoring ou de la logique IA |
| G-8 | Aucune page fonctionnelle retirée |

## Points de vigilance relevés pendant l'audit

| # | Point | Statut |
|---|---|---|
| V-1 | La navigation construit `?statut=CLOTURE` pour « Terminées », mais `StatutAudit` ne connaît que `TERMINE` | **signalé, non corrigé** |
| V-2 | `CritereEvaluation` fait 997 lignes — la rendre principale augmentera son usage | à surveiller |
| V-3 | `TableauDeBord` charge déjà 4 requêtes par mission ; y ajouter des tâches ne doit pas en ajouter | à surveiller |

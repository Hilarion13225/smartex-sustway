# SMARTEX SUSTWAY — Audit P1

> **Étape strictement READ-ONLY.** Aucun fichier du frontend, du backend, de la base, des
> migrations, des référentiels, du scoring, de l'IA, de l'authentification ou des permissions
> n'a été modifié. Aucun composant créé, aucune route touchée.
>
> Point de départ : les **11 problèmes non-P0** de `smartex-ux-audit.md`, revérifiés dans le
> code après l'implémentation P0.

---

# 1. Ce que la vérification post-P0 a changé

La relecture du code a **infirmé quatre constats** de l'audit initial et en a **révélé un
nouveau**. Le classement qui suit repose sur le code d'aujourd'hui, pas sur l'ancien audit.

| Constat de l'audit | Vérification |
|---|---|
| **m-1** — « les filtres de `AuditsListe` ne sont pas exposés » | **FAUX.** `AuditsListe.jsx:132` porte `changerStatut()`, qui met à jour l'état **et** l'URL. Un `<select>` lié y donne accès depuis la page. |
| **I-3** — « rien n'explique en quoi les trois pages de plans diffèrent » | **Largement faux.** `PlansAmelioration.jsx:115` dit : *« Distincts des actions correctives, qui répondent aux non-conformités. »* Les trois pages portent des descriptions explicites. |
| **I-1** — « le cycle de vie d'une mission est invisible » | **Partiellement faux.** `SyntheseMission` affiche une jauge et *« X / Y critères évalués »* ; `ClotureMission` est sur l'onglet par défaut avec ses conditions et le nombre de critères renseignés. |
| **I-4** — « le choix du référentiel est mal positionné » | **Résolu par P0.** Le choix à la création est correct ; c'était le second sélecteur, dans l'ex-« Questionnaire », qui brouillait — renommé « Périmètre applicable » par P0-C2. |
| *(nouveau)* | **Le P0 n'est pas allé au bout.** Le fil d'Ariane a été posé sur 2 pages ; **5 pages de portée mission** n'ont toujours que « ← Retour ». |

---

# 2. Fiches par problème

## F-01 — Le fil d'Ariane s'arrête à deux pages

```
ID                 : F-01
Problème           : P0-C3 a posé le Breadcrumb sur AuditDetail et
                     CritereEvaluation. Cinq pages de portée mission ne l'ont
                     pas : AuditScore, NonConformites, Rapports,
                     IndicePreparation, PlanAmeliorationDetail. Elles n'ont
                     qu'un bouton « ← Retour » et ne nomment ni la mission ni
                     l'organisation.
État après P0      : AGGRAVÉ EN VISIBILITÉ — l'incohérence saute aux yeux
                     maintenant que deux pages voisines le portent.
Parcours concerné  : 1 (responsable) — étapes Résultats, Plan, Rapport
Rôle concerné      : RESPONSABLE_ENTREPRISE, SUPER_ADMIN
Impact             : L'utilisateur arrive sur « Non-conformités » sans savoir
                     de quelle mission il s'agit.
Fréquence          : Élevée — ces 5 pages sont la fin de tout parcours d'audit.
Risque             : Lire les écarts d'une mission en croyant lire ceux d'une
                     autre. Le titre est identique d'une mission à l'autre.
Dépendances        : Aucune — le composant existe.
Complexité         : Faible — 5 insertions du même motif.
Priorité proposée  : P1
Justification      : P1-B et P1-D. Achève le travail P0 et supprime
                     l'incohérence qu'il a créée.
Action recommandée : Étendre Breadcrumb aux 5 pages.
```

## F-02 — Trois pages confondent « aucune donnée » et « erreur »

```
ID                 : F-02   (ex I-5)
Problème           : Journal, PipelineIA et RapportsEntreprise avalent leurs
                     erreurs. Vérifié :
                       Journal.jsx:48            .catch(() => setFinAtteinte(true))
                       PipelineIA.jsx:31,41      .catch(() => [])  et  catch {}
                       RapportsEntreprise.jsx:31 .catch(() => setAudits([]))
                     Aucune des trois ne rend d'Alerte.
État après P0      : INCHANGÉ
Parcours concerné  : 1 et 3
Rôle concerné      : Tous — Journal et Pipeline touchent l'administration
Impact             : Une API en échec affiche « aucune donnée ». L'utilisateur
                     conclut qu'il n'a ni rapport, ni analyse, ni journal.
Fréquence          : Faible en nominal, décisive en incident.
Risque             : Le plus élevé du lot. RapportsEntreprise dirait « aucun
                     rapport » alors que les rapports existent — on croit un
                     travail perdu.
Dépendances        : Aucune — Alerte existe et est utilisée partout ailleurs.
Complexité         : Faible — un état d'erreur par page, motif déjà répandu.
Priorité proposée  : P1
Justification      : P1-B, cas le plus net : « croire qu'une action est
                     terminée alors qu'elle ne l'est pas », ou l'inverse.
Action recommandée : Ajouter setErreur + <Alerte ton="rouge"> sur les 3.
```

## F-03 — Une URL erronée éjecte hors de l'application

```
ID                 : F-03   (ex M-2)
Problème           : App.jsx:132 — <Route path="*" element={<Navigate to="/" />}.
                     Une URL inconnue sous /app renvoie à la vitrine.
État après P0      : INCHANGÉ
Parcours concerné  : Tous
Rôle concerné      : Tous
Impact             : Un lien périmé, un identifiant erroné, une mission
                     supprimée : l'utilisateur se retrouve sur la page
                     commerciale sans explication, et doit refaire son chemin.
Fréquence          : Moyenne — d'autant que 9 routes portent des paramètres.
Risque             : Croire s'être déconnecté.
Dépendances        : Aucune.
Complexité         : Faible — une page, une route.
Priorité proposée  : P1
Justification      : P1-B et P1-D. Une sortie silencieuse de l'espace de
                     travail est une rupture de parcours.
Action recommandée : Page 404 dans le Layout ; réserver la vitrine au hors-/app.
```

## F-04 — Deux pages homonymes, deux portées

```
ID                 : F-04   (ex I-2)
Problème           : NonConformites.jsx:52 et NonConformitesEntreprise.jsx:81
                     portent le même titre « Non-conformités ». Rapports.jsx
                     dit « Rapports », RapportsEntreprise « Rapports RSE » —
                     rien ne dit laquelle agrège.
État après P0      : INCHANGÉ
Parcours concerné  : 1
Rôle concerné      : RESPONSABLE_ENTREPRISE, SUPER_ADMIN
Impact             : On ne sait pas si l'on regarde une mission ou toutes.
Fréquence          : Moyenne.
Risque             : Compter les écarts d'une mission pour ceux de toutes.
Dépendances        : F-01 — le fil d'Ariane sur NonConformites et Rapports
                     répond déjà en grande partie à la question.
Complexité         : Très faible — sous-titres.
Priorité proposée  : P1
Justification      : P1-B, et surtout : F-01 le règle presque entièrement.
                     Les traiter ensemble coûte quelques lignes.
Action recommandée : À traiter avec F-01. Sous-titre de portée sur les 4 pages.
```

## F-05 — Aucun rappel de l'organisation sur les pages de mission

```
ID                 : F-05   (ex M-4)
Problème           : Aucune page de mission ne nomme l'organisation. Le
                     contexte vient d'un sélecteur de la sidebar.
État après P0      : PARTIELLEMENT TRAITÉ — le fil d'Ariane nomme la mission
                     sur 2 pages, jamais l'organisation.
Parcours concerné  : 1 et 3
Rôle concerné      : SUPER_ADMIN surtout — c'est lui qui change d'organisation
Impact             : Sur un compte multi-organisations, rien ne confirme
                     laquelle est active.
Fréquence          : Élevée pour SUPER_ADMIN, nulle en mono-organisation.
Risque             : Agir sur la mauvaise organisation.
Dépendances        : F-01 — le fil peut porter l'organisation en tête.
Complexité         : Faible si traité avec F-01.
Priorité proposée  : P2
Justification      : Réel, mais F-01 en absorbe l'essentiel. Le reste est un
                     confort, sans blocage.
Action recommandée : Reporter ; réévaluer après F-01.
```

## F-06 — Le parcours de mission n'est pas nommé bout en bout

```
ID                 : F-06   (ex I-1)
Problème           : Aucune vue des 7 étapes métier. La mission ne dit pas
                     dans quelle phase elle est.
État après P0      : LARGEMENT COUVERT, et mon audit l'avait surestimé :
                       SyntheseMission  — jauge + « X / Y critères évalués »
                       ClotureMission   — sur l'onglet par défaut, avec ses
                                          conditions et renseignes/total
                       7 onglets nommés — Vue d'ensemble → Plans d'amélioration
Parcours concerné  : 1
Rôle concerné      : RESPONSABLE_ENTREPRISE
Impact             : Faible. « Ce qui est fait / ce qui reste » est répondu.
Fréquence          : —
Risque             : Faible.
Dépendances        : Aucune.
Complexité         : Moyenne — un composant nouveau, 7 états dérivés.
Priorité proposée  : P2
Justification      : Ne remplit aucun critère P1 après vérification. Aide à la
                     compréhension, pas déblocage.
Action recommandée : Reporter.
```

## F-07 — Les trois pages de plans, côte à côte dans le menu

```
ID                 : F-07   (ex I-3)
Problème           : « Actions correctives », « Plans d'amélioration » et
                     « Mes actions » se suivent sans que le menu explique la
                     différence.
État après P0      : LARGEMENT RÉSOLU — chaque page se présente :
                       PlanActions:161      « actions issues des non-conformités »
                       PlansAmelioration:115 « Distincts des actions correctives »
                       MesActions:95        « dont vous êtes responsable »
Parcours concerné  : 1
Rôle concerné      : RESPONSABLE_ENTREPRISE, COLLABORATEUR
Impact             : Faible — un clic suffit à comprendre.
Fréquence          : Faible — la distinction s'apprend une fois.
Risque             : Faible.
Dépendances        : Aucune.
Complexité         : Très faible.
Priorité proposée  : P2
Justification      : Le doute se lève au premier clic. Pas P1-C : la
                     fonctionnalité n'est pas difficile à utiliser.
Action recommandée : Reporter — préciser les libellés du menu en P2.
```

## F-08 — La file des décisions humaines en attente n'existe pas

```
ID                 : F-08
Problème           : Aucun écran ne répond à « qu'est-ce qui attend mon
                     intervention ? ». PipelineIA:92 montre l'avancement par
                     mission, pas les évaluations EN_REVUE à trancher.
État après P0      : INCHANGÉ — FONCTIONNALITÉ MANQUANTE
Parcours concerné  : 1 — étapes Analyse et Revue
Rôle concerné      : RESPONSABLE_ENTREPRISE, SUPER_ADMIN
Impact             : La revue se fait mission par mission, critère par critère.
Fréquence          : Moyenne.
Risque             : Laisser des évaluations en revue sans le savoir.
Dépendances        : À vérifier — aucun endpoint ne liste les EN_REVUE d'une
                     entreprise. Le construire côté client coûte une requête
                     par mission.
Complexité         : Moyenne à élevée.
Priorité proposée  : P2
Justification      : Vrai besoin, mais le dashboard signale déjà « N critères
                     encore à évaluer ». Et le coût dépend d'une vérification
                     API non faite. Classer P1 serait s'engager à l'aveugle.
Action recommandée : Reporter ; vérifier d'abord l'existence d'un endpoint.
```

## F-09 — Pas d'étape de préparation de mission

```
ID                 : F-09
Problème           : Le parcours cible prévoit une préparation entre
                     configuration et évaluation. Elle n'existe pas.
État après P0      : INCHANGÉ — FONCTIONNALITÉ MANQUANTE
Parcours concerné  : 1 — étape 7
Rôle concerné      : RESPONSABLE_ENTREPRISE
Impact             : Faible — AuditDetail permet déjà de configurer les sites
                     et le périmètre avant de saisir.
Fréquence          : Une fois par mission.
Risque             : Faible.
Dépendances        : Demanderait de statuer sur ce que « préparer » recouvre.
Complexité         : Élevée — définition métier avant tout.
Priorité proposée  : P3
Justification      : Ne bloque rien. Relève d'une décision métier, pas d'une
                     correction UX.
Action recommandée : Reporter.
```

## F-10 — Pas de tableau de bord propre au SUPER_ADMIN

```
ID                 : F-10
Problème           : Le SUPER_ADMIN voit le même tableau de bord que le
                     responsable, dépendant de l'organisation sélectionnée.
État après P0      : INCHANGÉ — FONCTIONNALITÉ MANQUANTE
Parcours concerné  : 3
Rôle concerné      : SUPER_ADMIN
Impact             : Moyen — la supervision se fait organisation par
                     organisation.
Fréquence          : Élevée pour ce rôle, mais le rôle est rare.
Risque             : Faible — Classement et Comparaison offrent déjà une vue
                     transverse.
Dépendances        : TableauDeBord charge déjà 4 requêtes par mission ; une vue
                     globale multiplierait ce coût.
Complexité         : Élevée.
Priorité proposée  : P2
Justification      : Vrai manque, mais aucun blocage : les données transverses
                     sont accessibles autrement.
Action recommandée : Reporter.
```

## F-11 — Cinq redirections de vitrine

```
ID                 : F-11   (ex M-1)
Problème           : /accueil, /a-propos, /avantages, /engagement, /deploiement
                     redirigent vers d'autres pages.
État après P0      : INCHANGÉ
Impact             : Nul sur l'usage — c'est leur rôle.
Priorité proposée  : P3
Justification      : Aucun critère P1. Elles préservent des liens existants.
Action recommandée : Laisser ; arbitrer quand la vitrine sera stabilisée.
```

## F-12 — `ImportReferentiel` sur deux routes

```
ID                 : F-12   (ex M-3)
Problème           : referentiels/import et /import/:importId rendent le même
                     composant.
État après P0      : INCHANGÉ
Rôle concerné      : SUPER_ADMIN
Impact             : Faible — App.jsx:126 documente l'ordre des routes ; le
                     composant distingue les deux cas par la présence du
                     paramètre.
Priorité proposée  : P3
Justification      : C'est un motif courant (création / reprise), pas un défaut.
Action recommandée : Laisser.
```

## F-13 — Filtres de `AuditsListe`

```
ID                 : F-13   (ex m-1)
Problème allégué   : « L'utilisateur ne peut pas passer d'un filtre à l'autre
                     sans repasser par le menu. »
État après P0      : DÉJÀ CORRIGÉ — le constat était faux.
                     AuditsListe.jsx:132 changerStatut() met à jour l'état ET
                     l'URL (setParametres avec replace), et un <select> lié y
                     donne accès depuis la page.
Priorité           : DÉJÀ CORRIGÉ
Action recommandée : Aucune. Rectification portée au présent document.
```

## F-14 — `Classement` et `ComparaisonEntreprises` sans contexte d'usage

```
ID                 : F-14   (ex m-2)
Problème           : Deux pages globales dont rien ne dit à quel moment elles
                     servent.
État après P0      : INCHANGÉ
Impact             : Faible — elles fonctionnent et sont nommées clairement.
Priorité proposée  : P3
Justification      : Préférence d'organisation, pas gêne d'usage. Leur place se
                     décidera à l'usage réel.
Action recommandée : Laisser.
```

## F-15 — Le choix du référentiel

```
ID                 : F-15   (ex I-4)
Problème allégué   : « Deux endroits, deux logiques » pour choisir le
                     référentiel.
État après P0      : RÉSOLU PAR P0 — le choix à la création
                     (NouvelAuditFormulaire) est le bon endroit ; le second
                     sélecteur appartenait à l'ex-« Questionnaire », renommé
                     « Périmètre applicable » et doté d'un renvoi explicite
                     vers les missions.
Priorité           : DÉJÀ CORRIGÉ
Action recommandée : Aucune.
```

---

# 3. Vérifications complémentaires — parcours par parcours

Points du § 7 du brief non couverts par l'audit initial, vérifiés dans le code.

| Point | Constat | Verdict |
|---|---|---|
| **Feedback après action** | `SaisieCritereMission:193-231` — `setErreur` en cas d'échec, `brouillonEnregistre` avec effacement à 2,5 s, `setDernierEnregistrement` qui alimente `CarteReprise`. | **Aucun manque** |
| **Reprise d'un travail interrompu** | `CarteReprise` dans `PanneauAnalyseIa:44` · `ListeCriteres` coche les critères renseignés · `EnTeteDomaine` montre la progression du domaine. | **Aucun manque** |
| **Navigation critères** | `NavigationCritere` (précédent / suivant + barre) · `ListeCriteres` (saut direct) · P0 a ajouté le lien vers la fiche détaillée. | **Aucun manque** |
| **Prochaine action, fin de mission** | `ClotureMission` sur l'onglet par défaut, avec `conditions.cloturable`, `renseignes/total` et un texte qui distingue analyser de clôturer. | **Aucun manque** |
| **États IA** | `PanneauAnalyseIa`, `CarteAnalyseIa`, `TracabiliteIa`, `Rectification` · statuts `PROVISOIRE` / `EN_REVUE` / `VALIDEE`. | **Aucun manque** |
| **Actions principales** | `btn-primary` réservé à l'action dominante sur les pages vérifiées. | **Aucun manque** |
| **Système de notification global** | Aucun toast. Chaque page gère son propre retour via `Alerte`. | **Cohérent — pas un manque** |

---

# 4. Matrice de priorisation

| ID | Problème | Rôle | Parcours | Impact | Risque | Complexité | Priorité |
|---|---|---|---|---|---|---|---|
| **F-01** | Fil d'Ariane absent sur 5 pages de mission | RESP, ADMIN | 1 | Élevé | Élevé | Faible | **P1** |
| **F-02** | Erreur confondue avec absence de données | Tous | 1, 3 | Élevé | Élevé | Faible | **P1** |
| **F-03** | URL inconnue éjecte vers la vitrine | Tous | Tous | Moyen | Moyen | Faible | **P1** |
| **F-04** | Deux pages homonymes, deux portées | RESP, ADMIN | 1 | Moyen | Moyen | Très faible | **P1** |
| F-05 | Organisation non rappelée | ADMIN | 1, 3 | Moyen | Moyen | Faible | P2 |
| F-06 | Parcours de mission non nommé | RESP | 1 | Faible | Faible | Moyenne | P2 |
| F-07 | Trois pages de plans dans le menu | RESP, COLLAB | 1 | Faible | Faible | Très faible | P2 |
| F-08 | File de revue — **manquante** | RESP, ADMIN | 1 | Moyen | Moyen | Moy./Élevée | P2 |
| F-10 | Dashboard SUPER_ADMIN — **manquant** | ADMIN | 3 | Moyen | Faible | Élevée | P2 |
| F-09 | Étape de préparation — **manquante** | RESP | 1 | Faible | Faible | Élevée | P3 |
| F-11 | Redirections de vitrine | — | — | Nul | Nul | Très faible | P3 |
| F-12 | `ImportReferentiel` sur deux routes | ADMIN | 3 | Faible | Faible | Faible | P3 |
| F-14 | `Classement` / `Comparaison` sans contexte | RESP, ADMIN | — | Faible | Faible | Faible | P3 |
| F-13 | Filtres de `AuditsListe` | RESP | 1 | — | — | — | **DÉJÀ CORRIGÉ** |
| F-15 | Choix du référentiel | RESP | 1 | — | — | — | **DÉJÀ CORRIGÉ** |

---

# 5. Classement final

```
P1 — maintenant
  F-01  Étendre le fil d'Ariane aux 5 pages de mission
  F-02  États d'erreur sur Journal, PipelineIA, RapportsEntreprise
  F-03  Page 404 dans l'espace applicatif
  F-04  Nommer la portée des pages homonymes

P2 — après stabilisation
  F-05  Rappel de l'organisation
  F-06  Parcours de mission en 7 étapes
  F-07  Libellés du menu des plans
  F-08  File des décisions en attente          [FONCTIONNALITÉ MANQUANTE]
  F-10  Tableau de bord SUPER_ADMIN            [FONCTIONNALITÉ MANQUANTE]

P3 — plus tard
  F-09  Étape de préparation de mission         [FONCTIONNALITÉ MANQUANTE]
  F-11  Redirections de vitrine
  F-12  ImportReferentiel sur deux routes
  F-14  Place de Classement et Comparaison

DÉJÀ CORRIGÉ
  F-13  Filtres de AuditsListe   (constat initial erroné)
  F-15  Choix du référentiel     (résolu par P0-C2)
```

---

# 6. Pourquoi ces quatre-là, et pas davantage

Le brief demande **le minimum nécessaire pour une expérience solide**, pas le maximum de
corrections. Quatre retenues sur quinze, pour trois raisons.

**Elles partagent une même nature : l'utilisateur ne sait pas où il est, ni si ce qu'il voit
est vrai.** F-01 et F-04 répondent à « de quelle mission s'agit-il ? ». F-02 à « est-ce vide,
ou cassé ? ». F-03 à « pourquoi suis-je sorti de l'application ? ».

**Elles coûtent peu et ne risquent presque rien.** Aucune ne touche une API, une permission
ou un statut. F-01 et F-04 réutilisent un composant livré au P0. F-02 applique un motif déjà
présent partout ailleurs. F-03 ajoute une route sans en modifier aucune.

**Les autres ne bloquent rien.** Après vérification, quatre constats de l'audit initial se
sont révélés faux ou déjà traités. Les manques réels — file de revue, dashboard de
supervision, étape de préparation — sont des fonctionnalités à concevoir, pas des frictions à
lever. Les classer P1 reviendrait à retarder une mise en service que rien n'empêche.

---

# 7. Rapport

```text
P0 : VALIDÉ
P1 : 4 corrections
P2 : 5 corrections
P3 : 4 corrections
Déjà corrigé : 2
Hors périmètre : 0

Verdict :
READY_FOR_UX_P1_IMPLEMENTATION
```

> **Une réserve maintenue depuis le rapport P0** : le projet n'a aucun test frontend, et
> l'application n'a jamais été ouverte dans un navigateur au cours de ces phases. Le build et
> le lint passent ; le rendu n'a pas été observé. Une passe manuelle sur les trois parcours
> reste nécessaire, et elle pourrait faire apparaître des problèmes qu'aucune lecture de code
> ne révèle.

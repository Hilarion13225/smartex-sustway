# SMARTEX SUSTWAY — P4.1, source unique des statuts

**Date** : 2026-09-16 · **Périmètre** : `frontend-react/src` — 1 fichier créé, 12 modifiés

```text
PHASE UX P4.1 — SOURCE UNIQUE DES STATUTS

Verdict :
READY_FOR_P4_2
```

---

# 1. Objectif

Supprimer la dispersion des correspondances **statut métier → ton visuel**, que
l'audit P4 avait classée comme le premier problème IMPORTANT du Design System,
et résoudre la divergence qu'elle avait déjà produite sur le statut `ARCHIVE`.

La règle appliquée, reprise du brief : **une source unique lorsqu'une convention
visuelle est réellement commune, des constantes locales lorsqu'une différence
est intentionnelle.**

---

# 2. État avant

Inventaire exhaustif obtenu par extraction du contenu de chaque déclaration, et
non par comparaison de noms.

```
39 déclarations   dans 24 fichiers
33 contenus distincts
 6 contenus présents en plusieurs exemplaires
```

| Contenu | Copies | Fichiers |
|---|---|---|
| `{ FAIBLE:neutre, MOYENNE:bleu, ELEVEE:ambre, CRITIQUE:rouge }` | **3** | `CritereEvaluation:37`, `Questionnaire:11`, `ReferentielDetail:14` |
| Niveau de non-conformité `{ MINEURE:neutre, MODEREE:bleu, MAJEURE:ambre, CRITIQUE:rouge }` | **3** | `NonConformites:12`, `NonConformitesEntreprise:13`, `VoletPlanAction:8` (mêmes paires, ordre des clés différent) |
| `{ OUVERTE:rouge, EN_TRAITEMENT:ambre, CLOTUREE:vert }` | **2** | `NonConformites:13`, `NonConformitesEntreprise:14` |
| `{ BROUILLON:neutre, EN_COURS:bleu, TERMINE:vert, ANNULE:neutre }` | **2** | `TableMissions:7`, `RapportsEntreprise:10` |
| `STATUTS` de projet (`ton` + `libelle`, 4 clés) | **2** | `Projets:9`, `ProjetDetail:10` |
| `[COULEURS.rouge, COULEURS.ambre, '#eab308', COULEURS.gris]` | **2** | `AuditScore:22`, `NonConformitesEntreprise:12` |

Plus **une divergence réelle** et **un doublon non inventorié** — voir § 6 et § 5.

## État après

```
24 déclarations locales   (−15)
23 contenus distincts     (−10)
 1 contenu encore en plusieurs exemplaires
```

Le seul doublon restant est le tableau de couleurs de graphique
`[COULEURS.rouge, COULEURS.ambre, '#eab308', COULEURS.gris]`. Il relève de
**P4.3 — palette de graphique**, explicitement hors du périmètre de cette
étape : **laissé intact**.

---

# 3. Constantes centralisées

Fichier créé : **`src/lib/tonsStatuts.js`**.

**Emplacement** : `src/lib/` plutôt que `src/constants/`, pour rester cohérent
avec l'architecture existante — `scoreAffiche.js`, `plansAction.js`,
`indiceBailleur.js`, `formules.js` y vivent déjà, et le projet est nommé en
français. Créer `src/constants/` aurait ajouté une convention concurrente.

**Aucun import dans ce module** : il ne peut donc pas introduire de cycle.

| Constante | Clés | Remplace |
|---|---|---|
| `TONS_CRITICITE` | FAIBLE, MOYENNE, ELEVEE, CRITIQUE | 3 copies |
| `TONS_NIVEAU_NON_CONFORMITE` | MINEURE, MODEREE, MAJEURE, CRITIQUE | 3 copies |
| `TONS_STATUT_NON_CONFORMITE` | OUVERTE, EN_TRAITEMENT, CLOTUREE | 2 copies |
| `TONS_STATUT_MISSION` | BROUILLON, EN_COURS, TERMINE, ANNULE | 2 copies |
| `TONS_STATUT_REFERENTIEL` | ACTIF, INACTIF, SUSPENDU, ARCHIVE | 2 copies **divergentes** |
| `STATUTS_PROJET` | BROUILLON, EN_COURS, CLOTURE, ARCHIVE (`ton` + `libelle`) | 2 copies |
| `TONS_PRIORITE_ACTION` | BASSE, MOYENNE, HAUTE, CRITIQUE | 2 copies, dont une hors inventaire |

**7 constantes pour 16 déclarations supprimées.**

Aucune abstraction générique n'a été créée : pas de `getColorForAnything`, pas
de registre indexé par nom d'énumération. Chaque constante nomme son domaine, et
les clés restent celles de l'API.

## Migration sans toucher aux points d'usage

Les imports emploient des alias reprenant le nom local d'origine :

```js
import { TONS_STATUT_REFERENTIEL as TONS_STATUT } from '../lib/tonsStatuts';
```

Conséquence : **aucune ligne de rendu n'a été modifiée.** Les 8 usages de
`TONS_CRITICITE[...]`, les 8 de `TONS_NIVEAU[...]` et les autres sont inchangés,
ce qui réduit d'autant la surface de régression.

---

# 4. Fichiers migrés

| Fichier | Déclarations retirées | Constantes importées |
|---|---|---|
| `pages/CritereEvaluation.jsx` | 1 | `TONS_CRITICITE` |
| `pages/Questionnaire.jsx` | 1 | `TONS_CRITICITE` |
| `pages/ReferentielDetail.jsx` | 2 | `TONS_CRITICITE`, `TONS_STATUT_REFERENTIEL` |
| `pages/NonConformites.jsx` | 3 | `TONS_NIVEAU_NON_CONFORMITE`, `TONS_STATUT_NON_CONFORMITE`, `TONS_PRIORITE_ACTION` |
| `pages/NonConformitesEntreprise.jsx` | 2 | `TONS_NIVEAU_NON_CONFORMITE`, `TONS_STATUT_NON_CONFORMITE` |
| `pages/RapportsEntreprise.jsx` | 1 | `TONS_STATUT_MISSION` |
| `pages/ReferentielsListe.jsx` | 1 | `TONS_STATUT_REFERENTIEL` |
| `pages/Projets.jsx` | 1 | `STATUTS_PROJET` |
| `pages/ProjetDetail.jsx` | 1 | `STATUTS_PROJET` |
| `components/audit/VoletPlanAction.jsx` | 1 | `TONS_NIVEAU_NON_CONFORMITE` |
| `components/tableau-bord/TableMissions.jsx` | 1 | `TONS_STATUT_MISSION` |
| `lib/plansAction.js` | 1 | réexporte `TONS_PRIORITE_ACTION` sous `TON_PRIORITE` |

**11 fichiers importent `tonsStatuts`**, plus `plansAction.js` qui le réexporte.

---

# 5. Constantes conservées localement

## Conservées avec justification explicite

| Constante | Fichier | Pourquoi |
|---|---|---|
| **`TONS_NIVEAU_RG26`** | `CritereEvaluation:835` (désormais :829) | **Divergence voulue et documentée dans le code** : « Le rouge est réservé à ce bloc, parce qu'il porte un fait établi ». Le risque métier RG26 emploie les mêmes noms d'énumération qu'une non-conformité sur une échelle plus sévère. Voir § 7 |
| `TONS_NIVEAU` | `components/EnTeteApp.jsx:38` | **Espace de valeurs différent** : `bg-brand-600`, `bg-amber-500` — ce sont des classes de fond pour des pastilles, pas des tons de `Badge`. Mêmes clés, autre usage |
| `TONS_RISQUE` | `SyntheseMission.jsx:8` | Structure `{ point, libelle }` propre à la jauge, usage unique |
| `TONS` | `components/ui.jsx:50` | **C'est la définition des tons eux-mêmes**, le socle que `tonsStatuts` alimente. Sa place est dans `ui.jsx` |
| `COULEURS_NC` / `COULEURS_NIVEAU` | `AuditScore:22`, `NonConformitesEntreprise:12` | Doublon réel, mais **couleurs de graphique** — relève de **P4.3**, hors périmètre |

## Conservées parce qu'à usage unique

Le brief interdit la sur-centralisation : une correspondance employée par un seul
écran reste près de son usage. Treize déclarations sont dans ce cas.

`AxesAmelioration` (statut d'axe) · `VoletVersions` (statut de version) ·
`Abonnement` (abonnement, paiement) · `AuditsListe` (options de filtre) ·
`CritereEvaluation` (statut d'évaluation, couverture, présence) ·
`Documents` (analyse antivirus) · `ImportReferentiel` (statut d'import) ·
`Inscription` (force du mot de passe) · `Journal` (type d'entité) ·
`PlanActions` (liste de statuts) · `ProjetDetail` (libellés de mission) ·
`Rapports` (format de fichier) · `ReferentielsListe` (liste de statuts).

**Candidat pour plus tard** : `TONS_STATUT_EVAL`
(`PROVISOIRE` / `EN_REVUE` / `VALIDEE`) est un statut de domaine central mais
n'a aujourd'hui qu'un seul consommateur. Le centraliser maintenant serait
anticiper un besoin qui n'existe pas.

---

# 6. Cas `ARCHIVE`

## La divergence

```
pages/ReferentielDetail.jsx:13   ARCHIVE: 'rouge'
pages/ReferentielsListe.jsx:28   ARCHIVE: 'neutre'
```

Un référentiel archivé s'affichait **en rouge dans sa fiche, en gris dans la
liste**. Les trois autres valeurs (`ACTIF`, `INACTIF`, `SUSPENDU`) concordaient.

## Comment la valeur retenue a été choisie

Plutôt que de trancher au jugé, j'ai relevé **tous** les usages du même état
dans l'interface, y compris dans les fichiers `.js` que mon inventaire P4 avait
manqués :

| Emplacement | Ton |
|---|---|
| `pages/Projets.jsx` — `ARCHIVE` d'un projet | `neutre` |
| `pages/ProjetDetail.jsx` — `ARCHIVE` d'un projet | `neutre` |
| `pages/ReferentielsListe.jsx` — `ARCHIVE` d'un référentiel | `neutre` |
| `lib/plansAction.js:107` — `ARCHIVE` d'un plan | `neutre` |
| `components/referentiel/VoletVersions.jsx:33` — `ARCHIVEE` d'une version | `neutre` |
| **`pages/ReferentielDetail.jsx`** | **`rouge`** |

**Cinq usages contre un.** La valeur retenue est **`neutre`**.

Le raisonnement figure dans le code : un référentiel archivé est un état de fin
de vie, pas un incident, et le rouge reste réservé à ce qui appelle une action —
`OUVERTE` pour une non-conformité, `INFECTE` pour un document, `ECHEC` pour un
import. `lib/plansAction.js` tenait déjà le même raisonnement pour les plans :
« CLOTURE et ARCHIVE gèlent tous deux le plan […] les tons les distinguent ».

**Effet visible** : sur la seule fiche de référentiel, le badge `ARCHIVE` passe
du rouge au gris. C'est le seul changement de rendu de toute l'étape P4.1.

**Aucun statut backend n'a été touché** : `ARCHIVE` reste `ARCHIVE` côté API et
côté base.

## Un doublon découvert hors inventaire

L'inventaire P4 ne balayait que les fichiers `.jsx`. En vérifiant `ARCHIVE`,
j'ai trouvé que **`lib/plansAction.js:128` déclarait `TON_PRIORITE` à
l'identique de `NonConformites.jsx:14`** — mêmes clés, mêmes tons, même champ
`action.priorite` rendu dans un `Badge`.

Trois consommateurs (`CarteActionPlan`, `MesActions`, `NonConformites`) pour
deux sources. Consolidé : la constante vit désormais dans `tonsStatuts.js`, et
`plansAction.js` la réexporte sous son nom historique — **ses deux appelants
existants n'ont pas été modifiés.**

C'est une correction au-delà de l'inventaire P4, mais strictement dans l'objet
de P4.1. Je la signale pour que vous puissiez l'écarter si vous préférez.

---

# 7. `TONS_NIVEAU_RG26`

**Intact.** Vérifié : 2 occurrences (déclaration + usage) dans 1 seul fichier,
`pages/CritereEvaluation.jsx`, inchangées.

```js
const TONS_NIVEAU_RG26 = { MINEURE: 'neutre', MODEREE: 'ambre', MAJEURE: 'rouge', CRITIQUE: 'rouge' };
```

La documentation qui l'accompagne dans le code explique pourquoi cette échelle
diffère de celle des non-conformités, et cette justification n'a pas été
déplacée. La constante centralisée `TONS_NIVEAU_NON_CONFORMITE` renvoie
d'ailleurs explicitement vers elle, pour que la prochaine personne qui verra les
deux comprenne que la différence est voulue.

---

# 8. Vérifications statiques

| Contrôle | Avant | Après |
|---|---|---|
| Déclarations locales de statut | **39** | **24** |
| Contenus distincts | 33 | 23 |
| Contenus en plusieurs exemplaires | **6** | **1** (couleurs de graphique, P4.3) |
| Copies de `TONS_CRITICITE` | 3 | **0** |
| Copies du niveau de non-conformité | 3 | **0** |
| Copies du statut de non-conformité | 2 | **0** |
| Copies du statut de mission | 2 | **0** |
| Copies du statut de référentiel | 2 **divergentes** | **0** |
| Copies des statuts de projet | 2 | **0** |
| Copies de la priorité d'action | 2 | **0** |
| `ARCHIVE: 'rouge'` | 1 | **0** |
| `TONS_NIVEAU_RG26` | 1 fichier | **1 fichier, inchangé** |
| Fichiers important `tonsStatuts` | — | **11** (+ 1 réexportation) |

---

# 9. Build / lint / tests

| Contrôle | Résultat |
|---|---|
| `npx vite build` | **BUILD=0** |
| `npm run lint` | **0 erreur** ; 1 avertissement, `Landing.jsx:19` — **préexistant**, fichier non touché |
| Tests frontend | **AUCUN** — `package.json` n'expose que `dev`, `build`, `lint`, `preview`. Pas de suite de tests à exécuter, ce qui est cohérent avec toutes les phases précédentes |
| Imports circulaires | **impossible** — `tonsStatuts.js` n'importe rien ; le build aurait signalé un cycle |

---

# 10. Fichiers modifiés

**Créé (1)**

- `src/lib/tonsStatuts.js` — 7 constantes, aucune dépendance

**Modifiés (12)**

```
 src/components/audit/VoletPlanAction.jsx        |  2 +-
 src/components/tableau-bord/TableMissions.jsx   | 11 ++----
 src/lib/plansAction.js                          |  7 +---
 src/pages/CritereEvaluation.jsx                 |  2 +-
 src/pages/NonConformites.jsx                    |  8 ++--
 src/pages/NonConformitesEntreprise.jsx          |  7 ++--
 src/pages/ProjetDetail.jsx                      |  7 +---
 src/pages/Projets.jsx                           |  7 +---
 src/pages/Questionnaire.jsx                     |  2 +-
 src/pages/RapportsEntreprise.jsx                |  2 +-
 src/pages/ReferentielDetail.jsx                 |  3 +-
 src/pages/ReferentielsListe.jsx                 |  2 +-
```

Aucun composant créé. Aucune page renommée, fusionnée ou supprimée.

---

# 11. Régressions potentielles

## Contrôles passés

| Contrôle | Résultat |
|---|---|
| Appels API | `git diff` filtré sur `api.get\|post\|put\|delete\|patch` → **0 ligne** |
| Routes | `App.jsx` : 4 lignes, toutes de P1.4 — **rien de P4.1** |
| Auth | `git diff src/auth/` → **vide** |
| Backend | aucun fichier `api-quarkus/` touché |
| Base de données | aucune requête, aucune migration |
| Configuration | `tailwind.config.js`, `vite.config.js`, `package.json`, `docker-compose.yml` → **vides** |
| Logique métier | aucune condition, aucun calcul modifié — seules des déclarations de constantes ont bougé |

## Ce qui reste à surveiller au navigateur

| Risque | Où regarder |
|---|---|
| **Changement de rendu voulu** : `ARCHIVE` passe du rouge au gris | Fiche d'un référentiel archivé |
| Un alias d'import mal posé rendrait `undefined` → le badge retomberait sur `'neutre'` **sans erreur visible** | Les 8 états couverts : criticité, niveau et statut de non-conformité, statut de mission, statut de référentiel, statut de projet, priorité d'action |
| `plansAction.js` réexporte désormais `TON_PRIORITE` | `CarteActionPlan`, `MesActions`, et la page Non-conformités |

Le repli `?? 'neutre'` présent sur chaque usage garantit qu'aucune erreur ne
sera levée en cas d'erreur d'alias — **c'est précisément pourquoi une
vérification visuelle reste nécessaire** : la panne serait silencieuse.

---

# 12. Conclusion

La dispersion identifiée comme le premier problème IMPORTANT du Design System
est résorbée : **39 déclarations ramenées à 24, six groupes de doublons ramenés
à un seul**, et celui qui subsiste appartient à P4.3.

La divergence `ARCHIVE` est corrigée dans le sens que les données imposaient —
cinq usages disaient `neutre`, un seul disait `rouge`. C'est le seul changement
de rendu de l'étape.

Les cas spécifiques sont préservés avec leur justification : `TONS_NIVEAU_RG26`
est intact, et les treize correspondances à usage unique restent près de leur
écran, conformément à la consigne de ne pas sur-centraliser.

Un doublon hors inventaire a été trouvé et consolidé — `TON_PRIORITE`, que mon
audit P4 avait manqué faute de balayer les fichiers `.js`. C'est une correction
en plus de ce qui était prévu ; elle est signalée au § 6 pour que vous puissiez
l'écarter.

```text
Verdict : READY_FOR_P4_2

Déclarations      : 39 → 24   (−15)
Doublons          :  6 → 1    (le dernier relève de P4.3)
Constantes créées :  7
Fichiers migrés   : 12  (+1 créé)
Build             : PASS
Lint              : PASS
Tests             : aucun disponible
Changement de rendu : 1  (ARCHIVE, rouge → gris, fiche de référentiel)
```

---

**Aucun backend, API, base, route, auth, Docker ou configuration modifiés.
Aucun commit, aucun push.**

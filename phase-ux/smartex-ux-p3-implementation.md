# SMARTEX SUSTWAY — Implémentation UX P3

**Date** : 2026-09-16 · **Terme d'interface retenu** : **Organisation**
**Périmètre** : `frontend-react/src` uniquement

```text
PHASE UX P3 — IMPLEMENTATION

P3-1 :
- fichiers :
    src/pages/AuditsListe.jsx
    src/pages/ReferentielsListe.jsx
    src/pages/Classement.jsx
- correction :
    Les trois en-têtes composés à la main (<h1 class="text-2xl font-bold"> + <p>)
    passent au composant PageTitre, qui rend <h1 class="text-xl font-semibold">
    avec son badge d'icône. Les contrôles présents dans la rangée du titre sont
    conservés et déplacés dans la prop `actions` :
      AuditsListe        → bouton « Nouvelle mission »          · icône ClipboardList
      ReferentielsListe  → « Nouveau référentiel » + « Exporter » · icône BookOpen
      Classement         → sélecteur de domaine + « Exporter »    · icône Medal
    Les icônes reprennent celles du menu correspondant. Aucun texte n'est perdu,
    le titre conditionnel de AuditsListe (4 variantes selon le filtre) est
    conservé tel quel.
    TableauDeBord et ProjetDetail ont été laissés de côté volontairement — voir
    « Écarts assumés » plus bas.

P3-2 :
- fichiers :
    src/components/Layout.jsx          (libellés de navigation)
    src/pages/ReferentielsListe.jsx    (titre de page)
    src/pages/Entreprises.jsx          (titre de page, via P3-3)
- correction :
    Menu                        →  nouveau libellé
    ─────────────────────────────────────────────────────────────
    Équipe                      →  Utilisateurs et permissions
    Collecte de preuves  (×2)   →  Bibliothèque documentaire
    Mes documents        (×1)   →  Bibliothèque documentaire
    Comparaison d'entreprises   →  Comparer les organisations
    Abonnement et facturation   →  Abonnement et paiements
    Entreprises et sites        →  Organisations et sites

    Deux écarts ont été résolus du côté de la page plutôt que du menu :
      « Organisations » (menu) → la page s'appelle désormais « Organisations »
      « Référentiels » (menu)  → le titre passe du singulier au pluriel

P3-3 :
- fichiers : 24 fichiers de src/pages et src/components
- correction :
    26 occurrences de deux formules récurrentes :
      « Entreprise introuvable ou non accessible. »  ×18
      « Retour à l'entreprise »                       ×8
    36 chaînes spécifiques (titres, descriptions, boutons, états vides,
    placeholders, sous-titres, options de filtre).
    Aucun identifiant technique modifié : entrepriseId, /api/v1/entreprises,
    RESPONSABLE_ENTREPRISE, les attributs id/htmlFor « entreprise-* », les noms
    de composants et de fonctions sont intacts.

P3-4 :
- fichiers : src/pages/AuditScore.jsx
- correction :
    Largeur mesurée dans le navigateur pour le détail d'une vignette à quatre
    colonnes sur 1440 px : 154 px disponibles.
      248 px → 111 px  « Somme des notes / somme des coefficients » → « Notes / coefficients »
      223 px → 146 px  « Aucune évaluation lancée pour l'instant »   → « Aucune évaluation lancée »
      277 px → 132 px  « Évaluations à valider avant d'entrer dans le score » → « À valider avant le score »
    Le quatrième détail, « Évaluation validée par l'IA » (145 px), tenait déjà :
    il n'a pas été touché.
    `ui.jsx` n'a PAS été modifié : `truncate` reste en place pour toutes les
    StatCard de l'application, donc aucune hauteur de carte ne change ailleurs.
    Les classes de grille sont inchangées — 4 colonnes avec la vignette de revue,
    3 sans, 2 à 768 px, 1 à 390 px, aucun débordement.

Build :
PASS  (npx vite build → BUILD=0)

Lint :
PASS  (npm run lint → 1 avertissement, `Landing.jsx:19`, préexistant et
       sur un fichier non touché)

API/backend :
inchangé — `git diff` filtré sur api.get|post|put|delete|patch : 0 ligne.
Aucun fichier api-quarkus/ touché par P3.

Routes :
inchangées — App.jsx non modifié par P3 (ses 4 lignes datent de P1.4).
Aucun `chemin:` ni `vers:` du Layout modifié : vérifié ligne à ligne sur le diff.

Auth :
inchangée — `git diff src/auth/` vide. Aucun rôle, aucune permission,
aucun appel à `peut()` touché. `RESPONSABLE_ENTREPRISE` intact.

Base de données :
inchangée — aucune requête, aucune migration.

Git :
aucun commit/push. Branche main, HEAD toujours d1b8bb6.

Régressions :
Aucune détectable par les moyens statiques. Détail au § « Contrôles ».

Statut :
READY_FOR_P3_BROWSER_VALIDATION
```

---

## Mesures qui ont guidé les choix

Plutôt que d'estimer, les largeurs ont été mesurées dans le navigateur avec la
police réelle de l'application (canvas `measureText`, pilote Chrome déjà en
place) — aucune modification n'a été nécessaire pour cela.

**Barre latérale — 196 px disponibles par libellé**

| Libellé candidat | Largeur | Retenu |
|---|---|---|
| Bibliothèque documentaire | 180 px | oui |
| Utilisateurs et permissions | 177 px | oui |
| Abonnement et paiements | 176 px | oui |
| Organisations et sites | 145 px | oui |
| **Comparaison d'organisations** | **195 px** | **non — 1 px de marge** |
| **Comparer les organisations** | **184 px** | **oui — 12 px de marge** |

C'est la seule décision où je me suis écarté du remplacement littéral :
« Comparaison d'organisations » tenait à un pixel près, ce qui aurait pu
s'ellipser au moindre changement de police de repli ou de zoom. « Comparer les
organisations » est employé à la fois dans le menu **et** comme titre de page,
donc les deux restent identiques.

**Détail de vignette — 154 px disponibles à quatre colonnes**

Mesure prise sur la page réelle `AuditScore` d'une mission portant un critère
en revue, à 1440 px.

---

## Écarts assumés, et pourquoi

**`TableauDeBord` n'a pas été porté sur `PageTitre`.** Son en-tête est une
salutation — « Bonjour, {prénom} 👋 » — et non le nom d'une page. La différence
est lisible comme telle.

**`ProjetDetail` non plus.** Il rend déjà `text-xl font-semibold`, soit
exactement l'échelle de `PageTitre` ; seul le composant diffère, pas le rendu.
Le porter n'aurait rien changé à l'écran.

**« Grande entreprise » conservé.** `Entreprises.jsx:181` et
`EntrepriseDetail.jsx:30` proposent une *taille* d'entreprise — PME, ETI, Grande
entreprise — qui est une nomenclature INSEE **et** une valeur d'énumération
servie par l'API (`GRANDE_ENTREPRISE`). Ce n'est pas la même notion que
l'organisation cliente. Un remplacement aveugle aurait cassé ce vocabulaire
métier.

**Les adresses d'exemple conservées.** `vous@entreprise.com`,
`collaborateur@entreprise.ci` : ce sont des noms de domaine d'exemple, pas la
notion métier.

**La vitrine et les pages d'authentification n'ont pas été touchées.**
`Landing.jsx`, `PreuveVersVerdict.jsx`, `Inscription.jsx` et `CadreAuth.jsx`
emploient encore « entreprise » dans du texte commercial adressé à des
prospects. Le périmètre de P3 est l'espace connecté, là où l'audit avait
constaté la désorientation. Harmoniser le discours commercial est une décision
éditoriale distincte, que je n'ai pas prise à votre place — c'est le seul point
que je vous signale comme reste à arbitrer.

**« Mes documents » devient « Bibliothèque documentaire » chez le
collaborateur.** Ce n'est pas qu'un alignement de libellé : `Documents.jsx` ne
filtre rien par rôle — vérifié, aucun usage de `roleCourant` — et sa description
dit « tous les documents déposés ». Le libellé « Mes documents » annonçait donc
un contenu personnel que la page ne fournit pas.

---

## Contrôles

| Contrôle | Résultat |
|---|---|
| `npx vite build` | **BUILD=0** |
| `npm run lint` | **1 avertissement**, préexistant, `Landing.jsx:19` |
| `git diff` sur `api.get\|post\|put\|delete\|patch` | **0 ligne** |
| `git diff src/App.jsx` | 4 lignes, toutes de P1.4 — **rien de P3** |
| `git diff src/auth/` | **vide** |
| `git diff api-quarkus/` | inchangé (travaux phase 3D, non touchés) |
| `chemin:` / `vers:` du `Layout` | **identiques** de part et d'autre du diff |
| `permission:` du `Layout` | **aucune** modifiée |
| Imports inutilisés | aucun — `oxlint` vérifie `no-unused-vars` et n'en signale aucun sur les fichiers touchés |
| Composants créés | **aucun** |
| Pages supprimées, fusionnées, renommées | **aucune** |

### Points à regarder en priorité lors de la validation navigateur

1. **Les trois en-têtes portés sur `PageTitre`** — c'est le seul changement
   structurel. Vérifier l'alignement des actions à 1440, 768 et 390 px :
   le sélecteur de domaine de `Classement` est le plus large.
2. **Espacement sous les nouveaux `PageTitre`** — ils apportent `mb-6` à
   l'intérieur de conteneurs en `space-y-5` / `space-y-6`. Les marges verticales
   se fondent en flux normal, donc l'écart ne devrait pas doubler ; à confirmer
   à l'œil.
3. **Titre conditionnel de `AuditsListe`** — les quatre variantes
   (« Missions d'audit », « en cours », « terminées », « à valider »)
   via `?statut=` et la vue « à valider ».
4. **Aucun libellé de menu tronqué**, sur les trois rôles.
5. **Grille des vignettes** — 4 colonnes avec la vignette de revue, 3 sans, et
   les détails désormais entiers.

---

**Aucun commit, aucun push.** Aucune anomalie supplémentaire n'a été corrigée
pendant l'implémentation ; les trois chaînes visibles trouvées en cours de route
(`AuditsListe`, `AuditDetail`, `Documents` / `Utilisateurs`) relevaient de P3-3
et entraient donc dans le périmètre autorisé.

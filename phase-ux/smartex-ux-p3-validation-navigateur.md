# SMARTEX SUSTWAY — Validation navigateur P3

**Date** : 2026-09-16
**Pilote** : Chrome headless 152 via DevTools Protocol
**Rôles** : SUPER_ADMIN, RESPONSABLE_ENTREPRISE, COLLABORATEUR (sessions authentifiées réelles)
**Nature** : validation — aucun fichier, code, API, base, configuration ou paquet
modifié ; aucun commit, aucun push

```text
PHASE UX P3 — VALIDATION NAVIGATEUR

Verdict :
READY_WITH_RESERVES

P3-1 PageTitre :
- AuditsListe      : PASS — h1 20px/600, 1 action, aucun chevauchement,
                      aucun débordement à 1440 / 768 / 390 px
- ReferentielsListe: PASS — h1 20px/600, 2 actions, titre au pluriel,
                      aucun chevauchement à 1440 / 390 px
- Classement       : PASS — h1 20px/600, 2 actions (sélecteur de domaine +
                      Exporter), aucun chevauchement ni débordement à
                      1440 / 1280 / 768 / 390 px. À 390 px le sélecteur passe
                      en pleine largeur et le bouton descend sous lui.

P3-2 Menu / titres :
- PASS sur les six. Libellé de menu et titre de page désormais identiques :
    Organisations               = Organisations
    Référentiels                = Référentiels
    Comparer les organisations  = Comparer les organisations
    Bibliothèque documentaire   = Bibliothèque documentaire
    Utilisateurs et permissions = Utilisateurs et permissions
    Abonnement et paiements     = Abonnement et paiements
- Aucun libellé tronqué, sur aucun des trois rôles, à 1440 ni à 390 px.
- Les infobulles F-07 sont intactes sur les trois arbres de navigation.

P3-3 Terminologie :
- PASS AVEC RÉSERVE. « Organisation » est bien le terme employé pour l'entité
  cliente dans les pages vérifiées. Mais cinq chaînes d'interface ont été
  manquées lors de l'implémentation — voir anomalie 2.
- Les identifiants techniques ne sont PAS exposés incorrectement : les codes
  `entreprise:creer` / `entreprise:modifier` visibles dans la matrice de
  permissions le sont volontairement (Utilisateurs.jsx:343, police monospace
  grise sous le libellé humain), sur une page réservée au SUPER_ADMIN.
- « Grande entreprise » conserve son sens métier : c'est une taille INSEE et
  une valeur d'énumération de l'API, non l'entité cliente.
- Le contenu du référentiel — « Gouvernance d'entreprise », « RSE dans
  l'entreprise », libellés de critères et de non-conformités — est de la
  donnée servie par l'API et n'a pas été touché : correct.
- « Responsable entreprise » conservé, adossé au rôle RESPONSABLE_ENTREPRISE
  que la consigne interdit de renommer.

P3-4 Vignettes :
- PASS à 1440, 1536, 1920, 768 et 390 px.
- ÉCHEC entre 1280 et ~1400 px — voir anomalie 1.
- Cohérence 3 / 4 vignettes : correcte. 3 vignettes → 3 colonnes à 1280 comme
  à 1440, aucune troncature. 4 vignettes → 4 colonnes dès 1280.
- Hauteur des cartes : 110 px partout, sauf 126 px à 1280 et 1366 px, où le
  libellé passe sur deux lignes. Uniforme sur toute la rangée, donc aucun
  désalignement.

Responsive :
- 1440 : PASS — 12 pages mesurées, aucun débordement (scrollW = clientW)
- 1280 : PASS pour la mise en page, ÉCHEC pour la lisibilité des détails
- 768  : PASS — vignettes 2×2, en-têtes empilés, aucun débordement
- 390  : PASS — vignettes en colonne, sélecteur pleine largeur, fil d'Ariane
         replié, aucun débordement

Régressions :
- Aucune. Tableau de bord, PipelineIA (4 vignettes dont « En attente de
  revue »), fil d'Ariane à 4 niveaux avec nom réel de mission, page 404 sur
  /app/zzz-inconnu, EntrepriseDetail sur une organisation valide, menus des
  trois rôles : tous conformes, aucune erreur console.

Anomalies :
1. P3-4 ne tient pas entre 1280 et ~1400 px — la troncature réapparaît
2. Cinq chaînes d'interface « entreprise » manquées par P3-3
3. Registre du menu collaborateur (observation mineure)

Captures :
- nombre : 33 pour cette phase (86 sur l'ensemble de la session)
- cas principaux : les trois PageTitre à toutes les largeurs testées,
  Classement à 1440 / 1280 / 768 / 390, vignettes 4 et 3 éléments à quatre
  largeurs, balayage de seuil 1366 / 1440 / 1536 / 1920, mobile 390,
  et la capture de l'anomalie 1 à 1280 px

Conclusion :
P3-1, P3-2 et les régressions sont pleinement validés. P3-4 n'atteint son but
qu'au-delà d'environ 1400 px : sur les deux largeurs d'écran portable les plus
répandues — 1280 et 1366 — le défaut qu'il devait corriger est toujours là.
P3-3 est correct sur tout ce qui a été vérifié, à cinq chaînes près.
Aucune correction n'a été appliquée.
```

---

# 1. Préalable — le serveur servait du code périmé

Avant toute mesure, contrôle des modules réellement servis par Vite : `Classement`
et `Layout` renvoyaient encore le code d'avant P3. C'est l'anomalie A-1 connue
(le watcher ne reçoit pas les événements à travers le bind-mount Docker/Windows).

`docker compose restart frontend-react` — un redémarrage de service, aucun
fichier ni configuration touché. Contrôle après redémarrage :

| Module servi | Marqueur | Présent |
|---|---|---|
| `Classement.jsx` | `PageTitre` | 2 |
| `AuditsListe.jsx` | `PageTitre` | 2 |
| `ReferentielsListe.jsx` | `PageTitre` | 2 |
| `Layout.jsx` | `Comparer les organisations` | 2 |
| `Layout.jsx` | `Bibliothèque documentaire` | 3 |
| `AuditScore.jsx` | `Notes / coefficients` | 1 |
| `Entreprises.jsx` | `Organisations` | 1 |

Toutes les mesures qui suivent portent donc bien sur le code P3.

---

# 2. P3-1 — les trois en-têtes

Mesures prises dans le DOM : taille et graisse du `h1`, présence du conteneur
`PageTitre`, nombre d'actions, et test de chevauchement des rectangles
titre / actions.

| Page | Largeur | `h1` | Actions | Chevauche | Hors cadre | Débordement |
|---|---|---|---|---|---|---|
| AuditsListe | 1440 | 20px / 600 | 1 | non | non | non |
| AuditsListe | 768 | 20px / 600 | 1 | non | non | non |
| AuditsListe | 390 | 20px / 600 | 1 | non | non | non |
| ReferentielsListe | 1440 | 20px / 600 | 2 | non | non | non |
| ReferentielsListe | 390 | 20px / 600 | 2 | non | non | non |
| **Classement** | **1440** | 20px / 600 | **2** | **non** | **non** | **non** |
| **Classement** | **1280** | 20px / 600 | **2** | **non** | **non** | **non** |
| **Classement** | **768** | 20px / 600 | **2** | **non** | **non** | **non** |
| **Classement** | **390** | 20px / 600 | **2** | **non** | **non** | **non** |

Les trois pages rendent désormais `20px / 600`, soit exactement l'échelle de
`PageTitre` — contre `text-2xl font-bold` auparavant. L'écart typographique qui
motivait P3-1 a disparu.

**Classement, le cas signalé comme le plus risqué** : à 1440 px le sélecteur de
domaine et le bouton « Exporter » sont alignés à droite du titre, sur la même
ligne, sans chevauchement. À 390 px le sélecteur occupe toute la largeur
(`w-full sm:w-56` fait son office) et le bouton passe dessous. Aucun
débordement horizontal à aucune des quatre largeurs.

L'icône de chaque page reprend celle de son entrée de menu : `ClipboardList`
pour les missions, `BookOpen` pour les référentiels, `Medal` pour le classement.

---

# 3. P3-2 — menu et titres

Relevé simultané du libellé de menu et du `h1` de la page ouverte :

| Menu | `h1` observé | Identiques |
|---|---|---|
| Organisations | Organisations | oui |
| Référentiels | Référentiels | oui |
| Comparer les organisations | Comparer les organisations | oui |
| Bibliothèque documentaire | Bibliothèque documentaire | oui |
| Utilisateurs et permissions | Utilisateurs et permissions | oui |
| Abonnement et paiements | Abonnement et paiements | oui |

**Aucun libellé tronqué** — mesure `scrollWidth > clientWidth` sur chaque entrée
de la barre latérale, pour les trois rôles, à 1440 et 390 px : liste vide.
« Comparer les organisations », le plus long, occupe 184 px sur 196 disponibles.

**Menus par rôle, après P3-2 :**

- **SUPER_ADMIN** (22 entrées, sous-menu des missions compris) — Vue générale,
  Missions d'audit, Organisations, Projets, Classement, Pipeline IA,
  Référentiels, Rapports, Utilisateurs et permissions, Bibliothèque
  documentaire, Non-conformités, Actions correctives, Plans d'amélioration,
  Comparer les organisations, Financements verts, Abonnement et paiements,
  Journal d'audit, Profil & sécurité.
- **RESPONSABLE_ENTREPRISE** (13) — « Référentiels » reste correctement masqué.
- **COLLABORATEUR** (7) — Tableau de bord, Mes missions, Bibliothèque
  documentaire, Plans d'amélioration, Mes actions, Périmètre applicable,
  Profil & sécurité.

Les infobulles posées en P2 (F-07) sont intactes sur les trois arbres.

---

# 4. P3-4 — vignettes

Mesure, pour chaque détail de vignette, de `scrollWidth` contre `clientWidth` :
c'est la définition même de la troncature.

## Avec 4 vignettes

| Largeur | Colonnes | Dispo | Tronqués | Hauteur carte |
|---|---|---|---|---|
| **1280** | 4 | **114 px** | **3 / 4** | 126 px |
| **1366** | 4 | **136 px** | **2 / 4** | 126 px |
| 1440 | 4 | 145–146 px | 0 / 4 | 110 px |
| 1536 | 4 | 145–146 px | 0 / 4 | 110 px |
| 1920 | 4 | 145–146 px | 0 / 4 | 110 px |
| 768 | 2 | large | 0 / 4 | 110 px |
| 390 | 1 | large | 0 / 4 | 110 px |

## Avec 3 vignettes

| Largeur | Colonnes | Tronqués |
|---|---|---|
| 1440 | 3 | 0 / 3 |
| 1280 | 3 | 0 / 3 |

La cohérence 3 / 4 vignettes est donc correcte : la quatrième colonne ne
s'ouvre que lorsque la quatrième vignette est présente, et le cas à trois
vignettes n'a jamais de troncature.

---

# 5. Anomalies

## Anomalie 1 — P3-4 ne tient pas entre 1280 et ~1400 px · **la plus importante**

```
Constat            : La troncature que P3-4 devait supprimer réapparaît dès que
                     la fenêtre descend sous ~1400 px, alors que la grille est
                     déjà à quatre colonnes depuis 1280 px.
Preuve navigateur  : à 1280 px, 114 px disponibles — trois détails sur quatre
                     tronqués : « Évaluation validée… », « Aucune évaluatio… »,
                     « À valider avant le … »
                     à 1366 px, 136 px disponibles — deux tronqués :
                     « Évaluation validée par l'IA » (145 px requis) et
                     « Aucune évaluation lancée » (146 px requis)
                     à 1440 px et au-delà — aucun
Capture            : p3b-P34-4vign-1280.png
Cause              : P3-4 a été calibré sur une mesure prise à 1440 px, où
                     154 px sont disponibles. Mais P2.1 ouvre la quatrième
                     colonne au palier `xl` de Tailwind, soit 1280 px, où il
                     n'y en a que 114. Les textes raccourcis tiennent dans
                     154 px, pas dans 114.
                     La faute est dans ma calibration : une seule largeur
                     mesurée, et c'était la plus favorable.
Impact             : Réel, pas seulement cosmétique. 1280×800 et 1366×768 sont
                     deux des résolutions d'ordinateur portable les plus
                     répandues. Sur ces écrans, le défaut d'origine subsiste
                     entièrement.
Fichiers concernés : src/pages/AuditScore.jsx (textes) ou
                     src/pages/AuditScore.jsx + PipelineIA.jsx (palier de grille)
Correction possible: soit ouvrir la quatrième colonne à `2xl` (1536 px) plutôt
                     qu'à `xl` — la grille reste alors à trois colonnes là où
                     quatre sont trop serrées ; soit raccourcir encore les
                     détails à ≤ 114 px, au prix de leur substance.
                     La première voie paraît la plus saine, mais elle revient
                     sur un choix de P2.1 et sort du périmètre de cette phase.
Dépendance         : aucune — frontend seul
NON CORRIGÉE, conformément à la consigne.
```

## Anomalie 2 — Cinq chaînes d'interface manquées par P3-3

```
Constat            : Cinq chaînes visibles emploient encore « entreprise » pour
                     désigner l'entité cliente, dans l'espace applicatif.
Preuve code        : AuditScore.jsx:114
                       « …la conformité réelle de l'entreprise. »
                     ComparaisonEntreprises.jsx:87
                       « Comparez jusqu'à 4 entreprises côte à côte… »
                     ComparaisonEntreprises.jsx:100
                       « 4 entreprises au maximum »
                     Utilisateurs.jsx:14 (dictionnaire de permissions)
                       « Créer une entreprise », « Modifier l'entreprise et ses sites »
                     Utilisateurs.jsx:244 et :309
                       « Toute l'entreprise » (valeur de repli de colonne)
Preuve navigateur  : les cinq relevées dans le texte réellement rendu des
                     captures P3
Cause              : mes recherches portaient sur les attributs de la forme
                     attribut="…" et sur le texte JSX tenant sur une ligne.
                     Les littéraux de gabarit (`${MAX_ENTREPRISES} entreprises`),
                     les textes JSX coupés sur deux lignes et les valeurs de
                     repli dans une expression y échappaient.
Impact             : Faible. La dualité subsiste sur deux pages
                     (AuditScore, Comparer les organisations) et dans la
                     matrice de permissions. L'essentiel du vocabulaire est
                     harmonisé, mais la cohérence n'est pas complète.
Fichiers concernés : AuditScore.jsx, ComparaisonEntreprises.jsx, Utilisateurs.jsx
Dépendance         : aucune
NON CORRIGÉE, conformément à la consigne.
```

## Anomalie 3 — Registre du menu collaborateur · **observation mineure**

```
Constat            : Chez le collaborateur, le groupe « MA PARTICIPATION »
                     contient « Mes missions », « Bibliothèque documentaire »,
                     « Mes actions ». L'entrée centrale rompt le registre
                     possessif des deux autres.
Impact             : Très faible, et le changement reste un progrès :
                     « Mes documents » annonçait un contenu personnel que la
                     page ne fournit pas — Documents.jsx ne filtre rien par
                     rôle. Le libellé actuel est exact, seulement moins bien
                     assorti à ses voisins.
Priorité           : à arbitrer, P4 ou jamais
NON CORRIGÉE.
```

---

# 6. Ce qui conserve légitimement « entreprise »

Vérifié à l'écran et confirmé conforme aux consignes :

| Occurrence | Nature | Verdict |
|---|---|---|
| « Entreprise Test Evalue » | nom réel d'une organisation de démonstration | données, correct |
| « Gouvernance d'entreprise », « RSE dans l'entreprise », libellés de critères et de non-conformités | contenu du référentiel servi par l'API | données métier, hors périmètre |
| « Responsable entreprise » | libellé du rôle `RESPONSABLE_ENTREPRISE` | interdit de renommer, correct |
| « Grande entreprise » | taille INSEE, valeur d'énumération `GRANDE_ENTREPRISE` | notion distincte, correct |
| `entreprise:creer`, `entreprise:modifier` | codes de permission, `Utilisateurs.jsx:343`, police monospace grise sous le libellé humain, page réservée au SUPER_ADMIN | exposition volontaire et appropriée pour une matrice d'administration |
| vitrine et pages d'authentification | décision explicite de la phase | correct |

---

# 7. Régressions

Contrôlées après P3, toutes conformes :

| Contrôle | Observé |
|---|---|
| Tableau de bord | « Bonjour, Super 👋 », vue transverse, aucune erreur |
| PipelineIA | 4 vignettes dont « EN ATTENTE DE REVUE 1 », colonne « En revue » |
| Fil d'Ariane | `Loc › Missions › Audit RSE annuel 2026 › Non-conformités` — niveau organisation et nom réel conservés |
| Page 404 | `/app/zzz-inconnu` → « Page introuvable » (correctif A-7 intact) |
| Organisation valide | `/app/{org}` rend la fiche normalement |
| Menus par rôle | 22 / 13 / 7 entrées, filtrage par permission intact |
| Console | aucune erreur sur les pages applicatives ; seules les 2 requêtes 404 connues sur `/app/zzz-inconnu` |
| Débordement horizontal | aucun, sur les 12 pages et les 5 largeurs mesurées |

---

# 8. Conclusion

**P3-1, P3-2 et la non-régression sont pleinement validés au navigateur.**
Les trois en-têtes sont à l'échelle commune, leurs actions tiennent à toutes les
largeurs, les six libellés correspondent désormais exactement aux titres, et
rien de ce qui avait été acquis en P0 à P2.2 n'a bougé.

**P3-4 n'atteint son but qu'au-delà d'environ 1400 px.** C'est une erreur de ma
part : j'ai calibré les textes sur une mesure unique, prise à la largeur la plus
favorable, alors que la grille passe à quatre colonnes dès 1280 px. Sur un écran
portable courant, la troncature est toujours là.

**P3-3 est correct sur tout ce qui a été vérifié, à cinq chaînes près**, toutes
dues à des formes d'écriture que mes recherches ne couvraient pas.

Le verdict est donc `READY_WITH_RESERVES` : rien n'est cassé, mais un des
quatre objectifs n'est pas atteint sur une part significative du parc d'écrans.

---

**Aucune correction appliquée. Aucun fichier, code, API, base, configuration ou
paquet modifié. Aucun commit, aucun push.** La seule action sur l'environnement
est le redémarrage du conteneur frontend, sans lequel la validation aurait porté
sur du code périmé.

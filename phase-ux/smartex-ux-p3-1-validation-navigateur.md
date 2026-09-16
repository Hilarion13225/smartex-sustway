# SMARTEX SUSTWAY — Validation navigateur P3.1

**Date** : 2026-09-16 · **Pilote** : Chrome headless 152 via DevTools Protocol
**Session** : SUPER_ADMIN authentifié · **16 captures**
**Nature** : validation — aucun fichier, code, API, base modifiés ; aucun commit

```text
P3.1 — VALIDATION NAVIGATEUR

Verdict :
READY_FOR_UX_P4

P3.1-A — AuditScore
- 1280 : PASS — 3 colonnes / 2 lignes, 0 troncature, cartes h110, aucun débordement
- 1366 : PASS — 3 colonnes / 2 lignes, 0 troncature, cartes h110, aucun débordement
- 1440 : PASS — 3 colonnes / 2 lignes, 0 troncature, cartes h110, aucun débordement
- 1536 : PASS — 4 COLONNES RÉELLEMENT RENDUES / 1 ligne, 0 troncature, h110
- 1920 : PASS — 4 COLONNES RÉELLEMENT RENDUES / 1 ligne, 0 troncature, h110
- 768  : PASS — 2 colonnes / 2 lignes, 0 troncature, h110
- 390  : PASS — 1 colonne / 4 lignes, 0 troncature, h110

P3.1-B — Terminologie
- AuditScore            : PASS — « …la conformité réelle de l'organisation. »
                          présent ; l'ancienne formulation absente
- ComparaisonEntreprises: PASS — titre « Comparer les organisations »,
                          « Comparez jusqu'à 4 organisations côte à côte… »,
                          « Organisations comparées », « 4 organisations au maximum »
- Utilisateurs          : PASS — « Créer une organisation »,
                          « Modifier l'organisation et ses sites »,
                          « Toute l'organisation », « Accès à l'organisation »

PipelineIA :
- Aucun changement. 4 vignettes → 4 colonnes à 1280 ET à 1536 (son palier `xl`
  est intact), 1 colonne à 390. 3 vignettes → 3 colonnes à 1280.
  0 détail tronquable à toutes les largeurs, aucun débordement, console vide.

Responsive :
- 1536 : aucun débordement (scrollWidth = clientWidth)
- 1280 : aucun débordement
- 768  : aucun débordement
- 390  : aucun débordement
- Également vérifié : 1366, 1440, 1920 — aucun débordement

Console :
- Aucune erreur, aucun avertissement, sur les 16 chargements de page.
  Aucune erreur nouvelle liée à P3.1.

Overflow :
- Aucun. scrollWidth = clientWidth sur les 7 largeurs et les 5 pages mesurées.

Anomalies :
- Aucune.

Réserves connues hors périmètre :
- problème de troncature à 1024 px avec 3 colonnes — confirmé inchangé
  (4 détails tronqués, 106 px disponibles, cartes h126). Ni corrigé ni aggravé,
  conformément à la consigne.

Conclusion :
Les deux réserves de P3 sont levées et vérifiées dans le navigateur. Le point
qui restait déduit plutôt qu'observé — le rendu réel de `2xl:grid-cols-4` — est
désormais confirmé : quatre colonnes s'affichent bel et bien à 1536 et 1920 px.
```

---

# 1. Préalable

Contrôle des modules réellement servis par Vite après
`docker compose restart frontend-react` (le HMR n'étant pas fiable à travers le
bind-mount — anomalie A-1 connue) :

| Module | Marqueur | Présent |
|---|---|---|
| `AuditScore.jsx` | `2xl:grid-cols-4` | oui |
| `AuditScore.jsx` | `conformité réelle de l'…` | oui |
| `ComparaisonEntreprises.jsx` | `organisations côte à côte` | oui |
| `Utilisateurs.jsx` | `Toute l'…` | 3 occurrences |

Toutes les mesures portent donc sur le code P3.1.

---

# 2. P3.1-A — la grille d'`AuditScore`

Mesures prises sur les **vraies vignettes** de la mission Ivoiz, seule mission
de la base portant un critère `EN_REVUE` — donc la seule qui affiche quatre
vignettes. Le critère de troncature est `scrollWidth > clientWidth`, mesuré sur
chaque ligne de détail.

| Largeur | Colonnes / lignes | Troncatures | Hauteur des cartes | Débordement | Console |
|---|---|---|---|---|---|
| 390 | 1 / 4 | **0 / 4** | 110 px | non | — |
| 768 | 2 / 2 | **0 / 4** | 110 px | non | — |
| **1280** | **3 / 2** | **0 / 4** | 110 px | non | — |
| **1366** | **3 / 2** | **0 / 4** | 110 px | non | — |
| 1440 | 3 / 2 | **0 / 4** | 110 px | non | — |
| **1536** | **4 / 1** | **0 / 4** | 110 px | non | — |
| **1920** | **4 / 1** | **0 / 4** | 110 px | non | — |

**Le point qui restait à prouver est prouvé.** Le rapport d'implémentation
signalait que les paliers ≥ 1536 px n'étaient pas observés bout en bout, faute
de règle `2xl:grid-cols-4` au moment de l'étude des variantes. Le rendu réel
confirme quatre colonnes sur une seule ligne à 1536 comme à 1920 px.

**Hauteur des cartes** : 110 px à toutes les largeurs validées, contre 126 px
auparavant à 1280 et 1366 px. Le libellé « EN ATTENTE DE REVUE » ne passe plus
sur deux lignes, les cartes retrouvent une hauteur uniforme.

**Aucune collision** : les quatre détails sont lus en entier dans les captures —
« Notes / coefficients », « Évaluation validée par l'IA », « Aucune évaluation
lancée », « À valider avant le score ».

**À 1280 px**, la quatrième vignette occupe seule la seconde ligne. C'est
l'arbitrage que vous aviez posé — « privilégier la lisibilité plutôt que
l'affichage forcé sur une seule ligne » — et il est appliqué tel quel.

**Cas à trois vignettes non altéré** : vérifié sur la mission Loc à 1536 px —
3 colonnes sur 1 ligne, aucune troncature. La classe à trois vignettes ne porte
pas de palier `2xl`, elle est donc restée inchangée.

---

# 3. P3.1-B — terminologie

Recherche des deux termes dans le texte **réellement rendu** de chaque page.

## `AuditScore`

| Contrôle | Résultat |
|---|---|
| « conformité réelle de **l'organisation** » | **présent** |
| « conformité réelle de **l'entreprise** » | **absent** |

Occurrences de « entreprise » restantes : « Gouvernance d'entreprise » et
« Prise en charge organisationnelle de la RSE dans l'entreprise » — ce sont des
**noms de domaines du référentiel**, servis par l'API. Hors périmètre, correct.

## `ComparaisonEntreprises`

Titre de page : **« Comparer les organisations »**. Textes rendus :

- « Comparez jusqu'à 4 **organisations** côte à côte, sur le score global et le
  profil par domaine de leur mission la plus récente. »
- « **Organisations** comparées »
- « 4 **organisations** au maximum »

Seule occurrence de « entreprise » : **« Entreprise Test Evalue »**, nom réel
d'une organisation de la base de démonstration. Correct.

## `Utilisateurs`

Titre de page : **« Utilisateurs et permissions »**. Textes rendus :

| Contrôle | Résultat |
|---|---|
| « **Créer une organisation** » | présent |
| « Créer une entreprise » | **absent** |
| « **Modifier l'organisation et ses sites** » | présent |
| « Modifier l'entreprise et ses sites » | **absent** |
| « **Toute l'organisation** » | présent |
| « **Accès à l'organisation** » | présent |

## Éléments volontairement inchangés — vérifiés présents

| Élément | Observé à l'écran | Verdict |
|---|---|---|
| `entreprise:creer` | oui, en monospace grise sous le libellé humain | clé de permission, exposition volontaire |
| `entreprise:modifier` | oui, idem | clé de permission, exposition volontaire |
| « Responsable entreprise » / « RESPONSABLE ENTREPRISE » | oui | libellé du rôle `RESPONSABLE_ENTREPRISE`, interdit de renommer |
| `entrepriseId`, `GRANDE_ENTREPRISE`, `MAX_ENTREPRISES` | non exposés comme texte d'interface | correct |

Conformément à la consigne, aucun de ces éléments n'est compté comme anomalie.

---

# 4. Régression `PipelineIA`

| Cas | Largeur | Colonnes / lignes | Détails tronquables | Débordement | Console |
|---|---|---|---|---|---|
| 4 vignettes | 1280 | 4 / 1 | 0 | non | vide |
| 4 vignettes | 1536 | 4 / 1 | 0 | non | vide |
| 4 vignettes | 390 | 1 / 4 | 0 | non | vide |
| 3 vignettes | 1280 | 3 / 1 | 0 | non | vide |

`PipelineIA` conserve son palier `xl` : quatre colonnes dès 1280 px, comme
avant P3.1. Ses `StatCard` ne portent aucun `detail` — zéro élément tronquable
mesuré — donc rien à corriger et rien qui ait bougé. La décision de ne pas la
modifier est confirmée par l'observation.

---

# 5. Réserve connue, hors périmètre

**1024 px — confirmé inchangé.** Mesuré explicitement pour vérifier qu'il n'a
pas été aggravé :

```
3 colonnes / 2 lignes · 4 détails tronqués sur 4 · 106 px disponibles · cartes h126
   111 / 106 px   Notes / coefficients
   145 / 106 px   Évaluation validée par l'IA
   146 / 106 px   Aucune évaluation lancée
   132 / 106 px   À valider avant le score
```

Ce palier relève de `lg:grid-cols-3`, antérieur à P2.1, et touche aussi la
disposition à trois vignettes. Ni corrigé, ni aggravé, conformément à la
consigne. Il reste à arbitrer.

---

# 6. Captures

**16 captures** produites pour cette phase :

- `AuditScore` à 390, 768, 1280, 1366, 1440, 1536, 1920 et 1024 px
- `AuditScore` de la mission à trois vignettes à 1536 px
- `ComparaisonEntreprises` et `Utilisateurs` à 1440 px
- `PipelineIA` à 1280, 1536 et 390 px avec quatre vignettes, et à 1280 px avec trois

Les deux captures décisives sont `p31a-A-1280.png` — trois colonnes, quatrième
vignette seule sur la ligne suivante, quatre détails entiers — et
`p31a-A-1536.png` — quatre colonnes sur une ligne, quatre détails entiers.

---

# 7. Conclusion

Les deux réserves qui maintenaient P3 en `READY_WITH_RESERVES` sont levées, et
observées dans le navigateur plutôt que déduites.

La troncature ne se produit plus à aucune des largeurs du périmètre. Le rendu
réel de `2xl:grid-cols-4` — seul point que le rapport d'implémentation
annonçait comme déduit et non observé — est confirmé à 1536 et 1920 px. Les six
corrections de vocabulaire sont visibles à l'écran, et les identifiants
techniques que la consigne protège sont tous restés en place.

Aucune anomalie nouvelle. Aucune régression. La seule réserve subsistante est
celle de 1024 px, explicitement hors périmètre.

**Verdict : `READY_FOR_UX_P4`.**

---

**Aucune correction appliquée. Aucun fichier, code, API ou base modifiés :
45 fichiers au diff, inchangé depuis l'implémentation P3.1, et aucun fichier de
`frontend-react/src` touché pendant cette validation. Aucun commit, aucun
push.** La seule action sur l'environnement est le redémarrage du conteneur
frontend, sans lequel la validation aurait porté sur du code périmé.

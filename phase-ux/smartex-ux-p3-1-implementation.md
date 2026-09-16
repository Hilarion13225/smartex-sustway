# SMARTEX SUSTWAY — P3.1, correction des réserves P3

**Date** : 2026-09-16 · **Périmètre** : `frontend-react/src`, 3 fichiers

```text
P3.1 — Correction des réserves P3

P3.1-A — Vignettes
- problème :
    La quatrième colonne s'ouvrait au palier `xl` (1280 px). À cette largeur,
    chaque carte ne laisse que 114 px à sa ligne de détail, qui en demande
    jusqu'à 146. Trois détails sur quatre se coupaient à 1280 px, deux sur
    quatre à 1366 px. Raccourcir les textes (P3-4) avait été calibré sur une
    mesure prise à 1440 px, la largeur la plus favorable : la correction ne
    tenait donc pas là où le défaut se produisait.

- solution retenue :
    src/pages/AuditScore.jsx — `xl:grid-cols-4` → `2xl:grid-cols-4`.
    La quatrième colonne ne s'ouvre plus qu'à 1536 px, où 280 px par carte
    suffisent largement. Entre 1024 et 1535 px, la grille reste à trois
    colonnes et la quatrième vignette descend sous la rangée.
    C'est l'arbitrage que vous avez posé : une carte isolée se lit, un texte
    tronqué non.
    Une seule classe changée, aucune autre modification de mise en page.

    PipelineIA n'a PAS été touchée : ses StatCard ne portent aucun `detail`
    (0 élément `p.truncate` mesuré à 1024, 1280 et 1366 px), donc aucune
    troncature possible. La modifier aurait fait descendre sa quatrième
    vignette sans aucun bénéfice.

- comportement 1280 : 3 colonnes / 2 lignes · 0 tronqué · cartes 294 px · h 110
- comportement 1366 : 3 colonnes / 2 lignes · 0 tronqué · cartes 322 px · h 110
- comportement 1440 : 3 colonnes / 2 lignes · 0 tronqué · cartes 347 px · h 110
- comportement 1536 : 4 colonnes / 1 ligne  · 0 tronqué · cartes 280 px · h 110
- comportement 768  : 2 colonnes / 2 lignes · 0 tronqué · cartes 353 px · h 110
- comportement 390  : 1 colonne  / 4 lignes · 0 tronqué · cartes 358 px · h 110

P3.1-B — Terminologie
- occurrences corrigées : 6 chaînes, dans 3 fichiers
    AuditScore.jsx:114              « …la conformité réelle de l'organisation. »
    ComparaisonEntreprises.jsx:87   « Comparez jusqu'à 4 organisations côte à côte… »
    ComparaisonEntreprises.jsx:100  « 4 organisations au maximum »
    Utilisateurs.jsx:13             « Créer une organisation »
    Utilisateurs.jsx:14             « Modifier l'organisation et ses sites »
    Utilisateurs.jsx:244 et :309    « Toute l'organisation »  (2 occurrences)

- occurrences volontairement conservées :
    'entreprise:creer' / 'entreprise:modifier'  — clés du dictionnaire, codes
        de permission affichés tels quels dans la matrice d'administration
    MAX_ENTREPRISES        — constante technique
    entrepriseId           — 381 occurrences, aucune touchée
    RESPONSABLE_ENTREPRISE — 7 occurrences, aucune touchée
    GRANDE_ENTREPRISE      — 3 occurrences, aucune touchée

- justification :
    Chaque remplacement a été vérifié en contexte. Les deux libellés de
    permission désignent bien l'entité cliente — « Créer une organisation »,
    « Modifier l'organisation et ses sites » — tandis que leurs clés restent
    les codes exacts que l'API attend. « Toute l'organisation » est la portée
    d'un rattachement lorsqu'aucun site n'est précisé : c'est encore l'entité
    cliente. GRANDE_ENTREPRISE désigne une taille INSEE, notion distincte, non
    touchée.

Build :
PASS  (npx vite build → BUILD=0)

Lint :
PASS  (npm run lint → 0 erreur ; 1 avertissement, `Landing.jsx:19`
       « SMARTEX imported but never used », **préexistant**, sur un fichier
       que P3.1 n'a pas touché)

API :
inchangée — diff filtré sur api.get|post|put|delete|patch : 0 ligne

Backend :
inchangé — aucun fichier api-quarkus/ touché

DB :
inchangée — aucune requête, aucune migration

Routes :
inchangées — App.jsx non modifié par P3.1 (ses 4 lignes datent de P1.4) ;
Layout.jsx non touché par cette phase

Auth :
inchangée — git diff src/auth/ vide ; aucun rôle, aucune permission modifiés

Git :
aucun commit/push — branche main, HEAD toujours d1b8bb6

Statut :
READY_FOR_P3_1_BROWSER_VALIDATION
```

---

## Comment la variante a été choisie

Vous demandiez d'évaluer `xl:grid-cols-3 2xl:grid-cols-4` plutôt que de la
retenir d'office. Les variantes ont donc été mesurées **sur les vraies vignettes
d'`AuditScore`**, en substituant transitoirement la classe du conteneur dans le
DOM puis en la rétablissant — aucun fichier touché, la classe d'origine a été
vérifiée restaurée en fin de mesure.

| Largeur | Actuel `lg:3 xl:4` | **A `lg:3 2xl:4`** | D `sm:2 2xl:4` |
|---|---|---|---|
| 390 | 1 col · ok | 1 col · ok | 1 col · ok |
| 768 | 2 col · ok | 2 col · ok | 2 col · ok |
| **1024** | 3 col · **4 tronqués** | 3 col · **4 tronqués** | 2 col · ok |
| **1280** | 4 col · **3 tronqués** | **3 col · ok** | 2 col · ok |
| **1366** | 4 col · **2 tronqués** | **3 col · ok** | 2 col · ok |
| 1440 | 4 col · ok | 3 col · ok | 2 col · ok |
| 1536 | 4 col · ok | 4 col · ok | 4 col · ok |
| 1920 | 4 col · ok | 4 col · ok | 4 col · ok |

**Variante D écartée.** Elle supprime toute troncature, y compris à 1024 px, mais
au prix d'un changement bien plus large : deux colonnes de 449 à 577 px entre
1280 et 1536 px, là où la page en affiche trois aujourd'hui. Elle rendrait aussi
la mise en page incohérente d'une mission à l'autre — deux colonnes avec quatre
vignettes, trois avec trois vignettes. Ce n'est plus la correction minimale
demandée.

**Variante A retenue.** Elle corrige exactement les deux largeurs signalées,
ne change rien en dessous de 1024 ni au-delà de 1536, et n'introduit aucune
régression de lisibilité.

### Ce qui a été mesuré, et ce qui est déduit

À dire franchement, pour que la validation suivante sache où regarder :

- **390, 768, 1024, 1280, 1366, 1440 px** : mesurés directement sur la variante A
  appliquée aux vraies cartes. Les règles CSS `sm:grid-cols-2` et
  `lg:grid-cols-3` existent déjà, la mesure est donc exacte.
- **1536 et 1920 px** : **déduits de deux faits vérifiés séparément**, et non
  observés bout en bout. D'une part la règle est bien produite par le build —
  `.\32 xl\:grid-cols-4{grid-template-columns:repeat(4,minmax(0,1fr))}` à
  l'intérieur de `@media (width>=1536px)`, contrôlé dans la feuille émise, alors
  qu'elle était absente avant ce changement. D'autre part la disposition à
  quatre colonnes à 1536 px avait été mesurée sans troncature lors de la
  validation P3. La mesure des variantes ne pouvait pas trancher ce palier :
  Tailwind ne génère que les classes présentes dans les sources, et
  `2xl:grid-cols-4` n'existait alors nulle part.

Ces deux paliers sont donc le premier point à confirmer au navigateur.

---

## Une anomalie découverte pendant l'étude, non corrigée

**À 1024 px, les quatre détails sont tronqués** — sur la grille actuelle comme
sur la variante retenue. La cause n'est pas la quatrième colonne de P2.1 mais le
palier `lg:grid-cols-3`, qui donne des cartes de 208 px : trois colonnes y sont
déjà trop serrées.

Deux conséquences qu'il faut connaître :

- la variante A **ne corrige pas ce cas**, et ne l'aggrave pas non plus ;
- le défaut touche aussi la disposition à **trois** vignettes, qui utilise le
  même palier — il est donc antérieur à P2.1 et indépendant de la quatrième
  colonne.

Il sort du périmètre que vous avez fixé — « ne traiter aucune autre anomalie » —
et n'a donc pas été corrigé. Je le signale pour arbitrage : 1024 px correspond
à une tablette en paysage et aux petits portables.

---

## Diff

| Fichier | Nature |
|---|---|
| `src/pages/AuditScore.jsx` | 1 classe de grille + 1 chaîne + commentaire explicatif |
| `src/pages/ComparaisonEntreprises.jsx` | 2 chaînes |
| `src/pages/Utilisateurs.jsx` | 4 chaînes (2 libellés de permission, 2 portées de rattachement) |

Aucun autre fichier touché. Aucun composant créé. Aucune autre anomalie traitée.

### Contrôles

| Contrôle | Résultat |
|---|---|
| `npx vite build` | **BUILD=0** |
| `npm run lint` | **0 erreur**, 1 avertissement préexistant hors périmètre |
| Règle `2xl:grid-cols-4` émise | **oui**, dans `@media (width>=1536px)` |
| `git diff` sur `api.get\|post\|put\|delete\|patch` | **0 ligne** |
| `git diff src/App.jsx` | 4 lignes, toutes de P1.4 |
| `git diff src/auth/` | **vide** |
| `git diff api-quarkus/` | inchangé (travaux phase 3D) |
| `Layout.jsx` | **non touché** par P3.1 |
| `entrepriseId` / `RESPONSABLE_ENTREPRISE` / `GRANDE_ENTREPRISE` / `MAX_ENTREPRISES` | 381 / 7 / 3 / 5 occurrences, **aucune modifiée** |
| Clés `'entreprise:creer'` / `'entreprise:modifier'` | **conservées** |

---

**Aucune validation navigateur menée dans cette étape**, conformément à la
consigne : seules les mesures nécessaires au choix de la variante ont été
prises, sur des mutations transitoires du DOM. **Aucun commit, aucun push.**

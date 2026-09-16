# SMARTEX SUSTWAY — Audit UX P3

**Date** : 2026-09-16
**Nature** : **STRICTEMENT READ-ONLY** — aucun fichier, code, base, API,
configuration ou paquet modifié ; aucun commit, aucun push
**Sources** : les 8 rapports `phase-ux/`, puis vérification dans le code

---

```text
PHASE UX P3 — AUDIT READ-ONLY

Verdict :
P3_PARTIEL

La liste P3 héritée ne survit pas à la vérification : sur les 5 sujets,
3 sont INVALIDÉS et 2 sortent du périmètre que vous avez fixé pour P3
(« cohérence UX et finition », pas extension du produit).

En revanche, l'inspection du code fait apparaître 4 sujets de cohérence
réels, non encore relevés, tous corrigeables côté frontend sans API.
Le P3 vaut donc d'être fait — mais pas sur son contenu d'origine.
```

---

# 1. État général

Les phases P0, P1, P2, P2.1 et P2.2 sont validées, dont 18 tests au navigateur
sur trois rôles authentifiés. Les 14 éléments que vous listez comme acquis
n'ont pas été ré-audités.

Deux constats de méthode guident cet audit :

- **Un sujet figurant dans un audit antérieur n'est pas un problème.** Trois
  des cinq P3 hérités ne résistent pas à la lecture du code. C'est la troisième
  fois sur ce projet qu'un constat d'audit se révèle faux à la vérification
  (après F-13, F-15 et F-10) — d'où le refus de reconduire quoi que ce soit
  sans preuve.
- **P3 n'est pas le dépotoir des sujets restants.** Vous avez cadré la phase
  comme une passe de cohérence. Deux P3 hérités sont des fonctionnalités
  absentes : ils n'y ont pas leur place, indépendamment de leur mérite.

---

# 2. Sujets P3 examinés

Liste relevée dans `smartex-ux-p1-audit.md` § 5 et `smartex-ux-p2-audit.md` § E,
non reconstituée :

| ID | Sujet | Origine | Classement |
|---|---|---|---|
| F-06 | Parcours de mission non nommé bout en bout | P2 → P3 | **HORS PÉRIMÈTRE P3** |
| F-09 | Étape de préparation de mission | P1 → P3 | **HORS PÉRIMÈTRE P3** |
| F-11 | Cinq redirections de vitrine | P1 → P3 | **INVALIDÉ** |
| F-12 | `ImportReferentiel` sur deux routes | P1 → P3 | **INVALIDÉ** |
| F-14 | Place de `Classement` et `Comparaison` | P1 → P3 | **INVALIDÉ** |

Sujets ouverts hérités de la validation navigateur et de P2.2, également
examinés : A-1, A-3, A-8, A-9, observation P2.2, F-08b.

Et **4 sujets nouveaux**, issus de l'inspection du code pour cet audit.

---

# 3. Sujets confirmés

## P3-1 — Trois pages ignorent le composant `PageTitre`

```
Constat            : 27 pages utilisent PageTitre. Trois pages applicatives
                     composent leur en-tête à la main, à une autre échelle
                     typographique et sans le badge d'icône.
Preuve code        : ui.jsx:39        PageTitre → <h1 class="text-xl font-semibold">
                                                  + badge dégradé + icône
                     AuditsListe.jsx:177     <h1 class="text-2xl font-bold">
                     ReferentielsListe.jsx:232  <h1 class="text-2xl font-bold">
                     Classement.jsx:134         <h1 class="text-2xl font-bold">
Preuve navigateur  : les captures des trois pages montrent un titre plus gros
                     et sans pastille colorée, là où toutes les autres pages
                     portent l'icône dans son carré dégradé.
Impact             : Faible individuellement, réel en enchaînement. Passer de
                     « Missions d'audit » à une mission fait changer la taille
                     du titre et disparaître l'icône : l'œil lit une rupture
                     de niveau là où il n'y en a pas.
Priorité           : P3
Correction         : Remplacer l'en-tête manuel par <PageTitre>, en conservant
                     les actions déjà présentes (boutons, sélecteurs). Aucun
                     texte ne change.
Fichiers           : src/pages/AuditsListe.jsx
                     src/pages/ReferentielsListe.jsx
                     src/pages/Classement.jsx
Dépendance API     : aucune
Risque régression  : Faible, mais non nul — les trois pages placent des
                     contrôles (filtres, sélecteur de domaine, export) dans la
                     rangée du titre. `PageTitre` accepte `actions`, donc le
                     portage est direct ; c'est l'alignement de ces contrôles
                     qui est à vérifier à l'écran.
Classement         : CONFIRMÉ
```

**Deux pages volontairement laissées de côté**, et il faut le dire :

- `TableauDeBord.jsx:413` — « Bonjour, {prénom} 👋 » n'est pas un titre de page
  mais une salutation. La différence est assumée et lisible comme telle.
- `ProjetDetail.jsx:173` — déjà en `text-xl font-semibold`, soit l'échelle de
  `PageTitre` ; seul le composant diffère, pas le rendu. À laisser.

## P3-2 — Six entrées de menu ne portent pas le nom de la page qu'elles ouvrent

```
Constat            : Le libellé du menu et le titre de la page divergent, parfois
                     jusqu'à un vocabulaire entièrement différent.
Preuve code        : Layout.jsx ↔ titres relevés dans les pages :

  Menu                        →  Titre de page              Écart
  ──────────────────────────────────────────────────────────────────────
  Collecte de preuves         →  Bibliothèque documentaire   vocabulaire
  Mes documents (collab.)     →  Bibliothèque documentaire   vocabulaire
  Organisations (admin)       →  Entreprises                 vocabulaire
  Équipe (admin)              →  Utilisateurs et permissions vocabulaire
  Abonnement et facturation   →  Abonnement et paiements     terme final
  Référentiels                →  Référentiel                 nombre

Impact             : Moyen sur les deux premiers. Un collaborateur qui clique
                     « Mes documents » arrive sur « Bibliothèque documentaire » :
                     rien ne confirme qu'il est au bon endroit, et le titre ne
                     dit pas que le contenu est filtré sur lui.
                     « Organisations » → « Entreprises » entretient la dualité
                     de vocabulaire décrite en P3-3.
Priorité           : P3
Correction         : Aligner le titre de page sur le libellé du menu, ou
                     l'inverse — un seul mot par notion. Aucun renommage de
                     page, aucune route touchée : seuls les libellés changent.
Fichiers           : src/components/Layout.jsx (libellés)
                     src/pages/Documents.jsx, Entreprises.jsx,
                     Utilisateurs.jsx, Abonnement.jsx, ReferentielsListe.jsx
Dépendance API     : aucune
Risque régression  : Très faible. Aucune cible de navigation n'est touchée.
Classement         : CONFIRMÉ
```

## P3-3 — « Entreprise » et « organisation » désignent la même chose

```
Constat            : Les deux mots coexistent dans le texte affiché, pour le
                     même objet, parfois à deux écrans d'intervalle.
Preuve code        : « organisation » :
                       EnTeteApp.jsx:123   « Rechercher une mission, une organisation… »
                       Classement.jsx:165  « Aucune organisation n'a de mission évaluée… »
                       Projets.jsx:67      « portefeuille d'organisations »
                       Layout.jsx          entrée de menu « Organisations »
                     « entreprise » :
                       Abonnement.jsx:70, AuditDetail.jsx:221, AuditScore.jsx:77,
                       AuditsListe.jsx:165 « Entreprise introuvable ou non accessible. »
                       ComparaisonEntreprises.jsx:86 « Comparaison d'entreprises »
                       Entreprises.jsx     titre « Entreprises »
Impact             : Faible mais diffus. Rien n'est ambigu isolément ; c'est
                     l'accumulation qui fait douter qu'il s'agit du même objet,
                     en particulier pour le SUPER_ADMIN qui navigue entre
                     « Organisations » (menu) et « Entreprises » (page).
Priorité           : P3
Correction         : Choisir un terme et l'appliquer au texte affiché. Le code
                     (`entrepriseId`, `/api/v1/entreprises`, `EntrepriseDto`)
                     n'est PAS concerné : c'est un choix de vocabulaire
                     d'interface, pas un renommage technique.
Fichiers           : une quinzaine de chaînes dans src/pages et src/components
Dépendance API     : aucune — le contrat API garde « entreprise »
Risque régression  : Très faible sur le rendu ; le risque réel est de déborder
                     sur les identifiants de code. À cadrer explicitement :
                     chaînes affichées uniquement.
Note               : Les descriptions que j'ai rédigées en P1 et P2 (« voir
                     « Rapports » dans le menu de l'organisation ») ont
                     contribué à cette dualité. Elles sont à inclure dans
                     l'harmonisation.
Classement         : CONFIRMÉ
```

## P3-4 — Troncature du détail des vignettes à quatre colonnes (ex A-8)

```
Constat            : Depuis P2.1, quatre vignettes occupent au palier xl la
                     largeur qui en portait trois. La ligne de détail, déjà
                     en `truncate`, se coupe plus tôt.
Preuve code        : ui.jsx:82  <p class="mt-0.5 truncate text-xs text-ink-500">
                     Détails concernés, sur AuditScore et PipelineIA :
                       40 car.  « Somme des notes / somme des coefficients »
                       31 car.  « Évaluation validée par l'IA »
                       43 car.  « Aucune évaluation lancée pour l'instant »
                       54 car.  « Évaluations à valider avant d'entrer dans le score »
Preuve navigateur  : capture `sa-T07-score-enrevue.png`, 1440 px — lu à l'écran :
                     « Somme des notes / som… », « Aucune évaluation lancé… »,
                     « Évaluations à valider ava… »
Impact             : Cosmétique. Aucun débordement, aucune superposition, la
                     valeur chiffrée reste entièrement lisible. Seule la
                     précision se perd, et elle est redondante avec le libellé.
Priorité           : P3
Correction         : Trois voies, à arbitrer — raccourcir les quatre détails ;
                     ou remplacer `truncate` par un retour à la ligne sur deux
                     lignes maximum ; ou ne rien faire.
Fichiers           : src/components/ui.jsx (si retour à la ligne)
                     src/pages/AuditScore.jsx, PipelineIA.jsx (si raccourcis)
Dépendance API     : aucune
Risque régression  : Modifier `ui.jsx:82` touche **toutes** les `StatCard` de
                     l'application, y compris celles à trois colonnes qui
                     n'ont pas le problème. La voie « raccourcir les textes »
                     est la seule sans effet de bord.
Classement         : CONFIRMÉ
```

---

# 4. Sujets déjà corrigés

Aucun sujet P3 n'a été corrigé entre-temps : les phases P0 à P2.2 ne les
touchaient pas. Les 14 éléments que vous listez comme acquis ont été exclus de
cet audit conformément à votre consigne, et n'ont pas été rouverts.

---

# 5. Sujets invalidés

## F-11 — Cinq redirections de vitrine · **INVALIDÉ**

Les cinq routes existent bien (`App.jsx` lignes 71, 74, 76, 77, 78) et
redirigent vers des pages réelles :

| Route | Cible | Cible valide ? |
|---|---|---|
| `/accueil` | `/services` | oui |
| `/a-propos` | `/services#smartex` | oui — ancre présente, `Services.jsx:208` porte `id="smartex"` avec `scroll-mt-20` |
| `/avantages` | `/services` | oui |
| `/engagement` | `/formules` | oui |
| `/deploiement` | `/methodologie` | oui |

J'ai vérifié spécifiquement l'ancre `#smartex`, seul point qui aurait pu être
cassé : elle existe et son décalage de défilement est prévu. Ces redirections
préservent des liens existants — c'est leur fonction, pas un défaut. **Rien à
faire.**

## F-12 — `ImportReferentiel` sur deux routes · **INVALIDÉ**

`ImportReferentiel.jsx:48` lit `importId`, et **ligne 60** branche
explicitement : `return importId ? <Assistant importId={importId} /> : …`.
Deux routes, deux comportements distincts — création d'un import, puis reprise
d'un import en cours — servis par un composant qui les distingue lui-même.
C'est le motif courant « création / reprise ». **Rien à faire.**

## F-14 — `Classement` et `Comparaison` sans contexte d'usage · **INVALIDÉ**

Le constat d'origine — *« rien ne dit à quel moment elles servent »* — est faux
pour les deux pages :

- `ComparaisonEntreprises.jsx:87` : *« Comparez jusqu'à N entreprises côte à
  côte, sur le score global et le profil par domaine de leur mission la plus
  récente. »*
- `Classement.jsx:135` : *« Organisations classées sur leur mission la plus
  récente, globalement ou domaine par domaine. »*

Chacune dit ce qu'elle fait et sur quelles données. Le seul résidu réel est que
`Classement` compose son en-tête à la main — c'est P3-1, et non F-14.

---

# 6. Sujets à surveiller

## Hors périmètre P3 — extensions du produit

| ID | Sujet | Pourquoi hors P3 |
|---|---|---|
| **F-06** | Parcours de mission en 7 étapes | Demande un composant nouveau et, surtout, un arbitrage métier sur la définition des phases. `SyntheseMission` (jauge, « X / Y critères »), `ClotureMission` et les 7 onglets de `AuditDetail` répondent déjà à « ce qui est fait / ce qui reste ». Ce qui manque est le *nom* de la phase, pas l'information. |
| **F-09** | Étape de préparation de mission | Fonctionnalité absente. Relève d'une décision métier sur ce que « préparer » recouvre, pas d'une correction de cohérence. |

Les deux méritent d'être arbitrés, mais dans une phase produit, pas dans une
passe de finition.

## Dépendances et environnement

| ID | Sujet | État |
|---|---|---|
| **F-08b** | File des évaluations `EN_REVUE` | **DÉPENDANCE BACKEND** — voir § 7 |
| **A-9** | `/app/referentiels` atteignable par URL directe en COLLABORATEUR | **À SURVEILLER** — le lien est correctement masqué, deux appels API répondent 403, la page affiche des compteurs de catalogue (11 référentiels, 29 domaines, 108 critères). Question de permissions, pas d'UX ; aucune phase UX n'a touché à ce routage. À trancher côté produit : ce catalogue est-il public pour les comptes authentifiés ? |
| **Obs. P2.2** | Deux 404 d'API depuis `EntrepriseDetail` sur une organisation inconnue | **À SURVEILLER** — les `useEffect` partent avant la garde `if (!entreprise)`, ordre imposé par les règles des hooks. Deux requêtes inutiles, deux lignes de console, aucun effet visible. Correction possible : une garde dans les deux `useCallback`. Faible valeur. |
| **A-3** | Aucune mission `ANNULE` en base | **À SURVEILLER** — T12 reste non observable. Le filtrage est vérifié dans le code (`TableauDeBord` filtre `statut !== 'ANNULE'`). À rejouer quand une mission annulée existera. |
| **A-1** | HMR non fiable via le bind-mount Docker/Windows | **À SURVEILLER** — hors UX. `docker compose restart frontend-react` reste nécessaire après toute modification de `src`. À documenter dans le README, ou à traiter par `server.watch.usePolling` dans `vite.config.js`. |

---

# 7. Dépendances backend / API

**Aucun des 4 sujets P3 confirmés n'a de dépendance backend.** Tous portent sur
des libellés, des composants d'en-tête ou des classes CSS.

Une seule dépendance subsiste dans l'ensemble du périmètre UX :

**F-08b — la file des évaluations en attente de revue.** Les évaluations ne se
listent que critère par critère
(`EvaluationResource:47` → `/audits/{auditId}/criteres/{auditCritereId}/evaluations`),
et `AuditCritereDto.statut` ne vaut que `A_EVALUER` / `DECLARE` / `EVALUE` — il
ne distingue pas `EN_REVUE` de `VALIDEE`. La construire côté client coûterait un
appel par mission puis un appel par critère, soit plusieurs centaines de
requêtes par affichage. Il manque un endpoint listant les évaluations
`EN_REVUE` d'une mission ou d'une organisation.

Le *compteur*, lui, est déjà servi et exploité depuis F-08a — ce qui manque est
la liste actionnable.

---

# 8. Plan d'implémentation proposé

À n'exécuter qu'après votre autorisation.

| # | Sujet | Fichiers | Nature |
|---|---|---|---|
| 1 | **P3-2** — aligner libellés de menu et titres de page | `Layout.jsx` + 5 pages | chaînes uniquement |
| 2 | **P3-3** — un seul mot par notion | ~15 chaînes dans `src/pages` et `src/components` | chaînes uniquement |
| 3 | **P3-1** — porter 3 en-têtes sur `PageTitre` | `AuditsListe.jsx`, `ReferentielsListe.jsx`, `Classement.jsx` | structure d'en-tête |
| 4 | **P3-4** — troncature des détails | `AuditScore.jsx`, `PipelineIA.jsx` | 4 chaînes |

**Décision préalable indispensable pour 1 et 2** : le terme retenu, « entreprise »
ou « organisation ». Tout le reste en découle, et le faire dans le désordre
imposerait de repasser sur les mêmes fichiers.

---

# 9. Ordre recommandé

```
P3-2  (libellés menu ↔ titres)   ─┐
                                  ├─ même décision de vocabulaire, à traiter ensemble
P3-3  (entreprise / organisation) ─┘
        ↓
P3-1  (PageTitre sur 3 pages)     — structure, à vérifier à l'écran
        ↓
P3-4  (troncature)                — le plus anodin, en dernier
```

P3-2 et P3-3 d'abord parce qu'ils partagent la même décision et les mêmes
fichiers. P3-1 ensuite : c'est le seul qui touche à la mise en page et qui
demande un contrôle visuel. P3-4 en dernier, et facultatif.

---

# 10. Risques de régression

| Sujet | Risque | Ce qu'il faut surveiller |
|---|---|---|
| P3-1 | **Le plus élevé du lot** — faible en absolu | Les trois pages placent des contrôles dans la rangée du titre : filtre de statut et sélecteur de vue sur `AuditsListe`, sélecteur de domaine et export sur `Classement`, bouton d'export sur `ReferentielsListe`. `PageTitre` accepte `actions`, mais leur alignement est à vérifier à 1440, 768 et 390 px. |
| P3-2 | Très faible | Ne toucher que des `libelle` et des `titre`. **Aucun `chemin`, aucun `vers`, aucune `permission`.** Le contrôle est le même qu'en P2 : le diff de `Layout.jsx` ne doit porter que sur des chaînes. |
| P3-3 | Faible sur le rendu, réel sur le périmètre | Le danger est de déborder sur `entrepriseId`, `/api/v1/entreprises`, `EntrepriseDto`. Un remplacement global serait destructeur. À faire chaîne par chaîne, avec vérification que le diff filtré sur `api.` reste vide. |
| P3-4 | Nul si l'on raccourcit les textes ; **réel** si l'on touche `ui.jsx:82` | `StatCard` est utilisée partout : retirer `truncate` changerait la hauteur de toutes les vignettes de l'application, y compris celles qui n'ont pas le problème. |

**Vérifications applicables aux quatre** : `npx vite build`, `npm run lint`,
diff filtré sur `api.get|post|put|delete|patch` qui doit rester vide, `App.jsx`
et `src/auth/` inchangés, puis contrôle au navigateur avec le pilote Chrome
déjà en place — les trois rôles et les trois largeurs.

---

# 11. Conclusion

```
Sujets P3 hérités        : 5
  INVALIDÉS              : 3   (F-11, F-12, F-14)
  HORS PÉRIMÈTRE P3      : 2   (F-06, F-09 — extensions produit)
  CONFIRMÉS              : 0

Sujets nouveaux confirmés : 4   (P3-1, P3-2, P3-3, P3-4)
À surveiller              : 5   (A-9, obs. P2.2, A-3, A-1, F-08b)
Dépendances backend       : 1   (F-08b)

Verdict : P3_PARTIEL
```

La liste P3 héritée était **vide de contenu réel** : trois sujets ne résistent
pas à la lecture du code, deux sont des fonctionnalités absentes que votre
cadrage exclut. Si P3 n'avait porté que sur cette liste, la bonne réponse
aurait été `P3_INVALIDÉ` et l'arrêt de la phase.

Mais l'inspection menée pour cet audit fait apparaître quatre écarts de
cohérence authentiques — un composant d'en-tête ignoré par trois pages, six
libellés de menu qui ne correspondent pas au titre qu'ils ouvrent, deux mots
pour une même notion, et une troncature née de P2.1. Tous sont frontend, sans
API, sans route, sans permission, et représentent au total une intervention
modeste.

C'est exactement ce que vous avez défini comme P3 : de la cohérence et de la
finition, pas une extension du produit. La phase mérite d'être menée — sur ce
contenu-là.

**Une décision vous revient avant toute implémentation** : « entreprise » ou
« organisation ». P3-2 et P3-3 en dépendent entièrement.

---

**Aucune modification effectuée.**

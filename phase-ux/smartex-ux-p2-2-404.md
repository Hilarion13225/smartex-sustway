# P2.2 — Correction 404 mono-segment

**Date** : 2026-09-16 · **Anomalie traitée** : A-7 de `smartex-ux-validation-navigateur.md`

```text
P2.2 — Correction 404 mono-segment

Anomalie :
A-7 — /app/{segment-inconnu} affichait « Entreprise introuvable ou non
accessible. » au lieu de PageIntrouvable, sans chemin de retour.

Cause :
Dans App.jsx, la route dynamique `:entrepriseId` (ligne 93) capte TOUT segment
unique sous /app. Elle est plus spécifique que la route attrape-tout `*`, qui
n'est donc jamais atteinte pour un chemin à un seul segment. React Router v6
n'offre aucune contrainte de format sur un paramètre de route : le segment
« zzz-inconnu » est un `:entrepriseId` parfaitement valide du point de vue du
routeur. `EntrepriseDetail` était donc rendu avec un identifiant inexistant, et
retombait sur son propre état vide (ligne 74).
Les chemins plus profonds n'étaient pas concernés : aucune route ne les capte,
ils atteignaient bien `*` et donc PageIntrouvable.

Correction :
Une ligne, dans EntrepriseDetail.jsx : la garde `if (!entreprise)` rend
désormais <PageIntrouvable /> au lieu de <Vide message="Entreprise introuvable
ou non accessible." />.

Le routage n'a PAS été modifié. Deux autres voies ont été écartées :
  - contraindre `:entrepriseId` au format UUID — impossible en React Router v6 ;
  - imbriquer les 19 routes `:entrepriseId/...` sous une route de garde —
    restructuration lourde de App.jsx, risque réel sur des routes qui
    fonctionnent, pour un gain identique.
La correction se place exactement là où l'anomalie se produit, et ne peut par
construction affecter aucune autre route.

Routes testées :
- /app/zzz-inconnu ............................... PASS — « Page introuvable »,
    « Adresse demandée : /app/zzz-inconnu », bouton « Tableau de bord »,
    barre latérale et en-tête conservés
- organisation valide ............................ PASS — /app/{org} rend
    EntrepriseDetail normalement (h1 « Entreprise Test Evalue », fiche,
    formule, sites), aucune erreur console
- /app/zzz/yyy/xxx ............................... PASS — inchangé,
    « Page introuvable »
- /app/{org}/audits/zzz/rubrique-inconnue ........ PASS — inchangé,
    « Page introuvable »
- 404 hors /app .................................. PASS — inchangé,
    /page-qui-nexiste-pas redirige vers la vitrine

Build :
PASS  (npx vite build → BUILD=0)

Lint :
PASS  (npm run lint → LINT=0 ; seul avertissement : Landing.jsx:19, préexistant,
       fichier non touché)

Régressions :
Aucune. Trois routes organisationnelles valides revérifiées au navigateur après
correction : /app/{org} , /app/{org}/audits , /app/{org}/audits/{mission} et
/app/{org}/rapports rendent normalement, fils d'Ariane corrects, aucune erreur
console, aucun débordement horizontal.
App.jsx non modifié par cette correction. Aucun appel API ajouté, retiré ou
modifié. Authentification, permissions, rôles et backend intacts.

Statut :
READY_FOR_BROWSER_VALIDATION
```

---

## Le changement, en entier

`frontend-react/src/pages/EntrepriseDetail.jsx` — **seul fichier modifié**.

```diff
+import PageIntrouvable from './PageIntrouvable';

   if (!entreprise) {
-    return <Vide message="Entreprise introuvable ou non accessible." />;
+    // La route `:entrepriseId` capte tout segment unique sous /app : une faute
+    // de frappe arrivait donc ici, et n'y trouvait qu'un état vide sans
+    // chemin de retour, alors que la page introuvable existe depuis P1.4 et
+    // sait justement quoi proposer. Elle ne distingue pas l'organisation
+    // inexistante de l'inaccessible — l'ancien libellé ne le faisait pas non
+    // plus, et ne pas révéler laquelle des deux est le bon réflexe.
+    return <PageIntrouvable />;
   }
```

### Sur le fait de ne pas distinguer « inexistante » de « inaccessible »

L'ancien libellé disait déjà « introuvable **ou** non accessible » : il ne
distinguait pas davantage. Le remplacer par « Page introuvable » ne perd donc
aucune information, et évite de révéler à un utilisateur qu'une organisation
existe alors qu'il n'y a pas accès. Aucune permission n'a été touchée : la
décision d'accès reste entièrement côté API, cette garde n'étant qu'un affichage.

---

## Vérification au navigateur

Chrome headless via DevTools Protocol, session SUPER_ADMIN authentifiée, après
`docker compose restart frontend-react` — le HMR n'étant pas fiable à travers le
bind-mount Docker/Windows (A-1). Le module servi par Vite a été contrôlé avant
les tests : `PageIntrouvable` y est bien présent.

| # | URL | `h1` observé | Console | Débordement |
|---|---|---|---|---|
| V1 | `/app/zzz-inconnu` | **Page introuvable** | 2 × 404 d'API | aucun |
| V2 | `/app/{org}` | Entreprise Test Evalue | aucune | aucun |
| V3 | `/app/zzz/yyy/xxx` | Page introuvable | aucune | aucun |
| V4 | `/app/{org}/audits/zzz/rubrique-inconnue` | Page introuvable | aucune | aucun |
| V5 | `/page-qui-nexiste-pas` | vitrine (`/`) | aucune | aucun |
| V6 | `/app/{org}/audits` | Missions d'audit | aucune | aucun |
| V7 | `/app/{org}/audits/{mission}` | Campagne RSE 2026 — portefeuille test | aucune | aucun |
| V8 | `/app/{org}/rapports` | Rapports RSE | aucune | aucun |

V7 confirme au passage que le fil d'Ariane reste conforme après correction :
`Entreprise Test Evalue › Missions › Campagne RSE 2026 — portefeuille test` —
le niveau d'organisation est bien présent pour ce compte multi-organisations.

---

## Une observation, non corrigée

**Les deux erreurs 404 d'API en console sur V1 subsistent.** `EntrepriseDetail`
appelle `/abonnement` et `/sites` depuis ses `useEffect`, qui s'exécutent avant
la garde `if (!entreprise)` — c'est l'ordre imposé par les règles des hooks
React. Ces appels partent donc avec un identifiant inexistant et reçoivent un
404.

Rien n'est cassé : l'écran est correct, les deux appels ont leur `.catch`, et
l'utilisateur ne voit rien. Ce sont deux requêtes inutiles et deux lignes de
console. Les supprimer demanderait d'ajouter une garde à l'intérieur des deux
`useCallback`, ce qui dépasse la correction demandée — vous aviez écrit
« aucune autre correction UX ». Je le signale pour arbitrage.

---

**Aucune modification backend, API, base de données, route, rôle ou permission.
Aucun commit, aucun push.** Un seul fichier de code modifié.

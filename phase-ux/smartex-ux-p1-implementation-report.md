# SMARTEX SUSTWAY — Rapport d'implémentation UX P1

**Date** : 2026-09-16
**Périmètre** : `frontend-react/src` uniquement
**Verdict** : `READY_FOR_UX_P2`

---

## A. Résumé

Les quatre chantiers autorisés sont implémentés :

| Chantier | Objet | État |
|---|---|---|
| P1.1 | Fil d'Ariane sur les 5 pages de portée mission | Fait |
| P1.2 | Clarification de portée mission / organisation | Fait |
| P1.3 | États d'erreur distincts de l'état vide | Fait |
| P1.4 | Page « introuvable » interne à l'espace de travail | Fait |

`npx vite build` → **BUILD=0**. `npm run lint` → **LINT=0** (un avertissement
préexistant sur `Landing.jsx:19`, fichier non touché).

Aucun commit, aucun push. Rien n'a été engagé côté backend, base, migrations,
référentiels, scoring, IA, authentification, permissions ou statuts.

---

## B. P1.1 — Fil d'Ariane

`Breadcrumb.jsx`, créé en P0, est **réutilisé tel quel** ; aucun second composant
de fil d'Ariane n'a été créé, et le composant n'a pas été modifié.

| Page | Fil posé | Libellé de la mission |
|---|---|---|
| `AuditScore.jsx` | Missions d'audit › {mission} › Score | `audit.nom`, déjà chargé |
| `Rapports.jsx` | Missions d'audit › {mission} › Rapports | `audit?.nom ?? 'Mission'` |
| `IndicePreparation.jsx` | Missions d'audit › {mission} › Indice de préparation | `audit.nom`, déjà chargé |
| `NonConformites.jsx` | Missions d'audit › Mission › Non-conformités | libellé générique |
| `PlanAmeliorationDetail.jsx` | Plans d'amélioration › Mission › {plan.titre} | libellé générique |

**Aucun appel API n'a été ajouté pour alimenter un fil d'Ariane.** Là où la page
ne charge pas déjà la mission (`NonConformites`, `PlanAmeliorationDetail`), le
niveau intermédiaire porte le libellé générique « Mission » et reste cliquable
vers la fiche de la mission : le chemin de retour est exact, seul le nom manque.
C'est le compromis assumé — un nom deviné aurait pu être faux, un appel
supplémentaire était explicitement interdit.

Les boutons « ← Retour » existants sont **conservés** sur toutes ces pages :
remonter d'un cran et sauter à un niveau nommé ne sont pas le même geste.

---

## C. P1.2 — Portée mission / organisation

Deux paires de pages portaient des titres quasi identiques pour des portées
différentes. Aucune page n'a été fusionnée, supprimée ni renommée ; seules les
descriptions ont été rendues explicites.

| Fichier | Portée | Formulation ajoutée |
|---|---|---|
| `Rapports.jsx` | mission | « Rapports de cette mission — génération et téléchargement. Pour les rapports de toutes les missions, voir « Rapports » dans le menu de l'organisation. » |
| `NonConformites.jsx` | mission | « Écarts détectés sur cette mission et actions correctives associées. Pour les écarts de toutes les missions, voir « Non-conformités » dans le menu de l'organisation. » |
| `RapportsEntreprise.jsx` | organisation | ajout de « toutes missions confondues » dans la description |

**`NonConformitesEntreprise.jsx` n'a pas été modifié** : sa description dit déjà
« écarts détectés sur toutes les missions ». La règle « ne pas modifier un
fichier simplement pour uniformiser le code » s'applique — le besoin y est déjà
couvert.

---

## D. P1.3 — États d'erreur

### D.1 `RapportsEntreprise.jsx` — le cas signalé

Le défaut était réel et exactement celui décrit dans l'autorisation :

```js
.catch(() => setAudits([]))
```

Un échec de `GET /entreprises/{id}/audits` produisait un tableau vide, et la page
affichait alors « Aucune mission pour l'instant — créez-en une… ». Une API
indisponible et une organisation sans mission rendaient le même écran. Un
utilisateur pouvait en conclure que ses rapports avaient disparu.

Correction : état `erreur` distinct, message issu de `ApiError` quand il existe,
`Alerte ton="rouge"` sous le titre, et l'état vide **n'est plus rendu en cas
d'erreur** (`) : erreur ? null : (`) — c'est ce dernier point qui supprime
réellement le faux message, l'alerte seule l'aurait laissé sous les yeux.

### D.2 `PipelineIA.jsx` — seulement le `catch {}` global

Les replis par mission sont **intacts**, conformément à la consigne :

- `.catch(() => [])` sur `/documents` — inchangé
- `.catch(() => null)` sur `/audits/{id}/score` — inchangé

Seul le `catch {}` global a été traité. À ce niveau, le seul appel qui peut
encore échouer est la liste des missions elle-même : le `setLignes([])` affichait
« aucune mission » alors que le pipeline existe. Il est remplacé par un état
d'erreur global, avec le même verrou sur l'état vide.

### D.3 `Journal.jsx` — fin de liste ≠ échec

Le comportement a été vérifié avant modification, comme demandé.
`.catch(() => setFinAtteinte(true))` servait bien de garde-fou de pagination :
en cas d'échec, le bouton « Charger plus » disparaissait. Mais `finAtteinte`
signifie « le journal est complet », et le lot court est le seul signal légitime
de cette fin. Un échec réseau se présentait donc comme un journal complet.

Modification volontairement étroite :

- `setPage(numeroPage)` déplacé **dans le `.then`** : une page qui échoue n'est
  plus comptée comme lue. Sans cela, une reprise serait repartie de la page
  suivante et aurait sauté silencieusement les entrées manquantes.
- `chargerSuite()` passe de trois lignes à une (`charger(page + 1)`).
- `.catch` renseigne `erreur` au lieu de `finAtteinte`.
- L'alerte s'affiche sous la barre de filtre ; le message « Aucune entrée dans le
  journal » n'est plus rendu en cas d'erreur.
- Le bouton reste visible et devient **« Réessayer »** : il relance la même page.
- `useEffect` réinitialise `page` **et** `finAtteinte` au changement
  d'organisation — sans le second, un journal court laissé par une organisation
  précédente aurait masqué le bouton pour la suivante.

Aucun nouveau mécanisme de pagination, aucune bibliothèque, aucun appel API
supplémentaire.

---

## E. P1.4 — Page introuvable

**Créé** : `src/pages/PageIntrouvable.jsx`.
**Une seule route ajoutée**, à l'intérieur du `Layout` sous `/app` :

```jsx
<Route path="*" element={<PageIntrouvable />} />
```

La redirection globale `<Route path="*" element={<Navigate to="/" replace />} />`
est **conservée intacte** pour tout ce qui est hors `/app` : la vitrine garde son
comportement actuel.

La page reste dans le Layout — navigation, en-tête et barre latérale habituels —
parce que le défaut d'origine était précisément de sortir l'utilisateur de son
espace de travail sur une simple faute de frappe, ce qui se lit comme une
déconnexion.

Point technique : une route attrape-tout ne porte pas `:entrepriseId`. Plutôt que
de deviner, la page relit le premier segment après `/app/` et le **confronte aux
organisations réellement accessibles** via `useApiAuth().entreprises` — déjà en
mémoire. Aucun appel API n'est émis, et aucun lien n'est proposé vers une
organisation que l'utilisateur ne pourrait pas ouvrir. Le retour au tableau de
bord est toujours offert.

---

## F. Fichiers touchés

**Créés (2)**

- `src/pages/PageIntrouvable.jsx`
- *(`src/components/Breadcrumb.jsx` date de P0 — réutilisé, non modifié)*

**Modifiés en P1 (9)**

| Fichier | Chantier |
|---|---|
| `src/App.jsx` | P1.4 (4 lignes ajoutées, aucune supprimée) |
| `src/pages/AuditScore.jsx` | P1.1 |
| `src/pages/IndicePreparation.jsx` | P1.1 |
| `src/pages/PlanAmeliorationDetail.jsx` | P1.1 |
| `src/pages/Rapports.jsx` | P1.1 + P1.2 |
| `src/pages/NonConformites.jsx` | P1.1 + P1.2 |
| `src/pages/RapportsEntreprise.jsx` | P1.2 + P1.3 |
| `src/pages/PipelineIA.jsx` | P1.3 |
| `src/pages/Journal.jsx` | P1.3 |

Les autres entrées du `git diff` (`Layout.jsx`, `TableauDeBord.jsx`,
`AuditsListe.jsx`, `TableMissions.jsx`, `Questionnaire.jsx`, `AuditDetail.jsx`,
`CritereEvaluation.jsx`, `SaisieCritereMission.jsx`) proviennent de P0 et n'ont
pas été retouchées.

---

## G. Contrôles de périmètre

| Contrôle | Résultat |
|---|---|
| `npx vite build` | **BUILD=0** |
| `npm run lint` | **LINT=0** (1 avertissement préexistant, `Landing.jsx`) |
| `git diff src/App.jsx` | 4 lignes, **uniquement** P1.4 (import + route + commentaire) |
| `git diff src/auth/` | **vide** |
| `git diff` filtré sur `api.get\|post\|put\|delete\|patch` | **vide** — aucun appel API ajouté, retiré ni modifié |
| Backend / DB / migrations / référentiels | non touchés |
| Pages supprimées ou fusionnées | aucune |
| Composants Header / Logo / Sidebar / Breadcrumb dupliqués | aucun |
| Fonctionnalité métier nouvelle | aucune |

---

## H. Réserves et points laissés ouverts

1. **Deux fils d'Ariane portent « Mission » au lieu du nom réel**
   (`NonConformites`, `PlanAmeliorationDetail`). Le chemin est juste, le libellé
   est générique. Le résoudre demanderait soit un appel API — interdit ici —,
   soit de faire transiter `audit.nom` par le `state` du routeur depuis les pages
   amont, ce qui dépasse P1 et n'est fiable que si l'on arrive par un lien.
   À trancher en P2.

2. **`Journal` : le bouton « Réessayer » relance la même page**, il ne relance
   pas les pages déjà chargées. C'est le comportement voulu — les entrées déjà
   obtenues restent à l'écran — mais si la première page échoue, la liste est
   vide et le bouton porte quand même « Réessayer », ce qui est correct sans être
   très explicite.

3. **`PipelineIA` : les replis par mission restent silencieux.** Un score
   indisponible affiche « — » sans indiquer pourquoi. C'était intentionnel selon
   l'audit P1 et n'a pas été touché, mais l'écart entre « non évalué » et « score
   non chargé » reste invisible. À arbitrer en P2 si vous le jugez gênant.

4. **Les autres pages n'ont pas été auditées à nouveau** pour ce motif. P1.3 ne
   couvre que les trois fichiers autorisés ; d'autres `.catch` silencieux
   existent probablement ailleurs dans le frontend.

5. **Aucun test automatisé** : le frontend n'en a pas de cadre. Les vérifications
   se limitent au build, au lint et à la lecture du diff.

---

## I. Verdict

**`READY_FOR_UX_P2`**

Les quatre chantiers P1 sont livrés en entier, le build et le lint passent, et
les trois contrôles de non-débordement (`App.jsx`, `src/auth/`, appels API) sont
conformes. Les réserves de la section H sont des points d'arbitrage pour P2, pas
des travaux inachevés de P1.

**Arrêt ici**, comme convenu : pas de commit, pas de push, pas de P2, et le
travail d'import du référentiel 2.2 reste en pause.

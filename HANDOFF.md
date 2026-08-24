# Smartex Sustway — Contexte de session (pour reprise sur Devin)

Document de passation généré à la fin d'une session de travail avec Claude Code. Couvre : ce qui a été construit, les décisions prises, l'état de l'environnement, et ce qui reste à faire.

## 1. Le produit

Smartex Sustway est une plateforme d'évaluation RSE (édité par Smartex Expertises) : un visiteur découvre le produit, s'inscrit, choisit une formule (Free/Standard/Avancées), crée une ou plusieurs entreprises avec abonnement, lance des missions d'audit sur le référentiel Smartex Sustway (87 critères), dépose des preuves documentaires, déclenche une évaluation IA (pipeline d'agents Gemini : Document → Evidence/Compliance → [Risk/Recommendation en formule Avancées]), et consulte les résultats (score, non-conformités, rapports, indice de préparation aux financements verts IFC/SFI en formule Avancées).

Stack : **Quarkus** (api-quarkus, Java 21) + **Python/FastAPI** (services-ia-python, pipeline d'agents IA) + **React** (frontend-react, JSX + Tailwind, PAS TypeScript) + **PostgreSQL** + **MinIO** (stockage documents) + **ClamAV** (antivirus) + **Redis**.

## 2. Ce qui existait déjà avant cette session

- Vitrine publique, inscription, vérification email (Brevo), connexion + 2FA optionnelle (SMS/app)
- Espace connecté : gestion entreprises/sites/profil, paiement d'abonnement (stub PI-SPI/Wave)
- Frontend audits/preuves/évaluations déjà câblé : `AuditsListe.jsx`, `AuditDetail.jsx`, `CritereEvaluation.jsx` (dépôt preuve + déclenchement IA), `RevueExperteQueue.jsx`
- Backend : composition dynamique du questionnaire (87 critères figés à la création de l'audit), pipeline IA fonctionnel, `ScoringEngine` (classe pure, calculs RG26/RG27/RG31/RG32), scan antivirus ClamAV réel, stockage MinIO réel

## 3. Ce qui a été construit pendant cette session

### 3.1 Agrégation des scores (tableau de bord)
- **Backend** : `AuditScoreService` (package `scoring`) — calcule score global + score par domaine via `ScoringEngine.scorePondere`, restreint aux critères actifs/applicables ayant une évaluation `VALIDEE`. Réutilisé par le tableau de bord ET par la génération de rapports (jamais dupliqué). `AuditScoreDto` inclut aussi `repartitionNiveaux` (histogramme des niveaux d'engagement 1-5).
- **Endpoint** : `GET /api/v1/entreprises/{entrepriseId}/audits/{auditId}/score`
- **Frontend** : `AuditScore.jsx` — StatCards + graphiques Chart.js (radar par domaine, barres horizontales répartition niveaux, anneau non-conformités par priorité)
- **Design retenu** : un critère non évalué n'est PAS compté comme 0/5 dans le score — il est exclu du calcul et affiché séparément (nombreCriteresNonEvalues). Décision validée avec l'utilisateur.

### 3.2 Non-conformités & actions correctives (module 11, RG17/RG18)
- Tables `non_conforme`/`action_corrective` existaient en base (migration V1) mais n'étaient jamais alimentées — entièrement construit.
- **`NonConformiteService`** : génère automatiquement une non-conformité quand une évaluation devient `VALIDEE` avec un niveau d'engagement < 5/5, en réutilisant `ScoringEngine.risqueAttendu`/`prioriteNonConformite` (RG26) pour la priorité (MINEURE/MODEREE/MAJEURE/CRITIQUE). Branché sur les deux points où une évaluation devient définitive : validation directe IA (`EvaluationResource`) et traitement d'une revue experte (`RevueExperteResource`).
- **Design retenu (à reconfirmer si besoin)** : TOUT écart (niveau 1 à 4) génère une non-conformité, pas seulement les cas graves — la sévérité est reflétée par le niveau, pas par un filtre binaire. Le code source lui-même indique que les seuils RG26 sont provisoires (à calibrer avec les experts métier).
- **Endpoints** : `NonConformeResource` (liste, détail, changement de statut) et `ActionCorrectiveResource` (liste, création, changement de statut), nested sous `/entreprises/{id}/audits/{auditId}/non-conformites`.
- **Frontend** : `NonConformites.jsx`.

### 3.3 Rapports (module 12) — CSV + PDF
- Table `rapport` existait, jamais alimentée.
- **Nouvelle dépendance** : `com.github.librepdf:openpdf:3.0.5` (génération PDF pure Java, package `org.openpdf.text.*`).
- **`RapportGenerationService`** : réutilise `AuditScoreService` (même chiffre affiché partout). Les 4 types sont implémentés : `SYNTHESE` (score + non-conformités), `DETAILLE` (idem + une ligne par critère de l'audit), `PLAN_ACTION` (une ligne par action corrective, RG18), `INDICE_FINANCEMENTS_VERTS` (recalcule via `IndicePreparationService`, RG42, + détail des critères tagués pour le bailleur choisi). Format EXCEL toujours rejeté en 400 (non implémenté).
- **Endpoints** : `RapportResource` (génération, liste, téléchargement authentifié) — garde par type, pas une seule vérification `rapport:consulter` générique : `DETAILLE` exige `rapport:detaille` (réservé au personnel interne Smartex), `INDICE_FINANCEMENTS_VERTS` reprend la garde de `IndicePreparationResource` (`bailleur:consulter` + formule Avancées de l'audit), appliquée aussi au téléchargement pour ne pas laisser un rapport déjà généré moins gardé que sa création.
- **Frontend** : `Rapports.jsx` + `telechargerFichierProtege()` dans `apiClient.js` (un lien `<a href>` classique ne peut pas porter le token JWT, d'où un fetch manuel + blob).
- **Bug corrigé en cours de route** : incohérence de formatage décimal (BigDecimal.ZERO scale 0 vs scale 4 du calcul normal) — corrigé avec un helper `formaterScore()`.

### 3.4 Back-office référentiel (module 4)
- APIs déjà prêtes côté serveur (`ReferentielResource`, `DomaineResource`, `CritereCreationResource`, `CritereModificationResource`, `CriticiteSecteurResource`) mais **aucune UI**.
- **Frontend** : `ReferentielsListe.jsx` (liste + création + changement de statut) et `ReferentielDetail.jsx` (domaines + critères + criticité sectorielle), réservés à SUPER_ADMIN.
- **Bugs réels trouvés et corrigés en testant** :
  - `CritereDto` n'exposait pas `description`/`actif` → un formulaire d'édition aurait écrasé la description et réactivé un critère désactivé par erreur. Corrigé.
  - `CritereRepository.parReferentiel` filtrait `actif = true` → un critère désactivé disparaissait de l'écran d'administration sans moyen de le réactiver. Corrigé (le filtre actif=true reste correct pour `applicables()`, utilisé par la composition de questionnaire).
  - Création d'un critère en doublon (code déjà pris dans le domaine) renvoyait une **500 brute** (ConstraintViolationException non gérée) au lieu d'une 409 propre. Corrigé pour suivre le pattern déjà utilisé par `ReferentielResource`/`DomaineResource`.

### 3.5 Indice de préparation IFC/SFI (financements verts, RG39-RG43, formule Avancées)
- Tables `bailleur`, `critere_bailleur`, `indice_preparation` existaient, jamais alimentées.
- **Mécanisme confirmé par inspection DB** : les référentiels PRI/GRESB/ITIE/IFC_SFI dans la table `referentiel` sont des lignes placeholder vides (0 domaine) — pas le vrai mécanisme. Le vrai mécanisme est la table transversale `critere_bailleur` : on tague certains critères de SMARTEX_SUSTWAY comme applicables à un bailleur (IFC_SFI est le seul bailleur seedé), et l'indice se calcule avec `ScoringEngine.scorePondere` restreint à CES critères tagués — même moteur que le score global, périmètre différent.
- **`IndicePreparationService`**, **`CritereBailleurResource`** (back-office, tag/untag), **`IndicePreparationResource`** (calcul + liste, réservé formule Avancées — **aucune exception pour le staff Smartex, restriction stricte confirmée avec l'utilisateur**, contrairement à ce qu'un modèle de permissions générique aurait suggéré).
- **Frontend** : `IndicePreparation.jsx` + panneau "Financements verts — bailleur" dans `ReferentielDetail.jsx`.

### 3.6 Système de permissions (porté d'un prototype de référence, voir section 4)
- **`frontend-react/src/auth/permissions.js`** : `PERMISSIONS_PAR_ROLE`, `RESTRICTIONS_PAR_PLAN`, `possedePermission(role, plan, permission)`, `ROLE_LIBELLE`.
- **`peut(permission, plan?)`** exposé par `ApiAuthContext.jsx`.
- **Nuance vs le prototype de référence** : `plan` est passé par l'appelant (pas lu d'un état global), car un compte peut être rattaché à plusieurs entreprises à des formules différentes dans le vrai backend (le prototype supposait une seule formule active par utilisateur).
- **Pages refactorisées** pour utiliser `peut()` au lieu de vérifications de rôle brutes : `Layout.jsx` (nav + libellé de rôle), `ReferentielsListe.jsx`, `ReferentielDetail.jsx`, `RevueExperteQueue.jsx`, `EntrepriseDetail.jsx` (lien revue experte + gestion sites), `AuditsListe.jsx` (bouton "Nouvel audit"), `CritereEvaluation.jsx` (formulaire dépôt preuve, utilise la formule **figée sur l'audit** `audit.formuleCode`, pas l'abonnement courant, pour rester cohérent avec la logique backend RG20/RG21).
- **Deux divergences trouvées et tranchées avec l'utilisateur** (voir section 4.2) : `bailleur:consulter` (pas de bypass staff) et `entreprise:creer` (ajouté au modèle mais pas utilisé pour gater le bouton, sinon ça casserait l'auto-inscription).
- **Pas encore fait** : `Entreprises.jsx` n'a aucun gating (le bouton "Nouvelle entreprise" reste toujours visible, comportement actuel volontairement conservé).

### 3.7 Tableau de bord enrichi de graphiques
- **`frontend-react/src/components/charts.jsx`** : porté du prototype (Chart.js), `GraphiqueRadar`, `GraphiqueBarres`, `GraphiqueAnneau`. Couleurs identiques à la palette Tailwind du projet (brand-600 = #128257 des deux côtés).
- **Non porté** : `GraphiqueLigne` (évolution du score dans le temps — pas de stockage d'historique de scores dans le backend réel) et le benchmark sectoriel cross-entreprises (pas d'agrégation cross-tenant dans le backend réel). Ajouter ces deux visuels nécessiterait soit inventer des données, soit un vrai chantier backend d'agrégation.

## 4. Le prototype de référence (TypeScript, données mockées)

L'utilisateur a fourni un ancien frontend TSX avec données mockées, extrait dans :
`C:\Users\yaoko\Downloads\Projet_Smartex\ancien-frontend-tsx\smartex-sustway-tsx\`

C'est un **prototype de design/UX**, pas du code à copier tel quel (aucun appel API réel, données 100% mockées dans `src/data/mock.ts`). Il a servi de référence pour :
- Le modèle de permissions centralisé (`src/auth/permissions.ts`, `src/auth/AuthContext.tsx`) — **porté**, voir 3.6.
- La structure de navigation (3 groupes : Pilotage / Audit / Administration) — **partiellement portée** (nav actuelle plus simple, pas de restructuration complète en groupes).
- Les graphiques (`src/components/charts.tsx`) — **porté**, voir 3.7.

Toutes les pages du prototype ont désormais un équivalent réel côté API (branché sur les vraies données, plus de mock) : `Journal.jsx` (journal d'audit), `ComparaisonEntreprises.jsx`, `Utilisateurs.jsx`, `Abonnement.jsx`, `PlanActions.jsx` (plan d'actions correctives transverse, RG18 — distinct de la vue par non-conformité), `PipelineIA.jsx`, `Documents.jsx` (bibliothèque documentaire de l'entreprise, distincte du dépôt de preuve par critère). `TableauDeBord.jsx` joue le rôle de vue portefeuille consolidée cross-entreprises pour le staff (voir son propre docstring : agrégation faite côté client faute d'endpoint d'agrégation multi-entreprises côté API — à surveiller niveau performance maintenant que SUPER_ADMIN peut voir des dizaines d'entreprises, voir §4.3). Aucune page du prototype ne reste à porter.

### 4.1 Divergence de fond identifiée (pas corrigée, en attente d'arbitrage si applicable)
Le prototype réserve `entreprise:creer` à SUPER_ADMIN/ADMIN_AUDIT (modèle "staff onboarde les clients"). Le vrai backend fonctionne en **auto-inscription** (RG05 : le créateur devient responsable). **Tranché avec l'utilisateur : garder l'auto-inscription actuelle.** `entreprise:creer` est dans le modèle de permissions pour RESPONSABLE_ENTREPRISE mais volontairement pas utilisé pour gater `Entreprises.jsx`.

### 4.2 Autre divergence tranchée
Le modèle générique du prototype dit que le staff Smartex (SUPER_ADMIN/ADMIN_AUDIT/EXPERT_REVIEWER) ne devrait jamais être bridé par la formule d'un client pour `bailleur:consulter`. **Tranché avec l'utilisateur : non, restriction stricte sur la formule de l'audit, staff inclus.** `IndicePreparation.jsx` n'utilise donc PAS `peut('bailleur:consulter', ...)` — juste une vérification directe de `audit.formuleCode === 'AVANCEES'`.

### 4.3 SUPER_ADMIN : accès global tranché avec l'utilisateur
Jusqu'ici, même SUPER_ADMIN avait besoin d'un rattachement `utilisateur_entreprise` explicite pour agir sur une entreprise donnée, comme n'importe quel autre rôle. **Tranché avec l'utilisateur : SUPER_ADMIN a désormais un accès global complet (lecture ET écriture) à toutes les entreprises de la plateforme, sans rattachement préalable requis.** Implémenté via `AutorisationService.estSuperAdminGlobal(utilisateurId)` (vrai dès qu'un rattachement, sur n'importe quelle entreprise, porte le rôle SUPER_ADMIN) : toutes les méthodes de contrôle du service court-circuitent dessus, et `EntrepriseResource.mesEntreprises()` renvoie la liste complète des entreprises pour un SUPER_ADMIN global au lieu de ses seuls rattachements. Les autres rôles internes (ADMIN_AUDIT, EXPERT_REVIEWER) restent bornés à leurs rattachements explicites — ce choix ne concerne que SUPER_ADMIN.

## 5. Environnement de test (état actuel)

Stack Docker complète tournant localement (`docker compose up -d` depuis la racine du repo) :

| Service | Port |
|---|---|
| Frontend React (Vite dev) | http://localhost:5173 |
| API Quarkus | http://localhost:8080 |
| Services IA Python | http://localhost:8000 |
| PostgreSQL | 5432 (smartex/smartex/smartex_sustway) |
| MinIO (S3) | 9000 (API) / 9001 (console) |
| Redis | 6379 |
| ClamAV | 3310 |

**Après toute modification du backend Java**, il faut reconstruire l'image et redémarrer : `docker compose build api-quarkus && docker compose up -d api-quarkus`.

**Le conteneur frontend sert parfois du code Vite obsolète** après des éditions rapides (rechargement à chaud désynchronisé) — un `docker compose restart frontend-react` résout systématiquement le problème. Vérifier avec `curl http://localhost:5173/src/App.jsx | grep <nom-du-nouveau-composant>` avant de tester dans le navigateur.

### Comptes de test (entreprise "Sustway Test SARL", audit "Audit E2E Non-Conformités", formule Avancées)

| Rôle | Email | Mot de passe |
|---|---|---|
| RESPONSABLE_ENTREPRISE (propriétaire) | `aissatou.diallo.gxvtdw5f@example.com` | `MotDePasse123!` |
| SUPER_ADMIN | `moussa.traore.7tlfsudl@example.com` | `MotDePasse123!` |
| ADMIN_AUDIT | `fatou.kone.okyncmgq@example.com` | `MotDePasse123!` |
| EXPERT_REVIEWER | `ibrahima.sow.0fsleo5l@example.com` | `MotDePasse123!` |
| VISITEUR | `cheikh.ndiaye.su4tvb74@example.com` | `MotDePasse123!` |

> Le rôle EMPLOYE a été retiré des rôles attribuables (décision produit :
> en v1, seul le responsable de l'entreprise est audité). L'ancien compte
> de test `mariam.ba.6yhinyvy@example.com` a son rattachement passé à
> INACTIF plutôt que supprimé — le rôle EMPLOYE reste défini en base
> (table `role`, permissions `preuve:deposer`/`rapport:consulter` via
> V15) pour une réintroduction simple si pertinent dans une version
> ultérieure. Voir les commentaires dans `MembreEntrepriseResource.java`
> et `auth/permissions.js`.

Aucun endpoint n'existe pour attribuer un rôle à un compte existant — seul le créateur d'une entreprise devient automatiquement RESPONSABLE_ENTREPRISE (RG05). Les 5 autres rôles ont été rattachés directement en base (`INSERT INTO utilisateur_entreprise ...`), suivant le même contournement que les scripts PowerShell déjà présents dans le repo (`test_backoffice_crud.ps1`, `test_criticite_secteur.ps1`, etc.).

**Piège découvert en écrivant les tests JUnit** : le rôle embarqué dans le JWT est celui du rattachement `utilisateur_entreprise` le PLUS ANCIEN. Si un compte crée d'abord sa propre entreprise (devient RESPONSABLE_ENTREPRISE) puis qu'on lui rattache un autre rôle ensuite, le JWT garde RESPONSABLE_ENTREPRISE. Toujours créer l'entreprise support avec un utilisateur JETABLE distinct du compte dont on veut tester le rôle. Voir `UtilisateurDeTest.creerAvecRole(...)` (helper de test réutilisable ajouté cette session).

## 6. État des tests

**Backend** : 103/103 tests passent (`mvn test` depuis `api-quarkus/`). Nouveaux fichiers de test ajoutés cette session : `NonConformeResourceTest`, `RapportResourceTest`, `BackOfficeReferentielResourceTest`, `IndicePreparationResourceTest`.

**Frontend** : `npm run lint` (oxlint) et `npm run build` propres après chaque changement.

**Pas de test automatisé pour** : la génération automatique de non-conformités (dépend du pipeline IA réel, non mockable facilement dans ces tests) ni pour `RevueExperteResource` (aucun test JUnit n'existe pour cette ressource, gap pré-existant avant cette session).

## 7. Nettoyage effectué

Un référentiel de test créé par erreur (`TEST_BO_192766`) et un domaine/critère de test injectés accidentellement dans le VRAI référentiel SMARTEX_SUSTWAY (via un mauvais clic dans un script de test navigateur) ont été nettoyés — SMARTEX_SUSTWAY est revenu à ses 87 critères/6 domaines d'origine, vérifié après coup.

Un référentiel `TEST_BACKOFFICE_629131061` existe encore en base — **pas créé par moi**, laissé en place car probablement issu d'un script de test manuel antérieur du repo (`test_backoffice_crud.ps1`), pas à ma discrétion de supprimer sans confirmation.

## 8. Fichiers clés modifiés/créés cette session

**Backend** (`api-quarkus/src/main/java/com/smartexsustway/api/`) :
- `scoring/AuditScoreService.java`, `resource/dto/AuditScoreDto.java`
- `conformite/NonConformiteService.java`, `domain/entity/{NonConforme,ActionCorrective}.java`, `resource/{NonConforme,ActionCorrective}Resource.java`
- `rapport/{RapportGenerationService,RapportGenerationException}.java`, `domain/entity/Rapport.java`, `resource/RapportResource.java`
- `indice/IndicePreparationService.java`, `domain/entity/{Bailleur,IndicePreparation}.java`, `resource/{Bailleur,CritereBailleur,IndicePreparation}Resource.java`
- Corrections : `resource/dto/{CritereDto,AuditDto}.java`, `domain/repository/CritereRepository.java`, `resource/CritereCreationResource.java`
- Tests : `resource/{NonConforme,RapportResource,BackOfficeReferentiel,IndicePreparationResource}Test.java`, `resource/support/UtilisateurDeTest.java` (helper `creerAvecRole`)
- `pom.xml` : dépendance `openpdf` 3.0.5

**Frontend** (`frontend-react/src/`) :
- `pages/{AuditScore,NonConformites,Rapports,ReferentielsListe,ReferentielDetail,IndicePreparation}.jsx`
- `auth/permissions.js` (nouveau), `auth/ApiAuthContext.jsx` (ajout `peut()`)
- `components/charts.jsx` (nouveau)
- `components/Layout.jsx`, `pages/{EntrepriseDetail,AuditsListe,CritereEvaluation,RevueExperteQueue}.jsx` (gating via `peut()`)
- `lib/apiClient.js` (ajout `telechargerFichierProtege`)

## 9. Pour reprendre proprement

1. Vérifier que Docker tourne : `docker compose ps` depuis la racine du repo.
2. Si le frontend semble servir du code ancien : `docker compose restart frontend-react`.
3. Se connecter avec un des comptes de la section 5 pour explorer l'état actuel.
4. Le prototype de référence reste disponible à `C:\Users\yaoko\Downloads\Projet_Smartex\ancien-frontend-tsx\smartex-sustway-tsx\` pour comparer la logique métier/rôles avant d'ajouter de nouvelles pages.
5. L'ensemble du travail de cette session est déjà commité : commit `253812e` (« Finalisation de la 1er version », branche `main`, à jour avec `origin/main`). Seul `HANDOFF.md` (ce fichier) reste non suivi au moment de la rédaction.

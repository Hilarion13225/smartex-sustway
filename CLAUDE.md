# Smartex Sustway

Plateforme d'evaluation RSE editee par SMARTEX Expertises. Un client s'inscrit, choisit une formule (Free/Standard/Avancees), cree une entreprise, lance des missions d'audit sur le referentiel Smartex Sustway (87 criteres, 6 domaines), depose des preuves documentaires, declenche une evaluation IA (pipeline d'agents Gemini), et consulte les resultats (score, non-conformites, rapports, indice bailleur IFC/SFI en formule Avancees).

## Stack technique

| Service | Techno | Dossier |
|---|---|---|
| API backend | Java 21 / Quarkus | `api-quarkus/` |
| Pipeline IA | Python 3.12 / FastAPI | `services-ia-python/` |
| Frontend | React 19 / Vite / Tailwind CSS 3 | `frontend-react/` |
| Base de donnees | PostgreSQL 16 | `database/` (schema + seeds) |
| Stockage docs | MinIO (S3) | via Docker |
| Antivirus | ClamAV | scan obligatoire a l'upload |
| Cache | Redis 7 | |

## Environnement de dev (Docker)

```bash
docker compose up -d                # stack complete
docker compose ps                   # verification
```

| Service | Port hote | Port interne |
|---|---|---|
| Frontend (Vite) | 5175 | 5173 |
| API Quarkus | 8090 | 8080 |
| Services IA | 8000 (loopback) | 8000 |
| PostgreSQL | 5434 | 5432 |
| MinIO API/Console | 9002 / 9003 | 9000 / 9001 |
| Redis | 6379 | 6379 |
| ClamAV | 3310 | 3310 |
| Adminer (optionnel) | 8081 | 8080 |

Les ports hote sont decales : un autre projet local occupe les ports standards.

### Rebuild apres modification

```bash
# Backend Java
docker compose build api-quarkus && docker compose up -d api-quarkus

# Frontend (si hot reload desynchronise)
docker compose restart frontend-react
```

### Dev hors Docker

```bash
# Frontend
cd frontend-react && npm install && npm run dev

# Backend (JDK 21 + Maven)
cd api-quarkus && mvn quarkus:dev

# IA (Python 3.12)
cd services-ia-python && python -m venv .venv && source .venv/bin/activate && pip install -r requirements.txt && uvicorn app.main:app --reload
```

## Tests

```bash
# Backend — lancer depuis api-quarkus/ avec les ports hote
export SMARTEX_DB_URL=jdbc:postgresql://localhost:5434/smartex_sustway
export SMARTEX_S3_ENDPOINT=http://localhost:9002
mvn test

# Frontend
cd frontend-react && npm run lint && npm run build
```

## Structure du code

### Backend (`api-quarkus/src/main/java/com/smartexsustway/api/`)

```
domain/entity/         Entites JPA (Critere, Evaluation, Mission, etc.)
domain/repository/     Repositories Panache
domain/enums/          Enums metier
resource/              Endpoints REST (JAX-RS)
resource/dto/          DTOs de transfert
security/              AutorisationService, RBAC, TenantContext
scoring/               AuditScoreService, ScoringEngine, ScoreHistoriqueService
mission/               Analyse IA (AnalyseCritereService, AnalyseMissionService)
referentiel/           Import/validation de referentiels
conformite/            Non-conformites et actions correctives
rapport/               Generation de rapports PDF/CSV
indice/                Indice de preparation bailleur (IFC/SFI)
```

### Frontend (`frontend-react/src/`)

```
pages/                 Pages (une page = un fichier JSX)
components/            Composants reutilisables (Layout, Modale, charts, etc.)
auth/                  ApiAuthContext, permissions.js, useApiAuth
lib/                   Utilitaires (apiClient, jwt, navigation, etc.)
```

### Migrations (`api-quarkus/src/main/resources/db/migration/`)

Flyway, nommage `V{n}__{description}.sql`. Derniere : V78.

## Conventions

### Backend
- Java 21, pas de Lombok — records ou getters explicites
- Quarkus avec `@QuarkusTest` pour les tests d'integration (PostgreSQL reel, pas de mock DB)
- Securite : `AutorisationService` centralise le RBAC, `TenantContext` pour l'isolation multi-tenant
- `SUPER_ADMIN` et `ADMIN_AUDIT` ont un acces global (pas de rattachement entreprise requis)
- Noms de commits en francais, sans accents, avec un sujet qui decrit le changement du point de vue utilisateur

### Frontend
- React 19 + JSX (PAS TypeScript)
- Tailwind CSS 3 pour le style, pas de CSS modules
- `apiClient.js` pour tous les appels API (gere le JWT automatiquement)
- `permissions.js` : modele de permissions centralise, `peut(permission, plan?)` via `ApiAuthContext`
- Pas de state management externe (Context API uniquement)
- Linter : oxlint (pas ESLint)
- Nommage des fichiers : PascalCase pour les pages/composants

### Migrations
- Idempotentes via Flyway
- Un changement de schema = une nouvelle migration (jamais modifier une existante)
- Le numero suit la sequence (V79, V80, etc.)

## Roles et permissions

| Role | Portee |
|---|---|
| `SUPER_ADMIN` | Acces global, administration plateforme |
| `ADMIN_AUDIT` | Acces global, gestion des missions d'audit |
| `RESPONSABLE_ENTREPRISE` | Gere son entreprise, ses membres, ses missions |
| `VISITEUR` | Consultation seule |

`RESPONSABLE_ENTREPRISE` peut gerer les membres de son entreprise (decision produit du 23/09/2026), mais ne peut attribuer que `RESPONSABLE_ENTREPRISE` et `VISITEUR`.

## Comptes de test

| Role | Email | Mot de passe |
|---|---|---|
| RESPONSABLE_ENTREPRISE | `aissatou.diallo.gxvtdw5f@example.com` | `MotDePasse123!` |
| SUPER_ADMIN | `moussa.traore.7tlfsudl@example.com` | `MotDePasse123!` |
| ADMIN_AUDIT | `fatou.kone.okyncmgq@example.com` | `MotDePasse123!` |
| VISITEUR | `cheikh.ndiaye.su4tvb74@example.com` | `MotDePasse123!` |

## Pieges connus

- Le role dans le JWT est celui du rattachement `utilisateur_entreprise` le plus ancien — creer l'entreprise support avec un utilisateur distinct du compte dont on teste le role
- Le conteneur frontend sert parfois du code obsolete apres des edits rapides — `docker compose restart frontend-react` resout le probleme
- `AbonnementResourceTest` echoue de facon intermittente au premier boot Docker Desktop/Windows (probleme reseau, pas un bug de code)
- Les commentaires JSX `{/* ... */}` ne doivent JAMAIS etre places entre les props d'un composant ou entre les enfants directs d'un fragment — ca provoque des erreurs de build

## Documentation

- `HANDOFF.md` — contexte de session complet (ce qui a ete construit, decisions, etat)
- `docs/` — cahier des charges, plan projet, MCD, phases techniques
- `phase-ux/` — rapports d'audit et d'implementation UX (phases P0-P4)
- `phase3d/` — import referentiel 2.2, proposition d'enrichissement
- `docs/METHODOLOGIE_CLIENT.md` — texte methodologique valide (destinee au client)

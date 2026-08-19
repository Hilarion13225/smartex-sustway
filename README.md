# Smartex Sustway

Plateforme d'évaluation RSE intelligente — méthodologie propriétaire Smartex Sustway.

Ce dépôt regroupe les trois services du projet (voir CDC v1.5/1.6, section 9 — Architecture technique) :

| Dossier | Techno | Rôle |
|---|---|---|
| `api-quarkus/` | Java 21 / Quarkus | API backend : authentification, RBAC, moteur de règles, orchestration des appels IA |
| `services-ia-python/` | Python 3.12 / FastAPI | Pipeline d'agents IA (Document, Evidence, Compliance, Risk, Scoring, Recommendation, Reporting) |
| `frontend-react/` | React 19 / Vite / Tailwind | Interfaces par rôle (entreprise, expert, admin), dashboards, back-office |
| `database/` | PostgreSQL 16 | Schéma de référence (DDL) et données de seed |

Documentation de cadrage : voir `docs/` (plan de projet, cahier des charges, MCD).

---

## Démarrage rapide (environnement de développement)

Prérequis : Docker + Docker Compose.

```bash
# 1. Lancer l'infrastructure (Postgres, Redis, MinIO) + les 3 services applicatifs
docker compose up -d

# 2. Vérifier que tout est démarré
docker compose ps

# Frontend      → http://localhost:5173
# API Quarkus   → http://localhost:8080/api/v1        (healthcheck : /q/health)
# Services IA   → http://localhost:8000/health          (doc interactive : /docs)
# MinIO console → http://localhost:9001  (smartex / smartex_minio_secret)
# Adminer (optionnel) → docker compose --profile tools up -d adminer → http://localhost:8081
```

Le schéma PostgreSQL (`database/migrations/001_init_schema.sql`) et les seeds
(`database/seeds/*.sql`) sont chargés automatiquement au premier démarrage du
conteneur `postgres` (scripts `docker-entrypoint-initdb.d`). L'API Quarkus les
rejoue également via Flyway à chaque démarrage (idempotent).

### Développement sans Docker (service par service)

**Base de données**
```bash
createdb smartex_sustway
psql -d smartex_sustway -f database/migrations/001_init_schema.sql
psql -d smartex_sustway -f database/seeds/001_seed_reference_data.sql
psql -d smartex_sustway -f database/seeds/002_seed_pays.sql
```

**API Quarkus** (nécessite JDK 21 + Maven)
```bash
cd api-quarkus
mvn quarkus:dev
```

**Services IA** (nécessite Python 3.12)
```bash
cd services-ia-python
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

**Frontend** (nécessite Node.js 20)
```bash
cd frontend-react
npm install
npm run dev
```

---

## État d'avancement

Voir le plan de projet complet (`docs/Plan_Projet_Smartex_Sustway.docx`) pour le
détail des phases A→G, le calendrier daté et le backlog complet.

- [x] **Phase A — Fondations** : schéma PostgreSQL (43 tables), squelettes des
      3 services, Docker Compose de dev, CI/CD, intégration du frontend et du logo
- [x] **Phase B — Socle applicatif** : entités JPA Utilisateurs/RBAC/Entreprises/Pays/Sites,
      authentification JWT (inscription, vérification email, connexion), RBAC centralisé
      (`AutorisationService`), isolation multi-tenant (`TenantContext`), journal d'audit,
      moteur de règles (score/risque, validé par 27 tests unitaires), endpoints
      Sites (CRUD, isolation multi-tenant), tests d'intégration `@QuarkusTest`
      (auth, entreprises, sites — 14 tests, exécutés contre PostgreSQL réel)
- [x] **Phase C — Abonnements & onboarding (partiel)** : formules (Free/Standard/
      Avancées), création d'entreprise couplée à un abonnement (RG24), refus de
      création en formule Free (RG25), paiement PI-SPI/Wave — **stub fonctionnel
      uniquement** (intégration réelle non câblée, cf. §5.3 du CDC, "point ouvert
      restant"). 2FA (RG36) implémentée (SMS + application d'authentification,
      voir ci-dessous) — reste à connecter au frontend (prochain lot).
- [ ] **Phase D — IA de base (Standard)**
- [ ] **Phase E — IA avancée (Avancées)**
- [ ] **Phase F — Référentiels sectoriels & back-office**
- [ ] **Phase G — Finalisation**

## Structure du dépôt

```
Smartex_sustway/
├── api-quarkus/            # API Java/Quarkus
│   ├── pom.xml
│   └── src/main/java/com/smartexsustway/api/
├── services-ia-python/     # Services IA Python/FastAPI
│   ├── requirements.txt
│   └── app/
├── frontend-react/         # Frontend React/Vite/Tailwind
│   └── src/
├── database/
│   ├── migrations/         # DDL PostgreSQL (source de vérité)
│   └── seeds/               # Données de référence (rôles, criticité, pays...)
├── docs/                    # Cahier des charges, MCD, plan de projet
├── docker-compose.yml
└── .github/workflows/ci.yml
```

## CI/CD

Le pipeline GitHub Actions (`.github/workflows/ci.yml`) valide, à chaque push/PR :
1. l'application du DDL sur un PostgreSQL éphémère,
2. les tests du service IA Python (pytest + lint ruff),
3. le build/tests de l'API Quarkus,
4. le lint + build du frontend React.

## API disponible (Phase B)

Toutes les routes sont préfixées par `/api/v1`. Documentation interactive une
fois l'API lancée : `/api/swagger-ui`.

| Méthode | Route | Description |
|---|---|---|
| POST | `/auth/inscription` | Création de compte (email non vérifié au départ) |
| GET | `/auth/verification-email?token=...` | RG36 — active le compte |
| POST | `/auth/connexion` | Retourne soit un token de session (`deuxFaRequise:false`), soit `deuxFaRequise:true` + `tokenPreAuth` si la 2FA est active |
| POST | `/auth/connexion/2fa` | Étape 2 (2FA) : `{tokenPreAuth, code}` → token de session |
| POST | `/auth/2fa/app/demarrer` | Démarre l'activation 2FA application (retourne le secret + l'URI `otpauth://` à encoder en QR code côté frontend) |
| POST | `/auth/2fa/app/confirmer` | Confirme l'activation avec un code TOTP valide (`{code}`) |
| POST | `/auth/2fa/sms/demarrer` | Démarre l'activation 2FA SMS (`{telephone}`) |
| POST | `/auth/2fa/sms/confirmer` | Confirme l'activation avec le code reçu (`{tokenActivation, code}`) |
| POST | `/auth/2fa/desactiver` | Désactive la 2FA |
| GET | `/utilisateurs/moi` | Profil de l'utilisateur authentifié |
| GET | `/entreprises` | Entreprises auxquelles l'utilisateur est rattaché |
| POST | `/entreprises` | Création d'entreprise + abonnement (RG24 : `formuleCode` obligatoire, `periodicite` requise si formule payante ; `FREE` refusé — RG25) |
| GET | `/entreprises/{id}` | Détail (accès vérifié par `AutorisationService`) |
| GET | `/roles` | Liste des rôles RBAC |
| GET | `/secteurs` | Liste des secteurs d'activité (publique, pas d'authentification requise) |
| GET | `/formules` | Liste des formules d'abonnement (publique — CDC §5, choix avant inscription) |
| GET | `/entreprises/{id}/abonnement` | Abonnement courant de l'entreprise |
| GET | `/entreprises/{id}/abonnement/paiements` | Historique des paiements |
| POST | `/entreprises/{id}/abonnement/paiements` | Initier un paiement (`{"fournisseur":"PI_SPI"\|"WAVE"}`) — **stub**, active l'abonnement immédiatement (voir avertissement ci-dessous) |
| GET | `/entreprises/{id}/sites` | Sites d'une entreprise |
| GET | `/entreprises/{id}/sites/{siteId}` | Détail d'un site |
| POST | `/entreprises/{id}/sites` | Création d'un site (RG04) |
| PUT | `/entreprises/{id}/sites/{siteId}` | Modification d'un site |
| DELETE | `/entreprises/{id}/sites/{siteId}` | Désactivation d'un site (statut ARCHIVE, pas de suppression physique) |

⚠️ **Non vérifié dans ce sandbox** : Maven Central n'étant pas accessible
depuis cet environnement, ce code Java n'a pas pu être compilé/testé ici
(contrairement au moteur de règles, testé en Java pur avec JUnit5 local).
Première étape chez vous : `mvn compile` puis `mvn quarkus:dev`, et me
signaler toute erreur — je corrige immédiatement.

## Email — configuration (RG36)

L'envoi réel de l'email de vérification est branché via **Brevo** (SMTP,
300 emails/jour gratuits, sans limite de temps). Sans configuration,
l'envoi échoue silencieusement (log warning) et l'inscription reste
fonctionnelle — le lien continue d'être journalisé (`mvn quarkus:dev`)
comme filet de sécurité.

**Pour activer l'envoi réel :**

1. Créez un compte gratuit sur [brevo.com](https://www.brevo.com)
2. Ajoutez et vérifiez un expéditeur (Menu → Expéditeurs, domaines & IP
   dédiées → Expéditeurs → Ajouter un expéditeur) — une simple adresse
   email suffit, pas besoin de domaine pour commencer
3. Récupérez vos identifiants SMTP (Menu → SMTP & API → onglet SMTP) —
   **différents de vos identifiants de connexion au tableau de bord**
4. Copiez `api-quarkus/.env.example` en `api-quarkus/.env` et renseignez
   `SMARTEX_MAIL_USERNAME`, `SMARTEX_MAIL_PASSWORD`, `SMARTEX_MAIL_FROM`
   (`.env` est déjà exclu du dépôt — ne jamais committer de vrais
   identifiants)
5. Redémarrez `mvn quarkus:dev` (Quarkus charge `.env` automatiquement)

⚠️ La 2FA par SMS reste en mode "loggé côté serveur" pour l'instant —
aucun fournisseur SMS n'offre de véritable envoi gratuit en production
(contrairement à l'email). À cadrer plus tard, comme PI-SPI/Wave.

## Paiement — état réel (phase C)

⚠️ **`PaiementService` est un stub.** Le CDC (§5.3, "point ouvert restant")
indique explicitement que "les modalités précises d'intégration technique
avec PI-SPI et Wave (API, frais, couverture des opérateurs) restent à
cadrer avec Smartex Expertises". En l'absence de ce cadrage, tout paiement
initié via `POST /abonnement/paiements` est **automatiquement marqué
réussi et active l'abonnement**, sans appel à un vrai fournisseur. Ne pas
utiliser en production tel quel — voir le commentaire de `PaiementService`
pour la liste des points à câbler une fois les accès PI-SPI/Wave obtenus.

## 2FA et sécurité des tokens (phase C, suite)

RG36 : la 2FA (SMS ou application d'authentification) est optionnelle, au
choix de l'utilisateur. Comme pour la vérification d'email, aucun envoi
SMS réel n'est branché — le code est journalisé côté serveur (`mvn
quarkus:dev`) plutôt qu'envoyé, en attendant un fournisseur SMS.

⚠️ **`SessionPurposeFilter` est nouveau et mérite une vérification
particulière** (voir tests `SessionPurposeFilterTest`). Il ferme une faille
de "confusion de jetons" : sans lui, un token de vérification d'email
(à usage unique) aurait pu servir à s'authentifier sur n'importe quel
endpoint protégé, puisque seule la signature du JWT était vérifiée, pas
son usage prévu. Tous les tokens portent désormais un claim `purpose`,
et ce filtre global rejette (401) toute requête authentifiée dont le
token n'a pas `purpose=SESSION`. Testez en particulier que la connexion
normale fonctionne toujours après ce changement — c'est le risque de
régression le plus probable de ce lot.

## Sécurité — phase B

Voir CDC section 1.4. Points clés déjà reflétés dans ce socle : isolation
multi-tenant (filtrage par `entreprise_id`), journal d'audit (`audit_log`),
mots de passe hashés (jamais en clair), 2FA optionnelle modélisée dans
`utilisateur.deuxfa_active`.

⚠️ **`api-quarkus/src/main/resources/{privateKey,publicKey}.pem`** est une
paire de clés RSA de **développement**, générée pour permettre de lancer
l'API sans étape manuelle. Elle est versionnée dans le repo, donc **publique**
— à régénérer (`openssl genrsa -out privateKey.pem 2048` puis
`openssl rsa -in privateKey.pem -pubout -out publicKey.pem`) et à sortir du
contrôle de version avant tout déploiement réel.

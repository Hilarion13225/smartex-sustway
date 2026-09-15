# PHASE 5.6 — Instrumentation IA commune et sécurisation

> Première phase depuis la Phase 6 qui **modifie réellement du code**.
> Aucune migration, aucune écriture en base, aucun branchement de V2 dans le
> parcours Java. Ce qui n'est pas démontré est marqué **À CONFIRMER**.

---

## 1. Résumé exécutif

Neuf appels au fournisseur existaient dans ce service, chacun avec sa propre
gestion — ou son absence — du temps, de l'erreur et de la trace. **Aucun ne
relevait ce que le fournisseur avait réellement servi.** Ils passent
désormais tous par un point unique, `app/services/appel_gemini.py`, qui
mesure, classe et journalise sans rien savoir du métier.

Deux anomalies de sécurité relevées en phase 5.5 sont fermées.

### Ce qui a été démontré contre le vrai fournisseur

L'instrumentation n'est pas seulement testée contre un faux client. Un appel
réel, exécuté pendant cette phase, produit :

```
  modèle demandé : gemini-3.5-flash-lite
  modèle servi   : gemini-3.5-flash-lite
  response_id : kOqiaqLtM8jskdUPlev16QM
  jetons prompt/candidats/total : 9/2/11
  durée : 16992 ms
```

Et un appel volontairement adressé à un modèle inexistant produit :

```
  type d'exception : ClientError
  catégorie retenue : MODELE_INDISPONIBLE
  message assaini : ClientError: 404 NOT_FOUND. {'error': {'code': 404, …
```

**Ce second résultat tranche un point que la phase 5.5 avait laissé ouvert.**
Elle notait : « NON DÉMONTRÉ DANS L'EXISTANT : la façon dont le SDK distingue
quota, authentification et modèle indisponible ». La réponse est maintenant
mesurée : le SDK lève `google.genai.errors.ClientError`, qui **porte un
attribut `.code` valant le statut HTTP**. La discrimination ne repose donc
pas sur une reconnaissance de texte.

Le quota a par ailleurs été atteint en cours de vérification, ce qui a fourni
une seconde observation gratuite : `429` → `QUOTA`, classé correctement, avec
le message fournisseur — qui contient trois URL — **retenu hors de la trace**.

---

## 2. Ce qui a été construit

### 2.1 `app/services/appel_gemini.py` — l'enrobage commun

Un seul point de passage : `appeler_gemini(agent, contents, config, …)`.

Il **ignore délibérément le métier**. Il ne connaît ni `Critere`, ni
`Evaluation`, ni `Exigence`, ni `Preuve`, ni `Risque`, ni `Recommandation`.
`agent` et `piece_reference` ne sont pour lui que des étiquettes recopiées.
C'est cette ignorance qui permet aux neuf sites d'appel — de formes
différentes — de partager le même passage sans qu'aucune règle métier ne
remonte dans cette couche.

Ce qu'il fait, dans l'ordre : horodate, appelle, mesure, relève les
métadonnées, journalise, rend `(reponse, trace)`.

Ce qu'il ne fait **pas**, et pourquoi :

| Non fait | Raison |
|---|---|
| Reprise automatique | Un quota dépassé rappelé aussitôt aggrave le dépassement ; un succès au second essai masquerait une instabilité qu'il faut voir |
| Conversion d'un échec | L'exception d'origine est relancée **intacte** — les appelants trient déjà sur le type |
| Journalisation du prompt, du contenu ou de la réponse brute | Ils portent les données du client |
| Fabrication de `create_time` | Le fournisseur le rend nul (phase 5.5) ; le déduire de l'horloge locale le ferait passer pour une donnée fournisseur |

### 2.2 `app/services/assainissement.py` — le filtre

Un filtre, **pas un classificateur** : il ne cherche pas à décider si un
texte est sensible, il retire systématiquement les formes qui le sont. Un
classificateur se tromperait un jour ; un filtre ne laisse passer que ce
qu'il ne reconnaît pas comme dangereux.

Formes retirées : en-tête `Authorization`, schéma `Bearer`, paramètres
nommés (`api_key`, `token`, `secret`, `password`…), JWT reconnu à sa
structure, clé Google reconnue à son préfixe `AIza`, bloc base64 volumineux,
clé privée PEM. Les URL conservent schéma et hôte — utiles au diagnostic —
et perdent tout ce qui suit.

Deux usages qu'il ne faut pas confondre :

| Fonction | Destination | Contenu |
|---|---|---|
| `assainir` | journal interne | la cause technique, masquée et bornée |
| `message_public` | réponse HTTP | le contexte et **une catégorie**, rien d'autre |

### 2.3 `app/journalisation.py` — la sortie qui manquait

Le service journalisait déjà abondamment. **Rien n'apparaissait nulle part.**
Uvicorn ne configure que ses propres enregistreurs ; le logger racine n'avait
aucun gestionnaire, et Python jette silencieusement tout message qui n'en
trouve pas. Conséquence : ni les échecs de pipeline, ni les rejets
d'authentification interservice ne laissaient de trace.

`configurer_journalisation()`, appelée au démarrage dans `app/main.py`, pose
un gestionnaire unique et idempotent sur la racine.

Le filtre `MasquageSecrets` est monté **sur le gestionnaire**, non sur un
enregistreur : il couvre ainsi les messages des bibliothèques tierces, qui
n'ont aucune raison de connaître nos règles. Il retire aussi `exc_info` —
une pile rend les variables locales, dont le prompt et le contenu du
document.

Les enregistreurs bavards (`httpx`, `httpcore`, `google_genai`, `urllib3`)
sont bornés à `WARNING` : ils journalisent les requêtes sortantes en DEBUG,
URL comprise. Le filtre masquerait la clé, mais le plus sûr est que ces
lignes ne soient pas produites.

---

## 3. Les deux anomalies de sécurité fermées

### 3.1 `evaluations.py:225` — l'exception brute exposée

**Avant** — le texte de l'exception franchissait la frontière du service :

```python
raise HTTPException(status_code=503, detail=f"Echec du pipeline d'agents IA : {exc}")
```

**Après** — la cause reste au journal, assainie ; l'appelant reçoit une
catégorie :

```python
logger.error("Échec de l'évaluation IA pour le critère %s : %s",
             payload.critere_code, assainir(f"{type(exc).__name__}: {exc}"))
raise HTTPException(
    status_code=503,
    detail=message_public(exc, "Échec du pipeline d'agents IA", classer_erreur(exc).value),
)
```

### 3.2 `imports_referentiel.py:80` — la même fuite, non signalée au brief

La phase 5.5 avait relevé `evaluations.py:225`. **Le routeur d'import
portait exactement la même construction.** Elle est corrigée de la même
façon : la laisser ouverte aurait été indéfendable.

Un second point y a été traité : `ExtractionRefusee` enrobe une erreur de
validation Pydantic, laquelle **rapporte la valeur reçue** — donc un fragment
du document importé. Son motif est désormais assaini avant de sortir.

### 3.3 Ce que l'absence de journalisation cachait (X10)

Ce n'était pas une anomalie de confort. Un rejet d'authentification
interservice ne laissait aucune trace : une clé publique mal montée se serait
manifestée par des 401 côté Java, **sans rien du côté du service qui les
émettait**.

---

## 4. Effet de bord assumé sur le contrat HTTP

La correction change une réponse observable, et un test existant le
documentait :

```python
assert "429" in reponse.json()["detail"]     # avant
```

L'intention métier était légitime : l'API appelante doit pouvoir distinguer
un quota épuisé d'une panne. **Elle a été préservée, mais déplacée** — sur
une catégorie stable plutôt que sur la prose du fournisseur :

```python
detail = reponse.json()["detail"]
assert "QUOTA" in detail
assert "RESOURCE_EXHAUSTED" not in detail    # après
```

Le `detail` d'un 503 vaut désormais `Échec du pipeline d'agents IA (QUOTA)`
ou `… (INTERNE)`. C'est un contrat plus solide que le précédent : il ne
dépend plus d'un message que le fournisseur peut changer sans préavis.

> **À l'attention de la bascule Java** : tout code qui lirait le `detail`
> d'un 503 par sous-chaîne doit être revu. Aucun n'a été identifié, mais la
> vérification n'a pas été menée côté Java — **hors périmètre de cette
> phase**.

---

## 5. Typologie des erreurs

| Catégorie | Détection | Statut |
|---|---|---|
| `CONFIGURATION_MANQUANTE` | `GeminiNonConfigure` | **certain** — exception levée par ce service |
| `EXPIRATION` | `TimeoutError` | **certain** |
| `MODELE_INDISPONIBLE` | `.code == 404` | **démontré en réel** (voir §1) |
| `QUOTA` | `.code == 429` | **démontré en réel** (quota atteint en vérification) |
| `AUTHENTIFICATION_FOURNISSEUR` | `.code` ∈ {401, 403} | **À CONFIRMER** — non provoqué |
| `INTERNE` | repli | — |

Un repli secondaire lit les noms canoniques de `google.rpc.Code`
(`RESOURCE_EXHAUSTED`, `PERMISSION_DENIED`…) dans le texte, **uniquement**
si aucun code de statut n'est présent. C'est une heuristique assumée : elle
ne lit que des identifiants normalisés, jamais la prose autour. Le code de
statut prime toujours — un test le vérifie.

---

## 6. Les neuf sites d'appel

Tous branchés. Les deux formes d'appel sont préservées telles quelles.

| Agent | Fichier | Forme | `piece_reference` |
|---|---|---|---|
| Document V1 | `document_agent.py` | `[Part, PROMPT]`, **sans `config`** | — |
| Document V2 | `document_agent_v2.py` | `[Part, prompt]` + schéma | ✅ `p1`, `p2`… |
| Evidence V1 | `evidence_compliance_agent.py` | `prompt` + classe Pydantic | — |
| Evidence V2 | `evidence_compliance_agent_v2.py` | `prompt` + schéma | — |
| Risk V1 | `risk_agent.py` | `prompt` + classe | — |
| Risk V2 | `risk_agent_v2.py` | `prompt` + schéma | — |
| Recommendation V1 | `recommendation_agent.py` | `prompt` + classe | — |
| Recommendation V2 | `recommendation_agent_v2.py` | `prompt` + schéma | — |
| Import référentiel | `referentiel_import_agent.py` | `prompt` + schéma | — |

**Point de conception** : l'enrobage ne pose l'argument `config` que si
l'appelant en fournit un. Le Document Agent V1 appelle sans configuration ;
lui en imposer une aurait changé son comportement. Un test le vérifie.

**Les quatre agents V2 conservent leur appel à `get_client()`** et passent le
client à l'enrobage. Ce n'est pas une redondance : c'est le point d'injection
sur lequel reposent les tests V2 existants, et cela maintient la détection
d'une configuration absente **avant** l'appel, comme auparavant.

Conséquence honnête de ce choix : dans le chemin V2, une
`GeminiNonConfigure` est levée hors de l'enrobage et **ne produit donc pas de
trace**. Le comportement est inchangé par rapport à l'existant, mais ce n'est
pas la couverture idéale.

---

## 7. Ce que la trace contient — et ne contient pas

`resume_journalisable()` est la seule vue portée au journal :

```
{'agent': 'EVIDENCE', 'piece': None, 'statut': 'TERMINE',
 'provider': 'google-genai', 'requested_model': 'gemini-3.5-flash-lite',
 'served_model': 'gemini-3.5-flash-lite', 'response_id': 'kOqia…',
 'duration_ms': 16992, 'total_token_count': 11, 'error_type': None}
```

Que des identifiants et des mesures. **Un test énumère les clés** et refuse
tout ajout non prévu — la garantie ne repose pas sur la discipline
d'écriture.

Absents du contrat, conformément au brief : `Authorization`, JWT, clé d'API,
base64, contenu de document, prompt complet, URL authentifiée, réponse brute.

### Un compteur absent reste nul

`usage` vaut `None` si le fournisseur ne rapporte rien, et chaque compteur
manquant reste nul plutôt que de devenir zéro : **zéro affirmerait qu'aucun
jeton n'a été consommé**, ce qui est une autre affirmation. Deux tests
couvrent ce point.

### Deux horloges

L'horloge murale (`datetime.now(timezone.utc)`) date l'appel ; l'horloge
monotone (`time.monotonic()`) le mesure. Mesurer une durée sur l'horloge
murale la rendrait sensible aux ajustements NTP, et une durée négative dans
une trace est indéfendable.

---

## 8. Un piège de test évité

Le premier jet du test « un secret journalisé par une bibliothèque tierce est
masqué » utilisait `capsys`. **Il passait — sans rien prouver.**

Le gestionnaire capte `sys.stdout` au moment de sa création, au premier
import de l'application, donc bien avant que pytest ne substitue le sien.
`capsys` lisait un flux vide, et un test qui cherche l'*absence* d'un secret
dans une chaîne vide réussit toujours.

Les tests concernés détournent désormais le flux du gestionnaire réellement
configuré, et **vérifient d'abord que la ligne existe** avant d'affirmer
qu'elle ne contient pas de secret.

---

## 9. Tests

### 9.1 Décompte

| Suite | Avant | Après | Écart |
|---|---:|---:|---:|
| Python hors Gemini | 218 | **258** | +40 |
| Python réels | 56 | **61** | +5 |
| Java | 344 | **344** | 0 |

Les 56 tests réels de référence se décomposent en 8 (Document V2) + 9
(Evidence V2) + 11 (Risk V2) + 10 (Recommendation V2) + 11 (chaînage) + 7
(pipeline). **Tous passent après branchement de l'enrobage.**

Aucun test Java n'est touché : cette phase ne modifie pas Java.

### 9.2 Fichiers créés

| Fichier | Tests | Objet |
|---|---:|---|
| `tests/test_appel_gemini.py` | 25 | L'enrobage, dont 1 test d'intégration d'un agent réel traversant l'enrobage avec un faux client |
| `tests/test_securite_instrumentation.py` | 15 | Assainissement, filtre de journalisation, frontière HTTP |
| `tests/test_instrumentation_reel.py` | 5 | **Vérification réelle** — trace, classement d'erreur |

### 9.3 Le test de sécurité

Quatre injections, cherchées ensuite dans chaque sortie :

```
Authorization: Bearer eyJhbGciOiJSUzI1NiJ9.…
api_key=AIzaSyB1234567890abcdefghijklmnopqrstuv
base64=JVBERi0xLjQKJcfsj6IKNSAwIG9iago8PC9MZW5ndGgg…
https://generativelanguage.googleapis.com/v1beta/models?key=SECRET_ABC123
```

Aucune ne subsiste — ni dans la trace, ni dans le journal, ni dans la réponse
HTTP 503. Un test complémentaire vérifie que l'assainissement **reste utile**
(le motif technique subsiste, l'hôte de l'URL reste lisible) : un message
intégralement caviardé serait sûr et inexploitable.

### 9.4 Sorties brutes

Suite complète hors Gemini :

```
........................................................................ [ 27%]
........................................................................ [ 55%]
........................................................................ [ 83%]
..........................................                               [100%]
258 passed, 1 warning in 3.38s
```

Vérification réelle de l'instrumentation :

```
5 passed in 17.97s
```

Agents V2 réels (Document, Evidence, Risk, Recommendation) :

```
8 passed in 75.45s
30 passed in 145.68s (0:02:25)
```

Chaînage réel Document → Evidence : `11 passed`.

Pipeline complet réel — les sept scénarios métier :

```
.......                                                                  [100%]
7 passed in 133.51s (0:02:13)
```

> Cette suite a d'abord échoué en `429 RESOURCE_EXHAUSTED` : le palier
> gratuit plafonne à 15 requêtes par minute et les vérifications précédentes
> venaient de le consommer. Après reconstitution du quota, elle passe
> intégralement. **Ce n'était donc pas une régression** — et l'échec a servi
> de démonstration involontaire du classement `QUOTA` en conditions réelles.

---

## 10. Limites et points non démontrés

| Point | Statut |
|---|---|
| `AUTHENTIFICATION_FOURNISSEUR` (401/403) | **À CONFIRMER** — non provoqué en réel |
| Lecture du `detail` d'un 503 côté Java | **NON VÉRIFIÉ** — hors périmètre |
| Trace en cas de `GeminiNonConfigure` sur le chemin V2 | Absente, comportement inchangé — §6 |
| Trace remontée à Java | **Non branchée** — c'est l'étape 5 de la feuille de route 5.5 (enveloppe `{resultat, execution}`), qui modifie le contrat |
| Persistance de la trace | **Non faite** — étapes 6 à 8, hors périmètre |

La trace est produite et journalisée ; **elle n'est encore consommée par
personne**. C'est volontaire : la brancher supposait de modifier le contrat
métier V2, ce que le brief interdit.

---

## 11. Fichiers

### Créés

```
app/services/appel_gemini.py
app/services/assainissement.py
app/journalisation.py
tests/test_appel_gemini.py
tests/test_securite_instrumentation.py
tests/test_instrumentation_reel.py
docs/PHASE5_6_INSTRUMENTATION_IA.md
```

### Modifiés

```
app/main.py                              configuration de la journalisation
app/routers/evaluations.py               anomalie de sécurité §3.1
app/routers/imports_referentiel.py       anomalie de sécurité §3.2
app/agents/document_agent.py             branchement
app/agents/evidence_compliance_agent.py  branchement
app/agents/risk_agent.py                 branchement
app/agents/recommendation_agent.py       branchement
app/agents/referentiel_import_agent.py   branchement
app/agents/document_agent_v2.py          branchement
app/agents/evidence_compliance_agent_v2.py  branchement
app/agents/risk_agent_v2.py              branchement
app/agents/recommendation_agent_v2.py    branchement
tests/test_import_referentiel.py         1 assertion — §4
```

---

## 12. Clôture

**PHASE 5.6 — VALIDÉE**

| | |
|---|---|
| Migrations | **AUCUNE** |
| Données modifiées | **AUCUNE** |
| Agents métier modifiés | **NON** — aucun prompt, aucune règle, aucun seuil, aucun contrat de sortie n'a changé |
| Contrat métier V2 | **INCHANGÉ** |
| Frontend | **NON TOUCHÉ** |
| Modèle Gemini | **INCHANGÉ** (`gemini-3.5-flash-lite`) |
| Tests | **258/258** hors Gemini · **61/61 réels** contre le vrai Gemini |
| Commit | **AUCUN** |

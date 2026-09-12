# PHASE 5.5 — Contrat d'exécution IA V2

> Conception et contrat. Aucune implémentation. Chaque affirmation est
> vérifiable dans le code, dans la base, ou par sondage du SDK installé. Ce
> qui n'est pas démontré est marqué **NON DÉMONTRÉ DANS L'EXISTANT**.

---

## 1. Résumé exécutif

Le service Python n'a **aucun accès à la base** — ni driver, ni connexion :
`SMARTEX_IA_SERVICE_URL` est la seule liaison. Il est pourtant le seul à
savoir ce qui s'est réellement passé lors d'un appel au fournisseur. Ce
contrat organise ce transfert.

### Ce qui a été mesuré, pas supposé

Un sondage réel du fournisseur — un appel minimal, aucune écriture — tranche
la question centrale de cette phase : **le SDK déclare quatre métadonnées ;
le fournisseur n'en renseigne que trois.**

| Champ | Déclaré par le SDK | **Réellement renseigné** |
|---|:-:|:-:|
| `model_version` | `Optional[str]` | ✅ `'gemini-3.5-flash-lite'` |
| `response_id` | `Optional[str]` | ✅ |
| **`create_time`** | `Optional[datetime]` | ❌ **`None`** |
| `usage_metadata.prompt_token_count` | `Optional[int]` | ✅ `6` |
| `usage_metadata.candidates_token_count` | `Optional[int]` | ✅ `1` |
| `usage_metadata.total_token_count` | `Optional[int]` | ✅ `7` |
| `usage_metadata.thoughts_token_count` | `Optional[int]` | ❌ `None` |
| `usage_metadata.cached_content_token_count` | `Optional[int]` | ❌ `None` |
| `usage_metadata.traffic_type` | `Optional[TrafficType]` | ❌ `None` |

**Conséquence directe** : l'horodatage ne peut pas venir du fournisseur. Il
doit être mesuré côté Python, autour de l'appel — ce que le §7 du brief
demandait, et qui se trouve être la seule voie possible.

### Trois décisions de conception

1. **L'unité d'exécution est l'appel fournisseur, pas l'agent.** Le Document
   Agent effectue **un appel par pièce** ; agréger dix appels en une ligne
   perdrait dix `response_id` — les seuls ancrages de diagnostic chez le
   fournisseur. `execution_agent` **n'a aucune contrainte d'unicité** sur
   `(analyse_ia_id, agent)` : plusieurs lignes pour un même agent sont
   permises sans migration.

2. **Document et Evidence sont bloquants ; Risk et Recommendation ne le sont
   pas.** Ce n'est pas un choix arbitraire : ces deux agents sont **déjà
   optionnels par contrat** — `analyse_risque` et `generer_recommandation`
   sont faux en formule STANDARD. Une analyse sans eux est un résultat normal,
   pas un résultat dégradé.

3. **Un contrat enveloppe** `{resultat, execution}` plutôt qu'un enrichissement
   du contrat de résultat. Les deux natures — métier et technique — ont été
   séparées en phase 5.4 ; les fondre ici reviendrait sur cette séparation.

---

## 2. État actuel

### 2.1 Ce que le service renvoie aujourd'hui

`EvaluerCritereResponse` — `routers/evaluations.py:122-135` :

```
audit_critere_id · probabilite_conformite · confiance_ia · couverture_preuve
justification · documents_analyses[] · signal_risque · categorie_risque
justification_risque · recommandation_necessaire · pistes_amelioration
```

**Onze champs, tous métier. Aucune métadonnée d'exécution.**

### 2.2 Ce que Java persiste

`AnalyseCritereService:196-224` écrit `evaluation` et
`evaluation_document_analyse`. Ni modèle, ni durée, ni identifiant
fournisseur — ils ne lui parviennent pas.

### 2.3 Le client Java

| Paramètre | Valeur | Source |
|---|---|---|
| URL | `http://services-ia-python:8000` | `SMARTEX_IA_SERVICE_URL` |
| `connect-timeout` | 5 000 ms | `application.properties:109` |
| `read-timeout` | **180 000 ms** | `application.properties:110` |

`IaEvaluationClient` est un client REST déclaratif. Une expiration se traduit
par une exception, capturée en `Resultat.Echec` — `AnalyseCritereService:183-187`.

### 2.4 Les tables dormantes

```
analyse_ia       id · audit_id · statut · formule · date_debut · date_fin · erreur
execution_agent  id · analyse_ia_id · agent · statut
                 · input_reference · output_reference · date_debut · date_fin
```

Contraintes réelles :

| Table | Contraintes |
|---|---|
| `analyse_ia` | PK, FK vers `audit` |
| `execution_agent` | PK, FK vers `analyse_ia` |

**Aucune contrainte d'unicité sur `(analyse_ia_id, agent)`.** C'est ce qui
autorise la granularité par appel retenue au §4.

`input_reference` et `output_reference` sont de type `text` et **nullables**.
Leur usage est **NON DÉMONTRÉ DANS L'EXISTANT**.

### 2.5 Journalisation

Les agents V2 mesurent déjà leur durée — `time.monotonic()` — et journalisent
compteurs et durée en millisecondes. **Aucun de ces logs n'est émis** : le
service n'a aucune configuration de journalisation, le logger racine reste
sans gestionnaire.

La mesure existe donc déjà dans le code. Elle est simplement perdue.

---

## 3. Appels Gemini existants

| Fichier | Ligne | Agent | Appels par analyse |
|---|---:|---|---|
| `document_agent.py` | 30 | Document V1 | 1 par document |
| `document_agent_v2.py` | 305 | Document V2 | **1 par pièce** |
| `evidence_compliance_agent.py` | 188 | Evidence V1 | 1 |
| `evidence_compliance_agent_v2.py` | 453 | Evidence V2 | **1** |
| `risk_agent.py` | 101 | Risk V1 | 1 si AVANCEES |
| `risk_agent_v2.py` | 427 | Risk V2 | **1 si AVANCEES** |
| `recommendation_agent.py` | 94 | Recommendation V1 | 1 si AVANCEES |
| `recommendation_agent_v2.py` | 402 | Recommendation V2 | **1 si AVANCEES** |
| `referentiel_import_agent.py` | 224 | Import — **hors périmètre** | 1 |

**Neuf points d'appel, aucune fonction commune.** Chaque agent construit son
propre `config={}` et lit `reponse.text`. Il n'existe aucun enrobage partagé
où poser la mesure.

> **GAP structurel — X1.** Sans point de passage unique, la collecte de trace
> devrait être répétée dans chaque agent. Un enrobage commun —
> `appeler_gemini(model, contents, config, agent)` rendant `(reponse, trace)`
> — est la seule forme qui ne se paie pas en duplication. **Ce serait une
> modification d'agent, donc hors périmètre de cette phase.**

### Nombre d'appels par analyse V2

| Formule | Document | Evidence | Risk | Recommendation | Total |
|---|---:|---:|---:|---:|---:|
| STANDARD, 1 pièce | 1 | 1 | 0 | 0 | **2** |
| AVANCEES, 1 pièce | 1 | 1 | 1 | 1 | **4** |
| AVANCEES, 8 pièces | **8** | 1 | 1 | 1 | **11** |

Mesuré : une analyse AVANCEES à une pièce a pris **30,5 s** pour 4 appels.

---

## 4. Unité d'exécution

### 4.1 Les quatre lectures possibles

| | Unité | Lignes par analyse AVANCEES 8 pièces | Perte |
|---|---|---:|---|
| **A** | pipeline complet | 1 | tout le détail |
| **B** | agent | 4 | **7 `response_id` sur 8 pour Document** |
| **C** | **appel fournisseur** | **11** | aucune |
| **D** | autre | — | — |

### 4.2 Recommandation : **C — un appel, une ligne**

Trois raisons.

**`response_id` est par appel.** C'est le seul ancrage permettant une
réclamation auprès du fournisseur ou un diagnostic sur un appel précis.
Agréger huit appels documentaires en une ligne en jetterait sept.

**Un appel peut échouer seul.** Sur huit pièces, la troisième peut expirer
tandis que les sept autres réussissent. L'unité agent ne saurait pas
l'exprimer.

**Le schéma le permet déjà.** `execution_agent` n'a **aucune contrainte
d'unicité** sur `(analyse_ia_id, agent)`. Huit lignes `agent = DOCUMENT`
rattachées à la même `analyse_ia` sont valides sans migration.

### 4.3 Ce qui distingue les lignes d'un même agent

`execution_agent` ne porte aucun numéro d'ordre. Deux lignes `DOCUMENT` se
distinguent par leurs `date_debut` et leur `response_id`.

> **Décision nécessaire — X2.** Faut-il un `ordre` explicite, ou
> `input_reference` suffit-il à porter la référence de pièce traitée — `p1`,
> `p2` ? La seconde voie n'ajoute aucune colonne et donne au champ un usage
> conforme à son nom : une **référence**, pas un contenu.

---

## 5. Métadonnées disponibles

Mesuré par sondage réel du fournisseur — un appel, aucune écriture.

| Champ | Type SDK | Renseigné | Retenu | Motif |
|---|---|:-:|:-:|---|
| `model_version` | `Optional[str]` | ✅ | **oui** | Le modèle réellement servi — §7 |
| `response_id` | `Optional[str]` | ✅ | **oui** | Ancrage de diagnostic — §8 |
| `create_time` | `Optional[datetime]` | ❌ **None** | non | **Non renseigné par le fournisseur** |
| `prompt_token_count` | `Optional[int]` | ✅ `6` | **oui** | Coût et volumétrie du contexte |
| `candidates_token_count` | `Optional[int]` | ✅ `1` | **oui** | Coût de la sortie |
| `total_token_count` | `Optional[int]` | ✅ `7` | **oui** | Somme — utile en agrégat |
| `thoughts_token_count` | `Optional[int]` | ❌ None | non | **NON DISPONIBLE DANS L'EXISTANT** |
| `cached_content_token_count` | `Optional[int]` | ❌ None | non | **NON DISPONIBLE** — aucun cache utilisé |
| `traffic_type` | `Optional[TrafficType]` | ❌ None | non | **NON DISPONIBLE** |

### Une nuance à ne pas surinterpréter

Le sondage a demandé `gemini-3.5-flash-lite` — une **version épinglée** — et
le fournisseur a rendu la même valeur. **Cela démontre que le champ est
renseigné, non qu'il peut différer.** La divergence est attendue avec un
**alias** comme `gemini-3.6-flash`, qui peut pointer vers plusieurs versions
successives — mais elle n'est pas démontrée ici.

C'est précisément le cas qui se présentera : `config.py:25-29` annonce le
retour à `gemini-3.6-flash` dès que le quota le permettra.

---

## 6. Statuts

### 6.1 Les quatre valeurs existantes suffisent

`statut_execution_agent` : `EN_ATTENTE, EN_COURS, TERMINE, ERREUR`.
`statut_pipeline` : les mêmes, pour `analyse_ia`.

### 6.2 Correspondance avec les cas réels

| Cas | Statut | Où il se détecte |
|---|---|---|
| Appel non encore lancé | `EN_ATTENTE` | orchestrateur Python, avant l'appel |
| Appel en vol | `EN_COURS` | idem |
| Réponse reçue **et validée par Pydantic** | `TERMINE` | après `model_validate_json` |
| Exception Gemini | `ERREUR` | `except Exception` autour de `generate_content` |
| Expiration | `ERREUR` | expiration réseau — remonte comme exception |
| Absence de réponse | `ERREUR` | idem |
| **Réponse invalide** | `ERREUR` | `ValidationError` de Pydantic — **après** l'appel |

### 6.3 Un point de sémantique

Une réponse **reçue mais non conforme** au schéma est un **échec
d'exécution**, pas un succès suivi d'un problème de parsing. L'appel a
consommé du quota, produit un `response_id`, et n'a rien d'exploitable.

`TERMINE` doit donc signifier « réponse reçue **et** validée ». Le poser à la
réception ferait passer pour réussi un appel dont rien ne sort.

> Cette distinction a un coût : les métadonnées d'un appel `ERREUR` par
> validation restent utiles — `response_id`, jetons consommés, durée — et
> doivent être conservées. Le contrat les porte dans les deux cas.

### 6.4 Statuts d'`analyse_ia`

| Cas | Statut |
|---|---|
| Toutes les exécutions attendues sont `TERMINE` | `TERMINE` |
| Un agent **bloquant** a échoué | `ERREUR` |
| Un agent **non bloquant** a échoué | `TERMINE` — voir §11.3 |
| Analyse interrompue | `EN_COURS` orphelin — **NON DÉMONTRÉ**, le pipeline est synchrone |

---

## 7. Modèle demandé et modèle réellement servi

### 7.1 Deux champs, pas un

| Champ | Source | Fiabilité |
|---|---|---|
| `requested_model` | `settings.gemini_model` | ce qu'on a demandé |
| `served_model` | **`reponse.model_version`** | **ce qui a répondu** |

### 7.2 Pourquoi le second prime

`config.py:25-29` porte ce commentaire :

```python
# épuisé sur gemini-3.6-flash (paliers de quota distincts par modèle).
# À REMETTRE sur "gemini-3.6-flash" une fois le quota principal
gemini_model: str = "gemini-3.5-flash-lite"
```

Le modèle courant est un **repli temporaire**, et le retour est planifié. Dès
lors qu'un alias sera employé, la configuration ne dira plus quelle version a
répondu — seul `model_version` le dira.

Déduire le modèle servi de `config.py` reviendrait à lire une intention là où
il faut un fait. Et ce fait est **disponible à chaque appel**.

### 7.3 Où les ranger

| Champ | Table | Motif |
|---|---|---|
| `requested_model` | `analyse_ia` | Constant sur toute la passe |
| **`served_model`** | **`execution_agent`** | **Peut varier d'un appel à l'autre** — le fournisseur peut basculer en cours de passe |

---

## 8. Response ID

### 8.1 Ce qu'il est

Une chaîne opaque rendue par le fournisseur, propre à chaque appel. Sondage :
`'n-eiauSlM7fPvdIPpebtiQo…'`.

### 8.2 Utilité

| Usage | Valeur |
|---|---|
| Réclamation auprès du fournisseur | **forte** — seul moyen de désigner un appel précis |
| Corrélation trace ↔ journal | forte |
| Détection de rejeu | moyenne |
| Interprétation métier | **nulle** — il ne dit rien du résultat |

### 8.3 Caractère sensible

**Aucun.** Il ne contient ni donnée client, ni identifiant interne, ni secret.
Il ne désigne pas non plus le contenu — seulement l'échange.

**Recommandation** : conserver, dans `execution_agent`. Sa conservation suit
celle de l'exécution ; aucune durée particulière n'est à définir.

> **NON DÉMONTRÉ DANS L'EXISTANT** : la durée de rétention côté fournisseur, et
> donc la fenêtre pendant laquelle une réclamation reste possible.

---

## 9. Temps d'exécution

### 9.1 La mesure ne peut venir que de Python

`create_time` est **`None`** — mesuré. Le fournisseur ne date pas sa réponse.

Java ne peut pas davantage mesurer : il ne voit que la durée totale de l'appel
HTTP, qui englobe les 2 à 11 appels Gemini, le décodage base64, la validation
Pydantic et le recoupement. Attribuer cette durée à un agent serait faux.

**La mesure appartient donc à Python, autour de chaque `generate_content`.**

### 9.2 Ce qui existe déjà

Les agents V2 mesurent déjà :

```python
debut = time.monotonic()
...
duree_ms = int((time.monotonic() - debut) * 1000)
```

Mais **la mesure englobe le recoupement**, pas seulement l'appel. Pour une
trace d'exécution fournisseur, elle doit être resserrée autour du seul
`generate_content`.

### 9.3 Champs retenus

| Champ | Type | Source |
|---|---|---|
| `started_at` | horodatage ISO-8601, UTC | `datetime.now(timezone.utc)` **avant** l'appel |
| `finished_at` | idem | après |
| `duration_ms` | entier | `time.monotonic()` — **monotone**, insensible aux ajustements d'horloge |

Les deux mécanismes coexistent volontairement : l'horodatage situe l'appel
dans le temps, le compteur monotone en mesure la durée. Calculer la durée par
différence d'horodatages l'exposerait à un ajustement NTP.

`execution_agent.date_debut` et `date_fin` accueillent les deux premiers. La
durée s'en déduit ou reçoit une colonne — voir §14.

---

## 10. Usage et jetons

### 10.1 Ce qui est réellement rendu

| Champ | Sondage |
|---|---|
| `prompt_token_count` | **6** |
| `candidates_token_count` | **1** |
| `total_token_count` | **7** |
| `thoughts_token_count` | `None` |
| `cached_content_token_count` | `None` |
| `traffic_type` | `None` |

### 10.2 Ce qui est retenu

Les trois premiers. Les trois autres sont **NON DISPONIBLES DANS L'EXISTANT** —
non renseignés par le fournisseur avec ce modèle et cette configuration.

### 10.3 Utilité

| Usage | Valeur |
|---|---|
| Suivi du coût | forte — le palier gratuit est limité |
| Détection d'un contexte qui gonfle | **forte** — un payload de 8 pièces se verrait immédiatement |
| Diagnostic de troncature | moyenne |
| Interprétation métier | **nulle** |

Le deuxième usage mérite d'être souligné : les garde-fous de volume conçus en
spécification — 8 pièces, 40 Mio — n'ont jamais été implémentés. Le compte de
jetons du prompt serait le premier signal qu'un payload dérive.

### 10.4 Le champ est optionnel dans le contrat

`usage_metadata` est `Optional`, et trois de ses champs sont revenus nuls.
Le contrat doit donc porter un bloc `usage` **entièrement facultatif**, et
Java ne doit pas en dépendre.

---

## 11. Erreurs

### 11.1 Ce que le code fait aujourd'hui

| Couche | Comportement |
|---|---|
| Agent V2 | `logger.exception` puis `raise` — la trace est **silencieuse** |
| `evaluations.py:219-225` | `GeminiNonConfigure` → **503** ; toute autre exception → **503** |
| `AnalyseCritereService:183-187` | exception → `Resultat.Echec` |
| `EvaluationResource:93-95` | `Echec` → **503** |

**Rien n'est persisté.** Une analyse échouée ne laisse aucune trace.

### 11.2 Types d'erreur à représenter

| Cas | `type` proposé | Détectable |
|---|---|---|
| Clé absente | `CONFIGURATION_MANQUANTE` | `GeminiNonConfigure` — existe |
| Quota dépassé | `QUOTA` | message fournisseur — **à confirmer** |
| Authentification fournisseur | `AUTHENTIFICATION_FOURNISSEUR` | idem |
| Modèle indisponible | `MODELE_INDISPONIBLE` | idem |
| Expiration | `EXPIRATION` | expiration réseau |
| Réponse non conforme | `REPONSE_INVALIDE` | `ValidationError` Pydantic |
| Autre | `INTERNE` | repli |

> **NON DÉMONTRÉ DANS L'EXISTANT** : la façon dont le SDK distingue quota,
> authentification et modèle indisponible. Le code actuel capture
> `except Exception` sans discrimination. Les distinguer suppose d'inspecter
> les exceptions typées du SDK — **travail d'implémentation, pas de
> conception**.
>
> **Conséquence** : le contrat prévoit ces valeurs, mais l'implémentation
> initiale peut n'en produire que `CONFIGURATION_MANQUANTE`, `EXPIRATION`,
> `REPONSE_INVALIDE` et `INTERNE`. Mieux vaut un repli honnête qu'une
> classification devinée.

### 11.3 Agents bloquants et non bloquants

| Agent | Échec | Justification |
|---|---|---|
| **Document** | **bloquant** | Sans résumé, Evidence n'a rien à juger |
| **Evidence** | **bloquant** | Sans probabilité, aucune évaluation n'est possible — c'est la seule entrée de `ScoringEngine` |
| **Risk** | **non bloquant** | |
| **Recommendation** | **non bloquant** | |

**Le fondement n'est pas un choix arbitraire.** Risk et Recommendation sont
**déjà optionnels par contrat** : `analyse_risque` et
`generer_recommandation` sont faux en formule STANDARD, et l'analyse produit
alors un résultat parfaitement valide sans eux.

Une analyse AVANCEES dont Risk échoue aboutit donc au même état qu'une
analyse STANDARD réussie. Ce n'est pas un résultat dégradé : c'est un
résultat que le système produit déjà normalement.

**Cas d'un document sur huit qui échoue** : bloquant. Juger sur sept pièces
en taisant que la huitième n'a pas été lue produirait une évaluation fausse
mais crédible — le pire résultat possible.

> **Décision nécessaire — X3.** Cette dernière position est la plus stricte.
> L'alternative — poursuivre en marquant la pièce `NON_VERIFIABLE` — est
> défendable : c'est exactement ce que le contrat V2 sait exprimer. **À
> trancher.**

### 11.4 Représentation

```
Document        TERMINE
Evidence        TERMINE
Risk            ERREUR          → execution_agent, statut ERREUR + error
Recommendation  NON_EXECUTEE    → aucune ligne execution_agent
analyse_ia      TERMINE         → agent non bloquant
```

**`NON_EXECUTEE` n'existe pas** dans `statut_execution_agent`, et **n'a pas à
exister** : un agent non exécuté n'a pas de ligne. L'absence est
l'information. La formule et le statut de l'analyse suffisent à la
distinguer d'un oubli.

---

## 12. Données interdites

| Élément | Interdit | Motif |
|---|:-:|---|
| En-tête `Authorization`, JWT | ✅ | Jeton interservice RS256 |
| Clé API Gemini | ✅ | |
| `contenu_base64` | ✅ | Donnée client |
| Contenu ou extrait de document | ✅ | idem |
| **Prompt complet** | ✅ | Contient exigences, réponses et résumés — donnée métier |
| **Réponse brute du fournisseur** | ✅ | Contient le résultat métier — duplication de `evaluation` |
| Réponses au questionnaire | ✅ | Déclarations de l'entreprise |
| Adresse e-mail, identité | ✅ | Donnée personnelle |

### Ce qui peut être conservé sans risque

| Élément | Motif |
|---|---|
| `response_id` | Chaîne opaque, ne désigne que l'échange |
| `served_model`, `requested_model` | Noms de modèle publics |
| Horodatages, durée | |
| Compteurs de jetons | Nombres — ne révèlent pas le contenu |
| Références locales de pièces — `p1`, `p2` | Locales au payload, sans valeur hors requête |
| **Message d'erreur assaini** | voir ci-dessous |

### Le message d'erreur

`evaluations.py:225` construit aujourd'hui
`f"Echec du pipeline d'agents IA : {exc}"`. **Le texte de l'exception est
concaténé sans filtrage.** Une exception du SDK peut contenir une portion de
requête, voire un fragment d'URL authentifiée.

> **GAP — X4.** Le contrat doit imposer un message **assaini** : type
> d'erreur, code fournisseur si disponible, et une phrase courte. Jamais
> l'exception brute.

---

## 13. Versionnement

### 13.1 Convention existante

Le contrat de résultat porte déjà `contrat_version = "2.0"`, en
`MAJEUR.MINEUR` chaîne, avec un contrôle de majeur —
`verifier_version_supportee`.

### 13.2 Recommandation : deux versions indépendantes

| Contrat | Champ | Valeur initiale |
|---|---|---|
| Résultat | `contrat_version` | `"2.0"` — existe |
| **Exécution** | `contrat_execution_version` | `"1.0"` |

**Pourquoi séparer.** Les deux évoluent pour des raisons différentes : le
contrat de résultat change quand le métier change ; le contrat d'exécution
change quand la traçabilité change — un champ de jetons apparaît, un type
d'erreur se précise. Les lier obligerait à incrémenter l'un pour une raison
étrangère à l'autre.

**Même règle de compatibilité** : le majeur gouverne le refus, le mineur est
ignorable par un service plus ancien. C'est la règle déjà en vigueur, et rien
ne justifie d'en inventer une seconde.

### 13.3 Ce que la trace porte

| Champ | Où |
|---|---|
| `contrat_execution_version` | racine du bloc `execution` |
| `contrat_version` du résultat | racine du bloc `resultat` — existe |
| `agent` | par exécution |
| `requested_model` | analyse |
| `served_model` | par exécution |

---

## 14. Relation avec `execution_agent`

| Métadonnée | Python produit | Java reçoit | `execution_agent` | Gap |
|---|:-:|:-:|---|---|
| `agent` | ✅ | ✅ | `agent` — enum `type_agent_ia` | aucun |
| `status` | ✅ | ✅ | `statut` — enum | aucun |
| `started_at` | ✅ | ✅ | `date_debut` | aucun |
| `finished_at` | ✅ | ✅ | `date_fin` | aucun |
| **`duration_ms`** | ✅ | ✅ | ❌ | **colonne** — ou déduite, voir ci-dessous |
| **`served_model`** | ✅ | ✅ | ❌ | **colonne** |
| **`response_id`** | ✅ | ✅ | ❌ | **colonne** |
| **`usage.*`** — 3 compteurs | ✅ | ✅ | ❌ | **3 colonnes ou 1 JSONB** |
| **`error.type` / `error.message`** | ✅ | ✅ | ❌ | **2 colonnes** |
| Référence de pièce traitée | ✅ | ✅ | `input_reference` | **usage à acter — X2** |
| — | — | — | `output_reference` | **usage NON DÉMONTRÉ** |

### 14.1 `duration_ms` : colonne ou déduction ?

Déduire de `date_fin − date_debut` économise une colonne mais perd la mesure
monotone : les deux horodatages peuvent être affectés par un ajustement
d'horloge, la durée monotone non.

**Recommandation** : une colonne. L'écart entre les deux mesures est
généralement nul, mais quand il ne l'est pas, c'est précisément le cas qu'on
veut voir.

### 14.2 Jetons : colonnes ou JSONB ?

| | Argument |
|---|---|
| **3 colonnes** | Recherchables — « quelles analyses dépassent N jetons de prompt » est une question de pilotage du coût |
| **1 JSONB** | Accueille sans migration les champs que le fournisseur pourrait renseigner plus tard — `thoughts`, `cached`, `traffic_type` |

**Recommandation : 3 colonnes.** Elles portent les trois champs
**effectivement renseignés**, et le suivi du coût est une question qui se
pose en agrégat. Prévoir un JSONB pour trois champs constamment nuls
reviendrait à concevoir pour une hypothèse.

### 14.3 `output_reference`

**Usage NON DÉMONTRÉ.** Son nom indique une *référence*, non un contenu. Y
placer une réponse sérialisée dupliquerait le résultat métier dans une table
technique et créerait exactement le risque interdit au §12.

**Recommandation** : le laisser nul, ou y placer le `response_id` si l'on
préfère éviter une colonne. La première voie est plus claire.

---

## 15. Relation avec `analyse_ia`

### 15.1 Répartition

| Information | `analyse_ia` | `execution_agent` |
|---|:-:|:-:|
| Mission | ✅ `audit_id` | — |
| Formule | ✅ | — |
| Qui a déclenché | ✅ **colonne à ajouter** | — |
| `requested_model` | ✅ **colonne à ajouter** | — |
| `contrat_version` / `contrat_execution_version` | ✅ **colonnes à ajouter** | — |
| Statut global | ✅ | — |
| Erreur bloquante | ✅ `erreur` | — |
| Agent | — | ✅ |
| `served_model` | — | ✅ |
| `response_id`, jetons, durée | — | ✅ |
| Erreur par appel | — | ✅ |

**Le critère** : ce qui vaut pour toute la passe est sur `analyse_ia` ; ce
qui varie d'un appel à l'autre est sur `execution_agent`.

### 15.2 La relation

```
analyse_ia (1)
   ├── execution_agent  DOCUMENT        × n pièces
   ├── execution_agent  EVIDENCE        × 1
   ├── execution_agent  RISK            × 0 ou 1
   └── execution_agent  RECOMMENDATION  × 0 ou 1
```

La FK `execution_agent.analyse_ia_id` **existe déjà**, `NOT NULL`, avec
`ON DELETE CASCADE`. **Aucun gap** sur la relation elle-même.

### 15.3 Le lien avec l'évaluation

`analyse_ia` porte `audit_id` — la mission — et non `audit_critere_id`. Le
rattachement au critère passe par `evaluation.analyse_ia_id`, colonne conçue
en phase 5.4.

> **GAP — X5.** L'endpoint de production analyse **un critère à la fois**.
> Une `analyse_ia` d'un seul critère est donc la norme, et son `audit_id`
> seul ne dit pas lequel. C'est `evaluation` qui porte le lien — ce qui
> suppose que l'évaluation soit **créée**. Une analyse échouée avant toute
> évaluation laisse une `analyse_ia` sans critère identifiable.
>
> **À trancher** : ajouter `audit_critere_id` nullable sur `analyse_ia`, ou
> accepter cette imprécision sur les seules analyses échouées.

---

## 16. Multi-appels

### 16.1 Le cas Document

```
8 pièces → 8 appels → 8 lignes execution_agent (agent = DOCUMENT)
```

Chacune porte son `response_id`, sa durée, ses jetons, son statut.

### 16.2 Granularité préservée

| Question | Réponse |
|---|---|
| Combien d'appels cette analyse a-t-elle coûté ? | `count(*)` sur `execution_agent` |
| Quel appel a échoué ? | ligne `ERREUR`, avec `input_reference` |
| Quel appel a été le plus lent ? | `max(duration_ms)` |
| Combien de jetons au total ? | `sum(prompt_token_count)` |
| Quel modèle a servi la pièce `p3` ? | ligne dont `input_reference = 'p3'` |

Aucune de ces questions n'aurait de réponse avec une granularité par agent.

### 16.3 Ordre

Les appels documentaires sont **séquentiels** — `evaluations.py:145`. Leur
ordre se lit dans `date_debut`.

> Si la parallélisation évoquée en spécification était mise en œuvre, l'ordre
> deviendrait indéterminé et `input_reference` resterait le seul lien fiable
> vers la pièce. **Argument supplémentaire pour X2.**

---

## 17. Observabilité — quatre natures

| Nature | Contenu | Support | Rétention |
|---|---|---|---|
| **A — logs techniques** | démarrage, durée, écarts de recoupement | stdout du conteneur | courte, volatile |
| **B — trace d'exécution métier** | agent, statut, modèle servi, `response_id`, durée, jetons | `analyse_ia` + `execution_agent` | permanente |
| **C — résultat IA** | probabilité, confiance, couverture, signaux | `evaluation` et filles | permanente |
| **D — journal d'audit** | qui a lancé, qui a validé | `audit_log` | permanente, immuable |

**Ne pas fondre B dans A.** Les logs sont volatils, non requêtables, et
aujourd'hui **jetés faute de configuration**. Une trace d'exécution doit
survivre au redémarrage du conteneur et être interrogeable.

**Ne pas fondre B dans C.** La phase 5.4 a séparé le technique du métier ;
mêler `response_id` et probabilité de conformité reviendrait sur cette
séparation.

**Ne pas fondre B dans D.** `audit_log` trace les **gestes humains**. Une
exécution d'agent n'est le geste de personne.

---

## 18. Sécurité

| Contrainte | État | Incidence |
|---|---|---|
| **RS256 interservice** | ✅ actif — 401 vérifié sur les deux routes | La trace circule sur le canal déjà protégé |
| **Séparation jeton utilisateur / service** | ✅ `purpose=SERVICE_IA` vs `SESSION` | Inchangée |
| **Aucun secret dans le contrat** | ✅ par conception — §12 | |
| **Aucun contenu brut** | ✅ par conception | Sauf le message d'erreur — **X4** |
| **Multi-tenant** | ✅ `analyse_ia.audit_id` → mission → entreprise | L'isolation est portée par la FK |
| **Autorisation** | ✅ `analyse:executer` sur l'endpoint | La trace n'ouvre aucun accès nouveau |
| **Audit** | ⚠️ | `EVALUATION_IA_CREEE` existe ; l'échec n'est journalisé nulle part |
| **Journalisation des refus interservice** | ❌ | `authentification.py:106,112` — **silencieux** |

Le dernier point reste l'anomalie de sécurité ouverte depuis la cartographie :
un service sans trace de ses refus d'accès est un angle mort.

---

## 19. Contrat JSON cible

### 19.1 Enveloppe

```json
{
  "resultat": {
    "contrat_version": "2.0",
    "audit_critere_id": "178c7a48-9d27-46e8-baa9-f70d1aa44d9c",
    "probabilite_conformite": 0.20,
    "confiance": 0.90,
    "couverture_preuve": true,
    "…": "contrat V2 inchangé"
  },
  "execution": {
    "contrat_execution_version": "1.0",
    "provider": "google-genai",
    "requested_model": "gemini-3.5-flash-lite",
    "statut": "TERMINE",
    "started_at": "2026-09-10T13:42:00.412Z",
    "finished_at": "2026-09-10T13:42:28.981Z",
    "duration_ms": 28569,
    "appels": [
      {
        "agent": "DOCUMENT",
        "piece_reference": "p1",
        "statut": "TERMINE",
        "served_model": "gemini-3.5-flash-lite",
        "response_id": "n-eiauSlM7fPvdIPpebtiQo",
        "started_at": "2026-09-10T13:42:00.412Z",
        "finished_at": "2026-09-10T13:42:11.038Z",
        "duration_ms": 10626,
        "usage": {
          "prompt_token_count": 812,
          "candidates_token_count": 214,
          "total_token_count": 1026
        },
        "error": null
      },
      {
        "agent": "EVIDENCE",
        "piece_reference": null,
        "statut": "TERMINE",
        "served_model": "gemini-3.5-flash-lite",
        "response_id": "b4Kx…",
        "started_at": "2026-09-10T13:42:11.040Z",
        "finished_at": "2026-09-10T13:42:19.702Z",
        "duration_ms": 8662,
        "usage": { "prompt_token_count": 1934,
                   "candidates_token_count": 388,
                   "total_token_count": 2322 },
        "error": null
      },
      {
        "agent": "RISK",
        "piece_reference": null,
        "statut": "ERREUR",
        "served_model": null,
        "response_id": null,
        "started_at": "2026-09-10T13:42:19.705Z",
        "finished_at": "2026-09-10T13:42:24.118Z",
        "duration_ms": 4413,
        "usage": null,
        "error": {
          "type": "QUOTA",
          "message": "Quota du fournisseur dépassé pour ce modèle."
        }
      }
    ]
  }
}
```

### 19.2 Justification champ par champ

| Champ | Retenu parce que |
|---|---|
| `contrat_execution_version` | Permet le refus explicite d'un majeur inconnu — §13 |
| `provider` | Un second fournisseur reste possible ; le champ coûte une constante |
| `requested_model` | Ce qu'on a demandé |
| `statut` (racine) | Résume l'issue de la passe |
| `started_at` / `finished_at` / `duration_ms` (racine) | Durée réelle du service, distincte de la somme des appels |
| `appels[]` | **Granularité par appel** — §4 |
| `agent` | Enum `type_agent_ia`, existe |
| `piece_reference` | Distingue les appels documentaires — **X2** |
| `served_model` | **Ce qui a réellement répondu** — §7 |
| `response_id` | Ancrage de diagnostic — §8 |
| `usage` | Trois compteurs mesurés ; **nullable** |
| `error` | Type + message assaini — §11, **X4** |

### 19.3 Champs délibérément absents

| Champ | Motif |
|---|---|
| `create_time` | **Mesuré : non renseigné par le fournisseur** |
| `thoughts_token_count`, `cached_content_token_count`, `traffic_type` | **Mesurés nuls** |
| `prompt` | Interdit — §12 |
| `raw_response` | Interdit — duplique le résultat métier |
| `temperature`, `top_p`, `seed` | **Non fixés** — les tracer supposerait d'abord de les choisir |
| `token_estime_cout` | Dépend d'une grille tarifaire externe et changeante |

---

## 20. Impact sur le contrat V2

### 20.1 Les trois options

| | Forme | Conséquence |
|---|---|---|
| **A** | Champs ajoutés à `EvaluerCritereResponse` | Mêle nature technique et métier — revient sur la séparation posée en 5.4. Le contrat de résultat changerait de majeur pour une raison de traçabilité. |
| **B** | Bloc `execution` ajouté à la réponse | Meilleur, mais les deux versions restent couplées dans un même objet racine |
| **C** | **Enveloppe `{resultat, execution}`** | Deux objets versionnés indépendamment, séparables, testables séparément |

### 20.2 Recommandation : **C**

Trois raisons.

**La séparation des natures est déjà acquise.** La phase 5.4 a classé chaque
sortie en A technique, B métier ou C historique. Une enveloppe rend cette
distinction visible dans le contrat lui-même.

**Les deux contrats évoluent pour des raisons différentes.** Un champ de
jetons qui apparaît n'a rien à voir avec un changement métier. Les fondre
obligerait à incrémenter l'un pour l'autre.

**Le résultat reste consommable seul.** Java peut ignorer entièrement le bloc
`execution` — utile pendant la transition, où la persistance des exécutions
viendra après celle des résultats.

### 20.3 Coût

`EvaluerCritereResponse` devient le contenu de `resultat`. Sa **structure
interne ne change pas** : les onze champs restent, aux mêmes noms. Seul le
niveau racine s'ajoute.

> **Ce contrat n'est pas modifié dans cette phase.** La conception est
> arrêtée ; l'implémentation appartient à la bascule.

---

## 21. Gaps

| # | Gap | Type | Bloque |
|---|---|---|---|
| **X1** | **Aucun point de passage commun** aux 9 appels Gemini — la collecte devrait être répétée dans chaque agent | structurel | toute l'implémentation |
| **X2** | `input_reference` : usage non acté pour la référence de pièce | décision | granularité Document |
| **X3** | Un document sur huit qui échoue : bloquant ou `NON_VERIFIABLE` ? | décision | modèle d'erreur |
| **X4** | Message d'erreur **non assaini** — `evaluations.py:225` concatène l'exception brute | **sécurité** | §12 |
| **X5** | `analyse_ia` porte `audit_id`, pas `audit_critere_id` — une analyse échouée avant évaluation n'a pas de critère identifiable | décision | traçabilité des échecs |
| **X6** | `execution_agent` n'a ni `duration_ms`, ni `served_model`, ni `response_id`, ni jetons, ni erreur | colonnes | **7 colonnes** |
| **X7** | `analyse_ia` n'a ni `declenche_par`, ni `requested_model`, ni versions de contrat | colonnes | **4 colonnes** |
| **X8** | `output_reference` : usage **NON DÉMONTRÉ** | décision | — |
| **X9** | Typologie d'erreur fournisseur non discriminée — `except Exception` sans distinction | implémentation | §11.2 |
| **X10** | Aucune journalisation applicative Python | **sécurité** | observabilité |

**Répartition** : 11 colonnes sur deux tables dormantes · 1 gap structurel ·
4 décisions · 2 anomalies de sécurité · 1 point d'implémentation.

**Aucune table nouvelle.**

---

## 22. Ordre d'implémentation

| # | Étape | Dépend de | Justification |
|---|---|---|---|
| **1** | **Assainir le message d'erreur** — `evaluations.py:225` | rien | Anomalie de sécurité, indépendante du reste, corrigeable seule |
| **2** | **Configurer la journalisation Python** | rien | Rend visibles les traces déjà écrites par les agents, y compris les refus d'authentification |
| **3** | **Enrobage commun `appeler_gemini`** | **X1** | Point de passage unique. Sans lui, tout le reste se duplique en neuf exemplaires. |
| **4** | **Modèle de trace Pydantic** — `ExecutionTrace`, `AppelTrace` | étape 3 | Contrat côté Python |
| **5** | **Enveloppe `{resultat, execution}`** en V2 | étape 4, **bascule Java** | Modifie le contrat de réponse |
| **6** | **Colonnes `analyse_ia` + `execution_agent`** | **X2, X5, X6, X7** | 11 colonnes sur deux tables existantes |
| **7** | **Entités et dépôts Java** | étape 6 | Activer les deux dormantes |
| **8** | **Persistance par `AnalyseCritereService`** | étapes 5 et 7 | Le point de jonction |
| **9** | **Typologie d'erreur fournisseur** | **X9** | Affinement — le repli `INTERNE` suffit d'abord |

### Ce qui échappe à la bascule Java

**Les étapes 1 et 2 sont exécutables immédiatement.** Elles ne touchent ni le
contrat, ni la base, ni le parcours métier — et corrigent deux anomalies de
sécurité ouvertes depuis la cartographie.

**L'étape 3 est le verrou.** Neuf points d'appel sans fonction commune :
poser la mesure sans enrobage reviendrait à écrire neuf fois le même code, et
à en oublier un.

### Ce qui en dépend

Les étapes 5 à 8 supposent la bascule Java V1 → V2. Le contrat de réponse V2
n'est produit par aucun code de production ; l'y ajouter une enveloppe avant
la bascule serait concevoir pour du code qui ne tourne pas.

---

## Verdict

### PHASE 5.5 : **VALIDÉE**

Le contrat d'exécution est arrêté champ par champ, et chaque champ retenu l'a
été sur mesure, non sur déclaration.

**Trois enseignements dominent :**

1. **Le SDK déclare quatre métadonnées ; le fournisseur n'en renseigne que
   trois.** `create_time` revient **`None`** — mesuré, pas supposé. Trois des
   six compteurs de jetons également. Concevoir sur les annotations de types
   aurait produit un contrat dont un tiers des champs seraient
   systématiquement vides.

2. **L'unité d'exécution est l'appel, pas l'agent.** Le Document Agent fait un
   appel par pièce, et `execution_agent` **n'a aucune contrainte d'unicité**
   sur `(analyse_ia_id, agent)` — la granularité fine est donc possible sans
   migration. Choisir l'agent aurait jeté sept `response_id` sur huit.

3. **La graduation des échecs se déduit du contrat existant.** Risk et
   Recommendation sont déjà optionnels — faux en formule STANDARD. Une
   analyse AVANCEES dont Risk échoue aboutit au même état qu'une analyse
   STANDARD réussie : ce n'est pas un résultat dégradé, c'est un résultat que
   le système produit déjà normalement.

**Dix gaps sont identifiés**, dont **aucun ne demande de table nouvelle** :
11 colonnes sur deux tables dormantes, un enrobage commun, quatre décisions.

**Deux anomalies de sécurité restent ouvertes** — le message d'erreur non
assaini et l'absence de journalisation — et sont les deux seules étapes
exécutables sans attendre la bascule Java.

---

*Aucun fichier du projet n'a été modifié à l'exception du présent rapport.
Aucune migration. Aucune donnée. Aucun branchement. Aucun commit.*

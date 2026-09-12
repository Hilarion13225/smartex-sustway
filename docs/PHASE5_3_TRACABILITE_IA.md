# PHASE 5.3 — Traçabilité IA

> Conception. Aucune implémentation. Tout constat est établi par lecture du
> code, requête sur la base `smartex_sustway`, ou inspection du SDK installé.
> Ce qui n'est pas démontrable est marqué **NON DÉMONTRÉ DANS L'EXISTANT**.

---

## 1. Résumé exécutif

La question à laquelle le système doit savoir répondre dans six mois :

> « Pourquoi ce résultat a-t-il été produit pour ce critère, avec quel
> référentiel, quelle version, quelles preuves, quels documents, quelles
> règles, quel modèle IA et quel contexte ? »

Aujourd'hui il ne peut répondre à **aucune** de ces questions au-delà du
critère et de la date.

### Trois découvertes qui changent le coût de cette phase

**1. Le modèle va changer, et c'est écrit dans la configuration.**
`config.py:25-29` porte ce commentaire :

```python
# épuisé sur gemini-3.6-flash (paliers de quota distincts par modèle).
# À REMETTRE sur "gemini-3.6-flash" une fois le quota principal
gemini_model: str = "gemini-3.5-flash-lite"
```

Le modèle courant est un **repli temporaire**. Un changement est planifié. Les
44 évaluations existantes deviendront alors ininterprétables : rien ne dira
laquelle a été produite par quel modèle.

**2. Le SDK fournit déjà ce qu'il faut, et le code le jette.**
`types.GenerateContentResponse` expose `model_version`, `response_id`,
`create_time` et `usage_metadata`. Les agents ne lisent que `.text` et
`.parsed`. Le **`model_version` réellement servi** — qui peut différer de
celui demandé — est disponible et perdu à chaque appel.

**3. Deux mécanismes de traçabilité existent et fonctionnent déjà.**

| Mécanisme | État | Preuve |
|---|---|---|
| `document.hash` | **16/16 renseignés**, 12 distincts | empreinte de contenu opérationnelle |
| `audit_log.details` **jsonb** | 10/484 utilisés, par le chemin d'import | contexte structuré déjà attaché à un événement |

### Le coût réel

**Aucune structure nouvelle n'est nécessaire.** Deux tables dormantes —
`analyse_ia` et `execution_agent` — couvrent l'unité de traçabilité. Le reste
tient en **quatre colonnes** sur des tables existantes.

---

## 2. État actuel

### 2.1 Structures actives

| Table | Lignes | Rôle | Écrite par | Lue par | Traçabilité V2 |
|---|---:|---|---|---|---|
| `evaluation` | 44 | Résultat d'analyse | `AnalyseCritereService` | `AuditScoreService`, `RapportGenerationService`, `IndicePreparationService`, `EvaluationResource` | **réutilisable** — colonnes à ajouter |
| `evaluation_document_analyse` | 13 | Résumé par document lu | `AnalyseCritereService` | `EvaluationResource` | **réutilisable** — `document_id` manquant |
| `document` | 16 | Fichier déposé | `DocumentResource` | `StorageService`, `AnalyseCritereService` | **réutilisable tel quel** |
| `preuve` | 6 | Pièce rattachée à une mission | `PreuveResource` | `PreuveRepository` | réutilisable |
| `preuve_critere` | — | Liaison pièce ↔ critère | `PreuveResource` | `parAuditCritere` | réutilisable |
| `audit_critere` | 460 | Critère d'une mission | `CreationMissionService` | tout le pipeline | ancrage |
| `audit_question` / `reponse_question` | — | Questionnaire déclaratif | `ReponseQuestionResource` | `AnalyseCritereService` | réutilisable |
| `referentiel_version` | 17 | Version gelée | `VersionReferentielService` | `CreationMissionService` | **ancrage — non tracé dans `evaluation`** |
| `exigence` / `preuve_attendue` / `regle_analyse` | 92 / 212 / 98 | Catalogue | back-office, import | `parCritereActives` | **aucun rattachement depuis un résultat** |
| `score_historique` | 8 | Courbe du score | `ScoreHistoriqueService` | `AuditResource`, `SecteurResource` | hors périmètre |
| `audit_log` | 484 | Journal | `AuditLogService` | back-office | **réutilisable** — `details` jsonb |

### 2.2 Structures dormantes

| Table | Colonnes | Entité Java | Verdict |
|---|---|:-:|---|
| `analyse_ia` | `id, audit_id, statut, formule, date_debut, date_fin, erreur` | ❌ | **unité racine cible** |
| `execution_agent` | `id, analyse_ia_id, agent, statut, input_reference, output_reference, date_debut, date_fin` | ❌ | **trace par agent cible** |

Énumérations déjà en base :

- `statut_pipeline` : `EN_ATTENTE, EN_COURS, TERMINE, ERREUR`
- `statut_execution_agent` : `EN_ATTENTE, EN_COURS, TERMINE, ERREUR`
- `type_agent_ia` : `DOCUMENT, EVIDENCE, COMPLIANCE, RISK, SCORING, RECOMMENDATION, REPORTING`
- `formule_pipeline` : `STANDARD, AVANCEES`

**NON DÉMONTRÉ DANS L'EXISTANT** : l'usage prévu de `SCORING` et `REPORTING`
— aucun agent ne porte ces noms dans le pipeline V1 ni V2.

### 2.3 Ce qui est réellement persisté d'une analyse

| Information | Persistée | Colonne |
|---|:-:|---|
| Critère analysé | ✅ | `evaluation.audit_critere_id` |
| Date | ✅ | `evaluation.date_evaluation` |
| Probabilité, note, confiance | ✅ | 44/44 |
| Justification | ✅ | |
| Documents lus (nom + résumé) | ⚠️ | `evaluation_document_analyse` — **sans `document_id`** |
| **Version du référentiel** | ❌ | colonne `version_referentiel` **existe, 0/44** |
| **Modèle IA** | ❌ | aucune colonne |
| **Version du contrat IA** | ❌ | aucune colonne |
| **Agents exécutés** | ❌ | `execution_agent` vide |
| **Qui a lancé l'analyse** | ❌ | `evaluation.auteur_id` nul pour les 23 lignes `IA` |
| **Exigences / preuves attendues / règles utilisées** | ❌ | aucun rattachement |
| **Erreur d'analyse** | ❌ | un 503 est rendu, rien n'est écrit |

Le journal porte `EVALUATION_IA_CREEE` — 24 occurrences — avec
`utilisateur_id`. **C'est aujourd'hui la seule trace de qui a déclenché une
analyse**, et elle vit dans une table séparée du résultat.

---

## 3. Unité de traçabilité

### 3.1 Les contraintes réelles

| Fait | Démontré par |
|---|---|
| Une mission a plusieurs critères | 92 par mission |
| Un critère est analysé plusieurs fois | 22 critères portent 2 à 4 évaluations |
| Chaque analyse d'un critère est indépendante | `POST …/criteres/{id}/evaluations` — un appel, un critère |
| Plusieurs agents interviennent | 4 en V2 : Document, Evidence, Risk, Recommendation |
| Un agent peut échouer seul | Document appelle Gemini une fois par pièce ; l'un peut échouer |
| Une passe de clôture rejoue l'analyse sur tous les critères | `AnalyseMissionService` — **NON DÉMONTRÉ** qu'elle groupe les analyses |

### 3.2 Le point de conception

`analyse_ia` porte `audit_id`, **pas** `audit_critere_id`. Sa granularité est
donc la **mission**, alors que l'endpoint de production analyse **un critère à
la fois**.

Deux lectures possibles, et le choix engage tout le reste :

| Lecture | Conséquence |
|---|---|
| **A** — une `analyse_ia` = une passe sur une mission | Cohérent avec le schéma. Mais l'analyse unitaire d'un critère créerait une « passe » à un seul critère. |
| **B** — une `analyse_ia` = un déclenchement, quel qu'en soit le périmètre | Une passe de clôture sur 92 critères = 1 ligne ; une analyse unitaire = 1 ligne aussi. Le périmètre se lit dans les évaluations rattachées. |

**Recommandation : lecture B.** Elle respecte le schéma sans le forcer, et
rend le cas unitaire et le cas groupé identiques du point de vue de la trace.

### 3.3 Architecture retenue

```
analyse_ia                    un déclenchement — qui, quand, quelle formule, quel statut
   │  audit_id, statut, formule, date_debut, date_fin, erreur
   │  + declenche_par, modele_ia, contrat_version          ← à ajouter
   │
   ├── execution_agent × n    un appel d'agent — lequel, statut, durée
   │      agent, statut, date_debut, date_fin
   │      input_reference / output_reference                ← à cadrer, §7
   │
   └── evaluation × n         un résultat par critère analysé
          + analyse_ia_id                                   ← à ajouter
          + version_referentiel                             ← colonne existante, à remplir
```

**Une évaluation appartient à une analyse ; une analyse porte plusieurs
évaluations.** C'est ce rattachement qui permet de répondre « quels critères
cette passe a-t-elle traités » et « quelle passe a produit ce résultat ».

---

## 4. Cycle de vie

### 4.1 Statuts

Les quatre valeurs des deux énumérations suffisent. Aucune n'est à créer.

| Statut | `analyse_ia` | `execution_agent` |
|---|---|---|
| `EN_ATTENTE` | Déclenchée, pas commencée | Agent en file |
| `EN_COURS` | Au moins un agent tourne | Appel Gemini en vol |
| `TERMINE` | Tous les agents attendus ont fini | Réponse reçue et validée |
| `ERREUR` | Au moins un agent a échoué de façon bloquante | Échec Gemini, ou sortie invalide |

### 4.2 Qui écrit quoi, et quand

| Écriture | Auteur | Moment |
|---|---|---|
| `analyse_ia` en `EN_COURS` | `EvaluationResource` ou `AnalyseMissionService` | avant l'appel au service IA |
| `execution_agent` en `EN_COURS` | **service Python** | à l'entrée de chaque agent |
| `execution_agent` en `TERMINE` / `ERREUR` | **service Python** | à la sortie |
| `analyse_ia` en `TERMINE` | Java | après persistance de l'évaluation |
| `analyse_ia` en `ERREUR` + `erreur` | Java | branche `Resultat.Echec` |

> **Décision nécessaire — D1.** Les `execution_agent` sont produites côté
> Python, qui **n'a aucun accès à la base** : `SMARTEX_IA_SERVICE_URL` est la
> seule liaison, et le service Python ne possède ni driver, ni connexion.
> Deux voies : le service renvoie ses traces d'exécution **dans sa réponse**,
> et Java les persiste ; ou Java les infère depuis les options et le résultat.
> La première est fidèle, la seconde ne coûte rien. **À trancher.**

### 4.3 Gestion de l'erreur

État actuel : `AnalyseCritereService:186` rend
`Resultat.Echec("Échec du pipeline d'agents IA — réessayez plus tard")`, et
`EvaluationResource:94` le traduit en **503**. **Rien n'est écrit.** Une
analyse échouée ne laisse aucune trace en base.

Côté Python, `evaluations.py:224` appelle `logger.exception` — **silencieux**,
le service n'ayant aucune configuration de journalisation.

Cible : `analyse_ia` en `ERREUR`, colonne `erreur` renseignée avec le message
technique **assaini** — jamais un contenu de document ni un extrait de prompt.

### 4.4 Exécution abandonnée

**NON DÉMONTRÉ DANS L'EXISTANT.** Le pipeline est **synchrone** : `read-timeout`
de 180 s côté Quarkus, et l'appel bloque jusqu'à réponse ou expiration. Une
`analyse_ia` restant `EN_COURS` signalerait une transaction interrompue — cas
qui n'existe pas dans l'architecture actuelle, mais que le statut permettrait
de détecter si l'analyse devenait asynchrone.

> **Décision nécessaire — D2.** Faut-il prévoir dès maintenant un mécanisme de
> reprise des analyses `EN_COURS` orphelines, ou l'écarter tant que le
> pipeline reste synchrone ?

---

## 5. Identification du modèle

### 5.1 Ce qui est disponible et jeté

`types.GenerateContentResponse` expose :

| Champ | Contenu | Lu par le code |
|---|---|:-:|
| `model_version` | **le modèle réellement servi** | ❌ |
| `response_id` | identifiant unique de l'appel | ❌ |
| `create_time` | horodatage côté fournisseur | ❌ |
| `usage_metadata` | `prompt_token_count`, `candidates_token_count`, `total_token_count`, … | ❌ |

Les agents ne lisent que `.text` et `.parsed`.

**`model_version` est le champ décisif** : il rapporte ce que le fournisseur a
réellement servi, qui peut différer de ce qu'on a demandé — un alias comme
`gemini-3.6-flash` pouvant pointer vers plusieurs versions successives.

### 5.2 Configuration réellement passée

```python
config={"response_mime_type": "application/json",
        "response_schema": schema_pour_gemini(...)}
```

**Ni température, ni top_p, ni seed.** Les valeurs par défaut du fournisseur
s'appliquent, et ne sont ni choisies ni connues.

> **NON DÉMONTRÉ DANS L'EXISTANT** : les paramètres d'échantillonnage
> effectivement appliqués. Les tracer supposerait de les **fixer**
> explicitement — ce qui serait une décision produit, pas de traçabilité.

### 5.3 À tracer

| Information | Source | Priorité |
|---|---|---|
| **Modèle demandé** | `settings.gemini_model` | **haute** — le modèle va changer |
| **Modèle réellement servi** | `reponse.model_version` | **haute** — seul témoin fiable |
| Fournisseur | constante `google-genai` | basse — un seul aujourd'hui |
| Version du contrat IA | `EvaluerCritereRequestV2.VERSION` | **haute** |
| Agent | `type_agent_ia` | haute |
| Date et durée | déjà mesurées par les agents V2 (`time.monotonic`) | moyenne |
| `response_id` | `reponse.response_id` | moyenne — permet une réclamation fournisseur |
| Jetons consommés | `usage_metadata` | basse — utile au coût, pas à l'interprétation |

**Où** : sur `analyse_ia` pour le modèle et le contrat — ils valent pour toute
la passe ; sur `execution_agent` pour l'agent, la durée et le `response_id` —
ils varient d'un appel à l'autre.

---

## 6. Versionnement du contexte

| Information | Persistée aujourd'hui | Cible |
|---|:-:|---|
| `audit_id` | ⚠️ via `audit_critere` | `analyse_ia.audit_id` |
| `audit_critere_id` | ✅ | inchangé |
| `critere_id` | ⚠️ via `audit_critere` | joignable, suffisant |
| `referentiel_id` | ⚠️ via la version | joignable |
| **`referentiel_version_id`** | ❌ **0/44** | **remplir `evaluation.version_referentiel`** |
| Code critère | ⚠️ joignable | suffisant |
| **Exigences utilisées** | ❌ | voir ci-dessous |
| **Preuves attendues utilisées** | ❌ | voir ci-dessous |
| **Règles utilisées** | ❌ | voir ci-dessous |
| Réponses utilisées | ⚠️ `reponse_question` porte `updated_at` | **insuffisant** — une réponse modifiée après l'analyse est indiscernable |
| Documents utilisés | ⚠️ nom + résumé | voir §7 |

### Le point qui décide de tout le reste

**Faut-il lister les éléments de catalogue utilisés, ou la version suffit-elle ?**

Le catalogue est **immuable dans une version publiée** — trigger PostgreSQL, et
`copieSous` crée de nouvelles lignes à chaque publication. Vérifié
empiriquement : `D1-01` existe en **9 exemplaires distincts**, un par
référentiel × version.

**Conséquence** : connaître `referentiel_version_id` **suffit** à retrouver
exactement les exigences, preuves attendues et règles actives au moment de
l'analyse — à une réserve près.

> **Décision nécessaire — D3.** La réserve est le **filtrage de provenance** :
> `parCritereActives` écarte ce qui est `IMPORT_IA` non validé ou rejeté. Un
> élément validé **après** l'analyse serait aujourd'hui absent du contexte
> soumis, mais présent si l'on rejouait la requête. Trois options :
> (a) accepter cette dérive, rare et documentée ;
> (b) horodater le filtrage — `validee_le` et `rejetee_le` existent déjà, donc
> rejouable en temps ;
> (c) lister les identifiants utilisés à chaque analyse.
>
> **L'option (b) est la seule qui ne coûte rien** : les colonnes existent, il
> suffit de comparer à `evaluation.date_evaluation`.

---

## 7. Documents et preuves

### 7.1 État actuel

| Constat | Valeur |
|---|---|
| `document.hash` | **16/16 renseignés**, 12 distincts sur 16 |
| `document.statut_scan` | 16/16 |
| `evaluation_document_analyse` | `id, evaluation_id, nom, resume, ordre` |
| **Rattachement au document d'origine** | ❌ **aucun `document_id`** |
| `preuve_critere` | `preuve_id, audit_critere_id` |
| **Rattachement pièce ↔ preuve attendue** | ❌ **inexistant** |

### 7.2 Le gap

Aujourd'hui, une analyse dit « j'ai lu un fichier nommé
`code-de-conduite.txt` ». Elle ne dit **ni lequel** — deux pièces peuvent
porter le même nom — **ni dans quel état** il était.

`document.hash` étant déjà alimenté, l'empreinte de contenu est **gratuite** :
il suffit de rattacher l'analyse au document.

### 7.3 Cible

| Ajout | Table | Motif |
|---|---|---|
| `document_id` | `evaluation_document_analyse` | Identifier le fichier lu |
| `hash_au_moment_de_lanalyse` | `evaluation_document_analyse` | Détecter qu'une pièce a changé depuis. `document.hash` seul ne suffit pas : il suit le document, pas l'analyse. |

**Ce qui n'est pas nécessaire** : copier le contenu. Il est dans MinIO, sous
contrôle d'accès, et le hash suffit à prouver l'identité.

### 7.4 Le rattachement pièce ↔ preuve attendue

Le contrat V2 réserve `pieces[].preuve_attendue_reference`, **toujours nul** —
décision 3 de la spécification, reportée.

Tant qu'il l'est, la traçabilité ne peut pas répondre à « quelle pièce était
censée démontrer quelle attente ». Elle répond seulement à « quelles pièces
ont servi à ce critère ».

> C'est une **limite acceptée**, pas un défaut à corriger ici. Le champ est
> réservé au contrat ; sa persistance suivra la décision produit.

---

## 8. Sorties IA

### 8.1 Classement des trois natures

| Nature | Exemple | Durée de vie | Support |
|---|---|---|---|
| **A — technique d'exécution** | durée, statut d'agent, `response_id`, jetons | courte, purgeable | `execution_agent` |
| **B — résultat métier** | probabilité, confiance, couverture, justification, signal de risque, pistes | permanente | `evaluation` |
| **C — historique / audit** | qui a lancé, qui a validé, quelle analyse a remplacé quoi | permanente, immuable | `audit_log` |

### 8.2 Sorties V2 par agent

| Agent | Sortie | Nature | Persistée aujourd'hui |
|---|---|---|---|
| **Document** | `resume` | B | ✅ |
| | `constats[]` — référence, présence, éléments relevés / manquants | B | ❌ |
| | `confiance_lecture` | B | ❌ |
| **Evidence** | `probabilite_conformite`, `confiance`, `couverture_preuve`, justifications | B | ✅ |
| | `evaluations[]` — couverture par attente, pièces utilisées, conflit | B | ❌ |
| | `elements_manquants[]` — rattachements V2 | B | ❌ |
| **Risk** | `signal_risque`, `categorie`, `justification` | B | ✅ |
| | `confiance` | B | ❌ |
| | `signaux[]` — catégorie, rattachement, pièces | B | ❌ |
| **Recommendation** | `recommandation_necessaire`, `pistes_amelioration` | B | ✅ |
| | `actions[]` — action + rattachement | B | ❌ |

**Toutes les sorties non persistées sont de nature B.** Aucune n'est technique.
Ce n'est pas de la trace d'exécution que l'on perd, c'est du résultat métier.

> **Décision nécessaire — D4.** Persister ces sorties structurées, ou non ?
> Sans elles, un résultat n'est **pas ré-explicable** : on connaît la
> probabilité, pas ce qui l'a fondée. Avec elles, il faut des colonnes JSONB
> ou des tables filles.
>
> **Cette décision est bloquée par la bascule Java** — aucune de ces sorties
> n'est produite en production aujourd'hui.

---

## 9. Reproductibilité

### 9.1 Ce que « rejouer » veut dire

Deux notions différentes, à ne pas confondre :

| | Question | Faisable |
|---|---|---|
| **Comprendre** | « Sur quelle base ce résultat a-t-il été produit ? » | **oui**, avec les ajouts de cette phase |
| **Reproduire** | « Le même appel rendrait-il le même résultat ? » | **non — jamais** |

**La reproduction à l'identique est hors d'atteinte, et il faut le dire.** Un
modèle de langage n'est pas déterministe ; aucun `seed` n'est fixé ; le
fournisseur fait évoluer ses modèles derrière un alias. Prétendre à la
reproductibilité serait une promesse intenable.

L'objectif atteignable est la **ré-explicabilité** : reconstituer exactement
le contexte soumis, et savoir quel modèle l'a traité.

### 9.2 Ce qui est nécessaire

| Information | Nécessaire | Pourquoi |
|---|:-:|---|
| `referentiel_version_id` | ✅ | Rejoue le catalogue — immuable |
| Date de l'analyse | ✅ | Rejoue le filtrage de provenance dans le temps |
| Version du contrat IA | ✅ | Détermine la forme du contexte soumis |
| Modèle demandé **et** servi | ✅ | Un changement de modèle explique une divergence |
| Documents + hash | ✅ | Prouve l'identité des pièces |
| Réponses au questionnaire | ⚠️ | `updated_at` existe ; une modification postérieure reste indiscernable |
| Options (`analyse_risque`, `generer_recommandation`) | ✅ | Déterminent les agents exécutés |
| **Prompt intégral** | ❌ | Reconstructible depuis contexte + version de contrat. Le stocker dupliquerait des données métier dans une table technique, et pèserait lourd. |
| **Contenu des documents** | ❌ | Déjà dans MinIO, sous contrôle d'accès |
| Paramètres d'échantillonnage | ❌ | Non fixés — voir §5.2 |

---

## 10. Sécurité et données sensibles

### 10.1 Interdits absolus en trace

| Élément | Motif |
|---|---|
| Contenu de document, base64 | Donnée client ; déjà stockée sous contrôle d'accès |
| Texte intégral d'un prompt | Contient exigences, réponses et résumés — donnée métier du client |
| Réponses au questionnaire | Déclarations de l'entreprise |
| Jeton d'appel, même partiel | RS256 interservice |
| Clé API Gemini | |
| Adresse e-mail, identité | Donnée personnelle |

### 10.2 Ce que les logs contiennent aujourd'hui

| Constat | État |
|---|---|
| Agents V2 : `logger.info` avec référence, type MIME, taille, compteurs, durée | **conforme** — aucune donnée métier |
| Agents V2 : `logger.exception` sans prompt ni contenu | **conforme** |
| `audit_log.details` jsonb | 10/484, contenu structuré non sensible |
| **Aucun log applicatif Python n'est émis** | le logger racine n'a aucun gestionnaire |

> Ce dernier point est une **anomalie de sécurité** relevée en cartographie et
> toujours ouverte : les rejets d'authentification interservice —
> `authentification.py:106,112` — ne sont journalisés nulle part. Un service
> sans trace de ses refus d'accès est un angle mort.

### 10.3 Le cas `execution_agent.input_reference` / `output_reference`

Ces deux colonnes sont **de type `text`** et leur usage n'est **NON DÉMONTRÉ
DANS L'EXISTANT**.

> **Décision nécessaire — D5.** Leur nom suggère une *référence* — un
> identifiant, un chemin — non un contenu. Les employer pour stocker un
> payload sérialisé dupliquerait des données métier dans une table technique
> et créerait exactement le risque que le §10.1 interdit.
>
> **Recommandation** : y placer des références courtes et non sensibles — par
> exemple les références locales des pièces traitées et le `response_id` du
> fournisseur — ou les laisser nulles. Jamais un payload.

---

## 11. Auditabilité

| Question | Aujourd'hui | Cible |
|---|---|---|
| Qui a lancé l'analyse ? | ⚠️ `audit_log` seulement | `analyse_ia.declenche_par` |
| Quand ? | ✅ | `analyse_ia.date_debut` |
| Sur quelle mission ? | ⚠️ via jointure | `analyse_ia.audit_id` |
| Quel critère ? | ✅ | `evaluation.audit_critere_id` |
| Quelle version du référentiel ? | ❌ | `evaluation.version_referentiel` |
| Quels documents ? | ⚠️ nom seul | `document_id` + hash |
| Quels agents ? | ❌ | `execution_agent` |
| Quel modèle ? | ❌ | `analyse_ia.modele_ia` + `modele_servi` |
| Quel résultat ? | ✅ | `evaluation` |
| Quelle erreur ? | ❌ | `analyse_ia.erreur` |
| Quelle validation humaine ? | ❌ | §12 |
| Quelle analyse a remplacé la précédente ? | ⚠️ déductible par date | `analyse_ia_id` rend le lien explicite |

---

## 12. Relation avec la validation humaine

### 12.1 Le principe posé en 5.2

```
Analyse IA ──► evaluation.statut = PROVISOIRE
                      │
          décision humaine (evaluation:valider)
                      │
        ┌─────────────┴─────────────┐
        ▼                           ▼
   VALIDEE (compte au score)   EN_REVUE (exclu, compté à part)
```

**L'IA ne doit jamais produire `VALIDEE`.** C'est aujourd'hui le cas —
`AnalyseCritereService:212` — et les 44 évaluations affichent un statut que
personne n'a posé.

### 12.2 Ce que la trace de validation doit porter

| Information | Support proposé |
|---|---|
| Auteur de la décision | `evaluation.auteur_id` — **colonne existante**, nulle pour les 23 lignes `IA` |
| Date | `audit_log.created_at` |
| Décision | transition de `evaluation.statut` |
| Motif de contestation | **manquant** — colonne à ajouter |
| Résultat concerné | `audit_log.entite = 'evaluation'`, `entite_id` |

### 12.3 Séparation stricte

`evaluation.auteur_id` est aujourd'hui ambigu : renseigné pour les 21 lignes
`EXPERT` — qui étaient des évaluations *produites* par un humain — et nul pour
les 23 lignes `IA`.

> **Décision nécessaire — D6.** Le même champ doit-il porter « qui a produit
> ce résultat » (sens hérité) et « qui l'a validé » (sens cible) ? Deux sens
> dans une colonne rendent toute requête d'audit ambiguë. Une colonne
> `valide_par` distincte lèverait l'ambiguïté sans toucher aux 21 lignes
> historiques.

---

## 13. Historisation

| Objet | Régime | Modifiable par |
|---|---|---|
| `analyse_ia` après `TERMINE` / `ERREUR` | **immuable** | personne |
| `execution_agent` | **immuable** | personne |
| Modèle, contrat, version de référentiel tracés | **immuables** | personne |
| Documents utilisés + hash | **immuables** | personne |
| `evaluation` — résultat | **immuable, append-only** | personne |
| `evaluation.statut` | **seule exception** | `evaluation:valider` |
| Décision humaine | **immuable** une fois prise | personne |
| `audit_log` | **strictement immuable** | personne |
| Statut métier — non-conformité, axe, action, plan | **modifiable** | `audit:modifier` |

### Le principe

**Ce qui constate est immuable ; ce qui engage est modifiable.** Une analyse
constate un état à une date : on n'y revient pas, on en produit une nouvelle.
Un plan d'action porte un engagement humain : il vit.

`evaluation.statut` est la seule exception, et elle est cohérente : il ne
décrit pas le jugement de l'IA mais **son acceptation**, qui est un fait
postérieur.

---

## 14. Architecture cible

```
  UTILISATEUR (analyse:executer)
        │
        ▼
  ┌─────────────────────────────────────────────────────┐
  │ analyse_ia                          (dormante → activer)
  │   audit_id · statut · formule · date_debut/fin · erreur
  │   + declenche_par · modele_ia · modele_servi · contrat_version
  └───────┬─────────────────────────────────────────────┘
          │
          ├── execution_agent × n       (dormante → activer)
          │     agent · statut · date_debut/fin
          │     + response_id · duree_ms
          │
          └── evaluation × n            (active)
                + analyse_ia_id
                + version_referentiel   ← colonne existante, à remplir
                + valide_par · motif_contestation   (§12)
                    │
                    └── evaluation_document_analyse   (active)
                          + document_id · hash_au_moment_de_lanalyse

  audit_log (active, jsonb `details`) ─── qui, quand, quelle décision
```

### Réutilisation

| Besoin | Structure | Type |
|---|---|---|
| Unité racine | `analyse_ia` | **dormante à activer** |
| Trace par agent | `execution_agent` | **dormante à activer** |
| Résultat | `evaluation` | active, +4 colonnes |
| Documents lus | `evaluation_document_analyse` | active, +2 colonnes |
| Empreinte de contenu | `document.hash` | **active, déjà alimentée** |
| Journal des décisions | `audit_log` + `details` jsonb | **active, mécanisme éprouvé** |

**Aucune table nouvelle.** Deux activations, six colonnes.

---

## 15. Gaps

| # | Gap | Gravité | Coût |
|---|---|---|---|
| **G1** | `evaluation.version_referentiel` **jamais renseignée** (0/44) | **critique** | 1 ligne — la colonne existe |
| **G2** | Modèle IA non tracé, **alors qu'un changement est planifié** | **critique** | 2 colonnes + lecture de `model_version` |
| **G3** | Version du contrat IA non tracée | élevée | 1 colonne |
| **G4** | Aucune trace des agents exécutés | élevée | activer `execution_agent` + **D1** |
| **G5** | Analyse échouée sans trace | élevée | activer `analyse_ia` |
| **G6** | `evaluation_document_analyse` sans `document_id` | élevée | 2 colonnes |
| **G7** | Qui a lancé l'analyse : seulement dans `audit_log` | moyenne | 1 colonne |
| **G8** | Sorties V2 structurées non persistées | moyenne | **bloqué par la bascule Java** |
| **G9** | Pièce ↔ preuve attendue inexistant | moyenne | **bloqué par la décision 3** |
| **G10** | Réponse modifiée après analyse indiscernable | faible | horodatage comparatif |
| **G11** | Aucun log applicatif Python — rejets d'authentification invisibles | **sécurité** | configuration de journalisation |

---

## 16. Décisions nécessaires

| # | Décision | Bloque |
|---|---|---|
| **D1** | Les traces `execution_agent` viennent-elles du service Python — qui n'a **aucun accès base** — via sa réponse, ou sont-elles inférées par Java ? | G4 |
| **D2** | Prévoir une reprise des analyses `EN_COURS` orphelines, ou l'écarter tant que le pipeline est synchrone ? | 5.4 |
| **D3** | Filtrage de provenance : accepter la dérive, l'horodater, ou lister les identifiants ? *(recommandation : horodater — les colonnes existent)* | G1 |
| **D4** | Persister les sorties V2 structurées ? | G8 — bloqué par la bascule |
| **D5** | Que mettre dans `execution_agent.input_reference` / `output_reference` ? *(recommandation : références courtes, jamais un payload)* | G4 |
| **D6** | `evaluation.auteur_id` porte-t-il « qui a produit » ou « qui a validé » ? *(recommandation : colonne `valide_par` distincte)* | 5.8 |
| **D7** | Tracer les jetons consommés — utile au coût, pas à l'interprétation ? | facultatif |

---

## 17. Ordre d'implémentation futur

| Étape | Objet | Dépend de | Justification |
|---|---|---|---|
| **1** | **Renseigner `version_referentiel`** | rien | Colonne existante. Une ligne de code. Le gain le plus élevé au coût le plus bas. |
| **2** | **Tracer le modèle** — demandé et servi — et la version du contrat | **D3** | Un changement de modèle est déjà planifié en configuration. Chaque jour d'attente produit des évaluations ininterprétables. |
| **3** | **`document_id` + hash** sur les analyses documentaires | rien | `document.hash` est déjà alimenté |
| **4** | **Activer `analyse_ia`** — racine, statut, erreur, déclencheur | **D2** | Répond à G5 et G7 avec une table existante |
| **5** | **Activer `execution_agent`** | **D1, D5** | Suppose de trancher d'où viennent les traces |
| **6** | **Journalisation Python** | rien | Indépendant ; corrige une anomalie de sécurité |
| **7** | **Trace de validation humaine** | **D6**, phase 5.8 | Suit la décision de gouvernance |
| **8** | **Persistance des sorties V2** | **D4**, bascule Java | Ne peut pas précéder la production de ces sorties |

**Les étapes 1, 3 et 6 peuvent démarrer immédiatement** — aucune décision
ouverte ne les bloque, et aucune ne modifie un comportement existant.

**L'étape 2 est la plus urgente sans être la plus simple.** Elle dépend de D3,
mais son urgence ne vient pas de la conception : elle vient du fait que le
modèle **va changer**, et que rien ne distinguera l'avant de l'après.

---

## Verdict

### PHASE 5.3 : **VALIDÉE**

La traçabilité cible est conçue, entièrement adossée à l'existant : **aucune
table nouvelle**, deux activations de tables dormantes, six colonnes sur des
structures actives.

**Trois constats la fondent :**

1. **Le modèle va changer** — `config.py` le dit explicitement — et rien ne
   permettra de distinguer les résultats produits avant de ceux produits
   après. C'est le seul gap dont l'urgence ne dépend d'aucune décision.

2. **Le SDK fournit déjà `model_version`, `response_id` et les comptes de
   jetons**, et les agents les jettent en ne lisant que `.text`. Le champ le
   plus précieux — le modèle *réellement servi*, qui peut différer de celui
   demandé — est disponible à chaque appel et perdu à chaque appel.

3. **La reproductibilité stricte est hors d'atteinte, et il faut le dire.**
   Aucun `seed`, aucun paramètre d'échantillonnage fixé, un fournisseur qui
   fait évoluer ses modèles derrière un alias. L'objectif atteignable est la
   **ré-explicabilité** — reconstituer le contexte et savoir quel modèle l'a
   traité — pas la reproduction à l'identique.

**Sept décisions restent ouvertes**, dont deux seulement bloquent les trois
premières étapes d'implémentation. Les étapes 1, 3 et 6 sont exécutables sans
attendre.

---

*Aucun fichier du projet n'a été modifié à l'exception du présent rapport.
Aucune migration. Aucune donnée. Aucun commit.*

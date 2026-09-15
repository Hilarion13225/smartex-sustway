# PHASE 5.7-C — Implémentation et migrations Flyway

## Persistance des résultats IA V2 — SMARTEX SUSTWAY

> **PHASE PARTIELLEMENT RÉUSSIE — NON VALIDÉE.**
>
> Le socle de persistance est en place, migré, testé et vérifié sur données
> réelles. Trois points du critère de fin (§30 du brief) **échouent** et sont
> documentés au §25 avec cause, impact et correction nécessaire. Conformément
> à la consigne, la phase n'est pas déclarée validée.
>
> Aucun commit.

---

## 1. Résumé exécutif

### Ce qui est fait et vérifié

**11 migrations Flyway** (V59 → V69) appliquées avec succès à la base de
développement, dont **une seule migration de données**, qui n'écrit que dans
des colonnes créées structurellement avant elle.

La migration rapporte elle-même son résultat :

```
DB: Non-conformites : 39 conservees, 22 courantes, 17 historiques, 22 critere(s) porteur(s).
Successfully applied 11 migrations to schema "public", now at version v69
```

**Les 44 évaluations historiques sont prouvées intactes** — pas par
affirmation, par comparaison de somme de contrôle avant / après :

```
avant : md5(id‖statut‖note) = df9d6f5d3393f022d721734ec2776989
après : md5(id‖statut‖note) = df9d6f5d3393f022d721734ec2776989
```

**Le doublonnage de non-conformités est corrigé sans qu'une ligne ait été
supprimée** : 39 conservées, 22 devenues courantes, 17 devenues historiques,
et **0 critère portant plus d'une courante** — désormais garanti par un index
unique partiel, non par la discipline du code.

### Ce qui échoue

| # | Point du §30 | Cause |
|---|---|---|
| **F1** | Test réel V2 | La route Python V2 **n'exécute aucun agent** — elle valide le contrat et rend un résumé. Le maillon Java → agents V2 n'existe pas |
| **F2** | Axes et plans persistés / actions multi-axes | Tables, entités et dépôts créés ; **aucun endpoint REST** — donc rien à éprouver de bout en bout |
| **F3** | `evaluation V2 = EN_REVUE` en production | Le mécanisme existe et est testé, mais **aucun producteur** n'écrit d'évaluation V2, F1 étant bloquant |

Ces trois échecs forment **une seule chaîne de dépendance**, décrite au §25.

### Une divergence importante découverte

**`ADMIN_AUDIT` est un rôle désactivé.** Le brief demandait d'accorder
`evaluation:valider` à « SUPER_ADMIN / ADMIN_AUDIT selon la compatibilité
historique du projet ». C'est fait — mais un déclencheur en base refuse tout
rattachement à ce rôle :

```
ERROR: Le rôle ADMIN_AUDIT est désactivé et ne peut plus être attribué
```

```
 ADMIN_AUDIT | INACTIF | 0 rattachement
```

**Conséquence** : `RESPONSABLE_ENTREPRISE` étant explicitement exclu par le
brief, **seul SUPER_ADMIN peut effectivement valider une évaluation**. Voir
§24 — c'est un arbitrage métier, pas une correction technique, et il n'a pas
été pris unilatéralement.

---

## 2. Migrations exécutées

| Version | Nom | Objet | Impact | Risque |
|---|---|---|---|:-:|
| **V59** | `enumerations_resultats_ia_v2` | 7 types énumérés | Aucun objet existant | nul |
| **V60** | `evaluation_contrat_v2_et_validation` | 7 colonnes + 2 CHECK + 3 index | Colonnes nullables | nul |
| **V61** | `analyse_documentaire_identifie_le_document` | 3 colonnes + 1 CHECK + 2 index | Colonnes nullables | nul |
| **V62** | `trace_execution_ia` | 6 + 9 colonnes, 6 index | Tables vides | nul |
| **V63** | `detail_des_resultats_ia_v2` | 3 tables, FK, CHECK, 5 index | Création pure | nul |
| **V64** | `axe_amelioration` | 1 table, 4 CHECK, 3 index | Création pure | nul |
| **V65** | `plan_action_et_liaison_axes` | 3 tables, PK composite, 3 index | Création pure | nul |
| **V66** | `permission_valider_une_evaluation` | 1 permission + 2 attributions | Données de référence | faible |
| **V67** | `non_conforme_identite_logique` | 3 colonnes + 1 index | Colonnes nullables | nul |
| **V68** | `rattachement_des_non_conformites_existantes` | **SEULE migration de données** | 39 lignes, 2 colonnes | **moyen** |
| **V69** | `une_seule_non_conformite_courante` | Index unique partiel | Contrainte | **moyen** |

### DDL avant DML, strictement

V67 crée les colonnes, V68 les remplit, V69 pose la contrainte. Les trois sont
séparées à dessein : si le calcul de V68 s'était révélé faux, V69 aurait
échoué en laissant le schéma dans un état intermédiaire **connu**, plutôt
qu'un mélange de DDL et de DML partiellement appliqué.

### Stratégie de retour arrière (conceptuelle)

| Migration | Retour arrière |
|---|---|
| V59–V65, V67 | `DROP` des objets créés. Aucune donnée perdue |
| V66 | `DELETE` de la permission et de ses attributions |
| **V68** | `UPDATE non_conforme SET audit_critere_id = NULL, courante = true`. **Réversible sans perte** — la migration n'écrase aucune donnée préexistante, elle remplit deux colonnes vides |
| **V69** | `DROP INDEX`. Réversible |

**Aucune migration n'est destructive.** Aucun `DROP` de colonne, aucun
`DELETE` de donnée métier, aucune modification d'une migration déjà exécutée.

### Vérification post-migration

```
 evaluations                      | 44
 dont VALIDEE                     | 44
 somme controle evaluations       | df9d6f5d3393f022d721734ec2776989   (identique)
 evaluations avec contrat_version | 0
 evaluations avec validee_par     | 0
 non_conformites (total)          | 39
 dont courantes                   | 22
 dont historiques                 | 17
 dont OUVERTE                     | 39
 criteres avec >1 courante        | 0
 score_historique                 | 8
 eval_doc_analyse                 | 13
 actions_correctives              | 2
 tables                           | 71
```

Les neuf nouvelles tables sont **vides**, comme attendu tant qu'aucun pipeline
V2 n'a tourné.

---

## 3. Tables créées

| Table | Grain | Raison d'être |
|---|---|---|
| `evaluation_preuve` | une preuve attendue | Le cœur du contrat V2 : la conformité cesse d'être un chiffre global |
| `analyse_document_constat` | document × preuve attendue | **Préserve les contradictions** entre pièces |
| `evaluation_constat` | une remarque rattachée | Signaux de risque et éléments manquants |
| `axe_amelioration` | une proposition | Donne un destin honnête à une recommandation d'IA |
| `plan_action` | un plan de mission | Pilotage transversal aux axes |
| `action_plan` | une action | Distincte d'`action_corrective` |
| `action_axe` | liaison N-N | Une action répond à plusieurs axes |

### Pourquoi `analyse_document_constat` et `evaluation_preuve` sont deux tables

Les grains diffèrent. La première dit *ce qu'un document affirme* d'une
attente, la seconde *ce que le pipeline conclut* sur cette attente, toutes
pièces confondues. Les fusionner obligerait à ne garder qu'un constat par
attente — et perdrait le conflit, qui est un fait d'audit et non une erreur à
trancher.

### Pourquoi `evaluation_constat` est mutualisée

`SignalRisque` et `elements_manquants` ont la même forme : un rattachement et
une justification. Deux tables identiques pour une différence tenant dans une
valeur d'énumération auraient été un coût sans contrepartie. Le discriminant
`nature` permet de les scinder plus tard sans migration ambiguë.

---

## 4. Colonnes ajoutées

**28 colonnes, toutes nullables** — condition pour qu'aucune ligne existante
ne devienne invalide.

| Table | Colonnes |
|---|---|
| `evaluation` (7) | `referentiel_version_id`, `analyse_ia_id`, `contrat_version`, `confiance_risque`, `justification_couverture`, `validee_par`, `validee_le` |
| `evaluation_document_analyse` (3) | `document_id`, `piece_reference`, `confiance_lecture` |
| `non_conforme` (3) | `audit_critere_id`, `courante`, `updated_at` |
| `analyse_ia` (6) | `audit_critere_id`, `declenche_par`, `requested_model`, `contrat_version`, `contrat_execution_version`, `erreur_type` |
| `execution_agent` (9) | `piece_reference`, `served_model`, `response_id`, `duration_ms`, 3 compteurs de jetons, `erreur_type`, `erreur_message` |

### `contrat_version` comme marqueur de génération

Nul sur les 44 lignes historiques, `'2.0'` sur les évaluations V2. Cela
distingue le passé du présent **sans écrire une seule ligne** — et c'est ce
qui a permis de ne pas toucher aux données existantes (§22).

---

## 5. Contraintes

| Contrainte | Table | Ce qu'elle empêche |
|---|---|---|
| `evaluation_v2_validee_porte_un_validateur` | `evaluation` | Une évaluation V2 validée dont personne ne répond |
| `evaluation_confiance_risque_domaine` | `evaluation` | Une confiance hors [0,1] |
| `eda_confiance_lecture_domaine` | `evaluation_document_analyse` | Idem |
| `evaluation_preuve_unique` | `evaluation_preuve` | Deux avis sur la même attente |
| `evaluation_constat_cible_coherente` | `evaluation_constat` | Un niveau annoncé qui ne correspond pas à la cible pointée |
| `axe_cible_coherente` | `axe_amelioration` | Idem, rattachement facultatif |
| `axe_validation_coherente` / `axe_rejet_coherent` | `axe_amelioration` | Un statut qui contredit les colonnes de décision |
| `axe_rejet_motive` | `axe_amelioration` | Un rejet sans motif, illisible six mois plus tard |
| `execution_agent_duree_positive` | `execution_agent` | Une durée négative |
| **`non_conforme_courante_unique`** | `non_conforme` | **Une seconde non-conformité courante par critère** |

### La contrainte conditionnée au contrat V2

`evaluation_v2_validee_porte_un_validateur` s'écrit :

```sql
CHECK (contrat_version IS NULL OR statut <> 'VALIDEE' OR validee_par IS NOT NULL)
```

Elle est juste en cible, mais **les 44 lignes existantes la violeraient
toutes** : elles sont `VALIDEE` sans validateur, ayant été produites sous
RG16. La conditionner à `contrat_version IS NOT NULL` la rend exacte sans
mentir sur le passé et sans exiger la moindre écriture. Le passé garde sa
règle, le futur a la sienne.

### L'index unique partiel

```sql
CREATE UNIQUE INDEX non_conforme_courante_unique
    ON non_conforme (audit_critere_id) WHERE courante;
```

C'est la clé de toute la migration des non-conformités : il impose l'unicité
**à partir de maintenant** en laissant coexister autant de lignes historiques
que nécessaire. Un index unique plein aurait exigé de supprimer ou déplacer
les 17 lignes en excès.

---

## 6. Index

24 index créés. Les plus significatifs :

| Index | Sert |
|---|---|
| `evaluation_critere_recente_idx (audit_critere_id, date_evaluation DESC, id DESC)` | La requête la plus fréquente. **`id DESC` départage** deux évaluations écrites dans la même transaction |
| `evaluation_a_relire_idx … WHERE statut <> 'VALIDEE'` | Liste « à relire », partiel donc petit |
| `evaluation_preuve_conflit_idx … WHERE conflit IS NOT NULL` | « Quelles attentes portent un conflit ? » |
| `execution_agent_response_idx (response_id)` | Réclamation auprès du fournisseur |
| `execution_agent_erreur_idx … WHERE erreur_type IS NOT NULL` | Analyse des pannes |
| `adc_preuve_idx (preuve_attendue_id)` | « Quels documents démontrent cette attente ? » |

Les index partiels sont préférés aux index pleins partout où la clause de
filtrage est celle du cas d'usage : ils n'indexent que les lignes réellement
interrogées et restent petits quand la table grossit.

---

## 7. Entités JPA

### Créées — 7

`AnalyseIa`, `ExecutionAgent`, `EvaluationPreuve`, `AnalyseDocumentConstat`,
`EvaluationConstat`, `AxeAmelioration`, `PlanAction`, `ActionPlan`.

> `analyse_ia` et `execution_agent` **n'avaient jamais été mappées** : la
> phase 5.7-A l'avait établi par un `grep` sans résultat sur
> `api-quarkus/src/main/java`. Les activer supposait donc de créer les
> entités et les dépôts, pas seulement d'ajouter des colonnes.

### Étendues — 3

`Evaluation` (+7 champs, + `validerPar()`, + `issueDuContratV2()`),
`EvaluationDocumentAnalyse` (+3 champs), `NonConforme` (+3 champs,
+ `actualiserDepuis()`, + `archiver()`).

### Énumérations — 11

`StatutPipeline`, `StatutExecutionAgent`, `FormulePipeline`, `TypeAgentIa`,
`PresenceConstat`, `CouverturePreuveAttendue`, `NatureConstat`,
`NiveauRattachement`, `OrigineAxe`, `StatutAxe`, `StatutPlan`.

### Fabriques nommées plutôt que constructeurs permissifs

`EvaluationConstat.surExigence / surPreuveAttendue / surRegle` et
`AxeAmelioration.proposeParIa / saisiParHumain` posent le niveau et la cible
**ensemble**. Un constructeur à quatre paramètres nullables aurait permis de
construire une ligne incohérente que seule la base aurait refusée, à
l'insertion, avec un message opaque.

---

## 8. Dépôts

**Créés** : `AnalyseIaRepository`, `ExecutionAgentRepository`,
`EvaluationPreuveRepository`, `EvaluationConstatRepository`,
`AnalyseDocumentConstatRepository`, `AxeAmeliorationRepository`,
`PlanActionRepository`, `ActionPlanRepository`.

**Modifié** : `NonConformeRepository`.

### Le changement le plus important du lot

```java
// avant
list("evaluation.auditCritere.audit.id = ?1 order by createdAt desc", auditId)

// après
list("auditCritere.audit.id = ?1 and courante = true order by createdAt desc", auditId)
```

**Le chemin par défaut ne rend que les non-conformités courantes.** Sans ce
filtre, toute lecture métier — liste, tableau de bord, rapport, comptage —
présenterait 39 non-conformités là où il n'y a que 22 écarts réels. C'est le
point où un seul oubli aurait restitué le défaut.

L'historique reste atteignable par `parAuditAvecHistorique`, une méthode qui
le dit — jamais par inadvertance.

**Usages recensés et vérifiés** : `RapportGenerationService` (×2),
`NonConformeResource.lister`, `ActionCorrectiveResource`. Tous passent par
`parAudit` ou `parIdEtAudit`, tous corrigés par le changement du dépôt.

---

## 9. Services

### `ValidationEvaluationService` — nouveau

Seul chemin vers `VALIDEE`. Trois effets, dans une transaction unique :
l'évaluation passe à `VALIDEE` avec son validateur, la non-conformité est
créée ou actualisée, le score est ré-instantané.

Refuse explicitement une évaluation déjà `VALIDEE` (409) plutôt que de la
traiter comme un succès silencieux : revalider ré-instantanerait le score et
réactualiserait l'écart sans qu'aucune décision nouvelle n'ait été prise.

### `NonConformiteService` — modifié

Trois issues, et trois seulement :

| Situation | Comportement |
|---|---|
| Aucun écart courant, critère non conforme | **Création** |
| Écart courant existant | **Actualisation** — gravité, risque, description |
| Critère devenu conforme (note 5) | **Clôture** de l'écart courant |

**Le statut métier n'est jamais réinitialisé.** Une non-conformité en cours de
traitement, avec ses actions correctives rattachées, ne doit pas revenir à
l'état ouvert parce qu'une analyse a été relancée. C'est éprouvé par un test.

**Un critère devenu conforme voit son écart clôturé, jamais supprimé** :
effacer l'écart effacerait aussi la trace du travail accompli pour le
résorber.

---

## 10. Permission `evaluation:valider`

```sql
INSERT INTO permission (code, nom, description) VALUES ('evaluation:valider', …)
INSERT INTO role_permission … WHERE r.code IN ('SUPER_ADMIN', 'ADMIN_AUDIT')
```

La migration **échoue** plutôt que de laisser une attribution partielle (qui
donnerait des 403 inexpliqués) ou trop large (qui passerait inaperçue). Deux
contrôles : le compte exact, et l'absence de fuite vers un rôle non prévu.

Vérifié en base :

```
 permission evaluation:valider   | 1
 roles porteurs                  | 2  →  SUPER_ADMIN, ADMIN_AUDIT
```

### Les trois séparations, éprouvées par des tests

| Détenir… | ne donne pas… | Test |
|---|---|---|
| `analyse:executer` | `evaluation:valider` | `executerUneAnalyseNeDonnePasLeDroitDeValider` → 403 |
| `audit:cloturer` | `evaluation:valider` | `cloturerUneMissionNeDonnePasLeDroitDeValider` → 403 |
| `RESPONSABLE_ENTREPRISE` | `evaluation:valider` | `leResponsableDeLEntrepriseAuditeeNeValidePas` → 403 |

Le premier est le point de toute la séparation : celui qui produit le
résultat ne doit pas pouvoir l'entériner, sans quoi la revue humaine n'est
qu'une formalité automatique.

**Voir §24** pour la conséquence de la désactivation d'`ADMIN_AUDIT`.

---

## 11. Le cycle EN_REVUE → VALIDEE

```
   [pipeline V2]  →  EN_REVUE  ──── hors score officiel
                        │
                        │  POST …/evaluations/{id}/validation
                        │  permission evaluation:valider
                        ▼
                     VALIDEE  ──── entre dans le score
                        │
                        ├─→ non-conformité créée ou actualisée
                        └─→ score ré-instantané
```

**Le mécanisme d'exclusion du score n'a pas eu à être écrit** :
`AuditScoreService` distingue déjà les trois statuts et compte `EN_REVUE` à
part. Il existait depuis toujours et n'avait jamais servi, aucune évaluation
n'ayant jamais porté cet état. Aucune modification du moteur de scoring n'a
été nécessaire — c'est l'argument le plus solide en faveur de l'orientation
retenue en Q1.

**Statut de mise en service : F3.** Le cycle est implémenté et testé, mais
aucun producteur n'écrit d'évaluation V2 (voir §25).

---

## 12. Gestion des non-conformités

Voir §9 pour le comportement, §5 pour la contrainte, §13 pour la migration.

**Ce qui est garanti désormais, et ne l'était pas :**

1. une ré-analyse n'ajoute pas de ligne — vérifié par test ;
2. un critère ne peut pas porter deux écarts courants — vérifié par la base,
   pas par le code ;
3. le travail humain engagé sur un écart survit à une ré-analyse ;
4. un écart résolu est clôturé, pas effacé ;
5. les lectures métier ne voient que le courant.

---

## 13. Migration des 17 non-conformités excédentaires

### Le calcul, prévisualisé avant d'être appliqué

Conformément au §11 du brief, la partition a été prévisualisée sur la base
réelle **avant** toute écriture :

```
 futures courantes (rang=1)   | 22
 futures historiques (rang>1) | 17
 total classe                 | 39
 criteres distincts           | 22
```

Contrôles préalables :

```
 NC sans evaluation resolvable         | 0
 NC dont evaluation sans audit_critere | 0
 groupes avec created_at ex aequo      | 0
```

Aucun orphelin, aucune égalité d'horodatage — le départage par
`created_at DESC, id DESC` est donc déterministe.

### Le résultat, rapporté par la migration elle-même

```
DB: Non-conformites : 39 conservees, 22 courantes, 17 historiques, 22 critere(s) porteur(s).
```

### Une erreur commise, et corrigée

Le premier jet de V68 vérifiait des **chiffres** : « 39 attendues, 22
courantes, 17 historiques ». La migration a échoué au premier lancement de la
suite de tests :

```
ERROR: Nombre de non-conformites inattendu : 3 (39 attendues).
```

La base de test ne contient pas les mêmes données que celle de développement
— évidence que l'assertion numérique ignorait. **Une migration doit tenir sur
n'importe quelle base** : celle de test, celle de chaque développeur, la
production. Les invariants ont été réécrits en termes structurels :

- aucune non-conformité sans critère ;
- `count(courantes) = count(DISTINCT audit_critere_id)` — ce qui dit à la
  fois qu'aucun critère n'en a deux et qu'aucun n'en a zéro ;
- `total = courantes + historiques`.

Les chiffres constatés restent en commentaire, comme observation, jamais
comme assertion.

---

## 14. Axes d'amélioration

**Structure complète, exploitation absente.** Table, contraintes, entité,
fabriques, dépôt : faits. Endpoints REST : **non faits** (F2).

Ce que la structure garantit déjà :

- un axe d'origine IA naît `PROPOSE` — c'est le seul état qu'une sortie de
  modèle peut atteindre sans intervention humaine ;
- un axe `VALIDE` porte obligatoirement son validateur (contrainte) ;
- un axe `REJETE` porte obligatoirement un motif non vide (contrainte) ;
- `origine_initiale` conserve la provenance avant toute reprise humaine —
  sans elle, un axe IA reformulé par un auditeur deviendrait indistinguable
  d'un axe humain ;
- un axe rejeté est **conservé**.

### Une énumération nouvelle plutôt qu'une extension

`origine_contenu` existait (`CONTENU_INITIAL | CONTENU_HUMAIN | IMPORT_IA`),
mais ses valeurs sont spécifiques à l'import de référentiel : `IMPORT_IA` y
signifie « issu d'un import de document ». Un axe produit par une analyse de
mission ne vient d'aucun import ; réutiliser ce vocabulaire aurait fait dire
à `IMPORT_IA` autre chose selon la table. D'où `origine_axe (IA | HUMAIN)`.

---

## 15. Plans d'action

**Structure complète, exploitation absente** (F2).

`plan_action` est rattaché à `audit`, non à un axe. `action_plan` porte les
actions. `action_axe` est la liaison **N-N**, avec clé primaire composite qui
rend structurellement impossible de rattacher deux fois le même axe à la même
action.

`action_corrective` n'a pas été réutilisée : son `non_conforme_id` est
`NOT NULL`, et y loger une action issue d'un axe aurait obligé à fabriquer
une non-conformité fictive — c'est-à-dire à transformer une proposition
d'amélioration en constat d'écart.

Les énumérations `statut_action_corrective` et `priorite_action` sont
réutilisées telles quelles : en créer de nouvelles aurait donné deux
vocabulaires pour le même concept.

---

## 16. Persistance du risque IA

**`risque_evaluation` n'a pas été touchée** — ni sa structure, ni son sens.
Elle reste le calcul déterministe RG26.

| Donnée du Risk Agent | Emplacement | État |
|---|---|---|
| `signal_risque` | `evaluation.signal_risque` | colonne existante |
| `categorie` | `evaluation.categorie_risque` | colonne existante |
| `justification` | `evaluation.justification_risque` | colonne existante |
| `confiance` | `evaluation.confiance_risque` | **colonne ajoutée** |
| `signaux[]` | `evaluation_constat` (`nature = SIGNAL_RISQUE`) | **table créée** |

La séparation est documentée dans le code, à l'endroit où elle risquerait
d'être confondue (javadoc d'`EvaluationConstat`).

> **Rappel d'un gap antérieur, hors périmètre** : `risque_evaluation` est
> **vide** (0 ligne). Le calcul RG26 n'est persisté nulle part —
> `ScoringEngine.risqueAttendu` est appelé par `NonConformiteService`, qui
> écrit dans `non_conforme.risque_attendu`, donc jamais pour un critère
> conforme. Constaté en 5.7-A, non traité ici.

---

## 17. Persistance de `execution_agent`

**Structure prête, alimentation absente** (dépend de F1).

Le grain est **l'appel au fournisseur**, pas l'agent : le Document Agent
effectue un appel par pièce. Aucune contrainte d'unicité
`(analyse_ia_id, agent)` n'a été posée — elle interdirait de tracer huit
lectures documentaires. C'est `piece_reference` qui distingue les appels d'un
même agent.

Les neuf colonnes reprennent une à une les métadonnées que l'instrumentation
Python produit depuis la phase 5.6 (`AppelTrace`), y compris `served_model` —
seul témoin de ce que le fournisseur a réellement servi.

**Aucune colonne ne peut recevoir de prompt, de contenu de document, de
réponse brute ni de secret.** `erreur_message` reçoit un texte déjà assaini
par le service Python.

---

## 18. Isolation multi-tenant

### Le motif suivi

Repris de l'existant, qui est solide : l'URL porte `entrepriseId`,
`exigerAccesEntreprise` le vérifie, puis `trouverAudit` contrôle que la
mission appartient bien à cette entreprise.

L'endpoint de validation ajoute un troisième contrôle : l'évaluation doit
appartenir au critère de l'URL.

```java
if (evaluation == null || !evaluation.getAuditCritere().getId().equals(auditCritereId)) {
    throw new NotFoundException("Évaluation introuvable pour ce critère");
}
```

### Les nouvelles tables portent leur clé de tenant

`axe_amelioration.audit_id` et `plan_action.audit_id` sont `NOT NULL`, bien
que dérivables. Un contrôle d'accès qui coûte trois jointures est un contrôle
qu'on finit par oublier d'écrire.

Les tables de détail (`evaluation_preuve`, `evaluation_constat`,
`analyse_document_constat`, `action_plan`, `action_axe`) ne portent pas
`audit_id` : elles vivent en `CASCADE` sous un parent qui, lui, le porte. Y
ajouter la colonne créerait une seconde vérité pouvant diverger. Les dépôts
remontent explicitement au parent (`ActionPlanRepository.parIdEtAudit`,
`ExecutionAgentRepository.parAnalyseEtAudit`).

### Tests IDOR

`uneAutreEntrepriseNAtteintPasLEvaluationMemeAvecSonUuid` — un tiers,
administrateur de sa propre entreprise, connaissant l'UUID exact d'une
évaluation d'une autre : **403** par l'URL de la victime, **404** par la
sienne. L'évaluation reste `EN_REVUE`, sans validateur.

`uneEvaluationDUnAutreCritereNEstPasAtteignableParCeChemin` — **404**.

**Limite reconnue** : ces tests couvrent l'endpoint créé dans cette phase.
Les endpoints d'axes et de plans n'existant pas (F2), leurs tests IDOR n'ont
pas pu être écrits.

---

## 19. Idempotence

| Objet | Règle | Mécanisme |
|---|---|---|
| Non-conformité | **Une courante par critère** | Index unique partiel + service |
| Détail par preuve | Un avis par attente | `UNIQUE (evaluation_id, preuve_attendue_id)` |
| Liaison action ↔ axe | Un rattachement | PK composite |
| Score historique | Un par jour | UPSERT existant, inchangé |
| Évaluation | **Aucune unicité** | L'accumulation *est* l'historisation |
| `analyse_ia` / `execution_agent` | **Aucune unicité** | Une nouvelle exécution doit créer une nouvelle trace |

L'asymétrie est voulue : l'idempotence ne signifie pas « une seule exécution
possible », mais « une même opération logique ne crée pas plusieurs objets
métier identiques ».

### Le verrou non implémenté

`AnalyseIaRepository.enCoursSurCritere` est écrit et prêt : il permettra de
refuser le lancement si une passe est déjà en cours sur le même critère.
**Il n'est branché nulle part** — le producteur d'analyses V2 n'existe pas
(F1). Deux analyses simultanées produiraient encore deux traces, toutes deux
légitimes au regard des contraintes.

---

## 20. Transactionnalité

| Opération | Atomicité |
|---|---|
| Validation → NC → score | `@Transactional` sur `EvaluationResource.valider` |
| NC courante → actualisation | Dans la même transaction |
| Analyse → évaluation → NC → score (V1) | `@Transactional` existant, inchangé |

Aucun état partiel n'est acceptable : une évaluation validée dont la
non-conformité n'aurait pas suivi laisserait la mission avec un écart
invisible.

---

## 21. Journalisation

`audit_log` réutilisée, aucun second système. Événement ajouté :

```java
auditLogService.journaliser(utilisateurId, entrepriseId,
                            "EVALUATION_VALIDEE", "evaluation", evaluation.getId());
```

Les autres événements prévus par le brief (`ANALYSE_IA_LANCEE`,
`AXE_CREE`, `PLAN_ACTION_CREE`…) dépendent des chemins non implémentés
(F1, F2).

---

## 22. Tests

### Décompte

| Suite | Avant | Après | Écart |
|---|---:|---:|---:|
| Java | 344 | **364** | **+20** |
| Python hors Gemini | 258 | 258 | 0 |
| Frontend `npm run build` | vert | **vert** | — |

Python et frontend n'ont **pas été modifiés** dans cette phase ; leur
exécution vérifie l'absence d'effet de bord.

### Fichiers de test créés

| Fichier | Tests | Objet |
|---|---:|---|
| `NonConformiteCouranteTest` | 9 | L'invariant « une courante par critère » |
| `ValidationEvaluationTest` | 11 | Cycle EN_REVUE → VALIDEE, RBAC, IDOR |

### Sorties brutes

```
[INFO] Tests run: 9, Failures: 0, Errors: 0, Skipped: 0 -- NonConformiteCouranteTest
[INFO] Tests run: 11, Failures: 0, Errors: 0, Skipped: 0 -- ValidationEvaluationTest
[INFO] Tests run: 20, Failures: 0, Errors: 0, Skipped: 0
```

Python :

```
258 passed, 1 warning in 17.20s
```

Frontend :

```
✓ built in 21.89s
```

### Une remarque d'environnement

La suite Java exige `SMARTEX_S3_ENDPOINT=http://localhost:9002` : MinIO est
publié sur le port **9002**, alors que `application.properties` vaut 9000 par
défaut. Sans cette variable, Quarkus ne démarre pas et **toute la suite est
signalée comme « skipped »**, ce qui ressemble à un succès dans un rapport
distrait. Défaut d'environnement préexistant, sans rapport avec cette phase,
mais qui mérite d'être connu.

---

## 23. État des données de référence

### Les 44 évaluations historiques — INTACTES, prouvé

| Contrôle | Avant | Après |
|---|---|---|
| Nombre | 44 | 44 |
| Statut `VALIDEE` | 44 | 44 |
| **`md5(id‖statut‖note)`** | `df9d6f5d3393f022d721734ec2776989` | **identique** |
| `contrat_version` renseigné | — | **0** |
| `validee_par` renseigné | — | **0** |

Aucune n'a été passée en `EN_REVUE`. Aucune n'a reçu de validateur fictif.
Elles se distinguent des évaluations V2 par `contrat_version IS NULL`, sans
qu'une seule écriture ait été nécessaire.

Les 8 instantanés de `score_historique` restent donc cohérents avec le calcul
courant — ce qui n'aurait pas été le cas si les 44 étaient sorties du score.

### Les 39 non-conformités — CONSERVÉES

| Contrôle | Résultat |
|---|---|
| Total | **39** — aucune suppression |
| Courantes | **22** |
| Historiques | **17** |
| Statut `OUVERTE` | **39** — aucun statut modifié |
| Critères avec >1 courante | **0** |

---

## 24. Écarts avec la phase 5.7-B

### E1 — `ADMIN_AUDIT` est un rôle désactivé — **IMPORTANT**

Découvert en exécutant les tests, pas en lisant le schéma :

```
ERROR: Le rôle ADMIN_AUDIT est désactivé et ne peut plus être attribué
       (déclencheur refuser_role_inactif)
```

```
 ADMIN_AUDIT            | INACTIF | 0 rattachement
 EMPLOYE                | INACTIF | 0
 VISITEUR               | INACTIF | 0
 SUPER_ADMIN            | ACTIF   | 5
 RESPONSABLE_ENTREPRISE | ACTIF   | 8
 COLLABORATEUR          | ACTIF   | 5
```

La phase 5.7-B avait relevé l'existence du rôle, pas sa désactivation.

**Conséquence** : la permission étant accordée à SUPER_ADMIN et ADMIN_AUDIT,
et `RESPONSABLE_ENTREPRISE` étant explicitement exclu par le brief,
**seul SUPER_ADMIN peut valider une évaluation**.

Est-ce voulu ? C'est défendable — la relecture d'un résultat d'IA relève de
l'administration métier de l'audit, et l'organisation auditée ne peut pas
être à la fois le sujet de l'évaluation et celui qui l'entérine. Mais cela
signifie que **Smartex doit relire chaque critère de chaque mission de chaque
client**, ce qui est une charge opérationnelle réelle.

**Décision non prise.** Trois options, toutes métier :

1. laisser en l'état — Smartex valide tout ;
2. réactiver `ADMIN_AUDIT` et l'attribuer à des auditeurs métier ;
3. accorder `evaluation:valider` à `RESPONSABLE_ENTREPRISE` — contredit le
   brief, et affaiblit la séparation.

La migration V66 n'a **pas** été modifiée : elle a déjà été exécutée, et le
brief interdit de toucher une migration appliquée. Un changement passerait
par une V70.

### E2 — `evaluation.version_referentiel` laissée intacte

Conforme au §7 du brief et à la recommandation de 5.7-B : le varchar n'est ni
rempli, ni supprimé. La FK `referentiel_version_id` est ajoutée comme
assurance, avec un `COMMENT ON COLUMN` marquant l'ancienne colonne obsolète.

**Non rétro-remplie** sur les 44 lignes : la valeur serait dérivable de
`audit.referentiel_version_id`, mais dirait « la version de la mission
aujourd'hui », pas « la version sous laquelle cette évaluation a été rendue ».
Une valeur nulle honnête vaut mieux qu'une valeur reconstituée.

### E3 — 11 migrations, comme prévu

5.7-B annonçait 11 migrations futures dont une seule de données. C'est
exactement ce qui a été produit. Aucune divergence.

---

## 25. Points en échec — cause, impact, correction

### F1 — Test réel V2 : **ÉCHEC**

**Cause, vérifiée dans le code** : `services-ia-python/app/routers/evaluations_v2.py`
valide le contrat et rend un résumé. Son propre en-tête le dit :

```python
"""Route V2 — acceptation et validation du contrat, sans exécution d'agents."""
...
agents_executes=[],   # Aucun agent n'est exécuté en phase 2
```

Le maillon manquant est **l'orchestration Python V2** : une route qui exécute
Document V2 par pièce, puis Evidence V2, Risk V2, Recommendation V2, et rend
`{resultat, execution}`. C'est l'étape 5 de la feuille de route de la phase
5.5 — identifiée là-bas comme modifiant le contrat de réponse, donc traitée
comme un lot distinct.

Côté Java, `IaEvaluationClient` pointe `/api/v1/evaluations` ; aucun client V2
n'existe.

**Impact** : le pipeline V2 ne peut pas être exercé de bout en bout. Par
conséquence directe, `analyse_ia`, `execution_agent`, `evaluation_preuve`,
`evaluation_constat` et `analyse_document_constat` **restent vides**.

**Ce qui n'est PAS en cause** : les quatre agents V2 fonctionnent et sont
éprouvés contre le vrai Gemini (61 tests réels en phase 5.6). Ce n'est pas
leur qualité qui manque, c'est le chaînage.

**Correction nécessaire** :

1. route Python `POST /api/v2/evaluations/critere/executer` orchestrant les
   quatre agents et rendant `{resultat, execution}` ;
2. `IaEvaluationClientV2` côté Java ;
3. `PersistanceResultatV2Service` — création d'`analyse_ia`, appel hors
   transaction, résolution des références en UUID **dans la même unité de
   travail** (contrainte de 5.7-B §17), persistance en transaction ;
4. branchement dans `AnalyseCritereService` ou une ressource dédiée.

> **Aucune affirmation de fonctionnement réel n'est faite ici.** Le socle est
> testé ; l'intégration V2 de bout en bout **n'a pas été démontrée**, et ne
> doit pas être présentée comme telle.

### F2 — Axes et plans : **ÉCHEC PARTIEL**

**Cause** : tables, contraintes, entités et dépôts créés ; aucun endpoint
REST écrit.

**Impact** : les tests exigés par le brief (création IA, validation, rejet,
motif obligatoire, isolation tenant, action multi-axes) ne peuvent pas être
écrits de bout en bout. Les invariants de validation et de motif de rejet
sont **garantis par la base** et non éprouvés par l'API.

**Correction nécessaire** : `AxeAmeliorationResource` (lister, valider,
rejeter), `PlanActionResource` (créer, lister), `ActionPlanResource`
(créer, rattacher des axes), puis leurs tests RBAC et IDOR. Une permission
dédiée à la validation d'axe reste à arbitrer.

### F3 — `evaluation V2 = EN_REVUE` en production : **ÉCHEC**

**Cause** : conséquence de F1 — aucun producteur d'évaluation V2.

**Impact** : le comportement est implémenté et testé, mais aucune évaluation
réelle ne naît `EN_REVUE`. Le chemin V1 reste inchangé et continue d'écrire
`VALIDEE` (RG16), ce qui était l'exigence de non-régression.

**Point de conception à trancher** : lorsque le chemin V2 sera branché, le
point d'appel de `NonConformiteService.genererSiNecessaire` devra migrer de
l'analyse vers la validation pour ce chemin. Il y est **déjà** dans
`ValidationEvaluationService` ; il reste dans `AnalyseCritereService` pour le
chemin V1. Les deux coexistent sans conflit tant que V2 n'écrit rien.

---

## 26. Critère de fin — état point par point

| | Point | État |
|:-:|---|---|
| ✅ | Migrations Flyway propres | 11 appliquées, aucune modifiée après exécution |
| ✅ | Schéma cible 5.7-B respecté | 7 tables, 28 colonnes, noms identiques |
| ✅ | `analyse_ia` activée | Entité + dépôt créés |
| ✅ | `execution_agent` activée | Entité + dépôt créés |
| ⚠️ | `evaluation V2 = EN_REVUE` | Implémenté et testé — **aucun producteur (F3)** |
| ✅ | Validation humaine indépendante | Service + endpoint + 11 tests |
| ✅ | Permission `evaluation:valider` | Créée, attribuée, fuite vérifiée |
| ✅ | Score exclut `EN_REVUE` | Mécanisme existant, aucune modification nécessaire |
| ✅ | NC courante unique par `audit_critere` | Index unique partiel |
| ✅ | 39 NC historiques conservées | 39 en base |
| ✅ | 22 courantes / 17 historiques | Vérifié |
| ✅ | Risk IA séparé de `risque_evaluation` | Table non touchée |
| ✅ | `document_id` tracé | Colonne + FK |
| ⚠️ | Axes persistés | Structure oui, **endpoints non (F2)** |
| ⚠️ | Plans persistés | Structure oui, **endpoints non (F2)** |
| ⚠️ | Actions multi-axes | Structure oui, **endpoints non (F2)** |
| ⚠️ | Tenant isolation testée | Sur l'endpoint créé ; pas sur axes/plans |
| ⚠️ | IDOR testés | Idem |
| ⚠️ | Idempotence testée | NC oui ; verrou d'analyse concurrente non branché |
| ✅ | Audit trail | `EVALUATION_VALIDEE` ; les autres dépendent de F1/F2 |
| ✅ | Tests Java verts | **364** |
| ✅ | Tests Python verts | **258** |
| ✅ | Build frontend vert | ✓ |
| ❌ | **Test réel V2 réussi** | **F1 — bloqué** |
| ✅ | 44 évaluations intactes | Somme de contrôle identique |
| ✅ | Aucun secret | Aucune clé, aucun prompt, aucun document en base |
| ✅ | Aucun commit | — |

**5 ⚠️ et 1 ❌ — la phase n'est pas déclarée validée.**

---

## 27. Recommandations pour la PHASE 5.8

### Par ordre de dépendance

| # | Travail | Débloque |
|---|---|---|
| **1** | Orchestration Python V2 rendant `{resultat, execution}` | F1, F3, et l'alimentation de 5 tables |
| **2** | `IaEvaluationClientV2` + `PersistanceResultatV2Service` | Idem |
| **3** | Verrou d'analyse concurrente (`enCoursSurCritere`, déjà écrit) | Idempotence d'exécution |
| **4** | Ressources REST axes / plans / actions + tests IDOR | F2 |
| **5** | Arbitrage sur `ADMIN_AUDIT` (§24 E1) | Utilisabilité de la validation |

### Points de vigilance pour l'étape 1

- **La table de références vit en mémoire.** `ReferencesPreuvesAttendues`
  n'est persistée nulle part : la résolution des références en UUID doit
  avoir lieu dans la même unité de travail que la construction du contexte.
  Toute mise en file d'attente du résultat brut rendrait les références
  définitivement irrésolvables.
- **Jamais de transaction ouverte pendant l'appel Python** (contrainte de la
  phase 5.5). `analyse_ia` doit être créée puis close dans deux transactions
  distinctes.
- **Une référence non résolvable ne doit pas faire échouer toute la passe.**
  Le côté Python écarte déjà ce qui ne désigne rien du catalogue transmis.

### Deux gaps antérieurs toujours ouverts

- `risque_evaluation` **vide** : le calcul RG26 n'est persisté nulle part
  (§16). Indépendant de l'IA.
- `score_audit` et `score_domaine` **vides et jamais lues** :
  `AuditScoreService` recalcule à la volée.

---

## 28. Fichiers

### Créés — 30

```
Migrations (11)
  api-quarkus/src/main/resources/db/migration/V59__enumerations_resultats_ia_v2.sql
  …/V60__evaluation_contrat_v2_et_validation.sql
  …/V61__analyse_documentaire_identifie_le_document.sql
  …/V62__trace_execution_ia.sql
  …/V63__detail_des_resultats_ia_v2.sql
  …/V64__axe_amelioration.sql
  …/V65__plan_action_et_liaison_axes.sql
  …/V66__permission_valider_une_evaluation.sql
  …/V67__non_conforme_identite_logique.sql
  …/V68__rattachement_des_non_conformites_existantes.sql
  …/V69__une_seule_non_conformite_courante.sql

Énumérations (11)   domain/enums/{StatutPipeline, StatutExecutionAgent,
                    FormulePipeline, TypeAgentIa, PresenceConstat,
                    CouverturePreuveAttendue, NatureConstat,
                    NiveauRattachement, OrigineAxe, StatutAxe, StatutPlan}.java

Entités (7)         domain/entity/{AnalyseIa, ExecutionAgent, EvaluationPreuve,
                    AnalyseDocumentConstat, EvaluationConstat, AxeAmelioration,
                    PlanAction, ActionPlan}.java

Dépôts (8)          domain/repository/{AnalyseIa, ExecutionAgent,
                    EvaluationPreuve, EvaluationConstat, AnalyseDocumentConstat,
                    AxeAmelioration, PlanAction, ActionPlan}Repository.java

Service (1)         mission/ValidationEvaluationService.java

Tests (2)           conformite/NonConformiteCouranteTest.java
                    mission/ValidationEvaluationTest.java

Document (1)        docs/PHASE5_7C_IMPLEMENTATION.md
```

### Modifiés — 6

```
domain/entity/Evaluation.java                    +7 champs, validerPar(), issueDuContratV2()
domain/entity/EvaluationDocumentAnalyse.java     +3 champs
domain/entity/NonConforme.java                   +3 champs, actualiserDepuis(), archiver()
domain/repository/NonConformeRepository.java     filtre `courante` par défaut
conformite/NonConformiteService.java             création / actualisation / clôture
resource/EvaluationResource.java                 endpoint de validation
```

**Aucune migration existante modifiée. Aucun fichier Python. Aucun fichier
frontend.**

---

## Clôture

**PHASE 5.7-C — NON VALIDÉE** *(partiellement réussie)*

| | |
|---|---|
| Migrations Flyway | **11 appliquées** (V59 → V69), succès |
| Migrations de données | **1** (V68), sur colonnes créées en V67 |
| Migrations existantes modifiées | **AUCUNE** |
| Tables créées | **7** (64 → 71) |
| Colonnes ajoutées | **28**, toutes nullables |
| Données historiques supprimées | **AUCUNE** |
| 44 évaluations | **INTACTES** — somme de contrôle identique |
| 39 non-conformités | **CONSERVÉES** — 22 courantes / 17 historiques |
| Tests Java | **364/364** |
| Tests Python | **258/258** |
| Build frontend | **vert** |
| Secrets, prompts, documents en base | **AUCUN** |
| Sécurité désactivée | **AUCUNE** |
| Commit | **AUCUN** |

**Échecs** : F1 (test réel V2 — orchestration Python V2 absente), F2 (axes et
plans sans endpoints), F3 (aucun producteur d'évaluation V2). Tous trois
forment une chaîne de dépendance dont F1 est la racine.

**Divergence à arbitrer** : `ADMIN_AUDIT` étant désactivé, seul SUPER_ADMIN
peut aujourd'hui valider une évaluation.

# Source du référentiel

Ce dossier est la **source de vérité** du catalogue métier de Smartex Sustway.
Les migrations Flyway qui sèment ce catalogue en sont générées ; elles ne sont
pas écrites à la main.

## Pourquoi ce dossier existe

Jusqu'en septembre 2026, deux catalogues coexistaient sans que rien ne le
signale :

- celui que **produisaient les migrations** `V11` et `V20` — 145 critères,
  codes `VE-01`, `GOUV-01`, `SOC-01`, `ENV-01`, `ECO-01`, `ORG-01`, `PS1-01`,
  `P1-01`, intitulés courts ;
- celui que **l'application utilisait réellement** — 136 critères, codes
  `D1-01` à `D6-93`, portant le questionnaire tel qu'il est posé aux
  organisations auditées.

Le second a été chargé directement en base le 7 septembre 2026 à 15h36, en une
seule transaction, hors chaîne de migrations et hors application : les trois
référentiels portent la même date de création à la microseconde près, et le
journal d'audit ne contient aucune trace de leur création. Il n'existait donc
dans aucun fichier du dépôt, et une installation neuve ne pouvait pas le
reproduire.

Ce dossier ferme cet écart. Le catalogue réel a été extrait de la base de
développement, exactement tel qu'il s'y trouvait, et versionné ici.

## Contenu

| Fichier | Rôle |
|---|---|
| `SMARTEX_SUSTWAY.json`, `IFC_SFI.json`, `PRI.json` | Catalogue réel : domaines, sous-domaines, critères, questions. Extraction fidèle, coquilles comprises. |
| `contenu-metier/*.py` | Contenu métier rédigé : exigences, preuves attendues, règles d'analyse, par référentiel. |
| `generer-migrations.py` | Génère les migrations Flyway à partir des deux précédents. |

## Règle d'or : le catalogue est reproduit à l'identique

Les fichiers JSON reproduisent l'existant **sans le corriger**. Les coquilles
relevées — « ambiiton » (D3-10, D3-11), « Aavant … donénée » (D6-22), le point
parasite en tête de PRI D1-15, « ISO 51001 » qui n'existe pas (D4-60),
« OHSAS 18001 » retirée depuis 2021 (D3-36) — sont conservées telles quelles.

Corriger un libellé au passage rendrait la reproduction infidèle et
invérifiable : on ne saurait plus si un écart entre la base et la source est un
bogue ou une correction voulue. Les corrections de contenu passent par une
version corrective du référentiel, jamais par le semis.

## Comment régénérer les migrations

```bash
python referentiel-source/generer-migrations.py
```

Le script écrit `V55__catalogue_reel_du_referentiel.sql` et
`V56__contenu_metier_du_referentiel.sql` dans
`api-quarkus/src/main/resources/db/migration/`. Il refuse d'écrire si le
contenu métier ne correspond pas au catalogue — code inconnu, type hors enum,
définition de règle non conforme aux schémas de `RegleAnalyseValidation`.

Une migration déjà appliquée quelque part ne doit plus être régénérée : Flyway
en refuserait la somme de contrôle. Une évolution du catalogue passe par une
migration suivante.

## Comment le catalogue est vérifié

`CatalogueReelTest` relit ces fichiers JSON et les compare, champ par champ, à
la version publiée en base : codes, libellés, descriptions, ordres,
rattachements aux sous-domaines, applicabilité, criticité, coefficients,
questions et leur échelle de réponse. Un compte de lignes ne suffirait pas —
c'est l'égalité du contenu qui est éprouvée.

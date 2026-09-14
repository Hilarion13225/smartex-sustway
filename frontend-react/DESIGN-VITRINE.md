# Refonte de la vitrine — « Registre de preuves »

Plan de design établi avec le skill `frontend-design`, avant d'écrire le code.

## Le sujet

Une plateforme d'évaluation RSE et ESG, éditée par un cabinet d'audit d'Abidjan.
Le visiteur est un dirigeant ou un responsable conformité qui compare des offres
à 5 000 et 10 000 € par an. La vitrine doit lui faire confiance à la méthode, puis
le mener à une démonstration.

Ce qui distingue le produit, et qui doit se voir : **une note RSE fondée sur une
preuve documentaire**, jamais sur une simple déclaration. C'est le principe n° 1
de la méthodologie.

## Le geste unique

Un spécimen du mécanisme réel, dans le héros : une pièce justificative, le
passage que l'IA en retient, et le verdict qu'il produit sur un critère.
C'est l'élément mémorable. **Tout le reste reste calme.**

## Couleurs — portée `.vitrine` uniquement

L'espace connecté garde sa palette. Le logo, piloté par les jetons, suit sans
que `Logo.jsx` soit modifié.

| Nom      | Clair     | Sombre    | Rôle                                            |
| -------- | --------- | --------- | ----------------------------------------------- |
| Encre    | `#14234B` | `#F2F4FA` | Titres, grandes plages sombres, logotype        |
| Bordeaux | `#8F1D17` | `#D4574B` | Action principale ; « action requise »          |
| Feuille  | `#067A55` | `#3FB488` | « Conforme », progression, pilier Environnement |
| Papier   | `#F4F5F1` | `#0C1530` | Fond de page                                    |
| Craie    | `#FFFFFF` | `#152042` | Surfaces                                        |
| Ardoise  | `#4A5366` | `#B7BFD0` | Texte courant                                   |

**La couleur veut dire quelque chose.** Dans un produit d'audit, vert et rouge ne
sont pas décoratifs : ils disent conforme et non conforme. Ils sont réservés à ce
sens.

## Typographie

Satoshi en titraille (choix du client), Inter en texte. Deux familles nettement
distinctes.

| Niveau   | Taille (mobile → bureau) | Graisse | Approche          |
| -------- | ------------------------ | ------- | ----------------- |
| h1       | 40 → 64 px               | 900     | -0,035 em, 1,02   |
| h2       | 30 → 44 px               | 700     | -0,025 em, 1,08   |
| h3       | 20 → 22 px               | 700     | -0,01 em          |
| Chapô    | 18 px                    | 400     | 1,6, 60 caractères |
| Texte    | 16 px                    | 400     | 1,65              |
| Libellé  | 14 px                    | 500     | casse de phrase   |

La hiérarchie passe par la taille et la graisse, pas par la couleur.

## Mise en page

Grille alignée à gauche, 1200 px de large. Les sections alternent des plages
Papier et des plages Encre, au lieu d'empiler des cartes blanches sur fond blanc.

Héros d'accueil :

```
┌──────────────────────────────────────────────────────────────┐
│  Votre démarche RSE,               ┏━━━━━━━━━━━━━━━━━━━━━━┓   │
│  notée sur vos preuves.            ┃ pièce justificative   ┃   │
│                                    ┃ ▓▓ passage retenu ──▶ ┃   │
│  une phrase, 60 caractères         ┃ Critère : verdict     ┃   │
│  [Demander une démonstration]      ┗━━━━━━━━━━━━━━━━━━━━━━┛   │
├──────────────────────────────────────────────────────────────┤
│  plage Encre : une phrase de faits, pas trois gros chiffres   │
└──────────────────────────────────────────────────────────────┘
```

Héros des pages intérieures — typographique, sans image :

```
┌──────────────────────────────────────────────────────────────┐
│  Méthodologie                          ← libellé, ardoise     │
│  Une méthode claire,                                          │
│  du cadrage au plan d'action.          ← h1, encre            │
│  chapô, 60 caractères                                         │
└──────────────────────────────────────────────────────────────┘
```

## Principes

1. **Preuve avant promesse.** Le spécimen est le seul élément audacieux.
2. **Moins de boîtes.** Listes, filets et tableaux ; des cartes seulement pour des
   objets vraiment comparables (les formules, les formats).
3. **Hiérarchie de rayons.** 4 px pour les contrôles, 12 px pour les panneaux.
   Pas un seul rayon partout.
4. **Un seul mouvement.** Le spécimen s'anime une fois au chargement. Plus
   d'apparition au défilement section par section.
5. **Mobile d'abord.** Cibles tactiles de 48 px, champs à 16 px, aucun
   téléchargement invisible.

## Relecture du plan contre les réflexes génériques

Ce que la première version du plan contenait, et ce qui a été corrigé :

| Première idée                                        | Pourquoi c'était un réflexe                          | Correction                                                  |
| ---------------------------------------------------- | ---------------------------------------------------- | ----------------------------------------------------------- |
| Héros sombre, titre blanc, capture d'écran à droite   | Le héros B2B par défaut                              | Héros clair, titre encre géant, spécimen sur sa propre plage |
| Maquette de tableau de bord                          | Montre un logiciel, pas ce qui le distingue          | Spécimen « preuve → verdict », le mécanisme réel             |
| Bande de trois grands chiffres                       | Le motif « gros nombre, petit libellé »              | Une phrase de faits                                          |
| Sur-titre en capitales espacées sur chaque section   | Le tic de page générée le plus répandu               | Libellé en casse de phrase, seulement s'il informe           |
| Un mot du titre en bordeaux                          | Accent d'un seul fragment                            | Hiérarchie par la taille                                     |
| Flèche `→` sur chaque bouton                         | Chrome de gabarit                                    | Le libellé dit l'action, sans flèche                         |
| Pastilles pastel en cinq teintes                     | Le kit de cartes SaaS                                | Une seule teinte encre, couleur réservée au sens             |
| Cartes arrondies à ombre douce partout               | Le kit de cartes SaaS                                | Cartes réservées aux objets comparables                      |
| Apparition au défilement sur chaque section          | Le mouvement par défaut                              | Un seul moment orchestré                                     |

## Ce qui change par rapport à la vitrine validée

Plusieurs choix retirés ici avaient été **validés** sur la version actuelle :
sur-titres en capitales, dernier fragment du titre en bordeaux, flèches dans les
boutons, pastilles pastel. Ils sont retirés parce que le skill les identifie
comme des tics de page générée. La vitrine actuelle reste disponible sur la
branche principale : cette refonte est une proposition à comparer, pas un
remplacement.

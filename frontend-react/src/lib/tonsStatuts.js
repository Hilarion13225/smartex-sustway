/**
 * Correspondances statut métier → ton visuel, pour les états dont la
 * convention est réellement commune à plusieurs écrans.
 *
 * Elles étaient jusqu'ici recopiées dans chaque page qui en avait besoin —
 * `TONS_CRITICITE` existait en trois exemplaires, le niveau de non-conformité
 * aussi. Chaque copie était une divergence en puissance, et l'une d'elles
 * s'était déjà produite : un référentiel archivé s'affichait en rouge dans sa
 * fiche et en gris dans la liste.
 *
 * Les tons eux-mêmes — `neutre`, `bleu`, `vert`, `ambre`, `rouge`, `violet` —
 * sont définis une seule fois, dans `components/ui.jsx`. Ce module ne fait que
 * dire quel état porte quel ton ; il n'a donc aucune dépendance, et ne peut
 * pas introduire de cycle d'imports.
 *
 * Ce qui n'est PAS ici, et pourquoi : les correspondances propres à un seul
 * écran restent déclarées près de leur usage. Les centraliser donnerait un
 * fichier fourre-tout sans rien rendre plus sûr. Et une convention
 * délibérément différente — le risque métier RG26, dont le rouge est réservé
 * au fait établi — reste locale avec sa justification.
 */

/** Criticité d'un critère (RG34). Trois écrans : évaluation, périmètre, référentiel. */
export const TONS_CRITICITE = {
  FAIBLE: 'neutre',
  MOYENNE: 'bleu',
  ELEVEE: 'ambre',
  CRITIQUE: 'rouge',
};

/**
 * Gravité d'une non-conformité (RG17).
 *
 * À ne pas confondre avec le risque métier RG26, qui emploie les mêmes noms
 * d'énumération sur une échelle plus sévère — voir `TONS_NIVEAU_RG26` dans
 * `pages/CritereEvaluation.jsx`, où ce choix est expliqué.
 */
export const TONS_NIVEAU_NON_CONFORMITE = {
  MINEURE: 'neutre',
  MODEREE: 'bleu',
  MAJEURE: 'ambre',
  CRITIQUE: 'rouge',
};

/** Avancement du traitement d'une non-conformité (RG18). */
export const TONS_STATUT_NON_CONFORMITE = {
  OUVERTE: 'rouge',
  EN_TRAITEMENT: 'ambre',
  CLOTUREE: 'vert',
};

/**
 * Statut d'une mission d'audit — les quatre valeurs de `statut_audit`.
 *
 * `ANNULE` est neutre et non rouge : une mission annulée n'est pas une
 * anomalie, elle est simplement sortie du décompte.
 */
export const TONS_STATUT_MISSION = {
  BROUILLON: 'neutre',
  EN_COURS: 'bleu',
  TERMINE: 'vert',
  ANNULE: 'neutre',
};

/**
 * Statut d'un référentiel.
 *
 * `ARCHIVE` est neutre. La fiche de référentiel le rendait en rouge alors que
 * la liste, les projets et les versions de référentiel le donnaient déjà en
 * gris : quatre usages contre un. Un référentiel archivé est un état de fin de
 * vie, pas un incident — le rouge reste réservé à ce qui appelle une action.
 */
export const TONS_STATUT_REFERENTIEL = {
  ACTIF: 'vert',
  INACTIF: 'neutre',
  SUSPENDU: 'ambre',
  ARCHIVE: 'neutre',
};

/**
 * Statut d'un projet d'audit — ton et libellé, car ces valeurs ne sont
 * affichées nulle part sous leur forme brute.
 */
export const STATUTS_PROJET = {
  BROUILLON: { ton: 'neutre', libelle: 'Brouillon' },
  EN_COURS: { ton: 'bleu', libelle: 'En cours' },
  CLOTURE: { ton: 'vert', libelle: 'Clôturé' },
  ARCHIVE: { ton: 'neutre', libelle: 'Archivé' },
};

/**
 * Priorité d'une action, corrective comme planifiée.
 *
 * Les deux domaines servent des DTO différents — une action corrective naît
 * d'un écart, une action de plan naît d'un axe validé — mais la même
 * énumération et la même convention visuelle. `plansAction.js` la réexporte
 * sous son nom historique `TON_PRIORITE`, pour ne pas rompre ses appelants.
 */
export const TONS_PRIORITE_ACTION = {
  BASSE: 'neutre',
  MOYENNE: 'bleu',
  HAUTE: 'ambre',
  CRITIQUE: 'rouge',
};

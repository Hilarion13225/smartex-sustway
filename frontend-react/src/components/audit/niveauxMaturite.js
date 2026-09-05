/**
 * Échelle de maturité en cinq niveaux proposée pour répondre à un critère.
 * Extraite du JSX pour éviter de dupliquer cinq blocs quasi identiques et
 * pour que l'ajout ou la reformulation d'un niveau reste une seule édition.
 */
export const NIVEAUX_MATURITE = [
  {
    niveau: 1,
    titre: 'Totalement réactive',
    description: 'Aucune démarche formalisée. Réagit uniquement en cas d’exigence externe ou de crise.',
  },
  {
    niveau: 2,
    titre: 'Hésitante',
    description: 'Quelques initiatives ponctuelles et informelles. Démarche non structurée.',
  },
  {
    niveau: 3,
    titre: 'Réactive',
    description: 'Des actions sont entreprises en réponse à des attentes externes ou internes.',
  },
  {
    niveau: 4,
    titre: 'Active',
    description: 'Politique formalisée et mise en œuvre de manière proactive dans l’organisation.',
  },
  {
    niveau: 5,
    titre: 'Fortement activée',
    description:
      'Politique pleinement intégrée, pilotée, évaluée et communiquée. Amélioration continue démontrée.',
  },
];

/** Extensions acceptées au dépôt de preuves. */
export const TYPES_FICHIERS_ACCEPTES = '.pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg';

/** Taille maximale d'un fichier de preuve, en octets (10 Mo). */
export const TAILLE_MAX_FICHIER = 10 * 1024 * 1024;

/**
 * Affiche une taille en octets sous une forme lisible (« 1.2 Mo »). La
 * décimale nulle est retirée : on veut « 10 Mo », pas « 10.0 Mo ».
 */
export function formaterTailleFichier(octets) {
  if (octets < 1024) return `${octets} o`;
  if (octets < 1024 * 1024) return `${(octets / 1024).toFixed(0)} Ko`;
  return `${(octets / (1024 * 1024)).toFixed(1).replace(/\.0$/, '')} Mo`;
}

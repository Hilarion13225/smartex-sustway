/**
 * États d'un critère dans une mission.
 *
 * Depuis que seule l'analyse IA produit une note, déclarer et être évalué
 * sont deux choses distinctes : une organisation peut avoir répondu à tous
 * ses critères sans qu'aucun ne porte encore de note. L'état intermédiaire
 * rend cette attente visible plutôt que de la faire passer pour un travail
 * achevé.
 */
export const STATUTS_CRITERE = {
  A_EVALUER: { libelle: 'À renseigner', ton: 'neutre' },
  DECLARE: { libelle: 'Déclaré, en attente d’analyse', ton: 'ambre' },
  EVALUE: { libelle: 'Analysé par l’IA', ton: 'vert' },
};

/** Le critère porte-t-il une note, c'est-à-dire une analyse IA ? */
export function estAnalyse(critere) {
  return critere?.statut === 'EVALUE';
}

/** L'organisation a-t-elle renseigné ce critère, analysé ou non ? */
export function estRenseigne(critere) {
  return critere?.statut === 'DECLARE' || critere?.statut === 'EVALUE';
}

/**
 * RG35 : le critère appartient-il au périmètre de la mission ? Un critère non
 * applicable ou retiré du périmètre sort du total, n'est plus saisissable et
 * n'est plus analysé — même définition que l'API (actif et applicable).
 */
export function estDansPerimetre(critere) {
  return critere?.actif !== false && critere?.applicable !== false;
}

/**
 * RG35 : état d'exclusion en toutes lettres, ou `null` pour un critère du
 * périmètre. Jamais « — », réservé à l'absence de score. `actif=false`
 * l'emporte, comme dans les rapports.
 */
export function libelleExclusion(critere) {
  if (critere?.actif === false) return 'Retiré du périmètre';
  if (critere?.applicable === false) return 'Non applicable';
  return null;
}

export function libelleStatut(statut) {
  return STATUTS_CRITERE[statut]?.libelle ?? statut;
}

export function tonStatut(statut) {
  return STATUTS_CRITERE[statut]?.ton ?? 'neutre';
}

import { api, ApiError } from './apiClient';

/**
 * Plans d'amélioration — accès API et vocabulaire partagé.
 *
 * Ce module ne concerne QUE `PlanAction` / `ActionPlan`, construits par des
 * humains à partir d'axes d'amélioration validés. Les actions correctives,
 * issues des non-conformités, vivent ailleurs et n'ont rien à faire ici :
 * mélanger les deux redonnerait l'ambiguïté que le renommage vient de lever.
 */

const base = (entrepriseId, auditId) =>
  `/api/v1/entreprises/${entrepriseId}/audits/${auditId}/plans-action`;

// === Plans ================================================================

export const listerPlans = (entrepriseId, auditId) => api.get(base(entrepriseId, auditId));

export const consulterPlan = (entrepriseId, auditId, planId) =>
  api.get(`${base(entrepriseId, auditId)}/${planId}`);

export const creerPlan = (entrepriseId, auditId, corps) =>
  api.post(base(entrepriseId, auditId), corps);

export const modifierPlan = (entrepriseId, auditId, planId, corps) =>
  api.put(`${base(entrepriseId, auditId)}/${planId}`, corps);

export const changerStatutPlan = (entrepriseId, auditId, planId, statut) =>
  api.put(`${base(entrepriseId, auditId)}/${planId}/statut`, { statut });

export const cloturerPlan = (entrepriseId, auditId, planId, motif) =>
  api.post(`${base(entrepriseId, auditId)}/${planId}/cloture`, { motif });

export const archiverPlan = (entrepriseId, auditId, planId, motif) =>
  api.post(`${base(entrepriseId, auditId)}/${planId}/archivage`, { motif: motif || null });

// === Actions ==============================================================

export const listerActions = (entrepriseId, auditId, planId) =>
  api.get(`${base(entrepriseId, auditId)}/${planId}/actions`);

export const ajouterAction = (entrepriseId, auditId, planId, corps) =>
  api.post(`${base(entrepriseId, auditId)}/${planId}/actions`, corps);

export const modifierAction = (entrepriseId, auditId, planId, actionId, corps) =>
  api.put(`${base(entrepriseId, auditId)}/${planId}/actions/${actionId}`, corps);

export const changerStatutAction = (entrepriseId, auditId, planId, actionId, statut) =>
  api.put(`${base(entrepriseId, auditId)}/${planId}/actions/${actionId}/statut`, { statut });

export const changerResponsableAction = (entrepriseId, auditId, planId, actionId, responsableId) =>
  api.put(`${base(entrepriseId, auditId)}/${planId}/actions/${actionId}/responsable`, {
    responsableId: responsableId || null,
  });

/**
 * Remplace l'ensemble des axes traités par une action.
 *
 * La liste envoyée est celle qui vaut : une liste vide détache tout. Composer
 * des ajouts et des retraits obligerait l'interface à connaître l'état courant
 * pour calculer une différence, et deux onglets ouverts en produiraient deux.
 */
export const remplacerAxesAction = (entrepriseId, auditId, planId, actionId, axeIds) =>
  api.put(`${base(entrepriseId, auditId)}/${planId}/actions/${actionId}/axes`, {
    axeIds: axeIds ?? [],
  });

/**
 * Les actions dont l'utilisateur connecté est responsable, dans cette
 * entreprise.
 *
 * Aucun identifiant n'est transmis : le serveur filtre sur l'identité du
 * jeton. Il n'y a donc rien à falsifier ici, et rien n'est trié côté client.
 */
export const listerMesActions = (entrepriseId) =>
  api.get(`/api/v1/entreprises/${entrepriseId}/mes-actions`);

/**
 * Axes rattachables à une action.
 *
 * Seuls les axes VALIDE le sont : l'API refuse les autres en 409. Filtrer ici
 * évite de proposer un choix qui serait rejeté.
 */
export const listerAxesValides = (entrepriseId, auditId) =>
  api.get(`/api/v1/entreprises/${entrepriseId}/audits/${auditId}/axes-amelioration?statut=VALIDE`);

// === Vocabulaire ==========================================================

export const STATUTS_PLAN = ['BROUILLON', 'ACTIF', 'CLOTURE', 'ARCHIVE'];

export const LIBELLE_STATUT_PLAN = {
  BROUILLON: 'Brouillon',
  ACTIF: 'Actif',
  CLOTURE: 'Clôturé',
  ARCHIVE: 'Archivé',
};

/**
 * CLOTURE et ARCHIVE gèlent tous deux le plan, et ne disent pas la même
 * chose : le premier est arrivé à son terme, le second a été retiré sans
 * l'être. Les tons les distinguent.
 */
export const TON_STATUT_PLAN = {
  BROUILLON: 'neutre',
  ACTIF: 'bleu',
  CLOTURE: 'vert',
  ARCHIVE: 'neutre',
};

export const STATUTS_ACTION = ['OUVERTE', 'EN_COURS', 'TERMINEE', 'VALIDEE'];

export const LIBELLE_STATUT_ACTION = {
  OUVERTE: 'À faire',
  EN_COURS: 'En cours',
  TERMINEE: 'Terminée',
  VALIDEE: 'Validée',
};

export const TON_STATUT_ACTION = {
  OUVERTE: 'neutre',
  EN_COURS: 'bleu',
  TERMINEE: 'ambre',
  VALIDEE: 'vert',
};

export const PRIORITES = ['BASSE', 'MOYENNE', 'HAUTE', 'CRITIQUE'];

export { TONS_PRIORITE_ACTION as TON_PRIORITE } from './tonsStatuts';

/**
 * Ce que l'exécutant d'une action peut poser lui-même.
 *
 * VALIDEE en est absent volontairement : constater qu'un travail est fait
 * revient à l'administration de la mission, et l'API refuse tout autre
 * appelant (403). Proposer le choix serait promettre ce qui sera refusé.
 */
export const STATUTS_EXECUTANT = ['OUVERTE', 'EN_COURS', 'TERMINEE'];

/**
 * Traduit une erreur d'API en message affichable.
 *
 * Les trois codes ne disent pas la même chose et n'appellent pas la même
 * réaction : 403 signale un droit manquant, 404 un objet disparu, 409 un
 * conflit d'état dont l'API explique le motif. Ce motif est repris tel quel —
 * le remplacer par un texte générique priverait l'utilisateur de la seule
 * information qui lui dit quoi faire ensuite.
 */
export function messageErreur(erreur, repli = 'Une erreur est survenue.') {
  if (!(erreur instanceof ApiError)) return repli;
  switch (erreur.statut) {
    case 403:
      return erreur.message || "Votre rôle ne permet pas cette action.";
    case 404:
      return erreur.message || "Cet élément n'existe plus, ou n'appartient pas à cette mission.";
    case 409:
      // Message métier du serveur : « plan gelé », « transition refusée »,
      // « plan sans action »…
      return erreur.message;
    default:
      return erreur.message || repli;
  }
}

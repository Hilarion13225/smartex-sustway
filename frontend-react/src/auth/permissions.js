export const ROLES = ['SUPER_ADMIN', 'ADMIN_AUDIT', 'EXPERT_REVIEWER', 'RESPONSABLE_ENTREPRISE', 'EMPLOYE', 'VISITEUR'];
export const PERMISSIONS_LIBELLE = {
  'entreprise:creer': 'Créer une entreprise',
  'entreprise:modifier': 'Modifier une entreprise',
  'audit:creer': 'Créer une mission',
  'audit:modifier': 'Modifier une mission',
  'preuve:deposer': 'Déposer des preuves',
  'revue:traiter': 'Traiter la revue experte',
  'referentiel:administrer': 'Administrer le référentiel',
  'utilisateur:administrer': 'Administrer les utilisateurs',
  'rapport:consulter': 'Consulter les rapports',
  'rapport:detaille': 'Rapport détaillé',
  'bailleur:consulter': 'Indice IFC/SFI',
  'journal:consulter': 'Journal d’audit',
  'comparaison:consulter': 'Comparer les entreprises'
};
export const ROLE_DESCRIPTION = {
  SUPER_ADMIN: 'Accès complet à la plateforme, au référentiel et aux comptes.',
  ADMIN_AUDIT: 'Pilote les missions d’audit et le suivi des entreprises clientes.',
  EXPERT_REVIEWER: 'Valide ou corrige les évaluations dont la confiance IA est insuffisante.',
  RESPONSABLE_ENTREPRISE: 'Pilote l’évaluation de son entreprise et de ses sites.',
  EMPLOYE: 'Alimente la collecte de preuves sur le périmètre qui lui est confié.',
  VISITEUR: 'Consulte la démonstration en lecture seule (formule Free).'
};
export const PERMISSIONS_PAR_ROLE = {
  SUPER_ADMIN: ['entreprise:creer', 'entreprise:modifier', 'audit:creer', 'audit:modifier', 'preuve:deposer', 'revue:traiter', 'referentiel:administrer', 'utilisateur:administrer', 'rapport:consulter', 'rapport:detaille', 'bailleur:consulter', 'journal:consulter', 'comparaison:consulter'],
  ADMIN_AUDIT: ['entreprise:creer', 'entreprise:modifier', 'audit:creer', 'audit:modifier', 'preuve:deposer', 'revue:traiter', 'rapport:consulter', 'rapport:detaille', 'bailleur:consulter', 'journal:consulter', 'comparaison:consulter'],
  EXPERT_REVIEWER: ['revue:traiter', 'rapport:consulter', 'rapport:detaille', 'bailleur:consulter', 'comparaison:consulter'],
  RESPONSABLE_ENTREPRISE: ['entreprise:modifier', 'audit:creer', 'audit:modifier', 'preuve:deposer', 'rapport:consulter', 'bailleur:consulter'],
  EMPLOYE: ['preuve:deposer', 'rapport:consulter'],
  VISITEUR: ['rapport:consulter']
};

/** Permissions retirées selon la formule souscrite (RG21, RG25, RG42). */
const RESTRICTIONS_PAR_PLAN = {
  FREE: ['entreprise:creer', 'entreprise:modifier', 'audit:creer', 'audit:modifier', 'preuve:deposer', 'revue:traiter', 'rapport:detaille', 'bailleur:consulter'],
  STANDARD: ['revue:traiter', 'rapport:detaille', 'bailleur:consulter'],
  AVANCEES: []
};
export const ROLE_LIBELLE = {
  SUPER_ADMIN: 'Administrateur global',
  ADMIN_AUDIT: 'Administrateur métier',
  EXPERT_REVIEWER: 'Expert RSE',
  RESPONSABLE_ENTREPRISE: 'Responsable entreprise',
  EMPLOYE: 'Collaborateur',
  VISITEUR: 'Visiteur (démonstration)'
};

/** Contrôle centralisé des permissions (section 4) : rôle puis formule. */
export function possedePermission(role, plan, permission) {
  const interneSmartex = role === 'SUPER_ADMIN' || role === 'ADMIN_AUDIT' || role === 'EXPERT_REVIEWER';
  if (!PERMISSIONS_PAR_ROLE[role].includes(permission)) return false;
  if (interneSmartex) return true;
  return !RESTRICTIONS_PAR_PLAN[plan].includes(permission);
}

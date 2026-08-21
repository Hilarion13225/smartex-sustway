/**
 * Modèle de permissions centralisé (section 4 du CDC) : le contrôle
 * d'accès ne se résume jamais à une seule vérification de rôle éparpillée
 * dans chaque page — il croise systématiquement le rôle ET la formule
 * souscrite par l'entreprise concernée.
 *
 * PERMISSIONS_PAR_ROLE fixe ce qu'un rôle peut faire en théorie.
 * RESTRICTIONS_PAR_PLAN retire des permissions selon la formule, mais
 * UNIQUEMENT pour les rôles côté client (RESPONSABLE_ENTREPRISE, EMPLOYE,
 * VISITEUR) — le personnel interne Smartex (SUPER_ADMIN, ADMIN_AUDIT,
 * EXPERT_REVIEWER) n'est jamais bridé par la formule d'un client : il
 * audite/administre au nom de Smartex, pas au nom de l'entreprise.
 */

/**
 * `entreprise:creer` est accordée à RESPONSABLE_ENTREPRISE — divergence
 * assumée par rapport au prototype de référence (où seul le staff Smartex
 * onboardait les clients) : ce backend fonctionne en auto-inscription,
 * n'importe quel utilisateur crée sa propre entreprise et en devient
 * responsable (RG05). Cette permission n'est volontairement pas utilisée
 * pour gater le bouton de création dans Entreprises.jsx : un utilisateur
 * qui n'a encore aucune entreprise porte le rôle transitoire
 * AUCUN_ROLE_ATTRIBUE (absent de ce modèle), et `peut()` renverrait
 * toujours faux pour lui — le gating casserait la création de la toute
 * première entreprise, précisément l'action qui établit le rôle.
 */
export const PERMISSIONS_PAR_ROLE = {
  SUPER_ADMIN: [
    'entreprise:creer',
    'entreprise:modifier',
    'audit:creer',
    'audit:modifier',
    'preuve:deposer',
    'revue:traiter',
    'referentiel:administrer',
    'rapport:consulter',
    'rapport:detaille',
    'bailleur:consulter',
  ],
  ADMIN_AUDIT: [
    'entreprise:creer',
    'entreprise:modifier',
    'audit:creer',
    'audit:modifier',
    'preuve:deposer',
    'revue:traiter',
    'rapport:consulter',
    'rapport:detaille',
    'bailleur:consulter',
  ],
  EXPERT_REVIEWER: ['revue:traiter', 'rapport:consulter', 'rapport:detaille', 'bailleur:consulter'],
  RESPONSABLE_ENTREPRISE: [
    'entreprise:creer',
    'entreprise:modifier',
    'audit:creer',
    'audit:modifier',
    'preuve:deposer',
    'rapport:consulter',
    'bailleur:consulter',
  ],
  EMPLOYE: ['preuve:deposer', 'rapport:consulter'],
  VISITEUR: ['rapport:consulter'],
};

/** Permissions retirées selon la formule souscrite — rôles côté client uniquement (RG21/RG24/RG25/RG41). */
const RESTRICTIONS_PAR_PLAN = {
  FREE: ['entreprise:creer', 'entreprise:modifier', 'audit:creer', 'audit:modifier', 'preuve:deposer', 'rapport:detaille', 'bailleur:consulter'],
  STANDARD: ['rapport:detaille', 'bailleur:consulter'],
  AVANCEES: [],
};

const ROLES_INTERNES_SMARTEX = new Set(['SUPER_ADMIN', 'ADMIN_AUDIT', 'EXPERT_REVIEWER']);

export const ROLE_LIBELLE = {
  SUPER_ADMIN: 'Administrateur global',
  ADMIN_AUDIT: 'Administrateur métier',
  EXPERT_REVIEWER: 'Expert RSE',
  RESPONSABLE_ENTREPRISE: 'Responsable entreprise',
  EMPLOYE: 'Collaborateur',
  VISITEUR: 'Visiteur (démonstration)',
};

/**
 * Contrôle centralisé : rôle puis formule (section 4). `plan` peut être
 * omis quand la permission n'est jamais soumise à restriction de formule
 * pour ce rôle (ex. referentiel:administrer, réservé à SUPER_ADMIN qui de
 * toute façon court-circuite la vérification de formule).
 */
export function possedePermission(role, plan, permission) {
  if (!role || !PERMISSIONS_PAR_ROLE[role]?.includes(permission)) return false;
  if (ROLES_INTERNES_SMARTEX.has(role)) return true;
  return !RESTRICTIONS_PAR_PLAN[plan]?.includes(permission);
}

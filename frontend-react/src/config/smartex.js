/**
 * Coordonnées et éléments d'identité de Smartex Expertises, éditeur de
 * Smartex Sustway. Centralisés ici pour être modifiables sans toucher aux
 * pages : aucun appel réseau, aucune dépendance au backend.
 */
export const SMARTEX = {
  editeur: 'Smartex Expertises',
  produit: 'SMARTEX SustWay',
  accroche: 'Évaluation RSE intelligente',
  baseline: 'Conseil, audit et outillage numérique de la performance durable.',
  email: 'contact@smartex-expertises.com',
  emailSupport: 'support@smartex-expertises.com',
  telephone: '+225 07 88 95 03 62',
  whatsapp: '+225 07 88 95 03 62',
  adresse: 'Abidjan, Côte d’Ivoire',
  horaires: 'Lundi – vendredi, 8h30 – 18h00 (GMT)',
  siteWeb: 'https://www.smartex-expertises.com',
  linkedin: 'https://www.linkedin.com/company/smartex-expertises',
};

/** Domaines d'intervention de Smartex Expertises autour de la plateforme. */
export const METIERS = [
  {
    code: 'diagnostic',
    titre: 'Diagnostic RSE',
    texte:
      'Cadrage du périmètre, collecte des preuves et évaluation des critères applicables à votre secteur d’activité.',
  },
  {
    code: 'plan-action',
    titre: 'Plan d’action priorisé',
    texte: 'Feuille de route hiérarchisée par le risque attendu, avec échéances et responsables identifiés.',
  },
  {
    code: 'financements',
    titre: 'Préparation aux financements verts',
    texte: 'Mesure de l’alignement aux standards de performance des bailleurs et préparation du dossier documentaire.',
  },
  {
    code: 'accompagnement',
    titre: 'Accompagnement et formation',
    texte: 'Montée en compétence des équipes internes sur la méthodologie, le référentiel et l’usage de la plateforme.',
  },
];

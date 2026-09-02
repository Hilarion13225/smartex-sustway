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
  mission: 'Mesurer la maturité et la performance de votre entreprise en matière de RSE et ESG.',
  promesseFinancement: 'Préparez votre éligibilité au financement durable et éthique.',
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

/**
 * Quatre principes qui fondent la méthodologie — transparence et preuves,
 * traçabilité, retours d'expérience de la recherche académique et des
 * pratiques professionnelles.
 */
export const FONDEMENTS = [
  {
    titre: 'Transparence et preuves',
    texte: 'Chaque note s’appuie sur une preuve documentaire vérifiée, jamais sur une simple déclaration.',
  },
  {
    titre: 'Traçabilité',
    texte: 'Du dépôt de la preuve au rapport final, chaque étape de l’évaluation reste consultable et explicable.',
  },
  {
    titre: 'Recherche académique',
    texte: 'La méthodologie intègre les avancées de la recherche en RSE/ESG, pas seulement les pratiques du marché.',
  },
  {
    titre: 'Pratiques professionnelles',
    texte: 'Le référentiel est régulièrement confronté aux retours d’expérience des missions d’audit et de conseil.',
  },
  {
    titre: 'Robustesse',
    texte: 'Le référentiel est régulièrement confronté aux retours d’expérience des missions d’audit et de conseil.',
  },
  {
    titre: 'Indépendance',
    texte: 'Le référentiel est régulièrement confronté aux retours d’expérience des missions d’audit et de conseil.',
  },
];

/**
 * Normes reconnues qui inspirent la méthodologie (gouvernance, santé/sécurité
 * au travail...). Ce sont des repères conceptuels, pas des référentiels
 * évaluables dans l'outil — voir REFERENTIELS_EVALUABLES pour ceux-ci.
 */
export const REFERENCES_METHODOLOGIQUES = [
  { code: 'ISO_26000', nom: 'ISO 26000', texte: 'Lignes directrices relatives à la responsabilité sociétale.' },
  { code: 'ISO_45001', nom: 'ISO 45001', texte: 'Santé et sécurité au travail.' },
];

/** Référentiels réellement chargés dans la plateforme et sélectionnables pour une évaluation. */
export const REFERENTIELS_EVALUABLES = [
  { code: 'SMARTEX_SUSTWAY', nom: `Référentiel ${SMARTEX.produit}`, texte: '87 critères en 6 parties, issus de l’étude sectorielle CGECI.' },
  { code: 'PRI', nom: 'PRI', texte: 'Principles for Responsible Investment — secteur finance.' },
  { code: 'GRESB', nom: 'GRESB', texte: 'Global Real Estate Sustainability Benchmark — secteur immobilier.' },
  { code: 'ITIE', nom: 'ITIE', texte: 'Initiative pour la Transparence dans les Industries Extractives — secteur minier.' },
  { code: 'IFC_SFI', nom: 'IFC/SFI', texte: 'Référentiel bailleur transversal, superposé aux autres pour les financements verts.' },
];

/**
 * Coordonnées et éléments d'identité de SMARTEX Expertises, éditeur de
 * Smartex Sustway. Centralisés ici pour être modifiables sans toucher aux
 * pages : aucun appel réseau, aucune dépendance au backend.
 */
export const SMARTEX = {
  editeur: 'SMARTEX Expertises',
  produit: 'SMARTEX SustWay',
  accroche: 'Évaluation RSE intelligente',
  signature: 'Évaluer. Analyser. Progresser.',
  baseline: 'Conseil, audit et outillage numérique de la performance durable.',
  mission: 'Mesurer la maturité et la performance de votre entreprise en matière de RSE et ESG.',
  promesseFinancement: 'Préparez votre éligibilité au financement durable et éthique.',
  email: 'contact@smartex-expertises.com',
  emailSupport: 'support@smartex-expertises.com',
  telephone: '+225 07 88 95 03 62',
  whatsapp: '+225 07 88 95 03 62',
  adresse: 'Abidjan, Côte d’Ivoire',
  horaires: 'Lundi – vendredi, 8h00 – 17h00 (GMT)',
  siteWeb: 'https://www.smartex-expertises.com',
  linkedin: 'https://www.linkedin.com/company/smartex-expertises',
  // Comptes annoncés dans la maquette du pied de page mais dont l'URL n'est pas
  // encore connue. Renseigner l'adresse fait apparaître l'icône ; la laisser à
  // null vaut mieux qu'un lien inventé qui mènerait sur un compte inexistant.
  youtube: null,
  x: null,
};

/**
 * Réseaux affichés dans le pied de page, dans l'ordre de la maquette. Les
 * comptes sans URL connue sont écartés plutôt que rendus inactifs : une icône
 * de marque qui ne mène nulle part se lit comme un lien cassé.
 */
export const RESEAUX_SOCIAUX = [
  { code: 'linkedin', libelle: 'LinkedIn', url: SMARTEX.linkedin },
  { code: 'youtube', libelle: 'YouTube', url: SMARTEX.youtube },
  { code: 'x', libelle: 'X', url: SMARTEX.x },
].filter((reseau) => reseau.url);

/** Domaines d'intervention de SMARTEX Expertises autour de la plateforme. */
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
    icone: 'FileCheck2',
    texte: 'Chaque note s’appuie sur une preuve documentaire vérifiée, jamais sur une simple déclaration.',
  },
  {
    titre: 'Traçabilité',
    icone: 'Route',
    texte: 'Du dépôt de la preuve au rapport final, chaque étape de l’évaluation reste consultable et explicable.',
  },
  {
    titre: 'Recherche académique',
    icone: 'GraduationCap',
    texte: 'La méthodologie intègre les avancées de la recherche en RSE/ESG, pas seulement les pratiques du marché.',
  },
  {
    titre: 'Pratiques professionnelles',
    icone: 'Briefcase',
    texte: 'Le référentiel est régulièrement confronté aux retours d’expérience des missions d’audit et de conseil.',
  },
  // Ces deux principes sont restés longtemps sans description : le texte qui
  // figurait là était la copie de celui de « Pratiques professionnelles ».
  // Les phrases ci-dessous s'appuient sur des règles que le produit applique
  // vraiment — le score est une somme pondérée (RG31), et l'évaluation ne
  // dépend pas de la mission de conseil qui l'accompagne.
  {
    titre: 'Robustesse',
    icone: 'ShieldCheck',
    texte:
      'Le score se calcule plutôt qu’il ne s’apprécie : chaque critère porte son coefficient, et la note globale n’est que la somme pondérée des notes obtenues.',
  },
  {
    titre: 'Indépendance',
    icone: 'Scale',
    texte:
      'L’évaluation et l’accompagnement restent séparés : conseiller une organisation ne change pas la façon dont ses preuves sont notées.',
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
  {
    code: 'GLOBAL_COMPACT',
    nom: 'Pacte mondial des Nations unies',
    texte: 'Dix principes couvrant notamment les droits humains, le travail, l’environnement et la lutte contre la corruption.',
  },
  {
    code: 'OIT',
    nom: 'OIT',
    texte: 'Conventions fondamentales de l’Organisation internationale du travail.',
  },
  {
    code: 'OCDE',
    nom: 'OCDE',
    texte: 'Principes directeurs à l’intention des entreprises multinationales.',
  },
];

/** Référentiels réellement chargés dans la plateforme et sélectionnables pour une évaluation. */
/*
 * Les chiffres du référentiel, relevés dans la base le jour de leur mise à
 * jour : version publiée de SMARTEX_SUSTWAY, 92 critères actifs répartis sur
 * 6 domaines. Ils étaient recopiés en toutes lettres à six endroits de la
 * vitrine ; passés à 92, cinq d'entre eux seraient restés à 87. Une seule
 * source, et la requête qui la vérifie :
 *
 *   select count(*), count(distinct domaine_id) from critere
 *    where referentiel_version_id = (version publiée de SMARTEX_SUSTWAY);
 */
export const REFERENTIEL_SMARTEX = {
  criteres: 92,
  parties: 6,
};

export const REFERENTIELS_EVALUABLES = [
  { code: 'SMARTEX_SUSTWAY', nom: `Référentiel ${SMARTEX.produit}`, texte: `${REFERENTIEL_SMARTEX.criteres} critères en ${REFERENTIEL_SMARTEX.parties} parties, issus de l’étude sectorielle CGECI.` },
  { code: 'PRI', nom: 'PRI', texte: 'Principles for Responsible Investment — secteur finance.' },
  { code: 'GRESB', nom: 'GRESB', texte: 'Global Real Estate Sustainability Benchmark — secteur immobilier.' },
  { code: 'ITIE', nom: 'ITIE', texte: 'Initiative pour la Transparence dans les Industries Extractives — secteur minier.' },
  { code: 'IFC_SFI', nom: 'IFC/SFI', texte: 'Référentiel bailleur transversal, superposé aux autres pour les financements verts.' },
];

/**
 * Index de recherche de la vitrine.
 *
 * Écrit à la main plutôt que dérivé des composants : le texte réellement utile
 * pour retrouver une page (« combien ça coûte », « RGPD », « bailleur ») ne
 * figure pas forcément dans son titre, et un index tiré du rendu ramènerait
 * surtout du bruit. Toute page publique ajoutée à App.jsx doit être ajoutée
 * ici, sinon elle reste introuvable par la recherche.
 */
export const PAGES_PUBLIQUES = [
  // --- Les cinq pages de la charte SMARTEX SustWay ---
  {
    chemin: '/',
    titre: 'Accueil',
    description: 'Structurer, piloter et optimiser votre démarche RSE, ESG et Développement Durable.',
    motsCles: ['accueil', 'sustway', 'smartex', 'plateforme', 'saas', 'rse', 'esg', 'developpement durable', 'performance durable', 'tableau de bord', 'demo', 'demonstration'],
  },
  {
    chemin: '/solution',
    titre: 'La solution',
    description: 'La démarche en cinq temps, les trois domaines couverts et ce qu’elle produit.',
    motsCles: ['solution', 'demarche', 'operationnalisation', 'diagnostiquer', 'structurer', 'piloter', 'optimiser', 'mesurer', 'livrables', 'rapport de durabilite', 'analyse d impact'],
  },
  {
    chemin: '/fonctionnalites',
    titre: 'Fonctionnalités',
    description: 'Campagnes, données et indicateurs ESG, preuves, tableaux de bord, plans d’action et reporting.',
    motsCles: ['fonctionnalites', 'outils', 'campagnes', 'evaluations', 'indicateurs', 'donnees', 'preuves', 'tracabilite', 'justificatifs', 'tableaux de bord', 'plans d action', 'reporting', 'extra-financier'],
  },
  {
    chemin: '/offres',
    titre: 'Offres',
    description: 'Essential, Business et Enterprise : trois niveaux de service selon la taille de l’organisation.',
    motsCles: ['offres', 'essential', 'business', 'enterprise', 'niveaux', 'multi-perimetre', 'multi-entites', 'multi-pays', 'api', 'support', 'consolidation'],
  },
  {
    chemin: '/ressources',
    titre: 'Ressources',
    description: 'Formations, méthodologie d’évaluation et questions fréquentes.',
    motsCles: ['ressources', 'expertise', 'articles', 'analyses', 'guides', 'documentation', 'actualites', 'faq', 'questions', 'formations'],
  },

  // --- Pages antérieures, conservées et toujours atteignables ---
  {
    chemin: '/services',
    titre: 'Services',
    description: 'La plateforme d’évaluation RSE et ESG : comment elle marche, pour qui, à quel prix.',
    motsCles: ['services', 'presentation', 'plateforme', 'diagnostic', 'audit', 'perimetre', 'rse', 'esg', 'intelligence artificielle', 'ia'],
  },
  {
    chemin: '/methodologie',
    titre: 'Méthodologie',
    description: 'La démarche en trois étapes, la roue de Deming et les standards mobilisés.',
    motsCles: ['methodologie', 'referentiel', 'criteres', 'notation', 'score', 'iso 26000', 'iso 45001', 'demarche', 'pdca', 'deming', 'global compact', 'oit', 'ocde', 'principes', 'questions', 'faq', 'aide', 'reponses'],
  },
  {
    chemin: '/formules',
    titre: 'Formules et tarifs',
    description: 'Standard, Avancées et Entreprise : ce que chaque formule ouvre, et à quel prix.',
    motsCles: ['formules', 'tarifs', 'prix', 'abonnement', 'combien', 'cout', 'standard', 'avancees', 'entreprise', 'devis'],
  },
  {
    chemin: '/contact',
    titre: 'Contact',
    description: 'Nous écrire, nous appeler, ou demander une démonstration.',
    motsCles: ['contact', 'nous ecrire', 'telephone', 'email', 'adresse', 'demonstration', 'demo', 'rendez-vous'],
  },
  {
    chemin: '/formation',
    titre: 'Se former',
    description: 'Montée en compétence des équipes sur la RSE, l’ESG et l’ISR.',
    motsCles: ['formation', 'se former', 'apprendre', 'competences', 'isr', 'sensibilisation', 'academy'],
  },
  {
    chemin: '/mentions-legales',
    titre: 'Mentions légales',
    description: 'Éditeur, propriété intellectuelle, données personnelles et cookies.',
    motsCles: ['mentions legales', 'juridique', 'confidentialite', 'cookies', 'rgpd', 'donnees personnelles', 'cgu'],
  },
];

/** Minuscules sans accents : « Méthodologie » doit se trouver en tapant « methodo ». */
export function normaliser(texte) {
  return texte
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '');
}

/**
 * Toutes les pages dont le titre, la description ou les mots-clés contiennent
 * chacun des mots saisis. Recherche conjonctive : « formation rse » ne renvoie
 * que les pages portant les deux, sinon une requête de deux mots élargirait le
 * résultat au lieu de le restreindre.
 */
export function rechercherPages(requete) {
  const mots = normaliser(requete).split(/\s+/).filter(Boolean);
  if (mots.length === 0) return [];

  return PAGES_PUBLIQUES.filter((page) => {
    const contenu = normaliser(`${page.titre} ${page.description} ${page.motsCles.join(' ')}`);
    return mots.every((mot) => contenu.includes(mot));
  });
}

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
  {
    chemin: '/accueil',
    titre: 'Accueil',
    description: 'La plateforme d’évaluation RSE et ESG, de la preuve au rapport.',
    motsCles: ['accueil', 'presentation', 'plateforme', 'rse', 'esg', 'intelligence artificielle', 'ia'],
  },
  {
    chemin: '/services',
    titre: 'Solution',
    description: 'Ce que la plateforme couvre : diagnostic, preuves, analyse, plan d’action.',
    motsCles: ['solution', 'services', 'fonctionnalites', 'diagnostic', 'audit', 'perimetre'],
  },
  {
    chemin: '/methodologie',
    titre: 'Méthodologie',
    description: 'La démarche en trois étapes, la roue de Deming et les standards mobilisés.',
    motsCles: ['methodologie', 'referentiel', 'criteres', 'notation', 'score', 'iso 26000', 'iso 45001', 'demarche', 'pdca', 'deming', 'global compact', 'oit', 'ocde', 'principes'],
  },
  {
    chemin: '/formules',
    titre: 'Formules',
    description: 'Standard, Avancées et Entreprise : ce que chaque formule ouvre.',
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
    chemin: '/avantages',
    titre: 'Bénéfices de la solution',
    description: 'Ce que l’évaluation change concrètement pour votre organisation.',
    motsCles: ['avantages', 'benefices', 'gains', 'valeur', 'pourquoi'],
  },
  {
    chemin: '/engagement',
    titre: 'Engageons-nous ensemble',
    description: 'La démarche d’accompagnement proposée par Smartex Expertises.',
    motsCles: ['engagement', 'accompagnement', 'partenariat', 'ensemble'],
  },
  {
    chemin: '/deploiement',
    titre: 'Déploiement de la solution',
    description: 'Les étapes de mise en place et la conduite du changement.',
    motsCles: ['deploiement', 'mise en place', 'installation', 'integration', 'demarrage', 'onboarding'],
  },
  {
    chemin: '/a-propos',
    titre: 'À propos',
    description: 'Smartex Expertises, éditeur de la plateforme.',
    motsCles: ['a propos', 'qui sommes-nous', 'editeur', 'entreprise', 'equipe', 'smartex expertises'],
  },
  {
    chemin: '/faq',
    titre: 'Questions fréquentes',
    description: 'Les réponses aux questions les plus posées sur la plateforme.',
    motsCles: ['faq', 'questions', 'aide', 'reponses', 'frequentes'],
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

/**
 * Éclate la description d'une formule en points de liste. Les virgules entre
 * parenthèses sont ignorées : « Pipeline IA complet (+ Risk, Recommendation),
 * revue experte » donne deux points et non trois. Une description sans
 * virgule reste simplement un point unique.
 *
 * Les descriptions viennent de la table `formule_abonnement` : les puces
 * affichées sur la page Formules sont donc la donnée réelle du produit, pas
 * une liste rédigée à la main qui divergerait au premier changement d'offre.
 */
export function pointsDescription(description) {
  if (!description) return [];
  const points = [];
  let courant = '';
  let profondeur = 0;
  for (const caractere of description) {
    if (caractere === '(') profondeur += 1;
    else if (caractere === ')') profondeur = Math.max(0, profondeur - 1);

    if (caractere === ',' && profondeur === 0) {
      points.push(courant.trim());
      courant = '';
    } else {
      courant += caractere;
    }
  }
  points.push(courant.trim());
  // Capitale à l'affichage : la description stockée enchaîne les segments après
  // une virgule, si bien que « rapport simple » ou « revue experte » arrivaient
  // en minuscule au milieu d'une liste à puces. Le texte métier n'est pas
  // touché, seule sa première lettre est mise en forme.
  return points.filter(Boolean).map((point) => point.charAt(0).toUpperCase() + point.slice(1));
}

/**
 * Accroche éditoriale par formule. Le backend ne stocke qu'un nom, un prix et
 * une description : ces sous-titres n'existent nulle part en base, ils sont
 * propres à la page commerciale.
 */
export const SOUS_TITRES = {
  FREE: 'Pour découvrir la plateforme',
  STANDARD: 'Pour les structures qui démarrent',
  AVANCEES: 'Pour les organisations en croissance',
};

/**
 * Offre sur mesure, sans équivalent dans `formule_abonnement` : elle ne mène
 * pas à l'inscription avec un code de formule, mais au formulaire de contact.
 * D'où une carte décrite ici plutôt que reçue de l'API.
 */
export const FORMULE_ENTREPRISE = {
  code: 'ENTREPRISE',
  nom: 'Entreprise',
  sousTitre: 'Pour les grandes organisations',
  mentionPrix: 'Sur devis',
  points: [
    'Solution sur mesure',
    'Multi-entités et multi-sites',
    'Intégration avec vos outils (API)',
    'Accompagnement par un expert',
    'Formation des équipes',
    'Support dédié',
  ],
};

/**
 * Comparatif. Les lignes s'appuient sur les descriptions réelles des formules
 * (pipeline IA, revue experte, rapport, indice financements verts) — voir le
 * document de cadrage et la table `formule_abonnement`. Les deux dernières
 * lignes relèvent de l'offre sur mesure et n'ont pas d'équivalent en base.
 */
export const COMPARATIF = [
  { libelle: 'Questionnaire RSE & ESG adapté au secteur', STANDARD: true, AVANCEES: true, ENTREPRISE: true },
  {
    libelle: 'Analyse IA des preuves',
    STANDARD: 'Document, Conformité, Scoring',
    AVANCEES: 'Complète (+ Risque, Recommandation)',
    ENTREPRISE: 'Sur mesure',
  },
  { libelle: 'Revue experte', STANDARD: false, AVANCEES: true, ENTREPRISE: true },
  { libelle: 'Rapport d’évaluation', STANDARD: 'Simple', AVANCEES: 'Détaillé', ENTREPRISE: 'Détaillé' },
  { libelle: 'Indice de préparation aux financements verts', STANDARD: false, AVANCEES: true, ENTREPRISE: true },
  { libelle: 'Accompagnement et formation des équipes', STANDARD: false, AVANCEES: false, ENTREPRISE: true },
  { libelle: 'Support', STANDARD: 'Par e-mail', AVANCEES: 'Par e-mail', ENTREPRISE: 'Dédié' },
];

/**
 * Questions fréquentes de la page tarifaire. Les réponses reprennent ce qui
 * est déjà affirmé ailleurs sur le site (mentions légales pour la sécurité,
 * mention « licence annuelle, renouvelable » de la grille tarifaire) — une
 * page de prix ne doit pas promettre ce que le reste du site ne dit pas.
 */
export const QUESTIONS = [
  {
    question: 'Puis-je changer de formule plus tard ?',
    reponse:
      'Oui. La formule est portée par l’abonnement de chaque entreprise : vous pouvez en changer depuis l’espace Abonnement, et les fonctionnalités correspondantes sont activées immédiatement.',
  },
  {
    question: 'Y a-t-il un engagement de durée ?',
    reponse: 'Les formules sont des licences annuelles, renouvelables. Il n’y a pas de reconduction automatique tacite.',
  },
  {
    question: 'La formation est-elle incluse ?',
    reponse:
      'La montée en compétence des équipes n’est pas comprise dans les formules Standard et Avancées : elle relève de l’accompagnement, inclus dans l’offre Entreprise et disponible séparément.',
  },
  {
    question: 'Mes données sont-elles sécurisées ?',
    reponse:
      'Les données et les documents déposés sont chiffrés au repos et en transit, et isolés par entreprise. Conformément au RGPD, vous disposez d’un droit d’accès, de rectification, d’opposition et d’effacement.',
  },
  {
    question: 'Proposez-vous des offres pour les ONG ou institutions publiques ?',
    reponse:
      'Oui, via l’offre Entreprise, établie sur devis selon le périmètre à évaluer. Décrivez-nous votre structure et vos échéances, nous vous répondons avec la démarche adaptée.',
  },
];

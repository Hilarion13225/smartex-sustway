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
 * Bénéfice mis en avant sur chaque carte, juste sous le prix. Le visiteur doit
 * pouvoir répondre à « qu'est-ce que j'y gagne ? » avant de lire la liste des
 * fonctionnalités — une carte tarifaire qui n'aligne que des puces techniques
 * laisse le choix au hasard.
 */
export const ACCROCHES = {
  STANDARD: 'Faites votre première évaluation RSE.',
  AVANCEES: 'Allez plus loin, avec nos experts à vos côtés.',
  ENTREPRISE: 'Une offre construite avec vous, pour tout votre groupe.',
};

/**
 * Ce que chaque formule contient, dit simplement.
 *
 * La description stockée dans `formule_abonnement` est écrite pour l'équipe
 * technique : « Pipeline IA basique (Document, Compliance, Scoring) » ne dit
 * rien à un dirigeant qui compare deux prix. Ces listes disent la même chose
 * en français courant, sans rien ajouter ni retirer à l'offre.
 *
 * Contrepartie assumée : la carte ne suit plus automatiquement la base. Une
 * formule dont le code n'est pas listé ici retombe sur la description stockée,
 * pour qu'une nouvelle offre ne s'affiche jamais sans contenu.
 *
 * Le support reste « par e-mail » sur Standard : l'ancienne grille annonçait
 * « dédié » partout, ce que le comparatif de la même page contredit, le
 * support dédié étant l'un des apports de l'offre Entreprise.
 */
export const POINTS_CLAIRS = {
  STANDARD: [
    'L’IA lit vos documents et note chaque critère',
    'Un rapport clair de vos résultats',
  ],
  // « Un expert vérifie vos résultats » a été retiré : le produit ne le fait
  // pas. Aucun mécanisme n'achemine un critère vers un évaluateur Smartex, et
  // la permission de valider une évaluation ne distingue pas les formules —
  // en Standard comme en Avancées, c'est le responsable de l'organisation
  // auditée qui entérine ses propres résultats (migration V72).
  AVANCEES: [
    'L’IA repère aussi vos risques et vous conseille',
    'Un rapport détaillé, domaine par domaine',
    'Votre niveau de préparation aux financements verts',
  ],
};

/** La démarche qui accompagne la plateforme, dite tout aussi simplement. */
export const METHODOLOGIE_INCLUSE = {
  STANDARD: [
    'La méthodologie SMARTEX SustWay au complet',
    'Vous évaluez votre entreprise vous-même',
    'Un plan d’action à appliquer',
    'Une équipe qui répond par e-mail',
  ],
  AVANCEES: [
    'Nos experts vous accompagnent pendant l’évaluation',
    'Des analyses poussées de vos performances',
  ],
};

/**
 * Chaque formule contient la précédente : le pipeline d'Avancées est celui de
 * Standard augmenté du risque et de la recommandation, et Entreprise reprend
 * l'ensemble. Le dire évite de répéter les mêmes puces d'une carte à l'autre.
 */
export const HERITAGE = {
  AVANCEES: 'Tout ce que contient Standard, plus :',
  ENTREPRISE: 'Tout ce que contient Avancées, plus :',
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
    'Une solution adaptée à votre organisation',
    'Plusieurs filiales et plusieurs sites',
    'Connexion à vos outils existants',
    'Un expert dédié à vos côtés',
    'La formation de vos équipes',
    'Un support rien que pour vous',
  ],
};

/**
 * Comparatif. Les lignes s'appuient sur les descriptions réelles des formules
 * (pipeline IA, rapport, indice financements verts) — voir le document de
 * cadrage et la table `formule_abonnement`. Les deux dernières lignes
 * relèvent de l'offre sur mesure et n'ont pas d'équivalent en base.
 *
 * Ces données ne sont plus affichées : la section « Les formules, ligne par
 * ligne » a été retirée de la page. Elles restent ici, prêtes à se rebrancher.
 */
export const COMPARATIF = [
  { libelle: 'Questionnaire RSE & ESG adapté au secteur', STANDARD: true, AVANCEES: true, ENTREPRISE: true },
  {
    libelle: 'Analyse IA des preuves',
    STANDARD: 'Document, Conformité, Scoring',
    AVANCEES: 'Complète (+ Risque, Recommandation)',
    ENTREPRISE: 'Sur mesure',
  },
  // La ligne « Revue experte » a été retirée avec la mention « Un expert
  // vérifie vos résultats » : le produit ne relit pas les verdicts de l'IA.
  // La permission de valider une évaluation ne distingue pas les formules, et
  // c'est le responsable de l'organisation auditée qui entérine ses propres
  // résultats, en Standard comme en Avancées (migration V72).
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
    question: 'Comment se passe le paiement ?',
    reponse:
      'En ligne, par PI-SPI ou Wave, à la fin de l’inscription. L’accès à la plateforme s’ouvre dès que le paiement est validé.',
  },
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

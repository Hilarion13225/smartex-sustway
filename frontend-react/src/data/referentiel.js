/** Secteurs d'activité issus de l'étude sectorielle CGECI (2018). */
export const SECTEURS = ['Agro-industrie', 'Banque et assurance', 'BTP et immobilier', 'Distribution et commerce', 'Énergie', 'Industrie manufacturière', 'Mines et extraction', 'Services et TIC', 'Transport et logistique'];
export const DOMAINES = [{
  id: 'd-ve',
  code: 'VE',
  libelle: 'Valeurs et éthique de l’entreprise',
  partie: 'Partie I',
  referentiel: 'SUSTWAY'
}, {
  id: 'd-gouv',
  code: 'GOUV',
  libelle: 'Gouvernance d’entreprise',
  partie: 'Partie II',
  referentiel: 'SUSTWAY'
}, {
  id: 'd-soc',
  code: 'SOC',
  libelle: 'Social et sociétal',
  partie: 'Partie III',
  referentiel: 'SUSTWAY'
}, {
  id: 'd-env',
  code: 'ENV',
  libelle: 'Environnement et atmosphère',
  partie: 'Partie IV',
  referentiel: 'SUSTWAY'
}, {
  id: 'd-eco',
  code: 'ECO',
  libelle: 'Économie et comportement sur le marché',
  partie: 'Partie V',
  referentiel: 'SUSTWAY'
}, {
  id: 'd-org',
  code: 'ORG',
  libelle: 'Prise en charge organisationnelle de la RSE',
  partie: 'Partie VI',
  referentiel: 'SUSTWAY'
}, {
  id: 'd-ifc',
  code: 'IFC',
  libelle: 'Financements verts — Performance Standards IFC/SFI',
  partie: 'Référentiel bailleur',
  referentiel: 'IFC'
}];
export const CRITICITE_POIDS = {
  FAIBLE: 1,
  MOYENNE: 2,
  ELEVEE: 3,
  CRITIQUE: 4
};
export const CRITICITE_LIBELLE = {
  FAIBLE: 'Faible',
  MOYENNE: 'Moyenne',
  ELEVEE: 'Élevée',
  CRITIQUE: 'Critique'
};
const VE = [['VE-01', 'Définir et formaliser les valeurs et règles de conduite de l’entreprise', 'MOYENNE'], ['VE-02', 'Sensibiliser les salariés aux valeurs et règles de conduite', 'MOYENNE'], ['VE-03', 'Communiquer les valeurs aux clients, partenaires et fournisseurs', 'FAIBLE']];
const GOUV = [['GOUV-01', 'Diffuser et garantir la transparence des résultats financiers et non financiers', 'ELEVEE', true], ['GOUV-02', 'Garantir le respect des droits de propriété', 'MOYENNE'], ['GOUV-03', 'Promouvoir l’actionnariat salarié', 'FAIBLE'], ['GOUV-04', 'Représentation des salariés au conseil d’administration', 'MOYENNE'], ['GOUV-05', 'Indépendance des administrateurs', 'MOYENNE'], ['GOUV-06', 'Existence de comités spécialisés de contrôle', 'MOYENNE'], ['GOUV-07', 'Connaître et formaliser une politique de lutte contre la corruption', 'ELEVEE', true], ['GOUV-08', 'Désigner un responsable de la conformité anti-corruption', 'ELEVEE'], ['GOUV-09', 'Agir contre la corruption sous toutes ses formes', 'CRITIQUE', true], ['GOUV-10', 'Système de management anti-corruption (ISO 37001)', 'ELEVEE'], ['GOUV-11', 'Conformité aux lois et règlements fiscaux', 'CRITIQUE'], ['GOUV-12', 'Politiques de protection des droits des salariés', 'ELEVEE', true], ['GOUV-13', 'Dialogue avec les parties prenantes sur les droits de l’Homme', 'MOYENNE', true], ['GOUV-14', 'Non-complicité de violations des droits de l’Homme', 'CRITIQUE', true]];
const SOC = [['SOC-01', 'Abolition du travail des enfants', 'CRITIQUE', true], ['SOC-02', 'Coopération avec les fournisseurs contre le travail des enfants', 'CRITIQUE', true], ['SOC-03', 'Respect de la durée du travail, du salaire minimum et des congés', 'CRITIQUE', true], ['SOC-04', 'Politique formalisée d’égalité des chances', 'ELEVEE'], ['SOC-05', 'Responsable de la conformité en matière d’égalité des chances', 'MOYENNE'], ['SOC-06', 'Soutien à l’emploi des personnes en situation de handicap', 'MOYENNE'], ['SOC-07', 'Élimination du travail forcé ou obligatoire', 'CRITIQUE', true], ['SOC-08', 'Audits de la main-d’œuvre forcée dans la chaîne de valeur', 'ELEVEE', true], ['SOC-09', 'Lutte contre la précarité de l’emploi', 'MOYENNE'], ['SOC-10', 'Promotion d’emplois productifs et décents', 'MOYENNE'], ['SOC-11', 'Politique formalisée de formation des collaborateurs', 'MOYENNE'], ['SOC-12', 'Responsable des programmes de formation', 'FAIBLE'], ['SOC-13', 'Normes de santé, sécurité et hygiène au travail', 'CRITIQUE', true], ['SOC-14', 'Amélioration de l’environnement de travail', 'FAIBLE'], ['SOC-15', 'Système de management santé-sécurité (ISO 45001)', 'ELEVEE', true], ['SOC-16', 'Système de management des conditions de travail (SA 8000)', 'ELEVEE'], ['SOC-17', 'Renforcement du dialogue social', 'MOYENNE'], ['SOC-18', 'Respect de la liberté d’association', 'CRITIQUE', true], ['SOC-19', 'Reconnaissance du droit de négociation collective', 'ELEVEE', true], ['SOC-20', 'Procédures de réclamations et de conciliation', 'MOYENNE', true], ['SOC-21', 'Facilitation de l’activité des représentants du personnel', 'MOYENNE'], ['SOC-22', 'Retombées positives pour les communautés locales', 'MOYENNE', true], ['SOC-23', 'Dialogue avec les communautés sur les sujets sensibles', 'MOYENNE', true], ['SOC-24', 'Soutien financier aux projets communautaires', 'FAIBLE'], ['SOC-25', 'Régularité du paiement des impôts locaux', 'ELEVEE']];
const ENV = [['ENV-01', 'Conformité aux dispositions légales environnementales', 'CRITIQUE', true], ['ENV-02', 'Système interne de management environnemental', 'ELEVEE', true], ['ENV-03', 'Sensibilisation et formation du personnel à l’environnement', 'MOYENNE'], ['ENV-04', 'Système de management environnemental certifié (ISO 14001)', 'ELEVEE', true], ['ENV-05', 'Dispositifs d’intervention sur les impacts environnementaux', 'MOYENNE', true], ['ENV-06', 'Études d’impact environnemental régulières et transparentes', 'ELEVEE', true], ['ENV-07', 'Attitude de précaution face aux défis environnementaux', 'MOYENNE'], ['ENV-08', 'Prise en compte de l’impact environnemental en conception produit', 'MOYENNE'], ['ENV-09', 'Suivi et contrôle de la consommation d’eau', 'MOYENNE', true], ['ENV-10', 'Objectifs de réduction de la consommation d’eau', 'FAIBLE'], ['ENV-11', 'Système de management de la consommation d’eau', 'FAIBLE'], ['ENV-12', 'Suivi et contrôle de la consommation d’énergie', 'MOYENNE'], ['ENV-13', 'Objectifs de réduction de la consommation d’énergie', 'FAIBLE'], ['ENV-14', 'Système de management de l’énergie (ISO 50001)', 'MOYENNE'], ['ENV-15', 'Recours aux énergies renouvelables', 'FAIBLE'], ['ENV-16', 'Suivi et contrôle des rejets atmosphériques', 'ELEVEE', true], ['ENV-17', 'Objectifs de réduction des rejets atmosphériques', 'MOYENNE'], ['ENV-18', 'Système de management des rejets atmosphériques', 'MOYENNE'], ['ENV-19', 'Suivi et contrôle des rejets liquides', 'CRITIQUE', true], ['ENV-20', 'Objectifs de réduction des rejets liquides', 'MOYENNE'], ['ENV-21', 'Système de management des rejets liquides', 'MOYENNE'], ['ENV-22', 'Suivi et contrôle des déchets solides', 'MOYENNE', true], ['ENV-23', 'Objectifs de réduction des déchets solides', 'FAIBLE'], ['ENV-24', 'Système de management des déchets solides', 'MOYENNE']];
const ECO = [['ECO-01', 'Protection des données et de la vie privée des clients', 'ELEVEE'], ['ECO-02', 'Information suffisante pour un choix éclairé des consommateurs', 'MOYENNE'], ['ECO-03', 'Sécurité et santé des consommateurs', 'CRITIQUE'], ['ECO-04', 'Qualité des biens et services comme objectif central', 'MOYENNE'], ['ECO-05', 'Promotion de la consommation responsable', 'FAIBLE'], ['ECO-06', 'Service après-vente et gestion des réclamations', 'MOYENNE'], ['ECO-07', 'Études de satisfaction clients', 'FAIBLE'], ['ECO-08', 'Système de management qualité (ISO 9001)', 'FAIBLE'], ['ECO-09', 'Respect des règles de concurrence loyale', 'ELEVEE'], ['ECO-10', 'Sensibilisation des fournisseurs aux impacts environnementaux', 'MOYENNE', true], ['ECO-11', 'Sensibilisation des fournisseurs aux impacts sociaux', 'MOYENNE', true], ['ECO-12', 'Analyse des offres en coût total / mieux-disance', 'FAIBLE'], ['ECO-13', 'Critères sociaux et environnementaux dans les achats', 'MOYENNE'], ['ECO-14', 'Politique formalisée d’achats responsables', 'ELEVEE'], ['ECO-15', 'Formation des acteurs de la supply-chain aux achats responsables', 'MOYENNE'], ['ECO-16', 'Système de management des achats (ISO 20400)', 'MOYENNE'], ['ECO-17', 'Association des fournisseurs à la politique d’achats responsables', 'FAIBLE'], ['ECO-18', 'Audits RSE des fournisseurs et sous-traitants', 'ELEVEE', true], ['ECO-19', 'Enquêtes de satisfaction fournisseurs', 'FAIBLE']];
const ORG = [['ORG-01', 'Équipe dédiée à la RSE au sein de l’entreprise', 'MOYENNE'], ['ORG-02', 'Publication d’un rapport RSE / Développement Durable annuel', 'ELEVEE', true]];

/** Critères propres au bailleur, sans équivalent dans les 87 critères Smartex (section 7.7). */
const IFC = [['IFC-01', 'Plan de gestion des risques environnementaux et sociaux formalisé (PS1)', 'CRITIQUE', true], ['IFC-02', 'Mécanisme de réclamation des communautés affectées (PS4)', 'ELEVEE', true], ['IFC-03', 'Plan d’action pour la biodiversité et les habitats naturels (PS6)', 'ELEVEE', true], ['IFC-04', 'Plan de réinstallation involontaire et compensation foncière (PS5)', 'ELEVEE', true], ['IFC-05', 'Consultation des peuples et communautés autochtones (PS7)', 'MOYENNE', true]];

/** Criticité surchargée par secteur (RG37). */
const CRITICITE_SECTORIELLE = {
  'ENV-16': {
    'Mines et extraction': 'CRITIQUE',
    Énergie: 'CRITIQUE',
    'Industrie manufacturière': 'CRITIQUE'
  },
  'ENV-19': {
    'Mines et extraction': 'CRITIQUE',
    'Agro-industrie': 'CRITIQUE'
  },
  'ENV-09': {
    'Agro-industrie': 'ELEVEE',
    'Mines et extraction': 'ELEVEE'
  },
  'SOC-13': {
    'BTP et immobilier': 'CRITIQUE',
    'Mines et extraction': 'CRITIQUE'
  },
  'ECO-01': {
    'Banque et assurance': 'CRITIQUE',
    'Services et TIC': 'CRITIQUE'
  },
  'GOUV-11': {
    'Banque et assurance': 'CRITIQUE'
  },
  'SOC-22': {
    'Mines et extraction': 'ELEVEE'
  }
};

/** Critères à applicabilité sectorielle uniquement. */
const APPLICABILITE_SECTORIELLE = {
  'ENV-08': ['Industrie manufacturière', 'Agro-industrie', 'Énergie'],
  'ENV-14': ['Industrie manufacturière', 'Énergie', 'Mines et extraction'],
  'ENV-15': ['Énergie', 'Industrie manufacturière', 'BTP et immobilier'],
  'ECO-16': ['Distribution et commerce', 'Industrie manufacturière', 'BTP et immobilier'],
  'SOC-08': ['Agro-industrie', 'Industrie manufacturière', 'Mines et extraction'],
  'GOUV-03': ['Banque et assurance', 'Services et TIC']
};
const COEF_PAR_CRITICITE = {
  FAIBLE: 1,
  MOYENNE: 2,
  ELEVEE: 3,
  CRITIQUE: 3
};
function questionsPour(code, libelle) {
  const base = libelle.toLowerCase();
  return [{
    id: `${code}-q1`,
    libelle: `Une politique ou procédure formalisée existe-t-elle pour « ${base} » ?`,
    typePreuve: 'Politique, procédure ou charte signée'
  }, {
    id: `${code}-q2`,
    libelle: 'Cette pratique est-elle déployée et suivie par un responsable identifié ?',
    typePreuve: 'Organigramme, lettre de mission, compte rendu'
  }, {
    id: `${code}-q3`,
    libelle: 'Des indicateurs de suivi sont-ils mesurés et revus au moins une fois par an ?',
    typePreuve: 'Tableau de bord, rapport annuel, registre'
  }];
}
function construire(lignes, domaineId) {
  return lignes.map(([code, libelle, criticite, bailleur]) => {
    const secteurs = APPLICABILITE_SECTORIELLE[code];
    const applicabilites = secteurs ? ['SECTORIELLE'] : ['GENERALE'];
    if (bailleur) applicabilites.push('BAILLEUR');
    return {
      id: code.toLowerCase(),
      code,
      libelle,
      domaineId,
      criticite,
      criticiteParSecteur: CRITICITE_SECTORIELLE[code],
      coefficientDefaut: COEF_PAR_CRITICITE[criticite],
      applicabilites,
      secteurs,
      bailleurIfc: Boolean(bailleur),
      questions: questionsPour(code, libelle),
      actif: true
    };
  });
}
export const CRITERES = [...construire(VE, 'd-ve'), ...construire(GOUV, 'd-gouv'), ...construire(SOC, 'd-soc'), ...construire(ENV, 'd-env'), ...construire(ECO, 'd-eco'), ...construire(ORG, 'd-org'), ...construire(IFC, 'd-ifc').map(c => ({
  ...c,
  applicabilites: ['BAILLEUR']
}))];

/** 87 critères du référentiel générique Smartex Sustway (hors référentiel bailleur). */
export const CRITERES_SUSTWAY = CRITERES.filter(c => c.domaineId !== 'd-ifc');
export const CRITERES_BAILLEUR = CRITERES.filter(c => c.bailleurIfc);
export function domaineDe(critereId) {
  const critere = CRITERES.find(c => c.id === critereId);
  return DOMAINES.find(d => d.id === critere?.domaineId) ?? DOMAINES[0];
}
export function critereParId(id) {
  return CRITERES.find(c => c.id === id);
}

/** Criticité effective d'un critère pour un secteur donné (RG37). */
export function criticiteEffective(critere, secteur) {
  if (secteur && critere.criticiteParSecteur?.[secteur]) return critere.criticiteParSecteur[secteur];
  return critere.criticite;
}

/** Composition dynamique du questionnaire selon le profil de l'entreprise (RG34). */
export function criteresApplicables(secteur, inclureBailleur) {
  return CRITERES.filter(c => {
    if (!c.actif) return false;
    if (c.domaineId === 'd-ifc') return inclureBailleur;
    if (c.applicabilites.includes('GENERALE')) return true;
    if (c.applicabilites.includes('SECTORIELLE')) return c.secteurs?.includes(secteur) ?? false;
    return false;
  });
}

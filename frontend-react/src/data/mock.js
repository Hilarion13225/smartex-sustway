import { CRITERES, criteresApplicables, critereParId, SECTEURS } from './referentiel';
import { necessiteRevueExperte, niveauEngagement, prioriteDepuisRisque, risqueAttendu } from '../lib/scoring';
/** Générateur pseudo-aléatoire déterministe : les mocks restent stables d'un rendu à l'autre. */
function graine(cle) {
  let h = 2166136261;
  for (let i = 0; i < cle.length; i += 1) {
    h ^= cle.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return () => {
    h += 0x6d2b79f5;
    let t = h;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
export const PAYS = [{
  code2: 'CI',
  code3: 'CIV',
  codeNum: '384',
  nom: 'Côte d’Ivoire'
}, {
  code2: 'SN',
  code3: 'SEN',
  codeNum: '686',
  nom: 'Sénégal'
}, {
  code2: 'BF',
  code3: 'BFA',
  codeNum: '854',
  nom: 'Burkina Faso'
}, {
  code2: 'GH',
  code3: 'GHA',
  codeNum: '288',
  nom: 'Ghana'
}, {
  code2: 'CM',
  code3: 'CMR',
  codeNum: '120',
  nom: 'Cameroun'
}, {
  code2: 'FR',
  code3: 'FRA',
  codeNum: '250',
  nom: 'France'
}, {
  code2: 'MA',
  code3: 'MAR',
  codeNum: '504',
  nom: 'Maroc'
}];
export const ENTREPRISES = [{
  id: 'ent-1',
  raisonSociale: 'Ivoire Agro Industries',
  identifiantLegal: 'CI-2011-B-4471',
  secteur: 'Agro-industrie',
  taille: 'GRANDE_ENTREPRISE',
  statut: 'PRIVEE',
  paysCodes: ['CI', 'BF', 'GH'],
  plan: 'AVANCEES',
  logoCouleur: '#128257',
  dateCreation: '2011-04-18',
  sites: [{
    id: 'site-1',
    nom: 'Siège Abidjan',
    ville: 'Abidjan',
    paysCode2: 'CI',
    effectif: 320
  }, {
    id: 'site-2',
    nom: 'Usine San Pédro',
    ville: 'San Pédro',
    paysCode2: 'CI',
    effectif: 640
  }, {
    id: 'site-3',
    nom: 'Plateforme Bobo',
    ville: 'Bobo-Dioulasso',
    paysCode2: 'BF',
    effectif: 180
  }]
}, {
  id: 'ent-2',
  raisonSociale: 'Banque Atlantique Régionale',
  identifiantLegal: 'SN-2005-A-1180',
  secteur: 'Banque et assurance',
  taille: 'GRANDE_ENTREPRISE',
  statut: 'PRIVEE',
  paysCodes: ['SN', 'CI', 'MA'],
  plan: 'AVANCEES',
  logoCouleur: '#1d4ed8',
  dateCreation: '2005-09-02',
  sites: [{
    id: 'site-4',
    nom: 'Direction générale',
    ville: 'Dakar',
    paysCode2: 'SN',
    effectif: 410
  }, {
    id: 'site-5',
    nom: 'Succursale Abidjan',
    ville: 'Abidjan',
    paysCode2: 'CI',
    effectif: 150
  }]
}, {
  id: 'ent-3',
  raisonSociale: 'Sahel Mining Corporation',
  identifiantLegal: 'BF-2014-M-0092',
  secteur: 'Mines et extraction',
  taille: 'ETI',
  statut: 'MIXTE',
  paysCodes: ['BF', 'CI'],
  plan: 'AVANCEES',
  logoCouleur: '#b45309',
  dateCreation: '2014-01-27',
  sites: [{
    id: 'site-6',
    nom: 'Site minier Kaya',
    ville: 'Kaya',
    paysCode2: 'BF',
    effectif: 880
  }, {
    id: 'site-7',
    nom: 'Bureau Ouagadougou',
    ville: 'Ouagadougou',
    paysCode2: 'BF',
    effectif: 75
  }]
}, {
  id: 'ent-4',
  raisonSociale: 'Lagune Construction',
  identifiantLegal: 'CI-2018-C-8830',
  secteur: 'BTP et immobilier',
  taille: 'PME',
  statut: 'PRIVEE',
  paysCodes: ['CI'],
  plan: 'STANDARD',
  logoCouleur: '#7c3aed',
  dateCreation: '2018-06-11',
  sites: [{
    id: 'site-8',
    nom: 'Siège Cocody',
    ville: 'Abidjan',
    paysCode2: 'CI',
    effectif: 96
  }]
}, {
  id: 'ent-5',
  raisonSociale: 'Cocoa Trade Services',
  identifiantLegal: 'CI-2016-S-2244',
  secteur: 'Distribution et commerce',
  taille: 'PME',
  statut: 'PRIVEE',
  paysCodes: ['CI', 'FR'],
  plan: 'STANDARD',
  logoCouleur: '#be123c',
  dateCreation: '2016-03-08',
  sites: [{
    id: 'site-9',
    nom: 'Entrepôt Vridi',
    ville: 'Abidjan',
    paysCode2: 'CI',
    effectif: 120
  }, {
    id: 'site-10',
    nom: 'Bureau Nantes',
    ville: 'Nantes',
    paysCode2: 'FR',
    effectif: 12
  }]
}, {
  id: 'ent-6',
  raisonSociale: 'Numerik Solutions',
  identifiantLegal: 'CM-2019-T-5561',
  secteur: 'Services et TIC',
  taille: 'PME',
  statut: 'PRIVEE',
  paysCodes: ['CM'],
  plan: 'FREE',
  logoCouleur: '#0891b2',
  dateCreation: '2019-11-22',
  sites: [{
    id: 'site-11',
    nom: 'Siège Douala',
    ville: 'Douala',
    paysCode2: 'CM',
    effectif: 48
  }]
}];
export const UTILISATEURS = [{
  id: 'u-1',
  nom: 'Awa Koné',
  email: 'awa.kone@smartex.ci',
  role: 'SUPER_ADMIN',
  plan: 'AVANCEES',
  actif: true,
  deuxFA: 'APP',
  derniereConnexion: '2025-08-18T08:12:00Z'
}, {
  id: 'u-2',
  nom: 'Marc Adjé',
  email: 'marc.adje@smartex.ci',
  role: 'ADMIN_AUDIT',
  plan: 'AVANCEES',
  actif: true,
  deuxFA: 'SMS',
  derniereConnexion: '2025-08-18T07:44:00Z'
}, {
  id: 'u-3',
  nom: 'Fatou Diallo',
  email: 'fatou.diallo@smartex.ci',
  role: 'EXPERT_REVIEWER',
  plan: 'AVANCEES',
  actif: true,
  deuxFA: 'APP',
  derniereConnexion: '2025-08-17T16:05:00Z'
}, {
  id: 'u-4',
  nom: 'Kouassi Yao',
  email: 'k.yao@ivoire-agro.ci',
  role: 'RESPONSABLE_ENTREPRISE',
  entrepriseId: 'ent-1',
  plan: 'AVANCEES',
  actif: true,
  deuxFA: 'SMS',
  derniereConnexion: '2025-08-18T09:30:00Z'
}, {
  id: 'u-5',
  nom: 'Aminata Traoré',
  email: 'a.traore@ivoire-agro.ci',
  role: 'EMPLOYE',
  entrepriseId: 'ent-1',
  plan: 'AVANCEES',
  actif: true,
  deuxFA: 'AUCUNE',
  derniereConnexion: '2025-08-16T11:20:00Z'
}, {
  id: 'u-6',
  nom: 'Serge Nguessan',
  email: 's.nguessan@lagune-construction.ci',
  role: 'RESPONSABLE_ENTREPRISE',
  entrepriseId: 'ent-4',
  plan: 'STANDARD',
  actif: true,
  deuxFA: 'AUCUNE',
  derniereConnexion: '2025-08-15T14:02:00Z'
}, {
  id: 'u-7',
  nom: 'Visiteur démonstration',
  email: 'demo@sustway.app',
  role: 'VISITEUR',
  entrepriseId: 'ent-6',
  plan: 'FREE',
  actif: true,
  deuxFA: 'AUCUNE',
  derniereConnexion: '2025-08-18T10:01:00Z'
}];
export const AUDITS = [{
  id: 'aud-1',
  reference: 'AUD-2025-001',
  entrepriseId: 'ent-1',
  referentiels: ['SUSTWAY', 'IFC'],
  siteIds: ['site-1', 'site-2', 'site-3'],
  periodeDebut: '2025-01-15',
  periodeFin: '2025-06-30',
  statut: 'REVUE_EXPERTE',
  responsable: 'Marc Adjé',
  versionReferentiel: 'v1.5'
}, {
  id: 'aud-2',
  reference: 'AUD-2025-002',
  entrepriseId: 'ent-2',
  referentiels: ['SUSTWAY', 'PRI', 'IFC'],
  siteIds: ['site-4', 'site-5'],
  periodeDebut: '2025-02-01',
  periodeFin: '2025-07-15',
  statut: 'ANALYSE_IA',
  responsable: 'Marc Adjé',
  versionReferentiel: 'v1.5'
}, {
  id: 'aud-3',
  reference: 'AUD-2025-003',
  entrepriseId: 'ent-3',
  referentiels: ['SUSTWAY', 'ITIE', 'IFC'],
  siteIds: ['site-6', 'site-7'],
  periodeDebut: '2025-03-04',
  periodeFin: '2025-08-01',
  statut: 'CLOTURE',
  responsable: 'Awa Koné',
  versionReferentiel: 'v1.4'
}, {
  id: 'aud-4',
  reference: 'AUD-2025-004',
  entrepriseId: 'ent-4',
  referentiels: ['SUSTWAY'],
  siteIds: ['site-8'],
  periodeDebut: '2025-04-10',
  periodeFin: '2025-09-30',
  statut: 'COLLECTE',
  responsable: 'Marc Adjé',
  versionReferentiel: 'v1.5'
}, {
  id: 'aud-5',
  reference: 'AUD-2025-005',
  entrepriseId: 'ent-5',
  referentiels: ['SUSTWAY'],
  siteIds: ['site-9', 'site-10'],
  periodeDebut: '2025-05-02',
  periodeFin: '2025-10-31',
  statut: 'ANALYSE_IA',
  responsable: 'Awa Koné',
  versionReferentiel: 'v1.5'
}];
const JUSTIFICATIONS_HAUTES = ['Politique formalisée, signée par la direction générale et diffusée à l’ensemble des sites ; indicateurs suivis trimestriellement.', 'Procédure documentée, responsable désigné et preuves de revue annuelle retrouvées dans les documents déposés.', 'Système de management certifié en cours de validité, avec rapport d’audit de surveillance concordant.'];
const JUSTIFICATIONS_MOYENNES = ['Pratique constatée mais partiellement formalisée : aucune procédure écrite couvrant l’ensemble des sites.', 'Responsable identifié, indicateurs présents mais non revus sur la dernière période.', 'Engagement affiché dans le rapport annuel, sans preuve opérationnelle de déploiement.'];
const JUSTIFICATIONS_BASSES = ['Aucune preuve documentaire probante n’a été retrouvée pour ce critère dans les documents déposés.', 'Les documents fournis concernent une période antérieure à celle de la mission.', 'Écart significatif entre l’engagement déclaré et les éléments factuels transmis.'];
function justification(probabilite, aleatoire) {
  const liste = probabilite >= 0.75 ? JUSTIFICATIONS_HAUTES : probabilite >= 0.45 ? JUSTIFICATIONS_MOYENNES : JUSTIFICATIONS_BASSES;
  return liste[Math.floor(aleatoire() * liste.length)];
}
function genererEvaluations(audit) {
  const entreprise = ENTREPRISES.find(e => e.id === audit.entrepriseId);
  if (!entreprise) return [];
  const inclureBailleur = audit.referentiels.includes('IFC');
  const criteres = criteresApplicables(entreprise.secteur, inclureBailleur);
  const aleatoire = graine(audit.id);
  const maturite = {
    'ent-1': 0.72,
    'ent-2': 0.81,
    'ent-3': 0.58,
    'ent-4': 0.49,
    'ent-5': 0.63,
    'ent-6': 0.4
  }[entreprise.id] ?? 0.6;
  return criteres.map((critere, index) => {
    const bruit = (aleatoire() - 0.5) * 0.55;
    const probabilite = Math.min(0.99, Math.max(0.04, maturite + bruit));
    const confianceIa = Math.min(0.99, Math.max(0.45, 0.7 + (aleatoire() - 0.35) * 0.6));
    const evaluationPartielle = {
      id: `${audit.id}-${critere.id}`,
      auditId: audit.id,
      critereId: critere.id,
      probabilite: Number(probabilite.toFixed(2)),
      confianceIa: Number(confianceIa.toFixed(2)),
      coefficient: critere.coefficientDefaut,
      justification: justification(probabilite, aleatoire),
      preuvesIds: [],
      statut: 'IA_FINALE',
      auteur: 'Pipeline IA Sustway',
      date: '2025-07-12'
    };
    if (audit.statut === 'COLLECTE' && index % 3 === 0) {
      return {
        ...evaluationPartielle,
        statut: 'NON_EVALUEE'
      };
    }
    if (necessiteRevueExperte(evaluationPartielle, entreprise.plan)) {
      const revue = audit.statut === 'CLOTURE';
      return {
        ...evaluationPartielle,
        statut: revue ? 'VALIDEE_EXPERT' : 'FILE_REVUE',
        noteExpert: revue ? niveauEngagement(probabilite) : undefined,
        auteur: revue ? 'Fatou Diallo (expert)' : evaluationPartielle.auteur
      };
    }
    return evaluationPartielle;
  });
}
export const EVALUATIONS = AUDITS.flatMap(genererEvaluations);
const NOMS_DOCUMENTS = [['Politique_RSE_2025.pdf', 'PDF'], ['Code_de_conduite_signe.pdf', 'PDF'], ['Rapport_annuel_2024.pdf', 'PDF'], ['Registre_accidents_travail.xlsx', 'XLSX'], ['Certificat_ISO_14001.pdf', 'PDF'], ['Bilan_carbone_2024.xlsx', 'XLSX'], ['Contrat_type_fournisseurs.docx', 'DOCX'], ['PV_comite_hygiene_securite.docx', 'DOCX'], ['Photo_station_traitement.jpg', 'IMAGE'], ['Plan_gestion_environnemental.pdf', 'PDF'], ['Grille_salaires_anonymisee.xlsx', 'XLSX'], ['Charte_achats_responsables.pdf', 'PDF']];
export const PREUVES = AUDITS.flatMap(audit => {
  const aleatoire = graine(`preuves-${audit.id}`);
  const evaluationsAudit = EVALUATIONS.filter(e => e.auditId === audit.id);
  return NOMS_DOCUMENTS.map(([nomFichier, type], index) => {
    const rattaches = evaluationsAudit.filter(() => aleatoire() < 0.08).slice(0, 4).map(e => e.critereId);
    return {
      id: `${audit.id}-doc-${index + 1}`,
      auditId: audit.id,
      nomFichier,
      type: type,
      tailleKo: Math.round(120 + aleatoire() * 5400),
      criteresIds: rattaches,
      deposePar: index % 3 === 0 ? 'Aminata Traoré' : 'Kouassi Yao',
      dateDepot: `2025-0${index % 6 + 3}-${String(index % 27 + 1).padStart(2, '0')}`,
      statut: audit.statut === 'COLLECTE' && index > 7 ? 'EN_ATTENTE' : 'ANALYSEE',
      scanAntivirus: 'PROPRE'
    };
  });
});
export const NON_CONFORMITES = EVALUATIONS.filter(e => e.statut !== 'NON_EVALUEE' && e.probabilite < 0.6).map(evaluation => {
  const entreprise = ENTREPRISES.find(ent => ent.id === AUDITS.find(a => a.id === evaluation.auditId)?.entrepriseId);
  const risque = risqueAttendu(evaluation, entreprise?.secteur);
  const critere = critereParId(evaluation.critereId);
  return {
    id: `nc-${evaluation.id}`,
    auditId: evaluation.auditId,
    critereId: evaluation.critereId,
    libelle: `Écart constaté sur « ${critere?.libelle ?? evaluation.critereId} »`,
    priorite: prioriteDepuisRisque(risque),
    risqueAttendu: Number(risque.toFixed(2)),
    statut: evaluation.probabilite < 0.3 ? 'OUVERTE' : 'EN_COURS',
    dateDetection: '2025-07-14'
  };
});
const RESPONSABLES = ['Kouassi Yao', 'Aminata Traoré', 'Serge Nguessan', 'Direction QHSE', 'Direction RH'];
export const ACTIONS = NON_CONFORMITES.filter((_, index) => index % 2 === 0).map((nc, index) => {
  const aleatoire = graine(`action-${nc.id}`);
  const avancement = Math.round(aleatoire() * 100);
  const statut = avancement === 100 ? 'TERMINEE' : avancement > 60 ? 'EN_COURS' : index % 5 === 0 ? 'EN_RETARD' : 'A_FAIRE';
  return {
    id: `act-${nc.id}`,
    nonConformiteId: nc.id,
    libelle: `Mettre en conformité : ${nc.libelle.replace('Écart constaté sur « ', '').replace(' »', '')}`,
    responsable: RESPONSABLES[index % RESPONSABLES.length],
    echeance: `2025-${String(index % 5 + 8).padStart(2, '0')}-${String(index % 26 + 1).padStart(2, '0')}`,
    statut,
    avancement
  };
});
export const ABONNEMENTS = ENTREPRISES.map((entreprise, index) => ({
  id: `abo-${entreprise.id}`,
  entrepriseId: entreprise.id,
  plan: entreprise.plan,
  periodicite: index % 2 === 0 ? 'ANNUELLE' : 'MENSUELLE',
  moyenPaiement: entreprise.plan === 'FREE' ? 'AUCUN' : index % 2 === 0 ? 'PI_SPI' : 'WAVE',
  montantFcfa: entreprise.plan === 'AVANCEES' ? 1_450_000 : entreprise.plan === 'STANDARD' ? 480_000 : 0,
  statut: entreprise.plan === 'FREE' ? 'EN_ATTENTE' : 'ACTIF',
  prochaineEcheance: entreprise.plan === 'FREE' ? '—' : '2026-01-31'
}));
export const JOURNAL = [{
  id: 'log-1',
  date: '2025-08-18T09:32:00Z',
  acteur: 'Kouassi Yao',
  action: 'Dépôt de preuve',
  cible: 'Bilan_carbone_2024.xlsx',
  type: 'CREATION'
}, {
  id: 'log-2',
  date: '2025-08-18T09:12:00Z',
  acteur: 'Fatou Diallo',
  action: 'Consultation document financier',
  cible: 'Rapport_annuel_2024.pdf',
  type: 'LECTURE'
}, {
  id: 'log-3',
  date: '2025-08-18T08:55:00Z',
  acteur: 'Pipeline IA Sustway',
  action: 'Exécution Scoring Agent',
  cible: 'AUD-2025-002',
  type: 'MODIFICATION'
}, {
  id: 'log-4',
  date: '2025-08-18T08:12:00Z',
  acteur: 'Awa Koné',
  action: 'Connexion (2FA application)',
  cible: 'Back-office',
  type: 'CONNEXION'
}, {
  id: 'log-5',
  date: '2025-08-17T17:40:00Z',
  acteur: 'Fatou Diallo',
  action: 'Validation de revue experte',
  cible: 'AUD-2025-003 / ENV-19',
  type: 'MODIFICATION'
}, {
  id: 'log-6',
  date: '2025-08-17T15:05:00Z',
  acteur: 'Marc Adjé',
  action: 'Modification criticité sectorielle',
  cible: 'ENV-16 / Mines et extraction',
  type: 'MODIFICATION'
}, {
  id: 'log-7',
  date: '2025-08-17T11:22:00Z',
  acteur: 'Aminata Traoré',
  action: 'Consultation grille de salaires',
  cible: 'Grille_salaires_anonymisee.xlsx',
  type: 'LECTURE'
}, {
  id: 'log-8',
  date: '2025-08-16T18:02:00Z',
  acteur: 'Serge Nguessan',
  action: 'Création de mission d’audit',
  cible: 'AUD-2025-004',
  type: 'CREATION'
}];
export const AGENTS = [{
  cle: 'document',
  nom: 'Document Agent',
  description: 'Extraction et classification du contenu des documents déposés.',
  planMinimum: 'STANDARD'
}, {
  cle: 'evidence',
  nom: 'Evidence Agent',
  description: 'Recherche des preuves pertinentes pour un critère donné.',
  planMinimum: 'STANDARD'
}, {
  cle: 'compliance',
  nom: 'Compliance Agent',
  description: 'Comparaison des preuves aux exigences du critère.',
  planMinimum: 'STANDARD'
}, {
  cle: 'risk',
  nom: 'Risk Agent',
  description: 'Détection des anomalies et signaux de risque.',
  planMinimum: 'AVANCEES'
}, {
  cle: 'scoring',
  nom: 'Scoring Agent',
  description: 'Calcul de la probabilité de conformité et de la note dérivée.',
  planMinimum: 'STANDARD'
}, {
  cle: 'recommendation',
  nom: 'Recommendation Agent',
  description: 'Pistes d’amélioration, y compris axes de mise en conformité bailleur.',
  planMinimum: 'AVANCEES'
}, {
  cle: 'reporting',
  nom: 'Reporting Agent',
  description: 'Préparation du rapport final, probabilité et indice de préparation.',
  planMinimum: 'STANDARD'
}];
export const HISTORIQUE_SCORES = Object.fromEntries(ENTREPRISES.map(entreprise => {
  const aleatoire = graine(`histo-${entreprise.id}`);
  let base = 2.4 + aleatoire() * 0.8;
  const points = ['2022 S1', '2022 S2', '2023 S1', '2023 S2', '2024 S1', '2024 S2', '2025 S1'].map(periode => {
    base = Math.min(4.8, base + aleatoire() * 0.35);
    return {
      periode,
      score: Number(base.toFixed(2))
    };
  });
  return [entreprise.id, points];
}));
export const BENCHMARK_SECTORIEL = Object.fromEntries(SECTEURS.map(secteur => {
  const aleatoire = graine(`bench-${secteur}`);
  return [secteur, Number((2.6 + aleatoire() * 1.2).toFixed(2))];
}));
export function evaluationsDeLAudit(auditId) {
  return EVALUATIONS.filter(e => e.auditId === auditId);
}
export function auditsDeLEntreprise(entrepriseId) {
  return AUDITS.filter(a => a.entrepriseId === entrepriseId);
}
export function entrepriseParId(id) {
  return ENTREPRISES.find(e => e.id === id);
}
export function auditParId(id) {
  return AUDITS.find(a => a.id === id);
}
export function dernierAuditDe(entrepriseId) {
  return auditsDeLEntreprise(entrepriseId).at(-1);
}
export const NOMBRE_CRITERES = CRITERES.length;

/**
 * Catalogue des types de référentiel connus de la plateforme.
 *
 * Les codes correspondent au type PostgreSQL `type_referentiel` (voir V29) :
 * en ajouter un ici sans l'ajouter là rendrait la création impossible. Le
 * libellé et l'organisme ne sont pas stockés en base — la table `referentiel`
 * ne porte pas de colonne organisme — ils sont donc dérivés du type.
 */
export const TYPES_REFERENTIEL = [
  { code: 'SMARTEX', libelle: 'RSE Smartex', organisme: 'SMARTEX Expertises', couleur: '#921f18', famille: 'interne' },
  { code: 'IFC_SFI', libelle: 'IFC / SFI', organisme: 'International Finance Corporation', couleur: '#2563eb', famille: 'international' },
  { code: 'ITIE', libelle: 'ITIE', organisme: 'Initiative pour la transparence', couleur: '#d97706', famille: 'extractif' },
  { code: 'GRESB', libelle: 'GRESB', organisme: 'GRESB', couleur: '#7c3aed', famille: 'immobilier' },
  { code: 'PRI', libelle: 'PRI', organisme: 'Principles for Responsible Investment', couleur: '#059669', famille: 'finance' },
  { code: 'ISO', libelle: 'ISO', organisme: 'Organisation internationale de normalisation', couleur: '#0891b2', famille: 'international' },
  { code: 'GRI', libelle: 'GRI', organisme: 'Global Reporting Initiative', couleur: '#ca8a04', famille: 'international' },
  { code: 'SASB', libelle: 'SASB', organisme: 'Sustainability Accounting Standards Board', couleur: '#4f46e5', famille: 'finance' },
  { code: 'TCFD', libelle: 'TCFD', organisme: 'Task Force on Climate-related Disclosures', couleur: '#0d9488', famille: 'environnement' },
  { code: 'CSRD', libelle: 'CSRD', organisme: 'Union européenne', couleur: '#1d4ed8', famille: 'international' },
  { code: 'ISSB', libelle: 'ISSB', organisme: 'IFRS Foundation', couleur: '#9333ea', famille: 'finance' },
  { code: 'CDP', libelle: 'CDP', organisme: 'Carbon Disclosure Project', couleur: '#16a34a', famille: 'environnement' },
  { code: 'UNGC', libelle: 'UN Global Compact', organisme: 'Nations Unies', couleur: '#0284c7', famille: 'international' },
  { code: 'AUTRE', libelle: 'Autre', organisme: '—', famille: 'interne', couleur: '#94a3b8' },
];

const PAR_CODE = new Map(TYPES_REFERENTIEL.map((type) => [type.code, type]));

/** Renvoie la description d'un type, ou un repli neutre pour un code inconnu. */
export function typeReferentiel(code) {
  return (
    PAR_CODE.get(code) ?? { code, libelle: code, organisme: '—', couleur: '#94a3b8', famille: 'interne' }
  );
}

/**
 * Familles proposées à l'exploration. Chacune regroupe des types réels : une
 * famille sans référentiel correspondant reste affichée mais annoncée vide,
 * plutôt que masquée — l'absence renseigne autant que la présence.
 */
export const FAMILLES = [
  {
    cle: 'environnement',
    libelle: 'Environnement',
    description: 'Climat, biodiversité, ressources et pollution.',
  },
  {
    cle: 'finance',
    libelle: 'Finance durable',
    description: 'Investissement responsable et risques ESG.',
  },
  {
    cle: 'immobilier',
    libelle: 'Immobilier',
    description: 'Performance durable des actifs bâtis.',
  },
  {
    cle: 'extractif',
    libelle: 'Industries extractives',
    description: 'Transparence et gouvernance des ressources.',
  },
  {
    cle: 'international',
    libelle: 'Standards internationaux',
    description: 'Cadres de reporting et normes reconnues.',
  },
  {
    cle: 'interne',
    libelle: 'Référentiels internes',
    description: 'Méthodologies propres à l’organisation.',
  },
];

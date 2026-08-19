export const FORMULES = [{
  cle: 'FREE',
  nom: 'Free',
  prixMensuel: 0,
  prixAnnuel: 0,
  accroche: 'Mode visite et démonstration, sans création ni modification de données.',
  pipeline: 'Aucun pipeline IA',
  fonctionnalites: [{
    libelle: 'Création d’entreprise / site',
    inclus: false
  }, {
    libelle: 'Création d’audit',
    inclus: false
  }, {
    libelle: 'Dépôt de preuves',
    inclus: false
  }, {
    libelle: 'Pipeline IA',
    inclus: false
  }, {
    libelle: 'Revue experte ciblée',
    inclus: false
  }, {
    libelle: 'Rapport RSE',
    inclus: false
  }, {
    libelle: 'Indice de préparation financements verts (IFC/SFI)',
    inclus: false
  }, {
    libelle: 'Support dédié',
    inclus: false
  }]
}, {
  cle: 'STANDARD',
  nom: 'Standard',
  prixMensuel: 45_000,
  prixAnnuel: 480_000,
  accroche: 'Le cycle d’audit complet avec notation automatique par intelligence artificielle.',
  pipeline: 'Pipeline IA basique — Document, Compliance, Scoring',
  fonctionnalites: [{
    libelle: 'Création d’entreprise / site',
    inclus: true
  }, {
    libelle: 'Création d’audit',
    inclus: true
  }, {
    libelle: 'Dépôt de preuves',
    inclus: true
  }, {
    libelle: 'Pipeline IA basique (Document, Compliance, Scoring)',
    inclus: true
  }, {
    libelle: 'Revue experte ciblée',
    inclus: false
  }, {
    libelle: 'Rapport RSE simple',
    inclus: true
  }, {
    libelle: 'Indice de préparation financements verts (IFC/SFI)',
    inclus: false
  }, {
    libelle: 'Support dédié',
    inclus: true
  }]
}, {
  cle: 'AVANCEES',
  nom: 'Avancées',
  prixMensuel: 135_000,
  prixAnnuel: 1_450_000,
  accroche: 'Pipeline complet, revue experte sous le seuil de confiance de 80 % et financements verts.',
  pipeline: 'Pipeline IA complet — + Risk et Recommendation',
  fonctionnalites: [{
    libelle: 'Création d’entreprise / site',
    inclus: true
  }, {
    libelle: 'Création d’audit',
    inclus: true
  }, {
    libelle: 'Dépôt de preuves',
    inclus: true
  }, {
    libelle: 'Pipeline IA complet (+ Risk, Recommendation)',
    inclus: true
  }, {
    libelle: 'Revue experte ciblée si confiance IA < 80 %',
    inclus: true
  }, {
    libelle: 'Rapport détaillé avec benchmarking sectoriel',
    inclus: true
  }, {
    libelle: 'Indice de préparation financements verts (IFC/SFI)',
    inclus: true
  }, {
    libelle: 'Support dédié avec suivi personnalisé',
    inclus: true
  }]
}];
export const PLAN_LIBELLE = {
  FREE: 'Free',
  STANDARD: 'Standard',
  AVANCEES: 'Avancées'
};
export function formuleParCle(plan) {
  return FORMULES.find(f => f.cle === plan) ?? FORMULES[0];
}

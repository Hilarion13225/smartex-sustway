import { CRITERES, DOMAINES, critereParId } from '../data/referentiel';
import { ENTREPRISES, EVALUATIONS, NON_CONFORMITES, auditsDeLEntreprise } from '../data/mock';
import { indicePreparationBailleur, niveauEngagement, risqueAttendu, scoreParDomaine, scorePondere } from './scoring';
export function syntheseAudit(audit) {
  const entreprise = ENTREPRISES.find(e => e.id === audit.entrepriseId);
  const evaluations = EVALUATIONS.filter(e => e.auditId === audit.id && e.statut !== 'NON_EVALUEE');
  const scores = scoreParDomaine(evaluations, CRITERES);
  const repartitionNiveaux = [1, 2, 3, 4, 5].map(niveau => evaluations.filter(e => (e.noteExpert ?? niveauEngagement(e.probabilite)) === niveau).length);
  const risques = evaluations.map(e => risqueAttendu(e, entreprise?.secteur));
  return {
    audit,
    evaluations,
    scoreGlobal: scorePondere(evaluations),
    scoresDomaines: DOMAINES.filter(domaine => scores[domaine.id] !== undefined).map(domaine => ({
      domaineId: domaine.id,
      libelle: domaine.libelle,
      code: domaine.code,
      score: scores[domaine.id]
    })),
    indiceBailleur: indicePreparationBailleur(evaluations),
    repartitionNiveaux,
    enFileRevue: EVALUATIONS.filter(e => e.auditId === audit.id && e.statut === 'FILE_REVUE').length,
    nonConformites: NON_CONFORMITES.filter(nc => nc.auditId === audit.id).length,
    risqueMoyen: risques.length ? risques.reduce((a, b) => a + b, 0) / risques.length : 0
  };
}
export function syntheseEntreprise(entrepriseId) {
  const audits = auditsDeLEntreprise(entrepriseId);
  const audit = audits.at(-1);
  return audit ? syntheseAudit(audit) : undefined;
}
export const PRIORITE_ORDRE = ['CRITIQUE', 'MAJEURE', 'MODEREE', 'MINEURE'];
export const PRIORITE_LIBELLE = {
  CRITIQUE: 'Critique',
  MAJEURE: 'Majeure',
  MODEREE: 'Modérée',
  MINEURE: 'Mineure'
};
export function repartitionPriorites(auditId) {
  const liste = auditId ? NON_CONFORMITES.filter(nc => nc.auditId === auditId) : NON_CONFORMITES;
  return {
    CRITIQUE: liste.filter(nc => nc.priorite === 'CRITIQUE').length,
    MAJEURE: liste.filter(nc => nc.priorite === 'MAJEURE').length,
    MODEREE: liste.filter(nc => nc.priorite === 'MODEREE').length,
    MINEURE: liste.filter(nc => nc.priorite === 'MINEURE').length
  };
}
export function libelleCritere(critereId) {
  return critereParId(critereId)?.libelle ?? critereId;
}
export function codeCritere(critereId) {
  return critereParId(critereId)?.code ?? critereId.toUpperCase();
}

import { useState } from 'react';
import { Download, FileBarChart, Leaf, Printer } from 'lucide-react';
import { AUDITS, BENCHMARK_SECTORIEL, ENTREPRISES } from '../data/mock';
import { CRITICITE_LIBELLE, criticiteEffective, critereParId } from '../data/referentiel';
import { syntheseAudit } from '../lib/analyse';
import { formaterPourcent, formaterScore, niveauEngagement, scoreEnPourcent } from '../lib/scoring';
import { exporterCsv, formaterDate, imprimerRapport } from '../lib/export';
import { Alerte, Badge, Card, CardHeader, PageTitre, Tableau } from '../components/ui';
import { COULEURS, GraphiqueBarres } from '../components/charts';
import { CRITICITE_TON, REFERENTIEL_LIBELLE, STATUT_AUDIT_LIBELLE } from '../lib/libelles';
import { useAuth } from '../auth/useAuth';
export default function Rapports() {
  const {
    peut,
    entreprise,
    planActif
  } = useAuth();
  const auditsVisibles = entreprise ? AUDITS.filter(a => a.entrepriseId === entreprise.id) : AUDITS;
  const [auditId, setAuditId] = useState(auditsVisibles.at(-1)?.id ?? '');
  const audit = AUDITS.find(a => a.id === auditId);
  const synthese = audit ? syntheseAudit(audit) : undefined;
  const entrepriseAudit = ENTREPRISES.find(e => e.id === audit?.entrepriseId);
  const detaille = peut('rapport:detaille');
  return <>
      <PageTitre icone={FileBarChart} titre="Rapports RSE" description={detaille ? 'Rapport détaillé avec benchmarking sectoriel, probabilité de conformité et indice de préparation bailleur.' : 'Rapport simple : scores, probabilités de conformité et principales non-conformités.'} actions={<>
            <select className="input w-auto" value={auditId} onChange={e => setAuditId(e.target.value)}>
              {auditsVisibles.map(option => <option key={option.id} value={option.id}>
                  {option.reference} — {ENTREPRISES.find(e => e.id === option.entrepriseId)?.raisonSociale}
                </option>)}
            </select>
            <button type="button" className="btn-secondary" disabled={!synthese} onClick={() => synthese && exporterCsv(`${synthese.audit.reference}-rapport.csv`, ['Domaine', 'Score sur 5', 'Score en %'], synthese.scoresDomaines.map(domaine => [domaine.libelle, formaterScore(domaine.score), `${scoreEnPourcent(domaine.score)} %`]))}>
              <Download className="h-4 w-4" aria-hidden />
              Export CSV
            </button>
            <button type="button" className="btn-primary" onClick={imprimerRapport}>
              <Printer className="h-4 w-4" aria-hidden />
              Rapport PDF
            </button>
          </>} />

      {planActif === 'FREE' ? <div className="mb-5">
          <Alerte ton="ambre">
            La formule Free ne donne pas accès aux rapports d’audit réels : le contenu ci-dessous est un exemple de
            démonstration.
          </Alerte>
        </div> : null}

      {synthese && entrepriseAudit ? <article className="space-y-6">
          <Card className="p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-wide text-ink-500">Rapport d’évaluation RSE</p>
                <h2 className="mt-1 text-2xl font-semibold">{entrepriseAudit.raisonSociale}</h2>
                <p className="mt-1 text-sm text-ink-500">
                  {synthese.audit.reference} · période du {formaterDate(synthese.audit.periodeDebut)} au{' '}
                  {formaterDate(synthese.audit.periodeFin)} · référentiel {synthese.audit.versionReferentiel}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {synthese.audit.referentiels.map(code => <Badge key={code} ton={code === 'IFC' ? 'vert' : 'neutre'}>
                      {REFERENTIEL_LIBELLE[code]}
                    </Badge>)}
                  <Badge ton="bleu">{STATUT_AUDIT_LIBELLE[synthese.audit.statut]}</Badge>
                </div>
              </div>
              <div className="rounded-xl bg-brand-50 px-6 py-4 text-center">
                <p className="text-xs uppercase tracking-wide text-brand-700">Score RSE global</p>
                <p className="text-4xl font-semibold text-brand-700">{formaterScore(synthese.scoreGlobal)}</p>
                <p className="text-xs text-brand-700/80">sur 5 — {scoreEnPourcent(synthese.scoreGlobal)} %</p>
              </div>
            </div>
          </Card>

          <Card>
            <CardHeader titre="Scores par domaine" sousTitre={detaille ? `Comparaison avec la moyenne du secteur ${entrepriseAudit.secteur}` : undefined} />
            <div className="h-80 p-5">
              <GraphiqueBarres max={5} labels={synthese.scoresDomaines.map(domaine => domaine.code)} series={[{
            label: 'Score du domaine',
            data: synthese.scoresDomaines.map(domaine => Number(domaine.score.toFixed(2))),
            couleur: COULEURS.brand
          }, ...(detaille ? [{
            label: 'Moyenne sectorielle',
            data: synthese.scoresDomaines.map(() => BENCHMARK_SECTORIEL[entrepriseAudit.secteur]),
            couleur: COULEURS.gris
          }] : [])]} />
            </div>
          </Card>

          <Card>
            <CardHeader titre="Détail des critères" sousTitre="La probabilité de conformité est affichée dans le rapport client, quelle que soit la formule." />
            <Tableau entetes={['Code', 'Critère', 'Probabilité', 'Niveau', 'Coefficient', 'Note obtenue', 'Criticité']}>
              {synthese.evaluations.slice(0, 30).map(evaluation => {
            const critere = critereParId(evaluation.critereId);
            const niveau = evaluation.noteExpert ?? niveauEngagement(evaluation.probabilite);
            const criticite = criticiteEffective(critere, entrepriseAudit.secteur);
            return <tr key={evaluation.id}>
                    <td className="td font-medium">{critere.code}</td>
                    <td className="td">{critere.libelle}</td>
                    <td className="td">{formaterPourcent(evaluation.probabilite)}</td>
                    <td className="td">{niveau}</td>
                    <td className="td">{evaluation.coefficient}</td>
                    <td className="td font-semibold">{niveau * evaluation.coefficient}</td>
                    <td className="td">
                      <Badge ton={CRITICITE_TON[criticite]}>{CRITICITE_LIBELLE[criticite]}</Badge>
                    </td>
                  </tr>;
          })}
            </Tableau>
          </Card>

          {detaille && synthese.audit.referentiels.includes('IFC') ? <Card className="p-6">
              <h3 className="flex items-center gap-2 text-sm font-semibold">
                <Leaf className="h-4 w-4 text-brand-600" aria-hidden />
                Indice de préparation aux financements verts (IFC/SFI)
              </h3>
              <p className="mt-2 text-3xl font-semibold text-brand-700">{formaterScore(synthese.indiceBailleur)} / 5</p>
              <p className="mt-2 max-w-3xl text-sm text-ink-600">
                Cet indice mesure l’alignement de l’entreprise aux Performance Standards du bailleur pilote. Il s’agit
                d’une mesure d’alignement et non d’une garantie d’éligibilité au financement : la décision finale
                appartient au seul bailleur.
              </p>
            </Card> : null}
        </article> : <Alerte ton="ambre">Sélectionnez une mission d’audit pour générer le rapport.</Alerte>}
    </>;
}

import { useState } from 'react';
import { Download, Filter, TriangleAlert } from 'lucide-react';
import { AUDITS, ENTREPRISES, NON_CONFORMITES } from '../data/mock';
import { CRITICITE_LIBELLE, criticiteEffective, critereParId } from '../data/referentiel';
import { PRIORITE_LIBELLE, PRIORITE_ORDRE, repartitionPriorites } from '../lib/analyse';
import { exporterCsv, formaterDate } from '../lib/export';
import { Badge, Card, CardHeader, PageTitre, StatCard, Tableau } from '../components/ui';
import { COULEURS, GraphiqueBarres } from '../components/charts';
import { CRITICITE_TON, PRIORITE_TON } from '../lib/libelles';
import { useAuth } from '../auth/useAuth';
export default function NonConformites() {
  const {
    entreprise
  } = useAuth();
  const [priorite, setPriorite] = useState('toutes');
  const auditsVisibles = entreprise ? AUDITS.filter(a => a.entrepriseId === entreprise.id) : AUDITS;
  const identifiants = new Set(auditsVisibles.map(a => a.id));
  const base = NON_CONFORMITES.filter(nc => identifiants.has(nc.auditId));
  const liste = base.filter(nc => priorite === 'toutes' || nc.priorite === priorite).sort((a, b) => b.risqueAttendu - a.risqueAttendu);
  const repartition = repartitionPriorites();
  return <>
      <PageTitre icone={TriangleAlert} titre="Non-conformités" description="La priorité est calculée automatiquement à partir du risque attendu : (1 − probabilité de conformité) × poids de la criticité du critère." actions={<button type="button" className="btn-secondary" onClick={() => exporterCsv('non-conformites.csv', ['Mission', 'Entreprise', 'Code critère', 'Non-conformité', 'Priorité', 'Risque attendu', 'Statut', 'Détection'], liste.map(nc => {
      const audit = AUDITS.find(a => a.id === nc.auditId);
      return [audit?.reference ?? '', ENTREPRISES.find(e => e.id === audit?.entrepriseId)?.raisonSociale ?? '', critereParId(nc.critereId)?.code ?? '', nc.libelle, PRIORITE_LIBELLE[nc.priorite], nc.risqueAttendu, nc.statut, nc.dateDetection];
    }))}>
            <Download className="h-4 w-4" aria-hidden />
            Export CSV
          </button>} />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {PRIORITE_ORDRE.map(niveau => <StatCard key={niveau} icone={TriangleAlert} ton={PRIORITE_TON[niveau]} libelle={`Priorité ${PRIORITE_LIBELLE[niveau].toLowerCase()}`} valeur={String(repartition[niveau])} />)}
      </div>

      <Card className="mt-6">
        <CardHeader titre="Répartition par domaine" icone={Filter} />
        <div className="h-72 p-5">
          <GraphiqueBarres labels={['VE', 'GOUV', 'SOC', 'ENV', 'ECO', 'ORG', 'IFC']} series={PRIORITE_ORDRE.map((niveau, index) => ({
          label: PRIORITE_LIBELLE[niveau],
          data: ['VE', 'GOUV', 'SOC', 'ENV', 'ECO', 'ORG', 'IFC'].map(code => base.filter(nc => nc.priorite === niveau && (critereParId(nc.critereId)?.code ?? '').startsWith(code)).length),
          couleur: [COULEURS.rouge, COULEURS.ambre, '#eab308', COULEURS.gris][index]
        }))} />
        </div>
      </Card>

      <div className="my-5 flex flex-wrap items-center gap-2">
        <span className="text-xs uppercase tracking-wide text-ink-500">Filtrer par priorité</span>
        <button type="button" className={priorite === 'toutes' ? 'btn-primary py-1.5' : 'btn-secondary py-1.5'} onClick={() => setPriorite('toutes')}>
          Toutes
        </button>
        {PRIORITE_ORDRE.map(niveau => <button key={niveau} type="button" className={priorite === niveau ? 'btn-primary py-1.5' : 'btn-secondary py-1.5'} onClick={() => setPriorite(niveau)}>
            {PRIORITE_LIBELLE[niveau]}
          </button>)}
      </div>

      <Card>
        <Tableau entetes={['Mission', 'Critère', 'Non-conformité', 'Criticité', 'Risque', 'Priorité', 'Statut', 'Détection']}>
          {liste.slice(0, 40).map(nc => {
          const audit = AUDITS.find(a => a.id === nc.auditId);
          const entrepriseNc = ENTREPRISES.find(e => e.id === audit?.entrepriseId);
          const critere = critereParId(nc.critereId);
          const criticite = criticiteEffective(critere, entrepriseNc?.secteur);
          return <tr key={nc.id}>
                <td className="td whitespace-nowrap">
                  {audit?.reference}
                  <p className="text-xs text-ink-400">{entrepriseNc?.raisonSociale}</p>
                </td>
                <td className="td font-medium">{critere.code}</td>
                <td className="td">{nc.libelle}</td>
                <td className="td">
                  <Badge ton={CRITICITE_TON[criticite]}>{CRITICITE_LIBELLE[criticite]}</Badge>
                </td>
                <td className="td">{nc.risqueAttendu.toFixed(2)}</td>
                <td className="td">
                  <Badge ton={PRIORITE_TON[nc.priorite]}>{PRIORITE_LIBELLE[nc.priorite]}</Badge>
                </td>
                <td className="td">{nc.statut === 'OUVERTE' ? 'Ouverte' : nc.statut === 'EN_COURS' ? 'En cours' : 'Résolue'}</td>
                <td className="td whitespace-nowrap">{formaterDate(nc.dateDetection)}</td>
              </tr>;
        })}
        </Tableau>
      </Card>
    </>;
}

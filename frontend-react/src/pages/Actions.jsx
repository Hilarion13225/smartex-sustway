import { CalendarClock, Download, ListChecks, UserRound } from 'lucide-react';
import { ACTIONS, AUDITS, ENTREPRISES, NON_CONFORMITES } from '../data/mock';
import { critereParId } from '../data/referentiel';
import { PRIORITE_LIBELLE } from '../lib/analyse';
import { exporterCsv, formaterDate } from '../lib/export';
import { Badge, Barre, Card, CardHeader, PageTitre, StatCard, Tableau } from '../components/ui';
import { COULEURS, GraphiqueAnneau } from '../components/charts';
import { PRIORITE_TON, STATUT_ACTION_LIBELLE, STATUT_ACTION_TON } from '../lib/libelles';
import { useAuth } from '../auth/useAuth';
export default function Actions() {
  const {
    entreprise
  } = useAuth();
  const auditsVisibles = entreprise ? AUDITS.filter(a => a.entrepriseId === entreprise.id) : AUDITS;
  const identifiants = new Set(auditsVisibles.map(a => a.id));
  const liste = ACTIONS.filter(action => {
    const nc = NON_CONFORMITES.find(item => item.id === action.nonConformiteId);
    return nc ? identifiants.has(nc.auditId) : false;
  });
  const parStatut = {
    A_FAIRE: liste.filter(a => a.statut === 'A_FAIRE').length,
    EN_COURS: liste.filter(a => a.statut === 'EN_COURS').length,
    TERMINEE: liste.filter(a => a.statut === 'TERMINEE').length,
    EN_RETARD: liste.filter(a => a.statut === 'EN_RETARD').length
  };
  return <>
      <PageTitre icone={ListChecks} titre="Plans d’actions correctives" description="Chaque non-conformité peut donner lieu à plusieurs actions correctives, avec responsable, échéance et statut." actions={<button type="button" className="btn-secondary" onClick={() => exporterCsv('plan-actions.csv', ['Action', 'Non-conformité', 'Priorité', 'Responsable', 'Échéance', 'Statut', 'Avancement'], liste.map(action => {
      const nc = NON_CONFORMITES.find(item => item.id === action.nonConformiteId);
      return [action.libelle, nc?.libelle ?? '', nc ? PRIORITE_LIBELLE[nc.priorite] : '', action.responsable, action.echeance, STATUT_ACTION_LIBELLE[action.statut], `${action.avancement} %`];
    }))}>
            <Download className="h-4 w-4" aria-hidden />
            Export CSV
          </button>} />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icone={ListChecks} libelle="À faire" valeur={String(parStatut.A_FAIRE)} />
        <StatCard icone={ListChecks} ton="bleu" libelle="En cours" valeur={String(parStatut.EN_COURS)} />
        <StatCard icone={ListChecks} ton="vert" libelle="Terminées" valeur={String(parStatut.TERMINEE)} />
        <StatCard icone={CalendarClock} ton="rouge" libelle="En retard" valeur={String(parStatut.EN_RETARD)} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader titre="Avancement du plan" icone={ListChecks} />
          <div className="h-64 p-5">
            <GraphiqueAnneau labels={['À faire', 'En cours', 'Terminées', 'En retard']} data={[parStatut.A_FAIRE, parStatut.EN_COURS, parStatut.TERMINEE, parStatut.EN_RETARD]} couleurs={[COULEURS.gris, COULEURS.bleu, COULEURS.brand, COULEURS.rouge]} />
          </div>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader titre="Actions correctives" icone={UserRound} sousTitre="Triées par priorité de la non-conformité rattachée" />
          <Tableau entetes={['Action', 'Critère', 'Priorité', 'Responsable', 'Échéance', 'Avancement', 'Statut']}>
            {liste.slice().sort((a, b) => {
            const ncA = NON_CONFORMITES.find(item => item.id === a.nonConformiteId);
            const ncB = NON_CONFORMITES.find(item => item.id === b.nonConformiteId);
            return (ncB?.risqueAttendu ?? 0) - (ncA?.risqueAttendu ?? 0);
          }).slice(0, 25).map(action => {
            const nc = NON_CONFORMITES.find(item => item.id === action.nonConformiteId);
            const critere = nc ? critereParId(nc.critereId) : undefined;
            const audit = AUDITS.find(a => a.id === nc?.auditId);
            return <tr key={action.id}>
                    <td className="td">
                      {action.libelle}
                      <p className="text-xs text-ink-400">
                        {audit?.reference} — {ENTREPRISES.find(e => e.id === audit?.entrepriseId)?.raisonSociale}
                      </p>
                    </td>
                    <td className="td font-medium">{critere?.code}</td>
                    <td className="td">
                      {nc ? <Badge ton={PRIORITE_TON[nc.priorite]}>{PRIORITE_LIBELLE[nc.priorite]}</Badge> : null}
                    </td>
                    <td className="td whitespace-nowrap">{action.responsable}</td>
                    <td className="td whitespace-nowrap">{formaterDate(action.echeance)}</td>
                    <td className="td w-40">
                      <div className="flex items-center gap-2">
                        <Barre valeur={action.avancement} ton={action.statut === 'EN_RETARD' ? 'rouge' : 'brand'} />
                        <span className="w-10 shrink-0 text-xs">{action.avancement} %</span>
                      </div>
                    </td>
                    <td className="td">
                      <Badge ton={STATUT_ACTION_TON[action.statut]}>{STATUT_ACTION_LIBELLE[action.statut]}</Badge>
                    </td>
                  </tr>;
          })}
          </Tableau>
        </Card>
      </div>
    </>;
}

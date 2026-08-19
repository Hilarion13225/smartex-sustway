import { Link } from 'react-router-dom';
import { CalendarRange, ClipboardCheck, Download, Plus } from 'lucide-react';
import { AUDITS, ENTREPRISES } from '../data/mock';
import { syntheseAudit } from '../lib/analyse';
import { formaterScore } from '../lib/scoring';
import { exporterCsv, formaterDate } from '../lib/export';
import { Badge, Card, PageTitre, Tableau } from '../components/ui';
import { REFERENTIEL_LIBELLE, STATUT_AUDIT_LIBELLE } from '../lib/libelles';
import { useAuth } from '../auth/useAuth';
export default function Audits() {
  const {
    peut,
    entreprise
  } = useAuth();
  const liste = entreprise ? AUDITS.filter(audit => audit.entrepriseId === entreprise.id) : AUDITS;
  return <>
      <PageTitre icone={ClipboardCheck} titre="Missions d’audit" description="Une mission concerne une entreprise, un ou plusieurs référentiels et un ou plusieurs sites, sur une période définie." actions={<>
            <button type="button" className="btn-secondary" onClick={() => exporterCsv('missions-audit.csv', ['Référence', 'Entreprise', 'Référentiels', 'Période', 'Statut', 'Score global', 'Non-conformités'], liste.map(audit => {
        const synthese = syntheseAudit(audit);
        return [audit.reference, ENTREPRISES.find(e => e.id === audit.entrepriseId)?.raisonSociale ?? '', audit.referentiels.join(' / '), `${audit.periodeDebut} → ${audit.periodeFin}`, STATUT_AUDIT_LIBELLE[audit.statut], formaterScore(synthese.scoreGlobal), synthese.nonConformites];
      }))}>
              <Download className="h-4 w-4" aria-hidden />
              Export CSV
            </button>
            <button type="button" className="btn-primary" disabled={!peut('audit:creer')}>
              <Plus className="h-4 w-4" aria-hidden />
              Nouvelle mission
            </button>
          </>} />

      <Card>
        <Tableau entetes={['Référence', 'Entreprise', 'Référentiels', 'Période', 'Statut', 'Critères', 'Score', 'Revue']}>
          {liste.map(audit => {
          const synthese = syntheseAudit(audit);
          const entrepriseAudit = ENTREPRISES.find(e => e.id === audit.entrepriseId);
          return <tr key={audit.id} className="hover:bg-ink-50">
                <td className="td font-medium">
                  <Link to={`/app/audits/${audit.id}`} className="text-brand-700 hover:underline">
                    {audit.reference}
                  </Link>
                  <p className="text-xs font-normal text-ink-400">Référentiel {audit.versionReferentiel}</p>
                </td>
                <td className="td">{entrepriseAudit?.raisonSociale}</td>
                <td className="td">
                  <div className="flex flex-wrap gap-1">
                    {audit.referentiels.map(code => <Badge key={code} ton={code === 'IFC' ? 'vert' : 'neutre'}>
                        {REFERENTIEL_LIBELLE[code]}
                      </Badge>)}
                  </div>
                </td>
                <td className="td whitespace-nowrap">
                  <span className="inline-flex items-center gap-1 text-xs">
                    <CalendarRange className="h-3.5 w-3.5 text-ink-400" aria-hidden />
                    {formaterDate(audit.periodeDebut)} → {formaterDate(audit.periodeFin)}
                  </span>
                </td>
                <td className="td">
                  <Badge ton={audit.statut === 'CLOTURE' ? 'vert' : audit.statut === 'REVUE_EXPERTE' ? 'ambre' : 'bleu'}>
                    {STATUT_AUDIT_LIBELLE[audit.statut]}
                  </Badge>
                </td>
                <td className="td">{synthese.evaluations.length}</td>
                <td className="td font-semibold">{formaterScore(synthese.scoreGlobal)}</td>
                <td className="td">{synthese.enFileRevue}</td>
              </tr>;
        })}
        </Tableau>
      </Card>
    </>;
}

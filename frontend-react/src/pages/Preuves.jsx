import { useState } from 'react';
import { FileCheck2, FileStack, FileUp, Lock, ScanLine, Search } from 'lucide-react';
import { AUDITS, ENTREPRISES, PREUVES } from '../data/mock';
import { critereParId } from '../data/referentiel';
import { formaterDate } from '../lib/export';
import { Alerte, Badge, Card, CardHeader, PageTitre, StatCard, Tableau } from '../components/ui';
import { useAuth } from '../auth/useAuth';
export default function Preuves() {
  const {
    peut,
    entreprise
  } = useAuth();
  const [recherche, setRecherche] = useState('');
  const [depots, setDepots] = useState([]);
  const auditsVisibles = entreprise ? AUDITS.filter(a => a.entrepriseId === entreprise.id) : AUDITS;
  const identifiants = new Set(auditsVisibles.map(a => a.id));
  const liste = [...depots, ...PREUVES].filter(preuve => identifiants.has(preuve.auditId)).filter(preuve => preuve.nomFichier.toLowerCase().includes(recherche.toLowerCase()));
  const deposer = () => {
    const audit = auditsVisibles.at(-1);
    if (!audit) return;
    const numero = depots.length + 1;
    setDepots([{
      id: `depot-${numero}`,
      auditId: audit.id,
      nomFichier: `Nouvelle_preuve_${numero}.pdf`,
      type: 'PDF',
      tailleKo: 640 + numero * 37,
      criteresIds: [],
      deposePar: 'Vous',
      dateDepot: new Date().toISOString().slice(0, 10),
      statut: 'EN_ATTENTE',
      scanAntivirus: 'EN_COURS'
    }, ...depots]);
  };
  return <>
      <PageTitre icone={FileStack} titre="Collecte de preuves" description="Les documents déposés alimentent le pipeline IA : un même document peut servir à plusieurs critères." actions={<button type="button" className="btn-primary" disabled={!peut('preuve:deposer')} onClick={deposer}>
            <FileUp className="h-4 w-4" aria-hidden />
            Déposer un document
          </button>} />

      {!peut('preuve:deposer') ? <div className="mb-5">
          <Alerte ton="ambre">
            Le dépôt de preuves est verrouillé pour votre formule ou votre rôle : la consultation reste possible.
          </Alerte>
        </div> : null}

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard icone={FileStack} ton="bleu" libelle="Documents déposés" valeur={String(liste.length)} />
        <StatCard icone={FileCheck2} ton="vert" libelle="Analysés" valeur={String(liste.filter(p => p.statut === 'ANALYSEE').length)} />
        <StatCard icone={ScanLine} ton="ambre" libelle="Scan antivirus en cours" valeur={String(liste.filter(p => p.scanAntivirus === 'EN_COURS').length)} />
      </div>

      <div className="my-5 flex max-w-md items-center gap-2 rounded-lg border border-ink-200 bg-white px-3">
        <Search className="h-4 w-4 text-ink-400" aria-hidden />
        <input className="w-full border-0 py-2 text-sm outline-none" placeholder="Rechercher un document" value={recherche} onChange={e => setRecherche(e.target.value)} />
      </div>

      <Card>
        <CardHeader titre="Documents de la mission" icone={Lock} sousTitre="Types de fichiers restreints (PDF, DOCX, XLSX, images) et scan antivirus systématique à l’upload." />
        <Tableau entetes={['Document', 'Mission', 'Entreprise', 'Type', 'Critères couverts', 'Déposé par', 'Date', 'Antivirus', 'Statut']}>
          {liste.map(preuve => {
          const audit = AUDITS.find(a => a.id === preuve.auditId);
          const entrepriseDoc = ENTREPRISES.find(e => e.id === audit?.entrepriseId);
          return <tr key={preuve.id}>
                <td className="td font-medium">{preuve.nomFichier}</td>
                <td className="td">{audit?.reference}</td>
                <td className="td">{entrepriseDoc?.raisonSociale}</td>
                <td className="td">{preuve.type}</td>
                <td className="td">
                  <div className="flex flex-wrap gap-1">
                    {preuve.criteresIds.length === 0 ? <span className="text-xs text-ink-400">À rattacher</span> : preuve.criteresIds.map(id => <Badge key={id}>{critereParId(id)?.code ?? id}</Badge>)}
                  </div>
                </td>
                <td className="td">{preuve.deposePar}</td>
                <td className="td">{formaterDate(preuve.dateDepot)}</td>
                <td className="td">
                  <Badge ton={preuve.scanAntivirus === 'PROPRE' ? 'vert' : 'ambre'}>
                    {preuve.scanAntivirus === 'PROPRE' ? 'Propre' : 'En cours'}
                  </Badge>
                </td>
                <td className="td">
                  <Badge ton={preuve.statut === 'ANALYSEE' ? 'vert' : 'ambre'}>
                    {preuve.statut === 'ANALYSEE' ? 'Analysée' : 'En attente'}
                  </Badge>
                </td>
              </tr>;
        })}
        </Tableau>
      </Card>
    </>;
}

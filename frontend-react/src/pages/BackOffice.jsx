import { useState } from 'react';
import { BarChart3, Download, Layers, Plus, Search, SlidersHorizontal } from 'lucide-react';
import { CRITERES, CRITICITE_LIBELLE, DOMAINES, SECTEURS, criteresApplicables } from '../data/referentiel';
import { exporterCsv } from '../lib/export';
import { Alerte, Badge, Card, CardHeader, PageTitre, StatCard, Tableau } from '../components/ui';
import { APPLICABILITE_LIBELLE, CRITICITE_TON, REFERENTIEL_LIBELLE } from '../lib/libelles';
export default function BackOffice() {
  const [recherche, setRecherche] = useState('');
  const [domaineFiltre, setDomaineFiltre] = useState('tous');
  const [secteurApercu, setSecteurApercu] = useState(SECTEURS[0]);
  const [criticites, setCriticites] = useState({});
  const [desactives, setDesactives] = useState([]);
  const liste = CRITERES.filter(critere => {
    if (domaineFiltre !== 'tous' && critere.domaineId !== domaineFiltre) return false;
    return `${critere.code} ${critere.libelle}`.toLowerCase().includes(recherche.toLowerCase());
  });
  const applicables = criteresApplicables(secteurApercu, true).filter(critere => !desactives.includes(critere.id));
  return <>
      <PageTitre icone={BarChart3} titre="Back-office référentiel" description="Administration en ligne des domaines, critères, criticités par secteur, applicabilités et référentiels complémentaires. Le référentiel est versionné." actions={<>
            <button type="button" className="btn-secondary" onClick={() => exporterCsv('referentiel-sustway.csv', ['Code', 'Critère', 'Domaine', 'Criticité générale', 'Coefficient par défaut', 'Applicabilité', 'Secteurs', 'Bailleur IFC'], CRITERES.map(critere => [critere.code, critere.libelle, DOMAINES.find(d => d.id === critere.domaineId)?.libelle ?? '', CRITICITE_LIBELLE[criticites[critere.id] ?? critere.criticite], critere.coefficientDefaut, critere.applicabilites.map(a => APPLICABILITE_LIBELLE[a]).join(' + '), critere.secteurs?.join(' / ') ?? 'Tous', critere.bailleurIfc ? 'Oui' : 'Non']))}>
              <Download className="h-4 w-4" aria-hidden />
              Export CSV
            </button>
            <button type="button" className="btn-primary">
              <Plus className="h-4 w-4" aria-hidden />
              Nouveau critère
            </button>
          </>} />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icone={Layers} ton="vert" libelle="Critères au référentiel" valeur={String(CRITERES.length)} detail={`${CRITERES.filter(c => !c.bailleurIfc).length} génériques`} />
        <StatCard icone={Layers} ton="bleu" libelle="Domaines" valeur={String(DOMAINES.length)} />
        <StatCard icone={SlidersHorizontal} ton="ambre" libelle="Criticités surchargées par secteur" valeur={String(CRITERES.filter(c => c.criticiteParSecteur).length)} />
        <StatCard icone={Layers} ton="violet" libelle="Critères tagués bailleur" valeur={String(CRITERES.filter(c => c.bailleurIfc).length)} />
      </div>

      <div className="my-5">
        <Alerte>
          Les niveaux de criticité constituent une première estimation, mise en production puis ajustée progressivement
          au fil des lots d’évaluations plutôt que validée en bloc avant développement.
        </Alerte>
      </div>

      <Card className="mb-6">
        <CardHeader titre="Aperçu de la composition dynamique du questionnaire" sousTitre="Sélectionnez un secteur pour visualiser les critères retenus pour une entreprise de ce profil" action={<select className="input w-auto py-1.5 text-xs" value={secteurApercu} onChange={e => setSecteurApercu(e.target.value)}>
              {SECTEURS.map(secteur => <option key={secteur}>{secteur}</option>)}
            </select>} />
        <div className="flex flex-wrap gap-4 p-5 text-sm">
          <p>
            Critères applicables : <span className="font-semibold">{applicables.length}</span>
          </p>
          <p>
            Dont sectoriels :{' '}
            <span className="font-semibold">{applicables.filter(c => c.applicabilites.includes('SECTORIELLE')).length}</span>
          </p>
          <p>
            Dont bailleur : <span className="font-semibold">{applicables.filter(c => c.bailleurIfc).length}</span>
          </p>
          <p>
            Critères désactivés : <span className="font-semibold">{desactives.length}</span>
          </p>
        </div>
      </Card>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="flex max-w-md flex-1 items-center gap-2 rounded-lg border border-ink-200 bg-white px-3">
          <Search className="h-4 w-4 text-ink-400" aria-hidden />
          <input className="w-full border-0 py-2 text-sm outline-none" placeholder="Rechercher un critère" value={recherche} onChange={e => setRecherche(e.target.value)} />
        </div>
        <select className="input w-auto" value={domaineFiltre} onChange={e => setDomaineFiltre(e.target.value)}>
          <option value="tous">Tous les domaines</option>
          {DOMAINES.map(domaine => <option key={domaine.id} value={domaine.id}>
              {domaine.code} — {domaine.libelle}
            </option>)}
        </select>
      </div>

      <Card>
        <Tableau entetes={['Code', 'Critère', 'Domaine', 'Référentiel', 'Criticité', 'Criticité sectorielle', 'Coef.', 'Applicabilité', 'Actif']}>
          {liste.map(critere => {
          const domaine = DOMAINES.find(d => d.id === critere.domaineId);
          const criticite = criticites[critere.id] ?? critere.criticite;
          return <tr key={critere.id}>
                <td className="td font-medium">{critere.code}</td>
                <td className="td">{critere.libelle}</td>
                <td className="td whitespace-nowrap">{domaine.code}</td>
                <td className="td">
                  <Badge ton={domaine.referentiel === 'IFC' ? 'vert' : 'neutre'}>{REFERENTIEL_LIBELLE[domaine.referentiel]}</Badge>
                </td>
                <td className="td">
                  <select className="input w-32 py-1 text-xs" value={criticite} onChange={e => setCriticites({
                ...criticites,
                [critere.id]: e.target.value
              })}>
                    {['FAIBLE', 'MOYENNE', 'ELEVEE', 'CRITIQUE'].map(valeur => <option key={valeur} value={valeur}>
                        {CRITICITE_LIBELLE[valeur]}
                      </option>)}
                  </select>
                </td>
                <td className="td">
                  {critere.criticiteParSecteur ? <div className="flex flex-wrap gap-1">
                      {Object.entries(critere.criticiteParSecteur).map(([secteur, valeur]) => <Badge key={secteur} ton={CRITICITE_TON[valeur]}>
                          {secteur} : {CRITICITE_LIBELLE[valeur]}
                        </Badge>)}
                    </div> : <span className="text-xs text-ink-400">Valeur générale</span>}
                </td>
                <td className="td">{critere.coefficientDefaut}</td>
                <td className="td">
                  <div className="flex flex-wrap gap-1">
                    {critere.applicabilites.map(applicabilite => <Badge key={applicabilite} ton={applicabilite === 'BAILLEUR' ? 'vert' : applicabilite === 'SECTORIELLE' ? 'bleu' : 'neutre'}>
                        {APPLICABILITE_LIBELLE[applicabilite]}
                      </Badge>)}
                  </div>
                </td>
                <td className="td">
                  <label className="inline-flex items-center gap-2 text-xs">
                    <input type="checkbox" className="accent-brand-600" checked={!desactives.includes(critere.id)} onChange={e => setDesactives(liste => e.target.checked ? liste.filter(id => id !== critere.id) : [...liste, critere.id])} />
                    {desactives.includes(critere.id) ? 'Désactivé' : 'Actif'}
                  </label>
                </td>
              </tr>;
        })}
        </Tableau>
      </Card>
    </>;
}

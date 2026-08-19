import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Building2, Download, Globe2, MapPin, Plus, Search, Users } from 'lucide-react';
import { ENTREPRISES, PAYS, auditsDeLEntreprise } from '../data/mock';
import { syntheseAudit } from '../lib/analyse';
import { formaterScore } from '../lib/scoring';
import { exporterCsv, formaterDate } from '../lib/export';
import { Badge, Card, PageTitre, Tableau } from '../components/ui';
import { TAILLE_LIBELLE } from '../lib/libelles';
import { useAuth } from '../auth/useAuth';
export default function Entreprises() {
  const {
    peut,
    entreprise: entrepriseUtilisateur
  } = useAuth();
  const [recherche, setRecherche] = useState('');
  const liste = (entrepriseUtilisateur ? [entrepriseUtilisateur] : ENTREPRISES).filter(entreprise => `${entreprise.raisonSociale} ${entreprise.secteur}`.toLowerCase().includes(recherche.toLowerCase()));
  return <>
      <PageTitre icone={Building2} titre="Entreprises et sites" description="Gestion multi-pays et multi-sites des entreprises clientes, avec leur secteur d’activité issu de la liste CGECI." actions={<>
            <button type="button" className="btn-secondary" onClick={() => exporterCsv('entreprises.csv', ['Raison sociale', 'Identifiant légal', 'Secteur', 'Taille', 'Pays', 'Sites', 'Formule'], liste.map(entreprise => [entreprise.raisonSociale, entreprise.identifiantLegal, entreprise.secteur, TAILLE_LIBELLE[entreprise.taille], entreprise.paysCodes.join(' / '), entreprise.sites.length, entreprise.plan]))}>
              <Download className="h-4 w-4" aria-hidden />
              Export CSV
            </button>
            <button type="button" className="btn-primary" disabled={!peut('entreprise:creer')}>
              <Plus className="h-4 w-4" aria-hidden />
              Nouvelle entreprise
            </button>
          </>} />

      <div className="mb-4 flex max-w-md items-center gap-2 rounded-lg border border-ink-200 bg-white px-3">
        <Search className="h-4 w-4 text-ink-400" aria-hidden />
        <input className="w-full border-0 py-2 text-sm outline-none" placeholder="Rechercher une entreprise ou un secteur" value={recherche} onChange={e => setRecherche(e.target.value)} />
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        {liste.map(entreprise => {
        const audits = auditsDeLEntreprise(entreprise.id);
        const dernier = audits.at(-1);
        const synthese = dernier ? syntheseAudit(dernier) : undefined;
        return <Card key={entreprise.id} className="p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl text-sm font-semibold text-white" style={{
                backgroundColor: entreprise.logoCouleur
              }}>
                    {entreprise.raisonSociale.slice(0, 2).toUpperCase()}
                  </span>
                  <div>
                    <h2 className="text-sm font-semibold">{entreprise.raisonSociale}</h2>
                    <p className="text-xs text-ink-500">
                      {entreprise.identifiantLegal} · créée le {formaterDate(entreprise.dateCreation)}
                    </p>
                  </div>
                </div>
                <Badge ton={entreprise.plan === 'AVANCEES' ? 'vert' : entreprise.plan === 'STANDARD' ? 'bleu' : 'neutre'}>
                  {entreprise.plan}
                </Badge>
              </div>

              <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
                <div>
                  <dt className="text-xs uppercase tracking-wide text-ink-500">Secteur</dt>
                  <dd>{entreprise.secteur}</dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-wide text-ink-500">Taille</dt>
                  <dd>{TAILLE_LIBELLE[entreprise.taille]}</dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-wide text-ink-500">Score global</dt>
                  <dd className="font-semibold text-brand-700">{synthese ? `${formaterScore(synthese.scoreGlobal)} / 5` : '—'}</dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-wide text-ink-500">Missions</dt>
                  <dd>{audits.length}</dd>
                </div>
              </dl>

              <div className="mt-4 flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1 text-xs text-ink-500">
                  <Globe2 className="h-3.5 w-3.5" aria-hidden />
                  {entreprise.paysCodes.map(code => PAYS.find(p => p.code2 === code)?.nom ?? code).join(', ')}
                </span>
              </div>

              <div className="mt-4 rounded-lg border border-ink-100">
                <Tableau entetes={['Site', 'Ville', 'Pays', 'Effectif']}>
                  {entreprise.sites.map(site => <tr key={site.id}>
                      <td className="td flex items-center gap-2">
                        <MapPin className="h-3.5 w-3.5 text-ink-400" aria-hidden />
                        {site.nom}
                      </td>
                      <td className="td">{site.ville}</td>
                      <td className="td">{PAYS.find(p => p.code2 === site.paysCode2)?.nom}</td>
                      <td className="td">
                        <span className="inline-flex items-center gap-1">
                          <Users className="h-3.5 w-3.5 text-ink-400" aria-hidden />
                          {site.effectif}
                        </span>
                      </td>
                    </tr>)}
                </Tableau>
              </div>

              {dernier ? <Link to={`/app/audits/${dernier.id}`} className="btn-secondary mt-4 w-full">
                  Ouvrir la dernière mission ({dernier.reference})
                </Link> : null}
            </Card>;
      })}
      </div>
    </>;
}

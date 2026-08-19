import { useState } from 'react';
import { Columns3, Download } from 'lucide-react';
import { BENCHMARK_SECTORIEL, ENTREPRISES, auditsDeLEntreprise } from '../data/mock';
import { syntheseAudit } from '../lib/analyse';
import { formaterScore } from '../lib/scoring';
import { exporterCsv } from '../lib/export';
import { Alerte, Badge, Card, CardHeader, PageTitre, Tableau } from '../components/ui';
import { COULEURS, GraphiqueBarres, GraphiqueRadar } from '../components/charts';
import { TAILLE_LIBELLE } from '../lib/libelles';
const PALETTE = [COULEURS.brand, COULEURS.bleu, COULEURS.violet, COULEURS.ambre];
const FONDS = ['rgba(18,130,87,0.15)', 'rgba(37,99,235,0.15)', 'rgba(124,58,237,0.15)', 'rgba(217,119,6,0.15)'];
export default function Comparaison() {
  const [selection, setSelection] = useState(['ent-1', 'ent-2', 'ent-3']);
  const basculer = id => {
    setSelection(liste => liste.includes(id) ? liste.filter(item => item !== id) : liste.length < 4 ? [...liste, id] : liste);
  };
  const comparees = selection.map(id => {
    const entreprise = ENTREPRISES.find(e => e.id === id);
    const audit = auditsDeLEntreprise(id).at(-1);
    return audit ? {
      entreprise,
      synthese: syntheseAudit(audit)
    } : undefined;
  }).filter(item => Boolean(item));
  const domaines = comparees[0]?.synthese.scoresDomaines.map(domaine => domaine.code) ?? [];
  return <>
      <PageTitre icone={Columns3} titre="Comparaison d’entreprises" description="Comparez jusqu’à quatre entreprises côte à côte, sur le score global, les scores par domaine et l’indice de préparation bailleur." actions={<button type="button" className="btn-secondary" onClick={() => exporterCsv('comparaison-entreprises.csv', ['Entreprise', 'Secteur', 'Taille', 'Score global', 'Moyenne sectorielle', 'Indice IFC/SFI', 'Non-conformités'], comparees.map(({
      entreprise,
      synthese
    }) => [entreprise.raisonSociale, entreprise.secteur, TAILLE_LIBELLE[entreprise.taille], formaterScore(synthese.scoreGlobal), BENCHMARK_SECTORIEL[entreprise.secteur], formaterScore(synthese.indiceBailleur), synthese.nonConformites]))}>
            <Download className="h-4 w-4" aria-hidden />
            Export CSV
          </button>} />

      <Card className="mb-6">
        <CardHeader titre="Entreprises comparées" sousTitre="Quatre entreprises au maximum" />
        <div className="flex flex-wrap gap-2 p-5">
          {ENTREPRISES.map(entreprise => <button key={entreprise.id} type="button" className={selection.includes(entreprise.id) ? 'btn-primary py-1.5' : 'btn-secondary py-1.5'} onClick={() => basculer(entreprise.id)}>
              {entreprise.raisonSociale}
            </button>)}
        </div>
      </Card>

      {comparees.length === 0 ? <Alerte ton="ambre">Sélectionnez au moins une entreprise.</Alerte> : <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader titre="Score global et benchmark sectoriel" />
            <div className="h-80 p-5">
              <GraphiqueBarres max={5} labels={comparees.map(({
            entreprise
          }) => entreprise.raisonSociale)} series={[{
            label: 'Score RSE global',
            data: comparees.map(({
              synthese
            }) => Number(synthese.scoreGlobal.toFixed(2))),
            couleur: COULEURS.brand
          }, {
            label: 'Moyenne du secteur',
            data: comparees.map(({
              entreprise
            }) => BENCHMARK_SECTORIEL[entreprise.secteur]),
            couleur: COULEURS.gris
          }, {
            label: 'Indice IFC/SFI',
            data: comparees.map(({
              synthese
            }) => Number(synthese.indiceBailleur.toFixed(2))),
            couleur: COULEURS.bleu
          }]} />
            </div>
          </Card>

          <Card>
            <CardHeader titre="Profil par domaine" sousTitre="Score sur 5 par domaine du référentiel" />
            <div className="h-80 p-5">
              <GraphiqueRadar labels={domaines} series={comparees.map(({
            entreprise,
            synthese
          }, index) => ({
            label: entreprise.raisonSociale,
            data: domaines.map(code => Number((synthese.scoresDomaines.find(d => d.code === code)?.score ?? 0).toFixed(2))),
            couleur: PALETTE[index % PALETTE.length],
            fond: FONDS[index % FONDS.length]
          }))} />
            </div>
          </Card>

          <Card className="lg:col-span-2">
            <CardHeader titre="Tableau comparatif" />
            <Tableau entetes={['Entreprise', 'Secteur', 'Taille', 'Formule', 'Score global', 'Écart au secteur', 'Indice IFC/SFI', 'Non-conformités', 'En revue']}>
              {comparees.map(({
            entreprise,
            synthese
          }) => {
            const ecart = synthese.scoreGlobal - BENCHMARK_SECTORIEL[entreprise.secteur];
            return <tr key={entreprise.id}>
                    <td className="td font-medium">{entreprise.raisonSociale}</td>
                    <td className="td">{entreprise.secteur}</td>
                    <td className="td">{TAILLE_LIBELLE[entreprise.taille]}</td>
                    <td className="td">
                      <Badge ton={entreprise.plan === 'AVANCEES' ? 'vert' : entreprise.plan === 'STANDARD' ? 'bleu' : 'neutre'}>
                        {entreprise.plan}
                      </Badge>
                    </td>
                    <td className="td font-semibold">{formaterScore(synthese.scoreGlobal)}</td>
                    <td className={`td font-medium ${ecart >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                      {ecart >= 0 ? '+' : ''}
                      {ecart.toFixed(2)}
                    </td>
                    <td className="td">{formaterScore(synthese.indiceBailleur)}</td>
                    <td className="td">{synthese.nonConformites}</td>
                    <td className="td">{synthese.enFileRevue}</td>
                  </tr>;
          })}
            </Tableau>
          </Card>
        </div>}
    </>;
}

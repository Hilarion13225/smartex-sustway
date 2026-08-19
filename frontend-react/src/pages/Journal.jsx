import { useState } from 'react';
import { Download, History, Search } from 'lucide-react';
import { JOURNAL } from '../data/mock';
import { exporterCsv, formaterDateHeure } from '../lib/export';
import { Alerte, Badge, Card, CardHeader, PageTitre, Tableau } from '../components/ui';
const TYPE_LIBELLE = {
  LECTURE: 'Lecture',
  CREATION: 'Création',
  MODIFICATION: 'Modification',
  SUPPRESSION: 'Suppression',
  CONNEXION: 'Connexion'
};
const TYPE_TON = {
  LECTURE: 'neutre',
  CREATION: 'vert',
  MODIFICATION: 'bleu',
  SUPPRESSION: 'rouge',
  CONNEXION: 'violet'
};
export default function Journal() {
  const [recherche, setRecherche] = useState('');
  const liste = JOURNAL.filter(entree => `${entree.acteur} ${entree.action} ${entree.cible} ${entree.type}`.toLowerCase().includes(recherche.toLowerCase()));
  return <>
      <PageTitre icone={History} titre="Journal d’audit" description="Toutes les actions sensibles sont tracées : acteur, horodatage, cible et détail. Le journal est consultable par les administrateurs." actions={<button type="button" className="btn-secondary" onClick={() => exporterCsv('journal-audit.csv', ['Horodatage', 'Acteur', 'Action', 'Cible', 'Type'], liste.map(entree => [entree.date, entree.acteur, entree.action, entree.cible, entree.type]))}>
            <Download className="h-4 w-4" aria-hidden />
            Export CSV
          </button>} />

      <div className="mb-5">
        <Alerte>
          Conformément au RGPD, les données personnelles sont limitées au strict nécessaire et les accès sont tracés :
          consultation, modification, export et suppression.
        </Alerte>
      </div>

      <div className="mb-4 flex max-w-md items-center gap-2 rounded-lg border border-ink-200 bg-white px-3">
        <Search className="h-4 w-4 text-ink-400" aria-hidden />
        <input className="w-full border-0 py-2 text-sm outline-none" placeholder="Rechercher une action ou un acteur" value={recherche} onChange={e => setRecherche(e.target.value)} />
      </div>

      <Card>
        <CardHeader titre="Événements" icone={History} sousTitre={`${liste.length} entrées`} />
        <Tableau entetes={['Horodatage', 'Acteur', 'Action', 'Cible', 'Type']}>
          {liste.map(entree => <tr key={entree.id}>
              <td className="td whitespace-nowrap">{formaterDateHeure(entree.date)}</td>
              <td className="td font-medium">{entree.acteur}</td>
              <td className="td">{entree.action}</td>
              <td className="td">{entree.cible}</td>
              <td className="td">
                <Badge ton={TYPE_TON[entree.type]}>{TYPE_LIBELLE[entree.type]}</Badge>
              </td>
            </tr>)}
        </Tableau>
      </Card>
    </>;
}

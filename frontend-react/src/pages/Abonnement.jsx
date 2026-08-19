import { useState } from 'react';
import { Check, CreditCard, Receipt, Wallet, X } from 'lucide-react';
import { FORMULES, PLAN_LIBELLE } from '../data/formules';
import { ABONNEMENTS, ENTREPRISES } from '../data/mock';
import { formaterDate, formaterMontant } from '../lib/export';
import { Alerte, Badge, Card, CardHeader, PageTitre, Tableau } from '../components/ui';
import { useAuth } from '../auth/useAuth';
export default function Abonnement() {
  const {
    planActif,
    changerFormule,
    entreprise
  } = useAuth();
  const [periodicite, setPeriodicite] = useState('ANNUELLE');
  const [paiement, setPaiement] = useState('PI_SPI');
  const abonnements = entreprise ? ABONNEMENTS.filter(a => a.entrepriseId === entreprise.id) : ABONNEMENTS;
  return <>
      <PageTitre icone={CreditCard} titre="Abonnement et facturation" description="Souscription mensuelle ou annuelle, réglée par PI-SPI ou Wave. Les paiements sont simulés dans cette maquette." actions={<div className="flex rounded-lg border border-ink-200 bg-white p-1">
            {['MENSUELLE', 'ANNUELLE'].map(valeur => <button key={valeur} type="button" className={`rounded-md px-3 py-1.5 text-sm ${periodicite === valeur ? 'bg-brand-600 text-white' : 'text-ink-600'}`} onClick={() => setPeriodicite(valeur)}>
                {valeur === 'MENSUELLE' ? 'Mensuel' : 'Annuel'}
              </button>)}
          </div>} />

      <div className="grid gap-5 lg:grid-cols-3">
        {FORMULES.map(formule => {
        const actif = planActif === formule.cle;
        const prix = periodicite === 'MENSUELLE' ? formule.prixMensuel : formule.prixAnnuel;
        return <Card key={formule.cle} className={`p-6 ${actif ? 'ring-2 ring-brand-500' : ''}`}>
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">{PLAN_LIBELLE[formule.cle]}</h2>
                {actif ? <Badge ton="vert">Formule active</Badge> : null}
              </div>
              <p className="mt-1 text-sm text-ink-500">{formule.accroche}</p>
              <p className="mt-4 text-3xl font-semibold">
                {prix === 0 ? 'Gratuit' : formaterMontant(prix)}
                {prix === 0 ? null : <span className="text-sm font-normal text-ink-500"> / {periodicite === 'MENSUELLE' ? 'mois' : 'an'}</span>}
              </p>
              <ul className="mt-4 space-y-2">
                {formule.fonctionnalites.map(fonctionnalite => <li key={fonctionnalite.libelle} className={`flex items-start gap-2 text-sm ${fonctionnalite.inclus ? 'text-ink-700' : 'text-ink-400'}`}>
                    {fonctionnalite.inclus ? <Check className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" aria-hidden /> : <X className="mt-0.5 h-4 w-4 shrink-0 text-ink-300" aria-hidden />}
                    {fonctionnalite.libelle}
                  </li>)}
              </ul>
              <button type="button" className={actif ? 'btn-secondary mt-5 w-full' : 'btn-primary mt-5 w-full'} disabled={actif} onClick={() => changerFormule(formule.cle)}>
                {actif ? 'Formule en cours' : `Basculer vers ${PLAN_LIBELLE[formule.cle]}`}
              </button>
            </Card>;
      })}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader titre="Moyen de paiement" icone={Wallet} />
          <div className="space-y-3 p-5">
            {['PI_SPI', 'WAVE'].map(moyen => <button key={moyen} type="button" className={`flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left text-sm ${paiement === moyen ? 'border-brand-500 bg-brand-50/60' : 'border-ink-200'}`} onClick={() => setPaiement(moyen)}>
                <Wallet className="h-4 w-4 text-ink-500" aria-hidden />
                <span>
                  <span className="block font-medium">{moyen === 'PI_SPI' ? 'PI-SPI' : 'Wave'}</span>
                  <span className="block text-xs text-ink-500">
                    {moyen === 'PI_SPI' ? 'Agrégateur de paiement interbancaire' : 'Portefeuille mobile Wave'}
                  </span>
                </span>
              </button>)}
            <Alerte>
              Le compte est provisionné automatiquement dès la confirmation du paiement par le prestataire ; les données
              affichées ici sont simulées.
            </Alerte>
          </div>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader titre="Abonnements enregistrés" icone={Receipt} />
          <Tableau entetes={['Entreprise', 'Formule', 'Périodicité', 'Moyen', 'Montant', 'Prochaine échéance', 'Statut']}>
            {abonnements.map(abonnement => <tr key={abonnement.id}>
                <td className="td">{ENTREPRISES.find(e => e.id === abonnement.entrepriseId)?.raisonSociale}</td>
                <td className="td">
                  <Badge ton={abonnement.plan === 'AVANCEES' ? 'vert' : abonnement.plan === 'STANDARD' ? 'bleu' : 'neutre'}>
                    {PLAN_LIBELLE[abonnement.plan]}
                  </Badge>
                </td>
                <td className="td">{abonnement.periodicite === 'ANNUELLE' ? 'Annuelle' : 'Mensuelle'}</td>
                <td className="td">{abonnement.moyenPaiement === 'AUCUN' ? '—' : abonnement.moyenPaiement === 'PI_SPI' ? 'PI-SPI' : 'Wave'}</td>
                <td className="td whitespace-nowrap">{abonnement.montantFcfa === 0 ? 'Gratuit' : formaterMontant(abonnement.montantFcfa)}</td>
                <td className="td whitespace-nowrap">
                  {abonnement.prochaineEcheance === '—' ? '—' : formaterDate(abonnement.prochaineEcheance)}
                </td>
                <td className="td">
                  <Badge ton={abonnement.statut === 'ACTIF' ? 'vert' : 'ambre'}>
                    {abonnement.statut === 'ACTIF' ? 'Actif' : 'En attente'}
                  </Badge>
                </td>
              </tr>)}
          </Tableau>
        </Card>
      </div>
    </>;
}

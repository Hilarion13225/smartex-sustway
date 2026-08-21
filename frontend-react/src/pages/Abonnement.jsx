import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, BadgeCheck, CalendarClock, CreditCard, Receipt, Smartphone, Wallet } from 'lucide-react';
import SustwayLoader from '../components/SustwayLoader';
import Revele from '../components/Revele';
import { Alerte, Badge, Card, CardHeader, Loader, PageTitre, StatCard, Tableau, Vide } from '../components/ui';
import { api, ApiError } from '../lib/apiClient';
import { useApiAuth } from '../auth/useApiAuth';
import { formaterDate, formaterDateHeure } from '../lib/export';

const TONS_STATUT_ABONNEMENT = { ACTIF: 'vert', EN_ATTENTE_PAIEMENT: 'ambre', SUSPENDU: 'rouge', EXPIRE: 'neutre' };
const TONS_STATUT_PAIEMENT = { REUSSI: 'vert', EN_ATTENTE: 'ambre', ECHOUE: 'rouge', REMBOURSE: 'neutre' };
const FOURNISSEURS = { PI_SPI: 'PI-SPI', WAVE: 'Wave' };

function formaterMontant(montant, devise) {
  if (montant === null || montant === undefined) return '—';
  return `${Number(montant).toLocaleString('fr-FR')} ${devise ?? 'XOF'}`;
}

/**
 * RG20/RG24 — abonnement de l'entreprise et historique des paiements
 * PI-SPI / Wave, avec reprise du règlement tant que l'abonnement reste en
 * attente de paiement.
 */
export default function Abonnement() {
  const { entrepriseId } = useParams();
  const { entreprises, payerAbonnement } = useApiAuth();
  const entreprise = entreprises.find((e) => e.id === entrepriseId);

  const [abonnement, setAbonnement] = useState(null);
  const [paiements, setPaiements] = useState([]);
  const [formule, setFormule] = useState(null);
  const [chargement, setChargement] = useState(true);
  const [chargementPaiement, setChargementPaiement] = useState(false);
  const [erreur, setErreur] = useState(null);

  const rafraichir = useCallback(() => {
    setChargement(true);
    Promise.all([
      api.get(`/api/v1/entreprises/${entrepriseId}/abonnement`).catch(() => null),
      api.get(`/api/v1/entreprises/${entrepriseId}/abonnement/paiements`).catch(() => []),
      api.get('/api/v1/formules', { avecAuth: false }).catch(() => []),
    ])
      .then(([abo, listePaiements, formules]) => {
        setAbonnement(abo);
        setPaiements(listePaiements);
        setFormule(abo ? formules.find((f) => f.code === abo.formuleCode) ?? null : null);
      })
      .finally(() => setChargement(false));
  }, [entrepriseId]);

  useEffect(() => {
    rafraichir();
  }, [rafraichir]);

  async function payer(fournisseur) {
    setErreur(null);
    setChargementPaiement(true);
    try {
      await payerAbonnement(entrepriseId, fournisseur);
      rafraichir();
    } catch (err) {
      setErreur(err instanceof ApiError ? err.message : 'Erreur inattendue');
    } finally {
      setChargementPaiement(false);
    }
  }

  if (!entreprise) {
    return <Vide message="Entreprise introuvable ou non accessible." />;
  }

  const montantPeriode =
    formule && abonnement
      ? abonnement.periodicite === 'MENSUELLE'
        ? formule.prixMensuel
        : formule.prixAnnuel
      : null;

  return (
    <>
      <Link to={`/app/${entrepriseId}`} className="btn-ghost mb-4 -ml-2">
        <ArrowLeft className="h-4 w-4" aria-hidden />
        Retour à l’entreprise
      </Link>

      <PageTitre
        icone={Wallet}
        titre="Abonnement et paiements"
        description={`${entreprise.raisonSociale} — formule souscrite, échéance et historique des règlements PI-SPI / Wave.`}
      />

      {erreur ? <Alerte ton="rouge">{erreur}</Alerte> : null}

      {chargement ? (
        <Loader message="Chargement de l’abonnement…" />
      ) : !abonnement ? (
        <Vide message="Aucun abonnement trouvé pour cette entreprise." />
      ) : (
        <>
          <Revele>
            <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <StatCard
                libelle="Formule"
                valeur={abonnement.formuleNom}
                detail={formule?.description}
                icone={BadgeCheck}
                ton="bleu"
              />
              <StatCard
                libelle="Périodicité"
                valeur={abonnement.periodicite ?? '—'}
                detail={montantPeriode !== null ? formaterMontant(montantPeriode, 'XOF') : undefined}
                icone={CalendarClock}
                ton="neutre"
              />
              <StatCard
                libelle="Statut"
                valeur={abonnement.statut}
                detail={`Depuis le ${formaterDate(abonnement.dateDebut)}`}
                icone={CreditCard}
                ton={TONS_STATUT_ABONNEMENT[abonnement.statut] ?? 'neutre'}
              />
              <StatCard
                libelle="Règlements"
                valeur={paiements.length}
                detail={abonnement.dateFin ? `Échéance le ${formaterDate(abonnement.dateFin)}` : 'Sans échéance fixée'}
                icone={Receipt}
                ton="neutre"
              />
            </div>
          </Revele>

          {abonnement.statut === 'EN_ATTENTE_PAIEMENT' ? (
            <Revele delai={80}>
              <Card className="mb-6 p-5">
                <CardHeader
                  titre="Régler l’abonnement"
                  icone={CreditCard}
                  sousTitre="Deux fournisseurs retenus pour le marché ivoirien : PI-SPI et Wave."
                />
                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    type="button"
                    className="btn-primary"
                    disabled={chargementPaiement}
                    onClick={() => payer('PI_SPI')}
                  >
                    {chargementPaiement ? <SustwayLoader taille="sm" /> : <Wallet className="h-4 w-4" aria-hidden />}
                    Payer via PI-SPI
                  </button>
                  <button
                    type="button"
                    className="btn-secondary"
                    disabled={chargementPaiement}
                    onClick={() => payer('WAVE')}
                  >
                    {chargementPaiement ? <SustwayLoader taille="sm" /> : <Smartphone className="h-4 w-4" aria-hidden />}
                    Payer via Wave
                  </button>
                </div>
              </Card>
            </Revele>
          ) : null}

          <Revele delai={120}>
            <Card className="p-0">
              <CardHeader titre="Historique des paiements" icone={Receipt} sousTitre="Traçabilité complète des règlements de cet abonnement" />
              {paiements.length > 0 ? (
                <Tableau entetes={['Date', 'Fournisseur', 'Référence', 'Montant', 'Statut']}>
                  {paiements.map((p) => (
                    <tr key={p.id} className="transition-colors hover:bg-ink-50/60">
                      <td className="td text-sm text-ink-600">{formaterDateHeure(p.datePaiement)}</td>
                      <td className="td">{FOURNISSEURS[p.fournisseur] ?? p.fournisseur}</td>
                      <td className="td font-mono text-xs text-ink-500">{p.reference}</td>
                      <td className="td font-medium text-ink-900">{formaterMontant(p.montant, p.devise)}</td>
                      <td className="td">
                        <Badge ton={TONS_STATUT_PAIEMENT[p.statut] ?? 'neutre'}>{p.statut}</Badge>
                      </td>
                    </tr>
                  ))}
                </Tableau>
              ) : (
                <div className="p-6">
                  <Vide message="Aucun paiement enregistré pour cet abonnement." />
                </div>
              )}
            </Card>
          </Revele>
        </>
      )}
    </>
  );
}

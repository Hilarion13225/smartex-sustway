import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Leaf, RefreshCw } from 'lucide-react';
import SustwayLoader from '../components/SustwayLoader';
import Revele from '../components/Revele';
import { Alerte, Card, Loader, PageTitre, Vide } from '../components/ui';
import { api, ApiError } from '../lib/apiClient';
import { formaterDateHeure } from '../lib/export';

/** RG39/RG40/RG41/RG42/RG43 : indice de préparation bailleur (financements verts) — réservé à la formule Avancées. */
export default function IndicePreparation() {
  const { entrepriseId, auditId } = useParams();

  const [audit, setAudit] = useState(null);
  const [bailleurs, setBailleurs] = useState([]);
  const [indices, setIndices] = useState(null);
  const [chargement, setChargement] = useState(true);
  const [erreurGlobale, setErreurGlobale] = useState(null);
  const [calculEnCours, setCalculEnCours] = useState(null);

  const rafraichir = useCallback(() => {
    setChargement(true);
    setErreurGlobale(null);
    Promise.all([
      api.get(`/api/v1/entreprises/${entrepriseId}/audits/${auditId}`),
      api.get('/api/v1/bailleurs'),
      api.get(`/api/v1/entreprises/${entrepriseId}/audits/${auditId}/indice-preparation`),
    ])
      .then(([a, b, i]) => {
        setAudit(a);
        setBailleurs(b);
        setIndices(i);
      })
      .catch((err) => setErreurGlobale(err instanceof ApiError ? err.message : 'Erreur inattendue'))
      .finally(() => setChargement(false));
  }, [entrepriseId, auditId]);

  useEffect(() => {
    rafraichir();
  }, [rafraichir]);

  async function calculer(bailleurCode) {
    setErreurGlobale(null);
    setCalculEnCours(bailleurCode);
    try {
      await api.post(`/api/v1/entreprises/${entrepriseId}/audits/${auditId}/indice-preparation`, { bailleurCode });
      rafraichir();
    } catch (err) {
      setErreurGlobale(err instanceof ApiError ? err.message : 'Erreur inattendue');
    } finally {
      setCalculEnCours(null);
    }
  }

  const formuleAvancees = audit?.formuleCode === 'AVANCEES';

  return (
    <>
      <Link to={`/app/${entrepriseId}/audits/${auditId}`} className="btn-ghost mb-4 -ml-2">
        <ArrowLeft className="h-4 w-4" aria-hidden />
        Retour à la mission
      </Link>

      {chargement ? (
        <Loader message="Chargement de l’indice de préparation…" />
      ) : !audit ? (
        <Vide message="Audit introuvable ou non accessible." />
      ) : (
        <>
          <PageTitre
            icone={Leaf}
            titre="Indice de préparation — financements verts"
            description="RG41/RG42/RG43 — alignement mesuré aux exigences d’un bailleur, restreint aux critères tagués (back-office). Un indice élevé mesure un alignement, ce n’est jamais une garantie d’éligibilité."
          />

          {erreurGlobale ? <Alerte ton="rouge">{erreurGlobale}</Alerte> : null}

          {!formuleAvancees ? (
            <Alerte ton="ambre">
              Cet indice est réservé à la formule Avancées (formule actuelle de la mission :{' '}
              {audit.formuleCode ?? 'inconnue'}).
            </Alerte>
          ) : (
            <Revele>
              <Card className="p-5">
                <div className="mb-4 flex flex-wrap gap-2">
                  {bailleurs.map((b) => (
                    <button
                      key={b.code}
                      type="button"
                      className="btn-secondary"
                      disabled={calculEnCours !== null}
                      onClick={() => calculer(b.code)}
                    >
                      {calculEnCours === b.code ? <SustwayLoader taille="sm" /> : <RefreshCw className="h-4 w-4" aria-hidden />}
                      Calculer pour {b.nom}
                    </button>
                  ))}
                </div>

                {indices && indices.length > 0 ? (
                  <ul className="space-y-2">
                    {indices.map((i) => (
                      <li key={i.id} className="rounded-xl border border-ink-100 bg-white p-4">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="font-medium text-ink-900">{i.bailleurNom}</p>
                          <p className="text-lg font-semibold text-ink-900">{Number(i.score).toFixed(2)} / 5</p>
                        </div>
                        <p className="mt-1 text-xs text-ink-500">Calculé le {formaterDateHeure(i.dateCalcul)}</p>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <Vide message="Aucun indice calculé pour l’instant — utilisez les boutons ci-dessus." />
                )}
              </Card>
            </Revele>
          )}
        </>
      )}
    </>
  );
}

import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import Breadcrumb from '../components/Breadcrumb';
import { Leaf, RefreshCw } from 'lucide-react';
import SustwayLoader from '../components/SustwayLoader';
import Revele from '../components/Revele';
import { Alerte, Card, Loader, PageTitre, Vide } from '../components/ui';
import { api, ApiError } from '../lib/apiClient';
import { useApiAuth } from '../auth/useApiAuth';
import { formaterDateHeure } from '../lib/export';
import { explicationIndice, libelleIndice, libellePerimetre, porteUnScore } from '../lib/indiceBailleur';

/** RG39/RG40/RG41/RG42/RG43 : indice de préparation bailleur (financements verts) — réservé à la formule Avancées. */
export default function IndicePreparation() {
  const { entrepriseId, auditId } = useParams();
  const { entreprises } = useApiAuth();
  const entreprise = entreprises.find((e) => e.id === entrepriseId);

  const [audit, setAudit] = useState(null);
  const [bailleurs, setBailleurs] = useState([]);
  const [indices, setIndices] = useState(null);
  const [chargement, setChargement] = useState(true);
  const [erreurGlobale, setErreurGlobale] = useState(null);
  const [calculEnCours, setCalculEnCours] = useState(null);

  const rafraichir = useCallback(() => {
    setChargement(true);
    setErreurGlobale(null);
    /*
     * L'indice est charge a part, et son echec n'emporte plus les deux autres
     * appels.
     *
     * Il est reserve a la formule Avancees (RG39-RG43) : sur une organisation
     * en STANDARD l'API repond 403, le `Promise.all` rejetait tout, `audit`
     * restait nul et l'ecran concluait « Audit introuvable ou non accessible ».
     * L'audit existait pourtant, et le message envoyait chercher une panne la
     * ou il n'y avait qu'une formule.
     */
    Promise.all([
      api.get(`/api/v1/entreprises/${entrepriseId}/audits/${auditId}`),
      api.get('/api/v1/bailleurs'),
    ])
      .then(([a, b]) => {
        setAudit(a);
        setBailleurs(b);
        return api
          .get(`/api/v1/entreprises/${entrepriseId}/audits/${auditId}/indice-preparation`)
          .then(setIndices)
          .catch((err) => {
            if (err instanceof ApiError && err.statut === 403) {
              setErreurGlobale(
                'L’indice de préparation bailleur n’est pas accessible avec la formule souscrite par cette organisation.'
              );
              setIndices([]);
              return;
            }
            throw err;
          });
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
      {chargement ? (
        <Loader message="Chargement de l’indice de préparation…" />
      ) : !audit ? (
        <Vide message="Audit introuvable ou non accessible." />
      ) : (
        <>
          <Breadcrumb
            elements={[
              entreprises.length > 1 && entreprise
                ? { libelle: entreprise.raisonSociale, vers: `/app/${entrepriseId}` }
                : null,
              { libelle: 'Missions', vers: `/app/${entrepriseId}/audits` },
              { libelle: audit.nom, vers: `/app/${entrepriseId}/audits/${auditId}` },
              { libelle: 'Indice de préparation' },
            ]}
          />

          <PageTitre
            icone={Leaf}
            titre="Indice de préparation — financements verts"
            description="Alignement mesuré aux exigences d’un bailleur, restreint aux critères tagués (back-office). Un indice élevé mesure un alignement, ce n’est jamais une garantie d’éligibilité."
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
                      <li key={i.id} className="rounded-xl border border-ink-100 bg-surface p-4">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="font-medium text-ink-900">{i.bailleurNom}</p>
                          <p
                            className={
                              porteUnScore(i)
                                ? 'text-lg font-semibold text-ink-900'
                                : 'text-sm font-medium text-ink-500'
                            }
                          >
                            {libelleIndice(i)}
                          </p>
                        </div>
                        {explicationIndice(i) ? (
                          <p className="mt-1 text-xs text-ink-500">{explicationIndice(i)}</p>
                        ) : null}
                        {libellePerimetre(i) ? (
                          <p className="mt-1 text-xs text-ink-500">{libellePerimetre(i)}</p>
                        ) : null}
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

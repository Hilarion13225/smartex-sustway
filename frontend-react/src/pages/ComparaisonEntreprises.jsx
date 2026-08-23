import { useMemo, useState } from 'react';
import { Columns3, Download } from 'lucide-react';
import Revele from '../components/Revele';
import { Alerte, Card, CardHeader, Loader, PageTitre, Vide } from '../components/ui';
import { COULEURS, GraphiqueBarres, GraphiqueRadar } from '../components/charts';
import { api } from '../lib/apiClient';
import { useApiAuth } from '../auth/useApiAuth';
import { exporterCsv } from '../lib/export';

const MAX_ENTREPRISES = 4;
const PALETTE = [COULEURS.brand, COULEURS.bleu, COULEURS.violet, COULEURS.ambre];

/**
 * Comparaison de jusqu'à 4 entreprises côte à côte, sur le score global et
 * le profil par domaine — basée sur la mission la plus récente de chacune
 * (endpoint /score déjà utilisé par AuditScore/TableauDeBord, pas de
 * nouvel endpoint). Les domaines affichés au radar sont ceux de la
 * première entreprise sélectionnée : la comparaison suppose des missions
 * menées sur un référentiel comparable.
 */
export default function ComparaisonEntreprises() {
  const { entreprises } = useApiAuth();
  const [selection, setSelection] = useState([]);
  const [resultats, setResultats] = useState(null);
  const [chargement, setChargement] = useState(false);
  const [erreur, setErreur] = useState(null);

  function basculer(entrepriseId) {
    setSelection((prec) => {
      if (prec.includes(entrepriseId)) return prec.filter((id) => id !== entrepriseId);
      if (prec.length >= MAX_ENTREPRISES) return prec;
      return [...prec, entrepriseId];
    });
  }

  async function comparer() {
    setChargement(true);
    setErreur(null);
    try {
      const donnees = await Promise.all(
        selection.map(async (entrepriseId) => {
          const entreprise = entreprises.find((e) => e.id === entrepriseId);
          const audits = await api.get(`/api/v1/entreprises/${entrepriseId}/audits`).catch(() => []);
          const dernier = [...audits].sort((a, b) => new Date(b.dateDebut) - new Date(a.dateDebut))[0];
          if (!dernier) return { entreprise, audit: null, score: null };
          const score = await api
            .get(`/api/v1/entreprises/${entrepriseId}/audits/${dernier.id}/score`)
            .catch(() => null);
          return { entreprise, audit: dernier, score };
        })
      );
      setResultats(donnees);
    } catch {
      setErreur('Impossible de calculer la comparaison.');
    } finally {
      setChargement(false);
    }
  }

  const domaines = useMemo(() => {
    const premiereAvecScore = resultats?.find((r) => r.score);
    return premiereAvecScore ? premiereAvecScore.score.domaines.map((d) => d.domaineCode) : [];
  }, [resultats]);

  function exporter() {
    exporterCsv(
      'comparaison-entreprises.csv',
      ['Entreprise', 'Mission', 'Score global', ...domaines],
      (resultats ?? []).map((r) => [
        r.entreprise.raisonSociale,
        r.audit?.nom ?? '—',
        r.score ? Number(r.score.scoreGlobal).toFixed(2) : '—',
        ...domaines.map((code) => {
          const d = r.score?.domaines.find((dom) => dom.domaineCode === code);
          return d ? Number(d.score).toFixed(2) : '—';
        }),
      ])
    );
  }

  return (
    <>
      <PageTitre
        icone={Columns3}
        titre="Comparaison d’entreprises"
        description={`Comparez jusqu’à ${MAX_ENTREPRISES} entreprises côte à côte, sur le score global et le profil par domaine de leur mission la plus récente.`}
        actions={
          resultats ? (
            <button type="button" className="btn-secondary" onClick={exporter}>
              <Download className="h-4 w-4" aria-hidden />
              Exporter en CSV
            </button>
          ) : null
        }
      />

      <Revele>
        <Card className="mb-6 p-5">
          <CardHeader titre="Entreprises comparées" sousTitre={`${MAX_ENTREPRISES} entreprises au maximum`} />
          <div className="mt-4 flex flex-wrap gap-2">
            {entreprises.map((e) => {
              const active = selection.includes(e.id);
              return (
                <button
                  key={e.id}
                  type="button"
                  className={active ? 'btn-primary' : 'btn-secondary'}
                  disabled={!active && selection.length >= MAX_ENTREPRISES}
                  onClick={() => basculer(e.id)}
                >
                  {e.raisonSociale}
                </button>
              );
            })}
          </div>
          {entreprises.length === 0 ? (
            <p className="mt-3 text-sm text-ink-500">Aucune entreprise accessible pour l’instant.</p>
          ) : (
            <button
              type="button"
              className="btn-primary mt-5"
              disabled={selection.length < 2 || chargement}
              onClick={comparer}
            >
              Comparer
            </button>
          )}
        </Card>
      </Revele>

      {erreur ? <Alerte ton="rouge">{erreur}</Alerte> : null}

      {chargement ? (
        <Loader message="Calcul de la comparaison…" />
      ) : resultats ? (
        <Revele delai={80}>
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader titre="Score global" sousTitre="Mission la plus récente de chaque entreprise" />
              <div className="h-80 p-5">
                {resultats.some((r) => r.score) ? (
                  <GraphiqueBarres
                    labels={resultats.map((r) => r.entreprise.raisonSociale)}
                    series={[
                      {
                        label: 'Score global',
                        data: resultats.map((r) => (r.score ? Number(r.score.scoreGlobal) : 0)),
                        couleur: COULEURS.brand,
                      },
                    ]}
                    max={5}
                  />
                ) : (
                  <Vide message="Aucun score disponible pour ces entreprises." />
                )}
              </div>
            </Card>

            <Card>
              <CardHeader titre="Profil par domaine" sousTitre="Score sur 5, référentiel de la première entreprise" />
              <div className="h-80 p-5">
                {domaines.length > 0 ? (
                  <GraphiqueRadar
                    labels={domaines}
                    series={resultats
                      .filter((r) => r.score)
                      .map((r, index) => ({
                        label: r.entreprise.raisonSociale,
                        data: domaines.map((code) => {
                          const d = r.score.domaines.find((dom) => dom.domaineCode === code);
                          return d ? Number(d.score) : 0;
                        }),
                        couleur: PALETTE[index % PALETTE.length],
                        fond: 'transparent',
                      }))}
                  />
                ) : (
                  <Vide message="Aucun domaine à comparer." />
                )}
              </div>
            </Card>
          </div>
        </Revele>
      ) : null}
    </>
  );
}

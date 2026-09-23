import { useMemo, useState } from 'react';
import { Columns3, Download } from 'lucide-react';
import Revele from '../components/Revele';
import Breadcrumb from '../components/Breadcrumb';
import { Alerte, Card, CardHeader, Loader, PageTitre, Vide } from '../components/ui';
import { COULEURS, GraphiqueBarres, GraphiqueRadar } from '../components/charts';
import { chargerDernieresMissions } from '../lib/portefeuille';
import { useApiAuth } from '../auth/useApiAuth';
import { exporterCsv } from '../lib/export';
import { formaterScore } from '../lib/scoreAffiche';

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
      const choisies = selection.map((id) => entreprises.find((e) => e.id === id));
      const donnees = await chargerDernieresMissions(choisies);
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
        r.score?.nombreCriteresEvalues > 0 ? formaterScore(r.score.scoreGlobal) : '—',
        ...domaines.map((code) => {
          const d = r.score?.domaines.find((dom) => dom.domaineCode === code);
          return d?.nombreCriteresEvalues > 0 ? formaterScore(d.score) : '—';
        }),
      ])
    );
  }

  return (
    <>
      <Breadcrumb
        elements={[
          { libelle: 'Tableau de bord', vers: '/app' },
          { libelle: 'Comparer les organisations' },
        ]}
      />

      <PageTitre
        icone={Columns3}
        titre="Comparer les organisations"
        description={`Comparez jusqu’à ${MAX_ENTREPRISES} organisations côte à côte, sur le score global et le profil par domaine de leur mission la plus récente.`}
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
          <CardHeader titre="Organisations comparées" sousTitre={`${MAX_ENTREPRISES} organisations au maximum`} />
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
            <p className="mt-3 text-sm text-ink-500">Aucune organisation accessible pour l’instant.</p>
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
              <CardHeader titre="Score global" sousTitre="Mission la plus récente de chaque organisation" />
              <div className="h-80 p-5">
                {resultats.some((r) => r.score) ? (
                  <GraphiqueBarres
                    labels={resultats.map((r) => r.entreprise.raisonSociale)}
                    series={[
                      {
                        label: 'Score global',
                        // V74-C3-B11 : une absence de score n'est pas tracée comme une barre à zéro.
                        data: resultats.map((r) => (r.score?.nombreCriteresEvalues > 0 ? Number(r.score.scoreGlobal) : null)),
                        couleur: COULEURS.brand,
                        format: 'score',
                      },
                    ]}
                    max={5}
                  />
                ) : (
                  <Vide message="Aucun score disponible pour ces organisations." />
                )}
              </div>
            </Card>

            <Card>
              <CardHeader titre="Profil par domaine" sousTitre="Score sur 5, référentiel de la première organisation" />
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
                          return d?.nombreCriteresEvalues > 0 ? Number(d.score) : null;
                        }),
                        couleur: PALETTE[index % PALETTE.length],
                        fond: 'transparent',
                        format: 'score',
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

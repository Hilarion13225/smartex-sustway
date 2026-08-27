import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Download, ListChecks, Search } from 'lucide-react';
import Revele from '../components/Revele';
import { Alerte, Badge, Card, CardHeader, Loader, PageTitre, StatCard, Tableau, Vide } from '../components/ui';
import { COULEURS, GraphiqueBarres } from '../components/charts';
import { api, ApiError } from '../lib/apiClient';
import { useApiAuth } from '../auth/useApiAuth';
import { exporterCsv } from '../lib/export';

const TONS_CRITICITE = { FAIBLE: 'neutre', MOYENNE: 'bleu', ELEVEE: 'ambre', CRITIQUE: 'rouge' };
const CRITICITES = ['CRITIQUE', 'ELEVEE', 'MOYENNE', 'FAIBLE'];

/**
 * RG34 — aperçu du questionnaire composé dynamiquement pour l'entreprise :
 * critères retenus selon son secteur d'activité, avec la criticité
 * effectivement appliquée. C'est ce périmètre qui sera figé à la création
 * d'une mission d'audit (RG35).
 */
export default function Questionnaire() {
  const { entrepriseId } = useParams();
  const { entreprises } = useApiAuth();
  const entreprise = entreprises.find((e) => e.id === entrepriseId);

  const [referentiels, setReferentiels] = useState([]);
  const [referentielCode, setReferentielCode] = useState('SMARTEX_SUSTWAY');
  const [questionnaire, setQuestionnaire] = useState(null);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState(null);
  const [recherche, setRecherche] = useState('');

  useEffect(() => {
    api
      .get('/api/v1/referentiels')
      .then((liste) => setReferentiels(liste.filter((r) => r.statut === 'ACTIF')))
      .catch(() => setReferentiels([]));
  }, []);

  const charger = useCallback(() => {
    setChargement(true);
    setErreur(null);
    api
      .get(`/api/v1/entreprises/${entrepriseId}/questionnaire?referentiel=${encodeURIComponent(referentielCode)}`)
      .then(setQuestionnaire)
      .catch((err) => {
        setQuestionnaire(null);
        setErreur(err instanceof ApiError ? err.message : 'Erreur inattendue');
      })
      .finally(() => setChargement(false));
  }, [entrepriseId, referentielCode]);

  useEffect(() => {
    charger();
  }, [charger]);

  const criteres = questionnaire?.criteres ?? [];

  const criteresFiltres = useMemo(() => {
    const q = recherche.trim().toLowerCase();
    if (!q) return criteres;
    return criteres.filter(
      (c) => c.code.toLowerCase().includes(q) || c.libelle.toLowerCase().includes(q) || c.domaineCode.toLowerCase().includes(q)
    );
  }, [criteres, recherche]);

  const domaines = useMemo(() => {
    const cumul = new Map();
    criteres.forEach((c) => {
      const courant = cumul.get(c.domaineCode) ?? { nom: c.domaineNom, nombre: 0 };
      courant.nombre += 1;
      cumul.set(c.domaineCode, courant);
    });
    return [...cumul.entries()].map(([code, valeur]) => ({ code, ...valeur }));
  }, [criteres]);

  function exporter() {
    exporterCsv(
      `questionnaire-${referentielCode.toLowerCase()}.csv`,
      ['Code', 'Critère', 'Domaine', 'Criticité', 'Applicabilité'],
      criteres.map((c) => [c.code, c.libelle, c.domaineNom, c.criticite ?? '—', c.applicabilite])
    );
  }

  if (!entreprise) {
    return <Vide message="Entreprise introuvable ou non accessible." />;
  }

  return (
    <>
      <Link to={`/app/${entrepriseId}`} className="btn-ghost mb-4 -ml-2">
        <ArrowLeft className="h-4 w-4" aria-hidden />
        Retour à l’entreprise
      </Link>

      <PageTitre
        icone={ListChecks}
        titre="Questionnaire applicable"
        description={`Composition dynamique du questionnaire pour ${entreprise.raisonSociale}${entreprise.secteurCode ? ` (secteur ${entreprise.secteurCode})` : ''} — la criticité affichée est celle appliquée à ce secteur.`}
        actions={
          <>
            <label className="label mb-0 sr-only" htmlFor="questionnaire-referentiel">
              Référentiel
            </label>
            <select
              id="questionnaire-referentiel"
              className="input w-auto"
              value={referentielCode}
              onChange={(e) => setReferentielCode(e.target.value)}
            >
              {referentiels.map((r) => (
                <option key={r.code} value={r.code}>
                  {r.nom}
                </option>
              ))}
            </select>
            {criteres.length > 0 ? (
              <button type="button" className="btn-secondary" onClick={exporter}>
                <Download className="h-4 w-4" aria-hidden />
                Exporter en CSV
              </button>
            ) : null}
          </>
        }
      />

      {erreur ? <Alerte ton="rouge">{erreur}</Alerte> : null}

      {chargement ? (
        <Loader message="Composition du questionnaire…" />
      ) : criteres.length === 0 ? (
        <Vide message="Aucun critère applicable pour ce référentiel." />
      ) : (
        <>
          <Revele>
            <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard libelle="Critères applicables" valeur={questionnaire.nombreCriteres} icone={ListChecks} ton="bleu" />
              {CRITICITES.slice(0, 3).map((criticite) => (
                <StatCard
                  key={criticite}
                  libelle={`Criticité ${criticite.toLowerCase()}`}
                  valeur={criteres.filter((c) => c.criticite === criticite).length}
                  icone={ListChecks}
                  ton={TONS_CRITICITE[criticite]}
                />
              ))}
            </div>
          </Revele>

          <Revele delai={80}>
            <Card className="mb-6">
              <CardHeader titre="Répartition par domaine" sousTitre="Nombre de critères retenus dans chaque domaine" />
              <div className="h-72 p-5">
                <GraphiqueBarres
                  labels={domaines.map((d) => d.code)}
                  series={[{ label: 'Critères', data: domaines.map((d) => d.nombre), couleur: COULEURS.brand }]}
                />
              </div>
            </Card>
          </Revele>

          <Revele delai={120}>
            <Card className="p-0">
              <CardHeader titre="Critères du questionnaire" sousTitre={`${criteresFiltres.length} critère(s) affiché(s)`} />
              <div className="flex items-center gap-2 border-b border-ink-100 px-5 py-3">
                <Search className="h-4 w-4 text-ink-400" aria-hidden />
                <input
                  className="w-full border-none bg-transparent text-sm outline-none placeholder:text-ink-400"
                  placeholder="Rechercher un critère (code, libellé ou domaine)…"
                  value={recherche}
                  onChange={(e) => setRecherche(e.target.value)}
                />
              </div>
              {criteresFiltres.length > 0 ? (
                <Tableau entetes={['Code', 'Critère', 'Domaine', 'Criticité', 'Applicabilité']}>
                  {criteresFiltres.map((c) => (
                    <tr key={c.id} className="transition-colors hover:bg-ink-100/60">
                      <td className="td font-mono text-xs text-ink-500">{c.code}</td>
                      <td className="td max-w-md">
                        <p className="font-medium text-ink-900">{c.libelle}</p>
                        {c.description ? <p className="text-xs text-ink-500">{c.description}</p> : null}
                      </td>
                      <td className="td text-sm text-ink-600">{c.domaineNom}</td>
                      <td className="td">
                        {c.criticite ? <Badge ton={TONS_CRITICITE[c.criticite] ?? 'neutre'}>{c.criticite}</Badge> : '—'}
                      </td>
                      <td className="td text-sm text-ink-600">{c.applicabilite}</td>
                    </tr>
                  ))}
                </Tableau>
              ) : (
                <div className="p-6">
                  <Vide message="Aucun critère ne correspond à cette recherche." />
                </div>
              )}
            </Card>
          </Revele>
        </>
      )}
    </>
  );
}

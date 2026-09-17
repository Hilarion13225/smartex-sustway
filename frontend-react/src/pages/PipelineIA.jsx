import { useCallback, useEffect, useState } from 'react';
import clsx from 'clsx';
import { Link, useParams } from 'react-router-dom';
import { CheckCircle2, Cpu, FileText, HelpCircle, Hourglass } from 'lucide-react';
import Revele from '../components/Revele';
import { Alerte, Card, CardHeader, Loader, PageTitre, StatCard, Tableau, Vide } from '../components/ui';
import { COULEURS, GraphiqueBarres } from '../components/charts';
import Breadcrumb from '../components/Breadcrumb';
import { api, ApiError } from '../lib/apiClient';
import { useApiAuth } from '../auth/useApiAuth';

/**
 * Vue transverse : le pipeline IA multi-agents s'exécute critère par
 * critère, à l'intérieur d'une mission (CritereEvaluation) — il n'y a pas
 * de déclencheur global. Cette page agrège donc l'avancement déjà calculé
 * (endpoint /score de chaque mission) plutôt que de relancer quoi que ce
 * soit, et renvoie vers chaque mission pour la suite du traitement.
 */
export default function PipelineIA() {
  const { entrepriseId } = useParams();
  const { entreprises } = useApiAuth();
  const entreprise = entreprises.find((e) => e.id === entrepriseId);

  const [lignes, setLignes] = useState(null);
  const [nombreDocuments, setNombreDocuments] = useState(0);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState(null);

  const charger = useCallback(async () => {
    setChargement(true);
    setErreur(null);
    try {
      const [audits, documents] = await Promise.all([
        api.get(`/api/v1/entreprises/${entrepriseId}/audits`),
        api.get(`/api/v1/entreprises/${entrepriseId}/documents`).catch(() => []),
      ]);
      const avecScore = await Promise.all(
        audits.map(async (audit) => {
          const score = await api.get(`/api/v1/entreprises/${entrepriseId}/audits/${audit.id}/score`).catch(() => null);
          return { audit, score };
        })
      );
      setLignes(avecScore);
      setNombreDocuments(documents.length);
    } catch (err) {
      // Les deux `.catch` ci-dessus sont des replis voulus : un document
      // illisible ou un score absent ne doit pas emporter la page. Ici, au
      // contraire, c'est la liste des missions elle-même qui manque —
      // rendre `[]` affichait « aucune mission » là où elles existent.
      setErreur(err instanceof ApiError ? err.message : 'Consolidation du pipeline impossible');
    } finally {
      setChargement(false);
    }
  }, [entrepriseId]);

  useEffect(() => {
    charger();
  }, [charger]);

  if (!entreprise) {
    return <Vide message="Organisation introuvable ou non accessible." />;
  }

  // Le repli par mission de la ligne 35 est volontaire : un score
  // indisponible vaut `null` et ne doit pas emporter la page. Mais
  // l'additionner comme un zéro rendait un total silencieusement amputé, et
  // traçait une barre à zéro impossible à distinguer d'une mission
  // réellement non commencée. Ces missions sont donc mises de côté, comptées
  // à part, et annoncées — elles restent visibles dans le tableau avec « — ».
  const lignesAvecScore = (lignes ?? []).filter(({ score }) => score);
  const scoresIndisponibles = (lignes ?? []).length - lignesAvecScore.length;

  const totaux = lignesAvecScore.reduce(
    (acc, { score }) => ({
      total: acc.total + score.nombreCriteresTotal,
      evalues: acc.evalues + score.nombreCriteresEvalues,
      nonEvalues: acc.nonEvalues + score.nombreCriteresNonEvalues,
      // F-08a : compteur servi par l'API et jusqu'ici jamais lu.
      enRevue: acc.enRevue + (score.nombreCriteresEnRevue ?? 0),
    }),
    { total: 0, evalues: 0, nonEvalues: 0, enRevue: 0 }
  );

  return (
    <>
      <Breadcrumb
        elements={[
          entreprises.length > 1 && entreprise
            ? { libelle: entreprise.raisonSociale, vers: `/app/${entrepriseId}` }
            : null,
          { libelle: 'Pipeline IA' },
        ]}
      />
      <PageTitre
        icone={Cpu}
        titre="Pipeline IA"
        description={`${entreprise.raisonSociale} — avancement de l’analyse automatisée (Document → Evidence → Compliance → Scoring), toutes missions confondues.`}
      />

      {erreur ? (
        <div className="mb-6">
          <Alerte ton="rouge">{erreur}</Alerte>
        </div>
      ) : null}

      {chargement ? (
        <Loader message="Consolidation du pipeline…" />
      ) : lignes && lignes.length > 0 ? (
        <>
          <Revele>
            {/* Même échelle que le tableau de bord de mission : deux colonnes
                dès `sm`, trois dès `lg`, et une quatrième ouverte seulement
                quand la vignette de revue est là — sinon elle resterait seule
                sous une rangée de trois. */}
            <div
              className={clsx(
                'mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3',
                totaux.enRevue > 0 && 'xl:grid-cols-4'
              )}
            >
              <StatCard libelle="Documents déposés" valeur={nombreDocuments} icone={FileText} ton="bleu" />
              <StatCard
                libelle="Critères évalués"
                valeur={`${totaux.evalues} / ${totaux.total}`}
                icone={CheckCircle2}
                ton="vert"
              />
              <StatCard libelle="Non évalués" valeur={totaux.nonEvalues} icone={HelpCircle} ton="neutre" />
              {totaux.enRevue > 0 ? (
                <StatCard
                  libelle="En attente de revue"
                  valeur={totaux.enRevue}
                  icone={Hourglass}
                  ton="violet"
                />
              ) : null}
            </div>
          </Revele>

          {scoresIndisponibles > 0 ? (
            <div className="mb-6">
              <Alerte ton="ambre">
                Le score de {scoresIndisponibles} mission
                {scoresIndisponibles > 1 ? 's n’a' : ' n’a'} pas pu être chargé. Ces missions ne sont
                comptées ni dans les totaux ci-dessus ni dans le graphique ; elles figurent dans le
                tableau, avec « — » en place de leurs compteurs.
              </Alerte>
            </div>
          ) : null}

          {/* Le graphique ne trace que ce qui a été mesuré. Une mission dont
              le score manque en est absente plutôt que d'y figurer à zéro :
              une barre vide se lit comme un travail non commencé. */}
          {lignesAvecScore.length > 0 ? (
            <Revele delai={80}>
              <Card className="mb-6">
                <CardHeader
                  titre="Avancement par mission"
                  sousTitre={
                    scoresIndisponibles > 0
                      ? 'Nombre de critères par statut d’évaluation — missions dont le score est disponible'
                      : 'Nombre de critères par statut d’évaluation'
                  }
                />
                <div className="h-72 p-5">
                  <GraphiqueBarres
                    horizontal
                    labels={lignesAvecScore.map(({ audit }) => audit.nom)}
                    series={[
                      { label: 'Évalués', data: lignesAvecScore.map(({ score }) => score.nombreCriteresEvalues), couleur: COULEURS.brand },
                      { label: 'Non évalués', data: lignesAvecScore.map(({ score }) => score.nombreCriteresNonEvalues), couleur: COULEURS.gris },
                    ]}
                  />
                </div>
              </Card>
            </Revele>
          ) : null}

          <Revele delai={120}>
            <Card>
              <Tableau
                entetes={
                  totaux.enRevue > 0
                    ? ['Mission', 'Évalués', 'Non évalués', 'En revue', '']
                    : ['Mission', 'Évalués', 'Non évalués', '']
                }
              >
                {lignes.map(({ audit, score }) => (
                  <tr key={audit.id} className="transition-colors hover:bg-ink-100/60">
                    <td className="td font-medium text-ink-900">{audit.nom}</td>
                    <td className="td">{score ? `${score.nombreCriteresEvalues} / ${score.nombreCriteresTotal}` : '—'}</td>
                    <td className="td">{score?.nombreCriteresNonEvalues ?? '—'}</td>
                    {totaux.enRevue > 0 ? (
                      <td className="td">{score ? score.nombreCriteresEnRevue ?? 0 : '—'}</td>
                    ) : null}
                    <td className="td text-right">
                      <Link to={`/app/${entrepriseId}/audits/${audit.id}`} className="btn-ghost">
                        Ouvrir la mission
                      </Link>
                    </td>
                  </tr>
                ))}
              </Tableau>
            </Card>
          </Revele>
        </>
      ) : erreur ? null : (
        <Vide message="Aucune mission pour l’instant — créez-en une depuis « Missions d’audit »." />
      )}
    </>
  );
}

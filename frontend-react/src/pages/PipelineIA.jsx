import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { CheckCircle2, Cpu, FileText, HelpCircle } from 'lucide-react';
import Revele from '../components/Revele';
import { Card, CardHeader, Loader, PageTitre, StatCard, Tableau, Vide } from '../components/ui';
import { COULEURS, GraphiqueBarres } from '../components/charts';
import { api } from '../lib/apiClient';
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

  const charger = useCallback(async () => {
    setChargement(true);
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
    } catch {
      setLignes([]);
    } finally {
      setChargement(false);
    }
  }, [entrepriseId]);

  useEffect(() => {
    charger();
  }, [charger]);

  if (!entreprise) {
    return <Vide message="Entreprise introuvable ou non accessible." />;
  }

  const totaux = (lignes ?? []).reduce(
    (acc, { score }) => ({
      total: acc.total + (score?.nombreCriteresTotal ?? 0),
      evalues: acc.evalues + (score?.nombreCriteresEvalues ?? 0),
      nonEvalues: acc.nonEvalues + (score?.nombreCriteresNonEvalues ?? 0),
    }),
    { total: 0, evalues: 0, nonEvalues: 0 }
  );

  return (
    <>
      <PageTitre
        icone={Cpu}
        titre="Pipeline IA"
        description={`${entreprise.raisonSociale} — avancement de l’analyse automatisée (Document → Evidence → Compliance → Scoring), toutes missions confondues.`}
      />

      {chargement ? (
        <Loader message="Consolidation du pipeline…" />
      ) : lignes && lignes.length > 0 ? (
        <>
          <Revele>
            <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              <StatCard libelle="Documents déposés" valeur={nombreDocuments} icone={FileText} ton="bleu" />
              <StatCard
                libelle="Critères évalués"
                valeur={`${totaux.evalues} / ${totaux.total}`}
                icone={CheckCircle2}
                ton="vert"
              />
              <StatCard libelle="Non évalués" valeur={totaux.nonEvalues} icone={HelpCircle} ton="neutre" />
            </div>
          </Revele>

          <Revele delai={80}>
            <Card className="mb-6">
              <CardHeader titre="Avancement par mission" sousTitre="Nombre de critères par statut d’évaluation" />
              <div className="h-72 p-5">
                <GraphiqueBarres
                  horizontal
                  labels={lignes.map(({ audit }) => audit.nom)}
                  series={[
                    { label: 'Évalués', data: lignes.map(({ score }) => score?.nombreCriteresEvalues ?? 0), couleur: COULEURS.brand },
                    { label: 'Non évalués', data: lignes.map(({ score }) => score?.nombreCriteresNonEvalues ?? 0), couleur: COULEURS.gris },
                  ]}
                />
              </div>
            </Card>
          </Revele>

          <Revele delai={120}>
            <Card>
              <Tableau entetes={['Mission', 'Évalués', 'Non évalués', '']}>
                {lignes.map(({ audit, score }) => (
                  <tr key={audit.id} className="transition-colors hover:bg-ink-100/60">
                    <td className="td font-medium text-ink-900">{audit.nom}</td>
                    <td className="td">{score ? `${score.nombreCriteresEvalues} / ${score.nombreCriteresTotal}` : '—'}</td>
                    <td className="td">{score?.nombreCriteresNonEvalues ?? '—'}</td>
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
      ) : (
        <Vide message="Aucune mission pour l’instant — créez-en une depuis « Missions d’audit »." />
      )}
    </>
  );
}

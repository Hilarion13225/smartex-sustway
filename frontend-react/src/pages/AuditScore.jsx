import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, Gauge, HelpCircle, TriangleAlert } from 'lucide-react';
import Revele from '../components/Revele';
import { Alerte, Badge, Barre, Card, CardHeader, Loader, PageTitre, StatCard, Vide } from '../components/ui';
import { COULEURS, GraphiqueAnneau, GraphiqueBarres, GraphiqueRadar } from '../components/charts';
import { api } from '../lib/apiClient';
import { formaterScore, valeurScoreAffichee } from '../lib/scoreAffiche';
import { useApiAuth } from '../auth/useApiAuth';

const NIVEAUX_ENGAGEMENT = {
  5: 'Fortement active',
  4: 'Active',
  3: 'Réactive',
  2: 'Hésitante',
  1: 'Totalement inactive',
};

const NIVEAUX_NC = ['CRITIQUE', 'MAJEURE', 'MODEREE', 'MINEURE'];
const COULEURS_NC = [COULEURS.rouge, COULEURS.ambre, '#eab308', COULEURS.gris];

// Couleurs de présentation : les seuils portent sur le score affiché (deux
// décimales, HALF_UP), comme dans les rapports — un « 4.00 » n'est jamais bleu.
function tonScore(score) {
  const valeur = valeurScoreAffichee(score);
  if (valeur >= 4) return 'vert';
  if (valeur >= 3) return 'bleu';
  if (valeur >= 2) return 'ambre';
  return 'rouge';
}

function tonBarre(score) {
  const valeur = valeurScoreAffichee(score);
  if (valeur >= 3) return 'brand';
  if (valeur >= 2) return 'ambre';
  return 'rouge';
}

/** RG32 : agrégation du score global et par domaine d'une mission d'audit. */
export default function AuditScore() {
  const { entrepriseId, auditId } = useParams();
  const { entreprises } = useApiAuth();
  const entreprise = entreprises.find((e) => e.id === entrepriseId);

  const [audit, setAudit] = useState(null);
  const [score, setScore] = useState(null);
  const [nonConformites, setNonConformites] = useState([]);
  const [chargement, setChargement] = useState(true);

  const rafraichir = useCallback(() => {
    setChargement(true);
    Promise.all([
      api.get(`/api/v1/entreprises/${entrepriseId}/audits/${auditId}`),
      api.get(`/api/v1/entreprises/${entrepriseId}/audits/${auditId}/score`),
      api.get(`/api/v1/entreprises/${entrepriseId}/audits/${auditId}/non-conformites`),
    ])
      .then(([a, s, nc]) => {
        setAudit(a);
        setScore(s);
        setNonConformites(nc);
      })
      .catch(() => {
        setAudit(null);
        setScore(null);
        setNonConformites([]);
      })
      .finally(() => setChargement(false));
  }, [entrepriseId, auditId]);

  useEffect(() => {
    rafraichir();
  }, [rafraichir]);

  if (!entreprise) {
    return <Vide message="Entreprise introuvable ou non accessible." />;
  }

  return (
    <>
      <Link to={`/app/${entrepriseId}/audits/${auditId}`} className="btn-ghost mb-4 -ml-2">
        <ArrowLeft className="h-4 w-4" aria-hidden />
        Retour à la mission
      </Link>

      {chargement ? (
        <Loader message="Calcul du score…" />
      ) : !audit || !score ? (
        <Vide message="Score introuvable ou non accessible." />
      ) : (
        <>
          <PageTitre
            icone={Gauge}
            titre={`Tableau de bord — ${audit.nom}`}
            description={`${audit.referentielCode} — score pondéré, calculé sur les critères actifs et applicables de la mission.`}
            actions={<Badge ton="bleu">{audit.statut}</Badge>}
          />

          {score.nombreCriteresEvalues === 0 ? (
            <Alerte ton="ambre">
              Aucun critère n’a encore d’évaluation validée — le score global n’est pas encore représentatif de la
              conformité réelle de l’entreprise.
            </Alerte>
          ) : null}

          <Revele>
            <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <StatCard
                libelle="Score global"
                valeur={score.nombreCriteresEvalues > 0 ? `${formaterScore(score.scoreGlobal)} / 5` : '—'}
                detail="Somme des notes / somme des coefficients"
                icone={Gauge}
                ton={score.nombreCriteresEvalues > 0 ? tonScore(score.scoreGlobal) : 'neutre'}
              />
              <StatCard
                libelle="Critères évalués"
                valeur={`${score.nombreCriteresEvalues} / ${score.nombreCriteresTotal}`}
                detail="Évaluation validée par l’IA"
                icone={CheckCircle2}
                ton="vert"
              />
              <StatCard
                libelle="Non évalués"
                valeur={score.nombreCriteresNonEvalues}
                detail="Aucune évaluation lancée pour l’instant"
                icone={HelpCircle}
                ton="neutre"
              />
            </div>
          </Revele>

          <Revele delai={80}>
            <div className="mb-6 grid gap-6 lg:grid-cols-2">
              <Card>
                <CardHeader titre="Score par domaine" sousTitre="Profil radar sur 5" />
                <div className="h-80 p-5">
                  {score.domaines.some((d) => d.nombreCriteresEvalues > 0) ? (
                    <GraphiqueRadar
                      labels={score.domaines.map((d) => d.domaineCode)}
                      series={[
                        {
                          label: 'Score du domaine',
                          // V74-C3-B11 : un domaine non évalué n'est pas un sommet à zéro.
                          data: score.domaines.map((d) => (d.nombreCriteresEvalues > 0 ? Number(d.score) : null)),
                          format: 'score',
                          couleur: COULEURS.brand,
                          fond: COULEURS.brandClair,
                        },
                      ]}
                    />
                  ) : (
                    <Vide message="Aucune évaluation validée pour l’instant." />
                  )}
                </div>
              </Card>

              <Card>
                <CardHeader titre="Répartition des niveaux d’engagement" sousTitre="Échelle de Likert Smartex, 1 à 5" />
                <div className="h-80 p-5">
                  {score.nombreCriteresEvalues > 0 ? (
                    <GraphiqueBarres
                      horizontal
                      labels={[5, 4, 3, 2, 1].map((niveau) => `${niveau} — ${NIVEAUX_ENGAGEMENT[niveau]}`)}
                      series={[
                        {
                          label: 'Critères',
                          data: [5, 4, 3, 2, 1].map((niveau) => score.repartitionNiveaux[niveau - 1]),
                          couleur: COULEURS.brand,
                        },
                      ]}
                    />
                  ) : (
                    <Vide message="Aucune évaluation validée pour l’instant." />
                  )}
                </div>
              </Card>

              {nonConformites.length > 0 ? (
                <Card className="lg:col-span-2">
                  <CardHeader
                    titre="Non-conformités par niveau"
                    icone={TriangleAlert}
                    sousTitre={`${nonConformites.length} non-conformité${nonConformites.length > 1 ? 's' : ''} détectée${nonConformites.length > 1 ? 's' : ''}`}
                  />
                  <div className="h-72 p-5">
                    <GraphiqueAnneau
                      labels={NIVEAUX_NC}
                      data={NIVEAUX_NC.map((niveau) => nonConformites.filter((nc) => nc.niveau === niveau).length)}
                      couleurs={COULEURS_NC}
                    />
                  </div>
                </Card>
              ) : null}
            </div>
          </Revele>

          <Revele delai={120}>
            <Card>
              <CardHeader titre="Score par domaine — détail" sousTitre="Même méthode de calcul que le score global, restreinte au domaine." />
              {score.domaines.length > 0 ? (
                <div className="divide-y divide-ink-100 px-5">
                  {score.domaines.map((d) => (
                    <div key={d.domaineCode} className="py-4">
                      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <p className="font-medium text-ink-900">{d.domaineNom}</p>
                          <p className="text-xs text-ink-500">
                            {d.domaineCode} — {d.nombreCriteresEvalues} / {d.nombreCriteresTotal} critères évalués
                          </p>
                        </div>
                        <Badge ton={d.nombreCriteresEvalues > 0 ? tonScore(d.score) : 'neutre'}>
                          {d.nombreCriteresEvalues > 0 ? `${formaterScore(d.score)} / 5` : '—'}
                        </Badge>
                      </div>
                      <Barre
                        valeur={d.nombreCriteresEvalues > 0 ? (Number(d.score) / 5) * 100 : 0}
                        ton={d.nombreCriteresEvalues > 0 ? tonBarre(d.score) : undefined}
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-6">
                  <Vide message="Aucun domaine à afficher pour cette mission." />
                </div>
              )}
            </Card>
          </Revele>
        </>
      )}
    </>
  );
}

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Building2,
  ClipboardCheck,
  ClipboardX,
  Download,
  Gauge,
  LayoutDashboard,
  Leaf,
  TriangleAlert,
  UserCheck,
  Wallet,
} from 'lucide-react';
import Revele from '../components/Revele';
import { Alerte, Badge, Barre, Card, CardHeader, Loader, PageTitre, StatCard, Tableau, Vide } from '../components/ui';
import { COULEURS, GraphiqueAnneau, GraphiqueBarres, GraphiqueRadar } from '../components/charts';
import { api } from '../lib/apiClient';
import { useApiAuth } from '../auth/useApiAuth';
import { exporterCsv, formaterDate } from '../lib/export';

const NIVEAUX_ENGAGEMENT = [
  '1 — Totalement inactive',
  '2 — Hésitante',
  '3 — Réactive',
  '4 — Active',
  '5 — Fortement active',
];
const TONS_FORMULE = { FREE: 'neutre', STANDARD: 'bleu', AVANCEES: 'vert' };

const NIVEAUX_NC = ['CRITIQUE', 'MAJEURE', 'MODEREE', 'MINEURE'];
const COULEURS_NC = [COULEURS.rouge, COULEURS.ambre, '#eab308', COULEURS.gris];
const TONS_NIVEAU_NC = { CRITIQUE: 'rouge', MAJEURE: 'ambre', MODEREE: 'bleu', MINEURE: 'neutre' };

function tonScore(score) {
  const valeur = Number(score);
  if (valeur >= 4) return 'vert';
  if (valeur >= 3) return 'bleu';
  if (valeur >= 2) return 'ambre';
  return 'rouge';
}

/**
 * Vue de pilotage consolidée sur l'ensemble du portefeuille accessible au
 * compte connecté : chaque chiffre provient des ressources REST réelles
 * (audits, score RG32, non-conformités RG17, file de revue experte RG16),
 * agrégées côté client faute d'endpoint d'agrégation multi-entreprises.
 */
export default function TableauDeBord() {
  const { entreprises, utilisateur, peut, recupererAbonnement } = useApiAuth();

  const [missions, setMissions] = useState([]);
  const [revues, setRevues] = useState([]);
  const [indices, setIndices] = useState([]);
  const [abonnements, setAbonnements] = useState([]);
  const [chargement, setChargement] = useState(true);

  const charger = useCallback(async () => {
    setChargement(true);

    const parEntreprise = await Promise.all(
      entreprises.map(async (entreprise) => {
        const audits = await api.get(`/api/v1/entreprises/${entreprise.id}/audits`).catch(() => []);
        return Promise.all(
          audits.map(async (audit) => {
            const [score, nonConformites] = await Promise.all([
              api.get(`/api/v1/entreprises/${entreprise.id}/audits/${audit.id}/score`).catch(() => null),
              api.get(`/api/v1/entreprises/${entreprise.id}/audits/${audit.id}/non-conformites`).catch(() => []),
            ]);
            return { entreprise, audit, score, nonConformites };
          })
        );
      })
    );
    const toutesMissions = parEntreprise.flat();
    setMissions(toutesMissions);

    if (peut('revue:traiter')) {
      const files = await Promise.all(
        entreprises.map((entreprise) =>
          api
            .get(`/api/v1/entreprises/${entreprise.id}/revues-expertes`)
            .then((liste) => liste.map((revue) => ({ ...revue, entreprise })))
            .catch(() => [])
        )
      );
      setRevues(files.flat());
    } else {
      setRevues([]);
    }

    // RG41 : réservé à la formule Avancées ET à la permission bailleur:consulter
    // (absente de VISITEUR) — sans ce second filtre, l'appel est tenté quand
    // même et échoue systématiquement en 403 pour ce rôle.
    const missionsAvancees = peut('bailleur:consulter')
      ? toutesMissions.filter((m) => m.audit.formuleCode === 'AVANCEES')
      : [];
    const indicesResultats = await Promise.all(
      missionsAvancees.map((m) =>
        api
          .get(`/api/v1/entreprises/${m.entreprise.id}/audits/${m.audit.id}/indice-preparation`)
          .then((liste) => liste.map((i) => ({ ...i, entreprise: m.entreprise })))
          .catch(() => [])
      )
    );
    setIndices(indicesResultats.flat());

    const abonnementsResultats = await Promise.all(
      entreprises.map((entreprise) =>
        recupererAbonnement(entreprise.id)
          .then((abonnement) => ({ entreprise, abonnement }))
          .catch(() => null)
      )
    );
    setAbonnements(abonnementsResultats.filter(Boolean));

    setChargement(false);
  }, [entreprises, peut, recupererAbonnement]);

  useEffect(() => {
    charger();
  }, [charger]);

  const nonConformites = useMemo(
    () => missions.flatMap((m) => m.nonConformites.map((nc) => ({ ...nc, mission: m }))),
    [missions]
  );

  const ouvertes = nonConformites.filter((nc) => nc.statut !== 'CLOTUREE');

  const missionsNotees = missions.filter((m) => m.score && m.score.nombreCriteresEvalues > 0);
  const scoreMoyen = missionsNotees.length
    ? missionsNotees.reduce((total, m) => total + Number(m.score.scoreGlobal), 0) / missionsNotees.length
    : null;

  const avancement = missions.reduce(
    (total, m) => ({
      evalues: total.evalues + (m.score?.nombreCriteresEvalues ?? 0),
      enRevue: total.enRevue + (m.score?.nombreCriteresEnRevue ?? 0),
      nonEvalues: total.nonEvalues + (m.score?.nombreCriteresNonEvalues ?? 0),
    }),
    { evalues: 0, enRevue: 0, nonEvalues: 0 }
  );

  /** Moyenne par domaine sur toutes les missions ayant au moins une évaluation validée dans ce domaine. */
  const domaines = useMemo(() => {
    const cumul = new Map();
    missionsNotees.forEach((m) => {
      m.score.domaines
        .filter((d) => d.nombreCriteresEvalues > 0)
        .forEach((d) => {
          const courant = cumul.get(d.domaineCode) ?? { nom: d.domaineNom, total: 0, nombre: 0 };
          courant.total += Number(d.score);
          courant.nombre += 1;
          cumul.set(d.domaineCode, courant);
        });
    });
    return [...cumul.entries()].map(([code, valeur]) => ({
      code,
      nom: valeur.nom,
      score: valeur.total / valeur.nombre,
    }));
  }, [missionsNotees]);

  const prioritaires = [...ouvertes]
    .sort((a, b) => Number(b.risqueAttendu ?? 0) - Number(a.risqueAttendu ?? 0))
    .slice(0, 8);

  /** Somme des histogrammes par niveau (1-5) de toutes les missions notées — même donnée que le score, juste sous un autre angle (répartition plutôt que moyenne). */
  const repartitionEngagement = useMemo(() => {
    const total = [0, 0, 0, 0, 0];
    missionsNotees.forEach((m) => {
      (m.score.repartitionNiveaux ?? []).forEach((n, index) => {
        total[index] += n;
      });
    });
    return total;
  }, [missionsNotees]);

  const indiceMoyen = indices.length
    ? indices.reduce((total, i) => total + Number(i.score), 0) / indices.length
    : null;

  /** Score moyen par entreprise — pertinent seulement au-delà d'une seule entreprise (voir gating à l'affichage). */
  const parEntrepriseNotee = useMemo(() => {
    const cumul = new Map();
    missionsNotees.forEach((m) => {
      const courant = cumul.get(m.entreprise.id) ?? { nom: m.entreprise.raisonSociale, total: 0, nombre: 0 };
      courant.total += Number(m.score.scoreGlobal);
      courant.nombre += 1;
      cumul.set(m.entreprise.id, courant);
    });
    return [...cumul.values()].map((v) => ({ nom: v.nom, score: v.total / v.nombre }));
  }, [missionsNotees]);

  function exporter() {
    exporterCsv(
      'tableau-de-bord-smartex-sustway.csv',
      ['Entreprise', 'Mission', 'Référentiel', 'Statut', 'Score global', 'Critères évalués', 'Non-conformités ouvertes'],
      missions.map((m) => [
        m.entreprise.raisonSociale,
        m.audit.nom,
        m.audit.referentielCode,
        m.audit.statut,
        m.score ? Number(m.score.scoreGlobal).toFixed(2) : '—',
        m.score ? `${m.score.nombreCriteresEvalues}/${m.score.nombreCriteresTotal}` : '—',
        m.nonConformites.filter((nc) => nc.statut !== 'CLOTUREE').length,
      ])
    );
  }

  return (
    <>
      <PageTitre
        icone={LayoutDashboard}
        titre={`Tableau de bord${utilisateur ? ` — ${utilisateur.prenom} ${utilisateur.nom}` : ''}`}
        description="Vue consolidée de vos entreprises, de l’avancement des missions d’audit et des écarts à traiter en priorité."
        actions={
          missions.length > 0 ? (
            <button type="button" className="btn-secondary" onClick={exporter}>
              <Download className="h-4 w-4" aria-hidden />
              Exporter en CSV
            </button>
          ) : null
        }
      />

      {chargement ? (
        <Loader message="Consolidation de vos missions…" />
      ) : entreprises.length === 0 ? (
        <Vide message="Aucune entreprise rattachée à votre compte — créez-en une pour démarrer votre première mission d’audit." />
      ) : (
        <>
          <Revele>
            <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <StatCard
                libelle="Entreprises suivies"
                valeur={entreprises.length}
                detail={`${missions.length} mission${missions.length > 1 ? 's' : ''} d’audit`}
                icone={Building2}
                ton="bleu"
              />
              <StatCard
                libelle="Score moyen"
                valeur={scoreMoyen === null ? '—' : `${scoreMoyen.toFixed(2)} / 5`}
                detail="Moyenne des missions déjà notées (RG32)"
                icone={Gauge}
                ton={scoreMoyen === null ? 'neutre' : tonScore(scoreMoyen)}
              />
              <StatCard
                libelle="Non-conformités ouvertes"
                valeur={ouvertes.length}
                detail={`${ouvertes.filter((nc) => nc.niveau === 'CRITIQUE').length} critique(s)`}
                icone={ClipboardX}
                ton={ouvertes.length > 0 ? 'rouge' : 'vert'}
              />
              <StatCard
                libelle="Revues expertes en attente"
                valeur={peut('revue:traiter') ? revues.filter((r) => r.statut === 'EN_ATTENTE').length : '—'}
                detail={
                  peut('revue:traiter')
                    ? 'Confiance IA inférieure à 80 % (RG16)'
                    : 'Réservé aux experts et administrateurs'
                }
                icone={UserCheck}
                ton="ambre"
              />
              {indices.length > 0 ? (
                <StatCard
                  libelle="Indice de préparation IFC/SFI"
                  valeur={`${indiceMoyen.toFixed(2)} / 5`}
                  detail={`Moyenne sur ${indices.length} indice${indices.length > 1 ? 's' : ''} calculé${indices.length > 1 ? 's' : ''} (formule Avancées)`}
                  icone={Leaf}
                  ton={tonScore(indiceMoyen)}
                />
              ) : null}
            </div>
          </Revele>

          {missions.length === 0 ? (
            <Alerte ton="bleu">
              Aucune mission d’audit n’a encore été créée — ouvrez une entreprise pour lancer votre première campagne
              d’évaluation.
            </Alerte>
          ) : (
            <>
              <Revele delai={80}>
                <div className="mb-6 grid gap-6 lg:grid-cols-2">
                  <Card>
                    <CardHeader titre="Profil RSE par domaine" sousTitre="Moyenne des missions notées, sur 5" />
                    <div className="h-80 p-5">
                      {domaines.length > 0 ? (
                        <GraphiqueRadar
                          labels={domaines.map((d) => d.code)}
                          series={[
                            {
                              label: 'Score moyen',
                              data: domaines.map((d) => Number(d.score.toFixed(2))),
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
                    <CardHeader
                      titre="Avancement des évaluations"
                      sousTitre="Répartition des critères de toutes les missions"
                    />
                    <div className="h-80 p-5">
                      <GraphiqueAnneau
                        labels={['Évalués', 'En revue experte', 'Non évalués']}
                        data={[avancement.evalues, avancement.enRevue, avancement.nonEvalues]}
                        couleurs={[COULEURS.brand, COULEURS.ambre, COULEURS.gris]}
                      />
                    </div>
                  </Card>

                  <Card>
                    <CardHeader titre="Score par mission" icone={ClipboardCheck} sousTitre="Score pondéré RG32" />
                    <div className="h-72 p-5">
                      {missionsNotees.length > 0 ? (
                        <GraphiqueBarres
                          horizontal
                          max={5}
                          labels={missionsNotees.map((m) => m.audit.nom)}
                          series={[
                            {
                              label: 'Score global',
                              data: missionsNotees.map((m) => Number(m.score.scoreGlobal)),
                              couleur: COULEURS.bleu,
                            },
                          ]}
                        />
                      ) : (
                        <Vide message="Aucune mission notée pour l’instant." />
                      )}
                    </div>
                  </Card>

                  <Card>
                    <CardHeader
                      titre="Non-conformités par niveau"
                      icone={TriangleAlert}
                      sousTitre={`${ouvertes.length} écart${ouvertes.length > 1 ? 's' : ''} encore ouvert${ouvertes.length > 1 ? 's' : ''}`}
                    />
                    <div className="h-72 p-5">
                      {nonConformites.length > 0 ? (
                        <GraphiqueAnneau
                          labels={NIVEAUX_NC}
                          data={NIVEAUX_NC.map((niveau) => ouvertes.filter((nc) => nc.niveau === niveau).length)}
                          couleurs={COULEURS_NC}
                        />
                      ) : (
                        <Vide message="Aucune non-conformité détectée." />
                      )}
                    </div>
                  </Card>

                  <Card>
                    <CardHeader
                      titre="Répartition des niveaux d’engagement"
                      icone={Gauge}
                      sousTitre="Échelle de Likert 1 à 5, tous critères évalués confondus"
                    />
                    <div className="h-72 p-5">
                      {missionsNotees.length > 0 ? (
                        <GraphiqueBarres
                          horizontal
                          labels={NIVEAUX_ENGAGEMENT}
                          series={[{ label: 'Critères', data: repartitionEngagement, couleur: COULEURS.brand }]}
                        />
                      ) : (
                        <Vide message="Aucune évaluation validée pour l’instant." />
                      )}
                    </div>
                  </Card>

                  {entreprises.length > 1 ? (
                    <Card>
                      <CardHeader
                        titre="Portefeuille d’entreprises"
                        icone={Building2}
                        sousTitre="Score moyen sur 5, une entreprise par barre"
                      />
                      <div className="h-72 p-5">
                        {parEntrepriseNotee.length > 0 ? (
                          <GraphiqueBarres
                            horizontal
                            max={5}
                            labels={parEntrepriseNotee.map((e) => e.nom)}
                            series={[
                              {
                                label: 'Score moyen',
                                data: parEntrepriseNotee.map((e) => Number(e.score.toFixed(2))),
                                couleur: COULEURS.violet,
                              },
                            ]}
                          />
                        ) : (
                          <Vide message="Aucune entreprise notée pour l’instant." />
                        )}
                      </div>
                    </Card>
                  ) : null}
                </div>
              </Revele>

              {entreprises.length > 1 && abonnements.length > 0 ? (
                <Revele delai={100}>
                  <Card className="mb-6 p-0">
                    <CardHeader titre="Abonnements actifs" icone={Wallet} sousTitre="Formule et périodicité de chaque entreprise" />
                    <Tableau entetes={['Entreprise', 'Formule', 'Périodicité', 'Statut']}>
                      {abonnements.map(({ entreprise, abonnement }) => (
                        <tr key={entreprise.id} className="transition-colors hover:bg-ink-50/60">
                          <td className="td">{entreprise.raisonSociale}</td>
                          <td className="td">
                            <Badge ton={TONS_FORMULE[abonnement.formuleCode] ?? 'neutre'}>{abonnement.formuleNom}</Badge>
                          </td>
                          <td className="td text-sm text-ink-600">{abonnement.periodicite ?? '—'}</td>
                          <td className="td">
                            <Badge ton={abonnement.statut === 'ACTIF' ? 'vert' : 'neutre'}>{abonnement.statut}</Badge>
                          </td>
                        </tr>
                      ))}
                    </Tableau>
                  </Card>
                </Revele>
              ) : null}

              <Revele delai={120}>
                <Card className="mb-6 p-0">
                  <CardHeader
                    titre="Missions d’audit"
                    icone={ClipboardCheck}
                    sousTitre="Avancement et score de chaque campagne d’évaluation"
                  />
                  <Tableau entetes={['Entreprise', 'Mission', 'Statut', 'Avancement', 'Score', '']}>
                    {missions.map((m) => (
                      <tr key={m.audit.id} className="transition-colors hover:bg-ink-50/60">
                        <td className="td">{m.entreprise.raisonSociale}</td>
                        <td className="td">
                          <p className="font-medium text-ink-900">{m.audit.nom}</p>
                          <p className="text-xs text-ink-500">
                            {m.audit.referentielCode} — démarrée le {formaterDate(m.audit.dateDebut)}
                          </p>
                        </td>
                        <td className="td">
                          <Badge ton="bleu">{m.audit.statut}</Badge>
                        </td>
                        <td className="td w-48">
                          {m.score ? (
                            <>
                              <Barre
                                valeur={(m.score.nombreCriteresEvalues / Math.max(1, m.score.nombreCriteresTotal)) * 100}
                              />
                              <p className="mt-1 text-xs text-ink-500">
                                {m.score.nombreCriteresEvalues} / {m.score.nombreCriteresTotal} critères évalués
                              </p>
                            </>
                          ) : (
                            '—'
                          )}
                        </td>
                        <td className="td">
                          {m.score && m.score.nombreCriteresEvalues > 0 ? (
                            <Badge ton={tonScore(m.score.scoreGlobal)}>
                              {Number(m.score.scoreGlobal).toFixed(2)} / 5
                            </Badge>
                          ) : (
                            <span className="text-xs text-ink-400">Non notée</span>
                          )}
                        </td>
                        <td className="td text-right">
                          <Link
                            to={`/app/${m.entreprise.id}/audits/${m.audit.id}`}
                            className="btn-ghost whitespace-nowrap"
                          >
                            Ouvrir
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </Tableau>
                </Card>
              </Revele>

              {prioritaires.length > 0 ? (
                <Revele delai={160}>
                  <Card className="p-0">
                    <CardHeader
                      titre="Écarts prioritaires"
                      icone={TriangleAlert}
                      sousTitre="Classés par risque attendu — (1 − probabilité de conformité) × poids de criticité"
                    />
                    <Tableau entetes={['Critère', 'Non-conformité', 'Niveau', 'Risque attendu', 'Actions', '']}>
                      {prioritaires.map((nc) => (
                        <tr key={nc.id} className="transition-colors hover:bg-ink-50/60">
                          <td className="td font-mono text-xs text-ink-500">{nc.critereCode}</td>
                          <td className="td max-w-md">
                            <p className="font-medium text-ink-900">{nc.titre}</p>
                            <p className="text-xs text-ink-500">{nc.mission.entreprise.raisonSociale}</p>
                          </td>
                          <td className="td">
                            <Badge ton={TONS_NIVEAU_NC[nc.niveau] ?? 'neutre'}>{nc.niveau}</Badge>
                          </td>
                          <td className="td">{nc.risqueAttendu === null ? '—' : Number(nc.risqueAttendu).toFixed(2)}</td>
                          <td className="td">{nc.nombreActionsCorrectives}</td>
                          <td className="td text-right">
                            <Link
                              to={`/app/${nc.mission.entreprise.id}/audits/${nc.mission.audit.id}/non-conformites`}
                              className="btn-ghost whitespace-nowrap"
                            >
                              Traiter
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </Tableau>
                  </Card>
                </Revele>
              ) : null}
            </>
          )}
        </>
      )}
    </>
  );
}

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Building2,
  ClipboardList,
  Download,
  FileText,
  FolderOpen,
  Gauge,
  Plus,
  Sparkles,
  TriangleAlert,
} from 'lucide-react';
import Revele from '../components/Revele';
import { Loader } from '../components/ui';
import { COULEURS, GraphiqueAnneau, GraphiqueLigne } from '../components/charts';
import CarteKpi from '../components/tableau-bord/CarteKpi';
import TableMissions from '../components/tableau-bord/TableMissions';
import PanneauAlertes from '../components/tableau-bord/PanneauAlertes';
import PanneauIa from '../components/tableau-bord/PanneauIa';
import FilActivite from '../components/tableau-bord/FilActivite';
import BandeauReprise from '../components/tableau-bord/BandeauReprise';
import { api } from '../lib/apiClient';
import { useApiAuth } from '../auth/useApiAuth';
import { exporterCsv, formaterDate } from '../lib/export';

const MOIS_COURTS = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];

/** Actions du journal d'audit traduites en phrases lisibles. */
const LIBELLES_ACTION = {
  EVALUATION_IA_CREEE: 'Analyse IA d’un critère',
  EVALUATION_EXPERTE_ENREGISTREE: 'Évaluation d’un critère enregistrée',
  REPONSES_CRITERE_ENREGISTREES: 'Réponses au questionnaire enregistrées',
  PREUVE_DEPOSEE: 'Preuve documentaire déposée',
  AUDIT_CREE: 'Mission d’audit créée',
  AUDIT_MODIFIE: 'Mission d’audit modifiée',
  RAPPORT_GENERE: 'Rapport généré',
  INSCRIPTION: 'Création de compte',
  EMAIL_VERIFIE: 'Compte activé',
  CODE_VERIFICATION_REFUSE: 'Code d’activation refusé',
};

/** Point coloré du fil d'activité, selon la nature de l'action. */
function couleurAction(action) {
  if (action.startsWith('EVALUATION_IA')) return 'bg-brand-500';
  if (action.includes('REFUSE') || action.includes('SUPPRIM')) return 'bg-rose-500';
  if (action.includes('RAPPORT')) return 'bg-blue-500';
  return 'bg-emerald-500';
}

/**
 * Vue de pilotage du responsable d'audit : missions demandant une action,
 * risques, avancement, analyses IA puis activité.
 *
 * Chaque chiffre provient des ressources REST réelles (audits, score RG32,
 * non-conformités RG17, historique de score, journal RG15), agrégées côté
 * client faute d'endpoint d'agrégation multi-entreprises.
 */
export default function TableauDeBord() {
  const { entreprises, utilisateur } = useApiAuth();

  const [missions, setMissions] = useState([]);
  const [historique, setHistorique] = useState([]);
  const [journal, setJournal] = useState([]);
  const [chargement, setChargement] = useState(true);

  const charger = useCallback(async () => {
    setChargement(true);

    const parEntreprise = await Promise.all(
      entreprises.map(async (entreprise) => {
        const audits = await api.get(`/api/v1/entreprises/${entreprise.id}/audits`).catch(() => []);
        return Promise.all(
          audits.map(async (audit) => {
            const [score, nonConformites, points] = await Promise.all([
              api.get(`/api/v1/entreprises/${entreprise.id}/audits/${audit.id}/score`).catch(() => null),
              api.get(`/api/v1/entreprises/${entreprise.id}/audits/${audit.id}/non-conformites`).catch(() => []),
              api.get(`/api/v1/entreprises/${entreprise.id}/audits/${audit.id}/score-historique`).catch(() => []),
            ]);
            return { entreprise, audit, score, nonConformites, points };
          })
        );
      })
    );
    const toutes = parEntreprise.flat();
    setMissions(toutes);
    setHistorique(toutes.flatMap((m) => m.points ?? []));

    // Journal de chaque entreprise accessible : le fil d'activité est global,
    // l'API ne l'expose que par entreprise.
    const journaux = await Promise.all(
      entreprises.map((entreprise) =>
        api
          .get(`/api/v1/entreprises/${entreprise.id}/journal`)
          .then((entrees) => (entrees ?? []).map((e) => ({ ...e, entreprise })))
          .catch(() => [])
      )
    );
    setJournal(journaux.flat());

    setChargement(false);
  }, [entreprises]);

  useEffect(() => {
    charger();
  }, [charger]);

  /** Missions ramenées à la forme attendue par le tableau. */
  const missionsVue = useMemo(
    () =>
      missions.map(({ entreprise, audit, score, nonConformites }) => {
        const total = score?.nombreCriteresTotal ?? audit.nombreCriteres ?? 0;
        const evalues = score?.nombreCriteresEvalues ?? 0;
        const critiques = nonConformites.filter((nc) => nc.niveau === 'CRITIQUE').length;
        const majeures = nonConformites.filter((nc) => nc.niveau === 'MAJEURE').length;

        // Le risque se lit sur les non-conformités constatées, pas sur le
        // score : une mission peu avancée mais déjà porteuse d'un écart
        // critique doit remonter en tête.
        let risque = null;
        if (evalues > 0) {
          if (critiques > 0) risque = 'ELEVE';
          else if (majeures > 0) risque = 'MOYEN';
          else risque = 'FAIBLE';
        }

        return {
          id: audit.id,
          organisation: entreprise.raisonSociale ?? entreprise.nom ?? '—',
          nom: audit.nom,
          progression: total > 0 ? Math.round((evalues / total) * 100) : 0,
          // Le score global est noté sur 5 (RG31) : ramené en pourcentage
          // pour tenir dans une colonne aux côtés de la progression.
          conformite:
            score?.scoreGlobal == null ? null : Math.round((Number(score.scoreGlobal) / 5) * 100),
          risque,
          statut: audit.statut,
          echeance: audit.dateFin ? formaterDate(audit.dateFin) : null,
          lien: `/app/${entreprise.id}/audits/${audit.id}`,
          critiques,
          nonEvalues: score?.nombreCriteresNonEvalues ?? Math.max(0, total - evalues),
          evalues,
          total,
        };
      }),
    [missions]
  );

  const kpis = useMemo(() => {
    const actives = missionsVue.filter((m) => m.statut !== 'ARCHIVE');
    const enCours = missionsVue.filter((m) => m.statut === 'EN_COURS');
    const aRisque = missionsVue.filter((m) => m.risque === 'ELEVE');
    const brouillons = missionsVue.filter((m) => m.statut === 'BROUILLON');
    const totalCriteres = missionsVue.reduce((somme, m) => somme + m.total, 0);
    const totalEvalues = missionsVue.reduce((somme, m) => somme + m.evalues, 0);
    return {
      actives: actives.length,
      enCours: enCours.length,
      brouillons: brouillons.length,
      aRisque: aRisque.length,
      completion: totalCriteres > 0 ? Math.round((totalEvalues / totalCriteres) * 100) : 0,
      totalEvalues,
    };
  }, [missionsVue]);

  /** Missions à traiter en premier : risque élevé, puis avancement le plus faible. */
  const missionsPrioritaires = useMemo(() => {
    const rang = { ELEVE: 0, MOYEN: 1, FAIBLE: 2 };
    return [...missionsVue]
      .filter((m) => m.statut !== 'ARCHIVE')
      .sort((a, b) => (rang[a.risque] ?? 3) - (rang[b.risque] ?? 3) || a.progression - b.progression)
      .slice(0, 6);
  }, [missionsVue]);

  const repartitionRisques = useMemo(() => {
    const compte = { ELEVE: 0, MOYEN: 0, FAIBLE: 0, NON_EVALUE: 0 };
    missionsVue.forEach((m) => {
      compte[m.risque ?? 'NON_EVALUE'] += 1;
    });
    return compte;
  }, [missionsVue]);

  /** Moyenne mensuelle du score global sur les six derniers mois. */
  const evolution = useMemo(() => {
    const maintenant = new Date();
    const mois = [];
    for (let recul = 5; recul >= 0; recul -= 1) {
      const date = new Date(maintenant.getFullYear(), maintenant.getMonth() - recul, 1);
      mois.push({ cle: `${date.getFullYear()}-${date.getMonth()}`, libelle: MOIS_COURTS[date.getMonth()] });
    }

    const sommes = new Map();
    historique.forEach((point) => {
      const date = new Date(point.date);
      const cle = `${date.getFullYear()}-${date.getMonth()}`;
      const actuel = sommes.get(cle) ?? { total: 0, nombre: 0 };
      sommes.set(cle, { total: actuel.total + Number(point.scoreGlobal ?? 0), nombre: actuel.nombre + 1 });
    });

    return {
      labels: mois.map((m) => m.libelle),
      // Score sur 5 ramené en pourcentage, comme la colonne « Conformité ».
      valeurs: mois.map((m) => {
        const somme = sommes.get(m.cle);
        return somme ? Math.round((somme.total / somme.nombre / 5) * 100) : null;
      }),
      pointsConnus: historique.length,
    };
  }, [historique]);

  const alertes = useMemo(() => {
    const liste = [];
    const critiques = missionsVue.reduce((somme, m) => somme + m.critiques, 0);
    const missionCritique = missionsVue.find((m) => m.critiques > 0);
    if (critiques > 0) {
      liste.push({
        icone: TriangleAlert,
        ton: 'critique',
        titre: `${critiques} écart${critiques > 1 ? 's' : ''} critique${critiques > 1 ? 's' : ''} détecté${critiques > 1 ? 's' : ''}`,
        detail: `Dont ${missionCritique.critiques} sur « ${missionCritique.nom} » (${missionCritique.organisation}).`,
        lien: `${missionCritique.lien}/non-conformites`,
      });
    }

    const nonEvalues = missionsVue.reduce((somme, m) => somme + m.nonEvalues, 0);
    if (nonEvalues > 0) {
      const laPlusEnRetard = [...missionsVue].sort((a, b) => b.nonEvalues - a.nonEvalues)[0];
      liste.push({
        icone: FolderOpen,
        ton: 'attention',
        titre: `${nonEvalues} critère${nonEvalues > 1 ? 's' : ''} encore à évaluer`,
        detail: `« ${laPlusEnRetard.nom} » en concentre ${laPlusEnRetard.nonEvalues}.`,
        lien: laPlusEnRetard.lien,
      });
    }

    if (kpis.brouillons > 0) {
      liste.push({
        icone: ClipboardList,
        ton: 'information',
        titre: `${kpis.brouillons} mission${kpis.brouillons > 1 ? 's' : ''} en brouillon`,
        detail: 'Ces missions ne sont pas encore lancées et n’entrent dans aucun score.',
      });
    }

    return liste;
  }, [missionsVue, kpis]);

  /** Fil d'activité : les huit dernières entrées du journal, groupées par jour. */
  const groupesActivite = useMemo(() => {
    const recentes = [...journal]
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 8);

    const aujourdhui = new Date().toDateString();
    const hier = new Date(Date.now() - 86400000).toDateString();
    const groupes = new Map();

    recentes.forEach((entree) => {
      const date = new Date(entree.createdAt);
      const jourBrut = date.toDateString();
      const jour =
        jourBrut === aujourdhui ? "Aujourd'hui" : jourBrut === hier ? 'Hier' : formaterDate(entree.createdAt);
      if (!groupes.has(jour)) groupes.set(jour, []);
      groupes.get(jour).push({
        id: entree.id,
        libelle: LIBELLES_ACTION[entree.action] ?? entree.action,
        heure: date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
        auteur: entree.utilisateurNom ?? null,
        couleur: couleurAction(entree.action),
      });
    });

    return [...groupes.entries()].map(([jour, entrees]) => ({ jour, entrees }));
  }, [journal]);

  const metriquesIa = useMemo(() => {
    const analysees = missionsVue.filter((m) => m.evalues > 0).length;
    const ecarts = missionsVue.reduce((somme, m) => somme + m.critiques, 0);
    return [
      { valeur: kpis.totalEvalues, libelle: 'Critères évalués sur le portefeuille' },
      { valeur: analysees, libelle: 'Missions comportant une analyse' },
      { valeur: ecarts, libelle: 'Écarts critiques remontés' },
    ];
  }, [missionsVue, kpis]);

  const premiereEntreprise = entreprises[0]?.id;
  const prenom = utilisateur?.prenom ?? '';

  function exporterMissions() {
    exporterCsv(
      'missions-audit.csv',
      ['Organisation', 'Mission', 'Statut', 'Progression (%)', 'Conformité (%)', 'Risque', 'Échéance'],
      missionsVue.map((m) => [
        m.organisation,
        m.nom,
        m.statut,
        m.progression,
        m.conformite ?? '',
        m.risque ?? '',
        m.echeance ?? '',
      ])
    );
  }

  if (chargement) return <Loader message="Chargement de vos missions…" />;

  return (
    <div className="space-y-6">
      {/* --- Accueil et action principale --- */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-ink-900">Bonjour, {prenom} 👋</h1>
          <p className="mt-1 text-sm text-ink-500">
            Voici la situation actuelle de vos missions d’audit RSE.
          </p>
        </div>
        {premiereEntreprise ? (
          <Link to={`/app/${premiereEntreprise}/audits`} className="btn-primary shrink-0">
            <Plus className="h-4 w-4" aria-hidden />
            Nouvelle mission d’audit
          </Link>
        ) : null}
      </div>

      {/* --- Indicateurs --- */}
      <Revele>
        <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
          <CarteKpi
            icone={Building2}
            ton="marque"
            valeur={kpis.actives}
            libelle="Missions actives"
            precision={`${entreprises.length} organisation${entreprises.length > 1 ? 's' : ''} suivie${entreprises.length > 1 ? 's' : ''}`}
          />
          <CarteKpi
            icone={ClipboardList}
            valeur={kpis.enCours}
            libelle="En cours"
            precision={`${kpis.brouillons} en brouillon`}
          />
          <CarteKpi
            icone={TriangleAlert}
            ton="alerte"
            valeur={kpis.aRisque}
            libelle="À risque"
            precision="Au moins un écart critique"
          />
          <CarteKpi
            icone={Gauge}
            ton="succes"
            valeur={`${kpis.completion}%`}
            libelle="Taux de complétion"
            precision={`${kpis.totalEvalues} critères évalués`}
          />
        </div>
      </Revele>

      {/* --- Missions et alertes --- */}
      <Revele delai={60}>
        <div className="grid gap-5 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          <section className="min-w-0 rounded-2xl border border-ink-100 bg-surface p-5 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-sm font-semibold text-ink-900">Missions à traiter</h2>
              {premiereEntreprise ? (
                <Link
                  to={`/app/${premiereEntreprise}/audits`}
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-600 transition-colors hover:text-brand-700 dark:text-brand-400"
                >
                  Voir toutes
                  <ArrowRight className="h-4 w-4" aria-hidden />
                </Link>
              ) : null}
            </div>
            <p className="mt-0.5 text-xs text-ink-500">
              Classées par niveau de risque, puis par avancement.
            </p>
            <div className="mt-4">
              <TableMissions missions={missionsPrioritaires} compact />
            </div>
          </section>

          <PanneauAlertes alertes={alertes} />
        </div>
      </Revele>

      {/* --- Graphiques --- */}
      <Revele delai={90}>
        <div className="grid gap-5 lg:grid-cols-2">
          <section className="rounded-2xl border border-ink-100 bg-surface p-5 shadow-sm">
            <h2 className="text-sm font-semibold text-ink-900">Évolution des missions</h2>
            <p className="mt-0.5 text-xs text-ink-500">
              Score moyen du portefeuille sur les six derniers mois.
            </p>
            <div className="mt-4 h-64">
              {evolution.pointsConnus === 0 ? (
                <p className="flex h-full items-center justify-center rounded-xl border border-dashed border-ink-200 px-4 text-center text-xs text-ink-500">
                  L’historique se remplit à mesure que les missions sont évaluées.
                </p>
              ) : (
                <GraphiqueLigne
                  labels={evolution.labels}
                  series={[{ label: 'Score moyen (%)', data: evolution.valeurs, couleur: COULEURS.rouge }]}
                />
              )}
            </div>
          </section>

          <section className="rounded-2xl border border-ink-100 bg-surface p-5 shadow-sm">
            <h2 className="text-sm font-semibold text-ink-900">Répartition des risques</h2>
            <p className="mt-0.5 text-xs text-ink-500">
              {missionsVue.length} mission{missionsVue.length > 1 ? 's' : ''} au total.
            </p>
            <div className="mt-4 h-64">
              <GraphiqueAnneau
                labels={['Élevé', 'Moyen', 'Faible', 'Non évalué']}
                data={[
                  repartitionRisques.ELEVE,
                  repartitionRisques.MOYEN,
                  repartitionRisques.FAIBLE,
                  repartitionRisques.NON_EVALUE,
                ]}
                couleurs={[COULEURS.rouge, COULEURS.ambre, COULEURS.vert, COULEURS.gris]}
              />
            </div>
          </section>
        </div>
      </Revele>

      {/* --- Analyse IA et activité --- */}
      <Revele delai={120}>
        <div className="grid gap-5 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
          <PanneauIa
            metriques={metriquesIa}
            lien={premiereEntreprise ? `/app/${premiereEntreprise}/pipeline-ia` : null}
          />

          <section className="rounded-2xl border border-ink-100 bg-surface p-5 shadow-sm">
            <h2 className="text-sm font-semibold text-ink-900">Activité récente</h2>
            <p className="mt-0.5 text-xs text-ink-500">Dernières actions enregistrées au journal.</p>
            <div className="mt-4">
              <FilActivite groupes={groupesActivite} />
            </div>
          </section>
        </div>
      </Revele>

      {/* --- Actions rapides --- */}
      <Revele delai={150}>
        <div className="flex flex-wrap gap-3">
          {premiereEntreprise ? (
            <>
              <Link to={`/app/${premiereEntreprise}/audits`} className="btn-primary">
                <Plus className="h-4 w-4" aria-hidden />
                Nouvelle mission d’audit
              </Link>
              <Link to="/app/entreprises" className="btn-secondary">
                <Building2 className="h-4 w-4" aria-hidden />
                Gérer les organisations
              </Link>
              <Link to={`/app/${premiereEntreprise}/rapports`} className="btn-secondary">
                <FileText className="h-4 w-4" aria-hidden />
                Rapports RSE
              </Link>
            </>
          ) : null}
          <button type="button" onClick={exporterMissions} className="btn-secondary">
            <Download className="h-4 w-4" aria-hidden />
            Exporter les missions
          </button>
        </div>
      </Revele>

      <Revele delai={180}>
        <BandeauReprise />
      </Revele>
    </div>
  );
}

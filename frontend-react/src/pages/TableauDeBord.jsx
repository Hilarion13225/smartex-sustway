import { useEffect, useMemo, useState } from 'react';
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
  Target,
  TriangleAlert,
} from 'lucide-react';
import Revele from '../components/Revele';
import { Card, Loader } from '../components/ui';
import { COULEURS, GraphiqueAnneau, GraphiqueLigne } from '../components/charts';
import CarteKpi from '../components/tableau-bord/CarteKpi';
import TableMissions from '../components/tableau-bord/TableMissions';
import PanneauAlertes from '../components/tableau-bord/PanneauAlertes';
import PanneauIa from '../components/tableau-bord/PanneauIa';
import FilActivite from '../components/tableau-bord/FilActivite';
import BandeauReprise from '../components/tableau-bord/BandeauReprise';
import { useApiAuth } from '../auth/useApiAuth';
import { ROLES_ADMINISTRATION_ENTREPRISE, ROLES_SUPERVISION } from '../auth/permissions';
import {
  aTraiterEnPremier,
  parOrganisation,
  usePortefeuille,
  vueDesMissions,
} from '../lib/portefeuille';
import { listerMesActions } from '../lib/plansAction';
import { exporterCsv, formaterDate } from '../lib/export';
import { formaterScore } from '../lib/scoreAffiche';

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

/**
 * Quotient de deux sommes exprimées en centièmes entiers, arrondi à quatre
 * décimales HALF_UP — la règle de ScoringEngine.ponderation — et rendu en
 * écriture décimale, pour qu'aucune division flottante ne s'interpose avant
 * formaterScore. Les produits restent des entiers exacts aux ordres de
 * grandeur d'un portefeuille ; le reste corrige un éventuel écart d'une unité
 * de la division flottante qui sert d'estimation.
 */
function quotientQuatreDecimales(numerateur, denominateur) {
  const echelle = numerateur * 10000;
  let quotient = Math.floor(echelle / denominateur);
  let reste = echelle - quotient * denominateur;
  if (reste < 0) {
    quotient -= 1;
    reste += denominateur;
  } else if (reste >= denominateur) {
    quotient += 1;
    reste -= denominateur;
  }
  if (reste * 2 >= denominateur) quotient += 1;
  return `${Math.floor(quotient / 10000)}.${String(quotient % 10000).padStart(4, '0')}`;
}

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
  const { entreprises, utilisateur, peut, roleCourant } = useApiAuth();
  // Même permission que la page des missions : proposer une création à qui
  // ne peut pas créer donne un raccourci qui mène à une impasse.
  //
  // La formule est celle de l'organisation vers laquelle le raccourci pointe
  // — `entreprises[0]`, la même que `premiereEntreprise` plus bas, dont
  // chaque usage de cette permission dépend. Cette page est multi-organisations,
  // mais le lien, lui, en vise une seule : c'est sa formule qui décide, comme
  // le fait déjà AuditsListe une fois la page ouverte.
  //
  // L'omettre reviendrait à replier sur FREE (voir permissions.js) et à
  // masquer le raccourci pour tout le monde. Le backend reste l'autorité :
  // ce contrôle n'évite qu'un aller-retour vers un bouton absent.
  const peutCreerMission = peut('audit:creer', entreprises[0]?.formuleCode);
  // Miroir d'AutorisationService.ROLES_ADMINISTRATION_ENTREPRISE, seule
  // famille de rôles à laquelle l'API ouvre le journal d'audit.
  const peutLireLeJournal = ROLES_ADMINISTRATION_ENTREPRISE.has(roleCourant);

  const superviseur = ROLES_SUPERVISION.has(roleCourant);
  const collaborateur = roleCourant === 'COLLABORATEUR';
  const plusieursOrganisations = superviseur || entreprises.length > 1;

  // La collecte vit dans `lib/portefeuille.js` : le classement, la comparaison
  // et l'en-tête en ont besoin aussi, et trois copies de la même boucle
  // finissaient par rendre des chiffres qui ne concordaient plus.
  const { missions, historique, journal, chargement } = usePortefeuille(entreprises, {
    avecJournal: peutLireLeJournal,
  });

  /**
   * Synthèse des plans d'amélioration, toutes missions confondues.
   *
   * `progression` vient du serveur pour chaque plan : on n'en fait que la
   * moyenne. Recalculer un avancement ici créerait une seconde vérité.
   */
  const syntheseePlans = useMemo(() => {
    const plans = missions.flatMap((m) => m.plans ?? []);
    if (plans.length === 0) return { total: 0, actifs: 0, avancement: 0 };
    const somme = plans.reduce((t, p) => t + (p.progression ?? 0), 0);
    return {
      total: plans.length,
      actifs: plans.filter((p) => p.statut === 'ACTIF').length,
      avancement: Math.round(somme / plans.length),
    };
  }, [missions]);

  // La mise en forme des missions vit dans `lib/portefeuille.js`, avec la
  // collecte : la liste des organisations lit les mêmes champs.
  const missionsVue = useMemo(() => vueDesMissions(missions), [missions]);

  // Le portefeuille vu organisation par organisation — l'axe de lecture d'un
  // superviseur, qui ne pilote pas des missions en vrac.
  const lignesPortefeuille = useMemo(
    () => parOrganisation(entreprises, missionsVue),
    [entreprises, missionsVue]
  );
  const aTraiter = useMemo(() => aTraiterEnPremier(lignesPortefeuille), [lignesPortefeuille]);

  const kpis = useMemo(() => {
    // `statut_audit` vaut BROUILLON, EN_COURS, TERMINE ou ANNULE : une mission
    // n'est jamais ARCHIVE — ce filtre-là n'écartait rien, et une mission
    // annulée comptait parmi les actives.
    const actives = missionsVue.filter((m) => m.statut !== 'ANNULE');
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

  /**
   * Consolidation du portefeuille, lue comme la grille d'évaluation : somme
   * des notes obtenues, somme des coefficients, et leur quotient. Le score du
   * portefeuille n'est donc pas la moyenne des scores de mission — une
   * mission de quatre-vingt-douze critères y pèse plus qu'une de seize.
   */
  const consolide = useMemo(() => {
    const notees = missionsVue.filter((m) => m.noteTotale != null && Number(m.coefficientTotal) > 0);
    const note = notees.reduce((somme, m) => somme + Number(m.noteTotale), 0);
    const coefficient = notees.reduce((somme, m) => somme + Number(m.coefficientTotal), 0);
    // V74-C3-B6 : le score se calcule sur les sommes en centièmes entiers. Le
    // quotient flottant des sommes affichait parfois un centième de moins que
    // le moteur (601 / 200 : « 3.00 » au lieu de 3.01).
    const noteCentiemes = notees.reduce((somme, m) => somme + Math.round(Number(m.noteTotale) * 100), 0);
    const coefficientCentiemes = notees.reduce((somme, m) => somme + Math.round(Number(m.coefficientTotal) * 100), 0);
    return {
      missions: notees.length,
      note,
      coefficient,
      score: coefficientCentiemes > 0 ? quotientQuatreDecimales(noteCentiemes, coefficientCentiemes) : null,
    };
  }, [missionsVue]);

  /** Missions à traiter en premier : risque élevé, puis avancement le plus faible. */
  const missionsPrioritaires = useMemo(() => {
    const rang = { ELEVE: 0, MOYEN: 1, FAIBLE: 2 };
    return [...missionsVue]
      .filter((m) => m.statut !== 'ANNULE')
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
      {
        valeur: kpis.totalEvalues,
        // « Portefeuille » ne veut rien dire pour qui suit une seule
        // organisation, et encore moins pour qui y execute des taches.
        libelle: plusieursOrganisations ? 'Critères évalués sur le portefeuille' : 'Critères évalués',
      },
      { valeur: analysees, libelle: 'Missions comportant une analyse' },
      { valeur: ecarts, libelle: 'Écarts critiques remontés' },
    ];
  }, [missionsVue, kpis, plusieursOrganisations]);


  /**
   * Les actions affectees a la personne connectee.
   *
   * Meme source que sa page dediee : `listerMesActions` filtre sur l'identite
   * du jeton, rien n'est trie ni choisi ici. Le chargement n'a lieu que pour
   * le role qui affiche le bloc — les autres n'emettent aucune requete.
   */
  const [mesActions, setMesActions] = useState([]);
  useEffect(() => {
    if (!collaborateur) return undefined;
    let annule = false;
    Promise.all(
      entreprises.map((e) => listerMesActions(e.id).catch(() => []))
    ).then((listes) => {
      if (!annule) setMesActions(listes.flat());
    });
    return () => {
      annule = true;
    };
  }, [collaborateur, entreprises]);

  // En retard d'abord, puis par echeance la plus proche. Une action sans
  // echeance ferme la marche : rien ne dit qu'elle presse.
  const actionsATraiter = useMemo(() => {
    const ouvertes = mesActions.filter((a) => a.statut === 'OUVERTE' || a.statut === 'EN_COURS');
    return [...ouvertes]
      .sort((a, b) => {
        if (a.enRetard !== b.enRetard) return a.enRetard ? -1 : 1;
        if (!a.dateEcheance) return 1;
        if (!b.dateEcheance) return -1;
        return a.dateEcheance.localeCompare(b.dateEcheance);
      })
      .slice(0, 5);
  }, [mesActions]);
  /**
   * L'organisation vers laquelle pointent les raccourcis — et seulement pour
   * un compte client, qui travaille dans la sienne.
   *
   * Dix liens de cette page visaient `entreprises[0]` : un superviseur qui
   * cliquait « Nouvelle mission d'audit » la créait dans une organisation
   * choisie à sa place, jamais nommée à l'écran. C'est le même défaut que
   * celui corrigé dans la barre latérale. Ici, il suffit que la valeur soit
   * nulle : chacun de ces liens est déjà conditionné par elle, et le bloc
   * « À traiter » donne au superviseur le choix explicite qui manquait.
   */
  const premiereEntreprise = superviseur ? null : entreprises[0]?.id;
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
          {/* Convention P4.3 : H1 = 20 px / 600, comme `PageTitre`. Cet en-tete
              reprend la meme structure (titre + description) sans passer par le
              composant ; il en suit donc aussi la taille. */}
          <h1 className="text-xl font-semibold text-ink-900">Bonjour, {prenom} 👋</h1>
          {/* Un superviseur ne regarde pas « ses » missions mais celles de ses
              organisations clientes : le dire autrement lui faisait lire un
              écran qui n'était pas le sien. */}
          <p className="mt-1 text-sm text-ink-500">
            {plusieursOrganisations
              ? `Votre portefeuille : ${entreprises.length} organisation${entreprises.length > 1 ? 's' : ''} suivie${entreprises.length > 1 ? 's' : ''}.`
              : 'Voici la situation actuelle de vos missions d’audit RSE, ESG & DD.'}
          </p>
        </div>
        {/* Le raccourci annonce une création : ne le proposer qu'à qui peut
            réellement créer une mission. Un collaborateur, qui ne porte pas
            audit:creer, arrivait sur la liste sans y trouver le bouton
            promis (voir AuditsListe, qui applique déjà cette permission). */}
        {premiereEntreprise && peutCreerMission ? (
          <Link to={`/app/${premiereEntreprise}/audits`} className="btn-primary shrink-0">
            <Plus className="h-4 w-4" aria-hidden />
            Nouvelle mission d’audit
          </Link>
        ) : null}
      </div>

      {/* Pour un superviseur, l'unité de travail est l'organisation, pas la
          mission : c'est elle qu'il ouvre, elle dont il répond. Ce bloc vient
          en premier pour la même raison que les alertes précèdent les
          indicateurs — il porte des liens vers l'endroit où agir. */}
      {/* Ce que la personne doit faire vient avant ce qu'elle doit savoir.
          Le collaborateur voyait cinq indicateurs de pilotage et la notation
          consolidee, mais pas une seule des actions qui lui sont affectees. */}
      {collaborateur ? <MesActionsDuJour actions={actionsATraiter} entreprises={entreprises} /> : null}

      {/* Le besoin ne tient pas au role mais au nombre d'organisations : un
          responsable qui en gere plusieurs cherche la meme chose qu'un
          superviseur — laquelle demande un geste. C'est d'ailleurs pourquoi
          « Comparer les organisations » figure dans sa navigation. */}
      {plusieursOrganisations ? (
        <OrganisationsATraiter bilan={aTraiter} total={lignesPortefeuille.length} />
      ) : null}

      {/* Ce que l’utilisateur doit traiter vient avant ce qu’il doit
          savoir : les alertes portent des liens vers l’écran où agir, les
          indicateurs ne portent qu’un état. Elles étaient jusqu’ici sous
          les compteurs et les graphiques, c’est-à-dire hors du premier
          écran. */}
      {/* --- Missions et alertes --- */}
      <Revele>
        <div className="grid gap-5 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          <Card className="min-w-0 p-5">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-base font-semibold text-ink-900">Missions à traiter</h2>
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
              <TableMissions
                missions={missionsPrioritaires}
                compact
                // « Voir toutes » mène à une liste vide tant qu'aucune mission
                // n'existe : c'est la seule situation où ce panneau doit
                // ouvrir le parcours plutôt que le résumer.
                action={
                  premiereEntreprise && peutCreerMission ? (
                    <Link to={`/app/${premiereEntreprise}/audits`} className="btn-primary">
                      Créer la première mission
                    </Link>
                  ) : null
                }
              />
            </div>
          </Card>

          <PanneauAlertes alertes={alertes} />
        </div>
      </Revele>

      {/* --- Indicateurs --- */}
      <Revele delai={60}>
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
          <CarteKpi
            icone={Target}
            ton="neutre"
            valeur={syntheseePlans.total}
            libelle="Plans d’amélioration"
            precision={
              syntheseePlans.total === 0
                ? 'Aucun plan en cours'
                : `${syntheseePlans.actifs} actif(s) · ${syntheseePlans.avancement}% d’avancement`
            }
          />
        </div>
      </Revele>

      {/* --- Consolidation du portefeuille --- */}
      {consolide.missions > 0 ? (
        <Revele delai={30}>
          <Card className="p-5">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="text-base font-semibold text-ink-900">Notation consolidée</h2>
              <p className="text-xs text-ink-500">
                Sur {consolide.missions} mission{consolide.missions > 1 ? 's' : ''} évaluée
                {consolide.missions > 1 ? 's' : ''}
              </p>
            </div>
            <dl className="mt-4 grid grid-cols-3 gap-3 sm:gap-4">
              <div className="rounded-xl border border-ink-100 p-4">
                <dd className="text-2xl font-bold tabular-nums text-ink-900">
                  {consolide.note.toFixed(0)}
                </dd>
                <dt className="mt-1 text-xs text-ink-500">Note totale</dt>
              </div>
              <div className="rounded-xl border border-ink-100 p-4">
                <dd className="text-2xl font-bold tabular-nums text-ink-900">
                  {consolide.coefficient.toFixed(0)}
                </dd>
                <dt className="mt-1 text-xs text-ink-500">Coefficient total</dt>
              </div>
              <div className="rounded-xl border border-brand-100 bg-brand-50 p-4 dark:border-brand-500/20 dark:bg-brand-500/10">
                <dd className="text-2xl font-bold tabular-nums text-brand-700 dark:text-brand-300">
                  {consolide.score == null ? '—' : formaterScore(consolide.score)}
                </dd>
                <dt className="mt-1 text-xs text-brand-700/80 dark:text-brand-300/80">Score / 5</dt>
              </div>
            </dl>
            <p className="mt-3 text-xs text-ink-500">
              Le score du portefeuille est le quotient des deux sommes, non la moyenne des scores de
              mission : une mission de quatre-vingt-douze critères y pèse plus qu'une de seize.
            </p>
          </Card>
        </Revele>
      ) : null}

      {/* --- Graphiques --- */}
      <Revele delai={90}>
        <div className="grid gap-5 lg:grid-cols-2">
          <Card className="p-5">
            <h2 className="text-base font-semibold text-ink-900">Évolution des missions</h2>
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
          </Card>

          <Card className="p-5">
            <h2 className="text-base font-semibold text-ink-900">Répartition des risques</h2>
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
          </Card>
        </div>
      </Revele>

      {/* --- Analyse IA et activité --- */}
      <Revele delai={120}>
        <div className="grid gap-5 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
          <PanneauIa
            metriques={metriquesIa}
            // Le Pipeline IA a ete retire de la navigation du collaborateur :
            // l'y renvoyer depuis l'accueil rouvrirait par la fenetre ce que
            // le menu ferme. Les trois compteurs restent, ce sont des
            // resultats, pas du raisonnement.
            lien={premiereEntreprise && !collaborateur ? `/app/${premiereEntreprise}/pipeline-ia` : null}
          />

          <Card className="p-5">
            <h2 className="text-base font-semibold text-ink-900">Activité récente</h2>
            <p className="mt-0.5 text-xs text-ink-500">Dernières actions enregistrées au journal.</p>
            <div className="mt-4">
              <FilActivite groupes={groupesActivite} />
            </div>
          </Card>
        </div>
      </Revele>

      {/* --- Actions rapides --- */}
      <Revele delai={150}>
        <div className="flex flex-wrap gap-3">
          {premiereEntreprise ? (
            <>
              {peutCreerMission ? (
                <Link to={`/app/${premiereEntreprise}/audits`} className="btn-primary">
                  <Plus className="h-4 w-4" aria-hidden />
                  Nouvelle mission d’audit
                </Link>
              ) : (
                <Link to={`/app/${premiereEntreprise}/audits`} className="btn-primary">
                  <ClipboardList className="h-4 w-4" aria-hidden />
                  Mes missions
                </Link>
              )}
              {peutCreerMission ? (
                <Link to="/app/entreprises" className="btn-secondary">
                  <Building2 className="h-4 w-4" aria-hidden />
                  Gérer les organisations
                </Link>
              ) : null}
              <Link to={`/app/${premiereEntreprise}/rapports`} className="btn-secondary">
                <FileText className="h-4 w-4" aria-hidden />
                Rapports RSE, ESG & DD
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

/**
 * Les organisations qui demandent une intervention, en premier.
 *
 * Un superviseur ne pilote pas des missions en vrac : il répond
 * d'organisations, dont certaines vont mal et la plupart n'appellent rien.
 * Le bloc ne montre donc que celles qui appellent quelque chose.
 *
 * « Aucune mission ouverte » se compte, ne se liste pas : sur le portefeuille
 * réel, ce cas remplissait huit lignes identiques et repoussait le reste hors
 * de vue. Une phrase le dit, le portefeuille complet est à un clic.
 */
function OrganisationsATraiter({ bilan, total }) {
  const { urgentes, reste, sansMission } = bilan;
  const rienASignaler = urgentes.length === 0;

  return (
    <Revele>
      <Card className="p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-base font-semibold text-ink-900">À traiter</h2>
          <Link
            to="/app/entreprises"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-600 transition-colors hover:text-brand-700 dark:text-brand-400"
          >
            Tout le portefeuille
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        </div>

        {rienASignaler ? (
          <p className="mt-4 rounded-xl border border-dashed border-ink-200 px-4 py-8 text-center text-sm text-ink-500">
            {total === 0
              ? 'Aucune organisation dans le portefeuille pour l’instant.'
              : 'Aucun écart critique, aucune mission en attente de validation.'}
          </p>
        ) : (
          <ul className="mt-4 space-y-2">
            {urgentes.map((l) => (
              <li key={l.entreprise.id}>
                <Link
                  to={`/app/${l.entreprise.id}`}
                  className="group flex flex-wrap items-center gap-x-4 gap-y-1 rounded-xl border border-ink-200 px-4 py-3 transition-colors hover:border-brand-300 hover:bg-ink-50"
                >
                  <span className="min-w-0 flex-1 truncate text-sm font-medium text-ink-900">
                    {l.entreprise.raisonSociale}
                  </span>

                  {/* Chaque motif est nommé : « 3 » seul ne dit pas de quoi il
                      s'agit, et c'est le motif qui décide du geste. */}
                  {l.critiques > 0 ? (
                    <span className="inline-flex items-center gap-1.5 text-sm font-medium text-rose-700">
                      <TriangleAlert className="h-4 w-4" aria-hidden />
                      {l.critiques} écart{l.critiques > 1 ? 's' : ''} critique{l.critiques > 1 ? 's' : ''}
                    </span>
                  ) : null}
                  {l.aValider > 0 ? (
                    <span className="text-sm font-medium text-amber-700">
                      {l.aValider} mission{l.aValider > 1 ? 's' : ''} à valider
                    </span>
                  ) : null}

                  <ArrowRight
                    className="h-4 w-4 shrink-0 text-ink-300 transition-transform group-hover:translate-x-1 group-hover:text-brand-600"
                    aria-hidden
                  />
                </Link>
              </li>
            ))}
          </ul>
        )}

        {reste > 0 || sansMission > 0 ? (
          <p className="mt-3 text-xs text-ink-500">
            {reste > 0
              ? `${reste} autre${reste > 1 ? 's' : ''} organisation${reste > 1 ? 's' : ''} signalée${reste > 1 ? 's' : ''}. `
              : ''}
            {sansMission > 0
              ? `${sansMission} organisation${sansMission > 1 ? 's' : ''} sans mission ouverte.`
              : ''}
          </p>
        ) : null}
      </Card>
    </Revele>
  );
}

function MesActionsDuJour({ actions, entreprises }) {
  const premiere = entreprises[0]?.id;
  return (
    <Revele>
      <Card className="p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-base font-semibold text-ink-900">Mes actions</h2>
          {premiere ? (
            <Link
              to={`/app/${premiere}/mes-actions`}
              className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-600 transition-colors hover:text-brand-700 dark:text-brand-400"
            >
              Toutes mes actions
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          ) : null}
        </div>

        {actions.length === 0 ? (
          <p className="mt-4 rounded-xl border border-dashed border-ink-200 px-4 py-8 text-center text-sm text-ink-500">
            Aucune action ne vous est affectée pour l’instant.
          </p>
        ) : (
          <ul className="mt-4 space-y-2">
            {actions.map((action) => (
              <li
                key={action.id}
                className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-xl border border-ink-200 px-4 py-3"
              >
                <span className="min-w-0 flex-1 truncate text-sm font-medium text-ink-900">
                  {action.titre}
                </span>
                {action.planTitre ? (
                  <span className="truncate text-xs text-ink-500">{action.planTitre}</span>
                ) : null}
                {/* Le retard se lit sans avoir à comparer une date à celle du
                    jour : c'est lui qui décide de l'ordre de la liste. */}
                {action.enRetard ? (
                  <span className="inline-flex items-center gap-1.5 text-sm font-medium text-rose-700">
                    <TriangleAlert className="h-4 w-4" aria-hidden />
                    En retard
                  </span>
                ) : action.dateEcheance ? (
                  <span className="text-sm text-ink-500">
                    Pour le {formaterDate(action.dateEcheance)}
                  </span>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </Card>
    </Revele>
  );
}

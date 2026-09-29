import { useEffect, useMemo, useState } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import {
  ArrowRight,
  ClipboardList,
  Download,
  FolderOpen,
  Gauge,
  Plus,
  TriangleAlert,
} from 'lucide-react';
import Revele from '../components/Revele';
import { Card, Loader } from '../components/ui';
import { COULEURS, GraphiqueAnneau, GraphiqueLigne, useCouleursRisque } from '../components/charts';
import CarteKpi from '../components/tableau-bord/CarteKpi';
import TableMissions from '../components/tableau-bord/TableMissions';
import PanneauAlertes from '../components/tableau-bord/PanneauAlertes';
import PanneauIa from '../components/tableau-bord/PanneauIa';
import FilActivite from '../components/tableau-bord/FilActivite';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
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
  const { entreprises: toutesEntreprises, utilisateur, peut, roleCourant } = useApiAuth();
  const { entrepriseCouranteId } = useOutletContext() ?? {};
  const couleursRisque = useCouleursRisque();

  const superviseur = ROLES_SUPERVISION.has(roleCourant);
  const collaborateur = roleCourant === 'COLLABORATEUR';

  // Quand une organisation est choisie dans la sidebar, le tableau de bord
  // se concentre dessus. Un superviseur ou un compte multi-organisations
  // sans selection voit le portefeuille entier.
  const entreprises = useMemo(() => {
    if (!entrepriseCouranteId) return toutesEntreprises;
    const trouvee = toutesEntreprises.filter((e) => e.id === entrepriseCouranteId);
    return trouvee.length > 0 ? trouvee : toutesEntreprises;
  }, [toutesEntreprises, entrepriseCouranteId]);

  const plusieursOrganisations = superviseur || toutesEntreprises.length > 1;

  const peutCreerMission = peut("audit:creer", entreprises[0]?.formuleCode);
  const peutLireLeJournal = ROLES_ADMINISTRATION_ENTREPRISE.has(roleCourant);

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
      /*
       * Les mois qui portent une valeur, et non le nombre de releves.
       *
       * Une courbe demande deux points pour montrer une evolution. Avec un
       * seul, le graphique tracait un point isole sur six mois vides : une
       * ligne qui n'existe pas, et une echelle verticale calee sur une seule
       * valeur. `historique.length` ne le disait pas — dix releves du meme mois
       * n'en font qu'un sur cette courbe.
       */
      moisRenseignes: mois.filter((m) => sommes.has(m.cle)).length,
      dernierScore: (() => {
        const dernier = [...mois].reverse().find((m) => sommes.has(m.cle));
        if (!dernier) return null;
        const somme = sommes.get(dernier.cle);
        return { mois: dernier.libelle, valeur: Math.round((somme.total / somme.nombre / 5) * 100) };
      })(),
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
        titre: `${nonEvalues} critère${nonEvalues > 1 ? 's' : ''} sans note`,
        detail: `« ${laPlusEnRetard.nom} » en concentre ${laPlusEnRetard.nonEvalues} — repondus ou non, ils n’entrent pas encore dans le score.`,
        // Vers les criteres, et non vers la vue d'ensemble de la mission :
        // l'alerte nomme un travail, elle doit ouvrir l'ecran ou il se fait.
        // C'est possible depuis que l'onglet vit dans l'URL (voir AuditDetail).
        lien: `${laPlusEnRetard.lien}?onglet=criteres`,
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

  /**
   * Fil d'activité : les huit dernières entrées du journal, groupées par jour.
   *
   * Les evenements d'authentification en sont retires. Le panneau annonce
   * « dernieres actions enregistrees » et affichait trois CONNEXION_REUSSIE
   * d'affilee : une trace technique, utile au journal d'audit — ou elle reste —
   * mais qui chasse du tableau de bord les depots de preuve, les evaluations et
   * les clotures, c'est-a-dire ce qui avance reellement.
   *
   * Filtre sur le prefixe plutot que sur une liste fermee : un
   * CONNEXION_ECHOUEE ou un DECONNEXION a venir serait du meme bruit ici.
   */
  const groupesActivite = useMemo(() => {
    const recentes = [...journal]
      .filter((entree) => !/^(CONNEXION|DECONNEXION|AUTH)/i.test(entree.action ?? ''))
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
        libelle: plusieursOrganisations
          ? 'Critères analysés sur le portefeuille'
          : 'Critères analysés',
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
    <div className="space-y-5">
      {/* --- Accueil et action principale --- */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          {/* Convention P4.3 : H1 = 20 px / 600, comme `PageTitre`. Cet en-tete
              reprend la meme structure (titre + description) sans passer par le
              composant ; il en suit donc aussi la taille. */}
          <h1 className="text-xl font-semibold text-ink-900">Bonjour, {prenom}</h1>
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

      {/* --- Score et indicateurs --- */}
      <Revele>
        <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
          <ResumeScore
            consolide={consolide}
            kpis={kpis}
            evolution={evolution}
            syntheseePlans={syntheseePlans}
            premiereEntreprise={premiereEntreprise}
          />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
            <CarteKpi
              icone={ClipboardList}
              valeur={kpis.enCours}
              libelle="Missions en cours"
              vers={premiereEntreprise ? `/app/${premiereEntreprise}/audits` : null}
              precision={kpis.actives + " active" + (kpis.actives > 1 ? "s" : "") + " \u00b7 " + kpis.brouillons + " en brouillon"}
            />
            <CarteKpi
              icone={TriangleAlert}
              ton="alerte"
              valeur={kpis.aRisque}
              libelle="\u00c0 risque"
              vers={premiereEntreprise ? `/app/${premiereEntreprise}/non-conformites` : null}
              precision="Au moins un \u00e9cart critique"
            />
            <CarteKpi
              icone={Gauge}
              ton="succes"
              valeur={`${kpis.completion}%`}
              libelle="Taux d\u2019analyse"
              ratio={kpis.completion}
              precision={kpis.totalEvalues + " crit\u00e8re" + (kpis.totalEvalues > 1 ? "s" : "") + " analys\u00e9" + (kpis.totalEvalues > 1 ? "s" : "") + " par l\u2019IA"}
            />
          </div>
        </div>
      </Revele>

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
              <h2 className="font-display text-base font-semibold text-ink-900">Missions à traiter</h2>
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

      {/* --- Graphiques --- */}
      <Revele delai={60}>
        <div className="grid gap-5 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
          <Card className="p-5">
            <h2 className="font-display text-base font-semibold text-ink-900">Évolution du score</h2>
            <p className="mt-0.5 text-xs text-ink-500">
              Score moyen du portefeuille sur les six derniers mois.
            </p>
            <div className="mt-4 h-64">
              {evolution.moisRenseignes === 0 ? (
                <p className="flex h-full items-center justify-center rounded-xl border border-dashed border-ink-200 px-4 text-center text-xs text-ink-500">
                  L’historique se remplit à mesure que les missions sont évaluées.
                </p>
              ) : evolution.moisRenseignes === 1 ? (
                <div className="flex h-full flex-col items-center justify-center rounded-xl border border-dashed border-ink-200 px-4 text-center">
                  <p className="text-3xl font-bold tabular-nums text-ink-900">
                    {evolution.dernierScore?.valeur}&nbsp;%
                  </p>
                  <p className="mt-1 text-xs text-ink-500">
                    Score moyen en {evolution.dernierScore?.mois}
                  </p>
                  <p className="mt-3 max-w-xs text-xs text-ink-500">
                    Un seul mois renseigné — la courbe apparaîtra au second relevé.
                  </p>
                </div>
              ) : (
                <GraphiqueLigne
                  labels={evolution.labels}
                  series={[{ label: "Score moyen (%)", data: evolution.valeurs, couleur: COULEURS.rouge }]}
                />
              )}
            </div>
          </Card>

          <div className="space-y-5">
            <Card className="p-5">
              <h2 className="font-display text-base font-semibold text-ink-900">Risques</h2>
              <p className="mt-0.5 text-xs text-ink-500">
                {missionsVue.length} mission{missionsVue.length > 1 ? "s" : ""} au total.
              </p>
              <div className="mt-4 h-48">
                <GraphiqueAnneau
                  labels={["\u00c9lev\u00e9", "Moyen", "Faible", "Non \u00e9valu\u00e9"]}
                  data={[
                    repartitionRisques.ELEVE,
                    repartitionRisques.MOYEN,
                    repartitionRisques.FAIBLE,
                    repartitionRisques.NON_EVALUE,
                  ]}
                  couleurs={[
                    couleursRisque.eleve,
                    couleursRisque.moyen,
                    couleursRisque.faible,
                    couleursRisque.nonEvalue,
                  ]}
                />
              </div>
            </Card>

            <PanneauIa
              metriques={metriquesIa}
              lien={premiereEntreprise && !collaborateur ? `/app/${premiereEntreprise}/pipeline-ia` : null}
            />
          </div>
        </div>
      </Revele>

      {/* --- Activité récente --- */}
      {peutLireLeJournal && groupesActivite.length > 0 ? (
        <Revele delai={90}>
          <Card className="p-5">
            <h2 className="font-display text-base font-semibold text-ink-900">Activité récente</h2>
            <p className="mt-0.5 text-xs text-ink-500">Dernières actions enregistrées au journal.</p>
            <div className="mt-4">
              <FilActivite groupes={groupesActivite} />
            </div>
          </Card>
        </Revele>
      ) : null}

      {/* --- Export --- */}
      {missionsVue.length > 0 ? (
        <div className="flex justify-end">
          <button type="button" onClick={exporterMissions} className="btn-secondary">
            <Download className="h-4 w-4" aria-hidden />
            Exporter les missions
          </button>
        </div>
      ) : null}
    </div>
  );
}

/**
 * Score global du portefeuille : la mesure que le produit vend.
 *
 * Ce bloc remplace à la fois l'ancien CarteKpi « Score global » et la section
 * « Notation consolidée » — l'information n'est plus dite deux fois, et le
 * chiffre principal occupe la place qu'il mérite sur le premier écran.
 */
function ResumeScore({ consolide, kpis, evolution, syntheseePlans, premiereEntreprise }) {
  const aucuneNote = consolide.score == null;
  const provisoire = !aucuneNote && kpis.completion < 50;

  // Tendance : comparer le dernier mois renseigné au précédent.
  const tendance = (() => {
    if (!evolution || evolution.moisRenseignes < 2) return null;
    const valeurs = evolution.valeurs.filter((v) => v != null);
    if (valeurs.length < 2) return null;
    const dernier = valeurs[valeurs.length - 1];
    const precedent = valeurs[valeurs.length - 2];
    const delta = dernier - precedent;
    if (delta > 0) return { icone: TrendingUp, signe: "+", valeur: delta, couleur: "text-emerald-300" };
    if (delta < 0) return { icone: TrendingDown, signe: "", valeur: delta, couleur: "text-rose-300" };
    return { icone: Minus, signe: "", valeur: 0, couleur: "text-white/50" };
  })();

  return (
    <div className="flex flex-col justify-between rounded-2xl bg-brand-700 p-5 shadow-sm sm:p-6">
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-white/65">
          {provisoire ? "Score global (provisoire)" : "Score global"}
        </p>
        <div className="mt-3 flex items-baseline gap-3">
          <p className="text-4xl font-bold tabular-nums text-white sm:text-5xl">
            {aucuneNote ? "\u2014" : formaterScore(consolide.score)}
          </p>
          <span className="text-lg font-normal text-white/50">/ 5</span>
          {tendance && tendance.valeur !== 0 ? (
            <span className={`ml-auto flex items-center gap-1 text-sm font-medium ${tendance.couleur}`}>
              <tendance.icone className="h-4 w-4" aria-hidden />
              {tendance.signe}{Math.abs(tendance.valeur)}%
            </span>
          ) : null}
        </div>
      </div>

      <div className="mt-5 space-y-3">
        {/* Jauge de couverture */}
        {!aucuneNote ? (
          <div>
            <div className="flex items-center justify-between text-xs text-white/60">
              <span>Périmètre analysé</span>
              <span className="tabular-nums">{kpis.completion}%</span>
            </div>
            <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-white/15">
              <div
                className="h-full rounded-full bg-white/80 transition-[width] duration-700 ease-out"
                style={{ width: `${kpis.completion}%` }}
              />
            </div>
          </div>
        ) : null}

        <div className="flex flex-wrap gap-x-5 gap-y-1 text-xs text-white/55">
          {aucuneNote ? (
            <span>Aucune mission notée pour l'instant</span>
          ) : (
            <>
              <span className="tabular-nums">
                {consolide.missions}{" mission"}{consolide.missions > 1 ? "s" : ""}{" \u00e9valu\u00e9e"}{consolide.missions > 1 ? "s" : ""}
              </span>
              {syntheseePlans.actifs > 0 ? (
                <span className="tabular-nums">
                  {syntheseePlans.actifs} plan{syntheseePlans.actifs > 1 ? "s" : ""} actif{syntheseePlans.actifs > 1 ? "s" : ""}
                  {premiereEntreprise ? (
                    <Link
                      to={`/app/${premiereEntreprise}/plans`}
                      className="ml-1 text-white/70 underline underline-offset-2 transition-colors hover:text-white"
                    >
                      voir
                    </Link>
                  ) : null}
                </span>
              ) : null}
            </>
          )}
        </div>
      </div>
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
          /*
           * Rien a signaler n'est pas rien a faire.
           *
           * Ce bloc ouvre le tableau de bord et occupait 196 px pour annoncer
           * une absence, pendant que la seule information actionnable de la
           * carte — les organisations qui n'ont pas encore de mission — etait
           * reléguee en gris sous le bloc. Elle remonte ici, avec le geste
           * qu'elle appelle.
           *
           * Trois cas, du plus vide au plus sain : aucune organisation, des
           * organisations sans mission, et enfin le portefeuille qui tourne —
           * seul ce dernier ne propose rien, parce qu'il n'y a rien a faire.
           */
          <div className="mt-4 flex flex-col items-center gap-3 rounded-xl border border-dashed border-ink-200 px-4 py-8 text-center">
            <p className="text-sm text-ink-500">
              {total === 0
                ? 'Aucune organisation dans le portefeuille pour l’instant.'
                : sansMission > 0
                  ? `Aucun écart critique ni mission à valider. ${sansMission} organisation${sansMission > 1 ? 's' : ''} n’${sansMission > 1 ? 'ont' : 'a'} pas encore de mission ouverte.`
                  : 'Aucun écart critique, aucune mission en attente de validation.'}
            </p>
            {total === 0 ? (
              <Link to="/app/entreprises" className="btn-secondary">
                Ajouter une organisation
              </Link>
            ) : sansMission > 0 ? (
              <Link to="/app/entreprises" className="btn-secondary">
                Ouvrir une mission
              </Link>
            ) : null}
          </div>
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
            {/* Repetee seulement quand le bloc ne l'a pas dite : au-dessus,
                l'etat vide la porte deja, avec le geste qui va avec. */}
            {sansMission > 0 && !rienASignaler
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


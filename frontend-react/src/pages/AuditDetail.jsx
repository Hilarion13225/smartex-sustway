import { useCallback, useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { ArrowRight, ClipboardCheck, ClipboardX, FileText, Gauge, Leaf, MapPin } from 'lucide-react';
import Breadcrumb from '../components/Breadcrumb';
import Revele from '../components/Revele';
import SaisieCritereMission from '../components/audit/SaisieCritereMission';
import SyntheseMission from '../components/audit/SyntheseMission';
import OngletsMission from '../components/audit/OngletsMission';
import VoletAnalysesIa from '../components/audit/VoletAnalysesIa';
import VoletPreuves from '../components/audit/VoletPreuves';
import VoletPlanAction from '../components/audit/VoletPlanAction';
import VoletPlansMission from '../components/audit/VoletPlansMission';
import { Alerte, Badge, Card, CardHeader, Loader, PageTitre, Vide } from '../components/ui';
import { api, ApiError } from '../lib/apiClient';
import { formaterScore } from '../lib/scoreAffiche';
import { useApiAuth } from '../auth/useApiAuth';
import { estDansPerimetre, estRenseigne } from '../components/audit/statutsCritere';
import ClotureMission from '../components/audit/ClotureMission';



/**
 * Personnel interne Smartex — il pilote les missions mais ne remplit pas le
 * questionnaire à la place de l'organisation auditée (même liste que
 * AutorisationService.ROLES_INTERNES_SMARTEX côté API).
 */
const ROLES_INTERNES_SMARTEX = new Set(['SUPER_ADMIN']);

const ONGLETS = [
  { cle: 'synthese', libelle: 'Vue d’ensemble' },
  { cle: 'domaines', libelle: 'Domaines' },
  { cle: 'criteres', libelle: 'Critères' },
  { cle: 'preuves', libelle: 'Preuves' },
  { cle: 'analyses', libelle: 'Analyses IA' },
  // « Actions correctives » et non « Plan d'action » : ce volet traite les
  // écarts constatés (non-conformités). Les plans d'amélioration, construits
  // à partir des axes validés, vivent sous /app/:entreprise/plans.
  { cle: 'plan', libelle: 'Actions correctives' },
  { cle: 'plans', libelle: 'Plans d’amélioration' },
];

/**
 * Domaines de la mission : score obtenu et avancement de la collecte.
 *
 * Les compteurs viennent des critères déjà chargés par la page ; le score,
 * lui, n'existe que pour les domaines comportant au moins une évaluation.
 */
function VoletDomaines({ score, criteres, surOuvrir }) {
  const parDomaine = new Map();
  // RG35 : un critère non applicable ou retiré du périmètre ne compte pas dans
  // le total du domaine, comme dans le score.
  criteres.filter(estDansPerimetre).forEach((critere) => {
    const actuel = parDomaine.get(critere.domaineCode) ?? { total: 0, evalues: 0 };
    actuel.total += 1;
    // Ce compteur suit la collecte : un critère déclaré est renseigné, même
    // s'il attend encore l'analyse qui lui donnera sa note.
    if (estRenseigne(critere)) actuel.evalues += 1;
    parDomaine.set(critere.domaineCode, actuel);
  });

  const scores = new Map((score?.domaines ?? []).map((d) => [d.domaineCode, d]));
  const lignes = [...parDomaine.entries()].map(([code, compteurs]) => ({
    code,
    nom: scores.get(code)?.domaineNom ?? code,
    // V74-C3-B11 : un domaine sans critère évalué n'a pas de score, et non un score nul.
    score: scores.get(code)?.nombreCriteresEvalues > 0 ? scores.get(code).score : null,
    ...compteurs,
  }));

  if (lignes.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed border-ink-200 px-4 py-10 text-center text-sm text-ink-500">
        Aucun domaine sur cette mission.
      </p>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {lignes.map((ligne) => {
        const avancement = ligne.total > 0 ? Math.round((ligne.evalues / ligne.total) * 100) : 0;
        return (
          <Card
            key={ligne.code}
            className="p-0"
          >
            {/* La carte ouvre la saisie sur son domaine. Elle annoncait
                « 0 / 25 criteres evalues » sans mener nulle part : il fallait
                ouvrir l'onglet des criteres, puis retrouver le domaine dans une
                grille de quatre-vingt-douze codes. */}
            <button
              type="button"
              onClick={() => surOuvrir?.(ligne.code)}
              className="group w-full rounded-2xl p-5 text-left transition-colors hover:bg-ink-50 dark:hover:bg-white/5"
            >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="truncate text-sm font-semibold text-ink-900" title={ligne.nom}>
                  {ligne.nom}
                </h3>
                <p className="mt-0.5 font-mono text-xs text-ink-400">{ligne.code}</p>
              </div>
              <span className="shrink-0 text-sm font-semibold tabular-nums text-ink-900">
                {ligne.score == null ? '—' : `${formaterScore(ligne.score)} / 5`}
              </span>
            </div>
            <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-ink-100">
              <div
                className="h-full rounded-full bg-brand-600 transition-[width] duration-500"
                style={{ width: `${avancement}%` }}
              />
            </div>
            <p className="mt-2 flex items-center gap-1.5 text-xs text-ink-500">
              {ligne.evalues} / {ligne.total} critères évalués
              <ArrowRight
                className="h-3.5 w-3.5 text-ink-300 transition-transform group-hover:translate-x-0.5 group-hover:text-brand-600"
                aria-hidden
              />
            </p>
            </button>
          </Card>
        );
      })}
    </div>
  );
}

/** RG34/RG35 : questionnaire figé de la mission — liste des critères à évaluer. */
export default function AuditDetail() {
  const { entrepriseId, auditId } = useParams();
  const { entreprises, peut, roleCourant } = useApiAuth();
  const entreprise = entreprises.find((e) => e.id === entrepriseId);

  const [audit, setAudit] = useState(null);
  const [criteres, setCriteres] = useState(null);
  const [score, setScore] = useState(null);
  const [nonConformites, setNonConformites] = useState([]);
  const [chargement, setChargement] = useState(true);
  /*
   * L'onglet vit dans l'URL, et non dans un etat local.
   *
   * Il y vivait, et rien ne pouvait donc pointer vers le travail a faire :
   * l'alerte « 119 criteres encore a evaluer » du tableau de bord ne savait
   * mener qu'a la mission, qui ouvre sur sa vue d'ensemble. Il fallait
   * retrouver l'onglet a la main, et le retrouver encore apres chaque
   * rechargement, qui ramenait a « Vue d'ensemble ».
   *
   * Dans l'URL, un lien peut viser l'onglet, le retour du navigateur y revient,
   * et une adresse partagee rouvre l'ecran ou on l'a laisse. Un onglet inconnu
   * retombe sur la vue d'ensemble plutot que d'afficher du vide.
   *
   * `replace` : changer d'onglet n'empile pas d'entree dans l'historique, sans
   * quoi le retour rejouerait chaque onglet visite au lieu de quitter la page.
   */
  const [parametres, definirParametres] = useSearchParams();
  const ongletDemande = parametres.get('onglet');
  // Domaine par lequel ouvrir la saisie, pose par les cartes de l'onglet
  // « Domaines ». Dans l'URL comme l'onglet, pour la meme raison : un lien
  // doit pouvoir viser le travail, pas seulement l'ecran qui le contient.
  const domaineDemande = parametres.get('domaine');
  const onglet = ONGLETS.some((o) => o.cle === ongletDemande) ? ongletDemande : 'synthese';
  const setOnglet = useCallback(
    (cle) => {
      const suite = new URLSearchParams(parametres);
      if (cle === 'synthese') suite.delete('onglet');
      else suite.set('onglet', cle);
      definirParametres(suite, { replace: true });
    },
    [parametres, definirParametres]
  );

  const [sitesEntreprise, setSitesEntreprise] = useState([]);
  const [sitesAudit, setSitesAudit] = useState([]);
  const [selectionSites, setSelectionSites] = useState([]);
  const [sauvegardeSitesEnCours, setSauvegardeSitesEnCours] = useState(false);

  const [erreurSites, setErreurSites] = useState(null);

  /**
   * `silencieux` recharge les données sans repasser la page en écran de
   * chargement : celui-ci démonte toute la mission, ce qui ferait perdre à la
   * saisie de critère son état (critère courant, commentaire en cours). Il est
   * réservé au premier affichage, où il n'y a encore rien à préserver.
   */
  const rafraichir = useCallback((silencieux = false) => {
    if (!silencieux) setChargement(true);
    Promise.all([
      api.get(`/api/v1/entreprises/${entrepriseId}/audits/${auditId}`),
      api.get(`/api/v1/entreprises/${entrepriseId}/audits/${auditId}/criteres`),
      api.get(`/api/v1/entreprises/${entrepriseId}/sites`),
      api.get(`/api/v1/entreprises/${entrepriseId}/audits/${auditId}/sites`),
      api.get(`/api/v1/entreprises/${entrepriseId}/audits/${auditId}/score`).catch(() => null),
      api.get(`/api/v1/entreprises/${entrepriseId}/audits/${auditId}/non-conformites`).catch(() => []),
    ])
      .then(([a, c, se, sa, sc, nc]) => {
        setAudit(a);
        setCriteres(c);
        setScore(sc);
        setNonConformites(nc ?? []);
        setSitesEntreprise(se.filter((s) => s.statut === 'ACTIF'));
        setSitesAudit(sa);
        setSelectionSites(sa.map((s) => s.id));
      })
      .catch(() => {
        setAudit(null);
        setCriteres([]);
      })
      .finally(() => setChargement(false));
  }, [entrepriseId, auditId]);

  useEffect(() => {
    rafraichir();
  }, [rafraichir]);

  const rafraichirSilencieux = useCallback(() => rafraichir(true), [rafraichir]);

  const peutModifier = peut('audit:modifier', audit?.formuleCode);
  // Trois capacités distinctes depuis V42 : modifier une mission, exécuter
  // le pipeline, clôturer. Le collaborateur n'a aucune des deux dernières,
  // et l'API le refuse aussi — ce masquage n'est qu'une commodité.
  const peutAnalyser = peut('analyse:executer', audit?.formuleCode);
  const peutCloturer = peut('audit:cloturer', audit?.formuleCode);
  /*
   * L'indice de preparation bailleur est reserve a la formule Avancees
   * (RG39-RG43). Le lien s'affichait sans condition : sur une organisation en
   * STANDARD, il menait a un 403, et l'ecran repondait « Audit introuvable ou
   * non accessible » — un message faux, l'audit existant parfaitement.
   * Meme permission que « Financements verts » dans la barre laterale.
   */
  const peutVoirIndice = peut('bailleur:consulter', audit?.formuleCode);

  /** Ouvre la saisie sur le premier critere d'un domaine. */
  const ouvrirDomaine = useCallback(
    (codeDomaine) => {
      const suite = new URLSearchParams(parametres);
      suite.set('onglet', 'criteres');
      suite.set('domaine', codeDomaine);
      definirParametres(suite);
    },
    [parametres, definirParametres]
  );

  // Le responsable audit supervise, il ne remplit pas le questionnaire :
  // déclarer un niveau et déposer une preuve appartiennent à l'organisation
  // auditée, l'analyse revient à l'IA. Il conserve en revanche tout le reste
  // du pilotage de la mission — périmètre de sites, lancement de l'analyse,
  // lecture des déclarations et des preuves.
  const peutSaisirLesCriteres = peutModifier && !ROLES_INTERNES_SMARTEX.has(roleCourant);

  // Même règle que le tableau de bord et la liste des missions : le risque se
  // lit sur les écarts constatés, pas sur le score.
  const risqueGlobal = (() => {
    if ((score?.nombreCriteresEvalues ?? 0) === 0) return null;
    if (nonConformites.some((nc) => nc.niveau === 'CRITIQUE')) return 'ELEVE';
    if (nonConformites.some((nc) => nc.niveau === 'MAJEURE')) return 'MOYEN';
    return 'FAIBLE';
  })();

  function basculerSite(siteId) {
    setSelectionSites((prec) => (prec.includes(siteId) ? prec.filter((id) => id !== siteId) : [...prec, siteId]));
  }

  async function enregistrerSites() {
    setErreurSites(null);
    setSauvegardeSitesEnCours(true);
    try {
      const sites = await api.put(`/api/v1/entreprises/${entrepriseId}/audits/${auditId}/sites`, {
        siteIds: selectionSites,
      });
      setSitesAudit(sites);
    } catch (err) {
      setErreurSites(err instanceof ApiError ? err.message : 'Erreur inattendue');
    } finally {
      setSauvegardeSitesEnCours(false);
    }
  }

  // RG34/RG35 : deux volets — un critère non évalué reste le travail à
  // faire, un critère évalué devient une trace de ce qui a déjà été traité ;
  // les mélanger dans une seule liste noyait l'un dans l'autre dès que la
  // mission avançait.


  if (!entreprise) {
    return <Vide message="Organisation introuvable ou non accessible." />;
  }

  return (
    <>
      {chargement ? (
        <Loader message="Chargement de la mission…" />
      ) : !audit ? (
        <Vide message="Audit introuvable ou non accessible." />
      ) : (
        <>
          <Breadcrumb
            elements={[
              entreprises.length > 1 && entreprise
                ? { libelle: entreprise.raisonSociale, vers: `/app/${entrepriseId}` }
                : null,
              { libelle: 'Missions', vers: `/app/${entrepriseId}/audits` },
              { libelle: audit.nom },
            ]}
          />

          <PageTitre
            icone={ClipboardCheck}
            titre={audit.nom}
            description={`${audit.referentielCode} — ${audit.nombreCriteres} critères — début le ${audit.dateDebut}`}
            actions={<Badge ton="bleu">{audit.statut}</Badge>}
          />

          {/*
           * Les resultats de la mission, nommes comme tels.
           *
           * Ces quatre liens etaient poses dans le titre, a cote du statut, et
           * ne se distinguaient en rien des sept onglets juste dessous : onze
           * destinations sur la meme mission, reparties entre deux mecanismes
           * sans qu'aucun libelle ne dise pourquoi. Leurs routes sont pourtant
           * toutes bornees a la mission, comme les onglets — la portee ne les
           * separait pas.
           *
           * Ce qui les separe est leur nature : les onglets portent le travail
           * — saisir, prouver, analyser, traiter — et ceux-ci ce qui en sort.
           * L'intitule le dit, et la barre le montre en les tenant ensemble.
           */}
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-ink-500">Résultats</span>
            <div className="flex flex-wrap items-center gap-2">
              <Link to={`/app/${entrepriseId}/audits/${auditId}/score`} className="btn-secondary">
                <Gauge className="h-4 w-4" aria-hidden />
                Score
              </Link>
              <Link to={`/app/${entrepriseId}/audits/${auditId}/non-conformites`} className="btn-secondary">
                <ClipboardX className="h-4 w-4" aria-hidden />
                Non-conformités
              </Link>
              <Link to={`/app/${entrepriseId}/audits/${auditId}/rapports`} className="btn-secondary">
                <FileText className="h-4 w-4" aria-hidden />
                Rapports
              </Link>
              {peutVoirIndice ? (
                <Link to={`/app/${entrepriseId}/audits/${auditId}/indice-preparation`} className="btn-secondary">
                  <Leaf className="h-4 w-4" aria-hidden />
                  Indice IFC/SFI
                </Link>
              ) : null}
            </div>
          </div>

          {erreurSites ? <Alerte ton="rouge">{erreurSites}</Alerte> : null}

          <Revele>
            <OngletsMission
              onglets={ONGLETS.map((o) =>
                o.cle === 'criteres' ? { ...o, compteur: criteres?.length ?? 0 } : o
              )}
              actif={onglet}
              surChangement={setOnglet}
            />
          </Revele>

          <div className="mt-5">
            {onglet === 'synthese' ? (
              <div className="space-y-5">
                <SyntheseMission
                  score={score}
                  risque={risqueGlobal}
                  criteresTotal={score?.nombreCriteresTotal ?? audit.nombreCriteres ?? 0}
                  criteresEvalues={score?.nombreCriteresEvalues ?? 0}
                />

                {/* Fin de mission en deux gestes séparés : analyser fait
                    travailler les agents, clôturer fige le score. Chaque bloc
                    n'apparaît qu'à qui détient la permission correspondante. */}
                {peutAnalyser || peutCloturer ? (
                  <div className="lg:max-w-xl">
                    <ClotureMission
                      entrepriseId={entrepriseId}
                      auditId={auditId}
                      statut={audit.statut}
                      renseignes={(criteres ?? []).filter(estDansPerimetre).filter(estRenseigne).length}
                      total={(criteres ?? []).filter(estDansPerimetre).length}
                      peutAnalyser={peutAnalyser}
                      peutCloturer={peutCloturer}
                      surTermine={rafraichirSilencieux}
                    />
                  </div>
                ) : null}
              <div className="lg:max-w-xl">
              <Card className="p-5">
                <CardHeader titre="Sites de la mission" sousTitre="Sites de l'organisation couverts par cette mission." icone={MapPin} />
                {sitesEntreprise.length === 0 ? (
                  <div className="mt-3">
                    <p className="text-sm text-ink-500">
                      Aucun site actif pour cette organisation — la mission porte sur l'organisation entière.
                    </p>
                    {peutModifier ? (
                      <Link to={`/app/${entrepriseId}`} className="btn-secondary mt-3">
                        <MapPin className="h-4 w-4" aria-hidden />
                        Ajouter un site à l'organisation
                      </Link>
                    ) : null}
                  </div>
                ) : (
                  <>
                    <div className="mt-3 space-y-2">
                      {sitesEntreprise.map((s) => (
                        <label key={s.id} className="flex items-center gap-2 text-sm text-ink-700">
                          <input
                            type="checkbox"
                            checked={selectionSites.includes(s.id)}
                            disabled={!peutModifier}
                            onChange={() => basculerSite(s.id)}
                          />
                          {s.nom}
                          {s.ville ? <span className="text-ink-400">— {s.ville}</span> : null}
                        </label>
                      ))}
                    </div>
                    {peutModifier ? (
                      <button
                        type="button"
                        className="btn-secondary mt-4"
                        disabled={sauvegardeSitesEnCours}
                        onClick={enregistrerSites}
                      >
                        Enregistrer les sites
                      </button>
                    ) : null}
                    {!peutModifier && sitesAudit.length === 0 ? (
                      <p className="mt-3 text-xs text-ink-500">Aucun site sélectionné — la mission porte sur l'organisation entière.</p>
                    ) : null}
                  </>
                )}
              </Card>
            </div>
              </div>
            ) : null}

            {onglet === 'domaines' ? (
              <VoletDomaines score={score} criteres={criteres ?? []} surOuvrir={ouvrirDomaine} />
            ) : null}

            {onglet === 'criteres' ? (
              <SaisieCritereMission
                entrepriseId={entrepriseId}
                auditId={auditId}
                criteres={criteres ?? []}
                peutSaisir={peutSaisirLesCriteres}
                peutAnalyser={peutAnalyser}
                surChangement={rafraichirSilencieux}
                domaineInitial={domaineDemande}
              />
            ) : null}

            {onglet === 'plans' ? (
              <VoletPlansMission entrepriseId={entrepriseId} auditId={auditId} />
            ) : null}

            {onglet === 'preuves' ? (
              <VoletPreuves entrepriseId={entrepriseId} auditId={auditId} />
            ) : null}

            {onglet === 'analyses' ? (
              <VoletAnalysesIa
                entrepriseId={entrepriseId}
                auditId={auditId}
                criteres={criteres ?? []}
              />
            ) : null}

            {onglet === 'plan' ? (
              <VoletPlanAction
                entrepriseId={entrepriseId}
                auditId={auditId}
                criteres={criteres ?? []}
                score={score}
                peutModifier={peutModifier}
              />
            ) : null}
          </div>
        </>
      )}
    </>
  );
}

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, ClipboardCheck, ClipboardX, FileText, Gauge, Leaf, MapPin } from 'lucide-react';
import Revele from '../components/Revele';
import SaisieCritereMission from '../components/audit/SaisieCritereMission';
import SyntheseMission from '../components/audit/SyntheseMission';
import OngletsMission from '../components/audit/OngletsMission';
import VoletAnalysesIa from '../components/audit/VoletAnalysesIa';
import VoletPreuves from '../components/audit/VoletPreuves';
import VoletPlanAction from '../components/audit/VoletPlanAction';
import { Alerte, Badge, Card, CardHeader, Loader, PageTitre, Vide } from '../components/ui';
import { api, ApiError } from '../lib/apiClient';
import { useApiAuth } from '../auth/useApiAuth';
import { estAnalyse, estRenseigne } from '../components/audit/statutsCritere';
import ClotureMission from '../components/audit/ClotureMission';



/**
 * Personnel interne Smartex — il pilote les missions mais ne remplit pas le
 * questionnaire à la place de l'organisation auditée (même liste que
 * AutorisationService.ROLES_INTERNES_SMARTEX côté API).
 */
const ROLES_INTERNES_SMARTEX = new Set(['SUPER_ADMIN', 'ADMIN_AUDIT']);

const ONGLETS = [
  { cle: 'synthese', libelle: 'Vue d’ensemble' },
  { cle: 'domaines', libelle: 'Domaines' },
  { cle: 'criteres', libelle: 'Critères' },
  { cle: 'preuves', libelle: 'Preuves' },
  { cle: 'analyses', libelle: 'Analyses IA' },
  { cle: 'plan', libelle: 'Plan d’action' },
];

/**
 * Domaines de la mission : score obtenu et avancement de la collecte.
 *
 * Les compteurs viennent des critères déjà chargés par la page ; le score,
 * lui, n'existe que pour les domaines comportant au moins une évaluation.
 */
function VoletDomaines({ score, criteres }) {
  const parDomaine = new Map();
  criteres.forEach((critere) => {
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
    score: scores.get(code)?.score ?? null,
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
          <section
            key={ligne.code}
            className="rounded-2xl border border-ink-100 bg-surface p-5 shadow-sm"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="truncate text-sm font-semibold text-ink-900" title={ligne.nom}>
                  {ligne.nom}
                </h3>
                <p className="mt-0.5 font-mono text-xs text-ink-400">{ligne.code}</p>
              </div>
              <span className="shrink-0 text-sm font-semibold tabular-nums text-ink-900">
                {ligne.score == null ? '—' : `${Number(ligne.score).toFixed(1)} / 5`}
              </span>
            </div>
            <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-ink-100">
              <div
                className="h-full rounded-full bg-brand-600 transition-[width] duration-500"
                style={{ width: `${avancement}%` }}
              />
            </div>
            <p className="mt-2 text-xs text-ink-500">
              {ligne.evalues} / {ligne.total} critères évalués
            </p>
          </section>
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
  const [onglet, setOnglet] = useState('synthese');

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
    return <Vide message="Entreprise introuvable ou non accessible." />;
  }

  return (
    <>
      <Link to={`/app/${entrepriseId}/audits`} className="btn-ghost mb-4 -ml-2">
        <ArrowLeft className="h-4 w-4" aria-hidden />
        Retour aux audits
      </Link>

      {chargement ? (
        <Loader message="Chargement de la mission…" />
      ) : !audit ? (
        <Vide message="Audit introuvable ou non accessible." />
      ) : (
        <>
          <PageTitre
            icone={ClipboardCheck}
            titre={audit.nom}
            description={`${audit.referentielCode} — ${audit.nombreCriteres} critères — début le ${audit.dateDebut}`}
            actions={
              <>
                <Link to={`/app/${entrepriseId}/audits/${auditId}/score`} className="btn-secondary">
                  <Gauge className="h-4 w-4" aria-hidden />
                  Tableau de bord
                </Link>
                <Link to={`/app/${entrepriseId}/audits/${auditId}/non-conformites`} className="btn-secondary">
                  <ClipboardX className="h-4 w-4" aria-hidden />
                  Non-conformités
                </Link>
                <Link to={`/app/${entrepriseId}/audits/${auditId}/rapports`} className="btn-secondary">
                  <FileText className="h-4 w-4" aria-hidden />
                  Rapports
                </Link>
                <Link to={`/app/${entrepriseId}/audits/${auditId}/indice-preparation`} className="btn-secondary">
                  <Leaf className="h-4 w-4" aria-hidden />
                  Indice IFC/SFI
                </Link>
                <Badge ton="bleu">{audit.statut}</Badge>
              </>
            }
          />

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

                {/* La clôture appartient à la supervision : c'est elle qui
                    déclenche l'analyse et fige le score. */}
                {peutCloturer ? (
                  <div className="lg:max-w-xl">
                    <ClotureMission
                      entrepriseId={entrepriseId}
                      auditId={auditId}
                      statut={audit.statut}
                      renseignes={(criteres ?? []).filter(estRenseigne).length}
                      total={(criteres ?? []).length}
                      surTermine={rafraichirSilencieux}
                    />
                  </div>
                ) : null}
              <div className="lg:max-w-xl">
              <Card className="p-5">
                <CardHeader titre="Sites de la mission" sousTitre="Sites de l'entreprise couverts par cette mission." icone={MapPin} />
                {sitesEntreprise.length === 0 ? (
                  <div className="mt-3">
                    <p className="text-sm text-ink-500">
                      Aucun site actif pour cette entreprise — la mission porte sur l'entreprise entière.
                    </p>
                    {peutModifier ? (
                      <Link to={`/app/${entrepriseId}`} className="btn-secondary mt-3">
                        <MapPin className="h-4 w-4" aria-hidden />
                        Ajouter un site à l'entreprise
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
                      <p className="mt-3 text-xs text-ink-500">Aucun site sélectionné — la mission porte sur l'entreprise entière.</p>
                    ) : null}
                  </>
                )}
              </Card>
            </div>
              </div>
            ) : null}

            {onglet === 'domaines' ? <VoletDomaines score={score} criteres={criteres ?? []} /> : null}

            {onglet === 'criteres' ? (
              <SaisieCritereMission
                entrepriseId={entrepriseId}
                auditId={auditId}
                criteres={criteres ?? []}
                peutSaisir={peutSaisirLesCriteres}
                peutAnalyser={peutAnalyser}
                surChangement={rafraichirSilencieux}
              />
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

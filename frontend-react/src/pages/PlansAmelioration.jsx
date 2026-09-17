import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { CheckCircle2, ListChecks, PlusCircle, Target, TrendingUp } from 'lucide-react';
import Revele from '../components/Revele';
import { Alerte, Card, CardHeader, Loader, PageTitre, StatCard, Vide } from '../components/ui';
import { api } from '../lib/apiClient';
import { useApiAuth } from '../auth/useApiAuth';
import CartePlan from '../components/plans/CartePlan';
import FormulairePlan from '../components/plans/FormulairePlan';
import Breadcrumb from '../components/Breadcrumb';
import {
  LIBELLE_STATUT_PLAN,
  STATUTS_PLAN,
  creerPlan,
  listerPlans,
  messageErreur,
} from '../lib/plansAction';

/**
 * Les plans d'amélioration de l'entreprise, toutes missions confondues.
 *
 * Distincts des **actions correctives**, qui répondent à une non-conformité
 * constatée : un plan d'amélioration est construit par une personne à partir
 * d'axes validés, sans qu'aucun écart n'ait été relevé. Les deux chaînes ne
 * se croisent nulle part, et cet écran ne montre que la seconde.
 *
 * Vue transverse par entreprise, comme demandé : le responsable voit
 * l'ensemble, puis ouvre un plan et retrouve sa mission d'origine. Le
 * rattachement métier reste `audit_id` côté serveur — l'API est donc
 * interrogée mission par mission, et les résultats réunis ici.
 */
export default function PlansAmelioration() {
  const { entrepriseId } = useParams();
  const { entreprises, peut } = useApiAuth();
  const entreprise = entreprises.find((e) => e.id === entrepriseId);

  const [lignes, setLignes] = useState(null);
  const [audits, setAudits] = useState([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState(null);
  const [filtreStatut, setFiltreStatut] = useState('TOUS');
  const [formulaireOuvert, setFormulaireOuvert] = useState(false);
  const [auditCible, setAuditCible] = useState('');

  const charger = useCallback(async () => {
    setChargement(true);
    try {
      const listeAudits = await api.get(`/api/v1/entreprises/${entrepriseId}/audits`);
      setAudits(listeAudits ?? []);

      const parAudit = await Promise.all(
        (listeAudits ?? []).map(async (audit) => {
          const plans = await listerPlans(entrepriseId, audit.id).catch(() => []);
          return (plans ?? []).map((plan) => ({ plan, audit }));
        })
      );
      setLignes(parAudit.flat());
      setErreur(null);
    } catch (e) {
      setErreur(messageErreur(e, 'Impossible de charger les plans d’amélioration.'));
    } finally {
      setChargement(false);
    }
  }, [entrepriseId]);

  useEffect(() => {
    charger();
  }, [charger]);

  const lignesFiltrees = useMemo(
    () =>
      filtreStatut === 'TOUS'
        ? (lignes ?? [])
        : (lignes ?? []).filter((l) => l.plan.statut === filtreStatut),
    [lignes, filtreStatut]
  );

  const actifs = (lignes ?? []).filter((l) => l.plan.statut === 'ACTIF').length;
  const enRetard = (lignes ?? []).filter((l) => l.plan.enRetard).length;
  const clotures = (lignes ?? []).filter((l) => l.plan.statut === 'CLOTURE').length;

  // Moyenne des progressions renvoyées par le serveur. Aucun avancement n'est
  // recalculé ici : la seule opération est la moyenne de valeurs déjà
  // calculées côté API.
  const avancementMoyen = useMemo(() => {
    if (!lignes || lignes.length === 0) return 0;
    const somme = lignes.reduce((total, l) => total + (l.plan.progression ?? 0), 0);
    return Math.round(somme / lignes.length);
  }, [lignes]);

  if (!entreprise) {
    return <Vide message="Organisation introuvable ou non accessible." />;
  }

  const peutPiloter = peut('audit:modifier', entreprise.formuleCode);

  async function enregistrerPlan(corps) {
    if (!auditCible) {
      throw new Error('Sélectionnez la mission à laquelle ce plan se rattache.');
    }
    await creerPlan(entrepriseId, auditCible, corps);
    setFormulaireOuvert(false);
    charger();
  }

  return (
    <>
      <Breadcrumb
        elements={[
          { libelle: entreprise.raisonSociale, vers: `/app/${entrepriseId}` },
          { libelle: 'Plans d’amélioration' },
        ]}
      />
      <PageTitre
        icone={Target}
        titre="Plans d’amélioration"
        description={`${entreprise.raisonSociale} — plans construits à partir des axes d’amélioration validés. Distincts des actions correctives, qui répondent aux non-conformités.`}
        actions={
          peutPiloter && audits.length > 0 ? (
            <button
              type="button"
              className="btn-primary"
              onClick={() => setFormulaireOuvert((v) => !v)}
            >
              <PlusCircle className="h-4 w-4" aria-hidden />
              Nouveau plan
            </button>
          ) : null
        }
      />

      {formulaireOuvert ? (
        <Revele>
          <Card className="mb-6 p-5">
            <CardHeader
              titre="Nouveau plan d’amélioration"
              icone={PlusCircle}
              sousTitre="Un plan se rattache à une mission d’audit."
            />
            <div className="mt-4">
              <label className="label" htmlFor="plan-audit">
                Mission concernée
              </label>
              <select
                id="plan-audit"
                required
                className="input"
                value={auditCible}
                onChange={(e) => setAuditCible(e.target.value)}
              >
                <option value="">Sélectionner…</option>
                {audits.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.nom}
                  </option>
                ))}
              </select>
            </div>
            <FormulairePlan
              entrepriseId={entrepriseId}
              onEnregistrer={enregistrerPlan}
              onAnnuler={() => setFormulaireOuvert(false)}
            />
          </Card>
        </Revele>
      ) : null}

      {erreur ? (
        <div className="mb-6">
          <Alerte ton="rouge">{erreur}</Alerte>
        </div>
      ) : null}

      {chargement ? (
        <Loader message="Chargement des plans d’amélioration…" />
      ) : !lignes || lignes.length === 0 ? (
        <Vide
          message={
            peutPiloter
              ? 'Aucun plan d’amélioration. Validez un axe depuis un critère, puis créez un plan pour l’organiser.'
              : 'Aucun plan d’amélioration pour cette entreprise.'
          }
        />
      ) : (
        <>
          <Revele>
            <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <StatCard libelle="Plans au total" valeur={lignes.length} icone={ListChecks} ton="bleu" />
              <StatCard libelle="Actifs" valeur={actifs} icone={TrendingUp} ton="bleu" />
              <StatCard
                libelle="En retard"
                valeur={enRetard}
                detail="Échéance dépassée, plan non clos"
                icone={Target}
                ton={enRetard > 0 ? 'rouge' : 'vert'}
              />
              <StatCard
                libelle="Avancement moyen"
                valeur={`${avancementMoyen} %`}
                detail={`${clotures} plan(s) clôturé(s)`}
                icone={CheckCircle2}
                ton="vert"
              />
            </div>
          </Revele>

          <Revele delai={80}>
            <Card className="p-0">
              <CardHeader
                titre="Tous les plans"
                sousTitre={`${lignesFiltrees.length} plan(s) affiché(s)`}
                action={
                  <select
                    className="input w-auto py-1.5 text-sm"
                    value={filtreStatut}
                    onChange={(e) => setFiltreStatut(e.target.value)}
                    aria-label="Filtrer par statut"
                  >
                    <option value="TOUS">Tous les statuts</option>
                    {STATUTS_PLAN.map((s) => (
                      <option key={s} value={s}>
                        {LIBELLE_STATUT_PLAN[s]}
                      </option>
                    ))}
                  </select>
                }
              />
              <div className="p-5">
                {lignesFiltrees.length === 0 ? (
                  <Vide message="Aucun plan ne correspond à ce filtre." />
                ) : (
                  <div className="grid gap-4 lg:grid-cols-2">
                    {lignesFiltrees.map(({ plan, audit }) => (
                      <CartePlan
                        key={plan.id}
                        plan={plan}
                        auditNom={audit.nom}
                        entrepriseId={entrepriseId}
                        axes={null}
                      />
                    ))}
                  </div>
                )}
              </div>
            </Card>
          </Revele>
        </>
      )}
    </>
  );
}

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { AlarmClock, Archive, ArrowLeft, Lock, PlusCircle, Target } from 'lucide-react';
import Revele from '../components/Revele';
import { Alerte, Badge, Barre, Card, CardHeader, Loader, PageTitre, Vide } from '../components/ui';
import { useApiAuth } from '../auth/useApiAuth';
import { formaterDate } from '../lib/export';
import ListeActionsPlan from '../components/plans/ListeActionsPlan';
import FormulairePlan from '../components/plans/FormulairePlan';
import FormulaireActionPlan from '../components/plans/FormulaireActionPlan';
import DialogueCloture from '../components/plans/DialogueCloture';
import SelecteurResponsable from '../components/plans/SelecteurResponsable';
import {
  LIBELLE_STATUT_PLAN,
  TON_STATUT_PLAN,
  ajouterAction,
  archiverPlan,
  changerResponsableAction,
  changerStatutAction,
  changerStatutPlan,
  cloturerPlan,
  consulterPlan,
  listerActions,
  listerAxesValides,
  messageErreur,
  modifierAction,
  modifierPlan,
  remplacerAxesAction,
} from '../lib/plansAction';

const ROLES_ADMINISTRATION = new Set(['SUPER_ADMIN', 'ADMIN_AUDIT', 'RESPONSABLE_ENTREPRISE']);

/**
 * Le détail d'un plan d'amélioration et de ses actions.
 *
 * Ce que l'écran montre dépend de qui regarde, et suit exactement ce que
 * l'API accepte : l'administration de la mission pilote le plan ; un
 * collaborateur lit tout — un plan est un objet collectif, et n'en montrer
 * qu'une partie rendrait sa progression incompréhensible — mais n'agit que
 * sur les actions qui lui sont affectées.
 *
 * Aucun raisonnement de l'IA n'apparaît ici : un plan est un objet
 * organisationnel, et les DTO qui l'alimentent n'en portent pas.
 */
export default function PlanAmeliorationDetail() {
  const { entrepriseId, auditId, planId } = useParams();
  const { entreprises, peut, roleCourant, utilisateur } = useApiAuth();
  const entreprise = entreprises.find((e) => e.id === entrepriseId);

  const [plan, setPlan] = useState(null);
  const [actions, setActions] = useState([]);
  const [axesValides, setAxesValides] = useState(null);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState(null);
  const [accesRefuse, setAccesRefuse] = useState(false);
  const [volet, setVolet] = useState(null); // 'plan' | 'action' | 'CLOTURE' | 'ARCHIVE'
  const [actionEditee, setActionEditee] = useState(null);
  const [actionReaffectee, setActionReaffectee] = useState(null);
  const [actionAxes, setActionAxes] = useState(null);

  const charger = useCallback(async () => {
    setChargement(true);
    try {
      const [detail, listeActions] = await Promise.all([
        consulterPlan(entrepriseId, auditId, planId),
        listerActions(entrepriseId, auditId, planId),
      ]);
      setPlan(detail);
      setActions(listeActions ?? []);
      setErreur(null);
      setAccesRefuse(false);
    } catch (e) {
      if (e?.statut === 403) setAccesRefuse(true);
      setErreur(messageErreur(e, 'Impossible de charger ce plan.'));
    } finally {
      setChargement(false);
    }
  }, [entrepriseId, auditId, planId]);

  useEffect(() => {
    charger();
  }, [charger]);

  // Les axes ne servent qu'à l'affichage et au rattachement : leur absence ne
  // doit pas empêcher de lire le plan.
  useEffect(() => {
    listerAxesValides(entrepriseId, auditId)
      .then((liste) => setAxesValides(liste ?? []))
      .catch(() => setAxesValides([]));
  }, [entrepriseId, auditId]);

  /**
   * Synthèse dédupliquée des axes du plan.
   *
   * Un axe traité par trois actions n'apparaît qu'une fois ici. Le
   * rattachement réel reste porté par l'action, où il est nommé.
   */
  const axesDuPlan = useMemo(() => {
    const vus = new Set();
    const resultat = [];
    actions.forEach((action) => {
      (action.axeIds ?? []).forEach((id) => {
        if (vus.has(id)) return;
        vus.add(id);
        const axe = (axesValides ?? []).find((a) => a.id === id);
        if (axe) resultat.push(axe);
      });
    });
    return resultat;
  }, [actions, axesValides]);

  if (!entreprise) return <Vide message="Entreprise introuvable ou non accessible." />;
  if (chargement) return <Loader message="Chargement du plan…" />;

  if (accesRefuse) {
    return <Alerte ton="rouge">{erreur}</Alerte>;
  }
  if (!plan) {
    return <Vide message={erreur ?? "Ce plan n’existe pas, ou n’appartient pas à cette mission."} />;
  }

  const estAdministrateur = ROLES_ADMINISTRATION.has(roleCourant);
  // Le rôle ne suffit pas : `audit:modifier` est retirée en formule FREE, et
  // afficher un bouton que l'API refuserait serait une promesse non tenue.
  const peutPiloter = estAdministrateur && peut('audit:modifier', entreprise.formuleCode);
  const gele = plan.gele;

  async function agir(operation) {
    setErreur(null);
    try {
      await operation();
      setVolet(null);
      setActionEditee(null);
      setActionReaffectee(null);
      setActionAxes(null);
      await charger();
    } catch (e) {
      // 409 : le message métier du serveur dit précisément ce qui bloque —
      // plan gelé, transition refusée, plan sans action. Le remplacer par un
      // texte générique priverait l'utilisateur de cette information.
      setErreur(messageErreur(e));
    }
  }

  return (
    <>
      <Link to={`/app/${entrepriseId}/plans`} className="btn-ghost mb-4 -ml-2">
        <ArrowLeft className="h-4 w-4" aria-hidden />
        Tous les plans d’amélioration
      </Link>

      <PageTitre
        icone={Target}
        titre={plan.titre}
        description={plan.description ?? 'Plan d’amélioration'}
        actions={
          peutPiloter && !gele ? (
            <>
              {plan.statut === 'BROUILLON' ? (
                <button
                  type="button"
                  className="btn-primary"
                  onClick={() => agir(() => changerStatutPlan(entrepriseId, auditId, planId, 'ACTIF'))}
                >
                  Activer le plan
                </button>
              ) : null}
              <button type="button" className="btn-secondary" onClick={() => setVolet('CLOTURE')}>
                <Lock className="h-4 w-4" aria-hidden />
                Clôturer
              </button>
              <button type="button" className="btn-ghost" onClick={() => setVolet('ARCHIVE')}>
                <Archive className="h-4 w-4" aria-hidden />
                Archiver
              </button>
            </>
          ) : null
        }
      />

      {erreur ? (
        <div className="mb-6">
          <Alerte ton="rouge">{erreur}</Alerte>
        </div>
      ) : null}

      <Revele>
        <Card className="mb-6 p-5">
          <div className="flex flex-wrap items-center gap-2">
            <Badge ton={TON_STATUT_PLAN[plan.statut] ?? 'neutre'}>
              {LIBELLE_STATUT_PLAN[plan.statut] ?? plan.statut}
            </Badge>
            {plan.enRetard ? (
              <Badge ton="rouge" icone={AlarmClock}>
                En retard
              </Badge>
            ) : null}
            {plan.dateEcheance ? (
              <span className="text-xs text-ink-500">
                Échéance : {formaterDate(plan.dateEcheance)}
              </span>
            ) : null}
            <Link
              to={`/app/${entrepriseId}/audits/${auditId}`}
              className="text-xs text-brand-700 hover:underline"
            >
              Voir la mission
            </Link>
          </div>

          <div className="mt-4">
            <div className="flex items-center justify-between text-xs text-ink-500">
              <span>Avancement</span>
              <span className="font-medium text-ink-700">{plan.progression} %</span>
            </div>
            <div className="mt-1">
              <Barre valeur={plan.progression} ton={plan.enRetard ? 'ambre' : 'brand'} />
            </div>
            <p className="mt-1 text-xs text-ink-500">
              Calculé à partir des actions terminées et validées.
            </p>
          </div>

          {gele ? (
            <div className="mt-4">
              <Alerte ton="neutre">
                Ce plan est {LIBELLE_STATUT_PLAN[plan.statut].toLowerCase()} et gelé : il ne peut
                plus être modifié.
                {plan.motifCloture ? ` Motif : ${plan.motifCloture}` : ''}
              </Alerte>
            </div>
          ) : null}

          {axesDuPlan.length > 0 ? (
            <div className="mt-4">
              <p className="text-xs font-medium uppercase tracking-wide text-ink-500">
                Axes d’amélioration traités
              </p>
              <ul className="mt-2 flex flex-wrap gap-1.5">
                {axesDuPlan.map((axe) => (
                  <li
                    key={axe.id}
                    className="rounded-full bg-ink-100 px-2.5 py-1 text-xs text-ink-600"
                  >
                    {axe.libelle}
                    {axe.critereCode ? (
                      <span className="ml-1 font-mono text-ink-400">{axe.critereCode}</span>
                    ) : null}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {peutPiloter && !gele ? (
            <div className="mt-4">
              <button type="button" className="btn-ghost text-sm" onClick={() => setVolet('plan')}>
                Modifier le plan
              </button>
            </div>
          ) : null}

          {volet === 'plan' ? (
            <FormulairePlan
              entrepriseId={entrepriseId}
              plan={plan}
              onEnregistrer={(corps) =>
                agir(() => modifierPlan(entrepriseId, auditId, planId, corps))
              }
              onAnnuler={() => setVolet(null)}
            />
          ) : null}

          {volet === 'CLOTURE' || volet === 'ARCHIVE' ? (
            <DialogueCloture
              mode={volet}
              onConfirmer={(motif) =>
                agir(() =>
                  volet === 'CLOTURE'
                    ? cloturerPlan(entrepriseId, auditId, planId, motif)
                    : archiverPlan(entrepriseId, auditId, planId, motif)
                )
              }
              onAnnuler={() => setVolet(null)}
            />
          ) : null}
        </Card>
      </Revele>

      <Revele delai={80}>
        <Card className="p-5">
          <CardHeader
            titre="Actions du plan"
            sousTitre={`${actions.length} action(s)`}
            action={
              peutPiloter && !gele ? (
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => {
                    setActionEditee(null);
                    setVolet('action');
                  }}
                >
                  <PlusCircle className="h-4 w-4" aria-hidden />
                  Ajouter une action
                </button>
              ) : null
            }
          />

          {volet === 'action' ? (
            <FormulaireActionPlan
              entrepriseId={entrepriseId}
              action={actionEditee}
              axesValides={axesValides}
              onEnregistrer={(corps) =>
                agir(() =>
                  actionEditee
                    ? modifierAction(entrepriseId, auditId, planId, actionEditee.id, corps)
                    : ajouterAction(entrepriseId, auditId, planId, corps)
                )
              }
              onAnnuler={() => {
                setVolet(null);
                setActionEditee(null);
              }}
            />
          ) : null}

          {actionReaffectee ? (
            <div className="mt-4 rounded-xl border border-ink-100 p-4">
              <p className="text-sm font-medium text-ink-900">
                Réaffecter : {actionReaffectee.titre}
              </p>
              <div className="mt-2">
                <SelecteurResponsable
                  id="reaffectation"
                  entrepriseId={entrepriseId}
                  valeur={actionReaffectee.responsableId}
                  onChange={(v) =>
                    agir(() =>
                      changerResponsableAction(entrepriseId, auditId, planId, actionReaffectee.id, v)
                    )
                  }
                />
              </div>
              <button
                type="button"
                className="btn-ghost mt-2 text-sm"
                onClick={() => setActionReaffectee(null)}
              >
                Annuler
              </button>
            </div>
          ) : null}

          {actionAxes ? (
            <div className="mt-4 rounded-xl border border-ink-100 p-4">
              <p className="text-sm font-medium text-ink-900">
                Axes traités par : {actionAxes.titre}
              </p>
              <p className="mt-1 text-xs text-ink-500">
                Seuls les axes validés sont planifiables. La liste cochée remplace l’ensemble.
              </p>
              {(axesValides ?? []).length === 0 ? (
                <p className="mt-2 text-xs italic text-ink-500">
                  Aucun axe validé sur cette mission.
                </p>
              ) : (
                <ul className="mt-2 space-y-1.5">
                  {(axesValides ?? []).map((axe) => (
                    <li key={axe.id}>
                      <label className="flex items-start gap-2 text-sm text-ink-700">
                        <input
                          type="checkbox"
                          className="mt-0.5"
                          defaultChecked={(actionAxes.axeIds ?? []).includes(axe.id)}
                          onChange={(e) => {
                            const courants = new Set(actionAxes.axeIds ?? []);
                            if (e.target.checked) courants.add(axe.id);
                            else courants.delete(axe.id);
                            setActionAxes({ ...actionAxes, axeIds: [...courants] });
                          }}
                        />
                        <span>{axe.libelle}</span>
                      </label>
                    </li>
                  ))}
                </ul>
              )}
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  className="btn-primary"
                  onClick={() =>
                    agir(() =>
                      remplacerAxesAction(
                        entrepriseId,
                        auditId,
                        planId,
                        actionAxes.id,
                        actionAxes.axeIds ?? []
                      )
                    )
                  }
                >
                  Enregistrer les axes
                </button>
                <button type="button" className="btn-ghost" onClick={() => setActionAxes(null)}>
                  Annuler
                </button>
              </div>
            </div>
          ) : null}

          <div className="mt-4">
            <ListeActionsPlan
              actions={actions}
              axes={axesValides}
              estAdministrateur={peutPiloter}
              utilisateurId={utilisateur?.id}
              planGele={gele}
              onChangerStatut={(action, statut) =>
                agir(() => changerStatutAction(entrepriseId, auditId, planId, action.id, statut))
              }
              onModifier={(action) => {
                setActionEditee(action);
                setVolet('action');
              }}
              onReaffecter={(action) => setActionReaffectee(action)}
              onModifierAxes={(action) => setActionAxes(action)}
            />
          </div>
        </Card>
      </Revele>
    </>
  );
}

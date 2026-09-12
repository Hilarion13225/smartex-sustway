import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Alerte } from '../ui';
import SustwayLoader from '../SustwayLoader';
import {
  LIBELLE_STATUT_PLAN,
  ajouterAction,
  creerPlan,
  listerPlans,
  messageErreur,
} from '../../lib/plansAction';

/**
 * Planifier un axe validé, sans quitter l'écran du critère.
 *
 * Le parcours métier est `Critère → Axe VALIDE → Plan`, mais il était rompu à
 * l'endroit exact où il se décide : après avoir validé un axe, il fallait le
 * mémoriser, sortir, ouvrir les plans d'amélioration, en créer un, rouvrir la
 * mission. Ce volet supprime ce détour.
 *
 * Deux chemins, parce que la réalité en a deux : rejoindre un plan qui existe,
 * ou en ouvrir un. Dans les deux cas, l'axe devient une **action** du plan —
 * c'est l'action qui porte le rattachement en base, jamais le plan.
 *
 * Aucun nouvel endpoint : `POST /plans-action` puis `POST /{id}/actions` avec
 * `axeIds` suffisaient déjà.
 *
 * Le statut de l'axe n'est pas touché : il reste `VALIDE`, qu'il soit planifié
 * une fois, trois fois, ou jamais.
 */
export default function PlanifierAxe({ entrepriseId, auditId, axe, onTermine, onAnnuler }) {
  const [plans, setPlans] = useState(null);
  const [mode, setMode] = useState('existant'); // 'existant' | 'nouveau'
  const [planChoisi, setPlanChoisi] = useState('');
  const [titrePlan, setTitrePlan] = useState('');
  const [titreAction, setTitreAction] = useState(axe.libelle.slice(0, 255));
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState(null);
  const [succes, setSucces] = useState(null);

  useEffect(() => {
    let annule = false;
    listerPlans(entrepriseId, auditId)
      .then((liste) => {
        if (annule) return;
        // Un plan gelé n'accepte plus d'action : le proposer mènerait à un
        // refus que l'utilisateur ne pourrait pas anticiper.
        const ouverts = (liste ?? []).filter((p) => !p.gele);
        setPlans(ouverts);
        if (ouverts.length === 0) setMode('nouveau');
        else setPlanChoisi(ouverts[0].id);
      })
      .catch(() => {
        if (!annule) {
          setPlans([]);
          setMode('nouveau');
        }
      });
    return () => {
      annule = true;
    };
  }, [entrepriseId, auditId]);

  async function planifier(e) {
    e.preventDefault();
    setErreur(null);
    setEnCours(true);
    try {
      let planId = planChoisi;
      if (mode === 'nouveau') {
        const plan = await creerPlan(entrepriseId, auditId, { titre: titrePlan.trim() });
        planId = plan.id;
      }
      await ajouterAction(entrepriseId, auditId, planId, {
        titre: titreAction.trim(),
        axeIds: [axe.id],
      });
      setSucces(planId);
      onTermine?.();
    } catch (err) {
      setErreur(messageErreur(err, 'La planification a échoué.'));
    } finally {
      setEnCours(false);
    }
  }

  if (succes) {
    return (
      <div className="mt-3 rounded-xl border border-ink-100 p-4">
        <Alerte ton="vert">Cet axe est désormais planifié.</Alerte>
        <Link
          to={`/app/${entrepriseId}/audits/${auditId}/plans/${succes}`}
          className="btn-secondary mt-3"
        >
          Ouvrir le plan
        </Link>
      </div>
    );
  }

  const pretAEnvoyer =
    titreAction.trim().length > 0 &&
    (mode === 'existant' ? Boolean(planChoisi) : titrePlan.trim().length > 0);

  return (
    <form className="mt-3 space-y-3 rounded-xl border border-ink-100 p-4" onSubmit={planifier}>
      <p className="text-sm font-medium text-ink-900">Planifier cet axe</p>

      {plans === null ? (
        <p className="text-xs text-ink-500">Chargement des plans…</p>
      ) : (
        <>
          <div className="flex flex-wrap gap-4">
            <label className="flex items-center gap-2 text-sm text-ink-700">
              <input
                type="radio"
                name={`mode-${axe.id}`}
                checked={mode === 'existant'}
                disabled={plans.length === 0}
                onChange={() => setMode('existant')}
              />
              Ajouter à un plan existant
            </label>
            <label className="flex items-center gap-2 text-sm text-ink-700">
              <input
                type="radio"
                name={`mode-${axe.id}`}
                checked={mode === 'nouveau'}
                onChange={() => setMode('nouveau')}
              />
              Créer un nouveau plan
            </label>
          </div>

          {mode === 'existant' ? (
            plans.length === 0 ? (
              <p className="text-xs italic text-ink-500">
                Aucun plan ouvert sur cette mission. Créez-en un.
              </p>
            ) : (
              <div>
                <label className="label" htmlFor={`plan-${axe.id}`}>
                  Plan
                </label>
                <select
                  id={`plan-${axe.id}`}
                  className="input"
                  value={planChoisi}
                  onChange={(e) => setPlanChoisi(e.target.value)}
                >
                  {plans.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.titre} — {LIBELLE_STATUT_PLAN[p.statut] ?? p.statut}
                    </option>
                  ))}
                </select>
              </div>
            )
          ) : (
            <div>
              <label className="label" htmlFor={`titre-plan-${axe.id}`}>
                Intitulé du nouveau plan
              </label>
              <input
                id={`titre-plan-${axe.id}`}
                className="input"
                maxLength={255}
                placeholder="Renforcement de la gouvernance RSE"
                value={titrePlan}
                onChange={(e) => setTitrePlan(e.target.value)}
              />
            </div>
          )}

          <div>
            <label className="label" htmlFor={`titre-action-${axe.id}`}>
              Action à réaliser
            </label>
            <input
              id={`titre-action-${axe.id}`}
              className="input"
              maxLength={255}
              value={titreAction}
              onChange={(e) => setTitreAction(e.target.value)}
            />
            <p className="mt-1 text-xs text-ink-500">
              Reprend l’intitulé de l’axe par défaut ; c’est l’action qui porte le rattachement.
            </p>
          </div>
        </>
      )}

      {erreur ? <Alerte ton="rouge">{erreur}</Alerte> : null}

      <div className="flex flex-wrap gap-2">
        <button type="submit" className="btn-primary" disabled={!pretAEnvoyer || enCours}>
          {enCours ? <SustwayLoader taille="sm" /> : null}
          Planifier
        </button>
        <button type="button" className="btn-ghost" onClick={onAnnuler}>
          Annuler
        </button>
      </div>
    </form>
  );
}

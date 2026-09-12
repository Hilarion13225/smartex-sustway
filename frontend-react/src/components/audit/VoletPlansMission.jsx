import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Target } from 'lucide-react';
import { Alerte, Loader, Vide } from '../ui';
import CartePlan from '../plans/CartePlan';
import { listerPlans, messageErreur } from '../../lib/plansAction';

/**
 * Les plans d'amélioration de la mission.
 *
 * Distincts de l'onglet « Actions correctives », qui traite les écarts
 * constatés. Le parcours de la mission devient ainsi lisible de bout en
 * bout : résultats → axes → plans → actions.
 *
 * La progression et le retard viennent du serveur ; cet écran ne fait que
 * les rendre.
 */
export default function VoletPlansMission({ entrepriseId, auditId }) {
  const [plans, setPlans] = useState(null);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState(null);

  const charger = useCallback(() => {
    setChargement(true);
    listerPlans(entrepriseId, auditId)
      .then((liste) => {
        setPlans(liste ?? []);
        setErreur(null);
      })
      .catch((e) => setErreur(messageErreur(e, 'Chargement des plans impossible.')))
      .finally(() => setChargement(false));
  }, [entrepriseId, auditId]);

  useEffect(() => {
    charger();
  }, [charger]);

  if (chargement) return <Loader message="Chargement des plans d’amélioration…" />;

  if (erreur) return <Alerte ton="rouge">{erreur}</Alerte>;

  if (!plans || plans.length === 0) {
    return (
      <Vide message="Aucun plan d’amélioration sur cette mission. Validez un axe depuis un critère, puis planifiez-le." />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-ink-500">
          {plans.length} plan{plans.length > 1 ? 's' : ''} construit
          {plans.length > 1 ? 's' : ''} à partir des axes validés.
        </p>
        <Link to={`/app/${entrepriseId}/plans`} className="btn-ghost text-sm">
          <Target className="h-4 w-4" aria-hidden />
          Tous les plans de l’entreprise
        </Link>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {plans.map((plan) => (
          <CartePlan key={plan.id} plan={plan} entrepriseId={entrepriseId} axes={null} />
        ))}
      </div>
    </div>
  );
}

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { AlarmClock, CheckCircle2, ListChecks, Target } from 'lucide-react';
import Revele from '../components/Revele';
import SustwayLoader from '../components/SustwayLoader';
import { Alerte, Badge, Card, CardHeader, Loader, PageTitre, StatCard, Vide } from '../components/ui';
import Breadcrumb from '../components/Breadcrumb';
import { useApiAuth } from '../auth/useApiAuth';
import { formaterDate } from '../lib/export';
import {
  LIBELLE_STATUT_ACTION,
  STATUTS_EXECUTANT,
  TON_PRIORITE,
  TON_STATUT_ACTION,
  changerStatutAction,
  listerMesActions,
  messageErreur,
} from '../lib/plansAction';

/**
 * Le travail qui m'est confié.
 *
 * Le collaborateur lit le plan entier — c'est la décision D28, et masquer les
 * actions des autres rendrait la progression illisible. Mais son propre
 * travail y était noyé : il fallait ouvrir chaque plan de chaque mission pour
 * le retrouver. Cette vue est la contrepartie de cette lecture large.
 *
 * Le filtrage n'est pas fait ici : le serveur ne rend que les actions dont
 * l'appelant est responsable, d'après l'identité du jeton. Rien n'est reçu
 * puis trié à l'affichage.
 *
 * Les statuts proposés s'arrêtent à « Terminée ». « Validée » revient à
 * l'administration de la mission — c'est elle qui constate, pas celui qui
 * fait — et l'API refuse tout autre appelant.
 */
export default function MesActions() {
  const { entrepriseId } = useParams();
  const { entreprises } = useApiAuth();
  const entreprise = entreprises.find((e) => e.id === entrepriseId);

  const [actions, setActions] = useState(null);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState(null);
  const [enCours, setEnCours] = useState(null);

  const charger = useCallback(() => {
    setChargement(true);
    listerMesActions(entrepriseId)
      .then((liste) => {
        setActions(liste ?? []);
        setErreur(null);
      })
      .catch((e) => setErreur(messageErreur(e, 'Impossible de charger vos actions.')))
      .finally(() => setChargement(false));
  }, [entrepriseId]);

  useEffect(() => {
    charger();
  }, [charger]);

  const aFaire = useMemo(
    () => (actions ?? []).filter((a) => a.statut === 'OUVERTE' || a.statut === 'EN_COURS').length,
    [actions]
  );
  const enRetard = useMemo(() => (actions ?? []).filter((a) => a.enRetard).length, [actions]);
  const faites = useMemo(
    () => (actions ?? []).filter((a) => a.statut === 'TERMINEE' || a.statut === 'VALIDEE').length,
    [actions]
  );

  async function avancer(action, statut) {
    setEnCours(action.id);
    setErreur(null);
    try {
      await changerStatutAction(entrepriseId, action.auditId, action.planId, action.id, statut);
      charger();
    } catch (e) {
      setErreur(messageErreur(e));
    } finally {
      setEnCours(null);
    }
  }

  if (!entreprise) return <Vide message="Organisation introuvable ou non accessible." />;

  return (
    <>
      <Breadcrumb
        elements={[
          { libelle: entreprise.raisonSociale, vers: `/app/${entrepriseId}` },
          { libelle: 'Mes actions' },
        ]}
      />
      <PageTitre
        icone={ListChecks}
        titre="Mes actions"
        description={`${entreprise.raisonSociale} — les actions d’amélioration dont vous êtes responsable.`}
      />

      {erreur ? (
        <div className="mb-6">
          <Alerte ton="rouge">{erreur}</Alerte>
        </div>
      ) : null}

      {chargement ? (
        <Loader message="Chargement de vos actions…" />
      ) : !actions || actions.length === 0 ? (
        <Vide message="Aucune action ne vous est affectée pour l’instant." />
      ) : (
        <>
          <Revele>
            <div className="mb-6 grid gap-4 sm:grid-cols-3">
              <StatCard libelle="À faire" valeur={aFaire} icone={ListChecks} ton="bleu" />
              <StatCard
                libelle="En retard"
                valeur={enRetard}
                detail="Échéance dépassée"
                icone={AlarmClock}
                ton={enRetard > 0 ? 'rouge' : 'vert'}
              />
              <StatCard libelle="Faites" valeur={faites} icone={CheckCircle2} ton="vert" />
            </div>
          </Revele>

          <Revele delai={80}>
            <Card className="p-5">
              <CardHeader titre="Toutes mes actions" sousTitre={`${actions.length} action(s)`} />
              <ul className="mt-4 space-y-3">
                {actions.map((action) => (
                  <li key={action.id} className="rounded-xl border border-ink-100 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-ink-900">{action.titre}</p>
                        {action.description ? (
                          <p className="mt-1 text-sm text-ink-600">{action.description}</p>
                        ) : null}
                        <p className="mt-1 text-xs text-ink-500">
                          <Link
                            to={`/app/${entrepriseId}/audits/${action.auditId}/plans/${action.planId}`}
                            className="text-brand-700 hover:underline"
                          >
                            {action.planTitre}
                          </Link>
                          {' · '}
                          {action.auditNom}
                        </p>
                      </div>
                      <div className="flex shrink-0 flex-wrap items-center gap-2">
                        <Badge ton={TON_STATUT_ACTION[action.statut] ?? 'neutre'}>
                          {LIBELLE_STATUT_ACTION[action.statut] ?? action.statut}
                        </Badge>
                        <Badge ton={TON_PRIORITE[action.priorite] ?? 'neutre'}>
                          {action.priorite}
                        </Badge>
                        {action.enRetard ? (
                          <Badge ton="rouge" icone={AlarmClock}>
                            En retard
                          </Badge>
                        ) : null}
                      </div>
                    </div>

                    {action.axes?.length ? (
                      <div className="mt-2 flex flex-wrap items-start gap-1.5">
                        <Target className="mt-0.5 h-3.5 w-3.5 shrink-0 text-ink-400" aria-hidden />
                        {action.axes.map((libelle) => (
                          <span
                            key={libelle}
                            className="rounded-full bg-ink-100 px-2 py-0.5 text-xs text-ink-600"
                          >
                            {libelle}
                          </span>
                        ))}
                      </div>
                    ) : null}

                    {action.dateEcheance ? (
                      <p
                        className={`mt-2 text-xs ${
                          action.enRetard ? 'font-medium text-rose-600' : 'text-ink-500'
                        }`}
                      >
                        Échéance : {formaterDate(action.dateEcheance)}
                      </p>
                    ) : null}

                    {action.planGele ? (
                      <p className="mt-3 text-xs italic text-ink-500">
                        Le plan est clos : cette action ne peut plus être modifiée.
                      </p>
                    ) : action.statut === 'VALIDEE' ? (
                      <p className="mt-3 text-xs italic text-ink-500">
                        Action validée : elle ne peut plus être reprise.
                      </p>
                    ) : (
                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <label className="sr-only" htmlFor={`statut-${action.id}`}>
                          Statut de l’action {action.titre}
                        </label>
                        <select
                          id={`statut-${action.id}`}
                          className="input w-auto py-1 text-xs"
                          value={action.statut}
                          disabled={enCours === action.id}
                          onChange={(e) => avancer(action, e.target.value)}
                        >
                          {STATUTS_EXECUTANT.map((s) => (
                            <option key={s} value={s}>
                              {LIBELLE_STATUT_ACTION[s]}
                            </option>
                          ))}
                        </select>
                        {enCours === action.id ? <SustwayLoader taille="sm" /> : null}
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            </Card>
          </Revele>
        </>
      )}
    </>
  );
}

import { useCallback, useEffect, useState } from 'react';
import { Check, Lightbulb, Target, X } from 'lucide-react';
import { Alerte, Badge, Loader, Vide } from '../ui';
import SustwayLoader from '../SustwayLoader';
import { api, ApiError } from '../../lib/apiClient';
import PlanifierAxe from '../plans/PlanifierAxe';

const TONS_STATUT = { PROPOSE: 'bleu', VALIDE: 'vert', REJETE: 'neutre' };

const LIBELLES_STATUT = { PROPOSE: 'Proposition', VALIDE: 'Validé', REJETE: 'Rejeté' };

const LIBELLES_NIVEAU = {
  EXIGENCE: 'Exigence',
  PREUVE_ATTENDUE: 'Preuve',
  REGLE: 'Règle',
};

/**
 * Les axes d'amélioration d'un critère, et la décision humaine qu'ils
 * attendent.
 *
 * Un axe proposé par l'IA n'engage rien : il faut un geste pour le retenir, un
 * autre pour l'écarter. L'écran dit donc ce qui est proposé, par qui, à quoi
 * c'est rattaché — et s'arrête là. Le raisonnement qui a conduit l'IA à
 * formuler cette proposition n'est pas ici : l'API ne le transmet pas (D1), et
 * l'écran n'a rien à reconstituer.
 *
 * Les boutons ne sont montrés qu'aux rôles qui peuvent réellement décider :
 * proposer une action que l'API refuserait par 403 serait une promesse non
 * tenue.
 */
export default function AxesAmelioration({ entrepriseId, auditId, auditCritereId, peutDecider }) {
  const [axes, setAxes] = useState(null);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState(null);
  const [enCours, setEnCours] = useState(null);
  const [rejetOuvert, setRejetOuvert] = useState(null);
  const [planifieOuvert, setPlanifieOuvert] = useState(null);

  const url = `/api/v1/entreprises/${entrepriseId}/audits/${auditId}/axes-amelioration`;

  const charger = useCallback(() => {
    setChargement(true);
    api
      .get(`${url}?auditCritereId=${auditCritereId}`)
      .then((liste) => {
        setAxes(liste ?? []);
        setErreur(null);
      })
      .catch((err) =>
        setErreur(err instanceof ApiError ? err.message : 'Chargement des axes impossible')
      )
      .finally(() => setChargement(false));
    // `url` est dérivé des trois identifiants : les lister suffit.
  }, [entrepriseId, auditId, auditCritereId]);

  useEffect(() => {
    charger();
  }, [charger]);

  async function decider(axe, decision, motif) {
    setEnCours(axe.id);
    setErreur(null);
    try {
      if (decision === 'VALIDER') {
        await api.post(`${url}/${axe.id}/validation`, {});
      } else {
        await api.post(`${url}/${axe.id}/rejet`, { motif });
      }
      setRejetOuvert(null);
      charger();
    } catch (err) {
      setErreur(err instanceof ApiError ? err.message : 'Décision impossible');
    } finally {
      setEnCours(null);
    }
  }

  if (chargement) return <Loader message="Chargement des axes d’amélioration…" />;

  return (
    <section className="mt-6">
      <h3 className="flex items-center gap-2 text-sm font-semibold text-ink-900">
        <Lightbulb className="h-4 w-4 text-ink-400" aria-hidden />
        Axes d’amélioration
        {axes?.length ? <span className="text-xs font-normal text-ink-500">({axes.length})</span> : null}
      </h3>

      {erreur ? (
        <div className="mt-3">
          <Alerte ton="rouge">{erreur}</Alerte>
        </div>
      ) : null}

      {!axes || axes.length === 0 ? (
        <div className="mt-3">
          <Vide message="Aucun axe d’amélioration proposé pour ce critère." />
        </div>
      ) : (
        <ul className="mt-3 space-y-3">
          {axes.map((axe) => (
            <li key={axe.id} className="rounded-xl border border-ink-100 p-4">
              <p className="text-sm font-medium text-ink-900">{axe.libelle}</p>
              {axe.description ? (
                <p className="mt-1 text-sm text-ink-600">{axe.description}</p>
              ) : null}

              <div className="mt-2 flex flex-wrap items-center gap-2">
                <Badge ton={TONS_STATUT[axe.statut] ?? 'neutre'}>
                  {axe.origine === 'IA' ? 'IA' : 'Saisie'} ·{' '}
                  {LIBELLES_STATUT[axe.statut] ?? axe.statut}
                </Badge>
                {axe.critereCode ? (
                  <span className="font-mono text-xs text-ink-400">{axe.critereCode}</span>
                ) : null}
                {axe.niveauRattachement && axe.referenceRattachement ? (
                  <span className="text-xs text-ink-500">
                    {LIBELLES_NIVEAU[axe.niveauRattachement] ?? axe.niveauRattachement} :{' '}
                    <span className="font-mono">{axe.referenceRattachement}</span>
                  </span>
                ) : null}
              </div>

              {/* Le parcours métier est Critère -> Axe VALIDE -> Plan.
                  Sans ce point d'entrée, il fallait mémoriser l'axe, quitter
                  l'écran, puis le retrouver depuis les plans. */}
              {peutDecider && axe.statut === 'VALIDE' ? (
                planifieOuvert === axe.id ? (
                  <PlanifierAxe
                    entrepriseId={entrepriseId}
                    auditId={auditId}
                    axe={axe}
                    onAnnuler={() => setPlanifieOuvert(null)}
                  />
                ) : (
                  <button
                    type="button"
                    className="btn-secondary mt-3"
                    onClick={() => setPlanifieOuvert(axe.id)}
                    aria-label={`Planifier l’axe : ${axe.libelle}`}
                  >
                    <Target className="h-4 w-4" aria-hidden />
                    Planifier cet axe
                  </button>
                )
              ) : null}

              {axe.statut === 'REJETE' && axe.motifRejet ? (
                <p className="mt-2 text-xs text-ink-500">
                  <span className="font-medium">Motif :</span> {axe.motifRejet}
                </p>
              ) : null}

              {peutDecider && axe.statut === 'PROPOSE' ? (
                rejetOuvert === axe.id ? (
                  <FormulaireRejet
                    libelle={axe.libelle}
                    enCours={enCours === axe.id}
                    onAnnuler={() => setRejetOuvert(null)}
                    onConfirmer={(motif) => decider(axe, 'REJETER', motif)}
                  />
                ) : (
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      className="btn-secondary"
                      disabled={enCours === axe.id}
                      onClick={() => decider(axe, 'VALIDER')}
                      aria-label={`Valider l’axe : ${axe.libelle}`}
                    >
                      {enCours === axe.id ? <SustwayLoader taille="sm" /> : <Check className="h-4 w-4" aria-hidden />}
                      Valider
                    </button>
                    <button
                      type="button"
                      className="btn-ghost"
                      disabled={enCours === axe.id}
                      onClick={() => setRejetOuvert(axe.id)}
                      aria-label={`Rejeter l’axe : ${axe.libelle}`}
                    >
                      <X className="h-4 w-4" aria-hidden />
                      Rejeter
                    </button>
                  </div>
                )
              ) : null}
            </li>
          ))}
        </ul>
      )}

      <p className="mt-3 text-xs text-ink-500">
        Une décision est définitive : un axe validé ou rejeté ne peut plus être repris.
      </p>
    </section>
  );
}

/**
 * Le motif est saisi avant le rejet, pas après : l'API l'exige, et une
 * recommandation écartée sans motif ne se relit pas six mois plus tard.
 */
function FormulaireRejet({ libelle, enCours, onAnnuler, onConfirmer }) {
  const [motif, setMotif] = useState('');
  const motifValide = motif.trim().length > 0;

  return (
    <form
      className="mt-3 space-y-2"
      onSubmit={(e) => {
        e.preventDefault();
        if (motifValide) onConfirmer(motif.trim());
      }}
    >
      <label className="label" htmlFor={`motif-${libelle}`}>
        Motif du rejet
      </label>
      <textarea
        id={`motif-${libelle}`}
        required
        className="input"
        rows={2}
        value={motif}
        placeholder="Pourquoi cette proposition n’est-elle pas retenue ?"
        onChange={(e) => setMotif(e.target.value)}
      />
      <div className="flex flex-wrap gap-2">
        <button type="submit" className="btn-primary" disabled={!motifValide || enCours}>
          {enCours ? <SustwayLoader taille="sm" /> : null}
          Confirmer le rejet
        </button>
        <button type="button" className="btn-ghost" onClick={onAnnuler}>
          Annuler
        </button>
      </div>
    </form>
  );
}

import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, ClipboardEdit, UserCheck } from 'lucide-react';
import SustwayLoader from '../components/SustwayLoader';
import Revele from '../components/Revele';
import { Alerte, Badge, Card, Loader, PageTitre, Vide } from '../components/ui';
import { api, ApiError } from '../lib/apiClient';
import { useApiAuth } from '../auth/useApiAuth';
import { ROLE_LIBELLE } from '../auth/permissions';
import { formaterDateHeure } from '../lib/export';

const TONS_STATUT_REVUE = { EN_ATTENTE: 'ambre', EN_COURS: 'bleu', TERMINEE: 'vert' };

/** Module 9 (CDC §8) : traitement de la file de revue experte (RG22/RG38). */
export default function RevueExperteQueue() {
  const { entrepriseId } = useParams();
  const { entreprises, roleCourant, peut } = useApiAuth();
  const entreprise = entreprises.find((e) => e.id === entrepriseId);

  const [file, setFile] = useState(null);
  const [chargement, setChargement] = useState(true);
  const [erreurGlobale, setErreurGlobale] = useState(null);

  const rafraichir = useCallback(() => {
    setChargement(true);
    setErreurGlobale(null);
    api
      .get(`/api/v1/entreprises/${entrepriseId}/revues-expertes`)
      .then(setFile)
      .catch((err) => setErreurGlobale(err instanceof ApiError ? err.message : 'Erreur inattendue'))
      .finally(() => setChargement(false));
  }, [entrepriseId]);

  useEffect(() => {
    rafraichir();
  }, [rafraichir]);

  if (!entreprise) {
    return <Vide message="Entreprise introuvable ou non accessible." />;
  }

  if (!peut('revue:traiter')) {
    return (
      <>
        <Link to={`/app/${entrepriseId}`} className="btn-ghost mb-4 -ml-2">
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Retour
        </Link>
        <Alerte ton="ambre">
          Cet espace est réservé aux experts RSE et aux administrateurs (rôle actuel : {ROLE_LIBELLE[roleCourant] ?? 'aucun'}).
        </Alerte>
      </>
    );
  }

  return (
    <>
      <Link to={`/app/${entrepriseId}`} className="btn-ghost mb-4 -ml-2">
        <ArrowLeft className="h-4 w-4" aria-hidden />
        Retour à {entreprise.raisonSociale}
      </Link>

      <PageTitre
        icone={ClipboardEdit}
        titre="File de revue experte"
        description="Évaluations dont la confiance IA est sous le seuil, en formule Avancées."
      />

      {erreurGlobale ? <Alerte ton="rouge">{erreurGlobale}</Alerte> : null}

      {chargement ? (
        <Loader message="Chargement de la file…" />
      ) : file && file.length > 0 ? (
        <div className="space-y-3">
          {file.map((revue) => (
            <Revele key={revue.id}>
              <RevueCard revue={revue} entrepriseId={entrepriseId} onChange={rafraichir} />
            </Revele>
          ))}
        </div>
      ) : (
        <Vide message="Aucune revue en attente pour l’instant." />
      )}
    </>
  );
}

function RevueCard({ revue, entrepriseId, onChange }) {
  const [chargement, setChargement] = useState(false);
  const [erreur, setErreur] = useState(null);
  const [probabiliteFinale, setProbabiliteFinale] = useState('');
  const [commentaire, setCommentaire] = useState('');

  async function prendreEnCharge() {
    setErreur(null);
    setChargement(true);
    try {
      await api.post(`/api/v1/entreprises/${entrepriseId}/revues-expertes/${revue.id}/prendre-en-charge`, undefined);
      onChange();
    } catch (err) {
      setErreur(err instanceof ApiError ? err.message : 'Erreur inattendue');
    } finally {
      setChargement(false);
    }
  }

  async function traiter(e) {
    e.preventDefault();
    setErreur(null);
    setChargement(true);
    try {
      await api.post(`/api/v1/entreprises/${entrepriseId}/revues-expertes/${revue.id}/traiter`, {
        probabiliteFinale: probabiliteFinale === '' ? null : Number(probabiliteFinale),
        commentaire,
      });
      onChange();
    } catch (err) {
      setErreur(err instanceof ApiError ? err.message : 'Erreur inattendue');
    } finally {
      setChargement(false);
    }
  }

  return (
    <Card className="p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-mono text-xs text-ink-500">{revue.critereCode}</p>
          <p className="font-medium text-ink-900">{revue.critereLibelle}</p>
          <p className="mt-1 text-xs text-ink-500">Reçu le {formaterDateHeure(revue.dateAttribution)}</p>
        </div>
        <Badge ton={TONS_STATUT_REVUE[revue.statut] ?? 'neutre'}>{revue.statut}</Badge>
      </div>

      <dl className="mt-3 grid grid-cols-2 gap-3 text-sm">
        <div>
          <dt className="text-xs uppercase tracking-wide text-ink-500">Probabilité IA initiale</dt>
          <dd className="font-semibold text-ink-900">{Math.round(Number(revue.probabiliteInitiale) * 100)}%</dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-wide text-ink-500">Niveau initial</dt>
          <dd className="font-semibold text-ink-900">{revue.noteInitiale} / 5</dd>
        </div>
      </dl>

      {erreur ? (
        <div className="mt-3">
          <Alerte ton="rouge">{erreur}</Alerte>
        </div>
      ) : null}

      {revue.statut === 'EN_ATTENTE' ? (
        <button type="button" className="btn-secondary mt-4" disabled={chargement} onClick={prendreEnCharge}>
          {chargement ? <SustwayLoader taille="sm" /> : <UserCheck className="h-4 w-4" aria-hidden />}
          Prendre en charge
        </button>
      ) : revue.statut === 'EN_COURS' ? (
        <form className="mt-4 space-y-3 rounded-lg border border-ink-200 p-3" onSubmit={traiter}>
          <div>
            <label className="label" htmlFor={`revue-proba-${revue.id}`}>
              Probabilité finale (optionnel — laisser vide pour confirmer l’estimation IA)
            </label>
            <input
              id={`revue-proba-${revue.id}`}
              type="number"
              min="0"
              max="1"
              step="0.01"
              className="input"
              placeholder={String(revue.probabiliteInitiale)}
              value={probabiliteFinale}
              onChange={(e) => setProbabiliteFinale(e.target.value)}
            />
          </div>
          <div>
            <label className="label" htmlFor={`revue-commentaire-${revue.id}`}>
              Commentaire (obligatoire)
            </label>
            <textarea
              id={`revue-commentaire-${revue.id}`}
              required
              rows={3}
              className="input"
              placeholder="Justifiez votre décision…"
              value={commentaire}
              onChange={(e) => setCommentaire(e.target.value)}
            />
          </div>
          <button type="submit" className="btn-primary" disabled={chargement}>
            {chargement ? <SustwayLoader taille="sm" /> : <CheckCircle2 className="h-4 w-4" aria-hidden />}
            Valider la revue
          </button>
        </form>
      ) : (
        <div className="mt-4 space-y-1 rounded-lg bg-ink-50/70 p-3 text-sm">
          <p>
            Probabilité finale : <strong>{Math.round(Number(revue.probabiliteFinale) * 100)}%</strong> — Note :{' '}
            <strong>{revue.noteFinale} / 5</strong>
          </p>
          {revue.commentaire ? <p className="text-xs text-ink-600">{revue.commentaire}</p> : null}
          <p className="text-xs text-ink-400">Traitée le {formaterDateHeure(revue.dateCompletion)}</p>
        </div>
      )}
    </Card>
  );
}

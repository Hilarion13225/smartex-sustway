import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { AlertTriangle, ArrowLeft, ClipboardX, PlusCircle } from 'lucide-react';
import SustwayLoader from '../components/SustwayLoader';
import Revele from '../components/Revele';
import { Alerte, Badge, Card, Loader, PageTitre, Vide } from '../components/ui';
import { api, ApiError } from '../lib/apiClient';
import { useApiAuth } from '../auth/useApiAuth';
import { formaterDate } from '../lib/export';

const TONS_NIVEAU = { MINEURE: 'neutre', MODEREE: 'bleu', MAJEURE: 'ambre', CRITIQUE: 'rouge' };
const TONS_STATUT_NC = { OUVERTE: 'rouge', EN_TRAITEMENT: 'ambre', CLOTUREE: 'vert' };
const TONS_PRIORITE = { BASSE: 'neutre', MOYENNE: 'bleu', HAUTE: 'ambre', CRITIQUE: 'rouge' };

/** RG17/RG18 — non-conformités générées automatiquement à la validation d'une évaluation, et leur plan d'actions correctives. */
export default function NonConformites() {
  const { entrepriseId, auditId } = useParams();
  const { entreprises } = useApiAuth();
  const entreprise = entreprises.find((e) => e.id === entrepriseId);

  const [nonConformites, setNonConformites] = useState(null);
  const [chargement, setChargement] = useState(true);
  const [erreurGlobale, setErreurGlobale] = useState(null);

  const rafraichir = useCallback(() => {
    setChargement(true);
    setErreurGlobale(null);
    api
      .get(`/api/v1/entreprises/${entrepriseId}/audits/${auditId}/non-conformites`)
      .then(setNonConformites)
      .catch((err) => setErreurGlobale(err instanceof ApiError ? err.message : 'Erreur inattendue'))
      .finally(() => setChargement(false));
  }, [entrepriseId, auditId]);

  useEffect(() => {
    rafraichir();
  }, [rafraichir]);

  if (!entreprise) {
    return <Vide message="Entreprise introuvable ou non accessible." />;
  }

  return (
    <>
      <Link to={`/app/${entrepriseId}/audits/${auditId}`} className="btn-ghost mb-4 -ml-2">
        <ArrowLeft className="h-4 w-4" aria-hidden />
        Retour à la mission
      </Link>

      <PageTitre
        icone={ClipboardX}
        titre="Non-conformités"
        description="RG17/RG18 — écarts détectés lors des évaluations et plan d’actions correctives associé."
      />

      {erreurGlobale ? <Alerte ton="rouge">{erreurGlobale}</Alerte> : null}

      {chargement ? (
        <Loader message="Chargement des non-conformités…" />
      ) : nonConformites && nonConformites.length > 0 ? (
        <div className="space-y-3">
          {nonConformites.map((nc) => (
            <Revele key={nc.id}>
              <NonConformeCard nc={nc} entrepriseId={entrepriseId} auditId={auditId} onChange={rafraichir} />
            </Revele>
          ))}
        </div>
      ) : (
        <Vide message="Aucune non-conformité pour l’instant — soit l’audit vient de commencer, soit tous les critères évalués sont pleinement conformes." />
      )}
    </>
  );
}

function NonConformeCard({ nc, entrepriseId, auditId, onChange }) {
  const [chargement, setChargement] = useState(false);
  const [erreur, setErreur] = useState(null);
  const [actions, setActions] = useState(null);
  const [afficherFormulaire, setAfficherFormulaire] = useState(false);

  const rafraichirActions = useCallback(() => {
    api
      .get(`/api/v1/entreprises/${entrepriseId}/audits/${auditId}/non-conformites/${nc.id}/actions`)
      .then(setActions)
      .catch(() => setActions([]));
  }, [entrepriseId, auditId, nc.id]);

  useEffect(() => {
    rafraichirActions();
  }, [rafraichirActions]);

  async function changerStatut(statut) {
    setErreur(null);
    setChargement(true);
    try {
      await api.put(`/api/v1/entreprises/${entrepriseId}/audits/${auditId}/non-conformites/${nc.id}/statut`, { statut });
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
          <p className="font-mono text-xs text-ink-500">{nc.critereCode}</p>
          <p className="font-medium text-ink-900">{nc.titre}</p>
          <p className="mt-1 text-xs text-ink-500">Détectée le {formaterDate(nc.createdAt)}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge ton={TONS_NIVEAU[nc.niveau] ?? 'neutre'} icone={nc.niveau === 'CRITIQUE' ? AlertTriangle : undefined}>
            {nc.niveau}
          </Badge>
          <Badge ton={TONS_STATUT_NC[nc.statut] ?? 'neutre'}>{nc.statut}</Badge>
        </div>
      </div>

      {nc.description ? <p className="mt-3 whitespace-pre-line text-sm text-ink-700">{nc.description}</p> : null}

      {erreur ? (
        <div className="mt-3">
          <Alerte ton="rouge">{erreur}</Alerte>
        </div>
      ) : null}

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <label className="label mb-0" htmlFor={`nc-statut-${nc.id}`}>
          Statut de traitement
        </label>
        <select
          id={`nc-statut-${nc.id}`}
          className="input w-auto"
          value={nc.statut}
          disabled={chargement}
          onChange={(e) => changerStatut(e.target.value)}
        >
          <option value="OUVERTE">OUVERTE</option>
          <option value="EN_TRAITEMENT">EN_TRAITEMENT</option>
          <option value="CLOTUREE">CLOTUREE</option>
        </select>
        {chargement ? <SustwayLoader taille="sm" /> : null}
      </div>

      <div className="mt-4 border-t border-ink-100 pt-4">
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium uppercase tracking-wide text-ink-500">
            Actions correctives {actions ? `(${actions.length})` : ''}
          </p>
          <button type="button" className="btn-ghost" onClick={() => setAfficherFormulaire((v) => !v)}>
            <PlusCircle className="h-4 w-4" aria-hidden />
            Ajouter
          </button>
        </div>

        {afficherFormulaire ? (
          <NouvelleActionFormulaire
            entrepriseId={entrepriseId}
            auditId={auditId}
            nonConformeId={nc.id}
            onCree={() => {
              setAfficherFormulaire(false);
              rafraichirActions();
            }}
          />
        ) : null}

        {actions === null ? null : actions.length > 0 ? (
          <ul className="mt-3 space-y-2">
            {actions.map((a) => (
              <ActionCorrectiveItem
                key={a.id}
                action={a}
                entrepriseId={entrepriseId}
                auditId={auditId}
                nonConformeId={nc.id}
                onChange={rafraichirActions}
              />
            ))}
          </ul>
        ) : !afficherFormulaire ? (
          <p className="mt-3 text-xs text-ink-500">Aucune action corrective pour l’instant.</p>
        ) : null}
      </div>
    </Card>
  );
}

function ActionCorrectiveItem({ action, entrepriseId, auditId, nonConformeId, onChange }) {
  const [chargement, setChargement] = useState(false);

  async function changerStatut(statut) {
    setChargement(true);
    try {
      await api.put(
        `/api/v1/entreprises/${entrepriseId}/audits/${auditId}/non-conformites/${nonConformeId}/actions/${action.id}/statut`,
        { statut }
      );
      onChange();
    } catch {
      // l'échec reste visible : le select revient à la valeur précédente au prochain rafraîchissement
    } finally {
      setChargement(false);
    }
  }

  return (
    <li className="rounded-xl border border-ink-100 bg-white p-3 text-sm">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="font-medium text-ink-900">{action.titre}</p>
          {action.description ? <p className="mt-0.5 text-xs text-ink-500">{action.description}</p> : null}
          <p className="mt-1 text-xs text-ink-400">
            {action.responsableNom ? `Responsable : ${action.responsableNom}` : 'Sans responsable assigné'}
            {action.dateEcheance ? ` — échéance le ${formaterDate(action.dateEcheance)}` : ''}
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <Badge ton={TONS_PRIORITE[action.priorite] ?? 'neutre'}>{action.priorite}</Badge>
          <select
            className="input w-auto py-1 text-xs"
            value={action.statut}
            disabled={chargement}
            onChange={(e) => changerStatut(e.target.value)}
          >
            <option value="OUVERTE">OUVERTE</option>
            <option value="EN_COURS">EN_COURS</option>
            <option value="TERMINEE">TERMINEE</option>
            <option value="VALIDEE">VALIDEE</option>
          </select>
        </div>
      </div>
    </li>
  );
}

function NouvelleActionFormulaire({ entrepriseId, auditId, nonConformeId, onCree }) {
  const [formulaire, setFormulaire] = useState({ titre: '', description: '', dateEcheance: '', priorite: 'MOYENNE' });
  const [chargement, setChargement] = useState(false);
  const [erreur, setErreur] = useState(null);

  async function creer(e) {
    e.preventDefault();
    setErreur(null);
    setChargement(true);
    try {
      const corps = { ...formulaire, dateEcheance: formulaire.dateEcheance || null };
      await api.post(
        `/api/v1/entreprises/${entrepriseId}/audits/${auditId}/non-conformites/${nonConformeId}/actions`,
        corps
      );
      onCree();
    } catch (err) {
      setErreur(err instanceof ApiError ? err.message : 'Erreur inattendue');
    } finally {
      setChargement(false);
    }
  }

  return (
    <form className="mt-3 space-y-3 rounded-lg border border-dashed border-ink-200 p-3" onSubmit={creer}>
      {erreur ? <Alerte ton="rouge">{erreur}</Alerte> : null}
      <div>
        <label className="label" htmlFor={`action-titre-${nonConformeId}`}>
          Titre de l’action
        </label>
        <input
          id={`action-titre-${nonConformeId}`}
          required
          className="input"
          placeholder="Formaliser la politique RH…"
          value={formulaire.titre}
          onChange={(e) => setFormulaire({ ...formulaire, titre: e.target.value })}
        />
      </div>
      <div>
        <label className="label" htmlFor={`action-description-${nonConformeId}`}>
          Description (optionnelle)
        </label>
        <input
          id={`action-description-${nonConformeId}`}
          className="input"
          value={formulaire.description}
          onChange={(e) => setFormulaire({ ...formulaire, description: e.target.value })}
        />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor={`action-echeance-${nonConformeId}`}>
            Échéance (optionnelle)
          </label>
          <input
            id={`action-echeance-${nonConformeId}`}
            type="date"
            className="input"
            value={formulaire.dateEcheance}
            onChange={(e) => setFormulaire({ ...formulaire, dateEcheance: e.target.value })}
          />
        </div>
        <div>
          <label className="label" htmlFor={`action-priorite-${nonConformeId}`}>
            Priorité
          </label>
          <select
            id={`action-priorite-${nonConformeId}`}
            className="input"
            value={formulaire.priorite}
            onChange={(e) => setFormulaire({ ...formulaire, priorite: e.target.value })}
          >
            <option value="BASSE">BASSE</option>
            <option value="MOYENNE">MOYENNE</option>
            <option value="HAUTE">HAUTE</option>
            <option value="CRITIQUE">CRITIQUE</option>
          </select>
        </div>
      </div>
      <button type="submit" className="btn-primary" disabled={chargement}>
        {chargement ? <SustwayLoader taille="sm" /> : null}
        Créer l’action
      </button>
    </form>
  );
}

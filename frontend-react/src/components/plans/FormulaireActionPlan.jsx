import { useState } from 'react';
import { Alerte } from '../ui';
import SustwayLoader from '../SustwayLoader';
import SelecteurResponsable from './SelecteurResponsable';
import { PRIORITES } from '../../lib/plansAction';

/**
 * Création ou modification d'une action de plan.
 *
 * Les axes proposés sont uniquement ceux qui sont <strong>validés</strong> :
 * l'API refuse les autres en 409, et un axe encore proposé n'a pas été
 * accepté — le planifier engagerait du travail sur une décision qui n'a pas
 * été prise.
 *
 * À la modification, le rattachement aux axes n'est pas repris : l'API ne
 * l'expose pas sur cette route, et l'afficher laisserait croire qu'il se
 * modifie ici.
 */
export default function FormulaireActionPlan({
  entrepriseId,
  action,
  axesValides,
  onEnregistrer,
  onAnnuler,
}) {
  const enCreation = !action;
  const [formulaire, setFormulaire] = useState({
    titre: action?.titre ?? '',
    description: action?.description ?? '',
    dateEcheance: action?.dateEcheance ?? '',
    priorite: action?.priorite ?? 'MOYENNE',
    responsableId: action?.responsableId ?? null,
    axeIds: [],
  });
  const [chargement, setChargement] = useState(false);
  const [erreur, setErreur] = useState(null);

  function basculerAxe(axeId) {
    setFormulaire((precedent) => ({
      ...precedent,
      axeIds: precedent.axeIds.includes(axeId)
        ? precedent.axeIds.filter((id) => id !== axeId)
        : [...precedent.axeIds, axeId],
    }));
  }

  async function soumettre(e) {
    e.preventDefault();
    setErreur(null);
    setChargement(true);
    try {
      const corps = {
        titre: formulaire.titre,
        description: formulaire.description || null,
        dateEcheance: formulaire.dateEcheance || null,
        priorite: formulaire.priorite,
      };
      await onEnregistrer(
        enCreation
          ? { ...corps, responsableId: formulaire.responsableId || null, axeIds: formulaire.axeIds }
          : corps
      );
    } catch (err) {
      setErreur(err);
    } finally {
      setChargement(false);
    }
  }

  return (
    <form className="mt-4 space-y-3" onSubmit={soumettre}>
      <div>
        <label className="label" htmlFor="action-titre">
          Intitulé de l’action
        </label>
        <input
          id="action-titre"
          required
          maxLength={255}
          className="input"
          placeholder="Formaliser et diffuser la politique RSE"
          value={formulaire.titre}
          onChange={(e) => setFormulaire({ ...formulaire, titre: e.target.value })}
        />
      </div>

      <div>
        <label className="label" htmlFor="action-description">
          Description
        </label>
        <textarea
          id="action-description"
          className="input"
          rows={2}
          value={formulaire.description}
          onChange={(e) => setFormulaire({ ...formulaire, description: e.target.value })}
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="action-echeance">
            Échéance
          </label>
          <input
            id="action-echeance"
            type="date"
            className="input"
            value={formulaire.dateEcheance}
            onChange={(e) => setFormulaire({ ...formulaire, dateEcheance: e.target.value })}
          />
        </div>
        <div>
          <label className="label" htmlFor="action-priorite">
            Priorité
          </label>
          <select
            id="action-priorite"
            className="input"
            value={formulaire.priorite}
            onChange={(e) => setFormulaire({ ...formulaire, priorite: e.target.value })}
          >
            {PRIORITES.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </div>
      </div>

      {enCreation ? (
        <>
          <SelecteurResponsable
            id="action-responsable"
            entrepriseId={entrepriseId}
            valeur={formulaire.responsableId}
            onChange={(v) => setFormulaire({ ...formulaire, responsableId: v })}
          />

          <div>
            <span className="label">Axes d’amélioration traités</span>
            {axesValides === null ? (
              <p className="text-xs text-ink-500">Chargement des axes…</p>
            ) : axesValides.length === 0 ? (
              <p className="text-xs italic text-ink-500">
                Aucun axe validé sur cette mission. Un axe doit être validé avant de pouvoir être
                planifié.
              </p>
            ) : (
              <ul className="mt-1 space-y-1.5">
                {axesValides.map((axe) => (
                  <li key={axe.id}>
                    <label className="flex items-start gap-2 text-sm text-ink-700">
                      <input
                        type="checkbox"
                        className="mt-0.5"
                        checked={formulaire.axeIds.includes(axe.id)}
                        onChange={() => basculerAxe(axe.id)}
                      />
                      <span>
                        {axe.libelle}
                        {axe.critereCode ? (
                          <span className="ml-1 font-mono text-xs text-ink-400">
                            {axe.critereCode}
                          </span>
                        ) : null}
                      </span>
                    </label>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      ) : null}

      {erreur ? <Alerte ton="rouge">{erreur.message}</Alerte> : null}

      <div className="flex flex-wrap gap-2">
        <button
          type="submit"
          className="btn-primary"
          disabled={chargement || !formulaire.titre.trim()}
        >
          {chargement ? <SustwayLoader taille="sm" /> : null}
          {enCreation ? 'Ajouter l’action' : 'Enregistrer'}
        </button>
        <button type="button" className="btn-ghost" onClick={onAnnuler}>
          Annuler
        </button>
      </div>
    </form>
  );
}

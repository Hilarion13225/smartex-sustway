import { useState } from 'react';
import { Alerte } from '../ui';
import SustwayLoader from '../SustwayLoader';
import SelecteurResponsable from './SelecteurResponsable';

/**
 * Création ou modification d'un plan d'amélioration.
 *
 * Un plan est construit par une personne : l'IA propose des axes, elle ne
 * prend pas d'engagement organisationnel. Aucun champ n'est donc pré-rempli
 * par une suggestion automatique.
 */
export default function FormulairePlan({ entrepriseId, plan, onEnregistrer, onAnnuler }) {
  const [formulaire, setFormulaire] = useState({
    titre: plan?.titre ?? '',
    description: plan?.description ?? '',
    dateEcheance: plan?.dateEcheance ?? '',
    responsableId: plan?.responsableId ?? null,
  });
  const [chargement, setChargement] = useState(false);
  const [erreur, setErreur] = useState(null);

  async function soumettre(e) {
    e.preventDefault();
    setErreur(null);
    setChargement(true);
    try {
      await onEnregistrer({
        titre: formulaire.titre,
        description: formulaire.description || null,
        dateEcheance: formulaire.dateEcheance || null,
        responsableId: formulaire.responsableId || null,
      });
    } catch (err) {
      setErreur(err);
    } finally {
      setChargement(false);
    }
  }

  return (
    <form className="mt-4 space-y-3" onSubmit={soumettre}>
      <div>
        <label className="label" htmlFor="plan-titre">
          Intitulé du plan
        </label>
        <input
          id="plan-titre"
          required
          maxLength={255}
          className="input"
          placeholder="Renforcer la gouvernance RSE"
          value={formulaire.titre}
          onChange={(e) => setFormulaire({ ...formulaire, titre: e.target.value })}
        />
      </div>

      <div>
        <label className="label" htmlFor="plan-description">
          Description
        </label>
        <textarea
          id="plan-description"
          className="input"
          rows={3}
          value={formulaire.description}
          onChange={(e) => setFormulaire({ ...formulaire, description: e.target.value })}
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="plan-echeance">
            Échéance
          </label>
          <input
            id="plan-echeance"
            type="date"
            className="input"
            value={formulaire.dateEcheance}
            onChange={(e) => setFormulaire({ ...formulaire, dateEcheance: e.target.value })}
          />
        </div>
        <SelecteurResponsable
          id="plan-responsable"
          entrepriseId={entrepriseId}
          valeur={formulaire.responsableId}
          onChange={(v) => setFormulaire({ ...formulaire, responsableId: v })}
        />
      </div>

      {erreur ? <Alerte ton="rouge">{erreur.message}</Alerte> : null}

      <div className="flex flex-wrap gap-2">
        <button type="submit" className="btn-primary" disabled={chargement || !formulaire.titre.trim()}>
          {chargement ? <SustwayLoader taille="sm" /> : null}
          {plan ? 'Enregistrer' : 'Créer le plan'}
        </button>
        <button type="button" className="btn-ghost" onClick={onAnnuler}>
          Annuler
        </button>
      </div>
    </form>
  );
}

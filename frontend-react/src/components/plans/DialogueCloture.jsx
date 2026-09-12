import { useState } from 'react';
import { Alerte } from '../ui';
import SustwayLoader from '../SustwayLoader';

/**
 * Clôturer ou archiver un plan — deux gestes voisins, et volontairement
 * distingués.
 *
 * <p><strong>Clôturer</strong> : le plan est arrivé à son terme. Le motif est
 * obligatoire, comme en base : un plan clôturé sans motif ne se relit pas six
 * mois plus tard.
 *
 * <p><strong>Archiver</strong> : le plan est retiré sans avoir été mené à
 * terme. C'est ce qui tient lieu de suppression — rien n'est jamais effacé.
 * Le motif y est utile, mais pas exigé.
 *
 * Les deux gèlent le plan définitivement, ce que la confirmation annonce
 * avant le geste plutôt qu'après.
 */
export default function DialogueCloture({ mode, onConfirmer, onAnnuler }) {
  const [motif, setMotif] = useState('');
  const [chargement, setChargement] = useState(false);
  const [erreur, setErreur] = useState(null);

  const estCloture = mode === 'CLOTURE';
  const motifSuffisant = estCloture ? motif.trim().length > 0 : true;

  async function confirmer(e) {
    e.preventDefault();
    setErreur(null);
    setChargement(true);
    try {
      await onConfirmer(motif.trim() || null);
    } catch (err) {
      setErreur(err);
    } finally {
      setChargement(false);
    }
  }

  return (
    <form className="mt-4 space-y-3" onSubmit={confirmer}>
      <Alerte ton="ambre">
        {estCloture
          ? 'Clôturer ce plan le gèle définitivement : il ne pourra plus être modifié, ni ses actions.'
          : 'Archiver ce plan le retire du suivi et le gèle définitivement. Rien n’est supprimé.'}
      </Alerte>

      <div>
        <label className="label" htmlFor="motif-cloture">
          Motif {estCloture ? '' : '(facultatif)'}
        </label>
        <textarea
          id="motif-cloture"
          className="input"
          rows={2}
          required={estCloture}
          placeholder={
            estCloture
              ? 'Tous les objectifs du plan ont été atteints.'
              : 'Réorganisation des priorités.'
          }
          value={motif}
          onChange={(e) => setMotif(e.target.value)}
        />
      </div>

      {erreur ? <Alerte ton="rouge">{erreur.message}</Alerte> : null}

      <div className="flex flex-wrap gap-2">
        <button type="submit" className="btn-primary" disabled={!motifSuffisant || chargement}>
          {chargement ? <SustwayLoader taille="sm" /> : null}
          {estCloture ? 'Confirmer la clôture' : 'Confirmer l’archivage'}
        </button>
        <button type="button" className="btn-ghost" onClick={onAnnuler}>
          Annuler
        </button>
      </div>
    </form>
  );
}

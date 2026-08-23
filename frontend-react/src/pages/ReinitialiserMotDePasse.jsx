import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { KeyRound } from 'lucide-react';
import CadreAuth from '../components/CadreAuth';
import SustwayLoader from '../components/SustwayLoader';
import { Alerte } from '../components/ui';
import { useApiAuth } from '../auth/useApiAuth';
import { ApiError } from '../lib/apiClient';

const ATOUTS = [
  'Vos scores, preuves et plans d’action réunis dans un seul espace sécurisé.',
  'Double authentification disponible sur chaque compte.',
  'Suivi de la conformité domaine par domaine, dans le temps.',
];

/** Lien reçu par email (mot de passe oublié) : ?token=... — voir AuthResource.reinitialiserMotDePasse. */
export default function ReinitialiserMotDePasse() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const navigate = useNavigate();
  const { reinitialiserMotDePasse } = useApiAuth();

  const [motDePasse, setMotDePasse] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [chargement, setChargement] = useState(false);
  const [erreur, setErreur] = useState(null);

  async function soumettre(e) {
    e.preventDefault();
    setErreur(null);

    if (motDePasse !== confirmation) {
      setErreur('La confirmation ne correspond pas au mot de passe saisi.');
      return;
    }
    if (!token) {
      setErreur('Lien de réinitialisation incomplet : aucun token trouvé.');
      return;
    }

    setChargement(true);
    try {
      await reinitialiserMotDePasse(token, motDePasse);
      navigate('/app');
    } catch (err) {
      setErreur(err instanceof ApiError ? err.message : 'Erreur inattendue');
    } finally {
      setChargement(false);
    }
  }

  return (
    <CadreAuth
      badge={
        <>
          <KeyRound className="h-3.5 w-3.5" aria-hidden />
          Nouveau mot de passe
        </>
      }
      titre="Choisissez un nouveau mot de passe"
      description="Ce lien est valable 1 heure après la demande."
      atouts={ATOUTS}
    >
      <form className="space-y-5" onSubmit={soumettre}>
        {erreur ? <Alerte ton="rouge">{erreur}</Alerte> : null}

        <div>
          <label className="label" htmlFor="reinit-mdp">
            Nouveau mot de passe (10 caractères minimum)
          </label>
          <input
            id="reinit-mdp"
            type="password"
            required
            minLength={10}
            className="input"
            value={motDePasse}
            onChange={(e) => setMotDePasse(e.target.value)}
          />
        </div>
        <div>
          <label className="label" htmlFor="reinit-confirmation">
            Confirmer le mot de passe
          </label>
          <input
            id="reinit-confirmation"
            type="password"
            required
            minLength={10}
            className="input"
            value={confirmation}
            onChange={(e) => setConfirmation(e.target.value)}
          />
        </div>

        <button type="submit" className="btn-vitrine w-full" disabled={chargement}>
          {chargement ? <SustwayLoader taille="sm" /> : <KeyRound className="h-4 w-4" aria-hidden />}
          Réinitialiser et me connecter
        </button>
      </form>
    </CadreAuth>
  );
}

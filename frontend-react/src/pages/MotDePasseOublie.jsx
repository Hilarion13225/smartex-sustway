import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, KeyRound, Mail } from 'lucide-react';
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

/**
 * Ne confirme jamais si l'adresse correspond à un compte (même logique
 * anti-énumération que côté API, AuthResource.motDePasseOublie) : le
 * message de confirmation est identique dans tous les cas.
 */
export default function MotDePasseOublie() {
  const { demanderReinitialisationMotDePasse } = useApiAuth();
  const [email, setEmail] = useState('');
  const [chargement, setChargement] = useState(false);
  const [envoye, setEnvoye] = useState(false);
  const [erreur, setErreur] = useState(null);

  async function soumettre(e) {
    e.preventDefault();
    setErreur(null);
    setChargement(true);
    try {
      await demanderReinitialisationMotDePasse(email);
      setEnvoye(true);
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
          Mot de passe oublié
        </>
      }
      titre="Réinitialiser votre mot de passe"
      description="Recevez un lien par email pour choisir un nouveau mot de passe."
      atouts={ATOUTS}
    >
      {envoye ? (
        <div className="space-y-4 text-center">
          <Alerte ton="vert">
            Si un compte existe avec l’adresse <strong>{email}</strong>, un email contenant un lien de
            réinitialisation vient de lui être envoyé (valable 1 heure).
          </Alerte>
          <Link to="/connexion" className="btn-vitrine-clair inline-flex w-full justify-center">
            Retour à la connexion
          </Link>
        </div>
      ) : (
        <form className="space-y-5" onSubmit={soumettre}>
          {erreur ? <Alerte ton="rouge">{erreur}</Alerte> : null}

          <div>
            <label className="label" htmlFor="email-oublie">
              Email
            </label>
            <div className="relative">
              <input
                id="email-oublie"
                type="email"
                required
                autoComplete="email"
                placeholder="vous@entreprise.com"
                className="champ-auth peer"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <Mail className="icone-champ" aria-hidden />
            </div>
          </div>

          <button type="submit" className="btn-vitrine w-full" disabled={chargement}>
            {chargement ? <SustwayLoader taille="sm" /> : null}
            Envoyer le lien
            <ArrowRight className="h-4 w-4" aria-hidden />
          </button>

          <p className="text-center text-sm text-ink-500">
            <Link to="/connexion" className="font-medium text-brand-700 hover:underline">
              Retour à la connexion
            </Link>
          </p>
        </form>
      )}
    </CadreAuth>
  );
}

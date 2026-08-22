import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { CheckCircle2, Mail, XCircle } from 'lucide-react';
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
 * Page atteinte en cliquant le lien de l'email de vérification (RG36).
 * Le lien pointe ici (frontend) plutôt que directement sur l'API : c'est
 * cette page qui appelle l'API en arrière-plan et affiche un résultat
 * lisible, au lieu d'exposer du JSON brut au clic.
 */
export default function VerificationEmail() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const { verifierEmail } = useApiAuth();

  const [statut, setStatut] = useState('en_cours'); // 'en_cours' | 'succes' | 'erreur'
  const [erreur, setErreur] = useState(null);
  const dejaLance = useRef(false);

  useEffect(() => {
    if (dejaLance.current) return;
    dejaLance.current = true;

    if (!token) {
      setStatut('erreur');
      setErreur('Lien de vérification incomplet : aucun token trouvé.');
      return;
    }

    verifierEmail(token)
      .then(() => setStatut('succes'))
      .catch((err) => {
        setStatut('erreur');
        setErreur(err instanceof ApiError ? err.message : 'Lien de vérification invalide ou expiré');
      });
  }, [token, verifierEmail]);

  return (
    <CadreAuth
      badge={
        <>
          <Mail className="h-3.5 w-3.5" aria-hidden />
          Vérification d’email
        </>
      }
      titre={
        statut === 'succes'
          ? 'Adresse email vérifiée'
          : statut === 'erreur'
            ? 'Vérification impossible'
            : 'Vérification en cours…'
      }
      description="RG36 — votre compte n’est activé qu’après vérification de l’email."
      atouts={ATOUTS}
    >
      <div className="flex flex-col items-center gap-5 py-4 text-center">
        {statut === 'en_cours' ? <SustwayLoader taille="lg" /> : null}

        {statut === 'succes' ? (
          <>
            <CheckCircle2 className="h-12 w-12 text-brand-600" aria-hidden />
            <p className="text-sm text-ink-600">
              Votre adresse email est vérifiée et votre compte est actif. Vous pouvez maintenant vous connecter.
            </p>
            <Link to="/connexion" className="btn-vitrine w-full justify-center">
              Se connecter
            </Link>
          </>
        ) : null}

        {statut === 'erreur' ? (
          <>
            <XCircle className="h-12 w-12 text-red-600" aria-hidden />
            <Alerte ton="rouge">{erreur}</Alerte>
            <p className="text-sm text-ink-500">
              Le lien a peut-être déjà été utilisé ou a expiré (validité 24 heures). Réessayez de vous inscrire, ou
              connectez-vous si votre compte est déjà actif.
            </p>
            <Link to="/inscription" className="btn-ghost w-full justify-center">
              Retour à l’inscription
            </Link>
          </>
        ) : null}
      </div>
    </CadreAuth>
  );
}

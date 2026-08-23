import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, Eye, EyeOff, KeyRound, Lock, Mail, ShieldCheck, Smartphone } from 'lucide-react';
import SustwayLoader from '../components/SustwayLoader';
import CadreAuth from '../components/CadreAuth';
import { useApiAuth } from '../auth/useApiAuth';
import { Alerte } from '../components/ui';
import { ApiError } from '../lib/apiClient';

const ATOUTS = [
  'Vos scores, preuves et plans d’action réunis dans un seul espace sécurisé.',
  'Double authentification disponible sur chaque compte.',
  'Suivi de la conformité domaine par domaine, dans le temps.',
];

/**
 * Connexion RÉELLE — parle effectivement à l'API Quarkus (voir useApiAuth).
 * Pour la création de compte, voir /inscription (le vrai wizard, désormais
 * connecté au backend) : cette page ne gère plus que la connexion, y
 * compris l'étape 2FA (RG36) si elle est active sur le compte.
 */
export default function ConnexionReelle() {
  const navigate = useNavigate();
  const { connecter, confirmerDeuxFa } = useApiAuth();

  const [etape, setEtape] = useState('identifiants'); // 'identifiants' | '2fa'
  const [email, setEmail] = useState('');
  const [motDePasse, setMotDePasse] = useState('');
  const [motDePasseVisible, setMotDePasseVisible] = useState(false);
  const [chargement, setChargement] = useState(false);
  const [erreur, setErreur] = useState(null);

  const [methode2fa, setMethode2fa] = useState(null);
  const [tokenPreAuth, setTokenPreAuth] = useState(null);
  const [code2fa, setCode2fa] = useState('');

  async function soumettreIdentifiants(e) {
    e.preventDefault();
    setErreur(null);
    setChargement(true);
    try {
      const reponse = await connecter(email, motDePasse);
      if (reponse.deuxFaRequise) {
        setMethode2fa(reponse.methode);
        setTokenPreAuth(reponse.tokenPreAuth);
        setEtape('2fa');
      } else {
        navigate('/app');
      }
    } catch (err) {
      setErreur(err instanceof ApiError ? err.message : 'Erreur inattendue');
    } finally {
      setChargement(false);
    }
  }

  async function soumettreCode2fa(e) {
    e.preventDefault();
    setErreur(null);
    setChargement(true);
    try {
      await confirmerDeuxFa(tokenPreAuth, code2fa);
      navigate('/app');
    } catch (err) {
      setErreur(err instanceof ApiError ? err.message : 'Code invalide');
    } finally {
      setChargement(false);
    }
  }

  const enDeuxFa = etape === '2fa';

  return (
    <CadreAuth
      badge={
        <>
          <Lock className="h-3.5 w-3.5" aria-hidden />
          Espace client
        </>
      }
      titre={enDeuxFa ? 'Vérification en deux étapes' : 'Content de vous revoir'}
      description={
        enDeuxFa
          ? 'Saisissez le code de sécurité pour finaliser la connexion.'
          : 'Connectez-vous pour retrouver vos évaluations RSE et vos plans d’action.'
      }
      atouts={ATOUTS}
    >
      {etape === 'identifiants' ? (
        <form className="space-y-5" onSubmit={soumettreIdentifiants}>
          {erreur ? <Alerte ton="rouge">{erreur}</Alerte> : null}

          <div>
            <label className="label" htmlFor="email-connexion">
              Email
            </label>
            <div className="relative">
              <input
                id="email-connexion"
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

          <div>
            <div className="flex items-center justify-between">
              <label className="label mb-0" htmlFor="mdp-connexion">
                Mot de passe
              </label>
              <Link to="/mot-de-passe-oublie" className="text-xs font-medium text-brand-700 hover:underline">
                Mot de passe oublié ?
              </Link>
            </div>
            <div className="relative">
              <input
                id="mdp-connexion"
                type={motDePasseVisible ? 'text' : 'password'}
                required
                autoComplete="current-password"
                placeholder="••••••••••"
                className="champ-auth peer pr-11"
                value={motDePasse}
                onChange={(e) => setMotDePasse(e.target.value)}
              />
              <Lock className="icone-champ" aria-hidden />
              <button
                type="button"
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-ink-400 transition-colors hover:bg-ink-100 hover:text-ink-700"
                onClick={() => setMotDePasseVisible((v) => !v)}
                aria-label={motDePasseVisible ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
              >
                {motDePasseVisible ? <EyeOff className="h-4 w-4" aria-hidden /> : <Eye className="h-4 w-4" aria-hidden />}
              </button>
            </div>
          </div>

          <button type="submit" className="btn-vitrine w-full" disabled={chargement}>
            {chargement ? <SustwayLoader taille="sm" /> : null}
            Se connecter
            <ArrowRight className="h-4 w-4" aria-hidden />
          </button>

          <p className="text-center text-sm text-ink-500">
            Pas encore de compte ?{' '}
            <Link to="/inscription" className="font-medium text-brand-700 hover:underline">
              Créer un compte
            </Link>
          </p>
        </form>
      ) : (
        <form className="space-y-5" onSubmit={soumettreCode2fa}>
          <Alerte ton="bleu">
            {methode2fa === 'APP' ? (
              <>
                <ShieldCheck className="mr-1 inline h-4 w-4" aria-hidden />
                Ouvrez votre application d’authentification et saisissez le code affiché.
              </>
            ) : (
              <>
                <Smartphone className="mr-1 inline h-4 w-4" aria-hidden />
                Un code a été envoyé par SMS (mode dev : consultez les logs de <code>mvn quarkus:dev</code>).
              </>
            )}
          </Alerte>
          {erreur ? <Alerte ton="rouge">{erreur}</Alerte> : null}

          <div>
            <label className="label" htmlFor="code-2fa">
              Code à 6 chiffres
            </label>
            <input
              id="code-2fa"
              required
              maxLength={6}
              inputMode="numeric"
              autoComplete="one-time-code"
              className="input text-center text-2xl font-semibold tracking-[0.5em]"
              placeholder="000000"
              value={code2fa}
              onChange={(e) => setCode2fa(e.target.value.replace(/\D/g, ''))}
            />
            <div className="mt-3 flex justify-center gap-1.5" aria-hidden>
              {[0, 1, 2, 3, 4, 5].map((index) => (
                <span
                  key={index}
                  className={`h-1.5 w-8 rounded-full transition-colors duration-300 ${
                    index < code2fa.length ? 'bg-brand-500' : 'bg-ink-200'
                  }`}
                />
              ))}
            </div>
          </div>

          <button type="submit" className="btn-vitrine w-full" disabled={chargement || code2fa.length < 6}>
            {chargement ? <SustwayLoader taille="sm" /> : <KeyRound className="h-4 w-4" aria-hidden />}
            Valider
          </button>
          <button
            type="button"
            className="btn-ghost w-full"
            onClick={() => {
              setEtape('identifiants');
              setCode2fa('');
              setErreur(null);
            }}
          >
            Retour
          </button>
        </form>
      )}
    </CadreAuth>
  );
}

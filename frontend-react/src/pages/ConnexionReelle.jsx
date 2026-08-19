import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, KeyRound, Loader2, ServerCog, ShieldCheck, Smartphone } from 'lucide-react';
import { useApiAuth } from '../auth/useApiAuth';
import { Alerte } from '../components/ui';
import { ApiError } from '../lib/apiClient';

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

  return (
    <div className="min-h-full bg-ink-50 py-10">
      <div className="mx-auto max-w-md px-5">
        <Link to="/" className="btn-ghost mb-4 -ml-2">
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Retour à l’accueil
        </Link>

        <div className="card p-6">
          <div className="flex items-center gap-3">
            <span className="rounded-lg bg-ink-800 p-2 text-white">
              <ServerCog className="h-5 w-5" aria-hidden />
            </span>
            <div>
              <h1 className="text-lg font-semibold">Connexion</h1>
              <p className="text-sm text-ink-500">Espace connecté — données réelles.</p>
            </div>
          </div>

          {etape === 'identifiants' ? (
            <form className="mt-6 space-y-4" onSubmit={soumettreIdentifiants}>
              {erreur ? <Alerte ton="rouge">{erreur}</Alerte> : null}
              <div>
                <label className="label" htmlFor="email-connexion">
                  Email
                </label>
                <input
                  id="email-connexion"
                  type="email"
                  required
                  className="input"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div>
                <label className="label" htmlFor="mdp-connexion">
                  Mot de passe
                </label>
                <input
                  id="mdp-connexion"
                  type="password"
                  required
                  className="input"
                  value={motDePasse}
                  onChange={(e) => setMotDePasse(e.target.value)}
                />
              </div>
              <button type="submit" className="btn-primary w-full" disabled={chargement}>
                {chargement ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
                Se connecter
                <ArrowRight className="h-4 w-4" aria-hidden />
              </button>
              <p className="text-center text-xs text-ink-500">
                Pas encore de compte ? <Link to="/inscription" className="text-brand-700 underline">Créer un compte</Link>
              </p>
            </form>
          ) : (
            <form className="mt-6 space-y-4" onSubmit={soumettreCode2fa}>
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
                  className="input tracking-[0.4em]"
                  placeholder="000000"
                  value={code2fa}
                  onChange={(e) => setCode2fa(e.target.value.replace(/\D/g, ''))}
                />
              </div>
              <button type="submit" className="btn-primary w-full" disabled={chargement || code2fa.length < 6}>
                {chargement ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
                <KeyRound className="h-4 w-4" aria-hidden />
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
        </div>
      </div>
    </div>
  );
}

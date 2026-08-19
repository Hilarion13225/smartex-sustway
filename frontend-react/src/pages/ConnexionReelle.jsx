import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, KeyRound, Loader2, Mail, ServerCog, ShieldCheck } from 'lucide-react';
import { useApiAuth } from '../auth/useApiAuth';
import { Alerte } from '../components/ui';
import { ApiError } from '../lib/apiClient';

/**
 * Connexion/inscription RÉELLES — cette page parle effectivement à l'API
 * Quarkus (voir useApiAuth). Distincte de /connexion (démonstration sur
 * données mockées) : voir ApiAuthContext.jsx pour le pourquoi de cette
 * séparation.
 */
export default function ConnexionReelle() {
  const [mode, setMode] = useState('connexion'); // 'connexion' | 'inscription' | 'verification'
  const navigate = useNavigate();
  const { connecter, inscrire, verifierEmail } = useApiAuth();

  // --- Connexion ---
  const [emailConnexion, setEmailConnexion] = useState('');
  const [motDePasseConnexion, setMotDePasseConnexion] = useState('');
  const [chargementConnexion, setChargementConnexion] = useState(false);
  const [erreurConnexion, setErreurConnexion] = useState(null);

  async function soumettreConnexion(e) {
    e.preventDefault();
    setErreurConnexion(null);
    setChargementConnexion(true);
    try {
      await connecter(emailConnexion, motDePasseConnexion);
      navigate('/reel');
    } catch (err) {
      setErreurConnexion(err instanceof ApiError ? err.message : 'Erreur inattendue');
    } finally {
      setChargementConnexion(false);
    }
  }

  // --- Inscription ---
  const [formulaire, setFormulaire] = useState({ nom: '', prenom: '', email: '', motDePasse: '' });
  const [chargementInscription, setChargementInscription] = useState(false);
  const [erreurInscription, setErreurInscription] = useState(null);

  async function soumettreInscription(e) {
    e.preventDefault();
    setErreurInscription(null);
    setChargementInscription(true);
    try {
      await inscrire(formulaire.nom, formulaire.prenom, formulaire.email, formulaire.motDePasse);
      setEmailConnexion(formulaire.email);
      setMotDePasseConnexion(formulaire.motDePasse);
      setMode('verification');
    } catch (err) {
      setErreurInscription(err instanceof ApiError ? err.message : 'Erreur inattendue');
    } finally {
      setChargementInscription(false);
    }
  }

  // --- Vérification email (mode dev : pas d'envoi réel d'email, cf. AuthResource.java) ---
  const [tokenColle, setTokenColle] = useState('');
  const [chargementVerification, setChargementVerification] = useState(false);
  const [erreurVerification, setErreurVerification] = useState(null);
  const [verificationReussie, setVerificationReussie] = useState(false);

  async function soumettreVerification(e) {
    e.preventDefault();
    setErreurVerification(null);
    setChargementVerification(true);
    try {
      // Le champ accepte soit le token brut, soit le lien complet copié depuis les logs.
      const token = tokenColle.includes('token=') ? tokenColle.split('token=')[1].trim() : tokenColle.trim();
      await verifierEmail(token);
      setVerificationReussie(true);
    } catch (err) {
      setErreurVerification(err instanceof ApiError ? err.message : 'Erreur inattendue');
    } finally {
      setChargementVerification(false);
    }
  }

  return (
    <div className="min-h-full bg-ink-50 py-10">
      <div className="mx-auto max-w-xl px-5">
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
              <h1 className="text-lg font-semibold">Connexion à l’API réelle</h1>
              <p className="text-sm text-ink-500">
                Phase B — ceci parle effectivement au backend Quarkus, pas à des données de démonstration.
              </p>
            </div>
          </div>

          <div className="mt-6 flex gap-2 border-b border-ink-200">
            {['connexion', 'inscription'].map((m) => (
              <button
                key={m}
                type="button"
                className={`-mb-px border-b-2 px-3 py-2 text-sm font-medium capitalize ${
                  mode === m || (mode === 'verification' && m === 'inscription')
                    ? 'border-brand-600 text-brand-700'
                    : 'border-transparent text-ink-500 hover:text-ink-700'
                }`}
                onClick={() => setMode(m)}
              >
                {m}
              </button>
            ))}
          </div>

          {mode === 'connexion' ? (
            <form className="mt-6 space-y-4" onSubmit={soumettreConnexion}>
              {erreurConnexion ? <Alerte ton="rouge">{erreurConnexion}</Alerte> : null}
              <div>
                <label className="label" htmlFor="email-connexion">
                  Email
                </label>
                <input
                  id="email-connexion"
                  type="email"
                  required
                  className="input"
                  value={emailConnexion}
                  onChange={(e) => setEmailConnexion(e.target.value)}
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
                  value={motDePasseConnexion}
                  onChange={(e) => setMotDePasseConnexion(e.target.value)}
                />
              </div>
              <button type="submit" className="btn-primary w-full" disabled={chargementConnexion}>
                {chargementConnexion ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
                Se connecter
                <ArrowRight className="h-4 w-4" aria-hidden />
              </button>
            </form>
          ) : null}

          {mode === 'inscription' ? (
            <form className="mt-6 space-y-4" onSubmit={soumettreInscription}>
              {erreurInscription ? <Alerte ton="rouge">{erreurInscription}</Alerte> : null}
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="label" htmlFor="prenom">
                    Prénom
                  </label>
                  <input
                    id="prenom"
                    required
                    className="input"
                    value={formulaire.prenom}
                    onChange={(e) => setFormulaire({ ...formulaire, prenom: e.target.value })}
                  />
                </div>
                <div>
                  <label className="label" htmlFor="nom">
                    Nom
                  </label>
                  <input
                    id="nom"
                    required
                    className="input"
                    value={formulaire.nom}
                    onChange={(e) => setFormulaire({ ...formulaire, nom: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <label className="label" htmlFor="email-inscription">
                  Email
                </label>
                <input
                  id="email-inscription"
                  type="email"
                  required
                  className="input"
                  value={formulaire.email}
                  onChange={(e) => setFormulaire({ ...formulaire, email: e.target.value })}
                />
              </div>
              <div>
                <label className="label" htmlFor="mdp-inscription">
                  Mot de passe (10 caractères minimum)
                </label>
                <input
                  id="mdp-inscription"
                  type="password"
                  required
                  minLength={10}
                  className="input"
                  value={formulaire.motDePasse}
                  onChange={(e) => setFormulaire({ ...formulaire, motDePasse: e.target.value })}
                />
              </div>
              <button type="submit" className="btn-primary w-full" disabled={chargementInscription}>
                {chargementInscription ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
                Créer le compte
                <ArrowRight className="h-4 w-4" aria-hidden />
              </button>
            </form>
          ) : null}

          {mode === 'verification' ? (
            <div className="mt-6 space-y-4">
              <Alerte ton="ambre">
                RG36 — le compte n’est activé qu’après vérification de l’email. Aucun service d’envoi d’email n’est
                encore branché (TODO phase C) : le lien de vérification est actuellement affiché dans les logs du
                terminal <code>mvn quarkus:dev</code>. Copiez-y le token (ou le lien complet) et collez-le ci-dessous.
              </Alerte>

              {!verificationReussie ? (
                <form className="space-y-4" onSubmit={soumettreVerification}>
                  {erreurVerification ? <Alerte ton="rouge">{erreurVerification}</Alerte> : null}
                  <div>
                    <label className="label" htmlFor="token-verification">
                      Token de vérification (ou lien complet)
                    </label>
                    <textarea
                      id="token-verification"
                      required
                      rows={3}
                      className="input font-mono text-xs"
                      placeholder="eyJhbGciOi... ou le lien complet copié depuis les logs"
                      value={tokenColle}
                      onChange={(e) => setTokenColle(e.target.value)}
                    />
                  </div>
                  <button type="submit" className="btn-primary w-full" disabled={chargementVerification}>
                    {chargementVerification ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
                    <ShieldCheck className="h-4 w-4" aria-hidden />
                    Vérifier l’email
                  </button>
                </form>
              ) : (
                <div className="space-y-4">
                  <Alerte ton="vert">Email vérifié, compte activé. Vous pouvez maintenant vous connecter.</Alerte>
                  <button type="button" className="btn-primary w-full" onClick={() => setMode('connexion')}>
                    <KeyRound className="h-4 w-4" aria-hidden />
                    Aller à la connexion
                  </button>
                </div>
              )}
            </div>
          ) : null}

          <p className="mt-6 flex items-center gap-1.5 text-xs text-ink-500">
            <Mail className="h-3.5 w-3.5 shrink-0" aria-hidden />
            Cette page utilise le vrai backend (inscription, vérification email, connexion). Le reste de
            l’application (tableaux de bord, audits...) reste sur des données de démonstration tant que les modules
            correspondants ne sont pas construits côté API.
          </p>
        </div>
      </div>
    </div>
  );
}

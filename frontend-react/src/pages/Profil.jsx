import { useState } from 'react';
import { KeyRound, Loader2, ShieldCheck, ShieldOff, Smartphone, UserCog } from 'lucide-react';
import { useApiAuth } from '../auth/useApiAuth';
import { Alerte, Card, CardHeader, PageTitre } from '../components/ui';
import { ApiError } from '../lib/apiClient';

export default function Profil() {
  const { utilisateur } = useApiAuth();

  return (
    <>
      <PageTitre icone={UserCog} titre="Profil & sécurité" description="Informations du compte et double authentification (RG36)." />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-5">
          <CardHeader titre="Profil" icone={ShieldCheck} />
          <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-ink-500">Nom complet</dt>
              <dd className="font-medium">
                {utilisateur?.prenom} {utilisateur?.nom}
              </dd>
            </div>
            <div>
              <dt className="text-ink-500">Email</dt>
              <dd className="font-medium">{utilisateur?.email}</dd>
            </div>
            <div>
              <dt className="text-ink-500">Statut du compte</dt>
              <dd className="font-medium">{utilisateur?.statut}</dd>
            </div>
            <div>
              <dt className="text-ink-500">2FA</dt>
              <dd className="font-medium">{utilisateur?.deuxfaActive ? `Active (${utilisateur.deuxfaMethode})` : 'Inactive'}</dd>
            </div>
          </dl>
        </Card>

        <SectionDeuxFa />
      </div>
    </>
  );
}

function SectionDeuxFa() {
  const {
    utilisateur,
    demarrerActivationAppDeuxFa,
    confirmerActivationAppDeuxFa,
    demarrerActivationSmsDeuxFa,
    confirmerActivationSmsDeuxFa,
    desactiverDeuxFa,
  } = useApiAuth();

  const [mode, setMode] = useState(null); // null | 'app' | 'sms'
  const [secretApp, setSecretApp] = useState(null);
  const [uriApp, setUriApp] = useState(null);
  const [codeApp, setCodeApp] = useState('');

  const [telephone, setTelephone] = useState('');
  const [tokenActivationSms, setTokenActivationSms] = useState(null);
  const [codeSms, setCodeSms] = useState('');

  const [chargement, setChargement] = useState(false);
  const [erreur, setErreur] = useState(null);
  const [succes, setSucces] = useState(null);

  async function lancerApp() {
    setErreur(null);
    setChargement(true);
    try {
      const { secret, uriProvisionnement } = await demarrerActivationAppDeuxFa();
      setSecretApp(secret);
      setUriApp(uriProvisionnement);
      setMode('app');
    } catch (err) {
      setErreur(err instanceof ApiError ? err.message : 'Erreur inattendue');
    } finally {
      setChargement(false);
    }
  }

  async function confirmerApp(e) {
    e.preventDefault();
    setErreur(null);
    setChargement(true);
    try {
      await confirmerActivationAppDeuxFa(codeApp);
      setSucces('2FA application activée.');
      setMode(null);
      setCodeApp('');
    } catch (err) {
      setErreur(err instanceof ApiError ? err.message : 'Code invalide');
    } finally {
      setChargement(false);
    }
  }

  async function lancerSms(e) {
    e.preventDefault();
    setErreur(null);
    setChargement(true);
    try {
      const { tokenActivation } = await demarrerActivationSmsDeuxFa(telephone);
      setTokenActivationSms(tokenActivation);
    } catch (err) {
      setErreur(err instanceof ApiError ? err.message : 'Erreur inattendue');
    } finally {
      setChargement(false);
    }
  }

  async function confirmerSms(e) {
    e.preventDefault();
    setErreur(null);
    setChargement(true);
    try {
      await confirmerActivationSmsDeuxFa(tokenActivationSms, codeSms);
      setSucces('2FA SMS activée.');
      setMode(null);
      setTokenActivationSms(null);
      setCodeSms('');
      setTelephone('');
    } catch (err) {
      setErreur(err instanceof ApiError ? err.message : 'Code invalide');
    } finally {
      setChargement(false);
    }
  }

  async function desactiver() {
    setErreur(null);
    setChargement(true);
    try {
      await desactiverDeuxFa();
      setSucces('2FA désactivée.');
    } catch (err) {
      setErreur(err instanceof ApiError ? err.message : 'Erreur inattendue');
    } finally {
      setChargement(false);
    }
  }

  return (
    <Card className="p-5">
      <CardHeader titre="Double authentification" icone={KeyRound} sousTitre="Optionnelle — SMS ou application d’authentification (RG36)." />

      {erreur ? (
        <div className="mt-3">
          <Alerte ton="rouge">{erreur}</Alerte>
        </div>
      ) : null}
      {succes ? (
        <div className="mt-3">
          <Alerte ton="vert">{succes}</Alerte>
        </div>
      ) : null}

      {utilisateur?.deuxfaActive ? (
        <div className="mt-4">
          <p className="text-sm text-ink-600">
            Méthode active : <span className="font-medium">{utilisateur.deuxfaMethode}</span>
          </p>
          <button type="button" className="btn-secondary mt-3" disabled={chargement} onClick={desactiver}>
            {chargement ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <ShieldOff className="h-4 w-4" aria-hidden />}
            Désactiver la 2FA
          </button>
        </div>
      ) : (
        <div className="mt-4 space-y-4">
          {mode === null ? (
            <div className="flex gap-2">
              <button type="button" className="btn-secondary" disabled={chargement} onClick={lancerApp}>
                <ShieldCheck className="h-4 w-4" aria-hidden />
                Application d’authentification
              </button>
              <button type="button" className="btn-secondary" disabled={chargement} onClick={() => setMode('sms')}>
                <Smartphone className="h-4 w-4" aria-hidden />
                SMS
              </button>
            </div>
          ) : null}

          {mode === 'app' ? (
            <form className="space-y-3" onSubmit={confirmerApp}>
              <p className="text-sm text-ink-600">
                Scannez l’URI ci-dessous avec votre application d’authentification, ou saisissez le secret manuellement :
              </p>
              <p className="break-all rounded-lg bg-ink-50 p-2 font-mono text-xs">{secretApp}</p>
              <p className="break-all text-xs text-ink-400">{uriApp}</p>
              <div>
                <label className="label" htmlFor="code-app">
                  Code affiché par l’application
                </label>
                <input
                  id="code-app"
                  required
                  maxLength={6}
                  className="input tracking-[0.4em]"
                  value={codeApp}
                  onChange={(e) => setCodeApp(e.target.value.replace(/\D/g, ''))}
                />
              </div>
              <div className="flex gap-2">
                <button type="submit" className="btn-primary" disabled={chargement || codeApp.length < 6}>
                  {chargement ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
                  Confirmer
                </button>
                <button type="button" className="btn-ghost" onClick={() => setMode(null)}>
                  Annuler
                </button>
              </div>
            </form>
          ) : null}

          {mode === 'sms' && !tokenActivationSms ? (
            <form className="space-y-3" onSubmit={lancerSms}>
              <div>
                <label className="label" htmlFor="telephone">
                  Numéro de téléphone
                </label>
                <input
                  id="telephone"
                  required
                  className="input"
                  placeholder="+225 07 00 00 00 00"
                  value={telephone}
                  onChange={(e) => setTelephone(e.target.value)}
                />
              </div>
              <div className="flex gap-2">
                <button type="submit" className="btn-primary" disabled={chargement}>
                  {chargement ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
                  Envoyer le code
                </button>
                <button type="button" className="btn-ghost" onClick={() => setMode(null)}>
                  Annuler
                </button>
              </div>
            </form>
          ) : null}

          {mode === 'sms' && tokenActivationSms ? (
            <form className="space-y-3" onSubmit={confirmerSms}>
              <Alerte ton="ambre">
                Mode dev : le code envoyé par SMS est affiché dans les logs de <code>mvn quarkus:dev</code>.
              </Alerte>
              <div>
                <label className="label" htmlFor="code-sms">
                  Code reçu par SMS
                </label>
                <input
                  id="code-sms"
                  required
                  maxLength={6}
                  className="input tracking-[0.4em]"
                  value={codeSms}
                  onChange={(e) => setCodeSms(e.target.value.replace(/\D/g, ''))}
                />
              </div>
              <div className="flex gap-2">
                <button type="submit" className="btn-primary" disabled={chargement || codeSms.length < 6}>
                  {chargement ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
                  Confirmer
                </button>
                <button
                  type="button"
                  className="btn-ghost"
                  onClick={() => {
                    setMode(null);
                    setTokenActivationSms(null);
                  }}
                >
                  Annuler
                </button>
              </div>
            </form>
          ) : null}
        </div>
      )}
    </Card>
  );
}

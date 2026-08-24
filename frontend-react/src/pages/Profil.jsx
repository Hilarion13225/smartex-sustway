import { useEffect, useState } from 'react';
import { KeyRound, Save, ShieldCheck, ShieldOff, Smartphone, UserCog } from 'lucide-react';
import SustwayLoader from '../components/SustwayLoader';
import { useApiAuth } from '../auth/useApiAuth';
import { Alerte, Card, CardHeader, PageTitre } from '../components/ui';
import { ApiError } from '../lib/apiClient';

export default function Profil() {
  const { utilisateur } = useApiAuth();

  return (
    <>
      <PageTitre icone={UserCog} titre="Profil & sécurité" description="Informations du compte et double authentification." />

      <div className="grid gap-6 lg:grid-cols-2">
        <SectionProfil />
        <SectionMotDePasse />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card className="p-5">
          <CardHeader titre="Compte" icone={ShieldCheck} />
          <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-ink-500">Email</dt>
              <dd className="font-medium">{utilisateur?.email}</dd>
            </div>
            <div>
              <dt className="text-ink-500">Statut du compte</dt>
              <dd className="font-medium">{utilisateur?.statut}</dd>
            </div>
          </dl>
        </Card>

        <SectionDeuxFa />
      </div>
    </>
  );
}

/** Chaque compte modifie ses propres nom/prénom/téléphone, quel que soit son rôle — jamais l'email (lié à RG36). */
function SectionProfil() {
  const { utilisateur, modifierProfil } = useApiAuth();
  const [formulaire, setFormulaire] = useState({ nom: '', prenom: '', telephone: '' });
  const [chargement, setChargement] = useState(false);
  const [erreur, setErreur] = useState(null);
  const [succes, setSucces] = useState(null);

  useEffect(() => {
    if (utilisateur) {
      setFormulaire({
        nom: utilisateur.nom ?? '',
        prenom: utilisateur.prenom ?? '',
        telephone: utilisateur.telephone ?? '',
      });
    }
  }, [utilisateur]);

  async function enregistrer(e) {
    e.preventDefault();
    setErreur(null);
    setSucces(null);
    setChargement(true);
    try {
      await modifierProfil(formulaire);
      setSucces('Profil mis à jour.');
    } catch (err) {
      setErreur(err instanceof ApiError ? err.message : 'Erreur inattendue');
    } finally {
      setChargement(false);
    }
  }

  return (
    <Card className="p-5">
      <CardHeader titre="Mes informations" icone={UserCog} sousTitre="Visible par vos collaborateurs sur les pages de l’entreprise." />

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

      <form className="mt-4 space-y-3" onSubmit={enregistrer}>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="profil-prenom">
              Prénom
            </label>
            <input
              id="profil-prenom"
              required
              className="input"
              value={formulaire.prenom}
              onChange={(e) => setFormulaire({ ...formulaire, prenom: e.target.value })}
            />
          </div>
          <div>
            <label className="label" htmlFor="profil-nom">
              Nom
            </label>
            <input
              id="profil-nom"
              required
              className="input"
              value={formulaire.nom}
              onChange={(e) => setFormulaire({ ...formulaire, nom: e.target.value })}
            />
          </div>
        </div>
        <div>
          <label className="label" htmlFor="profil-telephone">
            Téléphone (optionnel — utilisé pour la 2FA par SMS)
          </label>
          <input
            id="profil-telephone"
            className="input"
            placeholder="+225 07 00 00 00 00"
            value={formulaire.telephone}
            onChange={(e) => setFormulaire({ ...formulaire, telephone: e.target.value })}
          />
        </div>
        <button type="submit" className="btn-primary" disabled={chargement}>
          {chargement ? <SustwayLoader taille="sm" /> : <Save className="h-4 w-4" aria-hidden />}
          Enregistrer
        </button>
      </form>
    </Card>
  );
}

function SectionMotDePasse() {
  const { changerMotDePasse } = useApiAuth();
  const [formulaire, setFormulaire] = useState({ ancien: '', nouveau: '', confirmation: '' });
  const [chargement, setChargement] = useState(false);
  const [erreur, setErreur] = useState(null);
  const [succes, setSucces] = useState(null);

  async function enregistrer(e) {
    e.preventDefault();
    setErreur(null);
    setSucces(null);

    if (formulaire.nouveau !== formulaire.confirmation) {
      setErreur('La confirmation ne correspond pas au nouveau mot de passe.');
      return;
    }

    setChargement(true);
    try {
      await changerMotDePasse(formulaire.ancien, formulaire.nouveau);
      setSucces('Mot de passe modifié.');
      setFormulaire({ ancien: '', nouveau: '', confirmation: '' });
    } catch (err) {
      setErreur(err instanceof ApiError ? err.message : 'Erreur inattendue');
    } finally {
      setChargement(false);
    }
  }

  return (
    <Card className="p-5">
      <CardHeader titre="Mot de passe" icone={KeyRound} sousTitre="Confirmez votre mot de passe actuel pour le modifier." />

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

      <form className="mt-4 space-y-3" onSubmit={enregistrer}>
        <div>
          <label className="label" htmlFor="mdp-actuel">
            Mot de passe actuel
          </label>
          <input
            id="mdp-actuel"
            type="password"
            required
            className="input"
            value={formulaire.ancien}
            onChange={(e) => setFormulaire({ ...formulaire, ancien: e.target.value })}
          />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="mdp-nouveau">
              Nouveau mot de passe
            </label>
            <input
              id="mdp-nouveau"
              type="password"
              required
              minLength={10}
              className="input"
              value={formulaire.nouveau}
              onChange={(e) => setFormulaire({ ...formulaire, nouveau: e.target.value })}
            />
          </div>
          <div>
            <label className="label" htmlFor="mdp-confirmation">
              Confirmer
            </label>
            <input
              id="mdp-confirmation"
              type="password"
              required
              minLength={10}
              className="input"
              value={formulaire.confirmation}
              onChange={(e) => setFormulaire({ ...formulaire, confirmation: e.target.value })}
            />
          </div>
        </div>
        <button type="submit" className="btn-primary" disabled={chargement}>
          {chargement ? <SustwayLoader taille="sm" /> : <KeyRound className="h-4 w-4" aria-hidden />}
          Modifier le mot de passe
        </button>
      </form>
    </Card>
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
      <CardHeader titre="Double authentification" icone={KeyRound} sousTitre="Optionnelle — SMS ou application d’authentification." />

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
            {chargement ? <SustwayLoader taille="sm" /> : <ShieldOff className="h-4 w-4" aria-hidden />}
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
                  {chargement ? <SustwayLoader taille="sm" /> : null}
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
                  {chargement ? <SustwayLoader taille="sm" /> : null}
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
                  {chargement ? <SustwayLoader taille="sm" /> : null}
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

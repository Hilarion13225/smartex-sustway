import { useCallback, useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import {
  Building2,
  KeyRound,
  Loader2,
  LogOut,
  PlusCircle,
  ServerCog,
  ShieldCheck,
  ShieldOff,
  Smartphone,
  Wallet,
} from 'lucide-react';
import { useApiAuth } from '../auth/useApiAuth';
import { Alerte, Loader } from '../components/ui';
import { api, ApiError } from '../lib/apiClient';

/**
 * Espace authentifié RÉEL : profil, 2FA, entreprises (avec reprise de
 * paiement si l'abonnement est en attente), création d'entreprise — tout
 * via l'API Quarkus. Distinct de /app (démonstration complète sur données
 * mockées — voir ApiAuthContext.jsx).
 */
export default function EspaceReel() {
  const {
    estConnecte,
    chargement,
    utilisateur,
    entreprises,
    deconnecter,
    creerEntreprise,
    recupererAbonnement,
    payerAbonnement,
    demarrerActivationAppDeuxFa,
    confirmerActivationAppDeuxFa,
    demarrerActivationSmsDeuxFa,
    confirmerActivationSmsDeuxFa,
    desactiverDeuxFa,
  } = useApiAuth();

  const [secteurs, setSecteurs] = useState([]);
  const [formulaire, setFormulaire] = useState({ raisonSociale: '', identifiantLegal: '', secteurCode: '', taille: 'PME', formuleCode: 'STANDARD', periodicite: 'ANNUELLE' });
  const [chargementCreation, setChargementCreation] = useState(false);
  const [erreurCreation, setErreurCreation] = useState(null);
  const [succesCreation, setSuccesCreation] = useState(false);

  const [abonnements, setAbonnements] = useState({});

  useEffect(() => {
    api
      .get('/api/v1/secteurs', { avecAuth: false })
      .then((liste) => {
        setSecteurs(liste);
        if (liste.length) setFormulaire((f) => ({ ...f, secteurCode: liste[0].code }));
      })
      .catch(() => setSecteurs([]));
  }, []);

  useEffect(() => {
    entreprises.forEach((e) => {
      recupererAbonnement(e.id)
        .then((abo) => setAbonnements((prev) => ({ ...prev, [e.id]: abo })))
        .catch(() => {});
    });
  }, [entreprises, recupererAbonnement]);

  async function soumettreCreation(e) {
    e.preventDefault();
    setErreurCreation(null);
    setSuccesCreation(false);
    setChargementCreation(true);
    try {
      const { entreprise, abonnement } = await creerEntreprise(formulaire);
      setAbonnements((prev) => ({ ...prev, [entreprise.id]: abonnement }));
      setSuccesCreation(true);
      setFormulaire((f) => ({ ...f, raisonSociale: '', identifiantLegal: '' }));
    } catch (err) {
      setErreurCreation(err instanceof ApiError ? err.message : 'Erreur inattendue');
    } finally {
      setChargementCreation(false);
    }
  }

  const payer = useCallback(
    async (entrepriseId, fournisseur) => {
      const paiement = await payerAbonnement(entrepriseId, fournisseur);
      const abo = await recupererAbonnement(entrepriseId);
      setAbonnements((prev) => ({ ...prev, [entrepriseId]: abo }));
      return paiement;
    },
    [payerAbonnement, recupererAbonnement]
  );

  if (chargement) return <Loader />;
  if (!estConnecte) return <Navigate to="/connexion-reelle" replace />;

  return (
    <div className="min-h-full bg-ink-50 py-10">
      <div className="mx-auto max-w-3xl px-5 space-y-6">
        <div className="flex items-center justify-between">
          <Link to="/" className="btn-ghost -ml-2">Retour à l’accueil</Link>
          <button type="button" className="btn-secondary" onClick={deconnecter}>
            <LogOut className="h-4 w-4" aria-hidden />
            Se déconnecter
          </button>
        </div>

        <div className="card p-6">
          <div className="flex items-center gap-3">
            <span className="rounded-lg bg-ink-800 p-2 text-white">
              <ServerCog className="h-5 w-5" aria-hidden />
            </span>
            <div>
              <h1 className="text-lg font-semibold">Espace connecté — données réelles</h1>
              <p className="text-sm text-ink-500">Phase C : ce que vous voyez ici vient effectivement de l’API.</p>
            </div>
          </div>

          <div className="mt-6 rounded-xl border border-ink-200 p-4">
            <p className="flex items-center gap-2 text-sm font-medium">
              <ShieldCheck className="h-4 w-4 text-brand-600" aria-hidden />
              Profil
            </p>
            <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-ink-500">Nom complet</dt>
                <dd className="font-medium">{utilisateur?.prenom} {utilisateur?.nom}</dd>
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
                <dd className="font-medium">
                  {utilisateur?.deuxfaActive ? `Active (${utilisateur.deuxfaMethode})` : 'Inactive'}
                </dd>
              </div>
            </dl>
          </div>
        </div>

        <SectionDeuxFa
          utilisateur={utilisateur}
          demarrerActivationAppDeuxFa={demarrerActivationAppDeuxFa}
          confirmerActivationAppDeuxFa={confirmerActivationAppDeuxFa}
          demarrerActivationSmsDeuxFa={demarrerActivationSmsDeuxFa}
          confirmerActivationSmsDeuxFa={confirmerActivationSmsDeuxFa}
          desactiverDeuxFa={desactiverDeuxFa}
        />

        <div className="card p-6">
          <p className="flex items-center gap-2 text-sm font-medium">
            <Building2 className="h-4 w-4 text-brand-600" aria-hidden />
            Vos entreprises ({entreprises.length})
          </p>
          {entreprises.length === 0 ? (
            <p className="mt-2 text-sm text-ink-500">Aucune entreprise pour l’instant — créez-en une ci-dessous.</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {entreprises.map((e) => (
                <EntrepriseLigne key={e.id} entreprise={e} abonnement={abonnements[e.id]} payer={payer} />
              ))}
            </ul>
          )}

          <div className="mt-6 rounded-xl border border-ink-200 p-4">
            <p className="flex items-center gap-2 text-sm font-medium">
              <PlusCircle className="h-4 w-4 text-brand-600" aria-hidden />
              Créer une entreprise
            </p>
            <p className="mt-1 text-xs text-ink-500">
              RG24 : une formule (et une périodicité si payante) est obligatoire. RG25 : la formule Free est refusée ici.
            </p>

            <form className="mt-4 space-y-4" onSubmit={soumettreCreation}>
              {erreurCreation ? <Alerte ton="rouge">{erreurCreation}</Alerte> : null}
              {succesCreation ? <Alerte ton="vert">Entreprise créée avec succès.</Alerte> : null}

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="label" htmlFor="raisonSociale">Raison sociale</label>
                  <input id="raisonSociale" required className="input" value={formulaire.raisonSociale} onChange={(e) => setFormulaire({ ...formulaire, raisonSociale: e.target.value })} />
                </div>
                <div>
                  <label className="label" htmlFor="identifiantLegal">Identifiant légal</label>
                  <input id="identifiantLegal" required className="input" value={formulaire.identifiantLegal} onChange={(e) => setFormulaire({ ...formulaire, identifiantLegal: e.target.value })} />
                </div>
                <div>
                  <label className="label" htmlFor="secteurCode">Secteur d’activité</label>
                  <select id="secteurCode" className="input" value={formulaire.secteurCode} onChange={(e) => setFormulaire({ ...formulaire, secteurCode: e.target.value })}>
                    {secteurs.map((s) => <option key={s.code} value={s.code}>{s.nom}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label" htmlFor="taille">Taille</label>
                  <select id="taille" className="input" value={formulaire.taille} onChange={(e) => setFormulaire({ ...formulaire, taille: e.target.value })}>
                    <option value="TPE">TPE</option>
                    <option value="PME">PME</option>
                    <option value="ETI">ETI</option>
                    <option value="GRANDE_ENTREPRISE">Grande entreprise</option>
                  </select>
                </div>
                <div>
                  <label className="label" htmlFor="formuleCode">Formule</label>
                  <select id="formuleCode" className="input" value={formulaire.formuleCode} onChange={(e) => setFormulaire({ ...formulaire, formuleCode: e.target.value })}>
                    <option value="STANDARD">Standard</option>
                    <option value="AVANCEES">Avancées</option>
                  </select>
                </div>
                <div>
                  <label className="label" htmlFor="periodicite">Périodicité</label>
                  <select id="periodicite" className="input" value={formulaire.periodicite} onChange={(e) => setFormulaire({ ...formulaire, periodicite: e.target.value })}>
                    <option value="MENSUELLE">Mensuelle</option>
                    <option value="ANNUELLE">Annuelle</option>
                  </select>
                </div>
              </div>

              <button type="submit" className="btn-primary" disabled={chargementCreation}>
                {chargementCreation ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
                Créer l’entreprise
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

function EntrepriseLigne({ entreprise, abonnement, payer }) {
  const [chargement, setChargement] = useState(false);
  const [erreur, setErreur] = useState(null);

  async function handlePayer(fournisseur) {
    setErreur(null);
    setChargement(true);
    try {
      await payer(entreprise.id, fournisseur);
    } catch (err) {
      setErreur(err instanceof ApiError ? err.message : 'Erreur inattendue');
    } finally {
      setChargement(false);
    }
  }

  return (
    <li className="rounded-xl border border-ink-200 p-3 text-sm">
      <p className="font-medium">{entreprise.raisonSociale}</p>
      <p className="text-xs text-ink-500">
        {entreprise.identifiantLegal} — {entreprise.secteurCode ?? 'secteur non renseigné'} — {entreprise.taille ?? 'taille non renseignée'}
      </p>
      {abonnement ? (
        <p className="mt-1 text-xs text-ink-500">
          Abonnement {abonnement.formuleCode} ({abonnement.periodicite}) — statut{' '}
          <span className={abonnement.statut === 'ACTIF' ? 'font-medium text-emerald-700' : 'font-medium text-amber-700'}>
            {abonnement.statut}
          </span>
        </p>
      ) : null}

      {abonnement?.statut === 'EN_ATTENTE_PAIEMENT' ? (
        <div className="mt-2">
          {erreur ? <p className="mb-1 text-xs text-rose-700">{erreur}</p> : null}
          <div className="flex gap-2">
            <button type="button" className="btn-secondary text-xs" disabled={chargement} onClick={() => handlePayer('PI_SPI')}>
              {chargement ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> : <Wallet className="h-3.5 w-3.5" aria-hidden />}
              Payer via PI-SPI
            </button>
            <button type="button" className="btn-secondary text-xs" disabled={chargement} onClick={() => handlePayer('WAVE')}>
              {chargement ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> : <Smartphone className="h-3.5 w-3.5" aria-hidden />}
              Payer via Wave
            </button>
          </div>
        </div>
      ) : null}
    </li>
  );
}

function SectionDeuxFa({
  utilisateur,
  demarrerActivationAppDeuxFa,
  confirmerActivationAppDeuxFa,
  demarrerActivationSmsDeuxFa,
  confirmerActivationSmsDeuxFa,
  desactiverDeuxFa,
}) {
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
    <div className="card p-6">
      <p className="flex items-center gap-2 text-sm font-medium">
        <KeyRound className="h-4 w-4 text-brand-600" aria-hidden />
        Double authentification (optionnelle — RG36)
      </p>

      {erreur ? <div className="mt-3"><Alerte ton="rouge">{erreur}</Alerte></div> : null}
      {succes ? <div className="mt-3"><Alerte ton="vert">{succes}</Alerte></div> : null}

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
                Scannez l’URI ci-dessous avec votre application d’authentification (Google Authenticator, Authy...),
                ou saisissez le secret manuellement :
              </p>
              <p className="break-all rounded-lg bg-ink-50 p-2 font-mono text-xs">{secretApp}</p>
              <p className="break-all text-xs text-ink-400">{uriApp}</p>
              <div>
                <label className="label" htmlFor="code-app">Code affiché par l’application</label>
                <input id="code-app" required maxLength={6} className="input tracking-[0.4em]" value={codeApp} onChange={(e) => setCodeApp(e.target.value.replace(/\D/g, ''))} />
              </div>
              <div className="flex gap-2">
                <button type="submit" className="btn-primary" disabled={chargement || codeApp.length < 6}>
                  {chargement ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
                  Confirmer
                </button>
                <button type="button" className="btn-ghost" onClick={() => setMode(null)}>Annuler</button>
              </div>
            </form>
          ) : null}

          {mode === 'sms' && !tokenActivationSms ? (
            <form className="space-y-3" onSubmit={lancerSms}>
              <div>
                <label className="label" htmlFor="telephone">Numéro de téléphone</label>
                <input id="telephone" required className="input" placeholder="+225 07 00 00 00 00" value={telephone} onChange={(e) => setTelephone(e.target.value)} />
              </div>
              <div className="flex gap-2">
                <button type="submit" className="btn-primary" disabled={chargement}>
                  {chargement ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
                  Envoyer le code
                </button>
                <button type="button" className="btn-ghost" onClick={() => setMode(null)}>Annuler</button>
              </div>
            </form>
          ) : null}

          {mode === 'sms' && tokenActivationSms ? (
            <form className="space-y-3" onSubmit={confirmerSms}>
              <Alerte ton="ambre">
                Mode dev : le code envoyé par SMS est affiché dans les logs de <code>mvn quarkus:dev</code>.
              </Alerte>
              <div>
                <label className="label" htmlFor="code-sms">Code reçu par SMS</label>
                <input id="code-sms" required maxLength={6} className="input tracking-[0.4em]" value={codeSms} onChange={(e) => setCodeSms(e.target.value.replace(/\D/g, ''))} />
              </div>
              <div className="flex gap-2">
                <button type="submit" className="btn-primary" disabled={chargement || codeSms.length < 6}>
                  {chargement ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
                  Confirmer
                </button>
                <button type="button" className="btn-ghost" onClick={() => { setMode(null); setTokenActivationSms(null); }}>Annuler</button>
              </div>
            </form>
          ) : null}
        </div>
      )}
    </div>
  );
}

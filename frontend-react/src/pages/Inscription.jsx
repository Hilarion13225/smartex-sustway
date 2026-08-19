import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  CheckCircle2,
  CreditCard,
  Loader2,
  Mail,
  Smartphone,
  Wallet,
} from 'lucide-react';
import { formaterMontant } from '../lib/export';
import { Alerte, Badge } from '../components/ui';
import { useApiAuth } from '../auth/useApiAuth';
import { ApiError } from '../lib/apiClient';

/**
 * Inscription RÉELLE — parle effectivement à l'API Quarkus à chaque étape
 * (formules, compte, vérification email, entreprise, abonnement, paiement).
 * RG24/RG25 : la formule Free ne crée pas d'entreprise (mode démo
 * uniquement) ; les formules payantes créent entreprise + abonnement dans
 * la même transaction côté API, puis exigent un paiement pour activer
 * l'abonnement.
 *
 * Le parcours est un enchaînement d'étapes nommées plutôt qu'un simple
 * index numérique, car son déroulé diffère selon la formule choisie
 * (Free s'arrête avant le paiement, qui n'existe pas pour elle).
 */
export default function Inscription() {
  const navigate = useNavigate();
  const { inscrire, verifierEmail, connecter, creerEntreprise, payerAbonnement, listerFormules, listerSecteurs } =
    useApiAuth();

  const [etape, setEtape] = useState('formule');
  const [formules, setFormules] = useState([]);
  const [secteurs, setSecteurs] = useState([]);
  const [plan, setPlan] = useState('STANDARD');
  const [periodicite, setPeriodicite] = useState('ANNUELLE');
  const [paiementFournisseur, setPaiementFournisseur] = useState('PI_SPI');

  const [formulaire, setFormulaire] = useState({
    prenom: '',
    nom: '',
    email: '',
    motDePasse: '',
    raisonSociale: '',
    identifiantLegal: '',
    secteurCode: '',
    taille: 'PME',
  });

  const [tokenColle, setTokenColle] = useState('');
  const [entrepriseCreee, setEntrepriseCreee] = useState(null);
  const [abonnementCree, setAbonnementCree] = useState(null);
  const [paiementResultat, setPaiementResultat] = useState(null);

  const [chargement, setChargement] = useState(false);
  const [erreur, setErreur] = useState(null);

  useEffect(() => {
    listerFormules()
      .then((liste) => {
        setFormules(liste);
        if (liste.length && !liste.some((f) => f.code === plan)) setPlan(liste[0].code);
      })
      .catch(() => setFormules([]));
    listerSecteurs()
      .then((liste) => {
        setSecteurs(liste);
        if (liste.length) setFormulaire((f) => ({ ...f, secteurCode: liste[0].code }));
      })
      .catch(() => setSecteurs([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const formuleChoisie = formules.find((f) => f.code === plan);
  const estFree = plan === 'FREE';
  const montant = periodicite === 'ANNUELLE' ? formuleChoisie?.prixAnnuel : formuleChoisie?.prixMensuel;

  const etapes = estFree
    ? [
        ['formule', 'Formule'],
        ['infos', 'Compte'],
        ['verification', 'Vérification'],
        ['confirmation', 'Confirmation'],
      ]
    : [
        ['formule', 'Formule'],
        ['infos', 'Compte & entreprise'],
        ['verification', 'Vérification'],
        ['paiement', 'Paiement'],
        ['confirmation', 'Confirmation'],
      ];
  const indexCourant = etapes.findIndex(([cle]) => cle === etape);

  function majFormulaire(champ) {
    return (e) => setFormulaire((f) => ({ ...f, [champ]: e.target.value }));
  }

  async function soumettreInfos(e) {
    e.preventDefault();
    setErreur(null);
    setChargement(true);
    try {
      await inscrire(formulaire.nom, formulaire.prenom, formulaire.email, formulaire.motDePasse);
      setEtape('verification');
    } catch (err) {
      setErreur(err instanceof ApiError ? err.message : 'Erreur inattendue');
    } finally {
      setChargement(false);
    }
  }

  async function soumettreVerification(e) {
    e.preventDefault();
    setErreur(null);
    setChargement(true);
    try {
      const token = tokenColle.includes('token=') ? tokenColle.split('token=')[1].trim() : tokenColle.trim();
      await verifierEmail(token);

      const connexion = await connecter(formulaire.email, formulaire.motDePasse);
      if (connexion.deuxFaRequise) {
        // Cas limite : ne devrait pas arriver pour un compte tout juste créé
        // (la 2FA se configure après coup), mais on ne bloque pas l'utilisateur.
        setErreur('Ce compte a une double authentification active — connectez-vous via la page de connexion.');
        return;
      }

      if (estFree) {
        setEtape('confirmation');
        return;
      }

      const { entreprise, abonnement } = await creerEntreprise({
        raisonSociale: formulaire.raisonSociale,
        identifiantLegal: formulaire.identifiantLegal,
        secteurCode: formulaire.secteurCode || undefined,
        taille: formulaire.taille || undefined,
        formuleCode: plan,
        periodicite,
      });
      setEntrepriseCreee(entreprise);
      setAbonnementCree(abonnement);
      setEtape('paiement');
    } catch (err) {
      setErreur(err instanceof ApiError ? err.message : 'Erreur inattendue');
    } finally {
      setChargement(false);
    }
  }

  async function soumettrePaiement(e) {
    e.preventDefault();
    setErreur(null);
    setChargement(true);
    try {
      const paiement = await payerAbonnement(entrepriseCreee.id, paiementFournisseur);
      setPaiementResultat(paiement);
      setEtape('confirmation');
    } catch (err) {
      setErreur(err instanceof ApiError ? err.message : 'Erreur inattendue');
    } finally {
      setChargement(false);
    }
  }

  return (
    <div className="min-h-full bg-ink-50 py-10">
      <div className="mx-auto max-w-3xl px-5">
        <Link to="/" className="btn-ghost mb-4 -ml-2">
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Retour à l’accueil
        </Link>

        <ol className="mb-6 flex flex-wrap items-center gap-2 text-sm">
          {etapes.map(([cle, libelle], index) => (
            <li key={cle} className="flex items-center gap-2">
              <span
                className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold ${
                  index <= indexCourant ? 'bg-brand-600 text-white' : 'bg-ink-200 text-ink-500'
                }`}
              >
                {index + 1}
              </span>
              <span className={index <= indexCourant ? 'font-medium text-ink-900' : 'text-ink-500'}>{libelle}</span>
              {index < etapes.length - 1 ? <span className="mx-1 h-px w-6 bg-ink-200" /> : null}
            </li>
          ))}
        </ol>

        <div className="card p-6">
          {erreur ? (
            <div className="mb-4">
              <Alerte ton="rouge">{erreur}</Alerte>
            </div>
          ) : null}

          {etape === 'formule' ? (
            <div>
              <h1 className="text-lg font-semibold">Choix de la formule</h1>
              <p className="mt-1 text-sm text-ink-500">
                La formule est choisie avant la création du compte (RG24) et détermine immédiatement les
                fonctionnalités actives.
              </p>
              <div className="mt-5 space-y-3">
                {formules.map((option) => (
                  <label
                    key={option.code}
                    className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition-colors ${
                      plan === option.code ? 'border-brand-500 bg-brand-50/50' : 'border-ink-200 hover:bg-ink-50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="formule"
                      className="mt-1 accent-brand-600"
                      checked={plan === option.code}
                      onChange={() => setPlan(option.code)}
                    />
                    <span className="flex-1">
                      <span className="flex items-center justify-between gap-3">
                        <span className="font-medium">{option.nom}</span>
                        <span className="text-sm text-ink-600">
                          {Number(option.prixMensuel) === 0 ? 'Gratuit' : `${formaterMontant(option.prixMensuel)} / mois`}
                        </span>
                      </span>
                      <span className="mt-1 block text-sm text-ink-500">{option.description}</span>
                    </span>
                  </label>
                ))}
                {formules.length === 0 ? (
                  <p className="text-sm text-ink-500">Chargement des formules…</p>
                ) : null}
              </div>
              {estFree ? (
                <div className="mt-5">
                  <Alerte ton="ambre">
                    RG25 — la formule Free est un mode de démonstration : aucune entreprise ne sera créée, seul le
                    compte utilisateur sera activé.
                  </Alerte>
                </div>
              ) : null}
              <div className="mt-7 flex justify-end">
                <button type="button" className="btn-primary" onClick={() => setEtape('infos')} disabled={!plan}>
                  Continuer
                  <ArrowRight className="h-4 w-4" aria-hidden />
                </button>
              </div>
            </div>
          ) : null}

          {etape === 'infos' ? (
            <form onSubmit={soumettreInfos}>
              <h1 className="text-lg font-semibold">
                {estFree ? 'Informations du compte' : 'Informations du compte et de l’entreprise'}
              </h1>
              <p className="mt-1 text-sm text-ink-500">Ces informations créent réellement votre compte sur l’API.</p>

              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="label" htmlFor="prenom">Prénom</label>
                  <input id="prenom" required className="input" value={formulaire.prenom} onChange={majFormulaire('prenom')} />
                </div>
                <div>
                  <label className="label" htmlFor="nom">Nom</label>
                  <input id="nom" required className="input" value={formulaire.nom} onChange={majFormulaire('nom')} />
                </div>
                <div className="sm:col-span-2">
                  <label className="label" htmlFor="email">Adresse email professionnelle</label>
                  <input id="email" type="email" required className="input" value={formulaire.email} onChange={majFormulaire('email')} />
                </div>
                <div className="sm:col-span-2">
                  <label className="label" htmlFor="motDePasse">Mot de passe (10 caractères minimum)</label>
                  <input
                    id="motDePasse"
                    type="password"
                    required
                    minLength={10}
                    className="input"
                    value={formulaire.motDePasse}
                    onChange={majFormulaire('motDePasse')}
                  />
                </div>
              </div>

              {!estFree ? (
                <>
                  <div className="mt-6 grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="label" htmlFor="raisonSociale">Raison sociale</label>
                      <input
                        id="raisonSociale"
                        required
                        className="input"
                        placeholder="Ivoire Agro Industries"
                        value={formulaire.raisonSociale}
                        onChange={majFormulaire('raisonSociale')}
                      />
                    </div>
                    <div>
                      <label className="label" htmlFor="identifiantLegal">Identifiant légal</label>
                      <input
                        id="identifiantLegal"
                        required
                        className="input"
                        placeholder="CI-2011-B-4471"
                        value={formulaire.identifiantLegal}
                        onChange={majFormulaire('identifiantLegal')}
                      />
                    </div>
                    <div>
                      <label className="label" htmlFor="secteur">Secteur d’activité</label>
                      <select id="secteur" className="input" value={formulaire.secteurCode} onChange={majFormulaire('secteurCode')}>
                        {secteurs.map((s) => (
                          <option key={s.code} value={s.code}>{s.nom}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="label" htmlFor="taille">Taille</label>
                      <select id="taille" className="input" value={formulaire.taille} onChange={majFormulaire('taille')}>
                        <option value="TPE">TPE</option>
                        <option value="PME">PME</option>
                        <option value="ETI">ETI</option>
                        <option value="GRANDE_ENTREPRISE">Grande entreprise</option>
                      </select>
                    </div>
                  </div>

                  <div className="mt-6 rounded-xl border border-ink-200 p-4">
                    <p className="flex items-center gap-2 text-sm font-medium">
                      <CreditCard className="h-4 w-4 text-brand-600" aria-hidden />
                      Périodicité de facturation
                    </p>
                    <div className="mt-3 flex gap-2">
                      {['MENSUELLE', 'ANNUELLE'].map((option) => (
                        <button
                          key={option}
                          type="button"
                          className={periodicite === option ? 'btn-primary flex-1' : 'btn-secondary flex-1'}
                          onClick={() => setPeriodicite(option)}
                        >
                          {option === 'MENSUELLE' ? 'Mensuelle' : 'Annuelle'}
                        </button>
                      ))}
                    </div>
                    <p className="mt-3 text-sm text-ink-600">
                      Montant à régler après vérification de l’email :{' '}
                      <span className="font-semibold text-ink-900">{montant != null ? formaterMontant(montant) : '—'}</span>
                    </p>
                  </div>
                </>
              ) : null}

              <div className="mt-7 flex items-center justify-between gap-3">
                <button type="button" className="btn-secondary" onClick={() => setEtape('formule')}>
                  <ArrowLeft className="h-4 w-4" aria-hidden />
                  Précédent
                </button>
                <button type="submit" className="btn-primary" disabled={chargement}>
                  {chargement ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
                  Créer le compte
                  <ArrowRight className="h-4 w-4" aria-hidden />
                </button>
              </div>
            </form>
          ) : null}

          {etape === 'verification' ? (
            <form onSubmit={soumettreVerification}>
              <h1 className="text-lg font-semibold">Vérification de l’adresse email</h1>
              <p className="mt-1 text-sm text-ink-500">
                RG36 — le compte n’est activé qu’après vérification de l’email.
              </p>
              <Alerte ton="ambre">
                Aucun service d’envoi d’email n’est encore branché (TODO phase C) : le lien de vérification est
                affiché dans les logs du terminal <code>mvn quarkus:dev</code>. Copiez-y le token (ou le lien
                complet) et collez-le ci-dessous.
              </Alerte>
              <div className="mt-5">
                <label className="label" htmlFor="token-verification">Token de vérification (ou lien complet)</label>
                <textarea
                  id="token-verification"
                  required
                  rows={3}
                  className="input font-mono text-xs"
                  placeholder="eyJhbGci... ou le lien complet copié depuis les logs"
                  value={tokenColle}
                  onChange={(e) => setTokenColle(e.target.value)}
                />
              </div>
              <div className="mt-7 flex justify-end">
                <button type="submit" className="btn-primary" disabled={chargement}>
                  {chargement ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
                  <Mail className="h-4 w-4" aria-hidden />
                  {estFree ? 'Vérifier et activer le compte' : 'Vérifier et créer l’entreprise'}
                </button>
              </div>
            </form>
          ) : null}

          {etape === 'paiement' ? (
            <form onSubmit={soumettrePaiement}>
              <h1 className="text-lg font-semibold">Paiement de l’abonnement</h1>
              <p className="mt-1 text-sm text-ink-500">
                Formule {formuleChoisie?.nom}, facturation {periodicite === 'ANNUELLE' ? 'annuelle' : 'mensuelle'}.
              </p>
              <Alerte ton="ambre">
                Intégration PI-SPI/Wave non finalisée (le CDC indique que ces modalités restent à cadrer avec
                Smartex Expertises) : ce paiement est simulé côté serveur et marqué réussi automatiquement.
              </Alerte>
              <div className="mt-5">
                <span className="label">Moyen de paiement</span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    className={paiementFournisseur === 'PI_SPI' ? 'btn-primary flex-1' : 'btn-secondary flex-1'}
                    onClick={() => setPaiementFournisseur('PI_SPI')}
                  >
                    <Wallet className="h-4 w-4" aria-hidden />
                    PI-SPI
                  </button>
                  <button
                    type="button"
                    className={paiementFournisseur === 'WAVE' ? 'btn-primary flex-1' : 'btn-secondary flex-1'}
                    onClick={() => setPaiementFournisseur('WAVE')}
                  >
                    <Smartphone className="h-4 w-4" aria-hidden />
                    Wave
                  </button>
                </div>
              </div>
              <p className="mt-4 text-sm text-ink-600">
                Montant : <span className="font-semibold text-ink-900">{montant != null ? formaterMontant(montant) : '—'}</span>
              </p>
              <div className="mt-7 flex justify-end">
                <button type="submit" className="btn-primary" disabled={chargement}>
                  {chargement ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
                  Payer et activer l’abonnement
                  <ArrowRight className="h-4 w-4" aria-hidden />
                </button>
              </div>
            </form>
          ) : null}

          {etape === 'confirmation' ? (
            <div>
              <div className="flex items-center gap-3">
                <CheckCircle2 className="h-8 w-8 text-brand-600" aria-hidden />
                <div>
                  <h1 className="text-lg font-semibold">Compte créé</h1>
                  <p className="text-sm text-ink-500">Toutes les étapes ci-dessus ont été réalisées sur l’API réelle.</p>
                </div>
              </div>

              <div className="mt-5 space-y-3">
                <div className="rounded-xl border border-ink-200 p-4">
                  <p className="flex items-center gap-2 text-sm font-medium">
                    <Mail className="h-4 w-4 text-brand-600" aria-hidden />
                    Compte {formulaire.email}
                  </p>
                  <p className="mt-1 text-sm text-ink-500">Email vérifié, compte actif, vous êtes connecté.</p>
                </div>

                {!estFree && entrepriseCreee ? (
                  <div className="rounded-xl border border-ink-200 p-4">
                    <p className="flex items-center gap-2 text-sm font-medium">
                      <Building2 className="h-4 w-4 text-brand-600" aria-hidden />
                      {entrepriseCreee.raisonSociale}
                    </p>
                    <p className="mt-1 text-sm text-ink-500">
                      Formule {formuleChoisie?.nom}, abonnement{' '}
                      {paiementResultat?.statut === 'REUSSI' ? 'actif' : abonnementCree?.statut?.toLowerCase()}, paiement
                      via {paiementResultat?.fournisseur === 'PI_SPI' ? 'PI-SPI' : paiementResultat?.fournisseur}.
                    </p>
                  </div>
                ) : null}

                {estFree ? (
                  <Alerte ton="ambre">
                    Compte en mode démonstration (RG25) : aucune entreprise n’a été créée. Vous pouvez changer de
                    formule ultérieurement.
                  </Alerte>
                ) : null}
              </div>

              <Badge ton="vert" icone={CheckCircle2}>Compte activé</Badge>

              <div className="mt-7 flex justify-end">
                <button type="button" className="btn-primary" onClick={() => navigate('/app')}>
                  Aller à mon espace
                  <ArrowRight className="h-4 w-4" aria-hidden />
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

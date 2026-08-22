import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  CheckCircle2,
  CreditCard,
  Mail,
  Smartphone,
  Sparkles,
  UserPlus,
  Wallet,
} from 'lucide-react';
import clsx from 'clsx';
import { formaterMontant } from '../lib/export';
import { Alerte, Badge } from '../components/ui';
import { useApiAuth } from '../auth/useApiAuth';
import { ApiError } from '../lib/apiClient';
import SustwayLoader from '../components/SustwayLoader';
import CadreAuth from '../components/CadreAuth';

const ATOUTS = [
  '87 critères, 6 domaines : un référentiel adapté à votre secteur.',
  'Analyse documentaire assistée par IA, revue par des experts.',
  'Score, plan d’action et rapport exportable dès la première évaluation.',
];

/** Force indicative du mot de passe, calculée uniquement dans le navigateur. */
function evaluerMotDePasse(valeur) {
  let score = 0;
  if (valeur.length >= 10) score += 1;
  if (valeur.length >= 14) score += 1;
  if (/[A-Z]/.test(valeur) && /[a-z]/.test(valeur)) score += 1;
  if (/\d/.test(valeur)) score += 1;
  if (/[^A-Za-z0-9]/.test(valeur)) score += 1;
  return Math.min(4, score);
}

const LIBELLES_FORCE = ['Trop court', 'Faible', 'Correct', 'Bon', 'Excellent'];
const COULEURS_FORCE = ['bg-rose-400', 'bg-amber-400', 'bg-amber-500', 'bg-brand-500', 'bg-brand-600'];

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
  const progression = Math.round((indexCourant / (etapes.length - 1)) * 100);
  const forceMotDePasse = evaluerMotDePasse(formulaire.motDePasse);

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
    <CadreAuth
      large
      badge={
        <>
          <UserPlus className="h-3.5 w-3.5" aria-hidden />
          Création de compte
        </>
      }
      titre="Créez votre espace Smartex Sustway"
      description="Cinq étapes guidées : formule, compte, vérification, paiement puis accès immédiat à la plateforme."
      atouts={ATOUTS}
    >
      <div className="mb-7">
        <ol className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
          {etapes.map(([cle, libelle], index) => {
            const passee = index < indexCourant;
            const active = index === indexCourant;
            return (
              <li key={cle} className="flex items-center gap-2">
                <span
                  className={clsx(
                    'flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold transition duration-300',
                    passee && 'bg-brand-100 text-brand-700',
                    active && 'bg-brand-600 text-white shadow-glow motion-safe:animate-apparition-douce',
                    !passee && !active && 'bg-ink-100 text-ink-400'
                  )}
                >
                  {passee ? <CheckCircle2 className="h-4 w-4" aria-hidden /> : index + 1}
                </span>
                <span className={active ? 'font-semibold text-ink-900' : 'text-ink-500'}>{libelle}</span>
              </li>
            );
          })}
        </ol>
        <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-ink-100">
          <div
            className="h-full rounded-full bg-gradient-to-r from-brand-500 to-emerald-400 transition-all duration-700"
            style={{ width: `${Math.max(6, progression)}%` }}
          />
        </div>
      </div>

      {erreur ? (
        <div className="mb-5">
          <Alerte ton="rouge">{erreur}</Alerte>
        </div>
      ) : null}

      {etape === 'formule' ? (
        <div>
          <h2 className="text-lg font-semibold text-ink-900">Choix de la formule</h2>
          <p className="mt-1 text-sm text-ink-500">
            La formule est choisie avant la création du compte (RG24) et détermine immédiatement les fonctionnalités
            actives.
          </p>
          <div className="mt-5 space-y-3">
            {formules.map((option) => (
              <label
                key={option.code}
                className={clsx(
                  'option-carte',
                  plan === option.code ? 'option-carte-active' : 'option-carte-inactive'
                )}
              >
                <input
                  type="radio"
                  name="formule"
                  className="mt-1 h-4 w-4 accent-brand-600"
                  checked={plan === option.code}
                  onChange={() => setPlan(option.code)}
                />
                <span className="flex-1">
                  <span className="flex flex-wrap items-center justify-between gap-2">
                    <span className="flex items-center gap-2 font-semibold text-ink-900">
                      {option.nom}
                      {option.code === 'AVANCEES' ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-brand-600 px-2 py-0.5 text-[11px] font-medium text-white">
                          <Sparkles className="h-3 w-3" aria-hidden />
                          Recommandée
                        </span>
                      ) : null}
                    </span>
                    <span className="text-sm font-medium text-brand-700">
                      {Number(option.prixMensuel) === 0 ? 'Gratuit' : `${formaterMontant(option.prixMensuel)} / mois`}
                    </span>
                  </span>
                  <span className="mt-1 block text-sm text-ink-500">{option.description}</span>
                </span>
              </label>
            ))}
            {formules.length === 0 ? (
              <div className="flex items-center gap-3 rounded-xl border border-dashed border-ink-200 p-4 text-sm text-ink-500">
                <SustwayLoader taille="sm" />
                Chargement des formules…
              </div>
            ) : null}
          </div>
          {estFree ? (
            <div className="mt-5">
              <Alerte ton="ambre">
                RG25 — la formule Free est un mode de démonstration : aucune entreprise ne sera créée, seul le compte
                utilisateur sera activé.
              </Alerte>
            </div>
          ) : null}
          <div className="mt-7 flex justify-end">
            <button type="button" className="btn-vitrine" onClick={() => setEtape('infos')} disabled={!plan}>
              Continuer
              <ArrowRight className="h-4 w-4" aria-hidden />
            </button>
          </div>
        </div>
      ) : null}

      {etape === 'infos' ? (
        <form onSubmit={soumettreInfos}>
          <h2 className="text-lg font-semibold text-ink-900">
            {estFree ? 'Informations du compte' : 'Informations du compte et de l’entreprise'}
          </h2>
          <p className="mt-1 text-sm text-ink-500">Ces informations créent réellement votre compte sur l’API.</p>

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="prenom">
                Prénom
              </label>
              <input id="prenom" required className="input" value={formulaire.prenom} onChange={majFormulaire('prenom')} />
            </div>
            <div>
              <label className="label" htmlFor="nom">
                Nom
              </label>
              <input id="nom" required className="input" value={formulaire.nom} onChange={majFormulaire('nom')} />
            </div>
            <div className="sm:col-span-2">
              <label className="label" htmlFor="email">
                Adresse email professionnelle
              </label>
              <div className="relative">
                <input
                  id="email"
                  type="email"
                  required
                  placeholder="vous@entreprise.com"
                  className="champ-auth peer"
                  value={formulaire.email}
                  onChange={majFormulaire('email')}
                />
                <Mail className="icone-champ" aria-hidden />
              </div>
            </div>
            <div className="sm:col-span-2">
              <label className="label" htmlFor="motDePasse">
                Mot de passe (10 caractères minimum)
              </label>
              <input
                id="motDePasse"
                type="password"
                required
                minLength={10}
                className="input"
                value={formulaire.motDePasse}
                onChange={majFormulaire('motDePasse')}
              />
              {formulaire.motDePasse ? (
                <div className="mt-2 flex items-center gap-3">
                  <div className="flex flex-1 gap-1" aria-hidden>
                    {[0, 1, 2, 3].map((index) => (
                      <span
                        key={index}
                        className={clsx(
                          'h-1.5 flex-1 rounded-full transition-colors duration-300',
                          index < forceMotDePasse ? COULEURS_FORCE[forceMotDePasse] : 'bg-ink-200'
                        )}
                      />
                    ))}
                  </div>
                  <span className="text-xs font-medium text-ink-500">{LIBELLES_FORCE[forceMotDePasse]}</span>
                </div>
              ) : null}
            </div>
          </div>

          {!estFree ? (
            <>
              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="label" htmlFor="raisonSociale">
                    Raison sociale
                  </label>
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
                  <label className="label" htmlFor="identifiantLegal">
                    Identifiant légal
                  </label>
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
                  <label className="label" htmlFor="secteur">
                    Secteur d’activité
                  </label>
                  <select id="secteur" className="input" value={formulaire.secteurCode} onChange={majFormulaire('secteurCode')}>
                    {secteurs.map((s) => (
                      <option key={s.code} value={s.code}>
                        {s.nom}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label" htmlFor="taille">
                    Taille
                  </label>
                  <select id="taille" className="input" value={formulaire.taille} onChange={majFormulaire('taille')}>
                    <option value="TPE">TPE</option>
                    <option value="PME">PME</option>
                    <option value="ETI">ETI</option>
                    <option value="GRANDE_ENTREPRISE">Grande entreprise</option>
                  </select>
                </div>
              </div>

              <div className="mt-6 rounded-2xl border border-ink-100 bg-ink-50/60 p-4">
                <p className="flex items-center gap-2 text-sm font-semibold text-ink-900">
                  <CreditCard className="h-4 w-4 text-brand-600" aria-hidden />
                  Périodicité de facturation
                </p>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  {['MENSUELLE', 'ANNUELLE'].map((option) => (
                    <button
                      key={option}
                      type="button"
                      className={clsx(
                        'btn rounded-xl border transition duration-300',
                        periodicite === option
                          ? 'border-brand-500 bg-white text-brand-700 shadow-glow'
                          : 'border-ink-200 bg-white/60 text-ink-600 hover:border-brand-200'
                      )}
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
            <button type="button" className="btn-vitrine-clair" onClick={() => setEtape('formule')}>
              <ArrowLeft className="h-4 w-4" aria-hidden />
              Précédent
            </button>
            <button type="submit" className="btn-vitrine" disabled={chargement}>
              {chargement ? <SustwayLoader taille="sm" /> : null}
              Créer le compte
              <ArrowRight className="h-4 w-4" aria-hidden />
            </button>
          </div>
        </form>
      ) : null}

      {etape === 'verification' ? (
        <form onSubmit={soumettreVerification}>
          <h2 className="text-lg font-semibold text-ink-900">Vérification de l’adresse email</h2>
          <p className="mt-1 text-sm text-ink-500">RG36 — le compte n’est activé qu’après vérification de l’email.</p>
          <div className="mt-4 flex items-center gap-3 rounded-2xl border border-brand-200 bg-brand-50 px-4 py-3">
            <Mail className="h-5 w-5 shrink-0 text-brand-600" aria-hidden />
            <p className="text-sm font-semibold text-brand-800">
              Vérifiez votre boîte mail pour activer votre compte.
            </p>
          </div>
          <div className="mt-3">
            <Alerte ton="ambre">
              Un email de vérification vient de vous être envoyé. Ouvrez-le et copiez le lien (ou le token) qu’il
              contient, puis collez-le ci-dessous pour activer votre compte <strong>sans quitter cette page</strong> —
              cliquer directement sur le lien vous ferait sortir du parcours d’inscription avant l’étape paiement. Si
              vous ne recevez pas l’email (pensez au dossier spam), le même lien est aussi journalisé dans les logs
              du terminal <code>mvn quarkus:dev</code>.
            </Alerte>
          </div>
          <div className="mt-5">
            <label className="label" htmlFor="token-verification">
              Token de vérification (ou lien complet)
            </label>
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
            <button type="submit" className="btn-vitrine" disabled={chargement}>
              {chargement ? <SustwayLoader taille="sm" /> : <Mail className="h-4 w-4" aria-hidden />}
              {estFree ? 'Vérifier et activer le compte' : 'Vérifier et créer l’entreprise'}
            </button>
          </div>
        </form>
      ) : null}

      {etape === 'paiement' ? (
        <form onSubmit={soumettrePaiement}>
          <h2 className="text-lg font-semibold text-ink-900">Paiement de l’abonnement</h2>
          <p className="mt-1 text-sm text-ink-500">
            Formule {formuleChoisie?.nom}, facturation {periodicite === 'ANNUELLE' ? 'annuelle' : 'mensuelle'}.
          </p>
          <div className="mt-4">
            <Alerte ton="ambre">
              Intégration PI-SPI/Wave non finalisée (le CDC indique que ces modalités restent à cadrer avec Smartex
              Expertises) : ce paiement est simulé côté serveur et marqué réussi automatiquement.
            </Alerte>
          </div>
          <div className="mt-5">
            <span className="label">Moyen de paiement</span>
            <div className="grid grid-cols-2 gap-3">
              {[
                { code: 'PI_SPI', libelle: 'PI-SPI', icone: Wallet },
                { code: 'WAVE', libelle: 'Wave', icone: Smartphone },
              ].map((moyen) => (
                <button
                  key={moyen.code}
                  type="button"
                  className={clsx(
                    'flex flex-col items-center gap-2 rounded-2xl border p-4 text-sm font-medium transition duration-300 motion-safe:hover:-translate-y-0.5',
                    paiementFournisseur === moyen.code
                      ? 'border-brand-500 bg-brand-50/60 text-brand-700 shadow-glow'
                      : 'border-ink-200 bg-white text-ink-600 hover:border-brand-200'
                  )}
                  onClick={() => setPaiementFournisseur(moyen.code)}
                >
                  <moyen.icone className="h-5 w-5" aria-hidden />
                  {moyen.libelle}
                </button>
              ))}
            </div>
          </div>
          <div className="mt-5 flex items-center justify-between rounded-2xl border border-ink-100 bg-ink-50/60 px-4 py-3 text-sm">
            <span className="text-ink-600">Montant à régler</span>
            <span className="text-lg font-semibold text-ink-900">{montant != null ? formaterMontant(montant) : '—'}</span>
          </div>
          <div className="mt-7 flex justify-end">
            <button type="submit" className="btn-vitrine" disabled={chargement}>
              {chargement ? <SustwayLoader taille="sm" /> : null}
              Payer et activer l’abonnement
              <ArrowRight className="h-4 w-4" aria-hidden />
            </button>
          </div>
        </form>
      ) : null}

      {etape === 'confirmation' ? (
        <div className="motion-safe:animate-apparition-bas">
          <div className="flex items-center gap-4">
            <span className="relative inline-flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-600 ring-1 ring-brand-100">
              <span className="absolute inset-0 rounded-full bg-brand-200/60 motion-safe:animate-onde" aria-hidden />
              <CheckCircle2 className="relative h-7 w-7" aria-hidden />
            </span>
            <div>
              <h2 className="text-lg font-semibold text-ink-900">Compte créé</h2>
              <p className="text-sm text-ink-500">Toutes les étapes ci-dessus ont été réalisées sur l’API réelle.</p>
            </div>
          </div>

          <div className="mt-6 space-y-3">
            <div className="rounded-2xl border border-ink-100 bg-white p-4">
              <p className="flex items-center gap-2 text-sm font-semibold text-ink-900">
                <Mail className="h-4 w-4 text-brand-600" aria-hidden />
                Compte {formulaire.email}
              </p>
              <p className="mt-1 text-sm text-ink-500">Email vérifié, compte actif, vous êtes connecté.</p>
            </div>

            {!estFree && entrepriseCreee ? (
              <div className="rounded-2xl border border-ink-100 bg-white p-4">
                <p className="flex items-center gap-2 text-sm font-semibold text-ink-900">
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
                Compte en mode démonstration (RG25) : aucune entreprise n’a été créée. Vous pouvez changer de formule
                ultérieurement.
              </Alerte>
            ) : null}
          </div>

          <div className="mt-5">
            <Badge ton="vert" icone={CheckCircle2}>
              Compte activé
            </Badge>
          </div>

          <div className="mt-7 flex flex-wrap items-center justify-between gap-3">
            <Link to="/" className="btn-vitrine-clair">
              <ArrowLeft className="h-4 w-4" aria-hidden />
              Retour au site
            </Link>
            <button type="button" className="btn-vitrine" onClick={() => navigate('/app')}>
              Aller à mon espace
              <ArrowRight className="h-4 w-4" aria-hidden />
            </button>
          </div>
        </div>
      ) : null}
    </CadreAuth>
  );
}

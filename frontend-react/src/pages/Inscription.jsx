import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  Building2,
  CheckCircle2,
  CreditCard,
  Mail,
  Smartphone,
  Wallet,
} from 'lucide-react';
import clsx from 'clsx';
import { formaterMontant } from '../lib/export';
import { ACCROCHES, SOUS_TITRES } from '../lib/formules';
import { Alerte, Badge } from '../components/ui';
import { useApiAuth } from '../auth/useApiAuth';
import { ApiError } from '../lib/apiClient';
import SustwayLoader from '../components/SustwayLoader';
import CadreAuth from '../components/CadreAuth';
import EtapesParcours from '../components/EtapesParcours';
import SaisieCodeOtp, { LONGUEUR_CODE } from '../components/SaisieCodeOtp';

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
const COULEURS_FORCE = ['bg-brand-600', 'bg-brand-600', 'bg-amber-500', 'bg-feuille', 'bg-feuille'];

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
/** Durée de validité d'un code d'activation, alignée sur CodeVerificationService. */
const DUREE_CODE_SECONDES = 180;

/** Formate un décompte en m:ss. */
function formaterDelai(secondes) {
  const minutes = Math.floor(secondes / 60);
  return `${minutes}:${String(secondes % 60).padStart(2, '0')}`;
}

export default function Inscription() {
  const navigate = useNavigate();
  const {
    inscrire,
    verifierEmail,
    renvoyerCodeVerification,
    connecter,
    creerEntreprise,
    payerAbonnement,
    listerFormules,
    listerSecteurs,
  } = useApiAuth();

  const [etape, setEtape] = useState('formule');
  const [codeOtp, setCodeOtp] = useState('');
  const [secondesRestantes, setSecondesRestantes] = useState(DUREE_CODE_SECONDES);
  const [renvoiEnCours, setRenvoiEnCours] = useState(false);
  const [formules, setFormules] = useState([]);
  const [secteurs, setSecteurs] = useState([]);
  // La formule choisie sur la page Formules arrive dans l'URL
  // (/inscription?formule=AVANCEES) : sans cette lecture, le visiteur qui a
  // cliqué sur Avancées retrouvait Standard présélectionnée au moment de payer.
  const [parametres] = useSearchParams();
  const [plan, setPlan] = useState(() => parametres.get('formule')?.toUpperCase() || 'STANDARD');
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
  const montant = formuleChoisie?.prix;

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

  // Le focus suit l'étape, mais pas au premier affichage : la page vient de
  // s'ouvrir, le visiteur n'a encore rien actionné.
  const zoneEtape = useRef(null);
  const premierAffichage = useRef(true);
  useEffect(() => {
    if (premierAffichage.current) {
      premierAffichage.current = false;
      return;
    }
    zoneEtape.current?.focus();
  }, [etape]);
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
      setCodeOtp('');
      setSecondesRestantes(DUREE_CODE_SECONDES);
      setEtape('verification');
    } catch (err) {
      setErreur(err instanceof ApiError ? err.message : 'Erreur inattendue');
    } finally {
      setChargement(false);
    }
  }

  /**
   * Décompte de validité du code. Il ne conditionne rien côté serveur, qui
   * refait le calcul : il évite seulement à l'utilisateur de saisir un code
   * déjà périmé pour découvrir l'échec après coup.
   */
  useEffect(() => {
    if (etape !== 'verification') return undefined;
    const minuteur = setInterval(() => {
      setSecondesRestantes((restant) => (restant <= 1 ? 0 : restant - 1));
    }, 1000);
    return () => clearInterval(minuteur);
  }, [etape]);

  /**
   * Suite du parcours une fois le compte activé : connexion, puis création de
   * l'entreprise pour les formules payantes. Extrait de la validation du code
   * pour que « Activer » puisse être rejoué sans réactiver le compte — la
   * vérification est idempotente côté serveur.
   */
  async function poursuivreApresActivation() {
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
    });
    setEntrepriseCreee(entreprise);
    setAbonnementCree(abonnement);
    setEtape('paiement');
  }

  async function validerCode() {
    if (codeOtp.length < LONGUEUR_CODE) return;
    setErreur(null);
    setChargement(true);
    try {
      await verifierEmail(formulaire.email, codeOtp);
      await poursuivreApresActivation();
    } catch (err) {
      setErreur(err instanceof ApiError ? err.message : 'Erreur inattendue');
      // Le code est effacé pour éviter de renvoyer tel quel un code refusé :
      // les essais sur un même code sont comptés côté serveur.
      setCodeOtp('');
    } finally {
      setChargement(false);
    }
  }

  async function renvoyerCode() {
    setErreur(null);
    setRenvoiEnCours(true);
    try {
      await renvoyerCodeVerification(formulaire.email);
      setCodeOtp('');
      setSecondesRestantes(DUREE_CODE_SECONDES);
    } catch (err) {
      setErreur(err instanceof ApiError ? err.message : 'Erreur inattendue');
    } finally {
      setRenvoiEnCours(false);
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
      // Le sur-titre portait deja « Creation de compte » : le titre le reprenant
      // desormais, le garder aurait affiche deux fois la meme phrase, l'une
      // au-dessus de l'autre.
      titre="Création de compte"
    >
      {/* Seul retour possible : de « Compte » vers « Formule », avant que le
          compte n'existe. Au-delà, revenir en arrière recréerait un compte ou
          une entreprise déjà enregistrés. */}
      <EtapesParcours
        className="mb-7"
        etapes={etapes}
        indexCourant={indexCourant}
        estNavigable={(index) => etape === 'infos' && etapes[index][0] === 'formule'}
        surRetour={(cle) => setEtape(cle)}
      />

      {/* Zone qui reçoit le focus à chaque changement d'étape : le bouton
          qui vient d'être actionné disparaît avec l'étape, et le focus
          retombait sinon en haut de la page. */}
      <div ref={zoneEtape} tabIndex={-1} className="outline-none" aria-label={`Étape ${indexCourant + 1} sur ${etapes.length}`}>

      {erreur ? (
        <div className="mb-5">
          <Alerte ton="rouge">{erreur}</Alerte>
        </div>
      ) : null}

      {etape === 'formule' ? (
        <div>
          <h2 className="font-display text-xl font-bold text-ink-900">Choix de la formule</h2>
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
                        <span className="rounded-[4px] bg-ink-900 px-2 py-0.5 text-xs font-semibold text-ink-50">
                          Recommandée
                        </span>
                      ) : null}
                    </span>
                    <span className="font-display text-lg font-bold tabular-nums text-ink-900">
                      {Number(option.prix) === 0 ? 'Gratuit' : formaterMontant(option.prix)}
                    </span>
                  </span>
                  <span className="mt-1 block text-[15px] leading-snug text-ink-600">{ACCROCHES[option.code] ?? SOUS_TITRES[option.code] ?? option.description}</span>
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
                La formule Free est un mode de démonstration : aucune entreprise ne sera créée, seul le compte
                utilisateur sera activé.
              </Alerte>
            </div>
          ) : null}
          <div className="mt-7 flex justify-end">
            <button type="button" className="btn-vitrine" onClick={() => setEtape('infos')} disabled={!plan}>
              Continuer
            </button>
          </div>
        </div>
      ) : null}

      {etape === 'infos' ? (
        <form onSubmit={soumettreInfos}>
          <h2 className="font-display text-xl font-bold text-ink-900">
            {estFree ? 'Informations du compte' : 'Informations du compte et de l’entreprise'}
          </h2>
          <p className="mt-1 text-[15px] text-ink-600">Ces informations servent à créer votre compte.</p>

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
                  <CreditCard className="h-4 w-4 text-ink-900" aria-hidden />
                  Montant à régler après vérification de l’email
                </p>
                <p className="mt-3 text-sm text-ink-600">
                  <span className="font-semibold text-ink-900">{montant != null ? formaterMontant(montant) : '—'}</span>
                </p>
              </div>
            </>
          ) : null}

          <div className="mt-7 flex items-center justify-between gap-3">
            <button type="button" className="btn-vitrine-clair" onClick={() => setEtape('formule')}>
              Précédent
            </button>
            <button type="submit" className="btn-vitrine" disabled={chargement}>
              {chargement ? <SustwayLoader taille="sm" /> : null}
              Créer le compte
            </button>
          </div>
        </form>
      ) : null}

      {etape === 'verification' ? (
        <div>
          <h2 className="font-display text-xl font-bold text-ink-900">Activation du compte</h2>
          <p className="mt-1 text-[15px] text-ink-600">
            Un code à six chiffres vient d’être envoyé à <strong>{formulaire.email}</strong>.
          </p>

          <div className="mt-6">
            <SaisieCodeOtp
              valeur={codeOtp}
              surChangement={(valeur) => {
                setCodeOtp(valeur);
                setErreur(null);
              }}
              surValidation={validerCode}
              desactive={chargement}
              erreur={Boolean(erreur)}
            />
          </div>

          <p className="mt-4 text-center text-sm text-ink-500">
            {secondesRestantes > 0 ? (
              <>
                Code valable encore{' '}
                <strong className="tabular-nums text-ink-800">{formaterDelai(secondesRestantes)}</strong>
              </>
            ) : (
              'Ce code a expiré — demandez-en un nouveau.'
            )}
          </p>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <button
              type="button"
              className="btn-primary"
              disabled={codeOtp.length < LONGUEUR_CODE || chargement || secondesRestantes === 0}
              onClick={validerCode}
            >
              {chargement ? 'Activation…' : 'Activer mon compte'}
            </button>
            <button
              type="button"
              className="btn-secondary"
              disabled={chargement || renvoiEnCours}
              onClick={renvoyerCode}
            >
              {renvoiEnCours ? 'Envoi…' : 'Renvoyer un code'}
            </button>
          </div>

          <p className="mt-4 text-center text-xs text-ink-400">
            Vous ne recevez rien ? Pensez au dossier indésirables, puis demandez un nouveau code.
          </p>
        </div>
      ) : null}

      {etape === 'paiement' ? (
        <form onSubmit={soumettrePaiement}>
          <h2 className="font-display text-xl font-bold text-ink-900">Paiement de l’abonnement</h2>
          <p className="mt-1 text-[15px] text-ink-600">Formule {formuleChoisie?.nom}.</p>
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
                  aria-pressed={paiementFournisseur === moyen.code}
                  className={clsx(
                    'flex min-h-12 flex-col items-center gap-2 rounded-[8px] border bg-surface p-4 text-base font-semibold transition-colors',
                    paiementFournisseur === moyen.code
                      ? 'border-ink-900 text-ink-900 ring-1 ring-ink-900'
                      : 'border-ink-300 text-ink-600 hover:border-ink-500'
                  )}
                  onClick={() => setPaiementFournisseur(moyen.code)}
                >
                  <moyen.icone className="h-5 w-5" aria-hidden />
                  {moyen.libelle}
                </button>
              ))}
            </div>
          </div>
          <div className="mt-5 rounded-2xl border border-ink-100 bg-ink-50/60 px-4 py-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-ink-600">Montant à régler</span>
              <span className="text-lg font-semibold text-ink-900">{montant != null ? formaterMontant(montant) : '—'}</span>
            </div>
            <p className="mt-1 text-xs text-ink-500">Licence annuelle — accès valable un an à compter du paiement, renouvelable.</p>
          </div>
          <div className="mt-7 flex justify-end">
            <button type="submit" className="btn-vitrine" disabled={chargement}>
              {chargement ? <SustwayLoader taille="sm" /> : null}
              Payer et activer l’abonnement
            </button>
          </div>
        </form>
      ) : null}

      {etape === 'confirmation' ? (
        <div>
          <div className="flex items-center gap-4">
            <CheckCircle2 className="h-10 w-10 shrink-0 text-feuille" strokeWidth={2} aria-hidden />
            <div>
              <h2 className="font-display text-xl font-bold text-ink-900">Compte créé</h2>
              <p className="text-[15px] text-ink-600">Votre espace SMARTEX SustWay est prêt.</p>
            </div>
          </div>

          <div className="mt-6 space-y-3">
            <div className="rounded-2xl border border-ink-100 bg-surface p-4">
              <p className="flex items-center gap-2 text-sm font-semibold text-ink-900">
                <Mail className="h-4 w-4 text-ink-900" aria-hidden />
                Compte {formulaire.email}
              </p>
              <p className="mt-1 text-[15px] text-ink-600">Email vérifié, compte actif, vous êtes connecté.</p>
            </div>

            {!estFree && entrepriseCreee ? (
              <div className="rounded-2xl border border-ink-100 bg-surface p-4">
                <p className="flex items-center gap-2 text-sm font-semibold text-ink-900">
                  <Building2 className="h-4 w-4 text-ink-900" aria-hidden />
                  {entrepriseCreee.raisonSociale}
                </p>
                <p className="mt-1 text-[15px] text-ink-600">
                  Formule {formuleChoisie?.nom}, abonnement{' '}
                  {paiementResultat?.statut === 'REUSSI' ? 'actif' : abonnementCree?.statut?.toLowerCase()}, paiement
                  via {paiementResultat?.fournisseur === 'PI_SPI' ? 'PI-SPI' : paiementResultat?.fournisseur}.
                </p>
              </div>
            ) : null}

            {estFree ? (
              <Alerte ton="ambre">
                Compte en mode démonstration : aucune entreprise n’a été créée. Vous pouvez changer de formule
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
              Retour au site
            </Link>
            <button type="button" className="btn-vitrine" onClick={() => navigate('/app')}>
              Aller à mon espace
            </button>
          </div>
        </div>
      ) : null}
      </div>
    </CadreAuth>
  );
}

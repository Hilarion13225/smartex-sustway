import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { MapPin, Minus, Plus } from 'lucide-react';
import { Alerte } from '../components/ui';
import { SMARTEX } from '../config/smartex';
import { api, ApiError } from '../lib/apiClient';

const SUJETS = [
  'Demande de démonstration',
  'Question sur les formules',
  'Accompagnement / mission de conseil',
  'Financements verts',
  'Support technique',
  'Autre',
];

const CHAMPS_VIDES = { nom: '', email: '', organisation: '', telephone: '', sujet: '', message: '' };

/*
 * Carte du siège. Un cadre OpenStreetMap plutôt qu'une intégration Google
 * Maps : pas de clé d'API à gérer, pas de dépendance ajoutée au projet, et
 * aucun traceur tiers sur une page publique. Le lien « Voir sur Google Maps »
 * reste offert à qui veut préparer un itinéraire.
 */
const REPERE = { lat: 5.358, lon: -3.988, quartier: 'Cocody, Abidjan' };
const LIEN_MAPS = 'https://www.google.com/maps/search/?api=1&query=Cocody%2C+Abidjan%2C+C%C3%B4te+d%27Ivoire';

/*
 * Niveaux de zoom, exprimés en degrés de longitude couverts par le cadre. Le
 * contenu d'une iframe d'un autre domaine n'est pas pilotable depuis la page :
 * les boutons + et − recalculent donc la zone affichée et rechargent le cadre,
 * plutôt que d'imiter des contrôles qui ne feraient rien.
 */
const PORTEES = [0.16, 0.08, 0.04, 0.02, 0.01];

function cadreOsm(portee) {
  const demiLon = portee / 2;
  const demiLat = (portee * 0.55) / 2;
  const zone = [
    REPERE.lon - demiLon,
    REPERE.lat - demiLat,
    REPERE.lon + demiLon,
    REPERE.lat + demiLat,
  ]
    .map((valeur) => valeur.toFixed(4))
    .join(',');
  return `https://www.openstreetmap.org/export/embed.html?bbox=${encodeURIComponent(
    zone
  )}&layer=mapnik&marker=${REPERE.lat}%2C${REPERE.lon}`;
}

/*
 * Renvois de bas de page. Deux liens soulignés à la place des deux cartes
 * illustrées : ce sont des raccourcis, pas des offres.
 */
const RENVOIS = [
  {
    titre: 'Votre question est peut-être déjà posée.',
    texte: `Notation, référentiels, justification des écarts : les réponses les plus demandées sur ${SMARTEX.produit}.`,
    lien: { vers: '/methodologie#questions', libelle: 'Lire les questions fréquentes' },
  },
  {
    titre: 'Former vos équipes à la RSE et à l’ESG.',
    texte: 'Ateliers, séminaires et certificats de spécialisation, adaptés à votre secteur.',
    lien: { vers: '/formation', libelle: 'Découvrir les formations' },
  },
];

/**
 * Page de contact. Le formulaire envoie réellement le message : l'API le
 * relaie par e-mail à SMARTEX Expertises et accuse réception au visiteur
 * (voir api-quarkus, ContactResource).
 *
 * « Envoyé » ne s'affiche que si l'API confirme l'envoi. En cas d'échec — API
 * injoignable, service d'e-mail indisponible, trop d'envois — le visiteur ne
 * perd pas ce qu'il a écrit : le formulaire reste rempli, et il reçoit
 * l'adresse à copier et un brouillon prérempli dans sa messagerie.
 */
const EMAIL_VALIDE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ORDRE_CHAMPS = ['nom', 'email', 'organisation', 'sujet', 'message'];

/** Bouton « Copier l'adresse », avec confirmation annoncée aux lecteurs d'écran. */
function CopierAdresse({ className = '' }) {
  const [etat, definirEtat] = useState('repos');
  const minuterie = useRef(null);

  useEffect(() => () => clearTimeout(minuterie.current), []);

  const copier = async () => {
    try {
      await navigator.clipboard.writeText(SMARTEX.email);
      definirEtat('copiee');
    } catch {
      definirEtat('echec');
    }
    clearTimeout(minuterie.current);
    minuterie.current = setTimeout(() => definirEtat('repos'), 2500);
  };

  return (
    <button
      type="button"
      onClick={copier}
      className={`btn-presse inline-flex min-h-10 items-center rounded-[4px] border border-ink-300 px-3 text-sm font-semibold text-ink-900 hover:border-ink-900 ${className}`}
    >
      <span aria-live="polite">
        {etat === 'copiee' ? 'Adresse copiée' : etat === 'echec' ? 'Copie impossible' : 'Copier l’adresse'}
      </span>
    </button>
  );
}

export default function Contact() {
  const [champs, setChamps] = useState(CHAMPS_VIDES);
  // Une erreur par champ, affichée sous le champ concerné : un visiteur qui
  // lit « merci de renseigner… » en bas du formulaire doit sinon deviner
  // lequel corriger.
  const [erreurs, setErreurs] = useState({});
  // repos → envoi → envoye | echec. `echec` garde le message de l'API.
  const [envoi, definirEnvoi] = useState({ etat: 'repos', message: '' });
  // Champ piège (voir ContactRequest côté API) : invisible pour un visiteur,
  // rempli par les robots qui renseignent tous les champs d'un formulaire.
  const [siteWeb, definirSiteWeb] = useState('');
  const [niveauZoom, setNiveauZoom] = useState(2);
  const titreConfirmation = useRef(null);

  // Après l'envoi, le focus va sur la confirmation : sans quoi un lecteur
  // d'écran resterait sur un bouton qui vient de disparaître.
  useEffect(() => {
    if (envoi.etat === 'envoye') titreConfirmation.current?.focus();
  }, [envoi.etat]);

  const majChamp = (nom) => (evenement) => {
    setChamps((precedent) => ({ ...precedent, [nom]: evenement.target.value }));
    // L'erreur d'un champ disparaît dès qu'on le corrige ; les autres restent.
    setErreurs((precedentes) => {
      if (!precedentes[nom]) return precedentes;
      const suivantes = { ...precedentes };
      delete suivantes[nom];
      return suivantes;
    });
    if (envoi.etat === 'echec') definirEnvoi({ etat: 'repos', message: '' });
  };

  /** Brouillon prérempli dans la messagerie du visiteur : la solution de repli. */
  const lienBrouillon = () => {
    const corps = [
      `Nom : ${champs.nom}`,
      `E-mail : ${champs.email}`,
      `Organisation : ${champs.organisation}`,
      champs.telephone ? `Téléphone : +225 ${champs.telephone}` : null,
      '',
      champs.message,
    ]
      .filter((ligne) => ligne !== null)
      .join('\n');
    return `mailto:${SMARTEX.email}?subject=${encodeURIComponent(
      `[${SMARTEX.produit}] ${champs.sujet}`
    )}&body=${encodeURIComponent(corps)}`;
  };

  // L'adresse e-mail est vérifiée à la sortie du champ, pas à chaque frappe :
  // signaler « invalide » pendant qu'on tape encore est plus agaçant qu'utile.
  const verifierEmail = () => {
    const valeur = champs.email.trim();
    if (valeur && !EMAIL_VALIDE.test(valeur)) {
      setErreurs((precedentes) => ({ ...precedentes, email: 'Vérifiez l’adresse : il manque le @ ou le domaine.' }));
    }
  };

  // Attributs d'accessibilité d'un champ : marqué invalide et relié à son
  // message, pour qu'un lecteur d'écran lise l'erreur avec le libellé.
  const aideChamp = (nom) =>
    erreurs[nom] ? { 'aria-invalid': true, 'aria-describedby': `contact-${nom}-erreur` } : {};

  const messageErreur = (nom) =>
    erreurs[nom] ? (
      <p id={`contact-${nom}-erreur`} className="mt-1.5 text-sm font-medium text-brand-700">
        {erreurs[nom]}
      </p>
    ) : null;

  const soumettre = async (evenement) => {
    evenement.preventDefault();
    if (envoi.etat === 'envoi') return;

    const trouvees = {};
    if (!champs.nom.trim()) trouvees.nom = 'Indiquez votre nom.';
    if (!champs.email.trim()) trouvees.email = 'Indiquez votre adresse e-mail.';
    else if (!EMAIL_VALIDE.test(champs.email.trim())) trouvees.email = 'Vérifiez l’adresse : il manque le @ ou le domaine.';
    if (!champs.organisation.trim()) trouvees.organisation = 'Indiquez le nom de votre organisation.';
    if (!champs.sujet) trouvees.sujet = 'Choisissez un sujet.';
    if (!champs.message.trim()) trouvees.message = 'Écrivez votre message.';

    if (Object.keys(trouvees).length) {
      setErreurs(trouvees);
      // Le focus va au premier champ à corriger, dans l'ordre du formulaire.
      const premier = ORDRE_CHAMPS.find((nom) => trouvees[nom]);
      document.getElementById(`contact-${premier}`)?.focus();
      return;
    }

    definirEnvoi({ etat: 'envoi', message: '' });
    try {
      await api.post(
        '/api/v1/contact',
        {
          nom: champs.nom.trim(),
          email: champs.email.trim(),
          organisation: champs.organisation.trim(),
          telephone: champs.telephone.trim() ? `+225 ${champs.telephone.trim()}` : '',
          sujet: champs.sujet,
          message: champs.message.trim(),
          siteWeb,
        },
        { avecAuth: false }
      );
      definirEnvoi({ etat: 'envoye', message: '' });
    } catch (erreur) {
      // 429 (trop d'envois) et 503 (service d'e-mail indisponible) portent un
      // message rédigé pour le visiteur ; le reste reçoit un message générique,
      // les détails techniques ne l'aident pas.
      const message =
        erreur instanceof ApiError && (erreur.statut === 429 || erreur.statut === 503)
          ? erreur.message
          : 'Votre message n’a pas pu être envoyé.';
      definirEnvoi({ etat: 'echec', message });
    }
  };

  const recommencer = () => {
    setChamps(CHAMPS_VIDES);
    setErreurs({});
    definirEnvoi({ etat: 'repos', message: '' });
  };

  return (
    <div>
      {/* ------------------------------------------------ Héros typographique */}
      <section className="border-b border-ink-200">
        <div className="mx-auto max-w-[90rem] px-5 py-16 sm:py-20">
          <h1 className="titre-page max-w-[20ch] text-ink-900">Parlons de votre projet.</h1>
          <p className="mt-6 texte-chapo text-ink-600">
            Entreprise, institution, ONG ou organisation internationale : décrivez-nous le périmètre à évaluer. Nous
            répondons sous 24 h ouvrées.
          </p>
        </div>
      </section>

      {/* ------------------------------------------ Coordonnées + formulaire */}
      <section id="formulaire" className="border-b border-ink-200">
        <div className="mx-auto grid max-w-[90rem] gap-12 px-5 py-16 sm:py-20 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16">
          {/* ---------- Coordonnées et carte ---------- */}
          <div className="order-2 min-w-0 lg:order-1">
            <h2 className="titre-section text-ink-900">
              Nos coordonnées
            </h2>

            {/* Une liste à filets, lisible d'un coup d'œil, au lieu d'une
                rangée de quatre pastilles d'icônes. */}
            <dl className="mt-12 divide-y divide-ink-200 border-y border-ink-200">
              <div className="py-4">
                <dt className="text-sm text-ink-500">E-mail</dt>
                <dd className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-2">
                  <a
                    href={`mailto:${SMARTEX.email}`}
                    className="break-all text-base font-semibold text-ink-900 underline decoration-ink-300 underline-offset-4 hover:decoration-ink-900"
                  >
                    {SMARTEX.email}
                  </a>
                  <CopierAdresse />
                </dd>
              </div>
              <div className="py-4">
                <dt className="text-sm text-ink-500">Téléphone</dt>
                <dd className="mt-1">
                  <a
                    href={`tel:${SMARTEX.telephone.replace(/\s/g, '')}`}
                    className="text-base font-semibold tabular-nums text-ink-900 underline decoration-ink-300 underline-offset-4 hover:decoration-ink-900"
                  >
                    {SMARTEX.telephone}
                  </a>
                </dd>
              </div>
              <div className="py-4">
                <dt className="text-sm text-ink-500">Horaires</dt>
                <dd className="mt-1 text-base text-ink-900">{SMARTEX.horaires}</dd>
              </div>
              <div className="py-4">
                <dt className="text-sm text-ink-500">Adresse</dt>
                <dd className="mt-1 text-base text-ink-900">
                  {SMARTEX.editeur}, {REPERE.quartier}
                </dd>
              </div>
            </dl>

            {/* ---------- Carte ---------- */}
            <div className="relative mt-8 overflow-hidden rounded-[12px] border border-ink-200">
              <iframe
                src={cadreOsm(PORTEES[niveauZoom])}
                title={`Localisation de ${SMARTEX.editeur} à ${REPERE.quartier}`}
                loading="lazy"
                className="block h-64 w-full border-0 sm:h-72"
              />

              {/* Contrôles de zoom. Placés là où le cadre OpenStreetMap pose
                  les siens, qu'ils recouvrent : deux jeux de boutons côte à
                  côte se liraient comme un défaut d'intégration. */}
              <div className="absolute right-2.5 top-2.5 flex w-10 flex-col overflow-hidden rounded-[4px] border border-ink-300 bg-surface">
                <button
                  type="button"
                  aria-label="Zoomer sur la carte"
                  disabled={niveauZoom >= PORTEES.length - 1}
                  onClick={() => setNiveauZoom((valeur) => Math.min(valeur + 1, PORTEES.length - 1))}
                  className="flex h-10 items-center justify-center border-b border-ink-200 text-ink-900 transition-colors hover:bg-ink-50 disabled:opacity-40 disabled:hover:bg-surface"
                >
                  <Plus className="h-4 w-4" aria-hidden />
                </button>
                <button
                  type="button"
                  aria-label="Dézoomer la carte"
                  disabled={niveauZoom <= 0}
                  onClick={() => setNiveauZoom((valeur) => Math.max(valeur - 1, 0))}
                  className="flex h-10 items-center justify-center text-ink-900 transition-colors hover:bg-ink-50 disabled:opacity-40 disabled:hover:bg-surface"
                >
                  <Minus className="h-4 w-4" aria-hidden />
                </button>
              </div>
            </div>

            {/* Sous la carte plutôt que posé dessus : il ne recouvre plus le
                bandeau d'attribution qu'OpenStreetMap impose de laisser visible. */}
            <a
              href={LIEN_MAPS}
              target="_blank"
              rel="noreferrer noopener"
              className="lien-trait mt-2 gap-2 text-[15px]"
            >
              <MapPin className="h-4 w-4" aria-hidden />
              Itinéraire sur Google Maps
              <span className="sr-only"> (nouvel onglet)</span>
            </a>
          </div>

          {/* ---------- Formulaire ---------- */}
          {/* Premier sur téléphone : c'est ce que le visiteur est venu faire. */}
          {envoi.etat === 'envoye' ? (
            <div
              role="status"
              className="order-1 min-w-0 self-start rounded-[12px] border border-ink-200 bg-surface p-6 sm:p-8 lg:order-2"
            >
              {/* La coche se trace une fois : c'est le seul moment où la page
                  confirme qu'une action a abouti. */}
              <svg viewBox="0 0 48 48" className="coche-envoi h-12 w-12 text-feuille" aria-hidden>
                <circle cx="24" cy="24" r="22" fill="none" stroke="currentColor" strokeWidth="2" opacity="0.25" />
                <path
                  d="M14 25 L21 32 L34 17"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <h2
                ref={titreConfirmation}
                tabIndex={-1}
                className="mt-5 titre-section text-ink-900 outline-none"
              >
                Message envoyé.
              </h2>
              <p className="mt-3 max-w-[48ch] text-base leading-relaxed text-ink-600">
                Nous vous répondons sous 24 h ouvrées. Un accusé de réception vient de partir à{' '}
                <span className="font-semibold text-ink-900">{champs.email.trim()}</span>.
              </p>
              <button
                type="button"
                onClick={recommencer}
                className="btn-presse mt-8 inline-flex min-h-12 items-center justify-center rounded-[4px] border border-ink-300 px-6 text-base font-semibold text-ink-900 hover:border-ink-900"
              >
                Écrire un autre message
              </button>
            </div>
          ) : (
          <form
            onSubmit={soumettre}
            noValidate
            aria-busy={envoi.etat === 'envoi'}
            className="order-1 min-w-0 self-start rounded-[12px] border border-ink-200 bg-surface p-6 sm:p-8 lg:order-2"
          >
            <h2 className="titre-section text-ink-900">
              Écrivez-nous
            </h2>
            <p className="mt-4 text-[15px] text-ink-600">
              Les champs marqués d’un <span className="text-brand-600">*</span> sont obligatoires.
            </p>

            <div className="mt-8 grid gap-5 sm:grid-cols-2">
              <div>
                <label className="label" htmlFor="contact-nom">
                  Nom complet <span className="text-brand-600">*</span>
                </label>
                <input
                  id="contact-nom"
                  className="input"
                  placeholder="Votre nom"
                  value={champs.nom}
                  onChange={majChamp('nom')}
                  autoComplete="name"
                  aria-required="true"
                  {...aideChamp('nom')}
                />
                {messageErreur('nom')}
              </div>

              <div>
                <label className="label" htmlFor="contact-email">
                  Adresse e-mail <span className="text-brand-600">*</span>
                </label>
                <input
                  id="contact-email"
                  type="email"
                  className="input"
                  placeholder="votre.email@exemple.com"
                  value={champs.email}
                  onChange={majChamp('email')}
                  onBlur={verifierEmail}
                  autoComplete="email"
                  aria-required="true"
                  {...aideChamp('email')}
                />
                {messageErreur('email')}
              </div>

              <div>
                <label className="label" htmlFor="contact-organisation">
                  Organisation <span className="text-brand-600">*</span>
                </label>
                <input
                  id="contact-organisation"
                  className="input"
                  placeholder="Nom de votre organisation"
                  value={champs.organisation}
                  onChange={majChamp('organisation')}
                  autoComplete="organization"
                  aria-required="true"
                  {...aideChamp('organisation')}
                />
                {messageErreur('organisation')}
              </div>

              <div>
                <label className="label" htmlFor="contact-telephone">
                  Téléphone
                </label>
                {/* Indicatif fixe : la plateforme s'adresse d'abord au marché
                    ivoirien, et un vrai sélecteur de pays demanderait une
                    dépendance que le projet n'a pas. */}
                <div className="flex">
                  {/* Pas de drapeau émoji : Windows n'affiche pas les
                      indicateurs régionaux et rendrait « CI » en toutes
                      lettres, ce qui se lit comme un défaut d'affichage. */}
                  <span className="inline-flex shrink-0 items-center rounded-l-lg border border-r-0 border-ink-200 bg-ink-50 px-3 text-sm text-ink-600">
                    <span className="sr-only">Indicatif de la Côte d’Ivoire</span>
                    +225
                  </span>
                  <input
                    id="contact-telephone"
                    type="tel"
                    className="input rounded-l-none"
                    placeholder="07 12 34 56 78"
                    value={champs.telephone}
                    onChange={majChamp('telephone')}
                    autoComplete="tel-national"
                  />
                </div>
              </div>

              <div className="sm:col-span-2">
                <label className="label" htmlFor="contact-sujet">
                  Sujet <span className="text-brand-600">*</span>
                </label>
                <select
                  id="contact-sujet"
                  className="input"
                  value={champs.sujet}
                  onChange={majChamp('sujet')}
                  aria-required="true"
                  {...aideChamp('sujet')}
                >
                  <option value="">Sélectionnez un sujet</option>
                  {SUJETS.map((sujet) => (
                    <option key={sujet} value={sujet}>
                      {sujet}
                    </option>
                  ))}
                </select>
                {messageErreur('sujet')}
              </div>

              <div className="sm:col-span-2">
                <label className="label" htmlFor="contact-message">
                  Votre message <span className="text-brand-600">*</span>
                </label>
                <textarea
                  id="contact-message"
                  className="input min-h-[9rem] resize-y"
                  placeholder="Décrivez votre demande…"
                  value={champs.message}
                  onChange={majChamp('message')}
                  aria-required="true"
                  {...aideChamp('message')}
                />
                {messageErreur('message')}
              </div>

              {/* Champ piège : hors de l'écran, hors tabulation, ignoré des
                  lecteurs d'écran et du remplissage automatique. */}
              <div className="absolute -left-[10000px] h-px w-px overflow-hidden" aria-hidden="true">
                <label htmlFor="contact-site-web">Site web</label>
                <input
                  id="contact-site-web"
                  name="site-web"
                  type="text"
                  tabIndex={-1}
                  autoComplete="off"
                  value={siteWeb}
                  onChange={(evenement) => definirSiteWeb(evenement.target.value)}
                />
              </div>
            </div>

            {Object.keys(erreurs).length ? (
              <div className="mt-5" role="alert">
                <Alerte ton="rouge">
                  {Object.keys(erreurs).length === 1
                    ? 'Un champ est à corriger.'
                    : `${Object.keys(erreurs).length} champs sont à corriger.`}
                </Alerte>
              </div>
            ) : null}

            {/* Échec : le formulaire reste rempli, et deux sorties sont
                offertes pour que le message parte quand même. */}
            {envoi.etat === 'echec' ? (
              <div role="alert" className="mt-5 border-l-2 border-brand-600 bg-ink-50 px-4 py-3 text-[15px] leading-relaxed text-ink-700">
                <p className="font-semibold text-ink-900">{envoi.message}</p>
                <p className="mt-1">
                  Votre texte est conservé ci-dessus. Vous pouvez réessayer, ou nous l’envoyer depuis votre messagerie.
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
                  <a href={lienBrouillon()} className="lien-trait text-[15px]">
                    Ouvrir dans ma messagerie
                  </a>
                  <CopierAdresse />
                </div>
              </div>
            ) : null}

            <button
              type="submit"
              disabled={envoi.etat === 'envoi'}
              className="btn-presse mt-8 inline-flex min-h-12 w-full items-center justify-center rounded-[4px] bg-brand-600 px-6 text-base font-semibold text-white hover:bg-brand-700 disabled:cursor-wait disabled:opacity-70"
            >
              {envoi.etat === 'envoi' ? 'Envoi en cours…' : envoi.etat === 'echec' ? 'Réessayer l’envoi' : 'Envoyer le message'}
            </button>
            <p className="mt-3 text-sm leading-relaxed text-ink-500">
              Votre message est transmis à {SMARTEX.editeur}. Il sert uniquement à vous répondre.
            </p>
          </form>
          )}
        </div>
      </section>

      {/* ---------------------------------------------------------- Renvois */}
      <section className="bg-surface">
        <ul className="mx-auto grid max-w-[90rem] gap-10 px-5 py-16 sm:py-20 md:grid-cols-2 md:gap-16">
          {RENVOIS.map((renvoi) => (
            <li key={renvoi.lien.vers} className="flex flex-col border-t border-ink-300 pt-5">
              <h2 className="titre-objet text-ink-900">{renvoi.titre}</h2>
              <p className="mt-2 max-w-[48ch] text-[15px] leading-relaxed text-ink-600">{renvoi.texte}</p>
              <Link to={renvoi.lien.vers} viewTransition className="lien-trait mt-3 text-base">
                {renvoi.lien.libelle}
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

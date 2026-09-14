import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { MapPin, Minus, Plus } from 'lucide-react';
import { Alerte } from '../components/ui';
import { SMARTEX } from '../config/smartex';

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
    texte: `Méthode, formules, confidentialité : les réponses les plus demandées sur ${SMARTEX.produit}.`,
    lien: { vers: '/faq', libelle: 'Lire les questions fréquentes' },
  },
  {
    titre: 'Former vos équipes à la RSE et à l’ESG.',
    texte: 'Ateliers, séminaires et certificats de spécialisation, adaptés à votre secteur.',
    lien: { vers: '/formation', libelle: 'Découvrir les formations' },
  },
];

/**
 * Page de contact 100 % côté navigateur : le formulaire n'appelle aucune API.
 *
 * À la validation, un brouillon d'e-mail prérempli est ouvert dans la
 * messagerie du visiteur (mailto). Le bouton le dit — « Préparer mon e-mail »
 * et non « Envoyer » — et l'adresse reste copiable juste à côté : sur un
 * téléphone ou un poste sans messagerie configurée, le lien mailto n'ouvre
 * rien, et un message de succès laisserait croire qu'une demande est partie.
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
  const [brouillonPrepare, definirBrouillonPrepare] = useState(false);
  const [niveauZoom, setNiveauZoom] = useState(2);

  const majChamp = (nom) => (evenement) => {
    setChamps((precedent) => ({ ...precedent, [nom]: evenement.target.value }));
    // L'erreur d'un champ disparaît dès qu'on le corrige ; les autres restent.
    setErreurs((precedentes) => {
      if (!precedentes[nom]) return precedentes;
      const suivantes = { ...precedentes };
      delete suivantes[nom];
      return suivantes;
    });
    definirBrouillonPrepare(false);
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
      <p id={`contact-${nom}-erreur`} className="mt-1.5 text-sm font-medium text-brand-700 dark:text-brand-400">
        {erreurs[nom]}
      </p>
    ) : null;

  const soumettre = (evenement) => {
    evenement.preventDefault();

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

    const corps = [
      `Nom : ${champs.nom}`,
      `E-mail : ${champs.email}`,
      `Organisation : ${champs.organisation}`,
      champs.telephone ? `Téléphone : +225 ${champs.telephone}` : null,
      '',
      champs.message,
    ]
      .filter(Boolean)
      .join('\n');

    window.location.href = `mailto:${SMARTEX.email}?subject=${encodeURIComponent(
      `[${SMARTEX.produit}] ${champs.sujet}`
    )}&body=${encodeURIComponent(corps)}`;

    definirBrouillonPrepare(true);
  };

  return (
    <div>
      {/* ------------------------------------------------ Héros typographique */}
      <section className="border-b border-ink-200">
        <div className="mx-auto max-w-[75rem] px-5 py-14 sm:py-20">
          <p className="sur-titre">Contact</p>
          <h1 className="titre-page mt-4 max-w-[20ch] text-ink-900">Parlons de votre projet.</h1>
          <p className="mt-6 max-w-[60ch] text-lg leading-relaxed text-ink-600">
            Entreprise, institution, ONG ou organisation internationale : décrivez-nous le périmètre à évaluer. Nous
            répondons sous 24 h ouvrées.
          </p>
        </div>
      </section>

      {/* ------------------------------------------ Coordonnées + formulaire */}
      <section id="formulaire" className="scroll-mt-20 border-b border-ink-200">
        <div className="mx-auto grid max-w-[75rem] gap-12 px-5 py-14 sm:py-16 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16">
          {/* ---------- Coordonnées et carte ---------- */}
          <div className="order-2 min-w-0 lg:order-1">
            <h2 className="font-display text-2xl font-bold leading-tight tracking-[-0.02em] text-ink-900 sm:text-[1.875rem]">
              Nos coordonnées
            </h2>

            {/* Une liste à filets, lisible d'un coup d'œil, au lieu d'une
                rangée de quatre pastilles d'icônes. */}
            <dl className="mt-6 divide-y divide-ink-200 border-y border-ink-200">
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
          <form
            onSubmit={soumettre}
            noValidate
            className="order-1 min-w-0 self-start rounded-[12px] border border-ink-200 bg-surface p-6 sm:p-8 lg:order-2"
          >
            <h2 className="font-display text-2xl font-bold leading-tight tracking-[-0.02em] text-ink-900 sm:text-[1.875rem]">
              Écrivez-nous
            </h2>
            <p className="mt-2 text-[15px] text-ink-600">
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

            {/* Pas de vert ni de coche : rien n'est encore parti. Le message
                dit ce qui s'est passé et que faire si la messagerie ne s'est
                pas ouverte. */}
            {brouillonPrepare ? (
              <div role="status" className="mt-5 border-l-2 border-ink-900 bg-ink-50 px-4 py-3 text-[15px] leading-relaxed text-ink-700">
                <p className="font-semibold text-ink-900">Votre message est prêt dans votre messagerie.</p>
                <p className="mt-1">
                  Il vous reste à l’envoyer. Si rien ne s’est ouvert, copiez notre adresse et collez votre message dans
                  l’outil de votre choix.
                </p>
                <CopierAdresse className="mt-3" />
              </div>
            ) : null}

            <button
              type="submit"
              className="btn-presse mt-8 inline-flex min-h-12 w-full items-center justify-center rounded-[4px] bg-brand-600 px-6 text-base font-semibold text-white hover:bg-brand-700"
            >
              Préparer mon e-mail
            </button>
            <p className="mt-3 text-sm leading-relaxed text-ink-500">
              Le bouton ouvre votre messagerie avec le message prérempli, adressé à {SMARTEX.email}.
            </p>
          </form>
        </div>
      </section>

      {/* ---------------------------------------------------------- Renvois */}
      <section className="bg-surface">
        <ul className="mx-auto grid max-w-[75rem] gap-10 px-5 py-14 sm:py-16 md:grid-cols-2 md:gap-16">
          {RENVOIS.map((renvoi) => (
            <li key={renvoi.lien.vers} className="flex flex-col border-t border-ink-300 pt-5">
              <h2 className="font-display text-xl font-bold leading-snug text-ink-900 sm:text-[1.375rem]">{renvoi.titre}</h2>
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

import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  CheckCircle2,
  GraduationCap,
  HelpCircle,
  Leaf,
  Mail,
  MapPin,
  MessageSquare,
  Phone,
  Send,
  ShieldCheck,
  Users,
} from 'lucide-react';
import Revele from '../components/Revele';
import { Alerte } from '../components/ui';
import { Etiquette, PASTELS, TraitManuscrit } from '../components/vitrine/communs';
import { SMARTEX } from '../config/smartex';
import photoConseillere from '../assets/contact/conseillere.jpg';
import photoFormation from '../assets/formation/banniere.jpg';

const SUJETS = [
  'Demande de démonstration',
  'Question sur les formules',
  'Accompagnement / mission de conseil',
  'Financements verts',
  'Support technique',
  'Autre',
];

const CHAMPS_VIDES = { nom: '', email: '', organisation: '', telephone: '', sujet: '', message: '' };

const REASSURANCE = [
  { icone: MessageSquare, ton: 'rouge', titre: 'Réponse rapide', detail: 'Sous 24 h ouvrées' },
  { icone: Users, ton: 'rouge', titre: 'Une équipe d’experts', detail: 'À votre écoute' },
  { icone: ShieldCheck, ton: 'rouge', titre: 'Un accompagnement personnalisé', detail: 'Selon vos besoins' },
];

/*
 * Carte du siège. Un cadre OpenStreetMap plutôt qu'une intégration Google
 * Maps : pas de clé d'API à gérer, pas de dépendance ajoutée au projet, et
 * aucun traceur tiers sur une page publique. Le lien « Voir sur Google Maps »
 * reste offert à qui veut préparer un itinéraire.
 */
const CARTE_OSM =
  'https://www.openstreetmap.org/export/embed.html?bbox=-4.020%2C5.330%2C-3.955%2C5.385&layer=mapnik&marker=5.3580%2C-3.9880';
const LIEN_MAPS = 'https://www.google.com/maps/search/?api=1&query=Cocody%2C+Abidjan%2C+C%C3%B4te+d%27Ivoire';

/**
 * Page de contact 100 % côté navigateur : le formulaire n'appelle aucune API.
 * À la validation, un brouillon d'e-mail prérempli est ouvert dans le client
 * de messagerie du visiteur (mailto), ce qui évite toute dépendance backend.
 */
export default function Contact() {
  const [champs, setChamps] = useState(CHAMPS_VIDES);
  const [erreur, setErreur] = useState('');
  const [envoye, setEnvoye] = useState(false);

  const majChamp = (nom) => (evenement) => {
    setChamps((precedent) => ({ ...precedent, [nom]: evenement.target.value }));
    setErreur('');
    setEnvoye(false);
  };

  const soumettre = (evenement) => {
    evenement.preventDefault();

    if (!champs.nom.trim() || !champs.email.trim() || !champs.organisation.trim() || !champs.message.trim()) {
      setErreur('Merci de renseigner votre nom, votre e-mail, votre organisation et votre message.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(champs.email.trim())) {
      setErreur('L’adresse e-mail saisie ne semble pas valide.');
      return;
    }
    if (!champs.sujet) {
      setErreur('Merci de choisir un sujet pour orienter votre demande.');
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

    setEnvoye(true);
  };

  return (
    <div>
      {/* --------------------------------------------------------- Héros */}
      <section className="relative overflow-hidden">
        {/* Photo de la moitié droite, fondue vers la zone de texte. Masquée
            sous `lg`, où le héros passe sur une seule colonne. */}
        <div className="pointer-events-none absolute inset-y-0 right-0 hidden w-[50%] lg:block" aria-hidden>
          <img
            src={photoConseillere}
            alt=""
            className="h-full w-full object-cover [mask-image:linear-gradient(to_right,transparent,black_32%)]"
          />
          <span className="absolute inset-0 bg-gradient-to-r from-surface/90 via-surface/15 to-transparent" />
        </div>

        <div className="relative mx-auto grid max-w-[80rem] items-center gap-12 px-5 py-14 lg:grid-cols-[1.05fr_0.95fr] lg:gap-10 lg:py-16">
          <div className="motion-safe:animate-apparition-bas">
            <Etiquette filetDroit>Contactez-nous</Etiquette>

            <h1 className="mt-5 font-display text-[1.95rem] font-extrabold leading-[1.14] tracking-tight text-marine sm:text-[2.4rem] lg:text-[2.45rem] xl:text-[2.6rem]">
              Échangeons sur votre
              <br />
              <span className="text-brand-600">démarche RSE et ESG.</span>
            </h1>

            <p className="mt-5 max-w-lg text-base leading-[1.6] text-ink-600">
              Une question, un besoin d’information ou une demande de démonstration ? Notre équipe est à votre écoute
              pour vous accompagner.
            </p>

            <ul className="mt-9 grid gap-x-6 gap-y-5 sm:grid-cols-2 lg:grid-cols-3">
              {REASSURANCE.map((element, index) => (
                <Revele key={element.titre} delai={index * 110} as="li" className="flex items-start gap-3">
                  <span
                    className={`inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${PASTELS[element.ton]}`}
                  >
                    <element.icone className="h-5 w-5" aria-hidden />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-[13px] font-semibold leading-snug text-marine">{element.titre}</span>
                    <span className="mt-0.5 block text-[12px] text-ink-500">{element.detail}</span>
                  </span>
                </Revele>
              ))}
            </ul>
          </div>

          {/* Annotations posées sur la photo, comme sur la maquette. */}
          <div className="relative hidden min-h-[19rem] lg:block" aria-hidden="false">
            <p className="absolute left-0 top-4 w-48 rotate-[-4deg] font-titre text-[0.95rem] font-semibold italic leading-snug text-marine">
              Ensemble pour des organisations plus durables.
              <TraitManuscrit className="mt-1.5 h-2 w-28 text-brand-500" />
            </p>

            <blockquote className="absolute bottom-2 right-0 w-52 rotate-[3deg] rounded-xl border border-ink-100 bg-surface p-5 shadow-soft">
              <span className="font-display text-3xl leading-none text-brand-600" aria-hidden>
                “
              </span>
              <p className="mt-1 font-titre text-[0.95rem] font-semibold italic leading-snug text-marine">
                Votre réussite durable est notre priorité.
              </p>
            </blockquote>
          </div>
        </div>
      </section>

      {/* ------------------------------------------ Formulaire + coordonnées */}
      <section className="mx-auto max-w-[80rem] px-5 pb-16">
        <div className="grid gap-10 lg:grid-cols-2 lg:gap-12">

          {/* ---------- Formulaire ---------- */}
          <Revele className="min-w-0">
            <form
              onSubmit={soumettre}
              noValidate
              className="rounded-2xl border border-brand-100 bg-brand-50/40 p-6 sm:p-8 dark:border-brand-500/20 dark:bg-brand-500/[0.06]"
            >
              <Etiquette>Envoyez-nous un message</Etiquette>
              <h2 className="mt-4 font-display text-2xl font-extrabold tracking-tight text-marine sm:text-[1.7rem]">
                Nous vous répondons rapidement.
              </h2>

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
                  />
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
                    autoComplete="email"
                  />
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
                  />
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
                  <select id="contact-sujet" className="input" value={champs.sujet} onChange={majChamp('sujet')}>
                    <option value="">Sélectionnez un sujet</option>
                    {SUJETS.map((sujet) => (
                      <option key={sujet} value={sujet}>
                        {sujet}
                      </option>
                    ))}
                  </select>
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
                  />
                </div>
              </div>

              {erreur ? (
                <div className="mt-5">
                  <Alerte ton="rouge">{erreur}</Alerte>
                </div>
              ) : null}

              {envoye ? (
                <div className="mt-5 flex items-start gap-2 rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-700 ring-1 ring-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-300 dark:ring-emerald-500/30">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                  <p>
                    Votre brouillon d’e-mail a été préparé. S’il ne s’ouvre pas automatiquement, écrivez-nous
                    directement à{' '}
                    <a className="font-medium underline" href={`mailto:${SMARTEX.email}`}>
                      {SMARTEX.email}
                    </a>
                    .
                  </p>
                </div>
              ) : null}

              <button
                type="submit"
                className="group mt-8 inline-flex w-full items-center justify-center gap-2.5 rounded-lg bg-brand-600 px-6 py-3.5 text-sm font-semibold text-white shadow-glow transition duration-300 hover:bg-brand-700 motion-safe:hover:-translate-y-0.5"
              >
                Envoyer le message
                <Send className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" aria-hidden />
              </button>
            </form>
          </Revele>

          {/* ---------- Coordonnées ---------- */}
          <Revele delai={120} className="min-w-0">
            <Etiquette>Nos coordonnées</Etiquette>
            <h2 className="mt-4 font-display text-2xl font-extrabold tracking-tight text-marine sm:text-[1.7rem]">
              Nous sommes à votre écoute.
            </h2>

            <div className="mt-8 grid gap-5 sm:grid-cols-2">
              <article className="rounded-2xl border border-ink-100 bg-surface p-5 shadow-sm">
                <span className={`inline-flex h-11 w-11 items-center justify-center rounded-full ${PASTELS.rouge}`}>
                  <MapPin className="h-5 w-5" aria-hidden />
                </span>
                <h3 className="mt-4 font-display text-[0.95rem] font-bold text-marine">Notre adresse</h3>
                <p className="mt-2 text-[13px] leading-relaxed text-ink-600">{SMARTEX.adresse}</p>
                <p className="mt-2 text-[12px] leading-snug text-ink-400">{SMARTEX.editeur}</p>
              </article>

              <article className="rounded-2xl border border-ink-100 bg-surface p-5 shadow-sm">
                <span className={`inline-flex h-11 w-11 items-center justify-center rounded-full ${PASTELS.rouge}`}>
                  <Phone className="h-5 w-5" aria-hidden />
                </span>
                <h3 className="mt-4 font-display text-[0.95rem] font-bold text-marine">Téléphone</h3>
                <p className="mt-2 text-[13px] leading-relaxed text-ink-600">
                  <a className="transition-colors hover:text-brand-700" href={`tel:${SMARTEX.telephone.replace(/\s/g, '')}`}>
                    {SMARTEX.telephone}
                  </a>
                </p>
                <p className="mt-2 text-[12px] leading-snug text-ink-400">{SMARTEX.horaires}</p>
              </article>

              <article className="rounded-2xl border border-ink-100 bg-surface p-5 shadow-sm">
                <span className={`inline-flex h-11 w-11 items-center justify-center rounded-full ${PASTELS.rouge}`}>
                  <Mail className="h-5 w-5" aria-hidden />
                </span>
                <h3 className="mt-4 font-display text-[0.95rem] font-bold text-marine">E-mail</h3>
                <p className="mt-2 break-words text-[13px] leading-relaxed text-ink-600">
                  <a className="block transition-colors hover:text-brand-700" href={`mailto:${SMARTEX.email}`}>
                    {SMARTEX.email}
                  </a>
                  <a className="block transition-colors hover:text-brand-700" href={`mailto:${SMARTEX.emailSupport}`}>
                    {SMARTEX.emailSupport}
                  </a>
                </p>
                <p className="mt-2 text-[12px] leading-snug text-ink-400">Nous vous répondons sous 24 h ouvrées.</p>
              </article>

              <article className="rounded-2xl border border-ink-100 bg-surface p-5 shadow-sm">
                <span className={`inline-flex h-11 w-11 items-center justify-center rounded-full ${PASTELS.rouge}`}>
                  <Users className="h-5 w-5" aria-hidden />
                </span>
                <h3 className="mt-4 font-display text-[0.95rem] font-bold text-marine">Suivez-nous</h3>
                <p className="mt-2 text-[13px] leading-relaxed">
                  <a
                    className="inline-flex items-center gap-1.5 font-medium text-brand-600 transition-colors hover:text-brand-700 dark:text-brand-400"
                    href={SMARTEX.linkedin}
                    target="_blank"
                    rel="noreferrer noopener"
                  >
                    LinkedIn
                    <ArrowRight className="h-3.5 w-3.5" aria-hidden />
                  </a>
                </p>
                <p className="mt-2 text-[12px] leading-snug text-ink-400">
                  Restez informé de nos actualités et de nos contenus.
                </p>
              </article>
            </div>

            {/* ---------- Carte ---------- */}
            <div className="relative mt-5 overflow-hidden rounded-2xl border border-ink-100">
              <iframe
                src={CARTE_OSM}
                title={`Localisation de ${SMARTEX.editeur} à ${SMARTEX.adresse}`}
                loading="lazy"
                className="block h-56 w-full border-0 sm:h-64"
              />
              <a
                href={LIEN_MAPS}
                target="_blank"
                rel="noreferrer noopener"
                className="absolute right-3 top-3 inline-flex items-center gap-1.5 rounded-lg bg-surface/95 px-3 py-1.5 text-[12px] font-semibold text-marine shadow-sm backdrop-blur transition-colors hover:bg-surface"
              >
                <MapPin className="h-3.5 w-3.5 text-brand-600" aria-hidden />
                Voir sur Google Maps
              </a>
            </div>
          </Revele>
        </div>
      </section>

      {/* ---------------------------------------------- FAQ et formation */}
      <section className="mx-auto max-w-[80rem] px-5 pb-16">
        <div className="grid gap-6 lg:grid-cols-2">

          <Revele>
            <article className="flex h-full flex-col rounded-2xl border border-ink-100 bg-surface p-7 shadow-sm">
              <span className={`inline-flex h-12 w-12 items-center justify-center rounded-full ${PASTELS.rouge}`}>
                <HelpCircle className="h-5 w-5" aria-hidden />
              </span>
              <div className="mt-5">
                <Etiquette>Une question ?</Etiquette>
              </div>
              <h2 className="mt-3 font-display text-xl font-extrabold leading-snug tracking-tight text-marine sm:text-[1.45rem]">
                Consultez notre foire aux questions.
              </h2>
              <p className="mt-3 max-w-md text-[13px] leading-relaxed text-ink-500">
                Trouvez rapidement des réponses aux questions les plus fréquentes sur {SMARTEX.produit}, nos formules et
                notre accompagnement.
              </p>
              <div className="flex-1" />
              <Link
                to="/faq"
                className="group mt-7 inline-flex w-fit items-center gap-2.5 rounded-lg border border-brand-300 bg-surface px-6 py-3 text-sm font-semibold text-brand-600 transition duration-300 hover:border-brand-500 hover:bg-brand-50 motion-safe:hover:-translate-y-0.5 dark:border-brand-500/50 dark:text-brand-400 dark:hover:bg-brand-500/10"
              >
                Voir la FAQ
                <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" aria-hidden />
              </Link>
            </article>
          </Revele>

          <Revele delai={120}>
            <article className="flex h-full flex-col overflow-hidden rounded-2xl border border-ink-100 bg-surface shadow-sm sm:flex-row">
              <div className="flex flex-1 flex-col p-7">
                <span className={`inline-flex h-12 w-12 items-center justify-center rounded-full ${PASTELS.vert}`}>
                  <GraduationCap className="h-5 w-5" aria-hidden />
                </span>
                <div className="mt-5">
                  <Etiquette>Se former</Etiquette>
                </div>
                <h2 className="mt-3 font-display text-xl font-extrabold leading-snug tracking-tight text-marine sm:text-[1.45rem]">
                  Développez vos compétences en RSE et ESG.
                </h2>
                <p className="mt-3 text-[13px] leading-relaxed text-ink-500">
                  Découvrez nos modules de formation pour mieux comprendre les enjeux, maîtriser les bonnes pratiques et
                  passer à l’action.
                </p>
                <div className="flex-1" />
                <Link
                  to="/formation"
                  className="group mt-7 inline-flex w-fit items-center gap-2.5 rounded-lg border border-brand-300 bg-surface px-6 py-3 text-sm font-semibold text-brand-600 transition duration-300 hover:border-brand-500 hover:bg-brand-50 motion-safe:hover:-translate-y-0.5 dark:border-brand-500/50 dark:text-brand-400 dark:hover:bg-brand-500/10"
                >
                  Découvrir nos formations
                  <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" aria-hidden />
                </Link>
              </div>

              <img
                src={photoFormation}
                alt=""
                aria-hidden
                loading="lazy"
                className="h-40 w-full shrink-0 object-cover sm:h-auto sm:w-[38%]"
              />
            </article>
          </Revele>
        </div>
      </section>

      {/* --------------------------------------------------- Appel final */}
      <section className="bg-gradient-to-r from-brand-800 via-brand-700 to-brand-700 text-white">
        <Revele className="mx-auto flex max-w-[80rem] flex-col items-center gap-7 px-5 py-10 text-center lg:flex-row lg:gap-8 lg:text-left">
          <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-white shadow-lg">
            <Leaf className="h-8 w-8 text-brand-600" strokeWidth={2.2} aria-hidden />
          </span>

          <div className="flex-1">
            <h2 className="font-display text-xl font-extrabold leading-snug sm:text-[1.5rem]">
              Bâtissons ensemble une performance durable.
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-white/85">
              Contactez-nous dès maintenant pour échanger sur vos besoins.
            </p>
          </div>

          <Link
            to="/inscription"
            className="group inline-flex shrink-0 items-center justify-center gap-2.5 rounded-lg bg-white px-8 py-3.5 text-sm font-semibold text-brand-700 shadow-lg transition duration-300 hover:bg-brand-50 motion-safe:hover:-translate-y-0.5"
          >
            Créer un compte
            <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" aria-hidden />
          </Link>
        </Revele>
      </section>
    </div>
  );
}

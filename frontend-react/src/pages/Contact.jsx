import { useState } from 'react';
import { CheckCircle2, Clock, ExternalLink, Mail, MapPin, MessageSquare, Phone, Send } from 'lucide-react';
import EnTeteVitrine from '../components/EnTeteVitrine';
import Revele from '../components/Revele';
import { Alerte } from '../components/ui';
import { SMARTEX } from '../config/smartex';
import photoBanniere from '../assets/contact/banniere.jpg';

const SUJETS = [
  'Demande de démonstration',
  'Question sur les formules',
  'Accompagnement / mission de conseil',
  'Financements verts',
  'Support technique',
  'Autre',
];

const CHAMPS_VIDES = { nom: '', email: '', organisation: '', telephone: '', sujet: SUJETS[0], message: '' };

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

    if (!champs.nom.trim() || !champs.email.trim() || !champs.message.trim()) {
      setErreur('Merci de renseigner au minimum votre nom, votre e-mail et votre message.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(champs.email.trim())) {
      setErreur('L’adresse e-mail saisie ne semble pas valide.');
      return;
    }

    const corps = [
      `Nom : ${champs.nom}`,
      `E-mail : ${champs.email}`,
      champs.organisation ? `Organisation : ${champs.organisation}` : null,
      champs.telephone ? `Téléphone : ${champs.telephone}` : null,
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

  const COORDONNEES = [
    { icone: Mail, libelle: 'E-mail', valeur: SMARTEX.email, lien: `mailto:${SMARTEX.email}` },
    { icone: Mail, libelle: 'Support client', valeur: SMARTEX.emailSupport, lien: `mailto:${SMARTEX.emailSupport}` },
    { icone: Phone, libelle: 'Téléphone', valeur: SMARTEX.telephone, lien: `tel:${SMARTEX.telephone.replace(/\s/g, '')}` },
    { icone: MapPin, libelle: 'Adresse', valeur: SMARTEX.adresse },
    { icone: Clock, libelle: 'Horaires', valeur: SMARTEX.horaires },
    { icone: ExternalLink, libelle: 'LinkedIn', valeur: SMARTEX.editeur, lien: SMARTEX.linkedin, externe: true },
  ];

  return (
    <div>
      <EnTeteVitrine
        etiquette="Contact"
        icone={MessageSquare}
        titre="Parlons de votre démarche RSE"
        description={`Une question sur ${SMARTEX.produit}, une demande de démonstration ou un projet d’accompagnement : l’équipe ${SMARTEX.editeur} vous répond.`}
        image={photoBanniere}
        reperes={[
          { valeur: '24 h', libelle: 'délai de réponse visé' },
          { valeur: 'Abidjan', libelle: 'Côte d’Ivoire' },
          { valeur: 'Gratuit', libelle: 'premier échange' },
        ]}
      />

      <section className="mx-auto grid max-w-[90rem] gap-10 px-5 py-24 lg:grid-cols-[1.05fr_0.95fr]">
        <Revele>
          <form onSubmit={soumettre} className="rounded-[2rem] border border-ink-100 bg-surface p-8 shadow-soft sm:p-10" noValidate>
            <p className="sur-titre text-brand-600 dark:text-brand-400">
              <span className="filet" aria-hidden />
              <Send className="h-4 w-4" aria-hidden />
              Formulaire de contact
            </p>
            <h2 className="titre-editorial mt-5 text-3xl text-ink-900">Écrivez-nous</h2>
            <p className="mt-3 text-sm font-light leading-relaxed text-ink-500">
              Les champs marqués d’un astérisque sont obligatoires. Votre message ouvre un brouillon dans votre
              messagerie, à destination de {SMARTEX.email}.
            </p>

            <div className="mt-8 grid gap-5 sm:grid-cols-2">
              <div>
                <label className="label" htmlFor="contact-nom">
                  Nom et prénom *
                </label>
                <input id="contact-nom" className="input" value={champs.nom} onChange={majChamp('nom')} autoComplete="name" />
              </div>
              <div>
                <label className="label" htmlFor="contact-email">
                  E-mail professionnel *
                </label>
                <input
                  id="contact-email"
                  type="email"
                  className="input"
                  value={champs.email}
                  onChange={majChamp('email')}
                  autoComplete="email"
                />
              </div>
              <div>
                <label className="label" htmlFor="contact-organisation">
                  Organisation
                </label>
                <input
                  id="contact-organisation"
                  className="input"
                  value={champs.organisation}
                  onChange={majChamp('organisation')}
                  autoComplete="organization"
                />
              </div>
              <div>
                <label className="label" htmlFor="contact-telephone">
                  Téléphone
                </label>
                <input
                  id="contact-telephone"
                  className="input"
                  value={champs.telephone}
                  onChange={majChamp('telephone')}
                  autoComplete="tel"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="label" htmlFor="contact-sujet">
                  Sujet
                </label>
                <select id="contact-sujet" className="input" value={champs.sujet} onChange={majChamp('sujet')}>
                  {SUJETS.map((sujet) => (
                    <option key={sujet} value={sujet}>
                      {sujet}
                    </option>
                  ))}
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className="label" htmlFor="contact-message">
                  Message *
                </label>
                <textarea
                  id="contact-message"
                  className="input min-h-[9rem] resize-y"
                  value={champs.message}
                  onChange={majChamp('message')}
                  placeholder="Décrivez votre contexte, votre secteur d’activité et vos échéances."
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
                  Votre brouillon d’e-mail a été préparé. S’il ne s’ouvre pas automatiquement, écrivez-nous directement à{' '}
                  <a className="font-medium underline" href={`mailto:${SMARTEX.email}`}>
                    {SMARTEX.email}
                  </a>
                  .
                </p>
              </div>
            ) : null}

            <button type="submit" className="btn-vitrine group mt-8 w-full sm:w-auto">
              Envoyer le message
              <Send className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" aria-hidden />
            </button>
          </form>
        </Revele>

        <Revele delai={120}>
          <div className="relative h-full overflow-hidden rounded-[2rem] bg-[#1f2533] p-8 text-white shadow-soft sm:p-10">
            <span
              className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-brand-500/30 blur-3xl motion-safe:animate-respiration"
              aria-hidden
            />
            <span
              className="pointer-events-none absolute -bottom-20 -left-16 h-64 w-64 rounded-full bg-emerald-400/15 blur-3xl motion-safe:animate-respiration [animation-delay:1.5s]"
              aria-hidden
            />
            <div className="relative">
              <p className="sur-titre text-white/60">
                <span className="filet" aria-hidden />
                Nous joindre
              </p>
              <h2 className="titre-editorial mt-5 text-3xl">{SMARTEX.editeur}</h2>
              <p className="mt-3 text-sm font-light leading-relaxed text-white/70">{SMARTEX.baseline}</p>

              <dl className="mt-10 divide-y divide-white/10 border-y border-white/10">
                {COORDONNEES.map((element) => (
                  <div key={element.libelle} className="flex items-start gap-4 py-5">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10 text-white/80">
                      <element.icone className="h-4 w-4" aria-hidden />
                    </span>
                    <div className="min-w-0">
                      <dt className="text-[0.7rem] font-semibold uppercase tracking-[0.22em] text-white/50">
                        {element.libelle}
                      </dt>
                      <dd className="mt-1.5 break-words text-sm font-medium">
                        {element.lien ? (
                          <a
                            href={element.lien}
                            className="transition-colors hover:text-brand-300"
                            {...(element.externe ? { target: '_blank', rel: 'noreferrer noopener' } : {})}
                          >
                            {element.valeur}
                          </a>
                        ) : (
                          element.valeur
                        )}
                      </dd>
                    </div>
                  </div>
                ))}
              </dl>
            </div>
          </div>
        </Revele>
      </section>
    </div>
  );
}

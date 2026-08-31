import { useState } from 'react';
import { CheckCircle2, Clock, ExternalLink, Mail, MapPin, MessageSquare, Phone, Send } from 'lucide-react';
import EnTeteVitrine from '../components/EnTeteVitrine';
import Revele from '../components/Revele';
import { Alerte, Badge } from '../components/ui';
import { SMARTEX } from '../config/smartex';

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
    { icone: Phone, libelle: 'Téléphone', valeur: SMARTEX.telephone, lien: `tel:${SMARTEX.telephone.replace(/\s/g, '')}` },
    { icone: MapPin, libelle: 'Adresse', valeur: SMARTEX.adresse },
    { icone: Clock, libelle: 'Horaires', valeur: SMARTEX.horaires },
    { icone: ExternalLink, libelle: 'LinkedIn', valeur: SMARTEX.editeur, lien: SMARTEX.linkedin, externe: true },
    { icone: Mail, libelle: 'Support client', valeur: SMARTEX.emailSupport, lien: `mailto:${SMARTEX.emailSupport}` },
  ];

  return (
    <div>
      <EnTeteVitrine
        etiquette="Contact"
        icone={MessageSquare}
        titre="Parlons de votre démarche RSE"
        description={`Une question sur ${SMARTEX.produit}, une demande de démonstration ou un projet d’accompagnement : l’équipe ${SMARTEX.editeur} vous répond.`}
      />

      <section className="mx-auto grid max-w-[90rem] gap-10 px-5 py-20 lg:grid-cols-[1.05fr_0.95fr]">
        <Revele>
          <form onSubmit={soumettre} className="carte-vitrine !p-7" noValidate>
            <Badge ton="vert" icone={Send}>
              Formulaire de contact
            </Badge>
            <h2 className="mt-4 text-2xl font-semibold text-ink-900">Écrivez-nous</h2>
            <p className="mt-2 text-sm text-ink-500">
              Les champs marqués d’un astérisque sont obligatoires. Votre message ouvre un brouillon dans votre
              messagerie, à destination de {SMARTEX.email}.
            </p>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
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
              <div className="mt-5 flex items-start gap-2 rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-700 ring-1 ring-emerald-200">
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

            <button type="submit" className="btn-vitrine group mt-6 w-full sm:w-auto">
              Envoyer le message
              <Send className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" aria-hidden />
            </button>
          </form>
        </Revele>

        <div className="space-y-4">
          {COORDONNEES.map((element, index) => (
            <Revele key={element.libelle} delai={index * 90}>
              <div className="group flex items-start gap-4 rounded-2xl border border-ink-100 bg-surface p-5 shadow-soft transition duration-300 hover:border-brand-200 motion-safe:hover:-translate-y-0.5">
                <span className="puce-icone">
                  <element.icone className="h-5 w-5" aria-hidden />
                </span>
                <div className="min-w-0">
                  <p className="text-xs font-medium uppercase tracking-wide text-ink-500">{element.libelle}</p>
                  {element.lien ? (
                    <a
                      href={element.lien}
                      className="mt-1 block break-words text-sm font-medium text-ink-900 transition-colors hover:text-brand-700"
                      {...(element.externe ? { target: '_blank', rel: 'noreferrer noopener' } : {})}
                    >
                      {element.valeur}
                    </a>
                  ) : (
                    <p className="mt-1 break-words text-sm font-medium text-ink-900">{element.valeur}</p>
                  )}
                </div>
              </div>
            </Revele>
          ))}
        </div>
      </section>
    </div>
  );
}

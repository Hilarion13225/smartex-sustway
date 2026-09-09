import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Leaf, Shield } from 'lucide-react';
import Logo from './Logo';
import { SMARTEX, RESEAUX_SOCIAUX } from '../config/smartex';

/**
 * Colonnes de liens du pied de page. Toutes les destinations sont des pages
 * réellement déclarées dans App.jsx : la route attrape-tout redirigeant vers
 * l'accueil, un libellé sans page renverrait le visiteur à la case départ sans
 * message d'erreur. Les intitulés « Confidentialité » et « Cookies » pointent
 * donc sur les sections correspondantes des mentions légales, seule page
 * juridique existante, plutôt que sur des pages dédiées qui n'existent pas.
 */
const COLONNES = [
  {
    titre: 'Navigation',
    liens: [
      { vers: '/services', libelle: 'Solution' },
      { vers: '/methodologie', libelle: 'Méthodologie' },
      { vers: '/formules', libelle: 'Formules' },
      { vers: '/contact', libelle: 'Contact' },
      { vers: '/formation', libelle: 'Se former' },
    ],
  },
  {
    titre: 'Ressources',
    liens: [
      { vers: '/faq', libelle: 'FAQ' },
      { vers: '/avantages', libelle: 'Bénéfices' },
      { vers: '/deploiement', libelle: 'Déploiement' },
      { vers: '/engagement', libelle: 'Engagement' },
      { vers: '/a-propos', libelle: 'À propos' },
    ],
  },
  {
    titre: 'Informations légales',
    liens: [
      { vers: '/mentions-legales', libelle: 'Mentions légales' },
      { vers: '/mentions-legales#donnees-personnelles', libelle: 'Confidentialité' },
      { vers: '/mentions-legales#cookies', libelle: 'Cookies' },
      { vers: '/mentions-legales#propriete-intellectuelle', libelle: 'Propriété intellectuelle' },
      { vers: '/mentions-legales#limites-interpretation', libelle: 'Limites d’usage' },
    ],
  },
];

/**
 * Tracés de marque des réseaux sociaux. lucide-react a retiré ses icônes de
 * marque de la bibliothèque, elles ne sont donc plus importables — les logos
 * officiels sont posés ici en tracé SVG.
 */
const TRACES_RESEAUX = {
  linkedin:
    'M20.45 20.45h-3.56v-5.57c0-1.33-.03-3.04-1.85-3.04-1.86 0-2.14 1.45-2.14 2.94v5.67H9.35V9h3.41v1.56h.05a3.74 3.74 0 0 1 3.37-1.85c3.6 0 4.27 2.37 4.27 5.46v6.28zM5.34 7.43a2.07 2.07 0 1 1 0-4.13 2.07 2.07 0 0 1 0 4.13zM7.12 20.45H3.55V9h3.57v11.45zM22.22 0H1.77C.8 0 0 .78 0 1.75v20.5C0 23.22.8 24 1.77 24h20.45c.98 0 1.78-.78 1.78-1.75V1.75C24 .78 23.2 0 22.22 0z',
  youtube:
    'M23.5 6.19a3.02 3.02 0 0 0-2.12-2.14C19.5 3.55 12 3.55 12 3.55s-7.5 0-9.38.5A3.02 3.02 0 0 0 .5 6.19C0 8.08 0 12 0 12s0 3.92.5 5.81a3.02 3.02 0 0 0 2.12 2.14c1.88.5 9.38.5 9.38.5s7.5 0 9.38-.5a3.02 3.02 0 0 0 2.12-2.14C24 15.92 24 12 24 12s0-3.92-.5-5.81zM9.55 15.57V8.43L15.82 12l-6.27 3.57z',
  x: 'M18.9 1.15h3.68l-8.04 9.19L24 22.85h-7.41l-5.8-7.58-6.64 7.58H.47l8.6-9.83L0 1.15h7.6l5.24 6.93 6.06-6.93zm-1.29 19.5h2.04L6.49 3.24H4.3l13.31 17.41z',
};

/** Motif de feuilles en filigrane, posé de part et d'autre du pied de page. */
function DecorFeuilles() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      <Leaf className="absolute -left-10 top-24 h-64 w-64 -rotate-12 text-white/[0.04]" strokeWidth={1} />
      <Leaf className="absolute left-24 bottom-4 h-40 w-40 rotate-[24deg] text-white/[0.03]" strokeWidth={1} />
      <Leaf className="absolute -right-12 top-40 h-72 w-72 rotate-[18deg] text-white/[0.04]" strokeWidth={1} />
      <Leaf className="absolute right-40 -bottom-8 h-48 w-48 -rotate-[8deg] text-white/[0.03]" strokeWidth={1} />
    </div>
  );
}

/** Intitulé de colonne, souligné du court filet rouge de la maquette. */
function TitreColonne({ children }) {
  return (
    <>
      <h2 className="font-display text-base font-bold text-white">{children}</h2>
      <span className="mt-2.5 block h-[3px] w-9 rounded-full bg-brand-500" aria-hidden />
    </>
  );
}

/**
 * Pied de page de la vitrine publique.
 *
 * Couleurs figées sur la palette `brand` plutôt que sur les variables
 * `--ink-*` : le pied de page reste dans le rouge profond de la marque quel
 * que soit le thème actif, là où les tokens `ink` l'auraient éclairci en mode
 * sombre.
 */
export default function PiedPublic() {
  const [courriel, definirCourriel] = useState('');

  /*
   * Aucun endpoint d'inscription à la newsletter n'existe côté API : le
   * formulaire ouvre le client de messagerie du visiteur, exactement comme le
   * formulaire de la page Contact. Une fausse confirmation « Merci, vous êtes
   * inscrit » sans destinataire réel serait un mensonge visible.
   */
  const surInscription = (evenement) => {
    evenement.preventDefault();
    const corps = `Merci de m’inscrire à la lettre d’information ${SMARTEX.produit}.\n\nAdresse e-mail : ${courriel}`;
    window.location.href = `mailto:${SMARTEX.email}?subject=${encodeURIComponent(
      'Inscription à la lettre d’information'
    )}&body=${encodeURIComponent(corps)}`;
  };

  return (
    <footer className="relative overflow-hidden bg-gradient-to-b from-brand-800 via-brand-800 to-brand-900 text-white">
      <DecorFeuilles />

      {/* ---------- Corps : marque, liens, lettre d'information ---------- */}
      <div className="relative mx-auto max-w-[90rem] px-6 py-[4.5rem] lg:px-[70px]">
        <div className="grid gap-12 sm:grid-cols-2 lg:grid-cols-[1.6fr_1fr_1.1fr_1.2fr_1.3fr] lg:gap-0 lg:divide-x lg:divide-white/10">
          {/* Identité de marque */}
          <div className="lg:pr-10">
            <div className="flex items-start gap-3.5">
              <span className="relative flex h-14 w-14 shrink-0 items-center justify-center" aria-hidden>
                <Shield className="h-14 w-14 text-white" strokeWidth={1.4} />
                <Leaf className="absolute h-6 w-6 -translate-y-0.5 text-white" strokeWidth={2} />
              </span>
              <span>
                <Logo taille="sm" variante="clair" />
                <span className="mt-1.5 block text-sm font-medium text-white/85">By SMARTEX Expertises</span>
              </span>
            </div>

            <p className="mt-6 max-w-sm text-sm leading-relaxed text-white/75">
              Une solution de {SMARTEX.editeur} pour accompagner les organisations vers une performance durable.
            </p>

            <ul className="mt-7 flex items-center gap-7">
              {RESEAUX_SOCIAUX.map((reseau) => (
                <li key={reseau.code}>
                  <a
                    href={reseau.url}
                    target="_blank"
                    rel="noreferrer noopener"
                    aria-label={`${SMARTEX.editeur} sur ${reseau.libelle}`}
                    className="block text-white/85 transition duration-300 hover:text-white motion-safe:hover:-translate-y-0.5"
                  >
                    <svg viewBox="0 0 24 24" className="h-6 w-6 fill-current" aria-hidden>
                      <path d={TRACES_RESEAUX[reseau.code]} />
                    </svg>
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Colonnes de liens */}
          {COLONNES.map((colonne) => (
            <div key={colonne.titre} className="lg:px-10">
              <TitreColonne>{colonne.titre}</TitreColonne>
              <ul className="mt-6 space-y-3.5 text-sm">
                {colonne.liens.map((lien) => (
                  <li key={lien.vers}>
                    <Link
                      to={lien.vers}
                      className="inline-block text-white/75 transition-all duration-300 hover:translate-x-1 hover:text-white"
                    >
                      {lien.libelle}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          {/* Lettre d'information */}
          <div className="sm:col-span-2 lg:col-span-1 lg:pl-10">
            <TitreColonne>Restez informé</TitreColonne>
            <p className="mt-6 max-w-xs text-sm leading-relaxed text-white/75">
              Recevez nos actualités, nos formations et nos ressources sur la RSE/ESG.
            </p>

            <form className="mt-5 flex max-w-sm items-stretch" onSubmit={surInscription}>
              <label className="sr-only" htmlFor="pied-newsletter">
                Votre adresse e-mail
              </label>
              <input
                id="pied-newsletter"
                type="email"
                required
                value={courriel}
                onChange={(evenement) => definirCourriel(evenement.target.value)}
                placeholder="Votre adresse e-mail"
                autoComplete="email"
                className="min-w-0 flex-1 rounded-l-md border border-r-0 border-white/25 bg-white/5 px-4 py-3 text-sm text-white outline-none transition placeholder:text-white/50 focus:border-white/60 focus:bg-white/10"
              />
              <button
                type="submit"
                aria-label="S’inscrire à la lettre d’information"
                className="flex shrink-0 items-center justify-center rounded-r-md bg-brand-500 px-5 text-white transition duration-300 hover:bg-brand-400"
              >
                <ArrowRight className="h-5 w-5" aria-hidden />
              </button>
            </form>
          </div>
        </div>

        {/* ---------- Barre inférieure ---------- */}
        <div className="mt-16 border-t border-white/15 pt-8">
          <div className="flex flex-col gap-5 text-sm text-white/70 lg:flex-row lg:items-center lg:justify-between lg:gap-10">
            <p>
              © {new Date().getFullYear()} {SMARTEX.produit} — Une solution de {SMARTEX.editeur}. Tous droits réservés.
            </p>

            <span className="hidden h-10 w-px bg-white/15 lg:block" aria-hidden />

            <div className="lg:text-right">
              <p>Des organisations plus responsables pour un monde plus prospère.</p>
              <svg viewBox="0 0 120 10" className="mt-1 h-2.5 w-32 text-brand-500 lg:ml-auto" aria-hidden>
                <path
                  d="M2 8C22 3 78 1 118 4"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeLinecap="round"
                />
              </svg>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}

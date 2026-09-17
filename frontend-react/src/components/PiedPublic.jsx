import { useState } from 'react';
import { Link } from 'react-router-dom';
import Logo from './Logo';
import { SMARTEX, RESEAUX_SOCIAUX } from '../config/smartex';

/**
 * Colonnes de liens du pied de page. Toutes les destinations sont des pages
 * réellement déclarées dans App.jsx : la route attrape-tout redirigeant vers
 * l'accueil, un libellé sans page renverrait le visiteur à la case départ sans
 * message d'erreur. « Confidentialité » et « Cookies » pointent donc sur les
 * sections correspondantes des mentions légales.
 */
const COLONNES = [
  {
    titre: 'La solution',
    liens: [
      { vers: '/services', libelle: 'Solution' },
      { vers: '/methodologie', libelle: 'Méthodologie' },
      { vers: '/formules', libelle: 'Formules' },
      { vers: '/methodologie#questions', libelle: 'Questions fréquentes' },
    ],
  },
  {
    titre: 'SMARTEX Expertises',
    liens: [
      { vers: '/contact', libelle: 'Contact' },
      { vers: '/formation', libelle: 'Se former' },
      { href: SMARTEX.siteWeb, libelle: 'Site de SMARTEX Expertises' },
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
 * marque, les logos officiels sont donc posés ici en tracé SVG.
 */
const TRACES_RESEAUX = {
  linkedin:
    'M20.45 20.45h-3.56v-5.57c0-1.33-.03-3.04-1.85-3.04-1.86 0-2.14 1.45-2.14 2.94v5.67H9.35V9h3.41v1.56h.05a3.74 3.74 0 0 1 3.37-1.85c3.6 0 4.27 2.37 4.27 5.46v6.28zM5.34 7.43a2.07 2.07 0 1 1 0-4.13 2.07 2.07 0 0 1 0 4.13zM7.12 20.45H3.55V9h3.57v11.45zM22.22 0H1.77C.8 0 0 .78 0 1.75v20.5C0 23.22.8 24 1.77 24h20.45c.98 0 1.78-.78 1.78-1.75V1.75C24 .78 23.2 0 22.22 0z',
  youtube:
    'M23.5 6.19a3.02 3.02 0 0 0-2.12-2.14C19.5 3.55 12 3.55 12 3.55s-7.5 0-9.38.5A3.02 3.02 0 0 0 .5 6.19C0 8.08 0 12 0 12s0 3.92.5 5.81a3.02 3.02 0 0 0 2.12 2.14c1.88.5 9.38.5 9.38.5s7.5 0 9.38-.5a3.02 3.02 0 0 0 2.12-2.14C24 15.92 24 12 24 12s0-3.92-.5-5.81zM9.55 15.57V8.43L15.82 12l-6.27 3.57z',
  x: 'M18.9 1.15h3.68l-8.04 9.19L24 22.85h-7.41l-5.8-7.58-6.64 7.58H.47l8.6-9.83L0 1.15h7.6l5.24 6.93 6.06-6.93zm-1.29 19.5h2.04L6.49 3.24H4.3l13.31 17.41z',
};

/**
 * Pied de page de la vitrine.
 *
 * Plage encre plus profonde que le bandeau d'appel qui la précède : les deux
 * se lisent comme deux bandes distinctes, sans filet ni décor entre elles.
 * Couleurs écrites en dur, pour que le pied reste sombre quel que soit le
 * thème actif. Le motif de feuilles en filigrane, les filets rouges sous
 * chaque intitulé et le trait manuscrit sont retirés : ils décoraient sans
 * rien dire.
 */
export default function PiedPublic() {
  const [courriel, definirCourriel] = useState('');

  /*
   * Aucun endpoint d'inscription à la newsletter n'existe côté API : le
   * formulaire ouvre le client de messagerie du visiteur, comme le formulaire
   * de la page Contact. Une fausse confirmation sans destinataire réel serait
   * un mensonge visible.
   */
  const surInscription = (evenement) => {
    evenement.preventDefault();
    const corps = `Merci de m’inscrire à la lettre d’information ${SMARTEX.produit}.\n\nAdresse e-mail : ${courriel}`;
    window.location.href = `mailto:${SMARTEX.email}?subject=${encodeURIComponent(
      'Inscription à la lettre d’information'
    )}&body=${encodeURIComponent(corps)}`;
  };

  return (
    <footer className="bg-[#0B1633] text-white">
      <div className="mx-auto max-w-[90rem] px-5 pb-10 pt-16">
        <div className="grid gap-12 lg:grid-cols-[1.4fr_1fr_1fr_1fr] lg:gap-10">
          {/* Marque et lettre d'information */}
          <div className="max-w-sm">
            <Link to="/" className="inline-block" aria-label="SMARTEX SustWay, page d’entrée">
              <Logo taille="sm" variante="clair" />
            </Link>
            <p className="mt-4 text-base leading-relaxed text-white/70">
              Une solution de {SMARTEX.editeur} pour évaluer, prioriser et améliorer la performance RSE et ESG
              des organisations.
            </p>

            <form className="mt-8" onSubmit={surInscription}>
              <label className="text-sm font-semibold text-white" htmlFor="pied-newsletter">
                Recevoir nos actualités
              </label>
              {/* 16 px et 48 px de haut : sous 16 px, iOS zoome de lui-même à la
                  mise au point. */}
              <div className="mt-3 flex flex-col gap-2 min-[420px]:flex-row">
                <input
                  id="pied-newsletter"
                  type="email"
                  required
                  value={courriel}
                  onChange={(evenement) => definirCourriel(evenement.target.value)}
                  placeholder="nom@organisation.com"
                  autoComplete="email"
                  className="min-h-12 min-w-0 flex-1 rounded-[4px] border border-white/25 bg-white/5 px-4 text-base text-white outline-none transition placeholder:text-white/40 focus:border-white/70"
                />
                <button
                  type="submit"
                  className="min-h-12 shrink-0 rounded-[4px] bg-white px-5 text-base font-semibold text-[#0B1633] transition-colors hover:bg-[#E8EAF2]"
                >
                  S’inscrire
                </button>
              </div>
            </form>
          </div>

          {/* Colonnes de liens */}
          <div className="grid grid-cols-2 gap-x-6 gap-y-10 sm:grid-cols-3 lg:col-span-3">
            {COLONNES.map((colonne) => (
              <div key={colonne.titre}>
                <h2 className="text-sm font-semibold text-white/55">{colonne.titre}</h2>
                <ul className="mt-3">
                  {colonne.liens.map((lien) => (
                    <li key={lien.vers ?? lien.href}>
                      {/* 44 px de haut sur téléphone : une liste de liens serrés
                          est la zone où le doigt se trompe le plus. */}
                      {lien.href ? (
                        <a
                          href={lien.href}
                          target="_blank"
                          rel="noreferrer noopener"
                          className="flex min-h-11 items-center text-[15px] text-white/85 transition-colors hover:text-white sm:min-h-9"
                        >
                          {lien.libelle}
                          <span className="sr-only"> (nouvel onglet)</span>
                        </a>
                      ) : (
                        <Link
                          to={lien.vers}
                          className="flex min-h-11 items-center text-[15px] text-white/85 transition-colors hover:text-white sm:min-h-9"
                        >
                          {lien.libelle}
                        </Link>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {/* Barre inférieure */}
        <div className="mt-14 flex flex-col gap-4 border-t border-white/10 pt-6 text-sm text-white/55 sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {new Date().getFullYear()} {SMARTEX.produit}, une solution de {SMARTEX.editeur}.
          </p>
          <ul className="flex items-center gap-2">
            {RESEAUX_SOCIAUX.map((reseau) => (
              <li key={reseau.code}>
                <a
                  href={reseau.url}
                  target="_blank"
                  rel="noreferrer noopener"
                  aria-label={`${SMARTEX.editeur} sur ${reseau.libelle}`}
                  className="flex h-11 w-11 items-center justify-center rounded-[4px] text-white/70 transition-colors hover:bg-white/10 hover:text-white"
                >
                  <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current" aria-hidden>
                    <path d={TRACES_RESEAUX[reseau.code]} />
                  </svg>
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </footer>
  );
}

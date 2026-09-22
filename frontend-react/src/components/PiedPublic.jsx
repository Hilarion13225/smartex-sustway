import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import Logo from './Logo';
import { SMARTEX, RESEAUX_SOCIAUX } from '../config/smartex';

/**
 * Colonnes de liens du pied de page — cinq, calquées sur la barre de
 * navigation.
 *
 * Le pied reprend maintenant le même découpage que le menu, sous-entrées
 * comprises : un visiteur arrivé en bas de page doit y retrouver le plan qu'il
 * a vu en haut, et non un second classement qui l'obligerait à réapprendre où
 * sont les choses. Les ancres sont celles des sections, pas de nouvelles
 * pages.
 *
 * Toutes les destinations sont des pages réellement déclarées dans App.jsx :
 * la route attrape-tout redirigeant vers l'accueil, un libellé sans page
 * renverrait le visiteur à la case départ sans message d'erreur.
 *
 * « Formations » reste sous Ressources bien que le menu ne la porte pas : la
 * page existe, et le pied de page est le seul endroit commun à tout le site
 * d'où elle soit atteignable autrement que depuis la page Contact.
 */
const COLONNES = [
  {
    titre: 'Solution',
    liens: [
      { vers: '/solution#presentation', libelle: 'Présentation' },
      { vers: '/solution#methodologie', libelle: 'Méthodologie' },
      { vers: '/solution#referentiels', libelle: 'Référentiels' },
      { vers: '/solution#livrables', libelle: 'Livrables' },
    ],
  },
  {
    titre: 'Fonctionnalités',
    liens: [
      { vers: '/fonctionnalites#collecte-des-donnees', libelle: 'Collecte des données' },
      { vers: '/fonctionnalites#documenter', libelle: 'Documenter' },
      { vers: '/fonctionnalites#analyse-resultats', libelle: 'Analyse & Résultats' },
      { vers: '/fonctionnalites#remedier-piloter', libelle: 'Remédier & Piloter' },
    ],
  },
  {
    titre: 'Offres',
    liens: [
      { vers: '/offres', libelle: 'Les trois offres' },
    ],
  },
  {
    titre: 'Ressources',
    liens: [
      { vers: '/ressources#articles', libelle: 'Articles' },
      { vers: '/ressources#guides', libelle: 'Guides & bonnes pratiques' },
      { vers: '/ressources#documentation', libelle: 'Documentation' },
      { vers: '/ressources#faq', libelle: 'FAQ' },
      { vers: '/formation', libelle: 'Formations' },
    ],
  },
  {
    titre: 'Contact',
    liens: [
      { vers: '/contact', libelle: 'Demander une démo' },
      { vers: '/inscription', libelle: 'S’inscrire' },
      { vers: '/connexion', libelle: 'Se connecter' },
      { href: SMARTEX.siteWeb, libelle: 'Site de SMARTEX Expertises' },
    ],
  },
];

/**
 * Mentions obligatoires, reprises dans la barre inférieure.
 *
 * La colonne « Légal » a été retirée du pied de page, mais ces deux liens n'en
 * disparaissent pas pour autant : un site doit rendre ses mentions légales et
 * sa politique de confidentialité atteignables depuis chaque page, et le pied
 * en est le seul endroit commun. Posés sur la ligne du copyright, ils ne
 * pèsent plus sur la grille. Cookies et propriété intellectuelle sont deux
 * sections de la page des mentions légales, qui les porte déjà.
 */
const MENTIONS = [
  { vers: '/mentions-legales', libelle: 'Mentions légales' },
  { vers: '/mentions-legales#donnees-personnelles', libelle: 'Politique de confidentialité' },
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
  const pied = useRef(null);

  /*
   * Le pied publie sa propre hauteur dans `--hauteur-pied`.
   *
   * La page d'accueil s'en sert pour étirer sa dernière section jusqu'à ce que
   * cette section et le pied remplissent exactement une fenêtre : sans cette
   * mesure, il faudrait figer la hauteur du pied dans une constante, et toute
   * colonne ajoutée ou tout intitulé passant sur deux lignes la démentirait
   * sans que rien ne le signale.
   *
   * `ResizeObserver` et non une mesure au montage : la hauteur change quand la
   * fenêtre est redimensionnée — deux colonnes sur téléphone, cinq au-delà de
   * 1024 px — et une valeur prise une fois vaudrait pour la seule largeur de
   * départ.
   */
  useEffect(() => {
    const element = pied.current;
    if (!element || typeof ResizeObserver === 'undefined') return undefined;

    const observateur = new ResizeObserver(([entree]) => {
      const hauteur = Math.round(entree.contentRect.height);
      document.documentElement.style.setProperty('--hauteur-pied', `${hauteur}px`);
    });
    observateur.observe(element);

    return () => {
      observateur.disconnect();
      document.documentElement.style.removeProperty('--hauteur-pied');
    };
  }, []);

  return (
    // #102F26 : le vert le plus profond de la charte, un cran sous le Forest
    // de l'appel à l'action qui précède. Les deux plages se distinguent sans
    // filet entre elles. Couleur écrite en dur plutôt qu'en token : le pied
    // reste sombre quel que soit le thème actif.
    <footer ref={pied} className="bg-[#102F26] text-white">
      <div className="mx-auto max-w-[90rem] px-5 pb-8 pt-12 lg:pb-5 lg:pt-6">
        {/*
         * La marque tient la colonne de gauche, les cinq colonnes de liens la
         * droite.
         *
         * Elle était passée au-dessus, sur toute la largeur, pour desserrer
         * les cinq colonnes ; cela coûtait cent soixante-dix pixels de hauteur,
         * qui manquaient à l'accueil pour que sa dernière section et le pied
         * tiennent dans une même fenêtre. Les colonnes disposent ainsi d'un peu
         * plus de deux cents pixels chacune, et seuls deux intitulés passent
         * sur deux lignes.
         */}
        <div className="grid gap-12 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,3.1fr)] lg:gap-12">
          {/* Marque */}
          <div className="max-w-sm">
            <Link to="/" className="inline-block" aria-label="SMARTEX SustWay, page d’entrée">
              <Logo taille="sm" variante="clair" />
            </Link>
            {/* Signature de la charte. Les quatre verbes disent la démarche dans
                son ordre, et reprennent celui des sections de la page. Posés en
                petites capitales très espacées, ils se lisent comme une devise
                plutôt que comme une phrase — c'est l'espacement qui fait la
                différence, pas la taille. */}
            <p className="mt-4 text-[11px] font-bold uppercase tracking-[0.18em] text-growth lg:mt-3">
              Structurer <span aria-hidden className="text-growth/50">•</span> Piloter{' '}
              <span aria-hidden className="text-growth/50">•</span> Optimiser{' '}
              <span aria-hidden className="text-growth/50">•</span> Mesurer
            </p>
            <p className="mt-3 text-[15px] leading-snug text-white/70 lg:mt-2">
              Une solution de {SMARTEX.editeur} pour structurer, piloter, optimiser et mesurer la performance RSE, ESG
              et développement durable des organisations.
            </p>
          </div>

          {/* Deux colonnes sur téléphone, trois à partir de 640 px, les cinq à
              partir de 1024 px. */}
          <div className="grid grid-cols-2 gap-x-6 gap-y-10 sm:grid-cols-3 lg:grid-cols-5 lg:gap-x-5">
            {COLONNES.map((colonne) => (
              <div key={colonne.titre}>
                <h2 className="text-[12px] font-bold uppercase tracking-[0.14em] text-white">{colonne.titre}</h2>
                <ul className="mt-4 lg:mt-3">
                  {colonne.liens.map((lien) => (
                    <li key={lien.vers ?? lien.href}>
                      {/* 44 px de haut sur téléphone : une liste de liens serrés
                          est la zone où le doigt se trompe le plus. */}
                      {lien.href ? (
                        <a
                          href={lien.href}
                          target="_blank"
                          rel="noreferrer noopener"
                          className="flex min-h-11 items-center text-[15px] text-white/85 transition-colors hover:text-white sm:min-h-8 lg:min-h-7"
                        >
                          {lien.libelle}
                          <span className="sr-only"> (nouvel onglet)</span>
                        </a>
                      ) : (
                        <Link
                          to={lien.vers}
                          className="flex min-h-11 items-center text-[15px] text-white/85 transition-colors hover:text-white sm:min-h-8 lg:min-h-7"
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
        <div className="mt-10 flex flex-col gap-5 border-t border-white/10 pt-5 lg:mt-5 lg:pt-4 text-sm text-white/55 lg:flex-row lg:items-center lg:justify-between">
          <p className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <span>
              © {new Date().getFullYear()} {SMARTEX.editeur} — Tous droits réservés.
            </span>
            {MENTIONS.map((mention) => (
              <Link
                key={mention.vers}
                to={mention.vers}
                className="underline-offset-4 transition-colors hover:text-white hover:underline"
              >
                {mention.libelle}
              </Link>
            ))}
          </p>

          {/* La chaîne de valeur qui tenait ici — données, mesure, objectifs,
              actions, progrès, impact — est retirée : l'appel à l'action qui
              précède immédiatement le pied de page la porte désormais en
              grand, et la lire deux fois à trois centimètres d'intervalle ne
              l'imprimait pas davantage. */}
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

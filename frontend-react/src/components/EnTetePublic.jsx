import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';

/*
 * Largeur a partir de laquelle la barre complete tient sans deborder.
 *
 * Mesure sur la barre reelle : logo 225 px + navigation 637 px + actions
 * 346 px, soit 1208 px, plus les marges internes. Le seuil valait 1200 px,
 * herite de quatre entrees ; la navigation du document en compte six, et
 * l'en-tete debordait entre 1200 et 1280 px. Relever le seuil plutot que
 * raccourcir les libelles, qui viennent du document.
 */
import { Play, Search } from 'lucide-react';
import clsx from 'clsx';
import Logo from './Logo';
import RechercheVitrine from './RechercheVitrine';
import ModaleVideo from './ModaleVideo';
import IconeMenu from './vitrine/IconeMenu';
import { SMARTEX } from '../config/smartex';

const SELECTEUR_FOCALISABLE = 'a[href], button:not([disabled]), input:not([disabled]), select, textarea';

/*
 * Navigation principale : les pages de l'offre, plus Se former, que SMARTEX
 * Expertises veut rendre visible dès l'en-tête. La FAQ reste atteignable par
 * le pied de page et par la recherche : elle répond à des questions plus
 * tardives.
 */
const LIENS = [
  // Les six entrées du document SMARTEX, dans son ordre. « Accueil » mène à la
  // page qui présente la plateforme et la solution — c'est ce que le document
  // attend de cette entrée, et `/accueil` y redirigeait déjà. La page d'entrée
  // du site reste atteinte par le logo.
  { vers: '/services', libelle: 'Accueil' },
  { vers: '/methodologie', libelle: 'Méthodologie' },
  { vers: '/deploiement', libelle: 'Déploiement' },
  { vers: '/formules', libelle: 'Lancer une évaluation' },
  { vers: '/ressources', libelle: 'Ressources' },
  { vers: '/contact', libelle: 'Contact' },
];

/* L'action principale de la vitrine : elle mène à la grille des formules. */
const ACTION = { vers: '/formules#grille-formules', libelle: 'Choisir une formule' };

/*
 * Lien de bureau. La page active est marquée par un trait bordeaux posé sur la
 * bordure basse de l'en-tête — comme l'onglet ouvert d'un registre — plutôt
 * que par un soulignement flottant sous le mot.
 */
function classeLien({ isActive }) {
  return clsx(
    'relative flex h-16 items-center px-2 text-[15px] font-medium transition-colors',
    'after:absolute after:inset-x-2 after:-bottom-px after:h-0.5 after:bg-brand-600',
    isActive ? 'text-ink-900 after:opacity-100' : 'text-ink-600 after:opacity-0 hover:text-ink-900'
  );
}

/** En-tête de la partie publique : marque, navigation, recherche, thème et accès au compte. */
export default function EnTetePublic() {
  const [ouvert, setOuvert] = useState(false);
  const [videoOuverte, definirVideoOuverte] = useState(false);
  const [rechercheOuverte, definirRechercheOuverte] = useState(false);
  const fermer = () => setOuvert(false);
  const { pathname } = useLocation();
  const boutonMenu = useRef(null);
  const panneauMenu = useRef(null);

  // Un changement de page ferme le menu, y compris par le bouton Précédent du
  // navigateur, qui ne passe par aucun lien du menu.
  useEffect(() => {
    setOuvert(false);
  }, [pathname]);

  /*
   * Menu mobile ouvert. Repris du composant « Header 3 » de 21st.dev pour le
   * panneau plein écran et le blocage du défilement ; complété de ce qu'il
   * n'avait pas : fermeture par Échap, focus gardé dans le menu, et focus
   * rendu au bouton à la fermeture — sans quoi un utilisateur au clavier
   * tabulait dans la page cachée derrière le panneau.
   */
  useEffect(() => {
    if (!ouvert) return undefined;

    const bouton = boutonMenu.current;
    const debordementInitial = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    panneauMenu.current?.querySelector(SELECTEUR_FOCALISABLE)?.focus();

    const auClavier = (evenement) => {
      if (evenement.key === 'Escape') {
        setOuvert(false);
        return;
      }
      if (evenement.key !== 'Tab') return;
      // Boucle de tabulation : le bouton de menu, puis les éléments du panneau.
      const cibles = [bouton, ...(panneauMenu.current?.querySelectorAll(SELECTEUR_FOCALISABLE) ?? [])].filter(Boolean);
      const premier = cibles[0];
      const dernier = cibles[cibles.length - 1];
      if (evenement.shiftKey && document.activeElement === premier) {
        evenement.preventDefault();
        dernier.focus();
      } else if (!evenement.shiftKey && document.activeElement === dernier) {
        evenement.preventDefault();
        premier.focus();
      }
    };

    // Passage en largeur bureau (rotation d'une tablette) : le menu n'a plus
    // lieu d'être et bloquerait le défilement d'une page qui ne le montre pas.
    const largeurBureau = window.matchMedia('(min-width: 1200px)');
    const surLargeur = (requete) => {
      if (requete.matches) setOuvert(false);
    };

    document.addEventListener('keydown', auClavier);
    largeurBureau.addEventListener('change', surLargeur);
    return () => {
      document.body.style.overflow = debordementInitial;
      document.removeEventListener('keydown', auClavier);
      largeurBureau.removeEventListener('change', surLargeur);
      // Le focus revient au bouton, sauf si l'utilisateur est déjà ailleurs
      // (un lien suivi l'a emmené sur une autre page).
      if (!document.activeElement || document.activeElement === document.body || panneauMenu.current?.contains(document.activeElement)) {
        bouton?.focus();
      }
    };
  }, [ouvert]);

  return (
    // Fond plein, sans flou ni ombre : l'en-tête est une bande du registre,
    // pas une vitre posée au-dessus de la page.
    <header className="sticky top-0 z-40 border-b border-ink-200 bg-ink-50">
      {/* Espacements serrés au plus juste : avec cinq liens, la barre complète
          tient dans les 1200 px de la vitrine avec une vingtaine de pixels de
          marge. Ajouter un lien demande de revérifier à 1200 px. */}
      <div className="mx-auto flex h-16 max-w-[90rem] items-center gap-4 px-5">
        <Link to="/" onClick={fermer} className="shrink-0" aria-label="SMARTEX SustWay, page d’entrée">
          <Logo taille="sm" />
          <p className="mt-0.5 hidden whitespace-nowrap text-xs text-ink-500 md:block">By SMARTEX Expertises</p>
        </Link>

        <nav className="hidden items-center whitespace-nowrap min-[1320px]:flex" aria-label="Navigation principale">
          {LIENS.map((lien) => (
            <NavLink key={lien.vers} to={lien.vers} className={classeLien}>
              {lien.libelle}
            </NavLink>
          ))}
        </nav>

        <div className="ml-auto hidden items-center gap-1.5 whitespace-nowrap min-[1320px]:flex">
          <button
            type="button"
            onClick={() => definirRechercheOuverte(true)}
            aria-label="Rechercher dans le site"
            className="flex h-10 w-10 items-center justify-center rounded-[4px] text-ink-600 transition-colors hover:bg-ink-100 hover:text-ink-900"
          >
            <Search className="h-[18px] w-[18px]" aria-hidden />
          </button>

          <Link
            to="/connexion"
            className="flex h-10 items-center px-3 text-[15px] font-medium text-ink-900 transition-colors hover:text-brand-600"
          >
            Se connecter
          </Link>
          <Link
            to={ACTION.vers}
            className="flex h-10 items-center rounded-[4px] bg-brand-600 px-4 text-[15px] font-semibold text-white transition-colors hover:bg-brand-700"
          >
            {ACTION.libelle}
          </Link>
        </div>

        {/* Sous 1200 px : le logo, l'accès au compte dès que la place le
            permet, et un bouton de menu de 48 px — la taille d'un doigt, et
            non les 36 px de la version précédente. */}
        <div className="ml-auto flex items-center gap-2 min-[1320px]:hidden">
          <Link
            to={ACTION.vers}
            onClick={fermer}
            className="hidden h-11 items-center rounded-[4px] bg-brand-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-brand-700 min-[460px]:flex"
          >
            {ACTION.libelle}
          </Link>
          <button
            ref={boutonMenu}
            type="button"
            className="-mr-2 flex h-12 w-12 items-center justify-center rounded-[4px] text-ink-900 transition-colors hover:bg-ink-100"
            onClick={() => setOuvert((valeur) => !valeur)}
            aria-label={ouvert ? 'Fermer le menu' : 'Ouvrir le menu'}
            aria-expanded={ouvert}
            aria-controls="menu-mobile"
          >
            <IconeMenu ouvert={ouvert} className="h-6 w-6" />
          </button>
        </div>
      </div>

      {/* Panneau plein écran sous l'en-tête. Rendu dans l'en-tête et non dans
          un portail : il reste ainsi sous l'enveloppe `.vitrine`, dont il
          reprend la palette et les règles de focus. `fixed` se cale sur la
          fenêtre, l'en-tête collant n'ayant aucune transformation. */}
      {ouvert ? (
        <div
          id="menu-mobile"
          ref={panneauMenu}
          className="fixed inset-x-0 bottom-0 top-16 z-40 overflow-y-auto overscroll-contain border-t border-ink-200 bg-ink-50 motion-safe:animate-[fondu-entree_180ms_cubic-bezier(0.2,0.7,0.2,1)_both] min-[1320px]:hidden"
        >
        <nav className="mx-auto flex max-w-[90rem] flex-col px-5 pb-10 pt-2" aria-label="Navigation principale">
          {/* Le panneau mobile occupe tout l'ecran : un second niveau repliable
              y ajouterait un geste sans rien reveler de plus. Le groupe est donc
              annonce par son intitule, ses pages listees en dessous. */}
          {LIENS.map((lien) => (
              <NavLink
              key={lien.vers}
              to={lien.vers}
              onClick={fermer}
              className={({ isActive }) =>
                clsx(
                  'flex min-h-12 items-center border-b border-ink-200 text-lg font-medium transition-colors',
                  isActive ? 'text-brand-600 dark:text-brand-400' : 'text-ink-900'
                )
              }
            >
              {lien.libelle}
            </NavLink>
          ))}

          <button
            type="button"
            onClick={() => {
              fermer();
              definirRechercheOuverte(true);
            }}
            className="flex min-h-12 items-center gap-3 border-b border-ink-200 text-left text-lg font-medium text-ink-900"
          >
            <Search className="h-5 w-5 text-ink-500" aria-hidden />
            Rechercher
          </button>
          <button
            type="button"
            onClick={() => {
              fermer();
              definirVideoOuverte(true);
            }}
            className="flex min-h-12 items-center gap-3 border-b border-ink-200 text-left text-lg font-medium text-ink-900"
          >
            <Play className="h-5 w-5 text-ink-500" aria-hidden />
            Voir la démonstration
          </button>

          <div className="mt-6 grid gap-3 min-[420px]:grid-cols-2">
            <Link
              to="/connexion"
              onClick={fermer}
              className="flex min-h-12 items-center justify-center rounded-[4px] border border-ink-300 text-base font-semibold text-ink-900"
            >
              Se connecter
            </Link>
            <Link
              to={ACTION.vers}
              onClick={fermer}
              className="flex min-h-12 items-center justify-center rounded-[4px] bg-brand-600 text-base font-semibold text-white"
            >
              {ACTION.libelle}
            </Link>
          </div>

        </nav>
        </div>
      ) : null}

      {rechercheOuverte ? <RechercheVitrine surFermeture={() => definirRechercheOuverte(false)} /> : null}

      {videoOuverte ? (
        <ModaleVideo
          source="/videos/methodologie-overview.mp4"
          titre="Démonstration SMARTEX SustWay"
          surFermeture={() => definirVideoOuverte(false)}
        />
      ) : null}
    </header>
  );
}

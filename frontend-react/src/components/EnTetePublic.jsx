import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';

/*
 * Largeur à partir de laquelle la barre complète tient sans déborder.
 *
 * Mesuré au navigateur sur la barre réelle : logo 222 px, les cinq liens
 * 451 px (Accueil 74, Solution 79, Fonctionnalités 129, Offres 65,
 * Ressources 104) et les actions 355 px, plus 40 px de marges internes,
 * 32 px d'écarts entre les trois groupes et 24 px de respiration autour de
 * la navigation — soit 1124 px, et 1164 px de fenêtre une fois retirées les
 * marges de l'en-tête. Le seuil est donc posé à 1200 px, qui laisse une
 * soixantaine de pixels.
 *
 * Il valait 1320 px, calibré pour les six entrées de la navigation
 * précédente, dont « Lancer une évaluation ». Les cinq entrées de la charte
 * SMARTEX SustWay sont plus courtes de près de 200 px : le seuil hérité
 * faisait basculer la barre en menu déroulant sur un portable de 1280 px
 * alors qu'elle y tenait largement.
 *
 * Changer un libellé ou ajouter une entrée demande de refaire cette mesure.
 */
import { Play, Search } from 'lucide-react';
import clsx from 'clsx';
import Logo from './Logo';
import RechercheVitrine from './RechercheVitrine';
import ModaleVideo from './ModaleVideo';
import IconeMenu from './vitrine/IconeMenu';

const SELECTEUR_FOCALISABLE = 'a[href], button:not([disabled]), input:not([disabled]), select, textarea';

/*
 * Navigation principale — les cinq entrées de la charte SMARTEX SustWay.
 *
 * Ce sont cinq pages, une par entrée. Elles l'ont d'abord été en ancres d'une
 * page unique ; les séparer donne à chacune son adresse partageable, son titre
 * d'onglet et sa description — ce qu'une ancre ne peut pas avoir.
 *
 * Les autres pages publiques — Méthodologie, Déploiement, Formules, Contact —
 * restent atteignables par le pied de page, par la recherche et par les
 * renvois des cinq pages. Les faire remonter ici porterait la barre à neuf
 * entrées, et diluerait les cinq que la charte veut voir.
 */
const LIENS = [
  { vers: '/', libelle: 'Accueil' },
  { vers: '/solution', libelle: 'Solution' },
  { vers: '/fonctionnalites', libelle: 'Fonctionnalités' },
  { vers: '/offres', libelle: 'Offres' },
  { vers: '/ressources', libelle: 'Ressources' },
];

/* L'action principale du site. La charte n'en retient qu'une, « Demander une
   démo », et elle mène au formulaire de contact — le seul endroit d'où une
   demande part réellement. Le parcours d'inscription reste accessible depuis
   les offres et le pied de page : il répond à une intention plus tardive. */
const ACTION = { vers: '/contact', libelle: 'Demander une démo' };

/*
 * Lien de bureau. La page courante reçoit une pastille vert très clair posée
 * derrière le mot : sur une barre arrondie et détachée, un trait collé à la
 * bordure basse n'aurait plus de bordure où se poser.
 */
function classeLien({ isActive }) {
  return clsx(
    'flex min-h-10 items-center rounded-[8px] px-2.5 text-[15px] font-medium transition-colors',
    isActive ? 'bg-brand-50 text-brand-700' : 'text-ink-600 hover:bg-ink-100 hover:text-ink-900'
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

    /*
     * Passage en largeur bureau (rotation d'une tablette) : le menu n'a plus
     * lieu d'être et bloquerait le défilement d'une page qui ne le montre pas.
     *
     * Cette valeur doit rester celle des classes `min-[1200px]:` du rendu.
     * Elles avaient divergé — 1200 ici, 1320 en CSS : entre les deux, le
     * bouton de menu était affiché mais le panneau se refermait de lui-même
     * au moindre redimensionnement, et le défilement de la page restait
     * bloqué par le nettoyage qui ne s'exécutait pas dans l'ordre attendu.
     */
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
    // Barre posée sur la page plutôt que collée à son bord : une carte
    // translucide aux angles arrondis, détachée des bords par une marge.
    //
    // Le fond n'est plus plein : ce qui défile dessous transparaît, flouté.
    // L'opacité reste haute — 80 % — parce qu'en dessous se succèdent un héros
    // sombre, des plages papier et des photographies : trop transparente, la
    // barre verrait la lisibilité de ses liens dépendre de l'endroit où l'on
    // se trouve dans la page.
    //
    // L'en-tête lui-même n'a pas de fond. C'est ce qui fait que la marge prend
    // la couleur de la page quelle qu'elle soit : papier sur la vitrine, décor
    // sombre sur la page d'entrée. Un fond clair posé là dessinait un cadre
    // pâle autour de la carte, visible dès que la page en dessous était
    // sombre. La carte, elle, reste pleine et opaque : les liens ne sont
    // jamais brouillés par ce qui défile derrière.
    <header className="sticky top-0 z-40 px-3 pb-2 pt-2.5 sm:px-5">
      {/* Espacements serrés au plus juste : voir la mesure en tête de fichier
          pour la largeur dont la barre complète a besoin. */}
      <div
        className={clsx(
          'mx-auto flex h-16 max-w-[90rem] items-center gap-4 bg-surface/80 px-5 backdrop-blur-xl shadow-[0_1px_2px_rgb(var(--marine)/0.05),0_10px_24px_-14px_rgb(var(--marine)/0.22)]',
          ouvert ? 'rounded-t-[14px]' : 'rounded-[14px]'
        )}
      >
        <Link to="/" onClick={fermer} className="shrink-0" aria-label="SMARTEX SustWay, page d’accueil">
          <Logo taille="sm" />
          <p className="mt-0.5 hidden whitespace-nowrap text-xs text-ink-500 md:block">By SMARTEX Expertises</p>
        </Link>

        <nav
          className="hidden flex-1 items-center justify-center whitespace-nowrap min-[1200px]:flex"
          aria-label="Navigation principale"
        >
          {LIENS.map((lien) => (
            // `end` sur l'accueil seul : sans lui, « / » étant le préfixe de
            // toutes les routes, l'entrée resterait marquée sur les cinq pages.
            <NavLink key={lien.vers} to={lien.vers} end={lien.vers === '/'} className={classeLien}>
              {lien.libelle}
            </NavLink>
          ))}
        </nav>

        <div className="hidden items-center gap-1.5 whitespace-nowrap min-[1200px]:flex">
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

        {/* Sous 1200 px : le logo, l'appel à l'action dès que la place le
            permet, et un bouton de menu de 48 px — la taille d'un doigt, et
            non les 36 px de la version précédente. */}
        <div className="ml-auto flex items-center gap-2 min-[1200px]:hidden">
          <Link
            to={ACTION.vers}
            onClick={fermer}
            /* Visible dès 375 px, la largeur d'un iPhone SE ou mini. Mesuré au
               navigateur : à 375 px le contenu de la barre occupe 299 px pour
               351 disponibles, à 360 px il déborde. Le seuil valait 460 px, ce
               qui privait du seul appel à l'action tous les téléphones
               courants — la charte le veut atteignable en permanence. */
            className="hidden h-11 items-center rounded-[4px] bg-brand-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-brand-700 min-[375px]:flex"
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

      {/* Le panneau prolonge la carte de l'en-tête : mêmes marges latérales,
          même blanc, mêmes angles en bas, et la carte renonce aux siens en haut
          du panneau — les deux ne font qu'une pièce. Rendu dans l'en-tête et non
          dans un portail : il reste ainsi sous l'enveloppe `.vitrine`, dont il
          reprend la palette et les règles de focus. `fixed` se cale sur la
          fenêtre, l'en-tête collant n'ayant aucune transformation. */}
      {ouvert ? (
        <div
          id="menu-mobile"
          ref={panneauMenu}
          className={clsx(
            'fixed inset-x-3 top-[74px] z-40 overflow-y-auto overscroll-contain sm:inset-x-5',
            // Il descend jusqu'au contenu, pas jusqu'au bas de la fenêtre : six
            // liens ne remplissent pas un écran, et un grand rectangle blanc à
            // moitié vide n'apprend rien. Au-delà, il défile.
            'max-h-[calc(100svh-5.5rem)] rounded-b-[14px] border-t border-ink-200 bg-surface/90 backdrop-blur-xl',
            'shadow-[0_1px_2px_rgb(var(--marine)/0.05),0_10px_24px_-14px_rgb(var(--marine)/0.22)]',
            'motion-safe:animate-[fondu-entree_180ms_cubic-bezier(0.2,0.7,0.2,1)_both] min-[1200px]:hidden'
          )}
        >
        <nav className="flex flex-col px-5 pb-6 pt-1" aria-label="Navigation principale">
          {/* Le panneau mobile occupe tout l'ecran : un second niveau repliable
              y ajouterait un geste sans rien reveler de plus. Le groupe est donc
              annonce par son intitule, ses pages listees en dessous. */}
          {LIENS.map((lien) => (
            <NavLink
              key={lien.vers}
              to={lien.vers}
              end={lien.vers === '/'}
              onClick={fermer}
              className={({ isActive }) =>
                clsx(
                  'flex min-h-12 items-center border-b border-ink-200 text-lg font-medium transition-colors',
                  isActive ? 'text-brand-700' : 'text-ink-900'
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

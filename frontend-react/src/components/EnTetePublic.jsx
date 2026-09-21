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
import logoEditeurBlanc from '../assets/smartex-expertises-blanc.png';
import logoEditeurCouleur from '../assets/smartex-expertises.png';
import { SMARTEX } from '../config/smartex';
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
  // `/accueil` et non `/` : la racine porte la page d'entrée, atteinte par le
  // logo. L'entrée « Accueil » de la barre mène à la page d'accueil de la
  // charte, qui ouvre le parcours des cinq pages.
  { vers: '/accueil', libelle: 'Accueil' },
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
 * Lien de bureau. La page courante reçoit une pastille posée derrière le mot :
 * sur une barre sans bordure, un trait collé au bas n'aurait rien où se poser.
 *
 * Deux jeux de teintes, selon que la barre est transparente sur un fond sombre
 * ou posée sur son fond blanc.
 */
function classeLien(surSombre) {
  return ({ isActive }) =>
    clsx(
      'flex min-h-10 items-center rounded-[8px] px-2.5 text-[15px] font-medium transition-colors',
      surSombre
        ? isActive
          ? 'bg-white/15 text-white'
          : 'text-white/80 hover:bg-white/10 hover:text-white'
        : isActive
          ? 'bg-brand-50 text-brand-700'
          : 'text-ink-600 hover:bg-ink-100 hover:text-ink-900'
    );
}

/** En-tête de la partie publique : marque, navigation, recherche, thème et accès au compte. */
export default function EnTetePublic({ surFondSombre = false }) {
  const [ouvert, setOuvert] = useState(false);
  const [defile, definirDefile] = useState(false);
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
   * La barre devient opaque dès les premiers pixels de défilement.
   *
   * Seuil à 24 px : assez pour qu'un frôlement de molette ne la fasse pas
   * clignoter, assez peu pour qu'elle ait pris son fond avant que le contenu
   * ne commence à passer dessous.
   *
   * `passive: true` : l'écouteur ne bloque jamais le défilement, que le
   * navigateur peut alors traiter sans attendre le script.
   *
   * L'état est relu à chaque changement de page : revenir d'une page où l'on
   * avait défilé laissait la barre opaque en haut de la suivante.
   */
  useEffect(() => {
    const surDefilement = () => definirDefile(window.scrollY > 24);
    surDefilement();
    window.addEventListener('scroll', surDefilement, { passive: true });
    return () => window.removeEventListener('scroll', surDefilement);
  }, [pathname]);

  /*
   * Trois états, et non deux : la barre n'est claire que posée sur un fond
   * sombre et non défilée. Dès qu'elle prend son fond blanc — au défilement,
   * ou quand le menu s'ouvre et qu'elle doit porter le panneau — elle repasse
   * au texte sombre.
   */
  const surSombre = surFondSombre && !defile && !ouvert;
  const posee = defile || ouvert;

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
    /*
     * La barre ne se pose qu'au défilement.
     *
     * En haut de page elle est transparente et pleine largeur : sur les pages
     * qui ouvrent par un bandeau, elle se fond dans l'image au lieu de la
     * couper d'un rectangle blanc. Dès que le contenu commence à passer
     * dessous, elle prend un fond, un flou et une ombre — sans quoi les liens
     * se liraient sur ce qui défile.
     *
     * La carte arrondie et détachée des bords qu'elle formait auparavant est
     * abandonnée : elle supposait un fond de page derrière elle, qu'un bandeau
     * photo ne lui donne pas.
     */
    <header
      className={clsx(
        /* `fixed` et non `sticky` : un en-tête collant occupe sa place dans
           le flux, et le bandeau des pages intérieures aurait commencé sous
           lui au lieu de passer dessous. Les pages qui n'ont pas de bandeau
           compensent la hauteur par un retrait haut (voir LayoutPublic). */
        'fixed inset-x-0 top-0 z-40 transition-[background-color,box-shadow,backdrop-filter] duration-300 motion-reduce:transition-none',
        posee
          ? 'bg-surface/90 backdrop-blur-xl shadow-[0_1px_2px_rgb(var(--marine)/0.05),0_10px_24px_-14px_rgb(var(--marine)/0.22)]'
          : 'bg-transparent'
      )}
    >
      <div className="mx-auto flex h-[72px] max-w-[90rem] items-center gap-4 px-5 sm:px-8">
        <Link to="/" onClick={fermer} className="shrink-0" aria-label="SMARTEX SustWay, page d’entrée">
          <Logo taille="sm" variante={surSombre ? 'clair' : 'sombre'} />
          <p
            className={clsx(
              'mt-0.5 hidden whitespace-nowrap text-xs transition-colors md:block',
              surSombre ? 'text-white/70' : 'text-ink-500'
            )}
          >
            By SMARTEX Expertises
          </p>
        </Link>

        <nav
          className="hidden flex-1 items-center justify-center whitespace-nowrap min-[1200px]:flex"
          aria-label="Navigation principale"
        >
          {LIENS.map((lien) => (
            <NavLink key={lien.vers} to={lien.vers} className={classeLien(surSombre)}>
              {lien.libelle}
            </NavLink>
          ))}
        </nav>

        <div className="hidden items-center gap-1.5 whitespace-nowrap min-[1200px]:flex">
          <button
            type="button"
            onClick={() => definirRechercheOuverte(true)}
            aria-label="Rechercher dans le site"
            className={clsx(
              'flex h-10 w-10 items-center justify-center rounded-lg transition-colors',
              surSombre ? 'text-white/80 hover:bg-white/10 hover:text-white' : 'text-ink-600 hover:bg-ink-100 hover:text-ink-900'
            )}
          >
            <Search className="h-[18px] w-[18px]" aria-hidden />
          </button>

          <Link
            to="/connexion"
            className={clsx(
              'flex h-10 items-center px-3 text-[15px] font-medium transition-colors',
              surSombre ? 'text-white hover:text-growth' : 'text-ink-900 hover:text-brand-600'
            )}
          >
            Se connecter
          </Link>
          <Link
            to={ACTION.vers}
            className="flex h-10 items-center rounded-lg bg-brand-600 px-4 text-[15px] font-semibold text-white transition-colors hover:bg-brand-700"
          >
            {ACTION.libelle}
          </Link>

          {/*
           * Le logotype de l'éditeur, en deux versions, et cliquable.
           *
           * Le fichier fourni porte un lettrage bleu marine : il se lit sur la
           * barre blanche, et disparaîtrait sur un bandeau sombre. La seconde
           * version en dérive, et n'en change que le lettrage — l'emblème
           * garde ses bleus et ses rouges, qui tiennent sur les deux fonds.
           * Les deux partagent donc le même cadrage et se superposent au
           * pixel près, ce qui ne serait pas le cas de deux fichiers
           * d'origines différentes.
           *
           * Elles se croisent en opacité plutôt que par un changement de
           * source : mesuré au navigateur, une bascule de `src` relançait un
           * chargement à chaque passage, et le logotype disparaissait le temps
           * qu'il aboutisse.
           *
           * Le lien mène au site de l'éditeur, dans un nouvel onglet — quitter
           * la plateforme d'un clic sur une signature de bas de barre serait
           * une perte de contexte que le visiteur n'a pas demandée. Le `rel`
           * empêche la page ouverte d'accéder à celle-ci.
           *
           * Un filet le sépare des actions : sans lui, il se lisait comme un
           * quatrième bouton de la barre.
           *
           * Seuil à 1250 px, mesuré avec le logotype affiché : la barre tient
           * à 1250 et déborde à 1200, la navigation centrale passant sous sa
           * largeur minimale. Il valait 1300 px du temps du logotype
           * précédent, qui occupait 165 px de large contre 118 pour
           * celui-ci — filet et retrait compris.
           */}
          <a
            href={SMARTEX.siteWeb}
            target="_blank"
            rel="noreferrer noopener"
            className="ml-1 hidden h-11 items-center rounded-lg border-l border-current/15 pl-4 transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-current focus-visible:ring-offset-2 min-[1250px]:flex"
          >
            {/* 40 px de haut, soit 101 de large. Le lettrage n'occupe que le
                tiers bas du fichier : à 28 px il tombait sous neuf pixels. */}
            <span className="relative block h-[40px] w-[101px]">
              {[
                { src: logoEditeurCouleur, actif: !surSombre },
                { src: logoEditeurBlanc, actif: surSombre },
              ].map((version) => (
                <img
                  key={version.src}
                  src={version.src}
                  alt={version.actif ? 'SMARTEX Expertises, éditeur de la plateforme' : ''}
                  width={180}
                  height={71}
                  className={clsx(
                    'absolute inset-0 h-full w-auto transition-opacity duration-300 motion-reduce:transition-none',
                    version.actif ? 'opacity-100' : 'opacity-0'
                  )}
                />
              ))}
            </span>
            <span className="sr-only"> (nouvel onglet)</span>
          </a>
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
            className={clsx(
              '-mr-2 flex h-12 w-12 items-center justify-center rounded-lg transition-colors',
              surSombre ? 'text-white hover:bg-white/10' : 'text-ink-900 hover:bg-ink-100'
            )}
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
            'fixed inset-x-0 top-[72px] z-40 overflow-y-auto overscroll-contain',
            // Il descend jusqu'au contenu, pas jusqu'au bas de la fenêtre : six
            // liens ne remplissent pas un écran, et un grand rectangle blanc à
            // moitié vide n'apprend rien. Au-delà, il défile.
            'max-h-[calc(100svh-4.5rem)] border-t border-ink-200 bg-surface/95 backdrop-blur-xl',
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

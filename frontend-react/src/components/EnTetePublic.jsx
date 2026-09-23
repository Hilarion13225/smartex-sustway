import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';

/*
 * Largeur à partir de laquelle la barre complète tient sans déborder.
 *
 * Remesuré au navigateur après le passage à trois actions : logo 231 px, la
 * navigation 703 px (Accueil 69, Solution 95, Fonctionnalités 142, Offres 62,
 * Ressources 112, plus les chevrons et les écarts), et les actions 410 px
 * (Démo 65, S'inscrire 93, Se connecter 112, logo de l'éditeur 118).
 *
 * Le logo de l'éditeur ne paraît qu'à partir de 1280 px, ce qui rend 118 px
 * au groupe d'actions en dessous. Vérifié par mesure à 1120, 1160, 1200,
 * 1240, 1280, 1360 et 1440 px : aucun débordement à aucune de ces largeurs,
 * et la navigation complète s'affiche dès 1200 px. Le seuil y reste donc.
 *
 * Il a tenu au passage de deux actions à trois parce que « Créer un compte »
 * a cédé la place à « S'inscrire » : les deux nouveaux intitulés réunis
 * coûtent moins que l'ancien seul.
 *
 * Changer un libellé ou ajouter une entrée demande de refaire cette mesure.
 */
import { ChevronDown, Play } from 'lucide-react';
import clsx from 'clsx';
import Logo from './Logo';
import logoEditeurBlanc from '../assets/smartex-expertises-blanc.png';
import logoEditeurCouleur from '../assets/smartex-expertises.png';
import { SMARTEX } from '../config/smartex';
import ModaleVideo from './ModaleVideo';
import IconeMenu from './vitrine/IconeMenu';

const SELECTEUR_FOCALISABLE = 'a[href], button:not([disabled]), input:not([disabled]), select, textarea';

/*
 * Navigation principale — les cinq entrées de la charte SMARTEX SustWay.
 *
 * Trois d'entre elles ouvrent un menu. Leurs sous-entrées ne sont pas des
 * pages mais des ancres : Solution, Fonctionnalités et Ressources se lisent
 * d'un seul tenant, et qui arrive par le menu atterrit à la bonne section sans
 * perdre le fil de ce qui précède.
 *
 * Les liens sont écrits en absolu (`/solution#presentation`) plutôt qu'en
 * relatif : depuis une autre page, un lien relatif viserait une ancre
 * inexistante sur la page courante et ne ferait rien. La bascule de route puis
 * le défilement vers l'ancre sont gérés par LayoutPublic.
 *
 * Les autres pages publiques — Méthodologie, Déploiement, Formules, Contact —
 * restent atteignables par le pied de page et par les renvois des cinq pages.
 */
const LIENS = [
  { vers: '/', libelle: 'Accueil' },
  {
    vers: '/solution',
    libelle: 'Solution',
    sous: [
      { vers: '/solution#presentation', libelle: 'Présentation' },
      { vers: '/solution#methodologie', libelle: 'Méthodologie' },
      { vers: '/solution#referentiels', libelle: 'Référentiels' },
      { vers: '/solution#livrables', libelle: 'Livrables' },
    ],
  },
  {
    vers: '/fonctionnalites',
    libelle: 'Fonctionnalités',
    sous: [
      { vers: '/fonctionnalites#collecter-les-donnees', libelle: 'Collecter les données' },
      { vers: '/fonctionnalites#documenter', libelle: 'Documenter' },
      { vers: '/fonctionnalites#analyse-resultats', libelle: 'Analyse & Résultats' },
      { vers: '/fonctionnalites#remedier-piloter', libelle: 'Remédier & Piloter' },
    ],
  },
  { vers: '/offres', libelle: 'Offres' },
  {
    vers: '/ressources',
    libelle: 'Ressources',
    sous: [
      { vers: '/ressources#articles', libelle: 'Articles' },
      { vers: '/ressources#guides', libelle: 'Guides & bonnes pratiques' },
      { vers: '/ressources#documentation', libelle: 'Documentation' },
      { vers: '/ressources#faq', libelle: 'FAQ' },
    ],
  },
];

/*
 * Les trois actions de la barre, dans l'ordre où elles s'y lisent.
 *
 * Elles vont du moins engageant au plus engageant : regarder, s'inscrire,
 * entrer. Seule « S'inscrire » est un bouton plein, parce que c'est l'action
 * que le site cherche à provoquer ; « Se connecter » s'adresse à qui a déjà
 * un compte et sait donc où il va, et n'a pas besoin d'être criard pour être
 * trouvé.
 *
 * « Démo » n'est pas un lien mais un déclencheur : il ouvre la vidéo de
 * démonstration. Un visiteur qui clique dessus veut voir le produit, pas
 * remplir un champ ; la demande de démonstration personnalisée reste portée
 * par la page Contact, que le pied de page désigne en toutes lettres.
 *
 * Les intitulés sont courts — « Démo » et non « Demander une démo » : à trois
 * de front, les intitulés longs poussent la barre au-delà de sa largeur
 * utile et font basculer la navigation en menu hamburger trop tôt.
 */
const ACTIONS = [
  { action: 'video', libelle: 'Démo', principale: false },
  { vers: '/inscription', libelle: 'S’inscrire', principale: true },
  { vers: '/connexion', libelle: 'Se connecter', principale: false },
];

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
  /* Index de l'entrée dont le menu est déployé, ou `null`. Un seul à la fois :
     deux panneaux ouverts se chevaucheraient. */
  const [menuDeploye, definirMenuDeploye] = useState(null);
  const [videoOuverte, definirVideoOuverte] = useState(false);
  const fermer = () => setOuvert(false);
  const { pathname } = useLocation();
  const boutonMenu = useRef(null);
  const panneauMenu = useRef(null);

  // Un changement de page ferme le menu, y compris par le bouton Précédent du
  // navigateur, qui ne passe par aucun lien du menu.
  useEffect(() => {
    setOuvert(false);
    definirMenuDeploye(null);
  }, [pathname]);

  /* Échap referme le menu déployé. Le focus reste où il est : l'utilisateur
     vient de refuser le panneau, pas de quitter l'entrée qui l'ouvre. */
  useEffect(() => {
    if (menuDeploye === null) return undefined;
    const auClavier = (evenement) => {
      if (evenement.key === 'Escape') definirMenuDeploye(null);
    };
    document.addEventListener('keydown', auClavier);
    return () => document.removeEventListener('keydown', auClavier);
  }, [menuDeploye]);

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
        <Link viewTransition to="/" onClick={fermer} className="shrink-0" aria-label="SMARTEX SustWay, page d’entrée">
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
          {LIENS.map((lien, index) =>
            lien.sous ? (
              /*
               * Le menu s'ouvre au survol et à la mise au point, et se referme
               * quand l'un et l'autre quittent le groupe. `onBlur` teste si la
               * cible du focus est encore dans le conteneur : sans ce test, il
               * se refermait entre deux sous-entrées, pendant la tabulation.
               *
               * L'entrée reste un lien vers la page entière : le menu propose
               * des sections, il ne remplace pas la page qui les contient.
               */
              <div
                key={lien.vers}
                className="relative"
                onMouseEnter={() => definirMenuDeploye(index)}
                onMouseLeave={() => definirMenuDeploye((ouvert) => (ouvert === index ? null : ouvert))}
                onFocus={() => definirMenuDeploye(index)}
                onBlur={(evenement) => {
                  if (!evenement.currentTarget.contains(evenement.relatedTarget)) definirMenuDeploye(null);
                }}
              >
                <NavLink viewTransition
                  to={lien.vers}
                  className={classeLien(surSombre)}
                  aria-expanded={menuDeploye === index}
                  aria-haspopup="true"
                >
                  {lien.libelle}
                  <ChevronDown
                    aria-hidden
                    className={clsx(
                      'ml-1 h-3.5 w-3.5 transition-transform duration-200 motion-reduce:transition-none',
                      menuDeploye === index && 'rotate-180'
                    )}
                    strokeWidth={2.5}
                  />
                </NavLink>

                {menuDeploye === index ? (
                  <div className="absolute left-0 top-full z-50 pt-2">
                    <ul className="min-w-[232px] overflow-hidden rounded-xl border border-ink-200 bg-surface py-2 shadow-[0_12px_32px_-12px_rgb(var(--marine)/0.28)]">
                      {lien.sous.map((sous) => (
                        <li key={sous.vers}>
                          <Link viewTransition
                            to={sous.vers}
                            onClick={() => definirMenuDeploye(null)}
                            className="block px-4 py-2.5 text-[15px] text-ink-700 transition-colors hover:bg-brand-50 hover:text-brand-700"
                          >
                            {sous.libelle}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </div>
            ) : (
              <NavLink viewTransition key={lien.vers} to={lien.vers} className={classeLien(surSombre)}>
                {lien.libelle}
              </NavLink>
            )
          )}
        </nav>

        <div className="hidden items-center gap-1.5 whitespace-nowrap min-[1200px]:flex">
          {ACTIONS.map((action) => {
            const classe = action.principale
              ? 'flex h-10 items-center rounded-lg bg-brand-600 px-4 text-[15px] font-semibold text-white transition-colors hover:bg-brand-700'
              : clsx(
                  'flex h-10 items-center px-3 text-[15px] font-medium transition-colors',
                  surSombre ? 'text-white hover:text-growth' : 'text-ink-900 hover:text-brand-600'
                );

            // Un bouton, et non un lien déguisé : l'action n'amène nulle part,
            // elle ouvre une vidéo par-dessus la page courante.
            return action.action === 'video' ? (
              <button key={action.libelle} type="button" onClick={() => definirVideoOuverte(true)} className={classe}>
                {action.libelle}
              </button>
            ) : (
              <Link viewTransition key={action.libelle} to={action.vers} className={classe}>
                {action.libelle}
              </Link>
            );
          })}

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
          <Link viewTransition
            to={ACTIONS.find((action) => action.principale).vers}
            onClick={fermer}
            /* Visible dès 375 px, la largeur d'un iPhone SE ou mini. Mesuré au
               navigateur : à 375 px le contenu de la barre occupe 299 px pour
               351 disponibles, à 360 px il déborde. Le seuil valait 460 px, ce
               qui privait du seul appel à l'action tous les téléphones
               courants — la charte le veut atteignable en permanence. */
            className="hidden h-11 items-center rounded-lg bg-brand-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-brand-700 min-[375px]:flex"
          >
            {ACTIONS.find((action) => action.principale).libelle}
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
          {/* Le panneau mobile occupe tout l'écran : les sous-entrées y sont
              dépliées d'emblée, en retrait sous leur rubrique. Un second niveau
              repliable y ajouterait un geste sans rien révéler de plus. */}
          {LIENS.map((lien) => (
            <div key={lien.vers} className="border-b border-ink-200">
              <NavLink viewTransition
                to={lien.vers}
                onClick={fermer}
                className={({ isActive }) =>
                  clsx(
                    'flex min-h-12 items-center text-lg font-medium transition-colors',
                    isActive ? 'text-brand-700' : 'text-ink-900'
                  )
                }
              >
                {lien.libelle}
              </NavLink>

              {lien.sous ? (
                <ul className="pb-3 pl-4">
                  {lien.sous.map((sous) => (
                    <li key={sous.vers}>
                      <Link viewTransition
                        to={sous.vers}
                        onClick={fermer}
                        className="flex min-h-11 items-center border-l border-ink-200 pl-4 text-[15px] text-ink-600 transition-colors hover:text-brand-700"
                      >
                        {sous.libelle}
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          ))}

          {/* L'entrée « Voir la démonstration » qui figurait ici est retirée :
              « Démo », juste en dessous, ouvre désormais la même vidéo. */}
          <div className="mt-6 grid gap-3 min-[420px]:grid-cols-2">
            {ACTIONS.map((action) => {
              const classe = clsx(
                'flex min-h-12 items-center justify-center gap-2 rounded-lg text-base font-semibold',
                action.principale ? 'bg-brand-600 text-white' : 'border border-ink-300 text-ink-900'
              );

              return action.action === 'video' ? (
                <button
                  key={action.libelle}
                  type="button"
                  onClick={() => {
                    fermer();
                    definirVideoOuverte(true);
                  }}
                  className={classe}
                >
                  <Play className="h-[18px] w-[18px]" aria-hidden />
                  {action.libelle}
                </button>
              ) : (
                <Link viewTransition key={action.libelle} to={action.vers} onClick={fermer} className={classe}>
                  {action.libelle}
                </Link>
              );
            })}
          </div>

        </nav>
        </div>
      ) : null}

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

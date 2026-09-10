import { useEffect, useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { ArrowRight, Menu, Play, Search, X } from 'lucide-react';
import clsx from 'clsx';
import Logo from './Logo';
import BasculeTheme from './BasculeTheme';
import RechercheVitrine from './RechercheVitrine';
import ModaleVideo from './ModaleVideo';
import { useTheme } from '../theme/ThemeContext';

/*
 * Navigation principale : les cinq pages qui portent l'offre. Le logotype mène
 * à / (la page d'entrée) et joue le rôle du lien d'accueil, d'où l'absence
 * d'une entrée « Accueil » qui ferait doublon. Déploiement, Bénéfices, FAQ et
 * À propos restent atteignables par le pied de page et par la recherche.
 */
const LIENS = [
  { vers: '/services', libelle: 'Solution' },
  { vers: '/methodologie', libelle: 'Méthodologie' },
  { vers: '/formules', libelle: 'Formules' },
  { vers: '/contact', libelle: 'Contact' },
  { vers: '/formation', libelle: 'Se former' },
];

/*
 * Le lien de navigation est décrit ici plutôt que repris de `.lien-nav` :
 * la maquette impose un corps de 13 px et un soulignement à 10 px sous la
 * ligne de base, quand la classe partagée vaut 14 px et 19 px — et elle sert
 * aussi au menu déroulant de l'espace connecté, qu'un réglage taillé pour la
 * vitrine dérèglerait.
 */
function classeLien({ isActive }) {
  return clsx(
    'relative inline-flex items-center rounded-md px-2 py-2 text-[13px] font-semibold leading-5 transition-colors min-[1400px]:px-3',
    'after:absolute after:inset-x-2 after:bottom-px after:h-0.5 after:origin-left after:rounded-full',
    'after:bg-brand-600 after:transition-transform after:duration-300 dark:after:bg-brand-400 min-[1400px]:after:inset-x-3.5',
    isActive
      ? 'text-brand-600 after:scale-x-100 dark:text-brand-400'
      : 'text-marine after:scale-x-0 hover:text-brand-600 hover:after:scale-x-100 dark:hover:text-brand-400'
  );
}

/** En-tête de la partie publique : marque, navigation, recherche, thème et appels à l'action. */
export default function EnTetePublic() {
  const [ouvert, setOuvert] = useState(false);
  const [defile, setDefile] = useState(false);
  const [videoOuverte, definirVideoOuverte] = useState(false);
  const [rechercheOuverte, definirRechercheOuverte] = useState(false);
  // Sur une page qui impose le sombre, BasculeTheme ne rend rien : le
  // séparateur qui la précède resterait collé à l'icône de recherche.
  const { sombreForce } = useTheme();

  useEffect(() => {
    const surDefilement = () => setDefile(window.scrollY > 12);
    surDefilement();
    window.addEventListener('scroll', surDefilement, { passive: true });
    return () => window.removeEventListener('scroll', surDefilement);
  }, []);

  return (
    <header
      className={clsx(
        'sticky top-0 z-40 border-b transition-all duration-300',
        defile
          ? 'border-ink-100 bg-surface/85 shadow-soft backdrop-blur-xl'
          : 'border-ink-100/70 bg-surface/80 backdrop-blur'
      )}
    >
      {/* Marges resserrées sur téléphone : sous 420 px, 12 px de marge au lieu
          de 24 rendent 24 px au contenu, ce qui suffit à faire tenir l'appel à
          l'action sur une ligne. */}
      <div className="mx-auto flex h-[62px] max-w-[87.5rem] items-center gap-3 px-3 min-[420px]:px-4 sm:px-6 min-[1400px]:gap-4 min-[1400px]:px-10">
        <Link
          to="/"
          onClick={() => setOuvert(false)}
          className="group shrink-0 transition-transform duration-500 motion-safe:group-hover:scale-[1.03]"
        >
          <Logo taille="sm" />
          <p className="hidden whitespace-nowrap text-xs text-ink-500 md:block">By SMARTEX Expertises</p>
        </Link>

        {/* La maquette ne centre pas la navigation : elle laisse 120 px après le
            logo et 50 px avant la recherche. Deux ressorts de forces 7 et 3
            reproduisent ce rapport à toutes les largeurs, plutôt qu'un
            `justify-center` qui égaliserait les deux écarts. */}
        <div className="hidden flex-1 items-center min-[1200px]:flex">
          <span className="flex-[7]" aria-hidden />
          {/* `whitespace-nowrap` évite qu'un intitulé se casse sur deux lignes
              une fois la place réduite par le logo et les actions. */}
          <nav className="flex items-center gap-1 whitespace-nowrap">
            {LIENS.map((lien) => (
              <NavLink key={lien.vers} to={lien.vers} className={classeLien}>
                {lien.libelle}
              </NavLink>
            ))}
          </nav>
          <span className="flex-[3]" aria-hidden />
        </div>

        {/* Recherche, séparateur, thème, puis les deux appels à l'action. La
            maquette espace ces éléments de 20 px, mais colle les deux boutons
            à 8 px l'un de l'autre — d'où leur groupe imbriqué. Les valeurs
            sont resserrées sous 1400 px : la barre complète, sélecteur de
            thème compris, tient alors dès 1200 px — la largeur de la maquette
            (1217 px) montre bien la navigation de bureau. */}
        <div className="hidden shrink-0 items-center gap-3 whitespace-nowrap min-[1200px]:flex min-[1400px]:gap-5">
          <button
            type="button"
            onClick={() => definirRechercheOuverte(true)}
            aria-label="Rechercher dans le site"
            className="flex h-9 w-9 items-center justify-center rounded-full text-ink-600 transition-colors hover:bg-ink-100 hover:text-brand-700 dark:hover:text-brand-400"
          >
            <Search className="h-[18px] w-[18px]" aria-hidden />
          </button>

          {sombreForce ? null : (
            <>
              <span className="h-6 w-px bg-ink-200" aria-hidden />
              <BasculeTheme />
            </>
          )}

          {/* Les deux boutons partagent la même hauteur fixe : la bordure de
              l'un ajouterait sinon 2 px que le fond plein de l'autre n'a pas. */}
          <div className="flex items-center gap-2">
            <Link
              to="/connexion"
              className="inline-flex h-[42px] items-center rounded-md border border-brand-400 px-3 text-[13px] font-semibold text-brand-600 transition duration-300 hover:border-brand-600 hover:bg-brand-50 dark:border-brand-500/50 dark:text-brand-400 dark:hover:bg-brand-500/10 min-[1400px]:px-5"
            >
              Se connecter
            </Link>

            <Link
              to="/inscription"
              className="group inline-flex h-[42px] items-center gap-4 rounded-md border border-brand-600 bg-brand-600 px-4 text-[13px] font-semibold text-white shadow-glow transition duration-300 hover:border-brand-700 hover:bg-brand-700 motion-safe:hover:-translate-y-0.5 min-[1400px]:gap-6 min-[1400px]:px-6"
            >
              Créer un compte
              <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" aria-hidden />
            </Link>
          </div>
        </div>

        {/* Sur mobile, l'appel à l'action reste visible à côté du menu.
            `whitespace-nowrap` seulement à partir de 360 px : en dessous, la
            place manque pour l'intitulé complet sur une ligne, et mieux vaut
            un bouton sur deux lignes qu'un en-tête qui sort de l'écran. Le
            bouton retrouve ses dimensions d'origine à partir de 420 px. */}
        <div className="ml-auto flex items-center gap-2 min-[1200px]:hidden">
          <Link
            to="/inscription"
            onClick={() => setOuvert(false)}
            className="rounded-[10px] bg-brand-600 px-2.5 py-2 text-[11px] font-semibold text-white shadow-glow transition-colors hover:bg-brand-700 min-[360px]:whitespace-nowrap min-[420px]:px-3.5 min-[420px]:text-xs"
          >
            Créer un compte
          </Link>
          <button
            type="button"
            className="btn-ghost p-2"
            onClick={() => setOuvert((valeur) => !valeur)}
            aria-label={ouvert ? 'Fermer le menu' : 'Ouvrir le menu'}
            aria-expanded={ouvert}
          >
            {ouvert ? <X className="h-5 w-5" aria-hidden /> : <Menu className="h-5 w-5" aria-hidden />}
          </button>
        </div>
      </div>

      <div
        className={clsx(
          'overflow-hidden border-ink-100 bg-surface/95 backdrop-blur-xl transition-[max-height,opacity] duration-300 min-[1200px]:hidden',
          ouvert ? 'max-h-[36rem] border-t opacity-100' : 'max-h-0 opacity-0'
        )}
      >
        <nav className="mx-auto flex max-w-[87.5rem] flex-col gap-1 px-6 py-4">
          {LIENS.map((lien) => (
            <NavLink
              key={lien.vers}
              to={lien.vers}
              onClick={() => setOuvert(false)}
              className={({ isActive }) =>
                clsx(
                  'rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-brand-50 text-brand-700 dark:bg-brand-500/15 dark:text-brand-400'
                    : 'text-marine hover:bg-ink-100'
                )
              }
            >
              {lien.libelle}
            </NavLink>
          ))}

          <div className="my-2 border-t border-ink-100" />

          {/* La recherche n'a pas sa place dans la barre repliée : sous 420 px,
              logo + appel à l'action + menu occupent déjà toute la largeur. */}
          <button
            type="button"
            onClick={() => {
              setOuvert(false);
              definirRechercheOuverte(true);
            }}
            className="flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium text-ink-700 transition-colors hover:bg-ink-100"
          >
            <span className="flex h-7 w-7 items-center justify-center rounded-full border border-ink-200 text-ink-500">
              <Search className="h-3.5 w-3.5" aria-hidden />
            </span>
            Rechercher
          </button>

          {/* La démonstration a quitté la barre de bureau, où la maquette ne la
              prévoit pas. Elle reste ici, et sur les pages Accueil, Solution et
              Méthodologie, plutôt que de disparaître du site. */}
          <button
            type="button"
            onClick={() => {
              setOuvert(false);
              definirVideoOuverte(true);
            }}
            className="flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium text-ink-700 transition-colors hover:bg-ink-100"
          >
            <span className="flex h-7 w-7 items-center justify-center rounded-full border border-brand-300 text-brand-600 dark:text-brand-400">
              <Play className="h-2.5 w-2.5 fill-current" aria-hidden />
            </span>
            Voir la démo
          </button>

          <Link
            to="/connexion"
            onClick={() => setOuvert(false)}
            className="mt-1 inline-flex items-center justify-center rounded-[10px] border border-brand-300 px-4 py-2.5 text-sm font-semibold text-brand-600 transition-colors hover:bg-brand-50 dark:border-brand-500/50 dark:text-brand-400 dark:hover:bg-brand-500/10"
          >
            Se connecter
          </Link>

          {sombreForce ? null : (
            <div className="mt-3 flex items-center justify-between gap-2 px-3">
              <span className="text-xs font-medium uppercase tracking-wide text-ink-500">Thème</span>
              <BasculeTheme />
            </div>
          )}
        </nav>
      </div>

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

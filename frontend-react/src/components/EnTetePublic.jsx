import { useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { Menu, Play, Search, X } from 'lucide-react';
import clsx from 'clsx';
import Logo from './Logo';
import BasculeTheme from './BasculeTheme';
import RechercheVitrine from './RechercheVitrine';
import ModaleVideo from './ModaleVideo';
import { useTheme } from '../theme/ThemeContext';

/*
 * Navigation principale : les pages de l'offre, plus Se former, que SMARTEX
 * Expertises veut rendre visible dès l'en-tête. La FAQ reste atteignable par
 * le pied de page et par la recherche : elle répond à des questions plus
 * tardives.
 */
const LIENS = [
  { vers: '/services', libelle: 'Solution' },
  { vers: '/methodologie', libelle: 'Méthodologie' },
  { vers: '/formules', libelle: 'Formules' },
  { vers: '/formation', libelle: 'Se former' },
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
  // Sur une page qui impose le sombre, BasculeTheme ne rend rien : le filet
  // qui le précède resterait seul.
  const { sombreForce } = useTheme();
  const fermer = () => setOuvert(false);

  return (
    // Fond plein, sans flou ni ombre : l'en-tête est une bande du registre,
    // pas une vitre posée au-dessus de la page.
    <header className="sticky top-0 z-40 border-b border-ink-200 bg-ink-50">
      {/* Espacements serrés au plus juste : avec cinq liens, la barre complète
          tient dans les 1200 px de la vitrine avec une vingtaine de pixels de
          marge. Ajouter un lien demande de revérifier à 1200 px. */}
      <div className="mx-auto flex h-16 max-w-[75rem] items-center gap-4 px-5">
        <Link to="/" onClick={fermer} className="shrink-0" aria-label="SMARTEX SustWay, page d’entrée">
          <Logo taille="sm" />
          <p className="mt-0.5 hidden whitespace-nowrap text-xs text-ink-500 md:block">By SMARTEX Expertises</p>
        </Link>

        <nav className="hidden items-center whitespace-nowrap min-[1200px]:flex" aria-label="Navigation principale">
          {LIENS.map((lien) => (
            <NavLink key={lien.vers} to={lien.vers} className={classeLien}>
              {lien.libelle}
            </NavLink>
          ))}
        </nav>

        <div className="ml-auto hidden items-center gap-1.5 whitespace-nowrap min-[1200px]:flex">
          <button
            type="button"
            onClick={() => definirRechercheOuverte(true)}
            aria-label="Rechercher dans le site"
            className="flex h-10 w-10 items-center justify-center rounded-[4px] text-ink-600 transition-colors hover:bg-ink-100 hover:text-ink-900"
          >
            <Search className="h-[18px] w-[18px]" aria-hidden />
          </button>

          {sombreForce ? null : (
            <>
              <span className="mx-1 h-6 w-px bg-ink-200" aria-hidden />
              <BasculeTheme />
              <span className="mx-1 h-6 w-px bg-ink-200" aria-hidden />
            </>
          )}

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
        <div className="ml-auto flex items-center gap-2 min-[1200px]:hidden">
          <Link
            to={ACTION.vers}
            onClick={fermer}
            className="hidden h-11 items-center rounded-[4px] bg-brand-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-brand-700 min-[460px]:flex"
          >
            {ACTION.libelle}
          </Link>
          <button
            type="button"
            className="-mr-2 flex h-12 w-12 items-center justify-center rounded-[4px] text-ink-900 transition-colors hover:bg-ink-100"
            onClick={() => setOuvert((valeur) => !valeur)}
            aria-label={ouvert ? 'Fermer le menu' : 'Ouvrir le menu'}
            aria-expanded={ouvert}
          >
            {ouvert ? <X className="h-6 w-6" aria-hidden /> : <Menu className="h-6 w-6" aria-hidden />}
          </button>
        </div>
      </div>

      <div
        className={clsx(
          'overflow-hidden border-ink-200 bg-ink-50 transition-[max-height] duration-300 min-[1200px]:hidden',
          ouvert ? 'max-h-[44rem] border-t' : 'max-h-0'
        )}
      >
        <nav className="mx-auto flex max-w-[75rem] flex-col px-5 pb-6 pt-2" aria-label="Navigation principale">
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

          {sombreForce ? null : (
            <div className="mt-6 flex items-center justify-between gap-2">
              <span className="text-sm font-medium text-ink-600">Thème</span>
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

import { useEffect, useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { ArrowRight, Menu, Play, X } from 'lucide-react';
import clsx from 'clsx';
import Logo from './Logo';
import BasculeTheme from './BasculeTheme';
import MenuDeroulant from './MenuDeroulant';
import ModaleVideo from './ModaleVideo';
import { useTheme } from '../theme/ThemeContext';
import { SMARTEX } from '../config/smartex';

/**
 * Sous-menu « Ressources » : pages de contenu que l'on consulte pour se
 * documenter, par opposition aux pages produit de la navigation principale.
 */
const RESSOURCES_LIENS = [
  { vers: '/formation', libelle: 'Se former à la RSE, ESG et ISR' },
  { vers: '/deploiement', libelle: 'Déploiement de la solution' },
  { vers: '/avantages', libelle: 'Bénéfices de la solution' },
  { vers: '/faq', libelle: 'Questions fréquentes' },
];

const LIENS = [
  { vers: '/services', libelle: 'Solution' },
  { vers: '/methodologie', libelle: 'Méthodologie' },
  { vers: '/formules', libelle: 'Formules' },
];

const LIENS_FIN = [{ vers: '/a-propos', libelle: 'À propos' }];

/** En-tête de la partie publique : marque, navigation, démonstration et appel à l'action. */
export default function EnTetePublic() {
  const [ouvert, setOuvert] = useState(false);
  const [defile, setDefile] = useState(false);
  const [videoOuverte, definirVideoOuverte] = useState(false);
  // Sur une page qui impose le sombre, BasculeTheme ne rend rien : l'intitulé
  // « Thème » du menu mobile resterait seul face à un espace vide.
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
          : 'border-transparent bg-surface/70 backdrop-blur'
      )}
    >
      <div className="mx-auto flex h-[84px] max-w-[87.5rem] items-center justify-between gap-6 px-6 lg:px-10">
        <Link
          to="/"
          onClick={() => setOuvert(false)}
          className="group shrink-0 transition-transform duration-500 motion-safe:group-hover:scale-[1.03]"
        >
          <Logo taille="sm" />
          <p className="hidden whitespace-nowrap text-xs text-ink-500 md:block">Par {SMARTEX.editeur}</p>
        </Link>

        {/* `whitespace-nowrap` : sans lui, « À propos » et les actions se
            cassent sur deux lignes une fois la place réduite par le logo. */}
        <nav className="hidden items-center gap-1 whitespace-nowrap xl:flex">
          {LIENS.map((lien) => (
            <NavLink key={lien.vers} to={lien.vers} className="lien-nav">
              {lien.libelle}
            </NavLink>
          ))}
          <MenuDeroulant libelle="Ressources" liens={RESSOURCES_LIENS} />
          {LIENS_FIN.map((lien) => (
            <NavLink key={lien.vers} to={lien.vers} className="lien-nav">
              {lien.libelle}
            </NavLink>
          ))}
        </nav>

        <div className="hidden items-center gap-4 whitespace-nowrap xl:flex 2xl:gap-5">
          {/* La bascule n'apparaît qu'à partir de 1536 px : entre 1280 et
              1536, la place est réservée à la navigation et aux deux appels à
              l'action. En dessous, elle reste accessible dans le menu. */}
          <span className="hidden 2xl:inline-flex">
            <BasculeTheme />
          </span>

          {/* Action secondaire : volontairement sans fond plein, pour ne pas
              rivaliser avec l'appel à l'action principal. */}
          <button
            type="button"
            onClick={() => definirVideoOuverte(true)}
            className="group flex items-center gap-2.5 text-sm font-medium text-ink-700 transition-colors hover:text-brand-700 dark:hover:text-brand-400"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-full border border-brand-300 text-brand-600 transition duration-300 group-hover:border-brand-500 group-hover:bg-brand-50 dark:text-brand-400 dark:group-hover:bg-brand-500/15">
              <Play className="h-3 w-3 fill-current" aria-hidden />
            </span>
            Voir la démo
          </button>

          <span className="h-6 w-px bg-ink-200" aria-hidden />

          <Link
            to="/connexion"
            className="text-sm font-medium text-ink-700 transition-colors hover:text-brand-700 dark:hover:text-brand-400"
          >
            Se connecter
          </Link>

          <Link
            to="/inscription"
            className="group inline-flex items-center gap-2 rounded-[10px] bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white shadow-glow transition duration-300 hover:bg-brand-700 motion-safe:hover:-translate-y-0.5"
          >
            Créer un compte
            <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" aria-hidden />
          </Link>
        </div>

        {/* Sur mobile, l'appel à l'action reste visible à côté du menu. */}
        <div className="flex items-center gap-2 xl:hidden">
          <Link
            to="/inscription"
            onClick={() => setOuvert(false)}
            className="rounded-[10px] bg-brand-600 px-3.5 py-2 text-xs font-semibold text-white shadow-glow transition-colors hover:bg-brand-700"
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
          'overflow-hidden border-ink-100 bg-surface/95 backdrop-blur-xl transition-[max-height,opacity] duration-300 xl:hidden',
          ouvert ? 'max-h-[36rem] border-t opacity-100' : 'max-h-0 opacity-0'
        )}
      >
        <nav className="mx-auto flex max-w-[87.5rem] flex-col gap-1 px-6 py-4">
          {[...LIENS, ...LIENS_FIN].map((lien) => (
            <NavLink
              key={lien.vers}
              to={lien.vers}
              onClick={() => setOuvert(false)}
              className={({ isActive }) =>
                clsx(
                  'rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-brand-50 text-brand-700 dark:bg-brand-500/15 dark:text-brand-400'
                    : 'text-ink-700 hover:bg-ink-100'
                )
              }
            >
              {lien.libelle}
            </NavLink>
          ))}

          <p className="mt-3 px-3 text-[11px] font-semibold uppercase tracking-wider text-ink-400">Ressources</p>
          {RESSOURCES_LIENS.map((lien) => (
            <Link
              key={lien.vers}
              to={lien.vers}
              onClick={() => setOuvert(false)}
              className="rounded-lg px-3 py-2.5 text-sm font-medium text-ink-700 transition-colors hover:bg-ink-100"
            >
              {lien.libelle}
            </Link>
          ))}

          <div className="my-2 border-t border-ink-100" />

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
            className="rounded-lg px-3 py-2.5 text-sm font-medium text-ink-700 transition-colors hover:bg-ink-100"
          >
            Se connecter
          </Link>

          {sombreForce ? null : (
            <div className="mt-2 flex items-center justify-between gap-2 px-3">
              <span className="text-xs font-medium uppercase tracking-wide text-ink-500">Thème</span>
              <BasculeTheme />
            </div>
          )}
        </nav>
      </div>

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

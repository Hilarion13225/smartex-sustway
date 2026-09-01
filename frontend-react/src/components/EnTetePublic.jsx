import { useEffect, useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { ArrowRight, Menu, X } from 'lucide-react';
import clsx from 'clsx';
import Logo from './Logo';
import { SMARTEX } from '../config/smartex';
import BasculeTheme from './BasculeTheme';

const LIENS = [
  { vers: '/accueil', libelle: 'Accueil' },
  { vers: '/services', libelle: 'Services' },
  { vers: '/formules', libelle: 'Formules' },
  { vers: '/a-propos', libelle: 'À propos' },
  { vers: '/faq', libelle: 'FAQ' },
  { vers: '/contact', libelle: 'Contact' },
];

/** En-tête de la partie publique (vitrine) : navigation, menu mobile, appels à l'action. */
export default function EnTetePublic() {
  const [ouvert, setOuvert] = useState(false);
  const [defile, setDefile] = useState(false);

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
        defile ? 'border-ink-100 bg-surface/85 shadow-soft backdrop-blur-xl' : 'border-transparent bg-surface/60 backdrop-blur'
      )}
    >
      <div className="mx-auto flex max-w-[90rem] items-center justify-between gap-4 px-5 py-3.5">
        <Link
          to="/"
          className="group transition-transform duration-500 motion-safe:group-hover:scale-[1.03]"
          onClick={() => setOuvert(false)}
        >
          <Logo taille="sm" />
          <p className="hidden whitespace-nowrap text-xs text-ink-500 md:block">Par {SMARTEX.editeur}</p>
        </Link>

        <nav className="hidden items-center gap-1 lg:flex">
          {LIENS.map((lien) => (
            <NavLink key={lien.vers} to={lien.vers} end={lien.fin} className="lien-nav">
              {lien.libelle}
            </NavLink>
          ))}
        </nav>

        <div className="hidden items-center gap-2 sm:flex">
          <BasculeTheme className="mr-1" />
          <Link to="/connexion" className="btn-vitrine-clair">
            Se connecter
          </Link>
          <Link to="/inscription" className="btn-vitrine group">
            Créer un compte
            <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" aria-hidden />
          </Link>
        </div>

        <button
          type="button"
          className="btn-ghost p-2 lg:hidden"
          onClick={() => setOuvert((valeur) => !valeur)}
          aria-label={ouvert ? 'Fermer le menu' : 'Ouvrir le menu'}
          aria-expanded={ouvert}
        >
          {ouvert ? <X className="h-5 w-5" aria-hidden /> : <Menu className="h-5 w-5" aria-hidden />}
        </button>
      </div>

      <div
        className={clsx(
          'overflow-hidden border-ink-100 bg-surface/95 backdrop-blur-xl transition-[max-height,opacity] duration-300 lg:hidden',
          ouvert ? 'max-h-96 border-t opacity-100' : 'max-h-0 opacity-0'
        )}
      >
        <nav className="mx-auto flex max-w-[90rem] flex-col gap-1 px-5 py-4">
          {LIENS.map((lien) => (
            <NavLink
              key={lien.vers}
              to={lien.vers}
              end={lien.fin}
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
          <div className="mt-2 flex items-center justify-between gap-2 sm:hidden">
            <span className="text-xs font-medium uppercase tracking-wide text-ink-500">Thème</span>
            <BasculeTheme />
          </div>
          <div className="mt-2 flex flex-col gap-2 sm:hidden">
            <Link to="/connexion" className="btn-vitrine-clair" onClick={() => setOuvert(false)}>
              Se connecter
            </Link>
            <Link to="/inscription" className="btn-vitrine" onClick={() => setOuvert(false)}>
              Créer un compte
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          </div>
        </nav>
      </div>
    </header>
  );
}

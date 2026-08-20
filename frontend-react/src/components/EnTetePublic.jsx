import { useEffect, useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { ArrowRight, Menu, X } from 'lucide-react';
import clsx from 'clsx';
import logoSmartexSustway from '../assets/brand/logo-smartex-sustway.png';
import { SMARTEX } from '../config/smartex';

const LIENS = [
  { vers: '/', libelle: 'Accueil', fin: true },
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
        defile ? 'border-ink-100 bg-white/85 shadow-soft backdrop-blur-xl' : 'border-transparent bg-white/60 backdrop-blur'
      )}
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-3.5">
        <Link to="/" className="group flex items-center gap-2.5" onClick={() => setOuvert(false)}>
          <img
            src={logoSmartexSustway}
            alt={SMARTEX.produit}
            className="h-9 w-auto transition-transform duration-500 motion-safe:group-hover:scale-110"
          />
          <span className="leading-tight">
            <span className="block text-sm font-semibold text-ink-900">{SMARTEX.produit}</span>
            <span className="block text-xs text-ink-500">Par {SMARTEX.editeur}</span>
          </span>
        </Link>

        <nav className="hidden items-center gap-1 lg:flex">
          {LIENS.map((lien) => (
            <NavLink key={lien.vers} to={lien.vers} end={lien.fin} className="lien-nav">
              {lien.libelle}
            </NavLink>
          ))}
        </nav>

        <div className="hidden items-center gap-2 sm:flex">
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
          'overflow-hidden border-ink-100 bg-white/95 backdrop-blur-xl transition-[max-height,opacity] duration-300 lg:hidden',
          ouvert ? 'max-h-96 border-t opacity-100' : 'max-h-0 opacity-0'
        )}
      >
        <nav className="mx-auto flex max-w-6xl flex-col gap-1 px-5 py-4">
          {LIENS.map((lien) => (
            <NavLink
              key={lien.vers}
              to={lien.vers}
              end={lien.fin}
              onClick={() => setOuvert(false)}
              className={({ isActive }) =>
                clsx(
                  'rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                  isActive ? 'bg-brand-50 text-brand-700' : 'text-ink-700 hover:bg-ink-50'
                )
              }
            >
              {lien.libelle}
            </NavLink>
          ))}
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

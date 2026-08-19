import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { Building2, LogOut, Menu, UserCog, X } from 'lucide-react';
import clsx from 'clsx';
import logoSmartexSustway from '../assets/brand/logo-smartex-sustway.png';
import { useApiAuth } from '../auth/useApiAuth';

const LIENS = [
  { vers: '/app', libelle: 'Entreprises', icone: Building2, fin: true },
  { vers: '/app/profil', libelle: 'Profil & sécurité', icone: UserCog },
];

/** Mise en page de l'espace connecté — navigation réelle uniquement (Entreprises, Profil). */
export default function Layout() {
  const { utilisateur, deconnecter } = useApiAuth();
  const [ouvert, setOuvert] = useState(false);
  const navigate = useNavigate();

  if (!utilisateur) return null;

  return (
    <div className="flex h-full">
      <aside
        className={clsx(
          'fixed inset-y-0 left-0 z-40 flex w-72 flex-col border-r border-ink-200 bg-white transition-transform lg:static lg:translate-x-0',
          ouvert ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex items-center justify-between gap-2 border-b border-ink-100 px-5 py-4">
          <div className="flex items-center gap-2">
            <img src={logoSmartexSustway} alt="Smartex Sustway" className="h-9 w-auto" />
            <div>
              <p className="text-sm font-semibold leading-tight">Smartex Sustway</p>
              <p className="text-xs text-ink-500">Évaluation RSE intelligente</p>
            </div>
          </div>
          <button type="button" className="btn-ghost p-1.5 lg:hidden" onClick={() => setOuvert(false)} aria-label="Fermer le menu">
            <X className="h-4 w-4" aria-hidden />
          </button>
        </div>

        <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-4">
          {LIENS.map((lien) => (
            <NavLink
              key={lien.vers}
              to={lien.vers}
              end={lien.fin}
              onClick={() => setOuvert(false)}
              className={({ isActive }) =>
                clsx(
                  'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                  isActive ? 'bg-brand-50 text-brand-700' : 'text-ink-600 hover:bg-ink-50 hover:text-ink-900'
                )
              }
            >
              <lien.icone className="h-4 w-4 shrink-0" aria-hidden />
              <span className="flex-1 truncate">{lien.libelle}</span>
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-ink-100 p-3">
          <div className="flex items-center gap-3 rounded-lg bg-ink-50 px-3 py-2.5">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-600 text-sm font-semibold text-white">
              {utilisateur.prenom?.slice(0, 1)}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">
                {utilisateur.prenom} {utilisateur.nom}
              </p>
              <p className="truncate text-xs text-ink-500">{utilisateur.email}</p>
            </div>
            <button
              type="button"
              className="btn-ghost p-1.5"
              onClick={() => {
                deconnecter();
                navigate('/');
              }}
              aria-label="Se déconnecter"
            >
              <LogOut className="h-4 w-4" aria-hidden />
            </button>
          </div>
        </div>
      </aside>

      {ouvert ? <div className="fixed inset-0 z-30 bg-ink-900/40 lg:hidden" onClick={() => setOuvert(false)} /> : null}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-ink-200 bg-white/90 px-4 py-3 backdrop-blur lg:px-8">
          <button type="button" className="btn-ghost p-1.5 lg:hidden" onClick={() => setOuvert(true)} aria-label="Ouvrir le menu">
            <Menu className="h-5 w-5" aria-hidden />
          </button>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-ink-900">Espace connecté</p>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto px-4 py-6 lg:px-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { BookOpen, Building2, ExternalLink, LifeBuoy, LogOut, Menu, ShieldCheck, UserCog, X } from 'lucide-react';
import clsx from 'clsx';
import logoSmartexSustway from '../assets/brand/logo-smartex-sustway.png';
import { useApiAuth } from '../auth/useApiAuth';
import { ROLE_LIBELLE } from '../auth/permissions';
import { SMARTEX } from '../config/smartex';

const LIENS = [
  { vers: '/app', libelle: 'Entreprises', icone: Building2, fin: true },
  { vers: '/app/profil', libelle: 'Profil & sécurité', icone: UserCog },
];

const LIEN_BACK_OFFICE = { vers: '/app/referentiels', libelle: 'Référentiels', icone: BookOpen };

const JOURS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
const MOIS = [
  'janvier',
  'février',
  'mars',
  'avril',
  'mai',
  'juin',
  'juillet',
  'août',
  'septembre',
  'octobre',
  'novembre',
  'décembre',
];

function dateDuJour() {
  const maintenant = new Date();
  return `${JOURS[maintenant.getDay()]} ${maintenant.getDate()} ${MOIS[maintenant.getMonth()]} ${maintenant.getFullYear()}`;
}

/** Mise en page de l'espace connecté — navigation réelle uniquement (Entreprises, Profil). */
export default function Layout() {
  const { utilisateur, roleCourant, peut, deconnecter } = useApiAuth();
  const [ouvert, setOuvert] = useState(false);
  const navigate = useNavigate();

  if (!utilisateur) return null;

  const initiales = `${utilisateur.prenom?.slice(0, 1) ?? ''}${utilisateur.nom?.slice(0, 1) ?? ''}`.toUpperCase();
  const liens = peut('referentiel:administrer') ? [...LIENS, LIEN_BACK_OFFICE] : LIENS;

  return (
    <div className="flex h-full bg-ink-50">
      <aside
        className={clsx(
          'fixed inset-y-0 left-0 z-40 flex w-72 flex-col border-r border-ink-100 bg-white transition-transform duration-300 lg:static lg:translate-x-0',
          ouvert ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex items-center justify-between gap-2 px-5 py-4">
          <div className="flex items-center gap-2.5">
            <span className="rounded-xl bg-brand-50 p-1.5 ring-1 ring-brand-100">
              <img src={logoSmartexSustway} alt="" className="h-8 w-auto" />
            </span>
            <div>
              <p className="text-sm font-semibold leading-tight text-ink-900">{SMARTEX.produit}</p>
              <p className="text-xs text-ink-500">Par {SMARTEX.editeur}</p>
            </div>
          </div>
          <button type="button" className="btn-ghost p-1.5 lg:hidden" onClick={() => setOuvert(false)} aria-label="Fermer le menu">
            <X className="h-4 w-4" aria-hidden />
          </button>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-3">
          <p className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-wider text-ink-400">Pilotage</p>
          {liens.map((lien) => (
            <NavLink
              key={lien.vers}
              to={lien.vers}
              end={lien.fin}
              onClick={() => setOuvert(false)}
              className={({ isActive }) => clsx('lien-app group', isActive ? 'lien-app-actif' : 'lien-app-inactif')}
            >
              {({ isActive }) => (
                <>
                  <lien.icone
                    className={clsx(
                      'h-4 w-4 shrink-0 transition-transform duration-300 motion-safe:group-hover:scale-110',
                      isActive ? 'text-white' : 'text-ink-400 group-hover:text-brand-600'
                    )}
                    aria-hidden
                  />
                  <span className="flex-1 truncate">{lien.libelle}</span>
                </>
              )}
            </NavLink>
          ))}

          <div className="mt-6 rounded-2xl bg-ink-900 p-4 text-white">
            <p className="flex items-center gap-2 text-sm font-semibold">
              <LifeBuoy className="h-4 w-4 text-brand-300" aria-hidden />
              Besoin d’un accompagnement ?
            </p>
            <p className="mt-1.5 text-xs text-white/70">
              Les experts {SMARTEX.editeur} peuvent auditer vos preuves et prioriser votre plan d’action.
            </p>
            <a
              href={`mailto:${SMARTEX.emailSupport}`}
              className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-brand-300 hover:text-white"
            >
              Contacter un expert
              <ExternalLink className="h-3.5 w-3.5" aria-hidden />
            </a>
          </div>
        </nav>

        <div className="border-t border-ink-100 p-3">
          <div className="flex items-center gap-3 rounded-2xl bg-ink-50 px-3 py-2.5">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-brand-700 text-xs font-semibold text-white">
              {initiales || utilisateur.prenom?.slice(0, 1)}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-ink-900">
                {utilisateur.prenom} {utilisateur.nom}
              </p>
              <p className="truncate text-xs text-ink-500">
                {roleCourant ? ROLE_LIBELLE[roleCourant] ?? roleCourant : utilisateur.email}
              </p>
            </div>
            <button
              type="button"
              className="btn-ghost p-1.5 hover:text-rose-600"
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

      {ouvert ? (
        <div
          className="fixed inset-0 z-30 bg-ink-900/40 backdrop-blur-sm lg:hidden"
          onClick={() => setOuvert(false)}
        />
      ) : null}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-ink-100 bg-white/85 px-4 py-3 backdrop-blur lg:px-8">
          <button type="button" className="btn-ghost p-1.5 lg:hidden" onClick={() => setOuvert(true)} aria-label="Ouvrir le menu">
            <Menu className="h-5 w-5" aria-hidden />
          </button>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-ink-900">Bonjour {utilisateur.prenom}</p>
            <p className="truncate text-xs text-ink-500">{dateDuJour()}</p>
          </div>
          <span className="hidden items-center gap-1.5 rounded-full bg-brand-50 px-3 py-1 text-xs font-medium text-brand-700 ring-1 ring-brand-100 sm:inline-flex">
            <ShieldCheck className="h-3.5 w-3.5" aria-hidden />
            Espace sécurisé
          </span>
        </header>

        <main className="flex-1 overflow-y-auto px-4 py-6 lg:px-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

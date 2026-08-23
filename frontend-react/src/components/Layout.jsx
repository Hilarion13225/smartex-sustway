import { useEffect, useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  BookOpen,
  Building2,
  ClipboardList,
  ClipboardX,
  Columns3,
  Cpu,
  ExternalLink,
  FileText,
  History,
  LayoutDashboard,
  Leaf,
  LifeBuoy,
  ListTodo,
  LogOut,
  Menu,
  ShieldCheck,
  UserCheck,
  UserCog,
  Wallet,
  X,
} from 'lucide-react';
import clsx from 'clsx';
import logoSmartexSustway from '../assets/brand/logo-smartex-sustway.png';
import { useApiAuth } from '../auth/useApiAuth';
import { ROLE_LIBELLE } from '../auth/permissions';
import { SMARTEX } from '../config/smartex';

const CLE_ENTREPRISE_COURANTE = 'smartex.entrepriseCouranteId';

/**
 * Rôles habilités à administrer une entreprise (abonnement, journal) —
 * reflète exactement AutorisationService.ROLES_ADMINISTRATION_ENTREPRISE
 * côté API : ce n'est pas une permission soumise à la formule, mais une
 * capacité de rôle, donc gérée ici par code de rôle plutôt que via peut().
 */
const ROLES_ADMINISTRATION_ENTREPRISE = new Set(['SUPER_ADMIN', 'ADMIN_AUDIT', 'RESPONSABLE_ENTREPRISE']);

/**
 * Navigation groupée façon Pilotage / Audit / Administration. Un lien sans
 * `entreprise: true` est une route globale ; les autres pointent vers
 * l'entreprise actuellement sélectionnée dans le sélecteur de la sidebar
 * (voir plus bas) — notre application est multi-tenant (section 2.2), donc
 * contrairement au prototype de référence il n'existe pas de route plate
 * unique pour « les non-conformités » ou « le journal » : il faut toujours
 * une entreprise de contexte.
 */
const GROUPES = [
  {
    titre: 'Pilotage',
    liens: [
      { vers: '/app', libelle: 'Tableau de bord', icone: LayoutDashboard, fin: true },
      { vers: '/app/comparaison', libelle: 'Comparaison d’entreprises', icone: Columns3 },
      { chemin: (id) => `/app/${id}/rapports`, libelle: 'Rapports RSE', icone: FileText, permission: 'rapport:consulter' },
      {
        chemin: (id) => `/app/${id}/financements-verts`,
        libelle: 'Financements verts',
        icone: Leaf,
        permission: 'bailleur:consulter',
      },
    ],
  },
  {
    titre: 'Audit',
    liens: [
      { vers: '/app/entreprises', libelle: 'Entreprises et sites', icone: Building2 },
      { chemin: (id) => `/app/${id}/audits`, libelle: 'Missions d’audit', icone: ClipboardList },
      { chemin: (id) => `/app/${id}/documents`, libelle: 'Collecte de preuves', icone: FileText },
      { chemin: (id) => `/app/${id}/pipeline-ia`, libelle: 'Pipeline IA', icone: Cpu },
      {
        chemin: (id) => `/app/${id}/revues-expertes`,
        libelle: 'Revue experte',
        icone: UserCheck,
        permission: 'revue:traiter',
      },
      { chemin: (id) => `/app/${id}/non-conformites`, libelle: 'Non-conformités', icone: ClipboardX },
      { chemin: (id) => `/app/${id}/plan-actions`, libelle: 'Plans d’actions', icone: ListTodo },
    ],
  },
  {
    titre: 'Administration',
    liens: [
      { chemin: (id) => `/app/${id}/abonnement`, libelle: 'Abonnement et facturation', icone: Wallet, administration: true },
      { chemin: (id) => `/app/${id}/journal`, libelle: 'Journal d’audit', icone: History, administration: true },
      { vers: '/app/referentiels', libelle: 'Référentiels', icone: BookOpen, permission: 'referentiel:administrer' },
      { vers: '/app/profil', libelle: 'Profil & sécurité', icone: UserCog },
    ],
  },
];

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

/** Mise en page de l'espace connecté — navigation réelle uniquement (pilotage, entreprises, profil). */
export default function Layout() {
  const { utilisateur, entreprises, roleCourant, peut, deconnecter } = useApiAuth();
  const [ouvert, setOuvert] = useState(false);
  const [entrepriseCouranteId, setEntrepriseCouranteId] = useState(
    () => localStorage.getItem(CLE_ENTREPRISE_COURANTE) || ''
  );
  const navigate = useNavigate();

  // Si l'entreprise mémorisée n'est plus dans la liste (accès révoqué,
  // nouvel appareil...) ou qu'aucune n'est encore choisie, on retombe sur
  // la première entreprise de l'utilisateur dès qu'elle est connue.
  useEffect(() => {
    if (entreprises.length === 0) return;
    if (!entreprises.some((e) => e.id === entrepriseCouranteId)) {
      setEntrepriseCouranteId(entreprises[0].id);
    }
  }, [entreprises, entrepriseCouranteId]);

  function choisirEntreprise(id) {
    setEntrepriseCouranteId(id);
    localStorage.setItem(CLE_ENTREPRISE_COURANTE, id);
  }

  if (!utilisateur) return null;

  const initiales = `${utilisateur.prenom?.slice(0, 1) ?? ''}${utilisateur.nom?.slice(0, 1) ?? ''}`.toUpperCase();

  function lienVisible(lien) {
    if (lien.permission && !peut(lien.permission)) return false;
    if (lien.administration && !ROLES_ADMINISTRATION_ENTREPRISE.has(roleCourant)) return false;
    return true;
  }

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

        {entreprises.length > 0 ? (
          <div className="px-5 pb-3">
            <label className="label" htmlFor="entreprise-courante">
              Entreprise
            </label>
            <select
              id="entreprise-courante"
              className="input text-sm"
              value={entrepriseCouranteId}
              onChange={(e) => choisirEntreprise(e.target.value)}
            >
              {entreprises.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.raisonSociale}
                </option>
              ))}
            </select>
          </div>
        ) : null}

        <nav className="flex-1 space-y-4 overflow-y-auto px-3 py-3">
          {GROUPES.map((groupe) => {
            const liensVisibles = groupe.liens.filter(lienVisible);
            if (liensVisibles.length === 0) return null;

            return (
              <div key={groupe.titre}>
                <p className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-wider text-ink-400">{groupe.titre}</p>
                <div className="space-y-1">
                  {liensVisibles.map((lien) => {
                    const cible = lien.chemin ? (entrepriseCouranteId ? lien.chemin(entrepriseCouranteId) : null) : lien.vers;

                    if (!cible) {
                      return (
                        <span
                          key={lien.libelle}
                          className="lien-app lien-app-inactif cursor-not-allowed opacity-40"
                          title="Sélectionnez d’abord une entreprise"
                        >
                          <lien.icone className="h-4 w-4 shrink-0 text-ink-400" aria-hidden />
                          <span className="flex-1 truncate">{lien.libelle}</span>
                        </span>
                      );
                    }

                    return (
                      <NavLink
                        key={lien.libelle}
                        to={cible}
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
                    );
                  })}
                </div>
              </div>
            );
          })}

          <div className="rounded-2xl bg-ink-900 p-4 text-white">
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

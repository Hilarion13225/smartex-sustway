import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { Banknote, BarChart3, Building2, ClipboardCheck, Columns3, Cpu, FileBarChart, FileStack, Gauge, Leaf, ListChecks, LogOut, Menu, ScrollText, ShieldCheck, Sparkles, TriangleAlert, UserCog, Users, X } from 'lucide-react';
import logoSmartexSustway from '../assets/brand/logo-smartex-sustway.png';
import clsx from 'clsx';
import { useAuth } from '../auth/useAuth';
import { ROLE_LIBELLE } from '../auth/permissions';
import { PLAN_LIBELLE } from '../data/formules';
import { Badge } from './ui';
import { NON_CONFORMITES, EVALUATIONS } from '../data/mock';
const enRevue = EVALUATIONS.filter(e => e.statut === 'FILE_REVUE').length;
const GROUPES = [{
  titre: 'Pilotage',
  liens: [{
    vers: '/app',
    libelle: 'Tableau de bord',
    icone: Gauge
  }, {
    vers: '/app/comparaison',
    libelle: 'Comparaison d’entreprises',
    icone: Columns3,
    permission: 'comparaison:consulter'
  }, {
    vers: '/app/rapports',
    libelle: 'Rapports RSE',
    icone: FileBarChart,
    permission: 'rapport:consulter'
  }, {
    vers: '/app/financements-verts',
    libelle: 'Financements verts',
    icone: Leaf,
    permission: 'bailleur:consulter'
  }]
}, {
  titre: 'Audit',
  liens: [{
    vers: '/app/entreprises',
    libelle: 'Entreprises et sites',
    icone: Building2
  }, {
    vers: '/app/audits',
    libelle: 'Missions d’audit',
    icone: ClipboardCheck
  }, {
    vers: '/app/preuves',
    libelle: 'Collecte de preuves',
    icone: FileStack
  }, {
    vers: '/app/pipeline',
    libelle: 'Pipeline IA',
    icone: Cpu
  }, {
    vers: '/app/revue-experte',
    libelle: 'Revue experte',
    icone: ShieldCheck,
    permission: 'revue:traiter',
    compteur: enRevue
  }, {
    vers: '/app/non-conformites',
    libelle: 'Non-conformités',
    icone: TriangleAlert,
    compteur: NON_CONFORMITES.length
  }, {
    vers: '/app/actions',
    libelle: 'Plans d’actions',
    icone: ListChecks
  }]
}, {
  titre: 'Administration',
  liens: [{
    vers: '/app/back-office',
    libelle: 'Back-office référentiel',
    icone: BarChart3,
    permission: 'referentiel:administrer'
  }, {
    vers: '/app/utilisateurs',
    libelle: 'Utilisateurs et rôles',
    icone: Users,
    permission: 'utilisateur:administrer'
  }, {
    vers: '/app/abonnement',
    libelle: 'Abonnement et facturation',
    icone: Banknote
  }, {
    vers: '/app/journal',
    libelle: 'Journal d’audit',
    icone: ScrollText,
    permission: 'journal:consulter'
  }]
}];
export default function Layout() {
  const {
    utilisateur,
    entreprise,
    planActif,
    deconnecter,
    peut
  } = useAuth();
  const [ouvert, setOuvert] = useState(false);
  const navigate = useNavigate();
  if (!utilisateur) return null;
  const tonPlan = planActif === 'AVANCEES' ? 'vert' : planActif === 'STANDARD' ? 'bleu' : 'neutre';
  return <div className="flex h-full">
      <aside className={clsx('fixed inset-y-0 left-0 z-40 flex w-72 flex-col border-r border-ink-200 bg-white transition-transform lg:static lg:translate-x-0', ouvert ? 'translate-x-0' : '-translate-x-full')}>
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

        <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-4">
          {GROUPES.map(groupe => {
          const liens = groupe.liens.filter(lien => !lien.permission || peut(lien.permission));
          if (liens.length === 0) return null;
          return <div key={groupe.titre}>
                <p className="px-3 pb-2 text-xs font-semibold uppercase tracking-wide text-ink-400">{groupe.titre}</p>
                <ul className="space-y-0.5">
                  {liens.map(lien => <li key={lien.vers}>
                      <NavLink to={lien.vers} end={lien.vers === '/app'} onClick={() => setOuvert(false)} className={({
                  isActive
                }) => clsx('flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors', isActive ? 'bg-brand-50 text-brand-700' : 'text-ink-600 hover:bg-ink-50 hover:text-ink-900')}>
                        <lien.icone className="h-4 w-4 shrink-0" aria-hidden />
                        <span className="flex-1 truncate">{lien.libelle}</span>
                        {lien.compteur ? <span className="rounded-full bg-ink-100 px-2 py-0.5 text-xs text-ink-600">{lien.compteur}</span> : null}
                      </NavLink>
                    </li>)}
                </ul>
              </div>;
        })}
        </nav>

        <div className="border-t border-ink-100 p-3">
          <div className="flex items-center gap-3 rounded-lg bg-ink-50 px-3 py-2.5">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-600 text-sm font-semibold text-white">
              {utilisateur.nom.slice(0, 1)}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{utilisateur.nom}</p>
              <p className="truncate text-xs text-ink-500">{ROLE_LIBELLE[utilisateur.role]}</p>
            </div>
            <button type="button" className="btn-ghost p-1.5" onClick={() => {
            deconnecter();
            navigate('/');
          }} aria-label="Se déconnecter">
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
            <p className="truncate text-sm font-medium text-ink-900">{entreprise?.raisonSociale ?? 'Smartex Expertises'}</p>
            <p className="truncate text-xs text-ink-500">Référentiel Smartex Sustway v1.5 — données de démonstration</p>
          </div>
          <Badge ton={tonPlan} icone={Sparkles}>
            Formule {PLAN_LIBELLE[planActif]}
          </Badge>
          <NavLink to="/app/abonnement" className="btn-secondary hidden sm:inline-flex">
            <UserCog className="h-4 w-4" aria-hidden />
            Gérer la formule
          </NavLink>
        </header>

        <main className="flex-1 overflow-y-auto px-4 py-6 lg:px-8">
          <Outlet />
        </main>
      </div>
    </div>;
}

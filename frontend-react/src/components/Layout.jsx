import { useEffect, useMemo, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  BookOpen,
  Building2,
  ChevronDown,
  ClipboardList,
  ClipboardX,
  Columns3,
  FolderKanban,
  FolderOpen,
  FileText,
  History,
  LayoutDashboard,
  Leaf,
  ListTodo,
  Menu,
  Sparkles,
  Trophy,
  Users,
  UserCog,
  Wallet,
  X,
} from 'lucide-react';
import clsx from 'clsx';
import Logo from './Logo';
import { useTheme } from '../theme/ThemeContext';
import EnTeteApp from './EnTeteApp';
import { api } from '../lib/apiClient';
import { useApiAuth } from '../auth/useApiAuth';
import { ROLE_LIBELLE } from '../auth/permissions';
import { SMARTEX } from '../config/smartex';

const CLE_ENTREPRISE_COURANTE = 'smartex.entrepriseCouranteId';
/** Au-delà de ce nombre d'organisations, un champ de recherche précède la liste. */
const SEUIL_RECHERCHE_ENTREPRISE = 6;
const CLE_GROUPES_REPLIES = 'smartex.sidebarGroupesReplies';

/** Au-delà de ce nombre d'entreprises accessibles, le sélecteur affiche un champ de recherche (cas SUPER_ADMIN, accès global). */

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
const GROUPES_AUDIT = [
  {
    titre: 'Navigation',
    liens: [
      { vers: '/app', libelle: 'Vue générale', icone: LayoutDashboard, fin: true },
      {
        chemin: (id) => `/app/${id}/audits`,
        libelle: 'Missions d’audit',
        icone: ClipboardList,
        // Les sous-entrées visent la même page avec un filtre : « à valider »
        // n'est pas un statut du modèle mais une mission entièrement évaluée
        // et non close (voir AuditsListe).
        enfants: [
          { libelle: 'Toutes les missions', chemin: (id) => `/app/${id}/audits` },
          { libelle: 'En cours', chemin: (id) => `/app/${id}/audits?statut=EN_COURS` },
          { libelle: 'À valider', chemin: (id) => `/app/${id}/audits?vue=a-valider` },
          { libelle: 'Terminées', chemin: (id) => `/app/${id}/audits?statut=CLOTURE` },
        ],
      },
      {
        vers: '/app/entreprises',
        libelle: 'Organisations',
        icone: Building2,
        enfants: [
          { libelle: 'Liste', vers: '/app/entreprises' },
          { libelle: 'Profil organisation', chemin: (id) => `/app/${id}` },
          { libelle: 'Historique des audits', chemin: (id) => `/app/${id}/audits` },
        ],
      },
      {
        // Un projet traverse les organisations : il n'a pas d'entreprise de
        // contexte, d'où un chemin global comme le classement.
        vers: '/app/projets',
        libelle: 'Projets',
        icone: FolderKanban,
      },
      { vers: '/app/classement', libelle: 'Classement', icone: Trophy },
      { chemin: (id) => `/app/${id}/pipeline-ia`, libelle: 'Intelligence IA', icone: Sparkles },
      {
        vers: '/app/referentiels',
        libelle: 'Référentiel RSE',
        icone: BookOpen,
        // Réservé aux deux rôles qui administrent le catalogue : depuis V32,
        // `referentiel:administrer` est portée par ADMIN_AUDIT et SUPER_ADMIN.
        permission: 'referentiel:administrer',
        enfants: [{ libelle: 'Domaines et critères', vers: '/app/referentiels' }],
      },
      { chemin: (id) => `/app/${id}/rapports`, libelle: 'Rapports', icone: FileText, permission: 'rapport:consulter' },
      { chemin: (id) => `/app/${id}/utilisateurs`, libelle: 'Équipe', icone: Users },
    ],
  },
  {
    // Les pages hors navigation principale restent listées ici : les retirer
    // les rendrait inatteignables alors qu'elles existent et sont routées.
    titre: 'Suivi',
    liens: [
      { chemin: (id) => `/app/${id}/documents`, libelle: 'Collecte de preuves', icone: FolderOpen , horsPerimetreAudit: true },
      { chemin: (id) => `/app/${id}/non-conformites`, libelle: 'Non-conformités', icone: ClipboardX , horsPerimetreAudit: true },
      { chemin: (id) => `/app/${id}/plan-actions`, libelle: 'Plans d’actions', icone: ListTodo , horsPerimetreAudit: true },
      { vers: '/app/comparaison', libelle: 'Comparaison d’entreprises', icone: Columns3 , horsPerimetreAudit: true },
      {
        chemin: (id) => `/app/${id}/financements-verts`,
        libelle: 'Financements verts',
        icone: Leaf,
        permission: 'bailleur:consulter',
        horsPerimetreAudit: true,
      },
    ],
  },
  {
    titre: 'Paramètres',
    liens: [
      { chemin: (id) => `/app/${id}/abonnement`, libelle: 'Abonnement et facturation', icone: Wallet, administration: true, horsPerimetreAudit: true },
      { chemin: (id) => `/app/${id}/journal`, libelle: 'Journal d’audit', icone: History, administration: true, horsPerimetreAudit: true },
      { vers: '/app/profil', libelle: 'Profil & sécurité', icone: UserCog },
    ],
  },
];

/**
 * Navigation des comptes côté client — responsable d'entreprise et employé.
 *
 * Elle reste organisée par métier (pilotage, audit, administration) et donne
 * accès à toutes les pages opérationnelles : collecte de preuves, écarts,
 * plans d'actions, abonnement. Le responsable audit, lui, suit une
 * arborescence resserrée sur la supervision (voir GROUPES_AUDIT).
 */
const GROUPES_ENTREPRISE = [
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
      { chemin: (id) => `/app/${id}/documents`, libelle: 'Collecte de preuves', icone: FolderOpen },
      { chemin: (id) => `/app/${id}/pipeline-ia`, libelle: 'Pipeline IA', icone: Sparkles },
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

/** Rôles qui conservent la navigation de supervision resserrée. */
const ROLES_NAVIGATION_AUDIT = new Set(['ADMIN_AUDIT', 'SUPER_ADMIN']);

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
  const { estSombre } = useTheme();
  const [filtreEntreprise, setFiltreEntreprise] = useState('');
  const [missionsCourantes, setMissionsCourantes] = useState([]);
  const [ecartsOuverts, setEcartsOuverts] = useState([]);
  const [ouvert, setOuvert] = useState(false);
  const [entrepriseCouranteId, setEntrepriseCouranteId] = useState(
    () => localStorage.getItem(CLE_ENTREPRISE_COURANTE) || ''
  );
  const [groupesReplies, setGroupesReplies] = useState(() => {
    try {
      const brut = localStorage.getItem(CLE_GROUPES_REPLIES);
      return brut ? new Set(JSON.parse(brut)) : new Set();
    } catch {
      return new Set();
    }
  });
  const location = useLocation();
  const navigate = useNavigate();

  /** Repli/dépli d'une section de la sidebar (ex. Pilotage, Audit) — mémorisé par titre de section, persiste entre sessions. */
  function basculerGroupe(titre) {
    setGroupesReplies((precedent) => {
      const suivant = new Set(precedent);
      if (suivant.has(titre)) {
        suivant.delete(titre);
      } else {
        suivant.add(titre);
      }
      try {
        localStorage.setItem(CLE_GROUPES_REPLIES, JSON.stringify([...suivant]));
      } catch {
        // Stockage indisponible (navigation privée...) : le repli reste fonctionnel pour la session en cours, juste non mémorisé.
      }
      return suivant;
    });
  }

  // Filtre par raison sociale / identifiant légal — l'entreprise déjà


  /**
   * L'organisation courante suit l'adresse consultée : ouvrir une mission de
   * l'organisation X fait de X le contexte des liens de navigation. Le
   * sélecteur de la barre latérale a disparu — un seul compte gère toutes les
   * missions, désigner une organisation « courante » à la main n'avait plus
   * lieu d'être. On retombe sur la valeur mémorisée, puis sur la première
   * organisation connue, tant qu'aucune adresse ne désigne d'organisation.
   */
  useEffect(() => {
    if (entreprises.length === 0) return;

    const segments = location.pathname.split('/').filter(Boolean);
    const depuisUrl =
      segments[0] === 'app' && entreprises.some((e) => e.id === segments[1]) ? segments[1] : null;

    const cible =
      depuisUrl ??
      (entreprises.some((e) => e.id === entrepriseCouranteId) ? entrepriseCouranteId : entreprises[0].id);

    if (cible !== entrepriseCouranteId) {
      setEntrepriseCouranteId(cible);
      localStorage.setItem(CLE_ENTREPRISE_COURANTE, cible);
    }
  }, [entreprises, entrepriseCouranteId, location.pathname]);

  if (!utilisateur) return null;


  const formuleCourante = entreprises.find((e) => e.id === entrepriseCouranteId)?.formuleCode;

  // Chargées une fois par organisation : la recherche de l'en-tête porte sur
  // ces missions, et la cloche compte leurs écarts encore ouverts. Sans cette
  // collecte partagée, chacun des deux ferait les mêmes appels de son côté.
  useEffect(() => {
    if (!entrepriseCouranteId) {
      setMissionsCourantes([]);
      setEcartsOuverts([]);
      return;
    }
    let annule = false;

    api
      .get(`/api/v1/entreprises/${entrepriseCouranteId}/audits`)
      .then(async (audits) => {
        if (annule) return;
        setMissionsCourantes(audits ?? []);
        const parMission = await Promise.all(
          (audits ?? []).map((audit) =>
            api
              .get(`/api/v1/entreprises/${entrepriseCouranteId}/audits/${audit.id}/non-conformites`)
              .then((liste) =>
                (liste ?? [])
                  .filter((nc) => nc.statut === 'OUVERTE')
                  .map((nc) => ({
                    id: nc.id,
                    niveau: nc.niveau,
                    libelle: nc.critereLibelle ?? nc.critereCode ?? 'Écart constaté',
                    mission: audit.nom,
                    vers: `/app/${entrepriseCouranteId}/audits/${audit.id}/non-conformites`,
                  }))
              )
              .catch(() => [])
          )
        );
        if (!annule) setEcartsOuverts(parMission.flat());
      })
      .catch(() => {
        if (!annule) {
          setMissionsCourantes([]);
          setEcartsOuverts([]);
        }
      });

    return () => {
      annule = true;
    };
  }, [entrepriseCouranteId]);

  // Le responsable audit supervise, les comptes côté client exploitent :
  // leurs navigations n'ont pas le même périmètre ni le même découpage.
  const groupes = ROLES_NAVIGATION_AUDIT.has(roleCourant) ? GROUPES_AUDIT : GROUPES_ENTREPRISE;

  const entreprisesFiltrees = useMemo(() => {
    const requete = filtreEntreprise.trim().toLowerCase();
    if (!requete) return entreprises;
    const correspondantes = entreprises.filter(
      (e) => e.raisonSociale.toLowerCase().includes(requete) || e.identifiantLegal?.toLowerCase().includes(requete)
    );
    const courante = entreprises.find((e) => e.id === entrepriseCouranteId);
    if (courante && !correspondantes.some((e) => e.id === courante.id)) {
      return [courante, ...correspondantes];
    }
    return correspondantes;
  }, [entreprises, filtreEntreprise, entrepriseCouranteId]);

  /**
   * Si la page courante dépend de l'entreprise (ex. /app/{id}/documents),
   * bascule vers l'équivalent pour la nouvelle entreprise plutôt que de
   * laisser affichées les données de l'ancienne — sans ça, seuls les
   * PROCHAINS clics dans le menu tenaient compte du changement, la page
   * ouverte restait figée sur l'ancienne entreprise. Un segment au-delà du
   * premier (ex. un auditId dans /audits/{auditId}/score) appartient à
   * l'ancienne entreprise et n'a aucun sens pour la nouvelle : on retombe
   * alors sur la page de liste correspondante plutôt que de propager un id
   * invalide.
   */
  function cheminEquivalent(pathname, ancienId, nouvelId) {
    const segments = pathname.split('/').filter(Boolean);
    if (segments[0] !== 'app' || segments[1] !== ancienId) return null;
    const reste = segments.slice(2);
    return reste.length === 0 ? `/app/${nouvelId}` : `/app/${nouvelId}/${reste[0]}`;
  }

  function choisirEntreprise(id) {
    const cible = cheminEquivalent(location.pathname, entrepriseCouranteId, id);
    setEntrepriseCouranteId(id);
    localStorage.setItem(CLE_ENTREPRISE_COURANTE, id);
    if (cible) navigate(cible);
  }

  function lienVisible(lien) {
    if (lien.permission && !peut(lien.permission, formuleCourante)) return false;
    if (lien.administration && !ROLES_ADMINISTRATION_ENTREPRISE.has(roleCourant)) return false;
    // Le périmètre du responsable d'audit est arrêté (voir GROUPES) : les
    // pages qui n'en relèvent pas lui sont masquées. Elles restent visibles
    // pour les autres rôles, qui en ont l'usage — le responsable d'entreprise
    // gère son abonnement, le super-administrateur consulte le journal.
    if (lien.horsPerimetreAudit && roleCourant === 'ADMIN_AUDIT') return false;
    return true;
  }

  return (
    <div className="flex h-full bg-ink-50">
      <aside
        className={clsx(
          'sidebar-tech bordure-sidebar fixed inset-y-0 left-0 z-40 flex w-72 flex-col border-r transition-transform duration-300 lg:static lg:translate-x-0',
          ouvert ? 'translate-x-0' : '-translate-x-full'
        )}
      >

        <div className="relative flex items-center justify-between gap-2 px-5 py-4">
          <div className="flex items-center gap-2.5">
            <div>
              <Logo taille="sm" variante={estSombre ? 'clair' : 'sombre'} />
              <p className="texte-sidebar-attenue text-xs">Par {SMARTEX.editeur}</p>
            </div>
          </div>
          <button
            type="button"
            className="bouton-sidebar rounded-lg p-1.5 transition-colors lg:hidden"
            onClick={() => setOuvert(false)}
            aria-label="Fermer le menu"
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        </div>

        {/* Sélecteur réservé aux comptes côté client : le responsable audit
            voit toutes les organisations et son contexte suit l'adresse. */}
        {!ROLES_NAVIGATION_AUDIT.has(roleCourant) && entreprises.length > 0 ? (
          <div className="relative px-5 pb-3">
            <label
              className="titre-sidebar mb-1.5 block text-[11px] font-semibold uppercase tracking-wider"
              htmlFor="entreprise-courante"
            >
              Entreprise
            </label>
            {entreprises.length > SEUIL_RECHERCHE_ENTREPRISE ? (
              <input
                type="search"
                className="champ-sidebar mb-1.5"
                placeholder="Rechercher une entreprise…"
                value={filtreEntreprise}
                onChange={(e) => setFiltreEntreprise(e.target.value)}
                aria-controls="entreprise-courante"
              />
            ) : null}
            <select
              id="entreprise-courante"
              className="champ-sidebar"
              value={entrepriseCouranteId}
              onChange={(e) => choisirEntreprise(e.target.value)}
            >
              {entreprisesFiltrees.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.raisonSociale}
                </option>
              ))}
            </select>
          </div>
        ) : null}

        <nav className="relative flex-1 space-y-4 overflow-y-auto px-3 py-3">
          {groupes.map((groupe) => {
            const liensVisibles = groupe.liens.filter(lienVisible);
            if (liensVisibles.length === 0) return null;
            const replie = groupesReplies.has(groupe.titre);

            return (
              <div key={groupe.titre}>
                <button
                  type="button"
                  onClick={() => basculerGroupe(groupe.titre)}
                  aria-expanded={!replie}
                  className="titre-sidebar-actionnable flex w-full items-center justify-between rounded-lg px-3 pb-2 text-[11px] font-semibold uppercase tracking-wider transition-colors"
                >
                  <span>{groupe.titre}</span>
                  <ChevronDown
                    className={clsx('h-3.5 w-3.5 shrink-0 transition-transform duration-200', replie && '-rotate-90')}
                    aria-hidden
                  />
                </button>
                {replie ? null : (
                <div className="space-y-1">
                  {liensVisibles.map((lien) => {
                    const cible = lien.chemin ? (entrepriseCouranteId ? lien.chemin(entrepriseCouranteId) : null) : lien.vers;

                    if (!cible) {
                      return (
                        <span
                          key={lien.libelle}
                          className="lien-app texte-sidebar-attenue cursor-not-allowed opacity-40"
                          title="Sélectionnez d’abord une entreprise"
                        >
                          <lien.icone className="texte-sidebar-attenue h-4 w-4 shrink-0" aria-hidden />
                          <span className="flex-1 truncate">{lien.libelle}</span>
                        </span>
                      );
                    }

                    const cibleParente = cible;
                    const enfantsVisibles = (lien.enfants ?? [])
                      .map((enfant) => ({
                        libelle: enfant.libelle,
                        cible: enfant.chemin
                          ? entrepriseCouranteId
                            ? enfant.chemin(entrepriseCouranteId)
                            : null
                          : enfant.vers,
                      }))
                      .filter((enfant) => enfant.cible);
                    const sectionOuverte =
                      enfantsVisibles.length > 0 &&
                      location.pathname.startsWith(cibleParente.split('?')[0]);

                    return (
                      <div key={lien.libelle}>
                      <NavLink
                        to={cible}
                        end={lien.fin}
                        onClick={() => setOuvert(false)}
                        className={({ isActive }) =>
                          clsx('lien-app group', isActive ? 'lien-app-actif' : 'lien-sidebar-inactif')
                        }
                      >
                        {({ isActive }) => (
                          <>
                            <lien.icone
                              className={clsx(
                                'h-4 w-4 shrink-0 transition-transform duration-300 motion-safe:group-hover:scale-110',
                                isActive ? 'text-brand-600 dark:text-brand-300' : 'icone-sidebar'
                              )}
                              aria-hidden
                            />
                            <span className="flex-1 truncate">{lien.libelle}</span>
                          </>
                        )}
                      </NavLink>

                      {sectionOuverte ? (
                        <ul className="mt-1 space-y-0.5 border-l border-ink-200 pl-3 dark:border-white/10">
                          {enfantsVisibles.map((enfant) => {
                            const actif =
                              location.pathname + location.search === enfant.cible;
                            return (
                              <li key={enfant.libelle}>
                                <NavLink
                                  to={enfant.cible}
                                  onClick={() => setOuvert(false)}
                                  className={clsx(
                                    'block rounded-lg px-3 py-1.5 text-[13px] transition-colors',
                                    actif
                                      ? 'font-semibold text-brand-700 dark:text-brand-300'
                                      : 'lien-sidebar-inactif'
                                  )}
                                >
                                  {enfant.libelle}
                                </NavLink>
                              </li>
                            );
                          })}
                        </ul>
                      ) : null}
                      </div>
                    );
                  })}
                </div>
                )}
              </div>
            );
          })}

        </nav>

      </aside>

      {ouvert ? (
        <div
          className="fixed inset-0 z-30 bg-black/40 backdrop-blur-sm lg:hidden"
          onClick={() => setOuvert(false)}
        />
      ) : null}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex h-[72px] items-center gap-3 border-b border-ink-100 bg-surface/90 px-4 backdrop-blur lg:px-8">
          <button type="button" className="btn-ghost p-1.5 lg:hidden" onClick={() => setOuvert(true)} aria-label="Ouvrir le menu">
            <Menu className="h-5 w-5" aria-hidden />
          </button>
          {/* Sous `md`, la recherche disparaît : le titre reprend sa place
              pour que l'en-tête ne se réduise pas à une rangée d'icônes. */}
          <div className="min-w-0 flex-1 md:hidden">
            <p className="truncate text-sm font-semibold text-ink-900">Bonjour {utilisateur.prenom}</p>
            <p className="truncate text-xs text-ink-500">{dateDuJour()}</p>
          </div>
          <EnTeteApp
            utilisateur={utilisateur}
            roleLibelle={ROLE_LIBELLE[roleCourant] ?? 'Accès en cours d’attribution'}
            entreprises={entreprises}
            missions={missionsCourantes}
            alertes={ecartsOuverts}
            entrepriseCouranteId={entrepriseCouranteId}
            surDeconnexion={deconnecter}
          />
        </header>

        <main className="flex-1 overflow-y-auto px-4 py-6 lg:px-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

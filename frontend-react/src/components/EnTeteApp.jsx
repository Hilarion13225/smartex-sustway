import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Bell, Building2, ChevronDown, ClipboardList, HelpCircle, LogOut, Search, UserCog } from 'lucide-react';
import clsx from 'clsx';
import BasculeTheme from './BasculeTheme';
import { SMARTEX } from '../config/smartex';

/** Ferme un panneau au clic extérieur et à la touche Échap. */
function useFermetureExterieure(ouvert, fermer) {
  const conteneur = useRef(null);

  useEffect(() => {
    if (!ouvert) return undefined;
    const surClic = (evenement) => {
      if (conteneur.current && !conteneur.current.contains(evenement.target)) fermer();
    };
    const surTouche = (evenement) => {
      if (evenement.key === 'Escape') fermer();
    };
    document.addEventListener('mousedown', surClic);
    document.addEventListener('keydown', surTouche);
    return () => {
      document.removeEventListener('mousedown', surClic);
      document.removeEventListener('keydown', surTouche);
    };
  }, [ouvert, fermer]);

  return conteneur;
}

/** Initiales affichées dans la pastille de profil. */
function initiales(utilisateur) {
  const prenom = utilisateur?.prenom?.[0] ?? '';
  const nom = utilisateur?.nom?.[0] ?? '';
  return (prenom + nom).toUpperCase() || '?';
}

const TONS_NIVEAU = {
  CRITIQUE: 'bg-brand-600',
  MAJEURE: 'bg-amber-500',
  MODEREE: 'bg-amber-400',
  MINEURE: 'bg-ink-300',
};

/**
 * En-tête de l'espace connecté : recherche globale, alertes, aide et profil.
 *
 * La recherche est locale — l'API n'expose pas d'endpoint de recherche — et
 * porte sur les organisations accessibles et les missions de l'organisation
 * courante, déjà chargées par le parent. Les alertes comptent les
 * non-conformités réellement ouvertes, jamais un nombre décoratif.
 */
export default function EnTeteApp({
  utilisateur,
  roleLibelle,
  entreprises,
  missions,
  alertes,
  entrepriseCouranteId,
  surDeconnexion,
}) {
  const navigate = useNavigate();
  const [requete, setRequete] = useState('');
  const [rechercheOuverte, setRechercheOuverte] = useState(false);
  const [alertesOuvertes, setAlertesOuvertes] = useState(false);
  const [profilOuvert, setProfilOuvert] = useState(false);

  const refRecherche = useFermetureExterieure(rechercheOuverte, () => setRechercheOuverte(false));
  const refAlertes = useFermetureExterieure(alertesOuvertes, () => setAlertesOuvertes(false));
  const refProfil = useFermetureExterieure(profilOuvert, () => setProfilOuvert(false));

  const resultats = useMemo(() => {
    const terme = requete.trim().toLowerCase();
    if (terme.length < 2) return [];

    const organisations = entreprises
      .filter((e) => e.raisonSociale?.toLowerCase().includes(terme))
      .slice(0, 4)
      .map((e) => ({
        cle: `e-${e.id}`,
        icone: Building2,
        libelle: e.raisonSociale,
        detail: 'Organisation',
        vers: `/app/${e.id}`,
      }));

    const trouvees = missions
      .filter((m) => m.nom?.toLowerCase().includes(terme))
      .slice(0, 5)
      .map((m) => ({
        cle: `m-${m.id}`,
        icone: ClipboardList,
        libelle: m.nom,
        detail: `Mission · ${m.referentielCode}`,
        vers: `/app/${entrepriseCouranteId}/audits/${m.id}`,
      }));

    return [...organisations, ...trouvees];
  }, [requete, entreprises, missions, entrepriseCouranteId]);

  function ouvrirResultat(vers) {
    setRequete('');
    setRechercheOuverte(false);
    navigate(vers);
  }

  return (
    <>
      {/* --- Recherche globale --- */}
      <div ref={refRecherche} className="relative hidden min-w-0 flex-1 md:block">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400"
          aria-hidden
        />
        <input
          type="search"
          value={requete}
          onChange={(evenement) => {
            setRequete(evenement.target.value);
            setRechercheOuverte(true);
          }}
          onFocus={() => setRechercheOuverte(true)}
          placeholder="Rechercher une mission, une organisation…"
          aria-label="Rechercher une mission ou une organisation"
          className="w-full max-w-xl rounded-xl border border-ink-200 bg-ink-50 py-2 pl-9 pr-3 text-sm text-ink-800 outline-none transition placeholder:text-ink-400 focus:border-brand-400 focus:bg-surface focus:ring-4 focus:ring-brand-100 dark:focus:ring-brand-900/40"
        />

        {rechercheOuverte && requete.trim().length >= 2 ? (
          <div className="absolute left-0 top-full z-30 mt-2 w-full max-w-xl overflow-hidden rounded-xl border border-ink-100 bg-surface shadow-soft">
            {resultats.length === 0 ? (
              <p className="px-4 py-3 text-sm text-ink-500">Aucun résultat.</p>
            ) : (
              <ul className="max-h-80 overflow-y-auto py-1">
                {resultats.map((resultat) => (
                  <li key={resultat.cle}>
                    <button
                      type="button"
                      onClick={() => ouvrirResultat(resultat.vers)}
                      className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-ink-100"
                    >
                      <resultat.icone className="h-4 w-4 shrink-0 text-ink-400" aria-hidden />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm text-ink-800">{resultat.libelle}</span>
                        <span className="block truncate text-xs text-ink-500">{resultat.detail}</span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ) : null}
      </div>

      {/* --- Alertes --- */}
      <div ref={refAlertes} className="relative">
        <button
          type="button"
          onClick={() => setAlertesOuvertes((v) => !v)}
          aria-expanded={alertesOuvertes}
          aria-label={`Alertes (${alertes.length})`}
          className="relative rounded-lg p-2 text-ink-500 transition-colors hover:bg-ink-100 hover:text-ink-800"
        >
          <Bell className="h-5 w-5" aria-hidden />
          {alertes.length > 0 ? (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-brand-600 px-1 text-[10px] font-semibold text-white">
              {alertes.length > 9 ? '9+' : alertes.length}
            </span>
          ) : null}
        </button>

        {alertesOuvertes ? (
          <div className="absolute right-0 top-full z-30 mt-2 w-80 overflow-hidden rounded-xl border border-ink-100 bg-surface shadow-soft">
            <p className="border-b border-ink-100 px-4 py-3 text-sm font-semibold text-ink-900">
              Écarts ouverts
            </p>
            {alertes.length === 0 ? (
              <p className="px-4 py-4 text-sm text-ink-500">
                Aucun écart ouvert sur cette organisation.
              </p>
            ) : (
              <ul className="max-h-80 divide-y divide-ink-100 overflow-y-auto">
                {alertes.slice(0, 6).map((alerte) => (
                  <li key={alerte.id}>
                    <Link
                      to={alerte.vers}
                      onClick={() => setAlertesOuvertes(false)}
                      className="flex items-start gap-2.5 px-4 py-3 transition-colors hover:bg-ink-50"
                    >
                      <span
                        className={clsx(
                          'mt-1.5 h-2 w-2 shrink-0 rounded-full',
                          TONS_NIVEAU[alerte.niveau] ?? 'bg-ink-300'
                        )}
                      />
                      <span className="min-w-0">
                        <span className="block truncate text-sm text-ink-800">{alerte.libelle}</span>
                        <span className="block text-xs text-ink-500">{alerte.mission}</span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ) : null}
      </div>

      {/* --- Aide --- */}
      <a
        href={`mailto:${SMARTEX.emailSupport}`}
        aria-label="Contacter le support"
        title="Besoin d’aide ?"
        className="rounded-lg p-2 text-ink-500 transition-colors hover:bg-ink-100 hover:text-ink-800"
      >
        <HelpCircle className="h-5 w-5" aria-hidden />
      </a>

      <BasculeTheme />

      {/* --- Profil --- */}
      <div ref={refProfil} className="relative">
        <button
          type="button"
          onClick={() => setProfilOuvert((v) => !v)}
          aria-expanded={profilOuvert}
          className="flex items-center gap-2.5 rounded-xl px-1.5 py-1 transition-colors hover:bg-ink-100"
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-600 text-xs font-semibold text-white">
            {initiales(utilisateur)}
          </span>
          <span className="hidden min-w-0 text-left sm:block">
            <span className="block truncate text-sm font-medium text-ink-900">
              {utilisateur.prenom} {utilisateur.nom}
            </span>
            <span className="block truncate text-xs text-ink-500">{roleLibelle}</span>
          </span>
          <ChevronDown
            className={clsx(
              'hidden h-4 w-4 shrink-0 text-ink-400 transition-transform sm:block',
              profilOuvert && 'rotate-180'
            )}
            aria-hidden
          />
        </button>

        {profilOuvert ? (
          <div className="absolute right-0 top-full z-30 mt-2 w-56 overflow-hidden rounded-xl border border-ink-100 bg-surface shadow-soft">
            <div className="border-b border-ink-100 px-4 py-3">
              <p className="truncate text-sm font-medium text-ink-900">
                {utilisateur.prenom} {utilisateur.nom}
              </p>
              <p className="truncate text-xs text-ink-500">{utilisateur.email}</p>
            </div>
            <Link
              to="/app/profil"
              onClick={() => setProfilOuvert(false)}
              className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-ink-700 transition-colors hover:bg-ink-100"
            >
              <UserCog className="h-4 w-4 text-ink-400" aria-hidden />
              Profil &amp; sécurité
            </Link>
            <button
              type="button"
              onClick={surDeconnexion}
              className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-rose-600 transition-colors hover:bg-rose-50 dark:hover:bg-rose-500/10"
            >
              <LogOut className="h-4 w-4" aria-hidden />
              Se déconnecter
            </button>
          </div>
        ) : null}
      </div>
    </>
  );
}

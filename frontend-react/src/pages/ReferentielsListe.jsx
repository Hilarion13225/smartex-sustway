import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  BookOpen,
  Boxes,
  Clock,
  Download,
  Layers,
  ListChecks,
  PlusCircle,
  Search,
  Sparkles,
} from 'lucide-react';
import clsx from 'clsx';
import SustwayLoader from '../components/SustwayLoader';
import Revele from '../components/Revele';
import Breadcrumb from '../components/Breadcrumb';
import { Alerte, Badge, Card, Loader, PageTitre, Vide } from '../components/ui';
import { GraphiqueAnneau } from '../components/charts';
import CarteKpi from '../components/tableau-bord/CarteKpi';
import StructureReferentiel from '../components/referentiel/StructureReferentiel';
import { FAMILLES, TYPES_REFERENTIEL, typeReferentiel } from '../components/referentiel/typesReferentiel';
import { lireDerniersConsultes } from '../components/referentiel/derniersConsultes';
import { api, ApiError } from '../lib/apiClient';
import { useApiAuth } from '../auth/useApiAuth';
import { exporterCsv, formaterDate } from '../lib/export';
import { TONS_STATUT_REFERENTIEL as TONS_STATUT } from '../lib/tonsStatuts';

const STATUTS = ['ACTIF', 'INACTIF', 'SUSPENDU', 'ARCHIVE'];

/**
 * Catalogue central des référentiels d'audit.
 *
 * La page réunit tous les cadres exploitables par la plateforme — internes,
 * bailleurs, standards internationaux — avec leur volumétrie réelle et leur
 * usage en mission. Elle n'est pas réservée au RSE : le type d'un référentiel
 * n'est qu'un attribut parmi d'autres.
 *
 * La consultation est ouverte à tout compte authentifié ; création et
 * modification restent réservées à SUPER_ADMIN (`referentiel:administrer`,
 * aligné sur @RolesAllowed côté ReferentielResource).
 */
export default function ReferentielsListe() {
  const { peut, entreprises } = useApiAuth();
  const peutAdministrer = peut('referentiel:administrer');

  const [referentiels, setReferentiels] = useState(null);
  const [volumetries, setVolumetries] = useState({});
  const [usages, setUsages] = useState(null);
  const [chargement, setChargement] = useState(true);
  const [erreurGlobale, setErreurGlobale] = useState(null);
  const [afficherFormulaire, setAfficherFormulaire] = useState(false);

  const [recherche, setRecherche] = useState('');
  const [filtreStatut, setFiltreStatut] = useState('');
  const [filtreType, setFiltreType] = useState('');
  const [filtreFamille, setFiltreFamille] = useState('');

  const derniersConsultes = useMemo(() => lireDerniersConsultes(), []);

  const rafraichir = useCallback(() => {
    setChargement(true);
    setErreurGlobale(null);
    api
      .get('/api/v1/referentiels')
      .then(async (liste) => {
        setReferentiels(liste);
        setChargement(false);

        // Domaines et critères ne figurent pas dans ReferentielDto : ils sont
        // comptés après coup, pour que la liste s'affiche sans attendre.
        const comptes = await Promise.all(
          (liste ?? []).map(async (referentiel) => {
            const [domaines, criteres] = await Promise.all([
              api.get(`/api/v1/referentiels/${referentiel.code}/domaines`).catch(() => []),
              api.get(`/api/v1/referentiels/${referentiel.code}/criteres`).catch(() => []),
            ]);
            return [
              referentiel.code,
              {
                domaines: (domaines ?? []).length,
                criteres: (criteres ?? []).filter((c) => c.actif).length,
              },
            ];
          })
        );
        setVolumetries(Object.fromEntries(comptes));
      })
      .catch((err) => {
        setErreurGlobale(err instanceof ApiError ? err.message : 'Erreur inattendue');
        setChargement(false);
      });
  }, []);

  useEffect(() => {
    rafraichir();
  }, [rafraichir]);

  /** Usage réel : nombre de missions ouvertes sur chaque référentiel. */
  useEffect(() => {
    if (entreprises.length === 0) return undefined;
    let annule = false;
    Promise.all(
      entreprises.map((entreprise) =>
        api.get(`/api/v1/entreprises/${entreprise.id}/audits`).catch(() => [])
      )
    ).then((resultats) => {
      if (annule) return;
      const compte = {};
      resultats.flat().forEach((audit) => {
        compte[audit.referentielCode] = (compte[audit.referentielCode] ?? 0) + 1;
      });
      setUsages(compte);
    });
    return () => {
      annule = true;
    };
  }, [entreprises]);

  const lignes = useMemo(
    () =>
      (referentiels ?? []).map((referentiel) => {
        const type = typeReferentiel(referentiel.type);
        return {
          ...referentiel,
          typeLibelle: type.libelle,
          organisme: type.organisme,
          couleur: type.couleur,
          famille: type.famille,
          domaines: volumetries[referentiel.code]?.domaines ?? null,
          criteres: volumetries[referentiel.code]?.criteres ?? null,
          missions: usages?.[referentiel.code] ?? 0,
        };
      }),
    [referentiels, volumetries, usages]
  );

  const lignesFiltrees = useMemo(() => {
    const terme = recherche.trim().toLowerCase();
    return lignes.filter((ligne) => {
      if (
        terme &&
        !`${ligne.nom} ${ligne.code} ${ligne.organisme} ${ligne.typeLibelle}`
          .toLowerCase()
          .includes(terme)
      ) {
        return false;
      }
      if (filtreStatut && ligne.statut !== filtreStatut) return false;
      if (filtreType && ligne.type !== filtreType) return false;
      if (filtreFamille && ligne.famille !== filtreFamille) return false;
      return true;
    });
  }, [lignes, recherche, filtreStatut, filtreType, filtreFamille]);

  const kpis = useMemo(() => {
    const actifs = lignes.filter((l) => l.statut === 'ACTIF').length;
    const domaines = lignes.reduce((somme, l) => somme + (l.domaines ?? 0), 0);
    const criteres = lignes.reduce((somme, l) => somme + (l.criteres ?? 0), 0);
    const dernierAjout = lignes
      .map((l) => l.createdAt)
      .filter(Boolean)
      .sort((a, b) => new Date(b) - new Date(a))[0];
    return { total: lignes.length, actifs, domaines, criteres, dernierAjout };
  }, [lignes]);

  /** Répartition par type, limitée aux types réellement présents. */
  const repartition = useMemo(() => {
    const compte = new Map();
    lignes.forEach((ligne) => {
      const actuel =
        compte.get(ligne.type) ?? { libelle: ligne.typeLibelle, couleur: ligne.couleur, nombre: 0 };
      actuel.nombre += 1;
      compte.set(ligne.type, actuel);
    });
    const entrees = [...compte.values()].sort((a, b) => b.nombre - a.nombre);
    return {
      labels: entrees.map((e) => e.libelle),
      data: entrees.map((e) => e.nombre),
      couleurs: entrees.map((e) => e.couleur),
    };
  }, [lignes]);

  const plusUtilises = useMemo(
    () =>
      [...lignes].filter((l) => l.missions > 0).sort((a, b) => b.missions - a.missions).slice(0, 5),
    [lignes]
  );

  const nombreParFamille = useMemo(() => {
    const compte = {};
    lignes.forEach((ligne) => {
      compte[ligne.famille] = (compte[ligne.famille] ?? 0) + 1;
    });
    return compte;
  }, [lignes]);

  function exporterCatalogue() {
    exporterCsv(
      'referentiels.csv',
      ['Code', 'Nom', 'Type', 'Organisme', 'Version', 'Domaines', 'Critères', 'Statut', 'Missions'],
      lignesFiltrees.map((l) => [
        l.code,
        l.nom,
        l.typeLibelle,
        l.organisme,
        l.version,
        l.domaines ?? '',
        l.criteres ?? '',
        l.statut,
        l.missions,
      ])
    );
  }

  async function changerStatut(code, statut) {
    setErreurGlobale(null);
    try {
      await api.put(`/api/v1/referentiels/${code}`, { statut });
      rafraichir();
    } catch (err) {
      setErreurGlobale(err instanceof ApiError ? err.message : 'Erreur inattendue');
    }
  }

  if (chargement) return <Loader message="Chargement du catalogue…" />;

  return (
    <div className="space-y-6">
      <Breadcrumb
        elements={[
          { libelle: 'Tableau de bord', vers: '/app' },
          { libelle: 'Référentiels' },
        ]}
      />

      <PageTitre
        icone={BookOpen}
        titre="Référentiels"
        description="Centralisez et gérez les référentiels, normes et cadres utilisés pour vos audits."
        actions={
          <>
            {peutAdministrer ? (
              <button type="button" className="btn-primary" onClick={() => setAfficherFormulaire((v) => !v)}>
                <PlusCircle className="h-4 w-4" aria-hidden />
                Nouveau référentiel
              </button>
            ) : null}
            <button type="button" className="btn-secondary" onClick={exporterCatalogue}>
              <Download className="h-4 w-4" aria-hidden />
              Exporter
            </button>
          </>
        }
      />

      {erreurGlobale ? <Alerte ton="rouge">{erreurGlobale}</Alerte> : null}

      {afficherFormulaire && peutAdministrer ? (
        <Revele>
          <Card className="p-5">
            <NouveauReferentielFormulaire
              onCree={() => {
                setAfficherFormulaire(false);
                rafraichir();
              }}
            />
          </Card>
        </Revele>
      ) : null}

      {/* --- Indicateurs --- */}
      <Revele>
        <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-5">
          <CarteKpi
            icone={BookOpen}
            ton="marque"
            valeur={kpis.total}
            libelle="Référentiels disponibles"
            precision="Tous types confondus"
          />
          <CarteKpi
            icone={Boxes}
            ton="succes"
            valeur={kpis.actifs}
            libelle="Référentiels actifs"
            precision="Utilisables en mission"
          />
          <CarteKpi
            icone={Layers}
            valeur={kpis.domaines}
            libelle="Domaines"
            precision="Tous référentiels confondus"
          />
          <CarteKpi
            icone={ListChecks}
            valeur={kpis.criteres}
            libelle="Critères"
            precision="Critères actifs d’évaluation"
          />
          <CarteKpi
            icone={Clock}
            valeur={kpis.dernierAjout ? formaterDate(kpis.dernierAjout) : '—'}
            libelle="Dernier ajout"
            precision="Entrée la plus récente au catalogue"
          />
        </div>
      </Revele>

      {/* --- Catalogue et panneaux --- */}
      <Revele delai={60}>
        <div className="grid gap-5 xl:grid-cols-[minmax(0,2.4fr)_minmax(0,1fr)]">
          <Card className="min-w-0 p-5">
            <h2 className="text-base font-semibold text-ink-900">Référentiels disponibles</h2>

            <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,2fr)_repeat(2,minmax(0,1fr))]">
              <div className="relative">
                <Search
                  className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400"
                  aria-hidden
                />
                <input
                  type="search"
                  className="input pl-9"
                  placeholder="Rechercher un référentiel, un organisme…"
                  aria-label="Rechercher un référentiel"
                  value={recherche}
                  onChange={(e) => setRecherche(e.target.value)}
                />
              </div>
              <select
                className="input"
                aria-label="Filtrer par statut"
                value={filtreStatut}
                onChange={(e) => setFiltreStatut(e.target.value)}
              >
                <option value="">Tous les statuts</option>
                {STATUTS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
              <select
                className="input"
                aria-label="Filtrer par type"
                value={filtreType}
                onChange={(e) => setFiltreType(e.target.value)}
              >
                <option value="">Tous les types</option>
                {TYPES_REFERENTIEL.map((t) => (
                  <option key={t.code} value={t.code}>
                    {t.libelle}
                  </option>
                ))}
              </select>
            </div>

            {filtreFamille ? (
              <p className="mt-3 flex items-center gap-2 text-xs text-ink-600">
                Filtré sur « {FAMILLES.find((f) => f.cle === filtreFamille)?.libelle} »
                <button
                  type="button"
                  onClick={() => setFiltreFamille('')}
                  className="font-medium text-brand-600 hover:text-brand-700 dark:text-brand-400"
                >
                  Retirer
                </button>
              </p>
            ) : null}

            <div className="mt-4 hidden overflow-x-auto lg:block">
              {lignesFiltrees.length === 0 ? (
                <Vide message="Aucun référentiel ne correspond à ces critères." />
              ) : (
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-ink-100">
                      <th className="th">Référentiel</th>
                      <th className="th">Type</th>
                      <th className="th">Version</th>
                      <th className="th">Domaines</th>
                      <th className="th">Critères</th>
                      <th className="th">Missions</th>
                      <th className="th">Statut</th>
                      <th className="th sr-only">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-ink-100">
                    {lignesFiltrees.map((ligne) => (
                      <tr key={ligne.id} className="transition-colors hover:bg-ink-50">
                        <td className="td max-w-[16rem]">
                          <span className="flex items-center gap-2.5">
                            <span
                              className="h-6 w-1 shrink-0 rounded-full"
                              style={{ backgroundColor: ligne.couleur }}
                              aria-hidden
                            />
                            <span className="min-w-0">
                              <span
                                className="block truncate font-medium text-ink-900"
                                title={ligne.nom}
                              >
                                {ligne.nom}
                              </span>
                              <span className="block truncate font-mono text-[11px] text-ink-400">
                                {ligne.code}
                              </span>
                            </span>
                          </span>
                        </td>
                        <td className="td">
                          <span className="block text-sm text-ink-700">{ligne.typeLibelle}</span>
                          <span
                            className="block max-w-[12rem] truncate text-xs text-ink-400"
                            title={ligne.organisme}
                          >
                            {ligne.organisme}
                          </span>
                        </td>
                        <td className="td whitespace-nowrap tabular-nums">{ligne.version}</td>
                        <td className="td tabular-nums">{ligne.domaines ?? '…'}</td>
                        <td className="td tabular-nums">{ligne.criteres ?? '…'}</td>
                        <td className="td tabular-nums">{ligne.missions}</td>
                        <td className="td">
                          {peutAdministrer ? (
                            <select
                              className="input w-auto py-1 text-xs"
                              aria-label={`Statut du référentiel ${ligne.code}`}
                              value={ligne.statut}
                              onChange={(e) => changerStatut(ligne.code, e.target.value)}
                            >
                              {STATUTS.map((s) => (
                                <option key={s} value={s}>
                                  {s}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <Badge ton={TONS_STATUT[ligne.statut] ?? 'neutre'}>{ligne.statut}</Badge>
                          )}
                        </td>
                        <td className="td text-right">
                          <Link to={`/app/referentiels/${ligne.code}`} className="btn-ghost">
                            {peutAdministrer ? 'Gérer' : 'Consulter'}
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Sous `lg`, une carte par référentiel : le tableau à huit
                colonnes mesure près de 1100 px et n'a aucun sens sur un
                téléphone. */}
            <ul className="mt-4 space-y-3 lg:hidden">
              {lignesFiltrees.map((ligne) => (
                <li key={ligne.id}>
                  <Link
                    to={`/app/referentiels/${ligne.code}`}
                    className="block rounded-2xl border border-ink-100 p-4 transition-colors hover:border-brand-200 hover:bg-ink-50"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex min-w-0 items-start gap-2.5">
                        <span
                          className="mt-0.5 h-8 w-1 shrink-0 rounded-full"
                          style={{ backgroundColor: ligne.couleur }}
                          aria-hidden
                        />
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-ink-900">{ligne.nom}</p>
                          <p className="truncate text-xs text-ink-500">
                            {ligne.typeLibelle} · v{ligne.version}
                          </p>
                        </div>
                      </div>
                      <Badge ton={TONS_STATUT[ligne.statut] ?? 'neutre'}>{ligne.statut}</Badge>
                    </div>
                    <dl className="mt-3 grid grid-cols-3 gap-2 text-center">
                      {[
                        ['Domaines', ligne.domaines],
                        ['Critères', ligne.criteres],
                        ['Missions', ligne.missions],
                      ].map(([libelle, valeur]) => (
                        <div key={libelle} className="rounded-xl bg-ink-50 py-2">
                          <dd className="text-sm font-semibold tabular-nums text-ink-900">
                            {valeur ?? '…'}
                          </dd>
                          <dt className="text-[11px] text-ink-500">{libelle}</dt>
                        </div>
                      ))}
                    </dl>
                  </Link>
                </li>
              ))}
            </ul>
          </Card>

          {/* --- Panneaux latéraux --- */}
          <div className="space-y-5">
            <Card className="p-5">
              <h2 className="text-base font-semibold text-ink-900">Répartition par type</h2>
              <div className="mt-4 h-56">
                {repartition.data.length === 0 ? (
                  <p className="text-xs text-ink-500">Aucun référentiel au catalogue.</p>
                ) : (
                  <GraphiqueAnneau
                    labels={repartition.labels}
                    data={repartition.data}
                    couleurs={repartition.couleurs}
                  />
                )}
              </div>
            </Card>

            <Card className="p-5">
              <h2 className="text-base font-semibold text-ink-900">Les plus utilisés</h2>
              <p className="mt-0.5 text-xs text-ink-500">Nombre de missions ouvertes dessus.</p>
              {usages === null ? (
                <p className="mt-3 text-xs text-ink-400">Calcul en cours…</p>
              ) : plusUtilises.length === 0 ? (
                <p className="mt-3 text-xs text-ink-500">Aucune mission ouverte pour l’instant.</p>
              ) : (
                <ul className="mt-3 space-y-2.5">
                  {plusUtilises.map((ligne) => (
                    <li key={ligne.code} className="flex items-center gap-3">
                      <span
                        className="min-w-0 flex-1 truncate text-sm text-ink-700"
                        title={ligne.nom}
                      >
                        {ligne.typeLibelle}
                      </span>
                      <span className="shrink-0 text-xs font-medium tabular-nums text-ink-600">
                        {ligne.missions} mission{ligne.missions > 1 ? 's' : ''}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </Card>

            <Card className="p-5">
              <h2 className="text-base font-semibold text-ink-900">Derniers consultés</h2>
              {derniersConsultes.length === 0 ? (
                <p className="mt-3 text-xs text-ink-500">
                  Les référentiels que vous ouvrez apparaîtront ici.
                </p>
              ) : (
                <ul className="mt-3 space-y-1.5">
                  {derniersConsultes.map((consulte) => (
                    <li key={consulte.code}>
                      <Link
                        to={`/app/referentiels/${consulte.code}`}
                        className="block truncate rounded-lg px-2 py-1.5 text-sm text-ink-700 transition-colors hover:bg-ink-100"
                      >
                        {consulte.nom}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>
        </div>
      </Revele>

      {/* --- Familles --- */}
      <Revele delai={90}>
        <section>
          <h2 className="text-base font-semibold text-ink-900">Explorer par catégorie</h2>
          <p className="mt-0.5 text-xs text-ink-500">
            Filtre le catalogue sur les référentiels de la famille choisie.
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            {FAMILLES.map((famille) => {
              const nombre = nombreParFamille[famille.cle] ?? 0;
              const actif = filtreFamille === famille.cle;
              return (
                <button
                  key={famille.cle}
                  type="button"
                  onClick={() => setFiltreFamille(actif ? '' : famille.cle)}
                  aria-pressed={actif}
                  className={clsx(
                    'rounded-2xl border p-4 text-left transition-colors',
                    actif
                      ? 'border-brand-400 bg-brand-50 dark:bg-brand-500/10'
                      : 'border-ink-100 bg-surface hover:border-brand-200 hover:bg-ink-50'
                  )}
                >
                  <p className="text-sm font-semibold text-ink-900">{famille.libelle}</p>
                  <p className="mt-1 text-xs leading-relaxed text-ink-500">{famille.description}</p>
                  <p className="mt-2 text-xs font-medium tabular-nums text-ink-600">
                    {nombre} référentiel{nombre > 1 ? 's' : ''}
                  </p>
                </button>
              );
            })}
          </div>
        </section>
      </Revele>

      {/* --- Structure et IA --- */}
      <Revele delai={120}>
        <div className="grid gap-5 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          <StructureReferentiel />

          <Card className="p-5">
            <div className="flex items-center gap-2.5">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-400">
                <Sparkles className="h-4 w-4" aria-hidden />
              </span>
              <h2 className="text-base font-semibold text-ink-900">Référentiels et analyse IA</h2>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-ink-600">
              Le pipeline d’agents s’appuie sur le libellé du critère, sa question et les preuves
              déposées pour estimer la conformité d’une mission.
            </p>
            <dl className="mt-4 space-y-2">
              <div className="flex items-baseline justify-between gap-3">
                <dt className="text-xs text-ink-500">Critères exploitables</dt>
                <dd className="text-lg font-bold tabular-nums text-ink-900">{kpis.criteres}</dd>
              </div>
              <div className="flex items-baseline justify-between gap-3">
                <dt className="text-xs text-ink-500">Référentiels actifs</dt>
                <dd className="text-lg font-bold tabular-nums text-ink-900">{kpis.actifs}</dd>
              </div>
            </dl>
          </Card>
        </div>
      </Revele>
    </div>
  );
}

function NouveauReferentielFormulaire({ onCree }) {
  const [formulaire, setFormulaire] = useState({
    code: '',
    nom: '',
    type: 'SMARTEX',
    version: '1.0',
    description: '',
  });
  const [chargement, setChargement] = useState(false);
  const [erreur, setErreur] = useState(null);

  async function creer(e) {
    e.preventDefault();
    setErreur(null);
    setChargement(true);
    try {
      await api.post('/api/v1/referentiels', formulaire);
      onCree();
    } catch (err) {
      setErreur(err instanceof ApiError ? err.message : 'Erreur inattendue');
    } finally {
      setChargement(false);
    }
  }

  return (
    <form className="space-y-3" onSubmit={creer}>
      {erreur ? <Alerte ton="rouge">{erreur}</Alerte> : null}
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="ref-code">
            Code
          </label>
          <input
            id="ref-code"
            required
            className="input"
            placeholder="ISO_14001"
            value={formulaire.code}
            onChange={(e) => setFormulaire({ ...formulaire, code: e.target.value.toUpperCase() })}
          />
        </div>
        <div>
          <label className="label" htmlFor="ref-nom">
            Nom
          </label>
          <input
            id="ref-nom"
            required
            className="input"
            value={formulaire.nom}
            onChange={(e) => setFormulaire({ ...formulaire, nom: e.target.value })}
          />
        </div>
        <div>
          <label className="label" htmlFor="ref-type">
            Type
          </label>
          <select
            id="ref-type"
            className="input"
            value={formulaire.type}
            onChange={(e) => setFormulaire({ ...formulaire, type: e.target.value })}
          >
            {TYPES_REFERENTIEL.map((t) => (
              <option key={t.code} value={t.code}>
                {t.libelle} — {t.organisme}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="ref-version">
            Version
          </label>
          <input
            id="ref-version"
            className="input"
            value={formulaire.version}
            onChange={(e) => setFormulaire({ ...formulaire, version: e.target.value })}
          />
        </div>
        <div className="sm:col-span-2">
          <label className="label" htmlFor="ref-description">
            Description (optionnelle)
          </label>
          <input
            id="ref-description"
            className="input"
            value={formulaire.description}
            onChange={(e) => setFormulaire({ ...formulaire, description: e.target.value })}
          />
        </div>
      </div>
      <button type="submit" className="btn-primary" disabled={chargement}>
        {chargement ? <SustwayLoader taille="sm" /> : null}
        Créer le référentiel
      </button>
    </form>
  );
}

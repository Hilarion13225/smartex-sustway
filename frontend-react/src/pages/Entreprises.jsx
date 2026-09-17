import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ArrowUpDown, Building2, CheckCircle2, Clock, PlusCircle, Search, Sparkles, X } from 'lucide-react';
import SustwayLoader from '../components/SustwayLoader';
import Revele from '../components/Revele';
import { useApiAuth } from '../auth/useApiAuth';
import { ROLES_SUPERVISION } from '../auth/permissions';
import { Alerte, Badge, Card, PageTitre, Tableau } from '../components/ui';
import { parOrganisation, usePortefeuille, vueDesMissions } from '../lib/portefeuille';
import { formaterScore } from '../lib/scoreAffiche';
import { api, ApiError } from '../lib/apiClient';

/** Au-delà de ce nombre d'entreprises, la page affiche un champ de recherche (cas SUPER_ADMIN, accès global). */
const SEUIL_RECHERCHE = 6;

/** Référence stable : passée au hook, elle lui évite de relancer sa collecte à chaque rendu. */
const AUCUNE = [];

/** RG24/RG25 : la création exige une formule payante (Free refusée par l'API). */
export default function Entreprises() {
  const { entreprises, creerEntreprise, peut, roleCourant } = useApiAuth();
  const [recherche, setRecherche] = useState('');
  const [filtreSecteur, setFiltreSecteur] = useState('');
  const [filtreFormule, setFiltreFormule] = useState('');
  const [tri, setTri] = useState({ colonne: 'critiques', ascendant: false });

  const [secteurs, setSecteurs] = useState([]);
  const [formulaire, setFormulaire] = useState({
    raisonSociale: '',
    identifiantLegal: '',
    secteurCode: '',
    taille: 'PME',
    formuleCode: 'STANDARD',
  });
  const [afficherFormulaire, setAfficherFormulaire] = useState(entreprises.length === 0);
  const [chargement, setChargement] = useState(false);
  const [erreur, setErreur] = useState(null);

  useEffect(() => {
    api
      .get('/api/v1/secteurs', { avecAuth: false })
      .then((liste) => {
        setSecteurs(liste);
        if (liste.length) setFormulaire((f) => ({ ...f, secteurCode: liste[0].code }));
      })
      .catch(() => setSecteurs([]));
  }, []);

  async function soumettre(e) {
    e.preventDefault();
    setErreur(null);
    setChargement(true);
    try {
      await creerEntreprise(formulaire);
      setFormulaire((f) => ({ ...f, raisonSociale: '', identifiantLegal: '' }));
      setAfficherFormulaire(false);
    } catch (err) {
      setErreur(err instanceof ApiError ? err.message : 'Erreur inattendue');
    } finally {
      setChargement(false);
    }
  }

  const nombreActives = entreprises.filter((e) => e.statut === 'ACTIF').length;
  const nombreEnAttente = entreprises.length - nombreActives;

  // entreprise:creer n'est volontairement pas vérifiée quand l'utilisateur
  // n'a encore aucune entreprise (rôle transitoire AUCUN_ROLE_ATTRIBUE,
  // absent du modèle de permissions — peut() renverrait toujours faux et
  // bloquerait la création de la toute première entreprise). Au-delà,
  // un utilisateur déjà rattaché sans cette permission (VISITEUR) ne doit
  // plus voir un bouton qui échouerait au clic.
  // La formule évaluée est celle que le formulaire s'apprête à demander, et
  // non celle d'une organisation déjà créée : `entreprise:creer` porte sur
  // l'entreprise à naître. C'est aussi ce que fait l'API, qui lit la formule
  // de la requête (EntrepriseResource.creer, refus RG25 si Free). Le
  // sélecteur n'offre que Standard et Avancées, donc aucune formule fictive
  // n'est inventée ici — on passe celle qui sera réellement envoyée.
  const peutCreer = entreprises.length === 0 || peut('entreprise:creer', formulaire.formuleCode);

  /**
   * Le tableau de suivi, et non la grille de cartes, dès qu'il y a un
   * portefeuille à balayer — ou dès qu'on le supervise.
   *
   * Les cartes disent qui est l'organisation ; le tableau dit où elle en est.
   * À trois organisations la première réponse suffit, à trente elle oblige à
   * ouvrir chaque fiche pour trouver celle qui va mal.
   */
  const enSupervision = ROLES_SUPERVISION.has(roleCourant);
  const vueTableau = enSupervision || entreprises.length > SEUIL_RECHERCHE;

  // Les indicateurs coûtent une requête par organisation, plus quatre par
  // mission : on ne les charge que si le tableau les affiche. Le tableau vide
  // doit être une constante, sinon le hook repartirait à chaque rendu.
  const aSuivre = useMemo(() => (vueTableau ? entreprises : AUCUNE), [vueTableau, entreprises]);
  const { missions, chargement: chargementSuivi } = usePortefeuille(aSuivre);
  const suivi = useMemo(
    () => parOrganisation(entreprises, vueDesMissions(missions)),
    [entreprises, missions]
  );
  const suiviParId = useMemo(
    () => new Map(suivi.map((l) => [l.entreprise.id, l])),
    [suivi]
  );

  const entreprisesFiltrees = useMemo(() => {
    const requete = recherche.trim().toLowerCase();
    return entreprises.filter((e) => {
      if (filtreSecteur && e.secteurCode !== filtreSecteur) return false;
      if (filtreFormule && e.formuleCode !== filtreFormule) return false;
      if (!requete) return true;
      return (
        e.raisonSociale.toLowerCase().includes(requete) ||
        e.identifiantLegal?.toLowerCase().includes(requete)
      );
    });
  }, [entreprises, recherche, filtreSecteur, filtreFormule]);

  /**
   * Tri : une organisation sans mission n'a pas de score, et un « — » ne se
   * compare pas. Elle est renvoyée en fin de liste quel que soit le sens,
   * plutôt que de valoir zéro — ce serait dire qu'elle a échoué.
   */
  const lignesTriees = useMemo(() => {
    const valeur = (e) => {
      const l = suiviParId.get(e.id);
      switch (tri.colonne) {
        case 'missions': return l?.missions ?? 0;
        case 'score': return l?.score ?? null;
        case 'ecarts': return l?.ecartsOuverts ?? 0;
        case 'critiques': return l?.critiques ?? 0;
        default: return e.raisonSociale?.toLowerCase() ?? '';
      }
    };
    const sens = tri.ascendant ? 1 : -1;
    return [...entreprisesFiltrees].sort((a, b) => {
      const va = valeur(a);
      const vb = valeur(b);
      if (va == null && vb == null) return 0;
      if (va == null) return 1;
      if (vb == null) return -1;
      if (typeof va === 'string') return sens * va.localeCompare(vb, 'fr');
      return sens * (va - vb);
    });
  }, [entreprisesFiltrees, suiviParId, tri]);

  function trierPar(colonne) {
    setTri((prec) =>
      prec.colonne === colonne
        ? { colonne, ascendant: !prec.ascendant }
        // Un classement part du plus élevé : on cherche l'organisation la plus
        // en difficulté, pas la plus tranquille. Le nom, lui, part de A.
        : { colonne, ascendant: colonne === 'nom' }
    );
  }

  const statistiques = [
    { libelle: 'Entreprises suivies', valeur: entreprises.length, icone: Building2, ton: 'bleu' },
    { libelle: 'Abonnements actifs', valeur: nombreActives, icone: CheckCircle2, ton: 'vert' },
    { libelle: 'En attente', valeur: nombreEnAttente, icone: Clock, ton: 'ambre' },
  ];

  const TONS_PUCE = {
    bleu: 'bg-blue-50 text-blue-600 ring-blue-100',
    vert: 'bg-brand-50 text-brand-600 ring-brand-100',
    ambre: 'bg-amber-50 text-amber-600 ring-amber-100',
  };

  return (
    <>
      <PageTitre
        icone={Building2}
        titre="Organisations"
        description="Chaque organisation est créée avec un abonnement — la formule Free ne permet pas la création."
        actions={
          peutCreer ? (
            <button type="button" className="btn-vitrine" onClick={() => setAfficherFormulaire((v) => !v)}>
              {afficherFormulaire ? <X className="h-4 w-4" aria-hidden /> : <PlusCircle className="h-4 w-4" aria-hidden />}
              {afficherFormulaire ? 'Fermer' : 'Nouvelle organisation'}
            </button>
          ) : null
        }
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        {statistiques.map((stat, index) => (
          <Revele key={stat.libelle} delai={index * 90} className="carte-stat">
            <span className={`rounded-xl p-3 ring-1 ${TONS_PUCE[stat.ton]}`}>
              <stat.icone className="h-5 w-5" aria-hidden />
            </span>
            <div className="min-w-0">
              <p className="text-xs font-medium uppercase tracking-wide text-ink-500">{stat.libelle}</p>
              <p className="mt-0.5 text-2xl font-semibold text-ink-900">{stat.valeur}</p>
            </div>
          </Revele>
        ))}
      </div>

      {afficherFormulaire ? (
        <Card className="mb-6 overflow-hidden p-5 motion-safe:animate-apparition-bas">
          <form className="space-y-4" onSubmit={soumettre}>
            {erreur ? <Alerte ton="rouge">{erreur}</Alerte> : null}
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="label" htmlFor="raisonSociale">
                  Raison sociale
                </label>
                <input
                  id="raisonSociale"
                  required
                  className="input"
                  value={formulaire.raisonSociale}
                  onChange={(e) => setFormulaire({ ...formulaire, raisonSociale: e.target.value })}
                />
              </div>
              <div>
                <label className="label" htmlFor="identifiantLegal">
                  Identifiant légal
                </label>
                <input
                  id="identifiantLegal"
                  required
                  className="input"
                  value={formulaire.identifiantLegal}
                  onChange={(e) => setFormulaire({ ...formulaire, identifiantLegal: e.target.value })}
                />
              </div>
              <div>
                <label className="label" htmlFor="secteurCode">
                  Secteur d’activité
                </label>
                <select
                  id="secteurCode"
                  className="input"
                  value={formulaire.secteurCode}
                  onChange={(e) => setFormulaire({ ...formulaire, secteurCode: e.target.value })}
                >
                  {secteurs.map((s) => (
                    <option key={s.code} value={s.code}>
                      {s.nom}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label" htmlFor="taille">
                  Taille
                </label>
                <select
                  id="taille"
                  className="input"
                  value={formulaire.taille}
                  onChange={(e) => setFormulaire({ ...formulaire, taille: e.target.value })}
                >
                  <option value="TPE">TPE</option>
                  <option value="PME">PME</option>
                  <option value="ETI">ETI</option>
                  <option value="GRANDE_ENTREPRISE">Grande entreprise</option>
                </select>
              </div>
              <div>
                <label className="label" htmlFor="formuleCode">
                  Formule
                </label>
                <select
                  id="formuleCode"
                  className="input"
                  value={formulaire.formuleCode}
                  onChange={(e) => setFormulaire({ ...formulaire, formuleCode: e.target.value })}
                >
                  <option value="STANDARD">Standard</option>
                  <option value="AVANCEES">Avancées</option>
                </select>
              </div>
            </div>
            <button type="submit" className="btn-vitrine" disabled={chargement}>
              {chargement ? <SustwayLoader taille="sm" /> : null}
              Créer l’organisation
            </button>
          </form>
        </Card>
      ) : null}

      {entreprises.length === 0 ? (
        <div className="relative overflow-hidden rounded-2xl border border-dashed border-ink-200 bg-surface px-6 py-12 text-center">
          <div
            className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-halo-brand motion-safe:animate-apparition-douce"
            aria-hidden
          />
          <span className="relative inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-600 ring-1 ring-brand-100">
            <Building2 className="h-6 w-6" aria-hidden />
          </span>
          <p className="relative mt-4 text-base font-semibold text-ink-900">Aucune organisation pour l’instant</p>
          <p className="relative mx-auto mt-1 max-w-md text-sm text-ink-500">
            Créez votre première organisation pour lancer une évaluation RSE et suivre votre score domaine par domaine.
          </p>
          <button type="button" className="btn-vitrine relative mt-5" onClick={() => setAfficherFormulaire(true)}>
            <Sparkles className="h-4 w-4" aria-hidden />
            Créer une organisation
          </button>
        </div>
      ) : (
        <>
          {entreprises.length > SEUIL_RECHERCHE || vueTableau ? (
            <div className="mb-4 flex flex-wrap items-center gap-3">
              <div className="relative min-w-0 flex-1 sm:max-w-sm">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" aria-hidden />
                <input
                  type="search"
                  className="input pl-9"
                  placeholder="Rechercher par raison sociale ou identifiant légal…"
                  value={recherche}
                  onChange={(e) => setRecherche(e.target.value)}
                />
              </div>
              {/* Les options viennent des organisations présentes, pas d'une
                  liste figée : proposer un filtre qui ne rend rien est une
                  impasse de plus. */}
              <select
                className="input w-auto"
                value={filtreSecteur}
                onChange={(e) => setFiltreSecteur(e.target.value)}
                aria-label="Filtrer par secteur"
              >
                <option value="">Tous les secteurs</option>
                {[...new Set(entreprises.map((e) => e.secteurCode).filter(Boolean))].sort().map((code) => (
                  <option key={code} value={code}>{code}</option>
                ))}
              </select>
              <select
                className="input w-auto"
                value={filtreFormule}
                onChange={(e) => setFiltreFormule(e.target.value)}
                aria-label="Filtrer par formule"
              >
                <option value="">Toutes les formules</option>
                {[...new Set(entreprises.map((e) => e.formuleCode).filter(Boolean))].sort().map((code) => (
                  <option key={code} value={code}>{code}</option>
                ))}
              </select>
            </div>
          ) : null}

          {entreprisesFiltrees.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-ink-200 bg-surface px-6 py-12 text-center text-sm text-ink-500">
              Aucune organisation ne correspond à cette recherche.
            </p>
          ) : vueTableau ? (
            <TableauDeSuivi
              lignes={lignesTriees}
              suivi={suiviParId}
              tri={tri}
              surTri={trierPar}
              chargement={chargementSuivi}
            />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {entreprisesFiltrees.map((e, index) => (
                <Revele key={e.id} delai={index * 70}>
                  <Link to={`/app/${e.id}`} className="carte-app group block h-full">
                    <span
                      className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-halo-brand opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                      aria-hidden
                    />
                    <div className="relative flex items-start justify-between gap-3">
                      <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600 ring-1 ring-brand-100 transition duration-300 group-hover:bg-brand-600 group-hover:text-white">
                        <Building2 className="h-5 w-5" aria-hidden />
                      </span>
                      <ArrowRight
                        className="h-4 w-4 text-ink-300 transition-transform duration-300 group-hover:translate-x-1 group-hover:text-brand-600"
                        aria-hidden
                      />
                    </div>
                    <p className="relative mt-4 font-semibold text-ink-900">{e.raisonSociale}</p>
                    <p className="relative mt-0.5 text-xs text-ink-500">{e.identifiantLegal}</p>
                    {/* Effectif et chiffre d'affaires caractérisent l'entreprise
                        au-delà de sa tranche de taille : deux PME n'ont ni le
                        même poids économique ni le même effectif. */}
                    {e.effectif != null || e.chiffreAffaires != null ? (
                      <dl className="relative mt-3 grid grid-cols-2 gap-2">
                        <div className="rounded-xl bg-ink-50 px-3 py-2">
                          <dd className="text-sm font-semibold tabular-nums text-ink-900">
                            {e.effectif == null ? '—' : e.effectif.toLocaleString('fr-FR')}
                          </dd>
                          <dt className="text-[11px] text-ink-500">Effectif</dt>
                        </div>
                        <div className="min-w-0 rounded-xl bg-ink-50 px-3 py-2">
                          {/* La forme compacte tronque a 1024 px : « 450 M XOF » perd sa
                              devise. L'infobulle porte le montant exact plutot que de
                              repeter l'abreviation, qui n'apprendrait rien de plus. */}
                          <dd
                            className="truncate text-sm font-semibold tabular-nums text-ink-900"
                            title={
                              e.chiffreAffaires == null
                                ? undefined
                                : `${Number(e.chiffreAffaires).toLocaleString('fr-FR')} ${
                                    e.deviseChiffreAffaires ?? ''
                                  }`.trim()
                            }
                          >
                            {e.chiffreAffaires == null
                              ? '—'
                              : `${Number(e.chiffreAffaires).toLocaleString('fr-FR', {
                                  notation: 'compact',
                                  maximumFractionDigits: 1,
                                })} ${e.deviseChiffreAffaires ?? ''}`.trim()}
                          </dd>
                          <dt className="text-[11px] text-ink-500">Chiffre d’affaires</dt>
                        </div>
                      </dl>
                    ) : null}
                    <div className="relative mt-3 flex flex-wrap gap-2">
                      {e.secteurCode ? <Badge>{e.secteurCode}</Badge> : null}
                      {e.taille ? <Badge>{e.taille}</Badge> : null}
                      <Badge ton={e.statut === 'ACTIF' ? 'vert' : 'neutre'}>{e.statut}</Badge>
                    </div>
                  </Link>
                </Revele>
              ))}
            </div>
          )}
        </>
      )}
    </>
  );
}

/** Colonnes du tableau de suivi, dans l'ordre de lecture. */
const COLONNES = [
  { cle: 'nom', libelle: 'Organisation' },
  { cle: null, libelle: 'Secteur' },
  { cle: null, libelle: 'Formule' },
  { cle: 'missions', libelle: 'Missions', nombre: true },
  { cle: 'score', libelle: 'Score', nombre: true },
  { cle: 'critiques', libelle: 'Critiques', nombre: true },
  { cle: 'ecarts', libelle: 'Écarts ouverts', nombre: true },
];

/**
 * Le portefeuille sous forme balayable.
 *
 * La liste affichait l'identité d'une organisation — raison sociale,
 * identifiant légal, effectif, chiffre d'affaires — mais rien de son état
 * d'audit : pour savoir laquelle demandait une intervention, il fallait les
 * ouvrir une par une. Ces colonnes-là répondent à la question sans ouvrir
 * quoi que ce soit, et se trient pour faire remonter le cas le plus grave.
 *
 * Les indicateurs arrivent après le reste : le nom et le secteur s'affichent
 * immédiatement, les chiffres les rejoignent. Afficher zéro en attendant
 * ferait lire une organisation saine là où l'on ne sait simplement pas encore.
 */
function TableauDeSuivi({ lignes, suivi, tri, surTri, chargement }) {
  return (
    <Tableau
      entetes={COLONNES.map((c) =>
        c.cle ? (
          <button
            key={c.libelle}
            type="button"
            onClick={() => surTri(c.cle)}
            className="inline-flex items-center gap-1 font-medium transition-colors hover:text-brand-700"
            aria-sort={tri.colonne === c.cle ? (tri.ascendant ? 'ascending' : 'descending') : 'none'}
          >
            {c.libelle}
            {tri.colonne === c.cle ? (
              <ArrowUpDown className="h-3.5 w-3.5 text-brand-600" aria-hidden />
            ) : (
              <ArrowUpDown className="h-3.5 w-3.5 text-ink-300" aria-hidden />
            )}
          </button>
        ) : (
          c.libelle
        )
      )}
    >
      {lignes.map((e) => {
        const l = suivi.get(e.id);
        // Tant que la collecte n'a pas rendu, on ne sait pas : le tiret le dit,
        // un zéro prétendrait le contraire.
        const inconnu = chargement || !l;
        return (
          <tr key={e.id} className="transition-colors hover:bg-ink-50">
            <td className="px-4 py-3">
              <Link to={`/app/${e.id}`} className="group inline-flex items-center gap-1.5">
                <span className="text-sm font-medium text-ink-900 group-hover:text-brand-700">
                  {e.raisonSociale}
                </span>
                <ArrowRight
                  className="h-3.5 w-3.5 text-ink-300 transition-transform group-hover:translate-x-0.5 group-hover:text-brand-600"
                  aria-hidden
                />
              </Link>
              <span className="block text-xs text-ink-400">{e.identifiantLegal}</span>
            </td>
            <td className="px-4 py-3 text-sm text-ink-500">{e.secteurCode ?? '—'}</td>
            <td className="px-4 py-3">
              <Badge ton={e.statut === 'ACTIF' ? 'vert' : 'neutre'}>{e.formuleCode ?? e.statut}</Badge>
            </td>
            <td className="px-4 py-3 text-right text-sm tabular-nums text-ink-700">
              {inconnu ? '—' : l.missions}
            </td>
            <td className="px-4 py-3 text-right text-sm tabular-nums text-ink-900">
              {inconnu || l.score == null ? '—' : formaterScore(l.score)}
            </td>
            <td className="px-4 py-3 text-right text-sm tabular-nums">
              {inconnu ? (
                '—'
              ) : l.critiques > 0 ? (
                <span className="font-semibold text-rose-700">{l.critiques}</span>
              ) : (
                <span className="text-ink-400">0</span>
              )}
            </td>
            <td className="px-4 py-3 text-right text-sm tabular-nums text-ink-700">
              {inconnu ? '—' : l.ecartsOuverts}
            </td>
          </tr>
        );
      })}
    </Tableau>
  );
}

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ClipboardList, PlusCircle, Search } from 'lucide-react';
import SustwayLoader from '../components/SustwayLoader';
import Revele from '../components/Revele';
import Breadcrumb from '../components/Breadcrumb';
import TableMissions from '../components/tableau-bord/TableMissions';
import { Alerte, Card, Loader, PageTitre, Vide } from '../components/ui';
import { api, ApiError } from '../lib/apiClient';
import { useApiAuth } from '../auth/useApiAuth';
import { formaterDate } from '../lib/export';

const STATUTS = [
  { valeur: '', libelle: 'Tous les statuts' },
  { valeur: 'BROUILLON', libelle: 'Brouillon' },
  { valeur: 'EN_COURS', libelle: 'En cours' },
  { valeur: 'TERMINE', libelle: 'Terminée' },
  { valeur: 'ANNULE', libelle: 'Annulée' },
];

const RISQUES = [
  { valeur: '', libelle: 'Tous les niveaux de risque' },
  { valeur: 'ELEVE', libelle: 'Risque élevé' },
  { valeur: 'MOYEN', libelle: 'Risque moyen' },
  { valeur: 'FAIBLE', libelle: 'Risque faible' },
  { valeur: 'NON_EVALUE', libelle: 'Non évalué' },
];

const PERIODES = [
  { valeur: '', libelle: 'Toutes les périodes' },
  { valeur: '30', libelle: '30 derniers jours' },
  { valeur: '90', libelle: '3 derniers mois' },
  { valeur: '365', libelle: '12 derniers mois' },
];

/**
 * RG10/RG11 : missions d'audit d'une entreprise, et création d'une nouvelle
 * mission (le questionnaire est composé dynamiquement côté API à la création
 * — voir QuestionnaireService).
 *
 * Le tableau est celui du tableau de bord : mêmes colonnes, mêmes codes
 * couleur de risque, et le même repli en cartes sous `lg`. Dupliquer un
 * second tableau aurait fait diverger les deux vues à la première évolution.
 */
export default function AuditsListe() {
  const { entrepriseId } = useParams();
  const navigate = useNavigate();
  const { entreprises, recupererAbonnement, peut } = useApiAuth();
  const entreprise = entreprises.find((e) => e.id === entrepriseId);

  const [missions, setMissions] = useState(null);
  const [chargement, setChargement] = useState(true);
  const [referentiels, setReferentiels] = useState([]);
  const [abonnement, setAbonnement] = useState(null);
  const [afficherFormulaire, setAfficherFormulaire] = useState(false);

  // Les filtres de statut sont aussi pilotables par l'URL : la barre latérale
  // pointe sur ?statut=EN_COURS ou ?vue=a-valider, ce qui rend ses entrées de
  // sous-menu réellement distinctes sans dupliquer la page.
  const [parametres, setParametres] = useSearchParams();
  const vue = parametres.get('vue') ?? '';

  const [recherche, setRecherche] = useState('');
  const [filtreStatut, setFiltreStatut] = useState(parametres.get('statut') ?? '');
  const [filtreRisque, setFiltreRisque] = useState('');
  const [filtrePeriode, setFiltrePeriode] = useState('');

  const rafraichir = useCallback(async () => {
    setChargement(true);
    const audits = await api.get(`/api/v1/entreprises/${entrepriseId}/audits`).catch(() => []);
    // Score et non-conformités par mission : ni la progression ni le risque ne
    // figurent dans AuditDto, il faut les composer côté client.
    const enrichies = await Promise.all(
      audits.map(async (audit) => {
        const [score, nonConformites] = await Promise.all([
          api.get(`/api/v1/entreprises/${entrepriseId}/audits/${audit.id}/score`).catch(() => null),
          api.get(`/api/v1/entreprises/${entrepriseId}/audits/${audit.id}/non-conformites`).catch(() => []),
        ]);
        return { audit, score, nonConformites };
      })
    );
    setMissions(enrichies);
    setChargement(false);
  }, [entrepriseId]);

  useEffect(() => {
    rafraichir();
    api
      .get('/api/v1/referentiels')
      .then((liste) => setReferentiels(liste.filter((r) => r.statut === 'ACTIF')))
      .catch(() => setReferentiels([]));
    recupererAbonnement(entrepriseId)
      .then(setAbonnement)
      .catch(() => setAbonnement(null));
  }, [rafraichir, entrepriseId, recupererAbonnement]);

  const peutCreerAudit = peut('audit:creer', abonnement?.formuleCode);

  const missionsVue = useMemo(
    () =>
      (missions ?? []).map(({ audit, score, nonConformites }) => {
        const total = score?.nombreCriteresTotal ?? audit.nombreCriteres ?? 0;
        const evalues = score?.nombreCriteresEvalues ?? 0;
        const critiques = nonConformites.filter((nc) => nc.niveau === 'CRITIQUE').length;
        const majeures = nonConformites.filter((nc) => nc.niveau === 'MAJEURE').length;

        let risque = null;
        if (evalues > 0) risque = critiques > 0 ? 'ELEVE' : majeures > 0 ? 'MOYEN' : 'FAIBLE';

        return {
          id: audit.id,
          organisation: audit.referentielCode,
          nom: audit.nom,
          progression: total > 0 ? Math.round((evalues / total) * 100) : 0,
          // Le score est celui de la grille, noté sur 5 ; la conformité en est
          // la traduction en pourcentage pour la lecture rapide.
          // V74-C3-B11 : sans critère évalué, le 0 du serveur est une absence.
          score: evalues > 0 ? score.scoreGlobal : null,
          noteTotale: score?.noteTotale ?? null,
          coefficientTotal: score?.coefficientTotal ?? null,
          conformite:
            evalues > 0 ? Math.round((Number(score.scoreGlobal) / 5) * 100) : null,
          risque,
          statut: audit.statut,
          echeance: audit.dateFin ? formaterDate(audit.dateFin) : null,
          lien: `/app/${entrepriseId}/audits/${audit.id}`,
          dateDebut: audit.dateDebut,
        };
      }),
    [missions, entrepriseId]
  );

  /** Change le statut filtré et reflète le choix dans l'URL. */
  function changerStatut(valeur) {
    setFiltreStatut(valeur);
    const suivant = new URLSearchParams(parametres);
    if (valeur) suivant.set('statut', valeur);
    else suivant.delete('statut');
    suivant.delete('vue');
    setParametres(suivant, { replace: true });
  }

  const missionsFiltrees = useMemo(() => {
    const requete = recherche.trim().toLowerCase();
    const limite = filtrePeriode
      ? Date.now() - Number(filtrePeriode) * 24 * 60 * 60 * 1000
      : null;

    return missionsVue.filter((mission) => {
      if (requete && !`${mission.nom} ${mission.organisation}`.toLowerCase().includes(requete)) {
        return false;
      }
      if (filtreStatut && mission.statut !== filtreStatut) return false;
      // « À valider » n'est pas un statut du modèle : c'est une mission dont
      // tous les critères sont évalués mais qui n'est pas encore clôturée.
      if (vue === 'a-valider' && !(mission.progression === 100 && mission.statut === 'EN_COURS')) {
        return false;
      }
      if (filtreRisque && (mission.risque ?? 'NON_EVALUE') !== filtreRisque) return false;
      if (limite && mission.dateDebut && new Date(mission.dateDebut).getTime() < limite) return false;
      return true;
    });
  }, [missionsVue, recherche, filtreStatut, filtreRisque, filtrePeriode, vue]);

  if (!entreprise) {
    return <Vide message="Organisation introuvable ou non accessible." />;
  }

  // Le fil et l'en-tete nomment la meme page : un seul calcul, pas deux
  // listes de conditions a garder d'accord.
  const titre =
    vue === 'a-valider'
      ? 'Missions à valider'
      : filtreStatut === 'EN_COURS'
        ? 'Missions en cours'
        : filtreStatut === 'TERMINE'
          ? 'Missions terminées'
          : 'Missions d’audit';

  return (
    <div className="space-y-5">
      <Breadcrumb
        elements={[
          { libelle: entreprise.raisonSociale, vers: `/app/${entrepriseId}` },
          { libelle: titre },
        ]}
      />

      <PageTitre
        icone={ClipboardList}
        titre={titre}
        description={`Pilotez et suivez l’ensemble de vos missions d’évaluation RSE — ${entreprise.raisonSociale}.`}
        actions={
          peutCreerAudit ? (
            <button type="button" className="btn-primary shrink-0" onClick={() => setAfficherFormulaire((v) => !v)}>
              <PlusCircle className="h-4 w-4" aria-hidden />
              Nouvelle mission
            </button>
          ) : null
        }
      />

      {!peutCreerAudit ? (
        <Alerte ton="ambre">
          La création d’une nouvelle mission n’est pas disponible avec la formule actuelle de cette
          organisation.
        </Alerte>
      ) : null}

      {afficherFormulaire ? (
        <Revele>
          <Card className="p-5">
            <NouvelAuditFormulaire
              entrepriseId={entrepriseId}
              referentiels={referentiels}
              onCree={(audit) => {
                setAfficherFormulaire(false);
                navigate(`/app/${entrepriseId}/audits/${audit.id}`);
              }}
            />
          </Card>
        </Revele>
      ) : null}

      {/* --- Recherche et filtres --- */}
      <div className="rounded-2xl border border-ink-100 bg-surface p-4 shadow-sm">
        <div className="grid gap-3 lg:grid-cols-[minmax(0,2fr)_repeat(3,minmax(0,1fr))]">
          <div className="relative">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400"
              aria-hidden
            />
            <input
              type="search"
              className="input pl-9"
              placeholder="Rechercher une mission…"
              aria-label="Rechercher une mission"
              value={recherche}
              onChange={(e) => setRecherche(e.target.value)}
            />
          </div>
          <select
            className="input"
            aria-label="Filtrer par statut"
            value={filtreStatut}
            onChange={(e) => changerStatut(e.target.value)}
          >
            {STATUTS.map((s) => (
              <option key={s.valeur} value={s.valeur}>
                {s.libelle}
              </option>
            ))}
          </select>
          <select
            className="input"
            aria-label="Filtrer par niveau de risque"
            value={filtreRisque}
            onChange={(e) => setFiltreRisque(e.target.value)}
          >
            {RISQUES.map((r) => (
              <option key={r.valeur} value={r.valeur}>
                {r.libelle}
              </option>
            ))}
          </select>
          <select
            className="input"
            aria-label="Filtrer par période"
            value={filtrePeriode}
            onChange={(e) => setFiltrePeriode(e.target.value)}
          >
            {PERIODES.map((p) => (
              <option key={p.valeur} value={p.valeur}>
                {p.libelle}
              </option>
            ))}
          </select>
        </div>
      </div>

      {chargement ? (
        <Loader message="Chargement des missions…" />
      ) : (
        <Revele delai={80}>
          <div className="rounded-2xl border border-ink-100 bg-surface p-5 shadow-sm">
            <p className="mb-4 text-xs text-ink-500">
              {missionsFiltrees.length} mission{missionsFiltrees.length > 1 ? 's' : ''} affichée
              {missionsFiltrees.length > 1 ? 's' : ''} sur {missionsVue.length}.
            </p>
            <TableMissions
              missions={missionsFiltrees}
              etiquettePremiereColonne="Référentiel"
              // Proposé uniquement quand la liste est vraiment vide : après un
              // filtrage, le geste attendu est de relâcher le filtre, pas de
              // créer une mission de plus.
              action={
                peutCreerAudit && missionsVue.length === 0 ? (
                  <button type="button" className="btn-primary" onClick={() => setAfficherFormulaire(true)}>
                    <PlusCircle className="h-4 w-4" aria-hidden />
                    Créer la première mission
                  </button>
                ) : null
              }
            />
          </div>
        </Revele>
      )}
    </div>
  );
}

function NouvelAuditFormulaire({ entrepriseId, referentiels, onCree }) {
  const [formulaire, setFormulaire] = useState({
    referentielCode: '',
    nom: '',
    description: '',
    dateDebut: new Date().toISOString().slice(0, 10),
  });
  const [chargement, setChargement] = useState(false);
  const [erreur, setErreur] = useState(null);

  async function creer(e) {
    e.preventDefault();
    setErreur(null);
    setChargement(true);
    try {
      const audit = await api.post(`/api/v1/entreprises/${entrepriseId}/audits`, formulaire);
      onCree(audit);
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
          <label className="label" htmlFor="audit-referentiel">
            Référentiel
          </label>
          <select
            id="audit-referentiel"
            required
            className="input"
            value={formulaire.referentielCode}
            onChange={(e) => setFormulaire({ ...formulaire, referentielCode: e.target.value })}
          >
            <option value="" disabled>
              Choisir un référentiel…
            </option>
            {referentiels.map((r) => (
              <option key={r.code} value={r.code}>
                {r.nom} ({r.code})
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="audit-nom">
            Nom de la mission
          </label>
          <input
            id="audit-nom"
            required
            className="input"
            placeholder="Audit RSE 2026"
            value={formulaire.nom}
            onChange={(e) => setFormulaire({ ...formulaire, nom: e.target.value })}
          />
        </div>
        <div>
          <label className="label" htmlFor="audit-date-debut">
            Date de début
          </label>
          <input
            id="audit-date-debut"
            type="date"
            required
            className="input"
            value={formulaire.dateDebut}
            onChange={(e) => setFormulaire({ ...formulaire, dateDebut: e.target.value })}
          />
        </div>
        <div>
          <label className="label" htmlFor="audit-description">
            Description (optionnelle)
          </label>
          <input
            id="audit-description"
            className="input"
            value={formulaire.description}
            onChange={(e) => setFormulaire({ ...formulaire, description: e.target.value })}
          />
        </div>
      </div>
      <button type="submit" className="btn-primary" disabled={chargement}>
        {chargement ? <SustwayLoader taille="sm" /> : null}
        Créer l’audit
      </button>
    </form>
  );
}

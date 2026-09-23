import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Building2, FolderKanban, Plus, X } from 'lucide-react';
import Revele from '../components/Revele';
import Breadcrumb from '../components/Breadcrumb';
import { Alerte, Badge, Loader, PageTitre, Vide } from '../components/ui';
import { api } from '../lib/apiClient';
import { useApiAuth } from '../auth/useApiAuth';
import { STATUTS_PROJET as STATUTS } from '../lib/tonsStatuts';


/** Date ISO rendue en français ; renvoie null si elle est absente. */
function formaterDate(iso) {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

/**
 * Projets d'audit : auditer plusieurs organisations sur un même référentiel.
 *
 * Un projet ne remplace pas les missions — il en crée une par organisation et
 * garde le lien. Chaque organisation conserve donc sa mission, ses preuves et
 * son score, et la comparaison porte sur des évaluations indépendantes.
 */
export default function Projets() {
  const { entreprises } = useApiAuth();

  const [projets, setProjets] = useState(null);
  const [referentiels, setReferentiels] = useState([]);
  const [chargement, setChargement] = useState(true);
  const [formulaireOuvert, setFormulaireOuvert] = useState(false);
  const [erreur, setErreur] = useState(null);

  const charger = useCallback(async () => {
    setChargement(true);
    const [liste, refs] = await Promise.all([
      api.get('/api/v1/projets').catch((e) => {
        setErreur(e.message);
        return [];
      }),
      api.get('/api/v1/referentiels').catch(() => []),
    ]);
    setProjets(liste ?? []);
    setReferentiels(refs ?? []);
    setChargement(false);
  }, []);

  useEffect(() => {
    charger();
  }, [charger]);

  if (chargement) return <Loader message="Chargement des projets…" />;

  return (
    <div>
      <Breadcrumb
        elements={[
          { libelle: 'Tableau de bord', vers: '/app' },
          { libelle: 'Projets d’audit' },
        ]}
      />

      <PageTitre
        icone={FolderKanban}
        titre="Projets d’audit"
        description="Auditer un portefeuille d’organisations sur un même référentiel et une même période, puis comparer leurs résultats."
        actions={
          <button type="button" className="btn-primary" onClick={() => setFormulaireOuvert(true)}>
            <Plus className="h-4 w-4" aria-hidden />
            Nouveau projet
          </button>
        }
      />

      {erreur ? (
        <div className="mb-4">
          <Alerte ton="rouge">{erreur}</Alerte>
        </div>
      ) : null}

      {formulaireOuvert ? (
        <div className="mb-5">
          <NouveauProjet
            referentiels={referentiels}
            entreprises={entreprises}
            onAnnuler={() => setFormulaireOuvert(false)}
            onCree={() => {
              setFormulaireOuvert(false);
              charger();
            }}
          />
        </div>
      ) : null}

      {projets.length === 0 ? (
        <Vide message="Aucun projet pour le moment. Créez-en un pour auditer plusieurs organisations d’un coup." />
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {projets.map((projet, index) => (
            <li key={projet.id}>
              <Revele delai={index * 40}>
                <Link
                  to={`/app/projets/${projet.id}`}
                  className="flex h-full flex-col rounded-2xl border border-ink-100 bg-surface p-5 shadow-sm transition-colors hover:border-brand-200 hover:bg-ink-50"
                >
                  <div className="flex items-start justify-between gap-3">
                    <h2 className="min-w-0 text-sm font-semibold text-ink-900">{projet.nom}</h2>
                    <span className="shrink-0 whitespace-nowrap">
                      <Badge ton={STATUTS[projet.statut]?.ton ?? 'neutre'}>
                        {STATUTS[projet.statut]?.libelle ?? projet.statut}
                      </Badge>
                    </span>
                  </div>
                  {projet.description ? (
                    <p className="mt-2 line-clamp-2 text-sm text-ink-500">{projet.description}</p>
                  ) : null}
                  <dl className="mt-4 space-y-1 text-xs text-ink-500">
                    <div className="flex items-center gap-1.5">
                      <Building2 className="h-3.5 w-3.5 shrink-0" aria-hidden />
                      <dd>
                        {projet.nombreEntreprises} organisation
                        {projet.nombreEntreprises > 1 ? 's' : ''}
                      </dd>
                    </div>
                    <div>
                      <dt className="sr-only">Référentiel</dt>
                      <dd className="truncate">{projet.referentielNom}</dd>
                    </div>
                    <div>
                      <dt className="sr-only">Période</dt>
                      <dd>
                        Du {formaterDate(projet.dateDebut)}
                        {projet.dateFin ? ` au ${formaterDate(projet.dateFin)}` : ''}
                      </dd>
                    </div>
                  </dl>
                  <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-brand-600">
                    Ouvrir
                    <ArrowRight className="h-4 w-4" aria-hidden />
                  </span>
                </Link>
              </Revele>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/**
 * Création d'un projet.
 *
 * Le référentiel et la période sont communs à toutes les organisations : c'est
 * ce qui rend les résultats comparables. Choisir un référentiel par
 * organisation reviendrait à créer des missions séparées.
 */
function NouveauProjet({ referentiels, entreprises, onAnnuler, onCree }) {
  const aujourdhui = new Date().toISOString().slice(0, 10);

  const [formulaire, setFormulaire] = useState({
    nom: '',
    description: '',
    referentielCode: '',
    dateDebut: aujourdhui,
    dateFin: '',
  });
  const [choisies, setChoisies] = useState(() => new Set());
  const [recherche, setRecherche] = useState('');
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState(null);

  /**
   * Seuls les référentiels actifs peuvent porter un nouveau projet — l'API le
   * refuse depuis e1f27fa, et proposer les autres ne menait qu'à un 400 après
   * coup. Même filtre qu'AuditsListe et Questionnaire, appliqué ici et non à
   * la liste reçue : celle-ci ne sert qu'à ce sélecteur, mais la restreindre
   * en amont ferait perdre l'information si la page venait à l'afficher
   * ailleurs. Les projets déjà créés montrent leur référentiel via
   * `projet.referentielNom`, sans passer par cette liste : un projet ancien
   * reste donc lisible même si son référentiel a été archivé depuis.
   */
  const referentielsActifs = useMemo(
    () => (referentiels ?? []).filter((r) => r.statut === 'ACTIF'),
    [referentiels]
  );

  const filtrees = useMemo(() => {
    const terme = recherche.trim().toLowerCase();
    if (!terme) return entreprises;
    return entreprises.filter((e) => e.raisonSociale.toLowerCase().includes(terme));
  }, [entreprises, recherche]);

  function basculer(id) {
    setChoisies((precedentes) => {
      const suivantes = new Set(precedentes);
      if (suivantes.has(id)) suivantes.delete(id);
      else suivantes.add(id);
      return suivantes;
    });
  }

  async function soumettre(evenement) {
    evenement.preventDefault();
    setErreur(null);

    if (choisies.size === 0) {
      setErreur('Sélectionnez au moins une organisation.');
      return;
    }

    setEnvoi(true);
    try {
      await api.post('/api/v1/projets', {
        ...formulaire,
        dateFin: formulaire.dateFin || null,
        description: formulaire.description || null,
        entrepriseIds: [...choisies],
      });
      onCree();
    } catch (e) {
      setErreur(e.message);
    } finally {
      setEnvoi(false);
    }
  }

  return (
    <form
      onSubmit={soumettre}
      className="rounded-2xl border border-ink-100 bg-surface p-5 shadow-sm"
    >
      <div className="flex items-start justify-between gap-3">
        <h2 className="text-base font-semibold text-ink-900">Nouveau projet</h2>
        <button
          type="button"
          className="rounded-lg p-1.5 text-ink-400 transition-colors hover:bg-ink-100 hover:text-ink-700"
          onClick={onAnnuler}
          aria-label="Fermer le formulaire"
        >
          <X className="h-4 w-4" aria-hidden />
        </button>
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <label className="sm:col-span-2">
          <span className="label">Nom du projet</span>
          <input
            className="input"
            required
            maxLength={200}
            value={formulaire.nom}
            onChange={(e) => setFormulaire({ ...formulaire, nom: e.target.value })}
            placeholder="Campagne RSE, ESG & DD 2026 — portefeuille agro"
          />
        </label>

        <label className="sm:col-span-2">
          <span className="label">Description (facultative)</span>
          <textarea
            className="input"
            rows={2}
            value={formulaire.description}
            onChange={(e) => setFormulaire({ ...formulaire, description: e.target.value })}
          />
        </label>

        <label>
          <span className="label">Référentiel</span>
          <select
            className="input"
            required
            value={formulaire.referentielCode}
            onChange={(e) => setFormulaire({ ...formulaire, referentielCode: e.target.value })}
          >
            <option value="">Choisir…</option>
            {referentielsActifs.map((r) => (
              <option key={r.code} value={r.code}>
                {r.nom}
              </option>
            ))}
          </select>
        </label>

        <div className="grid grid-cols-2 gap-3">
          <label>
            <span className="label">Début</span>
            <input
              type="date"
              className="input"
              required
              value={formulaire.dateDebut}
              onChange={(e) => setFormulaire({ ...formulaire, dateDebut: e.target.value })}
            />
          </label>
          <label>
            <span className="label">Fin</span>
            <input
              type="date"
              className="input"
              value={formulaire.dateFin}
              min={formulaire.dateDebut}
              onChange={(e) => setFormulaire({ ...formulaire, dateFin: e.target.value })}
            />
          </label>
        </div>
      </div>

      <fieldset className="mt-5">
        <legend className="label">
          Organisations auditées ({choisies.size} sélectionnée{choisies.size > 1 ? 's' : ''})
        </legend>
        <input
          className="input mt-1"
          type="search"
          placeholder="Filtrer les organisations…"
          value={recherche}
          onChange={(e) => setRecherche(e.target.value)}
        />
        <ul className="mt-2 max-h-56 space-y-1 overflow-y-auto rounded-xl border border-ink-100 p-2">
          {filtrees.length === 0 ? (
            <li className="px-2 py-3 text-sm text-ink-500">Aucune organisation.</li>
          ) : (
            filtrees.map((entreprise) => (
              <li key={entreprise.id}>
                <label className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-ink-700 transition-colors hover:bg-ink-50">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-ink-300 text-brand-600"
                    checked={choisies.has(entreprise.id)}
                    onChange={() => basculer(entreprise.id)}
                  />
                  <span className="truncate">{entreprise.raisonSociale}</span>
                </label>
              </li>
            ))
          )}
        </ul>
        <p className="mt-2 text-xs text-ink-500">
          Une mission est créée pour chaque organisation retenue. Celles sans abonnement actif
          rejoignent le projet mais leur mission n’est pas générée.
        </p>
      </fieldset>

      {erreur ? (
        <div className="mt-4">
          <Alerte ton="rouge">{erreur}</Alerte>
        </div>
      ) : null}

      <div className="mt-5 flex flex-wrap justify-end gap-2">
        <button type="button" className="btn-secondary" onClick={onAnnuler}>
          Annuler
        </button>
        <button type="submit" className="btn-primary" disabled={envoi}>
          {envoi ? 'Création…' : 'Créer le projet'}
        </button>
      </div>
    </form>
  );
}

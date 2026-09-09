import { useCallback, useEffect, useState } from 'react';
import { FileCheck2, PlusCircle, ScrollText, Sparkles, Trash2 } from 'lucide-react';
import SustwayLoader from '../SustwayLoader';
import { Alerte, Badge, Loader } from '../ui';
import { api, ApiError } from '../../lib/apiClient';

const TYPES_PREUVE_ATTENDUE = [
  'POLITIQUE',
  'PROCEDURE',
  'REGISTRE',
  'RAPPORT',
  'CERTIFICAT',
  'INDICATEUR',
  'DOCUMENT_LEGAL',
  'PREUVE_OPERATIONNELLE',
  'AUTRE',
];

const TYPES_REGLE = [
  'PRESENCE',
  'ELEMENT_ATTENDU',
  'DATE_VALIDITE',
  'SIGNATURE',
  'COHERENCE_DECLARATION',
  'INCOHERENCE',
  'CONDITION',
];

const SEVERITES = ['FAIBLE', 'MOYENNE', 'ELEVEE', 'CRITIQUE'];

/**
 * Contenu métier d'un critère : ce qu'il exige, ce qu'il faut produire pour
 * le démontrer, et selon quelles règles conclure.
 *
 * Ce contenu appartient à une version du référentiel. Sur une version
 * publiée il est en lecture seule — l'API le refuse, la base aussi ; masquer
 * les commandes évite seulement de proposer un geste qui ne peut qu'échouer.
 */
export default function VoletExigences({ critereId, modifiable }) {
  const [exigences, setExigences] = useState(null);
  const [regles, setRegles] = useState([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState(null);
  const [formulaireExigence, setFormulaireExigence] = useState(false);

  const rafraichir = useCallback(() => {
    setChargement(true);
    Promise.all([
      api.get(`/api/v1/referentiels/criteres/${critereId}/exigences`),
      api.get(`/api/v1/referentiels/criteres/${critereId}/regles`),
    ])
      .then(([e, r]) => {
        setExigences(e);
        setRegles(r);
      })
      .catch((err) => setErreur(err instanceof ApiError ? err.message : 'Erreur inattendue'))
      .finally(() => setChargement(false));
  }, [critereId]);

  useEffect(() => {
    rafraichir();
  }, [rafraichir]);

  async function agir(action) {
    setErreur(null);
    try {
      await action();
      rafraichir();
    } catch (err) {
      setErreur(err instanceof ApiError ? err.message : 'Erreur inattendue');
    }
  }

  if (chargement) return <Loader message="Chargement du contenu métier…" />;

  return (
    <div className="space-y-4">
      {erreur ? <Alerte ton="rouge">{erreur}</Alerte> : null}

      <div className="flex items-center justify-between gap-3">
        <h4 className="flex items-center gap-2 text-sm font-semibold text-ink-900">
          <ScrollText className="h-4 w-4 text-brand-600" aria-hidden />
          Exigences ({exigences?.length ?? 0})
        </h4>
        {modifiable ? (
          <button
            type="button"
            className="btn-ghost"
            onClick={() => setFormulaireExigence((v) => !v)}
          >
            <PlusCircle className="h-4 w-4" aria-hidden />
            Nouvelle exigence
          </button>
        ) : null}
      </div>

      {modifiable && formulaireExigence ? (
        <NouvelleExigenceFormulaire
          critereId={critereId}
          onCree={() => {
            setFormulaireExigence(false);
            rafraichir();
          }}
        />
      ) : null}

      {!exigences || exigences.length === 0 ? (
        <p className="text-sm text-ink-500">Aucune exigence pour ce critère.</p>
      ) : (
        <ul className="space-y-3">
          {exigences.map((exigence) => (
            <li
              key={exigence.id}
              className="rounded-xl border border-ink-100 bg-surface p-4 shadow-sm"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="flex flex-wrap items-center gap-2 text-sm font-medium text-ink-900">
                    <span className="font-mono text-xs text-ink-500">{exigence.code}</span>
                    {exigence.intitule}
                    {exigence.origine === 'CONTENU_INITIAL' ? (
                      <Badge ton="ambre">Repris du libellé — à rédiger</Badge>
                    ) : null}
                  </p>
                  <p className="mt-1 text-sm text-ink-600">{exigence.enonce}</p>
                </div>
                {modifiable ? (
                  <button
                    type="button"
                    className="btn-ghost"
                    onClick={() =>
                      agir(() => api.delete(`/api/v1/referentiels/exigences/${exigence.id}`))
                    }
                    aria-label={`Supprimer l’exigence ${exigence.code}`}
                  >
                    <Trash2 className="h-3.5 w-3.5" aria-hidden />
                  </button>
                ) : null}
              </div>

              <div className="mt-3 border-t border-ink-100 pt-3">
                <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-ink-500">
                  <FileCheck2 className="h-3.5 w-3.5" aria-hidden />
                  Preuves attendues
                </p>
                {exigence.preuvesAttendues.length === 0 ? (
                  <p className="mt-1 text-sm text-ink-500">
                    Rien n’est encore attendu en démonstration.
                  </p>
                ) : (
                  <ul className="mt-1 space-y-1">
                    {exigence.preuvesAttendues.map((preuve) => (
                      <li
                        key={preuve.id}
                        className="flex flex-wrap items-center gap-2 text-sm text-ink-700"
                      >
                        <Badge ton="neutre">{preuve.type}</Badge>
                        <span>{preuve.libelle}</span>
                        {preuve.obligatoire ? null : (
                          <span className="text-xs text-ink-400">(facultative)</span>
                        )}
                        {preuve.description ? (
                          <span className="text-xs text-ink-500">— {preuve.description}</span>
                        ) : null}
                        {modifiable ? (
                          <button
                            type="button"
                            className="btn-ghost"
                            onClick={() =>
                              agir(() =>
                                api.delete(`/api/v1/referentiels/preuves-attendues/${preuve.id}`),
                              )
                            }
                            aria-label={`Supprimer la preuve attendue ${preuve.libelle}`}
                          >
                            <Trash2 className="h-3.5 w-3.5" aria-hidden />
                          </button>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                )}
                {modifiable ? (
                  <NouvellePreuveAttendueFormulaire exigenceId={exigence.id} onCree={rafraichir} />
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}

      <div className="border-t border-ink-100 pt-4">
        <h4 className="flex items-center gap-2 text-sm font-semibold text-ink-900">
          <Sparkles className="h-4 w-4 text-brand-600" aria-hidden />
          Règles d’analyse ({regles.length})
        </h4>
        <p className="mt-1 text-xs text-ink-500">
          Ce que l’IA doit vérifier, et avec quelle sévérité. Ces règles sont des données : le
          service d’agents en compose ses instructions, aucun prompt n’est stocké ici.
        </p>

        {regles.length === 0 ? (
          <p className="mt-2 text-sm text-ink-500">Aucune règle pour ce critère.</p>
        ) : (
          <ul className="mt-2 space-y-1">
            {regles.map((regle) => (
              <li key={regle.id} className="flex flex-wrap items-center gap-2 text-sm text-ink-700">
                <span className="font-mono text-xs text-ink-500">{regle.code}</span>
                <Badge ton="neutre">{regle.type}</Badge>
                <Badge ton={regle.severite === 'CRITIQUE' || regle.severite === 'ELEVEE' ? 'ambre' : 'neutre'}>
                  {regle.severite}
                </Badge>
                <span>{regle.libelle}</span>
                <span className="text-xs text-ink-400">
                  {regle.preuveAttendueId
                    ? 'porte sur une pièce attendue'
                    : regle.exigenceId
                      ? 'porte sur une exigence'
                      : 'porte sur le critère'}
                </span>
                {modifiable ? (
                  <button
                    type="button"
                    className="btn-ghost"
                    onClick={() => agir(() => api.delete(`/api/v1/referentiels/regles/${regle.id}`))}
                    aria-label={`Supprimer la règle ${regle.code}`}
                  >
                    <Trash2 className="h-3.5 w-3.5" aria-hidden />
                  </button>
                ) : null}
              </li>
            ))}
          </ul>
        )}

        {modifiable ? (
          <NouvelleRegleFormulaire
            critereId={critereId}
            exigences={exigences ?? []}
            onCree={rafraichir}
          />
        ) : null}
      </div>
    </div>
  );
}

function NouvelleExigenceFormulaire({ critereId, onCree }) {
  const [intitule, setIntitule] = useState('');
  const [enonce, setEnonce] = useState('');
  const [chargement, setChargement] = useState(false);
  const [erreur, setErreur] = useState(null);

  async function creer(evenement) {
    evenement.preventDefault();
    setErreur(null);
    setChargement(true);
    try {
      await api.post(`/api/v1/referentiels/criteres/${critereId}/exigences`, { intitule, enonce });
      setIntitule('');
      setEnonce('');
      onCree();
    } catch (err) {
      setErreur(err instanceof ApiError ? err.message : 'Erreur inattendue');
    } finally {
      setChargement(false);
    }
  }

  return (
    <form className="space-y-2 rounded-xl border border-ink-100 bg-surface p-4" onSubmit={creer}>
      {erreur ? <Alerte ton="rouge">{erreur}</Alerte> : null}
      <div>
        <label className="label" htmlFor={`exigence-intitule-${critereId}`}>
          Intitulé
        </label>
        <input
          id={`exigence-intitule-${critereId}`}
          required
          maxLength={300}
          className="input"
          placeholder="Procédure de gestion des déchets dangereux"
          value={intitule}
          onChange={(e) => setIntitule(e.target.value)}
        />
      </div>
      <div>
        <label className="label" htmlFor={`exigence-enonce-${critereId}`}>
          Énoncé — ce qui est exigé de l’organisation
        </label>
        <textarea
          id={`exigence-enonce-${critereId}`}
          required
          rows={2}
          className="input"
          placeholder="L’organisation doit disposer d’une procédure de gestion des déchets dangereux."
          value={enonce}
          onChange={(e) => setEnonce(e.target.value)}
        />
      </div>
      <button type="submit" className="btn-primary" disabled={chargement}>
        {chargement ? <SustwayLoader taille="sm" /> : null}
        Ajouter l’exigence
      </button>
    </form>
  );
}

function NouvellePreuveAttendueFormulaire({ exigenceId, onCree }) {
  const [ouvert, setOuvert] = useState(false);
  const [type, setType] = useState('PROCEDURE');
  const [libelle, setLibelle] = useState('');
  const [description, setDescription] = useState('');
  const [obligatoire, setObligatoire] = useState(true);
  const [chargement, setChargement] = useState(false);
  const [erreur, setErreur] = useState(null);

  async function creer(evenement) {
    evenement.preventDefault();
    setErreur(null);
    setChargement(true);
    try {
      await api.post(`/api/v1/referentiels/exigences/${exigenceId}/preuves-attendues`, {
        type,
        libelle,
        description: description || null,
        obligatoire,
      });
      setLibelle('');
      setDescription('');
      setOuvert(false);
      onCree();
    } catch (err) {
      setErreur(err instanceof ApiError ? err.message : 'Erreur inattendue');
    } finally {
      setChargement(false);
    }
  }

  if (!ouvert) {
    return (
      <button type="button" className="btn-ghost mt-2" onClick={() => setOuvert(true)}>
        <PlusCircle className="h-3.5 w-3.5" aria-hidden />
        Ajouter une preuve attendue
      </button>
    );
  }

  return (
    <form className="mt-2 space-y-2 rounded-xl border border-ink-100 bg-ink-50/50 p-3" onSubmit={creer}>
      {erreur ? <Alerte ton="rouge">{erreur}</Alerte> : null}
      <div className="grid gap-2 sm:grid-cols-[10rem_minmax(0,1fr)]">
        <select className="input" value={type} onChange={(e) => setType(e.target.value)}>
          {TYPES_PREUVE_ATTENDUE.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
        <input
          required
          maxLength={300}
          className="input"
          placeholder="Procédure officielle signée"
          value={libelle}
          onChange={(e) => setLibelle(e.target.value)}
        />
      </div>
      <input
        className="input"
        placeholder="Critères de recevabilité : datée de moins de deux ans, signée par la direction…"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
      />
      <label className="flex items-center gap-2 text-sm text-ink-600">
        <input
          type="checkbox"
          checked={obligatoire}
          onChange={(e) => setObligatoire(e.target.checked)}
        />
        Son absence empêche à elle seule de tenir l’exigence pour démontrée
      </label>
      <div className="flex gap-2">
        <button type="submit" className="btn-primary" disabled={chargement}>
          {chargement ? <SustwayLoader taille="sm" /> : null}
          Ajouter
        </button>
        <button type="button" className="btn-ghost" onClick={() => setOuvert(false)}>
          Annuler
        </button>
      </div>
    </form>
  );
}

function NouvelleRegleFormulaire({ critereId, exigences, onCree }) {
  const [ouvert, setOuvert] = useState(false);
  const [code, setCode] = useState('');
  const [type, setType] = useState('PRESENCE');
  const [libelle, setLibelle] = useState('');
  const [severite, setSeverite] = useState('MOYENNE');
  const [exigenceId, setExigenceId] = useState('');
  const [preuveAttendueId, setPreuveAttendueId] = useState('');
  const [elements, setElements] = useState('');
  const [chargement, setChargement] = useState(false);
  const [erreur, setErreur] = useState(null);

  const exigenceChoisie = exigences.find((e) => e.id === exigenceId);

  async function creer(evenement) {
    evenement.preventDefault();
    setErreur(null);
    setChargement(true);
    try {
      const definition = {};
      const liste = elements
        .split(';')
        .map((e) => e.trim())
        .filter(Boolean);
      if (liste.length > 0) definition.elements = liste;

      await api.post(`/api/v1/referentiels/criteres/${critereId}/regles`, {
        code,
        type,
        libelle,
        severite,
        exigenceId: exigenceId || null,
        preuveAttendueId: preuveAttendueId || null,
        definition,
      });
      setCode('');
      setLibelle('');
      setElements('');
      setOuvert(false);
      onCree();
    } catch (err) {
      setErreur(err instanceof ApiError ? err.message : 'Erreur inattendue');
    } finally {
      setChargement(false);
    }
  }

  if (!ouvert) {
    return (
      <button type="button" className="btn-ghost mt-2" onClick={() => setOuvert(true)}>
        <PlusCircle className="h-3.5 w-3.5" aria-hidden />
        Ajouter une règle d’analyse
      </button>
    );
  }

  return (
    <form className="mt-2 space-y-2 rounded-xl border border-ink-100 bg-ink-50/50 p-3" onSubmit={creer}>
      {erreur ? <Alerte ton="rouge">{erreur}</Alerte> : null}
      <div className="grid gap-2 sm:grid-cols-3">
        <input
          required
          maxLength={40}
          className="input"
          placeholder="Code (D1-01-R1)"
          value={code}
          onChange={(e) => setCode(e.target.value)}
        />
        <select className="input" value={type} onChange={(e) => setType(e.target.value)}>
          {TYPES_REGLE.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
        <select className="input" value={severite} onChange={(e) => setSeverite(e.target.value)}>
          {SEVERITES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>
      <input
        required
        maxLength={300}
        className="input"
        placeholder="La procédure doit être validée par la direction"
        value={libelle}
        onChange={(e) => setLibelle(e.target.value)}
      />
      <div className="grid gap-2 sm:grid-cols-2">
        <select
          className="input"
          value={exigenceId}
          onChange={(e) => {
            setExigenceId(e.target.value);
            setPreuveAttendueId('');
          }}
        >
          <option value="">Porte sur le critère entier</option>
          {exigences.map((e) => (
            <option key={e.id} value={e.id}>
              {e.code} — {e.intitule}
            </option>
          ))}
        </select>
        <select
          className="input"
          value={preuveAttendueId}
          disabled={!exigenceChoisie}
          onChange={(e) => setPreuveAttendueId(e.target.value)}
        >
          <option value="">Toute l’exigence</option>
          {(exigenceChoisie?.preuvesAttendues ?? []).map((p) => (
            <option key={p.id} value={p.id}>
              {p.libelle}
            </option>
          ))}
        </select>
      </div>
      <input
        className="input"
        placeholder="Éléments à rechercher, séparés par des points-virgules"
        value={elements}
        onChange={(e) => setElements(e.target.value)}
      />
      <div className="flex gap-2">
        <button type="submit" className="btn-primary" disabled={chargement}>
          {chargement ? <SustwayLoader taille="sm" /> : null}
          Ajouter la règle
        </button>
        <button type="button" className="btn-ghost" onClick={() => setOuvert(false)}>
          Annuler
        </button>
      </div>
    </form>
  );
}

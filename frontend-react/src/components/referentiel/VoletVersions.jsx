import { useCallback, useEffect, useState } from 'react';
import { ArrowDown, ArrowUp, CheckCircle2, Minus, PlusCircle, Trash2 } from 'lucide-react';
import SustwayLoader from '../SustwayLoader';
import { Alerte, Badge, Card, Loader, Vide } from '../ui';
import { api, ApiError } from '../../lib/apiClient';
import { formaterDateHeure } from '../../lib/export';

/** Écart entre deux volumétries, avec son sens de variation. */
function Ecart({ valeur, precedente }) {
  if (precedente == null) return <span className="text-ink-400">—</span>;
  const delta = valeur - precedente;
  if (delta === 0) {
    return (
      <span className="inline-flex items-center gap-1 text-ink-400">
        <Minus className="h-3 w-3" aria-hidden />
        inchangé
      </span>
    );
  }
  const Icone = delta > 0 ? ArrowUp : ArrowDown;
  return (
    <span
      className={`inline-flex items-center gap-1 ${
        delta > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-brand-600 dark:text-brand-400'
      }`}
    >
      <Icone className="h-3 w-3" aria-hidden />
      {delta > 0 ? `+${delta}` : delta}
    </span>
  );
}

const TONS_STATUT = {
  BROUILLON: 'ambre',
  PUBLIEE: 'vert',
  ARCHIVEE: 'neutre',
};

/**
 * Versions d'un référentiel.
 *
 * Une version publiée est immuable : elle ne se modifie ni ne se supprime,
 * en base comme par l'API. Faire évoluer un référentiel consiste donc à
 * ouvrir un brouillon — copie conforme de la version publiée —, à le
 * modifier, puis à le publier. Les missions déjà créées continuent d'auditer
 * la version qu'elles ont reçue.
 */
export default function VoletVersions({ code, peutAdministrer, surChangement }) {
  const [versions, setVersions] = useState(null);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState(null);
  const [formulaireOuvert, setFormulaireOuvert] = useState(false);
  const [enCours, setEnCours] = useState(null);

  const rafraichir = useCallback(() => {
    setChargement(true);
    api
      .get(`/api/v1/referentiels/${code}/versions`)
      .then(setVersions)
      .catch((err) => setErreur(err instanceof ApiError ? err.message : 'Erreur inattendue'))
      .finally(() => setChargement(false));
  }, [code]);

  useEffect(() => {
    rafraichir();
  }, [rafraichir]);

  const brouillon = (versions ?? []).find((v) => v.statut === 'BROUILLON');

  async function publier(numero) {
    setErreur(null);
    setEnCours(numero);
    try {
      await api.post(`/api/v1/referentiels/${code}/versions/${numero}/publication`, {});
      rafraichir();
      surChangement?.();
    } catch (err) {
      setErreur(err instanceof ApiError ? err.message : 'Publication impossible');
    } finally {
      setEnCours(null);
    }
  }

  async function abandonner(numero) {
    setErreur(null);
    setEnCours(numero);
    try {
      await api.delete(`/api/v1/referentiels/${code}/versions/${numero}`);
      rafraichir();
      surChangement?.();
    } catch (err) {
      setErreur(err instanceof ApiError ? err.message : 'Suppression impossible');
    } finally {
      setEnCours(null);
    }
  }

  if (chargement) return <Loader message="Chargement des versions…" />;

  return (
    <div className="space-y-4">
      {erreur ? <Alerte ton="rouge">{erreur}</Alerte> : null}

      {peutAdministrer && !brouillon ? (
        <div className="flex justify-end">
          <button
            type="button"
            className="btn-secondary"
            onClick={() => setFormulaireOuvert((v) => !v)}
          >
            <PlusCircle className="h-4 w-4" aria-hidden />
            Ouvrir une version brouillon
          </button>
        </div>
      ) : null}

      {formulaireOuvert && peutAdministrer && !brouillon ? (
        <Card className="p-5">
          <OuvrirBrouillonFormulaire
            code={code}
            onOuvert={() => {
              setFormulaireOuvert(false);
              rafraichir();
              surChangement?.();
            }}
          />
        </Card>
      ) : null}

      {!versions || versions.length === 0 ? (
        <Vide message="Aucune version pour ce référentiel." />
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-ink-100 bg-surface shadow-sm">
          <table className="w-full">
            <thead>
              <tr className="border-b border-ink-100">
                <th className="th">Version</th>
                <th className="th">État</th>
                <th className="th">Publiée le</th>
                <th className="th">Auteur</th>
                <th className="th">Domaines</th>
                <th className="th">Critères</th>
                <th className="th">Écart</th>
                <th className="th">Notes</th>
                {peutAdministrer ? <th className="th">Actions</th> : null}
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100">
              {versions.map((version, index) => {
                // Les versions sont triées de la plus récente à la plus
                // ancienne : la suivante dans la liste est la précédente
                // dans le temps.
                const precedente = versions[index + 1];
                return (
                  <tr key={version.id} className="transition-colors hover:bg-ink-50">
                    <td className="td whitespace-nowrap">
                      <span className="flex items-center gap-2">
                        <span className="font-medium text-ink-900">{version.numero}</span>
                        {version.courante ? <Badge ton="vert">Courante</Badge> : null}
                      </span>
                    </td>
                    <td className="td whitespace-nowrap">
                      <Badge ton={TONS_STATUT[version.statut] ?? 'neutre'}>{version.statut}</Badge>
                    </td>
                    <td className="td whitespace-nowrap text-ink-600">
                      {version.publieeLe ? formaterDateHeure(version.publieeLe) : '—'}
                    </td>
                    <td className="td text-ink-600">{version.auteurNom ?? '—'}</td>
                    <td className="td tabular-nums">{version.nombreDomaines}</td>
                    <td className="td tabular-nums">{version.nombreCriteres}</td>
                    <td className="td whitespace-nowrap text-xs">
                      <Ecart
                        valeur={version.nombreCriteres}
                        precedente={precedente?.nombreCriteres}
                      />
                    </td>
                    <td className="td max-w-[20rem] text-sm text-ink-600">
                      {version.notes ?? <span className="text-ink-400">—</span>}
                    </td>
                    {peutAdministrer ? (
                      <td className="td whitespace-nowrap">
                        {version.statut === 'BROUILLON' ? (
                          <span className="flex items-center gap-2">
                            <button
                              type="button"
                              className="btn-primary"
                              disabled={enCours === version.numero}
                              onClick={() => publier(version.numero)}
                            >
                              <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />
                              Publier
                            </button>
                            <button
                              type="button"
                              className="btn-ghost"
                              disabled={enCours === version.numero}
                              onClick={() => abandonner(version.numero)}
                            >
                              <Trash2 className="h-3.5 w-3.5" aria-hidden />
                              Abandonner
                            </button>
                          </span>
                        ) : (
                          <span className="text-xs text-ink-400">Figée</span>
                        )}
                      </td>
                    ) : null}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <p className="text-xs text-ink-500">
        Une version publiée est figée : elle ne se modifie ni ne se supprime, la base le refuse
        elle-même. Pour faire évoluer ce référentiel, ouvrez un brouillon — il reprend le contenu de
        la version publiée —, modifiez-le, puis publiez-le. Les missions déjà créées continuent
        d’auditer la version qu’elles ont reçue.
      </p>
    </div>
  );
}

function OuvrirBrouillonFormulaire({ code, onOuvert }) {
  const [numero, setNumero] = useState('');
  const [notes, setNotes] = useState('');
  const [chargement, setChargement] = useState(false);
  const [erreur, setErreur] = useState(null);

  async function ouvrir(evenement) {
    evenement.preventDefault();
    setErreur(null);
    setChargement(true);
    try {
      await api.post(`/api/v1/referentiels/${code}/versions`, { numero, notes: notes || null });
      onOuvert();
    } catch (err) {
      setErreur(err instanceof ApiError ? err.message : 'Erreur inattendue');
    } finally {
      setChargement(false);
    }
  }

  return (
    <form className="space-y-3" onSubmit={ouvrir}>
      {erreur ? <Alerte ton="rouge">{erreur}</Alerte> : null}
      <p className="text-sm text-ink-600">
        Le brouillon reprend l’intégralité du contenu de la version publiée. Tant qu’il n’est pas
        publié, aucune mission ne s’y appuie et il reste librement modifiable.
      </p>
      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
        <div>
          <label className="label" htmlFor="version-numero">
            Numéro
          </label>
          <input
            id="version-numero"
            required
            maxLength={20}
            className="input"
            placeholder="2.0"
            value={numero}
            onChange={(e) => setNumero(e.target.value)}
          />
        </div>
        <div>
          <label className="label" htmlFor="version-notes">
            Ce que change cette version (optionnel)
          </label>
          <input
            id="version-notes"
            maxLength={1000}
            className="input"
            placeholder="Ajout des critères de suivi des effluents…"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>
      </div>
      <button type="submit" className="btn-primary" disabled={chargement}>
        {chargement ? <SustwayLoader taille="sm" /> : null}
        Ouvrir le brouillon
      </button>
    </form>
  );
}

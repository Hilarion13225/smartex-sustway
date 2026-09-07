import { useCallback, useEffect, useState } from 'react';
import { ArrowDown, ArrowUp, Minus, PlusCircle } from 'lucide-react';
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

/**
 * Historique des publications d'un référentiel.
 *
 * La comparaison porte sur les volumétries figées à chaque publication, pas
 * sur le contenu des critères : la plateforme ne conserve pas de copie du
 * référentiel par version. Faire évoluer un référentiel n'altère aucune
 * mission en cours, dont le questionnaire est figé à sa création (RG34/RG35).
 */
export default function VoletVersions({ code, peutAdministrer, surPublication }) {
  const [versions, setVersions] = useState(null);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState(null);
  const [formulaireOuvert, setFormulaireOuvert] = useState(false);

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

  if (chargement) return <Loader message="Chargement des versions…" />;

  return (
    <div className="space-y-4">
      {erreur ? <Alerte ton="rouge">{erreur}</Alerte> : null}

      {peutAdministrer ? (
        <div className="flex justify-end">
          <button
            type="button"
            className="btn-secondary"
            onClick={() => setFormulaireOuvert((v) => !v)}
          >
            <PlusCircle className="h-4 w-4" aria-hidden />
            Publier une version
          </button>
        </div>
      ) : null}

      {formulaireOuvert && peutAdministrer ? (
        <Card className="p-5">
          <PublierVersionFormulaire
            code={code}
            onPubliee={() => {
              setFormulaireOuvert(false);
              rafraichir();
              surPublication?.();
            }}
          />
        </Card>
      ) : null}

      {!versions || versions.length === 0 ? (
        <Vide message="Aucune version publiée pour ce référentiel." />
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-ink-100 bg-surface shadow-sm">
          <table className="w-full">
            <thead>
              <tr className="border-b border-ink-100">
                <th className="th">Version</th>
                <th className="th">Publiée le</th>
                <th className="th">Auteur</th>
                <th className="th">Domaines</th>
                <th className="th">Critères</th>
                <th className="th">Écart</th>
                <th className="th">Notes</th>
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
                    <td className="td whitespace-nowrap text-ink-600">
                      {formaterDateHeure(version.publieeLe)}
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
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <p className="text-xs text-ink-500">
        L’écart porte sur le nombre de critères entre deux publications. La plateforme ne conserve
        pas de copie du référentiel par version : une comparaison critère par critère supposerait
        d’en archiver le contenu à chaque publication.
      </p>
    </div>
  );
}

function PublierVersionFormulaire({ code, onPubliee }) {
  const [numero, setNumero] = useState('');
  const [notes, setNotes] = useState('');
  const [chargement, setChargement] = useState(false);
  const [erreur, setErreur] = useState(null);

  async function publier(evenement) {
    evenement.preventDefault();
    setErreur(null);
    setChargement(true);
    try {
      await api.post(`/api/v1/referentiels/${code}/versions`, { numero, notes: notes || null });
      onPubliee();
    } catch (err) {
      setErreur(err instanceof ApiError ? err.message : 'Erreur inattendue');
    } finally {
      setChargement(false);
    }
  }

  return (
    <form className="space-y-3" onSubmit={publier}>
      {erreur ? <Alerte ton="rouge">{erreur}</Alerte> : null}
      <p className="text-sm text-ink-600">
        La volumétrie est relevée au moment de la publication. Les missions en cours ne sont pas
        touchées : leur questionnaire est figé à leur création.
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
        Publier
      </button>
    </form>
  );
}

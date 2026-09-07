import { useEffect, useState } from 'react';
import { FileText } from 'lucide-react';
import { Loader } from '../ui';
import { api } from '../../lib/apiClient';
import { formaterDateHeure } from '../../lib/export';

/**
 * Preuves documentaires déposées sur la mission, tous critères confondus.
 *
 * Une preuve peut couvrir plusieurs critères — l'API renvoie leurs codes dans
 * `critereCodes`, affichés ici pour qu'on sache ce que chaque document
 * justifie sans ouvrir les critères un à un.
 */
export default function VoletPreuves({ entrepriseId, auditId }) {
  const [preuves, setPreuves] = useState(null);
  const [chargement, setChargement] = useState(true);

  useEffect(() => {
    setChargement(true);
    api
      .get(`/api/v1/entreprises/${entrepriseId}/audits/${auditId}/preuves`)
      .then(setPreuves)
      .catch(() => setPreuves([]))
      .finally(() => setChargement(false));
  }, [entrepriseId, auditId]);

  if (chargement) return <Loader message="Chargement des preuves…" />;

  if (!preuves || preuves.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed border-ink-200 px-4 py-10 text-center text-sm text-ink-500">
        Aucune preuve déposée sur cette mission.
      </p>
    );
  }

  return (
    <div className="rounded-2xl border border-ink-100 bg-surface p-5 shadow-sm">
      <p className="text-sm font-medium text-ink-700">
        {preuves.length} preuve{preuves.length > 1 ? 's' : ''} déposée
        {preuves.length > 1 ? 's' : ''}
      </p>
      <ul className="mt-4 divide-y divide-ink-100">
        {preuves.map((preuve) => (
          <li key={preuve.id} className="flex items-start gap-3 py-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-400">
              <FileText className="h-4 w-4" aria-hidden />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-ink-900">
                {preuve.documentNomOriginal ?? preuve.description ?? 'Document'}
              </p>
              <p className="mt-0.5 text-xs text-ink-500">
                {preuve.type ?? 'Justificatif'}
                {preuve.createdAt ? ` · ${formaterDateHeure(preuve.createdAt)}` : ''}
              </p>
              {(preuve.critereCodes ?? []).length > 0 ? (
                <ul className="mt-1.5 flex flex-wrap gap-1.5">
                  {preuve.critereCodes.map((code) => (
                    <li
                      key={code}
                      className="rounded-md bg-ink-100 px-1.5 py-0.5 text-[11px] font-medium text-ink-600"
                    >
                      {code}
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

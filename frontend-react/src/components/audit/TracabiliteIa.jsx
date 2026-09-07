import { useState } from 'react';
import { CheckCircle2, ChevronDown, FileText, TriangleAlert } from 'lucide-react';
import clsx from 'clsx';

/**
 * Ce sur quoi l'IA s'est appuyée pour conclure : suffisance des preuves et
 * documents effectivement lus, avec le résumé qu'elle en a tiré.
 *
 * Le superviseur ne refait pas l'analyse, il doit pouvoir la contrôler : sans
 * savoir quels fichiers ont été lus ni si l'IA les a jugés suffisants, un
 * taux de conformité n'est pas vérifiable.
 */
export default function TracabiliteIa({ couverturePreuve, documents = [], compact = false }) {
  const [ouvert, setOuvert] = useState(false);

  if (couverturePreuve == null && documents.length === 0) return null;

  return (
    <div className={clsx('rounded-xl border border-ink-100', compact ? 'p-3' : 'p-4')}>
      {couverturePreuve != null ? (
        <p
          className={clsx(
            'flex items-start gap-2 text-sm',
            couverturePreuve
              ? 'text-emerald-700 dark:text-emerald-300'
              : 'text-amber-700 dark:text-amber-300'
          )}
        >
          {couverturePreuve ? (
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          ) : (
            <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          )}
          {couverturePreuve
            ? 'Preuves jugées suffisantes par l’IA.'
            : 'Preuves jugées insuffisantes par l’IA.'}
        </p>
      ) : null}

      {documents.length > 0 ? (
        <>
          <button
            type="button"
            onClick={() => setOuvert((v) => !v)}
            aria-expanded={ouvert}
            className={clsx(
              'flex w-full items-center justify-between gap-2 text-left text-sm font-medium text-ink-700 transition-colors hover:text-ink-900',
              couverturePreuve != null && 'mt-3 border-t border-ink-100 pt-3'
            )}
          >
            <span className="inline-flex items-center gap-2">
              <FileText className="h-4 w-4 text-ink-400" aria-hidden />
              {documents.length} document{documents.length > 1 ? 's' : ''} lu
              {documents.length > 1 ? 's' : ''} par l’IA
            </span>
            <ChevronDown
              className={clsx('h-4 w-4 shrink-0 text-ink-400 transition-transform', ouvert && 'rotate-180')}
              aria-hidden
            />
          </button>

          {ouvert ? (
            <ul className="mt-3 space-y-3">
              {documents.map((document, index) => (
                <li key={`${document.nom}-${index}`} className="border-l-2 border-ink-100 pl-3">
                  <p className="truncate text-sm font-medium text-ink-800" title={document.nom}>
                    {document.nom}
                  </p>
                  <p className="mt-1 text-xs leading-relaxed text-ink-600">
                    {document.resume || 'Aucun résumé produit pour ce document.'}
                  </p>
                </li>
              ))}
            </ul>
          ) : null}
        </>
      ) : null}
    </div>
  );
}

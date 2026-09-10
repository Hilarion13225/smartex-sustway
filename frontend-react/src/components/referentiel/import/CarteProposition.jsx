import { useState } from 'react';
import { Check, Quote, Sparkles, X } from 'lucide-react';
import clsx from 'clsx';
import { Badge } from '../../ui';
import {
  DESIGNATION_NATURE,
  LIBELLE_NATURE,
  decrireLocalisation,
} from '../../../lib/importReferentiel';

/**
 * Une proposition de l'IA, telle qu'un relecteur doit la voir pour décider.
 *
 * Trois choses doivent se lire d'un coup d'œil : que c'est une proposition et
 * non du contenu établi, ce qu'elle dit exactement, et d'où elle sort. La
 * dernière est la plus facile à négliger et la plus importante — valider sans
 * pouvoir remonter au passage d'origine, c'est valider sur parole.
 *
 * Le libellé est affiché tel quel, jamais résumé : c'est ce texte-là qui
 * entrera au catalogue, et en montrer un autre ferait accepter autre chose
 * que ce qu'on croit.
 *
 * Une décision est définitive. La carte n'offre donc aucun moyen de revenir
 * dessus, et le dit plutôt que de laisser chercher un bouton absent.
 */
export default function CarteProposition({
  element,
  selectionnee,
  surSelection,
  surValider,
  surRejeter,
  enCours,
}) {
  const [motifOuvert, setMotifOuvert] = useState(false);
  const [motif, setMotif] = useState('');

  const source = element.provenance?.source;
  const localisation = decrireLocalisation(source?.localisation);
  const nature = LIBELLE_NATURE[element.nature] ?? element.nature;
  const designation = `${DESIGNATION_NATURE[element.nature] ?? nature.toLowerCase()} ${
    element.code || element.libelle
  }`;

  return (
    <li
      className={clsx(
        'rounded-xl border bg-surface p-4 transition-colors',
        selectionnee ? 'border-brand-300 ring-1 ring-brand-200' : 'border-ink-100'
      )}
    >
      <div className="flex items-start gap-3">
        <input
          type="checkbox"
          className="mt-1"
          checked={selectionnee}
          onChange={(e) => surSelection(e.target.checked)}
          disabled={enCours}
          aria-label={`Sélectionner ${designation}`}
        />

        <div className="min-w-0 flex-1">
          <div className="mb-1.5 flex flex-wrap items-center gap-2">
            <Badge ton="violet" icone={Sparkles}>
              Proposition IA
            </Badge>
            <span className="text-xs font-medium uppercase tracking-wide text-ink-400">
              {nature}
            </span>
            {element.code ? (
              <span className="font-mono text-xs text-ink-500">{element.code}</span>
            ) : null}
          </div>

          <p className="text-sm text-ink-900">{element.libelle}</p>

          {source ? (
            <div className="mt-2 rounded-lg bg-ink-50 px-3 py-2">
              <p className="flex items-center gap-1.5 text-xs font-medium text-ink-600">
                <Quote className="h-3 w-3" aria-hidden />
                Source
                {localisation ? <span className="font-normal">— {localisation}</span> : null}
                {/* La confiance est informative : elle ne vaut jamais
                    validation, et une valeur absente n'est pas affichée
                    plutôt que rendue en « 0 % ». */}
                {source.confiance != null ? (
                  <span className="font-normal text-ink-400">
                    · confiance {Math.round(source.confiance * 100)} %
                  </span>
                ) : null}
              </p>
              {source.texte ? (
                <p className="mt-1 line-clamp-3 text-xs italic text-ink-500">« {source.texte} »</p>
              ) : null}
            </div>
          ) : (
            <p className="mt-2 text-xs text-ink-400">
              Le document n’a pas permis de situer ce passage.
            </p>
          )}

          {motifOuvert ? (
            <div className="mt-3 space-y-2">
              <label className="label" htmlFor={`motif-${element.id}`}>
                Motif du rejet <span className="font-normal text-ink-400">(facultatif)</span>
              </label>
              <textarea
                id={`motif-${element.id}`}
                className="input"
                rows={2}
                value={motif}
                onChange={(e) => setMotif(e.target.value)}
                placeholder="Hors du périmètre audité…"
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  className="btn-danger"
                  onClick={() => surRejeter(motif)}
                  disabled={enCours}
                >
                  Confirmer le rejet
                </button>
                <button
                  type="button"
                  className="btn-ghost"
                  onClick={() => setMotifOuvert(false)}
                  disabled={enCours}
                >
                  Annuler
                </button>
              </div>
              <p className="text-xs text-ink-400">
                La proposition sera conservée et marquée comme écartée. Cette décision est
                définitive.
              </p>
            </div>
          ) : (
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                className="btn-secondary"
                onClick={surValider}
                disabled={enCours}
                aria-label={`Valider ${designation}`}
              >
                <Check className="h-4 w-4" aria-hidden />
                Valider
              </button>
              <button
                type="button"
                className="btn-ghost text-rose-600 dark:text-rose-400"
                onClick={() => setMotifOuvert(true)}
                disabled={enCours}
                aria-label={`Écarter ${designation}`}
              >
                <X className="h-4 w-4" aria-hidden />
                Écarter
              </button>
            </div>
          )}
        </div>
      </div>
    </li>
  );
}

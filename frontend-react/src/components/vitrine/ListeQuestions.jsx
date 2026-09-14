import { useId, useState } from 'react';
import { Plus } from 'lucide-react';
import { typoFr } from '../../lib/typographie';

/**
 * Liste de questions dépliables, commune à la FAQ et à la page Formules.
 *
 * Refonte « Registre de preuves » : des filets entre les questions plutôt
 * qu'une pile de cartes blanches, et un texte à 16-18 px — les deux listes
 * précédentes descendaient à 13 px, illisible pour un dirigeant sur téléphone.
 *
 * Plusieurs réponses peuvent rester ouvertes : un visiteur qui compare deux
 * réponses n'a pas à voir la première se refermer quand il ouvre la seconde.
 *
 * La réponse s'affiche sans glissement — animer une hauteur décalerait la
 * page — et seul le « + » pivote. Une réponse fermée porte l'attribut
 * `hidden`, ce qui la retire aussi de la lecture d'écran.
 */
export default function ListeQuestions({ questions, ouverteParDefaut = null, className = '' }) {
  const prefixe = useId();
  const [ouvertes, definirOuvertes] = useState(() => new Set(ouverteParDefaut === null ? [] : [ouverteParDefaut]));

  function basculer(index) {
    definirOuvertes((precedentes) => {
      const suivantes = new Set(precedentes);
      if (suivantes.has(index)) suivantes.delete(index);
      else suivantes.add(index);
      return suivantes;
    });
  }

  return (
    <ul className={`border-t border-ink-200 ${className}`}>
      {questions.map((entree, index) => {
        const ouverte = ouvertes.has(index);
        const idReponse = `${prefixe}-reponse-${index}`;
        return (
          <li key={entree.question} className="border-b border-ink-200">
            <h3>
              <button
                type="button"
                aria-expanded={ouverte}
                aria-controls={idReponse}
                onClick={() => basculer(index)}
                className="group flex min-h-12 w-full items-start justify-between gap-6 py-5 text-left"
              >
                <span className="min-w-0 font-display text-lg font-bold leading-snug text-ink-900 underline decoration-transparent underline-offset-4 transition-colors group-hover:decoration-ink-300">
                  {typoFr(entree.question)}
                </span>
                {/* Un seul « + » qui pivote en « × » (voir `.icone-bascule`) :
                    changer d'icône d'un coup ne dit pas ce qui a changé. */}
                <span className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center text-ink-900">
                  <Plus className="icone-bascule h-5 w-5" aria-hidden />
                </span>
              </button>
            </h3>
            <div id={idReponse} hidden={!ouverte}>
              <p className="max-w-[65ch] pb-6 text-base leading-[1.65] text-ink-600 sm:pr-12">{typoFr(entree.reponse)}</p>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

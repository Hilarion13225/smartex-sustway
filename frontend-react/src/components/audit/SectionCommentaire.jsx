/** Longueur maximale d'un commentaire de critère. */
const LIMITE = 500;

/**
 * Zone de commentaire libre, avec compteur de caractères. La limite est posée
 * à la fois par `maxLength` (empêche la saisie au-delà) et par une coupe dans
 * le gestionnaire, qui couvre le collage sur les navigateurs où `maxLength`
 * ne s'applique pas au texte collé.
 */
export default function SectionCommentaire({ valeur, surChangement }) {
  return (
    <div>
      <label htmlFor="commentaire-critere" className="block text-sm font-medium text-ink-700">
        Commentaire <span className="text-ink-400">(optionnel)</span>
      </label>
      <div className="relative mt-2.5">
        <textarea
          id="commentaire-critere"
          value={valeur}
          maxLength={LIMITE}
          onChange={(evenement) => surChangement(evenement.target.value.slice(0, LIMITE))}
          placeholder="Ajoutez tout commentaire ou précision utile..."
          className="min-h-[4.5rem] w-full resize-y rounded-xl border border-ink-200 bg-surface px-4 py-3 pb-8 text-sm text-ink-800 outline-none transition placeholder:text-ink-400 focus:border-brand-400 focus:ring-4 focus:ring-brand-100 dark:focus:ring-brand-900/40"
        />
        <span className="pointer-events-none absolute bottom-2.5 right-3.5 text-xs text-ink-400">
          {valeur.length} / {LIMITE}
        </span>
      </div>
    </div>
  );
}

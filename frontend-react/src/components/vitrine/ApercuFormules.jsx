import { Link } from 'react-router-dom';
import GrilleFormules from './GrilleFormules';

/**
 * Les formules sur la page Solution : le visiteur voit le prix et le contenu
 * de chaque offre sans avoir à changer de page.
 *
 * Les cartes sont celles de la page Formules (GrilleFormules), à l'identique :
 * mêmes prix lus dans l'API, mêmes listes, mêmes boutons vers l'inscription.
 */
export default function ApercuFormules() {
  return (
    <section className="border-b border-ink-200 bg-surface">
      <div className="mx-auto max-w-[75rem] px-5 pt-16 sm:pt-20">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <h2 className="font-display text-[1.875rem] font-bold leading-[1.08] tracking-[-0.025em] text-ink-900 sm:text-[2.75rem] [text-wrap:balance]">
              Des formules simples, sans surprise.
            </h2>
            <p className="mt-4 max-w-[56ch] text-lg leading-relaxed text-ink-600">
              Une licence annuelle, sans reconduction tacite. Vous payez en ligne et vous accédez à la plateforme tout
              de suite.
            </p>
          </div>
          <Link to="/formules" viewTransition className="lien-trait text-base lg:self-auto">
            Comparer les formules en détail
          </Link>
        </div>
      </div>

      {/* Même enveloppe que sur la page Formules, pour une grille identique. */}
      <div className="mx-auto max-w-[80rem] px-5 pb-16 pt-12 sm:pb-20">
        <GrilleFormules niveauTitre="h3" />
      </div>
    </section>
  );
}

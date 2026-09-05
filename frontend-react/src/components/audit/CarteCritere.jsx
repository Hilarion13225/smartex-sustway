import { Bookmark, Info } from 'lucide-react';
import clsx from 'clsx';
import CarteNiveauMaturite from './CarteNiveauMaturite';
import SectionCommentaire from './SectionCommentaire';
import DepotPreuves from './DepotPreuves';
import ListeFichiers from './ListeFichiers';
import ActionsCritere from './ActionsCritere';
import { NIVEAUX_MATURITE } from './niveauxMaturite';

/**
 * Carte de saisie d'un critère : énoncé, échelle de maturité, commentaire,
 * preuves et actions. Composant contrôlé — l'état de la réponse est tenu par
 * le parent, de sorte que le passage d'un critère à l'autre reste sa
 * responsabilité.
 */
export default function CarteCritere({
  code,
  criticite,
  question,
  aide,
  marquePourRevue,
  surMarquerPourRevue,
  niveauSelectionne,
  surSelectionNiveau,
  commentaire,
  surChangementCommentaire,
  fichiers,
  surAjoutFichiers,
  surSuppressionFichier,
  surPrecedent,
  surBrouillon,
  surContinuer,
  brouillonEnregistre,
  premier,
}) {
  return (
    <article className="rounded-2xl border border-ink-100 bg-surface p-6 shadow-sm sm:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold text-brand-600 dark:text-brand-400">{code}</span>
          <span className="rounded-full bg-brand-50 px-3 py-1 text-xs font-medium text-brand-700 dark:bg-brand-500/15 dark:text-brand-400">
            Criticité&nbsp;: {criticite}
          </span>
        </div>

        <button
          type="button"
          onClick={surMarquerPourRevue}
          aria-pressed={marquePourRevue}
          className={clsx(
            'inline-flex items-center gap-2 text-sm font-medium transition-colors',
            marquePourRevue ? 'text-brand-600 dark:text-brand-400' : 'text-ink-500 hover:text-ink-800'
          )}
        >
          <Bookmark className={clsx('h-4 w-4', marquePourRevue && 'fill-current')} aria-hidden />
          {marquePourRevue ? 'Marqué pour revue' : 'Marquer pour revue'}
        </button>
      </div>

      <h3 className="mt-6 flex items-start gap-2 text-xl font-bold leading-snug text-ink-900 sm:text-[1.4rem]">
        <span>{question}</span>
        {aide ? (
          <span title={aide} className="mt-1.5 shrink-0 text-ink-400">
            <Info className="h-4 w-4" aria-hidden />
            <span className="sr-only">{aide}</span>
          </span>
        ) : null}
      </h3>
      <p className="mt-3 text-sm text-ink-500">
        Sélectionnez le niveau qui décrit le mieux la situation actuelle de votre organisation.
      </p>

      {/* Cinq colonnes seulement à partir de `xl` : en dessous, les
          descriptions deviendraient illisibles sur une colonne de 150 px. */}
      <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {NIVEAUX_MATURITE.map((niveau) => (
          <CarteNiveauMaturite
            key={niveau.niveau}
            niveau={niveau.niveau}
            titre={niveau.titre}
            description={niveau.description}
            selectionne={niveauSelectionne === niveau.niveau}
            surSelection={() => surSelectionNiveau(niveau.niveau)}
          />
        ))}
      </div>

      <div className="mt-7">
        <SectionCommentaire valeur={commentaire} surChangement={surChangementCommentaire} />
      </div>

      <div className="mt-7">
        <p className="text-sm font-medium text-ink-700">
          Preuves et documents <span className="text-ink-400">(optionnel)</span>
        </p>
        <div className="mt-2.5 grid gap-4 lg:grid-cols-2">
          <DepotPreuves surAjout={surAjoutFichiers} />
          <ListeFichiers fichiers={fichiers} surSuppression={surSuppressionFichier} />
        </div>
      </div>

      <div className="mt-8">
        <ActionsCritere
          surPrecedent={surPrecedent}
          surBrouillon={surBrouillon}
          surContinuer={surContinuer}
          brouillonEnregistre={brouillonEnregistre}
          premier={premier}
        />
      </div>
    </article>
  );
}

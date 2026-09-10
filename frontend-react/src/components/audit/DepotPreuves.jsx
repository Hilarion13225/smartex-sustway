import { useRef, useState } from 'react';
import { UploadCloud } from 'lucide-react';
import clsx from 'clsx';
import { TAILLE_MAX_FICHIER, TYPES_FICHIERS_ACCEPTES, formaterTailleFichier } from './niveauxMaturite';

/**
 * Zone de dépôt de fichiers : glisser-déposer et sélection classique
 * aboutissent au même traitement. Les fichiers trop volumineux sont écartés
 * avec un message nommant chaque fichier refusé, plutôt qu'un rejet
 * silencieux.
 *
 * Les limites sont paramétrables, et valent par défaut celles des pièces
 * d'audit — son premier usage. L'import de référentiel n'admet pas les mêmes
 * formats ni la même taille : lui imposer celles-ci ferait refuser par
 * l'écran des fichiers que l'API accepte. Un second composant de dépôt aurait
 * été l'autre solution ; deux zones de glisser-déposer à maintenir en
 * parallèle finissent toujours par diverger.
 */
export default function DepotPreuves({
  surAjout,
  typesAcceptes = TYPES_FICHIERS_ACCEPTES,
  tailleMax = TAILLE_MAX_FICHIER,
  libelleFormats = 'PDF, Word, Excel, Images',
  multiple = true,
}) {
  const champFichier = useRef(null);
  const [survol, setSurvol] = useState(false);
  const [erreur, setErreur] = useState(null);

  function traiter(listeFichiers) {
    const fichiers = [...listeFichiers];
    if (fichiers.length === 0) return;

    const tropVolumineux = fichiers.filter((fichier) => fichier.size > tailleMax);
    const acceptes = fichiers.filter((fichier) => fichier.size <= tailleMax);

    setErreur(
      tropVolumineux.length === 0
        ? null
        : `Fichier trop volumineux (max. ${formaterTailleFichier(tailleMax)}) : ${tropVolumineux
            .map((fichier) => fichier.name)
            .join(', ')}`
    );

    if (acceptes.length > 0) surAjout(acceptes);
  }

  return (
    <div>
      <div
        onDragOver={(evenement) => {
          evenement.preventDefault();
          setSurvol(true);
        }}
        onDragLeave={() => setSurvol(false)}
        onDrop={(evenement) => {
          evenement.preventDefault();
          setSurvol(false);
          traiter(evenement.dataTransfer.files);
        }}
        className={clsx(
          'flex items-center gap-4 rounded-2xl border border-dashed p-4 transition-colors',
          survol ? 'border-brand-400 bg-brand-50/60 dark:bg-brand-500/10' : 'border-ink-200 bg-surface'
        )}
      >
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-ink-100 bg-ink-50 text-ink-500">
          <UploadCloud className="h-5 w-5" strokeWidth={1.6} aria-hidden />
        </span>
        <div className="min-w-0">
          <p className="text-sm text-ink-700">
            Glisser-déposer vos fichiers ici ou{' '}
            <button
              type="button"
              onClick={() => champFichier.current?.click()}
              className="font-medium text-brand-600 underline-offset-2 hover:underline dark:text-brand-400"
            >
              parcourir vos fichiers
            </button>
          </p>
          <p className="mt-1 text-xs text-ink-400">
            {libelleFormats} (max. {formaterTailleFichier(tailleMax)} par fichier)
          </p>
        </div>

        <input
          ref={champFichier}
          type="file"
          multiple={multiple}
          accept={typesAcceptes}
          className="sr-only"
          onChange={(evenement) => {
            traiter(evenement.target.files);
            // Réinitialise le champ pour que redéposer le même fichier
            // déclenche bien un nouvel événement `change`.
            evenement.target.value = '';
          }}
        />
      </div>

      {erreur ? (
        <p role="alert" className="mt-2 text-xs font-medium text-rose-600 dark:text-rose-400">
          {erreur}
        </p>
      ) : null}
    </div>
  );
}

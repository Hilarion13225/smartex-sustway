import { useEffect, useRef, useState } from 'react';
import { FileText, MoreVertical, Trash2 } from 'lucide-react';
import { formaterTailleFichier } from './niveauxMaturite';

/** Ligne de fichier, avec son menu de suppression. */
function LigneFichier({ fichier, surSuppression }) {
  const [menuOuvert, setMenuOuvert] = useState(false);
  const conteneur = useRef(null);

  useEffect(() => {
    if (!menuOuvert) return undefined;
    const surClicExterieur = (evenement) => {
      if (conteneur.current && !conteneur.current.contains(evenement.target)) setMenuOuvert(false);
    };
    document.addEventListener('mousedown', surClicExterieur);
    return () => document.removeEventListener('mousedown', surClicExterieur);
  }, [menuOuvert]);

  return (
    <li className="flex items-center gap-3 rounded-xl px-1 py-2">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-400">
        <FileText className="h-4 w-4" aria-hidden />
      </span>
      <span className="min-w-0 flex-1 truncate text-sm font-medium text-ink-800">{fichier.nom}</span>
      {fichier.taille ? (
        <span className="shrink-0 text-xs text-ink-500">{formaterTailleFichier(fichier.taille)}</span>
      ) : null}

      {/* Le menu n'apparaît que si une suppression est possible : l'API des
          preuves n'expose pas de suppression (traçabilité RG14), un bouton
          inerte induirait en erreur. */}
      {!surSuppression ? null : (
      <div ref={conteneur} className="relative shrink-0">
        <button
          type="button"
          onClick={() => setMenuOuvert((ouvert) => !ouvert)}
          aria-expanded={menuOuvert}
          aria-label={`Actions sur ${fichier.nom}`}
          className="rounded-lg p-1.5 text-ink-400 transition-colors hover:bg-ink-100 hover:text-ink-700"
        >
          <MoreVertical className="h-4 w-4" aria-hidden />
        </button>
        {menuOuvert ? (
          <div className="absolute right-0 top-full z-10 mt-1 w-44 overflow-hidden rounded-xl border border-ink-100 bg-surface shadow-soft">
            <button
              type="button"
              onClick={() => {
                setMenuOuvert(false);
                surSuppression(fichier.id);
              }}
              className="flex w-full items-center gap-2 px-3.5 py-2.5 text-sm text-rose-600 transition-colors hover:bg-rose-50 dark:hover:bg-rose-500/10"
            >
              <Trash2 className="h-4 w-4" aria-hidden />
              Supprimer
            </button>
          </div>
        ) : null}
      </div>
      )}
    </li>
  );
}

/** Panneau listant les preuves déjà jointes au critère. */
export default function ListeFichiers({ fichiers, surSuppression }) {
  return (
    <div className="rounded-2xl border border-ink-100 bg-surface p-4">
      <p className="text-sm font-medium text-ink-700">Fichiers ajoutés ({fichiers.length})</p>
      {fichiers.length === 0 ? (
        <p className="mt-3 text-xs text-ink-400">Aucune preuve jointe pour ce critère.</p>
      ) : (
        <ul className="mt-1.5 divide-y divide-ink-100">
          {fichiers.map((fichier) => (
            <LigneFichier key={fichier.id} fichier={fichier} surSuppression={surSuppression} />
          ))}
        </ul>
      )}
    </div>
  );
}

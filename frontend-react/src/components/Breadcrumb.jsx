import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';

/**
 * Fil d'Ariane, pour les pages enfouies dans la hiérarchie du produit.
 *
 * La navigation va jusqu'à quatre niveaux — organisation, mission, critère,
 * et la fiche qui s'ouvre dessus. Jusqu'ici chaque page portait son propre
 * bouton « ← Retour », qui ne remontait que d'un cran : depuis un critère,
 * revenir à l'organisation demandait trois clics et de savoir par où passer.
 *
 * Le composant ne connaît aucune route : il reçoit les éléments déjà résolus.
 * Une page sait ce qu'elle affiche — le nom de la mission, le code du critère
 * — là où une déduction faite à partir de l'URL devrait deviner ces libellés
 * ou les redemander à l'API.
 *
 * Il ne remplace pas les boutons de retour existants, qui restent utiles pour
 * revenir d'un cran sans viser : les deux gestes ne sont pas les mêmes.
 *
 * @param {{libelle: string, vers?: string}[]} elements — dans l'ordre, du plus
 *        général au plus précis. Un élément sans `vers` n'est pas cliquable ;
 *        le dernier ne l'est jamais, c'est la page courante.
 */
export default function Breadcrumb({ elements }) {
  const etapes = (elements ?? []).filter((e) => e && e.libelle);
  if (etapes.length === 0) return null;

  return (
    <nav aria-label="Fil d’Ariane" className="mb-4">
      <ol className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-sm">
        {etapes.map((etape, indice) => {
          const derniere = indice === etapes.length - 1;
          return (
            <li key={`${etape.libelle}-${indice}`} className="flex min-w-0 items-center gap-1.5">
              {indice > 0 ? (
                <ChevronRight className="h-3.5 w-3.5 shrink-0 text-ink-300" aria-hidden />
              ) : null}
              {derniere || !etape.vers ? (
                // La page courante est annoncée comme telle : un lecteur
                // d'écran qui parcourt le fil doit savoir où il s'arrête.
                <span
                  className="truncate font-medium text-ink-900"
                  aria-current={derniere ? 'page' : undefined}
                >
                  {etape.libelle}
                </span>
              ) : (
                <Link
                  to={etape.vers}
                  className="truncate text-ink-500 transition-colors hover:text-brand-700 dark:hover:text-brand-400"
                >
                  {etape.libelle}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

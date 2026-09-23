import { ArrowUpRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import clsx from 'clsx';

/**
 * Indicateur clé du tableau de bord : une valeur, son intitulé et une
 * précision.
 *
 * `vers` fait de la carte un lien vers l'écran qui porte le détail. C'est ce
 * qui permet aux indicateurs d'ouvrir le tableau de bord : tant qu'ils ne
 * faisaient qu'afficher un état, il était juste de leur préférer les alertes,
 * qui mènent quelque part. Un indicateur qu'on peut suivre jusqu'à sa source
 * n'est plus un simple constat.
 *
 * `enAvant` donne à la carte le fond de marque. Une seule par rangée : la mise
 * en avant ne dit quelque chose que si elle désigne.
 *
 * `ratio` ajoute une jauge sous le chiffre, pour les indicateurs qui sont une
 * part d'un tout — un taux de complétion, un avancement. Un pourcentage seul
 * demande au lecteur de situer lui-même 64 % entre 0 et 100 ; la jauge le fait
 * voir. Les indicateurs qui comptent des objets — missions actives, missions à
 * risque — n'en reçoivent pas : leur maximum n'est pas connu, et une jauge sans
 * échelle inventerait un plafond.
 *
 * Volontairement une jauge en CSS et non un graphique : une barre de quatre
 * pixels n'a ni axe, ni légende, ni survol à porter, et un canvas par carte
 * coûterait cinq contextes de rendu pour cinq rectangles.
 */
export default function CarteKpi({
  icone: Icone,
  valeur,
  libelle,
  precision,
  ton = 'neutre',
  ratio = null,
  vers = null,
  enAvant = false,
}) {
  const tons = {
    neutre: 'bg-ink-100 text-ink-500',
    marque: 'bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-400',
    alerte: 'bg-amber-50 text-amber-600 dark:bg-amber-500/15 dark:text-amber-400',
    succes: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400',
  };

  /* La jauge reprend la teinte du ton de la carte : elle prolonge l'indicateur
     plutôt que d'introduire une couleur de plus. */
  const remplissages = {
    neutre: 'bg-ink-400',
    marque: 'bg-brand-600 dark:bg-brand-400',
    alerte: 'bg-amber-500',
    succes: 'bg-emerald-500',
  };

  const part = ratio == null ? null : Math.max(0, Math.min(100, Math.round(ratio)));
  const Enveloppe = vers ? Link : 'div';

  return (
    <Enveloppe
      {...(vers ? { to: vers, viewTransition: true } : {})}
      className={clsx(
        'group block rounded-2xl border p-4 shadow-sm sm:p-5',
        enAvant
          ? 'border-transparent bg-brand-700 text-white'
          : 'border-ink-100 bg-surface',
        vers &&
          'transition-[transform,box-shadow] duration-300 ease-out motion-safe:hover:-translate-y-1 motion-safe:hover:shadow-md motion-reduce:transition-none'
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <p
          className={clsx(
            'text-xs font-medium uppercase tracking-wide',
            enAvant ? 'text-white/75' : 'text-ink-500'
          )}
        >
          {libelle}
        </p>

        {/*
         * La flèche marque les cartes qui mènent quelque part, et l'icône
         * celles qui ne font qu'informer. Deux signes pour deux natures : une
         * flèche sur une carte inerte promettrait un clic qui ne vient pas.
         */}
        {vers ? (
          <span
            aria-hidden
            className={clsx(
              'flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-colors',
              enAvant
                ? 'bg-white/15 text-white group-hover:bg-white/25'
                : 'bg-ink-100 text-ink-500 group-hover:bg-brand-50 group-hover:text-brand-600'
            )}
          >
            <ArrowUpRight className="h-4 w-4" strokeWidth={2} />
          </span>
        ) : (
          <span
            className={clsx(
              'hidden h-9 w-9 shrink-0 items-center justify-center rounded-xl sm:flex',
              enAvant ? 'bg-white/15 text-white' : tons[ton]
            )}
          >
            <Icone className="h-4 w-4" aria-hidden />
          </span>
        )}
      </div>

      <p
        className={clsx(
          'mt-3 text-2xl font-bold tabular-nums sm:text-3xl',
          enAvant ? 'text-white' : 'text-ink-900'
        )}
      >
        {valeur}
      </p>

      {/* `aria-hidden` : la jauge ne dit rien que la valeur juste au-dessus
          n'ait déjà dit. La faire lire ferait entendre le nombre deux fois. */}
      {part == null ? null : (
        <div
          aria-hidden
          className={clsx('mt-3 h-1 w-full overflow-hidden rounded-full', enAvant ? 'bg-white/20' : 'bg-ink-100')}
        >
          <div
            className={clsx(
              'h-full rounded-full transition-[width] duration-500 ease-out',
              enAvant ? 'bg-white' : remplissages[ton]
            )}
            style={{ width: `${part}%` }}
          />
        </div>
      )}

      {precision ? (
        <p
          className={clsx(
            'text-xs',
            part == null ? 'mt-1' : 'mt-2',
            enAvant ? 'text-white/70' : 'text-ink-500'
          )}
        >
          {precision}
        </p>
      ) : null}
    </Enveloppe>
  );
}

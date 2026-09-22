import clsx from 'clsx';

/**
 * Indicateur clé du tableau de bord : une valeur, son intitulé et une
 * précision. L'icône reste discrète — sur quatre cartes alignées, un aplat
 * de couleur par carte transformerait la ligne en bandeau publicitaire.
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
export default function CarteKpi({ icone: Icone, valeur, libelle, precision, ton = 'neutre', ratio = null }) {
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

  return (
    <div className="rounded-2xl border border-ink-100 bg-surface p-4 shadow-sm sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-medium uppercase tracking-wide text-ink-500">{libelle}</p>
        <span className={clsx('hidden h-9 w-9 shrink-0 items-center justify-center rounded-xl sm:flex', tons[ton])}>
          <Icone className="h-4 w-4" aria-hidden />
        </span>
      </div>
      <p className="mt-3 text-2xl font-bold tabular-nums text-ink-900 sm:text-3xl">{valeur}</p>

      {/* `aria-hidden` : la jauge ne dit rien que la valeur juste au-dessus
          n'ait déjà dit. La faire lire ferait entendre le nombre deux fois. */}
      {part == null ? null : (
        <div aria-hidden className="mt-3 h-1 w-full overflow-hidden rounded-full bg-ink-100">
          <div
            className={clsx('h-full rounded-full transition-[width] duration-500 ease-out', remplissages[ton])}
            style={{ width: `${part}%` }}
          />
        </div>
      )}

      {precision ? <p className={clsx('text-xs text-ink-500', part == null ? 'mt-1' : 'mt-2')}>{precision}</p> : null}
    </div>
  );
}

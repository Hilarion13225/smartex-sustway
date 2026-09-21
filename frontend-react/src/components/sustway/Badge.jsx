import clsx from 'clsx';

/*
 * Étiquette d'état. Les teintes viennent des couleurs fonctionnelles de la
 * charte ; le fond est la couleur à 12 % et le texte la couleur pleine, ce qui
 * tient le contraste sur blanc sans multiplier les variables.
 *
 * `haute`, `moyenne`, `basse` sont les priorités des plans d'action ; les
 * autres clés sont des états d'avancement. Deux vocabulaires, une seule
 * mécanique — un plan d'action affiche toujours les deux côte à côte.
 */
const TONS = {
  neutre: 'bg-ink-100 text-ink-700 ring-ink-200',
  succes: 'bg-brand-50 text-brand-700 ring-brand-200',
  attention: 'bg-attention/12 text-[#8A5F12] ring-attention/30',
  risque: 'bg-risque/12 text-[#9A3E30] ring-risque/30',
  information: 'bg-information/12 text-[#33607F] ring-information/30',
};

export default function Badge({ ton = 'neutre', className, children }) {
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset',
        TONS[ton],
        className
      )}
    >
      {children}
    </span>
  );
}

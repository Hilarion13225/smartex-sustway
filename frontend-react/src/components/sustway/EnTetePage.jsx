import clsx from 'clsx';

/*
 * Bandeau de titre des pages intérieures.
 *
 * Il porte le seul `h1` de la page. Les sections qui suivent ouvrent donc en
 * `h2` : deux titres de niveau 1 sur une même page désorientent un lecteur
 * d'écran, qui s'en sert pour savoir de quoi la page parle.
 *
 * Pas d'image de fond, pas de fil d'Ariane : la barre de navigation marque
 * déjà la page courante, et une photographie posée derrière le titre ferait
 * exactement ce que la charte écarte — décorer au lieu de situer. Le bandeau
 * se distingue du contenu par sa seule plage de couleur.
 */
export default function EnTetePage({ surTitre, titre, sousTitre, fond = 'mist', children }) {
  return (
    <section
      className={clsx(
        'border-b border-ink-200',
        fond === 'sable' ? 'bg-sable' : 'bg-ink-50'
      )}
    >
      <div className="mx-auto w-full max-w-[1200px] px-5 py-16 sm:px-8 lg:py-20">
        <p className="text-[13px] font-semibold uppercase tracking-[0.16em] text-brand-600">{surTitre}</p>
        {/*
         * `text-balance` : sur un titre de deux lignes, il évite le mot seul
         * abandonné sur la seconde.
         *
         * `hyphens-auto` : « L'opérationnalisation » dépasse à lui seul la
         * largeur d'un écran de 320 px, et poussait la page à 329 px — mesuré
         * au navigateur. La césure automatique le coupe proprement ; elle
         * suppose la langue déclarée, ce que fait `<html lang="fr">`.
         */}
        <h1 className="mt-5 max-w-4xl text-balance hyphens-auto break-words text-[32px] font-bold leading-[1.12] tracking-[-0.025em] text-forest sm:text-[42px] lg:text-[48px]">
          {titre}
        </h1>
        {sousTitre ? (
          <p className="mt-5 max-w-3xl text-[17px] leading-relaxed text-ink-600 sm:text-lg">{sousTitre}</p>
        ) : null}
        {children}
      </div>
    </section>
  );
}

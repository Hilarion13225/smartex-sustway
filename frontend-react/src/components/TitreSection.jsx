import clsx from 'clsx';
import Revele from './Revele';

/**
 * Intitulé de section des pages vitrine : sur-titre fileté, titre éditorial
 * en serif et chapeau optionnel. `centre` bascule l'alignement au centre.
 */
export default function TitreSection({ etiquette, icone: Icone, titre, description, centre = false, className }) {
  return (
    <Revele className={clsx(centre ? 'mx-auto max-w-5xl text-center' : 'max-w-5xl', className)}>
      {etiquette ? (
        <p className={clsx('sur-titre text-brand-600 dark:text-brand-400', centre && 'justify-center')}>
          <span className="filet" aria-hidden />
          {Icone ? <Icone className="h-4 w-4" aria-hidden /> : null}
          {etiquette}
        </p>
      ) : null}
      <h2 className="titre-editorial mt-5 text-3xl leading-tight text-ink-900 sm:text-[2.6rem]">{titre}</h2>
      {description ? (
        <p className="mt-4 text-base font-light leading-relaxed text-ink-600">{description}</p>
      ) : null}
    </Revele>
  );
}

import { Badge } from './ui';

/** Bandeau de titre des pages publiques secondaires (Services, À propos, Contact…). */
export default function EnTeteVitrine({ etiquette, icone, titre, description }) {
  return (
    <section className="relative overflow-hidden border-b border-ink-100">
      <div className="pointer-events-none absolute inset-0 bg-halo-brand" aria-hidden />
      <div
        className="pointer-events-none absolute inset-0 bg-grille-ink bg-grille [mask-image:radial-gradient(70%_70%_at_50%_0%,black,transparent)]"
        aria-hidden
      />
      <span
        className="pointer-events-none absolute -right-20 -top-16 h-72 w-72 rounded-full bg-brand-200/40 blur-3xl motion-safe:animate-respiration"
        aria-hidden
      />
      <div className="relative mx-auto max-w-[90rem] px-5 py-16 motion-safe:animate-apparition-bas">
        {etiquette ? (
          <Badge ton="vert" icone={icone}>
            {etiquette}
          </Badge>
        ) : null}
        <h1 className="mt-4 max-w-3xl text-4xl font-semibold leading-tight text-ink-900 sm:text-5xl">{titre}</h1>
        {description ? <p className="mt-4 max-w-2xl text-base leading-relaxed text-ink-600">{description}</p> : null}
      </div>
    </section>
  );
}

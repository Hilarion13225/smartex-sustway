/**
 * Bandeau de titre des pages publiques secondaires (Méthodologie, Services,
 * Contact…). `image` optionnelle : bandeau photo avec voile sombre au lieu
 * du décor dégradé/grille par défaut. `video` optionnelle : bandeau vidéo en
 * lecture automatique (silencieuse, en boucle) à la place de la photo — prend
 * le pas sur `image` si les deux sont fournies. `reperes` affiche une ligne
 * de chiffres clés sous le chapeau.
 */
export default function EnTeteVitrine({ etiquette, icone, titre, description, image, video, reperes }) {
  const Icone = icone;

  const surTitre = etiquette ? (
    <p className="sur-titre">
      <span className="filet" aria-hidden />
      {Icone ? <Icone className="h-4 w-4" aria-hidden /> : null}
      {etiquette}
    </p>
  ) : null;

  const chiffres = reperes?.length ? (
    <dl className="mt-10 flex flex-wrap gap-x-12 gap-y-5">
      {reperes.map((repere) => (
        <div key={repere.libelle}>
          <dt className="sr-only">{repere.libelle}</dt>
          <dd>
            <span className="titre-editorial block text-3xl leading-none">{repere.valeur}</span>
            <span className="mt-2 block text-[0.7rem] font-medium uppercase tracking-[0.22em]">{repere.libelle}</span>
          </dd>
        </div>
      ))}
    </dl>
  ) : null;

  if (image || video) {
    return (
      <section className="relative overflow-hidden">
        {video ? (
          <video
            src={video}
            poster={image}
            autoPlay
            muted
            loop
            playsInline
            className="absolute inset-0 h-full w-full object-cover"
            aria-hidden
          />
        ) : (
          <img
            src={image}
            alt=""
            className="absolute inset-0 h-full w-full object-cover motion-safe:animate-zoom-lent"
            aria-hidden
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[#141821] via-[#141821]/85 to-[#141821]/45" aria-hidden />
        <div
          className="absolute inset-0 bg-[radial-gradient(70%_90%_at_15%_100%,rgba(179,39,30,0.35),transparent_65%)]"
          aria-hidden
        />
        <div className="relative mx-auto max-w-[90rem] px-5 pb-20 pt-24 text-white motion-safe:animate-apparition-bas sm:pb-28 sm:pt-32">
          <div className="text-white/70">{surTitre}</div>
          <h1 className="titre-editorial mt-6 max-w-4xl text-4xl leading-[1.08] sm:text-6xl">{titre}</h1>
          {description ? (
            <p className="mt-6 max-w-2xl text-base font-light leading-relaxed text-white/75 sm:text-lg">{description}</p>
          ) : null}
          <div className="text-white/60">{chiffres}</div>
        </div>
      </section>
    );
  }

  return (
    <section className="relative overflow-hidden border-b border-ink-100">
      <div className="pointer-events-none absolute inset-0 bg-halo-vert" aria-hidden />
      <div
        className="pointer-events-none absolute inset-0 bg-grille-ink bg-grille [mask-image:radial-gradient(70%_70%_at_50%_0%,black,transparent)]"
        aria-hidden
      />
      <span
        className="pointer-events-none absolute -right-20 -top-16 h-72 w-72 rounded-full bg-emerald-200/40 blur-3xl motion-safe:animate-respiration dark:bg-emerald-500/20"
        aria-hidden
      />
      <div className="relative mx-auto max-w-[90rem] px-5 py-24 motion-safe:animate-apparition-bas">
        <div className="text-brand-600 dark:text-brand-400">{surTitre}</div>
        <h1 className="titre-editorial mt-6 max-w-4xl text-4xl leading-[1.08] text-ink-900 sm:text-6xl">{titre}</h1>
        {description ? (
          <p className="mt-6 max-w-2xl text-base font-light leading-relaxed text-ink-600 sm:text-lg">{description}</p>
        ) : null}
        <div className="text-ink-500">{chiffres}</div>
      </div>
    </section>
  );
}

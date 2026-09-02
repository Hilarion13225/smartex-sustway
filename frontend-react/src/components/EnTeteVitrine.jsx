import { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

/** Délai entre deux messages du carrousel vidéo, en repos (aucune interaction). */
const DELAI_ROTATION_MS = 4000;

/**
 * Bandeau de titre des pages publiques secondaires (Méthodologie, Services,
 * Contact…). `image` optionnelle : bandeau photo avec voile sombre au lieu
 * du décor dégradé/grille par défaut. `video` optionnelle : bandeau vidéo en
 * lecture automatique (silencieuse, en boucle) à la place de la photo — prend
 * le pas sur `image` si les deux sont fournies. `messages` optionnel (tableau
 * de textes ; un message peut contenir des retours à la ligne `\n`, rendus
 * tels quels) : avec `video`, affiche plusieurs messages qui défilent seuls
 * toutes les 6 s (en pause au survol), navigables aussi aux flèches, au
 * glissement tactile et à la molette latérale — sinon `description` seule
 * suffit. `reperes` affiche une ligne de chiffres clés sous le chapeau.
 */
export default function EnTeteVitrine({ etiquette, icone, titre, description, image, video, messages, reperes }) {
  const Icone = icone;
  const [indiceMessage, setIndiceMessage] = useState(0);
  const [enSurvol, setEnSurvol] = useState(false);
  const messagesCarousel = messages?.length ? messages : description ? [description] : [];
  const messageActif = messagesCarousel[indiceMessage];
  const modeCarousel = Boolean(video && messages?.length);
  const precedent = () => setIndiceMessage((i) => (i - 1 + messagesCarousel.length) % messagesCarousel.length);
  const suivant = () => setIndiceMessage((i) => (i + 1) % messagesCarousel.length);

  // Navigation au glissement horizontal (doigt sur mobile, molette latérale
  // sur trackpad) — un seuil évite de déclencher un changement sur un simple
  // tapotement ou un scroll vertical de la page.
  const toucheDebut = useRef(0);
  const surToucheDebut = (e) => {
    toucheDebut.current = e.touches[0].clientX;
  };
  const surToucheFin = (e) => {
    const delta = e.changedTouches[0].clientX - toucheDebut.current;
    if (delta > 50) precedent();
    else if (delta < -50) suivant();
  };
  const rouleauEnCours = useRef(false);
  const surRouleau = (e) => {
    if (Math.abs(e.deltaX) <= Math.abs(e.deltaY) || Math.abs(e.deltaX) < 20 || rouleauEnCours.current) return;
    rouleauEnCours.current = true;
    if (e.deltaX > 0) suivant();
    else precedent();
    setTimeout(() => {
      rouleauEnCours.current = false;
    }, 600);
  };

  useEffect(() => {
    if (!modeCarousel || messagesCarousel.length <= 1 || enSurvol) return undefined;
    const minuteur = setInterval(() => {
      setIndiceMessage((i) => (i + 1) % messagesCarousel.length);
    }, DELAI_ROTATION_MS);
    return () => clearInterval(minuteur);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modeCarousel, messagesCarousel.length, indiceMessage, enSurvol]);

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
      <section className={`relative overflow-hidden ${modeCarousel ? 'h-[640px] sm:h-[600px] lg:h-[600px]' : ''}`}>
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
        <div
          onTouchStart={modeCarousel ? surToucheDebut : undefined}
          onTouchEnd={modeCarousel ? surToucheFin : undefined}
          onWheel={modeCarousel ? surRouleau : undefined}
          onMouseEnter={modeCarousel ? () => setEnSurvol(true) : undefined}
          onMouseLeave={modeCarousel ? () => setEnSurvol(false) : undefined}
          className={`relative mx-auto flex max-w-[90rem] px-5 text-white motion-safe:animate-apparition-bas ${
            modeCarousel
              ? 'h-full flex-col items-center justify-center py-16 text-center'
              : 'flex-col pb-20 pt-24 sm:pb-28 sm:pt-32'
          }`}
        >
          <div className="text-white/70">{surTitre}</div>
          {modeCarousel ? (
            <>
              <h1
                key={indiceMessage}
                className="titre-editorial mt-6 max-w-6xl whitespace-pre-line text-2xl uppercase leading-[1.2] motion-safe:animate-apparition-bas sm:text-3xl lg:text-4xl"
              >
                {messageActif}
              </h1>
              {messagesCarousel.length > 1 ? (
                <>
                  <button
                    type="button"
                    onClick={precedent}
                    className="absolute left-4 top-1/2 hidden h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/15 text-white backdrop-blur transition hover:bg-white/30 sm:flex"
                    aria-label="Message précédent"
                  >
                    <ChevronLeft className="h-6 w-6" aria-hidden />
                  </button>
                  <button
                    type="button"
                    onClick={suivant}
                    className="absolute right-4 top-1/2 hidden h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/15 text-white backdrop-blur transition hover:bg-white/30 sm:flex"
                    aria-label="Message suivant"
                  >
                    <ChevronRight className="h-6 w-6" aria-hidden />
                  </button>
                </>
              ) : null}
            </>
          ) : (
            <>
              <h1 className="titre-editorial mt-6 max-w-4xl text-4xl leading-[1.08] sm:text-6xl">{titre}</h1>
              {description ? (
                <p className="mt-6 max-w-2xl text-base font-light leading-relaxed text-white/75 sm:text-lg">{description}</p>
              ) : null}
            </>
          )}
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

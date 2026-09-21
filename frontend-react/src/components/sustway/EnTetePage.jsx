/*
 * Bandeau de titre des pages intérieures : photographie en fond, voile Forest,
 * titre centré et sous-titre.
 *
 * Même forme que les bandeaux des pages antérieures (Méthodologie, Formules,
 * Déploiement), pour que le site n'ouvre pas ses pages de deux façons selon
 * l'époque à laquelle elles ont été écrites. Seule la teinte du voile change :
 * elle suit la palette de l'enveloppe, donc le vert de la charte ici.
 *
 * Le bandeau porte le seul `h1` de la page. Les sections qui suivent ouvrent
 * en `h2` : deux titres de niveau 1 sur une même page désorientent un lecteur
 * d'écran, qui s'en sert pour savoir de quoi la page parle.
 *
 * Le sous-titre est posé dans le bandeau plutôt que dans une bande claire en
 * dessous : la page s'ouvrait alors sur deux séparations rapprochées, et le
 * bandeau ne portait qu'un titre là où il a la place d'annoncer le sujet en
 * entier.
 *
 * Le fil d'Ariane « Accueil — <page> » qui s'intercalait entre le titre et le
 * sous-titre est retiré. Le site a cinq pages, toutes atteignables depuis la
 * barre de navigation qui reste visible en permanence : le chemin qu'il
 * annonçait n'avait qu'un niveau, et il repoussait la promesse de la page.
 *
 * Les trois niveaux de texte tiennent sur la photographie parce que le halo
 * central est dimensionné pour les couvrir tous les trois — voir la mesure de
 * contraste plus bas.
 */
export default function EnTetePage({ titre, sousTitre, image, children }) {
  return (
    <>
      {/* `min-h` plutôt qu'un simple remplissage : la hauteur ne dépend plus
          de la longueur du titre, et les quatre pages s'ouvrent de la même
          façon. Elle allait de 236 à 370 px selon que le titre tenait sur une
          ou deux lignes — assez peu pour que la photographie ne se lise pas. */}
      <section className="relative isolate flex min-h-[340px] items-center overflow-hidden bg-forest text-white sm:min-h-[420px] lg:min-h-[480px]">
        {/*
         * `alt` vide et `aria-hidden` sur le voile : la photographie illustre,
         * elle n'informe pas. La décrire ferait entendre « poignée de main »
         * avant le titre de la page, ce qui retarde l'information utile.
         *
         * `eager` et `fetchPriority="high"` : c'est le plus grand élément
         * visible à l'ouverture, donc celui que mesure le navigateur pour le
         * temps d'affichage du contenu principal. Le charger paresseusement
         * le retarderait au lieu de l'accélérer.
         */}
        <img
          src={image}
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
          loading="eager"
          fetchPriority="high"
        />
        {/*
         * Deux voiles plutôt qu'un seul, parce qu'ils ne servent pas la même
         * chose.
         *
         * Le premier, uniforme à 55 %, teinte la photographie sans l'effacer :
         * à 76 % elle n'était plus qu'une texture, et on ne distinguait ni le
         * mur de post-it ni la poignée de main.
         *
         * Le second couvre le bloc de texte et s'efface vers les bords. C'est
         * lui qui tient le contraste, et il a la forme d'un plateau plutôt que
         * d'un dégradé partant du centre : un halo qui décroît dès le milieu
         * laisse les extrémités du titre — large de 896 px sur une section de
         * 1440 — retomber sur les 55 % du voile uniforme. Mesuré ainsi, la
         * ligne la plus basse du bloc tombait à 3,06:1.
         *
         * Le plateau tient donc 42 % d'opacité jusqu'à 55 % du rayon, ce qui
         * englobe les trois niveaux de texte, avant de s'éteindre. Composé au
         * voile uniforme, cela fait 74 % sous le texte — le minimum pour tenir
         * 4,5:1 sur un pixel blanc — et 55 % dans les coins, où l'image reste
         * franche.
         *
         * La couleur est écrite en clair et non en variable : les valeurs
         * arbitraires de Tailwind coupent sur la barre oblique de `rgb(... /
         * alpha)`, et le dégradé se perdait silencieusement. #164A3A est
         * Forest, la même teinte que le voile uniforme au-dessus.
         */}
        <div aria-hidden className="absolute inset-0 bg-forest/[0.55]" />
        <div
          aria-hidden
          className="absolute inset-0 bg-[radial-gradient(120%_110%_at_50%_50%,rgba(22,74,58,0.46)_0%,rgba(22,74,58,0.42)_55%,transparent_100%)]"
        />

        <div className="relative mx-auto w-full max-w-[1200px] px-5 py-16 text-center sm:px-8 sm:py-20">
          {/* `hyphens-auto` : « L'opérationnalisation » dépasse à lui seul la
              largeur d'un écran de 320 px. */}
          <h1 className="mx-auto max-w-4xl text-balance hyphens-auto break-words text-[30px] font-bold leading-[1.12] tracking-[-0.025em] text-white sm:text-[40px] lg:text-[46px]">
            {titre}
          </h1>

          {sousTitre ? (
            <p className="mx-auto mt-10 max-w-3xl text-balance text-[17px] leading-relaxed text-white/85 sm:mt-14 sm:text-lg">
              {sousTitre}
            </p>
          ) : null}
        </div>
      </section>

      {children}
    </>
  );
}

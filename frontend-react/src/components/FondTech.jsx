/**
 * Fond décoratif « tech / IA » du héros de la page d'entrée : grille
 * technique, réseau de neurones animé (noeuds + arêtes parcourues par des
 * impulsions) et balayage lumineux. Purement décoratif — `aria-hidden` et
 * `pointer-events-none` sur toutes les couches, animations sous
 * `motion-safe:` pour respecter « réduire les animations ».
 *
 * La géométrie du réseau est tirée d'un générateur à graine fixe : le rendu
 * est identique à chaque visite (et entre serveur et client), sans dépendre
 * d'un `Math.random()` qui produirait un fond différent à chaque rendu.
 */

/** Repère du SVG — le réseau est dessiné puis étiré sur toute la section. */
const LARGEUR = 1200;
const HAUTEUR = 700;

/** Au-delà de cette distance, deux noeuds ne sont pas reliés. */
const DISTANCE_LIAISON = 165;

const RESEAU = (() => {
  let graine = 20260904;
  const alea = () => {
    graine = (graine * 1103515245 + 12345) % 2147483648;
    return graine / 2147483648;
  };

  // Semis en grille irrégulière : une grille régulière ferait « damier », un
  // tirage totalement libre laisserait des paquets et des zones vides.
  const colonnes = 12;
  const lignes = 7;
  const noeuds = [];
  for (let c = 0; c < colonnes; c += 1) {
    for (let l = 0; l < lignes; l += 1) {
      const pasX = LARGEUR / (colonnes - 1);
      const pasY = HAUTEUR / (lignes - 1);
      noeuds.push({
        x: c * pasX + (alea() - 0.5) * pasX * 0.7,
        y: l * pasY + (alea() - 0.5) * pasY * 0.7,
        // Les noeuds « majeurs » clignotent, les autres restent discrets.
        majeur: alea() > 0.62,
        delai: alea() * 3.5,
      });
    }
  }

  const aretes = [];
  noeuds.forEach((a, i) => {
    noeuds.slice(i + 1).forEach((b) => {
      const distance = Math.hypot(a.x - b.x, a.y - b.y);
      if (distance < DISTANCE_LIAISON) {
        aretes.push({
          a,
          b,
          distance,
          // Les arêtes courtes sont les plus visibles : l'oeil lit un maillage
          // dense qui se délite à mesure que les liaisons s'allongent.
          opacite: 0.55 * (1 - distance / DISTANCE_LIAISON) + 0.15,
          // Une arête sur trois environ porte une impulsion, sinon le fond
          // devient une guirlande clignotante qui vole la vedette au contenu.
          impulsion: alea() > 0.68,
          delai: alea() * 4,
        });
      }
    });
  });

  return { noeuds, aretes };
})();

export default function FondTech() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      {/* Halo émeraude de base, repris de l'identité de la page. */}
      <div className="absolute inset-0 bg-halo-vert" />

      {/* Grille technique : deux dégradés répétés (verticales + horizontales),
          masqués en radial pour s'effacer sur les bords. */}
      <div
        className="absolute -inset-24 motion-safe:animate-derive-grille"
        style={{
          backgroundImage:
            'linear-gradient(to right, rgba(16,130,74,0.30) 1px, transparent 1px), linear-gradient(to bottom, rgba(16,130,74,0.30) 1px, transparent 1px)',
          backgroundSize: '52px 52px',
          maskImage: 'radial-gradient(85% 75% at 50% 42%, black 20%, transparent 100%)',
          WebkitMaskImage: 'radial-gradient(85% 75% at 50% 42%, black 20%, transparent 100%)',
        }}
      />

      {/* Réseau de neurones. `slice` plutôt que `none` : le maillage garde ses
          proportions et se recadre, sinon il s'étire en longues traînées
          verticales sur un écran étroit. */}
      <svg
        viewBox={`0 0 ${LARGEUR} ${HAUTEUR}`}
        preserveAspectRatio="xMidYMid slice"
        className="absolute inset-0 h-full w-full opacity-60 sm:opacity-100"
        style={{
          // Masque en anneau : le maillage s'efface derrière l'emblème central
          // (qui doit rester lisible) et sur les bords extrêmes, et culmine
          // dans la couronne intermédiaire.
          maskImage:
            'radial-gradient(75% 78% at 50% 38%, transparent 0%, transparent 26%, black 55%, black 88%, transparent 100%)',
          WebkitMaskImage:
            'radial-gradient(75% 78% at 50% 38%, transparent 0%, transparent 26%, black 55%, black 88%, transparent 100%)',
        }}
      >
        <defs>
          <linearGradient id="degradeImpulsion" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#5fbd72" stopOpacity="0" />
            <stop offset="50%" stopColor="#2e9e4b" stopOpacity="1" />
            <stop offset="100%" stopColor="#5fbd72" stopOpacity="0" />
          </linearGradient>
        </defs>

        {RESEAU.aretes.map((arete, index) => (
          <line
            key={`a${index}`}
            x1={arete.a.x}
            y1={arete.a.y}
            x2={arete.b.x}
            y2={arete.b.y}
            className="stroke-emerald-600 dark:stroke-emerald-400"
            strokeOpacity={arete.opacite}
            strokeWidth="1"
            vectorEffect="non-scaling-stroke"
          />
        ))}

        {/* Impulsions : un tiret court qui parcourt l'arête, superposé au trait
            fixe. `--longueur` alimente le décalage de tirets de l'animation. */}
        {RESEAU.aretes
          .filter((arete) => arete.impulsion)
          .map((arete, index) => (
            <line
              key={`i${index}`}
              x1={arete.a.x}
              y1={arete.a.y}
              x2={arete.b.x}
              y2={arete.b.y}
              stroke="url(#degradeImpulsion)"
              strokeWidth="2"
              strokeLinecap="round"
              vectorEffect="non-scaling-stroke"
              className="opacity-0 motion-safe:animate-flux-arete"
              style={{
                '--longueur': arete.distance,
                strokeDasharray: `${Math.max(18, arete.distance * 0.22)} ${arete.distance}`,
                animationDelay: `${arete.delai}s`,
                animationDuration: `${3 + (arete.distance / DISTANCE_LIAISON) * 2.5}s`,
              }}
            />
          ))}

        {RESEAU.noeuds.map((noeud, index) => (
          <circle
            key={`n${index}`}
            cx={noeud.x}
            cy={noeud.y}
            r={noeud.majeur ? 2.6 : 1.6}
            className={
              noeud.majeur
                ? 'fill-emerald-500 opacity-80 motion-safe:animate-activation-noeud dark:fill-emerald-400'
                : 'fill-emerald-600/70 dark:fill-emerald-400/60'
            }
            style={noeud.majeur ? { animationDelay: `${noeud.delai}s` } : undefined}
          />
        ))}
      </svg>

      {/* Balayage : bande lumineuse qui traverse lentement la section. */}
      <div
        className="absolute inset-x-0 top-0 h-40 opacity-0 motion-safe:animate-balayage"
        style={{
          background:
            'linear-gradient(to bottom, transparent, rgba(46,158,75,0.10) 45%, rgba(95,189,114,0.16) 55%, transparent)',
        }}
      />

      {/* Halos d'ambiance, conservés de la version précédente du héros. */}
      <span className="absolute -left-32 top-24 h-80 w-80 rounded-full bg-emerald-200/40 blur-3xl motion-safe:animate-respiration dark:bg-emerald-800/40" />
      <span className="absolute -right-24 top-0 h-80 w-80 rounded-full bg-emerald-100/50 blur-3xl motion-safe:animate-respiration [animation-delay:2s] dark:bg-emerald-900/50" />
    </div>
  );
}

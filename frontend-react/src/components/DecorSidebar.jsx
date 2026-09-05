/**
 * Décor « tech » de la barre latérale de l'espace connecté, dans le même
 * langage visuel que le fond de la page d'entrée : grille technique, halo
 * émeraude et maillage de noeuds. Volontairement plus sobre que le héros —
 * c'est un fond de navigation, il ne doit pas concurrencer les libellés.
 *
 * Purement décoratif : `aria-hidden` et `pointer-events-none`, animations
 * sous `motion-safe:`.
 */

/** Repère du SVG — colonne étroite et haute, à l'image de la barre. */
const LARGEUR = 300;
const HAUTEUR = 900;

/** Au-delà de cette distance, deux noeuds ne sont pas reliés. */
const DISTANCE_LIAISON = 130;

const MAILLAGE = (() => {
  let graine = 20260905;
  const alea = () => {
    graine = (graine * 1103515245 + 12345) % 2147483648;
    return graine / 2147483648;
  };

  const colonnes = 4;
  const lignes = 11;
  const noeuds = [];
  for (let c = 0; c < colonnes; c += 1) {
    for (let l = 0; l < lignes; l += 1) {
      const pasX = LARGEUR / (colonnes - 1);
      const pasY = HAUTEUR / (lignes - 1);
      noeuds.push({
        x: c * pasX + (alea() - 0.5) * pasX * 0.75,
        y: l * pasY + (alea() - 0.5) * pasY * 0.75,
        majeur: alea() > 0.7,
        delai: alea() * 3.5,
      });
    }
  }

  const aretes = [];
  noeuds.forEach((a, i) => {
    noeuds.slice(i + 1).forEach((b) => {
      const distance = Math.hypot(a.x - b.x, a.y - b.y);
      if (distance < DISTANCE_LIAISON) {
        aretes.push({ a, b, opacite: 0.4 * (1 - distance / DISTANCE_LIAISON) + 0.08 });
      }
    });
  });

  return { noeuds, aretes };
})();

export default function DecorSidebar() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      {/* Halo émeraude en tête de colonne. */}
      <div className="absolute inset-x-0 top-0 h-72 bg-[radial-gradient(80%_100%_at_50%_0%,rgba(46,158,75,0.22),transparent_70%)]" />

      {/* Grille technique, effacée vers le bas pour ne pas gêner la lecture
          des libellés de navigation. */}
      <div
        className="absolute inset-0 motion-safe:animate-derive-grille"
        style={{
          backgroundImage:
            'linear-gradient(to right, rgba(46,158,75,0.16) 1px, transparent 1px), linear-gradient(to bottom, rgba(46,158,75,0.16) 1px, transparent 1px)',
          backgroundSize: '44px 44px',
          maskImage: 'linear-gradient(to bottom, black, transparent 70%)',
          WebkitMaskImage: 'linear-gradient(to bottom, black, transparent 70%)',
        }}
      />

      <svg
        viewBox={`0 0 ${LARGEUR} ${HAUTEUR}`}
        preserveAspectRatio="xMidYMid slice"
        className="absolute inset-0 h-full w-full opacity-70"
        style={{
          maskImage: 'linear-gradient(to bottom, black 5%, transparent 65%)',
          WebkitMaskImage: 'linear-gradient(to bottom, black 5%, transparent 65%)',
        }}
      >
        {MAILLAGE.aretes.map((arete, index) => (
          <line
            key={`a${index}`}
            x1={arete.a.x}
            y1={arete.a.y}
            x2={arete.b.x}
            y2={arete.b.y}
            className="stroke-emerald-400"
            strokeOpacity={arete.opacite}
            strokeWidth="1"
            vectorEffect="non-scaling-stroke"
          />
        ))}
        {MAILLAGE.noeuds.map((noeud, index) => (
          <circle
            key={`n${index}`}
            cx={noeud.x}
            cy={noeud.y}
            r={noeud.majeur ? 2.2 : 1.4}
            className={
              noeud.majeur
                ? 'fill-emerald-400 opacity-70 motion-safe:animate-activation-noeud'
                : 'fill-emerald-400/40'
            }
            style={noeud.majeur ? { animationDelay: `${noeud.delai}s` } : undefined}
          />
        ))}
      </svg>
    </div>
  );
}

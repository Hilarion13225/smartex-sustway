import { BarChart3, ChevronRight, Layers, LineChart, RefreshCw, Search } from 'lucide-react';
import { useApparition } from './useApparition';

/*
 * La démarche en cinq temps, sous forme de frise qui se remplit.
 *
 * Cinq cartes juxtaposées disaient cinq blocs ; un fil qui se remplit dit un
 * enchaînement, ce qui est le sujet de la section. Les jalons s'allument l'un
 * après l'autre, du gris au vert, le fil se colore de gauche à droite, et un
 * point doré le parcourt ensuite en boucle.
 *
 * Les trois réglages qui font l'effet de progression sont liés entre eux : le
 * décalage de 140 ms entre deux jalons, les 80 ms de plus avant qu'un cercle
 * ne s'allume — l'étape apparaît, puis s'allume, jamais l'inverse — et les
 * 1,8 s de remplissage du fil, soit un peu plus que les 5 × 140 ms + 80 ms de
 * la cascade, pour que le trait finisse juste après le dernier jalon. Les
 * modifier séparément casse cet accord.
 *
 * Toute l'animation est déclenchée une seule fois, par un unique observateur
 * posé sur la frise : cinq observateurs indépendants auraient donné cinq
 * cascades selon la vitesse de défilement.
 */
const ETAPES = [
  { numero: '01', titre: 'Diagnostiquer', texte: 'Évaluer les écarts.', icone: Search },
  { numero: '02', titre: 'Structurer', texte: 'Définir le cadre.', icone: Layers },
  { numero: '03', titre: 'Piloter', texte: 'Suivre les données.', icone: LineChart },
  { numero: '04', titre: 'Optimiser', texte: 'Améliorer les actions.', icone: RefreshCw },
  { numero: '05', titre: 'Mesurer', texte: 'Mesurer les progrès.', icone: BarChart3 },
];

/*
 * Décalage d'une étape à la suivante, et retard supplémentaire de l'allumage.
 *
 * 140 ms est le cœur de l'effet « parcours qui se construit » : sous 80 ms les
 * cinq étapes arrivent en bloc, au-delà de 250 ms la dernière se joue quand on
 * a déjà défilé plus loin.
 *
 * Les 80 ms de retard du cercle sur son étape sont ce qui donne l'impression
 * que le texte se pose puis que le cercle s'allume, plutôt que les deux
 * exactement ensemble.
 */
const CASCADE = 140;
const RETARD_ALLUMAGE = 80;
const DUREE_ALLUMAGE = 700;
const DUREE_SURVOL = 300;
/* La courbe « ease-out » de Tailwind, reprise telle quelle pour les styles en
   ligne — qui ne peuvent pas emprunter la classe. */
const EASE_OUT = 'cubic-bezier(0, 0, 0.2, 1)';

export default function FriseDemarche() {
  /*
   * Seuil à 0,25 et marge basse de 80 px : la cascade ne part qu'une fois le
   * quart de la frise entré dans la fenêtre, et pas au premier pixel. Sinon,
   * sur un écran court, les deux dernières étapes s'allumaient hors champ et
   * le visiteur n'arrivait que sur un résultat déjà joué.
   */
  const { reference, visible, sansAnimation } = useApparition({ seuil: 0.25, marge: '0px 0px -80px 0px' });

  return (
    <div ref={reference} className="relative">
      {/*
       * Le fil. Il court du centre du premier cercle à celui du dernier —
       * 9 % de chaque côté, soit un peu moins que la demi-colonne de 10 %,
       * pour qu'il disparaisse sous le halo au lieu de s'arrêter à son bord.
       *
       * `top-[36px]` est le centre d'un cercle de 72 px. Les deux valeurs sont
       * liées : changer la taille des cercles demande de recalculer celle-ci.
       */}
      <span
        aria-hidden
        className="absolute left-[9%] right-[9%] top-[36px] hidden h-0.5 -translate-y-1/2 overflow-visible rounded-full bg-ink-200 lg:block"
      >
        {/* Remplissage. `width` animée plutôt qu'une transformation : un
            `scaleX` étirerait aussi les extrémités arrondies du trait. */}
        <span
          className="block h-full rounded-full bg-gradient-to-r from-brand-600 via-brand-400 to-attention transition-[width] duration-[1800ms] ease-out motion-reduce:transition-none"
          style={{ width: visible ? '100%' : '0%' }}
        />

        {/* Point voyageur. Il ne part qu'une fois le fil rempli : lancé avant,
            il aurait couru sur du gris. */}
        {visible ? (
          <span
            className="absolute top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-attention opacity-0 motion-safe:animate-point-frise"
            style={{ animationDelay: '1800ms' }}
          />
        ) : null}
      </span>

      {/* Chevrons, à mi-distance entre deux cercles. Leur fond reprend celui
          de la section pour interrompre le fil derrière eux. */}
      {[20, 40, 60, 80].map((position, index) => (
        <span
          key={position}
          aria-hidden
          style={{ left: `${position}%`, transitionDelay: `${index * CASCADE + 400}ms` }}
          className={`absolute top-[36px] hidden h-5 w-5 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-ink-200 bg-surface transition-opacity duration-500 motion-reduce:transition-none lg:flex ${
            visible ? 'opacity-100' : 'opacity-0'
          }`}
        >
          <ChevronRight className="h-3 w-3 text-ink-400" strokeWidth={2.5} />
        </span>
      ))}

      <ol className="relative grid gap-10 sm:grid-cols-2 lg:grid-cols-5 lg:gap-0">
        {ETAPES.map((etape, index) => {
          const Icone = etape.icone;
          return (
            <li
              key={etape.numero}
              style={{ transitionDelay: `${index * CASCADE}ms` }}
              className={`group flex flex-col items-center px-2 text-center transition-[opacity,transform] duration-700 ease-out motion-reduce:transition-none ${
                visible ? 'translate-y-0 opacity-100' : 'translate-y-5 opacity-0 motion-reduce:translate-y-0 motion-reduce:opacity-100'
              }`}
            >
              <div className="relative">
                {/*
                 * Deux durées sur le même élément : 700 ms pour l'allumage
                 * (bordure et halo), 300 ms pour le soulèvement au survol. Une
                 * classe `duration-*` n'en donne qu'une, et le survol héritait
                 * de la durée de l'allumage — un cercle qui met sept dixièmes
                 * de seconde à réagir au pointeur ne réagit plus, il traîne.
                 *
                 * D'où le style en ligne, et d'où la garde `sansAnimation` :
                 * un style en ligne l'emporte sur `motion-reduce:`, il faut
                 * donc ne pas l'écrire du tout quand les animations sont
                 * refusées.
                 */}
                <span
                  style={
                    sansAnimation
                      ? undefined
                      : {
                          transitionProperty: 'border-color, box-shadow, transform',
                          transitionDuration: `${DUREE_ALLUMAGE}ms, ${DUREE_ALLUMAGE}ms, ${DUREE_SURVOL}ms`,
                          transitionTimingFunction: EASE_OUT,
                          transitionDelay: `${index * CASCADE + RETARD_ALLUMAGE}ms, ${
                            index * CASCADE + RETARD_ALLUMAGE
                          }ms, 0ms`,
                        }
                  }
                  className={`flex h-[72px] w-[72px] items-center justify-center rounded-full border-2 bg-surface motion-safe:group-hover:-translate-y-1 ${
                    visible ? 'border-brand-600 ring-4 ring-brand-50' : 'border-ink-200 ring-0 ring-transparent'
                  }`}
                >
                  <Icone
                    style={
                      sansAnimation
                        ? undefined
                        : {
                            transitionProperty: 'color, transform',
                            transitionDuration: `${DUREE_ALLUMAGE}ms, ${DUREE_SURVOL}ms`,
                            transitionTimingFunction: EASE_OUT,
                            transitionDelay: `${index * CASCADE + RETARD_ALLUMAGE}ms, 0ms`,
                          }
                    }
                    className={`h-7 w-7 motion-safe:group-hover:scale-110 ${
                      visible ? 'text-brand-700' : 'text-ink-400'
                    }`}
                    strokeWidth={1.5}
                    aria-hidden
                  />
                </span>

                {/* La pastille chevauche le cercle ; son anneau de la couleur
                    du fond détache les deux traits, qui se toucheraient sinon. */}
                <span className="absolute -right-1.5 -top-1.5 flex h-7 w-7 min-w-7 items-center justify-center rounded-full bg-attention text-[11px] font-bold tabular-nums text-white ring-4 ring-surface">
                  {etape.numero}
                </span>
              </div>

              <p className="mt-7 text-[13px] font-bold uppercase tracking-[0.08em] text-ink-900">{etape.titre}</p>
              <p className="mt-2 text-[14px] text-ink-500">{etape.texte}</p>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

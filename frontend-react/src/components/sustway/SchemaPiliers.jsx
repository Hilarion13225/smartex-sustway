import { ArrowDown, Gauge, Layers, RefreshCw, TrendingUp } from 'lucide-react';
import { useApparition } from './useApparition';

/*
 * Les trois piliers autour de la performance durable.
 *
 * Structurer ouvre en haut, parce que rien ne se pilote avant d'avoir un
 * cadre ; Piloter et Optimiser encadrent le centre ; et la boucle du bas
 * ramène d'Optimiser vers Piloter, puisque c'est là que l'amélioration
 * continue se referme. Le schéma dit cet enchaînement, que trois cartes
 * alignées ne diraient pas : alignées, elles se liraient comme trois options
 * au choix.
 *
 * Il est posé dans une colonne d'environ 550 px, d'où des cartes compactes :
 * elles nomment le pilier et ce qu'il manipule, le reste est dit par les trois
 * cartes qui suivent le schéma sur la page.
 *
 * En dessous de 768 px la croix devient une colonne. La flèche descendante et
 * la boucle disparaissent alors : elles relieraient des choses qui ne sont plus
 * en face.
 *
 * Aucun trait ne relie le centre à Piloter et Optimiser. Les deux qui s'y
 * trouvaient partageaient leur cellule de grille avec une carte et se posaient
 * par-dessus ; le centre encadré par ses deux voisins se lit sans eux.
 */
const PILIERS = {
  structurer: { titre: 'Structurer', detail: 'Cadre et méthodologie', icone: Layers },
  piloter: { titre: 'Piloter', detail: 'Indicateurs et suivi', icone: Gauge },
  optimiser: { titre: 'Optimiser', detail: 'Actions et création de valeur', icone: TrendingUp },
};

function Carte({ pilier, visible, delai }) {
  const Icone = pilier.icone;
  return (
    <div
      style={visible ? { transitionDelay: `${delai}ms` } : undefined}
      className={`flex h-full flex-col justify-center rounded-2xl border border-ink-200 bg-surface px-4 py-4 text-center transition-[opacity,transform] duration-700 ease-out motion-reduce:transition-none ${
        visible ? 'translate-y-0 opacity-100' : 'translate-y-3 opacity-0 motion-reduce:translate-y-0 motion-reduce:opacity-100'
      }`}
    >
      <span className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
        <Icone className="h-[18px] w-[18px]" strokeWidth={1.75} aria-hidden />
      </span>
      <p className="mt-3 text-[13px] font-bold uppercase tracking-[0.1em] text-forest">{pilier.titre}</p>
      <p className="mt-1.5 text-[13px] leading-snug text-ink-500">{pilier.detail}</p>
    </div>
  );
}

export default function SchemaPiliers() {
  const { reference, visible } = useApparition({ seuil: 0.2 });

  return (
    <div ref={reference} className="rounded-2xl bg-ink-50 p-5 sm:p-7">
      {/*
       * Placement explicite en colonnes et lignes, et non par remplissage
       * automatique : le centre doit tomber entre Piloter et Optimiser, sur la
       * ligne du milieu, ce que l'ordre du DOM seul ne garantit pas.
       */}
      <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] md:items-stretch md:gap-x-4">
        {/* Structurer, en haut, au-dessus du centre. */}
        <div className="md:col-start-2 md:row-start-1 md:w-[190px]">
          <Carte pilier={PILIERS.structurer} visible={visible} delai={0} />
        </div>

        {/* La flèche descendante, entre Structurer et le centre. */}
        <div aria-hidden className="hidden md:col-start-2 md:row-start-2 md:flex md:items-center md:justify-center md:py-1.5">
          <ArrowDown
            className={`h-5 w-5 text-brand-400 transition-opacity duration-700 ${visible ? 'opacity-100' : 'opacity-0'}`}
            strokeWidth={2}
          />
        </div>

        <div className="md:col-start-1 md:row-start-3">
          <Carte pilier={PILIERS.piloter} visible={visible} delai={110} />
        </div>

        {/*
         * Le centre. Fond Forest : c'est le seul élément du schéma qui n'est
         * pas un pilier mais ce que les trois produisent, et la couleur dit
         * cette différence de nature plus vite qu'un intitulé.
         */}
        <div className="md:col-start-2 md:row-start-3 md:w-[190px]">
          <div
            style={visible ? { transitionDelay: '220ms' } : undefined}
            className={`flex h-full flex-col items-center justify-center rounded-2xl bg-forest px-4 py-5 text-center text-white transition-[opacity,transform] duration-700 ease-out motion-reduce:transition-none ${
              visible ? 'scale-100 opacity-100' : 'scale-95 opacity-0 motion-reduce:scale-100 motion-reduce:opacity-100'
            }`}
          >
            <p className="text-[13px] font-bold uppercase leading-tight tracking-[0.1em] text-growth">Performance</p>
            <p className="text-[13px] font-bold uppercase leading-tight tracking-[0.1em] text-growth">durable</p>
          </div>
        </div>

        <div className="md:col-start-3 md:row-start-3">
          <Carte pilier={PILIERS.optimiser} visible={visible} delai={330} />
        </div>
      </div>

      {/*
       * La boucle de l'amélioration continue, sous les trois piliers.
       *
       * Elle est dessinée et non seulement écrite : c'est le retour d'Optimiser
       * vers Piloter qui fait de la démarche un cycle plutôt qu'une suite
       * d'étapes, et une ligne de texte de plus ne l'aurait pas montré.
       */}
      <div
        aria-hidden
        className={`mt-5 hidden transition-opacity duration-700 md:block ${visible ? 'opacity-100' : 'opacity-0'}`}
      >
        <svg viewBox="0 0 400 24" className="h-6 w-full" preserveAspectRatio="none">
          <path
            d="M 370 2 L 370 18 L 30 18 L 30 2"
            fill="none"
            stroke="rgb(var(--brand-300))"
            strokeWidth="1.5"
            vectorEffect="non-scaling-stroke"
          />
          <path d="M 26 8 L 30 2 L 34 8" fill="none" stroke="rgb(var(--brand-300))" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
        </svg>
      </div>

      <p className="mt-3 flex items-center justify-center gap-2 text-[12px] font-semibold uppercase tracking-[0.12em] text-ink-500">
        <RefreshCw className="h-3.5 w-3.5 text-brand-600" strokeWidth={2} aria-hidden />
        Amélioration continue
      </p>
    </div>
  );
}

import { Banknote, Landmark, Leaf, Users } from 'lucide-react';
import { useApparition } from './useApparition';

/*
 * Les quatre performances qui se rejoignent au centre.
 *
 * Le schéma dit une chose que le texte ne peut pas dire aussi vite : ces
 * quatre-là ne se succèdent pas, elles tiennent ensemble. D'où la disposition
 * en croix autour d'un centre, et non en liste ni en frise — une frise dirait
 * un ordre, une liste dirait une addition.
 *
 * En dessous de 1024 px, la croix devient une colonne : quatre cartes
 * disposées autour d'un centre demandent une largeur qu'un téléphone n'a pas,
 * et les traits de liaison y relieraient des choses qui ne sont plus en face.
 * Le centre passe alors en tête, puisqu'il est ce que les quatre produisent.
 */
const PERFORMANCES = [
  {
    titre: 'Performance financière',
    texte: 'Rentabilité, maîtrise des coûts et création de valeur.',
    icone: Banknote,
  },
  {
    titre: 'Performance sociale',
    texte: 'Conditions de travail, égalité et développement des compétences.',
    icone: Users,
  },
  {
    titre: 'Performance environnementale',
    texte: 'Émissions, ressources et maîtrise des impacts.',
    icone: Leaf,
  },
  {
    titre: 'Gouvernance',
    texte: 'Éthique, transparence et qualité des décisions.',
    icone: Landmark,
  },
];

export default function SchemaPerformance() {
  const { reference, visible } = useApparition({ seuil: 0.2 });

  return (
    <div ref={reference} className="relative">
      {/*
       * Les deux traits de liaison, croisés derrière les cartes.
       *
       * Ils ne sont dessinés qu'à partir de 1024 px, et masqués à
       * l'assistance : ce qu'ils disent — que les quatre convergent — est déjà
       * écrit dans le texte qui précède le schéma.
       */}
      <span
        aria-hidden
        className={`absolute left-1/2 top-1/2 hidden h-px w-[62%] -translate-x-1/2 -translate-y-1/2 bg-gradient-to-r from-transparent via-brand-300 to-transparent transition-opacity duration-700 lg:block ${
          visible ? 'opacity-100' : 'opacity-0'
        }`}
      />
      <span
        aria-hidden
        className={`absolute left-1/2 top-1/2 hidden h-[62%] w-px -translate-x-1/2 -translate-y-1/2 bg-gradient-to-b from-transparent via-brand-300 to-transparent transition-opacity duration-700 lg:block ${
          visible ? 'opacity-100' : 'opacity-0'
        }`}
      />

      {/*
       * Placement explicite, et non laissé au remplissage automatique : avec
       * `order` seul, la grille rangeait les quatre cartes à gauche et
       * repoussait le centre à droite. Chaque élément dit donc sa colonne et
       * sa ligne — colonne 2 pour le centre, sur les deux lignes ; colonnes 1
       * et 3 pour les quatre performances.
       */}
      <div className="relative grid gap-5 lg:grid-cols-3 lg:grid-rows-2 lg:items-center lg:gap-6">
        {/* Le centre ouvre le DOM : sur téléphone, où la croix devient une
            colonne, il se lit en premier — c'est ce que les quatre produisent. */}
        <div className="lg:col-start-2 lg:row-start-1 lg:row-span-2">
          <div
            className={`flex flex-col items-center justify-center rounded-2xl bg-forest px-6 py-10 text-center text-white transition-[opacity,transform] duration-700 ease-out motion-reduce:transition-none ${
              visible ? 'scale-100 opacity-100' : 'scale-95 opacity-0 motion-reduce:scale-100 motion-reduce:opacity-100'
            }`}
          >
            <p className="text-[24px] font-semibold leading-tight sm:text-[28px]">Performance durable</p>
            <p className="mt-4 max-w-xs text-[14px] leading-relaxed text-white/75">
              Ce que produit la conciliation des quatre, et non l’une d’elles prise à part.
            </p>
          </div>
        </div>

        {PERFORMANCES.map((performance, index) => {
          const Icone = performance.icone;
          // Financière et environnementale à gauche, sociale et gouvernance à
          // droite, chacune sur sa ligne.
          const place = [
            'lg:col-start-1 lg:row-start-1',
            'lg:col-start-3 lg:row-start-1',
            'lg:col-start-1 lg:row-start-2',
            'lg:col-start-3 lg:row-start-2',
          ][index];
          return (
            <div
              key={performance.titre}
              style={visible ? { transitionDelay: `${index * 110}ms` } : undefined}
              className={`${place} rounded-2xl border border-ink-200 bg-surface p-6 transition-[opacity,transform] duration-700 ease-out motion-reduce:transition-none ${
                visible ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0 motion-reduce:translate-y-0 motion-reduce:opacity-100'
              }`}
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                <Icone className="h-5 w-5" strokeWidth={1.75} aria-hidden />
              </span>
              <h3 className="mt-4 text-[17px] font-semibold text-forest">{performance.titre}</h3>
              <p className="mt-2 text-[14px] leading-relaxed text-ink-600">{performance.texte}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

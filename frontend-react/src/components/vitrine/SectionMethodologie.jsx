import { Fragment } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, BarChart3, FileText, FolderOpen, Search, Target } from 'lucide-react';
import Revele from '../Revele';
import { Etiquette, PASTELS } from './communs';

const ETAPES = [
  {
    icone: FileText,
    ton: 'rouge',
    titre: 'Évaluer',
    texte: 'Répondez à un questionnaire adapté à votre contexte.',
  },
  {
    icone: FolderOpen,
    ton: 'bleu',
    titre: 'Documenter',
    texte: 'Centralisez vos preuves et informations.',
  },
  {
    icone: Search,
    ton: 'vert',
    titre: 'Analyser',
    texte: 'Obtenez une analyse structurée et objective.',
  },
  {
    icone: Target,
    ton: 'orange',
    titre: 'Prioriser',
    texte: 'Identifiez les écarts, risques et opportunités.',
  },
  {
    icone: BarChart3,
    ton: 'violet',
    titre: 'Optimiser',
    texte: 'Transformez les résultats en plans d’action concrets.',
  },
];

/**
 * Les cinq étapes de la démarche, partagées par la page d'accueil et la page
 * Solution. Les flèches n'apparaissent qu'à partir de `lg`, où les étapes
 * s'alignent sur une seule ligne ; en dessous elles s'empilent en grille.
 */
export default function SectionMethodologie() {
  return (
    <section className="bg-brand-50/60 py-10 dark:bg-brand-500/[0.06]">
      <div className="mx-auto max-w-[80rem] px-5">
        <Revele className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <Etiquette>Une démarche structurée et efficace</Etiquette>
            <h2 className="mt-4 font-display text-2xl font-extrabold tracking-tight text-marine sm:text-[1.6rem]">
              De l’évaluation à l’amélioration continue.
            </h2>
          </div>

          <Link
            to="/methodologie"
            className="group inline-flex shrink-0 items-center gap-2.5 self-start rounded-lg border border-brand-300 bg-surface px-6 py-3 text-sm font-semibold text-brand-600 transition duration-300 hover:border-brand-500 hover:bg-brand-50 motion-safe:hover:-translate-y-0.5 lg:self-auto dark:border-brand-500/50 dark:text-brand-400 dark:hover:bg-brand-500/10"
          >
            Découvrir notre méthodologie
            <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" aria-hidden />
          </Link>
        </Revele>

        <div className="mt-10 grid gap-10 sm:grid-cols-2 lg:flex lg:items-start lg:gap-0">
          {ETAPES.map((etape, index) => (
            <Fragment key={etape.titre}>
              <Revele delai={index * 90} className="min-w-0 lg:flex-1 lg:px-4 xl:px-6">
                <span className={`inline-flex h-11 w-11 items-center justify-center rounded-full ${PASTELS[etape.ton]}`}>
                  <etape.icone className="h-5 w-5" aria-hidden />
                </span>
                <h3 className="mt-4 font-display text-base font-bold text-marine">
                  {index + 1}. {etape.titre}
                </h3>
                <p className="mt-2 text-[13px] leading-snug text-ink-500">{etape.texte}</p>
              </Revele>

              {index < ETAPES.length - 1 ? (
                <ArrowRight className="mt-4 hidden h-5 w-5 shrink-0 self-start text-brand-400 lg:block" aria-hidden />
              ) : null}
            </Fragment>
          ))}
        </div>
      </div>
    </section>
  );
}

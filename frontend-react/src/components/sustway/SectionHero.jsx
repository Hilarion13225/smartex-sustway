import { ArrowRight } from 'lucide-react';
import Bouton from './Bouton';
import ApercuDashboard from './ApercuDashboard';
import { Apparition } from './Section';

/*
 * Héros de la page d'accueil.
 *
 * Deux colonnes à partir de 1024 px, une seule en dessous, et dans cet ordre :
 * le discours d'abord, l'aperçu ensuite. L'inverse mettrait un visiteur mobile
 * devant une capture d'écran avant de lui avoir dit de quel produit il s'agit.
 *
 * L'aperçu déborde légèrement à droite sur grand écran (`lg:-mr-6`) : un
 * tableau de bord qui s'arrête pile sur la marge se lit comme une image
 * collée, alors qu'un écran qui sort du cadre suggère qu'il continue.
 */
const ETAPES = ['Diagnostic', 'Structuration', 'Pilotage', 'Optimisation', 'Performance durable'];

export default function SectionHero() {
  return (
    <section id="accueil" className="relative overflow-hidden bg-ink-50 scroll-mt-24">
      {/* Halo vert très dilué en haut de page. Il remplace l'aplat de couleur
          qu'on met d'ordinaire derrière un héros : assez présent pour que la
          page ne démarre pas sur du blanc plat, assez faible pour que le
          tableau de bord garde le premier plan. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[560px] bg-[radial-gradient(70%_100%_at_50%_0%,rgba(46,125,91,0.10),transparent_72%)]"
      />

      <div className="relative mx-auto grid w-full max-w-[1200px] items-center gap-12 px-5 pb-16 pt-14 sm:px-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:gap-14 lg:pb-24 lg:pt-20">
        <Apparition>
          <p className="text-[13px] font-semibold uppercase tracking-[0.16em] text-brand-600">SMARTEX SustWay</p>

          <h1 className="mt-5 text-[34px] font-bold leading-[1.1] tracking-[-0.025em] text-forest sm:text-[44px] lg:text-[52px]">
            Structurer, piloter et optimiser votre démarche RSE, ESG et Développement Durable.
          </h1>

          <p className="mt-5 text-lg font-semibold text-brand-700 sm:text-xl">
            Transformez vos ambitions RSE en actions mesurables.
          </p>

          <p className="mt-4 max-w-xl text-[16px] leading-relaxed text-ink-600 sm:text-[17px]">
            SMARTEX SustWay est la solution d’opérationnalisation dédiée à la Responsabilité Sociétale des Entreprises,
            aux critères ESG et au Développement Durable. Elle aide les organisations à structurer leur démarche, piloter
            leurs données et améliorer continuellement leur performance durable.
          </p>

          {/* Boutons pleine largeur sous 640 px : à deux de front sur un écran
              de 360 px, chaque intitulé passerait sur trois lignes. */}
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Bouton vers="/contact" taille="lg" className="w-full sm:w-auto">
              Demander une démo
            </Bouton>
            <Bouton href="#solution" niveau="secondaire" taille="lg" className="w-full sm:w-auto">
              Découvrir la solution
            </Bouton>
          </div>
        </Apparition>

        <Apparition delai={140} className="lg:-mr-6">
          <ApercuDashboard />
        </Apparition>
      </div>

      {/*
       * Sous-héros : la trajectoire du produit en cinq temps.
       *
       * Les étapes sont reliées par un filet continu sur grand écran, et
       * empilées en colonne sous 1024 px — une frise horizontale à cinq
       * entrées y deviendrait soit illisible, soit source de défilement
       * latéral, que la charte interdit.
       */}
      <div className="relative border-t border-ink-200 bg-surface">
        <div className="mx-auto w-full max-w-[1200px] px-5 py-10 sm:px-8 lg:py-12">
          <ol className="flex flex-col gap-4 lg:flex-row lg:items-center lg:gap-0">
            {ETAPES.map((etape, index) => (
              <li key={etape} className="flex flex-1 items-center gap-3 lg:flex-col lg:gap-2.5 lg:text-center">
                <span className="flex items-center lg:w-full">
                  {/* Demi-filet gauche, absent sur la première étape : c'est
                      ce qui donne une ligne continue sans la faire dépasser
                      aux deux bouts de la frise. */}
                  <span aria-hidden className={`hidden h-px flex-1 lg:block ${index === 0 ? 'bg-transparent' : 'bg-ink-200'}`} />
                  <span
                    aria-hidden
                    className="flex h-2.5 w-2.5 shrink-0 items-center justify-center rounded-full bg-brand-600 lg:mx-2"
                  />
                  <span
                    aria-hidden
                    className={`hidden h-px flex-1 lg:block ${index === ETAPES.length - 1 ? 'bg-transparent' : 'bg-ink-200'}`}
                  />
                </span>
                <span className="text-[13px] font-semibold uppercase tracking-[0.08em] text-ink-700 lg:text-[12px]">
                  {etape}
                </span>
                {index < ETAPES.length - 1 ? (
                  <ArrowRight aria-hidden className="ml-auto h-4 w-4 shrink-0 text-ink-300 lg:hidden" strokeWidth={2} />
                ) : null}
              </li>
            ))}
          </ol>

          <p className="mt-8 border-t border-ink-100 pt-7 text-center text-[17px] font-medium text-forest sm:text-lg">
            Une plateforme pour structurer, piloter et améliorer votre performance extra-financière.
          </p>
        </div>
      </div>
    </section>
  );
}

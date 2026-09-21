import { ArrowRight } from 'lucide-react';
import FondTech from '../FondTech';
import Bouton from './Bouton';
import { Apparition } from './Section';

/*
 * Héros de la page d'accueil.
 *
 * Une seule colonne : le héros ne porte que le discours. L'aperçu du tableau
 * de bord qui l'accompagnait a été retiré — les six écrans du produit sont
 * montrés en grand sur la page « Fonctionnalités », et un septième posé ici
 * demandait la moitié de la page pour redire la même chose.
 *
 * Le texte garde l'alignement à gauche et une largeur de lecture bornée :
 * le décor occupe la moitié droite, qui n'est donc pas vide, et une ligne de
 * texte courant qui traverserait les 1200 px de la page serait illisible.
 *
 * Le héros est posé sur le décor « tech » de la page d'entrée, sur un fond
 * Forest. Le fond sombre ne descend pas plus bas : la frise du sous-héros et
 * tout ce qui suit restent clairs, et la coupure franche entre les deux marque
 * l'entrée dans le contenu. Seul l'aperçu du tableau de bord garde sa surface
 * blanche — c'est un écran de logiciel, il ne s'assombrit pas avec la page.
 */
const ETAPES = ['Diagnostic', 'Structuration', 'Pilotage', 'Optimisation', 'Performance durable'];

export default function SectionHero() {
  return (
    <section className="relative overflow-hidden bg-forest">
      <FondTech surSombre />

      {/*
       * Le héros tient dans une fenêtre, sans avoir à défiler.
       *
       * `min-h-svh` l'y étire quand il reste de la place, et les réglages
       * ci-dessous l'empêchent de la dépasser quand il y en a peu. Mesuré sur
       * un écran de 1366 × 768 — le plus répandu, soit 730 px de fenêtre
       * utile : le héros occupait 860 px et ses boutons finissaient 50 px
       * sous le bord.
       *
       * `svh` et non `vh` : sur téléphone, `vh` se rapporte à la fenêtre
       * barres d'adresse rétractées, et le bas du bloc reste caché tant
       * qu'on n'a pas fait défiler.
       *
       * `pt` large tout de même : la barre de navigation est en position fixe
       * et passe par-dessus le héros, qu'elle ne pousse donc plus vers le bas.
       *
       */}
      <div className="relative mx-auto flex w-full max-w-[1200px] items-center px-5 pb-14 pt-24 sm:px-8 lg:min-h-svh lg:pb-12 lg:pt-24">
        <Apparition className="max-w-3xl">
          <p className="text-[13px] font-semibold uppercase tracking-[0.16em] text-growth">SMARTEX SustWay</p>

          {/* La taille du titre suit la hauteur de la fenêtre : 44 px sur un
              écran de 730 px utiles, 52 px dès 900. C'est lui qui décide si le
              héros tient ou non — cinq lignes à 52 px en occupent 286 à elles
              seules. */}
          <h1 className="mt-4 text-[34px] font-bold leading-[1.08] tracking-[-0.025em] text-white sm:text-[44px] lg:text-[clamp(2.75rem,0.6rem+4.7vh,3.25rem)]">
            Structurer, piloter et optimiser votre démarche RSE, ESG et Développement Durable.
          </h1>

          {/* `text-balance` : l'accroche tient sur deux lignes depuis qu'elle
              nomme les trois sigles. Sans équilibrage, la seconde ligne se
              réduisait à « mesurables. » — un reste de phrase là où l'œil
              attend la moitié d'une accroche. */}
          <p className="mt-4 text-balance text-lg font-semibold text-growth sm:text-xl">
            Transformez vos ambitions RSE, ESG et DD en actions mesurables.
          </p>

          <p className="mt-4 max-w-xl text-[16px] leading-relaxed text-white/75 sm:text-[17px]">
            SMARTEX SustWay est la solution d’opérationnalisation dédiée à la Responsabilité Sociétale des Entreprises,
            aux critères ESG et au Développement Durable. Elle aide les organisations à structurer leur démarche, piloter
            leurs données et améliorer continuellement leur performance durable.
          </p>

          {/*
           * Boutons pleine largeur sous 640 px : à deux de front sur un écran
           * de 360 px, chaque intitulé passerait sur trois lignes.
           *
           * Le bouton principal est blanc et non vert depuis que le héros est
           * sombre : le vert de marque ne se détache du fond Forest qu'à
           * 2,03:1, là où un composant d'interface en demande 3. Blanc, il
           * tient 16:1 et redevient l'élément le plus visible de la page,
           * comme il doit l'être. C'est déjà le parti pris de l'appel à
           * l'action final, sur le même fond.
           */}
          <div className="mt-7 flex flex-col gap-3 sm:flex-row">
            <Bouton vers="/contact" niveau="principal-sombre" taille="lg" className="w-full sm:w-auto">
              Demander une démo
            </Bouton>
            <Bouton vers="/solution" niveau="secondaire-sombre" taille="lg" className="w-full sm:w-auto">
              Découvrir la solution
            </Bouton>
          </div>
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

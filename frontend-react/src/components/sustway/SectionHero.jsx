import { ArrowRight } from 'lucide-react';
import FondTech from '../FondTech';
import Embleme from '../Embleme';
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
 * Le bloc est centré, et sa largeur de lecture bornée à 768 px : une ligne de
 * texte courant qui traverserait les 1200 px de la page serait illisible.
 *
 * Centré en entier, et non la seule marque : posée seule au centre d'un bloc
 * aligné à gauche, elle ne se lisait ni comme centrée — le bloc ne fait pas
 * la largeur de la page — ni comme alignée, et paraissait simplement
 * décalée.
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
        <Apparition className="mx-auto max-w-3xl text-center">
          {/* L'emblème, repris de la page d'entrée. Bien plus petit qu'elle ne
              l'affiche : posé au-dessus du titre, il doit laisser la place au
              texte et aux boutons dans une fenêtre. */}
          <Embleme compact largeur="max-w-[210px] sm:max-w-[260px] lg:max-w-[300px]" />

          {/*
           * La marque passe devant, en plus grand que le titre.
           *
           * L'espacement des lettres tombe de 0,16 em à 0,06 : à cette taille,
           * le premier écartait les mots au point de les disjoindre — un
           * interlettrage large se règle pour un texte de treize pixels, pas
           * de quarante.
           */}
          <p className="mt-2 text-[30px] font-bold uppercase leading-none tracking-[0.06em] text-growth sm:text-[38px] lg:text-[46px]">
            SMARTEX SustWay
          </p>

          {/*
           * Le titre passe au second rang visuel, derrière la marque. Il reste
           * le `h1` de la page : c'est lui qui dit de quoi elle parle, et la
           * hiérarchie du document ne suit pas celle des corps de texte.
           *
           * Sa taille ne dépend plus de la hauteur de la fenêtre : à ce corps,
           * le héros tient partout sans avoir à s'ajuster.
           */}
          <h1 className="mt-5 text-[22px] font-semibold leading-[1.25] tracking-[-0.015em] text-white sm:text-[27px] lg:text-[30px]">
            Structurer, piloter et optimiser votre démarche RSE, ESG et Développement Durable.
          </h1>

          {/* L'accroche qui tenait ici est retirée : le titre nomme déjà les
              trois sigles, et le paragraphe qui suit dit ce que la plateforme
              en fait. Elle s'intercalait entre les deux sans rien ajouter. */}
          <p className="mx-auto mt-5 max-w-xl text-[14px] leading-relaxed text-white/70 sm:text-[15px]">
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
          <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:justify-center">
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

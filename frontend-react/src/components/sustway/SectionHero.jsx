import { useState } from 'react';
import { Layers, PlayCircle } from 'lucide-react';
import FondTech from '../FondTech';
import ModaleVideo from '../ModaleVideo';
import Embleme from '../Embleme';
import Logo from '../Logo';
import Bouton from './Bouton';
import { Apparition } from './Section';

/*
 * Héros de la page d'accueil.
 *
 * Une seule colonne : le héros ne porte que le discours, posé sur l'emblème
 * de la marque en fond et le décor « tech ». L'aperçu du tableau
 * de bord qui l'accompagnait a été retiré — les six écrans du produit sont
 * montrés en grand sur la page « Fonctionnalités », et un septième posé ici
 * demandait la moitié de la page pour redire la même chose.
 *
 * Le bloc est centré, et sa largeur de lecture bornée à 768 px : une ligne de
 * texte courant qui traverserait les 1200 px de la page serait illisible.
 *
 * La largeur de lecture et les corps de texte suivent la fenêtre par paliers
 * au-delà de 1280 px : figés, ils laissaient le contenu occuper 56 % de
 * l'écran à 1366 px mais seulement 30 % à 2560, où le héros se réduisait à
 * une bande étroite au milieu du vide.
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
export default function SectionHero() {
  const [videoOuverte, definirVideoOuverte] = useState(false);

  return (
    <section className="relative overflow-hidden bg-forest">
      <FondTech surSombre />

      {/*
       * L'emblème passe derrière le texte, au centre du héros.
       *
       * Il n'y est plus un élément à lire mais une texture : d'où l'opacité
       * réduite, sans laquelle ses pastilles blanches passaient sous les
       * lettres blanches du titre et les rendaient illisibles.
       *
       * `aria-hidden` sur l'enveloppe : les quatre libellés qu'il porte —
       * Documents, Preuves, Conformité, Scoring — étaient lus à leur place
       * quand l'emblème ouvrait le héros ; posés en fond, ils n'apportent
       * plus rien qu'un lecteur d'écran doive entendre avant le titre.
       */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 flex select-none items-center justify-center opacity-[0.18]"
      >
        <Embleme largeur="max-w-lg sm:max-w-2xl lg:max-w-3xl xl:max-w-4xl 2xl:max-w-5xl 3xl:max-w-6xl" />
      </div>

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
       * `--hauteur-bandeau` se retranche depuis que le bandeau des
       * référentiels court aussi sous les pages de la charte : c'est une barre
       * fixe au bas de la fenêtre, et à `100svh` pleins les boutons du héros
       * finissaient dessous. La variable est publiée par `LayoutPublic`.
       *
       * `pt` large tout de même : la barre de navigation est en position fixe
       * et passe par-dessus le héros, qu'elle ne pousse donc plus vers le bas.
       *
       */}
      <div className="relative mx-auto flex w-full max-w-[1200px] items-center px-5 pb-14 pt-24 sm:px-8 lg:min-h-[calc(100svh-var(--hauteur-bandeau,0px))] lg:pb-6 lg:pt-32">
        <Apparition className="mx-auto max-w-3xl text-center xl:max-w-4xl 2xl:max-w-5xl 3xl:max-w-6xl">
          {/*
           * La marque est le logotype lui-même, et non un texte qui l'imite.
           *
           * Elle était composée ici en capitales vertes : même mots, autre
           * dessin — casse, couleurs et emblème différaient de ce que la barre
           * de navigation affiche à trois cents pixels de là. Un logotype se
           * reconnaît à ce qu'il ne varie pas ; le composant `Logo` est donc
           * appelé, avec sa variante claire, celle des fonds sombres.
           */}
          {/* `heritee` : le logotype prend la taille de ce conteneur, et non
              une échelle figée. C'est le seul moyen de le faire grandir avec
              la fenêtre sans toucher au composant, que l'espace connecté
              partage. */}
          <div className="text-[30px] sm:text-[44px] lg:text-[60px] xl:text-[68px] 2xl:text-[78px] 3xl:text-[92px]">
            <Logo taille="heritee" variante="clair" className="justify-center" />
          </div>

          {/*
           * Le titre passe au second rang visuel, derrière la marque. Il reste
           * le `h1` de la page : c'est lui qui dit de quoi elle parle, et la
           * hiérarchie du document ne suit pas celle des corps de texte.
           *
           * Sa taille ne dépend plus de la hauteur de la fenêtre : à ce corps,
           * le héros tient partout sans avoir à s'ajuster.
           */}
          <h1 className="mt-5 text-[19px] font-semibold leading-[1.3] tracking-[-0.01em] text-white sm:text-[23px] lg:text-[26px] xl:text-[30px] 2xl:text-[34px] 3xl:text-[40px]">
            Structurer, piloter et optimiser votre démarche RSE, ESG et Développement Durable.
          </h1>

          {/* L'accroche qui tenait ici est retirée : le titre nomme déjà les
              trois sigles, et le paragraphe qui suit dit ce que la plateforme
              en fait. Elle s'intercalait entre les deux sans rien ajouter. */}
          <p className="mx-auto mt-5 max-w-xl text-[14px] leading-relaxed text-white/70 sm:text-[15px] xl:max-w-2xl xl:text-[16px] 2xl:max-w-3xl 2xl:text-[18px] 3xl:text-[20px]">
            SMARTEX SustWay est une démarche d’opérationnalisation de la RSE et du Développement Durable qui aide les
            entreprises à sortir de la stagnation. Elle vise l’amélioration continue de leur fonctionnement opérationnel
            et extra-financier.
          </p>

          {/*
           * Les trois entrées de la page d'entrée, reprises ici : découvrir,
           * choisir une formule, voir la démonstration.
           *
           * Le bouton principal est blanc et non vert : sur le fond Forest, le
           * vert de marque ne se détache qu'à 2,03:1, là où un composant
           * d'interface en demande 3. Blanc, il tient 10:1 et redevient
           * l'élément le plus visible de la page.
           *
           * « Demander une démo » n'est pas repris : il est déjà dans la barre
           * de navigation, visible en permanence, et referme l'appel à
           * l'action final. Trois fois la même demande sur une page n'en rend
           * aucune plus pressante.
           *
           * Pleine largeur sous 640 px : à trois de front sur un écran de
           * 360 px, chaque intitulé passerait sur trois lignes.
           */}
          {/* Les boutons se detachent du paragraphe : a mt-7 ils formaient un
              seul bloc avec lui, alors qu il restait deux cents pixels de vide
              sous eux. L ecart grandit avec la fenetre, ou ce vide grandit aussi. */}
          <div className="mt-7 flex flex-col flex-wrap gap-3 sm:mt-10 sm:flex-row sm:justify-center lg:mt-16 xl:mt-20">
            <Bouton vers="/solution" niveau="principal-sombre" taille="lg" forme="pilule" className="w-full sm:w-auto">
              Découvrir la solution
            </Bouton>

            {/* « Formule de collaboration » mène à la page Offres, celle que
                la barre de navigation désigne : les deux intitulés parlaient
                du même choix et menaient à deux pages différentes. */}
            <Bouton vers="/offres" niveau="secondaire-sombre" taille="lg" forme="pilule" className="group w-full sm:w-auto">
              <Layers
                className="h-5 w-5 transition-transform duration-300 motion-safe:group-hover:scale-110"
                strokeWidth={1.6}
                aria-hidden
              />
              Formule de collaboration
            </Bouton>

            <Bouton
              niveau="secondaire-sombre"
              taille="lg"
              forme="pilule"
              className="group w-full sm:w-auto"
              onClick={() => definirVideoOuverte(true)}
            >
              <PlayCircle
                className="h-5 w-5 transition-transform duration-300 motion-safe:group-hover:scale-110"
                strokeWidth={1.6}
                aria-hidden
              />
              Démo
            </Bouton>
          </div>
        </Apparition>
      </div>

      {/* La modale n'est montée qu'à l'ouverture : elle charge une vidéo de
          soixante-seize mégaoctets, que personne ne doit payer pour avoir
          seulement vu la page. */}
      {videoOuverte ? (
        <ModaleVideo
          source="/videos/methodologie-overview.mp4"
          titre="Vidéo de présentation SMARTEX SustWay"
          surFermeture={() => definirVideoOuverte(false)}
        />
      ) : null}
    </section>
  );
}

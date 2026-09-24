import clsx from 'clsx';
import { Link } from 'react-router-dom';
import { ArrowRight, Check, Leaf } from 'lucide-react';
import { Apparition, Section } from './Section';
import FriseDemarche from './FriseDemarche';
import { ApercuTableauDeBord } from './ApercusFonctionnalites';
import { REFERENCES_METHODOLOGIQUES } from '../../config/smartex';

/*
 * Corps de la page « Solution », en quatre temps.
 *
 * Presentation dit ce que fait la demarche, Methodologie comment elle s'y
 * prend, Referentiels sur quoi elle s'appuie, Livrables ce qu'elle produit.
 *
 * Chacune porte son ancre — `#presentation`, `#methodologie`, `#referentiels`,
 * `#livrables` — que le menu deroulant de la barre vise directement : la page
 * compte donc autant de sections que le menu d'entrees.
 *
 * Une cinquieme section, « Performance durable », la fermait avec le schema
 * des quatre performances. Elle a ete retiree : elle ne figurait plus au menu
 * depuis la refonte de la navigation, et redisait en image ce que les quatre
 * autres enoncent.
 *
 * Quatre sections d'une meme page plutot que quatre pages : elles se lisent a
 * la suite, et le lecteur qui arrive par le menu atterrit au bon endroit sans
 * perdre le fil de ce qui precede.
 *
 * Chacune occupe une fenetre entiere a partir de 1024 px, contenu centre —
 * d'ou `pleineHauteur`. La page se lit donc en trois ecrans, un par entree du
 * menu deroulant, et une ancre amene la section entiere sous la barre plutot
 * que son seul debut. Le padding vertical descend de 112 a 48 px : a 112 px,
 * la presentation depassait de 67 px la fenetre qu'elle doit tenir.
 *
 * Presentation porte le `h1` de la page : le bandeau photo qui l'ouvrait a
 * ete retire, et c'est donc elle qui annonce desormais le sujet. Les trois
 * autres sections ouvrent en `h2`.
 */

/*
 * Les livrables : les quatre documents que la mission produit reellement.
 *
 * Ils venaient de la page « Deploiement », supprimee depuis ; cette liste
 * en est desormais la seule source du site. Les intitules sont ceux qui y
 * figuraient, non reformules.
 */
const LIVRABLES = [
  'Rapport de synthèse : profil RSE, ESG & DD global et profil par domaine évalué',
  'Conformités et non-conformités, degré de maturité de la démarche',
  'Plans d’actions correctives, priorisés selon les risques identifiés',
  'Indice de préparation à l’éligibilité au financement vert des PTF',
];

/*
 * `niveau` : la premiere section porte le `h1`, les suivantes des `h2`. Le
 * corps ne suit pas ce niveau — le titre de la page est plus grand que ceux
 * des sections, mais la hierarchie du document ne se lit pas a la taille des
 * lettres.
 */
function TitreBloc({ surTitre, children, sousTitre, niveau = 2, className }) {
  const Titre = niveau === 1 ? 'h1' : 'h2';
  return (
    <div className={clsx('max-w-3xl', className ?? 'mb-10')}>
      {surTitre ? (
        <p className="mb-4 text-[12px] font-semibold uppercase tracking-[0.14em] text-brand-600">{surTitre}</p>
      ) : null}
      <Titre
        className={clsx(
          'font-semibold leading-tight tracking-[-0.02em] text-forest',
          niveau === 1 ? 'text-[30px] sm:text-[38px] lg:text-[42px]' : 'text-[26px] sm:text-[30px]'
        )}
      >
        {children}
      </Titre>
      {sousTitre ? <p className="mt-5 text-[17px] leading-relaxed text-ink-600">{sousTitre}</p> : null}
    </div>
  );
}

export default function SectionSolution() {
  return (
    <>
      {/* --- A. Presentation -------------------------------------------- */}
      {/*
       * Titre et paragraphe a gauche, schema a droite, les trois piliers en
       * rang sous les deux.
       *
       * Les cartes ont tenu un temps dans la colonne de gauche, empilees, pour
       * combler le vide sous le paragraphe. Cette colonne montait alors a
       * 721 px et la section ne tenait plus dans une fenetre — or c'est elle
       * qui prime. En rang, chacune en format vertical, la section retombe
       * sous la hauteur d'un ecran.
       *
       * `items-start`, et pas de recentrage vertical du schema : il se cale en
       * haut, face au titre, ce qui raccourcit d'autant la section.
       */}
      {/*
       * Le texte a gauche, un ecran du produit a droite.
       *
       * Le schema des trois piliers qui tenait la colonne de droite a cede la
       * place a une capture du tableau de bord : la disposition demandee montre
       * la solution elle-meme des la premiere section, plutot qu'un dessin de
       * ce qu'elle fait. Les trois cartes qui suivaient sont parties avec lui.
       *
       * `items-center` : la colonne de texte est plus courte que l'ecran, et
       * cale en haut elle laissait un vide sous elle.
       */}
      <Section id="presentation" fond="blanc" pleineHauteur contenuClassName="lg:py-8">
        <div className="grid items-center gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:gap-16">
          <Apparition>
            <TitreBloc
              niveau={1}
              surTitre="Présentation"
              className="mb-0"
            >
              L’opérationnalisation RSE, ESG & DD au service de la performance
            </TitreBloc>

            <p className="mt-5 max-w-xl text-[17px] leading-relaxed text-ink-600">
              SMARTEX SustWay est une solution dédiée à l’accompagnement des organisations dans la structuration,
              l’évaluation et le pilotage de leurs démarches RSE, ESG & DD.
            </p>
            <p className="mt-4 max-w-xl text-[17px] leading-relaxed text-ink-600">
              Elle permet aux organisations de passer d’une démarche souvent fragmentée à une approche structurée,
              mesurable et orientée vers l’action, en intégrant les enjeux environnementaux, sociaux et de
              gouvernance dans leurs pratiques et leurs décisions.
            </p>
          </Apparition>

          <Apparition delai={120} className="min-w-0">
            <div className="rounded-2xl bg-gradient-to-br from-brand-50 via-brand-50 to-growth/25 p-4 sm:p-6">
              <ApercuTableauDeBord />
            </div>
          </Apparition>
        </div>
      </Section>

      {/* --- B. Methodologie --------------------------------------------- */}
      {/* La frise porte les cinq etapes du cycle ; le texte les enonce en
          continu au-dessus. Les deux disent la meme chose, l'une pour l'oeil
          qui parcourt, l'autre pour qui lit. */}
      <Section id="methodologie" fond="mist" pleineHauteur contenuClassName="lg:py-8">
        <TitreBloc
          surTitre="Méthodologie"
          sousTitre="La méthodologie de SMARTEX SustWay repose sur un cycle d’amélioration continue, comprenant cinq étapes. Elle commence par la collecte des données via des questionnaires et pièces justificatives, suivie par l’analyse pour identifier les pratiques existantes et les écarts. Ensuite, une évaluation détermine le niveau de maturité en tenant compte des enjeux environnementaux, sociaux et de gouvernance. Les résultats sont présentés sous forme de tableaux de bord et de recommandations pour les décideurs. Enfin, un suivi de la remédiation est mis en place pour assurer la continuité des améliorations."
        >
          Un cycle d’amélioration continue en cinq étapes
        </TitreBloc>

        <FriseDemarche />
      </Section>

      {/* --- C. Referentiels ---------------------------------------------- */}
      {/*
       * La bande des referentiels, sur le modele fourni : un aplat vert borde
       * de deux courbes, le discours a gauche, une rangee de pastilles a
       * droite.
       *
       * Les cinq references sont celles de `config/smartex.js`, deja affichees
       * par le bandeau qui court au bas de toutes les pages. La liste est
       * partagee, pas recopiee.
       *
       * Les logos vivent dans `public/referentiels/`, nommes d'apres le code du
       * referentiel en minuscules, les soulignes changes en tirets. Ils avaient
       * ete deposes pour le carrousel de la page Methodologie, supprimee
       * depuis ; ils reprennent du service ici.
       */}
      <Section
        id="referentiels"
        fond="forest"
        pleineHauteur
        className="relative overflow-hidden"
        contenuClassName="relative lg:py-8"
        decor={
          <>
            {/*
             * Les deux courbes qui bordent la bande, en haut et en bas.
             *
             * Elles sont dessinees dans la couleur de la page et non dans celle
             * de la bande : c'est le blanc qui mord sur le vert, comme sur le
             * modele. `preserveAspectRatio="none"` les etire sur toute la
             * largeur — une courbe qui garderait ses proportions laisserait un
             * vide sur les ecrans larges.
             *
             * Elles passent par `decor` et non par le contenu : bornees a la
             * largeur de lecture, elles faisaient 1200 px sur une section de
             * 1440 et s'arretaient avant les bords.
             *
             * `aria-hidden` et `pointer-events-none` : elles ne sont ni a lire
             * ni a cliquer, et couvrent toute la largeur au-dessus du contenu.
             */}
            <svg
              aria-hidden
              className="pointer-events-none absolute inset-x-0 top-0 z-10 h-8 w-full text-surface sm:h-12"
              viewBox="0 0 1440 48"
              preserveAspectRatio="none"
            >
              <path d="M0 0h1440v10c-240 26-480 38-720 38S240 36 0 10z" fill="currentColor" />
            </svg>
            <svg
              aria-hidden
              className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-8 w-full text-surface sm:h-12"
              viewBox="0 0 1440 48"
              preserveAspectRatio="none"
            >
              <path d="M0 48h1440V38c-240-26-480-38-720-38S240 12 0 38z" fill="currentColor" />
            </svg>
          </>
        }
      >
        <div className="grid items-center gap-10 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:gap-16">
          <Apparition>
            {/* La feuille reprend celle du logotype : c'est le seul signe de la
                marque qui tienne dans un sur-titre. */}
            <p className="flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.14em] text-growth">
              <Leaf className="h-4 w-4 shrink-0" strokeWidth={2} aria-hidden />
              Référentiels
            </p>
            <h2 className="mt-4 text-[26px] font-semibold leading-tight tracking-[-0.02em] text-white sm:text-[30px]">
              Des cadres reconnus
            </h2>
            <p className="mt-5 max-w-xl text-[17px] leading-relaxed text-white/75">
              Les référentiels constituent le cadre de référence. Ils permettent de définir les critères d’évaluation,
              de structurer la collecte des données, d’analyser les écarts et d’orienter les actions.
            </p>

            {/* Le modele porte ici un bouton « en savoir plus ». Il mene au
                contact : aucune page du site ne detaille les referentiels un a
                un, et un bouton vers une page inexistante vaut moins qu'un
                bouton vers quelqu'un. */}
            {/* Vers la rubrique qui detaille ces cadres, et non vers le
                formulaire de contact : le bouton suit le titre qui le precede,
                et cette page n'a pas a developper un sujet qu'une autre porte
                deja. */}
            <Link viewTransition
              to="/ressources#referentiels"
              className="group mt-8 inline-flex min-h-12 items-center gap-2 rounded-full bg-growth px-6 text-[15px] font-semibold text-forest transition-colors hover:bg-white"
            >
              Parler des référentiels
              <ArrowRight
                className="h-4 w-4 transition-transform duration-200 motion-safe:group-hover:translate-x-1"
                strokeWidth={2}
                aria-hidden
              />
            </Link>
          </Apparition>

          {/* Quatre de front au-dela de 1024 px, et non cinq : la liste est
              passee de cinq references a douze, qui se rangent en trois rangees
              pleines sur quatre colonnes quand cinq en auraient laisse deux
              orphelines sur une troisieme ligne.
              Trois de front sur telephone large, deux en dessous : une pastille
              de 96 px et un nom de trois mots demandent chacun leur place. */}
          <ul className="grid grid-cols-2 justify-items-center gap-x-4 gap-y-8 sm:grid-cols-3 lg:grid-cols-4 lg:gap-x-3">
            {REFERENCES_METHODOLOGIQUES.map((reference, index) => (
              <Apparition
                key={reference.code}
                balise="li"
                delai={index * 45}
                className="group flex w-full flex-col items-center text-center"
              >
                {/*
                 * Le logo est decoratif : le nom qui le suit dit la meme chose,
                 * et le faire lire deux fois n'apprend rien. D'ou `alt` vide.
                 *
                 * `onError` masque l'image plutot que de laisser l'icone de
                 * fichier casse : tant qu'un logo manque, la pastille reste, et
                 * le nom en dessous porte l'information — c'est la regle que
                 * pose deja le LISEZ-MOI du dossier.
                 *
                 * Seul le nom suit la pastille. La portee de chaque referentiel
                 * — « sante et securite au travail », « dix principes
                 * couvrant... » — y tenait aussi, et donnait a la rangee cinq
                 * colonnes de hauteurs inegales, celle du Pacte mondial montant
                 * a six lignes. Le paragraphe de gauche dit ce que les
                 * referentiels font ; la rangee dit lesquels.
                 *
                 * Pastilles blanches cerclees de Butterfly : les fichiers ont un
                 * fond blanc et des couleurs propres a chaque organisme — jaune
                 * et noir, bleu — qu'un fond vert avalerait, et l'anneau clair
                 * detache le disque du vert comme sur le modele.
                 */}
                <span className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-full bg-white p-3 ring-2 ring-growth/60 ring-offset-4 ring-offset-forest transition-[transform,box-shadow] duration-300 ease-out motion-safe:group-hover:-translate-y-1 motion-safe:group-hover:ring-growth motion-reduce:transition-none sm:h-24 sm:w-24 sm:p-4">
                  <img
                    src={`/referentiels/${reference.code.toLowerCase().replace(/_/g, '-')}.png`}
                    alt=""
                    loading="lazy"
                    className="h-full w-full object-contain"
                    onError={(evenement) => {
                      evenement.currentTarget.style.display = 'none';
                    }}
                  />
                </span>
                <p className="mt-5 text-[13px] font-semibold leading-snug text-white sm:text-sm">{reference.nom}</p>
              </Apparition>
            ))}
          </ul>
        </div>
      </Section>

      {/* --- D. Livrables -------------------------------------------------- */}
      <Section id="livrables" fond="mist" pleineHauteur contenuClassName="lg:py-8">
        <TitreBloc
          surTitre="Livrables"
          sousTitre="La démarche SMARTEX SustWay transforme les données et les analyses en livrables utiles à la décision et au pilotage."
        >
          Des résultats pour décider et agir
        </TitreBloc>

        <ul className="grid gap-4 sm:grid-cols-2">
          {LIVRABLES.map((livrable, index) => (
            <Apparition
              key={livrable}
              balise="li"
              delai={index * 90}
              className="flex h-full items-start gap-4 rounded-2xl border border-ink-200 bg-surface p-6"
            >
                <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
                  <Check className="h-[18px] w-[18px]" strokeWidth={2.5} aria-hidden />
                </span>
                <p className="text-[16px] leading-relaxed text-ink-700">{livrable}</p>
            </Apparition>
          ))}
        </ul>
      </Section>

    </>
  );
}

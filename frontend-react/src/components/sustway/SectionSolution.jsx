import clsx from 'clsx';
import { Check, ScrollText } from 'lucide-react';
import { Apparition, Section } from './Section';
import FriseDemarche from './FriseDemarche';
import { ApercuTableauDeBord } from './ApercusFonctionnalites';
import SchemaPerformance from './SchemaPerformance';
import { REFERENCES_METHODOLOGIQUES } from '../../config/smartex';

/*
 * Corps de la page « Solution », en cinq temps.
 *
 * Presentation dit ce que fait la demarche, Methodologie comment elle s'y
 * prend, Referentiels sur quoi elle s'appuie, Livrables ce qu'elle produit, et
 * Performance durable ce qu'elle concilie.
 *
 * Les quatre premieres portent une ancre — `#presentation`, `#methodologie`,
 * `#referentiels`, `#livrables` — que le menu deroulant de la barre vise
 * directement. Performance durable garde la sienne mais ne figure plus au
 * menu : le schema des quatre performances reste a lire en defilant, sans
 * qu'une sixieme entree vienne allonger un menu qui en compte deja quatre.
 *
 * Cinq sections d'une meme page plutot que cinq pages : elles se lisent a la
 * suite, et le lecteur qui arrive par le menu atterrit au bon endroit sans
 * perdre le fil de ce qui precede.
 *
 * Chacune occupe une fenetre entiere a partir de 1024 px, contenu centre —
 * d'ou `pleineHauteur`. La page se lit donc en trois ecrans, un par entree du
 * menu deroulant, et une ancre amene la section entiere sous la barre plutot
 * que son seul debut. Le padding vertical descend de 112 a 48 px : a 112 px,
 * la presentation depassait de 67 px la fenetre qu'elle doit tenir.
 *
 * Presentation porte le `h1` de la page : le bandeau photo qui l'ouvrait a
 * ete retire, et c'est donc elle qui annonce desormais le sujet. Les quatre
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
  'Rapport de synthèse : profil RSE global et profil par domaine évalué',
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
              L’opérationnalisation de la RSE au service de la performance
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
       * Les cinq references sont celles de `config/smartex.js`, deja affichees
       * par le bandeau qui court au bas de toutes les pages. La liste est
       * partagee, pas recopiee : le bandeau n'en donne que les noms, cette
       * section en donne aussi la portee.
       */}
      <Section id="referentiels" fond="blanc" pleineHauteur contenuClassName="lg:py-8">
        <TitreBloc
          surTitre="Référentiels"
          sousTitre="Les référentiels constituent le cadre de référence. Ils permettent de définir les critères d’évaluation, de structurer la collecte des données, d’analyser les écarts et d’orienter les actions."
        >
          Des cadres reconnus, et non des critères maison
        </TitreBloc>

        <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {REFERENCES_METHODOLOGIQUES.map((reference, index) => (
            <Apparition
              key={reference.code}
              balise="li"
              delai={index * 90}
              className="flex h-full flex-col rounded-2xl border border-ink-200 bg-surface p-6"
            >
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                  <ScrollText className="h-5 w-5" strokeWidth={1.75} aria-hidden />
                </span>
                <h3 className="mt-4 text-[18px] font-semibold text-forest">{reference.nom}</h3>
                <p className="mt-2 text-[15px] leading-relaxed text-ink-600">{reference.texte}</p>
            </Apparition>
          ))}
        </ul>
      </Section>

      {/* --- D. Livrables -------------------------------------------------- */}
      <Section id="livrables" fond="mist" pleineHauteur contenuClassName="lg:py-8">
        <TitreBloc
          surTitre="Livrables"
          sousTitre="La démarche SMARTEX SustWay transforme les données et les analyses en livrables utiles à la décision et au pilotage."
        >
          Ce que la démarche vous remet
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

      {/* --- E. Performance durable -------------------------------------- */}
      <Section id="performance-durable" fond="blanc" pleineHauteur contenuClassName="lg:py-8">
        <TitreBloc
          surTitre="Performance durable"
          sousTitre="Maîtrisez vos impacts sociaux et environnementaux sans compromettre votre performance financière, grâce à un pilotage unifié, structuré et transparent."
        >
          Concilier rentabilité et responsabilité
        </TitreBloc>

        <SchemaPerformance />
      </Section>
    </>
  );
}

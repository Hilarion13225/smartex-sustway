import clsx from 'clsx';
import { Gauge, Layers, TrendingUp } from 'lucide-react';
import { Apparition, Section } from './Section';
import FriseDemarche from './FriseDemarche';
import SchemaPiliers from './SchemaPiliers';
import SchemaPerformance from './SchemaPerformance';

/*
 * Corps de la page « Solution », en trois temps.
 *
 * Presentation dit ce que fait la demarche, Notre approche comment elle s'y
 * prend, Performance durable ce qu'elle concilie. Chacune porte une ancre —
 * `#presentation`, `#notre-approche`, `#performance-durable` — que le menu
 * deroulant de la barre de navigation vise directement.
 *
 * Trois sections d'une meme page plutot que trois pages : elles se lisent a la
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
 * ete retire, et c'est donc elle qui annonce desormais le sujet. Les deux
 * autres sections ouvrent en `h2`.
 */
const DOMAINES = [
  {
    titre: 'Structurer',
    texte: 'Poser un cadre méthodologique clair, adapté à l’organisation et déployé en 5 étapes.',
    icone: Layers,
  },
  {
    titre: 'Piloter',
    texte: 'Assurer un suivi dynamique des indicateurs clés sociaux, environnementaux et de gouvernance.',
    icone: Gauge,
  },
  {
    titre: 'Optimiser',
    texte: 'Transformer les constats et les écarts en actions concrètes et en création de valeur à long terme.',
    icone: TrendingUp,
  },
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
      <Section id="presentation" fond="blanc" pleineHauteur contenuClassName="lg:py-8">
        <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.95fr)] lg:gap-16">
          <Apparition>
            <TitreBloc
              niveau={1}
              surTitre="Présentation"
              className="mb-0"
              sousTitre="SMARTEX SustWay instaure une dynamique d’amélioration continue pour transformer vos obligations en réels leviers de croissance."
            >
              L’opérationnalisation de la RSE au service de la performance
            </TitreBloc>
          </Apparition>

          <Apparition delai={120} className="min-w-0">
            <SchemaPiliers />
          </Apparition>
        </div>

        <div className="mt-6 grid gap-5 md:grid-cols-3">
          {DOMAINES.map((domaine, index) => {
            const Icone = domaine.icone;
            return (
              <Apparition key={domaine.titre} delai={index * 110}>
                <div className="h-full rounded-2xl border border-ink-200 bg-surface p-4">
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                    <Icone className="h-5 w-5" strokeWidth={1.75} aria-hidden />
                  </span>
                  <h3 className="mt-3 text-[19px] font-semibold text-forest">{domaine.titre}</h3>
                  <p className="mt-2 text-[15px] leading-relaxed text-ink-600">{domaine.texte}</p>
                </div>
              </Apparition>
            );
          })}
        </div>
      </Section>

      {/* --- B. Notre approche ------------------------------------------ */}
      <Section id="notre-approche" fond="mist" pleineHauteur contenuClassName="lg:py-12">
        <TitreBloc
          surTitre="Notre approche"
          sousTitre="Pour sortir de la stagnation, SMARTEX SustWay déploie une méthode progressive qui intègre les principes ESG au cœur des décisions stratégiques de croissance, tout en recherchant la création de valeur durable et la maîtrise des impacts de l’entreprise."
        >
          Une démarche structurée en 5 étapes
        </TitreBloc>

        <FriseDemarche />
      </Section>

      {/* --- C. Performance durable -------------------------------------- */}
      <Section id="performance-durable" fond="blanc" pleineHauteur contenuClassName="lg:py-12">
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

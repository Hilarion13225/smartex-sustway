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
       * La colonne de gauche porte le titre, le paragraphe puis les trois
       * piliers ; celle de droite le schema. Les cartes etaient auparavant en
       * rang sous les deux colonnes, ce qui laissait un vide sous le
       * paragraphe : elles remplissent desormais ce vide.
       *
       * Empilees dans une seule colonne, elles passent en format horizontal —
       * icone a gauche, titre et texte a droite. Trois cartes verticales
       * cote a cote y seraient trop etroites, et empilees en format vertical
       * elles depasseraient de loin la hauteur du schema.
       *
       * `items-start` cale les deux colonnes en haut, mais le schema fait
       * 489 px contre 721 px pour le texte et ses cartes : `lg:self-center`
       * l'y recentre, ce qui repartit ce creux de 232 px de part et d'autre au
       * lieu de le laisser tomber entier sous le schema.
       */}
      <Section id="presentation" fond="blanc">
        <div className="grid items-start gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.95fr)] lg:gap-16">
          <div className="min-w-0">
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

            <div className="mt-10 space-y-4">
              {DOMAINES.map((domaine, index) => {
                const Icone = domaine.icone;
                return (
                  <Apparition key={domaine.titre} delai={index * 110}>
                    <div className="flex items-start gap-4 rounded-2xl border border-ink-200 bg-surface p-5">
                      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                        <Icone className="h-5 w-5" strokeWidth={1.75} aria-hidden />
                      </span>
                      <div className="min-w-0">
                        <h3 className="text-[19px] font-semibold text-forest">{domaine.titre}</h3>
                        <p className="mt-2 text-[15px] leading-relaxed text-ink-600">{domaine.texte}</p>
                      </div>
                    </div>
                  </Apparition>
                );
              })}
            </div>
          </div>

          <Apparition delai={120} className="min-w-0 lg:self-center">
            <SchemaPiliers />
          </Apparition>
        </div>
      </Section>

      {/* --- B. Notre approche ------------------------------------------ */}
      <Section id="notre-approche" fond="mist">
        <TitreBloc
          surTitre="Notre approche"
          sousTitre="Pour sortir de la stagnation, SMARTEX SustWay déploie une méthode progressive qui intègre les principes ESG au cœur des décisions stratégiques de croissance, tout en recherchant la création de valeur durable et la maîtrise des impacts de l’entreprise."
        >
          Une démarche structurée en 5 étapes
        </TitreBloc>

        <FriseDemarche />
      </Section>

      {/* --- C. Performance durable -------------------------------------- */}
      <Section id="performance-durable" fond="blanc">
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

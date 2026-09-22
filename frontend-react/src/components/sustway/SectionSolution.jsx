import clsx from 'clsx';
import { Check, Gauge, Layers, ScrollText, TrendingUp } from 'lucide-react';
import { Apparition, Section } from './Section';
import FriseDemarche from './FriseDemarche';
import SchemaPiliers from './SchemaPiliers';
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
 * Les livrables, repris mot pour mot de la page « Deploiement » (voir
 * `vitrine/EtapesMission.jsx`, entree « Les livrables »).
 *
 * Repris et non reformules : ce sont les quatre documents que la mission
 * produit reellement, et deux pages du site qui les enonceraient
 * differemment finiraient par se contredire.
 */
const LIVRABLES = [
  'Rapport de synthèse : profil RSE global et profil par domaine évalué',
  'Conformités et non-conformités, degré de maturité de la démarche',
  'Plans d’actions correctives, priorisés selon les risques identifiés',
  'Indice de préparation à l’éligibilité au financement vert des PTF',
];
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

      {/* --- B. Methodologie --------------------------------------------- */}
      {/* Anciennement « Notre approche » : seuls le sur-titre et l'ancre
          changent, la frise des cinq etapes et son texte restent. C'est bien
          de la methodologie que la section parlait deja. */}
      <Section id="methodologie" fond="mist" pleineHauteur contenuClassName="lg:py-8">
        <TitreBloc
          surTitre="Méthodologie"
          sousTitre="Pour sortir de la stagnation, SMARTEX SustWay déploie une méthodologie progressive qui intègre les principes ESG au cœur des décisions stratégiques de croissance, tout en recherchant la création de valeur durable et la maîtrise des impacts de l’entreprise."
        >
          Une démarche structurée en 5 étapes
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
          sousTitre="Une évaluation ne vaut que par le cadre auquel elle se rapporte. Les critères de SMARTEX SustWay s’adossent à des références internationales reconnues, et chaque résultat peut être ramené à celle dont il relève."
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
          sousTitre="Un rapport qui dit où vous en êtes, et ce qu’il reste à corriger. La démarche ne s’arrête pas à un score : elle rend des documents exploitables, que vos équipes et vos parties prenantes peuvent lire."
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

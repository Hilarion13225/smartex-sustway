import { Gauge, Layers, TrendingUp } from 'lucide-react';
import { Apparition, Section } from './Section';
import FriseDemarche from './FriseDemarche';
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
 * Le titre de la page porte le `h1` ; ces trois-la ouvrent donc en `h2`.
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

function TitreBloc({ surTitre, children, sousTitre }) {
  return (
    <div className="mb-10 max-w-3xl">
      {surTitre ? (
        <p className="mb-4 text-[12px] font-semibold uppercase tracking-[0.14em] text-brand-600">{surTitre}</p>
      ) : null}
      <h2 className="text-[26px] font-semibold leading-tight tracking-[-0.02em] text-forest sm:text-[30px]">
        {children}
      </h2>
      {sousTitre ? <p className="mt-4 text-[16px] leading-relaxed text-ink-600">{sousTitre}</p> : null}
    </div>
  );
}

export default function SectionSolution() {
  return (
    <>
      {/* --- A. Presentation -------------------------------------------- */}
      <Section id="presentation" fond="blanc">
        <TitreBloc
          surTitre="Présentation"
          sousTitre="SMARTEX SustWay instaure une dynamique d’amélioration continue pour transformer vos obligations en réels leviers de croissance."
        >
          Trois mouvements, une même démarche
        </TitreBloc>

        <div className="grid gap-5 md:grid-cols-3">
          {DOMAINES.map((domaine, index) => {
            const Icone = domaine.icone;
            return (
              <Apparition key={domaine.titre} delai={index * 110}>
                <div className="h-full rounded-2xl border border-ink-200 bg-surface p-6">
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                    <Icone className="h-5 w-5" strokeWidth={1.75} aria-hidden />
                  </span>
                  <h3 className="mt-4 text-[20px] font-semibold text-forest">{domaine.titre}</h3>
                  <p className="mt-3 text-[15px] leading-relaxed text-ink-600">{domaine.texte}</p>
                </div>
              </Apparition>
            );
          })}
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

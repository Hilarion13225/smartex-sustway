import { ArrowRight, BookOpen, FileText, HelpCircle, LineChart } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Apparition, Section, TitreSection } from './Section';

/*
 * « Ressources » : quatre portes d'entrée vers ce que SMARTEX publie.
 *
 * Les vignettes sont dessinées, pas photographiées. Une banque d'images
 * donnerait ici des feuilles et des planètes, qui rangeraient le produit du
 * côté du discours militant plutôt que du côté de l'outil de pilotage — ce
 * que la charte écarte explicitement. Chaque vignette reprend donc le langage
 * du produit : une trajectoire, des lignes de texte, un document, une
 * question.
 *
 * La carte entière est cliquable via un lien étendu (`after:absolute
 * after:inset-0`) : cibler seulement l'intitulé du bas obligerait à viser un
 * texte de 15 px. Le lien reste un vrai lien, donc atteignable au clavier et
 * annoncé une seule fois.
 */
const RESSOURCES = [
  {
    titre: 'Articles & analyses',
    texte: 'Les évolutions réglementaires et les pratiques du pilotage extra-financier.',
    action: 'Lire',
    vers: '/ressources',
    icone: LineChart,
  },
  {
    titre: 'Guides',
    texte: 'Des repères méthodologiques pour structurer une démarche de bout en bout.',
    action: 'Consulter',
    vers: '/ressources#guides',
    icone: BookOpen,
  },
  {
    titre: 'Documentation',
    texte: 'Le fonctionnement de la plateforme, écran par écran.',
    action: 'Explorer',
    vers: '/ressources#documentation',
    icone: FileText,
  },
  {
    titre: 'FAQ',
    texte: 'Les questions posées avant, pendant et après une première évaluation.',
    action: 'Voir',
    vers: '/methodologie#questions',
    icone: HelpCircle,
  },
];

export default function SectionRessources() {
  return (
    <Section id="ressources" fond="blanc">
      <TitreSection
        surTitre="Ressources"
        titre="Ressources & expertise"
        sousTitre="Ce que nous publions sur la RSE, les critères ESG et le reporting de durabilité, et ce qui documente la plateforme."
      />

      <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {RESSOURCES.map((ressource, index) => {
          const Icone = ressource.icone;
          return (
            <Apparition key={ressource.titre} delai={index * 90} className="h-full">
              <article className="group relative flex h-full flex-col rounded-2xl border border-ink-200 bg-surface p-6 transition-all duration-200 hover:border-brand-200 hover:shadow-soft focus-within:border-brand-300">
                {/* Vignette : un aplat vert très clair traversé d'une courbe,
                    reprise du langage graphique du produit. */}
                <div
                  aria-hidden
                  className="relative mb-5 flex h-24 items-end overflow-hidden rounded-xl bg-brand-50"
                >
                  <svg viewBox="0 0 200 96" className="absolute inset-0 h-full w-full" preserveAspectRatio="none">
                    <path
                      d="M 0 74 C 40 74, 52 46, 92 46 S 148 22, 200 14"
                      fill="none"
                      stroke="rgb(var(--growth))"
                      strokeWidth="2"
                      vectorEffect="non-scaling-stroke"
                    />
                    <path
                      d="M 0 88 C 48 88, 60 66, 104 66 S 156 48, 200 40"
                      fill="none"
                      stroke="rgb(var(--brand-200))"
                      strokeWidth="2"
                      vectorEffect="non-scaling-stroke"
                    />
                  </svg>
                  <span className="absolute left-4 top-4 flex h-10 w-10 items-center justify-center rounded-xl bg-surface text-brand-600 shadow-sm">
                    <Icone className="h-[18px] w-[18px]" strokeWidth={1.75} />
                  </span>
                </div>

                <h3 className="text-[18px] font-semibold text-forest">{ressource.titre}</h3>
                <p className="mt-2 text-[14px] leading-relaxed text-ink-600">{ressource.texte}</p>

                <Link
                  to={ressource.vers}
                  className="mt-auto inline-flex items-center gap-1.5 pt-5 text-[15px] font-semibold text-brand-700 transition-all duration-150 after:absolute after:inset-0 after:content-[''] group-hover:gap-2.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
                >
                  {ressource.action}
                  <ArrowRight className="h-4 w-4" strokeWidth={2} aria-hidden />
                </Link>
              </article>
            </Apparition>
          );
        })}
      </div>
    </Section>
  );
}

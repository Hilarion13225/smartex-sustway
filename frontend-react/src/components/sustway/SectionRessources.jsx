import { ArrowRight, BookOpen, FileText, HelpCircle, Newspaper } from 'lucide-react';
import { Link } from 'react-router-dom';
import Badge from './Badge';
import { Apparition, Section } from './Section';

/*
 * Corps de la page « Ressources » : quatre rubriques, chacune avec son ancre.
 *
 * Trois d'entre elles n'ont pas encore de contenu. Elles sont nommées,
 * décrites, et marquées comme telles plutôt que masquées : le menu de la barre
 * les annonce, et une page qui tient moins que le menu ne promet est plus
 * déroutante qu'une rubrique qui dit franchement qu'elle arrive. Aucun article
 * n'est inventé pour faire nombre, et aucun bouton ne mène à une page vide —
 * un bouton grisé ferait espérer un clic.
 *
 * La FAQ non plus n'existe pas encore. Le bouton qui menait vers elle visait
 * `/methodologie#questions`, une ancre que la page Méthodologie n'a jamais
 * portée : le lien était mort sans que rien ne le signale. Les quatre
 * rubriques sont donc annoncées de la même façon, et aucune ne promet un
 * contenu qui n'est pas là.
 *
 * Les vignettes sont dessinées, pas photographiées. Une banque d'images
 * donnerait ici des feuilles et des planètes, qui rangeraient le produit du
 * côté du discours militant plutôt que du côté de l'outil de pilotage.
 */
const RUBRIQUES = [
  {
    ancre: 'articles',
    surTitre: 'Articles',
    titre: 'Comprendre les évolutions RSE, ESG & DD',
    texte:
      'Retrouvez nos analyses et actualités sur les tendances RSE, les critères ESG et les stratégies de développement durable en entreprise.',
    action: 'Voir les articles',
    icone: Newspaper,
  },
  {
    ancre: 'guides',
    surTitre: 'Guides & bonnes pratiques',
    titre: 'Passer de la stratégie à l’action',
    texte:
      'Des méthodes pratiques pour structurer votre démarche pas à pas et embarquer l’ensemble de vos équipes dans une dynamique d’amélioration continue.',
    action: 'Consulter les guides',
    icone: BookOpen,
  },
  {
    ancre: 'documentation',
    surTitre: 'Documentation',
    titre: 'Comprendre SMARTEX SustWay',
    texte:
      'Tout savoir sur l’utilisation de la plateforme SMARTEX SustWay, ses concepts, ses référentiels et sa mise en œuvre technique.',
    action: 'Consulter la documentation',
    icone: FileText,
  },
  {
    ancre: 'faq',
    surTitre: 'FAQ',
    titre: 'Les réponses à vos questions',
    texte:
      'Les réponses aux questions les plus fréquentes concernant le déploiement de la solution et son adéquation avec vos objectifs stratégiques.',
    action: 'Consulter la FAQ',
    icone: HelpCircle,
  },
];

/* Aplat traversé de deux courbes, reprises du langage graphique du produit. */
function Vignette({ Icone, attenuee }) {
  return (
    <div
      aria-hidden
      className={`relative flex h-40 items-end overflow-hidden rounded-2xl sm:h-48 ${
        attenuee ? 'bg-ink-100' : 'bg-brand-50'
      }`}
    >
      <svg viewBox="0 0 200 96" className="absolute inset-0 h-full w-full" preserveAspectRatio="none">
        <path
          d="M 0 74 C 40 74, 52 46, 92 46 S 148 22, 200 14"
          fill="none"
          stroke={attenuee ? 'rgb(var(--ink-300))' : 'rgb(var(--growth))'}
          strokeWidth="2"
          vectorEffect="non-scaling-stroke"
        />
        <path
          d="M 0 88 C 48 88, 60 66, 104 66 S 156 48, 200 40"
          fill="none"
          stroke={attenuee ? 'rgb(var(--ink-200))' : 'rgb(var(--brand-200))'}
          strokeWidth="2"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
      <span
        className={`absolute left-5 top-5 flex h-12 w-12 items-center justify-center rounded-xl bg-surface shadow-sm ${
          attenuee ? 'text-ink-500' : 'text-brand-600'
        }`}
      >
        <Icone className="h-[22px] w-[22px]" strokeWidth={1.75} />
      </span>
    </div>
  );
}

export default function SectionRessources() {
  return (
    <>
      {RUBRIQUES.map((rubrique, index) => {
        const Icone = rubrique.icone;
        const inverse = index % 2 === 1;
        const aVenir = !rubrique.vers;

        return (
          <Section key={rubrique.ancre} id={rubrique.ancre} fond={inverse ? 'mist' : 'blanc'}>
            <Apparition>
              <article className="grid items-center gap-8 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] lg:gap-14">
                <div className={`min-w-0 ${inverse ? 'lg:order-2' : ''}`}>
                  <div className="flex flex-wrap items-center gap-3">
                    <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-brand-600">
                      {rubrique.surTitre}
                    </p>
                    {aVenir ? <Badge>À venir</Badge> : null}
                  </div>

                  <h2 className="mt-4 text-[26px] font-semibold leading-tight tracking-[-0.02em] text-forest sm:text-[30px]">
                    {rubrique.titre}
                  </h2>
                  <p className="mt-4 max-w-xl text-[16px] leading-relaxed text-ink-600">{rubrique.texte}</p>

                  {/* Un lien quand la rubrique existe, une phrase quand elle
                      n'existe pas encore. Jamais un bouton inerte. */}
                  {rubrique.vers ? (
                    <Link
                      to={rubrique.vers}
                      className="group mt-6 inline-flex items-center gap-2 rounded-lg bg-brand-600 px-5 py-3 text-[15px] font-semibold text-white transition-colors hover:bg-brand-700"
                    >
                      {rubrique.action}
                      <ArrowRight
                        className="h-4 w-4 transition-transform duration-200 motion-safe:group-hover:translate-x-1"
                        strokeWidth={2}
                        aria-hidden
                      />
                    </Link>
                  ) : (
                    <p className="mt-6 text-[14px] italic text-ink-500">
                      Cette rubrique est en préparation. Nous préférons le dire plutôt que publier des contenus de
                      remplissage.
                    </p>
                  )}
                </div>

                <div className={`min-w-0 ${inverse ? 'lg:order-1' : ''}`}>
                  <Vignette Icone={Icone} attenuee={aVenir} />
                </div>
              </article>
            </Apparition>
          </Section>
        );
      })}
    </>
  );
}

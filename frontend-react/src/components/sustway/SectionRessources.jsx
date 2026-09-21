import { ArrowRight, BookOpen, FileText, GraduationCap, HelpCircle, LineChart, Newspaper } from 'lucide-react';
import { Link } from 'react-router-dom';
import Badge from './Badge';
import { Apparition, Section } from './Section';
import { SMARTEX } from '../../config/smartex';

/*
 * Corps de la page « Ressources ».
 *
 * Deux rubriques sur quatre n'ont pas encore de contenu. Elles sont nommées et
 * décrites plutôt que masquées : la barre de navigation les promet, et une
 * page qui tient moins que le menu n'annonce est plus déroutante qu'une
 * rubrique qui dit franchement qu'elle arrive. Aucun article fictif n'est
 * affiché pour faire nombre, et aucun bouton ne mène à une page vide — la
 * charte écarte explicitement les contenus inventés.
 *
 * Les vignettes sont dessinées, pas photographiées. Une banque d'images
 * donnerait ici des feuilles et des planètes, qui rangeraient le produit du
 * côté du discours militant plutôt que du côté de l'outil de pilotage. Chaque
 * vignette reprend donc le langage graphique du produit : une trajectoire.
 */
const DISPONIBLES = [
  {
    titre: 'Formations',
    texte: `Des parcours pratiques animés par les consultants ${SMARTEX.editeur}, avec des cas concrets tirés de votre secteur et une attestation à l’issue.`,
    action: 'Voir les formations',
    vers: '/formation',
    icone: GraduationCap,
  },
  {
    titre: 'La méthodologie',
    texte: 'Les référentiels retenus, les critères évalués et la façon dont le score est construit, étape par étape.',
    action: 'Consulter',
    vers: '/methodologie',
    icone: BookOpen,
  },
  {
    titre: 'FAQ',
    texte: 'Les questions posées avant, pendant et après une première évaluation.',
    action: 'Voir les questions',
    vers: '/methodologie#questions',
    icone: HelpCircle,
  },
];

const A_VENIR = [
  {
    titre: 'Articles & analyses',
    texte: 'Des repères pour comprendre les référentiels, les critères et ce que recouvre une démarche RSE et ESG.',
    icone: LineChart,
  },
  {
    titre: 'Actualités',
    texte: 'L’évolution des standards, des obligations et des attentes des partenaires techniques et financiers.',
    icone: Newspaper,
  },
  {
    titre: 'Documentation produit',
    texte: 'Le fonctionnement de la plateforme, écran par écran, pour les équipes qui la déploient.',
    icone: FileText,
  },
];

/* Aplat vert traversé de deux courbes, commun à toutes les vignettes. */
function Vignette({ Icone, attenuee = false }) {
  return (
    <div
      aria-hidden
      className={`relative mb-5 flex h-24 items-end overflow-hidden rounded-xl ${attenuee ? 'bg-ink-100' : 'bg-brand-50'}`}
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
        className={`absolute left-4 top-4 flex h-10 w-10 items-center justify-center rounded-xl bg-surface shadow-sm ${
          attenuee ? 'text-ink-500' : 'text-brand-600'
        }`}
      >
        <Icone className="h-[18px] w-[18px]" strokeWidth={1.75} />
      </span>
    </div>
  );
}

export default function SectionRessources() {
  return (
    <>
      <Section fond="blanc">
        <h2 className="mb-10 text-[26px] font-semibold leading-tight tracking-[-0.02em] text-forest sm:text-[30px]">
          Disponible dès maintenant
        </h2>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {DISPONIBLES.map((ressource, index) => (
            <Apparition key={ressource.titre} delai={index * 90} className="h-full">
              {/*
               * La carte entière est cliquable via un lien étendu
               * (`after:absolute after:inset-0`) : cibler seulement l'intitulé
               * du bas obligerait à viser un texte de 15 px. Le lien reste un
               * vrai lien, donc atteignable au clavier et annoncé une fois.
               */}
              <article className="group relative flex h-full flex-col rounded-2xl border border-ink-200 bg-surface p-6 transition-all duration-200 hover:border-brand-200 hover:shadow-soft focus-within:border-brand-300">
                <Vignette Icone={ressource.icone} />
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
          ))}
        </div>
      </Section>

      <Section fond="mist">
        <div className="mb-10 max-w-3xl">
          <h2 className="text-[26px] font-semibold leading-tight tracking-[-0.02em] text-forest sm:text-[30px]">
            En préparation
          </h2>
          <p className="mt-3 text-[16px] leading-relaxed text-ink-600">
            Ces rubriques sont annoncées ici sans être encore ouvertes. Nous préférons le dire plutôt que publier des
            contenus de remplissage.
          </p>
        </div>

        <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {A_VENIR.map((ressource, index) => (
            <Apparition key={ressource.titre} delai={index * 90} className="h-full">
              {/* Ni lien ni bouton : rien n'est cliquable, parce qu'il n'y a
                  rien à ouvrir. Un bouton grisé ferait espérer un clic. */}
              <li className="flex h-full flex-col rounded-2xl border border-dashed border-ink-300 bg-surface p-6">
                <Vignette Icone={ressource.icone} attenuee />
                <div className="flex items-start justify-between gap-3">
                  <h3 className="text-[18px] font-semibold text-ink-800">{ressource.titre}</h3>
                  <Badge>À venir</Badge>
                </div>
                <p className="mt-2 text-[14px] leading-relaxed text-ink-600">{ressource.texte}</p>
              </li>
            </Apparition>
          ))}
        </ul>
      </Section>
    </>
  );
}

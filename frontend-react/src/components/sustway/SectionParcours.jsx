import { ArrowRight, BookOpen, LayoutGrid, Layers, Tag } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Apparition, Section, TitreSection } from './Section';

/*
 * Les quatre parties du site, annoncées depuis l'accueil.
 *
 * Chaque carte dit de quoi sa page traite et y mène. Elle n'en reprend pas le
 * contenu : l'accueil vend la vision, les quatre autres pages la détaillent,
 * et recopier ici leurs étapes ou leurs écrans ferait lire deux fois la même
 * chose à qui suit le parcours dans l'ordre.
 *
 * L'ordre est celui de la barre de navigation, et celui du récit : comment on
 * s'y prend, avec quels outils, à quelles conditions, et ce qu'on peut lire
 * pour se préparer.
 */
const PARTIES = [
  {
    titre: 'Solution',
    texte: 'La démarche en cinq temps, les trois domaines couverts et ce qu’elle produit.',
    vers: '/solution',
    icone: Layers,
  },
  {
    titre: 'Fonctionnalités',
    texte: 'Les six écrans qui portent la démarche, des campagnes au reporting.',
    vers: '/fonctionnalites',
    icone: LayoutGrid,
  },
  {
    titre: 'Offres',
    texte: 'Trois niveaux de service, du cadrage d’une première démarche au déploiement multi-entités.',
    vers: '/offres',
    icone: Tag,
  },
  {
    titre: 'Ressources',
    texte: 'Les formations, la méthodologie et les questions posées avant une première évaluation.',
    vers: '/ressources',
    icone: BookOpen,
  },
];

export default function SectionParcours() {
  return (
    <Section fond="mist">
      <TitreSection
        surTitre="Le parcours"
        titre="Découvrir la plateforme, partie par partie"
        sousTitre="Quatre entrées, dans l’ordre où se pose la question : comment nous procédons, avec quels outils, à quelles conditions, et ce qui existe pour vous préparer."
      />

      <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {PARTIES.map((partie, index) => {
          const Icone = partie.icone;
          return (
            <Apparition key={partie.titre} delai={index * 90} className="h-full">
              {/* Carte entièrement cliquable par un lien étendu : viser un
                  intitulé de 15 px au doigt est le geste que rate le plus un
                  visiteur sur téléphone. */}
              <article className="group relative flex h-full flex-col rounded-2xl border border-ink-200 bg-surface p-6 transition-all duration-200 hover:border-brand-200 hover:shadow-soft focus-within:border-brand-300">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-brand-600 transition-colors duration-200 group-hover:bg-brand-600 group-hover:text-white">
                  <Icone className="h-5 w-5" strokeWidth={1.75} aria-hidden />
                </span>
                <h3 className="mt-5 text-[19px] font-semibold text-forest">{partie.titre}</h3>
                <p className="mt-2 text-[14px] leading-relaxed text-ink-600">{partie.texte}</p>
                <Link
                  to={partie.vers}
                  className="mt-auto inline-flex items-center gap-1.5 pt-6 text-[15px] font-semibold text-brand-700 transition-all duration-150 after:absolute after:inset-0 after:content-[''] group-hover:gap-2.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
                >
                  Découvrir
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

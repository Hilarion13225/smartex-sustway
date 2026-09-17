import { Link } from 'react-router-dom';
import { ArrowRight, BookOpen, Newspaper } from 'lucide-react';
import AppelAction from '../components/AppelAction';
import { SMARTEX } from '../config/smartex';

const classeTitreSection =
  'font-display text-[1.75rem] font-bold leading-tight text-ink-900 sm:text-[2rem]';

/**
 * Rubriques annoncées par la navigation.
 *
 * Deux d'entre elles n'ont pas encore de contenu. Elles sont nommées et
 * décrites plutôt que masquées : l'entrée « Ressources » du menu les promet,
 * et une page qui tient moins que le menu n'annonce est plus déroutante
 * qu'une rubrique qui dit franchement qu'elle arrive. Aucun article fictif
 * n'est affiché pour faire nombre.
 */
const DISPONIBLE = {
  titre: 'Formations',
  texte:
    'Des parcours pratiques, animés par les consultants ' +
    SMARTEX.editeur +
    ', avec des cas concrets tirés de votre secteur et une attestation à l’issue.',
  lien: { vers: '/formation', libelle: 'Voir les formations' },
};

const A_VENIR = [
  {
    icone: BookOpen,
    titre: 'Articles',
    texte:
      'Des repères pour comprendre les référentiels, les critères et ce que recouvre une démarche RSE et ESG.',
  },
  {
    icone: Newspaper,
    titre: 'Actualités',
    texte:
      'L’évolution des standards, des obligations et des attentes des partenaires techniques et financiers.',
  },
];

/**
 * Ce qu'un lecteur peut lire pour comprendre, apprendre et suivre l'actualité
 * de la démarche.
 *
 * La page réunit sous une même entrée ce qui était dispersé — les formations
 * avaient leur page, rien d'autre n'existait. `/formation` reste en place et
 * garde son contenu : cette page y mène au lieu de la remplacer.
 */
export default function Ressources() {
  return (
    <>
      <section className="border-b border-ink-200 bg-surface">
        <div className="mx-auto max-w-[90rem] px-5 py-16 sm:py-20">
          <h1 className="titre-page max-w-[20ch] text-ink-900">
            Comprendre, apprendre, suivre l’actualité.
          </h1>
          <p className="mt-5 max-w-2xl text-[17px] leading-relaxed text-ink-600">
            Tout ce qui aide à saisir la démarche RSE et ESG, et à s’y préparer.
          </p>
        </div>
      </section>

      <section className="border-b border-ink-200">
        <div className="mx-auto max-w-[90rem] px-5 py-16 sm:py-20">
          {/* Trois cartes de même taille auraient donné le même poids à une
              rubrique qui existe et à deux qui arrivent. La composition dit ce
              qui est vrai : les formations occupent la place, le reste
              s'annonce en dessous, à sa mesure. */}
          <div className="grid gap-12 lg:grid-cols-[1.4fr_1fr] lg:gap-16">
            <div>
              <h2 className={classeTitreSection}>{DISPONIBLE.titre}</h2>
              <p className="mt-4 max-w-[62ch] text-[17px] leading-relaxed text-ink-600">
                {DISPONIBLE.texte}
              </p>
              <Link
                to={DISPONIBLE.lien.vers}
                viewTransition
                className="lien-trait mt-7 inline-flex items-center gap-2 text-base font-semibold text-brand-700"
              >
                {DISPONIBLE.lien.libelle}
                <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
            </div>

            <div className="lg:pt-2">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-ink-500">
                Bientôt
              </h2>
              <dl className="mt-5 divide-y divide-ink-200 border-t border-ink-200">
                {A_VENIR.map((rubrique) => (
                  <div key={rubrique.titre} className="flex gap-4 py-5">
                    <rubrique.icone
                      className="mt-0.5 h-5 w-5 shrink-0 text-ink-400"
                      strokeWidth={1.6}
                      aria-hidden
                    />
                    <div className="min-w-0">
                      <dt className="font-display text-base font-bold text-ink-800">{rubrique.titre}</dt>
                      <dd className="mt-1 text-[15px] leading-relaxed text-ink-500">{rubrique.texte}</dd>
                    </div>
                  </div>
                ))}
              </dl>
            </div>
          </div>
        </div>
      </section>

      <AppelAction
        titre="Une question sur la démarche ?"
        texte="Nos consultants répondent et vous orientent vers la ressource utile."
      />
    </>
  );
}

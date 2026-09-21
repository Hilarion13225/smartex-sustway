import { Check } from 'lucide-react';
import clsx from 'clsx';
import Bouton from './Bouton';
import Badge from './Badge';
import { Apparition, Section, TitreSection } from './Section';

/*
 * « Offres » : trois niveaux de service, aucun prix.
 *
 * Aucun montant n'est affiché parce qu'aucun ne nous a été communiqué. Une
 * grille tarifaire inventée serait la seule chose de cette page qu'un
 * prospect pourrait nous opposer ; à la place, chaque carte mène à la page
 * qui permet d'aller plus loin — c'est ce que la charte demande explicitement.
 *
 * Les trois cartes gardent la même structure et la même hauteur. Seule
 * « Business » se détache, par sa bordure et son ombre plutôt que par un
 * changement d'échelle : une carte agrandie décalerait verticalement ses
 * voisines et rendrait les listes de fonctionnalités impossibles à comparer
 * ligne à ligne.
 */
const OFFRES = [
  {
    nom: 'Essential',
    promesse: 'Structurer',
    texte: 'Poser le cadre de la démarche et commencer à mesurer.',
    elements: ['Évaluation', 'Critères ESG', 'Données', 'Tableau de bord', 'Plans d’action'],
    action: { libelle: 'Découvrir', vers: '/formules' },
  },
  {
    nom: 'Business',
    promesse: 'Piloter',
    texte: 'Suivre plusieurs périmètres et consolider le reporting.',
    elements: ['Multi-périmètre', 'Campagnes', 'Risques ESG', 'Reporting', 'Historique'],
    action: { libelle: 'Découvrir', vers: '/formules' },
    misEnAvant: true,
  },
  {
    nom: 'Enterprise',
    promesse: 'Déployer, transformer',
    texte: 'Déployer la démarche à l’échelle d’un groupe multi-pays.',
    elements: ['Multi-entités', 'Multi-pays', 'Consolidation', 'API', 'Support dédié'],
    action: { libelle: 'Contacter', vers: '/contact' },
  },
];

export default function SectionOffres() {
  return (
    <Section id="offres" fond="sable">
      <TitreSection
        surTitre="Offres"
        titre="Une approche adaptée à chaque organisation"
        sousTitre="Trois niveaux de service, du cadrage d’une première démarche au déploiement multi-entités."
      />

      <div className="mt-14 grid items-stretch gap-5 lg:grid-cols-3">
        {OFFRES.map((offre, index) => (
          <Apparition key={offre.nom} delai={index * 110} className="h-full">
            <article
              className={clsx(
                'flex h-full flex-col rounded-2xl bg-surface p-7 transition-shadow duration-200',
                offre.misEnAvant
                  ? 'border-2 border-brand-600 shadow-soft'
                  : 'border border-ink-200 hover:shadow-soft'
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-[22px] font-semibold text-forest">{offre.nom}</h3>
                  <p className="mt-1 text-[13px] font-semibold uppercase tracking-[0.1em] text-brand-600">
                    {offre.promesse}
                  </p>
                </div>
                {offre.misEnAvant ? <Badge ton="succes">Le plus choisi</Badge> : null}
              </div>

              <p className="mt-4 text-[15px] leading-relaxed text-ink-600">{offre.texte}</p>

              <ul className="mt-6 space-y-3 border-t border-ink-100 pt-6">
                {offre.elements.map((element) => (
                  <li key={element} className="flex items-start gap-3 text-[15px] text-ink-700">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" strokeWidth={2.5} aria-hidden />
                    {element}
                  </li>
                ))}
              </ul>

              {/* `mt-auto` aligne les trois boutons sur une même ligne, quelle
                  que soit la longueur de la liste au-dessus. */}
              <div className="mt-auto pt-8">
                <Bouton
                  vers={offre.action.vers}
                  niveau={offre.misEnAvant ? 'principal' : 'secondaire'}
                  className="w-full"
                >
                  {offre.action.libelle}
                </Bouton>
              </div>
            </article>
          </Apparition>
        ))}
      </div>
    </Section>
  );
}

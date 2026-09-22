import { ArrowRight, BarChart3, Building2, Check, ClipboardCheck, Gauge, Layers, Network, ShieldCheck, Target } from 'lucide-react';
import { Link } from 'react-router-dom';
import clsx from 'clsx';
import { Apparition, Section } from './Section';

/*
 * Corps de la page « Offres » : trois niveaux de service.
 *
 * Aucun montant n'est affiché parce qu'aucun ne nous a été communiqué. La
 * ligne de prix est tout de même présente, et porte « À définir » : la retirer
 * laisserait croire que ces offres n'en ont pas, alors qu'elles en auront. Les
 * conditions détaillées vivent sur la page « Formules », vers laquelle le bas
 * de page renvoie — les dupliquer ici garantirait qu'un des deux endroits
 * finisse par mentir.
 *
 * Les trois cartes gardent la même structure et la même hauteur. Seule
 * « Business » se détache, par un bandeau, une bordure et une ombre, jamais
 * par un changement d'échelle : une carte agrandie décalerait ses voisines et
 * rendrait les listes impossibles à comparer ligne à ligne.
 *
 * Chaque offre a sa teinte, prise sur trois crans de l'échelle de marque. Le
 * modèle dont cette page s'inspire emploie trois couleurs sans rapport entre
 * elles ; ici, trois nuances d'une même famille suffisent à distinguer les
 * niveaux sans donner à croire qu'il s'agit de trois produits.
 */
const OFFRES = [
  {
    ancre: 'essential',
    nom: 'Essential',
    promesse: 'Structurer',
    texte:
      'Pour les organisations souhaitant poser les bases de leur démarche RSE et structurer leurs premiers indicateurs.',
    elements: [
      'Un périmètre d’évaluation',
      'Référentiels et critères ESG de base',
      'Collecte centralisée des données',
      'Tableaux de bord essentiels',
      'Plans d’action et suivi simple',
    ],
    prix: 'À définir',
    action: { libelle: 'Commencer', vers: '/inscription' },
    icone: Layers,
    teinte: {
      pastille: 'bg-brand-100 text-brand-700',
      coche: 'text-brand-500',
      bouton: 'bg-brand-500 text-white hover:bg-brand-600',
    },
  },
  {
    ancre: 'business',
    nom: 'Business',
    promesse: 'Piloter',
    texte:
      'Pour les entreprises souhaitant étendre leur démarche à l’ensemble de leurs activités et consolider leur pilotage.',
    elements: [
      'Plusieurs périmètres et entités',
      'Campagnes d’évaluation régulières',
      'Gestion avancée des risques ESG',
      'Reporting extra-financier consolidé',
      'Historique et suivi d’amélioration continue',
    ],
    prix: 'À définir',
    action: { libelle: 'Commencer', vers: '/inscription' },
    icone: Network,
    misEnAvant: true,
    teinte: {
      pastille: 'bg-brand-200 text-brand-800',
      coche: 'text-brand-700',
      bouton: 'bg-forest text-white hover:bg-brand-800',
    },
  },
  {
    ancre: 'enterprise',
    nom: 'Enterprise',
    promesse: 'Déployer à grande échelle',
    texte:
      'Pour les grands groupes et organisations complexes ayant des besoins de personnalisation et de reporting multi-filiales.',
    elements: [
      'Multi-entités et multi-pays',
      'Consolidation groupe automatisée',
      'Intégrations et API sur mesure',
      'Accompagnement et support dédiés',
    ],
    prix: 'Sur devis',
    surDevis: true,
    action: { libelle: 'Nous contacter', vers: '/contact' },
    icone: Building2,
    teinte: {
      pastille: 'bg-ink-100 text-ink-800',
      coche: 'text-brand-600',
      bouton: 'border border-brand-600 bg-transparent text-brand-700 hover:bg-brand-50',
    },
  },
];

/*
 * Ce que les trois offres partagent.
 *
 * La bande existe pour une raison précise : trois listes côte à côte se lisent
 * comme trois produits différents, alors qu'il s'agit d'un seul, déployé à
 * trois échelles. Les six capacités ci-dessous sont celles de la page
 * « Fonctionnalités », et elles valent quelle que soit l'offre.
 */
const SOCLE = [
  { titre: 'Référentiels', texte: 'Critères RSE et ESG, socle unifié.', icone: ShieldCheck },
  { titre: 'Évaluations', texte: 'Campagnes, périmètres et questionnaires.', icone: ClipboardCheck },
  { titre: 'Preuves', texte: 'Collecte, centralisation et traçabilité.', icone: Layers },
  { titre: 'Analyse', texte: 'Scoring, écarts et niveaux de maturité.', icone: BarChart3 },
  { titre: 'Actions', texte: 'Objectifs, responsables et échéances.', icone: Target },
  { titre: 'Pilotage', texte: 'Tableaux de bord et reporting.', icone: Gauge },
];

export default function SectionOffres() {
  return (
    <>
      {/* Les trois offres et le socle portent une ancre : le pied de page
          les designe une a une, et un lien partage peut viser une offre
          precise plutot que le haut de la page. */}
      <Section id="les-offres" fond="mist">
        {/* `items-stretch` : les trois cartes prennent la hauteur de la plus
            haute, et leurs boutons s'alignent. Sans cela, une liste plus
            courte remontait son bouton au milieu de la carte voisine. */}
        <div className="grid items-stretch gap-6 lg:grid-cols-3">
          {OFFRES.map((offre, index) => {
            const Icone = offre.icone;
            return (
              <Apparition key={offre.nom} delai={index * 110} className="h-full">
                <article
                  id={offre.ancre}
                  className={clsx(
                    'flex h-full flex-col overflow-hidden rounded-2xl bg-surface scroll-mt-24',
                    offre.misEnAvant
                      ? 'border-2 border-forest shadow-soft'
                      : 'border border-ink-200'
                  )}
                >
                  {/* Le bandeau n'existe que sur l'offre mise en avant, et il
                      occupe la place que les deux autres laissent vide en
                      haut : les trois cartes restent alignées. */}
                  {offre.misEnAvant ? (
                    <p className="bg-forest py-2 text-center text-[12px] font-semibold uppercase tracking-[0.12em] text-white">
                      Le plus choisi
                    </p>
                  ) : (
                    <p aria-hidden className="py-2 text-center text-[12px]">
                      &nbsp;
                    </p>
                  )}

                  <div className="flex flex-1 flex-col p-6 sm:p-7">
                    <div className="flex items-center gap-4">
                      <span
                        className={clsx(
                          'flex h-12 w-12 shrink-0 items-center justify-center rounded-xl',
                          offre.teinte.pastille
                        )}
                      >
                        <Icone className="h-[22px] w-[22px]" strokeWidth={1.75} aria-hidden />
                      </span>
                      <div className="min-w-0">
                        <h2 className="text-[22px] font-semibold leading-tight text-forest">{offre.nom}</h2>
                        <p className="mt-0.5 text-[12px] font-semibold uppercase tracking-[0.1em] text-ink-500">
                          {offre.promesse}
                        </p>
                      </div>
                    </div>

                    <p className="mt-5 text-[15px] leading-relaxed text-ink-600">{offre.texte}</p>

                    {/* Rappel du socle, dans chaque carte : c'est là qu'on
                        compare, et c'est donc là qu'il faut dire que la liste
                        qui suit s'ajoute à un fonds commun. */}
                    <p className="mt-5 flex items-start gap-2.5 rounded-xl bg-ink-50 px-4 py-3 text-[13px] leading-snug text-ink-700">
                      <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" strokeWidth={1.75} aria-hidden />
                      <span>
                        <strong className="font-semibold">Socle SustWay complet</strong> inclus dans toutes les offres.
                      </span>
                    </p>

                    <ul className="mt-6 space-y-3">
                      {offre.elements.map((element) => (
                        <li key={element} className="flex items-start gap-3 text-[15px] text-ink-700">
                          <Check className={clsx('mt-0.5 h-4 w-4 shrink-0', offre.teinte.coche)} strokeWidth={2.5} aria-hidden />
                          {element}
                        </li>
                      ))}
                    </ul>

                    {/* `mt-auto` aligne prix et boutons sur une même ligne,
                        quelle que soit la longueur de la liste au-dessus. */}
                    <div className="mt-auto pt-8">
                      {offre.surDevis ? (
                        <p className="text-[22px] font-semibold text-forest">{offre.prix}</p>
                      ) : (
                        <>
                          <p className="text-[13px] text-ink-500">À partir de</p>
                          <p className="mt-0.5 flex items-baseline gap-1.5">
                            <span className="text-[22px] font-semibold text-forest">{offre.prix}</span>
                            <span className="text-[13px] text-ink-500">/ mois</span>
                          </p>
                        </>
                      )}

                      <Link
                        to={offre.action.vers}
                        className={clsx(
                          'group mt-5 flex min-h-12 w-full items-center justify-center gap-2 rounded-lg text-[15px] font-semibold transition-colors',
                          offre.teinte.bouton
                        )}
                      >
                        {offre.action.libelle}
                        <ArrowRight
                          className="h-4 w-4 transition-transform duration-200 motion-safe:group-hover:translate-x-1"
                          strokeWidth={2}
                          aria-hidden
                        />
                      </Link>
                    </div>
                  </div>
                </article>
              </Apparition>
            );
          })}
        </div>

        {/* Le renvoi vers la page « Formules » est retiré : cette page a été
            supprimée, et les conditions de chaque offre se lisent désormais
            ici même. Un contact reste le chemin pour les détailler. */}
        <Apparition className="mt-8">
          <p className="text-[15px] text-ink-600">
            Les montants et les conditions de chaque offre se précisent avec vous.{' '}
            <Link
              to="/contact"
              className="font-semibold text-brand-700 underline decoration-brand-200 underline-offset-4 transition-colors hover:text-brand-800 hover:decoration-brand-600"
            >
              Parlons de votre projet
            </Link>
            .
          </p>
        </Apparition>
      </Section>

      {/* --- Le socle commun, en pleine largeur --- */}
      <Section id="socle" fond="blanc">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,2.1fr)] lg:gap-14">
          <Apparition>
            <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-brand-600">
              Le même socle fonctionnel
            </p>
            <h2 className="mt-4 text-[26px] font-semibold leading-tight tracking-[-0.02em] text-forest sm:text-[30px]">
              SMARTEX SustWay, quelle que soit votre offre.
            </h2>
            <p className="mt-4 text-[15px] leading-relaxed text-ink-600">
              Trois listes côte à côte se lisent comme trois produits. Il n’y en a qu’un : ce sont l’étendue du
              déploiement et le niveau d’accompagnement qui changent.
            </p>
          </Apparition>

          <ul className="grid grid-cols-2 gap-x-6 gap-y-8 sm:grid-cols-3">
            {SOCLE.map((capacite, index) => {
              const Icone = capacite.icone;
              return (
                <Apparition
                  key={capacite.titre}
                  balise="li"
                  delai={index * 70}
                  className="border-l border-ink-200 pl-4"
                >
                    <Icone className="h-5 w-5 text-brand-600" strokeWidth={1.75} aria-hidden />
                    <p className="mt-3 text-[15px] font-semibold text-forest">{capacite.titre}</p>
                    <p className="mt-1 text-[13px] leading-snug text-ink-500">{capacite.texte}</p>
                </Apparition>
              );
            })}
          </ul>
        </div>
      </Section>
    </>
  );
}

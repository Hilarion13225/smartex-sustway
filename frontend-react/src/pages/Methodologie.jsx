import { BookOpen, CheckCircle2, Compass, Layers, Megaphone, Quote, RefreshCw, Rocket } from 'lucide-react';
import EnTeteVitrine from '../components/EnTeteVitrine';
import TitreSection from '../components/TitreSection';
import Revele from '../components/Revele';
import AppelAction from '../components/AppelAction';
import { FONDEMENTS, SMARTEX } from '../config/smartex';
import photoBanniere from '../assets/methodologie/banniere-hd.jpg';
import schemaPdca from '../assets/methodologie/pdca.png';

/**
 * Démarche en 5 étapes, adaptée de la roue de Deming (PDCA) — le déroulé
 * qu'appliquait Smartex Expertises en mission d'audit classique, désormais
 * accéléré par le pipeline d'agents IA sur les étapes Plan/Do/Check.
 */
const ETAPES_METHODE = [
  {
    icone: Compass,
    phase: 'Plan',
    titre: 'Cadrer et diagnostiquer',
    texte: 'Le questionnaire s’adapte au secteur et au périmètre déclarés : l’IA identifie les critères RSE significatifs pour l’entreprise.',
  },
  {
    icone: Rocket,
    phase: 'Do',
    titre: 'Déployer l’évaluation',
    texte: 'Les preuves déposées sont analysées par le pipeline d’agents IA, qui produit une probabilité de conformité par critère.',
  },
  {
    icone: CheckCircle2,
    phase: 'Check',
    titre: 'Vérifier et mesurer',
    texte: 'Score pondéré, écarts et non-conformités sont mesurés automatiquement ; l’indice de confiance signale ce qu’il reste à challenger.',
  },
  {
    icone: RefreshCw,
    phase: 'Act',
    titre: 'Agir et corriger',
    texte: 'Plan d’actions correctives priorisé par le risque attendu, pour intégrer les améliorations dans le système de management.',
  },
  {
    icone: Megaphone,
    phase: 'Communication RSE',
    titre: 'Valoriser l’engagement',
    texte: 'Rapport exportable pour communiquer les résultats et l’engagement RSE de l’entreprise auprès de ses parties prenantes.',
  },
];

export default function Methodologie() {
  return (
    <div>
      <EnTeteVitrine
        etiquette="Notre méthodologie"
        icone={BookOpen}
        titre="Une méthodologie exigeante, appuyée sur la recherche et la pratique"
        description={`${SMARTEX.mission} La démarche se fonde sur quatre principes, quel que soit le référentiel évalué.`}
        image={photoBanniere}
        reperes={[
          { valeur: '5', libelle: 'étapes de mission' },
          { valeur: '4', libelle: 'principes fondateurs' },
          { valeur: 'PDCA', libelle: 'roue de Deming' },
        ]}
      />

      <section className="mx-auto grid max-w-[90rem] items-center gap-14 px-5 py-24 lg:grid-cols-[1.05fr_0.95fr]">
        <Revele>
          <Quote className="h-10 w-10 text-brand-200 dark:text-brand-500/50" aria-hidden />
          <blockquote className="titre-editorial mt-4 text-2xl font-normal italic leading-snug text-ink-800 sm:text-[2rem]">
            « Cette démarche RSE dans laquelle l’entreprise s’engage avec {SMARTEX.produit} devrait globalement répondre à
            l’objectif de maximisation de son profit, tout en intégrant dans ses décisions stratégiques de croissance, les
            principes du développement durable et la maîtrise des impacts sociaux et environnementaux. »
          </blockquote>
          <p className="mt-6 flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.22em] text-ink-500">
            <span className="filet" aria-hidden />
            {SMARTEX.editeur}
          </p>
        </Revele>

        <Revele delai={120} className="min-w-0">
          <figure className="relative overflow-hidden rounded-[2rem] border border-ink-100 bg-gradient-to-br from-ink-50 to-surface p-6 shadow-soft sm:p-10">
            <span className="pointer-events-none absolute inset-0 bg-halo-brand" aria-hidden />
            <span
              className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-brand-200/30 blur-3xl motion-safe:animate-respiration dark:bg-brand-500/20"
              aria-hidden
            />
            <img
              src={schemaPdca}
              alt="Roue de Deming (PDCA) : Planifier, Agir, Vérifier, Réagir, amélioration continue"
              className="relative mx-auto w-full max-w-xs motion-safe:animate-flottement"
            />
            <figcaption className="relative mt-8 text-center text-xs uppercase tracking-[0.22em] text-ink-500">
              Amélioration continue — roue de Deming
            </figcaption>
          </figure>
        </Revele>
      </section>

      <section className="border-y border-ink-100 bg-ink-50 py-24">
        <div className="mx-auto max-w-[90rem] px-5">
          <TitreSection
            etiquette="Le déroulé d’une mission"
            icone={Compass}
            titre="Une démarche en cinq étapes, accélérée par l’intelligence artificielle"
            description={`L’adaptation de la roue de Deming que ${SMARTEX.editeur} appliquait en mission d’audit classique reste le fil conducteur — le pipeline d’agents IA prend en charge le cadrage, l’analyse des preuves et la mesure du score.`}
          />

          <ol className="mt-14 grid gap-5 lg:grid-cols-5">
            {ETAPES_METHODE.map((etape, index) => (
              <Revele key={etape.phase} delai={index * 100} as="li">
                <article className="carte-vitrine group h-full !p-7">
                  <div className="flex items-baseline justify-between">
                    <span className="titre-editorial text-4xl leading-none text-brand-200 transition-colors duration-300 group-hover:text-brand-500 dark:text-brand-500/40 dark:group-hover:text-brand-400">
                      {String(index + 1).padStart(2, '0')}
                    </span>
                    <span className="puce-icone">
                      <etape.icone className="h-5 w-5" aria-hidden />
                    </span>
                  </div>
                  <p className="mt-6 text-[0.7rem] font-semibold uppercase tracking-[0.22em] text-brand-600 dark:text-brand-400">
                    {etape.phase}
                  </p>
                  <h3 className="titre-editorial mt-2 text-lg text-ink-900">{etape.titre}</h3>
                  <p className="mt-3 text-sm font-light leading-relaxed text-ink-500">{etape.texte}</p>
                </article>
              </Revele>
            ))}
          </ol>
        </div>
      </section>

      <section className="mx-auto max-w-[90rem] px-5 py-24">
        <TitreSection
          etiquette="Nos fondements"
          icone={Layers}
          titre="Quatre principes, quel que soit le référentiel évalué"
        />

        <div className="mt-14 grid gap-x-14 gap-y-10 sm:grid-cols-2">
          {FONDEMENTS.map((fondement, index) => (
            <Revele key={fondement.titre} delai={index * 110}>
              <article className="group flex gap-6 border-t border-ink-100 pt-7 transition-colors duration-300 hover:border-brand-300">
                <span className="titre-editorial shrink-0 text-2xl leading-none text-brand-500 dark:text-brand-400">
                  {String(index + 1).padStart(2, '0')}
                </span>
                <div>
                  <h3 className="titre-editorial text-xl text-ink-900">{fondement.titre}</h3>
                  <p className="mt-3 text-sm font-light leading-relaxed text-ink-500">{fondement.texte}</p>
                </div>
              </article>
            </Revele>
          ))}
        </div>
      </section>

      <AppelAction
        titre="Une question sur notre méthodologie ?"
        texte="Décrivez votre contexte : nous revenons vers vous avec le référentiel et le niveau de formule adaptés."
      />
    </div>
  );
}

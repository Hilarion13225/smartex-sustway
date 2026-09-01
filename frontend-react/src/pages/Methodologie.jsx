import { Award, BookOpen, CheckCircle2, Compass, Megaphone, RefreshCw, Rocket, ScrollText } from 'lucide-react';
import EnTeteVitrine from '../components/EnTeteVitrine';
import Revele from '../components/Revele';
import AppelAction from '../components/AppelAction';
import { Badge } from '../components/ui';
import { FONDEMENTS, REFERENCES_METHODOLOGIQUES, REFERENTIELS_EVALUABLES, SMARTEX } from '../config/smartex';
import photoBanniere from '../assets/methodologie/banniere.jpg';
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
      />

      <section className="mx-auto grid max-w-[90rem] items-center gap-12 px-5 py-20 lg:grid-cols-[1.1fr_0.9fr]">
        <Revele>
          <blockquote className="border-l-4 border-brand-500 pl-5 text-base italic leading-relaxed text-ink-700">
            « Cette démarche RSE dans laquelle l’entreprise s’engage avec {SMARTEX.produit} devrait globalement répondre à
            l’objectif de maximisation de son profit, tout en intégrant dans ses décisions stratégiques de croissance, les
            principes du développement durable et la maîtrise des impacts sociaux et environnementaux. »
          </blockquote>
        </Revele>
        <Revele delai={120}>
          <div className="relative flex items-center justify-center rounded-3xl border border-ink-100 bg-ink-50 p-8 shadow-soft">
            <span className="pointer-events-none absolute inset-0 rounded-3xl bg-halo-brand" aria-hidden />
            <img src={schemaPdca} alt="Roue de Deming (PDCA) : Planifier, Agir, Vérifier, Réagir, amélioration continue" className="relative max-w-xs" />
          </div>
        </Revele>
      </section>

      <section className="mx-auto max-w-[90rem] px-5 py-20">
        <Revele className="max-w-2xl">
          <h2 className="text-lg font-semibold text-ink-900">Une démarche en 5 étapes, accélérée par l’IA</h2>
          <p className="mt-2 text-sm leading-relaxed text-ink-500">
            L’adaptation de la roue de Deming (PDCA) que {SMARTEX.editeur} appliquait en mission d’audit classique reste le fil
            conducteur — le pipeline d’agents IA prend en charge le cadrage, l’analyse des preuves et la mesure du score.
          </p>
        </Revele>

        <div className="relative mt-10">
          <span className="absolute left-6 top-0 hidden h-full w-px bg-gradient-to-b from-brand-200 via-brand-200 to-transparent lg:block" aria-hidden />
          <div className="grid gap-6 lg:grid-cols-5">
            {ETAPES_METHODE.map((etape, index) => (
              <Revele key={etape.phase} delai={index * 100}>
                <article className="carte-vitrine group h-full">
                  <span className="puce-icone">
                    <etape.icone className="h-5 w-5" aria-hidden />
                  </span>
                  <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-brand-600 dark:text-brand-400">{etape.phase}</p>
                  <h3 className="mt-1 text-base font-semibold text-ink-900">{etape.titre}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-ink-500">{etape.texte}</p>
                </article>
              </Revele>
            ))}
          </div>
        </div>
      </section>

      <section className="border-y border-ink-100 bg-ink-50 py-20">
        <div className="mx-auto max-w-[90rem] px-5">
          <Revele className="max-w-2xl">
            <h2 className="text-lg font-semibold text-ink-900">Quatre principes, quel que soit le référentiel évalué</h2>
          </Revele>

          <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {FONDEMENTS.map((fondement, index) => (
              <Revele key={fondement.titre} delai={index * 110}>
                <article className="carte-vitrine group h-full">
                  <span className="puce-icone">
                    <ScrollText className="h-5 w-5" aria-hidden />
                  </span>
                  <h3 className="mt-4 text-base font-semibold text-ink-900">{fondement.titre}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-ink-500">{fondement.texte}</p>
                </article>
              </Revele>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[90rem] px-5 py-20">
        <div className="grid gap-10 lg:grid-cols-2">
          <Revele>
            <Badge ton="bleu" icone={Award}>
              Référentiels évaluables
            </Badge>
            <h3 className="mt-3 text-lg font-semibold text-ink-900">Ceux que la plateforme évalue réellement</h3>
            <ul className="mt-4 space-y-3">
              {REFERENTIELS_EVALUABLES.map((referentiel) => (
                <li key={referentiel.code} className="rounded-xl border border-ink-100 bg-surface p-4 text-sm shadow-soft">
                  <p className="font-semibold text-ink-900">{referentiel.nom}</p>
                  <p className="mt-1 text-ink-500">{referentiel.texte}</p>
                </li>
              ))}
            </ul>
          </Revele>

          <Revele delai={120}>
            <Badge ton="neutre" icone={Compass}>
              Repères méthodologiques
            </Badge>
            <h3 className="mt-3 text-lg font-semibold text-ink-900">Ceux qui inspirent notre approche</h3>
            <p className="mt-3 text-sm leading-relaxed text-ink-500">
              Sans être des référentiels évaluables dans l’outil, ces normes reconnues nourrissent la conception de notre
              méthodologie.
            </p>
            <ul className="mt-4 space-y-3">
              {REFERENCES_METHODOLOGIQUES.map((reference) => (
                <li key={reference.code} className="rounded-xl border border-ink-100 bg-surface p-4 text-sm shadow-soft">
                  <p className="font-semibold text-ink-900">{reference.nom}</p>
                  <p className="mt-1 text-ink-500">{reference.texte}</p>
                </li>
              ))}
            </ul>
          </Revele>
        </div>
      </section>

      <AppelAction
        titre="Une question sur notre méthodologie ?"
        texte="Décrivez votre contexte : nous revenons vers vous avec le référentiel et le niveau de formule adaptés."
      />
    </div>
  );
}

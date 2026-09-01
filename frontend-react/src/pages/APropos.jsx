import { Award, BookOpen, Building2, Compass, HeartHandshake, Lightbulb, ScrollText, Sparkles, Target, Users } from 'lucide-react';
import EnTeteVitrine from '../components/EnTeteVitrine';
import Revele from '../components/Revele';
import AppelAction from '../components/AppelAction';
import { Badge } from '../components/ui';
import { FONDEMENTS, REFERENCES_METHODOLOGIQUES, REFERENTIELS_EVALUABLES, SMARTEX } from '../config/smartex';
import Logo from '../components/Logo';

const VALEURS = [
  {
    icone: ScrollText,
    titre: 'Rigueur méthodologique',
    texte: 'Un référentiel structuré, des critères pondérés et une traçabilité complète entre la preuve et la note obtenue.',
  },
  {
    icone: Lightbulb,
    titre: 'Innovation utile',
    texte: 'L’intelligence artificielle sert à réduire le travail répétitif d’analyse, jamais à remplacer le jugement d’expert.',
  },
  {
    icone: HeartHandshake,
    titre: 'Proximité client',
    texte: 'Un accompagnement de bout en bout : cadrage, collecte, revue des résultats et préparation des dossiers.',
  },
  {
    icone: Compass,
    titre: 'Transparence',
    texte: 'Les indices produits sont des mesures d’alignement explicables, présentées avec leurs limites d’interprétation.',
  },
];

const ENGAGEMENTS = [
  'Confidentialité des documents déposés et isolation stricte des données par entreprise.',
  'Explicabilité de chaque note : critère, preuve associée, probabilité et niveau de confiance.',
  'Revue humaine des évaluations incertaines avant publication du rapport.',
  'Amélioration continue du référentiel au fil des évolutions réglementaires.',
];

export default function APropos() {
  return (
    <div>
      <EnTeteVitrine
        etiquette={`Éditeur de ${SMARTEX.produit}`}
        icone={Building2}
        titre={`${SMARTEX.editeur}, l’expertise durable outillée par la technologie`}
        description={SMARTEX.baseline}
      />

      <section className="mx-auto grid max-w-[90rem] items-center gap-12 px-5 py-20 lg:grid-cols-[1.1fr_0.9fr]">
        <Revele>
          <Badge ton="bleu" icone={Sparkles}>
            Qui sommes-nous
          </Badge>
          <h2 className="mt-4 text-3xl font-semibold text-ink-900">Une conviction : ce qui se mesure s’améliore</h2>
          <div className="mt-5 space-y-4 text-sm leading-relaxed text-ink-600">
            <p>
              {SMARTEX.editeur} accompagne les organisations qui veulent transformer leurs engagements de responsabilité
              sociétale en résultats mesurables. Nos travaux d’audit et de conseil nous ont montré une même difficulté :
              la collecte des preuves et leur analyse consomment l’essentiel du temps, au détriment du plan d’action.
            </p>
            <p>
              {SMARTEX.produit} est né de ce constat. La plateforme industrialise notre référentiel d’évaluation : le
              questionnaire s’adapte au périmètre réel de l’entreprise, les preuves sont analysées par un pipeline
              d’agents spécialisés, et les écarts sont hiérarchisés par le risque qu’ils représentent.
            </p>
            <p>
              L’outil ne remplace pas l’expert : il lui rend le temps nécessaire pour arbitrer, challenger et
              accompagner. Le rapport final reste un document d’expertise, pas une sortie de machine.
            </p>
          </div>
        </Revele>

        <Revele delai={140}>
          <div className="relative flex items-center justify-center rounded-3xl border border-ink-100 bg-ink-50 p-12 shadow-soft">
            <span className="pointer-events-none absolute inset-0 rounded-3xl bg-halo-brand" aria-hidden />
            <Logo taille="lg" className="relative motion-safe:animate-flottement" />
          </div>
        </Revele>
      </section>

      <section className="border-y border-ink-100 bg-ink-50 py-20">
        <div className="mx-auto max-w-[90rem] px-5">
          <Revele className="max-w-2xl">
            <Badge ton="violet" icone={Target}>
              Nos valeurs
            </Badge>
            <h2 className="mt-4 text-3xl font-semibold text-ink-900">Ce qui guide nos missions</h2>
          </Revele>

          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {VALEURS.map((valeur, index) => (
              <Revele key={valeur.titre} delai={index * 110}>
                <article className="carte-vitrine group h-full">
                  <span className="puce-icone">
                    <valeur.icone className="h-5 w-5" aria-hidden />
                  </span>
                  <h3 className="mt-4 text-base font-semibold text-ink-900">{valeur.titre}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-ink-500">{valeur.texte}</p>
                </article>
              </Revele>
            ))}
          </div>
        </div>
      </section>

      <section id="methodologie" className="mx-auto max-w-[90rem] scroll-mt-20 px-5 py-20">
        <Revele className="max-w-2xl">
          <Badge ton="ambre" icone={BookOpen}>
            Notre méthodologie
          </Badge>
          <h2 className="mt-4 text-3xl font-semibold text-ink-900">Une méthodologie exigeante, appuyée sur la recherche et la pratique</h2>
          <p className="mt-3 text-sm leading-relaxed text-ink-600">
            {SMARTEX.mission} La démarche se fonde sur quatre principes, quel que soit le référentiel évalué.
          </p>
        </Revele>

        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
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

        <div className="mt-14 grid gap-10 lg:grid-cols-2">
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

      <section className="border-t border-ink-100 bg-ink-50 py-20">
        <div className="mx-auto max-w-[90rem] px-5 grid gap-10 lg:grid-cols-[0.9fr_1.1fr]">
          <Revele>
            <Badge ton="vert" icone={Users}>
              Nos engagements
            </Badge>
            <h2 className="mt-4 text-3xl font-semibold text-ink-900">Ce que nous garantissons à nos clients</h2>
            <p className="mt-4 text-sm leading-relaxed text-ink-600">
              Ces engagements s’appliquent à toutes les missions conduites avec {SMARTEX.produit}, quelle que soit la
              formule souscrite.
            </p>
          </Revele>

          <ul className="space-y-4">
            {ENGAGEMENTS.map((engagement, index) => (
              <Revele key={engagement} delai={index * 100}>
                <li className="flex items-start gap-3 rounded-2xl border border-ink-100 bg-surface p-5 shadow-soft transition duration-300 hover:border-brand-200 motion-safe:hover:-translate-y-0.5">
                  <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-50 text-xs font-semibold text-brand-700 ring-1 ring-brand-100 dark:bg-brand-500/15 dark:text-brand-400 dark:ring-brand-500/30">
                    {index + 1}
                  </span>
                  <p className="text-sm leading-relaxed text-ink-600">{engagement}</p>
                </li>
              </Revele>
            ))}
          </ul>
        </div>
      </section>

      <AppelAction
        titre="Travaillons ensemble sur votre trajectoire durable"
        texte="Présentez-nous votre contexte : nous revenons vers vous avec une proposition de cadrage et le niveau de formule adapté."
      />
    </div>
  );
}

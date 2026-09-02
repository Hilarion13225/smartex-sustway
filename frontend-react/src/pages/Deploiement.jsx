import { useState } from 'react';
import { Plus, Route } from 'lucide-react';
import clsx from 'clsx';
import EnTeteVitrine from '../components/EnTeteVitrine';
import TitreSection from '../components/TitreSection';
import Revele from '../components/Revele';
import AppelAction from '../components/AppelAction';
import { SMARTEX } from '../config/smartex';
import photoBanniere from '../assets/methodologie/deploiement-banniere.jpg';

/**
 * Déroulé d'une mission, adapté de la roue de Deming (PDCA) — texte repris
 * de la page de référence. Pas de durées chiffrées : celles de la démarche
 * consultant classique (semaines) ne s'appliquent plus telles quelles avec
 * l'IA, qui traite les phases Do/Check en quelques instants plutôt qu'en
 * semaines ; Plan, Act et Communication restent des étapes humaines.
 */
const ETAPES = [
  {
    phase: 'Plan',
    titre: 'Planifier',
    resume: 'Cadrage de la mission et diagnostic des enjeux RSE sectoriels significatifs.',
    paragraphes: [
      'Identifier les orientations stratégiques sectorielles de RSE de l’entreprise et planifier un programme d’action (ou concevoir un plan).',
      'Lancement, cadrage de la mission, et diagnostic des enjeux RSE significatifs sectoriels avec la grille d’analyse des bonnes pratiques fondamentales de RSE.',
    ],
  },
  {
    phase: 'Do',
    titre: 'Déployer, réaliser',
    resume: 'Mise en œuvre du plan d’action et analyse des preuves dès leur dépôt.',
    paragraphes: [
      'Mettre en œuvre le plan d’action issu des axes stratégiques identifiés ; déploiement de la stratégie et exécution des tâches prévues.',
      'Sur la plateforme, le questionnaire s’adapte au périmètre déclaré et les preuves déposées sont analysées par le pipeline d’agents IA dès leur dépôt, sans délai d’attente pour un consultant.',
    ],
  },
  {
    phase: 'Check',
    titre: 'Suivre, évaluer, vérifier',
    resume: 'Mesure des performances, recherche des non-conformités et analyse des écarts.',
    paragraphes: [
      'Recueillir des données et évaluer les résultats : mesurer et surveiller les performances, comparer avec les prévisions, évaluer la conformité et rechercher les non-conformités.',
      'Analyser les écarts et rechercher les causes ; actions correctives et préventives dans une logique d’amélioration continue — le point clé de la démarche. Sur la plateforme, le score pondéré et l’indice de confiance sont calculés automatiquement par l’IA, dès que les preuves sont analysées.',
    ],
  },
  {
    phase: 'Act',
    titre: 'Agir, améliorer, standardiser',
    resume: 'Revue de direction et intégration des améliorations au système de management.',
    paragraphes: [
      'Prendre des mesures correctives et standardiser l’ensemble du processus dans une logique d’amélioration continue.',
      'La revue de direction est un maillon important du processus d’amélioration continue de Deming : réalisée régulièrement et portée par une direction impliquée, elle détermine les actions à mener pour poursuivre, adapter ou réorienter la stratégie RSE, et permet d’intégrer les améliorations au système de management.',
      'En « bouclant la boucle », la revue de direction participe à l’engagement et à l’implication de la direction dans la stratégie RSE.',
    ],
  },
  {
    phase: 'Communication RSE',
    titre: 'Valoriser auprès des parties prenantes',
    resume: 'Capitaliser et communiquer l’engagement RSE de l’entreprise.',
    paragraphes: ['Communiquer, capitaliser et valoriser l’engagement RSE de l’entreprise auprès de ses parties prenantes.'],
  },
];

export default function Deploiement() {
  const [ouvert, setOuvert] = useState(0);

  return (
    <div>
      <EnTeteVitrine
        etiquette="Déploiement de la solution"
        icone={Route}
        titre="Démarche de RSE et de développement durable"
        description="Une adaptation en cinq étapes de la roue de Deming (PDCA), pour sortir de la stagnation et installer une amélioration continue."
        image={photoBanniere}
        reperes={[
          { valeur: '5', libelle: 'étapes de déploiement' },
          { valeur: 'PDCA', libelle: 'cycle de référence' },
          { valeur: 'Continu', libelle: 'rythme d’amélioration' },
        ]}
      />

      <section className="mx-auto max-w-[90rem] px-5 py-24">
        <TitreSection
          etiquette="Le déroulé pas à pas"
          icone={Route}
          titre="De la planification à la valorisation de votre engagement"
          description={`Avec ${SMARTEX.produit}, les phases Do et Check ne se comptent plus en semaines : le pipeline d’agents IA analyse les preuves et calcule le score dès leur dépôt. Le cadrage stratégique, la revue de direction et la communication RSE restent portés par vos équipes et ${SMARTEX.editeur}.`}
        />

        <div className="mt-14 space-y-4">
          {ETAPES.map((etape, index) => {
            const estOuvert = ouvert === index;
            return (
              <Revele key={etape.phase} delai={index * 80}>
                <div
                  className={clsx(
                    'overflow-hidden rounded-2xl border bg-surface transition-colors duration-300',
                    estOuvert ? 'border-brand-300 shadow-soft' : 'border-ink-100 hover:border-brand-200'
                  )}
                >
                  <button
                    type="button"
                    onClick={() => setOuvert(estOuvert ? -1 : index)}
                    className="flex w-full items-center gap-6 px-6 py-6 text-left sm:px-8"
                    aria-expanded={estOuvert}
                  >
                    <span
                      className={clsx(
                        'titre-editorial shrink-0 text-3xl leading-none transition-colors duration-300',
                        estOuvert ? 'text-brand-500 dark:text-brand-400' : 'text-brand-200 dark:text-brand-500/40'
                      )}
                    >
                      {String(index + 1).padStart(2, '0')}
                    </span>
                    <span className="flex-1">
                      <span className="block text-[0.7rem] font-semibold uppercase tracking-[0.22em] text-brand-600 dark:text-brand-400">
                        {etape.phase}
                      </span>
                      <span className="titre-editorial mt-1.5 block text-xl text-ink-900">{etape.titre}</span>
                      <span className="mt-1.5 block text-sm font-light text-ink-500">{etape.resume}</span>
                    </span>
                    <Plus
                      className={clsx(
                        'h-5 w-5 shrink-0 text-ink-400 transition-transform duration-300',
                        estOuvert && 'rotate-45 text-brand-500 dark:text-brand-400'
                      )}
                      aria-hidden
                    />
                  </button>
                  <div className={clsx('grid transition-all duration-300', estOuvert ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0')}>
                    <div className="overflow-hidden">
                      <div className="space-y-4 border-t border-ink-100 px-6 py-7 text-sm font-light leading-relaxed text-ink-600 sm:px-8 sm:pl-[6.5rem]">
                        {etape.paragraphes.map((paragraphe) => (
                          <p key={paragraphe.slice(0, 40)}>{paragraphe}</p>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </Revele>
            );
          })}
        </div>
      </section>

      <AppelAction
        titre="Prêt à planifier votre déploiement ?"
        texte="Décrivez votre secteur et vos échéances : nous revenons vers vous avec un calendrier et la formule adaptée."
      />
    </div>
  );
}

import { useState } from 'react';
import { ChevronDown, Route } from 'lucide-react';
import clsx from 'clsx';
import EnTeteVitrine from '../components/EnTeteVitrine';
import Revele from '../components/Revele';
import AppelAction from '../components/AppelAction';
import { SMARTEX } from '../config/smartex';
import photoBanniere from '../assets/methodologie/banniere.jpg';

/**
 * Déroulé d'une mission, adapté de la roue de Deming (PDCA) — texte repris
 * de la page de référence. Pas de durées chiffrées : celles de la démarche
 * consultant classique (semaines) ne s'appliquent plus telles quelles avec
 * l'IA, qui traite les phases Do/Check en quelques instants plutôt qu'en
 * semaines ; Plan, Act et Communication restent des étapes humaines.
 */
const ETAPES = [
  {
    titre: 'Plan ou planifier',
    paragraphes: [
      'Identifier les orientations stratégiques sectorielles de RSE de l’entreprise et planifier un programme d’action (ou concevoir un plan).',
      'Lancement, cadrage de la mission, et diagnostic des enjeux RSE significatifs sectoriels avec la grille d’analyse des bonnes pratiques fondamentales de RSE.',
    ],
  },
  {
    titre: 'Do ou déployer, réaliser',
    paragraphes: [
      'Mettre en œuvre le plan d’action issu des axes stratégiques identifiés ; déploiement de la stratégie et exécution des tâches prévues.',
      'Sur la plateforme, le questionnaire s’adapte au périmètre déclaré et les preuves déposées sont analysées par le pipeline d’agents IA dès leur dépôt, sans délai d’attente pour un consultant.',
    ],
  },
  {
    titre: 'Check ou suivre et évaluer, vérifier, actions correctives',
    paragraphes: [
      'Recueillir des données et évaluer les résultats : mesurer et surveiller les performances, comparer avec les prévisions, évaluer la conformité et rechercher les non-conformités.',
      'Analyser les écarts et rechercher les causes ; actions correctives et préventives dans une logique d’amélioration continue — le point clé de la démarche. Sur la plateforme, le score pondéré et l’indice de confiance sont calculés automatiquement par l’IA, dès que les preuves sont analysées.',
    ],
  },
  {
    titre: 'Act ou agir, réagir, améliorer, revue de direction, standardiser',
    paragraphes: [
      'Prendre des mesures correctives et standardiser l’ensemble du processus dans une logique d’amélioration continue.',
      'La revue de direction est un maillon important du processus d’amélioration continue de Deming : réalisée régulièrement et portée par une direction impliquée, elle détermine les actions à mener pour poursuivre, adapter ou réorienter la stratégie RSE, et permet d’intégrer les améliorations au système de management.',
      'En « bouclant la boucle », la revue de direction participe à l’engagement et à l’implication de la direction dans la stratégie RSE.',
    ],
  },
  {
    titre: 'Mise en place d’une communication RSE auprès des parties prenantes',
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
        titre="Démarche de RSE et de Développement Durable"
        description="Une adaptation en 5 étapes de la roue de Deming (PDCA), pour sortir de la stagnation et installer une amélioration continue."
        image={photoBanniere}
      />

      <section className="mx-auto max-w-[90rem] px-5 py-20">
        <Revele className="max-w-2xl">
          <p className="text-sm leading-relaxed text-ink-600">
            Avec {SMARTEX.produit}, les phases Do et Check ne se comptent plus en semaines : le pipeline d’agents IA analyse
            les preuves et calcule le score dès leur dépôt. Le cadrage stratégique, la revue de direction et la
            communication RSE restent des étapes portées par vos équipes et {SMARTEX.editeur}.
          </p>
        </Revele>

        <div className="mt-10 space-y-3">
          {ETAPES.map((etape, index) => {
            const estOuvert = ouvert === index;
            return (
              <Revele key={etape.titre} delai={index * 80}>
                <div className="overflow-hidden rounded-2xl border border-ink-100 shadow-soft">
                  <button
                    type="button"
                    onClick={() => setOuvert(estOuvert ? -1 : index)}
                    className="flex w-full items-center gap-4 bg-brand-50 px-5 py-4 text-left transition-colors hover:bg-brand-100 dark:bg-brand-500/10 dark:hover:bg-brand-500/15"
                    aria-expanded={estOuvert}
                  >
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-600 text-xs font-semibold text-white">
                      {index + 1}
                    </span>
                    <span className="flex-1 text-sm font-semibold text-ink-900 sm:text-base">{etape.titre}</span>
                    <ChevronDown
                      className={clsx('h-4 w-4 shrink-0 text-ink-500 transition-transform duration-200', estOuvert && 'rotate-180')}
                      aria-hidden
                    />
                  </button>
                  <div
                    className={clsx('grid transition-all duration-300', estOuvert ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0')}
                  >
                    <div className="overflow-hidden">
                      <div className="space-y-3 px-5 py-5 text-sm leading-relaxed text-ink-600">
                        {etape.paragraphes.map((paragraphe, i) => (
                          <p key={i}>{paragraphe}</p>
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

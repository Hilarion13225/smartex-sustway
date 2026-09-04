import { useState } from 'react';
import { Plus, Route } from 'lucide-react';
import clsx from 'clsx';
import EnTeteVitrine from '../components/EnTeteVitrine';
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
        {/* Titre à gauche, chapeau à droite : même disposition que la page
            Méthodologie, et le chapeau ne laisse plus la moitié droite vide. */}
        <div className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-end lg:gap-16">
          <Revele>
            <p className="sur-titre text-brand-600 dark:text-brand-400">
              <span className="filet" aria-hidden />
              <Route className="h-4 w-4" aria-hidden />
              Le déroulé pas à pas
            </p>
            <h2 className="titre-editorial mt-5 text-3xl leading-tight text-ink-900 sm:text-[2.6rem]">
              De la planification à la valorisation de votre engagement
            </h2>
          </Revele>

          <Revele delai={120}>
            <div className="border-l-2 border-brand-200 pl-6 dark:border-brand-500/40">
              <p className="text-base font-light leading-relaxed text-ink-600">
                Avec {SMARTEX.produit}, les phases Do et Check ne se comptent plus en semaines : le pipeline d’agents IA
                analyse les preuves et calcule le score dès leur dépôt. Le cadrage stratégique, la revue de direction et
                la communication RSE restent portés par vos équipes et {SMARTEX.editeur}.
              </p>
            </div>
          </Revele>
        </div>

        {/* Chronologie : le rail relie les étapes pour donner à lire une
            progression (le cycle PDCA), là où l'empilement de cartes
            indépendantes ressemblait à une simple FAQ dépliante. */}
        <ol className="mt-16 space-y-4">
          {ETAPES.map((etape, index) => {
            const estOuvert = ouvert === index;
            const dernier = index === ETAPES.length - 1;
            return (
              <Revele key={etape.phase} delai={index * 80} as="li" className="relative block pl-16 sm:pl-24">
                {/* Segment de rail : prolongé sous la carte pour franchir
                    l'espacement et donner une ligne continue. */}
                {!dernier ? (
                  <span
                    className="absolute left-[1.4rem] top-14 -bottom-4 w-px bg-ink-200 sm:left-8 dark:bg-ink-200"
                    aria-hidden
                  />
                ) : null}

                <span
                  className={clsx(
                    'titre-editorial absolute left-0 top-4 flex h-12 w-12 items-center justify-center rounded-full border-2 text-base transition duration-300 sm:h-16 sm:w-16 sm:text-xl',
                    estOuvert
                      ? 'border-brand-500 bg-brand-500 text-white shadow-glow'
                      : 'border-ink-200 bg-surface text-brand-300 dark:text-brand-500/60'
                  )}
                  aria-hidden
                >
                  {String(index + 1).padStart(2, '0')}
                </span>

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
                    <span className="flex-1">
                      <span className="inline-flex items-center rounded-full bg-brand-50 px-3 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.22em] text-brand-700 dark:bg-brand-500/15 dark:text-brand-400">
                        {etape.phase}
                      </span>
                      <span className="titre-editorial mt-3 block text-xl text-ink-900">{etape.titre}</span>
                      <span className="mt-1.5 block max-w-3xl text-sm font-light text-ink-500">{etape.resume}</span>
                    </span>
                    <span
                      className={clsx(
                        'flex h-9 w-9 shrink-0 items-center justify-center rounded-full border transition duration-300',
                        estOuvert
                          ? 'border-brand-300 bg-brand-50 dark:border-brand-500/40 dark:bg-brand-500/15'
                          : 'border-ink-200'
                      )}
                    >
                      <Plus
                        className={clsx(
                          'h-4 w-4 text-ink-400 transition-transform duration-300',
                          estOuvert && 'rotate-45 text-brand-500 dark:text-brand-400'
                        )}
                        aria-hidden
                      />
                    </span>
                  </button>
                  <div
                    className={clsx(
                      'grid transition-all duration-300',
                      estOuvert ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
                    )}
                  >
                    <div className="overflow-hidden">
                      {/* Le filet court sur toute la carte, seul le texte est
                          borné en largeur pour rester lisible. */}
                      <div className="border-t border-ink-100 px-6 py-7 sm:px-8">
                        <div className="max-w-3xl space-y-4 text-sm font-light leading-relaxed text-ink-600">
                          {etape.paragraphes.map((paragraphe) => (
                            <p key={paragraphe.slice(0, 40)}>{paragraphe}</p>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </Revele>
            );
          })}
        </ol>
      </section>

      <AppelAction
        titre="Prêt à planifier votre déploiement ?"
        texte="Décrivez votre secteur et vos échéances : nous revenons vers vous avec un calendrier et la formule adaptée."
      />
    </div>
  );
}

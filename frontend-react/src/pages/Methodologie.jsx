import { BookOpen, CheckCircle2, Compass, Layers, Megaphone, RefreshCw, Rocket } from 'lucide-react';
import EnTeteVitrine from '../components/EnTeteVitrine';
import TitreSection from '../components/TitreSection';
import Revele from '../components/Revele';
import AppelAction from '../components/AppelAction';
import { FONDEMENTS, SMARTEX } from '../config/smartex';
import photoBanniere from '../assets/methodologie/banniere-hd.jpg';

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
        titre="Une méthodologie exigeante, appuyée sur la recherche et la pratique"
        messages={[
          'Parlons de bonnes pratiques de RSE et ESG, où en êtes-vous ?',
          'La maturité de votre engagement RSE et ESG, a quel niveau mettons le curseur ?',
          'S’auto-évaluer ou se faire évaluer avec notre méthodologie éprouvée s’appuyant sur l’IA.',
          'SMARTEX SustWay, une solution pratique et facile à deployer au service des entreprises',
          'Des clients satisfaits témoignent',
        ]}
        image={photoBanniere}
        video="/videos/methodologie-overview.mp4"
      />

      <section className="mx-auto max-w-[90rem] px-5 py-24">
        <TitreSection
            etiquette="Méthodologie"
            icone={BookOpen}
            titre="Une méthodologie éprouvée, batie autour d'années d'expériences academiques et du secteur privé"
            description={`${SMARTEX.produit} unifie référentiels, preuves documentaires et intelligence artificielle multi-agents pour évaluer, prioriser et améliorer votre performance RSE et ESG.`}
          />
      </section>

      <section className="border-y border-ink-100 bg-ink-50 py-24">
        <div className="mx-auto max-w-[90rem] px-5">
          <TitreSection
            etiquette="Deploiement - Le déroulé d’une mission"
            icone={Compass}
            titre="Une démarche en cinq étapes, accélérée par l’IA"
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

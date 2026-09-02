import { BookOpen, CheckCircle2, Compass, Layers, Megaphone, RefreshCw, Rocket } from 'lucide-react';
import EnTeteVitrine from '../components/EnTeteVitrine';
import TitreSection from '../components/TitreSection';
import Revele from '../components/Revele';
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
    phase: 'Cadrage et Diagnostic',
    // titre: 'Cadrer et diagnostiquer',
    texte: 'Périmètre de la mission avec les variables de caractérisation de l’entreprise, Questionnaire d’évaluation s’adaptant au secteur d’activité, plus des preuves déposées l’ensemble analysées par le pipeline d’agents IA introduit dans le dispositif. Une probabilité de conformité par critère est produite; (...)',
  },
  // {
  //   icone: Rocket,
  //   phase: 'Do',
  //   titre: 'Déployer l’évaluation',
  //   texte: 'Les preuves déposées sont analysées par le pipeline d’agents IA, qui produit une probabilité de conformité par critère.',
  // },
  {
    icone: CheckCircle2,
    phase: 'Les livrables',
    // titre: 'Vérifier et mesurer',
    texte: 'Rapport de synthèse de l’évaluation mettant en exergue le profil RSE global de l’entreprise et le profil par domaines évalués, soulignant conformités et non-conformités. Il présente le degré de maturité de la démarche RSE/ESG de l’entreprise et génère des plans d’actions correctives sur les non-conformités, priorisés selon les risques identifiés. Toutes les actions entreprises s’inscrivent dans une dynamique d’amélioration continue. Livrable complémentaire : indice de préparation à l’éligibilité au financement vert des PTF, mesurant l’alignement des pratiques RSE/ESG de l’entreprise sur les critères d’évaluation des PTF.',
  },
  // {
  //   icone: RefreshCw,
  //   phase: 'Act',
  //   titre: 'Agir et corriger',
  //   texte: 'Plan d’actions correctives priorisé par le risque attendu, pour intégrer les améliorations dans le système de management.',
  // },
  {
    icone: Megaphone,
    phase: 'Communication et valorisation de la démarche RSE / ESG',
    // titre: 'Valoriser l’engagement',
    texte: 'Rapport exportable pour communiquer les résultats et l’engagement RSE / ESG de l’entreprise auprès de ses parties prenantes.',
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
            titre="Une démarche robuste, transparente et independante, s'appuyant sur l'IA"
          />

          <div className="mt-6 max-w-5xl space-y-4 text-base font-light leading-relaxed text-ink-600">
            <p>
              {SMARTEX.produit} est une démarche d’opérationnalisation de la RSE et ESG avec une adaptation à la logique
              d’apprentissage ou d’amélioration continue de Deming (la roue de Deming, PDCA), et procède par scoring des
              principales dimensions de la RSE et ESG.
            </p>
            <p>
              Démarche séquentielle divisée en 4 étapes, la roue de Deming aide les entreprises à sortir de la
              stagnation avec pour objectif principal l’amélioration continue de leur performance.
            </p>
            <p>
              Ici, {SMARTEX.produit} s’appuie sur l’IA pour optimiser la démarche et suit ainsi une adaptation en trois
              (3) étapes.
            </p>
          </div>

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
          etiquette="Nos principes fondamentaux"
          icone={Layers}
          titre="Six principes fondent notre démarche d'accompagnement."
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

    </div>
  );
}

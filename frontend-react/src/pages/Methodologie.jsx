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

      {/* Chapô : titre à gauche, chapeau à droite. La disposition en deux
          colonnes évite la grande zone vide qu'un titre seul laissait à
          droite sur les larges écrans. */}
      <section className="mx-auto max-w-[90rem] px-5 py-24">
        <div className="grid gap-10 lg:grid-cols-[1.15fr_0.85fr] lg:items-end lg:gap-16">
          <Revele>
            <p className="sur-titre text-brand-600 dark:text-brand-400">
              <span className="filet" aria-hidden />
              <BookOpen className="h-4 w-4" aria-hidden />
              Méthodologie
            </p>
            <h2 className="titre-editorial mt-5 text-3xl leading-tight text-ink-900 sm:text-[2.6rem]">
              Une méthodologie éprouvée, batie autour d’années d’expériences academiques et du secteur privé
            </h2>
          </Revele>

          <Revele delai={120}>
            <div className="border-l-2 border-brand-200 pl-6 dark:border-brand-500/40">
              <p className="text-base font-light leading-relaxed text-ink-600">
                {SMARTEX.produit} unifie référentiels, preuves documentaires et intelligence artificielle multi-agents
                pour évaluer, prioriser et améliorer votre performance RSE et ESG.
              </p>
            </div>
          </Revele>
        </div>
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

          {/* Autant de colonnes que d'étapes : avec une grille figée à cinq
              colonnes, trois cartes laissaient deux colonnes vides à droite. */}
          <ol className="mt-16 grid gap-6 lg:grid-cols-3">
            {ETAPES_METHODE.map((etape, index) => (
              <Revele key={etape.phase} delai={index * 120} as="li" className="h-full">
                <article className="carte-vitrine group flex h-full flex-col !p-8">
                  {/* Numéro en filigrane : repère l'ordre des étapes sans
                      disputer la place au titre. */}
                  <span
                    className="titre-editorial pointer-events-none absolute -top-4 right-3 select-none text-[6.5rem] leading-none text-brand-500/[0.06] transition-colors duration-500 group-hover:text-brand-500/[0.12] dark:text-brand-400/[0.08]"
                    aria-hidden
                  >
                    {String(index + 1).padStart(2, '0')}
                  </span>

                  <span className="puce-icone relative">
                    <etape.icone className="h-5 w-5" aria-hidden />
                  </span>

                  {/* `phase` porte l'intitulé de l'étape : c'est donc lui le
                      titre de la carte (le champ `titre` n'est plus renseigné). */}
                  <h3 className="titre-editorial relative mt-6 text-xl leading-snug text-ink-900">{etape.phase}</h3>
                  <span
                    className="relative mt-5 block h-px w-14 bg-brand-300 transition-all duration-500 group-hover:w-24 dark:bg-brand-500/60"
                    aria-hidden
                  />
                  <p className="relative mt-5 text-sm font-light leading-relaxed text-ink-500">{etape.texte}</p>
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

        <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {FONDEMENTS.map((fondement, index) => (
            <Revele key={fondement.titre} delai={index * 90} className="h-full">
              <article className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-ink-100 bg-surface p-7 transition duration-300 hover:border-brand-200 hover:shadow-soft motion-safe:hover:-translate-y-1">
                {/* Liseré supérieur qui se déploie au survol : signale la carte
                    active sans ajouter d'ombre lourde. */}
                <span
                  className="absolute inset-x-0 top-0 h-0.5 origin-left scale-x-0 bg-brand-500 transition-transform duration-500 group-hover:scale-x-100"
                  aria-hidden
                />
                <span
                  className="titre-editorial pointer-events-none absolute -top-3 right-3 select-none text-[5rem] leading-none text-brand-500/[0.06] dark:text-brand-400/[0.08]"
                  aria-hidden
                >
                  {String(index + 1).padStart(2, '0')}
                </span>
                <h3 className="titre-editorial relative text-xl leading-snug text-ink-900">{fondement.titre}</h3>
                <p className="relative mt-4 text-sm font-light leading-relaxed text-ink-500">{fondement.texte}</p>
              </article>
            </Revele>
          ))}
        </div>
      </section>

    </div>
  );
}

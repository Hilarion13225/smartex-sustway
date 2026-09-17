import AppelAction from '../components/AppelAction';
import { SMARTEX } from '../config/smartex';

/*
 * Démarche en trois étapes, adaptée de la roue de Deming. Le déroulé venait
 * d'un paragraphe unique par étape : il est ici éclaté en points de liste,
 * sans un mot ajouté ni retiré au fond — un visiteur lit une étape en trois
 * secondes, pas un pavé de huit lignes.
 */
const ETAPES = [
  {
    titre: 'Cadrage et diagnostic',
    resume: 'On délimite ce qui est évalué, puis l’IA analyse les preuves déposées.',
    points: [
      'Périmètre de la mission et variables de caractérisation de l’entreprise',
      'Questionnaire d’évaluation adapté au secteur d’activité',
      'Preuves documentaires déposées puis analysées par le pipeline d’agents IA',
      'Une probabilité de conformité produite pour chaque critère',
    ],
  },
  {
    titre: 'Les livrables',
    resume: 'Un rapport qui dit où vous en êtes, et ce qu’il reste à corriger.',
    points: [
      'Rapport de synthèse : profil RSE global et profil par domaine évalué',
      'Conformités et non-conformités, degré de maturité de la démarche',
      'Plans d’actions correctives, priorisés selon les risques identifiés',
      'Indice de préparation à l’éligibilité au financement vert des PTF',
    ],
  },
  {
    titre: 'Communication et valorisation',
    resume: 'Vos résultats deviennent un support de dialogue avec vos parties prenantes.',
    points: [
      'Rapport exportable, prêt à être partagé',
      'Communication des résultats de l’évaluation',
      'Valorisation de la démarche RSE et ESG auprès des parties prenantes',
    ],
  },
];

const classeTitreSection =
  'font-display text-[1.75rem] font-bold leading-tight text-ink-900 sm:text-[2rem]';

/**
 * Comment se déroule un déploiement : les étapes, et ce qui est remis à
 * chacune.
 *
 * Ce contenu vivait dans la page Méthodologie, où il tenait la section
 * « Une démarche en trois étapes ». Il en est déplacé sans un mot changé :
 * la navigation demandée distingue ce sur quoi la solution se fonde — la
 * méthodologie — de la façon dont elle se met en place. La route
 * `/deploiement` existait déjà et redirigeait vers la méthodologie ; elle
 * mène maintenant à ce qu'elle annonce.
 */
export default function Deploiement() {
  return (
    <>
      <section className="border-b border-ink-200 bg-surface">
        <div className="mx-auto max-w-[90rem] px-5 py-16 sm:py-20">
          <h1 className="titre-page max-w-[18ch] text-ink-900">
            Du cadrage à la valorisation de vos résultats.
          </h1>
          <p className="mt-5 max-w-2xl text-[17px] leading-relaxed text-ink-600">
            Les étapes d’une mission {SMARTEX.produit}, et les livrables remis à chacune.
          </p>
        </div>
      </section>

      <section className="border-b border-ink-200">
        <div className="mx-auto max-w-[90rem] px-5 py-16 sm:py-20">
          <h2 className={`mx-auto max-w-3xl text-center ${classeTitreSection}`}>Une démarche en <span className="text-brand-600">trois étapes</span>.</h2>

          {/* Frise verticale : l'ordre est l'information principale, un rail
              continu qui relie des numéros le dit mieux qu'une rangée de
              pastilles colorées. */}
          <ol className="mt-12">
            {ETAPES.map((etape, index) => (
              <li key={etape.titre} className="relative grid grid-cols-[2.5rem_1fr] gap-x-5 pb-12 last:pb-0 sm:gap-x-8 lg:grid-cols-[2.5rem_20rem_1fr]">
                {index < ETAPES.length - 1 ? (
                  <span className="absolute bottom-0 left-5 top-10 w-px bg-ink-200" aria-hidden />
                ) : null}
                <span className="relative flex h-10 w-10 items-center justify-center rounded-full border border-ink-300 bg-ink-50 font-display text-base font-bold tabular-nums text-ink-900">
                  {index + 1}
                </span>

                <div className="min-w-0 pt-1.5">
                  <h3 className="font-display text-xl font-bold leading-snug text-ink-900 sm:text-[1.375rem]">{etape.titre}</h3>
                  <p className="mt-2 text-[15px] leading-relaxed text-ink-600">{etape.resume}</p>
                </div>

                <ul className="col-start-2 mt-4 space-y-2.5 lg:col-start-3 lg:mt-0 lg:pt-2">
                  {etape.points.map((point) => (
                    <li key={point} className="flex gap-3 text-[15px] leading-relaxed text-ink-700">
                      <span className="mt-[0.7em] h-px w-3 shrink-0 bg-ink-400" aria-hidden />
                      {point}
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <AppelAction
        titre="Prêt à lancer votre évaluation ?"
        texte="Choisissez la formule de collaboration adaptée à votre organisation."
      />
    </>
  );
}

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Play } from 'lucide-react';
import AppelAction from '../components/AppelAction';
import ModaleVideo from '../components/ModaleVideo';
import RoueDeming from '../components/vitrine/RoueDeming';
import { FONDEMENTS, REFERENCES_METHODOLOGIQUES, SMARTEX } from '../config/smartex';
import photoHero from '../assets/methodologie/banniere.jpg';

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

/*
 * Chaîne de traitement, du référentiel à l'action corrective. Volontairement
 * décrite du point de vue de ce que l'utilisateur dépose et reçoit : le détail
 * des agents et de leur orchestration n'apprend rien à un visiteur de la
 * vitrine.
 */
const CHAINE = [
  { libelle: 'Référentiels', detail: 'Le cadre applicable à votre secteur' },
  { libelle: 'Questionnaire', detail: 'Adapté à votre activité' },
  { libelle: 'Preuves', detail: 'Vos documents justificatifs' },
  { libelle: 'Agents IA', detail: 'Lecture et confrontation au référentiel' },
  { libelle: 'Conformité', detail: 'Une probabilité par critère' },
  { libelle: 'Risques', detail: 'Hiérarchisés par criticité' },
  { libelle: 'Actions', detail: 'Un plan correctif priorisé' },
];

const PILIERS = ['Environnement', 'Social', 'Gouvernance'];

const classeTitreSection =
  'font-display text-[1.875rem] font-bold leading-[1.08] tracking-[-0.025em] text-ink-900 sm:text-[2.75rem] [text-wrap:balance]';

/**
 * Page « Méthodologie ».
 *
 * Même langage que la page Solution : héros clair, plages Papier et Craie
 * séparées par des filets, listes plutôt que cartes. Le seul dessin est la
 * roue de Deming, et son seul mouvement répond au pointeur.
 */
export default function Methodologie() {
  const [videoOuverte, definirVideoOuverte] = useState(false);

  return (
    <div>
      {/* --------------------------------------------------------- Héros */}
      <section className="border-b border-ink-200">
        <div className="mx-auto grid max-w-[75rem] gap-12 px-5 pb-14 pt-10 sm:pt-14 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:gap-16 lg:pb-20 lg:pt-20">
          <div className="min-w-0">
            <p className="sur-titre">Notre méthodologie</p>
            <h1 className="titre-page mt-4 max-w-[18ch] text-ink-900">Une méthode claire, du cadrage au plan d’action.</h1>

            <p className="mt-6 max-w-[54ch] text-lg leading-relaxed text-ink-600">
              Une démarche transparente et indépendante, fondée sur des référentiels reconnus, sur vos preuves
              documentaires et sur l’intelligence artificielle.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <a
                href="#demarche"
                className="btn-presse inline-flex min-h-12 items-center justify-center rounded-[4px] bg-brand-600 px-6 text-base font-semibold text-white hover:bg-brand-700"
              >
                Découvrir la démarche
              </a>
              <button
                type="button"
                onClick={() => definirVideoOuverte(true)}
                className="btn-presse inline-flex min-h-12 items-center justify-center gap-2.5 rounded-[4px] border border-ink-300 px-6 text-base font-semibold text-ink-900 hover:border-ink-900"
              >
                <Play className="h-4 w-4 fill-current" aria-hidden />
                Voir la démonstration
              </button>
            </div>
          </div>

          <figure className="min-w-0">
            {/* Non différée : cette photo est dans le premier écran sur
                téléphone, et la reporter retarderait le plus grand affichage
                de la page. */}
            <img
              src={photoHero}
              alt="Cubes ESG, roue des objectifs de développement durable et plante posés sur un bureau"
              className="aspect-[4/3] w-full rounded-[12px] object-cover"
              loading="eager"
              fetchPriority="high"
            />
            {/* Les trois piliers en légende, là où ils flottaient en cartes
                sur la photo : même information, sans masquer l'image. */}
            <figcaption className="mt-4 flex flex-wrap gap-x-6 gap-y-1 text-[15px] text-ink-600">
              <span className="text-ink-500">Trois piliers évalués :</span>
              {PILIERS.map((pilier) => (
                <span key={pilier} className="font-semibold text-ink-900">
                  {pilier}
                </span>
              ))}
            </figcaption>
          </figure>
        </div>
      </section>

      {/* ------------------------------------------- Démarche en 3 étapes */}
      <section id="demarche" className="scroll-mt-20 border-b border-ink-200">
        <div className="mx-auto max-w-[75rem] px-5 py-16 sm:py-20">
          <h2 className={`max-w-2xl ${classeTitreSection}`}>Une démarche en trois étapes.</h2>

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

      {/* --------------------------------------------- Amélioration continue */}
      <section className="border-b border-ink-200 bg-surface">
        <div className="mx-auto max-w-[75rem] px-5 py-16 sm:py-20">
          <h2 className={`max-w-2xl ${classeTitreSection}`}>L’amélioration continue au cœur de l’approche.</h2>
          <p className="mt-4 max-w-[60ch] text-lg leading-relaxed text-ink-600">
            La roue de Deming (PDCA) aide les organisations à sortir de la stagnation et à progresser durablement. Pointez
            une étape pour la situer sur la roue.
          </p>

          <RoueDeming className="mt-12" />
        </div>
      </section>

      {/* ------------------------------------------ Intelligence artificielle */}
      <section className="border-b border-ink-200">
        <div className="mx-auto max-w-[75rem] px-5 py-16 sm:py-20">
          <h2 className={`max-w-2xl ${classeTitreSection}`}>De vos preuves au plan d’action.</h2>
          <p className="mt-4 max-w-[60ch] text-lg leading-relaxed text-ink-600">
            Chaque évaluation suit le même chemin. Vous déposez des documents, l’IA les confronte au référentiel, et vous
            ressortez avec des priorités, pas avec une opinion.
          </p>

          {/* Même motif que « Comment ça marche » sur la page Solution : un
              filet épais par maillon, numéroté. L'enchaînement se lit de gauche
              à droite sur grand écran, de haut en bas sur téléphone. */}
          <ol className="mt-12 grid gap-x-5 gap-y-8 sm:grid-cols-2 lg:grid-cols-7">
            {CHAINE.map((maillon, index) => (
              <li key={maillon.libelle} className="border-t-2 border-ink-900 pt-4">
                <p className="text-sm font-medium tabular-nums text-ink-400">{index + 1}</p>
                <h3 className="mt-1 font-display text-lg font-bold leading-snug text-ink-900">{maillon.libelle}</h3>
                <p className="mt-1.5 text-[15px] leading-snug text-ink-600">{maillon.detail}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* -------------------------------------------------- Nos principes */}
      <section className="border-b border-ink-200 bg-surface">
        <div className="mx-auto max-w-[75rem] px-5 py-16 sm:py-20">
          <h2 className={`max-w-2xl ${classeTitreSection}`}>Six principes fondent la démarche.</h2>

          {/* Un principe sans description n'affiche que son intitulé : les
              deux derniers n'ont pas encore de définition propre côté métier
              (voir config/smartex.js), et répéter celle du voisin donnerait
              une section qui se contredit elle-même. */}
          <ul className="mt-12 grid gap-x-8 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
            {FONDEMENTS.map((principe) => (
              <li key={principe.titre} className="border-t border-ink-300 pt-4">
                <h3 className="font-display text-xl font-bold leading-snug text-ink-900">{principe.titre}</h3>
                {principe.texte ? (
                  <p className="mt-2 text-[15px] leading-relaxed text-ink-600">{principe.texte}</p>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* --------------------------------------- Référentiels et standards */}
      <section>
        <div className="mx-auto max-w-[75rem] px-5 py-16 sm:py-20">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <h2 className={`max-w-2xl ${classeTitreSection}`}>Référentiels et standards mobilisés.</h2>
            <Link to="/services" viewTransition className="lien-trait text-base">
              Voir la solution
            </Link>
          </div>

          {/* Grille à filets plutôt que cartes : ce sont des repères que l'on
              parcourt, pas des objets à comparer. La dernière case rappelle le
              référentiel propre à la plateforme, qui complète la rangée. */}
          <ul className="mt-12 grid border-l border-t border-ink-200 sm:grid-cols-2 lg:grid-cols-3">
            {REFERENCES_METHODOLOGIQUES.map((reference) => (
              <li key={reference.code} className="border-b border-r border-ink-200 p-6 sm:p-8">
                <p className="font-display text-xl font-bold text-ink-900">{reference.nom}</p>
                <p className="mt-2 text-[15px] leading-relaxed text-ink-600">{reference.texte}</p>
              </li>
            ))}
            <li className="border-b border-r border-ink-200 bg-surface p-6 sm:p-8">
              <p className="font-display text-xl font-bold text-ink-900">Référentiel {SMARTEX.produit}</p>
              <p className="mt-2 text-[15px] leading-relaxed text-ink-600">
                87 critères en 6 parties : le cadre que la plateforme évalue, nourri par ces standards.
              </p>
            </li>
          </ul>
        </div>
      </section>

      <AppelAction
        titre="Une méthode claire, des résultats justifiés."
        texte="Choisissez votre formule et lancez votre première évaluation dès aujourd’hui."
      />

      {videoOuverte ? (
        <ModaleVideo
          source="/videos/methodologie-overview.mp4"
          titre={`Démonstration ${SMARTEX.produit}`}
          surFermeture={() => definirVideoOuverte(false)}
        />
      ) : null}
    </div>
  );
}

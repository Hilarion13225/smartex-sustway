import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Bot,
  ClipboardCheck,
  Compass,
  FileCheck2,
  FileText,
  Gauge,
  Leaf,
  ListChecks,
  Megaphone,
  Play,
  Scale,
  ShieldAlert,
  Users,
} from 'lucide-react';
import Revele from '../components/Revele';
import ModaleVideo from '../components/ModaleVideo';
import { Etiquette, PASTELS, TraitManuscrit } from '../components/vitrine/communs';
import RoueDeming from '../components/vitrine/RoueDeming';
import { FONDEMENTS, REFERENCES_METHODOLOGIQUES, SMARTEX } from '../config/smartex';
import photoHero from '../assets/methodologie/banniere.jpg';
import photoDiagnostic from '../assets/methodologie/avantages-illustration.jpg';

/** Les trois piliers, posés sur la photo du héros comme sur la maquette. */
const PILIERS = [
  { icone: Leaf, ton: 'vert', libelle: 'Environnement' },
  { icone: Users, ton: 'bleu', libelle: 'Social' },
  { icone: Scale, ton: 'violet', libelle: 'Gouvernance' },
];

/*
 * Démarche en trois étapes, adaptée de la roue de Deming. Le déroulé venait
 * d'un paragraphe unique par étape : il est ici éclaté en points de liste,
 * sans un mot ajouté ni retiré au fond — un visiteur lit une étape en trois
 * secondes, pas un pavé de huit lignes.
 */
const ETAPES = [
  {
    icone: Compass,
    ton: 'rouge',
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
    icone: FileCheck2,
    ton: 'bleu',
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
    icone: Megaphone,
    ton: 'vert',
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
  { icone: FileText, libelle: 'Référentiels', detail: 'Le cadre applicable à votre secteur' },
  { icone: ClipboardCheck, libelle: 'Questionnaire', detail: 'Adapté à votre activité' },
  { icone: FileCheck2, libelle: 'Preuves', detail: 'Vos documents justificatifs' },
  { icone: Bot, libelle: 'Agents IA', detail: 'Lecture et confrontation au référentiel' },
  { icone: Gauge, libelle: 'Conformité', detail: 'Une probabilité par critère' },
  { icone: ShieldAlert, libelle: 'Risques', detail: 'Hiérarchisés par criticité' },
  { icone: ListChecks, libelle: 'Actions', detail: 'Un plan correctif priorisé' },
];

export default function Methodologie() {
  const [videoOuverte, definirVideoOuverte] = useState(false);

  return (
    <div>
      {/* --------------------------------------------------------- Héros */}
      <section className="relative overflow-hidden">
        <span
          className="pointer-events-none absolute -left-32 -top-24 h-80 w-80 rounded-full bg-brand-100/50 blur-3xl dark:bg-brand-500/10"
          aria-hidden
        />
        <span
          className="pointer-events-none absolute -right-24 top-32 h-96 w-96 rounded-full bg-emerald-100/50 blur-3xl dark:bg-emerald-500/10"
          aria-hidden
        />

        <div className="relative mx-auto grid max-w-[80rem] items-center gap-10 px-5 py-12 lg:grid-cols-[1.05fr_0.95fr] lg:py-14">
          <div className="motion-safe:animate-apparition-bas">
            <Etiquette filetDroit>Notre méthodologie</Etiquette>

            <h1 className="mt-6 font-display text-[1.95rem] font-extrabold leading-[1.12] tracking-tight text-marine sm:text-[2.4rem] lg:text-[2.45rem] xl:text-[2.55rem]">
              Des organisations
              <br />
              plus responsables,
              <br />
              <span className="text-brand-600">avec une méthodologie claire.</span>
            </h1>

            <p className="mt-5 max-w-xl text-base leading-[1.55] text-ink-600">
              Une démarche simple, transparente et indépendante, qui s’appuie sur des référentiels reconnus, sur vos
              preuves documentaires et sur l’intelligence artificielle pour évaluer, comprendre et améliorer votre
              performance RSE et ESG.
            </p>

            <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-center">
              <a
                href="#demarche"
                className="group inline-flex items-center justify-center gap-2.5 rounded-lg bg-brand-600 px-10 py-3 text-sm font-semibold text-white shadow-glow transition duration-300 hover:bg-brand-700 motion-safe:hover:-translate-y-0.5"
              >
                Découvrir notre approche
                <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" aria-hidden />
              </a>

              <button
                type="button"
                onClick={() => definirVideoOuverte(true)}
                className="group inline-flex items-center justify-center gap-2.5 rounded-lg border border-brand-300 bg-surface px-8 py-3 text-sm font-semibold text-brand-600 transition duration-300 hover:border-brand-500 hover:bg-brand-50 motion-safe:hover:-translate-y-0.5 dark:border-brand-500/50 dark:text-brand-400 dark:hover:bg-brand-500/10"
              >
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-brand-600 text-white">
                  <Play className="h-2.5 w-2.5 fill-current" aria-hidden />
                </span>
                Voir la démonstration
              </button>
            </div>
          </div>

          {/* Photo et piliers ESG, comme sur la maquette : les trois cartes
              débordent sur l'image plutôt que de former une colonne à côté. */}
          <Revele delai={120} className="relative">
            <p className="mb-4 ml-auto hidden w-52 rotate-[-3deg] text-right font-titre text-[0.95rem] font-semibold italic leading-snug text-marine xl:block">
              Évaluer, comprendre, progresser — ensemble.
              <TraitManuscrit className="ml-auto mt-1 h-2 w-28 text-brand-500" />
            </p>

            {/* Non différée : cette photo est dans le premier écran sur
                téléphone, et la reporter retarderait le plus grand affichage
                de la page. */}
            <div className="relative overflow-hidden rounded-2xl shadow-soft">
              <img
                src={photoHero}
                alt="Cubes ESG, roue des objectifs de développement durable et plante posés sur un bureau"
                className="h-64 w-full object-cover sm:h-80"
                loading="eager"
                fetchPriority="high"
              />
            </div>

            <ul className="mt-4 flex flex-col gap-2.5 sm:absolute sm:-right-2 sm:bottom-6 sm:mt-0 sm:w-56">
              {PILIERS.map((pilier, index) => (
                <Revele
                  key={pilier.libelle}
                  delai={200 + index * 110}
                  as="li"
                  className="flex items-center gap-3 rounded-xl border border-ink-100 bg-surface px-4 py-2.5 shadow-soft"
                >
                  <span
                    className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${PASTELS[pilier.ton]}`}
                  >
                    <pilier.icone className="h-4 w-4" aria-hidden />
                  </span>
                  <span className="text-[13px] font-semibold text-marine">{pilier.libelle}</span>
                </Revele>
              ))}
            </ul>
          </Revele>
        </div>
      </section>

      {/* ------------------------------------------------ Qui sommes-nous */}
      <section className="border-y border-ink-100 bg-ink-50/60 dark:bg-ink-100/30">
        <div className="mx-auto grid max-w-[80rem] items-center gap-10 px-5 py-12 lg:grid-cols-[0.85fr_1.15fr] lg:gap-14">
          <Revele>
            <div className="overflow-hidden rounded-2xl shadow-soft">
              <img
                src={photoDiagnostic}
                alt="Équipe réunie autour d’un diagnostic RSE"
                className="h-56 w-full object-cover sm:h-72"
                loading="lazy"
              />
            </div>
          </Revele>

          <Revele delai={110}>
            <Etiquette>Qui sommes-nous ?</Etiquette>
            <h2 className="mt-4 font-display text-2xl font-extrabold leading-tight tracking-tight text-marine sm:text-[1.9rem]">
              Une solution de {SMARTEX.editeur}.
            </h2>
            <p className="mt-5 max-w-2xl text-base leading-[1.6] text-ink-600">
              {SMARTEX.produit} est une solution de {SMARTEX.editeur} pour accompagner les organisations vers une
              performance durable, en s’appuyant sur des référentiels reconnus, des preuves documentaires et une
              intelligence artificielle multi-agents.
            </p>

            <Link
              to="/a-propos"
              className="group mt-7 inline-flex items-center gap-2.5 rounded-lg border border-brand-300 bg-surface px-6 py-3 text-sm font-semibold text-brand-600 transition duration-300 hover:border-brand-500 hover:bg-brand-50 motion-safe:hover:-translate-y-0.5 dark:border-brand-500/50 dark:text-brand-400 dark:hover:bg-brand-500/10"
            >
              En savoir plus sur nous
              <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" aria-hidden />
            </Link>
          </Revele>
        </div>
      </section>

      {/* ------------------------------------------- Démarche en 3 étapes */}
      <section id="demarche" className="mx-auto max-w-[80rem] scroll-mt-24 px-5 py-14">
        <Revele className="text-center">
          <Etiquette filetDroit>Notre démarche</Etiquette>
          <h2 className="mx-auto mt-4 max-w-2xl font-display text-2xl font-extrabold leading-tight tracking-tight text-marine sm:text-[1.9rem]">
            Une démarche simple, en trois étapes.
          </h2>
        </Revele>

        {/* Chronologie plutôt qu'une rangée de cartes : l'ordre des étapes est
            l'information principale, un trait continu le dit mieux qu'un
            alignement. */}
        <ol className="relative mt-12 space-y-10 before:absolute before:left-[27px] before:top-4 before:hidden before:h-[calc(100%-2rem)] before:w-px before:bg-ink-200 lg:before:block">
          {ETAPES.map((etape, index) => (
            <Revele key={etape.titre} delai={index * 120} as="li" className="relative">
              <div className="grid gap-5 lg:grid-cols-[3.5rem_1fr] lg:gap-8">
                <span
                  className={`relative z-10 inline-flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl ring-8 ring-surface ${PASTELS[etape.ton]}`}
                >
                  <etape.icone className="h-6 w-6" aria-hidden />
                </span>

                <div className="min-w-0 lg:pt-1">
                  <p className="font-display text-[0.8rem] font-bold uppercase tracking-[0.18em] text-brand-600 dark:text-brand-400">
                    Étape {String(index + 1).padStart(2, '0')}
                  </p>
                  <h3 className="mt-2 font-display text-xl font-extrabold leading-snug tracking-tight text-marine">
                    {etape.titre}
                  </h3>
                  <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-ink-600">{etape.resume}</p>

                  <ul className="mt-5 grid gap-x-8 gap-y-2.5 sm:grid-cols-2">
                    {etape.points.map((point) => (
                      <li key={point} className="flex items-start gap-2.5 text-[13px] leading-snug text-ink-500">
                        <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-400" aria-hidden />
                        {point}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </Revele>
          ))}
        </ol>
      </section>

      {/* --------------------------------------------- Amélioration continue */}
      <section className="border-y border-ink-100 bg-ink-50/60 dark:bg-ink-100/30">
        <div className="mx-auto max-w-[80rem] px-5 py-14">
          <Revele className="text-center">
            <Etiquette filetDroit>Amélioration continue</Etiquette>
            <h2 className="mx-auto mt-4 max-w-2xl font-display text-2xl font-extrabold leading-tight tracking-tight text-marine sm:text-[1.9rem]">
              L’amélioration continue au cœur de notre approche.
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-base leading-[1.6] text-ink-600">
              Nous nous appuyons sur la roue de Deming (PDCA) pour aider les organisations à sortir de la stagnation et
              à progresser durablement, avec le soutien de l’intelligence artificielle.
            </p>
          </Revele>

          {/* Les quatre temps sont portés par la roue elle-même : leurs fiches
              l'encadrent au lieu de former une liste à côté du dessin. */}
          <Revele delai={110}>
            <RoueDeming className="mt-10" />
          </Revele>
        </div>
      </section>

      {/* ------------------------------------------ Intelligence artificielle */}
      <section className="mx-auto max-w-[80rem] px-5 py-14">
        <Revele className="text-center">
          <Etiquette filetDroit>Intelligence artificielle</Etiquette>
          <h2 className="mx-auto mt-4 max-w-2xl font-display text-2xl font-extrabold leading-tight tracking-tight text-marine sm:text-[1.9rem]">
            De vos preuves au plan d’action.
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-base leading-[1.6] text-ink-600">
            Chaque évaluation suit le même chemin. Vous déposez des documents, l’IA les confronte au référentiel, et
            vous ressortez avec des priorités, pas avec une opinion.
          </p>
        </Revele>

        {/* Chaîne horizontale sur grand écran, verticale sur téléphone : c'est
            l'enchaînement qui porte le sens, il ne doit jamais se lire comme
            une grille de cartes indépendantes. */}
        <ol className="relative mt-12 flex flex-col gap-3 lg:flex-row lg:items-stretch lg:gap-2 lg:before:absolute lg:before:left-[7%] lg:before:right-[7%] lg:before:top-[22px] lg:before:h-px lg:before:bg-ink-200">
          {CHAINE.map((maillon, index) => (
            <Revele
              key={maillon.libelle}
              delai={index * 80}
              as="li"
              className="flex items-center gap-3 lg:flex-1 lg:flex-col lg:gap-0 lg:text-center"
            >
              <span className="relative z-10 inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600 ring-4 ring-surface dark:bg-brand-500/15 dark:text-brand-400">
                <maillon.icone className="h-5 w-5" aria-hidden />
              </span>
              <span className="min-w-0 lg:mt-3">
                <span className="block text-[13px] font-semibold leading-snug text-marine">{maillon.libelle}</span>
                <span className="mt-1 block text-[12px] leading-snug text-ink-500">{maillon.detail}</span>
              </span>
              {index < CHAINE.length - 1 ? (
                <ArrowRight className="ml-auto h-4 w-4 shrink-0 rotate-90 text-ink-300 lg:hidden" aria-hidden />
              ) : null}
            </Revele>
          ))}
        </ol>
      </section>

      {/* -------------------------------------------------- Nos principes */}
      <section className="border-y border-ink-100 bg-ink-50/60 dark:bg-ink-100/30">
        <div className="mx-auto max-w-[80rem] px-5 py-14">
          <Revele>
            <Etiquette>Nos principes</Etiquette>
            <h2 className="mt-4 max-w-2xl font-display text-2xl font-extrabold leading-tight tracking-tight text-marine sm:text-[1.9rem]">
              Six principes fondent notre démarche.
            </h2>
          </Revele>

          {/* Un principe sans description n'affiche que son intitulé : les
              deux derniers n'ont pas encore de définition propre côté métier
              (voir config/smartex.js), et répéter celle du voisin donnerait
              une section qui se contredit elle-même. */}
          <ol className="mt-10 grid gap-x-10 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
            {FONDEMENTS.map((principe, index) => (
              <Revele key={principe.titre} delai={index * 80} as="li" className="flex gap-4">
                <span className="font-display text-[1.6rem] font-extrabold leading-none text-brand-500/25 dark:text-brand-400/30">
                  {String(index + 1).padStart(2, '0')}
                </span>
                <span className="min-w-0">
                  <span className="block font-display text-[15px] font-bold leading-snug text-marine">
                    {principe.titre}
                  </span>
                  {principe.texte ? (
                    <span className="mt-2 block text-[13px] leading-relaxed text-ink-500">{principe.texte}</span>
                  ) : null}
                </span>
              </Revele>
            ))}
          </ol>
        </div>
      </section>

      {/* --------------------------------------- Référentiels et standards */}
      <section className="mx-auto max-w-[80rem] px-5 py-14">
        <Revele className="text-center">
          <Etiquette filetDroit>Nos repères</Etiquette>
          <h2 className="mx-auto mt-4 max-w-2xl font-display text-2xl font-extrabold leading-tight tracking-tight text-marine sm:text-[1.9rem]">
            Référentiels et standards mobilisés.
          </h2>
        </Revele>

        <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {REFERENCES_METHODOLOGIQUES.map((reference, index) => (
            <Revele
              key={reference.code}
              delai={index * 80}
              as="li"
              className="rounded-2xl border border-ink-100 bg-surface p-6 shadow-sm"
            >
              <p className="font-display text-[15px] font-bold text-marine">{reference.nom}</p>
              <p className="mt-2.5 text-[13px] leading-relaxed text-ink-500">{reference.texte}</p>
            </Revele>
          ))}
        </ul>
      </section>

      {/* --------------------------------------------------- Appel final */}
      <section className="bg-gradient-to-r from-brand-800 via-brand-700 to-brand-700 text-white">
        <Revele className="mx-auto flex max-w-[80rem] flex-col items-center gap-7 px-5 py-10 text-center lg:flex-row lg:gap-8 lg:text-left">
          <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-white shadow-lg">
            <Leaf className="h-8 w-8 text-brand-600" strokeWidth={2.2} aria-hidden />
          </span>

          <div className="flex-1">
            <h2 className="font-display text-xl font-extrabold leading-snug sm:text-[1.5rem]">
              Passez de l’évaluation à l’amélioration continue.
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-white/85">
              Découvrez comment {SMARTEX.editeur} accompagne votre organisation avec {SMARTEX.produit}, dans sa
              démarche RSE et ESG.
            </p>
          </div>

          <Link
            to="/contact"
            className="group inline-flex shrink-0 items-center justify-center gap-2.5 rounded-lg bg-white px-8 py-3.5 text-sm font-semibold text-brand-700 shadow-lg transition duration-300 hover:bg-brand-50 motion-safe:hover:-translate-y-0.5"
          >
            Demander une démonstration
            <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" aria-hidden />
          </Link>
        </Revele>
      </section>

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

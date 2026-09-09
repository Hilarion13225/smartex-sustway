import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, BarChart3, Leaf, Play, Settings, ShieldCheck, Target, Users } from 'lucide-react';
import Revele from '../components/Revele';
import ModaleVideo from '../components/ModaleVideo';
import MaquetteTableauBord from '../components/MaquetteTableauBord';
import CompteurAnime from '../components/CompteurAnime';
import SectionOrganisations from '../components/vitrine/SectionOrganisations';
import SectionMethodologie from '../components/vitrine/SectionMethodologie';
import { Etiquette, PASTELS, TraitManuscrit } from '../components/vitrine/communs';
import { SMARTEX } from '../config/smartex';

const REASSURANCE = [
  {
    icone: ShieldCheck,
    ton: 'rouge',
    titre: 'Indépendance',
    texte: 'Une évaluation objective et impartiale grâce à l’IA intégrée.',
  },
  {
    icone: Settings,
    ton: 'bleu',
    titre: 'Robustesse',
    texte: 'Une méthodologie fiable et éprouvée.',
  },
  {
    icone: BarChart3,
    ton: 'vert',
    titre: 'Transparence',
    texte: 'Des résultats clairs et compréhensibles.',
  },
];

const STATISTIQUES = [
  { prefixe: '+', valeur: 100, libelle: 'Organisations accompagnées' },
  { valeur: 87, libelle: 'Critères intégrés' },
  { valeur: 3, libelle: 'Continents' },
  { valeur: 1, libelle: 'Même ambition' },
];

const BENEFICES = [
  {
    icone: Leaf,
    ton: 'vert',
    titre: 'Une vision structurée',
    texte: 'Comprenez votre niveau de maturité RSE et ESG en un coup d’œil.',
  },
  {
    icone: Target,
    ton: 'rouge',
    titre: 'Des écarts identifiés',
    texte: 'Repérez les domaines nécessitant une attention particulière.',
  },
  {
    icone: Users,
    ton: 'bleu',
    titre: 'Des priorités claires',
    texte: 'Concentrez vos efforts là où ils génèrent le plus de valeur.',
  },
  {
    icone: BarChart3,
    ton: 'violet',
    titre: 'Une amélioration continue',
    texte: 'Suivez l’évolution de votre démarche dans le temps.',
  },
];

export default function Accueil() {
  const [videoOuverte, definirVideoOuverte] = useState(false);

  return (
    <div>
      {/* ----------------------------------------------------------- Héros */}
      <section className="relative overflow-hidden">
        <span
          className="pointer-events-none absolute -left-32 -top-24 h-80 w-80 rounded-full bg-brand-100/50 blur-3xl dark:bg-brand-500/10"
          aria-hidden
        />
        <span
          className="pointer-events-none absolute -right-24 top-32 h-96 w-96 rounded-full bg-emerald-100/50 blur-3xl dark:bg-emerald-500/10"
          aria-hidden
        />

        {/*
          Deux colonnes sur deux rangées : le texte puis les blocs de
          réassurance à gauche, l'aperçu produit à droite sur toute la hauteur.
          En une seule colonne (téléphone), l'ordre du DOM place l'aperçu entre
          les boutons et les blocs, comme sur la maquette.
        */}
        <div className="relative mx-auto grid max-w-[80rem] gap-10 px-5 py-12 lg:grid-cols-[1.1fr_0.9fr] lg:grid-rows-[auto_auto] lg:gap-x-10 lg:gap-y-10 lg:py-14">
          <div className="motion-safe:animate-apparition-bas lg:col-start-1 lg:row-start-1">
            <Etiquette filetDroit>Plateforme d’évaluation intelligente RSE &amp; ESG</Etiquette>

            <h1 className="mt-6 font-display text-[1.95rem] font-extrabold leading-[1.12] tracking-tight text-marine sm:text-[2.4rem] lg:text-[2.45rem] xl:text-[2.55rem]">
              Évaluez et optimisez
              <br />
              la maturité et la performance
              <br />
              <span className="text-brand-600">RSE et ESG de votre entreprise.</span>
            </h1>

            <p className="mt-5 max-w-xl text-base leading-[1.55] text-ink-600">
              Avec {SMARTEX.produit}, évaluer et optimiser la démarche de maturité et la performance de votre entreprise
              en matière de bonnes pratiques RSE et ESG en s’appuyant sur l’intelligence artificielle.
            </p>

            <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-center">
              <Link
                to="/inscription"
                className="group inline-flex items-center justify-center gap-2.5 rounded-lg bg-brand-600 px-10 py-3 text-sm font-semibold text-white shadow-glow transition duration-300 hover:bg-brand-700 motion-safe:hover:-translate-y-0.5"
              >
                Créer un compte
                <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" aria-hidden />
              </Link>

              <button
                type="button"
                onClick={() => definirVideoOuverte(true)}
                className="group inline-flex items-center justify-center gap-2.5 rounded-lg border border-brand-300 bg-surface px-8 py-3 text-sm font-semibold text-brand-600 transition duration-300 hover:border-brand-500 hover:bg-brand-50 motion-safe:hover:-translate-y-0.5 dark:border-brand-500/50 dark:text-brand-400 dark:hover:bg-brand-500/10"
              >
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-brand-600 text-white">
                  <Play className="h-2.5 w-2.5 fill-current" aria-hidden />
                </span>
                Découvrir {SMARTEX.produit}
              </button>
            </div>
          </div>

          {/*
            Aperçu du produit, encadré des deux annotations manuscrites de la
            maquette. Elles restent dans le flux plutôt qu'en position absolue :
            posées par-dessus, elles recouvraient l'en-tête du tableau de bord.
          */}
          <Revele delai={120} className="lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:self-center">
            <p className="mb-5 ml-auto hidden w-56 rotate-[-3deg] text-right font-titre text-[0.95rem] font-semibold italic leading-snug text-marine xl:block">
              Des organisations plus responsables pour un monde plus prospère.
              <TraitManuscrit className="ml-auto mt-1 h-2 w-28 text-brand-500" />
            </p>

            <MaquetteTableauBord />

            <p className="ml-auto mt-6 hidden w-40 rotate-[2deg] text-right font-titre text-[0.9rem] font-semibold italic leading-snug text-marine xl:block">
              Chaque décision compte.
              <TraitManuscrit className="ml-auto mt-1 h-2 w-24 text-brand-500" />
            </p>
          </Revele>

          {/* Blocs de réassurance, sous les appels à l'action */}
          <div className="grid gap-10 sm:grid-cols-3 sm:gap-0 sm:divide-x sm:divide-ink-100 lg:col-start-1 lg:row-start-2">
            {REASSURANCE.map((bloc, index) => (
              <Revele
                key={bloc.titre}
                delai={index * 110}
                className={index === 0 ? 'sm:pr-7' : index === 2 ? 'sm:pl-7' : 'sm:px-7'}
              >
                <span
                  className={`inline-flex h-14 w-14 items-center justify-center rounded-full ${PASTELS[bloc.ton]}`}
                >
                  <bloc.icone className="h-6 w-6" aria-hidden />
                </span>
                <h2 className="mt-4 font-display text-base font-bold text-marine">{bloc.titre}</h2>
                <p className="mt-2 text-[13px] leading-snug text-ink-500">{bloc.texte}</p>
              </Revele>
            ))}
          </div>
        </div>
      </section>

      <SectionOrganisations />

      <SectionMethodologie />

      {/* ------------------------------------------ Pourquoi Smartex SustWay */}
      <section className="mx-auto max-w-[80rem] px-5 py-10">
        <div className="grid gap-12 lg:grid-cols-[1.5fr_1fr] lg:gap-10">
          <div>
            <Revele>
              <Etiquette>Pourquoi {SMARTEX.produit} ?</Etiquette>
              <h2 className="mt-4 max-w-2xl font-display text-2xl font-extrabold tracking-tight text-marine sm:text-[1.6rem]">
                Comprendre votre niveau de maturité pour mieux progresser.
              </h2>
            </Revele>

            <div className="mt-10 grid gap-10 sm:grid-cols-2 lg:grid-cols-4 lg:gap-0 lg:divide-x lg:divide-ink-100">
              {BENEFICES.map((benefice, index) => (
                <Revele
                  key={benefice.titre}
                  delai={index * 100}
                  className={index === 0 ? 'lg:pr-6' : index === 3 ? 'lg:pl-6' : 'lg:px-6'}
                >
                  <span
                    className={`inline-flex h-10 w-10 items-center justify-center rounded-full ${PASTELS[benefice.ton]}`}
                  >
                    <benefice.icone className="h-5 w-5" aria-hidden />
                  </span>
                  <h3 className="mt-4 font-display text-[0.95rem] font-bold leading-snug text-marine">
                    {benefice.titre}
                  </h3>
                  <p className="mt-2 text-[13px] leading-snug text-ink-500">{benefice.texte}</p>
                </Revele>
              ))}
            </div>
          </div>

          {/* Appel à l'action de fin de page */}
          <Revele delai={140}>
            {/* Texte à gauche, panneau végétal à droite sur toute la hauteur —
                disposition de la maquette. En dessous de `sm`, la carte n'est
                plus assez large pour deux colonnes : elle s'empile. */}
            <div className="flex h-full flex-col overflow-hidden rounded-3xl border border-ink-100 bg-surface shadow-soft sm:flex-row">
              <div className="flex flex-1 flex-col justify-center p-5">
                <h2 className="font-display text-[1.05rem] font-extrabold leading-snug text-marine xl:text-lg">
                  Bâtissons ensemble une organisation plus durable, éthique et responsable.
                </h2>
                <p className="mt-3 text-[0.8rem] leading-snug text-ink-500">
                  {SMARTEX.produit} vous accompagne dans votre démarche RSE et ESG grâce à des données fiables et une
                  analyse intelligente.
                </p>
                <Link
                  to="/inscription"
                  className="group mt-5 inline-flex w-fit items-center gap-2 rounded-lg bg-brand-600 px-5 py-2.5 text-[0.82rem] font-semibold text-white shadow-glow transition duration-300 hover:bg-brand-700 motion-safe:hover:-translate-y-0.5"
                >
                  Créer un compte
                  <ArrowRight
                    className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1"
                    aria-hidden
                  />
                </Link>
              </div>

              {/*
                Panneau végétal dessiné plutôt que photographié : aucune image de
                feuillage n'existe dans `src/assets`, et les photos disponibles
                montrent des scènes de bureau sans rapport avec le propos. Pour
                le remplacer par une vraie photo, poser un <img> en couverture
                de ce bloc et garder l'annotation par-dessus.
              */}
              <div className="relative min-h-[13rem] shrink-0 overflow-hidden bg-gradient-to-br from-emerald-600 via-emerald-700 to-emerald-900 sm:min-h-0 sm:w-[40%]">
                <Leaf
                  className="absolute -left-8 -top-8 h-44 w-44 rotate-12 text-white/10"
                  strokeWidth={1}
                  aria-hidden
                />
                <Leaf
                  className="absolute -bottom-12 -right-6 h-48 w-48 -rotate-12 text-white/10"
                  strokeWidth={1}
                  aria-hidden
                />
                <span className="absolute right-8 top-7 h-2 w-2 rounded-full bg-white/40" aria-hidden />
                <span className="absolute right-14 top-14 h-1.5 w-1.5 rounded-full bg-white/30" aria-hidden />

                <p className="absolute bottom-5 left-5 right-5 font-titre text-[0.85rem] font-semibold italic leading-snug text-white">
                  Un impact durable commence par une meilleure compréhension.
                  <TraitManuscrit className="mt-1.5 h-2 w-20 text-white/70" />
                </p>
              </div>
            </div>
          </Revele>
        </div>
      </section>

      {/* -------------------------------------------- Bandeau de statistiques */}
      <section className="bg-gradient-to-r from-brand-800 via-brand-700 to-brand-700 text-white">
        <div className="mx-auto flex max-w-[80rem] flex-col gap-8 px-5 py-6 lg:flex-row lg:items-center lg:gap-10">
          <div className="flex items-center gap-5 lg:w-80 lg:shrink-0">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white">
              <Leaf className="h-6 w-6 text-brand-600" strokeWidth={2.2} aria-hidden />
            </span>
            <h2 className="font-display text-[15px] font-bold leading-snug">
              La durabilité n’est pas une option, c’est une opportunité.
            </h2>
          </div>

          <ul className="grid flex-1 grid-cols-2 gap-6 sm:grid-cols-4 sm:gap-0 sm:divide-x sm:divide-white/20 lg:border-l lg:border-white/20">
            {STATISTIQUES.map((statistique) => (
              <li key={statistique.libelle} className="px-3 text-center sm:px-5">
                <p className="font-display text-[1.75rem] font-extrabold leading-none">
                  {statistique.prefixe}
                  <CompteurAnime valeur={statistique.valeur} />
                </p>
                <p className="mt-1.5 text-[11px] leading-snug text-white/80">{statistique.libelle}</p>
              </li>
            ))}
          </ul>

          <Link
            to="/contact"
            className="group inline-flex shrink-0 items-center justify-center gap-2.5 rounded-lg bg-white px-6 py-2.5 text-sm font-semibold text-brand-700 shadow-lg transition duration-300 hover:bg-brand-50 motion-safe:hover:-translate-y-0.5 lg:ml-2"
          >
            Demander une démonstration
            <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" aria-hidden />
          </Link>
        </div>
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

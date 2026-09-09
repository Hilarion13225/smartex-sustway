import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Activity,
  ArrowRight,
  BarChart3,
  Building2,
  Check,
  ClipboardCheck,
  FileText,
  Landmark,
  Layers,
  Leaf,
  Play,
  Users,
} from 'lucide-react';
import Revele from '../components/Revele';
import ModaleVideo from '../components/ModaleVideo';
import MaquetteTableauBord from '../components/MaquetteTableauBord';
import CompteurAnime from '../components/CompteurAnime';
import { Etiquette, PASTELS, TraitManuscrit } from '../components/vitrine/communs';
import { SMARTEX } from '../config/smartex';
import photoEntreprises from '../assets/formation/banques.jpg';
import photoInstitutions from '../assets/institutions.jpg';
import photoOng from '../assets/ong.jpg';
import photoBailleurs from '../assets/methodologie/engagement-banniere.jpg';

const GARANTIES = ['Simple à utiliser', 'Sécurisée', 'Adaptée à tous les secteurs'];

/*
 * Cartes de fonctionnalités : la teinte du fond suit celle de la pastille,
 * d'où ce couple de classes par carte plutôt que la seule table PASTELS.
 */
const FONCTIONNALITES = [
  {
    icone: FileText,
    fond: 'bg-rose-50/70 border-rose-100 dark:bg-rose-500/[0.07] dark:border-rose-500/20',
    ton: 'rouge',
    titre: 'Évaluation complète',
    texte: 'Des questionnaires adaptés à votre secteur et à votre contexte.',
  },
  {
    icone: BarChart3,
    fond: 'bg-blue-50/70 border-blue-100 dark:bg-blue-500/[0.07] dark:border-blue-500/20',
    ton: 'bleu',
    titre: 'Analyses intelligentes',
    texte: 'Des insights fiables grâce à l’IA.',
  },
  {
    icone: ClipboardCheck,
    fond: 'bg-emerald-50/70 border-emerald-100 dark:bg-emerald-500/[0.07] dark:border-emerald-500/20',
    ton: 'vert',
    titre: 'Plans d’actions personnalisés',
    texte: 'Des recommandations concrètes et priorisées.',
  },
  {
    icone: Activity,
    fond: 'bg-amber-50/70 border-amber-100 dark:bg-amber-500/[0.07] dark:border-amber-500/20',
    ton: 'orange',
    titre: 'Suivi en temps réel',
    texte: 'Des tableaux de bord clairs et des rapports détaillés.',
  },
];

const PUBLICS = [
  {
    icone: Building2,
    ton: 'bleu',
    photo: photoEntreprises,
    titre: 'Entreprises',
    texte: 'Pilotez et valorisez votre démarche RSE.',
  },
  {
    icone: Landmark,
    ton: 'violet',
    photo: photoInstitutions,
    titre: 'Institutions publiques',
    texte: 'Renforcez la transparence et la performance.',
  },
  {
    icone: Leaf,
    ton: 'vert',
    photo: photoOng,
    titre: 'ONG & Associations',
    texte: 'Mesurez votre impact et structurez vos actions.',
  },
  {
    icone: Users,
    ton: 'orange',
    photo: photoBailleurs,
    titre: 'Bailleurs & Partenaires',
    texte: 'Appuyez des initiatives à fort impact.',
  },
];

/*
 * Le dernier indicateur est qualitatif : `valeur: null` évite d'inventer un
 * chiffre pour faire symétrique, et il s'affiche alors comme une mention.
 */
const INDICATEURS = [
  { icone: Users, ton: 'rouge', prefixe: '+', valeur: 100, libelle: 'organisations accompagnées' },
  { icone: Layers, ton: 'vert', valeur: 6, libelle: 'domaines d’évaluation' },
  { icone: FileText, ton: 'bleu', valeur: 87, libelle: 'critères intégrés' },
  { icone: BarChart3, ton: 'vert', valeur: null, mention: 'Des actions', libelle: 'à fort impact' },
];

export default function Services() {
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
          className="pointer-events-none absolute -right-24 top-24 h-96 w-96 rounded-full bg-emerald-100/50 blur-3xl dark:bg-emerald-500/10"
          aria-hidden
        />

        <div className="relative mx-auto grid max-w-[80rem] items-center gap-12 px-5 py-14 lg:grid-cols-[1.02fr_0.98fr] lg:gap-10 lg:py-16">
          <div className="motion-safe:animate-apparition-bas">
            <Etiquette>Notre solution</Etiquette>

            <h1 className="mt-5 font-display text-[1.95rem] font-extrabold leading-[1.14] tracking-tight text-marine sm:text-[2.4rem] lg:text-[2.45rem] xl:text-[2.6rem]">
              Une plateforme complète
              <br />
              pour <span className="text-brand-600">piloter votre démarche</span>
              <br />
              <span className="text-brand-600">RSE et ESG.</span>
            </h1>

            <p className="mt-5 max-w-xl text-base leading-[1.6] text-ink-600">
              {SMARTEX.produit} vous offre une solution digitale tout-en-un pour évaluer, documenter, analyser et
              améliorer vos pratiques RSE, ESG et Développement Durable.
            </p>

            <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-center">
              <Link
                to="/inscription"
                className="group inline-flex items-center justify-center gap-2.5 rounded-lg bg-brand-600 px-10 py-3.5 text-sm font-semibold text-white shadow-glow transition duration-300 hover:bg-brand-700 motion-safe:hover:-translate-y-0.5"
              >
                Créer un compte
                <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" aria-hidden />
              </Link>

              <button
                type="button"
                onClick={() => definirVideoOuverte(true)}
                className="group inline-flex items-center justify-center gap-2.5 rounded-lg border border-brand-300 bg-surface px-8 py-3.5 text-sm font-semibold text-brand-600 transition duration-300 hover:border-brand-500 hover:bg-brand-50 motion-safe:hover:-translate-y-0.5 dark:border-brand-500/50 dark:text-brand-400 dark:hover:bg-brand-500/10"
              >
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-brand-600 text-white">
                  <Play className="h-2.5 w-2.5 fill-current" aria-hidden />
                </span>
                Voir la démonstration
              </button>
            </div>

            <ul className="mt-8 flex flex-wrap items-center gap-x-9 gap-y-4">
              {GARANTIES.map((garantie, index) => (
                <Revele key={garantie} delai={index * 110} as="li" className="flex items-center gap-2.5">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-300">
                    <Check className="h-3 w-3" strokeWidth={3} aria-hidden />
                  </span>
                  <span className="text-sm font-medium text-ink-700">{garantie}</span>
                </Revele>
              ))}
            </ul>
          </div>

          <Revele delai={140} className="relative">
            <MaquetteTableauBord />

            {/* Pense-bête de la maquette : carte blanche légèrement inclinée. */}
            <p className="ml-auto mt-6 hidden w-48 rotate-[3deg] rounded-xl border border-ink-100 bg-surface p-4 font-titre text-[0.9rem] font-semibold italic leading-snug text-marine shadow-soft xl:block">
              Des données fiables pour des décisions éclairées.
              <TraitManuscrit className="mt-1.5 h-2 w-20 text-brand-500" />
            </p>
          </Revele>
        </div>
      </section>

      {/* --------------------------------------------- Quatre fonctionnalités */}
      <section className="mx-auto max-w-[80rem] px-5 pb-16">
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {FONCTIONNALITES.map((fonctionnalite, index) => (
            <Revele key={fonctionnalite.titre} delai={index * 100}>
              <article
                className={`flex h-full flex-col items-center rounded-2xl border px-6 py-8 text-center transition duration-300 motion-safe:hover:-translate-y-1 hover:shadow-soft ${fonctionnalite.fond}`}
              >
                <span
                  className={`inline-flex h-14 w-14 items-center justify-center rounded-2xl ${PASTELS[fonctionnalite.ton]}`}
                >
                  <fonctionnalite.icone className="h-6 w-6" aria-hidden />
                </span>
                <h2 className="mt-5 font-display text-[0.95rem] font-bold leading-snug text-marine">
                  {fonctionnalite.titre}
                </h2>
                <p className="mt-2.5 text-[13px] leading-relaxed text-ink-500">{fonctionnalite.texte}</p>
              </article>
            </Revele>
          ))}
        </div>
      </section>

      {/* --------------------------------------- Types d'organisations */}
      <section className="mx-auto max-w-[80rem] px-5 pb-16">
        <div className="grid gap-12 lg:grid-cols-[0.88fr_1.12fr] lg:gap-10">
          <Revele className="lg:self-center">
            <Etiquette>Une solution pour tous les types d’organisations</Etiquette>

            <h2 className="mt-4 font-display text-2xl font-extrabold leading-snug tracking-tight text-marine sm:text-[1.7rem]">
              Quel que soit votre secteur, {SMARTEX.produit} s’adapte{' '}
              <span className="text-brand-600">à vos besoins.</span>
            </h2>

            <p className="mt-5 max-w-md text-sm leading-[1.7] text-ink-500">
              Entreprises, institutions publiques, ONG ou associations, notre solution vous accompagne dans l’évaluation
              et l’amélioration de votre performance RSE et ESG.
            </p>

            <Link
              to="/avantages"
              className="group mt-8 inline-flex items-center gap-2.5 rounded-lg border border-brand-300 bg-surface px-6 py-3 text-sm font-semibold text-brand-600 transition duration-300 hover:border-brand-500 hover:bg-brand-50 motion-safe:hover:-translate-y-0.5 dark:border-brand-500/50 dark:text-brand-400 dark:hover:bg-brand-500/10"
            >
              Découvrir tous les avantages
              <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" aria-hidden />
            </Link>
          </Revele>

          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
            {PUBLICS.map((publicCible, index) => (
              <Revele key={publicCible.titre} delai={index * 100}>
                <article className="group h-full overflow-hidden rounded-2xl border border-ink-100 bg-surface shadow-sm transition duration-300 hover:border-brand-200 hover:shadow-soft motion-safe:hover:-translate-y-1">
                  <img
                    src={publicCible.photo}
                    alt=""
                    aria-hidden
                    className="h-28 w-full object-cover"
                    loading="lazy"
                  />
                  {/* La pastille chevauche la limite image / contenu. */}
                  <div className="px-5 pb-6">
                    <span
                      className={`-mt-5 inline-flex h-10 w-10 items-center justify-center rounded-xl ring-4 ring-surface ${PASTELS[publicCible.ton]}`}
                    >
                      <publicCible.icone className="h-5 w-5" aria-hidden />
                    </span>
                    <h3 className="mt-3.5 font-display text-[0.9rem] font-bold leading-snug text-marine">
                      {publicCible.titre}
                    </h3>
                    <p className="mt-2 text-[13px] leading-snug text-ink-500">{publicCible.texte}</p>
                  </div>
                </article>
              </Revele>
            ))}
          </div>
        </div>
      </section>

      {/* ------------------------------------------------- Indicateurs */}
      <section className="border-y border-ink-100 bg-ink-50 py-10 dark:bg-ink-100/40">
        <div className="mx-auto flex max-w-[80rem] flex-col gap-10 px-5 lg:flex-row lg:items-center lg:gap-12">
          <Revele className="shrink-0 lg:w-72">
            <Etiquette>Des résultats concrets</Etiquette>
            <h2 className="mt-3 font-display text-xl font-extrabold tracking-tight text-marine sm:text-[1.4rem]">
              Ils nous font confiance.
            </h2>
          </Revele>

          <ul className="grid flex-1 gap-8 sm:grid-cols-2 lg:grid-cols-4 lg:gap-0 lg:divide-x lg:divide-ink-200/70">
            {INDICATEURS.map((indicateur, index) => (
              <Revele key={indicateur.libelle} delai={index * 110} as="li" className="lg:px-6">
                <div className="flex items-center gap-4">
                  <span
                    className={`inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full ${PASTELS[indicateur.ton]}`}
                  >
                    <indicateur.icone className="h-5 w-5" aria-hidden />
                  </span>

                  <div className="min-w-0">
                    {indicateur.valeur === null ? (
                      <p className="font-display text-base font-extrabold leading-tight text-marine">
                        {indicateur.mention}
                      </p>
                    ) : (
                      <p className="font-display text-[1.6rem] font-extrabold leading-none text-marine">
                        {indicateur.prefixe}
                        <CompteurAnime valeur={indicateur.valeur} />
                      </p>
                    )}
                    <p className="mt-1 text-[13px] leading-snug text-ink-500">{indicateur.libelle}</p>
                  </div>
                </div>
              </Revele>
            ))}
          </ul>
        </div>
      </section>

      {/* --------------------------------------------------- Appel final */}
      <section className="bg-gradient-to-r from-brand-800 via-brand-700 to-brand-700 text-white">
        <Revele className="mx-auto flex max-w-[80rem] flex-col items-center gap-7 px-5 py-10 text-center lg:flex-row lg:items-center lg:gap-8 lg:text-left">
          <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-white shadow-lg">
            <Leaf className="h-8 w-8 text-brand-600" strokeWidth={2.2} aria-hidden />
          </span>

          <div className="flex-1">
            <h2 className="font-display text-xl font-extrabold leading-snug sm:text-[1.5rem]">
              Prêt à évaluer votre organisation ?
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-white/85">
              Rejoignez les organisations qui construisent un avenir plus durable avec {SMARTEX.produit}.
            </p>
          </div>

          <Link
            to="/inscription"
            className="group inline-flex shrink-0 items-center justify-center gap-2.5 rounded-lg bg-white px-8 py-3.5 text-sm font-semibold text-brand-700 shadow-lg transition duration-300 hover:bg-brand-50 motion-safe:hover:-translate-y-0.5"
          >
            Créer un compte
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

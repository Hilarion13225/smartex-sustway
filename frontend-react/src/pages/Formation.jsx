import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Award,
  Banknote,
  Building2,
  Clock,
  Factory,
  Fuel,
  GraduationCap,
  HeartPulse,
  Landmark,
  Leaf,
  Mic2,
  Monitor,
  Newspaper,
  Palmtree,
  Pickaxe,
  Presentation,
  Radio,
  ShoppingBag,
  ShoppingCart,
  Sparkles,
  Users,
  Wrench,
  Zap,
} from 'lucide-react';
import Revele from '../components/Revele';
import CompteurAnime from '../components/CompteurAnime';
import { Etiquette, PASTELS, TraitManuscrit } from '../components/vitrine/communs';
import { SMARTEX } from '../config/smartex';
import photoBanniere from '../assets/formation/banniere.jpg';
import photoActuGenerale from '../assets/formation/actu-generale.jpg';
import photoBtp from '../assets/formation/btp.jpg';
import photoTourisme from '../assets/formation/tourisme.jpg';
import photoPetrole from '../assets/formation/petrole.jpg';
import photoMines from '../assets/formation/mines.jpg';
import photoProductionElec from '../assets/formation/production-elec.jpg';
import photoAgro from '../assets/formation/agro.jpg';
import photoTelecom from '../assets/formation/telecom.jpg';
import photoBanques from '../assets/formation/banques.jpg';
import photoDistribution from '../assets/formation/distribution.jpg';

/** Ce que le visiteur retient du héros, avant même de faire défiler. */
const REASSURANCE = [
  { icone: Wrench, ton: 'rouge', titre: 'Formations pratiques', texte: 'Des cas concrets tirés de votre secteur.' },
  { icone: Users, ton: 'bleu', titre: 'Experts reconnus', texte: 'Animées par les consultants Smartex.' },
  { icone: Award, ton: 'vert', titre: 'Attestation', texte: 'Remise à l’issue de chaque parcours.' },
];

const FORMATS = [
  { icone: Wrench, ton: 'rouge', titre: 'Ateliers pratiques', texte: 'Mise en situation directe sur des cas concrets liés à votre secteur d’activité.' },
  { icone: GraduationCap, ton: 'bleu', titre: 'Cours de maître', texte: 'Sessions animées par des experts reconnus sur un sujet RSE/DD précis.' },
  { icone: Presentation, ton: 'vert', titre: 'Séminaires de formation', texte: 'Programme structuré sur plusieurs sessions, avec supports et évaluation.' },
  { icone: Mic2, ton: 'orange', titre: 'Conférences — débats', texte: 'Temps d’échange sur les grands enjeux RSE et développement durable.' },
  { icone: Building2, ton: 'violet', titre: 'Réunions entreprises', texte: 'Format dédié à une organisation, adapté à son contexte et ses équipes.' },
  { icone: Users, ton: 'rouge', titre: 'Activités intervenants', texte: `Intervention d’experts ${SMARTEX.editeur} directement dans vos équipes.` },
];

const SECTEURS = [
  { icone: Newspaper, nom: 'Actualités générales', photo: photoActuGenerale },
  { icone: Building2, nom: 'BTP', photo: photoBtp },
  { icone: Palmtree, nom: 'Tourisme & Hôtellerie', photo: photoTourisme },
  { icone: Pickaxe, nom: 'Mines', photo: photoMines },
  { icone: Fuel, nom: 'Pétrole', photo: photoPetrole },
  { icone: Zap, nom: 'Production électrique', photo: photoProductionElec },
  { icone: Factory, nom: 'Agro-industrie', photo: photoAgro },
  { icone: Radio, nom: 'Télécom', photo: photoTelecom },
  { icone: Landmark, nom: 'Banques & Assurances', photo: photoBanques },
  { icone: ShoppingBag, nom: 'Grande distribution', photo: photoDistribution },
];

const CERTIFICATS = [
  {
    icone: Banknote,
    titre: 'Finance durable — Finance verte — ISR',
    texte: 'Investissement socialement responsable, critères ESG, finance verte, obligations vertes, microfinance et impact investing.',
  },
  {
    icone: Leaf,
    titre: 'Politique et stratégie sectorielles de RSE',
    texte: 'Bonnes pratiques RSE, déploiement opérationnel, reporting extra-financier et référentiels de normalisation.',
  },
  {
    icone: Sparkles,
    titre: 'Management environnemental',
    texte: 'Défis environnementaux, systèmes de management environnemental (SME) et certification ISO 14001.',
  },
  {
    icone: ShoppingCart,
    titre: 'Management durable et responsable des achats',
    texte: 'Risques liés aux achats, référentiels normatifs et stratégies d’achats responsables.',
  },
  {
    icone: HeartPulse,
    titre: 'Management de la Santé-Sécurité et Qualité de vie au travail',
    texte: 'Bien-être salarié, normes OHSAS/ISO 45001 et prévention des risques professionnels.',
  },
];

/** Les repères chiffrés du parcours certifiant, tels qu'ils existaient déjà. */
const REPERES_CERTIFICAT = [
  { icone: Clock, valeur: 120, suffixe: ' h', libelle: 'par certificat' },
  { icone: Presentation, valeur: 6, suffixe: '', libelle: 'modules' },
  { icone: Award, valeur: 5, suffixe: '', libelle: 'certificats' },
];

export default function Formation() {
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
            <Etiquette filetDroit>Nos formations</Etiquette>

            <h1 className="mt-6 font-display text-[1.95rem] font-extrabold leading-[1.12] tracking-tight text-marine sm:text-[2.4rem] lg:text-[2.45rem] xl:text-[2.55rem]">
              Développez vos compétences
              <br />
              <span className="text-brand-600">en RSE et ESG.</span>
            </h1>

            <p className="mt-5 max-w-xl text-base leading-[1.55] text-ink-600">
              Ateliers, séminaires, conférences et certificats de spécialisation : des formations pratiques pour monter
              en compétence et passer de la théorie à l’action.
            </p>

            <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-center">
              <a
                href="#thematiques"
                className="group inline-flex items-center justify-center gap-2.5 rounded-lg bg-brand-600 px-10 py-3 text-sm font-semibold text-white shadow-glow transition duration-300 hover:bg-brand-700 motion-safe:hover:-translate-y-0.5"
              >
                Voir les formations
                <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" aria-hidden />
              </a>

              <Link
                to="/contact"
                className="inline-flex items-center justify-center gap-2.5 rounded-lg border border-brand-300 bg-surface px-8 py-3 text-sm font-semibold text-brand-600 transition duration-300 hover:border-brand-500 hover:bg-brand-50 motion-safe:hover:-translate-y-0.5 dark:border-brand-500/50 dark:text-brand-400 dark:hover:bg-brand-500/10"
              >
                Nous contacter
              </Link>
            </div>

            <ul className="mt-10 grid gap-x-6 gap-y-5 sm:grid-cols-3">
              {REASSURANCE.map((bloc, index) => (
                <Revele key={bloc.titre} delai={index * 110} as="li">
                  <span className={`inline-flex h-11 w-11 items-center justify-center rounded-xl ${PASTELS[bloc.ton]}`}>
                    <bloc.icone className="h-5 w-5" aria-hidden />
                  </span>
                  <span className="mt-3 block font-display text-[13px] font-bold leading-snug text-marine">
                    {bloc.titre}
                  </span>
                  <span className="mt-1 block text-[12px] leading-snug text-ink-500">{bloc.texte}</span>
                </Revele>
              ))}
            </ul>
          </div>

          <Revele delai={120} className="relative">
            <p className="mb-4 ml-auto hidden w-48 rotate-[-3deg] text-right font-titre text-[0.95rem] font-semibold italic leading-snug text-marine xl:block">
              Se former pour un impact durable.
              <TraitManuscrit className="ml-auto mt-1 h-2 w-24 text-brand-500" />
            </p>

            <div className="overflow-hidden rounded-2xl shadow-soft">
              <img
                src={photoBanniere}
                alt="Session de formation en salle, à Abidjan"
                className="h-64 w-full object-cover sm:h-80"
                loading="lazy"
              />
            </div>
          </Revele>
        </div>
      </section>

      {/* ------------------------------------------------------ Nos formats */}
      <section className="border-y border-ink-100 bg-ink-50/60 dark:bg-ink-100/30">
        <div className="mx-auto max-w-[80rem] px-5 py-14">
          <Revele>
            <Etiquette>Nos formats</Etiquette>
            <h2 className="mt-4 max-w-2xl font-display text-2xl font-extrabold leading-tight tracking-tight text-marine sm:text-[1.9rem]">
              Six formats, un même niveau d’exigence.
            </h2>
          </Revele>

          <ul className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {FORMATS.map((format, index) => (
              <Revele
                key={format.titre}
                delai={index * 80}
                as="li"
                className="rounded-2xl border border-ink-100 bg-surface p-6 shadow-sm transition duration-300 hover:shadow-soft motion-safe:hover:-translate-y-1"
              >
                <span className={`inline-flex h-11 w-11 items-center justify-center rounded-xl ${PASTELS[format.ton]}`}>
                  <format.icone className="h-5 w-5" aria-hidden />
                </span>
                <h3 className="mt-4 font-display text-[15px] font-bold leading-snug text-marine">{format.titre}</h3>
                <p className="mt-2.5 text-[13px] leading-relaxed text-ink-500">{format.texte}</p>
              </Revele>
            ))}
          </ul>
        </div>
      </section>

      {/* -------------------------------------------------- Nos thématiques */}
      <section id="thematiques" className="mx-auto max-w-[80rem] scroll-mt-24 px-5 py-14">
        <Revele className="text-center">
          <Etiquette filetDroit>Nos thématiques de formation</Etiquette>
          <h2 className="mx-auto mt-4 max-w-2xl font-display text-2xl font-extrabold leading-tight tracking-tight text-marine sm:text-[1.9rem]">
            Des contenus adaptés à votre activité.
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-base leading-[1.6] text-ink-600">
            Les enjeux RSE d’une banque ne sont pas ceux d’une mine. Chaque thématique part des réalités de votre
            secteur.
          </p>
        </Revele>

        <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {SECTEURS.map((secteur, index) => (
            <Revele key={secteur.nom} delai={index * 50} as="li">
              <article className="group relative h-40 overflow-hidden rounded-2xl shadow-sm transition duration-300 hover:shadow-soft motion-safe:hover:-translate-y-1">
                <img
                  src={secteur.photo}
                  alt=""
                  aria-hidden
                  loading="lazy"
                  className="h-full w-full object-cover transition duration-700 group-hover:scale-110"
                />
                <span
                  className="absolute inset-0 bg-gradient-to-t from-[#141821]/90 via-[#141821]/30 to-transparent"
                  aria-hidden
                />
                <div className="absolute inset-x-0 bottom-0 flex items-center gap-2.5 p-4 text-white">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/15 backdrop-blur transition-colors duration-300 group-hover:bg-brand-600">
                    <secteur.icone className="h-4 w-4" aria-hidden />
                  </span>
                  <h3 className="min-w-0 font-display text-[13px] font-bold leading-snug">{secteur.nom}</h3>
                </div>
              </article>
            </Revele>
          ))}
        </ul>
      </section>

      {/* -------------------------------------------------- Les certificats */}
      <section className="border-y border-ink-100 bg-ink-50/60 dark:bg-ink-100/30">
        <div className="mx-auto grid max-w-[80rem] gap-10 px-5 py-14 lg:grid-cols-[0.8fr_1.2fr] lg:gap-14">
          <Revele className="min-w-0">
            <Etiquette>Certificats de spécialisation</Etiquette>
            <h2 className="mt-4 font-display text-2xl font-extrabold leading-tight tracking-tight text-marine sm:text-[1.9rem]">
              Se professionnaliser en profondeur.
            </h2>
            <p className="mt-5 text-base leading-[1.6] text-ink-600">
              Cinq parcours certifiants, en présentiel ou en visioconférence, pour aller au-delà de la sensibilisation.
            </p>

            <ul className="mt-8 grid grid-cols-3 gap-4">
              {REPERES_CERTIFICAT.map((repere) => (
                <li key={repere.libelle} className="rounded-xl border border-ink-100 bg-surface p-4 text-center">
                  <repere.icone className="mx-auto h-4 w-4 text-brand-500 dark:text-brand-400" aria-hidden />
                  <p className="mt-2 font-display text-xl font-extrabold text-marine">
                    <CompteurAnime valeur={repere.valeur} suffixe={repere.suffixe} />
                  </p>
                  <p className="mt-0.5 text-[11px] leading-snug text-ink-500">{repere.libelle}</p>
                </li>
              ))}
            </ul>

            <dl className="mt-6 space-y-3 border-t border-ink-100 pt-6">
              <div className="flex items-center justify-between gap-4">
                <dt className="flex items-center gap-2 text-[13px] text-ink-500">
                  <Monitor className="h-4 w-4 text-brand-500 dark:text-brand-400" aria-hidden />
                  Modalités
                </dt>
                <dd className="text-[13px] font-semibold text-marine">Présentiel et visioconférence</dd>
              </div>
              <div className="flex items-center justify-between gap-4">
                <dt className="text-[13px] text-ink-500">Tarif par certificat</dt>
                <dd className="font-display text-xl font-extrabold text-brand-600 dark:text-brand-400">2 500 €</dd>
              </div>
            </dl>
          </Revele>

          <ol className="space-y-3">
            {CERTIFICATS.map((certificat, index) => (
              <Revele key={certificat.titre} delai={index * 80} as="li">
                <article className="group flex items-start gap-4 rounded-2xl border border-ink-100 bg-surface p-5 transition duration-300 hover:border-brand-200 hover:shadow-soft sm:gap-5 sm:p-6">
                  <span className="font-display text-lg font-extrabold leading-none text-brand-500/30 transition-colors duration-300 group-hover:text-brand-500 dark:text-brand-400/40">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <div className="min-w-0">
                    <h3 className="flex items-start gap-2.5 font-display text-[15px] font-bold leading-snug text-marine">
                      <certificat.icone
                        className="mt-0.5 h-4 w-4 shrink-0 text-brand-500 dark:text-brand-400"
                        aria-hidden
                      />
                      {certificat.titre}
                    </h3>
                    <p className="mt-2 text-[13px] leading-relaxed text-ink-500">{certificat.texte}</p>
                  </div>
                </article>
              </Revele>
            ))}
          </ol>
        </div>
      </section>

      {/* -------------------------------------- Investissez dans vos compétences */}
      <section className="mx-auto max-w-[80rem] px-5 py-14">
        <Revele>
          <div className="grid overflow-hidden rounded-2xl border border-ink-100 bg-surface shadow-soft lg:grid-cols-[1.1fr_0.9fr]">
            <div className="p-8 sm:p-10">
              <Etiquette>Passer à l’action</Etiquette>
              <h2 className="mt-4 font-display text-2xl font-extrabold leading-tight tracking-tight text-marine sm:text-[1.9rem]">
                Investissez dans vos compétences.
              </h2>
              <p className="mt-4 max-w-lg text-base leading-[1.6] text-ink-600">
                Consultez notre catalogue de formations et rejoignez notre prochaine session. Pour un programme dédié à
                vos équipes, décrivez-nous votre secteur et vos objectifs.
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
                <a
                  href="#thematiques"
                  className="group inline-flex items-center justify-center gap-2.5 rounded-lg bg-brand-600 px-8 py-3 text-sm font-semibold text-white shadow-glow transition duration-300 hover:bg-brand-700 motion-safe:hover:-translate-y-0.5"
                >
                  Voir les formations
                  <ArrowRight
                    className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1"
                    aria-hidden
                  />
                </a>
                <Link
                  to="/contact"
                  className="inline-flex items-center justify-center gap-2.5 rounded-lg border border-brand-300 bg-surface px-8 py-3 text-sm font-semibold text-brand-600 transition duration-300 hover:border-brand-500 hover:bg-brand-50 motion-safe:hover:-translate-y-0.5 dark:border-brand-500/50 dark:text-brand-400 dark:hover:bg-brand-500/10"
                >
                  Nous contacter
                </Link>
              </div>
            </div>

            <img
              src={photoActuGenerale}
              alt=""
              aria-hidden
              loading="lazy"
              className="h-48 w-full object-cover lg:h-auto"
            />
          </div>
        </Revele>
      </section>

      {/* --------------------------------------------------- Appel final */}
      <section className="bg-gradient-to-r from-brand-800 via-brand-700 to-brand-700 text-white">
        <Revele className="mx-auto flex max-w-[80rem] flex-col items-center gap-7 px-5 py-10 text-center lg:flex-row lg:gap-8 lg:text-left">
          <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-white shadow-lg">
            <GraduationCap className="h-8 w-8 text-brand-600" strokeWidth={2.2} aria-hidden />
          </span>

          <div className="flex-1">
            <h2 className="font-display text-xl font-extrabold leading-snug sm:text-[1.5rem]">
              Une formation sur mesure pour votre équipe ?
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-white/85">
              Décrivez votre secteur et vos objectifs : nous revenons vers vous avec un programme et des modalités
              d’inscription adaptés.
            </p>
          </div>

          <Link
            to="/contact"
            className="group inline-flex shrink-0 items-center justify-center gap-2.5 rounded-lg bg-white px-8 py-3.5 text-sm font-semibold text-brand-700 shadow-lg transition duration-300 hover:bg-brand-50 motion-safe:hover:-translate-y-0.5"
          >
            Nous contacter
            <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" aria-hidden />
          </Link>
        </Revele>
      </section>
    </div>
  );
}

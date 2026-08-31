import { Link } from 'react-router-dom';
import {
  ArrowRight,
  BadgeCheck,
  Bot,
  Building2,
  ClipboardCheck,
  FileSearch,
  Gauge,
  Leaf,
  LineChart,
  ShieldCheck,
  Sparkles,
  Target,
  Users,
} from 'lucide-react';
import { Badge } from '../components/ui';
import Revele from '../components/Revele';
import CompteurAnime from '../components/CompteurAnime';
import SectionFormules from '../components/SectionFormules';
import AppelAction from '../components/AppelAction';
import { SMARTEX } from '../config/smartex';
import Logo from '../components/Logo';

const ATOUTS = [
  {
    icone: Bot,
    titre: 'Pipeline IA multi-agents',
    texte:
      'Sept agents analysent les preuves déposées et estiment une probabilité de conformité par critère, plutôt qu’une note saisie à la main.',
  },
  {
    icone: Target,
    titre: 'Priorisation par le risque',
    texte: 'Le risque attendu croise la non-conformité probable et la criticité du critère, variable selon le secteur d’activité.',
  },
  {
    icone: ShieldCheck,
    titre: 'Revue experte ciblée',
    texte: 'En formule Avancées, tout critère évalué avec une confiance IA inférieure à 80 % part en file de revue humaine.',
  },
  {
    icone: Leaf,
    titre: 'Financements verts IFC/SFI',
    texte:
      'Un indice de préparation mesure l’alignement aux 8 Performance Standards du bailleur pilote — une mesure d’alignement, pas une garantie d’éligibilité.',
  },
];

/** Chiffres factuels du CDC (référentiel, agents) — pas des données de démonstration. */
const CHIFFRES = [
  { libelle: 'Critères du référentiel', valeur: 87, icone: ClipboardCheck },
  { libelle: 'Domaines évalués', valeur: 6, icone: Gauge },
  { libelle: 'Agents IA', valeur: 7, icone: Bot },
];

const ETAPES = [
  {
    titre: 'Étape 1 — Probabilité de conformité',
    icone: Bot,
    jauge: 78,
  },
  {
    titre: 'Étape 2 — Score pondéré Smartex',
    icone: LineChart,
    jauge: 64,
  },
  {
    titre: 'Étape 3 — Risque attendu et priorité',
    icone: Target,
    jauge: 41,
  },
  {
    titre: 'Étape complémentaire — Indice bailleur',
    texte: 'Même formule, restreinte aux critères tagués IFC/SFI. Réservée à la formule Avancées.',
    icone: Leaf,
    jauge: 55,
  },
];

const PARCOURS = [
  {
    icone: Building2,
    titre: 'Décrivez votre entreprise',
    texte: 'Secteur, taille et périmètre : le questionnaire ne retient que les critères réellement applicables.',
  },
  {
    icone: FileSearch,
    titre: 'Répondez, preuve à l’appui si possible',
    texte: 'Chaque critère se répond directement ; un document n’est pas obligatoire, mais une fois vérifié par l’IA, il certifie la véracité de votre réponse.',
  },
  {
    icone: Bot,
    titre: 'Laissez l’IA évaluer',
    texte: 'Les agents vérifient la cohérence entre réponse et preuve quand elle existe, puis produisent une probabilité de conformité, un niveau d’engagement et un indice de confiance.',
  },
  {
    icone: LineChart,
    titre: 'Pilotez vos actions',
    texte: 'Score pondéré, risques prioritaires et rapport exportable pour vos parties prenantes.',
  },
];

const DOMAINES = [
  'Gouvernance',
  'Droits humains',
  'Conditions de travail',
  'Environnement',
  'Loyauté des pratiques',
  'Consommateurs',
  'Communautés locales',
  'Financements verts',
];

export default function Accueil() {
  return (
    <div>
      {/* ---------------------------------------------------------------- Héros */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 bg-halo-brand" aria-hidden />
        <div
          className="pointer-events-none absolute inset-0 bg-grille-ink bg-grille [mask-image:radial-gradient(70%_60%_at_50%_0%,black,transparent)]"
          aria-hidden
        />
        <span
          className="pointer-events-none absolute -left-24 top-24 h-72 w-72 rounded-full bg-brand-300/30 blur-3xl motion-safe:animate-respiration"
          aria-hidden
        />
        <span
          className="pointer-events-none absolute -right-16 top-8 h-80 w-80 rounded-full bg-emerald-200/40 blur-3xl motion-safe:animate-respiration [animation-delay:2s]"
          aria-hidden
        />

        <div className="relative mx-auto grid max-w-[90rem] items-center gap-12 px-5 py-20 lg:grid-cols-[1.05fr_0.95fr] lg:py-24">
          <div className="motion-safe:animate-apparition-bas">
            <Badge ton="vert" icone={BadgeCheck}>
              Version 1.5 — volet financements verts intégré
            </Badge>
            <h1 className="mt-5 text-4xl font-semibold leading-[1.1] text-ink-900 sm:text-5xl lg:text-[3.4rem]">
              L’évaluation RSE,{' '}
              <span className="texte-degrade motion-safe:animate-degrade-anime">pilotée par l’intelligence artificielle</span>, de
              la preuve au rapport.
            </h1>
            <p className="mt-5 max-w-xl text-base leading-relaxed text-ink-600">
              {SMARTEX.produit} digitalise le cycle d’audit RSE : composition dynamique du questionnaire, analyse documentaire
              automatisée, probabilité de conformité par critère, priorisation des actions correctives et indice de préparation
              aux financements verts.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-2">
              <Link to="/inscription" className="btn-vitrine group px-4">
                Choisir une formule
                <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" aria-hidden />
              </Link>
              <Link to="/services" className="btn-vitrine-clair group px-4">
                Découvrir la méthode
              </Link>
              <Link to="/connexion" className="btn-vitrine-fantome group px-4">
                Se connecter
              </Link>
            </div>

            <dl className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-3">
              {CHIFFRES.map((stat, index) => (
                <Revele key={stat.libelle} delai={index * 120}>
                  <div className="group rounded-2xl border border-ink-100 bg-surface/80 px-4 py-4 shadow-soft backdrop-blur transition duration-300 hover:border-brand-200 motion-safe:hover:-translate-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <dt className="text-xs uppercase tracking-wide text-ink-500">{stat.libelle}</dt>
                      <stat.icone className="h-4 w-4 text-brand-500 transition-transform duration-300 group-hover:scale-110" aria-hidden />
                    </div>
                    <dd className="mt-2 text-3xl font-semibold text-brand-700">
                      <CompteurAnime valeur={stat.valeur} />
                    </dd>
                  </div>
                </Revele>
              ))}
            </dl>
          </div>

          {/* Carte moteur de scoring — jauges animées à l'apparition */}
          <Revele delai={150}>
            <div className="relative motion-safe:animate-flottement">
              <div className="carte-verre relative overflow-hidden p-6">
                <span
                  className="pointer-events-none absolute inset-x-0 -top-px h-px bg-gradient-to-r from-transparent via-brand-400 to-transparent"
                  aria-hidden
                />
                <div className="flex items-center justify-between gap-3">
                  <p className="flex items-center gap-2 text-sm font-semibold text-ink-900">
                    <Gauge className="h-4 w-4 text-brand-600" aria-hidden />
                    Moteur de scoring unifié
                  </p>
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="absolute inline-flex h-full w-full rounded-full bg-brand-500/70 motion-safe:animate-onde" aria-hidden />
                    <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-brand-600" aria-hidden />
                  </span>
                </div>

                <ol className="mt-6 space-y-5">
                  {ETAPES.map((etape) => (
                    <li key={etape.titre} className="group flex gap-3">
                      <span className="mt-0.5 h-fit rounded-xl bg-brand-50 p-2 text-brand-600 ring-1 ring-brand-100 transition duration-300 group-hover:bg-brand-600 group-hover:text-white">
                        <etape.icone className="h-4 w-4" aria-hidden />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-ink-900">{etape.titre}</p>
                        {etape.texte ? <p className="mt-0.5 text-sm leading-relaxed text-ink-500">{etape.texte}</p> : null}
                        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-ink-100">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-brand-500 to-emerald-400 motion-safe:animate-trace-jauge"
                            style={{ width: `${etape.jauge}%` }}
                          />
                        </div>
                      </div>
                    </li>
                  ))}
                </ol>
              </div>
            </div>
          </Revele>
        </div>

        {/* Bandeau défilant des domaines évalués */}
        <div className="relative border-y border-ink-100 bg-surface/70 py-4">
          <div className="masque-lateral overflow-hidden">
            <div className="flex w-max gap-3 motion-safe:animate-defilement">
              {[...DOMAINES, ...DOMAINES].map((domaine, index) => (
                <span
                  key={`${domaine}-${index}`}
                  className="inline-flex items-center gap-2 whitespace-nowrap rounded-full border border-ink-100 bg-surface px-4 py-1.5 text-xs font-medium text-ink-600"
                >
                  <Sparkles className="h-3.5 w-3.5 text-brand-500" aria-hidden />
                  {domaine}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------- Atouts */}
      <section className="bg-ink-50 py-20">
        <div className="mx-auto max-w-[90rem] px-5">
          <Revele className="max-w-2xl">
            <Badge ton="bleu" icone={Sparkles}>
              Ce que la plateforme apporte
            </Badge>
            <h2 className="mt-4 text-3xl font-semibold text-ink-900">
              Une évaluation traçable, du critère à la décision
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-ink-600">
              Chaque note s’explique : la preuve, l’agent qui l’a analysée, la probabilité obtenue et le poids du critère.
            </p>
          </Revele>

          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {ATOUTS.map((atout, index) => (
              <Revele key={atout.titre} delai={index * 110}>
                <article className="carte-vitrine group h-full">
                  <span className="puce-icone">
                    <atout.icone className="h-5 w-5" aria-hidden />
                  </span>
                  <h3 className="mt-4 text-base font-semibold text-ink-900">{atout.titre}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-ink-500">{atout.texte}</p>
                </article>
              </Revele>
            ))}
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------ Parcours */}
      <section className="mx-auto max-w-[90rem] px-5 py-20">
        <Revele className="max-w-2xl">
          <Badge ton="ambre" icone={Users}>
            Comment ça marche
          </Badge>
          <h2 className="mt-4 text-3xl font-semibold text-ink-900">
            Quatre étapes, de la création d’un compte client à l’édition du rapport de durabilité
          </h2>
        </Revele>

        <div className="relative mt-12">
          <span className="absolute left-6 top-0 hidden h-full w-px bg-gradient-to-b from-brand-200 via-brand-200 to-transparent lg:block" aria-hidden />
          <div className="grid gap-6 lg:grid-cols-4">
            {PARCOURS.map((etape, index) => (
              <Revele key={etape.titre} delai={index * 130}>
                <article className="carte-vitrine group h-full">
                  <div className="flex items-center gap-3">
                    <span className="puce-icone">
                      <etape.icone className="h-5 w-5" aria-hidden />
                    </span>
                    <span className="text-4xl font-semibold text-ink-100 transition-colors duration-300 group-hover:text-brand-100">
                      0{index + 1}
                    </span>
                  </div>
                  <h3 className="mt-4 text-base font-semibold text-ink-900">{etape.titre}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-ink-500">{etape.texte}</p>
                </article>
              </Revele>
            ))}
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------ Éditeur */}
      <section className="border-y border-ink-100 bg-ink-50 py-20">
        <div className="mx-auto grid max-w-[90rem] items-center gap-10 px-5 lg:grid-cols-[0.9fr_1.1fr]">
          <Revele>
            <div className="relative flex items-center justify-center rounded-3xl border border-ink-100 bg-surface p-12 shadow-soft">
              <span className="pointer-events-none absolute inset-0 rounded-3xl bg-halo-brand" aria-hidden />
              <Logo taille="lg" className="relative motion-safe:animate-flottement" />
            </div>
          </Revele>
          <Revele delai={120}>
            <Badge ton="neutre" icone={BadgeCheck}>
              Édité par {SMARTEX.editeur}
            </Badge>
            <h2 className="mt-4 text-3xl font-semibold text-ink-900">
              La méthodologie d’un cabinet, outillée par la technologie
            </h2>
            <p className="mt-4 text-sm leading-relaxed text-ink-600">
              {SMARTEX.produit} industrialise le référentiel d’évaluation de {SMARTEX.editeur}. {SMARTEX.baseline} La
              plateforme reste au service du jugement d’expert : l’IA prépare, hiérarchise et documente ; l’équipe valide.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link to="/a-propos" className="btn-vitrine group">
                À propos de nous
                <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" aria-hidden />
              </Link>
              <Link to="/contact" className="btn-vitrine-clair">
                Nous contacter
              </Link>
            </div>
          </Revele>
        </div>
      </section>

      {/* ------------------------------------------------------------ Formules */}
      <SectionFormules
        titre="Choisissez votre formule avant de créer votre compte"
        description="Le choix de la formule est transmis lors de la création du compte et active immédiatement les fonctionnalités correspondantes. La formule Free est un mode de démonstration : aucune création d’entreprise n’est possible avec elle."
      />

      <AppelAction />
    </div>
  );
}

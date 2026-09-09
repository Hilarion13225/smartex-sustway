import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  BarChart3,
  Check,
  CheckCircle2,
  Landmark,
  Leaf,
  Lock,
  Minus,
  Plus,
  TrendingUp,
  Users,
} from 'lucide-react';
import clsx from 'clsx';
import { useApiAuth } from '../auth/useApiAuth';
import { formaterMontant } from '../lib/export';
import { COMPARATIF, FORMULE_ENTREPRISE, QUESTIONS, SOUS_TITRES, pointsDescription } from '../lib/formules';
import { Loader } from '../components/ui';
import Revele from '../components/Revele';
import { Etiquette, PASTELS, TraitManuscrit } from '../components/vitrine/communs';
import { SMARTEX } from '../config/smartex';
import photoHero from '../assets/contact/banniere.jpg';

const AVANTAGES = [
  { icone: CheckCircle2, ton: 'bleu', texte: 'Des fonctionnalités adaptées à vos besoins' },
  { icone: Users, ton: 'bleu', texte: 'Un accompagnement à chaque étape' },
  { icone: BarChart3, ton: 'bleu', texte: 'Un meilleur rapport valeur / impact' },
];

/*
 * Les quatre thématiques du référentiel, empilées comme les cubes de la
 * maquette. Dessinées plutôt que photographiées : aucune image de cubes ESG
 * n'existe dans `src/assets`, et un décor en CSS reste net et suit le thème.
 */
const THEMATIQUES = [
  { icone: Leaf, couleurIcone: 'text-emerald-600', libelle: 'Environnement' },
  { icone: Users, couleurIcone: 'text-[#3f2f18]', libelle: 'Social' },
  { icone: Landmark, couleurIcone: 'text-[#3f2f18]', libelle: 'Gouvernance' },
  { icone: TrendingUp, couleurIcone: 'text-emerald-700', libelle: 'Impact durable' },
];

/** Cellule du comparatif : booléen, valeur textuelle, ou absence. */
function Cellule({ valeur }) {
  if (valeur === true) {
    return (
      <>
        <Check className="mx-auto h-4 w-4 text-emerald-600 dark:text-emerald-400" aria-hidden />
        <span className="sr-only">Inclus</span>
      </>
    );
  }
  if (!valeur) {
    return (
      <>
        <span className="text-ink-300" aria-hidden>
          —
        </span>
        <span className="sr-only">Non inclus</span>
      </>
    );
  }
  return <span className="text-ink-600">{valeur}</span>;
}

export default function Formules() {
  const navigate = useNavigate();
  const { listerFormules } = useApiAuth();
  const [formules, setFormules] = useState([]);
  const [chargement, setChargement] = useState(true);
  const [questionOuverte, definirQuestionOuverte] = useState(null);

  useEffect(() => {
    let actif = true;
    listerFormules()
      .then((liste) => {
        if (actif) setFormules(Array.isArray(liste) ? liste : []);
      })
      .catch(() => {
        if (actif) setFormules([]);
      })
      .finally(() => {
        if (actif) setChargement(false);
      });
    return () => {
      actif = false;
    };
  }, [listerFormules]);

  // Les formules actives viennent de l'API ; l'offre sur devis les complète.
  const cartes = [
    ...formules.map((formule) => ({
      code: formule.code,
      nom: formule.nom,
      sousTitre: SOUS_TITRES[formule.code] ?? '',
      prix: formule.prix,
      points: pointsDescription(formule.description),
    })),
    FORMULE_ENTREPRISE,
  ];
  const colonnes = cartes.length >= 4 ? 'lg:grid-cols-2 xl:grid-cols-4' : 'lg:grid-cols-3';

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

        {/*
          Décor photographique de la moitié droite : bureau lumineux et
          végétation, fortement flouté pour rester un fond et ne jamais
          concurrencer le texte. Masqué sous `lg`, où le héros passe sur une
          seule colonne et où la photo écraserait le contenu.
        */}
        <div className="pointer-events-none absolute inset-y-0 right-0 hidden w-[48%] lg:block" aria-hidden>
          <img
            src={photoHero}
            alt=""
            className="h-full w-full scale-110 object-cover blur-[9px] [mask-image:linear-gradient(to_right,transparent,black_55%)]"
          />
          <span className="absolute inset-0 bg-gradient-to-r from-surface/0 via-surface/35 to-surface/5" />
        </div>

        <div className="relative mx-auto grid max-w-[80rem] items-center gap-12 px-5 py-14 lg:grid-cols-[1.05fr_0.95fr] lg:gap-12 lg:py-20">
          <div className="motion-safe:animate-apparition-bas">
            <Etiquette>Nos formules</Etiquette>

            <h1 className="mt-5 font-display text-[1.95rem] font-extrabold leading-[1.14] tracking-tight text-marine sm:text-[2.4rem] lg:text-[2.45rem] xl:text-[2.6rem]">
              Une offre adaptée
              <br />
              à <span className="text-brand-600">chaque organisation.</span>
            </h1>

            <p className="mt-5 max-w-xl text-base leading-[1.6] text-ink-600">
              Quel que soit votre secteur ou la taille de votre structure, {SMARTEX.produit} vous propose des formules
              flexibles pour évoluer à votre rythme vers une performance durable.
            </p>

            <ul className="mt-9 grid gap-6 sm:grid-cols-3">
              {AVANTAGES.map((avantage, index) => (
                <Revele key={avantage.texte} delai={index * 110} as="li" className="flex items-start gap-3">
                  <span
                    className={`inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${PASTELS[avantage.ton]}`}
                  >
                    <avantage.icone className="h-5 w-5" aria-hidden />
                  </span>
                  <span className="text-[13px] leading-snug text-ink-600">{avantage.texte}</span>
                </Revele>
              ))}
            </ul>
          </div>

          <Revele delai={140} className="relative">
            {/* Annotation manuscrite, posée à gauche de la pile comme sur la maquette. */}
            <p className="absolute -left-2 top-4 z-10 hidden w-44 rotate-[-5deg] font-titre text-[0.95rem] font-semibold italic leading-snug text-marine xl:block">
              Investir aujourd’hui pour une organisation plus durable.
              <TraitManuscrit className="mt-1.5 h-2 w-28 text-brand-500" />
            </p>

            {/*
              Les quatre thématiques en cubes empilés. Marge négative et
              décalage horizontal croissant : les blocs se chevauchent et
              forment une pile en perspective, comme les cubes de bois de la
              maquette. Le `z-index` décroissant garde le cube du haut devant.
            */}
            <ul className="ml-auto flex w-full max-w-[10.5rem] flex-col">
              {THEMATIQUES.map((thematique, index) => (
                <li
                  key={thematique.libelle}
                  className="relative"
                  style={{
                    zIndex: THEMATIQUES.length - index,
                    marginTop: index === 0 ? 0 : '0.15rem',
                    // `translateX` et non `marginRight` : une marge rognerait
                    // la largeur du cube au lieu de le décaler, et la tour
                    // deviendrait un escalier de blocs de tailles différentes.
                    transform: `translateX(-${index * 6}px)`,
                  }}
                >
                  <div className="flex flex-col items-center gap-2 rounded-xl border border-[#c9ac81]/70 bg-gradient-to-b from-[#f4e4ca] to-[#d9bf95] px-4 py-4 shadow-[0_16px_26px_-12px_rgba(72,48,16,0.6)] transition duration-300 motion-safe:hover:-translate-y-1">
                    <thematique.icone className={`h-7 w-7 ${thematique.couleurIcone}`} strokeWidth={2} aria-hidden />
                    <span className="font-display text-[0.875rem] font-bold text-[#3f2f18]">{thematique.libelle}</span>
                  </div>
                </li>
              ))}
            </ul>
          </Revele>
        </div>
      </section>

      {/* ------------------------------------------------ Cartes formules */}
      <section id="grille-formules" className="mx-auto max-w-[80rem] scroll-mt-24 px-5 pb-16 pt-4">
        {chargement ? (
          <Loader message="Chargement des formules…" />
        ) : (
          <div className={clsx('grid gap-6', colonnes)}>
            {cartes.map((carte, index) => {
              const misEnAvant = carte.code === 'AVANCEES';
              const surDevis = carte.code === 'ENTREPRISE';
              const gratuit = !surDevis && Number(carte.prix) === 0;

              return (
                <Revele key={carte.code} delai={index * 100}>
                  <article
                    className={clsx(
                      'relative flex h-full flex-col rounded-2xl border bg-surface p-6 transition duration-300 motion-safe:hover:-translate-y-1',
                      misEnAvant
                        ? 'border-brand-400 bg-brand-50/40 shadow-soft ring-1 ring-brand-300 dark:bg-brand-500/[0.07]'
                        : 'border-ink-100 shadow-sm hover:border-brand-200 hover:shadow-soft'
                    )}
                  >
                    {misEnAvant ? (
                      <span className="absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-brand-600 px-4 py-1 text-[11px] font-semibold text-white shadow-glow">
                        Le plus populaire
                      </span>
                    ) : null}

                    <h2 className="font-display text-lg font-extrabold text-marine">{carte.nom}</h2>
                    <p className="mt-1 text-[13px] text-ink-500">{carte.sousTitre}</p>

                    <p className="mt-6 flex items-baseline gap-2">
                      {surDevis ? (
                        <span className="font-display text-[1.9rem] font-extrabold leading-none text-marine">
                          {carte.mentionPrix}
                        </span>
                      ) : (
                        <>
                          <span className="font-display text-[1.9rem] font-extrabold leading-none text-marine">
                            {gratuit ? 'Gratuit' : formaterMontant(carte.prix)}
                          </span>
                          {gratuit ? null : <span className="text-xs font-medium text-ink-500">/ an</span>}
                        </>
                      )}
                    </p>
                    <p className="mt-1.5 text-[11px] leading-snug text-ink-400">
                      {surDevis
                        ? 'Périmètre et accompagnement définis avec vous'
                        : gratuit
                          ? 'Consultation en mode démonstration uniquement'
                          : 'Licence annuelle, renouvelable'}
                    </p>

                    <ul className="mt-6 space-y-3 border-t border-ink-100 pt-6">
                      {carte.points.map((point) => (
                        <li key={point} className="flex gap-2.5 text-[13px] leading-snug text-ink-600">
                          <Check
                            className={clsx(
                              'mt-0.5 h-4 w-4 shrink-0',
                              misEnAvant ? 'text-brand-600 dark:text-brand-400' : 'text-emerald-600 dark:text-emerald-400'
                            )}
                            aria-hidden
                          />
                          <span>{point}</span>
                        </li>
                      ))}
                    </ul>

                    <div className="flex-1" />

                    {surDevis ? (
                      <Link
                        to="/contact"
                        className="group mt-7 inline-flex w-full items-center justify-center gap-2.5 rounded-lg border border-brand-300 bg-surface px-5 py-3 text-sm font-semibold text-brand-600 transition duration-300 hover:border-brand-500 hover:bg-brand-50 dark:border-brand-500/50 dark:text-brand-400 dark:hover:bg-brand-500/10"
                      >
                        Nous contacter
                        <ArrowRight
                          className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1"
                          aria-hidden
                        />
                      </Link>
                    ) : (
                      <button
                        type="button"
                        onClick={() => navigate(`/inscription?formule=${carte.code}`)}
                        className={clsx(
                          'group mt-7 inline-flex w-full items-center justify-center gap-2.5 rounded-lg px-5 py-3 text-sm font-semibold transition duration-300',
                          misEnAvant
                            ? 'bg-brand-600 text-white shadow-glow hover:bg-brand-700'
                            : 'border border-brand-300 bg-surface text-brand-600 hover:border-brand-500 hover:bg-brand-50 dark:border-brand-500/50 dark:text-brand-400 dark:hover:bg-brand-500/10'
                        )}
                      >
                        Choisir cette formule
                        <ArrowRight
                          className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1"
                          aria-hidden
                        />
                      </button>
                    )}
                  </article>
                </Revele>
              );
            })}
          </div>
        )}

        <p className="mt-8 flex items-center justify-center gap-2 text-xs text-ink-500">
          <Lock className="h-3.5 w-3.5" aria-hidden />
          Paiement des formules Standard et Avancées via PI-SPI et Wave.
        </p>
      </section>

      {/* ------------------------------------------ Comparatif et questions */}
      <section className="mx-auto max-w-[80rem] px-5 pb-20">
        <div className="grid gap-14 lg:grid-cols-[1.35fr_1fr] lg:gap-12">
          {/* Comparatif */}
          <div className="min-w-0">
            <Revele>
              <Etiquette>Comparatif des fonctionnalités</Etiquette>
              <h2 className="mt-4 font-display text-2xl font-extrabold tracking-tight text-marine sm:text-[1.7rem]">
                Un aperçu des fonctionnalités par formule.
              </h2>
            </Revele>

            <Revele delai={120} className="mt-8 min-w-0">
              <p className="mb-2 text-xs text-ink-400 lg:hidden">
                Faites défiler le tableau horizontalement pour voir toutes les formules.
              </p>
              {/* Défilement contenu dans le tableau : la page, elle, ne déborde jamais. */}
              {/* `contain:paint` en plus de `overflow-x-auto` : sans lui, le
                  débordement du tableau remonte jusqu'à la page, qui devient
                  défilable latéralement de 126 px sur téléphone. */}
              <div className="overflow-x-auto rounded-2xl border border-ink-100 [contain:paint]">
                <table className="w-full min-w-[34rem] border-collapse text-left">
                  <thead>
                    <tr className="bg-ink-50 dark:bg-ink-100/40">
                      <th scope="col" className="px-4 py-3 text-[13px] font-bold text-marine">
                        Fonctionnalités
                      </th>
                      {cartes.map((carte) => (
                        <th
                          key={carte.code}
                          scope="col"
                          className="px-4 py-3 text-center text-[13px] font-bold text-marine"
                        >
                          {carte.nom}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-ink-100">
                    {COMPARATIF.map((ligne) => (
                      <tr key={ligne.libelle}>
                        <th scope="row" className="px-4 py-3 text-[13px] font-normal leading-snug text-ink-700">
                          {ligne.libelle}
                        </th>
                        {cartes.map((carte) => (
                          <td key={carte.code} className="px-4 py-3 text-center text-[12px]">
                            <Cellule valeur={ligne[carte.code]} />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Revele>
          </div>

          {/* Questions fréquentes */}
          <div className="min-w-0">
            <Revele>
              <Etiquette>Questions fréquentes</Etiquette>
              <h2 className="mt-4 font-display text-2xl font-extrabold tracking-tight text-marine sm:text-[1.7rem]">
                Des réponses à vos questions.
              </h2>
            </Revele>

            <ul className="mt-8 space-y-3">
              {QUESTIONS.map((entree, index) => {
                const ouverte = questionOuverte === index;
                return (
                  <Revele key={entree.question} delai={index * 80} as="li">
                    <div className="overflow-hidden rounded-xl border border-ink-100 bg-surface">
                      <h3>
                        <button
                          type="button"
                          aria-expanded={ouverte}
                          aria-controls={`reponse-${index}`}
                          onClick={() => definirQuestionOuverte(ouverte ? null : index)}
                          className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left text-[13px] font-medium text-ink-800 transition-colors hover:bg-ink-50"
                        >
                          <span className="min-w-0">{entree.question}</span>
                          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-400">
                            {ouverte ? (
                              <Minus className="h-3.5 w-3.5" aria-hidden />
                            ) : (
                              <Plus className="h-3.5 w-3.5" aria-hidden />
                            )}
                          </span>
                        </button>
                      </h3>
                      {ouverte ? (
                        <p id={`reponse-${index}`} className="border-t border-ink-100 px-5 py-4 text-[13px] leading-relaxed text-ink-600">
                          {entree.reponse}
                        </p>
                      ) : null}
                    </div>
                  </Revele>
                );
              })}
            </ul>

            <Revele delai={200}>
              <Link
                to="/faq"
                className="group mt-6 inline-flex w-full items-center justify-center gap-2.5 rounded-lg border border-brand-300 bg-surface px-6 py-3 text-sm font-semibold text-brand-600 transition duration-300 hover:border-brand-500 hover:bg-brand-50 dark:border-brand-500/50 dark:text-brand-400 dark:hover:bg-brand-500/10"
              >
                Voir toutes les questions
                <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" aria-hidden />
              </Link>
            </Revele>
          </div>
        </div>
      </section>

      {/* --------------------------------------------------- Appel final */}
      <section className="bg-gradient-to-r from-brand-800 via-brand-700 to-brand-700 text-white">
        <Revele className="mx-auto flex max-w-[80rem] flex-col items-center gap-7 px-5 py-10 text-center lg:flex-row lg:gap-8 lg:text-left">
          <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-white shadow-lg">
            <Leaf className="h-8 w-8 text-brand-600" strokeWidth={2.2} aria-hidden />
          </span>

          <div className="flex-1">
            <h2 className="font-display text-xl font-extrabold leading-snug sm:text-[1.5rem]">
              Prêt à rejoindre les organisations qui construisent un avenir plus durable ?
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-white/85">
              Choisissez la formule qui correspond à vos besoins et commencez dès aujourd’hui avec {SMARTEX.produit}.
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
    </div>
  );
}

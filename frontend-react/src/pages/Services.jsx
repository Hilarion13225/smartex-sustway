import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Check,
  ClipboardCheck,
  Clock,
  GraduationCap,
  LayoutGrid,
  Leaf,
  Library,
  ListChecks,
  ListOrdered,
  Mail,
  MapPin,
  Phone,
  Play,
  Route,
  ScanSearch,
  Sparkles,
  Target,
} from 'lucide-react';
import Revele from '../components/Revele';
import ModaleVideo from '../components/ModaleVideo';
import PreuveVersVerdict from '../components/vitrine/PreuveVersVerdict';
import SectionOrganisations from '../components/vitrine/SectionOrganisations';
import ApercuFormules from '../components/vitrine/ApercuFormules';
import ChaineEtapes from '../components/vitrine/ChaineEtapes';
import CompteurAnime from '../components/vitrine/CompteurAnime';
import { SMARTEX, METIERS, REFERENTIELS_EVALUABLES } from '../config/smartex';
import photoEntreprises from '../assets/formation/banques.jpg';
import photoInstitutions from '../assets/institutions.jpg';
import photoOng from '../assets/ong.jpg';
import photoBailleurs from '../assets/methodologie/engagement-banniere.jpg';

/*
 * Ce qui lève les derniers doutes avant d'acheter. Chaque point est vrai
 * aujourd'hui : l'accès suit le paiement (parcours d'inscription), la licence
 * est sans reconduction tacite et la sécurité reprend les questions fréquentes.
 */
const REASSURANCE = [
  'Accès dès le paiement validé',
  'Licence annuelle, sans reconduction tacite',
  'Données chiffrées, conformité RGPD',
];

/* Chiffres vérifiables dans la configuration (REFERENTIELS_EVALUABLES). */
const FAITS = [
  {
    valeur: 87,
    libelle: 'critères dans le référentiel SMARTEX SustWay',
    icone: ListChecks,
  },
  { valeur: 6, libelle: 'parties d’évaluation', icone: LayoutGrid },
  {
    valeur: REFERENTIELS_EVALUABLES.length,
    libelle: 'référentiels évaluables',
    icone: Library,
  },
];

/*
 * Pourquoi se servir de la plateforme plutôt que d'un tableur : chaque point
 * nomme ce que la plateforme fait et que l'auto-évaluation classique ne fait
 * pas — preuve citée, risque hiérarchisé, suivi dans le temps, dossier bailleur.
 */
const RAISONS = [
  {
    icone: ClipboardCheck,
    titre: 'Des notes tenues par vos preuves',
    texte:
      'Chaque verdict cite le passage du document qui le justifie. Une déclaration ne suffit pas à valider un critère.',
  },
  {
    icone: Target,
    titre: 'Des priorités, pas une opinion',
    texte: 'Les écarts sont classés par risque attendu et par criticité sectorielle. Vous savez quoi traiter d’abord.',
  },
  {
    icone: Route,
    titre: 'Une progression mesurable',
    texte: 'Le plan d’action, le score et l’historique restent au même endroit d’une évaluation à la suivante.',
  },
  {
    icone: Leaf,
    titre: 'Un dossier prêt pour les bailleurs',
    texte: 'L’indice de préparation situe votre alignement aux standards des financements verts, preuves à l’appui.',
  },
];

/* L'ordre dans lequel on se sert de la plateforme : une vraie suite. */
const ETAPES = [
  { libelle: 'Questionnaire', detail: 'Adapté à votre secteur d’activité' },
  { libelle: 'Preuves', detail: 'Vos politiques, rapports et procédures' },
  { libelle: 'Analyse IA', detail: 'Chaque critère confronté à vos documents' },
  { libelle: 'Priorités', detail: 'Score, écarts et risques hiérarchisés' },
  { libelle: 'Progrès', detail: 'Plan d’action, rapport et réévaluation' },
];

/* Les prestations autour de la plateforme, telles que définies côté métier. */
const ICONES_PRESTATION = {
  diagnostic: ScanSearch,
  'plan-action': ListOrdered,
  financements: Leaf,
  accompagnement: GraduationCap,
};

const PUBLICS = [
  {
    photo: photoEntreprises,
    titre: 'Entreprises',
    texte: 'Pilotez et valorisez votre démarche RSE.',
  },
  {
    photo: photoInstitutions,
    titre: 'Institutions publiques',
    texte: 'Renforcez la transparence et la performance.',
  },
  {
    photo: photoOng,
    titre: 'ONG et associations',
    texte: 'Mesurez votre impact et structurez vos actions.',
  },
  {
    photo: photoBailleurs,
    titre: 'Bailleurs et partenaires',
    texte: 'Appuyez des initiatives à fort impact.',
  },
];

const CONTACTS = [
  {
    icone: Mail,
    libelle: 'Écrire',
    valeur: SMARTEX.email,
    lien: `mailto:${SMARTEX.email}`,
  },
  {
    icone: Phone,
    libelle: 'Appeler',
    valeur: SMARTEX.telephone,
    lien: `tel:${SMARTEX.telephone.replace(/\s/g, '')}`,
  },
  {
    icone: MapPin,
    libelle: 'Nous trouver',
    valeur: SMARTEX.adresse,
    lien: null,
  },
  {
    icone: Clock,
    libelle: 'Nos horaires',
    valeur: SMARTEX.horaires,
    lien: null,
  },
];

const classeTitreSection =
  'font-display text-[1.875rem] font-bold leading-[1.08] tracking-[-0.025em] text-ink-900 sm:text-[2.75rem] [text-wrap:balance]';
const classeLienSouligne =
  'inline-flex min-h-12 items-center self-start text-base font-semibold text-ink-900 underline decoration-ink-300 underline-offset-[6px] transition-colors hover:decoration-brand-600 lg:self-auto';
/* Carte de section : fond dégradé, relief porté par l'ombre, liseret en tête. */
const classeCarte = 'carte-riche group relative h-full overflow-hidden p-6 motion-safe:hover:-translate-y-1.5 sm:p-7';
const classePuce =
  'puce-riche inline-flex h-12 w-12 items-center justify-center transition-transform duration-500 motion-safe:group-hover:-rotate-6 motion-safe:group-hover:scale-105';

/**
 * Page « Solution » : la vitrine de la plateforme, en thème clair.
 *
 * Elle déroule les sept questions d'un acheteur, dans cet ordre : ce qu'est la
 * solution, pourquoi s'en servir, comment elle marche, ce que SMARTEX Expertises
 * fait autour, à qui elle s'adresse, combien elle coûte, comment nous joindre.
 * Rien d'autre : ce qui relève de la méthodologie ou de la formation vit sur ses
 * pages propres, vers lesquelles on renvoie.
 */
export default function Services() {
  const [videoOuverte, definirVideoOuverte] = useState(false);

  return (
    <div>
      {/* --------------------------------------------------------- Héros */}
      <section className="bande-riche relative isolate overflow-hidden border-b border-ink-200">
        {/* Décor : quadrillage millimétré et deux halos, purement visuels. */}
        <div className="motif-quadrillage pointer-events-none absolute inset-0 -z-10" aria-hidden />
        <div
          className="halo-brand pointer-events-none absolute -right-24 -top-32 -z-10 h-80 w-80 motion-safe:animate-respiration"
          aria-hidden
        />
        <div
          className="halo-feuille pointer-events-none absolute -bottom-40 -left-24 -z-10 h-72 w-72 motion-safe:animate-respiration"
          style={{ animationDelay: '1.6s' }}
          aria-hidden
        />

        <div className="mx-auto grid max-w-[75rem] gap-12 px-5 pb-14 pt-10 sm:pt-14 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:gap-16 lg:pb-20 lg:pt-20">
          <div className="min-w-0 motion-safe:animate-apparition-bas">
            <p className="inline-flex items-center gap-2 rounded-full border border-brand-200 bg-surface/80 px-3.5 py-1.5 text-[13px] font-semibold text-brand-600 backdrop-blur">
              <Sparkles className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
              Plateforme d’évaluation et experts {SMARTEX.editeur}
            </p>
            <p className="sur-titre mt-6">La solution {SMARTEX.produit}</p>
            <h1 className="mt-4 max-w-[14ch] text-ink-900">Votre démarche RSE, notée sur vos preuves.</h1>

            <p className="mt-6 max-w-[50ch] text-lg leading-relaxed text-ink-600">
              Vous déposez vos documents. L’IA les compare au référentiel. Chaque critère reçoit un verdict, justifié
              par un passage de vos preuves.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                to="/formules#grille-formules"
                className="btn-presse inline-flex min-h-12 items-center justify-center rounded-[4px] bg-brand-600 px-6 text-base font-semibold text-white transition-colors hover:bg-brand-700"
              >
                Choisir une formule
              </Link>
              <button
                type="button"
                onClick={() => definirVideoOuverte(true)}
                className="btn-presse group inline-flex min-h-12 items-center justify-center gap-2.5 rounded-[4px] border border-ink-300 px-6 text-base font-semibold text-ink-900 transition-colors hover:border-ink-900"
              >
                <Play
                  className="h-4 w-4 fill-current transition-transform duration-300 group-hover:translate-x-0.5"
                  aria-hidden
                />
                Voir la démonstration
              </button>
            </div>

            <ul className="mt-8 flex flex-col gap-2.5 text-[15px] text-ink-700">
              {REASSURANCE.map((point) => (
                <li key={point} className="flex items-center gap-2.5">
                  <Check className="h-4 w-4 shrink-0 text-feuille" strokeWidth={2.5} aria-hidden />
                  {point}
                </li>
              ))}
            </ul>
          </div>

          <PreuveVersVerdict className="min-w-0" />
        </div>
      </section>

      {/* ------------------------------------------------ Ligne de repères */}
      <section className="border-b border-ink-200 bg-surface">
        <ul className="mx-auto grid max-w-[75rem] gap-5 px-5 py-12 sm:grid-cols-3">
          {FAITS.map((fait, index) => (
            <Revele key={fait.libelle} as="li" delai={index * 80}>
              <div className="carte-riche carte-riche-liseret relative flex h-full items-center gap-4 overflow-hidden p-5">
                <span className={`${classePuce} shrink-0`}>
                  <fait.icone className="h-5 w-5" strokeWidth={1.75} aria-hidden />
                </span>
                <p className="text-[15px] leading-snug text-ink-600">
                  <CompteurAnime valeur={fait.valeur} className="chiffre-cle block" />
                  {fait.libelle}
                </p>
              </div>
            </Revele>
          ))}
        </ul>
      </section>

      <SectionOrganisations />

      {/* --------------------------------------- Pourquoi s'en servir */}
      <section className="bande-riche-brand relative isolate overflow-hidden border-b border-ink-200">
        <div
          className="halo-brand pointer-events-none absolute -right-32 top-10 -z-10 h-72 w-72 motion-safe:animate-respiration"
          aria-hidden
        />
        <div className="mx-auto max-w-[75rem] px-5 py-16 sm:py-20">
          <div className="max-w-2xl">
            <p className="sur-titre">Pourquoi l’utiliser</p>
            <h2 className={`mt-4 ${classeTitreSection}`}>Une évaluation que vous pouvez défendre.</h2>
            <p className="mt-4 max-w-[56ch] text-lg leading-relaxed text-ink-600">
              Un tableur dit ce que vous déclarez. La plateforme dit ce que vos documents prouvent, et ce qu’il reste à
              faire.
            </p>
          </div>

          <ul className="mt-12 grid gap-6 sm:grid-cols-2">
            {RAISONS.map((raison, index) => (
              <Revele key={raison.titre} as="li" delai={index * 70}>
                <article className={`${classeCarte} carte-riche-liseret`}>
                  <span className="chiffre-fantome pointer-events-none absolute right-4 top-2 select-none" aria-hidden>
                    {index + 1}
                  </span>
                  <span className={classePuce}>
                    <raison.icone className="h-6 w-6" strokeWidth={1.75} aria-hidden />
                  </span>
                  <h3 className="mt-5 font-display text-xl font-bold leading-snug text-ink-900">{raison.titre}</h3>
                  <p className="mt-2.5 text-[15px] leading-relaxed text-ink-600">{raison.texte}</p>
                </article>
              </Revele>
            ))}
          </ul>
        </div>
      </section>

      {/* ------------------------------------------------ Comment ça marche */}
      <section className="border-b border-ink-200 bg-surface">
        <div className="mx-auto max-w-[75rem] px-5 py-16 sm:py-20">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <p className="sur-titre">Comment ça marche</p>
              <h2 className={`mt-4 ${classeTitreSection}`}>Cinq étapes, toujours les mêmes.</h2>
            </div>
            <Link to="/methodologie" viewTransition className={classeLienSouligne}>
              Lire la méthodologie
            </Link>
          </div>

          {/* L'accent se déplace d'une étape à l'autre ; aucun libellé n'est
              jamais masqué, et le mouvement s'arrête au survol. */}
          <ChaineEtapes etapes={ETAPES} />
        </div>
      </section>

      {/* ------------------------------------------------------ Prestations */}
      <section className="bande-riche-feuille relative isolate overflow-hidden border-b border-ink-200">
        <div
          className="halo-feuille pointer-events-none absolute -left-28 top-6 -z-10 h-72 w-72 motion-safe:animate-respiration"
          aria-hidden
        />
        <div className="mx-auto max-w-[75rem] px-5 py-16 sm:py-20">
          <div className="max-w-2xl">
            <p className="sur-titre">Nos prestations</p>
            <h2 className={`mt-4 ${classeTitreSection}`}>La plateforme, et nos experts avec.</h2>
            <p className="mt-4 max-w-[56ch] text-lg leading-relaxed text-ink-600">
              {SMARTEX.editeur} intervient autant que vous le souhaitez : de la simple licence à la mission conduite
              avec vos équipes.
            </p>
          </div>

          <ul className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {METIERS.map((metier, index) => {
              const Icone = ICONES_PRESTATION[metier.code];
              return (
                <Revele key={metier.code} as="li" delai={index * 70}>
                  <article className={`${classeCarte} carte-riche-liseret`}>
                    {Icone ? (
                      <span className={`${classePuce} puce-riche-feuille`}>
                        <Icone className="h-6 w-6" strokeWidth={1.75} aria-hidden />
                      </span>
                    ) : null}
                    <h3 className="mt-5 font-display text-lg font-bold leading-snug text-ink-900">{metier.titre}</h3>
                    <p className="mt-2.5 text-[15px] leading-relaxed text-ink-600">{metier.texte}</p>
                  </article>
                </Revele>
              );
            })}
          </ul>
        </div>
      </section>

      {/* --------------------------------------------- Domaine d'application */}
      <section className="bande-riche relative isolate overflow-hidden border-b border-ink-200">
        <div className="motif-quadrillage pointer-events-none absolute inset-0 -z-10" aria-hidden />
        <div className="mx-auto max-w-[75rem] px-5 py-16 sm:py-20">
          <div className="max-w-2xl">
            <p className="sur-titre">Domaine d’application</p>
            <h2 className={`mt-4 ${classeTitreSection}`}>Pour toutes les organisations.</h2>
            <p className="mt-4 max-w-[56ch] text-lg leading-relaxed text-ink-600">
              Chacun évalue sa performance avec le référentiel qui lui correspond.
            </p>
          </div>

          {/* Le titre est posé sur la photo, sous un voile dégradé : l'image
              porte la section au lieu de servir de vignette. */}
          <ul className="mt-12 grid grid-cols-2 gap-4 lg:grid-cols-4 lg:gap-6">
            {PUBLICS.map((publicCible, index) => (
              <Revele key={publicCible.titre} as="li" delai={index * 80} className="group">
                <article className="carte-riche relative h-full overflow-hidden motion-safe:group-hover:-translate-y-1.5">
                  <div className="relative overflow-hidden">
                    <img
                      src={publicCible.photo}
                      alt=""
                      aria-hidden
                      loading="lazy"
                      className="aspect-[4/3] w-full object-cover transition-transform duration-[900ms] ease-out motion-safe:group-hover:scale-110"
                    />
                    <div
                      className="absolute inset-0 bg-gradient-to-t from-[rgb(var(--marine))]/85 via-[rgb(var(--marine))]/20 to-transparent"
                      aria-hidden
                    />
                    <h3 className="absolute inset-x-4 bottom-3 font-display text-base font-bold leading-snug text-white drop-shadow sm:text-lg">
                      {publicCible.titre}
                    </h3>
                  </div>
                  <p className="px-4 py-4 text-[15px] leading-relaxed text-ink-600">{publicCible.texte}</p>
                </article>
              </Revele>
            ))}
          </ul>

          {/* Les référentiels réellement chargés dans la plateforme : le
              domaine d'application se lit aussi à ce qu'on peut évaluer. */}
          <dl className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {REFERENTIELS_EVALUABLES.map((referentiel, index) => (
              <Revele key={referentiel.code} delai={index * 60} className="group h-full">
                <div className="carte-riche relative h-full overflow-hidden p-5 motion-safe:group-hover:-translate-y-1">
                  <dt className="flex items-center gap-3 font-display text-lg font-bold text-ink-900">
                    <span className="puce-riche inline-flex h-9 w-9 shrink-0 items-center justify-center text-xs font-extrabold">
                      {referentiel.code.slice(0, 2)}
                    </span>
                    {referentiel.nom}
                  </dt>
                  <dd className="mt-3 text-[15px] leading-relaxed text-ink-600">{referentiel.texte}</dd>
                </div>
              </Revele>
            ))}
          </dl>
        </div>
      </section>

      <ApercuFormules />

      {/* ------------------------------------------------- Nous contacter */}
      <section id="smartex" className="bande-riche relative isolate scroll-mt-20 overflow-hidden">
        <div className="motif-quadrillage pointer-events-none absolute inset-0 -z-10" aria-hidden />
        <div
          className="halo-brand pointer-events-none absolute -bottom-32 right-0 -z-10 h-72 w-72 motion-safe:animate-respiration"
          aria-hidden
        />
        <div className="mx-auto grid max-w-[75rem] gap-10 px-5 py-16 sm:py-20 lg:grid-cols-[1fr_1fr] lg:gap-16">
          <div>
            <p className="sur-titre">Nous contacter</p>
            <h2 className={`mt-4 ${classeTitreSection}`}>Parlons de votre évaluation.</h2>
            <p className="mt-4 max-w-[52ch] text-lg leading-relaxed text-ink-600">
              {SMARTEX.editeur}, éditeur de {SMARTEX.produit}, répond aux demandes de démonstration, de devis et
              d’accompagnement.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                to="/contact"
                viewTransition
                className="btn-presse inline-flex min-h-12 items-center justify-center rounded-[4px] bg-brand-600 px-6 text-base font-semibold text-white transition-colors hover:bg-brand-700"
              >
                Écrire à nos équipes
              </Link>
              <a
                href={SMARTEX.siteWeb}
                target="_blank"
                rel="noreferrer noopener"
                className="btn-presse inline-flex min-h-12 items-center justify-center rounded-[4px] border border-ink-300 px-6 text-base font-semibold text-ink-900 transition-colors hover:border-ink-900"
              >
                Découvrir {SMARTEX.editeur}
                <span className="sr-only"> (nouvel onglet)</span>
              </a>
            </div>
          </div>

          <ul className="grid gap-4 self-center sm:grid-cols-2">
            {CONTACTS.map((contact, index) => (
              <Revele key={contact.libelle} as="li" delai={index * 70}>
                <div className={classeCarte}>
                  <span className={classePuce}>
                    <contact.icone className="h-5 w-5" strokeWidth={1.75} aria-hidden />
                  </span>
                  <p className="mt-4 text-sm font-medium text-ink-500">{contact.libelle}</p>
                  {contact.lien ? (
                    <a
                      href={contact.lien}
                      className="mt-1 block break-words font-display text-base font-bold text-ink-900 underline decoration-ink-300 underline-offset-4 transition-colors hover:decoration-brand-600"
                    >
                      {contact.valeur}
                    </a>
                  ) : (
                    <p className="mt-1 font-display text-base font-bold text-ink-900">{contact.valeur}</p>
                  )}
                </div>
              </Revele>
            ))}
          </ul>
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

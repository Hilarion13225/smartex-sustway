import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, Play } from 'lucide-react';
import AppelAction from '../components/AppelAction';
import ModaleVideo from '../components/ModaleVideo';
import PreuveVersVerdict from '../components/vitrine/PreuveVersVerdict';
import SectionOrganisations from '../components/vitrine/SectionOrganisations';
import ApercuFormules from '../components/vitrine/ApercuFormules';
import { SMARTEX } from '../config/smartex';
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

/*
 * Chiffres vérifiables dans la configuration (REFERENTIELS_EVALUABLES) : une
 * ligne de texte, pas un bandeau de compteurs animés.
 */
const FAITS = [
  { valeur: '87', libelle: 'critères dans le référentiel SMARTEX SustWay' },
  { valeur: '6', libelle: 'parties d’évaluation' },
  { valeur: '5', libelle: 'référentiels évaluables' },
];

/* L'ordre dans lequel on se sert de la plateforme : une vraie suite. */
const ETAPES = [
  { titre: 'Répondez au questionnaire', texte: 'Il est adapté à votre secteur et bâti sur des référentiels reconnus.' },
  { titre: 'Déposez vos preuves', texte: 'Politiques, rapports, procédures : vos documents justifient vos réponses.' },
  { titre: 'L’IA analyse', texte: 'Chaque document est confronté au critère. Chaque verdict cite sa source.' },
  { titre: 'Voyez vos priorités', texte: 'Score, écarts et risques sont classés. Vous savez par où commencer.' },
  { titre: 'Suivez vos progrès', texte: 'Plan d’action, rapport exportable et nouvelle évaluation quand vous êtes prêt.' },
];

const BENEFICES = [
  { titre: 'Une vision claire', texte: 'Votre niveau de maturité RSE et ESG, domaine par domaine.' },
  { titre: 'Des écarts identifiés', texte: 'Les points faibles apparaissent, preuves à l’appui.' },
  { titre: 'Des priorités concrètes', texte: 'Vos efforts vont là où ils comptent le plus.' },
  { titre: 'Un accès aux financements', texte: 'Un indice de préparation aux standards des financements verts.' },
];

const PUBLICS = [
  { photo: photoEntreprises, titre: 'Entreprises', texte: 'Pilotez et valorisez votre démarche RSE.' },
  { photo: photoInstitutions, titre: 'Institutions publiques', texte: 'Renforcez la transparence et la performance.' },
  { photo: photoOng, titre: 'ONG et associations', texte: 'Mesurez votre impact et structurez vos actions.' },
  { photo: photoBailleurs, titre: 'Bailleurs et partenaires', texte: 'Appuyez des initiatives à fort impact.' },
];

const VALEURS = [
  { titre: 'Indépendance', texte: 'Une évaluation objective et impartiale.' },
  { titre: 'Robustesse', texte: 'Une méthodologie fiable et éprouvée.' },
  { titre: 'Transparence', texte: 'Des résultats clairs, chacun justifié.' },
];

const classeTitreSection =
  'font-display text-[1.875rem] font-bold leading-[1.08] tracking-[-0.025em] text-ink-900 sm:text-[2.75rem] [text-wrap:balance]';
const classeLienSouligne =
  'inline-flex min-h-12 items-center self-start text-base font-semibold text-ink-900 underline decoration-ink-300 underline-offset-[6px] transition-colors hover:decoration-brand-600 lg:self-auto';

/**
 * Page « Solution » : la page de présentation de la vitrine (l'ancienne page
 * /accueil y est fusionnée et redirige ici).
 *
 * Elle suit le chemin d'un acheteur : comprendre ce que fait la solution, voir
 * comment elle marche et ce qu'elle rapporte, se reconnaître, voir le prix,
 * savoir qui est derrière — puis choisir une formule. SMARTEX Expertises tient
 * en un bloc : l'entreprise a son propre site, vers lequel on renvoie.
 */
export default function Services() {
  const [videoOuverte, definirVideoOuverte] = useState(false);

  return (
    <div>
      {/* --------------------------------------------------------- Héros */}
      <section className="border-b border-ink-200">
        <div className="mx-auto grid max-w-[75rem] gap-12 px-5 pb-14 pt-10 sm:pt-14 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:gap-16 lg:pb-20 lg:pt-20">
          <div className="min-w-0">
            <p className="sur-titre">Évaluation RSE et ESG en ligne</p>
            <h1 className="mt-4 max-w-[14ch] text-ink-900">Votre démarche RSE, notée sur vos preuves.</h1>

            <p className="mt-6 max-w-[50ch] text-lg leading-relaxed text-ink-600">
              Vous déposez vos documents. L’IA les compare au référentiel. Chaque critère reçoit un verdict, justifié
              par un passage de vos preuves.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                to="/formules#grille-formules"
                className="inline-flex min-h-12 items-center justify-center rounded-[4px] bg-brand-600 px-6 text-base font-semibold text-white transition-colors hover:bg-brand-700"
              >
                Choisir une formule
              </Link>
              <button
                type="button"
                onClick={() => definirVideoOuverte(true)}
                className="inline-flex min-h-12 items-center justify-center gap-2.5 rounded-[4px] border border-ink-300 px-6 text-base font-semibold text-ink-900 transition-colors hover:border-ink-900"
              >
                <Play className="h-4 w-4 fill-current" aria-hidden />
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
        <ul className="mx-auto flex max-w-[75rem] flex-col gap-3 px-5 py-6 text-[15px] text-ink-600 sm:flex-row sm:flex-wrap sm:gap-x-10">
          {FAITS.map((fait) => (
            <li key={fait.libelle}>
              <b className="font-display text-xl font-bold tabular-nums text-ink-900">{fait.valeur}</b> {fait.libelle}
            </li>
          ))}
        </ul>
      </section>

      <SectionOrganisations />

      {/* ------------------------------------------------ Comment ça marche */}
      <section className="border-b border-ink-200">
        <div className="mx-auto max-w-[75rem] px-5 py-16 sm:py-20">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <h2 className={`max-w-2xl ${classeTitreSection}`}>Comment ça marche.</h2>
            <Link to="/methodologie" viewTransition className={classeLienSouligne}>
              Lire la méthodologie
            </Link>
          </div>

          <ol className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-5 lg:gap-6">
            {ETAPES.map((etape, index) => (
              <li key={etape.titre} className="border-t-2 border-ink-900 pt-4">
                <p className="text-sm font-medium tabular-nums text-ink-400">{index + 1}</p>
                <h3 className="mt-1 font-display text-xl font-bold leading-snug text-ink-900">{etape.titre}</h3>
                <p className="mt-2 text-[15px] leading-relaxed text-ink-600">{etape.texte}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ------------------------------------------------ Ce que vous y gagnez */}
      <section className="border-b border-ink-200 bg-surface">
        <div className="mx-auto max-w-[75rem] px-5 py-16 sm:py-20">
          <h2 className={`max-w-2xl ${classeTitreSection}`}>Ce que vous y gagnez.</h2>
          <ul className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-4 lg:gap-6">
            {BENEFICES.map((benefice) => (
              <li key={benefice.titre} className="border-t border-ink-300 pt-4">
                <h3 className="font-display text-xl font-bold leading-snug text-ink-900">{benefice.titre}</h3>
                <p className="mt-2 text-[15px] leading-relaxed text-ink-600">{benefice.texte}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* --------------------------------------- Types d'organisations */}
      <section className="border-b border-ink-200">
        <div className="mx-auto max-w-[75rem] px-5 py-16 sm:py-20">
          <div className="max-w-2xl">
            <h2 className={classeTitreSection}>Pour toutes les organisations.</h2>
            <p className="mt-4 max-w-[56ch] text-lg leading-relaxed text-ink-600">
              Chacun évalue sa performance RSE et ESG avec le référentiel qui lui correspond.
            </p>
          </div>

          <ul className="mt-12 grid grid-cols-2 gap-x-4 gap-y-8 lg:grid-cols-4 lg:gap-6">
            {PUBLICS.map((publicCible) => (
              <li key={publicCible.titre}>
                <img
                  src={publicCible.photo}
                  alt=""
                  aria-hidden
                  loading="lazy"
                  className="aspect-[4/3] w-full rounded-[8px] object-cover"
                />
                <h3 className="mt-3 font-display text-base font-bold leading-snug text-ink-900 sm:mt-4 sm:text-xl">{publicCible.titre}</h3>
                <p className="mt-1 text-[15px] leading-relaxed text-ink-600">{publicCible.texte}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <ApercuFormules />

      {/* ----------------------------------------------- Qui est derrière */}
      <section id="smartex" className="scroll-mt-20 border-b border-ink-200">
        <div className="mx-auto grid max-w-[75rem] gap-10 px-5 py-16 sm:py-20 lg:grid-cols-[1fr_1fr] lg:gap-16">
          <div>
            <h2 className={classeTitreSection}>Une solution de {SMARTEX.editeur}.</h2>
            <p className="mt-4 max-w-[52ch] text-lg leading-relaxed text-ink-600">
              {SMARTEX.editeur} fait du conseil, de l’audit et des outils numériques pour la performance durable.
              {' '}
              {SMARTEX.produit} met cette expertise dans une plateforme.
            </p>
            <a
              href={SMARTEX.siteWeb}
              target="_blank"
              rel="noreferrer noopener"
              className={`mt-4 ${classeLienSouligne}`}
            >
              Découvrir {SMARTEX.editeur}
              <span className="sr-only"> (nouvel onglet)</span>
            </a>
          </div>

          <dl className="grid gap-6 self-center sm:grid-cols-3 lg:grid-cols-1">
            {VALEURS.map((valeur) => (
              <div key={valeur.titre} className="border-t border-ink-300 pt-4">
                <dt className="font-display text-xl font-bold text-ink-900">{valeur.titre}</dt>
                <dd className="mt-1 text-[15px] leading-relaxed text-ink-600">{valeur.texte}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <AppelAction />

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

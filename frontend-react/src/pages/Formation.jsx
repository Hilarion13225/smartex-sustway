import { Link } from 'react-router-dom';
import AppelAction from '../components/AppelAction';
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
  { titre: 'Formations pratiques', texte: 'Des cas concrets tirés de votre secteur.' },
  { titre: 'Experts reconnus', texte: `Animées par les consultants ${SMARTEX.editeur}.` },
  { titre: 'Attestation', texte: 'Remise à l’issue de chaque parcours.' },
];

const FORMATS = [
  { titre: 'Ateliers pratiques', texte: 'Mise en situation directe sur des cas concrets liés à votre secteur d’activité.' },
  { titre: 'Cours de maître', texte: 'Sessions animées par des experts reconnus sur un sujet RSE/DD précis.' },
  { titre: 'Séminaires de formation', texte: 'Programme structuré sur plusieurs sessions, avec supports et évaluation.' },
  { titre: 'Conférences — débats', texte: 'Temps d’échange sur les grands enjeux RSE et développement durable.' },
  { titre: 'Réunions entreprises', texte: 'Format dédié à une organisation, adapté à son contexte et ses équipes.' },
  { titre: 'Activités intervenants', texte: `Intervention d’experts ${SMARTEX.editeur} directement dans vos équipes.` },
];

const SECTEURS = [
  { nom: 'Actualités générales', photo: photoActuGenerale },
  { nom: 'BTP', photo: photoBtp },
  { nom: 'Tourisme & Hôtellerie', photo: photoTourisme },
  { nom: 'Mines', photo: photoMines },
  { nom: 'Pétrole', photo: photoPetrole },
  { nom: 'Production électrique', photo: photoProductionElec },
  { nom: 'Agro-industrie', photo: photoAgro },
  { nom: 'Télécom', photo: photoTelecom },
  { nom: 'Banques & Assurances', photo: photoBanques },
  { nom: 'Grande distribution', photo: photoDistribution },
];

const CERTIFICATS = [
  {
    titre: 'Finance durable — Finance verte — ISR',
    texte: 'Investissement socialement responsable, critères ESG, finance verte, obligations vertes, microfinance et impact investing.',
  },
  {
    titre: 'Politique et stratégie sectorielles de RSE',
    texte: 'Bonnes pratiques RSE, déploiement opérationnel, reporting extra-financier et référentiels de normalisation.',
  },
  {
    titre: 'Management environnemental',
    texte: 'Défis environnementaux, systèmes de management environnemental (SME) et certification ISO 14001.',
  },
  {
    titre: 'Management durable et responsable des achats',
    texte: 'Risques liés aux achats, référentiels normatifs et stratégies d’achats responsables.',
  },
  {
    titre: 'Management de la Santé-Sécurité et Qualité de vie au travail',
    texte: 'Bien-être salarié, normes OHSAS/ISO 45001 et prévention des risques professionnels.',
  },
];

/*
 * Les repères chiffrés du parcours certifiant, écrits en toutes lettres. Ils
 * étaient portés par un compteur animé qui partait de zéro : tant que le bloc
 * n'était pas entré dans l'écran — à l'impression, pour un moteur de
 * recherche, dans une capture — la page annonçait « 0 h, 0 module ».
 */
const REPERES_CERTIFICAT = [
  { valeur: '120 h', libelle: 'par certificat' },
  { valeur: '6', libelle: 'modules' },
  { valeur: '5', libelle: 'certificats' },
];

const classeTitreSection =
  'font-display text-[1.875rem] font-bold leading-[1.08] tracking-[-0.025em] text-ink-900 sm:text-[2.75rem] [text-wrap:balance]';

/**
 * Page « Se former ».
 *
 * Même langage que les autres pages de la vitrine : aucun élément n'y est
 * cliquable s'il n'en a pas l'air, et rien n'a l'air cliquable s'il ne l'est
 * pas — d'où la disparition du soulèvement au survol des formats et des
 * thématiques, qui ne mènent nulle part.
 */
export default function Formation() {
  return (
    <div>
      {/* --------------------------------------------------------- Héros */}
      <section className="border-b border-ink-200">
        <div className="mx-auto grid max-w-[75rem] gap-12 px-5 pb-14 pt-10 sm:pt-14 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:gap-16 lg:pb-20 lg:pt-20">
          <div className="min-w-0">
            <p className="sur-titre">Nos formations</p>
            <h1 className="titre-page mt-4 max-w-[16ch] text-ink-900">Développez vos compétences en RSE et ESG.</h1>

            <p className="mt-6 max-w-[54ch] text-lg leading-relaxed text-ink-600">
              Ateliers, séminaires, conférences et certificats de spécialisation : des formations pratiques pour passer
              de la théorie à l’action.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <a
                href="#thematiques"
                className="btn-presse inline-flex min-h-12 items-center justify-center rounded-[4px] bg-brand-600 px-6 text-base font-semibold text-white hover:bg-brand-700"
              >
                Voir les thématiques
              </a>
              <Link
                to="/contact"
                viewTransition
                className="btn-presse inline-flex min-h-12 items-center justify-center rounded-[4px] border border-ink-300 px-6 text-base font-semibold text-ink-900 hover:border-ink-900"
              >
                Nous contacter
              </Link>
            </div>

            <dl className="mt-10 grid gap-5 border-t border-ink-200 pt-6 sm:grid-cols-3 sm:gap-6">
              {REASSURANCE.map((bloc) => (
                <div key={bloc.titre}>
                  <dt className="font-display text-base font-bold text-ink-900">{bloc.titre}</dt>
                  <dd className="mt-1 text-[15px] leading-snug text-ink-600">{bloc.texte}</dd>
                </div>
              ))}
            </dl>
          </div>

          <img
            src={photoBanniere}
            alt="Session de formation en salle, à Abidjan"
            className="aspect-[4/3] w-full min-w-0 rounded-[12px] object-cover"
            loading="eager"
          />
        </div>
      </section>

      {/* ------------------------------------------------------ Nos formats */}
      <section className="border-b border-ink-200 bg-surface">
        <div className="mx-auto max-w-[75rem] px-5 py-16 sm:py-20">
          <h2 className={`max-w-2xl ${classeTitreSection}`}>Six formats, un même niveau d’exigence.</h2>

          {/* Une liste à filets plutôt que six cartes à icône : les formats se
              parcourent, ils ne se comparent pas case à case. */}
          <ul className="mt-12 grid gap-x-8 sm:grid-cols-2 lg:grid-cols-3">
            {FORMATS.map((format, index) => (
              <li key={format.titre} className="grid grid-cols-[2rem_1fr] border-t border-ink-300 py-5">
                <span className="pt-0.5 text-sm font-medium tabular-nums text-ink-400">
                  {String(index + 1).padStart(2, '0')}
                </span>
                <span className="min-w-0">
                  <span className="block font-display text-xl font-bold leading-snug text-ink-900">{format.titre}</span>
                  <span className="mt-1.5 block text-[15px] leading-relaxed text-ink-600">{format.texte}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* -------------------------------------------------- Nos thématiques */}
      <section id="thematiques" className="scroll-mt-20 border-b border-ink-200">
        <div className="mx-auto max-w-[75rem] px-5 py-16 sm:py-20">
          <div className="max-w-2xl">
            <h2 className={classeTitreSection}>Des contenus adaptés à votre activité.</h2>
            <p className="mt-4 max-w-[56ch] text-lg leading-relaxed text-ink-600">
              Les enjeux RSE d’une banque ne sont pas ceux d’une mine. Chaque thématique part des réalités de votre
              secteur.
            </p>
          </div>

          {/* Le nom sous la photo, et non plus en blanc sur la photo : sur une
              image claire (le chantier, l'hôtel), le contraste tombait sous le
              seuil de lecture malgré le dégradé. */}
          <ul className="mt-12 grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-3 lg:grid-cols-5 lg:gap-x-5">
            {SECTEURS.map((secteur) => (
              <li key={secteur.nom}>
                <img
                  src={secteur.photo}
                  alt=""
                  aria-hidden
                  loading="lazy"
                  className="aspect-[4/3] w-full rounded-[8px] object-cover"
                />
                <h3 className="mt-3 font-display text-base font-bold leading-snug text-ink-900 sm:text-lg">{secteur.nom}</h3>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* -------------------------------------------------- Les certificats */}
      <section className="border-b border-ink-200 bg-surface">
        <div className="mx-auto grid max-w-[75rem] gap-12 px-5 py-16 sm:py-20 lg:grid-cols-[0.85fr_1.15fr] lg:gap-16">
          <div className="min-w-0">
            <h2 className={classeTitreSection}>Se professionnaliser en profondeur.</h2>
            <p className="mt-4 max-w-[48ch] text-lg leading-relaxed text-ink-600">
              Cinq parcours certifiants, en présentiel ou en visioconférence, pour aller au-delà de la sensibilisation.
            </p>

            {/* Une ligne de faits, comme sur la page Solution. */}
            <ul className="mt-8 flex flex-wrap gap-x-8 gap-y-2 text-[15px] text-ink-600">
              {REPERES_CERTIFICAT.map((repere) => (
                <li key={repere.libelle}>
                  <b className="font-display text-xl font-bold tabular-nums text-ink-900">{repere.valeur}</b> {repere.libelle}
                </li>
              ))}
            </ul>

            {/* Le tarif en encre, comme les autres montants du site : le
                bordeaux est réservé à l'action principale. */}
            <dl className="mt-8 divide-y divide-ink-200 border-y border-ink-200">
              <div className="flex items-baseline justify-between gap-4 py-4">
                <dt className="text-[15px] text-ink-600">Modalités</dt>
                <dd className="text-right text-[15px] font-semibold text-ink-900">Présentiel et visioconférence</dd>
              </div>
              <div className="flex items-baseline justify-between gap-4 py-4">
                <dt className="text-[15px] text-ink-600">Tarif par certificat</dt>
                <dd className="font-display text-2xl font-bold tabular-nums text-ink-900">2 500 €</dd>
              </div>
            </dl>
          </div>

          <ol className="min-w-0 border-t border-ink-300">
            {CERTIFICATS.map((certificat, index) => (
              <li key={certificat.titre} className="grid grid-cols-[2rem_1fr] border-b border-ink-200 py-5">
                <span className="pt-0.5 text-sm font-medium tabular-nums text-ink-400">{index + 1}</span>
                <span className="min-w-0">
                  <span className="block font-display text-lg font-bold leading-snug text-ink-900">{certificat.titre}</span>
                  <span className="mt-1.5 block text-[15px] leading-relaxed text-ink-600">{certificat.texte}</span>
                </span>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <AppelAction
        titre="Une formation sur mesure pour votre équipe ?"
        texte="Décrivez votre secteur et vos objectifs : nous revenons vers vous avec un programme et des modalités d’inscription adaptés."
        action={{ libelle: 'Nous contacter', vers: '/contact' }}
        secondaire={null}
      />
    </div>
  );
}

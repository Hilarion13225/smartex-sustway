import { Link } from 'react-router-dom';
import AppelAction from '../components/AppelAction';
import Revele from '../components/Revele';
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



const classeTitreSection =
  'font-display text-[1.875rem] font-bold leading-[1.08] tracking-[-0.025em] text-ink-900 sm:text-[2.75rem] [text-wrap:balance]';

/**
 * Page « Se former ».
 *
 * Même langage que les autres pages de la vitrine : aucun élément n'y est
 * cliquable s'il n'en a pas l'air, et rien n'a l'air cliquable s'il ne l'est
 * pas — d'où la disparition du soulèvement au survol des thématiques,
 * qui ne mènent nulle part.
 */
export default function Formation() {
  return (
    <div>
      {/* --------------------------------------------------------- Héros */}
      <section className="border-b border-ink-200">
        <div className="mx-auto grid max-w-[90rem] gap-12 px-5 pb-14 pt-10 sm:pt-14 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:gap-16 lg:pb-20 lg:pt-20">
          <div className="min-w-0">
            <h1 className="titre-page max-w-[16ch] text-ink-900">Développez vos compétences en RSE et ESG.</h1>

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

      {/* -------------------------------------------------- Nos thématiques */}
      <section id="thematiques" className="scroll-mt-20 border-b border-ink-200">
        <div className="mx-auto max-w-[90rem] px-5 py-16 sm:py-20">
          <div className="max-w-2xl">
            <h2 className={`mx-auto max-w-3xl text-center ${classeTitreSection}`}>Des contenus adaptés à votre activité.</h2>
            <p className="mx-auto mt-4 max-w-[56ch] text-center text-lg leading-relaxed text-ink-600">
              Les enjeux RSE d’une banque ne sont pas ceux d’une mine. Chaque thématique part des réalités de votre
              secteur.
            </p>
          </div>

          {/* Le nom sous la photo, et non plus en blanc sur la photo : sur une
              image claire (le chantier, l'hôtel), le contraste tombait sous le
              seuil de lecture malgré le dégradé. */}
          <ul className="mt-12 grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-3 lg:grid-cols-5 lg:gap-x-5">
            {SECTEURS.map((secteur, index) => (
              <Revele key={secteur.nom} as="li" delai={index * 45}>
                <img
                  src={secteur.photo}
                  alt=""
                  aria-hidden
                  loading="lazy"
                  className="aspect-[4/3] w-full rounded-[8px] object-cover"
                />
                <h3 className="mt-3 font-display text-base font-bold leading-snug text-ink-900 sm:text-lg">{secteur.nom}</h3>
              </Revele>
            ))}
          </ul>
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

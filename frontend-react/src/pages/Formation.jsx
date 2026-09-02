import {
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
import EnTeteVitrine from '../components/EnTeteVitrine';
import TitreSection from '../components/TitreSection';
import Revele from '../components/Revele';
import AppelAction from '../components/AppelAction';
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

const FORMATS = [
  { icone: Wrench, titre: 'Ateliers pratiques', texte: 'Mise en situation directe sur des cas concrets liés à votre secteur d’activité.' },
  { icone: GraduationCap, titre: 'Cours de maître', texte: 'Sessions animées par des experts reconnus sur un sujet RSE/DD précis.' },
  { icone: Presentation, titre: 'Séminaires de formation', texte: 'Programme structuré sur plusieurs sessions, avec supports et évaluation.' },
  { icone: Mic2, titre: 'Conférences — débats', texte: 'Temps d’échange sur les grands enjeux RSE et développement durable.' },
  { icone: Building2, titre: 'Réunions entreprises', texte: 'Format dédié à une organisation, adapté à son contexte et ses équipes.' },
  { icone: Users, titre: 'Activités intervenants', texte: 'Intervention d’experts Smartex Expertises directement dans vos équipes.' },
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

export default function Formation() {
  return (
    <div>
      <EnTeteVitrine
        etiquette="Se former à la RSE et DD"
        icone={GraduationCap}
        titre="Formation à la RSE et au développement durable"
        description="Ateliers, séminaires, conférences et certificats de spécialisation : différentes formations existent pour se perfectionner dans ces domaines d’expertise."
        image={photoBanniere}
        reperes={[
          { valeur: '6', libelle: 'formats de formation' },
          { valeur: '5', libelle: 'certificats' },
          { valeur: '120 h', libelle: 'par certificat' },
        ]}
      />

      <section className="mx-auto max-w-[90rem] px-5 py-24">
        <TitreSection
          etiquette="Nos formats"
          icone={Presentation}
          titre="Six formats, un même niveau d’exigence"
        />

        <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {FORMATS.map((format, index) => (
            <Revele key={format.titre} delai={index * 90}>
              <article className="carte-vitrine group h-full !p-8">
                <span className="puce-icone">
                  <format.icone className="h-5 w-5" aria-hidden />
                </span>
                <h3 className="titre-editorial mt-7 text-xl text-ink-900">{format.titre}</h3>
                <p className="mt-3 text-sm font-light leading-relaxed text-ink-500">{format.texte}</p>
              </article>
            </Revele>
          ))}
        </div>
      </section>

      <section className="border-y border-ink-100 bg-ink-50 py-24">
        <div className="mx-auto max-w-[90rem] px-5">
          <TitreSection
            etiquette="Actualités sectorielles"
            icone={Building2}
            titre="Des contenus adaptés à votre activité"
          />

          <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {SECTEURS.map((secteur, index) => (
              <Revele key={secteur.nom} delai={index * 60}>
                <article className="group relative h-56 overflow-hidden rounded-2xl shadow-soft transition duration-300 motion-safe:hover:-translate-y-1">
                  <img
                    src={secteur.photo}
                    alt=""
                    className="h-full w-full object-cover transition duration-700 group-hover:scale-110"
                    aria-hidden
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#141821]/90 via-[#141821]/35 to-transparent" aria-hidden />
                  <div className="absolute inset-x-0 bottom-0 flex items-center gap-3 p-6 text-white">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/15 backdrop-blur transition-colors duration-300 group-hover:bg-brand-600">
                      <secteur.icone className="h-5 w-5" aria-hidden />
                    </span>
                    <h3 className="titre-editorial text-lg">{secteur.nom}</h3>
                  </div>
                </article>
              </Revele>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[90rem] px-5 py-24">
        <div className="grid gap-14 lg:grid-cols-[0.85fr_1.15fr]">
          <div>
            <TitreSection
              etiquette="Certificats de spécialisation"
              icone={GraduationCap}
              titre="Cinq certificats, pour se professionnaliser en profondeur"
            />
            <Revele delai={120}>
              <dl className="mt-10 space-y-5 border-t border-ink-100 pt-8">
                <div className="flex items-center justify-between gap-4">
                  <dt className="flex items-center gap-2 text-sm text-ink-500">
                    <Clock className="h-4 w-4 text-brand-500 dark:text-brand-400" aria-hidden />
                    Durée
                  </dt>
                  <dd className="titre-editorial text-xl text-ink-900">120 heures</dd>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <dt className="text-sm text-ink-500">Modules</dt>
                  <dd className="titre-editorial text-xl text-ink-900">6</dd>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <dt className="text-sm text-ink-500">Modalités</dt>
                  <dd className="text-sm font-medium text-ink-900">Présentiel et visioconférence</dd>
                </div>
                <div className="flex items-center justify-between gap-4 border-t border-ink-100 pt-5">
                  <dt className="text-sm text-ink-500">Tarif par certificat</dt>
                  <dd className="titre-editorial text-2xl text-brand-600 dark:text-brand-400">2 500 €</dd>
                </div>
              </dl>
            </Revele>
          </div>

          <ol className="space-y-4">
            {CERTIFICATS.map((certificat, index) => (
              <Revele key={certificat.titre} delai={index * 90} as="li">
                <article className="group flex items-start gap-6 rounded-2xl border border-ink-100 bg-surface p-7 transition duration-300 hover:border-brand-200 hover:shadow-soft motion-safe:hover:-translate-y-1">
                  <span className="titre-editorial shrink-0 text-2xl leading-none text-brand-200 transition-colors duration-300 group-hover:text-brand-500 dark:text-brand-500/40 dark:group-hover:text-brand-400">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <div className="min-w-0">
                    <h3 className="titre-editorial flex items-center gap-3 text-lg text-ink-900">
                      <certificat.icone className="h-5 w-5 shrink-0 text-brand-500 dark:text-brand-400" aria-hidden />
                      {certificat.titre}
                    </h3>
                    <p className="mt-2 text-sm font-light leading-relaxed text-ink-500">{certificat.texte}</p>
                  </div>
                </article>
              </Revele>
            ))}
          </ol>
        </div>
      </section>

      <AppelAction
        titre="Une formation sur mesure pour votre équipe ?"
        texte="Décrivez votre secteur et vos objectifs : nous revenons vers vous avec un programme et des modalités d’inscription adaptés."
      />
    </div>
  );
}

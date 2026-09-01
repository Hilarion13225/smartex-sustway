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
  Presentation,
  Radio,
  ScrollText,
  ShoppingBag,
  ShoppingCart,
  Sparkles,
  Users,
  Wrench,
  Zap,
} from 'lucide-react';
import EnTeteVitrine from '../components/EnTeteVitrine';
import Revele from '../components/Revele';
import AppelAction from '../components/AppelAction';
import { Badge } from '../components/ui';
import photoBanniere from '../assets/formation/banniere.jpg';
import photoActuGenerale from '../assets/formation/actu-generale.jpg';
import photoBtp from '../assets/formation/btp.jpg';
import photoTourisme from '../assets/formation/tourisme.jpg';
import photoPetrole from '../assets/formation/petrole.jpg';
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
  { icone: Fuel, nom: 'Mines et pétrole', photo: photoPetrole },
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
    icone: ScrollText,
    titre: 'Politique et stratégie sectorielles de RSE',
    texte: 'Bonnes pratiques RSE, déploiement opérationnel, reporting extra-financier et référentiels de normalisation.',
  },
  {
    icone: Leaf,
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
        titre="Formation à la RSE et au Développement Durable"
        description="Différentes formations existent pour se perfectionner dans ces domaines d’expertise."
        image={photoBanniere}
      />

      <section className="mx-auto max-w-[90rem] px-5 py-20">
        <Revele className="max-w-2xl">
          <Badge ton="bleu" icone={Sparkles}>
            Agenda
          </Badge>
          <h2 className="mt-4 text-3xl font-semibold text-ink-900">Six formats, un même niveau d’exigence</h2>
        </Revele>

        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {FORMATS.map((format, index) => (
            <Revele key={format.titre} delai={index * 90}>
              <article className="carte-vitrine group h-full">
                <span className="puce-icone">
                  <format.icone className="h-5 w-5" aria-hidden />
                </span>
                <h3 className="mt-4 text-base font-semibold text-ink-900">{format.titre}</h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-500">{format.texte}</p>
              </article>
            </Revele>
          ))}
        </div>
      </section>

      <section className="border-y border-ink-100 bg-ink-50 py-20">
        <div className="mx-auto max-w-[90rem] px-5">
          <Revele className="max-w-2xl">
            <Badge ton="violet" icone={Building2}>
              Actualités sectorielles
            </Badge>
            <h2 className="mt-4 text-3xl font-semibold text-ink-900">Des contenus adaptés à votre activité</h2>
          </Revele>

          <div className="mt-10 grid gap-6 sm:grid-cols-3 lg:grid-cols-3">
            {SECTEURS.map((secteur, index) => (
              <Revele key={secteur.nom} delai={index * 60}>
                <article className="carte-vitrine group overflow-hidden p-0">
                  <div className="relative h-36 overflow-hidden">
                    <img
                      src={secteur.photo}
                      alt=""
                      className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                      aria-hidden
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#1f2533]/70 via-transparent to-transparent" aria-hidden />
                    <span className="absolute bottom-3 left-3 flex h-8 w-8 items-center justify-center rounded-lg bg-white/15 text-white backdrop-blur">
                      <secteur.icone className="h-4 w-4" aria-hidden />
                    </span>
                  </div>
                  <h3 className="p-4 text-sm font-semibold text-ink-900">{secteur.nom}</h3>
                </article>
              </Revele>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[90rem] px-5 py-20">
        <Revele className="max-w-2xl">
          <Badge ton="vert" icone={GraduationCap}>
            Certificats de spécialisation
          </Badge>
          <h2 className="mt-4 text-3xl font-semibold text-ink-900">Cinq certificats, pour se professionnaliser en profondeur</h2>
          <p className="mt-3 flex items-center gap-2 text-sm text-ink-600">
            <Clock className="h-4 w-4 text-brand-500 dark:text-brand-400" aria-hidden />
            120 heures par certificat (présentiel et visioconférence) — 6 modules — 2 500 €
          </p>
        </Revele>

        <div className="mt-10 grid gap-6 sm:grid-cols-2">
          {CERTIFICATS.map((certificat, index) => (
            <Revele key={certificat.titre} delai={index * 100}>
              <article className="carte-vitrine group h-full">
                <span className="puce-icone">
                  <certificat.icone className="h-5 w-5" aria-hidden />
                </span>
                <h3 className="mt-4 text-base font-semibold text-ink-900">{certificat.titre}</h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-500">{certificat.texte}</p>
              </article>
            </Revele>
          ))}
        </div>
      </section>

      <AppelAction
        titre="Une formation sur mesure pour votre équipe ?"
        texte="Décrivez votre secteur et vos objectifs : nous revenons vers vous avec un programme et des modalités d’inscription adaptés."
      />
    </div>
  );
}

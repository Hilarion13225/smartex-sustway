import { Link } from 'react-router-dom';
import { ArrowRight, ClipboardList, Handshake, Receipt, ReceiptText, ShieldCheck, Timer } from 'lucide-react';
import EnTeteVitrine from '../components/EnTeteVitrine';
import TitreSection from '../components/TitreSection';
import Revele from '../components/Revele';
import AppelAction from '../components/AppelAction';
import SectionFormules from '../components/SectionFormules';
import photoBanniere from '../assets/methodologie/engagement-illustration.jpg';
import photoDiagnostic from '../assets/methodologie/engagement-diagnostic.jpg';

const PROMESSES = [
  {
    icone: ShieldCheck,
    titre: 'Prestation sur mesure',
    texte: 'Le périmètre est calibré sur votre activité, votre taille et votre niveau de maturité RSE réel.',
  },
  {
    icone: Timer,
    titre: 'Délais de mission maîtrisés',
    texte: 'Les phases d’analyse et de mesure sont traitées par le pipeline d’agents IA, sans file d’attente consultant.',
  },
  {
    icone: Receipt,
    titre: 'Coûts d’intervention réalistes',
    texte: 'Une proposition d’accompagnement à montant fixe, transparente sur le contenu comme sur les délais.',
  },
];

const ETAPES_ENGAGEMENT = [
  {
    titre: 'Diagnostic stratégique',
    texte: 'Analyse de vos forces, faiblesses, menaces et opportunités pour évaluer votre potentiel de développement.',
  },
  {
    titre: 'Séance de restitution gratuite',
    texte: 'Les conclusions du diagnostic vous sont présentées et discutées, sans engagement de votre part.',
  },
  {
    titre: 'Proposition à montant fixe',
    texte: 'Une proposition d’accompagnement globale vous est adressée, chiffrée selon les phases réellement nécessaires.',
  },
];

export default function Engagement() {
  return (
    <div>
      <EnTeteVitrine
        etiquette="Engageons-nous ensemble"
        icone={Handshake}
        titre="Une prestation sur mesure, des délais maîtrisés, des coûts réalistes"
        description="Un diagnostic stratégique, une restitution gratuite, puis une proposition d’accompagnement globale à montant fixe."
        image={photoBanniere}
        reperes={[
          { valeur: '3', libelle: 'étapes avant contrat' },
          { valeur: 'Gratuite', libelle: 'séance de restitution' },
          { valeur: 'Fixe', libelle: 'montant de la proposition' },
        ]}
      />

      <section className="mx-auto max-w-[90rem] px-5 py-24">
        <div className="grid gap-5 lg:grid-cols-3">
          {PROMESSES.map((promesse, index) => (
            <Revele key={promesse.titre} delai={index * 100}>
              <article className="carte-vitrine group h-full !p-8">
                <span className="puce-icone">
                  <promesse.icone className="h-5 w-5" aria-hidden />
                </span>
                <h3 className="titre-editorial mt-7 text-xl text-ink-900">{promesse.titre}</h3>
                <p className="mt-3 text-sm font-light leading-relaxed text-ink-500">{promesse.texte}</p>
              </article>
            </Revele>
          ))}
        </div>
      </section>

      <section className="border-y border-ink-100 bg-ink-50 py-24">
        <div className="mx-auto grid max-w-[90rem] items-center gap-14 px-5 lg:grid-cols-[1.05fr_0.95fr]">
          <div>
            <TitreSection
              etiquette="Engagement et diagnostic"
              icone={ClipboardList}
              titre="Un diagnostic stratégique avant tout engagement"
              description="Un outil de diagnostic stratégique évalue votre potentiel de développement en analysant vos forces, faiblesses, menaces et opportunités. Une séance de restitution gratuite suit ce diagnostic."
            />

            <ol className="mt-12 space-y-8">
              {ETAPES_ENGAGEMENT.map((etape, index) => (
                <Revele key={etape.titre} delai={index * 110} as="li">
                  <div className="flex gap-6 border-t border-ink-200 pt-7">
                    <span className="titre-editorial shrink-0 text-2xl leading-none text-brand-500 dark:text-brand-400">
                      {String(index + 1).padStart(2, '0')}
                    </span>
                    <div>
                      <h3 className="titre-editorial text-xl text-ink-900">{etape.titre}</h3>
                      <p className="mt-2 text-sm font-light leading-relaxed text-ink-500">{etape.texte}</p>
                    </div>
                  </div>
                </Revele>
              ))}
            </ol>
          </div>

          <Revele delai={140}>
            <figure className="overflow-hidden rounded-[2rem] bg-[#1f2533] shadow-soft">
              <img src={photoDiagnostic} alt="" className="h-64 w-full object-cover" aria-hidden />
              <figcaption className="p-8 text-white">
                <p className="sur-titre text-white/60">
                  <span className="filet" aria-hidden />
                  <ReceiptText className="h-4 w-4" aria-hidden />
                  Facturation et durée
                </p>
                <p className="mt-4 text-sm font-light leading-relaxed text-white/85">
                  La facturation dépend de l’activité et de la taille de l’entreprise : les coûts correspondent au temps
                  nécessaire pour réaliser les phases successives de la démarche, avec transparence complète du montant
                  et des délais.
                </p>
                <Link
                  to="/deploiement"
                  className="btn group mt-6 rounded-full border border-white/25 bg-white/10 px-5 py-2.5 text-white transition duration-300 hover:bg-white/20"
                >
                  Voir le détail des étapes
                  <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" aria-hidden />
                </Link>
              </figcaption>
            </figure>
          </Revele>
        </div>
      </section>

      <SectionFormules
        titre="Standard ou Avancées : le niveau d’accompagnement adapté à votre maturité"
        description="La formule Standard couvre l’auto-évaluation, des rapports simples et la mise en œuvre opérationnelle. La formule Avancées ajoute une évaluation enrichie, des analyses détaillées et des rapports complets — toutes deux avec un support dédié."
        id="formules-engagement"
      />

      <AppelAction
        titre="Discutons de votre diagnostic stratégique"
        texte="Décrivez votre contexte : nous revenons vers vous avec une proposition d’accompagnement à montant fixe."
      />
    </div>
  );
}

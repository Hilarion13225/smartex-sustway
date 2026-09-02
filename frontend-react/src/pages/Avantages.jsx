import { Link } from 'react-router-dom';
import { ArrowRight, Award, Layers, Package, Sparkles, ShieldCheck, TrendingUp } from 'lucide-react';
import EnTeteVitrine from '../components/EnTeteVitrine';
import TitreSection from '../components/TitreSection';
import Revele from '../components/Revele';
import AppelAction from '../components/AppelAction';
import { SMARTEX } from '../config/smartex';
import photoBanniere from '../assets/methodologie/avantages-banniere.jpg';
import photoIllustration from '../assets/methodologie/avantages-illustration.jpg';

const BENEFICES = [
  {
    icone: ShieldCheck,
    titre: 'Diversité de bénéfices',
    texte: 'Avantages compétitifs et maîtrise des risques sociaux, environnementaux, réputationnels et juridiques.',
  },
  {
    icone: TrendingUp,
    titre: 'Bénéfices à travers les coûts cachés',
    texte: 'La démarche aide les dirigeants à objectiver la maîtrise des questions sociales, souvent invisibles dans les comptes.',
  },
  {
    icone: Sparkles,
    titre: 'Prestation sur mesure',
    texte: 'Un accompagnement adapté au niveau de maturité réel de l’organisation, pas une grille générique.',
  },
  {
    icone: Layers,
    titre: 'Accompagnement global à haute valeur ajoutée',
    texte: 'Un processus complet, de la définition des enjeux jusqu’au déploiement des actions correctives.',
  },
  {
    icone: Package,
    titre: 'Systèmes de management certifiables ou non',
    texte: 'Flexibilité de l’approche : viser une certification formelle ou simplement structurer la démarche en interne.',
  },
];

const LEVIERS = ['Légitimité', 'Compétitivité', 'Attractivité', 'Innovation', 'Création de valeur', 'Gestion des risques'];

export default function Avantages() {
  return (
    <div>
      <EnTeteVitrine
        etiquette="Bénéfices de la solution"
        icone={Award}
        titre="Au-delà de l’obligation réglementaire, une performance globale"
        description={`Le déploiement de ${SMARTEX.produit} génère des bénéfices en légitimité, compétitivité, attractivité, innovation, création de valeur et gestion des risques.`}
        image={photoBanniere}
        reperes={[
          { valeur: '6', libelle: 'leviers de valeur' },
          { valeur: '5', libelle: 'bénéfices structurants' },
          { valeur: '360°', libelle: 'maîtrise des risques' },
        ]}
      />

      <section className="mx-auto grid max-w-[90rem] items-center gap-14 px-5 py-24 lg:grid-cols-[0.95fr_1.05fr]">
        <Revele>
          <figure className="relative overflow-hidden rounded-[2rem] shadow-soft">
            <img src={photoIllustration} alt="" className="h-[24rem] w-full object-cover" aria-hidden />
            <div className="absolute inset-0 bg-gradient-to-t from-[#141821]/70 to-transparent" aria-hidden />
          </figure>
        </Revele>

        <Revele delai={120}>
          <blockquote className="titre-editorial text-2xl font-normal italic leading-snug text-ink-800 sm:text-[2rem]">
            « Pragmatique et innovante, l’approche {SMARTEX.produit} est résolument fondée sur la recherche de la
            performance globale. »
          </blockquote>
          <ul className="mt-10 flex flex-wrap gap-2.5">
            {LEVIERS.map((levier) => (
              <li
                key={levier}
                className="rounded-full border border-ink-200 px-4 py-1.5 text-xs font-medium uppercase tracking-[0.14em] text-ink-600 transition-colors duration-300 hover:border-brand-300 hover:text-brand-700 dark:hover:text-brand-400"
              >
                {levier}
              </li>
            ))}
          </ul>
          <Link to="/engagement" className="btn-vitrine-clair group mt-10">
            Voir nos modalités d’engagement
            <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" aria-hidden />
          </Link>
        </Revele>
      </section>

      <section className="border-y border-ink-100 bg-ink-50 py-24">
        <div className="mx-auto max-w-[90rem] px-5">
          <TitreSection
            etiquette="Ce que la démarche apporte"
            icone={Award}
            titre="Cinq bénéfices que nos missions rendent mesurables"
          />

          <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {BENEFICES.map((benefice, index) => (
              <Revele key={benefice.titre} delai={index * 100}>
                <article className="carte-vitrine group h-full !p-8">
                  <div className="flex items-baseline justify-between">
                    <span className="titre-editorial text-4xl leading-none text-brand-200 transition-colors duration-300 group-hover:text-brand-500 dark:text-brand-500/40 dark:group-hover:text-brand-400">
                      {String(index + 1).padStart(2, '0')}
                    </span>
                    <span className="puce-icone">
                      <benefice.icone className="h-5 w-5" aria-hidden />
                    </span>
                  </div>
                  <h3 className="titre-editorial mt-8 text-xl text-ink-900">{benefice.titre}</h3>
                  <p className="mt-3 text-sm font-light leading-relaxed text-ink-500">{benefice.texte}</p>
                </article>
              </Revele>
            ))}

            <Revele delai={500}>
              <article className="relative flex h-full flex-col justify-between overflow-hidden rounded-2xl bg-[#1f2533] p-8 text-white shadow-soft">
                <span
                  className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-brand-500/30 blur-3xl motion-safe:animate-respiration"
                  aria-hidden
                />
                <div className="relative">
                  <p className="sur-titre text-white/60">
                    <span className="filet" aria-hidden />
                    Résultat
                  </p>
                  <p className="titre-editorial mt-6 text-2xl leading-snug">
                    Améliorer la performance globale, conférer des avantages compétitifs et ancrer une démarche
                    d’amélioration continue innovante.
                  </p>
                </div>
                <Link to="/contact" className="btn-vitrine group relative mt-10 self-start">
                  Parler à un expert
                  <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" aria-hidden />
                </Link>
              </article>
            </Revele>
          </div>
        </div>
      </section>

      <div className="pt-24">
        <AppelAction
          titre="Prêt à objectiver vos bénéfices RSE ?"
          texte="Décrivez votre contexte : nous revenons vers vous avec le référentiel et le niveau de formule adaptés."
        />
      </div>
    </div>
  );
}

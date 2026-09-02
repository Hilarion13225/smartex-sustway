import { Award, Layers, Package, ShieldCheck, Sparkles, TrendingUp } from 'lucide-react';
import EnTeteVitrine from '../components/EnTeteVitrine';
import Revele from '../components/Revele';
import AppelAction from '../components/AppelAction';
import { Badge } from '../components/ui';
import { SMARTEX } from '../config/smartex';
import photoBanniere from '../assets/methodologie/avantages-banniere.jpg';

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

export default function Avantages() {
  return (
    <div>
      <EnTeteVitrine
        etiquette="Bénéfices de la solution"
        icone={Award}
        titre="Au-delà de l’obligation réglementaire, une performance globale"
        description="Le déploiement de SMARTEX SustWay génère des bénéfices en légitimité, compétitivité, attractivité, innovation, création de valeur et gestion des risques."
        image={photoBanniere}
      />

      <section className="mx-auto max-w-[90rem] px-5 py-20">
        <Revele className="max-w-2xl">
          <blockquote className="border-l-4 border-brand-500 pl-5 text-base italic leading-relaxed text-ink-700">
            « Pragmatique et innovante, l’approche {SMARTEX.produit} est résolument fondée sur la recherche de la
            performance globale. »
          </blockquote>
        </Revele>

        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {BENEFICES.map((benefice, index) => (
            <Revele key={benefice.titre} delai={index * 100}>
              <article className="carte-vitrine group h-full">
                <span className="puce-icone">
                  <benefice.icone className="h-5 w-5" aria-hidden />
                </span>
                <h3 className="mt-4 text-base font-semibold text-ink-900">{benefice.titre}</h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-500">{benefice.texte}</p>
              </article>
            </Revele>
          ))}
        </div>

        <Revele delai={500} className="mt-10 max-w-2xl">
          <Badge ton="vert">Résultat</Badge>
          <p className="mt-3 text-sm leading-relaxed text-ink-600">
            Améliorer la performance globale de l’entreprise, lui conférer des avantages compétitifs et ancrer une
            démarche d’amélioration continue innovante.
          </p>
        </Revele>
      </section>

      <AppelAction
        titre="Prêt à objectiver vos bénéfices RSE ?"
        texte="Décrivez votre contexte : nous revenons vers vous avec le référentiel et le niveau de formule adaptés."
      />
    </div>
  );
}

import { Link } from 'react-router-dom';
import { ArrowRight, ClipboardList, Handshake, ReceiptText } from 'lucide-react';
import EnTeteVitrine from '../components/EnTeteVitrine';
import Revele from '../components/Revele';
import AppelAction from '../components/AppelAction';
import SectionFormules from '../components/SectionFormules';
import { Badge } from '../components/ui';
import photoBanniere from '../assets/methodologie/engagement-banniere.jpg';

export default function Engagement() {
  return (
    <div>
      <EnTeteVitrine
        etiquette="Engageons-nous ensemble"
        icone={Handshake}
        titre="Une prestation sur mesure, des délais maîtrisés, des coûts réalistes"
        description="Une prestation sur mesure, des délais de mission maîtrisés, des coûts d’intervention réalistes."
        image={photoBanniere}
      />

      <section className="mx-auto grid max-w-[90rem] items-start gap-10 px-5 py-20 lg:grid-cols-2">
        <Revele>
          <Badge ton="bleu" icone={ClipboardList}>
            Engagement et diagnostic
          </Badge>
          <h2 className="mt-4 text-xl font-semibold text-ink-900">Un diagnostic stratégique avant tout engagement</h2>
          <p className="mt-3 text-sm leading-relaxed text-ink-600">
            Un outil de diagnostic stratégique permet d’évaluer votre potentiel de développement en analysant vos forces,
            faiblesses, menaces et opportunités. Une séance de restitution gratuite suit ce diagnostic, à l’issue de
            laquelle une proposition d’accompagnement globale, à montant fixe, vous est adressée.
          </p>
        </Revele>

        <Revele delai={120}>
          <Badge ton="ambre" icone={ReceiptText}>
            Facturation et durée
          </Badge>
          <h2 className="mt-4 text-xl font-semibold text-ink-900">
            Comment facturons-nous notre intervention, et quelle est sa durée moyenne ?
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-ink-600">
            La facturation dépend de l’activité et de la taille de l’entreprise : les coûts correspondent au temps
            nécessaire pour réaliser les phases successives de la démarche. L’engagement porte sur une prestation sur
            mesure, à un coût d’intervention réaliste, avec transparence complète du montant et des délais.
          </p>
          <Link to="/deploiement" className="btn-vitrine-clair group mt-4">
            Voir le détail des étapes
            <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" aria-hidden />
          </Link>
        </Revele>
      </section>

      <div className="border-y border-ink-100 bg-ink-50">
        <SectionFormules
          titre="Standard ou Avancées : le niveau d’accompagnement adapté à votre maturité"
          description="La formule Standard couvre l’auto-évaluation, des rapports simples et la mise en œuvre opérationnelle. La formule Avancées ajoute une évaluation enrichie, des analyses détaillées et des rapports complets — toutes deux avec un support dédié."
          id="formules-engagement"
        />
      </div>

      <AppelAction
        titre="Discutons de votre diagnostic stratégique"
        texte="Décrivez votre contexte : nous revenons vers vous avec une proposition d’accompagnement à montant fixe."
      />
    </div>
  );
}

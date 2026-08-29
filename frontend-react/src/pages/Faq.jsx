import { useState } from 'react';
import { ChevronDown, CircleHelp } from 'lucide-react';
import clsx from 'clsx';
import EnTeteVitrine from '../components/EnTeteVitrine';
import Revele from '../components/Revele';
import AppelAction from '../components/AppelAction';
import { SMARTEX } from '../config/smartex';

const QUESTIONS = [
  {
    question: 'À qui s’adresse la plateforme ?',
    reponse:
      'Aux entreprises qui doivent structurer leur démarche RSE : première évaluation, préparation d’un audit externe ou constitution d’un dossier auprès d’un bailleur. Le questionnaire s’adapte au secteur et à la taille déclarés.',
  },
  {
    question: 'Comment la note est-elle calculée ?',
    reponse:
      'Le pipeline IA estime une probabilité de conformité par critère, convertie en niveau d’engagement de 1 à 5. La note obtenue est le produit du niveau et du coefficient du critère ; le score est la somme des notes obtenues divisée par la somme des coefficients, sur les seuls critères actifs.',
  },
  {
    question: 'La criticité influence-t-elle le score ?',
    reponse:
      'Non. La criticité sert uniquement à calculer le risque attendu et donc l’ordre de priorité des actions correctives. Elle n’entre jamais dans le calcul du score.',
  },
  {
    question: 'Un expert relit-il les résultats ?',
    reponse:
      'En formule Avancées, tout critère évalué avec une confiance inférieure à 80 % est routé vers une file de revue humaine avant publication du rapport.',
  },
  {
    question: 'Que signifie l’indice de préparation aux financements verts ?',
    reponse:
      'C’est une mesure d’alignement aux 8 Performance Standards du bailleur pilote, restreinte aux critères concernés. Il indique le niveau de préparation du dossier : ce n’est pas une garantie d’éligibilité ni une décision de financement.',
  },
  {
    question: 'Que puis-je faire avec la formule Free ?',
    reponse:
      'La formule Free est un mode de démonstration : elle permet de parcourir la plateforme mais pas de créer une entreprise ni de lancer une évaluation.',
  },
  {
    question: 'Quels moyens de paiement sont acceptés ?',
    reponse:
      'Les formules Standard et Avancées se règlent via PI-SPI et Wave, à prix fixe mensuel.',
  },
  {
    question: 'Mes documents sont-ils confidentiels ?',
    reponse:
      'Oui. Les données sont chiffrées au repos et en transit, et chaque entreprise est isolée des autres locataires de la plateforme, conformément au RGPD.',
  },
];

export default function Faq() {
  const [ouvert, setOuvert] = useState(0);

  return (
    <div>
      <EnTeteVitrine
        etiquette="Questions fréquentes"
        icone={CircleHelp}
        titre="Tout ce qu’il faut savoir avant de commencer"
        description={`Méthodologie, formules, confidentialité : les réponses aux questions les plus posées à l’équipe ${SMARTEX.editeur}.`}
      />

      <section className="mx-auto max-w-3xl px-5 py-20">
        <ul className="space-y-3">
          {QUESTIONS.map((element, index) => {
            const actif = ouvert === index;
            return (
              <Revele key={element.question} delai={index * 60}>
                <li className="overflow-hidden rounded-2xl border border-ink-100 bg-surface shadow-soft transition-colors duration-300 hover:border-brand-200">
                  <button
                    type="button"
                    className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
                    onClick={() => setOuvert(actif ? -1 : index)}
                    aria-expanded={actif}
                  >
                    <span className="text-sm font-semibold text-ink-900">{element.question}</span>
                    <ChevronDown
                      className={clsx('h-4 w-4 shrink-0 text-brand-600 transition-transform duration-300', actif && 'rotate-180')}
                      aria-hidden
                    />
                  </button>
                  <div
                    className={clsx(
                      'grid transition-all duration-300 ease-out',
                      actif ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
                    )}
                  >
                    <p className="overflow-hidden px-5 pb-5 text-sm leading-relaxed text-ink-600">{element.reponse}</p>
                  </div>
                </li>
              </Revele>
            );
          })}
        </ul>
      </section>

      <AppelAction
        titre="Votre question n’est pas dans la liste ?"
        texte="Écrivez-nous : nous répondons sous un jour ouvré aux demandes reçues via le formulaire de contact."
      />
    </div>
  );
}

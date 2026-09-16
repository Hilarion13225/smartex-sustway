import EnTeteVitrine from '../components/EnTeteVitrine';
import Revele from '../components/Revele';
import AppelAction from '../components/AppelAction';
import ListeQuestions from '../components/vitrine/ListeQuestions';
import { QUESTIONS as QUESTIONS_FORMULES } from '../lib/formules';
import { SMARTEX } from '../config/smartex';

/*
 * Les questions sont rangées par thème, dans l'ordre où un acheteur se les
 * pose : ce que fait la plateforme, comment elle note, ce que cela coûte.
 *
 * Le dernier thème reprend telles quelles les questions de la page Formules,
 * au lieu d'en tenir une seconde version ici : les deux listes disaient la
 * même chose sur le paiement et la confidentialité, en des termes différents,
 * et l'une finirait par contredire l'autre.
 */
const THEMES = [
  {
    ancre: 'demarche',
    titre: 'La démarche',
    questions: [
      {
        question: 'À qui s’adresse la plateforme ?',
        reponse:
          'Aux entreprises qui doivent structurer leur démarche RSE : première évaluation, préparation d’un audit externe ou constitution d’un dossier auprès d’un bailleur. Le questionnaire s’adapte au secteur et à la taille déclarés.',
      },
      {
        // Réponse alignée sur le comparatif des formules (« Revue experte » en
        // Avancées et Entreprise) et sur la règle RG38 de l'API : une
        // évaluation dont la confiance IA est sous 0,80 part en revue experte.
        question: 'Un expert relit-il les résultats ?',
        reponse:
          'En formule Standard, l’évaluation est réalisée par le pipeline d’agents IA, et chaque critère affiche un indice de confiance. En formules Avancées et Entreprise, un critère dont l’indice de confiance est jugé insuffisant est relu par un expert avant d’être validé.',
      },
    ],
  },
  {
    ancre: 'notation',
    titre: 'La notation',
    questions: [
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
        question: 'Que signifie l’indice de préparation aux financements verts ?',
        reponse:
          'C’est une mesure d’alignement aux 8 Performance Standards du bailleur pilote, restreinte aux critères concernés. Il indique le niveau de préparation du dossier : ce n’est pas une garantie d’éligibilité ni une décision de financement.',
      },
    ],
  },
  {
    ancre: 'formules-et-donnees',
    titre: 'Formules, paiement et données',
    questions: QUESTIONS_FORMULES,
  },
];

export default function Faq() {
  return (
    <div>
      <EnTeteVitrine
        etiquette="Questions fréquentes"
        titre="Tout ce qu’il faut savoir avant de commencer"
        description={`Méthodologie, formules, confidentialité : les réponses aux questions les plus posées à l’équipe ${SMARTEX.editeur}.`}
      />

      {/* Fond teinte et questions posees dans des cadres blancs : sur une page
          aussi longue, le contraste entre le fond et le bloc lu donne un point
          d'ancrage que la liste a filets seule ne donnait pas. */}
      <div className="bande-feuille">
      <section className="mx-auto grid max-w-[75rem] gap-10 px-5 py-14 sm:py-20 lg:grid-cols-[14rem_1fr] lg:gap-16">
        {/* Sommaire collant sur grand écran. Sur téléphone il est omis : les
            trois thèmes se suivent de près, et un sommaire en tête ne ferait
            que repousser la première question sous le pli. */}
        <nav aria-label="Thèmes des questions" className="hidden lg:block">
          <ul className="sticky top-28 space-y-1 border-l border-ink-200">
            {THEMES.map((theme) => (
              <li key={theme.ancre}>
                <a
                  href={`#${theme.ancre}`}
                  className="-ml-px flex min-h-10 items-center border-l-2 border-transparent pl-4 text-[15px] text-ink-600 transition-colors hover:border-ink-900 hover:text-ink-900"
                >
                  {theme.titre}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="min-w-0 max-w-3xl space-y-8">
          {THEMES.map((theme, indexTheme) => (
            <Revele key={theme.ancre} delai={indexTheme * 90}>
            <section id={theme.ancre} aria-labelledby={`titre-${theme.ancre}`} className="carte-posee scroll-mt-28 rounded-[12px] border border-ink-200 bg-surface p-6 sm:p-8">
              <h2
                id={`titre-${theme.ancre}`}
                className="font-display text-2xl font-bold leading-tight tracking-[-0.02em] text-ink-900 sm:text-[1.875rem]"
              >
                {theme.titre}
              </h2>
              {/* La toute première réponse est ouverte : le visiteur voit d'emblée
                  qu'une question se déplie, et à quoi ressemble une réponse. */}
              <ListeQuestions
                questions={theme.questions}
                ouverteParDefaut={indexTheme === 0 ? 0 : null}
                className="mt-6"
              />
            </section>
            </Revele>
          ))}
        </div>
      </section>
      </div>

      <AppelAction
        titre="Votre question n’est pas dans la liste ?"
        texte="Écrivez-nous : nous répondons sous un jour ouvré aux demandes reçues via le formulaire de contact."
        action={{ libelle: 'Poser ma question', vers: '/contact' }}
        secondaire={{ libelle: 'Voir les formules', vers: '/formules#grille-formules' }}
      />
    </div>
  );
}

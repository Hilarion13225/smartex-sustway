import EnTetePage from '../components/sustway/EnTetePage';
import SectionSolution from '../components/sustway/SectionSolution';
import SectionCtaFinal from '../components/sustway/SectionCtaFinal';
import { useMetaPage } from '../components/sustway/useMetaPage';

/**
 * Page « Solution » : comment SMARTEX SustWay s'y prend.
 *
 * Elle traite de la démarche — les cinq temps, les trois domaines, les
 * livrables — et renvoie aux écrans qui l'exécutent sans les montrer : c'est
 * le sujet de la page « Fonctionnalités ».
 */
export default function Solution() {
  useMetaPage(
    'La solution — SMARTEX SustWay',
    'L’opérationnalisation de la RSE au service de la performance : diagnostiquer, structurer, piloter, optimiser et mesurer votre démarche RSE, ESG et développement durable.'
  );

  return (
    <>
      <EnTetePage
        surTitre="La solution"
        titre="L’opérationnalisation de la RSE au service de la performance"
        sousTitre="Concilier performance économique et maîtrise des impacts durables."
      />
      <SectionSolution />
      <SectionCtaFinal />
    </>
  );
}

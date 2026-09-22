import SectionSolution from '../components/sustway/SectionSolution';
import SectionConfiance from '../components/sustway/SectionConfiance';
import { useMetaPage } from '../components/sustway/useMetaPage';

/**
 * Page « Solution » : comment SMARTEX SustWay s'y prend.
 *
 * Elle traite de la démarche — les cinq temps, les trois domaines, les
 * livrables — et renvoie aux écrans qui l'exécutent sans les montrer : c'est
 * le sujet de la page « Fonctionnalités ».
 *
 * Elle s'ouvre sans bandeau photographique. L'image de fond a été retirée, et
 * avec elle le bandeau qui la portait : la section « Présentation » commence
 * désormais la page et porte son `h1`, ce qui donne au titre et à son
 * paragraphe la colonne de gauche et au schéma celle de droite — la
 * disposition demandée, qu'un bandeau centré au-dessus aurait redoublée.
 */
export default function Solution() {
  useMetaPage(
    'La solution — SMARTEX SustWay',
    'L’opérationnalisation de la RSE au service de la performance : diagnostiquer, structurer, piloter, optimiser et mesurer votre démarche RSE, ESG & DD.'
  );

  return (
    <>
      <SectionSolution />
      {/* Les organisations closent la page : elles répondent à la question
          que se pose un lecteur qui vient de parcourir la démarche, les
          référentiels et les livrables — qui s'en sert déjà. Elles ouvraient
          l'accueil, qui tient désormais en un seul écran. */}
      <SectionConfiance />
    </>
  );
}

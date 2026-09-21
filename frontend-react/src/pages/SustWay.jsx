import SectionHero from '../components/sustway/SectionHero';
import SectionSolution from '../components/sustway/SectionSolution';
import SectionFonctionnalites from '../components/sustway/SectionFonctionnalites';
import SectionOffres from '../components/sustway/SectionOffres';
import SectionRessources from '../components/sustway/SectionRessources';
import SectionCtaFinal from '../components/sustway/SectionCtaFinal';

/**
 * Page d'accueil de la vitrine SMARTEX SustWay.
 *
 * Les six sections suivent l'ordre du récit produit — expliquer, démontrer,
 * convertir : le héros vend la vision, « Solution » expose la méthode,
 * « Fonctionnalités » montre le logiciel, « Offres » situe les niveaux de
 * service, « Ressources » atteste l'expertise, et l'appel final convertit.
 *
 * Chaque section est ancrée sous son propre identifiant, que la navigation
 * suit au défilement (voir EnTetePublic). Elles sont montées ici plutôt que
 * réparties sur six routes : le visiteur qui découvre le produit ne sait pas
 * encore quelle page il cherche, et une lecture continue lui évite d'avoir à
 * choisir.
 */
export default function SustWay() {
  return (
    <>
      <SectionHero />
      <SectionSolution />
      <SectionFonctionnalites />
      <SectionOffres />
      <SectionRessources />
      <SectionCtaFinal />
    </>
  );
}

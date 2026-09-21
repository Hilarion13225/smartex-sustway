import SectionHero from '../components/sustway/SectionHero';
import SectionParcours from '../components/sustway/SectionParcours';
import SectionCtaFinal from '../components/sustway/SectionCtaFinal';
import { useMetaPage } from '../components/sustway/useMetaPage';

/**
 * Page d'accueil de la vitrine SMARTEX SustWay.
 *
 * Elle vend la vision et rien d'autre : ce qu'est la plateforme, la
 * trajectoire qu'elle fait suivre, puis les quatre portes vers le détail.
 * Solution, Fonctionnalités, Offres et Ressources ont chacune leur page ;
 * l'accueil les annonce et y renvoie, sans reprendre leur contenu — le
 * visiteur qui suit le parcours dans l'ordre ne doit rien lire deux fois.
 */
export default function Accueil() {
  useMetaPage(
    'SMARTEX SustWay — Plateforme SaaS de pilotage RSE, ESG et développement durable',
    'SMARTEX SustWay est la plateforme SaaS qui permet de structurer, piloter et mesurer la performance RSE, ESG et développement durable : évaluations, indicateurs extra-financiers, preuves, tableaux de bord, plans d’action et reporting de durabilité.'
  );

  return (
    <>
      <SectionHero />
      <SectionParcours />
      <SectionCtaFinal />
    </>
  );
}

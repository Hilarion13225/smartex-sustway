import SectionHero from '../components/sustway/SectionHero';
import EcranChargement from '../components/sustway/EcranChargement';
import { useMetaPage } from '../components/sustway/useMetaPage';

/**
 * Page d'accueil de la vitrine SMARTEX SustWay.
 *
 * Elle vend la vision et rien d'autre : ce qu'est la plateforme, la
 * trajectoire qu'elle fait suivre, et les organisations qui l'utilisent.
 *
 * Elle tient dans une fenêtre et ne défile pas. Le héros y est seul : la bande
 * des organisations qui le suivait est passée sur la page Solution, et le pied
 * de page n'est pas rendu ici. Une page d'entrée qui tient d'un seul regard
 * pose la promesse sans demander un geste pour la lire en entier.
 *
 * Les quatre parties du site sont atteintes par la barre de navigation,
 * présente en permanence, et les trois actions du héros ouvrent déjà les
 * chemins qui comptent — la solution, les formules, la démonstration. Solution,
 * Fonctionnalités, Offres et Ressources ont chacune leur page ; l'accueil les
 * annonce et y renvoie, sans reprendre leur contenu.
 */
export default function Accueil() {
  useMetaPage(
    'SMARTEX SustWay — Plateforme SaaS de pilotage RSE, ESG & DD',
    'SMARTEX SustWay est la plateforme SaaS qui permet de structurer, piloter et mesurer la performance RSE, ESG & DD : évaluations, indicateurs extra-financiers, preuves, tableaux de bord, plans d’action et reporting de durabilité.'
  );

  return (
    <>
      {/* Le voile d'attente ne paraît qu'ici, et une seule fois par session.
          Il se retire de lui-même ; voir EcranChargement pour ses securites. */}
      <EcranChargement />
      <SectionHero />
    </>
  );
}

import EnTetePage from '../components/sustway/EnTetePage';
import bandeau from '../assets/methodologie/avantages-illustration.jpg';
import SectionFonctionnalites from '../components/sustway/SectionFonctionnalites';
import { useMetaPage } from '../components/sustway/useMetaPage';

/**
 * Page « Fonctionnalités » : les six écrans de la plateforme.
 *
 * C'est la page où le visiteur cesse de lire une promesse et voit un
 * logiciel — chaque entrée porte son aperçu produit.
 */
export default function Fonctionnalites() {
  useMetaPage(
    'Fonctionnalités — SMARTEX SustWay',
    'Campagnes et évaluations, données et indicateurs ESG, preuves et traçabilité, tableaux de bord, plans d’action et reporting : les outils pour piloter votre performance durable.'
  );

  return (
    <>
      <EnTetePage
        image={bandeau}
        titre="Les fonctionnalités essentielles pour piloter votre performance durable"
        sousTitre="Une plateforme conçue pour organiser vos campagnes, structurer vos évaluations et suivre vos résultats depuis un même environnement."
      />
      <SectionFonctionnalites />
    </>
  );
}

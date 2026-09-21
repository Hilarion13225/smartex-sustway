import EnTetePage from '../components/sustway/EnTetePage';
import SectionRessources from '../components/sustway/SectionRessources';
import SectionCtaFinal from '../components/sustway/SectionCtaFinal';
import { useMetaPage } from '../components/sustway/useMetaPage';

/**
 * Page « Ressources » : ce qui aide à comprendre la démarche et à s'y préparer.
 *
 * Deux rubriques annoncées par la charte n'ont pas encore de contenu. Elles
 * sont montrées comme telles, sans lien ni bouton : la page tient ce que la
 * barre de navigation promet, et dit franchement ce qui n'est pas encore
 * ouvert plutôt que d'afficher des articles inventés.
 */
export default function Ressources() {
  useMetaPage(
    'Ressources — SMARTEX SustWay',
    'Formations, méthodologie d’évaluation et questions fréquentes : ce qui aide à comprendre une démarche RSE et ESG et à s’y préparer.'
  );

  return (
    <>
      <EnTetePage
        surTitre="Ressources"
        titre="Ressources & expertise"
        sousTitre="Ce qui aide à comprendre la démarche RSE et ESG, à s’y former et à s’y préparer."
      />
      <SectionRessources />
      <SectionCtaFinal />
    </>
  );
}

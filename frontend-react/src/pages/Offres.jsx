import EnTetePage from '../components/sustway/EnTetePage';
import bandeau from '../assets/methodologie/engagement-illustration.jpg';
import SectionOffres from '../components/sustway/SectionOffres';
import { useMetaPage } from '../components/sustway/useMetaPage';

/**
 * Page « Offres » : les trois niveaux de service.
 *
 * Aucun montant n'y figure. Les tarifs réels vivent sur la page « Formules »,
 * vers laquelle cette page renvoie : les dupliquer garantirait qu'un des deux
 * endroits finisse par mentir.
 */
export default function Offres() {
  useMetaPage(
    'Offres — SMARTEX SustWay',
    'Trois niveaux de service adaptés à chaque organisation : structurer une première démarche, piloter plusieurs périmètres, ou déployer à l’échelle d’un groupe multi-pays.'
  );

  return (
    <>
      <EnTetePage
        image={bandeau}
        titre="Une solution adaptée à votre niveau de déploiement"
        sousTitre="SMARTEX SustWay s’adapte à la taille et à la complexité de votre organisation. Choisissez le niveau de déploiement qui correspond à vos besoins."
      />
      <SectionOffres />
    </>
  );
}

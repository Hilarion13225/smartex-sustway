import EnTetePage from '../components/sustway/EnTetePage';
import SectionOffres from '../components/sustway/SectionOffres';
import SectionCtaFinal from '../components/sustway/SectionCtaFinal';
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
        fond="sable"
        surTitre="Offres"
        titre="Une approche adaptée à chaque organisation"
        sousTitre="Trois niveaux de service, du cadrage d’une première démarche au déploiement multi-entités."
      />
      <SectionOffres />
      <SectionCtaFinal />
    </>
  );
}

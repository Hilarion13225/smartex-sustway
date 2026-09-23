import EnTetePage from '../components/sustway/EnTetePage';
import BoutonDemo from '../components/sustway/BoutonDemo';
import bandeau from '../assets/methodologie/fonctionnalites-banniere.png';
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
        dansLeBandeau={
          <>
            {/* Le texte descriptif et la demande de démonstration tenaient dans
                une section blanche sous le bandeau. Ils s'y lisaient comme un
                second départ, alors qu'ils prolongent l'accroche. */}
            <p className="mx-auto max-w-2xl text-balance text-[16px] leading-relaxed text-white/75 sm:text-[17px]">
              SMARTEX SustWay réunit les outils nécessaires pour simplifier le travail des équipes et donner aux
              responsables une vision claire de l’avancement et de la performance extra-financière.
            </p>
            {/* Blanc et non vert : sur le voile Forest, le vert de marque ne se
                détache qu'à 2,03:1, là où un composant d'interface en demande
                trois. */}
            <BoutonDemo variante="clair" className="mt-8" />
          </>
        }
      />
      <SectionFonctionnalites />
    </>
  );
}

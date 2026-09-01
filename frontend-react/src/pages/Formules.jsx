import { Wallet } from 'lucide-react';
import EnTeteVitrine from '../components/EnTeteVitrine';
import SectionFormules from '../components/SectionFormules';
import AppelAction from '../components/AppelAction';
import { SMARTEX } from '../config/smartex';

export default function Formules() {
  return (
    <div>
      <EnTeteVitrine
        etiquette="Formules et tarifs"
        icone={Wallet}
        titre="Une formule par niveau d’exigence"
        description={`Toutes les formules ${SMARTEX.produit} partagent le même référentiel. Elles se distinguent par le volume d’évaluations, les recommandations d’amélioration et l’accès au volet financements verts.`}
      />

      <SectionFormules
        id="grille-formules"
        titre="Comparez et choisissez"
        description="Le choix de la formule est transmis lors de la création du compte et active immédiatement les fonctionnalités correspondantes."
      />

      <AppelAction
        titre="Besoin d’un cadrage avant de vous engager ?"
        texte="Un expert Smartex vous aide à estimer le périmètre à évaluer et la formule la plus adaptée à vos échéances."
      />
    </div>
  );
}

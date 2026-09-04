import SectionFormules from '../components/SectionFormules';
import AppelAction from '../components/AppelAction';

export default function Formules() {
  return (
    <div>
      <SectionFormules
        id="grille-formules"
        niveauTitre="h1"
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

import { Leaf } from 'lucide-react';
import CarteAnalyseIa from './CarteAnalyseIa';
import CarteProgressionDomaine from './CarteProgressionDomaine';
import CarteReprise from './CarteReprise';

/**
 * Colonne latérale du questionnaire : analyse IA du critère affiché,
 * avancement du domaine et rappel de reprise.
 *
 * Le panneau est purement présentationnel — il reçoit l'analyse et les
 * compteurs du conteneur (SaisieCritereMission), qui seul dialogue avec l'API.
 */
export default function PanneauAnalyseIa({
  analyse,
  analyseEnCours,
  analyseDesynchronisee,
  erreurAnalyse,
  peutAnalyser,
  surAnalyser,
  domaine,
  domaineCompletes,
  domaineTotal,
  surVoirDetailDomaine,
  dernierEnregistrement,
}) {
  return (
    <aside className="space-y-5" aria-label="Analyse et progression">
      <CarteAnalyseIa
        analyse={analyse}
        enCours={analyseEnCours}
        desynchronisee={analyseDesynchronisee}
        erreur={erreurAnalyse}
        peutAnalyser={peutAnalyser}
        surAnalyser={surAnalyser}
      />

      <CarteProgressionDomaine
        domaine={domaine}
        completes={domaineCompletes}
        total={domaineTotal}
        surVoirDetail={surVoirDetailDomaine}
      />

      <CarteReprise dernierEnregistrement={dernierEnregistrement} />

      <div className="relative overflow-hidden rounded-2xl bg-brand-50 p-5 dark:bg-brand-500/10">
        <Leaf
          className="pointer-events-none absolute -bottom-3 -right-3 h-20 w-20 text-brand-600/10 dark:text-brand-400/10"
          aria-hidden
        />
        <p className="relative text-sm leading-relaxed text-brand-800 dark:text-brand-200">
          Vous pouvez à tout moment enregistrer et reprendre plus tard : votre progression est
          conservée.
        </p>
      </div>
    </aside>
  );
}

import { AlertTriangle, Check, Play, ShieldCheck, Sparkles } from 'lucide-react';
import clsx from 'clsx';
import SustwayLoader from '../../SustwayLoader';
import { Alerte, Card, CardHeader } from '../../ui';
import { STATUT } from '../../../lib/importReferentiel';

/**
 * Deuxième étape : montrer que le travail a réellement lieu, sans mentir sur
 * son avancement.
 *
 * Le serveur ne rend aucune progression — l'extraction part en plusieurs lots
 * espacés pour tenir le quota du fournisseur, et personne ne sait à l'avance
 * combien il en faudra. Afficher un pourcentage supposerait de l'inventer.
 * L'écran montre donc ce qui est certain : les jalons franchis, et l'attente
 * en cours.
 *
 * La scrutation elle-même vit dans la page parente, qui possède déjà l'état
 * de l'import : la dupliquer ici ferait deux horloges pour un seul fait.
 */
export default function SuiviAnalyse({ importSuivi, surLancer, lancementEnCours, erreur }) {
  const statut = importSuivi.statut;
  const enAttente = statut === STATUT.EN_ATTENTE;
  const enCours = statut === STATUT.ANALYSE_EN_COURS;
  const echec = statut === STATUT.ECHEC;

  const jalons = [
    { cle: 'recu', libelle: 'Fichier reçu et conservé', icone: Check, atteint: true },
    {
      cle: 'scan',
      libelle: `Contrôlé par l’antivirus (${importSuivi.statutScan})`,
      icone: ShieldCheck,
      atteint: importSuivi.statutScan === 'SAIN',
    },
    {
      cle: 'agents',
      libelle: 'Confié au service d’analyse',
      icone: Sparkles,
      atteint: enCours || statut === STATUT.BROUILLON_GENERE,
    },
  ];

  return (
    <Card className="p-5">
      <CardHeader
        titre={enCours ? 'Analyse en cours' : 'Lancer l’analyse'}
        icone={Sparkles}
        sousTitre="Le document est lu pour en proposer une structure. Le résultat sera un brouillon — rien ne sera publié."
      />

      <div className="mt-5 space-y-5">
        {erreur ? <Alerte ton="rouge">{erreur}</Alerte> : null}

        {echec && importSuivi.erreur ? (
          <Alerte ton="rouge">
            L’analyse a échoué : {importSuivi.erreur}
          </Alerte>
        ) : null}

        <ul className="space-y-2">
          {jalons.map((jalon) => (
            <li key={jalon.cle} className="flex items-center gap-3 text-sm">
              <span
                className={clsx(
                  'flex h-7 w-7 shrink-0 items-center justify-center rounded-full',
                  jalon.atteint
                    ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300'
                    : 'bg-ink-50 text-ink-300'
                )}
              >
                <jalon.icone className="h-4 w-4" aria-hidden />
              </span>
              <span className={jalon.atteint ? 'text-ink-800' : 'text-ink-400'}>
                {jalon.libelle}
              </span>
            </li>
          ))}
        </ul>

        {enCours ? (
          <div
            role="status"
            aria-live="polite"
            className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-ink-200 bg-surface px-6 py-8 text-center"
          >
            <SustwayLoader taille="lg" />
            <p className="text-sm text-ink-700">Lecture du document en cours…</p>
            {/* Dire la durée attendue vaut mieux qu'une fausse jauge : cela
                permet de partir sans croire l'écran bloqué. */}
            <p className="max-w-md text-xs text-ink-500">
              Cette étape prend de quelques secondes à plusieurs minutes selon la taille du
              document. Vous pouvez quitter cette page : l’analyse se poursuit, et vous la
              retrouverez au même point.
            </p>
          </div>
        ) : null}

        {(enAttente || echec) && importSuivi.statutScan !== 'SAIN' ? (
          <Alerte ton="ambre">
            <span className="inline-flex items-center gap-1">
              <AlertTriangle className="h-3.5 w-3.5" aria-hidden />
              Ce fichier n’a pas été déclaré sain par l’antivirus : l’analyse ne peut pas être
              lancée.
            </span>
          </Alerte>
        ) : null}

        {enAttente || echec ? (
          <div className="flex justify-end">
            <button
              type="button"
              className="btn-primary"
              onClick={surLancer}
              disabled={lancementEnCours || importSuivi.statutScan !== 'SAIN'}
            >
              <Play className="h-4 w-4" aria-hidden />
              {echec ? 'Relancer l’analyse' : 'Lancer l’analyse'}
            </button>
          </div>
        ) : null}
      </div>
    </Card>
  );
}

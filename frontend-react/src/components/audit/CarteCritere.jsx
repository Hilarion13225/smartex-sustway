import { Info, Loader2 } from 'lucide-react';
import CarteNiveauMaturite from './CarteNiveauMaturite';
import DepotPreuves from './DepotPreuves';
import ListeFichiers from './ListeFichiers';
import ActionsCritere from './ActionsCritere';
import CarteReponseBinaire from './CarteReponseBinaire';
import { NIVEAUX_MATURITE } from './niveauxMaturite';

/**
 * Carte de saisie d'un critère : énoncé, échelle de maturité, preuves et
 * actions. Composant contrôlé — l'état de la réponse est tenu par le parent,
 * de sorte que le passage d'un critère à l'autre reste sa responsabilité.
 *
 * La saisie ne porte pas de commentaire libre : l'argumentaire d'un critère
 * est produit par l'analyse IA à partir des preuves déposées, et s'affiche
 * dans le panneau de droite.
 */
export default function CarteCritere({
  code,
  criticite,
  question,
  intitule,
  aide,
  binaire,
  niveauSelectionne,
  surSelectionNiveau,
  reponseBinaire,
  surSelectionBinaire,
  fichiers,
  surAjoutFichiers,
  surSuppressionFichier,
  depotEnCours,
  surPrecedent,
  surBrouillon,
  surContinuer,
  brouillonEnregistre,
  premier,
}) {
  return (
    <article className="rounded-2xl border border-ink-100 bg-surface p-6 shadow-sm sm:p-8">
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-sm font-semibold text-brand-600 dark:text-brand-400">{code}</span>
        <span className="rounded-full bg-brand-50 px-3 py-1 text-xs font-medium text-brand-700 dark:bg-brand-500/15 dark:text-brand-400">
          Criticité&nbsp;: {criticite}
        </span>
      </div>

      {/* Intitulé déclaratif du critère : il situe la question sans la
          répéter, et reste le libellé utilisé dans les rapports. */}
      {intitule ? <p className="mt-4 text-sm text-ink-500">{intitule}</p> : null}

      <h3
        className={`${intitule ? 'mt-2' : 'mt-6'} flex items-start gap-2 text-xl font-bold leading-snug text-ink-900 sm:text-[1.4rem]`}
      >
        <span>{question}</span>
        {aide ? (
          <span title={aide} className="mt-1.5 shrink-0 text-ink-400">
            <Info className="h-4 w-4" aria-hidden />
            <span className="sr-only">{aide}</span>
          </span>
        ) : null}
      </h3>
      <p className="mt-3 text-sm text-ink-500">
        {binaire
          ? 'Cette question constate une situation : répondez par oui ou par non.'
          : 'Sélectionnez le niveau qui décrit le mieux la situation actuelle de votre organisation.'}
      </p>

      {binaire ? (
        <CarteReponseBinaire valeur={reponseBinaire} surSelection={surSelectionBinaire} />
      ) : (
        /* Cinq colonnes seulement à partir de `xl` : en dessous, les
           descriptions deviendraient illisibles sur une colonne de 150 px. */
        <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {NIVEAUX_MATURITE.map((niveau) => (
            <CarteNiveauMaturite
              key={niveau.niveau}
              niveau={niveau.niveau}
              titre={niveau.titre}
              description={niveau.description}
              selectionne={niveauSelectionne === niveau.niveau}
              surSelection={() => surSelectionNiveau(niveau.niveau)}
            />
          ))}
        </div>
      )}

      <div className="mt-7">
        <p className="flex items-center gap-2 text-sm font-medium text-ink-700">
          Preuves et documents <span className="text-ink-400">(optionnel)</span>
          {depotEnCours ? (
            <span className="inline-flex items-center gap-1.5 text-xs font-normal text-ink-500">
              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
              Dépôt en cours…
            </span>
          ) : null}
        </p>
        <div className="mt-2.5 grid gap-4 lg:grid-cols-2">
          <DepotPreuves surAjout={surAjoutFichiers} />
          <ListeFichiers fichiers={fichiers} surSuppression={surSuppressionFichier} />
        </div>
      </div>

      <div className="mt-8">
        <ActionsCritere
          surPrecedent={surPrecedent}
          surBrouillon={surBrouillon}
          surContinuer={surContinuer}
          brouillonEnregistre={brouillonEnregistre}
          premier={premier}
        />
      </div>
    </article>
  );
}

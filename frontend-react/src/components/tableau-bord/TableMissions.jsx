import { Link } from 'react-router-dom';
import clsx from 'clsx';
import { ArrowRight } from 'lucide-react';
import { Badge } from '../ui';
import { formaterScore } from '../../lib/scoreAffiche';
import { TONS_STATUT_MISSION as TONS_STATUT } from '../../lib/tonsStatuts';


const LIBELLES_STATUT = {
  BROUILLON: 'Brouillon',
  EN_COURS: 'En cours',
  TERMINE: 'Terminée',
  ANNULE: 'Annulée',
};

const POINTS_RISQUE = {
  ELEVE: 'bg-brand-600',
  MOYEN: 'bg-amber-500',
  FAIBLE: 'bg-emerald-500',
};

const LIBELLES_RISQUE = { ELEVE: 'Élevé', MOYEN: 'Moyen', FAIBLE: 'Faible' };

/** Barre de progression fine, sans étiquette : le pourcentage est déjà à côté. */
function Progression({ pourcentage, compact = false }) {
  return (
    <div className="flex items-center gap-2.5">
      <div className={clsx('h-1.5 overflow-hidden rounded-full bg-ink-100', compact ? 'w-14' : 'w-24')}>
        <div
          className="h-full rounded-full bg-brand-600 transition-[width] duration-500"
          style={{ width: `${pourcentage}%` }}
        />
      </div>
      <span className="w-9 shrink-0 text-xs font-medium tabular-nums text-ink-600">{pourcentage}%</span>
    </div>
  );
}

/**
 * Missions en cours, sous forme de tableau sur écran large et de cartes
 * empilées en dessous de `lg` : un tableau à sept colonnes forcerait sinon un
 * défilement horizontal sur mobile.
 *
 * Chaque ligne est un lien plutôt qu'une ligne rendue cliquable par un
 * gestionnaire : la navigation au clavier et l'ouverture dans un nouvel
 * onglet fonctionnent alors sans code supplémentaire.
 */
export default function TableMissions({
  missions,
  compact = false,
  etiquettePremiereColonne = 'Organisation',
  action = null,
}) {
  if (missions.length === 0) {
    return (
      // Une mission est le point de départ de tout le reste : sans elle, ni
      // preuve, ni analyse, ni écart, ni rapport. L'écran l'annonçait sans
      // jamais dire par où commencer. `action` reste facultative — l'appelant
      // ne la fournit que lorsqu'un premier pas lui est réellement ouvert.
      <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-ink-200 px-4 py-10 text-center">
        <p className="text-sm text-ink-500">Aucune mission d’audit pour l’instant.</p>
        {action}
      </div>
    );
  }

  const cellule = compact ? 'px-2 py-2.5 text-sm text-ink-700' : 'td';
  const entete = compact
    ? 'whitespace-nowrap px-2 py-3 text-left text-xs font-semibold uppercase tracking-wide text-ink-500'
    : 'th';

  return (
    <>
      {/* --- Écran large : tableau --- */}
      <div className="hidden overflow-x-auto lg:block">
        <table className="w-full">
          <thead>
            <tr className="border-b border-ink-100">
              <th className={entete}>{etiquettePremiereColonne}</th>
              <th className={entete}>Mission</th>
              <th className={entete}>Progression</th>
              <th className={entete}>Score</th>
              {/* Masquee en compact : la conformite est la traduction du score
                  en pourcentage, et le panneau du tableau de bord ne dispose que
                  de 670 px. Avec elle, le tableau en demandait 766 et coupait
                  ses deux dernieres colonnes — le statut devenait « En… ». */}
              {compact ? null : <th className={entete}>Conformité</th>}
              <th className={entete}>Risque</th>
              <th className={entete}>Statut</th>
              {compact ? null : <th className={entete}>Échéance</th>}
              <th className={`${entete} sr-only`}>Ouvrir</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ink-100">
            {missions.map((mission) => (
              <tr key={mission.id} className="group transition-colors hover:bg-ink-50">
                {/* Largeur bornée et coupe sur une ligne : sans cela, un nom
                    long passe sur trois lignes et pousse les colonnes de
                    droite hors du cadre. Le titre reste lisible au survol. */}
                <td className={clsx(cellule, 'truncate font-medium text-ink-900', compact ? 'max-w-[8rem]' : 'max-w-[11rem]')} title={mission.organisation}>
                  {mission.organisation}
                </td>
                {/*
                 * Le nom ouvre la mission.
                 *
                 * Il ne l'ouvrait pas : seule la fleche de la derniere colonne
                 * menait quelque part, et c'est pourtant le nom que l'oeil vise.
                 * La vue en cartes, juste dessous, fait deja de toute la carte
                 * un lien — le tableau etait le seul a demander qu'on aille
                 * chercher une cible de seize pixels a l'autre bout de la ligne.
                 *
                 * La fleche reste : elle nomme l'action pour un lecteur d'ecran
                 * (« Ouvrir <mission> ») la ou le nom seul ne dirait pas ce
                 * qu'un clic dessus provoque.
                 */}
                <td className={clsx(cellule, 'truncate', compact ? 'max-w-[9rem]' : 'max-w-[12rem]')} title={mission.nom}>
                  <Link
                    to={mission.lien}
                    className="rounded underline-offset-4 transition-colors hover:text-brand-700 hover:underline dark:hover:text-brand-400"
                  >
                    {mission.nom}
                  </Link>
                </td>
                <td className={cellule}>
                  <Progression pourcentage={mission.progression} compact={compact} />
                </td>
                {/* Score sur 5, l'échelle de la grille d'évaluation ; la
                    conformité en est la traduction en pourcentage.
                    Sous la moitie du perimetre evalue, il est atténue et porte
                    un `title` : « 1.00 / 5 » assis sur un critere sur
                    quatre-vingt-douze se lit sinon comme un fait etabli. */}
                <td className={cellule}>
                  {mission.score == null ? (
                    <span className="font-normal text-ink-400">—</span>
                  ) : (
                    <span
                      className={clsx(
                        'whitespace-nowrap tabular-nums',
                        mission.progression < 50
                          ? 'font-normal text-ink-500'
                          : 'font-medium text-ink-900'
                      )}
                      title={
                        mission.progression < 50
                          ? `Score provisoire : ${mission.progression}% du périmètre évalué`
                          : undefined
                      }
                    >
                      {formaterScore(mission.score)} / 5
                      {mission.progression < 50 ? <span className="ml-1 text-ink-400">*</span> : null}
                    </span>
                  )}
                </td>
{compact ? null : (
                <td className={clsx(cellule, 'whitespace-nowrap tabular-nums')}>
                  {mission.conformite == null ? (
                    <span className="text-ink-400">—</span>
                  ) : (
                    `${mission.conformite}%`
                  )}
                </td>
)}
                <td className={clsx(cellule, 'whitespace-nowrap')}>
                  {mission.risque ? (
                    <span className="inline-flex items-center gap-2">
                      <span className={clsx('h-2 w-2 rounded-full', POINTS_RISQUE[mission.risque])} />
                      {LIBELLES_RISQUE[mission.risque]}
                    </span>
                  ) : (
                    <span className="text-ink-400">—</span>
                  )}
                </td>
                <td className={clsx(cellule, 'whitespace-nowrap')}>
                  <Badge ton={TONS_STATUT[mission.statut] ?? 'neutre'}>
                    {LIBELLES_STATUT[mission.statut] ?? mission.statut}
                  </Badge>
                </td>
                {compact ? null : (
                  <td className={clsx(cellule, 'whitespace-nowrap text-ink-500')}>{mission.echeance ?? '—'}</td>
                )}
                <td className={clsx(cellule, 'text-right')}>
                  <Link
                    to={mission.lien}
                    aria-label={`Ouvrir ${mission.nom}`}
                    className="inline-flex rounded-lg p-1.5 text-ink-400 transition-colors hover:bg-ink-100 hover:text-brand-600"
                  >
                    <ArrowRight className="h-4 w-4" aria-hidden />
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* --- Sous `lg` : une carte par mission --- */}
      <ul className="space-y-3 lg:hidden">
        {missions.map((mission) => (
          <li key={mission.id}>
            <Link
              to={mission.lien}
              className="block rounded-2xl border border-ink-100 p-4 transition-colors hover:border-brand-200 hover:bg-ink-50"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  {/* Le tableau ci-dessus porte deja ces `title` ; les cartes les
                      omettaient, alors que ce sont elles qui tronquent a 390 px. */}
                  <p className="truncate text-sm font-semibold text-ink-900" title={mission.organisation}>
                    {mission.organisation}
                  </p>
                  <p className="truncate text-xs text-ink-500" title={mission.nom}>
                    {mission.nom}
                  </p>
                </div>
                <Badge ton={TONS_STATUT[mission.statut] ?? 'neutre'}>
                  {LIBELLES_STATUT[mission.statut] ?? mission.statut}
                </Badge>
              </div>
              <div className="mt-3">
                <Progression pourcentage={mission.progression} />
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-ink-500">
                <span>
                  Score : {mission.score == null ? '—' : `${formaterScore(mission.score)} / 5`}
                  {mission.score != null && mission.progression < 50 ? ' (provisoire)' : ''}
                </span>
                <span>
                  Conformité : {mission.conformite == null ? '—' : `${mission.conformite}%`}
                </span>
                {mission.risque ? (
                  <span className="inline-flex items-center gap-1.5">
                    <span className={clsx('h-2 w-2 rounded-full', POINTS_RISQUE[mission.risque])} />
                    Risque {LIBELLES_RISQUE[mission.risque].toLowerCase()}
                  </span>
                ) : null}
                {mission.echeance ? <span>Échéance {mission.echeance}</span> : null}
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}

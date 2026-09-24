import { Link } from 'react-router-dom';
import { ArrowRight, CircleDot, FileText, PlayCircle, TriangleAlert } from 'lucide-react';
import clsx from 'clsx';
import { Badge, Vide } from '../ui';
import { formaterScore } from '../../lib/scoreAffiche';

/**
 * Les missions d'une organisation, une carte par mission.
 *
 * Elles tenaient dans un tableau de neuf colonnes. Mesuré sur une organisation
 * réelle : cinq de ces colonnes étaient vides — l'échéance pour les deux
 * missions, le score, la conformité et le risque pour celle qui n'est pas
 * commencée. Ce n'est pas un accident de données : une mission en brouillon
 * n'a pas de score, et n'en aura pas tant qu'aucun critère n'est évalué. Le
 * tableau imposait une grille uniforme à des objets qui n'ont pas le même
 * contenu selon leur état, et remplissait les trous avec des tirets.
 *
 * Une carte montre ce que la mission a, et le geste qu'elle appelle : un
 * brouillon n'affiche pas un score absent, il dit qu'il n'est pas lancé ; une
 * mission en cours dit combien de critères restent, et mène là où on les
 * évalue.
 *
 * Ce que cela coûte, et qu'il faut savoir : au-delà d'une quinzaine de
 * missions, des cartes se parcourent moins vite qu'un tableau. La page garde
 * donc ses filtres, et les affiche à partir du moment où la liste est assez
 * longue pour qu'on ait besoin d'y chercher.
 */

/** Ce qu'il reste à faire, selon l'état. Une phrase, et un seul geste. */
function prochainGeste(mission) {
  if (mission.statut === 'BROUILLON') {
    return {
      phrase: 'Pas encore lancée — elle n’entre dans aucun score.',
      libelle: 'Ouvrir la mission',
      vers: mission.lien,
      Icone: PlayCircle,
      principal: true,
    };
  }
  if (mission.statut === 'EN_COURS') {
    const restants = Math.max(0, (mission.criteresTotal ?? 0) - (mission.criteresEvalues ?? 0));
    return {
      phrase:
        restants > 0
          ? `${restants} critère${restants > 1 ? 's' : ''} encore à évaluer sur ${mission.criteresTotal}.`
          : 'Tous les critères sont évalués — la mission peut être clôturée.',
      libelle: restants > 0 ? 'Évaluer les critères' : 'Voir le score',
      // Vers l'onglet des critères, et non la vue d'ensemble : c'est là que le
      // travail annoncé par la phrase se fait.
      vers: restants > 0 ? `${mission.lien}?onglet=criteres` : `${mission.lien}/score`,
      Icone: ArrowRight,
      principal: true,
    };
  }
  return {
    phrase: mission.statut === 'ANNULE' ? 'Mission annulée.' : 'Mission terminée.',
    libelle: 'Voir le score',
    vers: `${mission.lien}/score`,
    Icone: FileText,
    principal: false,
  };
}

const TONS_STATUT = {
  BROUILLON: 'neutre',
  EN_COURS: 'bleu',
  TERMINE: 'vert',
  ANNULE: 'neutre',
};

const LIBELLES_STATUT = {
  BROUILLON: 'Brouillon',
  EN_COURS: 'En cours',
  TERMINE: 'Terminée',
  ANNULE: 'Annulée',
};

const TONS_RISQUE = {
  ELEVE: 'text-rose-700 dark:text-rose-400',
  MOYEN: 'text-amber-700 dark:text-amber-400',
  FAIBLE: 'text-emerald-700 dark:text-emerald-400',
};

const LIBELLES_RISQUE = { ELEVE: 'Risque élevé', MOYEN: 'Risque moyen', FAIBLE: 'Risque faible' };

function CarteMission({ mission }) {
  const geste = prochainGeste(mission);
  const commencee = (mission.criteresEvalues ?? 0) > 0;
  /* Sous la moitié du périmètre, le score ne se donne pas pour un fait —
     même règle que l'écran du score et le tableau de bord. */
  const provisoire = mission.score != null && mission.progression < 50;

  return (
    <article className="flex w-full flex-col gap-4 rounded-2xl border border-ink-100 bg-surface p-5 shadow-sm transition-shadow duration-300 hover:shadow-soft">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-base font-semibold text-ink-900" title={mission.nom}>
            <Link to={mission.lien} className="rounded underline-offset-4 hover:underline">
              {mission.nom}
            </Link>
          </h3>
          <p className="mt-1 text-xs text-ink-500">
            {mission.organisation}
            {mission.dateDebut ? ` · depuis le ${mission.dateDebut}` : ''}
            {mission.echeance ? ` · échéance ${mission.echeance}` : ''}
          </p>
        </div>
        <Badge ton={TONS_STATUT[mission.statut] ?? 'neutre'}>
          {LIBELLES_STATUT[mission.statut] ?? mission.statut}
        </Badge>
      </div>

      {/* La progression ne paraît que si la mission a commencé : une barre à
          zéro sur un brouillon annonce un retard qui n'existe pas. */}
      {commencee ? (
        <div>
          <div className="flex items-center justify-between text-xs text-ink-500">
            <span>
              {mission.criteresEvalues} / {mission.criteresTotal} critères évalués
            </span>
            <span className="tabular-nums">{mission.progression}&nbsp;%</span>
          </div>
          <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-ink-100">
            <div
              className="h-full rounded-full bg-brand-600 transition-[width] duration-500 ease-out dark:bg-brand-400"
              style={{ width: `${Math.min(100, mission.progression)}%` }}
            />
          </div>
        </div>
      ) : null}

      {/* Score et risque : seulement quand ils existent. Un tiret ne dit rien
          qu'une absence ne dise mieux en se taisant. */}
      {mission.score != null || mission.risque ? (
        <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-sm">
          {mission.score != null ? (
            <span className={clsx('tabular-nums', provisoire ? 'text-ink-500' : 'font-medium text-ink-900')}>
              {formaterScore(mission.score)} / 5
              {provisoire ? <span className="ml-1 text-xs text-ink-400">provisoire</span> : null}
            </span>
          ) : null}
          {mission.risque ? (
            <span className={clsx('inline-flex items-center gap-1.5', TONS_RISQUE[mission.risque] ?? 'text-ink-500')}>
              {mission.risque === 'ELEVE' ? (
                <TriangleAlert className="h-3.5 w-3.5" aria-hidden />
              ) : (
                <CircleDot className="h-3.5 w-3.5" aria-hidden />
              )}
              {LIBELLES_RISQUE[mission.risque] ?? mission.risque}
            </span>
          ) : null}
        </div>
      ) : null}

      <p className="text-sm text-ink-600">{geste.phrase}</p>

      <div className="mt-auto pt-1">
        <Link
          to={geste.vers}
          className={clsx(
            'group inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-colors',
            geste.principal
              ? 'bg-brand-600 text-white hover:bg-brand-700'
              : 'border border-ink-200 text-ink-700 hover:border-brand-300 hover:text-brand-700 dark:hover:text-brand-400'
          )}
        >
          {geste.libelle}
          <geste.Icone
            className="h-4 w-4 transition-transform duration-200 motion-safe:group-hover:translate-x-0.5"
            aria-hidden
          />
        </Link>
      </div>
    </article>
  );
}

export default function CartesMissions({ missions, action }) {
  if (missions.length === 0) {
    return <Vide message="Aucune mission ne correspond à cette recherche." action={action} />;
  }
  return (
    <ul className="grid gap-4 lg:grid-cols-2 2xl:grid-cols-3">
      {missions.map((mission) => (
        <li key={mission.id} className="flex">
          <CarteMission mission={mission} />
        </li>
      ))}
    </ul>
  );
}

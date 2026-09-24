import { GraphiqueAnneau } from '../charts';
import { Card } from '../ui';

import { formaterScore } from '../../lib/scoreAffiche';

/** Palette de la jauge : rempli en émeraude, reste en gris neutre. */
/*
 * Gris ardoise pour un chiffre qui ne juge pas encore.
 *
 * La jauge provisoire reprenait d'abord le vert : elle rassurait sur une
 * conformite de 20 %, ce qui est le defaut inverse de celui qu'on corrigeait.
 * Le bordeaux alarmait sur quatre criteres sur quatre-vingt-douze, le vert
 * rassurait sur les memes. Ni l'un ni l'autre : une teinte qui ne dit rien,
 * puisqu'il n'y a rien a dire tant que la couverture est faible.
 */
const COULEURS_JAUGE_PROVISOIRE = ['#94a3b8', '#e2e8f0'];
const COULEURS_JAUGE_CONFORMITE = ['#921f18', '#e2e8f0'];

const TONS_RISQUE = {
  ELEVE: { point: 'bg-brand-600', libelle: 'Élevé' },
  MOYEN: { point: 'bg-amber-500', libelle: 'Moyen' },
  FAIBLE: { point: 'bg-emerald-500', libelle: 'Faible' },
};

/** Affiche une somme sans décimale inutile : « 69 » plutôt que « 69,0 ». */
function nombre(valeur) {
  if (valeur == null) return '—';
  const n = Number(valeur);
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}

/** Anneau compact avec sa valeur au centre. */
function Jauge({ pourcentage, legende, couleurs }) {
  return (
    <div className="relative mx-auto h-32 w-32">
      <GraphiqueAnneau
        labels={['Atteint', 'Restant']}
        data={[pourcentage, Math.max(0, 100 - pourcentage)]}
        couleurs={couleurs}
        legende={false}
      />
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-xl font-bold tabular-nums text-ink-900">{pourcentage}%</span>
        <span className="text-[11px] text-ink-500">{legende}</span>
      </div>
    </div>
  );
}

/**
 * Bandeau de synthèse d'une mission : avancement, score par domaine,
 * conformité et niveau de risque.
 *
 * Le score par domaine est ramené en pourcentage alors qu'il est noté sur 5
 * (RG31) : mis côte à côte avec un taux d'avancement, deux échelles
 * différentes se liraient mal.
 */
export default function SyntheseMission({ score, risque, criteresTotal, criteresEvalues }) {
  // V74-C3-B11 : sans critère évalué, le score 0 du serveur n'est pas une conformité nulle.
  const conformite =
    (score?.nombreCriteresEvalues ?? 0) > 0 ? Math.round((Number(score.scoreGlobal) / 5) * 100) : null;
  const domaines = score?.domaines ?? [];
  // Servi par l'API depuis toujours, jamais lu jusqu'ici. Une évaluation en
  // revue n'est ni évaluée ni « non évaluée » : elle disparaissait des deux
  // compteurs, et la mission paraissait plus avancée qu'elle ne l'était.
  const enRevue = score?.nombreCriteresEnRevue ?? 0;
  const noteTotale = score?.noteTotale ?? null;
  const coefficientTotal = score?.coefficientTotal ?? null;
  const ton = risque ? TONS_RISQUE[risque] : null;
  // Meme seuil que l'ecran du score et le tableau de bord : sous la moitie du
  // perimetre, un chiffre ne se donne pas pour un fait.
  const couverture = criteresTotal > 0 ? Math.round((criteresEvalues / criteresTotal) * 100) : 0;
  const provisoire = criteresEvalues > 0 && couverture < 50;

  return (
    /*
     * « Progression globale » a quitte cette grille.
     *
     * Elle affichait les criteres notes par l'IA sous le libelle « Complete »,
     * quand le bloc de tete annonce les criteres renseignes : deux jauges, deux
     * comptes, 1 % contre 4 % pour la meme mission. La progression de la
     * collecte appartient au bloc de reprise, qui la donne avec le bon compte
     * et le geste qui va avec ; cette grille garde ce qui releve du resultat.
     *
     * Les critères en attente de revue rejoignent la carte de conformite : ils
     * disent pourquoi un score ne bouge pas encore, et non ou en est la saisie.
     */
    <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,0.9fr)]">
      {/* --- Score par domaine --- */}
      <Card className="min-w-0 p-5">
        <h2 className="text-base font-semibold text-ink-900">Par domaine</h2>
        {domaines.length === 0 ? (
          <p className="mt-4 text-xs text-ink-500">
            Les scores par domaine apparaîtront dès les premières évaluations.
          </p>
        ) : (
          /* Mêmes colonnes que la grille d'évaluation : note totale,
             coefficient total, puis le score qui en découle. */
          <div className="mt-4 overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-ink-100">
                  <th className="th">Domaine</th>
                  <th className="th text-right">Note totale</th>
                  <th className="th text-right">Coef. total</th>
                  <th className="th text-right">Score</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-100">
                {domaines.map((domaine) => (
                  <tr key={domaine.domaineCode}>
                    {/* 9 rem et non 14 : le tableau demandait 28 px de plus que
                        son cadre et coupait la colonne Score, celle qu'on vient
                        lire. Le nom du domaine est deja tronque et porte son
                        `title` — il perd quelques caracteres, le score ne
                        disparait plus. */}
                    <td
                      className="td max-w-[9rem] truncate"
                      title={domaine.domaineNom ?? domaine.domaineCode}
                    >
                      {domaine.domaineNom ?? domaine.domaineCode}
                    </td>
                    <td className="td text-right tabular-nums">
                      {nombre(domaine.noteTotale)}
                    </td>
                    <td className="td text-right tabular-nums">
                      {nombre(domaine.coefficientTotal)}
                    </td>
                    <td className="td text-right font-semibold tabular-nums text-ink-900">
                      {domaine.score == null || domaine.nombreCriteresEvalues === 0 ? '—' : formaterScore(domaine.score)}
                    </td>
                  </tr>
                ))}
              </tbody>
              {noteTotale != null ? (
                <tfoot>
                  <tr className="border-t-2 border-ink-200">
                    <td className="td font-semibold text-ink-900">Ensemble de la mission</td>
                    <td className="td text-right font-semibold tabular-nums">{nombre(noteTotale)}</td>
                    <td className="td text-right font-semibold tabular-nums">
                      {nombre(coefficientTotal)}
                    </td>
                    <td className="td text-right font-bold tabular-nums text-ink-900">
                      {score?.scoreGlobal == null || score.nombreCriteresEvalues === 0 ? '—' : formaterScore(score.scoreGlobal)}
                    </td>
                  </tr>
                </tfoot>
              ) : null}
            </table>
          </div>
        )}
      </Card>

      {/* --- Conformité et risque --- */}
      <div className="space-y-4">
        <Card className="p-5">
          <h2 className="text-base font-semibold text-ink-900">
            Conformité{provisoire ? <span className="font-normal text-ink-500"> (provisoire)</span> : null}
          </h2>
          {conformite == null ? (
            <p className="mt-4 text-xs text-ink-500">Aucune évaluation.</p>
          ) : (
            <>
              <div className="mt-3">
                {/*
                 * Sous la moitie du perimetre, la jauge perd sa legende et ses
                 * couleurs de jugement. « Faible » assis sur quatre criteres
                 * sur quatre-vingt-douze n'est pas un constat, c'est une
                 * alarme sur rien — meme regle que le score, qui s'annonce
                 * provisoire dans les memes conditions.
                 */}
                <Jauge
                  pourcentage={conformite}
                  legende={
                    provisoire ? '' : conformite >= 75 ? 'Élevée' : conformite >= 50 ? 'Moyenne' : 'Faible'
                  }
                  couleurs={provisoire ? COULEURS_JAUGE_PROVISOIRE : COULEURS_JAUGE_CONFORMITE}
                />
              </div>
              <p className="mt-2 text-center text-[11px] text-ink-500">
                {provisoire
                  ? `Sur ${couverture} % du périmètre évalué`
                  : 'Score moyen pondéré'}
              </p>
            </>
          )}
          {enRevue > 0 ? (
            <p className="mt-2 text-center text-[11px] font-medium text-violet-700 dark:text-violet-300">
              {enRevue} critère{enRevue > 1 ? 's' : ''} en attente de revue
            </p>
          ) : null}
        </Card>

        <Card className="p-5">
          <h2 className="text-base font-semibold text-ink-900">Risque global</h2>
          {ton ? (
            <p className="mt-3 inline-flex items-center gap-2 text-sm font-medium text-ink-800">
              <span className={`h-2.5 w-2.5 rounded-full ${ton.point}`} />
              {ton.libelle}
            </p>
          ) : (
            <p className="mt-3 text-sm text-ink-500">Non évalué</p>
          )}
          <p className="mt-1 text-xs text-ink-500">Déduit des non-conformités ouvertes.</p>
        </Card>
      </div>
    </div>
  );
}

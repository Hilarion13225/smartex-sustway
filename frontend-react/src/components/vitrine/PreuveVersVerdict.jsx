import clsx from 'clsx';
import { Check, FileText, TriangleAlert } from 'lucide-react';

/**
 * Le spécimen du héros : ce que fait réellement la plateforme, montré plutôt
 * que décrit. Une pièce justificative, le passage que l'analyse en retient, et
 * le verdict qu'il produit sur un critère.
 *
 * C'est le seul élément ornemental de la vitrine (voir DESIGN-VITRINE.md).
 * Il remplace la maquette de tableau de bord, qui montrait un logiciel sans
 * dire ce qui le distingue : une note fondée sur une preuve, jamais sur une
 * simple déclaration.
 *
 * Le contenu est devenu une donnée : le carrousel du héros en présente
 * plusieurs, un par domaine, dont un qui ne conclut pas à la conformité — un
 * outil d'audit qui ne montrerait que des verdicts favorables ne serait pas
 * crédible. Les valeurs par défaut sont celles de l'exemple d'origine, si bien
 * qu'un appel sans argument rend exactement ce qu'il rendait avant.
 *
 * ISO 45001 n'est qu'une référence méthodologique, pas un référentiel
 * évaluable dans l'outil : les critères montrés sont donc rattachés au
 * référentiel SMARTEX SustWay. Les documents, passages et probabilités sont
 * illustratifs, et la légende le dit.
 *
 * Tout est en HTML et CSS : aucune image à télécharger, rien de plus lourd sur
 * un téléphone. Le mouvement se joue une fois au chargement et disparaît sous
 * « réduire les animations » ; `anime` permet au carrousel de le réserver à la
 * première carte, les deux autres étant hors de l'écran au chargement.
 */
export const PREUVE_PAR_DEFAUT = {
  document: 'Politique santé-sécurité 2025.pdf',
  page: 'p. 4',
  passage: 'Chaque poste de travail fait l’objet d’une évaluation des risques, revue chaque année.',
  domaine: 'santé et sécurité',
  critere: 'Les risques de chaque poste sont évalués',
  conforme: true,
  probabilite: 0.86,
};

export default function PreuveVersVerdict({
  preuve = PREUVE_PAR_DEFAUT,
  className,
  legende = true,
  anime = true,
}) {
  const pourcent = Math.round(preuve.probabilite * 100);
  const chiffre = preuve.probabilite.toFixed(2).replace('.', ',');
  const mouvement = (classe) => (anime ? classe : undefined);

  return (
    <figure className={clsx('specimen', className)}>
      <div
        className="rounded-[12px] bg-[#14234B] p-4 text-white ring-1 ring-white/10 sm:p-6"
        role="img"
        aria-label={`Exemple : un extrait de « ${preuve.document} », retenu par l’analyse, conduit au verdict « ${
          preuve.conforme ? 'conforme' : 'non conforme'
        } » sur le critère « ${preuve.critere} » du référentiel SMARTEX SustWay, avec une probabilité de conformité de ${chiffre}.`}
      >
        {/* ---- La pièce justificative ---- */}
        <div className="rounded-[8px] bg-white p-4 text-[#14234B] sm:p-5" aria-hidden>
          <div className="flex items-center gap-3 border-b border-[#E8EAE5] pb-3">
            <FileText className="h-5 w-5 shrink-0 text-[#60697A]" strokeWidth={1.75} />
            <p className="min-w-0 flex-1 truncate text-sm font-semibold">{preuve.document}</p>
            <span className="shrink-0 text-xs text-[#60697A]">{preuve.page}</span>
          </div>

          <div className="mt-4 space-y-2.5">
            <span className="block h-2 w-full rounded-full bg-[#E8EAE5]" />
            <span className="block h-2 w-11/12 rounded-full bg-[#E8EAE5]" />
            <p
              className={clsx(
                mouvement('specimen-passage'),
                '-mx-1 rounded-[3px] px-1 py-0.5 text-[13px] leading-snug text-[#14234B] sm:text-sm',
                !anime && 'bg-[#067A55]/20'
              )}
            >
              {preuve.passage}
            </p>
            <span className="block h-2 w-10/12 rounded-full bg-[#E8EAE5]" />
            <span className="block h-2 w-7/12 rounded-full bg-[#E8EAE5]" />
          </div>
        </div>

        {/* ---- Le lien entre la preuve et le verdict ---- */}
        <div className="flex items-center gap-3 py-3 pl-6" aria-hidden>
          <span className={clsx(mouvement('specimen-lien'), 'block h-7 w-px bg-white/35')} />
          <span className="text-xs text-white/60">passage retenu par l’analyse</span>
        </div>

        {/* ---- Le verdict ---- */}
        <div className="rounded-[8px] border border-white/15 p-4 sm:p-5" aria-hidden>
          <p className="text-xs text-white/60">Référentiel SMARTEX SustWay, {preuve.domaine}</p>
          <p className="mt-1 font-display text-base font-bold leading-snug sm:text-lg">{preuve.critere}</p>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            {/* Vert et bordeaux ne sont pas décoratifs ici : ils disent conforme
                et non conforme, comme partout ailleurs sur cette vitrine. */}
            <span
              className={clsx(
                mouvement('specimen-verdict'),
                'inline-flex items-center gap-1.5 rounded-[4px] px-2.5 py-1 text-sm font-semibold text-white',
                preuve.conforme ? 'bg-[#067A55]' : 'bg-[#8F1D17]'
              )}
            >
              {preuve.conforme ? (
                <Check className="h-4 w-4" strokeWidth={2.5} />
              ) : (
                <TriangleAlert className="h-4 w-4" strokeWidth={2.25} />
              )}
              {preuve.conforme ? 'Conforme' : 'Non conforme'}
            </span>
            <span className="text-sm text-white/75">
              Probabilité de conformité <span className="font-semibold tabular-nums text-white">{chiffre}</span>
            </span>
          </div>

          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/15">
            <span
              className={clsx(
                mouvement('specimen-jauge'),
                'block h-full rounded-full',
                preuve.conforme ? 'bg-[#3FB488]' : 'bg-[#D4574B]'
              )}
              style={{ width: `${pourcent}%` }}
            />
          </div>
        </div>
      </div>

      {legende ? (
        <figcaption className="mt-3 text-sm text-ink-500">
          Exemple illustratif : une pièce justificative, rapportée à un critère.
        </figcaption>
      ) : null}
    </figure>
  );
}

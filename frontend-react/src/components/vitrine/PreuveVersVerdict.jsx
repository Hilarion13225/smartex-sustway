import clsx from 'clsx';
import { Check, FileText } from 'lucide-react';

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
 * ISO 45001 n'est qu'une référence méthodologique, pas un référentiel
 * évaluable dans l'outil : le critère montré est donc rattaché au référentiel
 * SMARTEX SustWay. Le document, le passage et la probabilité sont
 * illustratifs, et la légende le dit.
 *
 * Tout est en HTML et CSS : aucune image à télécharger, rien de plus lourd
 * sur un téléphone. Le mouvement (surlignage, lien, verdict, jauge) se joue
 * une seule fois au chargement et disparaît sous « réduire les animations ».
 */
export default function PreuveVersVerdict({ className, legende = true }) {
  return (
    <figure className={clsx('specimen', className)}>
      <div
        className="rounded-[12px] bg-[#14234B] p-4 text-white ring-1 ring-white/10 sm:p-6"
        role="img"
        aria-label="Exemple : un extrait de la politique santé-sécurité d’une entreprise, retenu par l’analyse, conduit au verdict « conforme » sur le critère d’évaluation des risques du référentiel SMARTEX SustWay, avec une probabilité de conformité de 0,86."
      >
        {/* ---- La pièce justificative ---- */}
        <div className="rounded-[8px] bg-white p-4 text-[#14234B] sm:p-5" aria-hidden>
          <div className="flex items-center gap-3 border-b border-[#E8EAE5] pb-3">
            <FileText className="h-5 w-5 shrink-0 text-[#60697A]" strokeWidth={1.75} />
            <p className="min-w-0 flex-1 truncate text-sm font-semibold">Politique santé-sécurité 2025.pdf</p>
            <span className="shrink-0 text-xs text-[#60697A]">p. 4</span>
          </div>

          <div className="mt-4 space-y-2.5">
            <span className="block h-2 w-full rounded-full bg-[#E8EAE5]" />
            <span className="block h-2 w-11/12 rounded-full bg-[#E8EAE5]" />
            <p className="specimen-passage -mx-1 rounded-[3px] px-1 py-0.5 text-[13px] leading-snug text-[#14234B] sm:text-sm">
              Chaque poste de travail fait l’objet d’une évaluation des risques, revue chaque année.
            </p>
            <span className="block h-2 w-10/12 rounded-full bg-[#E8EAE5]" />
            <span className="block h-2 w-7/12 rounded-full bg-[#E8EAE5]" />
          </div>
        </div>

        {/* ---- Le lien entre la preuve et le verdict ---- */}
        <div className="flex items-center gap-3 py-3 pl-6" aria-hidden>
          <span className="specimen-lien block h-7 w-px bg-white/35" />
          <span className="text-xs text-white/60">passage retenu par l’analyse</span>
        </div>

        {/* ---- Le verdict ---- */}
        <div className="rounded-[8px] border border-white/15 p-4 sm:p-5" aria-hidden>
          <p className="text-xs text-white/60">Référentiel SMARTEX SustWay, santé et sécurité</p>
          <p className="mt-1 font-display text-base font-bold leading-snug sm:text-lg">
            Les risques de chaque poste sont évalués
          </p>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <span className="specimen-verdict inline-flex items-center gap-1.5 rounded-[4px] bg-[#067A55] px-2.5 py-1 text-sm font-semibold text-white">
              <Check className="h-4 w-4" strokeWidth={2.5} />
              Conforme
            </span>
            <span className="text-sm text-white/75">
              Probabilité de conformité <span className="font-semibold tabular-nums text-white">0,86</span>
            </span>
          </div>

          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/15">
            <span className="specimen-jauge block h-full w-[86%] rounded-full bg-[#3FB488]" />
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

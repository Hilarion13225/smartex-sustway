import { History, Save, ShieldCheck } from 'lucide-react';

/**
 * Rappel de reprise du travail, en pied de tableau de bord.
 *
 * Le libellé parle d'enregistrement et non de sauvegarde automatique : rien
 * n'est écrit tant qu'une action n'est pas validée (voir la saisie de
 * critère). Annoncer une sauvegarde continue ferait perdre du travail à qui
 * s'y fierait.
 */
const ELEMENTS = [
  {
    icone: Save,
    titre: 'Enregistrement à chaque validation',
    texte: 'Chaque évaluation, preuve ou réponse enregistrée est conservée côté serveur.',
  },
  {
    icone: History,
    titre: 'Reprendre à tout moment',
    texte: 'Vous retrouvez vos missions dans l’état exact où vous les avez laissées.',
  },
  {
    icone: ShieldCheck,
    titre: 'Données protégées',
    texte: 'L’accès est limité à votre organisation et à vos autorisations.',
  },
];

export default function BandeauReprise() {
  return (
    <section className="rounded-2xl border border-ink-100 bg-surface p-6 shadow-sm">
      <h2 className="text-sm font-semibold text-ink-900">Reprise du travail</h2>
      <p className="mt-1 text-sm text-ink-500">
        Votre progression est conservée : vous pouvez interrompre une mission et la reprendre là où
        vous vous êtes arrêté.
      </p>

      <div className="mt-5 grid gap-5 sm:grid-cols-3">
        {ELEMENTS.map(({ icone: Icone, titre, texte }) => (
          <div key={titre} className="flex gap-3">
            <Icone className="mt-0.5 h-4 w-4 shrink-0 text-brand-600 dark:text-brand-400" strokeWidth={1.8} aria-hidden />
            <div className="min-w-0">
              <p className="text-sm font-medium text-ink-800">{titre}</p>
              <p className="mt-0.5 text-xs leading-relaxed text-ink-500">{texte}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

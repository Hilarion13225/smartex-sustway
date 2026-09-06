import { History } from 'lucide-react';

/** Formate un horodatage en « aujourd'hui à 14:32 », ou en date complète au-delà. */
function formaterHorodatage(date) {
  const heure = date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  const aujourdhui = new Date();
  const memeJour =
    date.getDate() === aujourdhui.getDate() &&
    date.getMonth() === aujourdhui.getMonth() &&
    date.getFullYear() === aujourdhui.getFullYear();
  if (memeJour) return `aujourd’hui à ${heure}`;
  return `${date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })} à ${heure}`;
}

/**
 * Rappelle que la saisie est reprenable et date le dernier enregistrement.
 *
 * Le libellé parle d'enregistrement et non de sauvegarde automatique : la
 * mission n'est écrite en base que sur action explicite (« Enregistrer » ou
 * « Enregistrer et continuer »), chaque écriture ajoutant une évaluation à
 * l'historique conservé (RG14).
 */
export default function CarteReprise({ dernierEnregistrement }) {
  return (
    <section className="rounded-2xl border border-ink-100 bg-surface p-6 shadow-sm">
      <div className="flex items-center gap-2.5">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-ink-100 text-ink-600">
          <History className="h-4 w-4" aria-hidden />
        </span>
        <h3 className="text-sm font-semibold text-ink-900">Reprise de la saisie</h3>
      </div>

      <p className="mt-3 text-sm leading-relaxed text-ink-600">
        Chaque critère enregistré est conservé : vous pouvez interrompre la mission et la reprendre
        plus tard.
      </p>

      <div className="mt-4 border-t border-ink-100 pt-3">
        <p className="text-xs font-medium uppercase tracking-wide text-ink-400">
          Dernier enregistrement
        </p>
        <p className="mt-1 text-sm font-medium text-ink-800">
          {dernierEnregistrement
            ? formaterHorodatage(new Date(dernierEnregistrement))
            : 'aucun pour ce critère'}
        </p>
      </div>
    </section>
  );
}

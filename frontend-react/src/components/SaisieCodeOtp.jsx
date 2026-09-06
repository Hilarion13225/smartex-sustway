import { useEffect, useRef } from 'react';
import clsx from 'clsx';

/** Nombre de chiffres du code d'activation, aligné sur le serveur. */
export const LONGUEUR_CODE = 6;

/**
 * Saisie d'un code à usage unique, une case par chiffre.
 *
 * Le composant est contrôlé : `valeur` est la chaîne complète, ce qui évite
 * d'avoir à recomposer le code depuis six états séparés au moment de
 * l'envoi. Le collage d'un code entier est géré, c'est le geste le plus
 * courant quand on l'a copié depuis sa boîte mail.
 */
export default function SaisieCodeOtp({ valeur, surChangement, surValidation, desactive = false, erreur = false }) {
  const cases = useRef([]);

  useEffect(() => {
    cases.current[0]?.focus();
  }, []);

  function ecrire(index, saisie) {
    const chiffres = saisie.replace(/\D/g, '');
    if (chiffres.length === 0) return;

    const caracteres = valeur.padEnd(LONGUEUR_CODE, ' ').split('');
    // Un collage remplit à partir de la case courante ; une frappe simple
    // n'écrit qu'un chiffre, le reste du texte collé étant ignoré au-delà.
    for (let decalage = 0; decalage < chiffres.length && index + decalage < LONGUEUR_CODE; decalage += 1) {
      caracteres[index + decalage] = chiffres[decalage];
    }
    const suivant = caracteres.join('').trimEnd();
    surChangement(suivant);

    const position = Math.min(index + chiffres.length, LONGUEUR_CODE - 1);
    cases.current[position]?.focus();
  }

  function surTouche(index, evenement) {
    if (evenement.key === 'Backspace') {
      evenement.preventDefault();
      const caracteres = valeur.padEnd(LONGUEUR_CODE, ' ').split('');
      // Retour arrière sur une case vide : on efface la précédente, comme
      // dans un champ texte ordinaire.
      const cible = caracteres[index] !== ' ' ? index : Math.max(0, index - 1);
      caracteres[cible] = ' ';
      surChangement(caracteres.join('').trimEnd());
      cases.current[cible]?.focus();
      return;
    }
    if (evenement.key === 'ArrowLeft') cases.current[Math.max(0, index - 1)]?.focus();
    if (evenement.key === 'ArrowRight') cases.current[Math.min(LONGUEUR_CODE - 1, index + 1)]?.focus();
    if (evenement.key === 'Enter' && valeur.length === LONGUEUR_CODE) surValidation?.();
  }

  return (
    <div className="flex justify-center gap-2 sm:gap-3">
      {Array.from({ length: LONGUEUR_CODE }, (_, index) => (
        <input
          key={index}
          ref={(element) => {
            cases.current[index] = element;
          }}
          type="text"
          inputMode="numeric"
          autoComplete={index === 0 ? 'one-time-code' : 'off'}
          maxLength={LONGUEUR_CODE}
          value={valeur[index] ?? ''}
          disabled={desactive}
          aria-label={`Chiffre ${index + 1} sur ${LONGUEUR_CODE}`}
          onChange={(evenement) => ecrire(index, evenement.target.value)}
          onKeyDown={(evenement) => surTouche(index, evenement)}
          onFocus={(evenement) => evenement.target.select()}
          className={clsx(
            'h-14 w-11 rounded-xl border bg-surface text-center text-2xl font-semibold text-ink-900 outline-none transition sm:h-16 sm:w-14',
            erreur
              ? 'border-rose-400 focus:border-rose-500 focus:ring-4 focus:ring-rose-100 dark:focus:ring-rose-900/40'
              : 'border-ink-200 focus:border-brand-500 focus:ring-4 focus:ring-brand-100 dark:focus:ring-brand-900/40',
            desactive && 'cursor-not-allowed opacity-60'
          )}
        />
      ))}
    </div>
  );
}

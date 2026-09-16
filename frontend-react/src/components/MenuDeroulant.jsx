import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import clsx from 'clsx';

/**
 * Lien de navigation d'apparence normale, dont le clic affiche un sous-menu
 * (clic extérieur pour fermer).
 *
 * `classeDeclencheur` laisse l'appelant aligner le déclencheur sur ses voisins :
 * l'en-tête public marque sa page active par un trait posé sur la bordure basse
 * de l'en-tête, là où `lien-nav` souligne le mot. Par défaut, l'apparence
 * d'origine.
 */
export default function MenuDeroulant({ libelle, liens, classeDeclencheur = 'lien-nav' }) {
  const [ouvert, setOuvert] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!ouvert) return undefined;
    const surClicExterieur = (evenement) => {
      if (ref.current && !ref.current.contains(evenement.target)) setOuvert(false);
    };
    document.addEventListener('mousedown', surClicExterieur);
    return () => document.removeEventListener('mousedown', surClicExterieur);
  }, [ouvert]);

  // Échap referme le menu et rend le focus au déclencheur : sans cela, un
  // utilisateur au clavier n'a aucun moyen d'en sortir sans le traverser.
  useEffect(() => {
    if (!ouvert) return undefined;
    const surTouche = (evenement) => {
      if (evenement.key === 'Escape') {
        setOuvert(false);
        const declencheur = ref.current && ref.current.querySelector('button');
        if (declencheur) declencheur.focus();
      }
    };
    document.addEventListener('keydown', surTouche);
    return () => document.removeEventListener('keydown', surTouche);
  }, [ouvert]);

  return (
    <div ref={ref} className="relative" onMouseEnter={() => setOuvert(true)} onMouseLeave={() => setOuvert(false)}>
      <button
        type="button"
        onClick={() => setOuvert((valeur) => !valeur)}
        className={classeDeclencheur}
        aria-expanded={ouvert}
        aria-haspopup="true"
      >
        {libelle}
      </button>
      <div
        className={clsx(
          'absolute left-0 top-full z-20 mt-2 w-56 overflow-hidden rounded-xl border border-ink-100 bg-surface shadow-soft transition-all duration-200',
          ouvert ? 'visible translate-y-0 opacity-100' : 'invisible -translate-y-1 opacity-0'
        )}
      >
        {liens.map((lien) => (
          <Link
            key={lien.vers}
            to={lien.vers}
            onClick={() => setOuvert(false)}
            className="block px-4 py-2.5 text-sm text-ink-700 transition-colors hover:bg-ink-100 hover:text-brand-700 dark:hover:text-brand-400"
          >
            {lien.libelle}
          </Link>
        ))}
      </div>
    </div>
  );
}

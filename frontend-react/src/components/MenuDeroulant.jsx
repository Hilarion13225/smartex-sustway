import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import clsx from 'clsx';

/** Lien de navigation d'apparence normale, dont le clic affiche un sous-menu (clic extérieur pour fermer). */
export default function MenuDeroulant({ libelle, liens }) {
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

  return (
    <div ref={ref} className="relative">
      <button type="button" onClick={() => setOuvert((valeur) => !valeur)} className="lien-nav" aria-expanded={ouvert}>
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

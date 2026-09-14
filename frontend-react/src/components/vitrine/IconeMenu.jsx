/**
 * Icône du bouton de menu : trois traits qui se referment en croix.
 *
 * Adaptée du composant « Header 3 » de 21st.dev (MenuToggleIcon) : un seul
 * tracé dont la portion visible glisse le long du chemin, pendant que l'icône
 * pivote. Le passage d'une icône à l'autre dit ce que le bouton va faire —
 * ouvrir ou fermer — au lieu de remplacer brusquement un dessin par un autre.
 *
 * Sous « réduire les animations », le changement est immédiat.
 */
export default function IconeMenu({ ouvert, className = '' }) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className={`transition-transform duration-300 ease-in-out motion-reduce:transition-none ${ouvert ? '-rotate-45' : ''} ${className}`}
    >
      <path
        className="transition-all duration-300 ease-in-out motion-reduce:transition-none"
        style={
          ouvert
            ? { strokeDasharray: '20 300', strokeDashoffset: '-32.42px' }
            : { strokeDasharray: '12 63', strokeDashoffset: '0px' }
        }
        d="M27 10 13 10C10.8 10 9 8.2 9 6 9 3.5 10.8 2 13 2 15.2 2 17 3.8 17 6L17 26C17 28.2 18.8 30 21 30 23.2 30 25 28.2 25 26 25 23.8 23.2 22 21 22L7 22"
      />
      <path d="M7 16 27 16" />
    </svg>
  );
}

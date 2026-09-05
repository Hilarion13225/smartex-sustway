import { createContext, useContext, useEffect, useMemo, useState } from 'react';

const CLE_THEME = 'smartex.theme';
const ThemeContext = createContext(null);

function preferenceSysteme() {
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

function resoudreEstSombre(preference) {
  if (preference === 'sombre') return true;
  if (preference === 'clair') return false;
  return preferenceSysteme();
}

/**
 * Trois préférences (clair/sombre/système), mémorisées dans localStorage et
 * appliquées via la classe `.dark` sur <html> (Tailwind darkMode: 'class').
 * Un script inline dans index.html applique déjà cette classe avant le
 * premier rendu (anti-flash) — ce contexte prend ensuite le relais pour les
 * changements en cours de session (bascule manuelle, changement de
 * préférence système en direct si "système" est choisi).
 */
export function ThemeProvider({ children }) {
  const [preference, setPreference] = useState(() => {
    try {
      return localStorage.getItem(CLE_THEME) || 'systeme';
    } catch {
      return 'systeme';
    }
  });
  const [estSombre, setEstSombre] = useState(() => resoudreEstSombre(preference));
  // Certaines pages imposent le thème sombre (page d'entrée). Le forçage est
  // volontairement séparé de `preference` : il ne l'écrase pas et n'est pas
  // mémorisé, si bien qu'en quittant la page l'utilisateur retrouve son choix.
  const [sombreForce, setSombreForce] = useState(false);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', sombreForce || estSombre);
  }, [estSombre, sombreForce]);

  useEffect(() => {
    setEstSombre(resoudreEstSombre(preference));
    try {
      localStorage.setItem(CLE_THEME, preference);
    } catch {
      // Stockage indisponible : la préférence reste active pour la session en cours, juste non mémorisée.
    }
  }, [preference]);

  useEffect(() => {
    if (preference !== 'systeme') return undefined;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => setEstSombre(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [preference]);

  const valeur = useMemo(
    () => ({
      preference,
      definirPreference: setPreference,
      estSombre: sombreForce || estSombre,
      sombreForce,
      definirSombreForce: setSombreForce,
    }),
    [preference, estSombre, sombreForce]
  );

  return <ThemeContext.Provider value={valeur}>{children}</ThemeContext.Provider>;
}

/**
 * Impose le thème sombre tant que le composant appelant est monté, puis rend
 * la main à la préférence de l'utilisateur au démontage.
 */
export function useSombreForce() {
  const { definirSombreForce } = useTheme();
  useEffect(() => {
    definirSombreForce(true);
    return () => definirSombreForce(false);
  }, [definirSombreForce]);
}

export function useTheme() {
  const contexte = useContext(ThemeContext);
  if (!contexte) throw new Error('useTheme doit être utilisé à l’intérieur de <ThemeProvider>');
  return contexte;
}

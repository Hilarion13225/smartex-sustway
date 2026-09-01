/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Rouge brique/carmin délibérément distinct du rouge d'alerte (rose-*,
        // utilisé pour les erreurs et la criticité CRITIQUE) : plus profond et
        // moins vif, pour qu'un bouton principal ne se confonde jamais avec un
        // message d'erreur malgré la même famille de teinte.
        brand: {
          50: '#fdf2f1',
          100: '#f9dcda',
          200: '#f0b8b3',
          300: '#e28d84',
          400: '#cf5c50',
          500: '#b3271e',
          600: '#921f18',
          700: '#771a15',
          800: '#5c1310',
          900: '#430e0c',
        },
        // Défini via des variables CSS (voir index.css, :root et .dark) plutôt
        // qu'en hexadécimal fixe : la même classe `bg-ink-50`/`text-ink-900`
        // change alors de sens selon le thème actif, sans qu'aucune des ~40
        // pages qui les utilisent n'ait besoin d'un préfixe `dark:` — un
        // changement centralisé plutôt qu'une réécriture de chaque page.
        ink: {
          50: 'rgb(var(--ink-50) / <alpha-value>)',
          100: 'rgb(var(--ink-100) / <alpha-value>)',
          200: 'rgb(var(--ink-200) / <alpha-value>)',
          300: 'rgb(var(--ink-300) / <alpha-value>)',
          400: 'rgb(var(--ink-400) / <alpha-value>)',
          500: 'rgb(var(--ink-500) / <alpha-value>)',
          600: 'rgb(var(--ink-600) / <alpha-value>)',
          700: 'rgb(var(--ink-700) / <alpha-value>)',
          800: 'rgb(var(--ink-800) / <alpha-value>)',
          900: 'rgb(var(--ink-900) / <alpha-value>)',
        },
        // Fond des cartes/inputs/boutons clairs : blanc pur en clair, une
        // surface légèrement plus claire que le fond de page en sombre —
        // remplace les `bg-white` littéraux, qui eux ne s'inversent jamais.
        surface: 'rgb(var(--surface) / <alpha-value>)',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'Segoe UI', 'sans-serif'],
        // Titraille — chargée dans index.html (Google Fonts), utilisée via
        // `font-display` dans index.css (h1-h4). Pas de nouvelle police à
        // charger, juste la déclaration Tailwind qui manquait.
        display: ['"Plus Jakarta Sans"', 'Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        // Élévation douce (cartes vitrine/app) — teinte encre plutôt que noir pur.
        soft: '0 20px 40px -24px rgba(31, 41, 55, 0.18), 0 8px 20px -12px rgba(31, 41, 55, 0.10)',
        // Halo de marque (CTA, badges actifs) — teinte brand-600.
        glow: '0 10px 30px -8px rgba(146, 31, 24, 0.45)',
      },
      backgroundImage: {
        // Halo décoratif en haut de section (héros, cartes en survol).
        'halo-brand': 'radial-gradient(60% 100% at 50% 0%, rgba(179, 39, 30, 0.16), transparent 70%)',
      },
      keyframes: {
        'apparition-bas': {
          '0%': { opacity: '0', transform: 'translateY(24px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'apparition-douce': {
          '0%': { opacity: '0', transform: 'scale(0.96)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        respiration: {
          '0%, 100%': { opacity: '0.6', transform: 'scale(1)' },
          '50%': { opacity: '1', transform: 'scale(1.08)' },
        },
        flottement: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        onde: {
          '0%': { transform: 'scale(1)', opacity: '0.7' },
          '100%': { transform: 'scale(2.2)', opacity: '0' },
        },
        'degrade-anime': {
          '0%, 100%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
        },
        'trace-jauge': {
          '0%': { transform: 'scaleX(0)', transformOrigin: 'left' },
          '100%': { transform: 'scaleX(1)', transformOrigin: 'left' },
        },
        defilement: {
          '0%': { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-50%)' },
        },
        derive: {
          '0%, 100%': { transform: 'translate(0, 0) scale(1)' },
          '33%': { transform: 'translate(4%, -6%) scale(1.08)' },
          '66%': { transform: 'translate(-5%, 4%) scale(0.96)' },
        },
        'derive-feuille': {
          '0%': { transform: 'translateY(15vh) translateX(0) rotate(-12deg)', opacity: '0' },
          '12%': { opacity: '0.85' },
          '85%': { opacity: '0.85' },
          '100%': { transform: 'translateY(-125vh) translateX(var(--dx, 60px)) rotate(200deg)', opacity: '0' },
        },
      },
      animation: {
        'apparition-bas': 'apparition-bas 0.8s cubic-bezier(0.16, 1, 0.3, 1) both',
        'apparition-douce': 'apparition-douce 0.6s cubic-bezier(0.16, 1, 0.3, 1) both',
        respiration: 'respiration 7s ease-in-out infinite',
        flottement: 'flottement 5s ease-in-out infinite',
        onde: 'onde 2.2s cubic-bezier(0, 0, 0.2, 1) infinite',
        'degrade-anime': 'degrade-anime 6s ease-in-out infinite',
        'trace-jauge': 'trace-jauge 1.4s cubic-bezier(0.16, 1, 0.3, 1) both',
        defilement: 'defilement 22s linear infinite',
        derive: 'derive 22s ease-in-out infinite',
        'derive-feuille': 'derive-feuille 20s linear infinite',
      },
    },
  },
  plugins: [],
}

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#eefbf4',
          100: '#d6f5e3',
          200: '#b0e9cb',
          300: '#7cd7ac',
          400: '#45bd88',
          500: '#1fa26d',
          600: '#128257',
          700: '#106848',
          800: '#10533b',
          900: '#0e4432',
        },
        ink: {
          50: '#f6f7f9',
          100: '#eceef2',
          200: '#d4d9e2',
          300: '#aeb7c8',
          400: '#8290a9',
          500: '#63728e',
          600: '#4d5a74',
          700: '#3f495e',
          800: '#373f50',
          900: '#1f2533',
        },
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
        glow: '0 10px 30px -8px rgba(18, 130, 87, 0.45)',
      },
      backgroundImage: {
        // Halo décoratif en haut de section (héros, cartes en survol).
        'halo-brand': 'radial-gradient(60% 100% at 50% 0%, rgba(31, 162, 109, 0.16), transparent 70%)',
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
      },
    },
  },
  plugins: [],
}

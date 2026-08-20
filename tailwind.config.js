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
        display: ['"Plus Jakarta Sans"', 'Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        soft: '0 1px 2px rgba(15, 32, 45, 0.04), 0 12px 32px -12px rgba(15, 32, 45, 0.18)',
        glow: '0 0 0 1px rgba(31, 162, 109, 0.18), 0 18px 45px -18px rgba(18, 130, 87, 0.55)',
      },
      backgroundImage: {
        'grille-ink':
          'linear-gradient(to right, rgba(99, 114, 142, 0.09) 1px, transparent 1px), linear-gradient(to bottom, rgba(99, 114, 142, 0.09) 1px, transparent 1px)',
        'halo-brand': 'radial-gradient(60% 60% at 50% 0%, rgba(69, 189, 136, 0.28) 0%, rgba(255, 255, 255, 0) 70%)',
      },
      backgroundSize: {
        grille: '34px 34px',
      },
      keyframes: {
        'apparition-bas': {
          from: { opacity: '0', transform: 'translateY(18px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'apparition-douce': {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        flottement: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        respiration: {
          '0%, 100%': { transform: 'scale(1)', opacity: '0.55' },
          '50%': { transform: 'scale(1.12)', opacity: '0.85' },
        },
        onde: {
          '0%': { transform: 'scale(0.85)', opacity: '0.7' },
          '100%': { transform: 'scale(1.9)', opacity: '0' },
        },
        defilement: {
          from: { transform: 'translateX(0)' },
          to: { transform: 'translateX(-50%)' },
        },
        brillance: {
          '100%': { transform: 'translateX(200%)' },
        },
        'degrade-anime': {
          '0%, 100%': { 'background-position': '0% 50%' },
          '50%': { 'background-position': '100% 50%' },
        },
        'trace-jauge': {
          from: { width: '0%' },
        },
      },
      animation: {
        'apparition-bas': 'apparition-bas 0.7s cubic-bezier(0.16, 1, 0.3, 1) both',
        'apparition-douce': 'apparition-douce 0.9s ease-out both',
        flottement: 'flottement 6s ease-in-out infinite',
        respiration: 'respiration 7s ease-in-out infinite',
        onde: 'onde 2.6s ease-out infinite',
        defilement: 'defilement 32s linear infinite',
        brillance: 'brillance 2.4s ease-in-out infinite',
        'degrade-anime': 'degrade-anime 9s ease infinite',
        'trace-jauge': 'trace-jauge 1.4s cubic-bezier(0.16, 1, 0.3, 1) both',
      },
    },
  },
  plugins: [],
}

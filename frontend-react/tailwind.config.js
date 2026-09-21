/*
 * Attention : ce fichier n'est relu qu'au demarrage du serveur.
 *
 * PostCSS charge la configuration Tailwind une fois, a l'ouverture. Modifier
 * une couleur ou une animation ici pendant que le serveur tourne ne produit
 * rien : le module se recharge a chaud, mais la classe correspondante n'est
 * jamais generee, et l'element vise garde silencieusement son etat par defaut
 * — une animation ajoutee ainsi rendait `animation-duration: 0s`, sans
 * la moindre erreur en console.
 *
 * Apres une modification de ce fichier, redemarrer le serveur :
 * `docker compose restart frontend-react`, ou relancer `npm run dev`.
 */

/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      /*
       * Un cran au-dela de `2xl`, qui s'arrete a 1536 px.
       *
       * Les ecrans de 1920 px et plus sont courants sur poste de bureau, et
       * sans ce palier le heros y gardait les corps de texte de 1536 : mesure,
       * son contenu tombait a 30 % de la largeur de la fenetre en 2560 px.
       */
      screens: {
        '3xl': '1920px',
      },
      colors: {
        // Rouge brique/carmin délibérément distinct du rouge d'alerte (rose-*,
        // utilisé pour les erreurs et la criticité CRITIQUE) : plus profond et
        // moins vif, pour qu'un bouton principal ne se confonde jamais avec un
        // message d'erreur malgré la même famille de teinte.
        // Variables CSS plutôt qu'hexadécimal : la vitrine redéfinit le
        // bordeaux sous `.vitrine` (voir index.css) sans toucher à l'espace
        // connecté, qui garde les valeurs de :root.
        brand: {
          50: 'rgb(var(--brand-50) / <alpha-value>)',
          100: 'rgb(var(--brand-100) / <alpha-value>)',
          200: 'rgb(var(--brand-200) / <alpha-value>)',
          300: 'rgb(var(--brand-300) / <alpha-value>)',
          400: 'rgb(var(--brand-400) / <alpha-value>)',
          500: 'rgb(var(--brand-500) / <alpha-value>)',
          600: 'rgb(var(--brand-600) / <alpha-value>)',
          700: 'rgb(var(--brand-700) / <alpha-value>)',
          800: 'rgb(var(--brand-800) / <alpha-value>)',
          900: 'rgb(var(--brand-900) / <alpha-value>)',
        },
        // Vert de la vitrine : « conforme », progression, pilier
        // Environnement. Réservé à ce sens, jamais décoratif.
        feuille: 'rgb(var(--feuille) / <alpha-value>)',
        // Deux fonds derives de Feuille, jamais un verdict : le vert qui dit
        // « conforme » reste `feuille` et lui seul.
        'vert-profond': 'rgb(var(--vert-profond) / <alpha-value>)',
        'vert-clair': 'rgb(var(--vert-clair) / <alpha-value>)',
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
        // Bleu marine de la titraille vitrine. Défini en variable CSS comme la
        // palette ink, et pour la même raison : un titre marine posé sur le
        // fond sombre du thème nuit serait illisible, la variable bascule donc
        // vers un bleu très clair au lieu de rester figée.
        marine: 'rgb(var(--marine) / <alpha-value>)',
        // Fond des cartes/inputs/boutons clairs : blanc pur en clair, une
        // surface légèrement plus claire que le fond de page en sombre —
        // remplace les `bg-white` littéraux, qui eux ne s'inversent jamais.
        surface: 'rgb(var(--surface) / <alpha-value>)',
        // --- Charte SMARTEX SustWay (vitrine) ---
        // Couleurs nommees de la charte qui n'entrent dans aucune echelle.
        // Definies sous `.vitrine` uniquement (voir index.css) : hors de la
        // vitrine elles ne resolvent rien, ce qui est voulu — l'espace
        // connecte n'a pas a les employer.
        forest: 'rgb(var(--forest) / <alpha-value>)',
        sable: 'rgb(var(--sable) / <alpha-value>)',
        mist: 'rgb(var(--mist) / <alpha-value>)',
        growth: 'rgb(var(--growth) / <alpha-value>)',
        // Fonctionnelles. Le succes n'a pas de token propre : c'est
        // `brand-600`, le vert du produit, la charte ne distinguant pas les
        // deux.
        attention: 'rgb(var(--attention) / <alpha-value>)',
        risque: 'rgb(var(--risque) / <alpha-value>)',
        information: 'rgb(var(--information) / <alpha-value>)',
      },
      fontFamily: {
        // Deux familles suffisent quand l'une des deux tient le rôle
        // d'affichage à elle seule.
        //
        // Inter garde le texte courant, les formulaires et les tableaux : elle
        // reste lisible à 13 px là où une géométrique s'écrase.
        sans: ['Inter', 'system-ui', 'Segoe UI', 'sans-serif'],
        // Satoshi porte la titraille et les libellés marqués `font-display`.
        // Elle a du caractère en grand sans devenir illisible en petit, ce qui
        // lui permet de couvrir les deux rôles.
        display: ['Satoshi', 'Inter', 'system-ui', 'sans-serif'],
        // Annotations manuscrites : Satoshi en italique, une vraie italique
        // dessinée et non une inclinaison synthétique.
        titre: ['Satoshi', 'Inter', 'system-ui', 'sans-serif'],
        // Les montants restent sur Inter, dont les chiffres tabulaires
        // suffisent à aligner une colonne de prix.
        chiffres: ['Inter', 'system-ui', 'sans-serif'],
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
        // Variante émeraude — héros de la page d'entrée (emblème vert).
        'halo-vert': 'radial-gradient(60% 100% at 50% 0%, rgba(16, 130, 74, 0.16), transparent 70%)',
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
        rotation: {
          '0%': { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(360deg)' },
        },
        'apparition-tick': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'zoom-lent': {
          '0%': { transform: 'scale(1)' },
          '100%': { transform: 'scale(1.12)' },
        },
        'derive-feuille': {
          '0%': { transform: 'translateY(15vh) translateX(0) rotate(-12deg)', opacity: '0' },
          '12%': { opacity: '0.85' },
          '85%': { opacity: '0.85' },
          '100%': { transform: 'translateY(-125vh) translateX(var(--dx, 60px)) rotate(200deg)', opacity: '0' },
        },
        // --- Vitrine SMARTEX SustWay ---
        // Trace d'une courbe SVG (trajectoire de performance du dashboard) :
        // le trait se dessine de gauche a droite. `stroke-dashoffset` plutot
        // qu'une largeur animee — seul moyen de faire apparaitre un trace
        // courbe dans son propre sens de lecture.
        'trace-courbe': {
          '0%': { strokeDashoffset: 'var(--longueur, 1000)' },
          '100%': { strokeDashoffset: '0' },
        },
        // Point qui parcourt le fil de la frise « demarche », de gauche a
        // droite, puis recommence. `left` plutot que `translateX` : la course
        // se mesure en pourcentage du fil, or `translateX(100%)` vaut 100 % de
        // la largeur du point lui-meme, soit dix pixels. Un seul element de
        // dix pixels est anime ainsi, le cout de mise en page est negligeable.
        'point-frise': {
          '0%': { left: '0%', opacity: '0' },
          '12%': { opacity: '1' },
          '88%': { opacity: '1' },
          '100%': { left: '100%', opacity: '0' },
        },
        // Montee d'une barre de graphique depuis sa base.
        'monte-barre': {
          '0%': { transform: 'scaleY(0)' },
          '100%': { transform: 'scaleY(1)' },
        },
        // --- Fond « tech / IA » de la page d'entrée ---
        // Impulsion qui parcourt une arête du réseau neuronal : le tiret court
        // défile le long du tracé (dasharray posé côté composant).
        'flux-arete': {
          '0%': { strokeDashoffset: 'var(--longueur, 200)', opacity: '0' },
          '10%, 70%': { opacity: '1' },
          '100%': { strokeDashoffset: '0', opacity: '0' },
        },
        // Clignotement d'un noeud du réseau, façon activation de neurone.
        // Opacité seule : animer l'attribut SVG `r` en CSS n'est pas supporté
        // partout (Safari ancien), alors qu'`opacity` l'est universellement.
        'activation-noeud': {
          '0%, 100%': { opacity: '0.25' },
          '50%': { opacity: '1' },
        },
        // Balayage lumineux vertical, façon scan de données.
        balayage: {
          '0%': { transform: 'translateY(-60%)', opacity: '0' },
          '15%, 60%': { opacity: '1' },
          '100%': { transform: 'translateY(160%)', opacity: '0' },
        },
        // Dérive lente de la grille technique, pour éviter un fond figé.
        'derive-grille': {
          '0%, 100%': { transform: 'translate3d(0, 0, 0)' },
          '50%': { transform: 'translate3d(-28px, -18px, 0)' },
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
        rotation: 'rotation 90s linear infinite',
        'rotation-inverse': 'rotation 120s linear infinite reverse',
        'apparition-tick': 'apparition-tick 0.5s ease-out both',
        'zoom-lent': 'zoom-lent 24s ease-out both',
        'trace-courbe': 'trace-courbe 1.8s cubic-bezier(0.16, 1, 0.3, 1) both',
        'monte-barre': 'monte-barre 0.9s cubic-bezier(0.16, 1, 0.3, 1) both',
        // 5,5 s : le point met le meme temps a parcourir le fil qu'un regard a
        // lire les cinq etapes. Plus court, il agite ; plus long, on ne le voit
        // plus bouger. La courbe est symetrique — il part et s'arrete
        // doucement, sans a-coup au demi-tour de la boucle.
        'point-frise': 'point-frise 5.5s cubic-bezier(0.45, 0, 0.55, 1) infinite',
        'flux-arete': 'flux-arete 4s linear infinite',
        'activation-noeud': 'activation-noeud 3.5s ease-in-out infinite',
        balayage: 'balayage 9s ease-in-out infinite',
        'derive-grille': 'derive-grille 30s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}

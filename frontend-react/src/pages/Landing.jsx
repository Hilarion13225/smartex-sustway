import { useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { ArrowRight, Leaf, Menu, Sparkles, X } from 'lucide-react';
import clsx from 'clsx';
import Logo from '../components/Logo';
import BasculeTheme from '../components/BasculeTheme';
import MenuDeroulant from '../components/MenuDeroulant';
import { SMARTEX } from '../config/smartex';

/**
 * Feuilles du fond animé : position de départ, taille, vitesse, dérive
 * horizontale (--dx) et décalage. Délais négatifs pour que certaines soient
 * déjà « en vol » au chargement plutôt que de toutes partir du bas ensemble.
 */
const FEUILLES = [
  { gauche: '4%', taille: 20, duree: 17, delai: -3, dx: 55 },
  { gauche: '12%', taille: 14, duree: 22, delai: -14, dx: -35 },
  { gauche: '21%', taille: 26, duree: 19, delai: -8, dx: 40 },
  { gauche: '30%', taille: 16, duree: 24, delai: -1, dx: -50 },
  { gauche: '40%', taille: 22, duree: 16, delai: -11, dx: 30 },
  { gauche: '50%', taille: 15, duree: 21, delai: -6, dx: -60 },
  { gauche: '60%', taille: 24, duree: 18, delai: -16, dx: 45 },
  { gauche: '69%', taille: 17, duree: 23, delai: -4, dx: -30 },
  { gauche: '78%', taille: 21, duree: 20, delai: -10, dx: 50 },
  { gauche: '87%', taille: 15, duree: 25, delai: -2, dx: -40 },
  { gauche: '94%', taille: 19, duree: 18, delai: -13, dx: 35 },
];

const SOLUTION_LIENS = [
  { vers: '/a-propos#methodologie', libelle: 'Méthodologie' },
  { vers: '/accueil#parcours', libelle: 'Déploiement' },
];

const LIENS = [
  { vers: '/formation', libelle: 'Se former à la RSE et DD' },
  { vers: '/contact', libelle: 'Contact' },
];

/**
 * Page d'entrée de la plateforme (URL racine) : vitrine d'accroche. Suit le
 * thème clair/sombre/système comme le reste du site (tokens `ink`/`surface`,
 * voir index.css) — seule la scène de fond (collines, feuilles) reste fixe,
 * elle fonctionne visuellement dans les deux thèmes. Le contenu détaillé
 * habituel reste à `/accueil`, accessible depuis la navigation ci-dessous.
 */
export default function Landing() {
  const [ouvert, setOuvert] = useState(false);

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-surface dark:bg-[#1f2533]">
      {/* Aube — lueur chaleureuse basse, respire doucement. */}
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 h-[60vh] bg-[radial-gradient(60%_100%_at_50%_100%,rgba(207,92,80,0.35),transparent_75%)] motion-safe:animate-respiration"
        aria-hidden
      />

      {/* Collines en silhouette — paysage plutôt que motif abstrait. */}
      <div
        className="pointer-events-none absolute -bottom-[18vh] left-1/2 h-[38vh] w-[130vw] -translate-x-1/2 rounded-[50%] bg-[#151924]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -bottom-[22vh] left-[38%] h-[34vh] w-[110vw] -translate-x-1/2 rounded-[50%] bg-[#10141d]"
        aria-hidden
      />

      {/* Feuilles qui montent doucement dans un léger tangage — le motif
          « croissance / durabilité » de la marque, en mouvement plutôt qu'en
          icône figée, plutôt qu'un décor abstrait sans lien avec le RSE. */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
        {FEUILLES.map((feuille, index) => (
          <Leaf
            key={index}
            className="absolute bottom-0 text-emerald-400 opacity-70 drop-shadow-[0_0_6px_rgba(52,211,153,0.35)] motion-safe:animate-derive-feuille"
            style={{
              left: feuille.gauche,
              width: feuille.taille,
              height: feuille.taille,
              animationDuration: `${feuille.duree}s`,
              animationDelay: `${feuille.delai}s`,
              '--dx': `${feuille.dx}px`,
            }}
            strokeWidth={1.5}
          />
        ))}
      </div>

      <header className="relative z-10 border-b border-ink-100">
        <div className="mx-auto flex max-w-[90rem] items-center justify-between gap-4 px-5 py-3.5">
          <Link to="/" onClick={() => setOuvert(false)}>
            <Logo taille="sm" />
            <p className="hidden whitespace-nowrap text-xs text-ink-500 md:block">Par {SMARTEX.editeur}</p>
          </Link>

          <nav className="hidden items-center gap-1 lg:flex">
            <MenuDeroulant libelle={`La solution ${SMARTEX.produit}`} liens={SOLUTION_LIENS} />
            {LIENS.map((lien) => (
              <NavLink key={lien.vers} to={lien.vers} className="lien-nav">
                {lien.libelle}
              </NavLink>
            ))}
          </nav>

          <div className="hidden items-center gap-2 sm:flex">
            <BasculeTheme className="mr-1" />
            <Link to="/connexion" className="btn-vitrine-clair">
              Se connecter
            </Link>
            <Link to="/inscription" className="btn-vitrine group">
              Créer un compte
              <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" aria-hidden />
            </Link>
          </div>

          <button
            type="button"
            className="btn-ghost p-2 lg:hidden"
            onClick={() => setOuvert((valeur) => !valeur)}
            aria-label={ouvert ? 'Fermer le menu' : 'Ouvrir le menu'}
            aria-expanded={ouvert}
          >
            {ouvert ? <X className="h-5 w-5" aria-hidden /> : <Menu className="h-5 w-5" aria-hidden />}
          </button>
        </div>

        <div
          className={clsx(
            'overflow-hidden border-ink-100 bg-surface/95 backdrop-blur-xl transition-[max-height,opacity] duration-300 lg:hidden',
            ouvert ? 'max-h-[32rem] border-t opacity-100' : 'max-h-0 opacity-0'
          )}
        >
          <nav className="mx-auto flex max-w-[90rem] flex-col gap-1 px-5 py-4">
            <p className="mt-1 px-3 text-xs font-medium uppercase tracking-wide text-ink-500">La solution {SMARTEX.produit}</p>
            {SOLUTION_LIENS.map((lien) => (
              <Link
                key={lien.vers}
                to={lien.vers}
                onClick={() => setOuvert(false)}
                className="rounded-lg px-3 py-2.5 text-sm font-medium text-ink-700 hover:bg-ink-100"
              >
                {lien.libelle}
              </Link>
            ))}

            <div className="my-2 border-t border-ink-100" />

            {LIENS.map((lien) => (
              <NavLink
                key={lien.vers}
                to={lien.vers}
                onClick={() => setOuvert(false)}
                className={({ isActive }) =>
                  clsx(
                    'rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-brand-50 text-brand-700 dark:bg-brand-500/15 dark:text-brand-400'
                      : 'text-ink-700 hover:bg-ink-100'
                  )
                }
              >
                {lien.libelle}
              </NavLink>
            ))}
            <div className="mt-2 flex items-center justify-between gap-2">
              <span className="text-xs font-medium uppercase tracking-wide text-ink-500">Thème</span>
              <BasculeTheme />
            </div>
            <div className="mt-2 flex flex-col gap-2">
              <Link to="/connexion" className="btn-vitrine-clair" onClick={() => setOuvert(false)}>
                Se connecter
              </Link>
              <Link to="/inscription" className="btn-vitrine" onClick={() => setOuvert(false)}>
                Créer un compte
                <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
            </div>
          </nav>
        </div>
      </header>

      <main className="relative z-10 flex flex-1 items-center justify-center px-5 py-16">
        <div className="mx-auto max-w-3xl text-center motion-safe:animate-apparition-bas">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-ink-100 px-3.5 py-1.5 text-xs font-medium text-ink-700 ring-1 ring-ink-200">
            <Sparkles className="h-3.5 w-3.5 text-brand-500 dark:text-brand-400" aria-hidden />
            Plateforme IA pour l’évaluation RSE
          </span>

          <h1 className="mt-6 text-4xl font-semibold leading-[1.1] text-ink-900 sm:text-5xl lg:text-6xl">
            Optimisez votre demarche RSE
            <br />
            avec l’<span className="text-brand-600 dark:text-brand-400">Intelligence Artificielle</span>
          </h1>

          <p className="mx-auto mt-6 max-w-xl text-base leading-relaxed text-ink-600">
            {SMARTEX.mission} {SMARTEX.promesseFinancement}
          </p>

          <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
            <Link to="/accueil" className="btn-vitrine group px-5">
              Découvrir la plateforme
              <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" aria-hidden />
            </Link>
            <Link to="/formules" className="btn-vitrine-clair px-5">
              Formule de collaboration
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}

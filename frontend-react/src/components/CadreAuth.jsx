import { Link } from 'react-router-dom';
import { ArrowLeft, ShieldCheck, Sparkles } from 'lucide-react';
import clsx from 'clsx';
import logoSmartexSustway from '../assets/brand/logo-smartex-sustway.png';
import { SMARTEX } from '../config/smartex';
import Revele from './Revele';

/**
 * Habillage commun des parcours de connexion et d'inscription : panneau de
 * marque à gauche, contenu du formulaire à droite. Purement visuel — aucun
 * appel réseau, aucune logique d'authentification ici.
 */
export default function CadreAuth({ titre, description, badge, atouts = [], large = false, children }) {
  return (
    <div className="relative min-h-full overflow-hidden bg-ink-50 py-8 lg:py-12">
      <div
        className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-brand-200/40 blur-3xl motion-safe:animate-respiration"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -bottom-32 -right-16 h-80 w-80 rounded-full bg-emerald-200/40 blur-3xl motion-safe:animate-respiration"
        aria-hidden
      />
      <div className="pointer-events-none absolute inset-0 bg-grille-ink bg-grille opacity-[0.35]" aria-hidden />

      <div className={clsx('relative mx-auto px-5', large ? 'max-w-6xl' : 'max-w-5xl')}>
        <Link to="/" className="btn-ghost -ml-2 mb-5">
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Retour à l’accueil
        </Link>

        <div className={clsx('grid items-stretch gap-6', large ? 'lg:grid-cols-[22rem,1fr]' : 'lg:grid-cols-2')}>
          <Revele className="panneau-marque">
            <div
              className="pointer-events-none absolute -right-16 top-10 h-56 w-56 rounded-full bg-brand-500/25 blur-3xl motion-safe:animate-respiration"
              aria-hidden
            />
            <div className="relative flex items-center gap-3">
              <span className="rounded-xl bg-white/10 p-2 ring-1 ring-white/20">
                <img src={logoSmartexSustway} alt="" className="h-8 w-auto" />
              </span>
              <div>
                <p className="text-sm font-semibold leading-tight">{SMARTEX.produit}</p>
                <p className="text-xs text-white/60">Par {SMARTEX.editeur}</p>
              </div>
            </div>

            <div className="relative mt-10">
              <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-white/80 ring-1 ring-white/15">
                <Sparkles className="h-3.5 w-3.5" aria-hidden />
                {SMARTEX.accroche}
              </span>
              <p className="mt-4 text-2xl font-semibold leading-snug">
                Objectivez votre performance durable en quelques minutes.
              </p>
              <p className="mt-3 text-sm text-white/70">{SMARTEX.baseline}</p>
            </div>

            {atouts.length ? (
              <ul className="relative mt-8 space-y-3 text-sm text-white/80">
                {atouts.map((atout) => (
                  <li key={atout} className="flex items-start gap-2.5">
                    <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-brand-300" aria-hidden />
                    <span>{atout}</span>
                  </li>
                ))}
              </ul>
            ) : null}

            <p className="relative mt-auto pt-8 text-xs text-white/50">
              Chiffrement au repos et en transit · isolation multi-tenant · conformité RGPD
            </p>
          </Revele>

          <Revele delai={120} className="carte-auth p-6 sm:p-8">
            {badge ? (
              <span className="inline-flex items-center gap-2 rounded-full bg-brand-50 px-3 py-1 text-xs font-medium text-brand-700 ring-1 ring-brand-100">
                {badge}
              </span>
            ) : null}
            <h1 className="mt-3 text-2xl font-semibold tracking-tight text-ink-900">{titre}</h1>
            {description ? <p className="mt-2 text-sm text-ink-500">{description}</p> : null}
            <div className="mt-6">{children}</div>
          </Revele>
        </div>
      </div>
    </div>
  );
}

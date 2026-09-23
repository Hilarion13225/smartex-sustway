import { Link } from 'react-router-dom';
import { Check } from 'lucide-react';
import clsx from 'clsx';
import Logo from './Logo';
import { SMARTEX } from '../config/smartex';

/**
 * Habillage commun des parcours de connexion, d'inscription et de mot de
 * passe : panneau de marque à gauche, formulaire à droite. Purement visuel —
 * aucun appel réseau, aucune logique d'authentification ici.
 *
 * Refonte « Registre de preuves » : ces pages portent désormais l'enveloppe
 * `.vitrine` (palette, typographie, contour de focus, cibles de 48 px), comme
 * les pages publiques qui y mènent. Les taches de couleur floues, la grille
 * décorative et les apparitions au chargement disparaissent : c'est ici que
 * le visiteur crée son compte et paie, l'écran doit être calme.
 *
 * `badge` reste accepté et s'affiche comme un libellé en casse de phrase ;
 * son icône éventuelle est ignorée par la charte, qui ne met pas d'icône
 * décorative devant un intitulé.
 */
export default function CadreAuth({ titre, description, badge, atouts = [], large = false, children }) {
  return (
    <div className="vitrine min-h-full bg-ink-50 text-ink-600">
      <div className={clsx('mx-auto px-5 pb-12 pt-6 sm:pt-8', large ? 'max-w-[75rem]' : 'max-w-[64rem]')}>
        <div className="flex items-center justify-between gap-4">
          <Link viewTransition to="/" className="shrink-0" aria-label="SMARTEX SustWay, retour au site">
            <Logo taille="sm" />
          </Link>
          <Link viewTransition to="/" className="lien-trait text-[15px]">
            Retour au site
          </Link>
        </div>

        {/* Le cadre entre en montant legerement.

            Une page de connexion s'ouvre sur un formulaire vide : rien n'y
            bouge, rien n'y arrive, et le cadre apparait d'un bloc. L'entree
            douce marque l'arrivee sans rien demander — c'est la seule
            animation de ces pages, le formulaire lui-meme ne devant pas
            distraire de ce qu'il attend. */}
        <div
          className={clsx(
            'mt-8 grid items-stretch gap-6 motion-safe:animate-apparition-bas',
            large ? 'lg:grid-cols-[22rem_1fr]' : 'lg:grid-cols-[0.9fr_1.1fr]'
          )}
        >
          {/* Panneau de marque : plage Deep Forest pleine, couleur écrite en dur
              comme le bandeau d'appel des pages publiques — il reste sombre
              dans les deux thèmes. Masqué sous `lg`, où le formulaire passe
              seul en premier écran. */}
          <aside className="relative hidden flex-col rounded-[12px] bg-[#193E2C] p-8 text-white lg:flex">
            <p className="text-sm text-white/70">Par {SMARTEX.editeur}</p>
            <p className="mt-6 font-display text-[1.75rem] font-bold leading-[1.12] tracking-[-0.02em] text-white [text-wrap:balance]">
              Votre démarche RSE, ESG & DD, notée sur vos preuves.
            </p>
            <p className="mt-3 text-[15px] leading-relaxed text-white/75">{SMARTEX.baseline}</p>

            {atouts.length ? (
              <ul className="mt-8 space-y-3 border-t border-white/15 pt-6 text-[15px] leading-snug text-white/85">
                {atouts.map((atout) => (
                  <li key={atout} className="flex items-start gap-3">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#3FB488]" strokeWidth={2.5} aria-hidden />
                    <span>{atout}</span>
                  </li>
                ))}
              </ul>
            ) : null}

            <p className="mt-auto pt-8 text-sm text-white/60">
              Chiffrement au repos et en transit · isolation par entreprise · conformité RGPD
            </p>
          </aside>

          <main className="min-w-0 rounded-[12px] border border-ink-200 bg-surface p-6 sm:p-10">
            {badge ? <p className="sur-titre [&_svg]:hidden">{badge}</p> : null}
            <h1 className={clsx('titre-auth text-ink-900', badge ? 'mt-3' : null)}>{titre}</h1>
            {description ? <p className="mt-3 max-w-[56ch] text-base leading-relaxed text-ink-600">{description}</p> : null}
            <div className="mt-8">{children}</div>
          </main>
        </div>
      </div>
    </div>
  );
}

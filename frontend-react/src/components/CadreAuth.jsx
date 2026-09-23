import { Link } from 'react-router-dom';
import { Check } from 'lucide-react';
import clsx from 'clsx';
import Logo from './Logo';
import { SMARTEX } from '../config/smartex';

/**
 * Habillage commun des parcours de connexion, d'inscription et de mot de
 * passe. Purement visuel — aucun appel réseau, aucune logique ici.
 *
 * La page entière est une plage Deep Forest sur laquelle flotte une carte
 * blanche, et cette carte contient à son tour un panneau sombre à gauche et le
 * formulaire à droite. Trois plans, donc, au lieu de deux blocs posés sur un
 * fond gris : le regard va au centre sans qu'on ait à le lui dire.
 *
 * Le logotype est passé au-dessus du titre, dans la colonne du formulaire. Il
 * tenait dans un en-tête au-dessus de la carte, où il servait surtout de
 * décor ; là, il dit de qui est le compte qu'on ouvre, juste avant de le
 * demander.
 *
 * `badge` reste accepté et s'affiche comme un libellé en casse de phrase ;
 * son icône éventuelle est ignorée par la charte, qui ne met pas d'icône
 * décorative devant un intitulé.
 */
export default function CadreAuth({ titre, description, badge, atouts = [], large = false, children }) {
  return (
    <div className="vitrine flex min-h-full flex-col bg-forest text-ink-600">
      <div
        className={clsx(
          'mx-auto flex w-full flex-1 flex-col justify-center px-4 py-6 sm:px-6 sm:py-10',
          large ? 'max-w-[78rem]' : 'max-w-[68rem]'
        )}
      >
        {/* Le retour au site, posé sur la plage verte et non dans la carte :
            c'est une sortie, elle n'appartient pas au formulaire. */}
        <div className="mb-4 flex justify-end">
          <Link
            viewTransition
            to="/"
            className="rounded-lg px-2 py-1 text-[14px] font-medium text-white/70 underline-offset-4 transition-colors hover:text-white hover:underline"
          >
            Retour au site
          </Link>
        </div>

        {/*
         * La carte entre en montant légèrement.
         *
         * Une page de connexion s'ouvre sur un formulaire vide : rien n'y
         * bouge, rien n'y arrive. L'entrée douce marque l'arrivée sans rien
         * demander — c'est la seule animation de ces pages, le formulaire
         * lui-même ne devant pas distraire de ce qu'il attend.
         */}
        <div className="rounded-[28px] bg-surface p-3 shadow-2xl motion-safe:animate-apparition-bas sm:p-4">
          <div className={clsx('grid items-stretch gap-3 sm:gap-4', large ? 'lg:grid-cols-[24rem_1fr]' : 'lg:grid-cols-2')}>
            {/*
             * Panneau de marque. Encre pleine et non Forest : sur une carte
             * posée elle-même sur du Forest, un panneau de la même teinte se
             * confondrait avec le fond dès que la carte est étroite.
             *
             * Masqué sous 1024 px, où le formulaire passe seul en premier
             * écran — c'est lui qu'on est venu remplir.
             */}
            <aside className="relative hidden flex-col overflow-hidden rounded-[20px] bg-ink-900 p-8 text-white lg:flex">
              <p className="relative z-10 text-sm text-white/60">Par {SMARTEX.editeur}</p>
              <p className="relative z-10 mt-6 text-[1.9rem] font-bold leading-[1.1] tracking-[-0.02em] text-white [text-wrap:balance]">
                Votre démarche RSE, ESG &amp; DD, notée sur vos preuves.
              </p>
              <p className="relative z-10 mt-4 text-[15px] leading-relaxed text-white/70">{SMARTEX.baseline}</p>

              {atouts.length ? (
                <ul className="relative z-10 mt-8 space-y-3 border-t border-white/15 pt-6 text-[15px] leading-snug text-white/85">
                  {atouts.map((atout) => (
                    <li key={atout} className="flex items-start gap-3">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-growth" strokeWidth={2.5} aria-hidden />
                      <span>{atout}</span>
                    </li>
                  ))}
                </ul>
              ) : null}

              <p className="relative z-10 mt-auto pt-8 text-sm text-white/70">
                Chiffrement au repos et en transit · isolation par entreprise · conformité RGPD
              </p>

              {/*
               * Les bandes de lumière qui montent du bas.
               *
               * Quatre colonnes floutées de hauteurs inégales, dans les verts
               * de la charte : le modèle dont ce panneau s'inspire y met un
               * dégradé de couleur, qui empêche l'aplat sombre de paraître
               * mort sans rien y ajouter à lire.
               *
               * `blur-2xl` plutôt que des bords nets : à cette échelle, des
               * colonnes franches se liraient comme un graphique, et le
               * panneau annoncerait une donnée qu'il n'a pas.
               */}
              <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-[42%] overflow-hidden">
                <div className="absolute bottom-0 left-[4%] h-[75%] w-[20%] rounded-t-[999px] bg-growth blur-xl" />
                <div className="absolute bottom-0 left-[26%] h-[100%] w-[18%] rounded-t-[999px] bg-brand-300 blur-xl" />
                <div className="absolute bottom-0 left-[50%] h-[60%] w-[22%] rounded-t-[999px] bg-growth/80 blur-xl" />
                <div className="absolute bottom-0 left-[76%] h-[88%] w-[16%] rounded-t-[999px] bg-brand-400 blur-xl" />
                {/* Un voile rend au texte son fond : sans lui, la mention du
                    bas et le dernier atout passaient sur les bandes claires, en
                    blanc sur vert pale. Il s'eteint vers le bas, ou il n'y a
                    plus rien a lire. */}
                <div className="absolute inset-0 bg-gradient-to-t from-ink-900/10 via-ink-900/55 to-ink-900" />
              </div>
            </aside>

            <main className="min-w-0 px-2 py-6 sm:px-8 sm:py-10">
              {/* Le logotype ouvre la colonne, comme sur le modèle. Dans son
                  propre bloc : il est en `inline-flex`, et le sur-titre qui le
                  suit venait se ranger a cote de lui au lieu de passer dessous. */}
              <div>
                <Logo taille="sm" />
              </div>

              {badge ? <p className="sur-titre mt-8 [&_svg]:hidden">{badge}</p> : null}
              <h1 className={clsx('titre-auth text-ink-900', badge ? 'mt-3' : 'mt-8')}>{titre}</h1>
              {description ? (
                <p className="mt-3 max-w-[56ch] text-base leading-relaxed text-ink-600">{description}</p>
              ) : null}

              {/* Le filet sépare ce qui présente de ce qui demande. */}
              <hr className="mt-8 border-ink-200" />

              <div className="mt-8">{children}</div>
            </main>
          </div>
        </div>
      </div>
    </div>
  );
}

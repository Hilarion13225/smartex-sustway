import { useState } from 'react';
import { Link } from 'react-router-dom';
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
 * Le logotype est passé dans le panneau de marque, à la place du titre, de
 * l'accroche et des trois atouts qui l'occupaient — retirés à la demande
 * d'Hilarion. Le panneau ne porte plus que l'éditeur, la marque et la mention
 * de sécurité : trois lignes au lieu d'un argumentaire, devant un formulaire
 * qui n'avait pas à être plaidé.
 *
 * Sous 1024 px, où ce panneau est masqué, le logotype reparaît en tête de la
 * colonne du formulaire : la marque ne disparaît pas sur un téléphone.
 *
 * `badge` reste accepté et s'affiche comme un libellé en casse de phrase ;
 * son icône éventuelle est ignorée par la charte, qui ne met pas d'icône
 * décorative devant un intitulé. Le prop `atouts` a disparu avec la liste
 * qu'il remplissait.
 */
export default function CadreAuth({ titre, description, badge, large = false, children }) {
  /*
   * Le panneau porte une photographie, et retombe sur ses bandes de lumiere si
   * elle manque. Deux decors pour un seul emplacement, parce que le fichier
   * vit dans `public/` : rien ne garantit au moment du rendu qu'il a ete
   * depose. Un panneau vide serait pire que l'un ou l'autre.
   */
  const [fondCharge, definirFondCharge] = useState(false);

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
              {/*
               * La photographie, et par-dessus elle un voile.
               *
               * Le voile n'est pas un effet : le texte du panneau est blanc, et
               * l'image porte un halo lumineux — sans lui, « Par SMARTEX
               * Expertises » et la mention de securite passeraient en blanc sur
               * vert pale.
               *
               * Il est au contraire plus dense au centre, et non sur les bords
               * comme dans sa premiere version. Le sujet de l'image est un
               * cercle lumineux qui tombe exactement derriere le logotype : les
               * deux feuilles se superposaient et aucune ne se lisait. L'image
               * est aussi ramenee a 55 % d'opacite — un arriere-plan doit
               * rester en arriere, et celui-ci se disputait le premier plan.
               *
               * `onError` plutot qu'un test d'existence : le fichier vit dans
               * `public/`, hors du build, et c'est le navigateur qui sait s'il
               * est la. L'image reste invisible tant qu'elle n'a pas charge,
               * pour qu'un fichier manquant ne laisse pas d'icone brisee.
               */}
              <img
                src="/auth/fond.png"
                alt=""
                aria-hidden
                loading="lazy"
                onLoad={() => definirFondCharge(true)}
                onError={() => definirFondCharge(false)}
                className={clsx(
                  'pointer-events-none absolute inset-0 h-full w-full object-cover transition-opacity duration-700',
                  fondCharge ? 'opacity-55' : 'opacity-0'
                )}
              />
              {fondCharge ? (
                <div
                  aria-hidden
                  className="pointer-events-none absolute inset-0 bg-gradient-to-b from-ink-900/55 via-ink-900/75 to-ink-900/80"
                />
              ) : null}

              <p className="relative z-10 text-sm text-white/60">Par {SMARTEX.editeur}</p>

              {/* Le logotype tient la place du discours qui occupait ce panneau
                  — un titre, une accroche et trois atouts, retirés à la demande
                  d'Hilarion. Il ouvrait la colonne du formulaire ; il passe ici,
                  où il dit de qui est le compte sans rien ajouter à lire.
                  Centré sur la hauteur libre, entre l'éditeur et la mention du
                  bas, plutôt que posé contre l'un des deux. */}
              <div className="relative z-10 flex flex-1 items-center justify-center">
                {/*
                 * La taille est donnee ici et non par `taille`, dont aucun cran
                 * ne convenait : `md` laissait le logotype flotter au milieu du
                 * panneau, `lg` et `text-5xl` le faisaient deborder — 458 px
                 * mesures pour 432 px utiles, que le panneau coupait en silence
                 * puisqu'il est en `overflow-hidden`.
                 *
                 * Les valeurs sont calees sur la largeur utile mesuree, et visent
                 * 95 % de celle-ci ; le logotype occupe 9,53 px de large par
                 * pixel de corps.
                 *
                 * Deux jeux, parce que le panneau n'a pas la meme largeur selon
                 * la page. En `large` — l'inscription, dont le formulaire tient
                 * cinq etapes — il est fige a 24 rem, soit 320 px utiles : les
                 * valeurs de l'autre jeu y debordaient de 92 px et coupaient le
                 * S de SMARTEX. Sinon il suit la moitie de la carte, 400 px
                 * entre 1024 et 1280 px puis 432 px au-dela, ou il cesse de
                 * grandir.
                 */}
                <Logo
                  taille="md"
                  variante="clair"
                  className={large ? 'text-[2rem]' : 'text-[2.5rem] xl:text-[2.7rem]'}
                />
              </div>

              <p className="relative z-10 pt-8 text-sm text-white/70">
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
               *
               * Elles ne paraissent plus que si la photographie manque : les
               * superposer reviendrait à poser un dégradé de couleur sur une
               * image qui porte déjà les siennes.
               */}
              {fondCharge ? null : (
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
              )}
            </aside>

            <main className="min-w-0 px-2 py-6 sm:px-8 sm:py-10">
              {/* Le logotype est passé dans le panneau de marque. Il reste ici
                  sous 1024 px, où ce panneau est masqué : sans cela, la page de
                  connexion n'aurait plus porté la marque sur un téléphone. */}
              <div className="lg:hidden">
                <Logo taille="sm" />
              </div>

              {badge ? <p className="sur-titre mt-8 [&_svg]:hidden lg:mt-0">{badge}</p> : null}
              <h1 className={clsx('titre-auth text-ink-900', badge ? 'mt-3' : 'mt-8 lg:mt-0')}>{titre}</h1>
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

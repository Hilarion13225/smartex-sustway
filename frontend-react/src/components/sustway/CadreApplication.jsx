import clsx from 'clsx';
import Logo from '../Logo';

/*
 * Chrome commun à tous les aperçus produit de la vitrine.
 *
 * Il existe pour une raison précise : sans cadre, une grille de cartes posée
 * au milieu d'une page de site se lit comme une section du site, pas comme un
 * écran de logiciel. La barre supérieure et le rail de navigation suffisent à
 * faire basculer la lecture — le visiteur comprend qu'il regarde par-dessus
 * l'épaule de quelqu'un qui utilise l'outil.
 *
 * Tout le bloc est `aria-hidden` et son contenu porté par un texte de
 * remplacement : ce sont des illustrations. Un lecteur d'écran n'a rien à
 * gagner à parcourir une fausse interface, et les données affichées sont des
 * exemples, pas des informations.
 */
export default function CadreApplication({ ecran, description, rail = true, className, children }) {
  return (
    <figure className={clsx('overflow-hidden rounded-2xl border border-ink-200 bg-surface shadow-soft', className)}>
      {/* La description remplace l'aperçu pour qui ne le voit pas, comme le
          ferait l'attribut `alt` d'une image — ce bloc en est une, faite de
          balises plutôt que de pixels. Le reste est masqué à l'assistance :
          annoncer cellule par cellule une interface d'illustration
          produirait un long texte sans information. */}
      <figcaption className="sr-only">{description}</figcaption>
      <div aria-hidden>
      {/* Barre de fenêtre. Les trois pastilles sont grises et non colorées :
          en rouge et jaune, elles introduiraient dans la charte deux couleurs
          qui n'y sont pas, et que l'œil lirait comme des états d'alerte. */}
      <div className="flex items-center gap-3 border-b border-ink-200 bg-ink-50 px-4 py-2.5">
        <div aria-hidden className="flex gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-ink-300" />
          <span className="h-2.5 w-2.5 rounded-full bg-ink-300" />
          <span className="h-2.5 w-2.5 rounded-full bg-ink-300" />
        </div>
        <div className="flex min-w-0 flex-1 items-center justify-center">
          <span className="truncate rounded-md bg-surface px-3 py-1 text-[11px] font-medium text-ink-500 ring-1 ring-ink-200">
            {ecran}
          </span>
        </div>
        {/* Contrepoids des pastilles, pour que le titre tombe au centre
            optique et non décalé vers la droite. */}
        <div aria-hidden className="w-[42px]" />
      </div>

      <div className="flex">
        {rail ? (
          // Rail de navigation réduit à ses repères : le logotype, quatre
          // entrées, un compte. Détaillé, il volerait l'attention au contenu
          // de l'écran, qui est ce que la section cherche à montrer.
          <div aria-hidden className="hidden w-[132px] shrink-0 border-r border-ink-200 bg-ink-50 p-3 sm:block">
            <Logo taille="heritee" className="mb-4 text-[11px]" />
            {['Tableau de bord', 'Campagnes', 'Indicateurs', 'Plans d’action'].map((entree, index) => (
              <div
                key={entree}
                className={clsx(
                  'mb-1 truncate rounded-md px-2 py-1.5 text-[10px] font-medium',
                  index === 0 ? 'bg-brand-50 text-brand-700' : 'text-ink-500'
                )}
              >
                {entree}
              </div>
            ))}
            <div className="mt-4 flex items-center gap-1.5 border-t border-ink-200 pt-3">
              <span className="h-5 w-5 rounded-full bg-brand-100" />
              <span className="h-1.5 w-12 rounded-full bg-ink-200" />
            </div>
          </div>
        ) : null}
        <div className="min-w-0 flex-1 bg-surface p-3.5 sm:p-5">{children}</div>
      </div>
      </div>
    </figure>
  );
}

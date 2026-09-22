import { useState } from 'react';
import { PlayCircle } from 'lucide-react';
import clsx from 'clsx';
import ModaleVideo from '../ModaleVideo';

/**
 * « Demander une démo » : un déclencheur, pas un lien.
 *
 * Partout sur le site, cet intitulé ouvre la vidéo de démonstration. Il menait
 * auparavant au formulaire de contact — un visiteur qui veut voir le produit
 * n'a pas à remplir un champ d'abord, et la page Contact reste atteignable par
 * le pied de page pour qui veut parler à quelqu'un.
 *
 * Le composant porte son propre état et sa propre modale : les trois endroits
 * qui l'emploient — l'introduction et la fin de la page Fonctionnalités, le
 * pied de page — n'ont pas à gérer une vidéo dont ils ne savent rien. C'est
 * aussi ce qui évite de monter trois fois le même lecteur dans la page : la
 * modale n'existe qu'une fois ouverte.
 *
 * `variante` décrit le fond sur lequel le bouton est posé, non sa couleur : sur
 * Forest, le vert de marque ne se détache qu'à 2,03:1 là où un composant
 * d'interface en demande 3, et c'est le blanc qui doit porter l'action.
 */
export default function BoutonDemo({
  variante = 'plein',
  libelle = 'Demander une démo',
  avecIcone = true,
  className = '',
}) {
  const [ouverte, definirOuverte] = useState(false);

  const variantes = {
    plein: 'bg-brand-600 text-white hover:bg-brand-700',
    clair: 'bg-white text-forest hover:bg-brand-100',
    discret: 'text-white/85 hover:text-white',
  };

  return (
    <>
      <button
        type="button"
        onClick={() => definirOuverte(true)}
        className={clsx(
          'group inline-flex items-center gap-2 font-semibold transition-colors',
          variante === 'discret'
            ? 'min-h-11 text-[15px] sm:min-h-8'
            : 'min-h-12 justify-center rounded-lg px-6 text-[15px]',
          variantes[variante],
          className
        )}
      >
        {avecIcone ? (
          <PlayCircle
            className="h-[18px] w-[18px] shrink-0 transition-transform duration-200 motion-safe:group-hover:scale-110"
            strokeWidth={1.75}
            aria-hidden
          />
        ) : null}
        {libelle}
      </button>

      {/* La modale n'est montée qu'à l'ouverture : elle charge une vidéo que
          personne ne doit payer pour avoir seulement vu la page. */}
      {ouverte ? (
        <ModaleVideo
          source="/videos/methodologie-overview.mp4"
          titre="Démonstration SMARTEX SustWay"
          surFermeture={() => definirOuverte(false)}
        />
      ) : null}
    </>
  );
}

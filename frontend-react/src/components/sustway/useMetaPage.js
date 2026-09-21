import { useEffect } from 'react';

/*
 * Titre et description d'une page.
 *
 * L'application est rendue côté navigateur : `index.html` ne porte qu'un
 * titre, celui de l'accueil, et les cinq pages le partageraient sans cela.
 * Un onglet, un favori et un résultat de recherche s'appuient tous dessus,
 * et cinq entrées identiques ne se distinguent plus.
 *
 * La balise `description` est modifiée sur place plutôt que remplacée : les
 * moteurs qui exécutent le script lisent le DOM final, et un ajout en double
 * laisserait deux descriptions concurrentes dans la page.
 *
 * Aucune bibliothèque pour cela : un effet de quelques lignes suffit, et la
 * charte demande d'éviter les dépendances qui ne gagnent rien.
 */
export function useMetaPage(titre, description) {
  useEffect(() => {
    const titreInitial = document.title;
    document.title = titre;

    const balise = document.querySelector('meta[name="description"]');
    const descriptionInitiale = balise?.getAttribute('content');
    if (balise && description) balise.setAttribute('content', description);

    // Au démontage, on rend à la page ce qu'elle avait : sans cela, revenir
    // en arrière depuis une page qui n'appelle pas ce hook — une page
    // héritée, l'espace connecté — laisserait le titre de la précédente.
    return () => {
      document.title = titreInitial;
      if (balise && descriptionInitiale !== undefined && descriptionInitiale !== null) {
        balise.setAttribute('content', descriptionInitiale);
      }
    };
  }, [titre, description]);
}

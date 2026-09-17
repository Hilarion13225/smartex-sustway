import { Link } from 'react-router-dom';
import AppelAction from '../components/AppelAction';
import GrilleFormules from '../components/vitrine/GrilleFormules';
import photoBandeau from '../assets/methodologie/engagement-banniere.jpg';

/**
 * Page « Formules ».
 *
 * Elle est réduite à ce qu'un acheteur vient y chercher : le prix des trois
 * offres, et un contact pour le sur-mesure.
 *
 * Quatre sections ont été retirées à votre demande — le tableau comparatif
 * « Les formules, ligne par ligne », le déroulé « Comment se passe l'achat »,
 * le socle « Toutes nos formules incluent » et le bloc de questions « Vos
 * questions avant de choisir ». Tout ce que les trois offres annoncent tient
 * donc dans leurs seules cartes (`GrilleFormules`), et les étapes de l'achat
 * ne sont plus décrites avant le parcours — le bouton « Créer un compte » y
 * mène directement.
 *
 * Deux jeux de contenus rédigés deviennent orphelins dans `lib/formules.js` :
 * `COMPARATIF`, qui alimentait le tableau, et `QUESTIONS`, qui alimentait le
 * bloc de questions. Ils y restent sans être consommés — je n'efface pas des
 * textes rédigés sans consigne, et ils se rebranchent en une ligne.
 */
export default function Formules() {
  return (
    <div>
      {/* ------------------------------------------------------- Bandeau */}
      {/* Même forme que le bandeau de la page Méthodologie : image en fond,
          titre centré, fil d'Ariane dessous. L'image de la poignée de main
          était déjà dans le dépôt, sous `engagement-banniere.jpg`.

          C'est lui qui porte le niveau 1, et « Formule de collaboration » passe
          au niveau 2 juste en dessous : deux titres de niveau 1 sur une page
          désorientent un lecteur d'écran, et l'ordre des deux est celui que
          vous avez demandé — le bandeau avant le titre. */}
      <section className="relative isolate overflow-hidden bg-marine text-white">
        <img
          src={photoBandeau}
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
          loading="eager"
          fetchPriority="high"
        />
        <div className="absolute inset-0 bg-marine/[0.72]" aria-hidden />

        <div className="relative mx-auto max-w-[90rem] px-5 py-20 text-center sm:py-28">
          <h1 className="text-white">Engageons-nous ensemble</h1>

          <nav aria-label="Fil d’Ariane" className="mt-4">
            <ol className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-[15px] text-white/80">
              <li>
                <Link to="/services" viewTransition className="underline-offset-4 hover:underline">
                  Accueil
                </Link>
              </li>
              <li aria-hidden className="text-white/45">—</li>
              <li aria-current="page" className="font-semibold text-white">
                Formule de collaboration
              </li>
            </ol>
          </nav>
        </div>
      </section>

      {/* --------------------------------------------------------- Héros */}
      <section>
        <div className="mx-auto max-w-[90rem] px-5 pb-10 pt-10 sm:pt-14 lg:pb-12 lg:pt-20">
          {/* Titre de la grille tarifaire. Il portait autrefois le niveau 1 avec
              l'apparence d'une étiquette — quatorze pixels, là où les autres
              pages titrent à cinquante-six : la page s'ouvrait donc sur une
              grille de prix sans promesse. Il garde sa taille de titre de page ;
              seul son niveau descend d'un cran, le bandeau ayant pris le sien. */}
          <h2 className="titre-page max-w-[16ch] text-ink-900">Formule de collaboration</h2>
        </div>
      </section>

      {/* ------------------------------------------------ Cartes formules */}
      <section id="grille-formules" className="mx-auto max-w-[90rem] px-5 pb-16 pt-6">
        <GrilleFormules />
      </section>

      <AppelAction
        titre="Besoin d’une offre sur mesure ?"
        texte="Décrivez-nous votre périmètre et vos échéances : nous revenons vers vous avec la démarche adaptée."
        action={{ libelle: 'Nous contacter', vers: '/contact' }}
        secondaire={{ libelle: 'Lire la méthodologie', vers: '/methodologie' }}
      />
    </div>
  );
}

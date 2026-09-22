import { Apparition, Section, TitreSection } from './Section';
import { ORGANISATIONS } from '../../config/organisations';

/*
 * « Ils nous font confiance » : les organisations, sur la page d'accueil.
 *
 * Les cinq logotypes sont ceux d'organisations réelles, déjà affichées par le
 * bandeau des pages antérieures — la liste est partagée, pas recopiée. Rien
 * n'est ajouté pour faire nombre : la charte écarte explicitement les logos de
 * partenaires inventés, et cinq références vraies valent mieux que vingt dont
 * on ne pourrait produire aucune.
 *
 * Les logos gardent leurs couleurs au repos et passent en niveaux de gris au
 * survol. Une référence se lit d'abord telle que la marque se présente ; le
 * gris marque alors le passage du pointeur sans rien ajouter à la page.
 *
 * L'opacité, elle, ne bouge pas. Le voile de 30 % que portait la première
 * version effaçait un logotype déjà clair comme celui de SIFCA, et une
 * référence qu'on ne lit pas ne sert à rien.
 */
export default function SectionConfiance() {
  return (
    /*
     * La section s'étire jusqu'à ce qu'elle et le pied de page remplissent
     * exactement une fenêtre.
     *
     * C'est la dernière section de l'accueil, qui se lit alors en deux écrans :
     * le héros, puis celui-ci. `--hauteur-pied` est publiée par le pied
     * lui-même, qui se mesure ; la valeur de repli ne sert que le temps du
     * premier rendu.
     *
     * `--hauteur-bandeau` se retranche en plus depuis que le bandeau des
     * référentiels court aussi sous les pages de la charte : c'est une barre
     * fixe au bas de la fenêtre, et sans elle le pied passait dessous.
     *
     * `min-height` et non `height` : quand la fenêtre est trop basse pour que
     * les deux tiennent, le calcul donne moins que le contenu et reste donc
     * sans effet — la section garde sa hauteur naturelle plutôt que d'écraser
     * ses logos. `max()` avec zéro pour la même raison, un calcul négatif
     * étant invalide.
     *
     * À partir de 1024 px seulement : en dessous, le pied passe à deux
     * colonnes et dépasse à lui seul la hauteur d'un téléphone.
     *
     * `pt-[72px]` réserve la hauteur de la barre de navigation. Elle est en
     * position fixe et redevient opaque dès que la page a défilé : sans cette
     * réserve, elle recouvrait le sur-titre de la section, qu'on ne pouvait
     * plus lire une fois arrivé en bas. Le padding est compris dans la hauteur
     * calculée au-dessus, il ne repousse donc pas le pied hors de la fenêtre.
     */
    <Section
      fond="blanc"
      className="lg:flex lg:min-h-[max(0px,calc(100svh-var(--hauteur-pied,340px)-var(--hauteur-bandeau,0px)))] lg:flex-col lg:justify-center lg:pt-[72px]"
      contenuClassName="py-14 lg:py-6"
    >
      <TitreSection
        centre
        /* Le titre passe de 40 a 32 px sur grand ecran : c'est la seule
           section du site tenue a une hauteur, et dix-huit pixels y comptent. */
        titreClassName="lg:text-[32px]"
        surTitre="Ils nous font confiance"
        titre="Des organisations qui pilotent déjà leur performance durable"
        sousTitre="Groupes industriels, énergéticiens, agro-industrie et organisation patronale : des structures de tailles et de secteurs différents, engagées dans une démarche RSE, ESG & DD."
      />

      {/*
       * Cinq colonnes sur grand écran, trois en tablette, deux sur téléphone.
       * Jamais cinq en dessous de 1024 px : un logotype large descendrait sous
       * 60 px et deviendrait illisible bien avant d'être petit.
       */}
      <ul className="mt-12 grid grid-cols-2 items-center gap-x-8 gap-y-10 sm:grid-cols-3 lg:mt-6 lg:grid-cols-5">
        {ORGANISATIONS.map((organisation, index) => (
          <Apparition
            key={organisation.nom}
            balise="li"
            delai={index * 90}
            className="flex items-center justify-center"
          >
              <img
                src={organisation.logo}
                alt={organisation.nom}
                width={organisation.taille[0]}
                height={organisation.taille[1]}
                loading="lazy"
                /* `max-w-full` d'abord, et la borne fixe seulement à partir de
                   640 px : à 320 px de fenêtre, une colonne de la grille n'en
                   fait que 124, et une largeur maximale de 170 px poussait la
                   page à 323 px — un défilement horizontal de trois pixels,
                   invisible à l'œil mais bien réel au doigt. */
                className={`w-auto max-w-full object-contain transition duration-300 hover:grayscale motion-reduce:transition-none sm:max-w-[170px] ${organisation.hauteurAccueil}`}
              />
          </Apparition>
        ))}
      </ul>
    </Section>
  );
}

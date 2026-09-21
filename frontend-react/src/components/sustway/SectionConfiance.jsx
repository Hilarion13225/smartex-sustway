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
 * Les logos sont en gris au repos et reprennent leurs couleurs au survol :
 * cinq logotypes de cinq marques différentes apportent cinq palettes qui se
 * disputeraient la page entre le héros et le parcours.
 *
 * En gris, mais à pleine opacité. Le voile de 30 % que portait la première
 * version les effaçait : un logotype déjà clair en niveaux de gris, comme
 * celui de SIFCA, devenait un fantôme, et une référence qu'on ne lit pas ne
 * sert à rien. Le survol ne rend donc que la couleur, pas la densité.
 */
export default function SectionConfiance() {
  return (
    <Section fond="blanc" contenuClassName="py-16 lg:py-20">
      <TitreSection
        centre
        surTitre="Ils nous font confiance"
        titre="Des organisations qui pilotent déjà leur performance durable"
        sousTitre="Groupes industriels, énergéticiens, agro-industrie et organisation patronale : des structures de tailles et de secteurs différents, engagées dans une démarche RSE et ESG."
      />

      {/*
       * Cinq colonnes sur grand écran, trois en tablette, deux sur téléphone.
       * Jamais cinq en dessous de 1024 px : un logotype large descendrait sous
       * 60 px et deviendrait illisible bien avant d'être petit.
       */}
      <ul className="mt-14 grid grid-cols-2 items-center gap-x-8 gap-y-10 sm:grid-cols-3 lg:grid-cols-5">
        {ORGANISATIONS.map((organisation, index) => (
          <Apparition key={organisation.nom} delai={index * 90}>
            <li className="flex items-center justify-center">
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
                className={`w-auto max-w-full object-contain grayscale transition duration-300 hover:grayscale-0 motion-reduce:transition-none sm:max-w-[170px] ${organisation.hauteurAccueil}`}
              />
            </li>
          </Apparition>
        ))}
      </ul>
    </Section>
  );
}

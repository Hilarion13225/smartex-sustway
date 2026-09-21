import { Link } from 'react-router-dom';
import { Briefcase, FileCheck2, GraduationCap, Route, Scale, ShieldCheck } from 'lucide-react';
import Revele from '../components/Revele';
import RoueDeming from '../components/vitrine/RoueDeming';
import CarrouselReferentiels from '../components/vitrine/CarrouselReferentiels';
import BlocMedia from '../components/vitrine/BlocMedia';
import { FONDEMENTS, REFERENCES_METHODOLOGIQUES, REFERENTIEL_SMARTEX, SMARTEX } from '../config/smartex';
import photoHero from '../assets/methodologie/banniere.jpg';




const ICONES_PRINCIPES = { FileCheck2, Route, GraduationCap, Briefcase, ShieldCheck, Scale };

const classeTitreSection =
  'titre-section text-ink-900';

/**
 * Page « Méthodologie ».
 *
 * La page s'ouvre sur un bandeau sombre à titre centré, puis reprend le langage
 * de la page Solution : plages Papier et Craie séparées par des filets, listes
 * plutôt que cartes. Le seul dessin est la roue de Deming, et son seul mouvement
 * répond au pointeur.
 */
export default function Methodologie() {

  return (
    <div>
      {/* --------------------------------------------------------- Héros */}
      {/* Bandeau plein à titre centré, sur le modèle que vous avez transmis.
          Il remplace les deux colonnes — titre, chapô, boutons et photo —
          retirées à votre demande. La même photo passe du cadre au fond.

          Le voile est indispensable : cette image est claire (chemise, papier,
          plante en plein jour) et le blanc y serait illisible sans lui. */}
      <section className="relative isolate overflow-hidden bg-marine text-white">
        {/* Non différée : c'est le plus grand affichage du premier écran. */}
        <img
          src={photoHero}
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
          loading="eager"
          fetchPriority="high"
        />
        <div className="absolute inset-0 bg-marine/[0.72]" aria-hidden />

        <div className="relative mx-auto max-w-[90rem] px-5 py-20 text-center sm:py-28">
          <h1 className="text-white">Méthodologie</h1>

        </div>
      </section>

      {/* ------------------------------------------------ La méthodologie en vidéo */}
      {/* La vidéo ne s'ouvrait autrefois qu'en modale, depuis un bouton du
          héros ; elle se joue dans la page depuis un lot précédent. Le héros
          ayant été remplacé par un bandeau sans bouton, c'est désormais le seul
          endroit d'où la regarder — la modale, devenue inatteignable, est
          partie avec lui.

          Le surtitre et le paragraphe ont été retirés à votre demande : il ne
          reste que le nom de la plateforme, en regard de sa vidéo. Celle-ci est
          servie par le site de SMARTEX Expertises, et non depuis `public/` :
          c'est l'adresse que vous avez donnée. `prechargement="metadata"`
          remplace l'affiche fixe, qui montrait la forêt et le lac, sans rapport
          avec cette vidéo-ci ; quelques dizaines de kilo-octets suffisent à en
          tirer la première image. */}
      <BlocMedia
        ancre="video"
        titre={SMARTEX.produit}
        video="https://smartex-sustway.smartex-expertises.com/videos/sllide.mp4"
        prechargement="metadata"
      />

      {/* --------------------------------------------- Amélioration continue */}
      <section id="amelioration" className="border-b border-ink-200 bg-surface">
        <div className="mx-auto max-w-[90rem] px-5 py-16 sm:py-20">
          <h2 className={`mx-auto max-w-3xl text-center ${classeTitreSection}`}>L’<span className="text-brand-600">amélioration continue</span> au cœur de l’approche.</h2>
          <p className="mx-auto mt-4 texte-chapo text-center text-ink-600">
            La roue de Deming (PDCA) aide les organisations à sortir de la stagnation et à progresser durablement. Pointez
            une étape pour la situer sur la roue.
          </p>

          <RoueDeming className="mt-12" />
        </div>
      </section>

      {/* -------------------------------------------------- Nos principes */}
      <section id="principes" className="border-b border-ink-200 bg-surface">
        <div className="mx-auto max-w-[90rem] px-5 py-16 sm:py-20">
          <h2 className={`mx-auto max-w-3xl text-center ${classeTitreSection}`}><span className="text-brand-600">Six principes</span> fondent la démarche.</h2>

          {/* Cartes à filet latéral : le filet marque le début de la carte
              là où un trait horizontal la séparait de sa voisine. L'icône ne
              fait que doubler l'intitulé — elle reste donc masquée aux
              technologies d'assistance.

              Le modèle dont ces cartes s'inspirent porte un lien « en savoir
              plus » sous chaque texte. Il n'y en a pas ici : un principe n'a
              pas de page à lui, et six liens qui mèneraient tous au même
              endroit ne diraient rien de plus. */}
          <ul className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {FONDEMENTS.map((principe, index) => {
              const Icone = ICONES_PRINCIPES[principe.icone];
              return (
                <Revele
                  key={principe.titre}
                  as="li"
                  delai={index * 70}
                  className="group relative overflow-hidden rounded-[16px] bg-ink-50 p-6 pl-7 ring-1 ring-transparent motion-safe:transition-[background-color,box-shadow] motion-safe:duration-300 hover:bg-surface hover:shadow-[0_1px_2px_rgb(var(--marine)/0.04),0_12px_28px_-18px_rgb(var(--marine)/0.25)] sm:p-7 sm:pl-8"
                >
                  {/* Au survol, le filet court sur toute la hauteur et la carte
                      passe au blanc. Ni déplacement ni agrandissement : ces
                      cartes ne sont pas cliquables, et les faire se soulever
                      promettrait un clic qui n'existe pas. */}
                  <span
                    className="absolute inset-y-6 left-0 w-1 rounded-r-full bg-brand-600 motion-safe:transition-[top,bottom] motion-safe:duration-300 group-hover:inset-y-0"
                    aria-hidden
                  />
                  {Icone ? (
                    <span className="mb-5 flex h-12 w-12 items-center justify-center rounded-[12px] bg-surface motion-safe:transition-colors motion-safe:duration-300 group-hover:bg-ink-100">
                      <Icone className="h-5 w-5 text-ink-800" strokeWidth={1.75} aria-hidden />
                    </span>
                  ) : null}
                  <h3 className="titre-objet text-ink-900">{principe.titre}</h3>
                  {principe.texte ? (
                    <p className="mt-2 text-[15px] leading-relaxed text-ink-600">{principe.texte}</p>
                  ) : null}
                </Revele>
              );
            })}
          </ul>
        </div>
      </section>

      {/* --------------------------------------- Référentiels et standards */}
      <section id="referentiels">
        <div className="mx-auto max-w-[90rem] px-5 py-16 sm:py-20">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <h2 className={`max-w-2xl ${classeTitreSection}`}>Référentiels et standards mobilisés.</h2>
            <Link to="/services" viewTransition className="lien-trait text-base">
              Voir la solution
            </Link>
          </div>

          {/* Les six repères en éventail : la fiche au centre, ses voisines
              en retrait. Le référentiel propre à la plateforme ferme la série,
              puisqu'il est ce que les cinq autres nourrissent. */}
          <CarrouselReferentiels
            referentiels={[
              ...REFERENCES_METHODOLOGIQUES,
              {
                code: 'SMARTEX_SUSTWAY',
                nom: `Référentiel ${SMARTEX.produit}`,
                texte: `${REFERENTIEL_SMARTEX.criteres} critères en ${REFERENTIEL_SMARTEX.parties} parties : le cadre que la plateforme évalue, nourri par ces standards.`,
              },
            ]}
          />
        </div>
      </section>

    </div>
  );
}

import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import photoEntreprises from '../../assets/formation/banques.jpg';
import photoInstitutions from '../../assets/institutions.jpg';
import photoOng from '../../assets/ong.jpg';
import photoBailleurs from '../../assets/methodologie/engagement-banniere.jpg';

/**
 * « Pour toutes les organisations », en mosaïque sur fond vert profond.
 *
 * La section alignait quatre vignettes de même taille : quatre publics très
 * différents y avaient exactement le même poids, et la page entière se lisait
 * comme une suite de rangées claires. La mosaïque donne un point d'appui dans
 * le défilement et laisse les tailles dire quelque chose.
 *
 * Les titres et les textes sont ceux d'avant, mot pour mot, et les quatre
 * photographies sont les mêmes.
 *
 * Couleurs : le fond et les aplats viennent de `vert-profond` et `vert-clair`,
 * deux nuances dérivées de Feuille et réservées aux fonds. `feuille` lui-même
 * n'apparaît pas ici : sur cette vitrine il dit « conforme », et un aplat
 * décoratif lui ferait perdre ce sens. Le bordeaux tient l'accent — la pastille
 * du libellé, et la flèche des cartes claires — là où il a de quoi contraster ;
 * sur le fond profond il serait illisible, le blanc y porte donc la titraille.
 */
const PUBLICS = [
  {
    photo: photoEntreprises,
    titre: 'Entreprises',
    texte: 'Pilotez et valorisez votre démarche RSE.',
    forme: 'aplat',
    place: 'lg:col-span-2',
  },
  {
    photo: photoInstitutions,
    titre: 'Institutions publiques',
    texte: 'Renforcez la transparence et la performance.',
    forme: 'photo',
    place: 'lg:col-span-2 lg:row-span-2',
  },
  {
    photo: photoOng,
    titre: 'ONG et associations',
    texte: 'Mesurez votre impact et structurez vos actions.',
    forme: 'photo',
    place: '',
  },
  {
    photo: photoBailleurs,
    titre: 'Bailleurs et partenaires',
    texte: 'Appuyez des initiatives à fort impact.',
    forme: 'aplat',
    place: '',
  },
];

export default function SectionPublics({ ancre }) {
  return (
    <section id={ancre} className="bord-diagonal bg-vert-profond">
      <div className="mx-auto max-w-[90rem] px-5 py-16 sm:py-20">
        <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <p className="flex items-center gap-2.5 text-sm font-semibold text-vert-clair">
              <span className="h-2 w-2 shrink-0 rounded-full bg-brand-600" aria-hidden />
              À qui s’adresse la plateforme
            </p>
            <h2 className="titre-section mt-4 text-white">Pour toutes les organisations.</h2>
            <p className="mt-4 text-[17px] leading-relaxed text-white/75">
              Chacun évalue sa performance RSE et ESG avec le référentiel qui lui correspond.
            </p>
          </div>

          <Link
            to="/methodologie"
            viewTransition
            className="inline-flex shrink-0 items-center gap-2 rounded-[4px] border border-white/30 px-5 py-3 text-[15px] font-semibold text-white transition-colors hover:bg-white/10"
          >
            Lire la méthodologie
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        </div>

        <ul className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:auto-rows-[11rem]">
          {PUBLICS.map((cible) => (
            <li
              key={cible.titre}
              className={`relative flex min-h-[11rem] flex-col justify-end overflow-hidden rounded-[16px] ${cible.place}`}
            >
              {cible.forme === 'photo' ? (
                <>
                  <img
                    src={cible.photo}
                    alt=""
                    aria-hidden
                    loading="lazy"
                    className="absolute inset-0 h-full w-full object-cover"
                  />
                  {/* Voile porté par le vert de la section plutôt que par du noir :
                      l'image se fond dans la plage au lieu de s'y poser. */}
                  <span
                    className="absolute inset-0 bg-gradient-to-t from-vert-profond via-vert-profond/55 to-vert-profond/10"
                    aria-hidden
                  />
                  <div className="relative p-6">
                    <h3 className="titre-objet text-white">{cible.titre}</h3>
                    <p className="mt-2 text-[15px] leading-relaxed text-white/80">{cible.texte}</p>
                  </div>
                </>
              ) : (
                <div className="flex h-full flex-col justify-between bg-vert-clair p-6">
                  <ArrowRight className="h-5 w-5 text-brand-600" aria-hidden />
                  <div>
                    <h3 className="titre-objet text-ink-900">{cible.titre}</h3>
                    <p className="mt-2 text-[15px] leading-relaxed text-ink-700">{cible.texte}</p>
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

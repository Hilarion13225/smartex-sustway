import { REFERENTIEL_SMARTEX } from '../../config/smartex';
/**
 * « Ce que vous y gagnez », en grille modulaire — essai de style Bento.
 *
 * La version précédente alignait quatre blocs identiques : un filet, un titre,
 * deux lignes. Elle disait ce que le produit apporte ; elle ne le montrait pas.
 * Cette grille reprend les quatre mêmes bénéfices, mot pour mot, et donne à
 * chacun la place que son propos demande : la vue d'ensemble occupe quatre
 * cases, une priorité en occupe une.
 *
 * Écarts assumés au style Bento, et pourquoi :
 *
 * — Pas de `hover: scale(1.02)`. Aucun de ces modules n'est cliquable, et la
 *   vitrine tient pour règle que rien n'a l'air cliquable s'il ne l'est pas
 *   (voir `.carte-posee` dans index.css).
 * — Rayon de 16 px, la borne basse du style, et non 24. La page garde ainsi
 *   une hiérarchie de rayons lisible plutôt qu'un arrondi unique.
 * — Cartes Papier sur section Craie, et non l'inverse. Le style prescrit des
 *   cartes blanches sur fond gris ; ici la section est déjà blanche, et
 *   empiler du blanc sur du blanc est précisément ce que le parti pris de la
 *   vitrine refuse.
 * — Pas de révélation au défilement : le principe 4 de DESIGN-VITRINE.md la
 *   proscrit, et le contenu est lisible dès le premier tracé.
 *
 * Les valeurs chiffrées des jauges et du verdict sont illustratives et le
 * disent, comme le spécimen du héros. Les repères du référentiel viennent de
 * `REFERENTIEL_SMARTEX`, seule source de ces chiffres.
 */

const PILIERS = [
  { nom: 'Environnement', part: 72 },
  { nom: 'Social', part: 58 },
  { nom: 'Gouvernance', part: 84 },
];

const PRIORITES = [
  'Politique de tri et de valorisation des déchets',
  'Registre des accidents du travail',
  'Charte anticorruption signée',
];

const classeModule = 'rounded-[16px] border border-ink-200 bg-surface p-6 sm:p-7';
const classeMention = 'text-[13px] font-medium uppercase tracking-wide text-ink-500';

export default function BentoBenefices({ ancre }) {
  return (
    <section id={ancre} className="border-b border-ink-200">
      <div className="mx-auto max-w-[90rem] px-5 py-16 sm:py-20">
        <h2 className="titre-section mx-auto max-w-3xl text-center text-ink-900">
          Ce que vous y <span className="text-brand-600">gagnez</span>.
        </h2>

        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {/* Vue d'ensemble — le module qui porte la section. */}
          <figure className={`${classeModule} m-0 flex flex-col sm:col-span-2 lg:row-span-2`}>
            <h3 className="titre-objet text-ink-900">Une vision claire</h3>
            <p className="mt-2 text-[15px] leading-relaxed text-ink-600">
              Votre niveau de maturité RSE et ESG, domaine par domaine.
            </p>

            <dl className="mt-8 flex flex-1 flex-col justify-center gap-7 lg:gap-9">
              {PILIERS.map((pilier) => (
                <div key={pilier.nom}>
                  <div className="flex items-baseline justify-between gap-4">
                    <dt className="text-[15px] font-medium text-ink-800">{pilier.nom}</dt>
                    <dd className="font-display text-[15px] font-bold tabular-nums text-ink-900">
                      {pilier.part} %
                    </dd>
                  </div>
                  {/* Encre, et non vert : une maturité n'est pas une conformité,
                      et sur cette vitrine le vert dit « conforme ». */}
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-ink-200">
                    <div className="h-full rounded-full bg-ink-800" style={{ width: `${pilier.part}%` }} />
                  </div>
                </div>
              ))}
            </dl>

            <figcaption className="pt-8 text-[13px] leading-relaxed text-ink-500">
              Répartition donnée à titre d’exemple. Le référentiel compte{' '}
              <strong className="font-semibold text-ink-700">
                {REFERENTIEL_SMARTEX.criteres} critères en {REFERENTIEL_SMARTEX.parties} parties
              </strong>, issus de
              l’étude sectorielle CGECI.
            </figcaption>
          </figure>

          {/* Un écart, tel qu'il apparaît dans un rapport. */}
          <figure className={`${classeModule} m-0 sm:col-span-2`}>
            <h3 className="titre-objet text-ink-900">Des écarts identifiés</h3>
            <p className="mt-2 text-[15px] leading-relaxed text-ink-600">
              Les points faibles apparaissent, preuves à l’appui.
            </p>

            <div className="mt-6 rounded-[8px] border border-ink-200 bg-ink-50 p-4">
              <p className={classeMention}>Exemple d’écart</p>
              <p className="mt-2 text-[15px] font-semibold leading-snug text-ink-900">
                Aucun registre des accidents du travail n’a été produit.
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2 text-[13px]">
                <span className="rounded-[4px] bg-brand-600 px-2 py-0.5 font-semibold text-white">
                  Majeure
                </span>
                <span className="text-ink-500">Partie Social · critère S-04</span>
              </div>
            </div>
          </figure>

          {/* Ce par quoi commencer. */}
          <figure className={`${classeModule} m-0`}>
            <h3 className="titre-objet text-ink-900">Des priorités concrètes</h3>
            <p className="mt-2 text-[15px] leading-relaxed text-ink-600">
              Vos efforts vont là où ils comptent le plus.
            </p>
            <ol className="mt-6 flex flex-col gap-3">
              {PRIORITES.map((action, rang) => (
                <li key={action} className="flex gap-3 text-[14px] leading-snug text-ink-700">
                  <span className="font-display text-[14px] font-bold tabular-nums text-brand-600">
                    {rang + 1}
                  </span>
                  {action}
                </li>
              ))}
            </ol>
            <p className="mt-5 text-[13px] text-ink-500">Ordre d’exemple</p>
          </figure>

          {/* L'indice, seul chiffre que la section met en grand. */}
          <figure className={`${classeModule} m-0 flex flex-col`}>
            <h3 className="titre-objet text-ink-900">Un accès aux financements</h3>
            <p className="mt-2 text-[15px] leading-relaxed text-ink-600">
              Un indice de préparation aux standards des financements verts.
            </p>
            <p className="chiffre-cle mt-auto pt-6">68 / 100</p>
            <p className="mt-1 text-[13px] text-ink-500">Indice d’exemple</p>
          </figure>
        </div>
      </div>
    </section>
  );
}

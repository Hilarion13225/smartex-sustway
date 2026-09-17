/**
 * Le déroulé d'une mission, en trois cartes pleines.
 *
 * La frise verticale que cette section remplace tenait sur un rail continu et
 * des numéros en pastille : l'ordre s'y lisait bien, mais les trois étapes
 * s'étiraient sur toute la hauteur de la page et aucune ne se voyait en
 * entier. Côte à côte et sur un aplat plein, elles se comparent d'un regard —
 * ce qui est justement ce qu'on cherche à savoir d'un déroulé : ce que chaque
 * étape produit par rapport aux deux autres.
 *
 * Aucun mot n'a bougé : les titres, les résumés et les points sont ceux de la
 * frise, et l'ordre est conservé. Le rang reste porté par un numéro, mais en
 * pied de carte plutôt qu'en tête, là où il ferme la lecture.
 *
 * Fond `vert-profond` et libellé à pastille bordeaux : les mêmes que la
 * mosaïque de l'accueil, pour que les deux sections appartiennent visiblement
 * au même site. Le vert `feuille` reste absent, il dit « conforme » ailleurs.
 */
const ETAPES = [
  {
    titre: 'Cadrage et diagnostic',
    resume: 'On délimite ce qui est évalué, puis l’IA analyse les preuves déposées.',
    points: [
      'Périmètre de la mission et variables de caractérisation de l’entreprise',
      'Questionnaire d’évaluation adapté au secteur d’activité',
      'Preuves documentaires déposées puis analysées par le pipeline d’agents IA',
      'Une probabilité de conformité produite pour chaque critère',
    ],
  },
  {
    titre: 'Les livrables',
    resume: 'Un rapport qui dit où vous en êtes, et ce qu’il reste à corriger.',
    points: [
      'Rapport de synthèse : profil RSE global et profil par domaine évalué',
      'Conformités et non-conformités, degré de maturité de la démarche',
      'Plans d’actions correctives, priorisés selon les risques identifiés',
      'Indice de préparation à l’éligibilité au financement vert des PTF',
    ],
  },
  {
    titre: 'Communication et valorisation',
    resume: 'Vos résultats deviennent un support de dialogue avec vos parties prenantes.',
    points: [
      'Rapport exportable, prêt à être partagé',
      'Communication des résultats de l’évaluation',
      'Valorisation de la démarche RSE et ESG auprès des parties prenantes',
    ],
  },
];

export default function EtapesMission() {
  return (
    <section className="border-b border-ink-200">
      <div className="mx-auto max-w-[90rem] px-5 py-16 sm:py-20">
        <p className="flex items-center gap-2.5 text-sm font-semibold text-ink-600">
          <span className="h-2 w-2 shrink-0 rounded-full bg-brand-600" aria-hidden />
          Le déroulé d’une mission
        </p>
        <h2 className="titre-section mt-4 max-w-[18ch] text-ink-900">
          Une démarche en <span className="text-brand-600">trois étapes</span>.
        </h2>

        <ol className="mt-12 grid gap-4 lg:grid-cols-3 lg:gap-5">
          {ETAPES.map((etape, index) => (
            <li
              key={etape.titre}
              className="flex flex-col rounded-[16px] bg-vert-profond p-7 sm:p-8"
            >
              <h3 className="titre-objet text-white">{etape.titre}</h3>
              <p className="mt-3 text-[15px] leading-relaxed text-white/75">{etape.resume}</p>

              <ul className="mt-6 flex flex-col gap-3 border-t border-white/15 pt-6">
                {etape.points.map((point) => (
                  <li key={point} className="flex gap-3 text-[15px] leading-relaxed text-white/90">
                    <span className="mt-[0.7em] h-px w-3 shrink-0 bg-vert-clair" aria-hidden />
                    {point}
                  </li>
                ))}
              </ul>

              {/* Le rang, en pied : `mt-auto` l'aligne d'une carte à l'autre
                  même quand les listes n'ont pas le même nombre de points. */}
              <p className="mt-auto pt-8">
                <span className="inline-flex items-center rounded-[4px] border border-vert-clair/40 px-3 py-1.5 text-[13px] font-semibold uppercase tracking-wide text-vert-clair">
                  Étape {index + 1} sur {ETAPES.length}
                </span>
              </p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

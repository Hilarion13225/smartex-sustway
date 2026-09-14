import EnTeteVitrine from '../components/EnTeteVitrine';
import { SMARTEX } from '../config/smartex';
import { typoFr } from '../lib/typographie';

// `ancre` : cible des liens « Confidentialité », « Cookies » et « Propriété
// intellectuelle » du pied de page. Identifiants posés explicitement plutôt
// que dérivés du titre, pour qu'une reformulation d'intitulé ne casse pas les
// liens existants.
const SECTIONS = [
  {
    ancre: 'editeur-du-site',
    titre: 'Éditeur du site',
    contenu: [
      `Le site et la plateforme ${SMARTEX.produit} sont édités par ${SMARTEX.editeur}, dont le siège est situé à ${SMARTEX.adresse}.`,
      `Contact : ${SMARTEX.email} — ${SMARTEX.telephone}.`,
    ],
  },
  {
    ancre: 'propriete-intellectuelle',
    titre: 'Propriété intellectuelle',
    contenu: [
      `La marque ${SMARTEX.produit}, le référentiel d’évaluation, la méthodologie de scoring, les contenus rédactionnels et les éléments graphiques du site sont la propriété exclusive de ${SMARTEX.editeur}.`,
      'Toute reproduction, représentation ou adaptation, totale ou partielle, sans autorisation écrite préalable est interdite.',
    ],
  },
  {
    ancre: 'donnees-personnelles',
    titre: 'Données personnelles',
    contenu: [
      'Les données saisies lors de la création d’un compte et les documents déposés dans le cadre d’une évaluation sont traités pour les seules finalités de l’évaluation RSE souscrite.',
      'Les données sont chiffrées au repos et en transit, et isolées par entreprise. Conformément au RGPD, vous disposez d’un droit d’accès, de rectification, d’opposition et d’effacement, exerçable à l’adresse indiquée ci-dessus.',
    ],
  },
  {
    ancre: 'cookies',
    titre: 'Cookies',
    contenu: [
      'Le site n’utilise que les mécanismes de stockage strictement nécessaires au fonctionnement de la plateforme, notamment la conservation de la session d’authentification.',
    ],
  },
  {
    ancre: 'limites-interpretation',
    titre: 'Limites d’interprétation des résultats',
    contenu: [
      'Les scores, probabilités de conformité et indices de préparation produits par la plateforme sont des mesures d’alignement méthodologiques.',
      'Ils ne constituent ni une certification, ni un avis de conformité réglementaire, ni une garantie d’éligibilité à un financement.',
    ],
  },
  {
    ancre: 'hebergement',
    titre: 'Hébergement et disponibilité',
    contenu: [
      `${SMARTEX.editeur} met en œuvre les moyens raisonnables pour assurer la disponibilité du service, sans garantie d’absence d’interruption, notamment lors des opérations de maintenance.`,
    ],
  },
];

export default function MentionsLegales() {
  return (
    <div>
      <EnTeteVitrine
        etiquette="Informations légales"
        titre="Mentions légales"
        description={`Conditions d’édition, propriété intellectuelle et traitement des données de la plateforme ${SMARTEX.produit}.`}
      />

      {/* Un texte juridique se lit comme un document, pas comme une grille de
          cartes : des filets entre les sections, un sommaire collant pour
          aller droit à la clause cherchée, la ligne tenue sous 70 caractères. */}
      <section className="mx-auto grid max-w-[75rem] gap-10 px-5 py-14 sm:py-20 lg:grid-cols-[14rem_1fr] lg:gap-16">
        <nav aria-label="Sommaire des mentions légales" className="hidden lg:block">
          <ul className="sticky top-28 space-y-1 border-l border-ink-200">
            {SECTIONS.map((section) => (
              <li key={section.ancre}>
                <a
                  href={`#${section.ancre}`}
                  className="-ml-px flex min-h-10 items-center border-l-2 border-transparent pl-4 text-[15px] leading-snug text-ink-600 transition-colors hover:border-ink-900 hover:text-ink-900"
                >
                  {section.titre}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="min-w-0 max-w-3xl">
          {SECTIONS.map((section) => (
            <article
              key={section.ancre}
              id={section.ancre}
              className="scroll-mt-28 border-t border-ink-200 py-8 first:border-t-0 first:pt-0"
            >
              <h2 className="font-display text-xl font-bold leading-snug tracking-[-0.01em] text-ink-900 sm:text-[1.375rem]">
                {section.titre}
              </h2>
              <div className="mt-3 max-w-[65ch] space-y-3 text-base leading-[1.65] text-ink-600">
                {section.contenu.map((paragraphe) => (
                  <p key={paragraphe}>{typoFr(paragraphe)}</p>
                ))}
              </div>
            </article>
          ))}

          <p className="mt-2 border-t border-ink-200 pt-8 text-[15px] leading-relaxed text-ink-500">
            Les informations d’immatriculation et l’identité de l’hébergeur sont communiquées sur demande à{' '}
            <a
              className="font-medium text-ink-900 underline decoration-ink-300 underline-offset-4 transition-colors hover:decoration-ink-900"
              href={`mailto:${SMARTEX.email}`}
            >
              {SMARTEX.email}
            </a>
            .
          </p>
        </div>
      </section>
    </div>
  );
}

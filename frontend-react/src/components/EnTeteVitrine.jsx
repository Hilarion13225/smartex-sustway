import { typoFr } from '../lib/typographie';

/**
 * En-tête des pages vitrine secondaires (À propos, Bénéfices, Engagement,
 * Déploiement, FAQ, Mentions légales).
 *
 * Héros typographique sur fond clair : un libellé, le titre, un chapô, et au
 * besoin une photo posée à côté du texte. La version précédente plaçait la
 * photo en plein fond sous un voile sombre, avec un dégradé rouge : sur six
 * pages d'affilée, cela donnait un même bandeau interchangeable. Ici chaque
 * page est portée par son titre.
 *
 * `reperes` s'écrit en ligne — « 6 leviers de valeur » — plutôt qu'en gros
 * chiffres surmontant de petits libellés en capitales, le motif le plus
 * attendu d'une page d'accroche.
 *
 * `icone`, `video` et `messages` restent acceptés : plus aucune page ne les
 * transmet, et les ignorer évite de casser un appel futur.
 */
// eslint-disable-next-line no-unused-vars
export default function EnTeteVitrine({ etiquette, icone, titre, description, image, video, messages, reperes }) {
  const chapo = description ?? messages?.[0];

  return (
    <section className="border-b border-ink-200">
      <div
        className={
          image
            ? 'mx-auto grid max-w-[75rem] gap-10 px-5 py-14 sm:py-20 lg:grid-cols-[1.15fr_0.85fr] lg:items-end lg:gap-16'
            : 'mx-auto max-w-[75rem] px-5 py-14 sm:py-20'
        }
      >
        <div className="min-w-0">
          {etiquette ? <p className="sur-titre">{etiquette}</p> : null}
          <h1 className={etiquette ? 'titre-page mt-4 max-w-[24ch] text-ink-900' : 'titre-page max-w-[24ch] text-ink-900'}>
            {typoFr(titre)}
          </h1>
          {chapo ? <p className="mt-6 max-w-[60ch] text-lg leading-relaxed text-ink-600">{typoFr(chapo)}</p> : null}

          {reperes?.length ? (
            <ul className="mt-10 flex flex-col gap-3 border-t border-ink-200 pt-6 sm:flex-row sm:flex-wrap sm:gap-x-10">
              {reperes.map((repere) => (
                <li key={repere.libelle} className="text-base text-ink-600">
                  <span className="font-display text-xl font-bold text-ink-900">{repere.valeur}</span>{' '}
                  {repere.libelle}
                </li>
              ))}
            </ul>
          ) : null}
        </div>

        {image ? (
          <img
            src={image}
            alt=""
            aria-hidden
            // Dans le premier écran : la différer retarderait le plus grand
            // affichage de la page.
            loading="eager"
            className="aspect-[4/3] w-full rounded-[12px] object-cover"
          />
        ) : null}
      </div>
    </section>
  );
}

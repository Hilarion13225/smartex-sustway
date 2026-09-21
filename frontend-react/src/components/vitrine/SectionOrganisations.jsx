import { ORGANISATIONS } from '../../config/organisations';

/**
 * Bandeau « Ils nous font confiance », partagé par la page d'accueil et la
 * page Solution. Un seul endroit à mettre à jour quand un partenaire s'ajoute.
 *
 * Une ligne : l'intitulé, puis les logos. La version précédente les encadrait
 * de deux phrases qui disaient deux fois la même chose.
 */
export default function SectionOrganisations() {
  return (
    <section className="border-b border-ink-200 bg-surface">
      <div className="mx-auto flex max-w-[90rem] flex-col gap-6 px-5 py-10 lg:flex-row lg:items-center lg:gap-12">
        <h2 className="shrink-0 text-sm font-medium text-ink-500 lg:w-44">Ils nous font confiance</h2>
        <ul className="flex flex-1 flex-wrap items-center gap-x-10 gap-y-6 lg:justify-between">
          {ORGANISATIONS.map((organisation) => (
            <li key={organisation.nom}>
              <img
                src={organisation.logo}
                alt={organisation.nom}
                width={organisation.taille[0]}
                height={organisation.taille[1]}
                className={`w-auto max-w-[140px] object-contain ${organisation.hauteur}`}
                loading="lazy"
              />
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

import logoSifca from '../../assets/SIFCA.png';
import logoCgeci from '../../assets/CGECI.png';
import logoSolibra from '../../assets/SOLIBRA.png';
import logoEranove from '../../assets/ERANOVE.svg';
import logoCie from '../../assets/CIE.png';

/*
 * Logotypes officiels, récupérés sur les sites des organisations elles-mêmes.
 * `hauteur` est réglée logo par logo : à hauteur égale, un logotype large
 * paraît deux fois plus imposant qu'un logo compact. Seule la hauteur est
 * contrainte, jamais la largeur — les proportions d'origine sont préservées.
 */
const ORGANISATIONS = [
  { nom: 'Groupe SIFCA', logo: logoSifca, hauteur: 'h-10' },
  { nom: 'CGECI — Le Patronat Ivoirien', logo: logoCgeci, hauteur: 'h-8' },
  { nom: 'SOLIBRA', logo: logoSolibra, hauteur: 'h-9' },
  { nom: 'Eranove', logo: logoEranove, hauteur: 'h-9' },
  { nom: 'CIE — Compagnie Ivoirienne d’Électricité', logo: logoCie, hauteur: 'h-10' },
];

/**
 * Bandeau « Ils nous font confiance », partagé par la page d'accueil et la
 * page Solution. Un seul endroit à mettre à jour quand un partenaire s'ajoute.
 */
export default function SectionOrganisations() {
  return (
    <section className="border-y border-ink-100 bg-surface py-6">
      <div className="mx-auto flex max-w-[80rem] flex-col gap-6 px-5 lg:flex-row lg:items-center lg:gap-12">
        <div className="shrink-0 lg:w-56">
          <h2 className="font-display text-sm font-bold text-marine">Ils nous font confiance</h2>
          <p className="mt-1 text-[11px] leading-snug text-ink-500">
            Des organisations engagées dans leur transition durable.
          </p>
        </div>

        <ul className="flex flex-1 flex-wrap items-center justify-start gap-x-12 gap-y-6 lg:justify-center">
          {ORGANISATIONS.map((organisation) => (
            <li key={organisation.nom}>
              <img
                src={organisation.logo}
                alt={organisation.nom}
                className={`w-auto max-w-[150px] object-contain ${organisation.hauteur}`}
                loading="lazy"
              />
            </li>
          ))}
        </ul>

        <p className="shrink-0 text-[13px] leading-relaxed text-ink-500 lg:w-52 lg:border-l lg:border-ink-100 lg:pl-10">
          Des entreprises de secteurs variés nous font confiance.
        </p>
      </div>
    </section>
  );
}

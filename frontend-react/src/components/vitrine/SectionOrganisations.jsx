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
 *
 * `taille` reprend les dimensions du fichier, relevées dans le navigateur.
 * Elles ne changent pas le rendu, qui reste réglé par la hauteur CSS : elles
 * donnent au navigateur le rapport d'image avant que le fichier n'arrive, de
 * sorte que la largeur est réservée dès le premier tracé. Sans elles, et
 * comme le chargement est différé, ces cinq logos occupaient zéro pixel de
 * large puis s'étalaient d'un coup, en déplaçant leurs voisins sur la ligne.
 */
const ORGANISATIONS = [
  { nom: 'Groupe SIFCA', logo: logoSifca, hauteur: 'h-10', taille: [313, 146] },
  { nom: 'CGECI — Le Patronat Ivoirien', logo: logoCgeci, hauteur: 'h-8', taille: [380, 90] },
  { nom: 'SOLIBRA', logo: logoSolibra, hauteur: 'h-9', taille: [425, 424] },
  { nom: 'Eranove', logo: logoEranove, hauteur: 'h-9', taille: [300, 129] },
  { nom: 'CIE — Compagnie Ivoirienne d’Électricité', logo: logoCie, hauteur: 'h-10', taille: [500, 270] },
];

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

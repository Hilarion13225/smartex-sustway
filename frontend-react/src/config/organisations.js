import logoSifca from '../assets/SIFCA.png';
import logoCgeci from '../assets/CGECI.png';
import logoSolibra from '../assets/SOLIBRA.png';
import logoEranove from '../assets/ERANOVE.svg';
import logoCie from '../assets/CIE.png';

/**
 * Organisations qui font confiance à SMARTEX.
 *
 * La liste vivait dans `SectionOrganisations`, seul endroit qui l'affichait.
 * Deux blocs la montrent désormais — le bandeau des pages antérieures et la
 * section de la page d'accueil — et une liste recopiée finit toujours par
 * diverger : un partenaire ajouté d'un côté, oublié de l'autre.
 *
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
/*
 * Deux hauteurs par logotype, et non une mise à l'échelle commune.
 *
 * `hauteur` sert au bandeau des pages antérieures, où les logos accompagnent
 * une ligne de texte. `hauteurAccueil` sert à la section de la page d'accueil,
 * qui leur donne toute une bande : ils y sont d'un cran plus grands. L'écart
 * entre les logos reste le même dans les deux cas — c'est lui qui fait qu'un
 * logotype large ne paraît pas deux fois plus imposant qu'un logo compact.
 */
export const ORGANISATIONS = [
  { nom: 'Groupe SIFCA', logo: logoSifca, hauteur: 'h-10', hauteurAccueil: 'h-14', taille: [313, 146] },
  { nom: 'CGECI — Le Patronat Ivoirien', logo: logoCgeci, hauteur: 'h-8', hauteurAccueil: 'h-11', taille: [380, 90] },
  { nom: 'SOLIBRA', logo: logoSolibra, hauteur: 'h-9', hauteurAccueil: 'h-12', taille: [425, 424] },
  { nom: 'Eranove', logo: logoEranove, hauteur: 'h-9', hauteurAccueil: 'h-12', taille: [300, 129] },
  { nom: 'CIE — Compagnie Ivoirienne d’Électricité', logo: logoCie, hauteur: 'h-10', hauteurAccueil: 'h-14', taille: [500, 270] },
];

const CLE = 'smartex.referentielsConsultes';
const MAXIMUM = 5;

/**
 * Derniers référentiels ouverts par le lecteur.
 *
 * Conservés dans le navigateur : l'API ne journalise pas les consultations,
 * et cette liste n'a de sens que pour la personne qui l'a produite. Chaque
 * accès est protégé — un navigateur en navigation privée ou configuré pour
 * refuser le stockage lève une exception plutôt que de renvoyer vide.
 */
export function lireDerniersConsultes() {
  try {
    const brut = localStorage.getItem(CLE);
    const liste = brut ? JSON.parse(brut) : [];
    return Array.isArray(liste) ? liste.slice(0, MAXIMUM) : [];
  } catch {
    return [];
  }
}

export function memoriserConsultation(referentiel) {
  if (!referentiel?.code) return;
  try {
    const precedents = lireDerniersConsultes().filter((r) => r.code !== referentiel.code);
    const suivant = [
      { code: referentiel.code, nom: referentiel.nom, type: referentiel.type },
      ...precedents,
    ].slice(0, MAXIMUM);
    localStorage.setItem(CLE, JSON.stringify(suivant));
  } catch {
    // Stockage indisponible : la fonctionnalité est un confort, pas un dû.
  }
}

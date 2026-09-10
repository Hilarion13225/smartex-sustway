import { api, ApiError } from './apiClient';

/**
 * Import assisté d'un référentiel : ce que l'assistant appelle, et ce qu'il
 * sait des limites du serveur.
 *
 * Rassemblé ici plutôt qu'éparpillé dans les cinq écrans : ils appellent les
 * mêmes routes, et une URL réécrite dans un seul des cinq passerait longtemps
 * inaperçue.
 */

const RACINE = '/api/v1/referentiels/imports';

/**
 * Limites du serveur, recopiées et non devinées.
 *
 * Elles ne viennent pas de `niveauxMaturite.js` : celles-là valent 10 Mio et
 * n'admettent ni CSV ni JSON, parce qu'elles décrivent les pièces d'une
 * mission, pas une grille d'audit. Les emprunter ferait refuser par l'écran
 * des fichiers que l'API accepte.
 *
 * Miroir de ImportReferentielService.EXTENSIONS_AUTORISEES et de
 * `smartex.import-referentiel.taille-maximale-octets`, elle-même alignée sur
 * `quarkus.http.limits.max-body-size`.
 */
export const EXTENSIONS_IMPORT = '.pdf,.docx,.xlsx,.csv,.json';
export const TAILLE_MAX_IMPORT = 20 * 1024 * 1024;
export const LIBELLE_FORMATS_IMPORT = 'PDF, Word, Excel, CSV ou JSON';

/** Statuts d'un import, tels que l'API les rend. */
export const STATUT = {
  EN_ATTENTE: 'EN_ATTENTE',
  ANALYSE_EN_COURS: 'ANALYSE_EN_COURS',
  BROUILLON_GENERE: 'BROUILLON_GENERE',
  ECHEC: 'ECHEC',
};

/** Décisions possibles sur une proposition (voir ProvenanceDto côté API). */
export const DECISION = {
  A_VERIFIER: 'A_VERIFIER',
  VALIDEE: 'VALIDEE',
  REJETEE: 'REJETEE',
  SANS_OBJET: 'SANS_OBJET',
};

/** Chemin de la ressource portant chaque nature d'élément. */
const RACINE_PAR_NATURE = {
  EXIGENCE: '/api/v1/referentiels/exigences',
  PREUVE_ATTENDUE: '/api/v1/referentiels/preuves-attendues',
  REGLE_ANALYSE: '/api/v1/referentiels/regles',
};

export const LIBELLE_NATURE = {
  EXIGENCE: 'Exigence',
  PREUVE_ATTENDUE: 'Preuve attendue',
  REGLE_ANALYSE: 'Règle d’analyse',
};

/**
 * Désignation avec article, pour les libellés lus à voix haute.
 *
 * « Valider exigence D1-01 » se dit mal ; un lecteur d'écran énonce le libellé
 * tel quel, et l'article est ce qui en fait une phrase.
 */
export const DESIGNATION_NATURE = {
  EXIGENCE: 'l’exigence',
  PREUVE_ATTENDUE: 'la preuve attendue',
  REGLE_ANALYSE: 'la règle d’analyse',
};

// --- Lecture ---------------------------------------------------------------

export function listerImports() {
  return api.get(RACINE);
}

export function consulterImport(importId, options) {
  return api.get(`${RACINE}/${importId}`, options);
}

export function consulterBrouillon(importId, options) {
  return api.get(`${RACINE}/${importId}/brouillon`, options);
}

export function listerReferentiels() {
  return api.get('/api/v1/referentiels');
}

export function listerVersions(code) {
  return api.get(`/api/v1/referentiels/${code}/versions`);
}

// --- Écriture --------------------------------------------------------------

/**
 * Dépose le fichier, en rendant compte de l'avancement du téléversement.
 *
 * Seul appel de l'assistant à ne pas passer par `apiClient` : `fetch` n'expose
 * aucune progression, et vingt mégaoctets sans le moindre retour visuel
 * donnent une page que l'on croit figée. `XMLHttpRequest` le fait depuis
 * toujours. L'en-tête d'authentification est posé exactement comme ailleurs,
 * et les erreurs ressortent en `ApiError` pour que les écrans n'aient qu'une
 * seule forme d'erreur à connaître.
 */
export function deposerFichier(fichier, surProgression) {
  return new Promise((resoudre, rejeter) => {
    const corps = new FormData();
    corps.append('fichier', fichier);

    const requete = new XMLHttpRequest();
    requete.open('POST', RACINE);

    const token = localStorage.getItem('sustway.token');
    if (token) requete.setRequestHeader('Authorization', `Bearer ${token}`);

    requete.upload.addEventListener('progress', (evenement) => {
      // `lengthComputable` est faux tant que la taille totale est inconnue :
      // annoncer un pourcentage à ce moment-là afficherait n'importe quoi.
      if (evenement.lengthComputable && surProgression) {
        surProgression(Math.round((evenement.loaded / evenement.total) * 100));
      }
    });

    requete.addEventListener('load', () => {
      let donnees = null;
      try {
        donnees = requete.responseText ? JSON.parse(requete.responseText) : null;
      } catch {
        donnees = null;
      }
      if (requete.status >= 200 && requete.status < 300) {
        resoudre(donnees);
      } else {
        rejeter(new ApiError(requete.status, donnees?.message || `Erreur ${requete.status}`));
      }
    });

    requete.addEventListener('error', () =>
      rejeter(new ApiError(0, 'Impossible de joindre le serveur.'))
    );
    requete.addEventListener('abort', () =>
      rejeter(new ApiError(0, 'Téléversement interrompu.'))
    );

    requete.send(corps);
  });
}

/** Lance l'extraction. Rend la main tout de suite : l'API répond 202. */
export function lancerAnalyse(importId, cible) {
  return api.post(`${RACINE}/${importId}/analyse`, cible);
}

export function validerElement(nature, id, versionId) {
  return api.post(`${RACINE_PAR_NATURE[nature]}/${id}/validation`, {
    referentielVersionId: versionId,
  });
}

/**
 * Écarte une proposition. Le motif reste facultatif — l'API l'accepte absent,
 * et l'exiger ici imposerait une règle que le métier n'a pas posée.
 */
export function rejeterElement(nature, id, versionId, motif) {
  return api.post(`${RACINE_PAR_NATURE[nature]}/${id}/rejet`, {
    referentielVersionId: versionId,
    motif: motif || null,
  });
}

/**
 * Valide plusieurs propositions d'un coup.
 *
 * Le lot est monté sur l'import : c'est la version qui le borne côté serveur,
 * et il passe tout entier ou pas du tout.
 */
export function validerEnLot(importId, elements) {
  return api.post(`${RACINE}/${importId}/validations`, { elements });
}

export function publierVersion(codeReferentiel, numeroVersion) {
  return api.post(
    `/api/v1/referentiels/${codeReferentiel}/versions/${numeroVersion}/publication`,
    {}
  );
}

// --- Présentation ----------------------------------------------------------

export function formaterTaille(octets) {
  if (octets == null) return '—';
  if (octets < 1024) return `${octets} o`;
  if (octets < 1024 * 1024) return `${Math.round(octets / 1024)} Ko`;
  return `${(octets / (1024 * 1024)).toFixed(1)} Mo`;
}

/**
 * Rend lisible la localisation mesurée à l'extraction.
 *
 * Chaque format n'en renseigne que ce qu'il connaît : une page pour un PDF,
 * une feuille et une ligne pour un tableur. Les champs absents sont ignorés
 * plutôt que comblés — « page 0 » enverrait le relecteur nulle part.
 */
export function decrireLocalisation(localisation) {
  if (!localisation) return null;
  const morceaux = [];
  if (localisation.page != null) morceaux.push(`page ${localisation.page}`);
  if (localisation.feuille) morceaux.push(`feuille « ${localisation.feuille} »`);
  if (localisation.ligne != null) morceaux.push(`ligne ${localisation.ligne}`);
  if (localisation.cellule) morceaux.push(`cellule ${localisation.cellule}`);
  if (localisation.paragraphe != null) morceaux.push(`paragraphe ${localisation.paragraphe}`);
  if (localisation.chemin) morceaux.push(localisation.chemin);
  return morceaux.length > 0 ? morceaux.join(', ') : null;
}

/**
 * Traduit une erreur d'API en phrase actionnable.
 *
 * Le message du serveur est conservé quand il en donne un : sur un 409, c'est
 * souvent le déclencheur PostgreSQL qui parle, et il dit précisément ce qui
 * manque. On ne le remplace que lorsqu'il n'apprendrait rien.
 */
export function messageErreur(erreur, repli = 'Opération impossible') {
  if (!(erreur instanceof ApiError)) return repli;
  if (erreur.statut === 0) {
    return 'Serveur injoignable. Vérifiez votre connexion, puis réessayez.';
  }
  if (erreur.statut === 401) {
    return 'Votre session a expiré. Reconnectez-vous pour poursuivre.';
  }
  if (erreur.statut === 403) {
    return 'Cette action est réservée aux administrateurs Smartex.';
  }
  return erreur.message || repli;
}

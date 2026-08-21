// Client HTTP minimal pour parler à l'API Quarkus (voir api-quarkus/src/main/java/.../resource).
// Toutes les routes réelles sont sous /api/v1 — voir README racine du repo
// pour la liste des endpoints disponibles à ce stade (phase B).

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';
const CLE_TOKEN = 'sustway.token';

export function lireToken() {
  return localStorage.getItem(CLE_TOKEN);
}

export function ecrireToken(token) {
  if (token) localStorage.setItem(CLE_TOKEN, token);
  else localStorage.removeItem(CLE_TOKEN);
}

/**
 * Erreur enrichie avec le statut HTTP et le message renvoyé par l'API
 * (nos ressources REST renvoient { message: "..." } sur les erreurs
 * métier — voir resource/dto/ErreurDto.java).
 */
export class ApiError extends Error {
  constructor(statut, message) {
    super(message);
    this.statut = statut;
  }
}

async function requete(chemin, { method = 'GET', body, avecAuth = true, signal } = {}) {
  const entetes = {};
  if (avecAuth) {
    const token = lireToken();
    if (token) entetes.Authorization = `Bearer ${token}`;
  }

  // Upload de fichiers (DocumentResource, multipart/form-data) : ne jamais
  // poser Content-Type nous-mêmes ni JSON.stringify le corps — le navigateur
  // doit fixer lui-même le boundary multipart, l'écraser casserait l'upload.
  const estFormData = typeof FormData !== 'undefined' && body instanceof FormData;
  if (!estFormData) {
    entetes['Content-Type'] = 'application/json';
  }

  let reponse;
  try {
    reponse = await fetch(`${BASE_URL}${chemin}`, {
      method,
      headers: entetes,
      ...(body !== undefined ? { body: estFormData ? body : JSON.stringify(body) } : {}),
      signal,
    });
  } catch {
    throw new ApiError(0, 'Impossible de joindre le serveur — vérifiez que l’API tourne (mvn quarkus:dev).');
  }

  const texte = await reponse.text();
  const donnees = texte ? JSON.parse(texte) : null;

  if (!reponse.ok) {
    const message = donnees?.message || `Erreur ${reponse.status}`;
    throw new ApiError(reponse.status, message);
  }
  return donnees;
}

export const api = {
  get: (chemin, options) => requete(chemin, { ...options, method: 'GET' }),
  post: (chemin, body, options) => requete(chemin, { ...options, method: 'POST', body }),
  put: (chemin, body, options) => requete(chemin, { ...options, method: 'PUT', body }),
  delete: (chemin, options) => requete(chemin, { ...options, method: 'DELETE' }),
};

/**
 * Téléchargement d'un fichier binaire protégé par JWT (rapports, documents) —
 * un `<a href>` classique ne peut pas poser l'en-tête Authorization, d'où ce
 * fetch manuel suivi d'un clic simulé sur un lien blob:// éphémère.
 */
export async function telechargerFichierProtege(chemin, nomFichierParDefaut) {
  const token = lireToken();
  const entetes = token ? { Authorization: `Bearer ${token}` } : {};

  let reponse;
  try {
    reponse = await fetch(`${BASE_URL}${chemin}`, { headers: entetes });
  } catch {
    throw new ApiError(0, 'Impossible de joindre le serveur — vérifiez que l’API tourne (mvn quarkus:dev).');
  }
  if (!reponse.ok) {
    throw new ApiError(reponse.status, `Échec du téléchargement (${reponse.status})`);
  }

  const nomDepuisEntete = reponse.headers
    .get('Content-Disposition')
    ?.match(/filename="([^"]+)"/)?.[1];

  const blob = await reponse.blob();
  const url = URL.createObjectURL(blob);
  const lien = document.createElement('a');
  lien.href = url;
  lien.download = nomDepuisEntete || nomFichierParDefaut;
  lien.click();
  URL.revokeObjectURL(url);
}

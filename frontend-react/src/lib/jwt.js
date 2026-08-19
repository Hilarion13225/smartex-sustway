// Décodage du payload d'un JWT côté client, à des fins d'affichage UNIQUEMENT
// (ex. connaître le rôle courant pour adapter le menu). Aucune vérification
// de signature n'est faite ici — ce n'est pas son rôle : la sécurité réelle
// est appliquée côté API (Quarkus/SmallRye JWT) à chaque requête, jamais côté
// client. Ne jamais faire confiance à ce décodage pour une décision de
// sécurité côté frontend au-delà de l'affichage.

export function decoderJwt(token) {
  try {
    const [, payloadBase64] = token.split('.');
    const payloadJson = atob(payloadBase64.replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(decodeURIComponent(escape(payloadJson)));
  } catch {
    return null;
  }
}

export function tokenExpire(token) {
  const payload = decoderJwt(token);
  if (!payload?.exp) return true;
  return Date.now() >= payload.exp * 1000;
}

package com.smartexsustway.api.resource.dto;

/**
 * Remplace AuthResponse pour /auth/connexion : deux formes possibles selon
 * que la 2FA est active ou non pour l'utilisateur (RG36).
 *   - deuxFaRequise = false : token/typeToken portent la session complète.
 *   - deuxFaRequise = true  : tokenPreAuth doit être renvoyé à
 *     /auth/connexion/2fa avec le code, pour obtenir le vrai token de session.
 */
public record ConnexionResponse(
        boolean deuxFaRequise,
        String methode,
        String tokenPreAuth,
        String token,
        String typeToken
) {
    public static ConnexionResponse session(String token) {
        return new ConnexionResponse(false, null, null, token, "Bearer");
    }

    public static ConnexionResponse deuxFaRequise(String methode, String tokenPreAuth) {
        return new ConnexionResponse(true, methode, tokenPreAuth, null, null);
    }
}

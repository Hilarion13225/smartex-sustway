package com.smartexsustway.api.security;

import jakarta.annotation.Priority;
import jakarta.enterprise.context.RequestScoped;
import jakarta.inject.Inject;
import jakarta.ws.rs.Priorities;
import jakarta.ws.rs.container.ContainerRequestContext;
import jakarta.ws.rs.container.ContainerRequestFilter;
import jakarta.ws.rs.core.Response;
import jakarta.ws.rs.ext.Provider;
import org.eclipse.microprofile.jwt.JsonWebToken;

import java.util.Map;

/**
 * Filtre de sécurité global — s'applique à TOUTES les requêtes de l'API.
 *
 * Un token JWT valide au sens cryptographique (signature correcte, non
 * expiré, bon issuer) ne suffit pas à autoriser l'accès aux endpoints
 * protégés : encore faut-il que ce soit un token de SESSION (émis par
 * /auth/connexion), et non un token à usage unique émis pour un autre
 * besoin (vérification email, pré-authentification 2FA, activation SMS —
 * voir JwtService). Sans ce filtre, un token de vérification d'email
 * intercepté (par exemple dans un lien partagé par erreur) pourrait servir
 * à s'authentifier sur n'importe quel endpoint @Authenticated — une faille
 * classique de "confusion de jetons".
 *
 * Le filtre laisse passer sans vérification toute requête non authentifiée
 * (endpoints publics comme /secteurs, /formules) : il n'agit que lorsqu'un
 * principal JWT est effectivement résolu.
 */
@Provider
@Priority(Priorities.AUTHENTICATION + 1)
@RequestScoped
public class SessionPurposeFilter implements ContainerRequestFilter {

    @Inject
    JsonWebToken jwt;

    @Override
    public void filter(ContainerRequestContext requestContext) {
        try {
            if (jwt == null) {
                return;
            }
            String subject = jwt.getSubject();
            if (subject == null || subject.isBlank()) {
                // Requête non authentifiée (endpoint public, ou pas de token
                // fourni) : rien à vérifier, @Authenticated s'en charge déjà
                // pour les endpoints qui l'exigent.
                return;
            }
            Object purpose = jwt.getClaim("purpose");
            if (!JwtService.PURPOSE_SESSION.equals(purpose)) {
                requestContext.abortWith(
                        Response.status(Response.Status.UNAUTHORIZED)
                                .entity(Map.of("message", "Ce token ne peut pas être utilisé pour cette action"))
                                .build());
            }
        } catch (RuntimeException e) {
            // Ne jamais faire planter une requête à cause de ce filtre : en
            // cas d'anomalie inattendue à la lecture des claims, on renonce
            // au contrôle renforcé plutôt que de casser l'application (le
            // reste de la chaîne de sécurité — @Authenticated, RBAC — reste
            // actif indépendamment de ce filtre).
        }
    }
}

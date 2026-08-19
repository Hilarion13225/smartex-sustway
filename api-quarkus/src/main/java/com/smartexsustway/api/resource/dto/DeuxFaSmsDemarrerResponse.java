package com.smartexsustway.api.resource.dto;

/** tokenActivation : à renvoyer à /auth/2fa/sms/confirmer avec le code reçu par SMS. */
public record DeuxFaSmsDemarrerResponse(String tokenActivation) {
}

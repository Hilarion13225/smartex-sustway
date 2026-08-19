package com.smartexsustway.api.resource.dto;

/** secret : à saisir manuellement si le QR code (généré côté frontend à partir de uriProvisionnement) ne peut pas être scanné. */
public record DeuxFaAppDemarrerResponse(String secret, String uriProvisionnement) {
}

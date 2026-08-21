package com.smartexsustway.api.resource.dto;

/** Corps de requête PUT pour taguer un critère comme applicable (ou non) à un bailleur (RG39). */
public record DefinirCritereBailleurRequestDto(String bailleurCode, Boolean applicable) {
}

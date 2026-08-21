package com.smartexsustway.api.resource.dto;

/** Vue d'un tag d'applicabilité bailleur pour un critère donné (RG39). */
public record CritereBailleurDto(String bailleurCode, String bailleurNom, boolean applicable) {
}

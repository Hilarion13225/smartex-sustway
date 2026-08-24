package com.smartexsustway.api.resource.dto;

import jakarta.validation.constraints.NotNull;

import java.util.List;
import java.util.UUID;

/** RG12 : remplace l'intégralité des sites couverts par une mission (sémantique PUT — une liste vide retire tous les sites). */
public record AuditSitesRequest(@NotNull List<UUID> siteIds) {
}

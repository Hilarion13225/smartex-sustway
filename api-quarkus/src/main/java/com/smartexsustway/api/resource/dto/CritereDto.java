package com.smartexsustway.api.resource.dto;

import com.smartexsustway.api.domain.entity.Critere;

import java.util.UUID;

public record CritereDto(
        UUID id,
        String code,
        String libelle,
        String description,
        String domaineCode,
        String domaineNom,
        String sousDomaineCode,
        String sousDomaineNom,
        java.math.BigDecimal coefficientPonderation,
        String criticite,
        String applicabilite,
        boolean actif
) {
    public static CritereDto depuis(Critere c) {
        return new CritereDto(
                c.getId(),
                c.getCode(),
                c.getLibelle(),
                c.getDescription(),
                c.getDomaine().getCode(),
                c.getDomaine().getNom(),
                c.getSousDomaine() == null ? null : c.getSousDomaine().getCode(),
                c.getSousDomaine() == null ? null : c.getSousDomaine().getNom(),
                c.getCoefficientPonderation(),
                c.getCriticite() != null ? c.getCriticite().getCode().name() : null,
                c.getApplicabilite().name(),
                c.isActif()
        );
    }
}

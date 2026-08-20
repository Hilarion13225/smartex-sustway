package com.smartexsustway.api.resource.dto;

import com.smartexsustway.api.domain.entity.Critere;

import java.util.UUID;

public record CritereDto(
        UUID id,
        String code,
        String libelle,
        String domaineCode,
        String domaineNom,
        String criticite,
        String applicabilite
) {
    public static CritereDto depuis(Critere c) {
        return new CritereDto(
                c.getId(),
                c.getCode(),
                c.getLibelle(),
                c.getDomaine().getCode(),
                c.getDomaine().getNom(),
                c.getCriticite() != null ? c.getCriticite().getCode().name() : null,
                c.getApplicabilite().name()
        );
    }
}

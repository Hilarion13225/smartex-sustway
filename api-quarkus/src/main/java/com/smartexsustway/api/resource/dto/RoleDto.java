package com.smartexsustway.api.resource.dto;

import com.smartexsustway.api.domain.entity.Role;

import java.util.UUID;

public record RoleDto(UUID id, String code, String nom, String description) {
    public static RoleDto depuis(Role r) {
        return new RoleDto(r.getId(), r.getCode(), r.getNom(), r.getDescription());
    }
}

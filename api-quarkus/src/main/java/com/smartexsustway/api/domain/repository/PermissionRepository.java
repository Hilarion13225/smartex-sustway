package com.smartexsustway.api.domain.repository;

import com.smartexsustway.api.domain.entity.Permission;
import io.quarkus.hibernate.orm.panache.PanacheRepositoryBase;
import jakarta.enterprise.context.ApplicationScoped;

import java.util.Optional;
import java.util.UUID;

@ApplicationScoped
public class PermissionRepository implements PanacheRepositoryBase<Permission, UUID> {

    public Optional<Permission> parCode(String code) {
        return find("code", code).firstResultOptional();
    }
}

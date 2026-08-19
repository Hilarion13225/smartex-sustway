package com.smartexsustway.api.domain.repository;

import com.smartexsustway.api.domain.entity.Role;
import io.quarkus.hibernate.orm.panache.PanacheRepositoryBase;
import jakarta.enterprise.context.ApplicationScoped;

import java.util.Optional;
import java.util.UUID;

@ApplicationScoped
public class RoleRepository implements PanacheRepositoryBase<Role, UUID> {

    public Optional<Role> parCode(String code) {
        return find("code", code).firstResultOptional();
    }
}

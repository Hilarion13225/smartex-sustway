package com.smartexsustway.api.domain.repository;

import com.smartexsustway.api.domain.entity.RevueExperte;
import io.quarkus.hibernate.orm.panache.PanacheRepositoryBase;
import jakarta.enterprise.context.ApplicationScoped;

import java.util.UUID;

@ApplicationScoped
public class RevueExperteRepository implements PanacheRepositoryBase<RevueExperte, UUID> {
}

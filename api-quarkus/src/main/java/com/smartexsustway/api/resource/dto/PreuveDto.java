package com.smartexsustway.api.resource.dto;

import com.smartexsustway.api.domain.entity.AuditCritere;
import com.smartexsustway.api.domain.entity.Preuve;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

public record PreuveDto(
        UUID id,
        UUID documentId,
        String documentNomOriginal,
        UUID auditId,
        String description,
        String type,
        List<String> critereCodes,
        OffsetDateTime createdAt
) {
    public static PreuveDto depuis(Preuve p) {
        List<String> codes = p.getAuditCriteres().stream()
                .map(AuditCritere::getCritere)
                .map(c -> c.getCode())
                .sorted()
                .toList();
        return new PreuveDto(
                p.getId(), p.getDocument().getId(), p.getDocument().getNomOriginal(), p.getAudit().getId(),
                p.getDescription(), p.getType().name(), codes, p.getCreatedAt()
        );
    }
}

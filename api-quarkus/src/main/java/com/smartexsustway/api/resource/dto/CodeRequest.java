package com.smartexsustway.api.resource.dto;

import jakarta.validation.constraints.NotBlank;

public record CodeRequest(
        @NotBlank String code
) {
}

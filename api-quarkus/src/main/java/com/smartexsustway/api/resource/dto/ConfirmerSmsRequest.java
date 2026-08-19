package com.smartexsustway.api.resource.dto;

import jakarta.validation.constraints.NotBlank;

public record ConfirmerSmsRequest(
        @NotBlank String tokenActivation,
        @NotBlank String code
) {
}

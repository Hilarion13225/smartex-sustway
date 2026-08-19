package com.smartexsustway.api.resource.dto;

public record AuthResponse(String token, String typeToken) {
    public static AuthResponse bearer(String token) {
        return new AuthResponse(token, "Bearer");
    }
}

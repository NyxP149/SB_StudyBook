package com.jarvyx.studybook.auth.dto;

import jakarta.validation.constraints.NotBlank;

public record LoginRequest(
        @NotBlank(message = "Le nom d'utilisateur est requis") String username,
        @NotBlank(message = "Le mot de passe est requis") String password) {
}

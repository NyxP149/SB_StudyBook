package com.jarvyx.studybook.auth.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record RegisterRequest(
        @NotBlank(message = "Le nom d'utilisateur est requis")
        @Size(min = 3, max = 40, message = "Le nom d'utilisateur doit faire entre 3 et 40 caractères")
        String username,
        @NotBlank(message = "Le mot de passe est requis")
        @Size(min = 6, message = "Le mot de passe doit faire au moins 6 caractères")
        String password) {
}

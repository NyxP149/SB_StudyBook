package com.jarvyx.studybook.template.dto;

import jakarta.validation.constraints.NotBlank;

public record ExtractSectionsRequest(@NotBlank(message = "Le contenu markdown est requis") String markdown) {
}

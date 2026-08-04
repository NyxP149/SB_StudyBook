package com.jarvyx.studybook.template.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import java.util.List;

public record TemplateRequest(
        @NotBlank(message = "Le nom du template est requis") String name,
        String description,
        @NotEmpty(message = "Le template doit avoir au moins une section") @Valid List<TemplateSectionDto> sections) {
}

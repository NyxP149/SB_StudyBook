package com.jarvyx.studybook.template.dto;

import com.jarvyx.studybook.template.TemplateSection;
import jakarta.validation.constraints.NotBlank;

public record TemplateSectionDto(
        @NotBlank(message = "Le titre de la section est requis") String title,
        @NotBlank(message = "Les instructions de la section sont requises") String instructions) {

    public static TemplateSectionDto from(TemplateSection section) {
        return new TemplateSectionDto(section.getTitle(), section.getInstructions());
    }

    public TemplateSection toEntity() {
        return new TemplateSection(title, instructions);
    }
}

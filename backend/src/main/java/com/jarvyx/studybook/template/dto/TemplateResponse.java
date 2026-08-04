package com.jarvyx.studybook.template.dto;

import com.jarvyx.studybook.template.NoteTemplate;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record TemplateResponse(
        UUID id,
        String name,
        String description,
        List<TemplateSectionDto> sections,
        Instant createdAt) {

    public static TemplateResponse from(NoteTemplate template) {
        return new TemplateResponse(
                template.getId(),
                template.getName(),
                template.getDescription(),
                template.getSections().stream().map(TemplateSectionDto::from).toList(),
                template.getCreatedAt());
    }
}

package com.jarvyx.studybook.study.dto;

import jakarta.validation.constraints.NotBlank;

public record StudyArgumentNoteRequest(
        @NotBlank(message = "Le contenu de la note est requis") String content) {
}

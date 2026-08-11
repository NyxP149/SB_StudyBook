package com.jarvyx.studybook.study.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.time.LocalDate;

public record StudyArgumentRequest(
        @NotBlank(message = "Le titre de l'argument est requis") String title,
        @NotNull(message = "La date de l'argument est requise") LocalDate scheduledDate,
        String content,
        boolean completed) {
}

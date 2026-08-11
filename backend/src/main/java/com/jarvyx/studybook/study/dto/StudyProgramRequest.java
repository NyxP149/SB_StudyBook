package com.jarvyx.studybook.study.dto;

import com.jarvyx.studybook.study.StudyProgramFrequency;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record StudyProgramRequest(
        @NotBlank(message = "Le nom du programme est requis") String name,
        @NotNull(message = "Le rythme du programme est requis") StudyProgramFrequency frequency) {
}

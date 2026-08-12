package com.jarvyx.studybook.study.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import java.util.List;

public record BulkStudyArgumentRequest(
        @NotEmpty(message = "La liste d'arguments est requise") @Valid List<StudyArgumentRequest> arguments) {
}

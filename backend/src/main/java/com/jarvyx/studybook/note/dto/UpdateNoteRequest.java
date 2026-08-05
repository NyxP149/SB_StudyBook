package com.jarvyx.studybook.note.dto;

import jakarta.validation.constraints.NotBlank;

public record UpdateNoteRequest(@NotBlank(message = "Le contenu de la note ne peut pas être vide") String noteMarkdown) {
}

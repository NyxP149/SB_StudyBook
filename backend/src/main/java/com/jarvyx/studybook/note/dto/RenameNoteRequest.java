package com.jarvyx.studybook.note.dto;

import jakarta.validation.constraints.NotBlank;

public record RenameNoteRequest(@NotBlank(message = "Le nom de la note ne peut pas être vide") String name) {
}

package com.jarvyx.studybook.note.dto;

import com.jarvyx.studybook.note.NoteImportance;
import jakarta.validation.constraints.NotNull;
import java.util.UUID;

public record OrganizeNoteRequest(UUID folderId, @NotNull(message = "L'importance est requise") NoteImportance importance) {
}

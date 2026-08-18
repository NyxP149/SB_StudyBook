package com.jarvyx.studybook.note.dto;

import com.jarvyx.studybook.note.NoteImportance;
import jakarta.validation.constraints.NotNull;
import java.util.List;
import java.util.UUID;

public record OrganizeNoteRequest(
        List<UUID> folderIds, @NotNull(message = "L'importance est requise") NoteImportance importance) {
}

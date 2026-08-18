package com.jarvyx.studybook.note.dto;

import com.jarvyx.studybook.note.Note;
import com.jarvyx.studybook.note.NoteImportance;
import com.jarvyx.studybook.note.NoteStatus;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record NoteSummaryResponse(
        UUID id,
        String originalFilename,
        String provider,
        String modelSize,
        UUID templateId,
        List<UUID> folderIds,
        NoteImportance importance,
        NoteStatus status,
        String background,
        Instant createdAt) {

    public static NoteSummaryResponse from(Note note) {
        return new NoteSummaryResponse(
                note.getId(),
                note.getOriginalFilename(),
                note.getProvider(),
                note.getModelSize(),
                note.getTemplateId(),
                List.copyOf(note.getFolderIds()),
                note.getImportance(),
                note.getStatus(),
                note.getBackground(),
                note.getCreatedAt());
    }
}

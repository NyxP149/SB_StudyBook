package com.jarvyx.studybook.note.dto;

import com.jarvyx.studybook.note.Note;
import com.jarvyx.studybook.note.NoteImportance;
import com.jarvyx.studybook.note.NoteStatus;
import java.time.Instant;
import java.util.UUID;

public record NoteSummaryResponse(
        UUID id,
        String originalFilename,
        String provider,
        String modelSize,
        UUID templateId,
        UUID folderId,
        NoteImportance importance,
        NoteStatus status,
        Instant createdAt) {

    public static NoteSummaryResponse from(Note note) {
        return new NoteSummaryResponse(
                note.getId(),
                note.getOriginalFilename(),
                note.getProvider(),
                note.getModelSize(),
                note.getTemplateId(),
                note.getFolderId(),
                note.getImportance(),
                note.getStatus(),
                note.getCreatedAt());
    }
}

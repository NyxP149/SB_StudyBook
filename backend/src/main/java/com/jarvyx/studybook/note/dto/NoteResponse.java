package com.jarvyx.studybook.note.dto;

import com.jarvyx.studybook.note.Note;
import com.jarvyx.studybook.note.NoteImportance;
import com.jarvyx.studybook.note.NoteStatus;
import java.time.Instant;
import java.util.UUID;

public record NoteResponse(
        UUID id,
        String originalFilename,
        String provider,
        String modelSize,
        UUID templateId,
        UUID folderId,
        NoteImportance importance,
        NoteStatus status,
        String transcript,
        String noteMarkdown,
        String errorMessage,
        UUID linkedArgumentId,
        String linkedArgumentTitle,
        UUID suggestedArgumentId,
        String suggestedArgumentTitle,
        String background,
        Instant createdAt) {

    public static NoteResponse from(Note note, String linkedArgumentTitle, String suggestedArgumentTitle) {
        return new NoteResponse(
                note.getId(),
                note.getOriginalFilename(),
                note.getProvider(),
                note.getModelSize(),
                note.getTemplateId(),
                note.getFolderId(),
                note.getImportance(),
                note.getStatus(),
                note.getTranscript(),
                note.getNoteMarkdown(),
                note.getErrorMessage(),
                note.getLinkedArgumentId(),
                linkedArgumentTitle,
                note.getSuggestedArgumentId(),
                suggestedArgumentTitle,
                note.getBackground(),
                note.getCreatedAt());
    }
}

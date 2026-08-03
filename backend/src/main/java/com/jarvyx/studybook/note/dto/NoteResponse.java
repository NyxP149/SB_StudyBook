package com.jarvyx.studybook.note.dto;

import com.jarvyx.studybook.note.Note;
import java.time.Instant;
import java.util.UUID;

public record NoteResponse(
        UUID id,
        String originalFilename,
        String provider,
        String modelSize,
        String transcript,
        String noteMarkdown,
        Instant createdAt) {

    public static NoteResponse from(Note note) {
        return new NoteResponse(
                note.getId(),
                note.getOriginalFilename(),
                note.getProvider(),
                note.getModelSize(),
                note.getTranscript(),
                note.getNoteMarkdown(),
                note.getCreatedAt());
    }
}

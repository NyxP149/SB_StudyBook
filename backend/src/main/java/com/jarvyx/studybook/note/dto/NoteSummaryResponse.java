package com.jarvyx.studybook.note.dto;

import com.jarvyx.studybook.note.Note;
import java.time.Instant;
import java.util.UUID;

public record NoteSummaryResponse(
        UUID id,
        String originalFilename,
        String provider,
        String modelSize,
        Instant createdAt) {

    public static NoteSummaryResponse from(Note note) {
        return new NoteSummaryResponse(
                note.getId(),
                note.getOriginalFilename(),
                note.getProvider(),
                note.getModelSize(),
                note.getCreatedAt());
    }
}

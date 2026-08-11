package com.jarvyx.studybook.study.dto;

import com.jarvyx.studybook.study.StudyArgumentNote;
import java.time.Instant;
import java.util.UUID;

public record StudyArgumentNoteResponse(
        UUID id, UUID argumentId, String content, Instant createdAt, Instant updatedAt) {

    public static StudyArgumentNoteResponse from(StudyArgumentNote note) {
        return new StudyArgumentNoteResponse(
                note.getId(), note.getArgumentId(), note.getContent(), note.getCreatedAt(), note.getUpdatedAt());
    }
}

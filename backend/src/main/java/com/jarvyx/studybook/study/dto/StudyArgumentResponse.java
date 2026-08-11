package com.jarvyx.studybook.study.dto;

import com.jarvyx.studybook.study.StudyArgument;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

public record StudyArgumentResponse(
        UUID id,
        UUID programId,
        String title,
        LocalDate scheduledDate,
        String content,
        boolean completed,
        Instant createdAt) {

    public static StudyArgumentResponse from(StudyArgument argument) {
        return new StudyArgumentResponse(
                argument.getId(),
                argument.getProgramId(),
                argument.getTitle(),
                argument.getScheduledDate(),
                argument.getContent(),
                argument.isCompleted(),
                argument.getCreatedAt());
    }
}

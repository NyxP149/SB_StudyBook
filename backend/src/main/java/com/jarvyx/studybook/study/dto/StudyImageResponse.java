package com.jarvyx.studybook.study.dto;

import com.jarvyx.studybook.study.StudyImage;
import java.time.Instant;
import java.util.UUID;

public record StudyImageResponse(UUID id, UUID argumentId, String filename, String contentType, Instant createdAt) {

    public static StudyImageResponse from(StudyImage image) {
        return new StudyImageResponse(
                image.getId(), image.getArgumentId(), image.getFilename(), image.getContentType(), image.getCreatedAt());
    }
}

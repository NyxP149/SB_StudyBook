package com.jarvyx.studybook.study.dto;

import java.time.LocalDate;
import java.util.UUID;

public record StudyUpcomingResponse(
        UUID argumentId, UUID programId, String programName, String title, LocalDate scheduledDate, boolean overdue) {
}

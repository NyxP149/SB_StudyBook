package com.jarvyx.studybook.study.dto;

public record StudyArgumentCompletionResponse(
        StudyArgumentResponse argument, String encouragementMessage, int completedCount, int totalCount) {
}

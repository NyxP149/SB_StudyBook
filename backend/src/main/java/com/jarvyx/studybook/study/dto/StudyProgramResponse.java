package com.jarvyx.studybook.study.dto;

import com.jarvyx.studybook.study.StudyProgram;
import com.jarvyx.studybook.study.StudyProgramFrequency;
import java.time.Instant;
import java.util.UUID;

public record StudyProgramResponse(UUID id, String name, StudyProgramFrequency frequency, Instant createdAt) {

    public static StudyProgramResponse from(StudyProgram program) {
        return new StudyProgramResponse(program.getId(), program.getName(), program.getFrequency(), program.getCreatedAt());
    }
}

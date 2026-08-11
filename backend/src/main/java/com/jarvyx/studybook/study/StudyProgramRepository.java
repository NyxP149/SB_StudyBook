package com.jarvyx.studybook.study;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface StudyProgramRepository extends JpaRepository<StudyProgram, UUID> {

    List<StudyProgram> findAllByUserIdOrderByCreatedAtDesc(UUID userId);

    Optional<StudyProgram> findByIdAndUserId(UUID id, UUID userId);
}

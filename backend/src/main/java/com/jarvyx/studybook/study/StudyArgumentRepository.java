package com.jarvyx.studybook.study;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface StudyArgumentRepository extends JpaRepository<StudyArgument, UUID> {

    List<StudyArgument> findAllByProgramIdOrderByScheduledDateAsc(UUID programId);

    Optional<StudyArgument> findByIdAndUserId(UUID id, UUID userId);

    List<StudyArgument> findAllByUserIdAndCompletedFalseAndScheduledDateLessThanEqualOrderByScheduledDateAsc(
            UUID userId, LocalDate cutoffDate);

    void deleteAllByProgramId(UUID programId);
}

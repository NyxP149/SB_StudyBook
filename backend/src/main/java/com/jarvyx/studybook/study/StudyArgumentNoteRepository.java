package com.jarvyx.studybook.study;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface StudyArgumentNoteRepository extends JpaRepository<StudyArgumentNote, UUID> {

    List<StudyArgumentNote> findAllByArgumentIdOrderByCreatedAtAsc(UUID argumentId);

    Optional<StudyArgumentNote> findByIdAndUserId(UUID id, UUID userId);

    void deleteAllByArgumentId(UUID argumentId);
}

package com.jarvyx.studybook.note;

import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface NoteImageRepository extends JpaRepository<NoteImage, UUID> {

    Optional<NoteImage> findByIdAndUserId(UUID id, UUID userId);
}

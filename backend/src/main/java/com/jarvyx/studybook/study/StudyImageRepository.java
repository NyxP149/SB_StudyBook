package com.jarvyx.studybook.study;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface StudyImageRepository extends JpaRepository<StudyImage, UUID> {

    List<StudyImage> findAllByArgumentIdOrderByCreatedAtAsc(UUID argumentId);

    Optional<StudyImage> findByIdAndUserId(UUID id, UUID userId);

    void deleteAllByArgumentId(UUID argumentId);
}

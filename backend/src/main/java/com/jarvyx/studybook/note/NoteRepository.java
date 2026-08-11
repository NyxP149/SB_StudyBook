package com.jarvyx.studybook.note;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;

public interface NoteRepository extends JpaRepository<Note, UUID> {

    List<Note> findAllByUserIdOrderByCreatedAtDesc(UUID userId);

    Optional<Note> findByIdAndUserId(UUID id, UUID userId);

    List<Note> findAllByLinkedArgumentIdAndUserIdOrderByCreatedAtDesc(UUID linkedArgumentId, UUID userId);

    @Modifying
    @Query("update Note n set n.userId = :userId where n.userId is null")
    void claimOrphaned(UUID userId);
}

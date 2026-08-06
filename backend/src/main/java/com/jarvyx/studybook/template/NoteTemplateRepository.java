package com.jarvyx.studybook.template;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;

public interface NoteTemplateRepository extends JpaRepository<NoteTemplate, UUID> {

    List<NoteTemplate> findAllByUserIdOrderByNameAsc(UUID userId);

    Optional<NoteTemplate> findByIdAndUserId(UUID id, UUID userId);

    @Modifying
    @Query("update NoteTemplate t set t.userId = :userId where t.userId is null")
    void claimOrphaned(UUID userId);
}

package com.jarvyx.studybook.template;

import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface NoteTemplateRepository extends JpaRepository<NoteTemplate, UUID> {

    List<NoteTemplate> findAllByOrderByNameAsc();
}

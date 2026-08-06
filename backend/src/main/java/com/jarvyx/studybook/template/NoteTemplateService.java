package com.jarvyx.studybook.template;

import com.jarvyx.studybook.template.dto.TemplateRequest;
import com.jarvyx.studybook.template.dto.TemplateSectionDto;
import java.util.List;
import java.util.NoSuchElementException;
import java.util.UUID;
import org.springframework.stereotype.Service;

@Service
public class NoteTemplateService {

    private final NoteTemplateRepository repository;

    public NoteTemplateService(NoteTemplateRepository repository) {
        this.repository = repository;
    }

    public NoteTemplate create(UUID userId, TemplateRequest request) {
        NoteTemplate template = new NoteTemplate(
                request.name(),
                request.description(),
                request.sections().stream().map(TemplateSectionDto::toEntity).toList());
        template.setUserId(userId);
        return repository.save(template);
    }

    public NoteTemplate update(UUID userId, UUID id, TemplateRequest request) {
        NoteTemplate template = getOrThrow(userId, id);
        template.setName(request.name());
        template.setDescription(request.description());
        template.getSections().clear();
        request.sections().forEach(s -> template.getSections().add(s.toEntity()));
        return repository.save(template);
    }

    public void delete(UUID userId, UUID id) {
        getOrThrow(userId, id);
        repository.deleteById(id);
    }

    public List<NoteTemplate> listAll(UUID userId) {
        return repository.findAllByUserIdOrderByNameAsc(userId);
    }

    public NoteTemplate getOrThrow(UUID userId, UUID id) {
        return repository.findByIdAndUserId(id, userId)
                .orElseThrow(() -> new NoSuchElementException("Template introuvable : " + id));
    }
}

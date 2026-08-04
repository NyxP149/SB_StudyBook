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

    public NoteTemplate create(TemplateRequest request) {
        NoteTemplate template = new NoteTemplate(
                request.name(),
                request.description(),
                request.sections().stream().map(TemplateSectionDto::toEntity).toList());
        return repository.save(template);
    }

    public NoteTemplate update(UUID id, TemplateRequest request) {
        NoteTemplate template = getOrThrow(id);
        template.setName(request.name());
        template.setDescription(request.description());
        template.getSections().clear();
        request.sections().forEach(s -> template.getSections().add(s.toEntity()));
        return repository.save(template);
    }

    public void delete(UUID id) {
        if (!repository.existsById(id)) {
            throw new NoSuchElementException("Template introuvable : " + id);
        }
        repository.deleteById(id);
    }

    public List<NoteTemplate> listAll() {
        return repository.findAllByOrderByNameAsc();
    }

    public NoteTemplate getOrThrow(UUID id) {
        return repository.findById(id)
                .orElseThrow(() -> new NoSuchElementException("Template introuvable : " + id));
    }
}

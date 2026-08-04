package com.jarvyx.studybook.template;

import com.jarvyx.studybook.template.dto.TemplateRequest;
import com.jarvyx.studybook.template.dto.TemplateResponse;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/templates")
public class NoteTemplateController {

    private final NoteTemplateService templateService;

    public NoteTemplateController(NoteTemplateService templateService) {
        this.templateService = templateService;
    }

    @PostMapping
    public ResponseEntity<TemplateResponse> create(@Valid @RequestBody TemplateRequest request) {
        NoteTemplate template = templateService.create(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(TemplateResponse.from(template));
    }

    @GetMapping
    public List<TemplateResponse> list() {
        return templateService.listAll().stream().map(TemplateResponse::from).toList();
    }

    @GetMapping("/{id}")
    public TemplateResponse get(@PathVariable UUID id) {
        return TemplateResponse.from(templateService.getOrThrow(id));
    }

    @PutMapping("/{id}")
    public TemplateResponse update(@PathVariable UUID id, @Valid @RequestBody TemplateRequest request) {
        return TemplateResponse.from(templateService.update(id, request));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        templateService.delete(id);
        return ResponseEntity.noContent().build();
    }
}

package com.jarvyx.studybook.template;

import com.jarvyx.studybook.auth.CurrentUser;
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
    private final CurrentUser currentUser;

    public NoteTemplateController(NoteTemplateService templateService, CurrentUser currentUser) {
        this.templateService = templateService;
        this.currentUser = currentUser;
    }

    @PostMapping
    public ResponseEntity<TemplateResponse> create(@Valid @RequestBody TemplateRequest request) {
        NoteTemplate template = templateService.create(currentUser.getUserId(), request);
        return ResponseEntity.status(HttpStatus.CREATED).body(TemplateResponse.from(template));
    }

    @GetMapping
    public List<TemplateResponse> list() {
        return templateService.listAll(currentUser.getUserId()).stream().map(TemplateResponse::from).toList();
    }

    @GetMapping("/{id}")
    public TemplateResponse get(@PathVariable UUID id) {
        return TemplateResponse.from(templateService.getOrThrow(currentUser.getUserId(), id));
    }

    @PutMapping("/{id}")
    public TemplateResponse update(@PathVariable UUID id, @Valid @RequestBody TemplateRequest request) {
        return TemplateResponse.from(templateService.update(currentUser.getUserId(), id, request));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        templateService.delete(currentUser.getUserId(), id);
        return ResponseEntity.noContent().build();
    }
}

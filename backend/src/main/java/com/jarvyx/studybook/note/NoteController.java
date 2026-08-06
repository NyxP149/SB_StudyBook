package com.jarvyx.studybook.note;

import com.jarvyx.studybook.auth.CurrentUser;
import com.jarvyx.studybook.note.dto.NoteResponse;
import com.jarvyx.studybook.note.dto.NoteSummaryResponse;
import com.jarvyx.studybook.note.dto.OrganizeNoteRequest;
import com.jarvyx.studybook.note.dto.UpdateNoteRequest;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/notes")
public class NoteController {

    private final NoteService noteService;
    private final CurrentUser currentUser;

    public NoteController(NoteService noteService, CurrentUser currentUser) {
        this.noteService = noteService;
        this.currentUser = currentUser;
    }

    @PostMapping(consumes = "multipart/form-data")
    public ResponseEntity<NoteResponse> create(
            @RequestParam("audio") MultipartFile audio,
            @RequestParam(value = "provider", required = false) String provider,
            @RequestParam(value = "modelSize", required = false) String modelSize,
            @RequestParam(value = "templateId", required = false) UUID templateId) {
        Note note = noteService.submitAudio(currentUser.getUserId(), audio, provider, modelSize, templateId);
        return ResponseEntity.status(HttpStatus.ACCEPTED).body(NoteResponse.from(note));
    }

    @PostMapping(value = "/from-text", consumes = "multipart/form-data")
    public ResponseEntity<NoteResponse> createFromText(
            @RequestParam(value = "text", required = false) String text,
            @RequestParam(value = "file", required = false) MultipartFile file,
            @RequestParam(value = "provider", required = false) String provider,
            @RequestParam(value = "templateId", required = false) UUID templateId) {
        Note note = noteService.submitText(currentUser.getUserId(), text, file, provider, templateId);
        return ResponseEntity.status(HttpStatus.ACCEPTED).body(NoteResponse.from(note));
    }

    @GetMapping
    public List<NoteSummaryResponse> list() {
        return noteService.listAll(currentUser.getUserId()).stream().map(NoteSummaryResponse::from).toList();
    }

    @GetMapping("/{id}")
    public NoteResponse get(@PathVariable UUID id) {
        return NoteResponse.from(noteService.getOrThrow(currentUser.getUserId(), id));
    }

    @PatchMapping("/{id}")
    public NoteResponse update(@PathVariable UUID id, @Valid @RequestBody UpdateNoteRequest request) {
        return NoteResponse.from(noteService.updateMarkdown(currentUser.getUserId(), id, request.noteMarkdown()));
    }

    @PatchMapping("/{id}/organize")
    public NoteResponse organize(@PathVariable UUID id, @Valid @RequestBody OrganizeNoteRequest request) {
        return NoteResponse.from(
                noteService.organize(currentUser.getUserId(), id, request.folderId(), request.importance()));
    }
}

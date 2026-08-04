package com.jarvyx.studybook.note;

import com.jarvyx.studybook.note.dto.NoteResponse;
import com.jarvyx.studybook.note.dto.NoteSummaryResponse;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/notes")
public class NoteController {

    private final NoteService noteService;

    public NoteController(NoteService noteService) {
        this.noteService = noteService;
    }

    @PostMapping(consumes = "multipart/form-data")
    public ResponseEntity<NoteResponse> create(
            @RequestParam("audio") MultipartFile audio,
            @RequestParam(value = "provider", required = false) String provider,
            @RequestParam(value = "modelSize", required = false) String modelSize) {
        Note note = noteService.submitAudio(audio, provider, modelSize);
        return ResponseEntity.status(HttpStatus.ACCEPTED).body(NoteResponse.from(note));
    }

    @GetMapping
    public List<NoteSummaryResponse> list() {
        return noteService.listAll().stream().map(NoteSummaryResponse::from).toList();
    }

    @GetMapping("/{id}")
    public NoteResponse get(@PathVariable UUID id) {
        return NoteResponse.from(noteService.getOrThrow(id));
    }
}

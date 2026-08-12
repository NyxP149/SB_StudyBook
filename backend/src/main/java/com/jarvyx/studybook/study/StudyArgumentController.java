package com.jarvyx.studybook.study;

import com.jarvyx.studybook.auth.CurrentUser;
import com.jarvyx.studybook.study.dto.BulkStudyArgumentRequest;
import com.jarvyx.studybook.study.dto.StudyArgumentNoteRequest;
import com.jarvyx.studybook.study.dto.StudyArgumentNoteResponse;
import com.jarvyx.studybook.study.dto.StudyArgumentRequest;
import com.jarvyx.studybook.study.dto.StudyArgumentResponse;
import com.jarvyx.studybook.study.dto.StudyImageResponse;
import com.jarvyx.studybook.study.dto.StudyUpcomingResponse;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/study")
public class StudyArgumentController {

    private final StudyArgumentService argumentService;
    private final CurrentUser currentUser;

    public StudyArgumentController(StudyArgumentService argumentService, CurrentUser currentUser) {
        this.argumentService = argumentService;
        this.currentUser = currentUser;
    }

    @PostMapping("/programs/{programId}/arguments")
    public ResponseEntity<StudyArgumentResponse> create(
            @PathVariable UUID programId, @Valid @RequestBody StudyArgumentRequest request) {
        StudyArgument argument = argumentService.create(currentUser.getUserId(), programId, request);
        return ResponseEntity.status(HttpStatus.CREATED).body(StudyArgumentResponse.from(argument));
    }

    @PostMapping("/programs/{programId}/arguments/bulk")
    public ResponseEntity<List<StudyArgumentResponse>> createBulk(
            @PathVariable UUID programId, @Valid @RequestBody BulkStudyArgumentRequest request) {
        List<StudyArgumentResponse> created = argumentService.createBulk(currentUser.getUserId(), programId, request.arguments())
                .stream()
                .map(StudyArgumentResponse::from)
                .toList();
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @GetMapping("/programs/{programId}/arguments")
    public List<StudyArgumentResponse> listByProgram(@PathVariable UUID programId) {
        return argumentService.listByProgram(currentUser.getUserId(), programId).stream()
                .map(StudyArgumentResponse::from)
                .toList();
    }

    @GetMapping("/arguments/{id}")
    public StudyArgumentResponse get(@PathVariable UUID id) {
        return StudyArgumentResponse.from(argumentService.getOrThrow(currentUser.getUserId(), id));
    }

    @PutMapping("/arguments/{id}")
    public StudyArgumentResponse update(@PathVariable UUID id, @Valid @RequestBody StudyArgumentRequest request) {
        return StudyArgumentResponse.from(argumentService.update(currentUser.getUserId(), id, request));
    }

    @DeleteMapping("/arguments/{id}")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        argumentService.delete(currentUser.getUserId(), id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/upcoming")
    public List<StudyUpcomingResponse> upcoming() {
        return argumentService.upcoming(currentUser.getUserId());
    }

    @PostMapping(value = "/arguments/{id}/images", consumes = "multipart/form-data")
    public ResponseEntity<StudyImageResponse> uploadImage(
            @PathVariable UUID id, @RequestParam("image") MultipartFile image) {
        StudyImage saved = argumentService.uploadImage(currentUser.getUserId(), id, image);
        return ResponseEntity.status(HttpStatus.CREATED).body(StudyImageResponse.from(saved));
    }

    @GetMapping("/arguments/{id}/images")
    public List<StudyImageResponse> listImages(@PathVariable UUID id) {
        return argumentService.listImages(currentUser.getUserId(), id).stream().map(StudyImageResponse::from).toList();
    }

    @GetMapping("/images/{id}")
    public ResponseEntity<byte[]> getImage(@PathVariable UUID id) {
        StudyImage image = argumentService.getImageOrThrow(currentUser.getUserId(), id);
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(image.getContentType()))
                .header(HttpHeaders.CACHE_CONTROL, "private, max-age=86400")
                .body(image.getImageBytes());
    }

    @DeleteMapping("/images/{id}")
    public ResponseEntity<Void> deleteImage(@PathVariable UUID id) {
        argumentService.deleteImage(currentUser.getUserId(), id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/arguments/{id}/notes")
    public ResponseEntity<StudyArgumentNoteResponse> createNote(
            @PathVariable UUID id, @Valid @RequestBody StudyArgumentNoteRequest request) {
        StudyArgumentNote note = argumentService.createNote(currentUser.getUserId(), id, request.content());
        return ResponseEntity.status(HttpStatus.CREATED).body(StudyArgumentNoteResponse.from(note));
    }

    @GetMapping("/arguments/{id}/notes")
    public List<StudyArgumentNoteResponse> listNotes(@PathVariable UUID id) {
        return argumentService.listNotes(currentUser.getUserId(), id).stream()
                .map(StudyArgumentNoteResponse::from)
                .toList();
    }

    @PutMapping("/notes/{id}")
    public StudyArgumentNoteResponse updateNote(
            @PathVariable UUID id, @Valid @RequestBody StudyArgumentNoteRequest request) {
        return StudyArgumentNoteResponse.from(
                argumentService.updateNote(currentUser.getUserId(), id, request.content()));
    }

    @DeleteMapping("/notes/{id}")
    public ResponseEntity<Void> deleteNote(@PathVariable UUID id) {
        argumentService.deleteNote(currentUser.getUserId(), id);
        return ResponseEntity.noContent().build();
    }
}

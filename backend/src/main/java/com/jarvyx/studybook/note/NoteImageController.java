package com.jarvyx.studybook.note;

import com.jarvyx.studybook.auth.CurrentUser;
import com.jarvyx.studybook.note.dto.NoteImageResponse;
import java.util.UUID;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/note-images")
public class NoteImageController {

    private final NoteImageService imageService;
    private final CurrentUser currentUser;

    public NoteImageController(NoteImageService imageService, CurrentUser currentUser) {
        this.imageService = imageService;
        this.currentUser = currentUser;
    }

    @PostMapping(consumes = "multipart/form-data")
    public ResponseEntity<NoteImageResponse> upload(@RequestParam("image") MultipartFile image) {
        NoteImage saved = imageService.upload(currentUser.getUserId(), image);
        return ResponseEntity.status(HttpStatus.CREATED).body(NoteImageResponse.from(saved));
    }

    @GetMapping("/{id}")
    public ResponseEntity<byte[]> get(@PathVariable UUID id) {
        NoteImage image = imageService.getOrThrow(currentUser.getUserId(), id);
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(image.getContentType()))
                .header(HttpHeaders.CACHE_CONTROL, "private, max-age=86400")
                .body(image.getImageBytes());
    }
}

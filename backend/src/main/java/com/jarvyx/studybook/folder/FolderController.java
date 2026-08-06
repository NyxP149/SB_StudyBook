package com.jarvyx.studybook.folder;

import com.jarvyx.studybook.auth.CurrentUser;
import com.jarvyx.studybook.folder.dto.FolderRequest;
import com.jarvyx.studybook.folder.dto.FolderResponse;
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
@RequestMapping("/api/folders")
public class FolderController {

    private final FolderService folderService;
    private final CurrentUser currentUser;

    public FolderController(FolderService folderService, CurrentUser currentUser) {
        this.folderService = folderService;
        this.currentUser = currentUser;
    }

    @PostMapping
    public ResponseEntity<FolderResponse> create(@Valid @RequestBody FolderRequest request) {
        Folder folder = folderService.create(currentUser.getUserId(), request);
        return ResponseEntity.status(HttpStatus.CREATED).body(FolderResponse.from(folder));
    }

    @GetMapping
    public List<FolderResponse> list() {
        return folderService.listAll(currentUser.getUserId()).stream().map(FolderResponse::from).toList();
    }

    @PutMapping("/{id}")
    public FolderResponse update(@PathVariable UUID id, @Valid @RequestBody FolderRequest request) {
        return FolderResponse.from(folderService.update(currentUser.getUserId(), id, request));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        folderService.delete(currentUser.getUserId(), id);
        return ResponseEntity.noContent().build();
    }
}

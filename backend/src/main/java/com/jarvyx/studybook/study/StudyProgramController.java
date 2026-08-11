package com.jarvyx.studybook.study;

import com.jarvyx.studybook.auth.CurrentUser;
import com.jarvyx.studybook.study.dto.StudyProgramRequest;
import com.jarvyx.studybook.study.dto.StudyProgramResponse;
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
@RequestMapping("/api/study/programs")
public class StudyProgramController {

    private final StudyProgramService programService;
    private final CurrentUser currentUser;

    public StudyProgramController(StudyProgramService programService, CurrentUser currentUser) {
        this.programService = programService;
        this.currentUser = currentUser;
    }

    @PostMapping
    public ResponseEntity<StudyProgramResponse> create(@Valid @RequestBody StudyProgramRequest request) {
        StudyProgram program = programService.create(currentUser.getUserId(), request);
        return ResponseEntity.status(HttpStatus.CREATED).body(StudyProgramResponse.from(program));
    }

    @GetMapping
    public List<StudyProgramResponse> list() {
        return programService.listAll(currentUser.getUserId()).stream().map(StudyProgramResponse::from).toList();
    }

    @PutMapping("/{id}")
    public StudyProgramResponse update(@PathVariable UUID id, @Valid @RequestBody StudyProgramRequest request) {
        return StudyProgramResponse.from(programService.update(currentUser.getUserId(), id, request));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        programService.delete(currentUser.getUserId(), id);
        return ResponseEntity.noContent().build();
    }
}

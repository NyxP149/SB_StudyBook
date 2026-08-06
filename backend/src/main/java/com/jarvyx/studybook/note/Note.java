package com.jarvyx.studybook.note;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import java.time.Instant;
import java.util.UUID;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Getter
@Setter
@NoArgsConstructor
public class Note {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    private UUID userId;

    @Column(nullable = false)
    private String originalFilename;

    @Column(nullable = false)
    private String provider;

    private String modelSize;

    private UUID templateId;

    private UUID folderId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, columnDefinition = "varchar(255) default 'NORMALE'")
    private NoteImportance importance;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private NoteStatus status;

    @Column(columnDefinition = "TEXT")
    private String transcript;

    @Column(columnDefinition = "TEXT")
    private String noteMarkdown;

    @Column(columnDefinition = "TEXT")
    private String errorMessage;

    @Column(nullable = false)
    private Instant createdAt;

    public Note(String originalFilename, String provider, String modelSize, UUID templateId) {
        this.originalFilename = originalFilename;
        this.provider = provider;
        this.modelSize = modelSize;
        this.templateId = templateId;
        this.status = NoteStatus.PENDING;
        this.importance = NoteImportance.NORMALE;
        this.createdAt = Instant.now();
    }

    public void markDone(String transcript, String noteMarkdown) {
        this.transcript = transcript;
        this.noteMarkdown = noteMarkdown;
        this.status = NoteStatus.DONE;
    }

    public void markFailed(String errorMessage) {
        this.errorMessage = errorMessage;
        this.status = NoteStatus.FAILED;
    }

    public void editMarkdown(String noteMarkdown) {
        this.noteMarkdown = noteMarkdown;
    }

    public void organize(UUID folderId, NoteImportance importance) {
        this.folderId = folderId;
        this.importance = importance;
    }
}

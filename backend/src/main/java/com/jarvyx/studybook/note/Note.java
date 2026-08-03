package com.jarvyx.studybook.note;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
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

    @Column(nullable = false)
    private String originalFilename;

    @Column(nullable = false)
    private String provider;

    @Column(nullable = false)
    private String modelSize;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String transcript;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String noteMarkdown;

    @Column(nullable = false)
    private Instant createdAt;

    public Note(String originalFilename, String provider, String modelSize, String transcript, String noteMarkdown) {
        this.originalFilename = originalFilename;
        this.provider = provider;
        this.modelSize = modelSize;
        this.transcript = transcript;
        this.noteMarkdown = noteMarkdown;
        this.createdAt = Instant.now();
    }
}

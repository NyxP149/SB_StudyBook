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
public class NoteImage {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    private UUID userId;

    @Column(nullable = false)
    private String contentType;

    // Pas de @Lob : voir StudyImage pour l'explication (mapping OID vs bytea).
    @Column(columnDefinition = "bytea")
    private byte[] imageBytes;

    @Column(nullable = false)
    private Instant createdAt;

    public NoteImage(String contentType, byte[] imageBytes) {
        this.contentType = contentType;
        this.imageBytes = imageBytes;
        this.createdAt = Instant.now();
    }
}

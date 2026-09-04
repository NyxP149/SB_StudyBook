package com.jarvyx.studybook.study;

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
public class StudyArgumentNote {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    private UUID userId;

    @Column(nullable = false)
    private UUID argumentId;

    @Column(columnDefinition = "TEXT")
    private String content;

    // Clé d'un des présets de fond définis côté frontend (mêmes presets que
    // pour les notes transcrites) ; null = fond papier par défaut.
    private String background;

    @Column(nullable = false)
    private Instant createdAt;

    @Column(nullable = false)
    private Instant updatedAt;

    public StudyArgumentNote(UUID argumentId, String content) {
        this.argumentId = argumentId;
        this.content = content;
        this.createdAt = Instant.now();
        this.updatedAt = this.createdAt;
    }

    public void edit(String content) {
        this.content = content;
        this.updatedAt = Instant.now();
    }
}

package com.jarvyx.studybook.study;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Getter
@Setter
@NoArgsConstructor
public class StudyArgument {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    private UUID userId;

    @Column(nullable = false)
    private UUID programId;

    @Column(nullable = false)
    private String title;

    @Column(nullable = false)
    private LocalDate scheduledDate;

    @Column(columnDefinition = "TEXT")
    private String content;

    @Column(nullable = false)
    private boolean completed;

    @Column(nullable = false)
    private Instant createdAt;

    public StudyArgument(UUID programId, String title, LocalDate scheduledDate) {
        this.programId = programId;
        this.title = title;
        this.scheduledDate = scheduledDate;
        this.completed = false;
        this.createdAt = Instant.now();
    }

    public void edit(String title, LocalDate scheduledDate, String content, boolean completed) {
        this.title = title;
        this.scheduledDate = scheduledDate;
        this.content = content;
        this.completed = completed;
    }
}

package com.jarvyx.studybook.template;

import jakarta.persistence.CollectionTable;
import jakarta.persistence.Column;
import jakarta.persistence.ElementCollection;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.OrderColumn;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Getter
@Setter
@NoArgsConstructor
public class NoteTemplate {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false)
    private String name;

    @Column(columnDefinition = "TEXT")
    private String description;

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "note_template_section", joinColumns = @JoinColumn(name = "template_id"))
    @OrderColumn(name = "position")
    private List<TemplateSection> sections = new ArrayList<>();

    @Column(nullable = false)
    private Instant createdAt;

    public NoteTemplate(String name, String description, List<TemplateSection> sections) {
        this.name = name;
        this.description = description;
        this.sections = sections;
        this.createdAt = Instant.now();
    }
}

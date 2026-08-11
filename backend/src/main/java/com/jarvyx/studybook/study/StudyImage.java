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
public class StudyImage {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    private UUID userId;

    @Column(nullable = false)
    private UUID argumentId;

    @Column(nullable = false)
    private String filename;

    @Column(nullable = false)
    private String contentType;

    // Pas de @Lob : sur PostgreSQL, Hibernate mappe un byte[] annoté @Lob sur
    // un "large object" (OID), qui exige un accès en streaming dans une
    // transaction active et échoue sinon (500 hors contexte transactionnel).
    // columnDefinition="bytea" force le type binaire simple, sans ce piège.
    // Colonne nullable côté DB (même si toujours renseignée en pratique, via
    // la validation du service) : ddl-auto=update ne peut pas ajouter une
    // colonne NOT NULL sans défaut sur une table qui a déjà des lignes.
    @Column(columnDefinition = "bytea")
    private byte[] imageBytes;

    @Column(nullable = false)
    private Instant createdAt;

    public StudyImage(UUID argumentId, String filename, String contentType, byte[] imageBytes) {
        this.argumentId = argumentId;
        this.filename = filename;
        this.contentType = contentType;
        this.imageBytes = imageBytes;
        this.createdAt = Instant.now();
    }
}

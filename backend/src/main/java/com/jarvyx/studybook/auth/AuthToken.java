package com.jarvyx.studybook.auth;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import java.time.Instant;
import java.util.UUID;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * Opaque bearer token: the id itself is the token string sent by the client
 * (no JWT/shared secret needed, just a DB lookup per request).
 */
@Entity
@Getter
@NoArgsConstructor
public class AuthToken {

    @Id
    private UUID id;

    @Column(nullable = false)
    private UUID userId;

    @Column(nullable = false)
    private Instant createdAt;

    @Column(nullable = false)
    private Instant expiresAt;

    public AuthToken(UUID userId) {
        this.id = UUID.randomUUID();
        this.userId = userId;
        this.createdAt = Instant.now();
        this.expiresAt = this.createdAt.plus(java.time.Duration.ofDays(90));
    }

    public boolean isExpired() {
        return Instant.now().isAfter(expiresAt);
    }
}

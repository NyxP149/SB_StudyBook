package com.jarvyx.studybook.auth;

import com.jarvyx.studybook.auth.dto.AuthResponse;
import com.jarvyx.studybook.auth.dto.LoginRequest;
import com.jarvyx.studybook.auth.dto.RegisterRequest;
import jakarta.validation.Valid;
import java.util.Map;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService authService;
    private final CurrentUser currentUser;

    public AuthController(AuthService authService, CurrentUser currentUser) {
        this.authService = authService;
        this.currentUser = currentUser;
    }

    @PostMapping("/register")
    public ResponseEntity<AuthResponse> register(@Valid @RequestBody RegisterRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(authService.register(request));
    }

    @PostMapping("/login")
    public AuthResponse login(@Valid @RequestBody LoginRequest request) {
        return authService.login(request);
    }

    @PostMapping("/logout")
    public ResponseEntity<Void> logout(@RequestHeader("Authorization") String authorization) {
        AuthInterceptor.extractToken(authorization).ifPresent(token -> {
            try {
                authService.logout(UUID.fromString(token));
            } catch (IllegalArgumentException ignored) {
                // malformed token, nothing to delete
            }
        });
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/me")
    public Map<String, String> me() {
        return Map.of("username", authService.getUser(currentUser.getUserId()).getUsername());
    }
}

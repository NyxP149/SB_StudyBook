package com.jarvyx.studybook.auth;

import com.jarvyx.studybook.auth.dto.AuthResponse;
import com.jarvyx.studybook.auth.dto.LoginRequest;
import com.jarvyx.studybook.auth.dto.RegisterRequest;
import com.jarvyx.studybook.folder.FolderRepository;
import com.jarvyx.studybook.note.NoteRepository;
import com.jarvyx.studybook.template.NoteTemplateRepository;
import java.util.Optional;
import java.util.UUID;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AuthService {

    private final UserRepository userRepository;
    private final AuthTokenRepository tokenRepository;
    private final NoteRepository noteRepository;
    private final FolderRepository folderRepository;
    private final NoteTemplateRepository templateRepository;
    private final BCryptPasswordEncoder passwordEncoder = new BCryptPasswordEncoder();

    public AuthService(
            UserRepository userRepository,
            AuthTokenRepository tokenRepository,
            NoteRepository noteRepository,
            FolderRepository folderRepository,
            NoteTemplateRepository templateRepository) {
        this.userRepository = userRepository;
        this.tokenRepository = tokenRepository;
        this.noteRepository = noteRepository;
        this.folderRepository = folderRepository;
        this.templateRepository = templateRepository;
    }

    @Transactional
    public AuthResponse register(RegisterRequest request) {
        String username = request.username().trim();
        if (userRepository.existsByUsernameIgnoreCase(username)) {
            throw new IllegalArgumentException("Ce nom d'utilisateur est déjà pris.");
        }

        boolean isFirstUser = userRepository.count() == 0;

        User user = new User(username, passwordEncoder.encode(request.password()));
        user = userRepository.save(user);

        if (isFirstUser) {
            // Data created before accounts existed becomes this (first) account's.
            noteRepository.claimOrphaned(user.getId());
            folderRepository.claimOrphaned(user.getId());
            templateRepository.claimOrphaned(user.getId());
        }

        AuthToken token = tokenRepository.save(new AuthToken(user.getId()));
        return new AuthResponse(token.getId().toString(), user.getUsername());
    }

    public AuthResponse login(LoginRequest request) {
        User user = userRepository.findByUsernameIgnoreCase(request.username().trim())
                .orElseThrow(() -> new IllegalArgumentException("Identifiants invalides."));
        if (!passwordEncoder.matches(request.password(), user.getPasswordHash())) {
            throw new IllegalArgumentException("Identifiants invalides.");
        }
        AuthToken token = tokenRepository.save(new AuthToken(user.getId()));
        return new AuthResponse(token.getId().toString(), user.getUsername());
    }

    public void logout(UUID tokenId) {
        tokenRepository.deleteById(tokenId);
    }

    public Optional<UUID> resolveUserId(String rawToken) {
        UUID tokenId;
        try {
            tokenId = UUID.fromString(rawToken);
        } catch (IllegalArgumentException e) {
            return Optional.empty();
        }
        return tokenRepository.findById(tokenId)
                .filter(t -> !t.isExpired())
                .map(AuthToken::getUserId);
    }

    public User getUser(UUID userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("Utilisateur introuvable."));
    }
}

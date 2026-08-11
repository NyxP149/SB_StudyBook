package com.jarvyx.studybook.note;

import java.io.IOException;
import java.util.NoSuchElementException;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

@Service
public class NoteImageService {

    private static final long MAX_IMAGE_BYTES = 5L * 1024 * 1024;

    private final NoteImageRepository repository;

    public NoteImageService(NoteImageRepository repository) {
        this.repository = repository;
    }

    public NoteImage upload(UUID userId, MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("Le fichier image est vide ou manquant.");
        }
        if (file.getSize() > MAX_IMAGE_BYTES) {
            throw new IllegalArgumentException("Image trop volumineuse (max 5 Mo).");
        }
        String contentType = file.getContentType();
        if (contentType == null || !contentType.startsWith("image/")) {
            throw new IllegalArgumentException("Le fichier doit être une image.");
        }
        try {
            NoteImage image = new NoteImage(contentType, file.getBytes());
            image.setUserId(userId);
            return repository.save(image);
        } catch (IOException e) {
            throw new IllegalArgumentException("Impossible de lire l'image reçue : " + e.getMessage(), e);
        }
    }

    public NoteImage getOrThrow(UUID userId, UUID id) {
        return repository.findByIdAndUserId(id, userId)
                .orElseThrow(() -> new NoSuchElementException("Image introuvable : " + id));
    }
}

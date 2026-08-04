package com.jarvyx.studybook.note;

import com.jarvyx.studybook.pipeline.PipelineException;
import com.jarvyx.studybook.pipeline.PipelineProperties;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.NoSuchElementException;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

@Service
public class NoteService {

    private final NoteRepository noteRepository;
    private final NotePipelineRunner pipelineRunner;
    private final PipelineProperties pipelineProperties;

    public NoteService(
            NoteRepository noteRepository,
            NotePipelineRunner pipelineRunner,
            PipelineProperties pipelineProperties) {
        this.noteRepository = noteRepository;
        this.pipelineRunner = pipelineRunner;
        this.pipelineProperties = pipelineProperties;
    }

    /**
     * Sauvegarde l'upload et crée la note en statut PENDING, puis retourne
     * immédiatement : le pipeline (lent) tourne en arrière-plan.
     */
    public Note submitAudio(MultipartFile audio, String provider, String modelSize) {
        if (audio == null || audio.isEmpty()) {
            throw new IllegalArgumentException("Le fichier audio est vide ou manquant.");
        }

        String effectiveProvider = provider != null ? provider : pipelineProperties.provider();
        String effectiveModelSize = modelSize != null ? modelSize : pipelineProperties.modelSize();

        Path storedFile = storeUpload(audio);
        Note note = new Note(audio.getOriginalFilename(), effectiveProvider, effectiveModelSize);
        note = noteRepository.save(note);

        pipelineRunner.run(note.getId(), storedFile, effectiveProvider, effectiveModelSize);
        return note;
    }

    public List<Note> listAll() {
        return noteRepository.findAllByOrderByCreatedAtDesc();
    }

    public Note getOrThrow(UUID id) {
        return noteRepository.findById(id)
                .orElseThrow(() -> new NoSuchElementException("Note introuvable : " + id));
    }

    private Path storeUpload(MultipartFile audio) {
        try {
            Path uploadDir = pipelineProperties.uploadDirAsPath();
            Files.createDirectories(uploadDir);

            String extension = extractExtension(audio.getOriginalFilename());
            Path target = uploadDir.resolve(UUID.randomUUID() + extension);
            audio.transferTo(target);
            return target;
        } catch (IOException e) {
            throw new PipelineException("Impossible de sauvegarder le fichier audio reçu : " + e.getMessage(), e);
        }
    }

    private static String extractExtension(String filename) {
        if (filename == null) {
            return "";
        }
        int dot = filename.lastIndexOf('.');
        return dot == -1 ? "" : filename.substring(dot);
    }
}

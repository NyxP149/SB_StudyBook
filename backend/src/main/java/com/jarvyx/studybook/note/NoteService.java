package com.jarvyx.studybook.note;

import com.jarvyx.studybook.pipeline.PipelineException;
import com.jarvyx.studybook.pipeline.PipelineProperties;
import com.jarvyx.studybook.pipeline.PipelineResult;
import com.jarvyx.studybook.pipeline.TranscriptionPipelineService;
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
    private final TranscriptionPipelineService pipelineService;
    private final PipelineProperties pipelineProperties;

    public NoteService(
            NoteRepository noteRepository,
            TranscriptionPipelineService pipelineService,
            PipelineProperties pipelineProperties) {
        this.noteRepository = noteRepository;
        this.pipelineService = pipelineService;
        this.pipelineProperties = pipelineProperties;
    }

    public Note createFromAudio(MultipartFile audio, String provider, String modelSize) {
        if (audio == null || audio.isEmpty()) {
            throw new IllegalArgumentException("Le fichier audio est vide ou manquant.");
        }

        Path storedFile = storeUpload(audio);
        PipelineResult result = pipelineService.run(storedFile, provider, modelSize);

        Note note = new Note(
                audio.getOriginalFilename(),
                provider != null ? provider : pipelineProperties.provider(),
                modelSize != null ? modelSize : pipelineProperties.modelSize(),
                result.transcript(),
                result.noteMarkdown());

        return noteRepository.save(note);
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

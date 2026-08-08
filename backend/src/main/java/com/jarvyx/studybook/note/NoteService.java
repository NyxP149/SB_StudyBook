package com.jarvyx.studybook.note;

import com.jarvyx.studybook.folder.FolderRepository;
import com.jarvyx.studybook.pipeline.PipelineException;
import com.jarvyx.studybook.pipeline.PipelineProperties;
import com.jarvyx.studybook.template.NoteTemplateRepository;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Instant;
import java.util.List;
import java.util.NoSuchElementException;
import java.util.UUID;
import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.text.PDFTextStripper;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

@Service
public class NoteService {

    private final NoteRepository noteRepository;
    private final NotePipelineRunner pipelineRunner;
    private final PipelineProperties pipelineProperties;
    private final FolderRepository folderRepository;
    private final NoteTemplateRepository templateRepository;

    public NoteService(
            NoteRepository noteRepository,
            NotePipelineRunner pipelineRunner,
            PipelineProperties pipelineProperties,
            FolderRepository folderRepository,
            NoteTemplateRepository templateRepository) {
        this.noteRepository = noteRepository;
        this.pipelineRunner = pipelineRunner;
        this.pipelineProperties = pipelineProperties;
        this.folderRepository = folderRepository;
        this.templateRepository = templateRepository;
    }

    /**
     * Sauvegarde l'upload et crée la note en statut PENDING, puis retourne
     * immédiatement : le pipeline (lent) tourne en arrière-plan.
     */
    public Note submitAudio(UUID userId, MultipartFile audio, String provider, String modelSize, UUID templateId) {
        if (audio == null || audio.isEmpty()) {
            throw new IllegalArgumentException("Le fichier audio est vide ou manquant.");
        }
        requireOwnedTemplate(userId, templateId);

        String effectiveProvider = provider != null ? provider : pipelineProperties.provider();
        String effectiveModelSize = modelSize != null ? modelSize : pipelineProperties.modelSize();

        Path storedFile = storeUpload(audio);
        Note note = new Note(audio.getOriginalFilename(), effectiveProvider, effectiveModelSize, templateId);
        note.setUserId(userId);
        note = noteRepository.save(note);

        pipelineRunner.run(note.getId(), storedFile, effectiveProvider, effectiveModelSize, templateId);
        return note;
    }

    /**
     * Saute la transcription Whisper : la note part directement d'un texte déjà
     * écrit (collé) ou extrait d'un fichier .txt/.pdf.
     */
    public Note submitText(UUID userId, String text, MultipartFile file, String provider, UUID templateId) {
        requireOwnedTemplate(userId, templateId);

        String extractedText;
        String originalFilename;
        if (file != null && !file.isEmpty()) {
            originalFilename = file.getOriginalFilename() != null ? file.getOriginalFilename() : "document";
            extractedText = extractText(file, originalFilename);
        } else if (text != null && !text.isBlank()) {
            originalFilename = "texte-colle-" + Instant.now().toEpochMilli() + ".txt";
            extractedText = text;
        } else {
            throw new IllegalArgumentException("Fournis soit un texte, soit un fichier .txt ou .pdf.");
        }

        String effectiveProvider = provider != null ? provider : pipelineProperties.provider();

        Path transcriptFile = storeTranscript(extractedText);
        Note note = new Note(originalFilename, effectiveProvider, null, templateId);
        note.setUserId(userId);
        note = noteRepository.save(note);

        pipelineRunner.runFromText(note.getId(), transcriptFile, effectiveProvider, templateId);
        return note;
    }

    public List<Note> listAll(UUID userId) {
        return noteRepository.findAllByUserIdOrderByCreatedAtDesc(userId);
    }

    public Note getOrThrow(UUID userId, UUID id) {
        return noteRepository.findByIdAndUserId(id, userId)
                .orElseThrow(() -> new NoSuchElementException("Note introuvable : " + id));
    }

    public Note organize(UUID userId, UUID id, UUID folderId, NoteImportance importance) {
        Note note = getOrThrow(userId, id);
        if (folderId != null && folderRepository.findByIdAndUserId(folderId, userId).isEmpty()) {
            throw new NoSuchElementException("Dossier introuvable : " + folderId);
        }
        note.organize(folderId, importance);
        return noteRepository.save(note);
    }

    public void delete(UUID userId, UUID id) {
        Note note = getOrThrow(userId, id);
        noteRepository.delete(note);
    }

    public Note updateMarkdown(UUID userId, UUID id, String noteMarkdown) {
        Note note = getOrThrow(userId, id);
        if (note.getStatus() != NoteStatus.DONE) {
            throw new IllegalArgumentException("Seule une note terminée peut être modifiée.");
        }
        note.editMarkdown(noteMarkdown);
        return noteRepository.save(note);
    }

    private void requireOwnedTemplate(UUID userId, UUID templateId) {
        if (templateId != null && templateRepository.findByIdAndUserId(templateId, userId).isEmpty()) {
            throw new NoSuchElementException("Template introuvable : " + templateId);
        }
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

    private Path storeTranscript(String text) {
        try {
            Path uploadDir = pipelineProperties.uploadDirAsPath();
            Files.createDirectories(uploadDir);
            Path target = uploadDir.resolve(UUID.randomUUID() + ".txt");
            Files.writeString(target, text, StandardCharsets.UTF_8);
            return target;
        } catch (IOException e) {
            throw new PipelineException("Impossible de sauvegarder le texte reçu : " + e.getMessage(), e);
        }
    }

    private String extractText(MultipartFile file, String originalFilename) {
        String extension = extractExtension(originalFilename).toLowerCase();
        try {
            if (".pdf".equals(extension)) {
                try (PDDocument document = Loader.loadPDF(file.getBytes())) {
                    return new PDFTextStripper().getText(document);
                }
            }
            return new String(file.getBytes(), StandardCharsets.UTF_8);
        } catch (IOException e) {
            throw new PipelineException("Impossible de lire le fichier reçu : " + e.getMessage(), e);
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

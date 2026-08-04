package com.jarvyx.studybook.note;

import com.jarvyx.studybook.pipeline.PipelineResult;
import com.jarvyx.studybook.pipeline.TranscriptionPipelineService;
import com.jarvyx.studybook.template.NoteTemplate;
import com.jarvyx.studybook.template.NoteTemplateRepository;
import com.jarvyx.studybook.template.TemplateSection;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.Map;
import java.util.NoSuchElementException;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;
import tools.jackson.databind.ObjectMapper;

/**
 * Runs the (slow) transcription+note pipeline outside the HTTP request thread.
 * Kept in its own bean because Spring's @Async proxy only intercepts calls
 * that go through the bean from the outside, not self-invocation.
 */
@Component
public class NotePipelineRunner {

    private static final Logger log = LoggerFactory.getLogger(NotePipelineRunner.class);

    private final NoteRepository noteRepository;
    private final TranscriptionPipelineService pipelineService;
    private final NoteTemplateRepository templateRepository;
    private final ObjectMapper objectMapper;

    public NotePipelineRunner(
            NoteRepository noteRepository,
            TranscriptionPipelineService pipelineService,
            NoteTemplateRepository templateRepository,
            ObjectMapper objectMapper) {
        this.noteRepository = noteRepository;
        this.pipelineService = pipelineService;
        this.templateRepository = templateRepository;
        this.objectMapper = objectMapper;
    }

    @Async("pipelineExecutor")
    public void run(UUID noteId, Path audioFile, String provider, String modelSize, UUID templateId) {
        Path templateFile = null;
        try {
            if (templateId != null) {
                templateFile = writeTemplateFile(templateId);
            }
            PipelineResult result = pipelineService.run(audioFile, provider, modelSize, templateFile);
            noteRepository.findById(noteId).ifPresent(note -> {
                note.markDone(result.transcript(), result.noteMarkdown());
                noteRepository.save(note);
            });
        } catch (Exception e) {
            log.error("Pipeline en échec pour la note {}", noteId, e);
            noteRepository.findById(noteId).ifPresent(note -> {
                note.markFailed(e.getMessage());
                noteRepository.save(note);
            });
        } finally {
            if (templateFile != null) {
                try {
                    Files.deleteIfExists(templateFile);
                } catch (IOException e) {
                    log.warn("Impossible de supprimer le fichier de template temporaire {}", templateFile, e);
                }
            }
        }
    }

    private Path writeTemplateFile(UUID templateId) throws IOException {
        NoteTemplate template = templateRepository.findById(templateId)
                .orElseThrow(() -> new NoSuchElementException("Template introuvable : " + templateId));

        List<Map<String, String>> sections = template.getSections().stream()
                .map(this::toSectionMap)
                .toList();

        Path file = Files.createTempFile("studybook-template-", ".json");
        objectMapper.writeValue(file.toFile(), Map.of("sections", sections));
        return file;
    }

    private Map<String, String> toSectionMap(TemplateSection section) {
        return Map.of("title", section.getTitle(), "instructions", section.getInstructions());
    }
}

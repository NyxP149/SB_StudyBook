package com.jarvyx.studybook.note;

import com.jarvyx.studybook.pipeline.PipelineResult;
import com.jarvyx.studybook.pipeline.TranscriptionPipelineService;
import java.nio.file.Path;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;

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

    public NotePipelineRunner(NoteRepository noteRepository, TranscriptionPipelineService pipelineService) {
        this.noteRepository = noteRepository;
        this.pipelineService = pipelineService;
    }

    @Async("pipelineExecutor")
    public void run(UUID noteId, Path audioFile, String provider, String modelSize) {
        try {
            PipelineResult result = pipelineService.run(audioFile, provider, modelSize);
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
        }
    }
}

package com.jarvyx.studybook.pipeline;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.TimeUnit;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.stereotype.Service;

/**
 * Wraps the existing Python prototype (audio -> Whisper transcription -> LLM
 * note, or transcript -> LLM note) as a subprocess, so the backend doesn't
 * have to reimplement it.
 */
@Service
@EnableConfigurationProperties(PipelineProperties.class)
public class TranscriptionPipelineService {

    private static final Logger log = LoggerFactory.getLogger(TranscriptionPipelineService.class);

    private final PipelineProperties properties;

    public TranscriptionPipelineService(PipelineProperties properties) {
        this.properties = properties;
    }

    public PipelineResult runFromAudio(Path audioFile, String provider, String modelSize, Path templateFile) {
        List<String> command = new ArrayList<>(List.of(
                properties.pythonExecutableAsPath().toString(),
                properties.scriptPathAsPath().toString(),
                audioFile.toAbsolutePath().toString(),
                "--provider", effectiveProvider(provider),
                "--model-size", effectiveModelSize(modelSize)));
        appendTemplateArg(command, templateFile);
        return execute(command, audioFile);
    }

    public PipelineResult runFromText(Path transcriptFile, String provider, Path templateFile) {
        List<String> command = new ArrayList<>(List.of(
                properties.pythonExecutableAsPath().toString(),
                properties.scriptPathAsPath().toString(),
                "--transcript-file", transcriptFile.toAbsolutePath().toString(),
                "--provider", effectiveProvider(provider)));
        appendTemplateArg(command, templateFile);
        return execute(command, transcriptFile);
    }

    private String effectiveProvider(String provider) {
        return provider != null ? provider : properties.provider();
    }

    private String effectiveModelSize(String modelSize) {
        return modelSize != null ? modelSize : properties.modelSize();
    }

    private void appendTemplateArg(List<String> command, Path templateFile) {
        if (templateFile != null) {
            command.add("--template-file");
            command.add(templateFile.toAbsolutePath().toString());
        }
    }

    private PipelineResult execute(List<String> command, Path sourceFile) {
        ProcessBuilder processBuilder = new ProcessBuilder(command).redirectErrorStream(true);

        Process process;
        String output;
        try {
            process = processBuilder.start();
            output = new String(process.getInputStream().readAllBytes());
            boolean finished = process.waitFor(properties.timeoutMinutes(), TimeUnit.MINUTES);
            if (!finished) {
                process.destroyForcibly();
                throw new PipelineException("Le pipeline de transcription a dépassé le délai de "
                        + properties.timeoutMinutes() + " minutes.");
            }
        } catch (IOException e) {
            throw new PipelineException("Impossible de lancer le script Python : " + e.getMessage(), e);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new PipelineException("Pipeline interrompu.", e);
        }

        log.info("Sortie du pipeline pour {} :\n{}", sourceFile.getFileName(), output);

        if (process.exitValue() != 0) {
            throw new PipelineException("Le pipeline a échoué (code " + process.exitValue() + ") :\n" + output);
        }

        String stem = stripExtension(sourceFile.getFileName().toString());
        Path transcriptPath = properties.outputDirAsPath().resolve(stem + ".transcript.txt");
        Path notePath = properties.outputDirAsPath().resolve(stem + ".note.md");

        try {
            String transcript = Files.readString(transcriptPath);
            String note = Files.readString(notePath);
            return new PipelineResult(transcript, note);
        } catch (IOException e) {
            throw new PipelineException("Le pipeline s'est terminé mais les fichiers de sortie sont introuvables : "
                    + e.getMessage(), e);
        }
    }

    private static String stripExtension(String filename) {
        int dot = filename.lastIndexOf('.');
        return dot == -1 ? filename : filename.substring(0, dot);
    }
}

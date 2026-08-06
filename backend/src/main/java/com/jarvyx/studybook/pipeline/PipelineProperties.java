package com.jarvyx.studybook.pipeline;

import java.nio.file.Path;
import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "studybook.pipeline")
public record PipelineProperties(
        String pythonExecutable,
        String scriptPath,
        String uploadDir,
        String outputDir,
        String provider,
        String modelSize,
        String transcriptionEngine,
        int timeoutMinutes) {

    public Path pythonExecutableAsPath() {
        return Path.of(pythonExecutable);
    }

    public Path scriptPathAsPath() {
        return Path.of(scriptPath);
    }

    public Path uploadDirAsPath() {
        return Path.of(uploadDir);
    }

    public Path outputDirAsPath() {
        return Path.of(outputDir);
    }
}

package com.jarvyx.studybook.template;

public class TemplateExtractionException extends RuntimeException {

    public TemplateExtractionException(String message) {
        super(message);
    }

    public TemplateExtractionException(String message, Throwable cause) {
        super(message, cause);
    }
}

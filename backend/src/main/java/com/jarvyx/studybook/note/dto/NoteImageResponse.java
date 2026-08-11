package com.jarvyx.studybook.note.dto;

import com.jarvyx.studybook.note.NoteImage;
import java.util.UUID;

public record NoteImageResponse(UUID id) {

    public static NoteImageResponse from(NoteImage image) {
        return new NoteImageResponse(image.getId());
    }
}

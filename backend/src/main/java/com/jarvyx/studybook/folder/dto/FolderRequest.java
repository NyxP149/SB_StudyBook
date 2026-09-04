package com.jarvyx.studybook.folder.dto;

import jakarta.validation.constraints.NotBlank;
import java.util.UUID;

public record FolderRequest(
        @NotBlank(message = "Le nom du dossier est requis") String name,
        @NotBlank(message = "La couleur du dossier est requise") String color,
        UUID parentId) {
}
